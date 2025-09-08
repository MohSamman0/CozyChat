# Interest Feature Implementation Plan

## Overview

This document outlines a comprehensive plan to implement the interest-based matching feature in Cozy Chat safely without breaking the existing functionality. The interest feature will allow users to specify their interests and be matched with users who share similar interests.

## ⚠️ CRITICAL IMPLEMENTATION GUIDELINES

### **INCREMENTAL DEVELOPMENT RULE**
- **IMPLEMENT ONE TASK AT A TIME** - Never work on multiple tasks simultaneously
- **TEST AFTER EVERY CHANGE** - After each change that could affect logic or code, refer to documentation and test thoroughly
- **VALIDATE BEFORE PROCEEDING** - Ensure the current task is fully working before moving to the next task
- **DOCUMENTATION FIRST** - Always refer to existing docs (`CHAT_FLOW_AND_FEATURES.md`, `DATABASE_ARCHITECTURE.md`, `FRONTEND_ARCHITECTURE.md`) before making changes
- **ROLLBACK READY** - Have a clear rollback plan for each task before starting

### **SAFETY CHECKLIST FOR EACH TASK**
1. ✅ Read relevant documentation first
2. ✅ Understand current implementation
3. ✅ Make minimal, focused changes
4. ✅ Test the change thoroughly
5. ✅ Verify no existing functionality is broken
6. ✅ Document any new behavior
7. ✅ Only then proceed to next task

**This incremental approach is MANDATORY to prevent breaking the existing chat functionality.**

## Current State Analysis

### ✅ What's Already Working
- **Database Schema**: `anonymous_users` table has `interests` column (TEXT[])
- **API Support**: Both user creation and session creation APIs accept interests parameter
- **Frontend UI**: Basic interest input field exists on landing page
- **TypeScript Types**: Interest types are defined in `AnonymousUser` interface
- **Redux State**: `updateUserInterests` action exists in user slice
- **Constants**: Interest categories are defined in `constants.ts`
- **Database Index**: GIN index exists on interests column for performance

### ❌ What's Broken/Missing
- **Interest Processing**: Landing page doesn't process interest input properly
- **Interest Matching**: Database function doesn't use interests for matching (removed in migration 009)
- **Interest Selector UI**: No proper interest selection component
- **Interest Validation**: No validation or normalization of interest input
- **Interest Display**: No way to show matched interests in chat

## Implementation Strategy

### Phase 1: Frontend Interest Processing (Low Risk)
**Goal**: Fix the interest input flow from landing page to chat session

#### 1.1 Fix Landing Page Interest Processing
- **File**: `src/app/page.tsx`
- **Changes**:
  - Parse interest input string into array (comma-separated)
  - Basic validation (trim, lowercase, limit to 10 interests)
  - Store interests in session storage
  - Keep the simple text input design

#### 1.2 Keep Simple Text Input (No Changes Needed)
- **Current Implementation**: Simple text input field is perfect
- **User Experience**: Users type interests freely (e.g., "gaming", "music", "cooking")
- **No Complex UI**: No predefined categories or multi-select needed
- **Simple & Clean**: Matches the cozy, minimal design philosophy

#### 1.3 Update Chat Page Interest Handling
- **File**: `src/app/chat/page.tsx`
- **Changes**:
  - Read interests from session storage
  - Pass interests to user creation API
  - Pass interests to session creation API
  - Keep it simple - no complex interest display needed

### Phase 2: Database Interest Matching (Medium Risk)
**Goal**: Restore and improve interest-based matching in database

#### 2.1 Create New Migration for Interest Matching
- **New File**: `supabase/migrations/013_restore_interest_matching.sql`
- **Changes**:
  - Update `create_or_join_session_atomic` function to include interest matching
  - Add interest compatibility scoring
  - Maintain fallback to random matching if no interest matches
  - Add interest matching statistics

#### 2.2 Interest Matching Algorithm
```sql
-- Interest matching logic (simplified)
WHERE (
    user_interests IS NULL 
    OR au.interests IS NULL 
    OR user_interests && au.interests  -- Has overlapping interests
)
ORDER BY 
    CASE WHEN user_interests IS NOT NULL AND au.interests IS NOT NULL 
         THEN array_length(array(SELECT unnest(user_interests) INTERSECT SELECT unnest(au.interests)), 1) 
         ELSE 0 
    END DESC,
    cs.created_at ASC
```

#### 2.3 Add Interest Matching Statistics
- Track interest match success rates
- Add interest compatibility metrics
- Monitor matching performance

### Phase 3: Enhanced Interest Features (Low Risk)
**Goal**: Add advanced interest features and UI improvements

#### 3.1 Keep Interest Display Simple (Optional)
- No complex interest display needed
- Keep the chat interface clean and simple
- Focus on the conversation, not the matching details

#### 3.2 Keep Interest Management Simple
- No need for complex interest management
- Users can start fresh with new interests if needed
- Keep the experience simple and focused

