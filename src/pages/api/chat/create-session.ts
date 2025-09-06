import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface CreateSessionRequest {
  user_id: string;
  interests?: string[];
}

interface CreateSessionResponse {
  success: boolean;
  session_id?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSessionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { user_id, interests = [] }: CreateSessionRequest = req.body;

    console.log('🔍 CREATE SESSION REQUEST:', { user_id, interests });

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const supabase = createAdminClient();

    // Check if user already has an active session and validate it
    const { data: existingSessions, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id, status, user1_id, user2_id, updated_at')
      .eq('user1_id', user_id)
      .in('status', ['waiting', 'active'])
      .limit(1);

    if (checkError) {
      console.error('Error checking existing sessions:', checkError);
      return res.status(500).json({
        success: false,
        error: 'Database error'
      });
    }

    if (existingSessions && existingSessions.length > 0) {
      const session = existingSessions[0] as { id: string; status: string; user1_id: string; user2_id: string | null; updated_at: string };
      
      // Check if session is stale (older than 5 minutes without updates)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const isStale = new Date(session.updated_at) < new Date(fiveMinutesAgo);
      
      if (isStale) {
        console.log('🗑️ Found stale session, closing it:', session.id);
        // Close the stale session
        await supabase
          .from('chat_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
      } else if (session.status === 'active' && session.user2_id) {
        // Check if the other user is still active
        const { data: otherUser } = await supabase
          .from('anonymous_users')
          .select('is_active, last_seen')
          .eq('id', session.user2_id)
          .single();
        
        if (!otherUser || !otherUser.is_active) {
          console.log('👻 Other user is inactive, closing session:', session.id);
          // Close the session if other user is inactive
          await supabase
            .from('chat_sessions')
            .update({
              status: 'ended',
              ended_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
        } else {
          console.log('✅ User rejoining valid existing session:', session.id);
          return res.status(200).json({
            success: true,
            session_id: session.id,
            message: 'Rejoined existing session'
          });
        }
      } else if (session.status === 'waiting') {
        console.log('✅ User rejoining waiting session:', session.id);
        return res.status(200).json({
          success: true,
          session_id: session.id,
          message: 'Rejoined existing session'
        });
      }
    }

    console.log('🔍 Looking for waiting sessions to join...');

    // Look for a waiting session to join (with interest matching)
    let matchingSession = null;
    
    if (interests.length > 0) {
      // Try to find a session from someone with matching interests
      const { data: interestMatch } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          user1_id,
          anonymous_users!chat_sessions_user1_id_fkey (
            interests
          )
        `)
        .eq('status', 'waiting')
        .neq('user1_id', user_id)
        .limit(10);

      if (interestMatch && interestMatch.length > 0) {
        // Find the best interest match
        for (const session of interestMatch as any[]) {
          const user1Interests = session.anonymous_users?.interests || [];
          const commonInterests = interests.filter((interest: string) => 
            user1Interests.includes(interest)
          );
          
          if (commonInterests.length > 0) {
            matchingSession = session;
            break;
          }
        }
      }
    }

    // If no interest match, find any waiting session
    if (!matchingSession) {
      const { data: anySession } = await (supabase as any)
        .from('chat_sessions')
        .select(`
          id, 
          user1_id,
          created_at,
          anonymous_users!chat_sessions_user1_id_fkey (
            is_active,
            last_seen
          )
        `)
        .eq('status', 'waiting')
        .neq('user1_id', user_id)
        .order('created_at', { ascending: true }) // Get oldest waiting session first
        .limit(5); // Check multiple sessions to find an active user

      if (anySession && anySession.length > 0) {
        // Find a session where the user is still active
        for (const session of anySession as any[]) {
          const user1 = session.anonymous_users;
          if (user1 && user1.is_active) {
            // Check if user was active in the last 2 minutes
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            if (new Date(user1.last_seen) > new Date(twoMinutesAgo)) {
              matchingSession = { id: session.id, user1_id: session.user1_id };
              console.log('🎯 Found active waiting session to join:', matchingSession.id);
              break;
            }
          }
        }
        
        if (!matchingSession) {
          console.log('❌ No active waiting sessions found');
        }
      } else {
        console.log('❌ No waiting sessions found');
      }
    }

    if (matchingSession) {
      console.log('🔗 Joining existing waiting session:', matchingSession.id);
      
      // Join existing waiting session
      const { data: updatedSession, error: updateError } = await (supabase as any)
        .from('chat_sessions')
        .update({
          user2_id: user_id,
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchingSession.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating session:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Failed to join session'
        });
      }

      // Add system message about connection
      await (supabase as any)
        .from('messages')
        .insert({
          session_id: matchingSession.id,
          sender_id: user_id,
          content: 'Connected to chat!',
          encrypted_content: 'Connected to chat!',
          message_type: 'system'
        });

      return res.status(200).json({
        success: true,
        session_id: matchingSession.id,
        message: 'Joined existing session'
      });
    } else {
      console.log('🆕 Creating new waiting session for user:', user_id);
      // Create new waiting session
      const { data: newSession, error: createError } = await (supabase as any)
        .from('chat_sessions')
        .insert({
          user1_id: user_id,
          status: 'waiting',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating session:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create session'
        });
      }

      return res.status(201).json({
        success: true,
        session_id: newSession.id,
        message: 'Created new session, waiting for match'
      });
    }
  } catch (error) {
    console.error('Unexpected error in create-session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
