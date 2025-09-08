import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface CloseSessionRequest {
  session_id: string;
  user_id: string;
}

interface CloseSessionResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CloseSessionResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { session_id, user_id }: CloseSessionRequest = req.body;

    // Validate required fields
    if (!session_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: session_id and user_id'
      });
    }

    const supabase = createAdminClient();

    // Verify user is part of the session
    const { data: session, error: sessionError } = await (supabase as any)
      .from('chat_sessions')
      .select('id, status, user1_id, user2_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if user is authorized to close this session
    if (session.user1_id !== user_id && session.user2_id !== user_id) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized for this session'
      });
    }

    // Only close if session is active or waiting
    if (session.status === 'ended') {
      return res.status(200).json({
        success: true // Already closed
      });
    }

    // Close the session
    const { error: updateError } = await (supabase as any)
      .from('chat_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('Error closing session:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to close session'
      });
    }

    // Mark both users in the session as inactive to prevent them from being matched again immediately
    const { error: userUpdateError } = await (supabase as any)
      .from('anonymous_users')
      .update({
        is_active: false,
        last_seen: new Date().toISOString()
      })
      .in('id', [session.user1_id, session.user2_id].filter(Boolean));

    if (userUpdateError) {
      console.error('Error updating user status:', userUpdateError);
      // Don't fail the request, just log the error
    }

    // Add a system message to notify the other user that the chat ended
    if (session.user2_id) {
      const { error: messageError } = await (supabase as any)
        .from('messages')
        .insert({
          session_id: session_id,
          sender_id: user_id,
          content: 'Chat ended by other user',
          encrypted_content: 'Chat ended by other user',
          message_type: 'system'
        });

      if (messageError) {
        console.error('Error adding system message:', messageError);
        // Don't fail the request, just log the error
      }
    }

    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Unexpected error in close-session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
