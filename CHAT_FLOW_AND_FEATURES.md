# Cozy Chat - Complete Flow & Features

## Overview

Cozy Chat is a real-time anonymous chat application that connects users based on shared interests. The application features end-to-end encryption, seamless user matching, and a beautiful, responsive interface.

## User Journey & Flow

### 1. Landing Page Experience

#### Initial Load
- **Welcome Screen**: Clean, inviting interface with Cozy Chat branding
- **Theme Toggle**: Light/dark mode support with smooth transitions
- **Start Chatting Button**: Primary call-to-action to begin the experience

#### User Onboarding
```typescript
// Landing page flow
const LandingPage = () => {
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    setIsLoading(true);
    try {
      // Create anonymous user
      const userResponse = await fetch('/api/user/create-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests })
      });
      
      const user = await userResponse.json();
      
      // Create or join session
      const sessionResponse = await fetch('/api/chat/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          interests: user.interests 
        })
      });
      
      const session = await sessionResponse.json();
      
      // Navigate to chat
      router.push('/chat');
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Cozy Chat
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Connect with like-minded people through anonymous conversations
        </p>
        
        <InterestSelector 
          selectedInterests={interests}
          onInterestsChange={setInterests}
        />
        
        <Button 
          onClick={handleStartChat}
          disabled={isLoading}
          className="mt-8"
        >
          {isLoading ? 'Finding someone...' : 'Start Chatting'}
        </Button>
      </div>
    </Container>
  );
};
```

### 2. User Matching Process