#### 3.3 Simple Analytics (Optional)
- Basic interest matching statistics for backend
- No complex user-facing analytics needed
- Keep the focus on simple, effective matching

## Detailed Implementation Steps

### **TASK BREAKDOWN WITH TESTING REQUIREMENTS**

Each task below must be implemented **ONE AT A TIME** with testing after each change:

#### **Task 1.1: Fix Landing Page Interest Processing**
- **Files to modify**: `src/app/page.tsx`
- **Changes**: Parse interest input, validate, store in session storage
- **Testing required**: 
  - Test interest parsing with various inputs
  - Test session storage functionality
  - Verify landing page still works without interests
  - Test navigation to chat page
- **Documentation to review**: `FRONTEND_ARCHITECTURE.md`, `CHAT_FLOW_AND_FEATURES.md`
- **Rollback plan**: Revert to simple string input if issues arise

#### **Task 1.2: Keep Simple Text Input (SKIP)**
- **Status**: No changes needed - current simple text input is perfect
- **Reason**: User wants simple, free-form text input for interests
- **Current Design**: Users type interests like "gaming, music, cooking" and click start

#### **Task 1.3: Update Chat Page Interest Handling**
- **Files to modify**: `src/app/chat/page.tsx`
- **Changes**: Read interests from session storage, pass to APIs
- **Testing required**:
  - Test interest reading from session storage
  - Test API calls with interests
  - Verify chat page still works without interests
  - Test user creation with interests
  - Test session creation with interests
- **Documentation to review**: `CHAT_FLOW_AND_FEATURES.md`, `FRONTEND_ARCHITECTURE.md`
- **Rollback plan**: Remove interest handling, keep existing functionality

#### **Task 2.1: Create Database Migration for Interest Matching**
- **Files to create**: `supabase/migrations/013_restore_interest_matching.sql`
- **Changes**: Update database function with interest matching logic
- **Testing required**:
  - Test migration runs successfully
  - Test function with various interest combinations
  - Test fallback to random matching
  - Verify existing sessions still work
  - Test performance with interest matching
- **Documentation to review**: `DATABASE_ARCHITECTURE.md`
- **Rollback plan**: Revert migration, restore previous function

#### **Task 2.2: Test Interest Matching End-to-End**
- **Testing required**:
  - Create two users with matching interests
  - Create two users with no matching interests
  - Create users with no interests
  - Test matching performance
  - Verify chat sessions work correctly
- **Documentation to review**: `CHAT_FLOW_AND_FEATURES.md`, `DATABASE_ARCHITECTURE.md`
- **Rollback plan**: Revert to previous migration if issues found

### Step 1: Frontend Interest Processing

#### 1.1 Update Landing Page (`src/app/page.tsx`)
```typescript
// Current issues:
// - interests is a string, not array
// - interests not passed to chat page
// - no interest validation

// Fix:
const [interests, setInterests] = useState<string[]>([]);
const [interestInput, setInterestInput] = useState('');

const parseInterests = (input: string): string[] => {
  return input
    .split(',')
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .slice(0, 10); // Limit to 10 interests
};

const handleStartChat = () => {
  const parsedInterests = parseInterests(interestInput);
  setInterests(parsedInterests);
  
  // Store in session storage
  sessionStorage.setItem('cozy-chat-interests', JSON.stringify(parsedInterests));
  
  setIsStarting(true);
  setTimeout(() => {
    router.push('/chat');
  }, 800);
};
```

#### 1.2 Keep Simple Text Input (No Component Needed)
```typescript
// Current simple approach in src/app/page.tsx
<Input
  placeholder="Your interests (optional)"
  value={interests}
  onChange={(e) => setInterests(e.target.value)}
  icon={<span>🏷️</span>}
/>
// Users type: "gaming, music, cooking" and click start
```

#### 1.3 Update Chat Page Interest Handling
```typescript
// src/app/chat/page.tsx
useEffect(() => {
  // Read interests from session storage
  const storedInterests = sessionStorage.getItem('cozy-chat-interests');
  const userInterests = storedInterests ? JSON.parse(storedInterests) : [];
  
  // Pass to user creation
  const response = await fetch('/api/user/create-anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interests: userInterests }),
  });
}, []);
```

### Step 2: Database Interest Matching

#### 2.1 Create Migration File
```sql
-- supabase/migrations/013_restore_interest_matching.sql
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
        OR user_interests && au.interests
    )
    ORDER BY 
        match_count DESC,
        cs.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;
    
    -- Rest of function logic...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.2 Add Interest Matching Statistics
```sql
-- Add interest matching tracking
CREATE TABLE IF NOT EXISTS interest_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id),
    user1_interests TEXT[],
    user2_interests TEXT[],
    common_interests TEXT[],
    match_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 3: Enhanced Interest Features

