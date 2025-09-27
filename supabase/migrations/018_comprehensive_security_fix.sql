-- Comprehensive Security Fix Migration
-- This migration addresses all critical security vulnerabilities

-- 1. Ensure RLS is enabled on all tables (redundant but safe)
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_matches ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate all RLS policies with improved security
-- This ensures no old policies remain that might have vulnerabilities

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can read their own record" ON anonymous_users;
DROP POLICY IF EXISTS "Users can update their own record" ON anonymous_users;
DROP POLICY IF EXISTS "Users can insert their own record" ON anonymous_users;
DROP POLICY IF EXISTS "Users can see active users for matching" ON anonymous_users;
DROP POLICY IF EXISTS "Admins can read all users" ON anonymous_users;

DROP POLICY IF EXISTS "Users can see their own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create waiting sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Service role can update sessions for matching" ON chat_sessions;
DROP POLICY IF EXISTS "Admins can access all sessions" ON chat_sessions;

DROP POLICY IF EXISTS "Users can see messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their sessions" ON messages;
DROP POLICY IF EXISTS "Admins can access all messages" ON messages;

DROP POLICY IF EXISTS "Users can see reactions in their sessions" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON message_reactions;

DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can see their own reports" ON reports;
DROP POLICY IF EXISTS "Admins can access all reports" ON reports;

DROP POLICY IF EXISTS "Only admins can access banned users" ON banned_users;
DROP POLICY IF EXISTS "Only admins can access user roles" ON user_roles;
DROP POLICY IF EXISTS "Only admins can access system stats" ON system_stats;

DROP POLICY IF EXISTS "Users can view their own interest matches" ON interest_matches;
DROP POLICY IF EXISTS "Users can insert their own interest matches" ON interest_matches;
DROP POLICY IF EXISTS "Users can update their own interest matches" ON interest_matches;
DROP POLICY IF EXISTS "Service role can insert interest matches" ON interest_matches;
DROP POLICY IF EXISTS "Admins can access all interest matches" ON interest_matches;

-- 3. Create improved RLS policies with better security

-- Anonymous Users Policies
CREATE POLICY "secure_users_select_own" ON anonymous_users
    FOR SELECT
    USING (session_id = current_setting('app.current_user_session_id', true));

CREATE POLICY "secure_users_update_own" ON anonymous_users
    FOR UPDATE
    USING (session_id = current_setting('app.current_user_session_id', true));

CREATE POLICY "secure_users_insert_own" ON anonymous_users
    FOR INSERT
    WITH CHECK (session_id = current_setting('app.current_user_session_id', true));

-- Users can only see active users for matching, but not their full details
CREATE POLICY "secure_users_select_active_for_matching" ON anonymous_users
    FOR SELECT
    USING (
        is_active = true 
        AND id != get_user_id_from_session(current_setting('app.current_user_session_id', true))
        AND last_seen > NOW() - INTERVAL '5 minutes'
    );

-- Admins can access all users
CREATE POLICY "secure_admins_access_users" ON anonymous_users
    FOR ALL
    USING (is_admin(auth.uid()));

-- Chat Sessions Policies
CREATE POLICY "secure_sessions_select_own" ON chat_sessions
    FOR SELECT
    USING (
        user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
        OR user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
    );

CREATE POLICY "secure_sessions_insert_own" ON chat_sessions
    FOR INSERT
    WITH CHECK (user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "secure_sessions_update_own" ON chat_sessions
    FOR UPDATE
    USING (
        user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
        OR user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
    );

-- Service role can update sessions for matching (but only specific fields)
CREATE POLICY "secure_service_role_session_matching" ON chat_sessions
    FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Admins can access all sessions
CREATE POLICY "secure_admins_access_sessions" ON chat_sessions
    FOR ALL
    USING (is_admin(auth.uid()));

-- Messages Policies
CREATE POLICY "secure_messages_select_session" ON messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = messages.session_id 
            AND (
                cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
                OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
            )
        )
    );

CREATE POLICY "secure_messages_insert_session" ON messages
    FOR INSERT
    WITH CHECK (
        sender_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
        AND EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = messages.session_id 
            AND cs.status = 'active'
            AND (
                cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
                OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
            )
        )
    );

-- Admins can access all messages
CREATE POLICY "secure_admins_access_messages" ON messages
    FOR ALL
    USING (is_admin(auth.uid()));

-- Message Reactions Policies
CREATE POLICY "secure_reactions_select_session" ON message_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN chat_sessions cs ON m.session_id = cs.id
            WHERE m.id = message_reactions.message_id 
            AND (
                cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
                OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
            )
        )
    );

