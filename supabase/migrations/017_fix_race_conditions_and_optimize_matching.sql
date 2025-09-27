-- Fix Race Conditions and Optimize Interest Matching
-- This migration addresses Issues #03 and #04 by implementing:
-- 1. Match queue system to eliminate race conditions
-- 2. Pre-computed interest compatibility scoring
-- 3. Caching layer for performance
-- 4. Optimized matching algorithm

-- ============================================================================
-- 1. CREATE INTEREST COMPATIBILITY SYSTEM
-- ============================================================================

-- Create interest categories table for better matching
CREATE TABLE IF NOT EXISTS interest_categories (
    interest TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate with common interest categories
INSERT INTO interest_categories (interest, category) VALUES
-- Entertainment
('music', 'entertainment'),
('movies', 'entertainment'),
('books', 'entertainment'),
('gaming', 'entertainment'),
('tv', 'entertainment'),
('anime', 'entertainment'),
('comics', 'entertainment'),
('art', 'entertainment'),
('photography', 'entertainment'),
('dancing', 'entertainment'),
-- Activities
('sports', 'activities'),
('fitness', 'activities'),
('hiking', 'activities'),
('swimming', 'activities'),
('running', 'activities'),
('cycling', 'activities'),
('yoga', 'activities'),
('martial_arts', 'activities'),
('climbing', 'activities'),
('surfing', 'activities'),
-- Lifestyle
('cooking', 'lifestyle'),
('travel', 'lifestyle'),
('fashion', 'lifestyle'),
('beauty', 'lifestyle'),
('gardening', 'lifestyle'),
('pets', 'lifestyle'),
('parenting', 'lifestyle'),
('home_decor', 'lifestyle'),
-- Technology
('programming', 'technology'),
('ai', 'technology'),
('robotics', 'technology'),
('gadgets', 'technology'),
('crypto', 'technology'),
('blockchain', 'technology'),
-- Education
('learning', 'education'),
('science', 'education'),
('history', 'education'),
('philosophy', 'education'),
('languages', 'education'),
-- Social
('volunteering', 'social'),
('politics', 'social'),
('environment', 'social'),
('charity', 'social'),
('community', 'social')
ON CONFLICT (interest) DO NOTHING;

-- Create interest compatibility scoring table
CREATE TABLE IF NOT EXISTS interest_compatibility (
    interest1 TEXT,
    interest2 TEXT,
    compatibility_score INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (interest1, interest2)
);

-- Populate compatibility scores
INSERT INTO interest_compatibility (interest1, interest2, compatibility_score)
SELECT DISTINCT 
    i1.interest,
    i2.interest,
    CASE 
        WHEN i1.interest = i2.interest THEN 10  -- Exact match
        WHEN COALESCE(ic1.category, 'unknown') = COALESCE(ic2.category, 'unknown') THEN 5   -- Same category
        ELSE 1                                  -- Different category
    END
FROM (
    SELECT DISTINCT unnest(interests) as interest 
    FROM anonymous_users 
    WHERE interests IS NOT NULL AND array_length(interests, 1) > 0
    UNION
    SELECT interest FROM interest_categories
) i1
CROSS JOIN (
    SELECT DISTINCT unnest(interests) as interest 
    FROM anonymous_users 
    WHERE interests IS NOT NULL AND array_length(interests, 1) > 0
    UNION
    SELECT interest FROM interest_categories
) i2
LEFT JOIN interest_categories ic1 ON i1.interest = ic1.interest
LEFT JOIN interest_categories ic2 ON i2.interest = ic2.interest
ON CONFLICT (interest1, interest2) DO NOTHING;

-- ============================================================================
-- 2. CREATE MATCH QUEUE SYSTEM
-- ============================================================================

-- Create match queue table to eliminate race conditions
CREATE TABLE IF NOT EXISTS match_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    interests TEXT[],
    priority_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    matched_at TIMESTAMPTZ,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired'))
);

