# 🟡 MEDIUM: Hardcoded Timeouts and Intervals

## Issue Summary
The application has hardcoded timeout values and intervals scattered throughout the codebase, making it difficult to configure and maintain consistent timing behavior.

## Current State
- Hardcoded timeout values (2 minutes vs 5 minutes) across migrations
- Hardcoded polling intervals (2 seconds)
- Hardcoded heartbeat intervals
- No centralized configuration for timing values

## Impact
- **Configuration Difficulty**: Hard to adjust timing without code changes
- **Inconsistency**: Different timeout values across the application
- **Maintenance Issues**: Hard to update timing values consistently
- **Testing Difficulty**: Hard to test different timing scenarios

## Evidence
- Different timeout values mentioned in analysis (2 minutes vs 5 minutes)
- Hardcoded 2-second polling intervals
- No centralized timing configuration

## Solution
### 1. Create Centralized Timing Configuration
```typescript
// Centralized timing configuration
interface TimingConfig {
  // Session timeouts
  sessionTimeout: number; // 5 minutes
  sessionExpiry: number; // 24 hours
  
  // Polling intervals
  sessionPollingInterval: number; // 2 seconds
  heartbeatInterval: number; // 30 seconds
  healthCheckInterval: number; // 30 seconds
  
  // Retry timeouts
  retryDelays: number[]; // [1000, 2000, 4000] ms
  maxRetries: number; // 3
  
  // Connection timeouts
  connectionTimeout: number; // 10 seconds
  reconnectionDelay: number; // 5 seconds
  maxReconnectionAttempts: number; // 5
  
  // UI timeouts
  typingIndicatorTimeout: number; // 3 seconds
  messageDeliveryTimeout: number; // 10 seconds
  errorDisplayTimeout: number; // 5 seconds
}

const defaultTimingConfig: TimingConfig = {
  sessionTimeout: 5 * 60 * 1000, // 5 minutes
  sessionExpiry: 24 * 60 * 60 * 1000, // 24 hours
  sessionPollingInterval: 2000, // 2 seconds
  heartbeatInterval: 30 * 1000, // 30 seconds
  healthCheckInterval: 30 * 1000, // 30 seconds
  retryDelays: [1000, 2000, 4000], // Exponential backoff
  maxRetries: 3,
  connectionTimeout: 10 * 1000, // 10 seconds
  reconnectionDelay: 5 * 1000, // 5 seconds
  maxReconnectionAttempts: 5,
  typingIndicatorTimeout: 3 * 1000, // 3 seconds
  messageDeliveryTimeout: 10 * 1000, // 10 seconds
  errorDisplayTimeout: 5 * 1000 // 5 seconds
};

// Environment-specific configurations
const getTimingConfig = (): TimingConfig => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        ...defaultTimingConfig,
        sessionPollingInterval: 1000, // Faster polling in dev
        heartbeatInterval: 10 * 1000, // More frequent heartbeats
        connectionTimeout: 5 * 1000 // Shorter timeout for faster feedback
      };
    case 'test':
      return {
        ...defaultTimingConfig,
        sessionTimeout: 1000, // Short timeout for tests
        sessionPollingInterval: 100, // Fast polling for tests
        heartbeatInterval: 1000, // Fast heartbeats for tests
        retryDelays: [10, 20, 40], // Fast retries for tests
        connectionTimeout: 1000 // Short timeout for tests
      };
    case 'production':
      return defaultTimingConfig;
    default:
      return defaultTimingConfig;
  }
};
```

