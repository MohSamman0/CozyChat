# Cozy Chat - Frontend Architecture

## Overview

Cozy Chat is built with Next.js 14, React 18, and TypeScript, featuring a modern, responsive design with real-time capabilities. The frontend architecture emphasizes performance, user experience, and maintainability.

## Technology Stack

### Core Technologies
- **Next.js 14** - React framework with App Router
- **React 18** - UI library with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Redux Toolkit** - State management
- **Supabase** - Backend-as-a-Service

### Key Libraries
- **@supabase/supabase-js** - Supabase client
- **@reduxjs/toolkit** - Redux state management
- **react-redux** - React-Redux bindings
- **framer-motion** - Animation library
- **lucide-react** - Icon library

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── chat/              # Chat page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── providers.tsx      # Context providers
├── components/            # Reusable components
│   ├── chat/             # Chat-specific components
│   ├── layout/           # Layout components
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── pages/                # API routes
│   └── api/              # Next.js API endpoints
├── store/                # Redux store
│   └── slices/           # Redux slices
├── styles/               # Additional styles
└── types/                # TypeScript definitions
```

## Component Architecture

### 1. Layout Components

#### `Header.tsx`
```typescript
export const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">CozyChat</h1>
        </div>
        <div className="flex items-center space-x-2">
          <ConnectionStatus />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
```

#### `Container.tsx`
Responsive container with mobile-first design:
```typescript
export const Container = ({ children, className = "" }: ContainerProps) => {
  return (
    <div className={`max-w-md mx-auto bg-white min-h-screen ${className}`}>
      {children}
    </div>
  );
};
```

### 2. Chat Components

#### `ChatMessage.tsx`
Individual message component with encryption support:
```typescript
export const ChatMessage = ({ message, isOwn }: ChatMessageProps) => {
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

#### `ChatControls.tsx`
Message input and control buttons:
```typescript
export const ChatControls = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, isConnected } = useRealtimeChat();

  const handleSend = async () => {
    if (message.trim() && isConnected) {
      await sendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex space-x-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a cozy message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} disabled={!isConnected}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
```

### 3. UI Components

#### `Button.tsx`
Reusable button component with variants:
```typescript
export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  ...props 
}: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:from-orange-500 hover:to-orange-600 focus:ring-orange-500",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

## State Management

### Redux Store Structure

#### `store/index.ts`
```typescript
export const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
    user: userSlice.reducer,
    connection: connectionSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### Chat Slice (`chatSlice.ts`)
```typescript
interface ChatState {
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  typingIndicators: TypingIndicator[];
  messageHistory: Record<string, Message[]>;
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<ChatSession | null>) => {
      state.currentSession = action.payload;
      state.messages = action.payload ? state.messageHistory[action.payload.id] || [] : [];
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      // Prevent duplicates
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
    },
    // ... other reducers
  },
});
```

## Real-time Communication

### `useRealtimeChat` Hook

The core hook managing real-time functionality:

```typescript
export const useRealtimeChat = (options: UseRealtimeChatOptions = {}) => {
  const dispatch = useAppDispatch();
  const { currentSession } = useAppSelector(state => state.chat);
  const { status: connectionStatus } = useAppSelector(state => state.connection);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);

  // Initialize encryption key for session
  const initializeEncryption = useCallback(async (sessionId: string) => {
    try {
      encryptionKeyRef.current = await deriveSessionKey(sessionId);
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      dispatch(setConnectionError('Encryption setup failed'));
    }
  }, [dispatch]);

  // Handle message encryption before sending
  const encryptAndSendMessage = useCallback(async (content: string) => {
    if (!currentSession || !userId || !encryptionKeyRef.current) {
      throw new Error('Session not ready for messaging');
    }

    try {
      const encryptedContent = await encryptMessage(content, encryptionKeyRef.current);
      
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      const json = await response.json();

      // Optimistic UI update
      const nowIso = new Date().toISOString();
      const messageRow = {
        id: json?.message_id || `${Date.now()}`,
        session_id: currentSession.id,
        sender_id: userId,
        content,
        encrypted_content: encryptedContent,
        message_type: 'text' as const,
        is_flagged: false,
        created_at: nowIso,
        updated_at: nowIso,
      };
      const optimistic = mapMessageRowToMessage(messageRow, userId);
      dispatch(addMessage(optimistic));

      return json;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [currentSession, userId]);

  // Setup realtime connection
  const connect = useCallback(async (sessionId: string, userId: string) => {
    try {
      dispatch(setConnectionStatus('connecting'));
      dispatch(setLoading(true));

      await initializeEncryption(sessionId);

      const channel = supabase
        .channel(`chat-session-${sessionId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          // Filter client-side by session_id
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
            // Handle session updates
            const session: ChatSession = {
              id: payload.new.id,
              user1_id: payload.new.user1_id,
              user2_id: payload.new.user2_id,
              status: payload.new.status,
              started_at: payload.new.started_at,
              ended_at: payload.new.ended_at,
              created_at: payload.new.created_at,
            };
            
            dispatch(updateSessionStatus({
              sessionId: payload.new.id,
              status: payload.new.status
            }));
            dispatch(setCurrentSession(session));
          }
        });

      channelRef.current = channel;

      const status = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          dispatch(setConnectionStatus('connected'));
          dispatch(setLoading(false));
          dispatch(resetReconnectAttempts());
          startHeartbeat();
          startSessionPolling(sessionId, userId);
        } else if (status === 'CHANNEL_ERROR') {
          dispatch(setConnectionStatus('error'));
          dispatch(setConnectionError('Failed to connect to chat'));
          attemptReconnection(sessionId, userId, connect);
        }
      });

    } catch (error) {
      console.error('Connection error:', error);
      dispatch(setConnectionStatus('error'));
      dispatch(setConnectionError(error instanceof Error ? error.message : 'Unknown error'));
      attemptReconnection(sessionId, userId, connect);
    }
  }, [dispatch, initializeEncryption, handleIncomingMessage]);

  return {
    connect,
    disconnect,
    sendMessage: encryptAndSendMessage,
    sendTypingIndicator,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
};
```

## API Integration

### API Routes

#### `/api/chat/create-session`
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, interests } = req.body;

    const { data, error } = await supabase.rpc('create_or_join_session_atomic', {
      p_user_id: user_id,
      p_user_interests: interests || []
    });

    if (error) {
      console.error('Session creation error:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    const result = data[0];
    return res.status(200).json({
      session_id: result.session_id,
      user1_id: result.user1_id,
      user2_id: result.user2_id,
      status: result.status,
      is_new_session: result.is_new_session
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

#### `/api/chat/send-message`
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id, sender_id, content, encrypted_content } = req.body;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        sender_id,
        content,
        encrypted_content,
        message_type: 'text'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Message send error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    return res.status(201).json({ message_id: data.id });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Encryption & Security

### Client-side Encryption
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

export const decryptMessage = async (encryptedData: string, key: CryptoKey): Promise<string> => {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
};
```

