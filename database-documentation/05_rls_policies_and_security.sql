-- =====================================================
-- COZY CHAT RLS POLICIES AND SECURITY DOCUMENTATION
-- =====================================================
-- This script shows all Row Level Security policies and security configurations
-- Run this in Supabase SQL Editor to understand the security model
-- =====================================================

-- 1. RLS STATUS FOR ALL TABLES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'Enabled'
        ELSE 'Disabled'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. ALL RLS POLICIES OVERVIEW
-- =====================================================
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

-- 3. RLS POLICIES BY TABLE
-- =====================================================

-- Anonymous Users Policies
SELECT 
    'anonymous_users' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'anonymous_users'
ORDER BY policyname;

-- Chat Sessions Policies
SELECT 
    'chat_sessions' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'chat_sessions'
ORDER BY policyname;

-- Messages Policies
SELECT 
    'messages' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'messages'
ORDER BY policyname;

-- Message Reactions Policies
SELECT 
    'message_reactions' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'message_reactions'
ORDER BY policyname;

-- Reports Policies
SELECT 
    'reports' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'reports'
ORDER BY policyname;

-- Banned Users Policies
SELECT 
    'banned_users' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'banned_users'
ORDER BY policyname;

-- User Roles Policies
SELECT 
    'user_roles' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'user_roles'
ORDER BY policyname;

-- System Stats Policies
SELECT 
    'system_stats' as table_name,
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename = 'system_stats'
ORDER BY policyname;

-- 4. RLS POLICIES BY COMMAND TYPE
-- =====================================================
SELECT 
    cmd as command_type,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT tablename, ', ' ORDER BY tablename) as affected_tables
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY cmd
ORDER BY cmd;

-- 5. RLS POLICIES BY ROLE
-- =====================================================
SELECT 
    unnest(roles) as role_name,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT tablename, ', ' ORDER BY tablename) as affected_tables
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY unnest(roles)
ORDER BY role_name;

-- 6. SECURITY DEFINER FUNCTIONS USED IN POLICIES
-- =====================================================
-- Functions that are likely used in RLS policies
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    'SECURITY DEFINER' as security_type,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef = true
    AND p.proname IN (
        'is_admin',
        'get_user_id_from_session',
        'set_session_context'
    )
ORDER BY p.proname;

-- 7. POLICY EXPRESSIONS (USING and WITH CHECK clauses)
-- =====================================================
-- Note: This shows the actual policy expressions
SELECT 
    tablename,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
    AND (qual IS NOT NULL OR with_check IS NOT NULL)
ORDER BY tablename, policyname;

-- 8. TABLES WITHOUT RLS POLICIES
-- =====================================================
SELECT 
    t.tablename,
    'No RLS Policies' as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND p.tablename IS NULL
ORDER BY t.tablename;

-- 9. RLS POLICY COVERAGE ANALYSIS
-- =====================================================
SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 10. SECURITY RECOMMENDATIONS
-- =====================================================
-- Tables that have RLS enabled but no policies
SELECT 
    'Security Warning' as category,
    t.tablename,
    'RLS enabled but no policies defined' as issue
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND p.tablename IS NULL

UNION ALL

-- Tables with RLS disabled
SELECT 
    'Security Warning' as category,
    t.tablename,
    'RLS disabled - all data accessible' as issue
FROM pg_tables t
WHERE t.schemaname = 'public'
    AND t.rowsecurity = false
    AND t.tablename NOT IN ('pg_stat_statements', 'pg_stat_user_functions')  -- System tables

ORDER BY category, tablename;
