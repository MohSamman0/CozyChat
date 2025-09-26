-- Test script for the new race-condition-free matching system
-- This script creates test users and verifies the new matching works

-- 1. Clean up any existing test data
DELETE FROM match_queue WHERE user_id::text LIKE 'test-%';
DELETE FROM chat_sessions WHERE user1_id::text LIKE 'test-%' OR user2_id::text LIKE 'test-%';
DELETE FROM anonymous_users WHERE id::text LIKE 'test-%';

-- 2. Create test users with different interests
INSERT INTO anonymous_users (id, session_id, interests, is_active, last_seen) VALUES
('test-user-1', 'test-session-1', ARRAY['music', 'movies', 'gaming'], true, NOW()),
('test-user-2', 'test-session-2', ARRAY['music', 'sports', 'fitness'], true, NOW()),
('test-user-3', 'test-session-3', ARRAY['cooking', 'travel', 'photography'], true, NOW()),
('test-user-4', 'test-session-4', ARRAY['programming', 'ai', 'technology'], true, NOW());

-- 3. Test compatibility scoring
SELECT 'Compatibility Score Tests' as test_type;

SELECT 
    'music + music' as test_case,
    calculate_compatibility_score(ARRAY['music'], ARRAY['music']) as score
UNION ALL
SELECT 
    'music + movies (same category)' as test_case,
    calculate_compatibility_score(ARRAY['music'], ARRAY['movies']) as score
UNION ALL
SELECT 
    'music + sports (different category)' as test_case,
    calculate_compatibility_score(ARRAY['music'], ARRAY['sports']) as score
UNION ALL
SELECT 
    'music,movies + music,sports' as test_case,
    calculate_compatibility_score(ARRAY['music', 'movies'], ARRAY['music', 'sports']) as score;

-- 4. Test the new session creation function
SELECT 'Session Creation Tests' as test_type;

-- Test user 1 tries to create/join session
SELECT 'User 1 creating session' as action, * FROM create_or_join_session_atomic('test-user-1', ARRAY['music', 'movies', 'gaming']);

-- Test user 2 tries to create/join session (should match with user 1)
SELECT 'User 2 creating session' as action, * FROM create_or_join_session_atomic('test-user-2', ARRAY['music', 'sports', 'fitness']);

-- 5. Check the results
SELECT 'Session Results' as test_type;
SELECT 
    cs.id,
    cs.user1_id,
    cs.user2_id,
    cs.status,
    cs.created_at,
    cs.started_at
FROM chat_sessions cs
WHERE cs.user1_id::text LIKE 'test-%' OR cs.user2_id::text LIKE 'test-%'
ORDER BY cs.created_at;

-- 6. Check match queue status
SELECT 'Match Queue Status' as test_type;
SELECT 
    user_id,
    interests,
    status,
    created_at,
    expires_at
FROM match_queue
WHERE user_id::text LIKE 'test-%'
ORDER BY created_at;

-- 7. Check messages
SELECT 'System Messages' as test_type;
SELECT 
    m.session_id,
    m.content,
    m.message_type,
    m.created_at
FROM messages m
JOIN chat_sessions cs ON m.session_id = cs.id
WHERE cs.user1_id::text LIKE 'test-%' OR cs.user2_id::text LIKE 'test-%'
ORDER BY m.created_at;

-- 8. Test cache functionality
SELECT 'Cache Tests' as test_type;

-- Cache a compatibility score
SELECT cache_compatibility_score('test-user-1', 'test-user-2', 15);

-- Retrieve cached score
SELECT 
    'Cached score for test users' as test_case,
    get_cached_compatibility_score('test-user-1', 'test-user-2') as cached_score;

-- 9. Test cleanup function
SELECT 'Cleanup Test' as test_type;
SELECT cleanup_old_sessions();

-- 10. Final verification
SELECT 'FINAL VERIFICATION' as status,
       CASE 
           WHEN EXISTS (SELECT 1 FROM chat_sessions WHERE user1_id::text LIKE 'test-%' AND user2_id IS NOT NULL) 
           THEN '✅ MATCHING SYSTEM WORKING'
           ELSE '❌ MATCHING SYSTEM NOT WORKING'
       END as result;
