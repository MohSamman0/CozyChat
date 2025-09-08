-- Grant explicit permissions to service role
-- This ensures the service role can perform all necessary operations

-- Grant all permissions on anonymous_users table to service role
GRANT ALL ON TABLE anonymous_users TO service_role;

-- Grant all permissions on chat_sessions table to service role
GRANT ALL ON TABLE chat_sessions TO service_role;

-- Grant all permissions on messages table to service role
GRANT ALL ON TABLE messages TO service_role;

-- Grant all permissions on message_reactions table to service role
GRANT ALL ON TABLE message_reactions TO service_role;

-- Grant all permissions on reports table to service role
GRANT ALL ON TABLE reports TO service_role;

-- Grant all permissions on banned_users table to service role
GRANT ALL ON TABLE banned_users TO service_role;

-- Grant all permissions on user_roles table to service_role
GRANT ALL ON TABLE user_roles TO service_role;

-- Grant all permissions on system_stats table to service_role
GRANT ALL ON TABLE system_stats TO service_role;

-- Grant execute permissions on all functions to service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO service_role;
