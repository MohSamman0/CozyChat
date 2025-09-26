-- Fix critical RLS security issues
-- This migration re-enables RLS and adds missing policies

-- Re-enable RLS on all tables (undoing migration 006)
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- Enable RLS on interest_matches table (created in migration 013)
ALTER TABLE interest_matches ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for interest_matches table
-- Users can view their own interest matches
CREATE POLICY "Users can view their own interest matches" ON interest_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

-- Users can insert their own interest matches
CREATE POLICY "Users can insert their own interest matches" ON interest_matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

-- Users can update their own interest matches
CREATE POLICY "Users can update their own interest matches" ON interest_matches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

-- Service role can insert interest matches for matching process
CREATE POLICY "Service role can insert interest matches" ON interest_matches
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Admins can access all interest matches
CREATE POLICY "Admins can access all interest matches" ON interest_matches
    FOR ALL USING (is_admin(auth.uid()));

-- Add comment explaining the security fix
COMMENT ON TABLE interest_matches IS 'Interest matching statistics with RLS policies to ensure users can only access their own session data';
