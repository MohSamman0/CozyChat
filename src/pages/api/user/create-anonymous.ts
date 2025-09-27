import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface CreateUserRequest {
  interests?: string[];
}

interface CreateUserResponse {
  success: boolean;
  user?: {
    id: string;
    session_id: string;
    interests: string[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateUserResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { interests = [] }: CreateUserRequest = req.body;

    // Generate a unique session ID
    const sessionId = `cozy_${uuidv4().replace(/-/g, '')}`;

    const supabase = createAdminClient();

    // Create anonymous user
    const { data: user, error: createError } = await (supabase as any)
      .from('anonymous_users')
      .insert({
        session_id: sessionId,
        interests: Array.isArray(interests) ? interests.slice(0, 10) : [], // Limit to 10 interests
        is_active: true,
        connected_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, session_id, interests')
      .single();

    if (createError) {
      console.error('Error creating anonymous user:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        session_id: user.session_id,
        interests: user.interests || []
      }
    });
  } catch (error) {
    console.error('Unexpected error in create-anonymous:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
