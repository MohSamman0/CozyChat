# 🟡 MEDIUM: Session Storage Abuse

## Issue Summary
The application uses multiple sessionStorage keys inconsistently, leading to state synchronization issues and potential stale data problems.

## Current Implementation
```typescript
// Multiple sessionStorage keys
sessionStorage.setItem('cozy-chat-interests', JSON.stringify(parsedInterests));
sessionStorage.setItem('cozy-chat-user-id', data.user.id);
sessionStorage.setItem('cozy-chat-creating-user', 'true');
```

## Problems Identified
1. **Inconsistent State**: Multiple keys can get out of sync
2. **No Validation**: Stored data is not validated on retrieval
3. **Stale Data**: Data can become stale after page refresh
4. **Hard to Debug**: Multiple storage locations make debugging difficult
5. **No Error Handling**: No handling of storage failures

## Impact
- **State Synchronization Issues**: Redux state and sessionStorage can diverge
- **Stale Data**: Users may see outdated information
- **Debugging Difficulty**: Hard to track state across multiple storage locations
- **Potential Crashes**: Invalid data can cause application errors

## Evidence
- Multiple sessionStorage.setItem calls with different keys
- No validation of stored data
- Inconsistent naming conventions

## Solution
### 1. Single Session Storage Manager
```typescript
// Centralized session storage manager
class SessionStorageManager {
  private static readonly STORAGE_KEY = 'cozy-chat-session';
  
  static getStoredData(): SessionData | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return this.validateSessionData(parsed) ? parsed : null;
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  }
  
  static setStoredData(data: SessionData): void {
    try {
      const validated = this.validateSessionData(data);
      if (validated) {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }
  
  static clearStoredData(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
  
  private static validateSessionData(data: any): data is SessionData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.userId === 'string' &&
      Array.isArray(data.interests) &&
      typeof data.timestamp === 'number'
    );
  }
}
```

### 2. Type-Safe Session Data
```typescript
// Define session data structure
interface SessionData {
  userId: string;
  interests: string[];
  timestamp: number;
  sessionId?: string;
  isCreatingUser?: boolean;
}

// Custom hook for session storage
const useSessionStorage = () => {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  
  const loadStoredData = useCallback(() => {
    const data = SessionStorageManager.getStoredData();
    setSessionData(data);
    return data;
  }, []);
  
  const saveStoredData = useCallback((data: SessionData) => {
    SessionStorageManager.setStoredData(data);
    setSessionData(data);
  }, []);
  
  const clearStoredData = useCallback(() => {
    SessionStorageManager.clearStoredData();
    setSessionData(null);
  }, []);
  
  return { sessionData, loadStoredData, saveStoredData, clearStoredData };
};
```

### 3. Sync with Redux State
```typescript
// Sync session storage with Redux
const useSessionSync = () => {
  const dispatch = useAppDispatch();
  const { sessionData, loadStoredData, saveStoredData } = useSessionStorage();
  
  // Load data on mount
  useEffect(() => {
    const stored = loadStoredData();
    if (stored) {
      dispatch(setUser({ id: stored.userId, interests: stored.interests }));
      if (stored.sessionId) {
        dispatch(setCurrentSession(stored.sessionId));
      }
    }
  }, [dispatch, loadStoredData]);
  
  // Save data when Redux state changes
  const currentUser = useAppSelector(state => state.user.currentUser);
  const currentSession = useAppSelector(state => state.chat.currentSession);
  
  useEffect(() => {
    if (currentUser) {
      saveStoredData({
        userId: currentUser.id,
        interests: currentUser.interests,
        timestamp: Date.now(),
        sessionId: currentSession?.id,
        isCreatingUser: false
      });
    }
  }, [currentUser, currentSession, saveStoredData]);
};
```

### 4. Add Data Expiration
```typescript
// Add expiration to session data
interface SessionData {
  userId: string;
  interests: string[];
  timestamp: number;
  sessionId?: string;
  isCreatingUser?: boolean;
  expiresAt: number; // Add expiration timestamp
}

class SessionStorageManager {
  private static readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours
  
  static getStoredData(): SessionData | null {
    try {
      const data = sessionStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      if (!this.validateSessionData(parsed)) return null;
      
      // Check if data has expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.clearStoredData();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to retrieve session data:', error);
      return null;
    }
  }
  
  static setStoredData(data: SessionData): void {
    try {
      const validated = this.validateSessionData(data);
      if (validated) {
        const dataWithExpiry = {
          ...data,
          expiresAt: Date.now() + this.EXPIRY_TIME
        };
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataWithExpiry));
      }
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }
}
```

## Testing Required
- [ ] Test session data persistence across page refreshes
- [ ] Verify data validation works correctly
- [ ] Test expiration mechanism
- [ ] Verify Redux state synchronization
- [ ] Test error handling for storage failures

## Priority
**MEDIUM** - Affects user experience and debugging

## Dependencies
- Can be implemented alongside Issue #05 (Complex Session State Management)

## Estimated Effort
1-2 days (including testing)

## Expected Improvements
- Eliminated state synchronization issues
- Better debugging experience
- More reliable session persistence
- Type-safe session data

## Related Issues
- Issue #05: Complex Session State Management
- Issue #07: Inefficient Realtime Setup
