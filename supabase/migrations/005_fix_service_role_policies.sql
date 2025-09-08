-- Fix service role policies to allow admin operations
-- Service role should be able to bypass RLS for all operations

-- Drop existing policies that might be interfering
DROP POLICY IF EXISTS "Users can insert their own record" ON anonymous_users;
DROP POLICY IF EXISTS "Users can read their own record" ON anonymous_users;
DROP POLICY IF EXISTS "Users can update their own record" ON anonymous_users;

-- Create new policies that allow service role to bypass RLS
CREATE POLICY "Service role can manage all users" ON anonymous_users
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Users can insert their own record" ON anonymous_users
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role' OR 
        session_id = current_setting('app.current_user_session_id', true)
    );

CREATE POLICY "Users can read their own record" ON anonymous_users
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR 
        session_id = current_setting('app.current_user_session_id', true)
    );

CREATE POLICY "Users can update their own record" ON anonymous_users
    FOR UPDATE
    USING (
        auth.role() = 'service_role' OR 
        session_id = current_setting('app.current_user_session_id', true)
    );

-- Similar fixes for other tables
CREATE POLICY "Service role can manage all sessions" ON chat_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all messages" ON messages
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all reactions" ON message_reactions
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all reports" ON reports
    FOR ALL
    USING (auth.role() = 'service_role');
