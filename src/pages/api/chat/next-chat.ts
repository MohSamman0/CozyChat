import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface NextChatRequest {
  current_session_id: string;
  user_id: string;
  interests?: string[];
}

interface NextChatResponse {
  success: boolean;
  session?: {
    id: string;
    status: string;
    user1_id: string;
    user2_id: string | null;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NextChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { current_session_id, user_id, interests = [] }: NextChatRequest = req.body;

    if (!current_session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const supabase = createAdminClient();

    // First, close the current session
    const { error: closeError } = await (supabase as any)
      .from('chat_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', current_session_id);

    if (closeError) {
      console.error('Error closing current session:', closeError);
    } else {
      // Closed session for next chat
    }

    // Look for a waiting session to join (exclude previous partners)
    const { data: waitingSessions, error: searchError } = await (supabase as any)
      .from('chat_sessions')
      .select('id, user1_id')
      .eq('status', 'waiting')
      .neq('user1_id', user_id)
      .limit(10);

    if (searchError) {
      console.error('Error searching for sessions:', searchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to search for sessions'
      });
    }

    let targetSession = null;

    if (waitingSessions && waitingSessions.length > 0) {
      // Join the first available waiting session
      targetSession = waitingSessions[0] as { id: string; user1_id: string };
      
      const { data: joinedSession, error: joinError } = await (supabase as any)
        .from('chat_sessions')
        .update({
          user2_id: user_id,
          status: 'active',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', targetSession.id)
        .select()
        .single();

      if (joinError) {
        console.error('Error joining session:', joinError);
        return res.status(500).json({
          success: false,
          error: 'Failed to join session'
        });
      }

      // User joined existing session
      
      return res.status(200).json({
        success: true,
        session: joinedSession
      });
    } else {
      // Create new waiting session
      const { data: newSession, error: createError } = await (supabase as any)
        .from('chat_sessions')
        .insert({
          user1_id: user_id,
          user2_id: null,
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

      // Created new waiting session for user
      
      return res.status(201).json({
        success: true,
        session: newSession
      });
    }
  } catch (error) {
    console.error('Unexpected error in next-chat:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
