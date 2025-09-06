-- Seed data for CozyChat development

-- Insert some sample admin users (you'll need to replace these UUIDs with actual auth.users UUIDs in production)
-- This is just for development - in production, admin users should be created through proper authentication

-- Sample interests for testing
-- Note: In production, interests would be added by users dynamically

-- Sample anonymous users for testing (these will be cleaned up by the cleanup function)
INSERT INTO anonymous_users (session_id, interests, is_active) VALUES
('test_session_1', ARRAY['gaming', 'programming', 'music'], true),
('test_session_2', ARRAY['art', 'travel', 'cooking'], true),
('test_session_3', ARRAY['books', 'movies', 'photography'], false),
('test_session_4', ARRAY['sports', 'fitness', 'nutrition'], true),
('test_session_5', ARRAY['gaming', 'technology', 'science'], true);

-- Sample chat sessions for testing
WITH users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
    FROM anonymous_users
    LIMIT 4
)
INSERT INTO chat_sessions (user1_id, user2_id, status, started_at) 
SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    'active' as status,
    NOW() - INTERVAL '10 minutes' as started_at
FROM users u1, users u2 
WHERE u1.rn = 1 AND u2.rn = 2

UNION ALL

SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    'ended' as status,
    NOW() - INTERVAL '2 hours' as started_at
FROM users u1, users u2 
WHERE u1.rn = 3 AND u2.rn = 4;

-- Sample messages for testing
WITH active_session AS (
    SELECT id FROM chat_sessions WHERE status = 'active' LIMIT 1
),
session_users AS (
    SELECT cs.user1_id, cs.user2_id, cs.id as session_id
    FROM chat_sessions cs, active_session a
    WHERE cs.id = a.id
)
INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
SELECT 
    su.session_id,
    su.user1_id,
    'Hello! How are you doing today?',
    encode(digest('Hello! How are you doing today?', 'sha256'), 'base64'),
    'text'
FROM session_users su

UNION ALL

SELECT 
    su.session_id,
    su.user2_id,
    'Hi there! I''m doing great, thanks for asking. What about you?',
    encode(digest('Hi there! I''m doing great, thanks for asking. What about you?', 'sha256'), 'base64'),
    'text'
FROM session_users su

UNION ALL

SELECT 
    su.session_id,
    su.user1_id,
    'I''m good too! What are your hobbies?',
    encode(digest('I''m good too! What are your hobbies?', 'sha256'), 'base64'),
    'text'
FROM session_users su;

-- Sample system stats
INSERT INTO system_stats (active_users, total_sessions, total_messages, recorded_at) VALUES
(15, 45, 234, NOW() - INTERVAL '1 day'),
(23, 67, 456, NOW() - INTERVAL '2 days'),
(18, 52, 321, NOW() - INTERVAL '3 days'),
(31, 89, 678, NOW() - INTERVAL '4 days'),
(27, 73, 543, NOW() - INTERVAL '5 days');

-- Create a schedule to run cleanup function periodically (in production, this would be handled by a cron job)
-- This is commented out because pg_cron extension might not be available in all environments
-- SELECT cron.schedule('cleanup-sessions', '*/5 * * * *', 'SELECT cleanup_old_sessions();');