### 2. Create Timing Manager
```typescript
// Timing manager for centralized timeout handling
class TimingManager {
  private static instance: TimingManager;
  private config: TimingConfig;
  private timers = new Map<string, NodeJS.Timeout>();
  
  private constructor() {
    this.config = getTimingConfig();
  }
  
  static getInstance(): TimingManager {
    if (!this.instance) {
      this.instance = new TimingManager();
    }
    return this.instance;
  }
  
  // Session management
  getSessionTimeout(): number {
    return this.config.sessionTimeout;
  }
  
  getSessionExpiry(): number {
    return this.config.sessionExpiry;
  }
  
  // Polling intervals
  getSessionPollingInterval(): number {
    return this.config.sessionPollingInterval;
  }
  
  getHeartbeatInterval(): number {
    return this.config.heartbeatInterval;
  }
  
  getHealthCheckInterval(): number {
    return this.config.healthCheckInterval;
  }
  
  // Retry configuration
  getRetryDelays(): number[] {
    return [...this.config.retryDelays];
  }
  
  getMaxRetries(): number {
    return this.config.maxRetries;
  }
  
  // Connection timeouts
  getConnectionTimeout(): number {
    return this.config.connectionTimeout;
  }
  
  getReconnectionDelay(): number {
    return this.config.reconnectionDelay;
  }
  
  getMaxReconnectionAttempts(): number {
    return this.config.maxReconnectionAttempts;
  }
  
  // UI timeouts
  getTypingIndicatorTimeout(): number {
    return this.config.typingIndicatorTimeout;
  }
  
  getMessageDeliveryTimeout(): number {
    return this.config.messageDeliveryTimeout;
  }
  
  getErrorDisplayTimeout(): number {
    return this.config.errorDisplayTimeout;
  }
  
  // Timer management
  setTimer(id: string, callback: () => void, delay: number): void {
    this.clearTimer(id);
    const timer = setTimeout(callback, delay);
    this.timers.set(id, timer);
  }
  
  clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
  
  clearAllTimers(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
  
  // Update configuration
  updateConfig(newConfig: Partial<TimingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
```

### 3. Create Configurable Hooks
```typescript
// Configurable polling hook
const useConfigurablePolling = (
  callback: () => Promise<void>,
  shouldPoll: boolean,
  intervalType: 'session' | 'heartbeat' | 'health' = 'session'
) => {
  const timingManager = TimingManager.getInstance();
  const [isPolling, setIsPolling] = useState(false);
  
  useEffect(() => {
    if (!shouldPoll || isPolling) return;
    
    const getInterval = () => {
      switch (intervalType) {
        case 'session':
          return timingManager.getSessionPollingInterval();
        case 'heartbeat':
          return timingManager.getHeartbeatInterval();
        case 'health':
          return timingManager.getHealthCheckInterval();
        default:
          return timingManager.getSessionPollingInterval();
      }
    };
    
    const poll = async () => {
      setIsPolling(true);
      try {
        await callback();
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        setIsPolling(false);
      }
    };
    
    const interval = setInterval(poll, getInterval());
    return () => clearInterval(interval);
  }, [shouldPoll, isPolling, intervalType, callback]);
};

// Configurable retry hook
const useConfigurableRetry = () => {
  const timingManager = TimingManager.getInstance();
  
  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> => {
    const maxRetries = timingManager.getMaxRetries();
    const retryDelays = timingManager.getRetryDelays();
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`${context} attempt ${attempt + 1} failed:`, error);
        
        if (attempt < maxRetries - 1) {
          const delay = retryDelays[attempt] || retryDelays[retryDelays.length - 1];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${context} failed after ${maxRetries} attempts: ${lastError.message}`);
  }, []);
  
  return { retry };
};
```

### 4. Add Environment-Based Configuration
```typescript
// Environment-based configuration
const getEnvironmentConfig = (): Partial<TimingConfig> => {
  const env = process.env.NODE_ENV;
  const isDevelopment = env === 'development';
  const isTest = env === 'test';
  const isProduction = env === 'production';
  
  if (isTest) {
    return {
      sessionTimeout: 1000,
      sessionPollingInterval: 100,
      heartbeatInterval: 1000,
      retryDelays: [10, 20, 40],
      connectionTimeout: 1000,
      reconnectionDelay: 100,
      maxReconnectionAttempts: 2
    };
  }
  
  if (isDevelopment) {
    return {
      sessionPollingInterval: 1000,
      heartbeatInterval: 10 * 1000,
      connectionTimeout: 5 * 1000,
      reconnectionDelay: 2 * 1000
    };
  }
  
  if (isProduction) {
    return {
      sessionTimeout: 5 * 60 * 1000,
      sessionPollingInterval: 2000,
      heartbeatInterval: 30 * 1000,
      connectionTimeout: 10 * 1000,
      reconnectionDelay: 5 * 1000
    };
  }
  
  return {};
};

