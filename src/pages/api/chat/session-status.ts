import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Missing session id' });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await (supabase as any)
      .from('chat_sessions')
      .select('id, status, user1_id, user2_id, started_at, ended_at, created_at')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ session: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}


