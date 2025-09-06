import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface UpdateActivityRequest {
  user_id: string;
}

interface UpdateActivityResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateActivityResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { user_id }: UpdateActivityRequest = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const supabase = createAdminClient();

    // Update user's last_seen timestamp and ensure they're marked as active
    const { error } = await (supabase as any)
      .from('anonymous_users')
      .update({
        last_seen: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (error) {
      console.error('Error updating user activity:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user activity'
      });
    }

    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Unexpected error in update-activity:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