-- Create indexes for efficient matching
CREATE INDEX IF NOT EXISTS idx_match_queue_status_expires ON match_queue (status, expires_at) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_match_queue_interests ON match_queue USING GIN (interests);
CREATE INDEX IF NOT EXISTS idx_match_queue_priority ON match_queue (priority_score DESC, created_at ASC) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_match_queue_user ON match_queue (user_id) WHERE status = 'waiting';

-- ============================================================================
-- 3. CREATE CACHING LAYER
-- ============================================================================

-- Create match cache table for performance
CREATE TABLE IF NOT EXISTS match_cache (
    user1_id UUID,
    user2_id UUID,
    compatibility_score INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
    PRIMARY KEY (user1_id, user2_id)
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS idx_match_cache_expires ON match_cache (expires_at);

-- ============================================================================
-- 4. OPTIMIZED FUNCTIONS
-- ============================================================================

-- Function to calculate compatibility score using pre-computed values
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
    user1_interests TEXT[],
    user2_interests TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    interest1 TEXT;
    interest2 TEXT;
    score INTEGER;
BEGIN
    -- Handle null or empty arrays
    IF user1_interests IS NULL OR user2_interests IS NULL OR 
       array_length(user1_interests, 1) IS NULL OR array_length(user2_interests, 1) IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate score using pre-computed compatibility table
    FOR interest1 IN SELECT unnest(user1_interests) LOOP
        FOR interest2 IN SELECT unnest(user2_interests) LOOP
            SELECT COALESCE(ic.compatibility_score, 0) INTO score
            FROM interest_compatibility ic
            WHERE (interest1 = ic.interest1 AND interest2 = ic.interest2)
               OR (interest1 = ic.interest2 AND interest2 = ic.interest1);
            
            total_score := total_score + COALESCE(score, 0);
        END LOOP;
    END LOOP;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get cached compatibility score
CREATE OR REPLACE FUNCTION get_cached_compatibility_score(
    user1_id_param UUID,
    user2_id_param UUID
) RETURNS INTEGER AS $$
DECLARE
    cached_score INTEGER;
BEGIN
    SELECT compatibility_score INTO cached_score
    FROM match_cache
    WHERE ((user1_id = user1_id_param AND user2_id = user2_id_param)
           OR (user1_id = user2_id_param AND user2_id = user1_id_param))
    AND expires_at > NOW();
    
    RETURN COALESCE(cached_score, -1); -- Return -1 if not found
END;
$$ LANGUAGE plpgsql;

-- Function to cache compatibility score
CREATE OR REPLACE FUNCTION cache_compatibility_score(
    user1_id_param UUID,
    user2_id_param UUID,
    score INTEGER
) RETURNS VOID AS $$
BEGIN
    INSERT INTO match_cache (user1_id, user2_id, compatibility_score, expires_at)
    VALUES (user1_id_param, user2_id_param, score, NOW() + INTERVAL '1 hour')
    ON CONFLICT (user1_id, user2_id) 
    DO UPDATE SET 
        compatibility_score = EXCLUDED.compatibility_score,
        calculated_at = NOW(),
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to find best match from queue
CREATE OR REPLACE FUNCTION find_best_match_from_queue(
    user_id_param UUID,
    user_interests TEXT[]
) RETURNS UUID AS $$
DECLARE
    best_match_id UUID;
    cached_score INTEGER;
    calculated_score INTEGER;
BEGIN
    -- Try to find the best match from the queue
    SELECT mq.user_id INTO best_match_id
    FROM match_queue mq
    WHERE mq.user_id != user_id_param
    AND mq.status = 'waiting'
    AND mq.expires_at > NOW()
    AND NOT EXISTS (
        SELECT 1 FROM banned_users bu 
        WHERE bu.user_id = mq.user_id 
        AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    )
    ORDER BY 
        -- Use cached score if available, otherwise calculate
        COALESCE(
            get_cached_compatibility_score(user_id_param, mq.user_id),
            calculate_compatibility_score(user_interests, mq.interests)
        ) DESC,
        mq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- If we found a match, cache the score for future use
    IF best_match_id IS NOT NULL THEN
        cached_score := get_cached_compatibility_score(user_id_param, best_match_id);
        IF cached_score = -1 THEN
            calculated_score := calculate_compatibility_score(user_interests, 
                (SELECT interests FROM match_queue WHERE user_id = best_match_id));
            PERFORM cache_compatibility_score(user_id_param, best_match_id, calculated_score);
        END IF;
    END IF;
    
    RETURN best_match_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. NEW ATOMIC SESSION CREATION FUNCTION
-- ============================================================================

-- Replace the existing function with a race-condition-free version
CREATE OR REPLACE FUNCTION create_or_join_session_atomic(user_id_param UUID, user_interests TEXT[])
RETURNS TABLE(session_id UUID, action TEXT, message TEXT) AS $$
DECLARE
    waiting_session_id UUID;
    new_session_id UUID;
    matched_user_id UUID;
    compatibility_score INTEGER;
    queue_entry_id UUID;
BEGIN
    -- Check if user is banned
    IF EXISTS (
        SELECT 1 FROM banned_users 
        WHERE user_id = user_id_param 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'User is banned';
    END IF;
    
    -- Update user activity and interests
    UPDATE anonymous_users 
    SET is_active = true, last_seen = NOW(), interests = user_interests
    WHERE id = user_id_param;
    
    -- Clean up expired queue entries
    UPDATE match_queue 
    SET status = 'expired' 
    WHERE expires_at <= NOW() AND status = 'waiting';
    
    -- Try to find a match from the queue
    SELECT find_best_match_from_queue(user_id_param, user_interests) INTO matched_user_id;
    
    IF matched_user_id IS NOT NULL THEN
        -- Mark both users as matched in the queue
        UPDATE match_queue 
        SET status = 'matched', matched_at = NOW()
        WHERE user_id IN (user_id_param, matched_user_id) AND status = 'waiting';
        
        -- Create the session
        INSERT INTO chat_sessions (user1_id, user2_id, status, started_at, created_at, updated_at) 
        VALUES (matched_user_id, user_id_param, 'active', NOW(), NOW(), NOW())
        RETURNING id INTO waiting_session_id;
        
        -- Add system message about connection
        INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
        VALUES (waiting_session_id, user_id_param, 'Connected to chat!', 'Connected to chat!', 'system');
        
        -- Calculate and log compatibility score
        compatibility_score := calculate_compatibility_score(user_interests, 
            (SELECT interests FROM anonymous_users WHERE id = matched_user_id));
        
        IF compatibility_score > 0 THEN
            INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
            VALUES (waiting_session_id, user_id_param, 
                   'Compatibility score: ' || compatibility_score, 
                   'Compatibility score: ' || compatibility_score, 
                   'system');
        END IF;
        
        RETURN QUERY SELECT waiting_session_id, 'joined'::TEXT, 'Joined with matched user'::TEXT;
    ELSE
        -- No match found, add user to queue
        INSERT INTO match_queue (user_id, interests, created_at, expires_at)
        VALUES (user_id_param, user_interests, NOW(), NOW() + INTERVAL '5 minutes')
        RETURNING id INTO queue_entry_id;
        
        -- Create a waiting session
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
        VALUES (user_id_param, 'waiting', NOW(), NOW())
        RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Added to match queue'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CLEANUP FUNCTIONS
-- ============================================================================

-- Enhanced cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    -- Mark users as inactive if they haven't been seen in 5 minutes
    UPDATE anonymous_users 
    SET is_active = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' AND is_active = true;
    
    -- End sessions where both users are inactive
    UPDATE chat_sessions 
    SET status = 'ended', ended_at = NOW(), updated_at = NOW()
    WHERE status IN ('waiting', 'active')
    AND (
        (user2_id IS NULL AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user1_id AND is_active = true))
        OR (user2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user1_id AND is_active = true) 
            AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user2_id AND is_active = true))
    );
    
    -- Clean up expired queue entries
    UPDATE match_queue 
    SET status = 'expired' 
    WHERE expires_at <= NOW() AND status = 'waiting';
    
    -- Clean up old cache entries
    DELETE FROM match_cache 
    WHERE expires_at <= NOW();
    
    -- Delete old anonymous users (older than 24 hours)
    DELETE FROM anonymous_users 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Delete old ended sessions (older than 48 hours)  
    DELETE FROM chat_sessions 
    WHERE status = 'ended' AND ended_at < NOW() - INTERVAL '48 hours';
    
    -- Clean up orphaned messages (sessions that no longer exist)
    DELETE FROM messages 
    WHERE NOT EXISTS (SELECT 1 FROM chat_sessions WHERE id = messages.session_id);
    
    -- Clean up orphaned queue entries
    DELETE FROM match_queue 
    WHERE NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_cache ENABLE ROW LEVEL SECURITY;

