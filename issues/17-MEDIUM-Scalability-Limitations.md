# 🟡 MEDIUM: Scalability Limitations

## Issue Summary
The current architecture has several scalability limitations that will prevent the application from handling larger user bases and increased load effectively.

## Current State
- Database array operations don't scale well
- Frontend single component handling all chat logic
- Real-time connections without pooling or rate limiting
- O(n²) complexity for interest matching
- No horizontal scaling capabilities

## Impact
- **Performance Degradation**: System performance degrades with more users
- **Resource Constraints**: Limited by single server capabilities
- **User Experience**: Poor experience during peak usage
- **Growth Limitations**: Cannot scale beyond small user base

## Evidence
- Array operations mentioned in analysis
- Single component architecture
- No connection pooling
- O(n²) matching complexity

## Solution
### 1. Database Scalability Improvements
```sql
-- Optimize interest matching with pre-computed compatibility
CREATE TABLE interest_compatibility (
    interest1 TEXT,
    interest2 TEXT,
    compatibility_score INTEGER,
    PRIMARY KEY (interest1, interest2)
);

-- Create materialized view for fast matching
CREATE MATERIALIZED VIEW user_match_scores AS
SELECT 
    u1.id as user1_id,
    u2.id as user2_id,
    COALESCE(
        (SELECT SUM(ic.compatibility_score) 
         FROM interest_compatibility ic 
         WHERE ic.interest1 = ANY(u1.interests) 
         AND ic.interest2 = ANY(u2.interests)), 0
    ) as compatibility_score
FROM anonymous_users u1
CROSS JOIN anonymous_users u2
WHERE u1.id != u2.id;

-- Create index for fast lookups
CREATE INDEX idx_user_match_scores_compatibility ON user_match_scores (compatibility_score DESC);
CREATE INDEX idx_user_match_scores_user1 ON user_match_scores (user1_id);
CREATE INDEX idx_user_match_scores_user2 ON user_match_scores (user2_id);

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_user_match_scores()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_match_scores;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every 5 minutes
SELECT cron.schedule('refresh-match-scores', '*/5 * * * *', 'SELECT refresh_user_match_scores();');
```