## Styling & Theming

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cozy: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
```

### Global Styles
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gradient-to-br from-orange-50 to-amber-50 min-h-screen;
  }
}

@layer components {
  .cozy-gradient {
    @apply bg-gradient-to-r from-orange-400 to-orange-500;
  }
  
  .cozy-shadow {
    @apply shadow-lg shadow-orange-200/50;
  }
  
  .message-bubble {
    @apply rounded-2xl px-4 py-2 max-w-xs;
  }
  
  .message-bubble-own {
    @apply bg-gradient-to-r from-orange-400 to-orange-500 text-white;
  }
  
  .message-bubble-other {
    @apply bg-white text-gray-900 border border-gray-200;
  }
}
```

## Performance Optimizations

### Code Splitting
- Automatic route-based code splitting with Next.js App Router
- Dynamic imports for heavy components
- Lazy loading of non-critical features

### State Management
- Redux Toolkit for efficient state updates
- Memoized selectors to prevent unnecessary re-renders
- Optimistic updates for better UX

### Real-time Optimization
- Client-side filtering to reduce unnecessary updates
- Connection pooling and reconnection logic
- Debounced typing indicators

## Error Handling

### Error Boundaries
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

### API Error Handling
```typescript
const handleApiError = (error: any) => {
  if (error.response?.status === 401) {
    // Handle authentication errors
    dispatch(setError('Session expired. Please refresh the page.'));
  } else if (error.response?.status >= 500) {
    // Handle server errors
    dispatch(setError('Server error. Please try again later.'));
  } else {
    // Handle other errors
    dispatch(setError(error.message || 'An unexpected error occurred.'));
  }
};
```

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Hook testing with @testing-library/react-hooks
- Redux slice testing

### Integration Tests
- API route testing
- Real-time functionality testing
- End-to-end user flows

### Performance Testing
- Lighthouse audits
- Bundle size analysis
- Real-time connection stress testing

This frontend architecture provides a robust, scalable foundation for the Cozy Chat application with modern React patterns, comprehensive state management, and excellent user experience.
