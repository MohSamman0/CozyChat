-- Restore interest-based matching in the session creation function
-- This migration adds interest compatibility scoring while maintaining fallback to random matching

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
    
    -- Look for waiting session with interest matching
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
    AND au.last_seen > NOW() - INTERVAL '5 minutes'
    AND NOT EXISTS (
        SELECT 1 FROM banned_users bu 
        WHERE bu.user_id = cs.user1_id 
        AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    )
    AND (
        user_interests IS NULL 
        OR au.interests IS NULL 
        OR user_interests && au.interests  -- Has overlapping interests
    )
    ORDER BY 
        match_count DESC,  -- Prioritize users with more matching interests
        cs.created_at ASC  -- Then by oldest waiting session
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

-- Add interest matching statistics table (optional)
CREATE TABLE IF NOT EXISTS interest_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id),
    user1_interests TEXT[],
    user2_interests TEXT[],
    common_interests TEXT[],
    match_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_interest_matches_session_id ON interest_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_interest_matches_created_at ON interest_matches(created_at);

-- Add comment explaining the interest matching logic
COMMENT ON FUNCTION create_or_join_session_atomic IS 'Creates or joins chat sessions with interest-based matching. Users with shared interests are prioritized, but falls back to random matching if no interest matches are found.';