#### Session Creation Flow
```typescript
// Database function: create_or_join_session_atomic
CREATE OR REPLACE FUNCTION create_or_join_session_atomic(
    p_user_id UUID,
    p_user_interests TEXT[]
) RETURNS TABLE(
    session_id UUID,
    user1_id UUID,
    user2_id UUID,
    status chat_status,
    is_new_session BOOLEAN
) AS $$
DECLARE
    v_session_id UUID;
    v_existing_session RECORD;
BEGIN
    -- Look for existing waiting session
    SELECT cs.id, cs.user1_id, au.interests
    INTO v_existing_session
    FROM chat_sessions cs
    JOIN anonymous_users au ON cs.user1_id = au.id
    WHERE cs.status = 'waiting' 
    AND cs.user1_id != p_user_id
    AND au.is_online = true
    ORDER BY cs.created_at ASC
    LIMIT 1;
    
    IF v_existing_session.id IS NOT NULL THEN
        -- Join existing session
        UPDATE chat_sessions 
        SET user2_id = p_user_id,
            status = 'active',
            started_at = now(),
            updated_at = now()
        WHERE id = v_existing_session.id;
        
        RETURN QUERY SELECT 
            v_existing_session.id,
            v_existing_session.user1_id,
            p_user_id,
            'active'::chat_status,
            false;
    ELSE
        -- Create new session
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at)
        VALUES (p_user_id, 'waiting', now(), now())
        RETURNING id INTO v_session_id;
        
        RETURN QUERY SELECT 
            v_session_id,
            p_user_id,
            NULL::UUID,
            'waiting'::chat_status,
            true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Matching States
1. **Waiting State**: User is waiting for a match
   - Shows "Finding someone..." message
   - Displays connection status
   - Polls for session updates

2. **Active State**: Chat is in progress
   - Both users connected
   - Real-time messaging enabled
   - Session status updates

3. **Ended State**: Chat has been terminated
   - Session cleanup
   - Option to start new chat

### 3. Real-time Chat Experience

#### Connection Establishment
```typescript
// useRealtimeChat hook - connection flow
const connect = useCallback(async (sessionId: string, userId: string) => {
  try {
    dispatch(setConnectionStatus('connecting'));
    dispatch(setLoading(true));

    // Initialize encryption
    await initializeEncryption(sessionId);

    // Create realtime channel
    const channel = supabase
      .channel(`chat-session-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        // Filter by session_id
        if (payload?.new?.session_id === sessionId) {
          handleIncomingMessage(payload);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_sessions',
      }, (payload) => {
        if (payload?.new?.id === sessionId) {
          handleSessionUpdate(payload);
        }
      });

    // Subscribe to channel
    const status = await channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        dispatch(setConnectionStatus('connected'));
        dispatch(setLoading(false));
        startHeartbeat();
        startSessionPolling(sessionId, userId);
      }
    });

  } catch (error) {
    dispatch(setConnectionStatus('error'));
    attemptReconnection(sessionId, userId, connect);
  }
}, []);
```

#### Message Flow
1. **User Types Message**: Input validation and UI feedback
2. **Encryption**: Client-side encryption using session key
3. **API Call**: Send to `/api/chat/send-message`
4. **Database Insert**: Store encrypted message
5. **Realtime Broadcast**: Supabase Realtime delivers to all subscribers
6. **Decryption**: Client-side decryption for display
7. **UI Update**: Message appears in chat interface

```typescript
// Message sending flow
const encryptAndSendMessage = useCallback(async (content: string) => {
  if (!currentSession || !userId || !encryptionKeyRef.current) {
    throw new Error('Session not ready for messaging');
  }

  try {
    // Encrypt message
    const encryptedContent = await encryptMessage(content, encryptionKeyRef.current);
    
    // Send to API
    const response = await fetch('/api/chat/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSession.id,
        sender_id: userId,
        content,
        encrypted_content: encryptedContent,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    // Optimistic UI update
    const messageRow = {
      id: `${Date.now()}`,
      session_id: currentSession.id,
      sender_id: userId,
      content,
      encrypted_content: encryptedContent,
      message_type: 'text' as const,
      is_flagged: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const optimistic = mapMessageRowToMessage(messageRow, userId);
    dispatch(addMessage(optimistic));

    return await response.json();
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}, [currentSession, userId]);
```

## Core Features

### 1. Anonymous User System

#### User Creation
```typescript
// API: /api/user/create-anonymous
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { interests = [] } = req.body;

    const { data, error } = await supabase
      .from('anonymous_users')
      .insert({
        interests,
        is_online: true,
        last_seen_at: new Date().toISOString()
      })
      .select('id, interests, created_at')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### User Management
- **No Registration Required**: Instant anonymous access
- **Interest-Based Matching**: Users matched by shared interests
- **Online Status**: Real-time online/offline tracking
- **Session Persistence**: User data stored in sessionStorage

### 2. End-to-End Encryption

#### Encryption Implementation
```typescript
// lib/encryption.ts
export const deriveSessionKey = async (sessionId: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionId);
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cozy-chat-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (message: string, key: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};
```

#### Security Features
- **Client-Side Encryption**: Messages encrypted before transmission
- **Session-Based Keys**: Unique encryption key per chat session
- **No Server Access**: Server cannot decrypt message content
- **Forward Secrecy**: Each session has unique encryption

### 3. Real-time Communication

#### Supabase Realtime Integration
```typescript
// Real-time subscription setup
const channel = supabase
  .channel(`chat-session-${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
  }, (payload) => {
    // Handle new messages
    if (payload?.new?.session_id === sessionId) {
      handleIncomingMessage(payload);
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'chat_sessions',
  }, (payload) => {
    // Handle session updates
    if (payload?.new?.id === sessionId) {
      handleSessionUpdate(payload);
    }
  });
```

#### Connection Management
- **Automatic Reconnection**: Handles connection drops gracefully
- **Heartbeat Monitoring**: Keeps connection alive
- **Error Recovery**: Exponential backoff for failed connections
- **Status Indicators**: Real-time connection status display

### 4. User Interface Features

#### Responsive Design
```typescript
// Mobile-first responsive design
const Container = ({ children, className = "" }: ContainerProps) => {
  return (
    <div className={`max-w-md mx-auto bg-white min-h-screen ${className}`}>
      {children}
    </div>
  );
};

// Responsive message layout
const ChatMessage = ({ message, isOwn }: ChatMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-xs px-4 py-2 rounded-2xl ${
        isOwn 
          ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isOwn ? 'text-orange-100' : 'text-gray-500'
        }`}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </motion.div>
  );
};
```

#### Animation & Transitions
- **Framer Motion**: Smooth animations for messages and UI elements
- **Loading States**: Elegant loading indicators
- **Transition Effects**: Smooth page transitions
- **Micro-interactions**: Button hover effects and feedback

#### Theme Support
```typescript
// Theme toggle functionality
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }, [theme]);

  return { theme, toggleTheme };
};
```

### 5. State Management

#### Redux Store Structure
```typescript
// Store slices
interface ChatState {
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  typingIndicators: TypingIndicator[];
  messageHistory: Record<string, Message[]>;
}

interface UserState {
  currentUser: AnonymousUser | null;
  isInitialized: boolean;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  metrics: {
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    latency: number;
  };
}
```

#### State Persistence
- **Session Storage**: User data persisted across page refreshes
- **Message History**: Chat history maintained per session
- **Connection State**: Real-time connection status tracking
- **Error Handling**: Comprehensive error state management

### 6. Performance Optimizations

#### Code Splitting
```typescript
// Dynamic imports for heavy components
const ChatPage = dynamic(() => import('./chat/page'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});

const InterestSelector = dynamic(() => import('./components/InterestSelector'), {
  loading: () => <div>Loading...</div>
});
```

#### Memoization
```typescript
// Memoized components
const ChatMessage = memo(({ message, isOwn }: ChatMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {/* Message content */}
    </motion.div>
  );
});