### 2. Implement Connection Pooling
```typescript
// Connection pool manager
class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private pools: Map<string, ConnectionPool> = new Map();
  private maxConnectionsPerPool = 100;
  private maxTotalConnections = 1000;
  
  private constructor() {
    this.initializePools();
  }
  
  static getInstance(): ConnectionPoolManager {
    if (!this.instance) {
      this.instance = new ConnectionPoolManager();
    }
    return this.instance;
  }
  
  private initializePools() {
    // Database connection pool
    this.pools.set('database', new ConnectionPool({
      max: 20,
      min: 5,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }));
    
    // Redis connection pool
    this.pools.set('redis', new ConnectionPool({
      max: 50,
      min: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }));
    
    // WebSocket connection pool
    this.pools.set('websocket', new ConnectionPool({
      max: 1000,
      min: 100,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    }));
  }
  
  async getConnection(poolName: string): Promise<Connection> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Connection pool '${poolName}' not found`);
    }
    
    return await pool.acquire();
  }
  
  async releaseConnection(poolName: string, connection: Connection): Promise<void> {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Connection pool '${poolName}' not found`);
    }
    
    await pool.release(connection);
  }
  
  getPoolStats(poolName: string): PoolStats {
    const pool = this.pools.get(poolName);
    if (!pool) {
      throw new Error(`Connection pool '${poolName}' not found`);
    }
    
    return {
      size: pool.size,
      available: pool.available,
      used: pool.used,
      waiting: pool.waiting
    };
  }
  
  getAllPoolStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    for (const [name, pool] of this.pools.entries()) {
      stats[name] = {
        size: pool.size,
        available: pool.available,
        used: pool.used,
        waiting: pool.waiting
      };
    }
    return stats;
  }
}
```

### 3. Implement Horizontal Scaling
```typescript
// Horizontal scaling manager
class HorizontalScalingManager {
  private static instance: HorizontalScalingManager;
  private instances: Map<string, InstanceInfo> = new Map();
  private loadBalancer: LoadBalancer;
  
  private constructor() {
    this.loadBalancer = new LoadBalancer();
    this.initializeInstances();
  }
  
  static getInstance(): HorizontalScalingManager {
    if (!this.instance) {
      this.instance = new HorizontalScalingManager();
    }
    return this.instance;
  }
  
  private initializeInstances() {
    // Add initial instances
    this.addInstance('instance-1', { host: 'localhost', port: 3000, weight: 1 });
    this.addInstance('instance-2', { host: 'localhost', port: 3001, weight: 1 });
  }
  
  addInstance(id: string, info: InstanceInfo): void {
    this.instances.set(id, info);
    this.loadBalancer.addInstance(id, info);
  }
  
  removeInstance(id: string): void {
    this.instances.delete(id);
    this.loadBalancer.removeInstance(id);
  }
  
  getInstance(id: string): InstanceInfo | undefined {
    return this.instances.get(id);
  }
  
  getAllInstances(): InstanceInfo[] {
    return Array.from(this.instances.values());
  }
  
  async scaleUp(): Promise<void> {
    const newInstanceId = `instance-${Date.now()}`;
    const newInstance = await this.createNewInstance();
    
    this.addInstance(newInstanceId, newInstance);
    
    // Update load balancer
    this.loadBalancer.updateWeights();
  }
  
  async scaleDown(): Promise<void> {
    const instances = this.getAllInstances();
    if (instances.length <= 1) {
      throw new Error('Cannot scale down below 1 instance');
    }
    
    // Remove least loaded instance
    const leastLoaded = this.loadBalancer.getLeastLoadedInstance();
    if (leastLoaded) {
      await this.destroyInstance(leastLoaded.id);
      this.removeInstance(leastLoaded.id);
    }
  }
  
  private async createNewInstance(): Promise<InstanceInfo> {
    // Create new instance (e.g., using Docker, Kubernetes, etc.)
    const port = await this.getAvailablePort();
    const host = await this.getAvailableHost();
    
    return { host, port, weight: 1 };
  }
  
  private async destroyInstance(id: string): Promise<void> {
    // Destroy instance
    const instance = this.getInstance(id);
    if (instance) {
      // Implementation depends on your infrastructure
      console.log(`Destroying instance ${id} at ${instance.host}:${instance.port}`);
    }
  }
  
  private async getAvailablePort(): Promise<number> {
    // Find available port
    return 3000 + Math.floor(Math.random() * 1000);
  }
  
  private async getAvailableHost(): Promise<string> {
    // Find available host
    return 'localhost';
  }
}

interface InstanceInfo {
  host: string;
  port: number;
  weight: number;
}

interface PoolStats {
  size: number;
  available: number;
  used: number;
  waiting: number;
}
```

### 4. Implement Caching Layer
```typescript
// Caching layer for scalability
class CachingLayer {
  private static instance: CachingLayer;
  private redis: Redis;
  private localCache: Map<string, CacheEntry> = new Map();
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  
  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
  }
  
  static getInstance(): CachingLayer {
    if (!this.instance) {
      this.instance = new CachingLayer();
    }
    return this.instance;
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try local cache first
      const localEntry = this.localCache.get(key);
      if (localEntry && !this.isExpired(localEntry)) {
        this.cacheStats.hits++;
        return localEntry.value as T;
      }
      
      // Try Redis cache
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        const value = JSON.parse(redisValue);
        this.cacheStats.hits++;
        
        // Update local cache
        this.localCache.set(key, {
          value,
          expiresAt: Date.now() + 60000 // 1 minute
        });
        
        return value as T;
      }
      
      this.cacheStats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheStats.misses++;
      return null;
    }
  }
  
  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    try {
      // Set in Redis
      await this.redis.setex(key, ttl, JSON.stringify(value));
      
      // Set in local cache
      this.localCache.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000
      });
      
      this.cacheStats.sets++;
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async delete(key: string): Promise<void> {
    try {
      // Delete from Redis
      await this.redis.del(key);
      
      // Delete from local cache
      this.localCache.delete(key);
      
      this.cacheStats.deletes++;
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      // Clear local cache entries matching pattern
      for (const key of this.localCache.keys()) {
        if (key.includes(pattern)) {
          this.localCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }
  
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }
  
  getStats(): CacheStats {
    return { ...this.cacheStats };
  }
  
  clearStats(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
}

interface CacheEntry {
  value: any;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}
```

### 5. Implement Rate Limiting
```typescript
// Rate limiting for scalability
class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimit> = new Map();
  private redis: Redis;
  
  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
    
    this.initializeLimits();
  }
  
  static getInstance(): RateLimiter {
    if (!this.instance) {
      this.instance = new RateLimiter();
    }
    return this.instance;
  }
  
  private initializeLimits() {
    // API rate limits
    this.limits.set('api:create-session', { requests: 10, window: 60000 }); // 10 requests per minute
    this.limits.set('api:send-message', { requests: 60, window: 60000 }); // 60 requests per minute
    this.limits.set('api:get-session', { requests: 100, window: 60000 }); // 100 requests per minute
    
    // User rate limits
    this.limits.set('user:create', { requests: 5, window: 300000 }); // 5 requests per 5 minutes
    this.limits.set('user:update', { requests: 20, window: 60000 }); // 20 requests per minute
    
    // WebSocket rate limits
    this.limits.set('websocket:connect', { requests: 10, window: 60000 }); // 10 connections per minute
    this.limits.set('websocket:message', { requests: 100, window: 60000 }); // 100 messages per minute
  }
  
  async checkLimit(key: string, identifier: string): Promise<RateLimitResult> {
    const limit = this.limits.get(key);
    if (!limit) {
      return { allowed: true, remaining: 0, resetTime: 0 };
    }
    
    const redisKey = `rate_limit:${key}:${identifier}`;
    const current = await this.redis.incr(redisKey);
    
    if (current === 1) {
      await this.redis.expire(redisKey, Math.ceil(limit.window / 1000));
    }
    
    const remaining = Math.max(0, limit.requests - current);
    const resetTime = Date.now() + limit.window;
    
    return {
      allowed: current <= limit.requests,
      remaining,
      resetTime
    };
  }
  
  async resetLimit(key: string, identifier: string): Promise<void> {
    const redisKey = `rate_limit:${key}:${identifier}`;
    await this.redis.del(redisKey);
  }
  
  addLimit(key: string, limit: RateLimit): void {
    this.limits.set(key, limit);
  }
  
  removeLimit(key: string): void {
    this.limits.delete(key);
  }
  
  getAllLimits(): Record<string, RateLimit> {
    const result: Record<string, RateLimit> = {};
    for (const [key, limit] of this.limits.entries()) {
      result[key] = { ...limit };
    }
    return result;
  }
}

interface RateLimit {
  requests: number;
  window: number; // in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}
```

### 6. Implement Load Balancing
```typescript
// Load balancer for scalability
class LoadBalancer {
  private static instance: LoadBalancer;
  private instances: Map<string, InstanceInfo> = new Map();
  private weights: Map<string, number> = new Map();
  private currentIndex = 0;
  
  private constructor() {}
  
  static getInstance(): LoadBalancer {
    if (!this.instance) {
      this.instance = new LoadBalancer();
    }
    return this.instance;
  }
  
  addInstance(id: string, info: InstanceInfo): void {
    this.instances.set(id, info);
    this.weights.set(id, info.weight);
  }
  
  removeInstance(id: string): void {
    this.instances.delete(id);
    this.weights.delete(id);
  }
  
  getNextInstance(): InstanceInfo | null {
    const instances = Array.from(this.instances.values());
    if (instances.length === 0) {
      return null;
    }
    
    // Round-robin with weights
    let totalWeight = 0;
    for (const weight of this.weights.values()) {
      totalWeight += weight;
    }
    
    if (totalWeight === 0) {
      return instances[this.currentIndex % instances.length];
    }
    
    let random = Math.random() * totalWeight;
    for (const [id, weight] of this.weights.entries()) {
      random -= weight;
      if (random <= 0) {
        return this.instances.get(id) || null;
      }
    }
    
    return instances[0];
  }
  
  getLeastLoadedInstance(): InstanceInfo | null {
    // Implementation depends on your load monitoring
    // For now, return a random instance
    const instances = Array.from(this.instances.values());
    return instances[Math.floor(Math.random() * instances.length)] || null;
  }
  
  updateWeights(): void {
    // Update weights based on instance performance
    for (const [id, instance] of this.instances.entries()) {
      // Calculate weight based on performance metrics
      const weight = this.calculateWeight(instance);
      this.weights.set(id, weight);
    }
  }
  
  private calculateWeight(instance: InstanceInfo): number {
    // Simple weight calculation - can be enhanced with actual metrics
    return instance.weight;
  }
  
  getAllInstances(): InstanceInfo[] {
    return Array.from(this.instances.values());
  }
}
```

## Testing Required
- [ ] Test database scalability improvements
- [ ] Verify connection pooling
- [ ] Test horizontal scaling
- [ ] Verify caching layer
- [ ] Test rate limiting
- [ ] Verify load balancing

## Priority
**MEDIUM** - Important for future scalability

## Dependencies
- Can be implemented alongside other performance improvements

## Estimated Effort
4-5 days (including testing and implementation)

## Expected Improvements
- Better scalability with larger user bases
- Improved performance under load
- Better resource utilization
- Horizontal scaling capabilities

## Related Issues
- Issue #16: Performance Monitoring
- Issue #18: Technical Debt Assessment
