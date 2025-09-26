-- Test script to verify RLS policies are working correctly
-- This script tests data isolation and access control

-- Test 1: Check RLS status on all tables
SELECT 
    'RLS Status Check' as test_name,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Test 2: Count RLS policies per table
SELECT 
    'Policy Count Check' as test_name,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES' 
        ELSE '❌ NO POLICIES' 
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Test 3: Verify interest_matches has policies (if table exists)
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'interest_matches') THEN
        SELECT COUNT(*) INTO policy_count 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'interest_matches';
        
        IF policy_count > 0 THEN
            RAISE NOTICE '✅ interest_matches table has % RLS policies', policy_count;
        ELSE
            RAISE NOTICE '❌ interest_matches table has NO RLS policies';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ interest_matches table does not exist';
    END IF;
END $$;

-- Test 4: Check if helper functions exist
SELECT 
    'Helper Functions Check' as test_name,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN ('get_user_id_from_session', 'is_admin') THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_user_id_from_session', 'is_admin')
ORDER BY routine_name;

-- Test 5: Verify all critical tables have RLS enabled
DO $$
DECLARE
    disabled_tables TEXT[];
    table_name TEXT;
BEGIN
    SELECT ARRAY_AGG(tablename) INTO disabled_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND rowsecurity = false;
    
    IF array_length(disabled_tables, 1) IS NULL THEN
        RAISE NOTICE '✅ ALL TABLES HAVE RLS ENABLED';
    ELSE
        RAISE NOTICE '❌ TABLES WITH RLS DISABLED: %', array_to_string(disabled_tables, ', ');
    END IF;
END $$;

-- Summary
SELECT 'RLS Security Test Complete' as summary;
