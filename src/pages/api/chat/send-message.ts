import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase';

interface SendMessageRequest {
  session_id: string;
  sender_id: string;
  content: string;
  encrypted_content: string;
}

interface SendMessageResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

// Rate limiting storage (in production, use Redis or database)
const messageRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_MESSAGES_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const userLimit = messageRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize rate limit
    messageRateLimit.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return {
      allowed: true,
      remaining: MAX_MESSAGES_PER_MINUTE - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  if (userLimit.count >= MAX_MESSAGES_PER_MINUTE) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    };
  }

  userLimit.count += 1;
  return {
    allowed: true,
    remaining: MAX_MESSAGES_PER_MINUTE - userLimit.count,
    resetTime: userLimit.resetTime
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendMessageResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { session_id, sender_id, content, encrypted_content }: SendMessageRequest = req.body;

    // Validate required fields
    if (!session_id || !sender_id || !content || !encrypted_content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate message length
    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 1000 characters)'
      });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(sender_id);
    if (!rateCheck.allowed) {
      const retryAfter = Math.ceil((rateCheck.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      });
    }

    const supabase = createAdminClient();

    // Verify session exists and is active
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

    const sessionData = session as { id: string; status: string; user1_id: string; user2_id: string };

    if (sessionData.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Session is not active'
      });
    }

    // Verify user is part of the session
    if (sessionData.user1_id !== sender_id && sessionData.user2_id !== sender_id) {
      return res.status(403).json({
        success: false,
        error: 'User not authorized for this session'
      });
    }

    // Insert message
    const { data: message, error: insertError } = await (supabase as any)
      .from('messages')
      .insert({
        session_id,
        sender_id,
        content,
        encrypted_content,
        message_type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting message:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send message'
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_MESSAGES_PER_MINUTE.toString());
    res.setHeader('X-RateLimit-Remaining', rateCheck.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateCheck.resetTime / 1000).toString());

    return res.status(201).json({
      success: true,
      message_id: message.id
    });
  } catch (error) {
    console.error('Unexpected error in send-message:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
