-- =====================================================
-- COZY CHAT FUNCTIONS AND PROCEDURES DOCUMENTATION
-- =====================================================
-- This script shows all custom functions, their parameters, and usage
-- Run this in Supabase SQL Editor to understand the business logic functions
-- =====================================================

-- 1. ALL CUSTOM FUNCTIONS OVERVIEW
-- =====================================================
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
    END as volatility,
    CASE p.prosecdef
        WHEN true THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END as security_type,
    l.lanname as language,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'  -- Only functions, not procedures
ORDER BY p.proname;

-- 2. FUNCTION PARAMETERS DETAILED VIEW
-- =====================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as full_signature,
    unnest(p.proargnames) as parameter_name,
    unnest(p.proargtypes::regtype[]) as parameter_type,
    unnest(p.proargmodes) as parameter_mode,
    generate_subscripts(p.proargnames, 1) as parameter_position
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proargnames IS NOT NULL
ORDER BY p.proname, parameter_position;

-- 3. SPECIFIC COZY CHAT FUNCTIONS
-- =====================================================

-- Session Management Functions
SELECT 
    'Session Management' as category,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.proname LIKE '%session%'
ORDER BY p.proname;

-- User Management Functions
SELECT 
    'User Management' as category,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (p.proname LIKE '%user%' OR p.proname LIKE '%match%')
ORDER BY p.proname;

-- Utility Functions
SELECT 
    'Utility Functions' as category,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND (p.proname LIKE '%cleanup%' OR p.proname LIKE '%stats%' OR p.proname LIKE '%report%')
ORDER BY p.proname;

-- 4. FUNCTION DEPENDENCIES
-- =====================================================
-- Functions that depend on tables
SELECT 
    p.proname as function_name,
    c.relname as dependent_table,
    c.relkind as table_type
FROM pg_proc p
JOIN pg_depend d ON p.oid = d.objid
JOIN pg_class c ON d.refobjid = c.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND c.relkind = 'r'  -- Only tables
ORDER BY p.proname, c.relname;

-- 5. TRIGGER FUNCTIONS
-- =====================================================
SELECT 
    p.proname as trigger_function,
    t.tgname as trigger_name,
    c.relname as table_name,
    t.tgtype as trigger_type,
    CASE 
        WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
        WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
        ELSE 'OTHER'
    END as trigger_event
FROM pg_proc p
JOIN pg_trigger t ON p.oid = t.tgfoid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND c.relkind = 'r'
ORDER BY c.relname, t.tgname;

-- 6. FUNCTION EXECUTION STATISTICS
-- =====================================================
SELECT 
    p.proname as function_name,
    pg_stat_get_numscans(p.oid) as calls,
    pg_stat_get_total_time(p.oid) as total_time_ms,
    CASE 
        WHEN pg_stat_get_numscans(p.oid) > 0 
        THEN ROUND(pg_stat_get_total_time(p.oid) / pg_stat_get_numscans(p.oid), 2)
        ELSE 0 
    END as avg_time_ms
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND pg_stat_get_numscans(p.oid) > 0
ORDER BY pg_stat_get_total_time(p.oid) DESC;

-- 7. SECURITY DEFINER FUNCTIONS
-- =====================================================
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
ORDER BY p.proname;

-- 8. FUNCTIONS WITH COMMENTS/DOCUMENTATION
-- =====================================================
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    obj_description(p.oid, 'pg_proc') as documentation
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND obj_description(p.oid, 'pg_proc') IS NOT NULL
ORDER BY p.proname;

-- 9. FUNCTION SOURCE CODE (if available)
-- =====================================================
-- Note: This shows the function definitions
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.proname IN (
        'create_or_join_session_atomic',
        'cleanup_old_sessions',
        'match_users_by_interests',
        'end_chat_session',
        'report_user',
        'get_active_users_count',
        'set_session_context'
    )
ORDER BY p.proname;

-- 10. FUNCTION PERMISSIONS
-- =====================================================
SELECT 
    p.proname as function_name,
    r.rolname as role_name,
    pr.privilege_type,
    pr.is_grantable
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN information_schema.routine_privileges pr ON p.proname = pr.routine_name
JOIN pg_roles r ON pr.grantee = r.rolname
WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND pr.routine_schema = 'public'
ORDER BY p.proname, r.rolname, pr.privilege_type;
