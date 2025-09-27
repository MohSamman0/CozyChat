-- Function to get active users count
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM anonymous_users WHERE is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old sessions and inactive users
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS VOID AS $$
BEGIN
    -- Mark users as inactive if last seen > 5 minutes ago
    UPDATE anonymous_users 
    SET is_active = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' AND is_active = true;
    
    -- End sessions where both users are inactive
    UPDATE chat_sessions 
    SET status = 'ended', ended_at = NOW()
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

-- Function to match users by interests
CREATE OR REPLACE FUNCTION match_users_by_interests(user_id UUID)
RETURNS TABLE(id UUID, interests TEXT[]) AS $$
DECLARE
    user_interests TEXT[];
BEGIN
    -- Get the user's interests
    SELECT au.interests INTO user_interests 
    FROM anonymous_users au 
    WHERE au.id = user_id;
    
    -- Return potential matches based on shared interests
    RETURN QUERY
    SELECT au.id, au.interests
    FROM anonymous_users au
    WHERE au.id != user_id 
    AND au.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM banned_users bu 
        WHERE bu.user_id = au.id 
        AND (bu.expires_at IS NULL OR bu.expires_at > NOW())
    )
    AND NOT EXISTS (
        SELECT 1 FROM chat_sessions cs 
        WHERE (cs.user1_id = au.id OR cs.user2_id = au.id) 
        AND cs.status IN ('waiting', 'active')
    )
    AND (
        user_interests IS NULL 
        OR au.interests IS NULL 
        OR user_interests && au.interests
    )
    ORDER BY 
        CASE WHEN user_interests IS NOT NULL AND au.interests IS NOT NULL 
             THEN array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1) 
             ELSE 0 
        END DESC,
        au.connected_at ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create or join a chat session (ATOMIC VERSION)
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
    
    -- Update user activity
    UPDATE anonymous_users 
    SET is_active = true, last_seen = NOW(), interests = user_interests
    WHERE id = user_id_param;
    
    -- ATOMIC: Look for and claim a waiting session in one operation
    WITH waiting_sessions AS (
        SELECT cs.id, cs.user1_id
        FROM chat_sessions cs
        JOIN anonymous_users au ON cs.user1_id = au.id
        WHERE cs.status = 'waiting' 
        AND cs.user2_id IS NULL
        AND cs.user1_id != user_id_param
        AND au.is_active = true
        AND au.last_seen > NOW() - INTERVAL '2 minutes'
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
            CASE WHEN user_interests IS NOT NULL AND au.interests IS NOT NULL 
                 THEN array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1) 
                 ELSE 0 
            END DESC,
            cs.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    UPDATE chat_sessions 
    SET user2_id = user_id_param, 
        status = 'active', 
        started_at = NOW(),
        updated_at = NOW()
    FROM waiting_sessions ws
    WHERE chat_sessions.id = ws.id
    AND chat_sessions.user2_id IS NULL
    RETURNING chat_sessions.id, ws.user1_id INTO waiting_session_id, matched_user_id;
    
    IF waiting_session_id IS NOT NULL THEN
        -- Add system message about connection
        INSERT INTO messages (session_id, sender_id, content, encrypted_content, message_type)
        VALUES (waiting_session_id, user_id_param, 'Connected to chat!', 'Connected to chat!', 'system');
        
        RETURN QUERY SELECT waiting_session_id, 'joined'::TEXT, 'Joined existing session'::TEXT;
    ELSE
        -- Create new waiting session
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at) 
        VALUES (user_id_param, 'waiting', NOW(), NOW())
        RETURNING id INTO new_session_id;
        
        RETURN QUERY SELECT new_session_id, 'created'::TEXT, 'Created new session, waiting for match'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Legacy function for backward compatibility
CREATE OR REPLACE FUNCTION create_or_join_session(user_session_id TEXT, user_interests TEXT[])
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
    result_record RECORD;
BEGIN
    -- Get user ID from session
    SELECT id INTO current_user_id 
    FROM anonymous_users 
    WHERE session_id = user_session_id;
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Use the new atomic function
    SELECT * INTO result_record 
    FROM create_or_join_session_atomic(current_user_id, user_interests);
    
    RETURN result_record.session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a chat session
CREATE OR REPLACE FUNCTION end_chat_session(session_id UUID, user_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get user ID from session
    SELECT id INTO current_user_id 
    FROM anonymous_users 
    WHERE session_id = user_session_id;
    
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is part of the session
    IF NOT EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE id = session_id 
        AND (user1_id = current_user_id OR user2_id = current_user_id)
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- End the session
    UPDATE chat_sessions 
    SET status = 'ended', ended_at = NOW()
    WHERE id = session_id AND status IN ('waiting', 'active');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to report a user
CREATE OR REPLACE FUNCTION report_user(
    reporter_session_id TEXT,
    reported_user_id UUID,
    session_id UUID,
    reason TEXT,
    description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    reporter_id UUID;
    report_id UUID;
BEGIN
    -- Get reporter ID from session
    SELECT id INTO reporter_id 
    FROM anonymous_users 
    WHERE session_id = reporter_session_id;
    
    IF reporter_id IS NULL THEN
        RAISE EXCEPTION 'Reporter not found';
    END IF;
    
    -- Verify the reporter is part of the session
    IF NOT EXISTS (
        SELECT 1 FROM chat_sessions 
        WHERE id = session_id 
        AND (user1_id = reporter_id OR user2_id = reporter_id)
    ) THEN
        RAISE EXCEPTION 'Reporter is not part of the session';
    END IF;
    
    -- Create the report
    INSERT INTO reports (reporter_id, reported_user_id, session_id, reason, description)
    VALUES (reporter_id, reported_user_id, session_id, reason, description)
    RETURNING id INTO report_id;
    
    RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a daily stats recording function
CREATE OR REPLACE FUNCTION record_daily_stats()
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_stats (active_users, total_sessions, total_messages)
    SELECT 
        (SELECT COUNT(*) FROM anonymous_users WHERE is_active = true),
        (SELECT COUNT(*) FROM chat_sessions WHERE DATE(created_at) = CURRENT_DATE),
        (SELECT COUNT(*) FROM messages WHERE DATE(created_at) = CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
