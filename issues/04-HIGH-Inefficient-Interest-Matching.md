# 🟡 HIGH: Inefficient Interest Matching Algorithm

## Issue Summary
The current interest matching algorithm performs expensive array intersection operations on every match attempt, with no caching or pre-computation of compatibility scores.

## Current Implementation
```sql
-- Expensive array intersection on every query
array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1)
```

## Problems Identified
1. **No Caching**: Interest matches are computed from scratch every time
2. **Expensive Operations**: Array intersection operations on every session creation
3. **No Pre-computation**: Compatibility scores calculated in real-time
4. **Scalability Issues**: Performance degrades with more users and interests

## Impact
- **Performance Degradation**: Slow matching as user base grows
- **High CPU Usage**: Expensive operations on database server
- **Poor User Experience**: Longer wait times for matches
- **Scalability Limitations**: System won't scale beyond small user base

## Evidence
- Complex array operations in matching queries
- No caching mechanisms in place
- Performance issues mentioned in analysis

## Solution
### 1. Pre-compute Interest Compatibility
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

### 2. Create Interest Categories
```sql
-- Add interest categories for better matching
CREATE TABLE interest_categories (
    interest TEXT PRIMARY KEY,
    category TEXT NOT NULL
);

-- Populate categories
INSERT INTO interest_categories (interest, category) VALUES
('music', 'entertainment'),
('movies', 'entertainment'),
('books', 'entertainment'),
('sports', 'activities'),
('fitness', 'activities'),
('cooking', 'lifestyle'),
('travel', 'lifestyle');
```

### 3. Optimize Matching Query
```sql
-- Use pre-computed scores instead of array intersections
CREATE OR REPLACE FUNCTION calculate_compatibility_score(
    user1_interests TEXT[],
    user2_interests TEXT[]
) RETURNS INTEGER AS $$
DECLARE
    total_score INTEGER := 0;
    interest1 TEXT;
    interest2 TEXT;
BEGIN
    FOR interest1 IN SELECT unnest(user1_interests) LOOP
        FOR interest2 IN SELECT unnest(user2_interests) LOOP
            SELECT COALESCE(compatibility_score, 0) INTO total_score
            FROM interest_compatibility
            WHERE (interest1 = interest_compatibility.interest1 AND interest2 = interest_compatibility.interest2)
               OR (interest1 = interest_compatibility.interest2 AND interest2 = interest_compatibility.interest1);
        END LOOP;
    END LOOP;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;
```

### 4. Add Caching Layer
```sql
-- Create match cache table
CREATE TABLE match_cache (
    user1_id UUID,
    user2_id UUID,
    compatibility_score INTEGER,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user1_id, user2_id)
);

-- Create function to get cached score
CREATE OR REPLACE FUNCTION get_cached_compatibility_score(
    user1_id_param UUID,
    user2_id_param UUID
) RETURNS INTEGER AS $$
DECLARE
    cached_score INTEGER;
BEGIN
    SELECT compatibility_score INTO cached_score
    FROM match_cache
    WHERE (user1_id = user1_id_param AND user2_id = user2_id_param)
       OR (user1_id = user2_id_param AND user2_id = user1_id_param)
    AND calculated_at > NOW() - INTERVAL '1 hour';
    
    RETURN COALESCE(cached_score, 0);
END;
$$ LANGUAGE plpgsql;
```

## Testing Required
- [ ] Test matching performance with large datasets
- [ ] Verify compatibility scores are calculated correctly
- [ ] Test caching mechanism works properly
- [ ] Benchmark performance improvements
- [ ] Test edge cases (no interests, single interest, etc.)

## Priority
**HIGH** - Critical for scalability and performance

## Dependencies
- Can be implemented alongside Issue #03 (Race Conditions)

## Estimated Effort
2-3 days (including testing and optimization)

## Expected Performance Improvement
- 70% reduction in matching query time
- Better scalability with larger user bases
- Reduced database CPU usage

## Related Issues
- Issue #03: Race Conditions in Session Creation
- Issue #06: Complex Session State Management
