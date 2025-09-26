-- =====================================================
-- COZY CHAT DATABASE SCHEMA OVERVIEW
-- =====================================================
-- This script provides a comprehensive overview of the database schema
-- Run this in Supabase SQL Editor to understand the current database structure
-- =====================================================

-- 1. EXTENSIONS AND CUSTOM TYPES
-- =====================================================
SELECT 
    'Extensions' as category,
    extname as name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm')
ORDER BY extname;

-- Custom ENUM types
SELECT 
    'Custom Types' as category,
    t.typname as type_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid 
WHERE t.typname IN ('chat_status', 'message_type', 'report_status', 'user_role')
ORDER BY t.typname, e.enumsortorder;

-- 2. TABLE STRUCTURE OVERVIEW
-- =====================================================
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 3. TABLE RELATIONSHIPS
-- =====================================================
SELECT
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. TABLE SIZES AND ROW COUNTS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.tables t2 
     WHERE t2.table_name = t1.tablename 
     AND t2.table_schema = t1.schemaname) as estimated_rows
FROM pg_tables t1
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 5. ACTUAL ROW COUNTS (if tables have data)
-- =====================================================
-- Uncomment these queries if you want to see actual row counts
-- (Note: These might be slow on large tables)

/*
SELECT 'anonymous_users' as table_name, COUNT(*) as row_count FROM anonymous_users
UNION ALL
SELECT 'chat_sessions', COUNT(*) FROM chat_sessions
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'message_reactions', COUNT(*) FROM message_reactions
UNION ALL
SELECT 'reports', COUNT(*) FROM reports
UNION ALL
SELECT 'banned_users', COUNT(*) FROM banned_users
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'system_stats', COUNT(*) FROM system_stats
UNION ALL
SELECT 'interest_matches', COUNT(*) FROM interest_matches;
*/

-- 6. DATABASE VERSION AND CONFIGURATION
-- =====================================================
SELECT 
    'Database Info' as category,
    'PostgreSQL Version' as setting,
    version() as value
UNION ALL
SELECT 
    'Database Info',
    'Current Database',
    current_database()
UNION ALL
SELECT 
    'Database Info',
    'Current Schema',
    current_schema()
UNION ALL
SELECT 
    'Database Info',
    'Current User',
    current_user;
