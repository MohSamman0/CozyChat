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

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const supabase = createAdminClient();

    // Use the atomic database function for session creation/joining
    const { data, error } = await supabase.rpc('create_or_join_session_atomic', {
      user_id_param: user_id,
      user_interests: interests
    } as any);

    if (error) {
      console.error('Session creation error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create session'
      });
    }

    if (!data || (Array.isArray(data) && (data as any[]).length === 0)) {
      return res.status(500).json({
        success: false,
        error: 'No session data returned'
      });
    }

    const sessionResult = Array.isArray(data) ? (data as any[])[0] : data as any;

    return res.status(200).json({
      success: true,
      session_id: sessionResult.session_id,
      message: sessionResult.message,
      action: sessionResult.action
    } as any);

  } catch (error) {
    console.error('Unexpected error in create-session:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
