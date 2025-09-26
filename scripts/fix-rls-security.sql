-- Manual RLS Security Fix Script
-- Run this script to fix the critical RLS security issues
-- This can be executed directly in your database management tool

-- Step 1: Re-enable RLS on all tables (undoing migration 006)
ALTER TABLE anonymous_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_stats ENABLE ROW LEVEL SECURITY;

-- Step 2: Enable RLS on interest_matches table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interest_matches') THEN
        ALTER TABLE interest_matches ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on interest_matches table';
    ELSE
        RAISE NOTICE 'interest_matches table does not exist, skipping';
    END IF;
END $$;

-- Step 3: Add missing RLS policies for interest_matches table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interest_matches') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own interest matches" ON interest_matches;
        DROP POLICY IF EXISTS "Users can insert their own interest matches" ON interest_matches;
        DROP POLICY IF EXISTS "Users can update their own interest matches" ON interest_matches;
        DROP POLICY IF EXISTS "Service role can insert interest matches" ON interest_matches;
        DROP POLICY IF EXISTS "Admins can access all interest matches" ON interest_matches;
        
        -- Create new policies
        CREATE POLICY "Users can view their own interest matches" ON interest_matches
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM chat_sessions cs 
                    WHERE cs.id = interest_matches.session_id 
                    AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                         OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
                )
            );

        CREATE POLICY "Users can insert their own interest matches" ON interest_matches
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM chat_sessions cs 
                    WHERE cs.id = interest_matches.session_id 
                    AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                         OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
                )
            );

        CREATE POLICY "Users can update their own interest matches" ON interest_matches
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM chat_sessions cs 
                    WHERE cs.id = interest_matches.session_id 
                    AND (cs.user1_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)) 
                         OR cs.user2_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)))
                )
            );

        CREATE POLICY "Service role can insert interest matches" ON interest_matches
            FOR INSERT WITH CHECK (auth.role() = 'service_role');

        CREATE POLICY "Admins can access all interest matches" ON interest_matches
            FOR ALL USING (is_admin(auth.uid()));
            
        RAISE NOTICE 'Created RLS policies for interest_matches table';
    ELSE
        RAISE NOTICE 'interest_matches table does not exist, skipping policy creation';
    END IF;
END $$;

-- Step 4: Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Step 5: List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 6: Final success message
DO $$
BEGIN
    RAISE NOTICE 'RLS security fix completed successfully!';
END $$;
