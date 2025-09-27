import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface SessionStatusResponse {
  session?: {
    id: string;
    status: string;
    started_at?: string;
    ended_at?: string;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SessionStatusResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  // Validate session ID format (UUID)
  if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid session ID format' });
  }

  try {
    const supabase = createAdminClient();
    
    // Only return minimal necessary data - no user IDs or sensitive information
    const { data, error } = await (supabase as any)
      .from('chat_sessions')
      .select('id, status, started_at, ended_at')
      .eq('id', id)
      .single();

    if (error) {
      // Don't expose internal error details
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({ 
      session: {
        id: data.id,
        status: data.status,
        started_at: data.started_at,
        ended_at: data.ended_at
      }
    });
  } catch (e: any) {
    // Log error server-side but don't expose details to client
    console.error('Session status error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


