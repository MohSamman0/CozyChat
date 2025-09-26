-- =====================================================
-- COZY CHAT PERMISSIONS AND GRANTS DOCUMENTATION
-- =====================================================
-- This script shows all database permissions, grants, and role configurations
-- Run this in Supabase SQL Editor to understand the permission model
-- =====================================================

-- 1. DATABASE ROLES OVERVIEW
-- =====================================================
SELECT 
    rolname as role_name,
    rolsuper as is_superuser,
    rolinherit as can_inherit,
    rolcreaterole as can_create_roles,
    rolcreatedb as can_create_databases,
    rolcanlogin as can_login,
    rolreplication as can_replicate,
    rolconnlimit as connection_limit,
    rolvaliduntil as valid_until
FROM pg_roles 
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY rolname;

-- 2. TABLE PERMISSIONS BY ROLE
-- =====================================================
SELECT 
    t.table_name,
    t.privilege_type,
    t.grantee as role_name,
    t.is_grantable,
    t.grantor
FROM information_schema.table_privileges t
WHERE t.table_schema = 'public'
    AND t.grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY t.table_name, t.grantee, t.privilege_type;

-- 3. FUNCTION PERMISSIONS BY ROLE
-- =====================================================
SELECT 
    r.routine_name as function_name,
    r.privilege_type,
    r.grantee as role_name,
    r.is_grantable,
    r.grantor
FROM information_schema.routine_privileges r
WHERE r.routine_schema = 'public'
    AND r.grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY r.routine_name, r.grantee, r.privilege_type;

-- 4. SCHEMA PERMISSIONS
-- =====================================================
SELECT 
    schema_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.usage_privileges 
WHERE object_schema = 'public'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY schema_name, grantee, privilege_type;

-- 5. SPECIFIC TABLE PERMISSIONS BREAKDOWN
-- =====================================================

-- Anonymous Users Table Permissions
SELECT 
    'anonymous_users' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'anonymous_users'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- Chat Sessions Table Permissions
SELECT 
    'chat_sessions' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'chat_sessions'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- Messages Table Permissions
SELECT 
    'messages' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'messages'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- Message Reactions Table Permissions
SELECT 
    'message_reactions' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'message_reactions'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- Reports Table Permissions
SELECT 
    'reports' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'reports'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- Banned Users Table Permissions
SELECT 
    'banned_users' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'banned_users'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- User Roles Table Permissions
SELECT 
    'user_roles' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- System Stats Table Permissions
SELECT 
    'system_stats' as table_name,
    privilege_type,
    grantee as role_name,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
    AND table_name = 'system_stats'
    AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY grantee, privilege_type;

-- 6. ROLE MEMBERSHIP
-- =====================================================
SELECT 
    r.rolname as role_name,
    m.rolname as member_name,
    a.admin_option
FROM pg_auth_members am
JOIN pg_roles r ON am.roleid = r.oid
JOIN pg_roles m ON am.member = m.oid
LEFT JOIN pg_auth_members a ON am.roleid = a.roleid AND am.member = a.member
WHERE r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
    OR m.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY r.rolname, m.rolname;

-- 7. PERMISSION SUMMARY BY ROLE
-- =====================================================
SELECT 
    grantee as role_name,
    COUNT(*) as total_grants,
    COUNT(CASE WHEN privilege_type = 'SELECT' THEN 1 END) as select_grants,
    COUNT(CASE WHEN privilege_type = 'INSERT' THEN 1 END) as insert_grants,
    COUNT(CASE WHEN privilege_type = 'UPDATE' THEN 1 END) as update_grants,
    COUNT(CASE WHEN privilege_type = 'DELETE' THEN 1 END) as delete_grants,
    COUNT(CASE WHEN privilege_type = 'EXECUTE' THEN 1 END) as execute_grants,
    COUNT(CASE WHEN privilege_type = 'USAGE' THEN 1 END) as usage_grants
FROM (
    SELECT grantee, privilege_type FROM information_schema.table_privileges WHERE table_schema = 'public'
    UNION ALL
    SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_schema = 'public'
    UNION ALL
    SELECT grantee, privilege_type FROM information_schema.usage_privileges WHERE object_schema = 'public'
) all_grants
WHERE grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
GROUP BY grantee
ORDER BY grantee;

-- 8. SECURITY DEFINER FUNCTIONS PERMISSIONS
-- =====================================================
SELECT 
    p.proname as function_name,
    r.privilege_type,
    r.grantee as role_name,
    r.is_grantable
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN information_schema.routine_privileges r ON p.proname = r.routine_name
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prosecdef = true
    AND r.routine_schema = 'public'
    AND r.grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY p.proname, r.grantee, r.privilege_type;

-- 9. REALTIME PERMISSIONS (for Supabase Realtime)
-- =====================================================
-- Check if tables have replica identity set for realtime
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN relreplident = 'd' THEN 'Default (Primary Key)'
        WHEN relreplident = 'n' THEN 'Nothing'
        WHEN relreplident = 'f' THEN 'Full'
        WHEN relreplident = 'i' THEN 'Index'
        ELSE 'Unknown'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
ORDER BY tablename;

-- 10. PERMISSION GAPS ANALYSIS
-- =====================================================
-- Tables that might need additional permissions
SELECT 
    'Permission Analysis' as category,
    t.table_name,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.table_privileges tp 
                        WHERE tp.table_name = t.table_name 
                        AND tp.table_schema = 'public' 
                        AND tp.grantee = 'anon' 
                        AND tp.privilege_type = 'SELECT') 
        THEN 'anon role missing SELECT permission'
        ELSE 'anon role has SELECT permission'
    END as anon_select_status,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.table_privileges tp 
                        WHERE tp.table_name = t.table_name 
                        AND tp.table_schema = 'public' 
                        AND tp.grantee = 'service_role' 
                        AND tp.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) 
        THEN 'service_role missing full permissions'
        ELSE 'service_role has full permissions'
    END as service_role_status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
