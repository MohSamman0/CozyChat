import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface CleanupResponse {
  success: boolean;
  cleanedSessions: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      cleanedSessions: 0,
      error: 'Method not allowed'
    });
  }

  try {
    const supabase = createAdminClient();

    // Find sessions that have been inactive for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: staleSessions, error: fetchError } = await (supabase as any)
      .from('chat_sessions')
      .select('id, status, updated_at')
      .in('status', ['active', 'waiting'])
      .lt('updated_at', tenMinutesAgo);

    if (fetchError) {
      console.error('Error fetching stale sessions:', fetchError);
      return res.status(500).json({
        success: false,
        cleanedSessions: 0,
        error: 'Failed to fetch stale sessions'
      });
    }

    if (!staleSessions || staleSessions.length === 0) {
      return res.status(200).json({
        success: true,
        cleanedSessions: 0
      });
    }

    // Close all stale sessions
    const sessionIds = staleSessions.map((session: any) => session.id);
    
    const { error: updateError } = await (supabase as any)
      .from('chat_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', sessionIds);

    if (updateError) {
      console.error('Error closing stale sessions:', updateError);
      return res.status(500).json({
        success: false,
        cleanedSessions: 0,
        error: 'Failed to close stale sessions'
      });
    }

    // Cleaned up stale sessions

    return res.status(200).json({
      success: true,
      cleanedSessions: staleSessions.length
    });
  } catch (error) {
    console.error('Unexpected error in cleanup-stale-sessions:', error);
    return res.status(500).json({
      success: false,
      cleanedSessions: 0,
      error: 'Internal server error'
    });
  }
}
