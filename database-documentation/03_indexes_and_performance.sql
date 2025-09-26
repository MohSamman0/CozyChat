-- =====================================================
-- COZY CHAT INDEXES AND PERFORMANCE ANALYSIS
-- =====================================================
-- This script shows all indexes, their usage statistics, and performance metrics
-- Run this in Supabase SQL Editor to understand database performance optimization
-- =====================================================

-- 1. ALL INDEXES IN THE DATABASE
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 2. INDEX USAGE STATISTICS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Never Used'
        WHEN idx_scan < 100 THEN 'Rarely Used'
        WHEN idx_scan < 1000 THEN 'Moderately Used'
        ELSE 'Frequently Used'
    END as usage_category
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. TABLE ACCESS STATISTICS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC;

-- 4. INDEX SIZE ANALYSIS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(indrelid)) as table_size,
    ROUND(
        (pg_relation_size(indexrelid)::numeric / 
         NULLIF(pg_relation_size(indrelid), 0)::numeric) * 100, 2
    ) as index_to_table_ratio_percent
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 5. POTENTIAL MISSING INDEXES (based on sequential scans)
-- =====================================================
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    CASE 
        WHEN seq_scan > 0 THEN ROUND(seq_tup_read::numeric / seq_scan, 2)
        ELSE 0 
    END as avg_tuples_per_scan
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
    AND seq_scan > 0
    AND seq_tup_read > 1000  -- Only tables with significant sequential reads
ORDER BY seq_tup_read DESC;

-- 6. INDEX EFFICIENCY ANALYSIS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan > 0 THEN ROUND(idx_tup_read::numeric / idx_scan, 2)
        ELSE 0 
    END as avg_tuples_per_scan,
    CASE 
        WHEN idx_tup_read > 0 THEN ROUND((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
        ELSE 0 
    END as fetch_efficiency_percent
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
    AND idx_scan > 0
ORDER BY fetch_efficiency_percent DESC;

-- 7. SPECIFIC INDEXES FOR COZY CHAT TABLES
-- =====================================================
-- Anonymous Users Indexes
SELECT 
    'anonymous_users' as table_name,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes pi
JOIN pg_stat_user_indexes psi ON pi.indexname = psi.indexname
WHERE pi.tablename = 'anonymous_users' 
    AND pi.schemaname = 'public'
ORDER BY pg_relation_size(psi.indexrelid) DESC;

-- Chat Sessions Indexes
SELECT 
    'chat_sessions' as table_name,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes pi
JOIN pg_stat_user_indexes psi ON pi.indexname = psi.indexname
WHERE pi.tablename = 'chat_sessions' 
    AND pi.schemaname = 'public'
ORDER BY pg_relation_size(psi.indexrelid) DESC;

-- Messages Indexes
SELECT 
    'messages' as table_name,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes pi
JOIN pg_stat_user_indexes psi ON pi.indexname = psi.indexname
WHERE pi.tablename = 'messages' 
    AND pi.schemaname = 'public'
ORDER BY pg_relation_size(psi.indexrelid) DESC;

-- 8. PARTIAL INDEXES (WHERE clauses)
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexdef LIKE '%WHERE%'
ORDER BY tablename, indexname;

-- 9. UNIQUE INDEXES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;

-- 10. GIN INDEXES (for array and full-text search)
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexdef LIKE '%gin%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 11. RECOMMENDATIONS FOR INDEX OPTIMIZATION
-- =====================================================
-- This query identifies tables that might benefit from additional indexes
SELECT 
    'Performance Recommendations' as category,
    'Tables with high sequential scan activity' as recommendation,
    tablename,
    seq_scan,
    seq_tup_read
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
    AND seq_scan > 100
    AND seq_tup_read > 10000
ORDER BY seq_tup_read DESC;
