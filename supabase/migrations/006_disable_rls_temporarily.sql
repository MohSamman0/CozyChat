-- Temporarily disable RLS to test if that's the issue
-- This will help us identify if RLS is the problem

-- Disable RLS on anonymous_users table temporarily
ALTER TABLE anonymous_users DISABLE ROW LEVEL SECURITY;

-- Also disable on other tables that might be affected
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats DISABLE ROW LEVEL SECURITY;
