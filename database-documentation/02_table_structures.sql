-- =====================================================
-- COZY CHAT TABLE STRUCTURES DETAILED VIEW
-- =====================================================
-- This script shows detailed information about each table structure
-- Run this in Supabase SQL Editor to see column details, constraints, and defaults
-- =====================================================

-- 1. ANONYMOUS_USERS TABLE STRUCTURE
-- =====================================================
SELECT 
    'anonymous_users' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'anonymous_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check constraints for anonymous_users
SELECT 
    'anonymous_users' as table_name,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'anonymous_users' 
    AND tc.table_schema = 'public';

-- 2. CHAT_SESSIONS TABLE STRUCTURE
-- =====================================================
SELECT 
    'chat_sessions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'chat_sessions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. MESSAGES TABLE STRUCTURE
-- =====================================================
SELECT 
    'messages' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'messages' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. MESSAGE_REACTIONS TABLE STRUCTURE
-- =====================================================
SELECT 
    'message_reactions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'message_reactions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check constraints for message_reactions (reaction emoji validation)
SELECT 
    'message_reactions' as table_name,
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'message_reactions' 
    AND tc.table_schema = 'public';

-- 5. REPORTS TABLE STRUCTURE
-- =====================================================
SELECT 
    'reports' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'reports' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. BANNED_USERS TABLE STRUCTURE
-- =====================================================
SELECT 
    'banned_users' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'banned_users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. USER_ROLES TABLE STRUCTURE
-- =====================================================
SELECT 
    'user_roles' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. SYSTEM_STATS TABLE STRUCTURE
-- =====================================================
SELECT 
    'system_stats' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'system_stats' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. INTEREST_MATCHES TABLE STRUCTURE (if exists)
-- =====================================================
SELECT 
    'interest_matches' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'interest_matches' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. ALL PRIMARY KEYS AND UNIQUE CONSTRAINTS
-- =====================================================
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position;

-- 11. ALL FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 
    tc.table_name as source_table,
    kcu.column_name as source_column,
    ccu.table_name as target_table,
    ccu.column_name as target_column,
    tc.constraint_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
