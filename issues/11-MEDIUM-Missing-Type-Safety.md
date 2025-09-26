# 🟡 MEDIUM: Missing Type Safety

## Issue Summary
Several areas of the application lack proper type safety, leading to potential runtime errors and making the codebase harder to maintain and debug.

## Current State
- Missing type definitions in several areas
- Inconsistent type usage across components
- No type validation for API responses
- Missing type safety in Redux state management

## Impact
- **Runtime Errors**: Type mismatches can cause crashes
- **Maintenance Difficulty**: Harder to refactor and maintain
- **Debugging Issues**: Type errors are harder to track down
- **Developer Experience**: Poor IntelliSense and autocomplete

## Evidence
- Missing type definitions mentioned in analysis
- Inconsistent type usage across the codebase
- No type validation for external data

## Solution
### 1. Add Comprehensive Type Definitions
```typescript
// Enhanced type definitions
interface User {
  id: string;
  interests: string[];
  createdAt: Date;
  lastActiveAt: Date;
  isOnline: boolean;
}

interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string | null;
  status: 'waiting' | 'active' | 'ended';
  createdAt: Date;
  endedAt: Date | null;
  context?: SessionContext;
}

interface Message {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  encryptedContent: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'emoji' | 'system';
}

interface SessionContext {
  sharedInterests: string[];
  compatibilityScore: number;
  matchQuality: 'high' | 'medium' | 'low';
}

// API Response types
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  timestamp: Date;
}

interface CreateSessionResponse {
  session: ChatSession;
  user: User;
  encryptionKey: string;
}

interface SendMessageResponse {
  message: Message;
  success: boolean;
}
```

### 2. Add Type Guards
```typescript
// Type guards for runtime type checking
export const isUser = (obj: any): obj is User => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    Array.isArray(obj.interests) &&
    obj.createdAt instanceof Date &&
    obj.lastActiveAt instanceof Date &&
    typeof obj.isOnline === 'boolean'
  );
};

export const isChatSession = (obj: any): obj is ChatSession => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user1Id === 'string' &&
    (obj.user2Id === null || typeof obj.user2Id === 'string') &&
    ['waiting', 'active', 'ended'].includes(obj.status) &&
    obj.createdAt instanceof Date &&
    (obj.endedAt === null || obj.endedAt instanceof Date)
  );
};

export const isMessage = (obj: any): obj is Message => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.sessionId === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.encryptedContent === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.isRead === 'boolean' &&
    ['text', 'emoji', 'system'].includes(obj.messageType)
  );
};

export const isApiResponse = <T>(obj: any, dataValidator: (data: any) => data is T): obj is ApiResponse<T> => {
  return (
    obj &&
    typeof obj.success === 'boolean' &&
    dataValidator(obj.data) &&
    (obj.error === undefined || typeof obj.error === 'string') &&
    obj.timestamp instanceof Date
  );
};
```

### 3. Add API Type Validation
```typescript
// API type validation
class ApiTypeValidator {
  static validateUser(data: any): User {
    if (!isUser(data)) {
      throw new Error('Invalid user data received from API');
    }
    return data;
  }
  
  static validateChatSession(data: any): ChatSession {
    if (!isChatSession(data)) {
      throw new Error('Invalid chat session data received from API');
    }
    return data;
  }
  
  static validateMessage(data: any): Message {
    if (!isMessage(data)) {
      throw new Error('Invalid message data received from API');
    }
    return data;
  }
  
  static validateApiResponse<T>(
    response: any,
    dataValidator: (data: any) => data is T
  ): ApiResponse<T> {
    if (!isApiResponse(response, dataValidator)) {
      throw new Error('Invalid API response format');
    }
    return response;
  }
}

// Enhanced API client with type validation
class TypedApiClient {
  async createSession(interests: string[]): Promise<CreateSessionResponse> {
    const response = await fetch('/api/chat/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interests })
    });
    
    const data = await response.json();
    const validatedResponse = ApiTypeValidator.validateApiResponse(
      data,
      (d): d is CreateSessionResponse => 
        d && isChatSession(d.session) && isUser(d.user) && typeof d.encryptionKey === 'string'
    );
    
    return validatedResponse.data;
  }
  
  async sendMessage(sessionId: string, content: string): Promise<SendMessageResponse> {
    const response = await fetch('/api/chat/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, content })
    });
    
    const data = await response.json();
    const validatedResponse = ApiTypeValidator.validateApiResponse(
      data,
      (d): d is SendMessageResponse => 
        d && isMessage(d.message) && typeof d.success === 'boolean'
    );
    
    return validatedResponse.data;
  }
}
```

