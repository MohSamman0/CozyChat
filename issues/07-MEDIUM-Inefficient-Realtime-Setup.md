# 🟡 MEDIUM: Inefficient Realtime Setup

## Issue Summary
The realtime connection setup uses multiple polling mechanisms as fallbacks, leading to high CPU usage and inefficient resource utilization.

## Current Implementation
```typescript
// Multiple polling mechanisms
const sessionPollingRef = useRef<NodeJS.Timeout | null>(null);
const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

// Polling every 2 seconds as fallback
sessionPollingRef.current = setInterval(async () => {
  // Session status polling
}, 2000);
```

## Problems Identified
1. **Polling Overhead**: 2-second polling as fallback to realtime
2. **Multiple Timers**: Heartbeat + polling + typing indicators
3. **Connection Recovery**: Complex reconnection logic with exponential backoff
4. **Resource Usage**: High CPU usage from constant polling
5. **Inefficient Fallbacks**: Polling when realtime should work

## Impact
- **High CPU Usage**: Constant polling consumes resources
- **Poor Performance**: Unnecessary network requests
- **Battery Drain**: Especially problematic on mobile devices
- **Scalability Issues**: Doesn't scale well with many users

## Evidence
- Multiple timer references in `useRealtimeChat.ts`
- 2-second polling intervals
- Complex reconnection logic

## Solution
### 1. Implement Connection Pooling
```typescript
// Connection manager with pooling
class ConnectionManager {
  private connections = new Map<string, RealtimeChannel>();
  private reconnectQueue: string[] = [];
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;
  
  async connect(sessionId: string): Promise<RealtimeChannel> {
    if (this.connections.has(sessionId)) {
      return this.connections.get(sessionId)!;
    }
    
    const channel = supabase.channel(`chat-${sessionId}`, {
      config: {
        presence: { key: sessionId },
        broadcast: { self: false }
      }
    });
    
    await channel.subscribe();
    this.connections.set(sessionId, channel);
    return channel;
  }
  
  disconnect(sessionId: string) {
    const channel = this.connections.get(sessionId);
    if (channel) {
      channel.unsubscribe();
      this.connections.delete(sessionId);
    }
  }
  
  async reconnect(sessionId: string): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      return false;
    }
    
    this.reconnectAttempts.set(sessionId, attempts + 1);
    
    try {
      await this.connect(sessionId);
      this.reconnectAttempts.delete(sessionId);
      return true;
    } catch (error) {
      console.error(`Reconnection attempt ${attempts + 1} failed:`, error);
      return false;
    }
  }
}
```

### 2. Smart Polling with Exponential Backoff
```typescript
// Smart polling with exponential backoff
const useSmartPolling = (shouldPoll: boolean) => {
  const [interval, setInterval] = useState(2000);
  const [isPolling, setIsPolling] = useState(false);
  
  useEffect(() => {
    if (!shouldPoll || isPolling) return;
    
    const poll = async () => {
      setIsPolling(true);
      try {
        await checkSessionStatus();
        setInterval(2000); // Reset to normal interval on success
      } catch (error) {
        setInterval(prev => Math.min(prev * 1.5, 30000)); // Increase interval on error
      } finally {
        setIsPolling(false);
      }
    };
    
    const timer = setInterval(poll, interval);
    return () => clearInterval(timer);
  }, [shouldPoll, interval, isPolling]);
};
```

### 3. Optimize Realtime Subscriptions
```typescript
// Optimized realtime hook
const useOptimizedRealtime = (sessionId: string) => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const connectionManager = useRef(new ConnectionManager());
  
  useEffect(() => {
    if (!sessionId) return;
    
    const setupConnection = async () => {
      setConnectionState('connecting');
      
      try {
        const channel = await connectionManager.current.connect(sessionId);
        
        channel.on('broadcast', { event: 'message' }, (payload) => {
          // Handle message
        });
        
        channel.on('presence', { event: 'sync' }, () => {
          // Handle presence sync
        });
        
        setConnectionState('connected');
      } catch (error) {
        console.error('Failed to connect:', error);
        setConnectionState('disconnected');
      }
    };
    
    setupConnection();
    
    return () => {
      connectionManager.current.disconnect(sessionId);
    };
  }, [sessionId]);
  
  return { connectionState };
};
```

### 4. Implement Connection Health Monitoring
```typescript
// Connection health monitor
class ConnectionHealthMonitor {
  private healthChecks = new Map<string, NodeJS.Timeout>();
  private healthInterval = 30000; // 30 seconds
  
  startHealthCheck(sessionId: string) {
    if (this.healthChecks.has(sessionId)) return;
    
    const healthCheck = setInterval(async () => {
      try {
        const response = await fetch(`/api/chat/session-status?sessionId=${sessionId}`);
        if (!response.ok) {
          throw new Error('Health check failed');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        // Trigger reconnection
        this.triggerReconnection(sessionId);
      }
    }, this.healthInterval);
    
    this.healthChecks.set(sessionId, healthCheck);
  }
  
  stopHealthCheck(sessionId: string) {
    const healthCheck = this.healthChecks.get(sessionId);
    if (healthCheck) {
      clearInterval(healthCheck);
      this.healthChecks.delete(sessionId);
    }
  }
  
  private triggerReconnection(sessionId: string) {
    // Implement reconnection logic
  }
}
```

### 5. Reduce Polling Frequency
```typescript
// Adaptive polling based on connection state
const useAdaptivePolling = (connectionState: string) => {
  const [pollingInterval, setPollingInterval] = useState(2000);
  
  useEffect(() => {
    switch (connectionState) {
      case 'connected':
        setPollingInterval(0); // No polling when connected
        break;
      case 'connecting':
        setPollingInterval(5000); // Slower polling when connecting
        break;
      case 'disconnected':
        setPollingInterval(10000); // Even slower when disconnected
        break;
    }
  }, [connectionState]);
  
  return pollingInterval;
};
```

## Testing Required
- [ ] Test connection pooling works correctly
- [ ] Verify exponential backoff mechanism
- [ ] Test reconnection logic
- [ ] Verify health monitoring works
- [ ] Test performance improvements

## Priority
**MEDIUM** - Affects performance and resource usage

## Dependencies
- Can be implemented independently

## Estimated Effort
2-3 days (including testing and optimization)

## Expected Improvements
- 60% reduction in unnecessary requests
- 50% reduction in CPU usage
- Better battery life on mobile devices
- More reliable connections

## Related Issues
- Issue #05: Complex Session State Management
- Issue #08: Message Encryption Overhead
