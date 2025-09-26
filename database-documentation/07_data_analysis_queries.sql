-- =====================================================
-- COZY CHAT DATA ANALYSIS AND INSIGHTS QUERIES
-- =====================================================
-- This script provides useful queries for analyzing your chat application data
-- Run these queries in Supabase SQL Editor to get insights about usage patterns
-- =====================================================

-- 1. USER ACTIVITY OVERVIEW
-- =====================================================
SELECT 
    'User Activity Summary' as metric,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
    COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '1 hour' THEN 1 END) as users_seen_1h,
    COUNT(CASE WHEN last_seen >= NOW() - INTERVAL '24 hours' THEN 1 END) as users_seen_24h
FROM anonymous_users;

-- 2. CHAT SESSION STATISTICS
-- =====================================================
SELECT 
    'Chat Session Statistics' as metric,
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_sessions,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
    COUNT(CASE WHEN status = 'ended' THEN 1 END) as ended_sessions,
    COUNT(CASE WHEN user2_id IS NOT NULL THEN 1 END) as matched_sessions,
    COUNT(CASE WHEN user2_id IS NULL THEN 1 END) as unmatched_sessions,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as sessions_24h,
    COUNT(CASE WHEN started_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as started_24h
FROM chat_sessions;

-- 3. MESSAGE STATISTICS
-- =====================================================
SELECT 
    'Message Statistics' as metric,
    COUNT(*) as total_messages,
    COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
    COUNT(CASE WHEN message_type = 'system' THEN 1 END) as system_messages,
    COUNT(CASE WHEN is_flagged = true THEN 1 END) as flagged_messages,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as messages_24h,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as messages_1h,
    ROUND(AVG(LENGTH(content)), 2) as avg_message_length
FROM messages;

-- 4. SESSION DURATION ANALYSIS
-- =====================================================
SELECT 
    'Session Duration Analysis' as metric,
    COUNT(*) as total_ended_sessions,
    ROUND(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))/60), 2) as avg_duration_minutes,
    ROUND(MIN(EXTRACT(EPOCH FROM (ended_at - started_at))/60), 2) as min_duration_minutes,
    ROUND(MAX(EXTRACT(EPOCH FROM (ended_at - started_at))/60), 2) as max_duration_minutes,
    COUNT(CASE WHEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 < 1 THEN 1 END) as sessions_under_1min,
    COUNT(CASE WHEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 BETWEEN 1 AND 5 THEN 1 END) as sessions_1_5min,
    COUNT(CASE WHEN EXTRACT(EPOCH FROM (ended_at - started_at))/60 > 5 THEN 1 END) as sessions_over_5min
FROM chat_sessions 
WHERE status = 'ended' 
    AND started_at IS NOT NULL 
    AND ended_at IS NOT NULL;

-- 5. INTEREST MATCHING ANALYSIS
-- =====================================================
SELECT 
    'Interest Matching Analysis' as metric,
    COUNT(*) as total_users_with_interests,
    COUNT(CASE WHEN interests IS NULL OR array_length(interests, 1) IS NULL THEN 1 END) as users_no_interests,
    COUNT(CASE WHEN array_length(interests, 1) = 1 THEN 1 END) as users_1_interest,
    COUNT(CASE WHEN array_length(interests, 1) BETWEEN 2 AND 5 THEN 1 END) as users_2_5_interests,
    COUNT(CASE WHEN array_length(interests, 1) > 5 THEN 1 END) as users_over_5_interests,
    ROUND(AVG(array_length(interests, 1)), 2) as avg_interests_per_user
FROM anonymous_users;

-- 6. POPULAR INTERESTS
-- =====================================================
WITH interest_counts AS (
    SELECT unnest(interests) as interest, COUNT(*) as user_count
    FROM anonymous_users 
    WHERE interests IS NOT NULL
    GROUP BY unnest(interests)
)
SELECT 
    'Popular Interests' as category,
    interest,
    user_count,
    ROUND((user_count::numeric / (SELECT COUNT(*) FROM anonymous_users WHERE interests IS NOT NULL)) * 100, 2) as percentage_of_users
FROM interest_counts
ORDER BY user_count DESC
LIMIT 20;

-- 7. HOURLY ACTIVITY PATTERNS
-- =====================================================
SELECT 
    'Hourly Activity Patterns' as category,
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(*) as sessions_created,
    COUNT(CASE WHEN user2_id IS NOT NULL THEN 1 END) as sessions_matched
FROM chat_sessions 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour_of_day;

-- 8. DAILY ACTIVITY TRENDS
-- =====================================================
SELECT 
    'Daily Activity Trends' as category,
    DATE(created_at) as date,
    COUNT(*) as sessions_created,
    COUNT(CASE WHEN user2_id IS NOT NULL THEN 1 END) as sessions_matched,
    COUNT(DISTINCT user1_id) as unique_users,
    COUNT(DISTINCT user2_id) as unique_matched_users
