-- Fix the session matching logic to be simpler and more reliable
-- Replace the complex atomic function with a simpler version

CREATE OR REPLACE FUNCTION create_or_join_session_atomic(user_id_param UUID, user_interests TEXT[])
RETURNS TABLE(session_id UUID, action TEXT, message TEXT) AS $$
DECLARE
    waiting_session_id UUID;
    new_session_id UUID;
    matched_user_id UUID;
BEGIN
    -- Check if user is banned
    IF EXISTS (
        SELECT 1 FROM banned_users 
        WHERE user_id = user_id_param 
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'User is banned';
    END IF;
    
    -- Update user activity and ensure they're online
    UPDATE anonymous_users 
    SET is_active = true, is_online = true, last_seen = NOW(), interests = user_interests
    WHERE id = user_id_param;
    
    -- Look for any waiting session (simplified logic)
    SELECT cs.id, cs.user1_id INTO waiting_session_id, matched_user_id
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
    ORDER BY cs.created_at ASC
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
            
            RETURN QUERY SELECT waiting_session_id, 'joined'::TEXT, 'Joined existing session'::TEXT;
        ELSE
            -- Session was taken by someone else, create new one
            INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
            VALUES (user_id_param, 'waiting', NOW(), NOW())
            RETURNING id INTO new_session_id;
            
            RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Created new session, waiting for match'::TEXT;
        END IF;
    ELSE
        -- Create new waiting session (status should be 'waiting', not 'active')
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
        VALUES (user_id_param, 'waiting', NOW(), NOW())
        RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Created new session, waiting for match'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
