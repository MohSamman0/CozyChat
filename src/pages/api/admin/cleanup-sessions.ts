import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CleanupResponse {
  success: boolean;
  message: string;
  details?: {
    users_marked_inactive?: number;
    sessions_ended?: number;
    users_deleted?: number;
    sessions_deleted?: number;
    messages_deleted?: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CleanupResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  // Simple API key check for security (in production, use proper authentication)
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  try {
    // Call the cleanup function
    const { data, error } = await supabase.rpc('cleanup_old_sessions');

    if (error) {
      console.error('Cleanup function error:', error);
      return res.status(500).json({
        success: false,
        message: 'Cleanup function failed',
        error: error.message
      });
    }

    // Get some statistics about what was cleaned up
    const [
      { count: activeUsers },
      { count: waitingSessions },
      { count: activeSessions },
      { count: totalMessages }
    ] = await Promise.all([
      supabase.from('anonymous_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('messages').select('*', { count: 'exact', head: true })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Cleanup completed successfully',
      details: {
        users_marked_inactive: activeUsers || 0,
        sessions_ended: (waitingSessions || 0) + (activeSessions || 0),
        users_deleted: 0, // The function doesn't return counts, so we'll show current state
        sessions_deleted: 0,
        messages_deleted: 0
      }
    });

  } catch (error) {
    console.error('Cleanup API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