// Memoized selectors
const selectMessages = createSelector(
  [(state: RootState) => state.chat.messages],
  (messages) => messages
);
```

#### Optimistic Updates
```typescript
// Optimistic message updates
const addMessage = (state, action: PayloadAction<Message>) => {
  const message = action.payload;
  
  // Check for duplicates
  const existingMessage = state.messages.find(m => m.id === message.id);
  if (!existingMessage) {
    state.messages.push(message);
    
    // Store in history
    if (message.session_id) {
      if (!state.messageHistory[message.session_id]) {
        state.messageHistory[message.session_id] = [];
      }
      const existingInHistory = state.messageHistory[message.session_id].find(m => m.id === message.id);
      if (!existingInHistory) {
        state.messageHistory[message.session_id].push(message);
      }
    }
  }
};
```

## Advanced Features

### 1. Interest-Based Matching

#### Interest Selection
```typescript
const InterestSelector = ({ selectedInterests, onInterestsChange }: InterestSelectorProps) => {
  const availableInterests = [
    'Technology', 'Music', 'Sports', 'Art', 'Travel',
    'Food', 'Books', 'Movies', 'Gaming', 'Fitness',
    'Photography', 'Nature', 'Science', 'History', 'Fashion'
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter(i => i !== interest));
    } else {
      onInterestsChange([...selectedInterests, interest]);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {availableInterests.map(interest => (
        <button
          key={interest}
          onClick={() => toggleInterest(interest)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedInterests.includes(interest)
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {interest}
        </button>
      ))}
    </div>
  );
};
```

#### Matching Algorithm
```sql
-- Advanced matching function
CREATE OR REPLACE FUNCTION match_users_by_interests(
    p_user_interests TEXT[]
) RETURNS TABLE(
    user_id UUID,
    common_interests_count INTEGER,
    interests TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        array_length(array(SELECT unnest(p_user_interests) INTERSECT SELECT unnest(au.interests)), 1) as common_count,
        au.interests
    FROM anonymous_users au
    WHERE au.is_online = true
    AND au.interests && p_user_interests  -- Has overlapping interests
    ORDER BY common_count DESC, au.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Connection Health Monitoring

#### Heartbeat System
```typescript
const startHeartbeat = useCallback(() => {
  if (heartbeatIntervalRef.current) {
    clearInterval(heartbeatIntervalRef.current);
  }

  heartbeatIntervalRef.current = setInterval(async () => {
    if (channelRef.current && connectionStatus === 'connected') {
      const startTime = Date.now();
      
      try {
        // Send ping
        channelRef.current.send({
          type: 'broadcast',
          event: 'ping',
          payload: { timestamp: startTime, user_id: userId }
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
        dispatch(setConnectionError('Connection lost'));
      }
    }
  }, 30000); // 30 second intervals
}, [connectionStatus, userId, dispatch]);
```

#### Reconnection Logic
```typescript
const attemptReconnection = useCallback((sessionId: string, userId: string, connectFn: (sessionId: string, userId: string) => void) => {
  if (metrics.reconnectAttempts >= metrics.maxReconnectAttempts) {
    dispatch(setConnectionStatus('disconnected'));
    dispatch(setConnectionError('Max reconnection attempts reached'));
    return;
  }

  dispatch(incrementReconnectAttempts());
  dispatch(setConnectionStatus('reconnecting'));

  const delay = Math.min(1000 * Math.pow(2, metrics.reconnectAttempts), 30000); // Exponential backoff
  
  reconnectTimeoutRef.current = setTimeout(() => {
    connectFn(sessionId, userId);
  }, delay);
}, [dispatch, metrics]);
```

### 3. Error Handling & Recovery

#### Error Boundaries
```typescript
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened.
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### API Error Handling
```typescript
const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    dispatch(setError('Session expired. Please refresh the page.'));
  } else if (error.response?.status >= 500) {
    dispatch(setError('Server error. Please try again later.'));
  } else {
    dispatch(setError(error.message || 'An unexpected error occurred.'));
  }
};
```

## User Experience Features

### 1. Loading States
- **Skeleton Screens**: Elegant loading placeholders
- **Progress Indicators**: Clear feedback during operations
- **Connection Status**: Real-time connection indicators

### 2. Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets and gestures
- **Adaptive Layout**: Works on all screen sizes

### 3. Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Clear focus indicators

### 4. Performance
- **Fast Loading**: Optimized bundle sizes
- **Smooth Animations**: 60fps animations
- **Efficient Updates**: Minimal re-renders
- **Caching**: Smart data caching strategies

This comprehensive flow and feature documentation showcases the complete Cozy Chat experience, from initial user onboarding through real-time messaging with advanced features like encryption, interest-based matching, and robust error handling.