### 4. Enhance Redux Type Safety
```typescript
// Enhanced Redux types
interface RootState {
  user: UserState;
  chat: ChatState;
  connection: ConnectionState;
}

interface UserState {
  currentUser: User | null;
  isCreatingUser: boolean;
  error: string | null;
}

interface ChatState {
  currentSession: ChatSession | null;
  messages: Message[];
  isSending: boolean;
  error: string | null;
}

interface ConnectionState {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  error: string | null;
}

// Typed Redux actions
type UserAction = 
  | { type: 'user/SET_CURRENT_USER'; payload: User }
  | { type: 'user/SET_CREATING_USER'; payload: boolean }
  | { type: 'user/SET_ERROR'; payload: string | null };

type ChatAction = 
  | { type: 'chat/SET_CURRENT_SESSION'; payload: ChatSession | null }
  | { type: 'chat/ADD_MESSAGE'; payload: Message }
  | { type: 'chat/SET_SENDING'; payload: boolean }
  | { type: 'chat/SET_ERROR'; payload: string | null };

type ConnectionAction = 
  | { type: 'connection/SET_CONNECTED'; payload: boolean }
  | { type: 'connection/SET_CONNECTION_STATE'; payload: ConnectionState['connectionState'] }
  | { type: 'connection/SET_ERROR'; payload: string | null };

// Typed Redux hooks
export const useAppSelector = <T>(selector: (state: RootState) => T): T => {
  return useSelector(selector);
};

export const useAppDispatch = () => {
  return useDispatch<Dispatch<UserAction | ChatAction | ConnectionAction>>();
};
```

### 5. Add Runtime Type Checking
```typescript
// Runtime type checking utility
class RuntimeTypeChecker {
  static checkTypes<T>(obj: any, validator: (obj: any) => obj is T): T {
    if (!validator(obj)) {
      throw new Error(`Type validation failed for object: ${JSON.stringify(obj)}`);
    }
    return obj;
  }
  
  static validateArray<T>(arr: any, itemValidator: (item: any) => item is T): T[] {
    if (!Array.isArray(arr)) {
      throw new Error('Expected array but got non-array value');
    }
    
    return arr.map((item, index) => {
      if (!itemValidator(item)) {
        throw new Error(`Type validation failed for array item at index ${index}`);
      }
      return item;
    });
  }
  
  static validateOptional<T>(value: any, validator: (val: any) => val is T): T | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return this.checkTypes(value, validator);
  }
}

// Usage example
const validateUserArray = (data: any): User[] => {
  return RuntimeTypeChecker.validateArray(data, isUser);
};

const validateOptionalMessage = (data: any): Message | undefined => {
  return RuntimeTypeChecker.validateOptional(data, isMessage);
};
```

### 6. Add Type-Safe Event Handling
```typescript
// Type-safe event handling
interface ChatEvents {
  'user:created': { user: User };
  'session:created': { session: ChatSession };
  'session:joined': { session: ChatSession; user: User };
  'message:received': { message: Message };
  'message:sent': { message: Message };
  'session:ended': { sessionId: string };
  'error:occurred': { error: string; context?: any };
}

class TypedEventEmitter {
  private listeners = new Map<keyof ChatEvents, Array<(data: any) => void>>();
  
  on<K extends keyof ChatEvents>(
    event: K,
    listener: (data: ChatEvents[K]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }
  
  emit<K extends keyof ChatEvents>(
    event: K,
    data: ChatEvents[K]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
  
  off<K extends keyof ChatEvents>(
    event: K,
    listener: (data: ChatEvents[K]) => void
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}
```

## Testing Required
- [ ] Test type guards work correctly
- [ ] Verify API type validation
- [ ] Test Redux type safety
- [ ] Verify runtime type checking
- [ ] Test type-safe event handling

## Priority
**MEDIUM** - Important for code quality and maintainability

## Dependencies
- Can be implemented independently

## Estimated Effort
2-3 days (including testing and implementation)

## Expected Improvements
- Reduced runtime errors
- Better developer experience
- Improved code maintainability
- Better IntelliSense and autocomplete

## Related Issues
- Issue #09: Missing Error Boundaries
- Issue #12: Hardcoded Timeouts and Intervals