FROM chat_sessions 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 9. MESSAGE REACTION STATISTICS
-- =====================================================
SELECT 
    'Message Reaction Statistics' as metric,
    COUNT(*) as total_reactions,
    reaction,
    COUNT(*) as reaction_count,
    ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM message_reactions)) * 100, 2) as percentage
FROM message_reactions
GROUP BY reaction
ORDER BY reaction_count DESC;

-- 10. REPORTING STATISTICS
-- =====================================================
SELECT 
    'Reporting Statistics' as metric,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
    COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_reports,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
    COUNT(CASE WHEN status = 'dismissed' THEN 1 END) as dismissed_reports,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as reports_24h
FROM reports;

-- 11. BANNED USERS STATISTICS
-- =====================================================
SELECT 
    'Banned Users Statistics' as metric,
    COUNT(*) as total_bans,
    COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as permanent_bans,
    COUNT(CASE WHEN expires_at IS NOT NULL THEN 1 END) as temporary_bans,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_bans,
    COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_bans
FROM banned_users;

-- 12. SYSTEM PERFORMANCE METRICS
-- =====================================================
SELECT 
    'System Performance Metrics' as category,
    recorded_at,
    active_users,
    total_sessions,
    total_messages
FROM system_stats
ORDER BY recorded_at DESC
LIMIT 10;

-- 13. USER RETENTION ANALYSIS
-- =====================================================
WITH user_sessions AS (
    SELECT 
        user1_id as user_id,
        created_at,
        status,
        user2_id
    FROM chat_sessions
    UNION ALL
    SELECT 
        user2_id as user_id,
        created_at,
        status,
        user1_id
    FROM chat_sessions
    WHERE user2_id IS NOT NULL
),
user_activity AS (
    SELECT 
        user_id,
        MIN(created_at) as first_session,
        MAX(created_at) as last_session,
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN user2_id IS NOT NULL THEN 1 END) as matched_sessions
    FROM user_sessions
    GROUP BY user_id
)
SELECT 
    'User Retention Analysis' as category,
    COUNT(*) as total_users,
    COUNT(CASE WHEN total_sessions = 1 THEN 1 END) as single_session_users,
    COUNT(CASE WHEN total_sessions > 1 THEN 1 END) as returning_users,
    ROUND(AVG(total_sessions), 2) as avg_sessions_per_user,
    ROUND(AVG(matched_sessions), 2) as avg_matched_sessions_per_user
FROM user_activity;

-- 14. INTEREST MATCHING EFFECTIVENESS
-- =====================================================
-- This query shows how often users with shared interests get matched
WITH interest_matches AS (
    SELECT 
        cs.id as session_id,
        cs.created_at,
        cs.user1_id,
        cs.user2_id,
        u1.interests as user1_interests,
        u2.interests as user2_interests,
        CASE 
            WHEN u1.interests IS NOT NULL AND u2.interests IS NOT NULL 
            THEN array_length(array(SELECT unnest(u1.interests) INTERSECT SELECT unnest(u2.interests)), 1)
            ELSE 0
        END as shared_interests_count
    FROM chat_sessions cs
    JOIN anonymous_users u1 ON cs.user1_id = u1.id
    JOIN anonymous_users u2 ON cs.user2_id = u2.id
    WHERE cs.user2_id IS NOT NULL
        AND cs.created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
    'Interest Matching Effectiveness' as category,
    COUNT(*) as total_matches,
    COUNT(CASE WHEN shared_interests_count > 0 THEN 1 END) as matches_with_shared_interests,
    COUNT(CASE WHEN shared_interests_count = 0 THEN 1 END) as matches_without_shared_interests,
    ROUND(AVG(shared_interests_count), 2) as avg_shared_interests,
    ROUND((COUNT(CASE WHEN shared_interests_count > 0 THEN 1 END)::numeric / COUNT(*)) * 100, 2) as percentage_with_shared_interests
FROM interest_matches;

-- 15. REAL-TIME MONITORING QUERIES
-- =====================================================
-- Current active sessions
SELECT 
    'Current Active Sessions' as status,
    COUNT(*) as count
FROM chat_sessions 
WHERE status = 'active' 
    AND started_at IS NOT NULL;

-- Users currently waiting
SELECT 
    'Users Currently Waiting' as status,
    COUNT(*) as count
FROM chat_sessions 
WHERE status = 'waiting' 
    AND user2_id IS NULL;

-- Recent activity (last 5 minutes)
SELECT 
    'Recent Activity (5 min)' as timeframe,
    COUNT(*) as new_sessions,
    COUNT(CASE WHEN user2_id IS NOT NULL THEN 1 END) as new_matches
FROM chat_sessions 
WHERE created_at >= NOW() - INTERVAL '5 minutes';