// Configuration provider
const TimingConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<TimingConfig>(() => {
    const baseConfig = defaultTimingConfig;
    const envConfig = getEnvironmentConfig();
    return { ...baseConfig, ...envConfig };
  });
  
  const updateConfig = useCallback((newConfig: Partial<TimingConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);
  
  return (
    <TimingConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </TimingConfigContext.Provider>
  );
};
```

### 5. Add Runtime Configuration Updates
```typescript
// Runtime configuration updates
class RuntimeConfigManager {
  private static instance: RuntimeConfigManager;
  private config: TimingConfig;
  private listeners = new Set<(config: TimingConfig) => void>();
  
  private constructor() {
    this.config = getTimingConfig();
  }
  
  static getInstance(): RuntimeConfigManager {
    if (!this.instance) {
      this.instance = new RuntimeConfigManager();
    }
    return this.instance;
  }
  
  getConfig(): TimingConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<TimingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }
  
  subscribe(listener: (config: TimingConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }
  
  // Preset configurations
  setFastMode(): void {
    this.updateConfig({
      sessionPollingInterval: 500,
      heartbeatInterval: 5 * 1000,
      connectionTimeout: 2 * 1000,
      retryDelays: [100, 200, 400]
    });
  }
  
  setSlowMode(): void {
    this.updateConfig({
      sessionPollingInterval: 5000,
      heartbeatInterval: 60 * 1000,
      connectionTimeout: 30 * 1000,
      retryDelays: [2000, 4000, 8000]
    });
  }
  
  setNormalMode(): void {
    this.updateConfig(getTimingConfig());
  }
}
```

### 6. Add Configuration Validation
```typescript
// Configuration validation
class ConfigValidator {
  static validateTimingConfig(config: Partial<TimingConfig>): TimingConfig {
    const validated = { ...defaultTimingConfig, ...config };
    
    // Validate positive numbers
    const positiveFields: (keyof TimingConfig)[] = [
      'sessionTimeout', 'sessionExpiry', 'sessionPollingInterval',
      'heartbeatInterval', 'healthCheckInterval', 'connectionTimeout',
      'reconnectionDelay', 'typingIndicatorTimeout', 'messageDeliveryTimeout',
      'errorDisplayTimeout'
    ];
    
    positiveFields.forEach(field => {
      if (validated[field] <= 0) {
        throw new Error(`Invalid ${field}: must be positive number`);
      }
    });
    
    // Validate retry configuration
    if (validated.maxRetries < 0) {
      throw new Error('maxRetries must be non-negative');
    }
    
    if (validated.retryDelays.some(delay => delay <= 0)) {
      throw new Error('All retry delays must be positive');
    }
    
    if (validated.maxReconnectionAttempts < 0) {
      throw new Error('maxReconnectionAttempts must be non-negative');
    }
    
    return validated;
  }
}
```

## Testing Required
- [ ] Test timing configuration works correctly
- [ ] Verify environment-specific configurations
- [ ] Test runtime configuration updates
- [ ] Verify configuration validation
- [ ] Test configurable hooks

## Priority
**MEDIUM** - Important for maintainability and configuration

## Dependencies
- Can be implemented independently

## Estimated Effort
2-3 days (including testing and implementation)

## Expected Improvements
- Centralized timing configuration
- Environment-specific settings
- Runtime configuration updates
- Better maintainability

## Related Issues
- Issue #07: Inefficient Realtime Setup
- Issue #11: Missing Type Safety