#### 3.1 Interest Display in Chat
```typescript
// src/components/chat/InterestDisplay.tsx
interface InterestDisplayProps {
  userInterests: string[];
  matchedInterests: string[];
  otherUserInterests: string[];
}

export const InterestDisplay: React.FC<InterestDisplayProps> = ({
  userInterests,
  matchedInterests,
  otherUserInterests
}) => {
  const compatibilityPercentage = (matchedInterests.length / Math.max(userInterests.length, otherUserInterests.length)) * 100;
  
  return (
    <div className="interest-display">
      <div className="compatibility-score">
        {compatibilityPercentage.toFixed(0)}% compatibility
      </div>
      <div className="matched-interests">
        {matchedInterests.map(interest => (
          <span key={interest} className="interest-tag matched">
            {interest}
          </span>
        ))}
      </div>
    </div>
  );
};
```

#### 3.2 Interest-Based Conversation Starters
```typescript
// src/lib/conversationStarters.ts
export const getInterestBasedStarters = (interests: string[]): string[] => {
  const starters: Record<string, string[]> = {
    'technology': [
      "What's your favorite programming language?",
      "Have you tried any new tech lately?",
      "What's the most interesting project you've worked on?"
    ],
    'music': [
      "What's your favorite genre of music?",
      "Have you been to any concerts recently?",
      "What's the last song you listened to?"
    ],
    // ... more categories
  };
  
  return interests.flatMap(interest => starters[interest] || []);
};
```

## Risk Assessment & Mitigation

### High Risk Areas
1. **Database Function Changes**: Modifying core matching logic
   - **Mitigation**: Create new migration, test thoroughly, maintain fallback
   - **Rollback Plan**: Revert to previous migration if issues arise

2. **Session Creation Flow**: Changes to user/session creation
   - **Mitigation**: Maintain backward compatibility, test with empty interests
   - **Rollback Plan**: Revert API changes, keep frontend changes

### Medium Risk Areas
1. **Frontend State Management**: Changes to Redux state
   - **Mitigation**: Add new actions, don't modify existing ones
   - **Rollback Plan**: Remove new actions, keep existing functionality

2. **Interest Processing**: New input validation and parsing
   - **Mitigation**: Add comprehensive validation, handle edge cases
   - **Rollback Plan**: Revert to simple string input

### Low Risk Areas
1. **UI Components**: New interest selector component
   - **Mitigation**: Isolated component, no impact on existing functionality
   - **Rollback Plan**: Remove component, revert to simple input

2. **Interest Display**: Showing interests in chat
   - **Mitigation**: Optional feature, doesn't affect core functionality
   - **Rollback Plan**: Remove display, keep matching logic

## Testing Strategy

### Unit Tests
- Interest parsing and validation functions
- Interest matching algorithm
- Interest selector component
- Interest display component

### Integration Tests
- End-to-end interest flow from landing page to chat
- Interest-based matching with multiple users
- Interest update functionality
- Interest display in chat

### Performance Tests
- Database query performance with interest matching
- Interest selector component performance
- Interest processing performance

### User Acceptance Tests
- Interest selection usability
- Interest matching effectiveness
- Interest display clarity
- Overall user experience

## Deployment Plan

### Phase 1: Frontend Changes (Week 1)
1. Deploy interest processing fixes
2. Deploy interest selector component
3. Test with existing database (no interest matching)
4. Monitor for any issues

### Phase 2: Database Changes (Week 2)
1. Deploy interest matching migration
2. Test interest-based matching
3. Monitor matching performance
4. Rollback if issues arise

### Phase 3: Enhanced Features (Week 3)
1. Deploy interest display features
2. Deploy conversation starters
3. Deploy interest analytics
4. Monitor user engagement

## Success Metrics

### Technical Metrics
- Interest matching success rate
- Database query performance
- Frontend component performance
- Error rates and rollback frequency

### User Experience Metrics
- Interest selection completion rate
- Interest-based match satisfaction
- User engagement with interest features
- Chat session quality with interest matching

### Business Metrics
- User retention with interest features
- Chat session duration with interest matching
- User satisfaction scores
- Feature adoption rates

## Maintenance & Monitoring

### Database Monitoring
- Monitor interest matching query performance
- Track interest matching success rates
- Monitor database function execution times
- Alert on interest matching failures

### Frontend Monitoring
- Monitor interest selector component usage
- Track interest input validation errors
- Monitor interest display component performance
- Alert on interest processing failures

### User Experience Monitoring
- Track interest selection completion rates
- Monitor interest-based match satisfaction
- Track user feedback on interest features
- Monitor interest feature adoption rates

## Conclusion

This implementation plan provides a comprehensive, phased approach to implementing the interest feature safely. By breaking the implementation into low-risk, medium-risk, and high-risk phases, we can ensure that the existing functionality remains stable while gradually adding the interest-based matching capabilities.

The key to success is maintaining backward compatibility, comprehensive testing, and having clear rollback plans for each phase. The interest feature will significantly enhance the user experience by providing more meaningful matches based on shared interests.
