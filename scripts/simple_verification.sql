-- Simple SQL verification script for Migration 017
-- Run this directly in your database to verify the migration

-- 1. Check if all tables exist
SELECT 'Tables Check' as check_type, 
       table_name, 
       'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('interest_categories', 'interest_compatibility', 'match_queue', 'match_cache')
ORDER BY table_name;

-- 2. Check if all functions exist
SELECT 'Functions Check' as check_type,
       routine_name as function_name,
       'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'calculate_compatibility_score',
    'get_cached_compatibility_score', 
    'cache_compatibility_score',
    'find_best_match_from_queue',
    'create_or_join_session_atomic',
    'cleanup_old_sessions'
)
ORDER BY routine_name;

-- 3. Check interest categories data
SELECT 'Interest Categories' as check_type,
       COUNT(*) as total_categories,
       COUNT(DISTINCT category) as unique_categories
FROM interest_categories;

-- 4. Check interest compatibility data
SELECT 'Interest Compatibility' as check_type,
       COUNT(*) as total_combinations,
       AVG(compatibility_score) as avg_score,
       MAX(compatibility_score) as max_score,
       MIN(compatibility_score) as min_score
FROM interest_compatibility;

-- 5. Test compatibility scoring function
SELECT 'Compatibility Test' as check_type,
       calculate_compatibility_score(
           ARRAY['music', 'movies'], 
           ARRAY['music', 'gaming']
       ) as test_score;

-- 6. Check indexes
SELECT 'Indexes Check' as check_type,
       indexname,
       tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND (indexname LIKE 'idx_match_%' OR indexname LIKE 'idx_interest_%')
ORDER BY tablename, indexname;

-- 7. Check RLS policies
SELECT 'RLS Policies Check' as check_type,
       tablename,
       policyname,
       cmd as policy_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('interest_categories', 'interest_compatibility', 'match_queue', 'match_cache')
ORDER BY tablename, policyname;

-- 8. Test cache functions
SELECT 'Cache Test' as check_type,
       get_cached_compatibility_score(
           '00000000-0000-0000-0000-000000000000',
           '00000000-0000-0000-0000-000000000001'
       ) as cache_result;

-- 9. Test queue function
SELECT 'Queue Test' as check_type,
       find_best_match_from_queue(
           '00000000-0000-0000-0000-000000000000',
           ARRAY['music', 'movies']
       ) as queue_result;

-- 10. Final verification summary
SELECT 'MIGRATION VERIFICATION COMPLETE' as status,
       'All components should be working correctly' as message;
