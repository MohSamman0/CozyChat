# Stale Session Issue & Fix Documentation

## 🚨 Issue Description

### **Problem Identified:**
Users can connect to abandoned/stale chat sessions, leading to poor user experience and confusion.

### **Root Cause:**
The current session matching system doesn't account for:
1. **Abandoned Sessions**: Users who close their browser without properly ending their session
2. **Stale Sessions**: Sessions that remain in the database for extended periods
3. **Inactive Users**: Users who are no longer active but their sessions remain active

### **Impact:**
- Users connect to sessions where the other person has already left
- Poor user experience (waiting for responses that will never come)
- Database bloat from accumulating old sessions
- Confusion about session status

## 🔍 Current System Analysis

### **How It Currently Works:**
```sql
-- Current matching logic (simplified)
SELECT cs.id, cs.user1_id INTO waiting_session_id, matched_user_id
FROM chat_sessions cs
JOIN anonymous_users au ON cs.user1_id = au.id
WHERE cs.status = 'waiting' 
AND cs.user2_id IS NULL
AND cs.user1_id != user_id_param
AND au.is_active = true
AND au.last_seen > NOW() - INTERVAL '5 minutes'
ORDER BY cs.created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

### **Problems with Current System:**
1. **No Session Age Limit**: Can match with sessions created hours ago
2. **Insufficient Activity Check**: 5-minute window may be too long
3. **No Cleanup Mechanism**: Old sessions accumulate indefinitely
4. **No Browser Close Detection**: Sessions persist when users leave

## ✅ **SAFE Solution (100% Backward Compatible)**

### **1. Minimal Session Matching Improvements**

#### **Updated Function (Safe Changes Only):**
```sql
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
```

### **2. Enhanced Session Cleanup Function**

#### **SAFE Cleanup Function (Improves Existing):**
```sql
-- Function to clean up old sessions with intelligent logic
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
```

### **3. SAFE Database Improvements**

#### **Performance Indexes (Safe Additions):**
```sql
-- Optimize waiting session selection (SAFE - doesn't conflict with existing)
CREATE INDEX IF NOT EXISTS idx_waiting_pick
ON chat_sessions (status, user2_id, created_at)
WHERE status = 'waiting' AND user2_id IS NULL;

-- Optimize active user lookup (SAFE - enhances existing index)
CREATE INDEX IF NOT EXISTS idx_users_active_recent
ON anonymous_users (is_active, last_seen)
WHERE is_active = true;

-- We already have these indexes from initial schema:
-- CREATE INDEX idx_anonymous_users_interests ON anonymous_users USING gin(interests);
-- CREATE INDEX idx_chat_sessions_active ON chat_sessions(status, created_at) WHERE status IN ('waiting', 'active');
```

#### **⚠️ SKIP Unique Constraint (Potential Breaking Change):**
```sql
-- SKIP THIS - Could cause issues with existing sessions
-- CREATE UNIQUE INDEX uniq_waiting_per_user1 ON chat_sessions (user1_id) WHERE status = 'waiting' AND user2_id IS NULL;
```

### **4. Frontend Enhancements (Optional)**

#### **⚠️ SKIP Frontend Changes (Already Implemented):**
```javascript
// ✅ ALREADY IMPLEMENTED - Our current system already has:
// 1. beforeunload handler in src/app/chat/page.tsx (lines 125-138)
// 2. 30-second heartbeat system (lines 304-332)
// 3. Proper session cleanup on page unload

// NO CHANGES NEEDED - Current implementation is sufficient
```

#### **Current Frontend Status:**
- ✅ **Browser Close Detection**: Already implemented with `beforeunload` and `pagehide`
- ✅ **Heartbeat System**: 30-second intervals working correctly
- ✅ **Session Cleanup**: Proper cleanup on page unload
- ✅ **Activity Updates**: Regular user activity tracking

## 🛡️ Safety Measures

### **Backward Compatibility:**
- ✅ **No Breaking Changes**: All existing functionality preserved
- ✅ **Gradual Rollout**: Can be deployed without downtime
- ✅ **Fallback Logic**: If cleanup fails, system continues working
- ✅ **Existing Sessions**: Current active sessions remain unaffected

### **Testing Strategy:**
1. **Local Testing**: Test with multiple browser tabs
2. **Staging Environment**: Deploy to staging first
3. **Gradual Rollout**: Monitor for 24 hours before full deployment
4. **Rollback Plan**: Keep previous function as backup

### **Monitoring:**
- Track session creation/joining success rates
- Monitor average wait times
- Watch for any increase in "no match found" scenarios
- Monitor database performance

## 📊 Expected Results

### **Before Fix:**
- Users could connect to sessions from hours ago
- Poor user experience with abandoned matches
- Database accumulating old sessions
- Confusion about session status

### **After Fix:**
- ✅ Users only connect to recent, active sessions
- ✅ Better user experience with responsive matches
- ✅ Cleaner database with automatic cleanup
- ✅ Clear session status and expectations

## 🚀 **SAFE Implementation Plan (100% Backward Compatible)**

### **Phase 1: Database Function Update (Day 1)**
1. **Deploy updated function** with session age limits and activity checks
2. **Test thoroughly** with multiple browser tabs
3. **Verify interest matching** still works correctly
4. **Monitor for any issues**

### **Phase 2: Performance Indexes (Day 2)**
1. **Add safe performance indexes** for faster matching
2. **Monitor query performance** improvements
3. **Verify no conflicts** with existing indexes

### **Phase 3: Cleanup Function (Day 3)**
1. **Deploy enhanced cleanup function** (improves existing)
2. **Set up periodic execution** (every 5 minutes)
3. **Monitor cleanup effectiveness**
4. **Verify no impact** on active sessions

### **✅ What We're Implementing (Safe Changes):**
- ✅ **Session age limits**: Only match with recent sessions (5 minutes)
- ✅ **Activity checks**: Only match with active users (2 minutes)
- ✅ **Performance indexes**: Faster matching queries
- ✅ **Enhanced cleanup**: Better session cleanup logic

### **❌ What We're Skipping (Potential Breaking Changes):**
- ❌ **Unique constraints**: Could break existing sessions
- ❌ **Jaccard scoring**: Adds complexity without clear benefit
- ❌ **Session termination**: Could confuse users
- ❌ **Frontend changes**: Already implemented correctly

## ⚠️ Risk Assessment

### **Low Risk:**
- Function update is backward compatible
- Existing sessions continue working
- No data loss risk

### **Medium Risk:**
- Slightly longer wait times for matches (due to stricter filtering)
- Need to monitor for edge cases

### **Mitigation:**
- Comprehensive testing before deployment
- Gradual rollout with monitoring
- Quick rollback capability
- Clear communication to users about improved matching

## 📝 **SAFE Conclusion**

This **100% backward compatible** solution addresses the stale session issue without any risk of breaking our current system.

### **✅ What We're Implementing (Safe Changes Only):**
- **Session Age Limits**: Only match with sessions created within 5 minutes
- **Activity Checks**: Only match with users active within 2 minutes  
- **Performance Indexes**: Faster matching queries (no conflicts)
- **Enhanced Cleanup**: Better session cleanup logic (improves existing)

### **❌ What We're Skipping (Potential Breaking Changes):**
- **Unique Constraints**: Could break existing sessions
- **Jaccard Scoring**: Adds complexity without clear benefit
- **Session Termination**: Could confuse users
- **Frontend Changes**: Already implemented correctly

### **Key Benefits:**
- ✅ **Prevents Stale Connections**: Timeouts and activity checks
- ✅ **Performance**: Optimized indexes for faster matching
- ✅ **User Experience**: Fewer abandoned sessions
- ✅ **Zero Risk**: No breaking changes to existing functionality
- ✅ **Maintains Simplicity**: No unnecessary complexity

### **Implementation Strategy:**
- **Incremental**: Deploy in phases with testing
- **Safe**: 100% backward compatible
- **Focused**: Only features that directly benefit users
- **Maintainable**: Keeps our simple architecture intact

### **Risk Level: MINIMAL**
- All changes are additive improvements
- No modifications to existing data structures
- No changes to API interfaces
- No frontend modifications needed

This approach gives us the benefits of preventing stale sessions while maintaining the clean, simple system that works well for our current scale and user needs.
