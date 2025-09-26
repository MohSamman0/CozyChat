# 🟡 HIGH: Complex Session State Management

## Issue Summary
The frontend chat component has overly complex state management with 8+ state variables, complex useEffect chains, and potential memory leaks from improper cleanup.

## Current Implementation
```typescript
// Multiple state variables and effects
const [initializingUser, setInitializingUser] = useState(true);
const [isStuck, setIsStuck] = useState(false);
const [isSending, setIsSending] = useState(false);

// Complex useEffect chains
useEffect(() => { /* User initialization */ }, [currentUser, dispatch]);
useEffect(() => { /* Session creation */ }, [currentUser, initializingUser, dispatch, currentSession]);
useEffect(() => { /* Heartbeat */ }, [currentUser]);
```

## Problems Identified
1. **State Complexity**: 8+ state variables in single component
2. **Effect Dependencies**: Complex dependency chains causing re-renders
3. **Memory Leaks**: Multiple timeouts and intervals not properly cleaned up
4. **Race Conditions**: User creation and session creation can overlap
5. **Hard to Debug**: Complex state interactions make debugging difficult

## Impact
- **Memory Leaks**: Unclean timeouts and intervals
- **Performance Issues**: Unnecessary re-renders
- **Race Conditions**: State updates can conflict
- **Maintenance Difficulty**: Hard to understand and modify
- **Bug Prone**: Complex state interactions lead to bugs

## Evidence
- Multiple state variables in `chat/page.tsx`
- Complex useEffect dependency chains
- Session storage abuse with multiple keys
- No proper cleanup of timers and intervals

## Solution
### 1. Implement State Machine Pattern
```typescript
// Create a chat state machine
type ChatState = 
  | { type: 'INITIALIZING' }
  | { type: 'WAITING_FOR_MATCH' }
  | { type: 'CHATTING'; sessionId: string }
  | { type: 'CHAT_ENDED' }
  | { type: 'ERROR'; error: string };

const useChatStateMachine = () => {
  const [state, setState] = useState<ChatState>({ type: 'INITIALIZING' });
  
  const transitions = {
    INITIALIZING: ['WAITING_FOR_MATCH', 'ERROR'],
    WAITING_FOR_MATCH: ['CHATTING', 'ERROR'],
    CHATTING: ['CHAT_ENDED', 'ERROR'],
    CHAT_ENDED: ['WAITING_FOR_MATCH', 'INITIALIZING'],
    ERROR: ['INITIALIZING']
  };
  
  const transitionTo = useCallback((newState: ChatState) => {
    if (transitions[state.type].includes(newState.type)) {
      setState(newState);
    } else {
      console.warn(`Invalid transition from ${state.type} to ${newState.type}`);
    }
  }, [state.type]);
  
  return { state, transitionTo };
};
```

### 2. Consolidate Session Management
```typescript
// Single hook for all session operations
const useSessionManager = () => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createSession = useCallback(async (interests: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sessionAPI.create(interests);
      setSession(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const endSession = useCallback(async () => {
    if (!session) return;
    
    try {
      await sessionAPI.end(session.id);
      setSession(null);
    } catch (err) {
      setError(err.message);
    }
  }, [session]);
  
  return { session, isLoading, error, createSession, endSession };
};
```

### 3. Implement Proper Cleanup
```typescript
// Custom hook with proper cleanup
const useChatSession = () => {
  const [session, setSession] = useState<SessionState | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      // Heartbeat logic
    }, 30000);
    
    // Start polling
    pollingRef.current = setInterval(() => {
      // Polling logic
    }, 2000);
    
    // Cleanup function
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);
  
  return { session, setSession };
};
```

### 4. Simplify Session Storage
```typescript
// Single session storage manager
const useSessionStorage = () => {
  const getStoredData = useCallback(() => {
    try {
      const data = sessionStorage.getItem('cozy-chat-session');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);
  
  const setStoredData = useCallback((data: any) => {
    try {
      sessionStorage.setItem('cozy-chat-session', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to store session data:', error);
    }
  }, []);
  
  const clearStoredData = useCallback(() => {
    sessionStorage.removeItem('cozy-chat-session');
  }, []);
  
  return { getStoredData, setStoredData, clearStoredData };
};
```

## Testing Required
- [ ] Test state machine transitions work correctly
- [ ] Verify no memory leaks from timers
- [ ] Test session creation and cleanup
- [ ] Verify error handling works properly
- [ ] Test edge cases and error scenarios

## Priority
**HIGH** - Affects performance and maintainability

## Dependencies
- Can be implemented independently

## Estimated Effort
3-4 days (including testing and refactoring)

## Expected Improvements
- 40% reduction in memory usage
- Eliminated memory leaks
- Easier debugging and maintenance
- Better error handling

## Related Issues
- Issue #06: Session Storage Abuse
- Issue #07: Inefficient Realtime Setup
