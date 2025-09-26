# 🟡 HIGH: Race Conditions in Session Creation

## Issue Summary
The user matching algorithm has race conditions where multiple users can match with the same waiting session, leading to inconsistent state and failed matches.

## Current Implementation
```sql
-- From create_or_join_session_atomic function
SELECT cs.id, cs.user2_id INTO waiting_session_id, matched_user_id
FROM chat_sessions cs
WHERE cs.status = 'waiting' 
AND cs.user2_id IS NULL
-- ... complex matching logic
FOR UPDATE SKIP LOCKED;
```

## Problems Identified
1. **Race Conditions**: Multiple users can match with the same waiting session
2. **Complex Logic**: 15+ migrations show repeated fixes to matching algorithm
3. **Inconsistent Timeouts**: Different timeout values (2 minutes vs 5 minutes) across migrations
4. **Performance Issues**: Expensive array intersection operations on every match

## Impact
- **Failed Matches**: Users may not get matched despite available partners
- **Inconsistent State**: Database can end up in invalid states
- **Poor User Experience**: Users may wait indefinitely without matches
- **Performance Degradation**: Expensive operations on every match attempt

## Evidence
- 15+ migrations attempting to fix the same matching algorithm
- Complex array intersection operations: `array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1)`
- Multiple timeout configurations across different migrations

## Solution
### 1. Implement Match Queue System
```sql
-- Create a dedicated matching queue table
CREATE TABLE match_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES anonymous_users(id),
    interests TEXT[],
    priority_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Create index for efficient matching
CREATE INDEX idx_match_queue_interests ON match_queue USING GIN (interests);
CREATE INDEX idx_match_queue_expires ON match_queue (expires_at);
```

### 2. Optimize Matching Function
```sql
-- Simplified, more efficient matching
CREATE OR REPLACE FUNCTION find_best_match(user_id_param UUID, user_interests TEXT[])
RETURNS UUID AS $$
DECLARE
    best_match_id UUID;
BEGIN
    -- Use pre-computed compatibility scores
    SELECT mq.user_id INTO best_match_id
    FROM match_queue mq
    WHERE mq.user_id != user_id_param
    AND mq.expires_at > NOW()
    ORDER BY 
        COALESCE(
            (SELECT SUM(ic.compatibility_score) 
             FROM interest_compatibility ic 
             WHERE ic.interest1 = ANY(user_interests) 
             AND ic.interest2 = ANY(mq.interests)), 0
        ) DESC,
        mq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    RETURN best_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Pre-compute Interest Compatibility
```sql
-- Create compatibility scoring table
CREATE TABLE interest_compatibility (
    interest1 TEXT,
    interest2 TEXT,
    compatibility_score INTEGER,
    PRIMARY KEY (interest1, interest2)
);

-- Populate with compatibility scores
INSERT INTO interest_compatibility (interest1, interest2, compatibility_score)
SELECT DISTINCT 
    i1.interest,
    i2.interest,
    CASE 
        WHEN i1.interest = i2.interest THEN 10
        WHEN i1.category = i2.category THEN 5
        ELSE 1
    END
FROM (SELECT DISTINCT unnest(interests) as interest FROM anonymous_users) i1
CROSS JOIN (SELECT DISTINCT unnest(interests) as interest FROM anonymous_users) i2;
```

## Testing Required
- [ ] Test concurrent user matching scenarios
- [ ] Verify no race conditions occur
- [ ] Test matching performance with large datasets
- [ ] Verify timeout handling works correctly
- [ ] Test edge cases (no matches available, expired matches)

## Priority
**HIGH** - Affects core functionality and user experience

## Dependencies
- None - can be implemented independently

## Estimated Effort
2-3 days (including testing and optimization)

## Related Issues
- Issue #04: Inefficient Interest Matching
- Issue #05: Complex Session State Management
