import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Client for browser usage with RLS enabled
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client for server-side operations (requires service role key)
export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Helper to get current user session
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper to set session context for RLS policies
export const setSessionContext = async (sessionId: string): Promise<void> => {
  try {
    const { error } = await supabase.rpc('set_session_context', {
      session_id: sessionId
    } as any);
    
    if (error) {
      console.error('Failed to set session context:', error);
      throw new Error(`Failed to set session context: ${error.message}`);
    }
  } catch (err) {
    console.error('Error setting session context:', err);
    throw err;
  }
};

// Helper to check if user is admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'admin');

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (err) {
    console.error('Error in isAdmin:', err);
    return false;
  }
};
