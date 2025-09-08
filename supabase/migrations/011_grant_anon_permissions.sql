-- 011_grant_anon_permissions.sql
-- Grant necessary permissions to anon role for Realtime to work

-- Grant SELECT permission on messages table to anon role
GRANT SELECT ON public.messages TO anon;

-- Grant SELECT permission on chat_sessions table to anon role  
GRANT SELECT ON public.chat_sessions TO anon;

-- Grant SELECT permission on anonymous_users table to anon role
GRANT SELECT ON public.anonymous_users TO anon;

-- Also grant to authenticated role for completeness
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.chat_sessions TO authenticated;
GRANT SELECT ON public.anonymous_users TO authenticated;
