# 🟡 MEDIUM: Inadequate Fallback Mechanisms

## Issue Summary
The application has limited fallback mechanisms when realtime connections fail, leading to poor user experience during network issues and service disruptions.

## Current State
- Limited fallback when realtime fails
- No offline support for messages
- Poor error recovery mechanisms
- No graceful degradation

## Impact
- **Poor User Experience**: Users can't use the app during network issues
- **Data Loss**: Messages may be lost during connection failures
- **No Offline Support**: App becomes unusable without internet
- **Poor Resilience**: Single points of failure

## Evidence
- No offline message queue
- Limited fallback mechanisms in realtime setup
- No graceful degradation mentioned in analysis

## Solution
### 1. Implement Offline Message Queue
```typescript
// Offline message queue
interface QueuedMessage {
  id: string;
  content: string;
  sessionId: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const addToQueue = useCallback((message: QueuedMessage) => {
    setQueue(prev => [...prev, message]);
  }, []);
  
  const processQueue = useCallback(async () => {
    if (!navigator.onLine || queue.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      for (const message of queue) {
        try {
          await sendMessage(message);
          setQueue(prev => prev.filter(m => m.id !== message.id));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          
          // Increment retry count
          setQueue(prev => prev.map(m => 
            m.id === message.id 
              ? { ...m, retryCount: m.retryCount + 1 }
              : m
          ));
          
          // Remove if max retries reached
          if (message.retryCount >= message.maxRetries) {
            setQueue(prev => prev.filter(m => m.id !== message.id));
          }
          
          break; // Stop processing on first error
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [queue, isProcessing]);
  
  // Process queue when online
  useEffect(() => {
    if (navigator.onLine) {
      processQueue();
    }
  }, [processQueue]);
  
  return { queue, addToQueue, processQueue };
};
```

### 2. Implement Connection Fallback
```typescript
// Connection fallback mechanism
const useConnectionFallback = () => {
  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'degraded'>('online');
  const [fallbackMode, setFallbackMode] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setConnectionState('online');
      setFallbackMode(false);
    };
    
    const handleOffline = () => {
      setConnectionState('offline');
      setFallbackMode(true);
    };
    
    const handleConnectionChange = () => {
      if (navigator.onLine) {
        // Check if connection is stable
        checkConnectionStability().then(isStable => {
          if (isStable) {
            setConnectionState('online');
            setFallbackMode(false);
          } else {
            setConnectionState('degraded');
            setFallbackMode(true);
          }
        });
      } else {
        setConnectionState('offline');
        setFallbackMode(true);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('visibilitychange', handleConnectionChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('visibilitychange', handleConnectionChange);
    };
  }, []);
  
  const checkConnectionStability = async (): Promise<boolean> => {
    try {
      const start = Date.now();
      await fetch('/api/health', { method: 'HEAD' });
      const duration = Date.now() - start;
      return duration < 1000; // Consider stable if response time < 1s
    } catch {
      return false;
    }
  };
  
  return { connectionState, fallbackMode };
};
```

### 3. Add Graceful Degradation
```typescript
// Graceful degradation for different connection states
const useGracefulDegradation = () => {
  const { connectionState, fallbackMode } = useConnectionFallback();
  const [degradationLevel, setDegradationLevel] = useState<'full' | 'limited' | 'offline'>('full');
  
  useEffect(() => {
    switch (connectionState) {
      case 'online':
        setDegradationLevel('full');
        break;
      case 'degraded':
        setDegradationLevel('limited');
        break;
      case 'offline':
        setDegradationLevel('offline');
        break;
    }
  }, [connectionState]);
  
  const getAvailableFeatures = () => {
    switch (degradationLevel) {
      case 'full':
        return {
          realtime: true,
          typing: true,
          presence: true,
          fileUpload: true,
          emoji: true
        };
      case 'limited':
        return {
          realtime: false,
          typing: false,
          presence: false,
          fileUpload: false,
          emoji: true
        };
      case 'offline':
        return {
          realtime: false,
          typing: false,
          presence: false,
          fileUpload: false,
          emoji: false
        };
    }
  };
  
  return { degradationLevel, availableFeatures: getAvailableFeatures() };
};
```

### 4. Implement Message Persistence
```typescript
// Message persistence for offline support
class MessagePersistence {
  private static readonly STORAGE_KEY = 'cozy-chat-messages';
  private static readonly MAX_STORED_MESSAGES = 1000;
  
  static saveMessage(message: any) {
    try {
      const stored = this.getStoredMessages();
      stored.push({
        ...message,
        timestamp: Date.now(),
        isOffline: true
      });
      
      // Keep only recent messages
      if (stored.length > this.MAX_STORED_MESSAGES) {
        stored.splice(0, stored.length - this.MAX_STORED_MESSAGES);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }
  
  static getStoredMessages(): any[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored messages:', error);
      return [];
    }
  }
  
  static clearStoredMessages() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
  
  static markMessageAsSent(messageId: string) {
    try {
      const stored = this.getStoredMessages();
      const updated = stored.map(msg => 
        msg.id === messageId ? { ...msg, isOffline: false } : msg
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to mark message as sent:', error);
    }
  }
}
```

### 5. Add Retry Logic
```typescript
// Retry logic for failed operations
class RetryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff
  
  static async retry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`${context} attempt ${attempt + 1} failed:`, error);
        
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAYS[attempt];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${context} failed after ${this.MAX_RETRIES} attempts: ${lastError.message}`);
  }
}
```

### 6. Implement Health Checks
```typescript
// Health check system
class HealthChecker {
  private static readonly CHECK_INTERVAL = 30000; // 30 seconds
  private static readonly TIMEOUT = 5000; // 5 seconds
  
  static async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
  
  static startHealthChecks(callback: (isHealthy: boolean) => void) {
    const checkHealth = async () => {
      const isHealthy = await this.checkHealth();
      callback(isHealthy);
    };
    
    // Initial check
    checkHealth();
    
    // Periodic checks
    const intervalId = setInterval(checkHealth, this.CHECK_INTERVAL);
    
    return () => clearInterval(intervalId);
  }
}
```

## Testing Required
- [ ] Test offline message queue functionality
- [ ] Verify connection fallback mechanisms
- [ ] Test graceful degradation
- [ ] Verify message persistence
- [ ] Test retry logic
- [ ] Test health checks

## Priority
**MEDIUM** - Important for user experience and resilience

## Dependencies
- Can be implemented alongside Issue #07 (Inefficient Realtime Setup)

## Estimated Effort
3-4 days (including testing and implementation)

## Expected Improvements
- Better user experience during network issues
- No data loss during connection failures
- Offline support for basic functionality
- Improved resilience and reliability

## Related Issues
- Issue #07: Inefficient Realtime Setup
- Issue #09: Missing Error Boundaries
