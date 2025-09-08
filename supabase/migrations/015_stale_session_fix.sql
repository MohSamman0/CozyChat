-- Stale Session Fix - Phase 1: Safe Function Updates
-- This migration implements the safe improvements to prevent stale session connections
-- All changes are 100% backward compatible

-- 1. Update the main session creation function with session age limits and improved activity checks
CREATE OR REPLACE FUNCTION create_or_join_session_atomic(user_id_param UUID, user_interests TEXT[])
RETURNS TABLE(session_id UUID, action TEXT, message TEXT) AS $$
DECLARE
    waiting_session_id UUID;
    new_session_id UUID;
    matched_user_id UUID;
    interest_match_count INTEGER;
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
    
    -- Look for waiting session with enhanced filtering (SAFE CHANGES ONLY)
    SELECT cs.id, cs.user1_id, 
           CASE WHEN user_interests IS NOT NULL AND au.interests IS NOT NULL 
                THEN array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1) 
                ELSE 0 
           END as match_count
    INTO waiting_session_id, matched_user_id, interest_match_count
    FROM chat_sessions cs
    JOIN anonymous_users au ON cs.user1_id = au.id
    WHERE cs.status = 'waiting' 
    AND cs.user2_id IS NULL
    AND cs.user1_id != user_id_param
    AND au.is_active = true
    AND au.last_seen > NOW() - INTERVAL '2 minutes'  -- SAFE: Reduced from 5 minutes
    AND cs.created_at > NOW() - INTERVAL '5 minutes'  -- SAFE: Session age limit
    AND NOT EXISTS (
        SELECT 1 FROM banned_users bu 
        WHERE bu.user_id = cs.user1_id 
        AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    )
    AND (
        user_interests IS NULL 
        OR au.interests IS NULL 
        OR user_interests && au.interests
    )
    ORDER BY 
        match_count DESC,        -- Primary: number of matching interests
        cs.created_at ASC        -- Secondary: oldest first
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    IF waiting_session_id IS NOT NULL THEN
        -- Try to join the session
        UPDATE chat_sessions 
        SET user2_id = user_id_param, 
            status = 'active', 
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = waiting_session_id
        AND user2_id IS NULL;
        
        -- Check if we successfully joined
        IF FOUND THEN
            -- Add system message about connection
            INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
            VALUES (waiting_session_id, user_id_param, 'Connected to chat!', 'Connected to chat!', 'system');
            
            -- Log interest match statistics (optional)
            IF interest_match_count > 0 THEN
                INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
                VALUES (waiting_session_id, user_id_param, 
                       'You have ' || interest_match_count || ' shared interests!', 
                       'You have ' || interest_match_count || ' shared interests!', 
                       'system');
            END IF;
            
            RETURN QUERY SELECT waiting_session_id, 'joined'::TEXT, 'Joined existing session'::TEXT;
        ELSE
            -- Session was taken by someone else, create new one
            INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
            VALUES (user_id_param, 'waiting', NOW(), NOW())
            RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Created new session, waiting for match'::TEXT;
        END IF;
    ELSE
        -- Create new waiting session
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
        VALUES (user_id_param, 'waiting', NOW(), NOW())
        RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Created new session, waiting for match'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enhanced cleanup function with improved logic
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
    -- Mark users as inactive if they haven't been seen in 5 minutes
    UPDATE anonymous_users 
    SET is_active = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' AND is_active = true;
    
    -- End sessions where both users are inactive (IMPROVED LOGIC)
    UPDATE chat_sessions 
    SET status = 'ended', ended_at = NOW(), updated_at = NOW()
    WHERE status IN ('waiting', 'active')
    AND (
        (user2_id IS NULL AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user1_id AND is_active = true))
        OR (user2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user1_id AND is_active = true) 
            AND NOT EXISTS (SELECT 1 FROM anonymous_users WHERE id = user2_id AND is_active = true))
    );
    
    -- Delete old anonymous users (older than 24 hours)
    DELETE FROM anonymous_users 
    WHERE created_at < NOW() - INTERVAL '24 hours';
    
    -- Delete old ended sessions (older than 48 hours)  
    DELETE FROM chat_sessions 
    WHERE status = 'ended' AND ended_at < NOW() - INTERVAL '48 hours';
    
    -- Clean up orphaned messages (sessions that no longer exist)
    DELETE FROM messages 
    WHERE NOT EXISTS (SELECT 1 FROM chat_sessions WHERE id = messages.session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Performance indexes for faster matching (SAFE - doesn't conflict with existing)
CREATE INDEX IF NOT EXISTS idx_waiting_pick
ON chat_sessions (status, user2_id, created_at)
WHERE status = 'waiting' AND user2_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_recent
ON anonymous_users (is_active, last_seen)
WHERE is_active = true;

-- Add comment explaining the improvements
COMMENT ON FUNCTION create_or_join_session_atomic IS 'Enhanced session creation with stale session prevention: only matches with sessions created within 5 minutes and users active within 2 minutes. Maintains interest-based matching with fallback to random matching.';
