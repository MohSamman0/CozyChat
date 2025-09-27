-- Enable Row Level Security on all tables
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user_id from session_id
CREATE OR REPLACE FUNCTION get_user_id_from_session(session_id_param TEXT)
RETURNS UUID AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM anonymous_users WHERE session_id = session_id_param;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for anonymous_users
-- Users can read their own record and active users for matching
CREATE POLICY "Users can read their own record" ON anonymous_users
    FOR SELECT
    USING (session_id = current_setting('app.current_user_session_id', true));

CREATE POLICY "Users can update their own record" ON anonymous_users
    FOR UPDATE
    USING (session_id = current_setting('app.current_user_session_id', true));

CREATE POLICY "Users can insert their own record" ON anonymous_users
    FOR INSERT
    WITH CHECK (session_id = current_setting('app.current_user_session_id', true));

CREATE POLICY "Users can see active users for matching" ON anonymous_users
    FOR SELECT
    USING (is_active = true AND id != get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON anonymous_users
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for chat_sessions
-- Users can see sessions they are part of
CREATE POLICY "Users can see their own sessions" ON chat_sessions
    FOR SELECT
    USING (
        user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
        OR user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
    );

CREATE POLICY "Users can create waiting sessions" ON chat_sessions
    FOR INSERT
    WITH CHECK (user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "Users can update their sessions" ON chat_sessions
    FOR UPDATE
    USING (
        user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
        OR user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true))
    );

-- Service role can match users
CREATE POLICY "Service role can update sessions for matching" ON chat_sessions
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Admins can see all sessions
CREATE POLICY "Admins can access all sessions" ON chat_sessions
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for messages
-- Users can see messages in their sessions
CREATE POLICY "Users can see messages in their sessions" ON messages
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

CREATE POLICY "Users can send messages in their sessions" ON messages
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
CREATE POLICY "Admins can access all messages" ON messages
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for message_reactions
-- Users can see reactions in their sessions
CREATE POLICY "Users can see reactions in their sessions" ON message_reactions
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

CREATE POLICY "Users can add reactions" ON message_reactions
    FOR INSERT
    WITH CHECK (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "Users can remove their reactions" ON message_reactions
    FOR DELETE
    USING (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- RLS Policies for reports
-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT
    WITH CHECK (reporter_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Users can see their own reports
CREATE POLICY "Users can see their own reports" ON reports
    FOR SELECT
    USING (reporter_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Admins can access all reports
CREATE POLICY "Admins can access all reports" ON reports
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for banned_users
-- Only admins can access banned users
CREATE POLICY "Only admins can access banned users" ON banned_users
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for user_roles
-- Only admins can access user roles
CREATE POLICY "Only admins can access user roles" ON user_roles
    FOR ALL
    USING (is_admin(auth.uid()));

-- RLS Policies for system_stats
-- Only admins can access system stats
CREATE POLICY "Only admins can access system stats" ON system_stats
    FOR ALL
    USING (is_admin(auth.uid()));