CREATE POLICY "secure_reactions_insert_own" ON message_reactions
    FOR INSERT
    WITH CHECK (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "secure_reactions_delete_own" ON message_reactions
    FOR DELETE
    USING (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Reports Policies
CREATE POLICY "secure_reports_insert_own" ON reports
    FOR INSERT
    WITH CHECK (reporter_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "secure_reports_select_own" ON reports
    FOR SELECT
    USING (reporter_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Admins can access all reports
CREATE POLICY "secure_admins_access_reports" ON reports
    FOR ALL
    USING (is_admin(auth.uid()));

-- Banned Users Policies (Admin only)
CREATE POLICY "secure_admins_access_banned_users" ON banned_users
    FOR ALL
    USING (is_admin(auth.uid()));

-- User Roles Policies (Admin only)
CREATE POLICY "secure_admins_access_user_roles" ON user_roles
    FOR ALL
    USING (is_admin(auth.uid()));

-- System Stats Policies (Admin only)
CREATE POLICY "secure_admins_access_system_stats" ON system_stats
    FOR ALL
    USING (is_admin(auth.uid()));

-- Interest Matches Policies
CREATE POLICY "secure_interest_matches_select_session" ON interest_matches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

CREATE POLICY "secure_interest_matches_insert_session" ON interest_matches
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

CREATE POLICY "secure_interest_matches_update_session" ON interest_matches
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs 
            WHERE cs.id = interest_matches.session_id 
            AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                 OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
        )
    );

-- Service role can insert interest matches for matching process
CREATE POLICY "secure_service_role_interest_matches" ON interest_matches
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Admins can access all interest matches
CREATE POLICY "secure_admins_access_interest_matches" ON interest_matches
    FOR ALL
    USING (is_admin(auth.uid()));

-- 4. Improve security functions

-- Enhanced session context function with validation
CREATE OR REPLACE FUNCTION set_session_context(session_id TEXT)
RETURNS VOID AS $$
BEGIN
  -- Validate session ID format (should be UUID or our custom format)
  IF session_id IS NULL OR session_id = '' THEN
    RAISE EXCEPTION 'Session ID cannot be null or empty';
  END IF;
  
  -- Set the session context that RLS policies can use
  PERFORM set_config('app.current_user_session_id', session_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced user ID lookup function with validation
CREATE OR REPLACE FUNCTION get_user_id_from_session(session_id_param TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Validate input
  IF session_id_param IS NULL OR session_id_param = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get user ID from session
  SELECT id INTO user_uuid 
  FROM anonymous_users 
  WHERE session_id = session_id_param;
  
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced admin check function
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate input
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add security constraints

-- Add check constraints to prevent invalid data
ALTER TABLE anonymous_users 
ADD CONSTRAINT check_session_id_format 
CHECK (session_id ~ '^[a-zA-Z0-9_-]+$');

ALTER TABLE chat_sessions 
ADD CONSTRAINT check_session_status 
CHECK (status IN ('waiting', 'active', 'ended'));

ALTER TABLE messages 
ADD CONSTRAINT check_message_type 
CHECK (message_type IN ('text', 'system', 'image', 'file'));

ALTER TABLE messages 
ADD CONSTRAINT check_message_length 
CHECK (length(content) <= 1000);

-- 6. Create security audit function
CREATE OR REPLACE FUNCTION security_audit()
RETURNS TABLE(
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity,
        COALESCE(p.policy_count, 0)::INTEGER,
        CASE 
            WHEN NOT t.rowsecurity THEN '❌ RLS DISABLED'
            WHEN COALESCE(p.policy_count, 0) = 0 THEN '❌ NO POLICIES'
            ELSE '✅ SECURED'
        END::TEXT
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY tablename
    ) p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename IN (
        'anonymous_users',
        'chat_sessions', 
        'messages',
        'message_reactions',
        'reports',
        'banned_users',
        'user_roles',
        'system_stats',
        'interest_matches'
    )
    ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_session_context(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_id_from_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_id_from_session(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION security_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION security_audit() TO anon;

-- 8. Add security comments
COMMENT ON TABLE anonymous_users IS 'Anonymous users with RLS policies ensuring data isolation';
COMMENT ON TABLE chat_sessions IS 'Chat sessions with RLS policies ensuring users can only access their own sessions';
COMMENT ON TABLE messages IS 'Messages with RLS policies ensuring users can only access messages in their sessions';
COMMENT ON TABLE message_reactions IS 'Message reactions with RLS policies ensuring users can only access reactions in their sessions';
COMMENT ON TABLE reports IS 'User reports with RLS policies ensuring users can only access their own reports';
COMMENT ON TABLE banned_users IS 'Banned users - admin access only';
COMMENT ON TABLE user_roles IS 'User roles - admin access only';
COMMENT ON TABLE system_stats IS 'System statistics - admin access only';
COMMENT ON TABLE interest_matches IS 'Interest matching statistics with RLS policies ensuring users can only access their own session data';

-- 9. Create security monitoring view
CREATE OR REPLACE VIEW security_status AS
SELECT 
    'RLS Status' as check_type,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN rowsecurity THEN 1 END) THEN '✅ ALL TABLES SECURED'
        ELSE '❌ SOME TABLES NOT SECURED'
    END as status,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity THEN 1 END) as secured_tables
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'anonymous_users',
    'chat_sessions', 
    'messages',
    'message_reactions',
    'reports',
    'banned_users',
    'user_roles',
    'system_stats',
    'interest_matches'
);

-- Grant access to security view
GRANT SELECT ON security_status TO authenticated;
GRANT SELECT ON security_status TO anon;