-- Interest categories - readable by all authenticated users
CREATE POLICY "Interest categories are readable by all" ON interest_categories
    FOR SELECT USING (true);

-- Interest compatibility - readable by all authenticated users
CREATE POLICY "Interest compatibility is readable by all" ON interest_compatibility
    FOR SELECT USING (true);

-- Match queue - users can only see their own entries
CREATE POLICY "Users can view their own queue entries" ON match_queue
    FOR SELECT USING (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "Users can insert their own queue entries" ON match_queue
    FOR INSERT WITH CHECK (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

CREATE POLICY "Users can update their own queue entries" ON match_queue
    FOR UPDATE USING (user_id = get_user_id_from_session(current_setting('app.current_user_session_id', true)));

-- Service role can manage queue entries for matching
CREATE POLICY "Service role can manage queue entries" ON match_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Match cache - readable by service role only
CREATE POLICY "Service role can access match cache" ON match_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Admins can access all new tables
CREATE POLICY "Admins can access interest categories" ON interest_categories
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can access interest compatibility" ON interest_compatibility
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can access match queue" ON match_queue
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can access match cache" ON match_cache
    FOR ALL USING (is_admin(auth.uid()));

-- ============================================================================
-- 8. COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE interest_categories IS 'Categorizes interests for better compatibility scoring';
COMMENT ON TABLE interest_compatibility IS 'Pre-computed compatibility scores between interests';
COMMENT ON TABLE match_queue IS 'Queue system to eliminate race conditions in user matching';
COMMENT ON TABLE match_cache IS 'Caches compatibility scores for performance';

COMMENT ON FUNCTION create_or_join_session_atomic IS 'Race-condition-free session creation using match queue system with pre-computed compatibility scores';
COMMENT ON FUNCTION calculate_compatibility_score IS 'Calculates compatibility score using pre-computed interest compatibility table';
COMMENT ON FUNCTION find_best_match_from_queue IS 'Finds the best match from the queue using cached or calculated compatibility scores';

-- ============================================================================
-- 9. PERFORMANCE INDEXES
-- ============================================================================

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_interest_categories_category ON interest_categories (category);
CREATE INDEX IF NOT EXISTS idx_interest_compatibility_score ON interest_compatibility (compatibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_queue_cleanup ON match_queue (status, expires_at) WHERE status = 'expired';
CREATE INDEX IF NOT EXISTS idx_match_cache_cleanup ON match_cache (expires_at);

-- ============================================================================
-- 10. MIGRATION COMPLETE
-- ============================================================================

-- Log the migration completion
INSERT INTO system_stats (active_users, total_sessions, total_messages, recorded_at)
VALUES (0, 0, 0, NOW())
ON CONFLICT DO NOTHING;

-- Add a comment to track this migration
COMMENT ON SCHEMA public IS 'Updated with race-condition-free matching system and optimized interest compatibility scoring - Migration 017';
