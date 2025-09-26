# 🟡 MEDIUM: Message Encryption Overhead

## Issue Summary
Client-side encryption is performed for every message, which can impact performance, especially on mobile devices, and there's no message caching mechanism.

## Current Implementation
```typescript
// Client-side encryption for every message
const encryptedContent = await encryptMessage(content, encryptionKeyRef.current);
```

## Problems Identified
1. **Performance Impact**: Encryption/decryption on every message
2. **No Message Caching**: Messages are encrypted/decrypted repeatedly
3. **Mobile Performance**: Especially problematic on lower-end devices
4. **Battery Drain**: Encryption operations consume battery
5. **No Optimization**: No caching or batching of encryption operations

## Impact
- **Performance Degradation**: Slower message sending/receiving
- **Battery Drain**: Especially on mobile devices
- **Poor User Experience**: Delays in message delivery
- **Resource Usage**: High CPU usage for encryption operations

## Evidence
- Encryption performed on every message in `useRealtimeChat.ts`
- No caching mechanism for encrypted messages
- Performance impact mentioned in analysis

## Solution
### 1. Implement Message Caching
```typescript
// Message cache with encryption
class MessageCache {
  private cache = new Map<string, { encrypted: string; decrypted: string; timestamp: number }>();
  private maxCacheSize = 100;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  setMessage(messageId: string, encrypted: string, decrypted: string) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(messageId, {
      encrypted,
      decrypted,
      timestamp: Date.now()
    });
  }
  
  getMessage(messageId: string): { encrypted: string; decrypted: string } | null {
    const cached = this.cache.get(messageId);
    if (!cached) return null;
    
    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(messageId);
      return null;
    }
    
    return { encrypted: cached.encrypted, decrypted: cached.decrypted };
  }
  
  clearCache() {
    this.cache.clear();
  }
}
```

### 2. Optimize Encryption Operations
```typescript
// Optimized encryption with caching
class OptimizedEncryption {
  private cache = new MessageCache();
  private encryptionKey: string;
  
  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }
  
  async encryptMessage(content: string, messageId: string): Promise<string> {
    // Check cache first
    const cached = this.cache.getMessage(messageId);
    if (cached) {
      return cached.encrypted;
    }
    
    // Encrypt and cache
    const encrypted = await this.performEncryption(content);
    this.cache.setMessage(messageId, encrypted, content);
    
    return encrypted;
  }
  
  async decryptMessage(encryptedContent: string, messageId: string): Promise<string> {
    // Check cache first
    const cached = this.cache.getMessage(messageId);
    if (cached && cached.encrypted === encryptedContent) {
      return cached.decrypted;
    }
    
    // Decrypt and cache
    const decrypted = await this.performDecryption(encryptedContent);
    this.cache.setMessage(messageId, encryptedContent, decrypted);
    
    return decrypted;
  }
  
  private async performEncryption(content: string): Promise<string> {
    // Actual encryption logic
    return encryptMessage(content, this.encryptionKey);
  }
  
  private async performDecryption(encryptedContent: string): Promise<string> {
    // Actual decryption logic
    return decryptMessage(encryptedContent, this.encryptionKey);
  }
}
```

### 3. Batch Encryption Operations
```typescript
// Batch encryption for multiple messages
class BatchEncryption {
  private encryptionQueue: Array<{ content: string; messageId: string; resolve: (value: string) => void }> = [];
  private batchSize = 10;
  private batchTimeout = 100; // 100ms
  
  async encryptMessage(content: string, messageId: string): Promise<string> {
    return new Promise((resolve) => {
      this.encryptionQueue.push({ content, messageId, resolve });
      
      if (this.encryptionQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (this.encryptionQueue.length === 1) {
        // Start timeout for first message
        setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }
  
  private async processBatch() {
    const batch = this.encryptionQueue.splice(0, this.batchSize);
    
    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async ({ content, messageId }) => ({
        messageId,
        encrypted: await this.performEncryption(content)
      }))
    );
    
    // Resolve all promises
    batch.forEach(({ resolve }, index) => {
      resolve(results[index].encrypted);
    });
  }
  
  private async performEncryption(content: string): Promise<string> {
    // Actual encryption logic
    return encryptMessage(content, this.encryptionKey);
  }
}
```

### 4. Implement Lazy Loading
```typescript
// Lazy loading for message encryption
const useLazyEncryption = () => {
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  
  useEffect(() => {
    // Load encryption key asynchronously
    const loadEncryptionKey = async () => {
      try {
        const key = await getEncryptionKey();
        setEncryptionKey(key);
        setIsEncryptionReady(true);
      } catch (error) {
        console.error('Failed to load encryption key:', error);
      }
    };
    
    loadEncryptionKey();
  }, []);
  
  const encryptMessage = useCallback(async (content: string, messageId: string) => {
    if (!isEncryptionReady || !encryptionKey) {
      throw new Error('Encryption not ready');
    }
    
    return await encryptMessage(content, encryptionKey);
  }, [isEncryptionReady, encryptionKey]);
  
  return { encryptMessage, isEncryptionReady };
};
```

### 5. Add Performance Monitoring
```typescript
// Performance monitoring for encryption
class EncryptionPerformanceMonitor {
  private metrics = {
    totalEncryptions: 0,
    totalDecryptions: 0,
    totalTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  
  recordEncryption(duration: number, fromCache: boolean) {
    this.metrics.totalEncryptions++;
    this.metrics.totalTime += duration;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
  
  recordDecryption(duration: number, fromCache: boolean) {
    this.metrics.totalDecryptions++;
    this.metrics.totalTime += duration;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.totalTime / (this.metrics.totalEncryptions + this.metrics.totalDecryptions),
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
    };
  }
}
```

## Testing Required
- [ ] Test message caching works correctly
- [ ] Verify encryption performance improvements
- [ ] Test batch encryption functionality
- [ ] Verify lazy loading works properly
- [ ] Test performance monitoring

## Priority
**MEDIUM** - Affects performance, especially on mobile devices

## Dependencies
- Can be implemented independently

## Estimated Effort
2-3 days (including testing and optimization)

## Expected Improvements
- 50% reduction in encryption time for cached messages
- Better performance on mobile devices
- Reduced battery drain
- Improved user experience

## Related Issues
- Issue #07: Inefficient Realtime Setup
- Issue #09: Missing Error Boundaries
