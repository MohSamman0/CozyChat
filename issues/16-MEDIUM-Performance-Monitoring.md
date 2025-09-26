# 🟡 MEDIUM: Performance Monitoring

## Issue Summary
The application lacks comprehensive performance monitoring, making it difficult to identify performance bottlenecks, track user experience metrics, and optimize the application effectively.

## Current State
- No performance monitoring infrastructure
- No user experience metrics tracking
- No performance alerts or notifications
- No performance optimization insights

## Impact
- **Performance Issues**: Difficult to identify and fix performance problems
- **User Experience**: No visibility into user experience metrics
- **Optimization**: Hard to prioritize performance improvements
- **Scalability**: No data to guide scaling decisions

## Evidence
- No performance monitoring mentioned in analysis
- No metrics collection infrastructure
- No performance optimization insights

## Solution
### 1. Set Up Performance Monitoring Infrastructure
```typescript
// Performance monitoring service
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  
  private constructor() {
    this.initializeObservers();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  private initializeObservers() {
    // Web Vitals observer
    if ('PerformanceObserver' in window) {
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('web-vitals', entry.name, entry.value);
        }
      });
      
      vitalsObserver.observe({ entryTypes: ['measure', 'navigation'] });
      this.observers.push(vitalsObserver);
    }
    
    // Long Task observer
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('long-tasks', 'duration', entry.duration);
        }
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    }
  }
  
  recordMetric(category: string, name: string, value: number) {
    const key = `${category}.${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(value);
    
    // Send to analytics service
    this.sendToAnalytics(category, name, value);
  }
  
  private sendToAnalytics(category: string, name: string, value: number) {
    // Send to your preferred analytics service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        event_category: category,
        event_label: name,
        value: Math.round(value),
        custom_map: {
          metric_name: name,
          metric_value: value
        }
      });
    }
  }
  
  getMetrics(category?: string): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    
    for (const [key, values] of this.metrics.entries()) {
      if (!category || key.startsWith(category)) {
        result[key] = [...values];
      }
    }
    
    return result;
  }
  
  getAverageMetric(category: string, name: string): number {
    const key = `${category}.${name}`;
    const values = this.metrics.get(key) || [];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}
```

### 2. Create Web Vitals Monitoring
```typescript
// Web Vitals monitoring
class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private performanceMonitor: PerformanceMonitor;
  
  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.initializeWebVitals();
  }
  
  static getInstance(): WebVitalsMonitor {
    if (!this.instance) {
      this.instance = new WebVitalsMonitor();
    }
    return this.instance;
  }
  
  private initializeWebVitals() {
    // Core Web Vitals
    this.measureLCP();
    this.measureFID();
    this.measureCLS();
    
    // Additional metrics
    this.measureFCP();
    this.measureTTFB();
    this.measureFMP();
  }
  
  private measureLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.performanceMonitor.recordMetric('web-vitals', 'LCP', lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    }
  }
  
  private measureFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.performanceMonitor.recordMetric('web-vitals', 'FID', entry.processingStart - entry.startTime);
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    }
  }
  
  private measureCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        this.performanceMonitor.recordMetric('web-vitals', 'CLS', clsValue);
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  private measureFCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.performanceMonitor.recordMetric('web-vitals', 'FCP', entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
    }
  }
  
  private measureTTFB() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.performanceMonitor.recordMetric('web-vitals', 'TTFB', entry.responseStart - entry.requestStart);
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    }
  }
  
  private measureFMP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-meaningful-paint') {
            this.performanceMonitor.recordMetric('web-vitals', 'FMP', entry.startTime);
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
    }
  }
}
```

### 3. Create Custom Performance Metrics
```typescript
// Custom performance metrics
class CustomMetrics {
  private static instance: CustomMetrics;
  private performanceMonitor: PerformanceMonitor;
  
  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }
  
  static getInstance(): CustomMetrics {
    if (!this.instance) {
      this.instance = new CustomMetrics();
    }
    return this.instance;
  }
  
  // Measure API response times
  measureApiCall(endpoint: string, duration: number) {
    this.performanceMonitor.recordMetric('api-calls', endpoint, duration);
  }
  
  // Measure component render times
  measureComponentRender(componentName: string, duration: number) {
    this.performanceMonitor.recordMetric('component-renders', componentName, duration);
  }
  
  // Measure user interactions
  measureUserInteraction(action: string, duration: number) {
    this.performanceMonitor.recordMetric('user-interactions', action, duration);
  }
  
  // Measure memory usage
  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.performanceMonitor.recordMetric('memory', 'used', memory.usedJSHeapSize);
      this.performanceMonitor.recordMetric('memory', 'total', memory.totalJSHeapSize);
      this.performanceMonitor.recordMetric('memory', 'limit', memory.jsHeapSizeLimit);
    }
  }
  
  // Measure network performance
  measureNetworkPerformance(url: string, duration: number, size: number) {
    this.performanceMonitor.recordMetric('network', 'duration', duration);
    this.performanceMonitor.recordMetric('network', 'size', size);
  }
  
  // Measure real-time connection performance
  measureRealtimePerformance(action: string, duration: number) {
    this.performanceMonitor.recordMetric('realtime', action, duration);
  }
}
```

### 4. Create Performance Hooks
```typescript
// Performance monitoring hooks
const usePerformanceMonitoring = () => {
  const performanceMonitor = PerformanceMonitor.getInstance();
  const customMetrics = CustomMetrics.getInstance();
  
  const measureApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      customMetrics.measureApiCall(endpoint, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      customMetrics.measureApiCall(`${endpoint}-error`, duration);
      throw error;
    }
  }, []);
  
  const measureComponentRender = useCallback((componentName: string) => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      customMetrics.measureComponentRender(componentName, duration);
    };
  }, []);
  
  const measureUserInteraction = useCallback((action: string) => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      customMetrics.measureUserInteraction(action, duration);
    };
  }, []);
  
  return {
    measureApiCall,
    measureComponentRender,
    measureUserInteraction,
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAverageMetric: performanceMonitor.getAverageMetric.bind(performanceMonitor)
  };
};
```

### 5. Create Performance Dashboard
```typescript
// Performance dashboard component
const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Record<string, number[]>>({});
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const performanceMonitor = PerformanceMonitor.getInstance();
    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg"
      >
        📊
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        {Object.entries(metrics).map(([key, values]) => {
          const average = values.reduce((sum, val) => sum + val, 0) / values.length;
          const latest = values[values.length - 1];
          
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="font-medium">{key}</span>
              <div className="text-right">
                <div>Latest: {latest?.toFixed(2)}</div>
                <div>Avg: {average.toFixed(2)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### 6. Create Performance Alerts
```typescript
// Performance alert system
class PerformanceAlerts {
  private static instance: PerformanceAlerts;
  private alerts: Map<string, PerformanceAlert> = new Map();
  
  private constructor() {
    this.initializeAlerts();
  }
  
  static getInstance(): PerformanceAlerts {
    if (!this.instance) {
      this.instance = new PerformanceAlerts();
    }
    return this.instance;
  }
  
  private initializeAlerts() {
    // LCP alert
    this.addAlert('web-vitals.LCP', {
      threshold: 2500, // 2.5 seconds
      severity: 'warning',
      message: 'Largest Contentful Paint is above 2.5 seconds'
    });
    
    // FID alert
    this.addAlert('web-vitals.FID', {
      threshold: 100, // 100ms
      severity: 'warning',
      message: 'First Input Delay is above 100ms'
    });
    
    // CLS alert
    this.addAlert('web-vitals.CLS', {
      threshold: 0.1, // 0.1
      severity: 'warning',
      message: 'Cumulative Layout Shift is above 0.1'
    });
    
    // API call alert
    this.addAlert('api-calls', {
      threshold: 2000, // 2 seconds
      severity: 'error',
      message: 'API call is taking longer than 2 seconds'
    });
    
    // Memory usage alert
    this.addAlert('memory.used', {
      threshold: 50 * 1024 * 1024, // 50MB
      severity: 'warning',
      message: 'Memory usage is above 50MB'
    });
  }
  
  private addAlert(metricKey: string, alert: PerformanceAlert) {
    this.alerts.set(metricKey, alert);
  }
  
  checkAlert(metricKey: string, value: number) {
    const alert = this.alerts.get(metricKey);
    if (alert && value > alert.threshold) {
      this.triggerAlert(alert, metricKey, value);
    }
  }
  
  private triggerAlert(alert: PerformanceAlert, metricKey: string, value: number) {
    console.warn(`Performance Alert: ${alert.message}`, {
      metric: metricKey,
      value,
      threshold: alert.threshold,
      severity: alert.severity
    });
    
    // Send to monitoring service
    this.sendToMonitoringService(alert, metricKey, value);
    
    // Show user notification if critical
    if (alert.severity === 'error') {
      this.showUserNotification(alert.message);
    }
  }
  
  private sendToMonitoringService(alert: PerformanceAlert, metricKey: string, value: number) {
    // Send to your preferred monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_alert', {
        event_category: 'performance',
        event_label: metricKey,
        value: Math.round(value),
        custom_map: {
          alert_message: alert.message,
          alert_severity: alert.severity,
          alert_threshold: alert.threshold
        }
      });
    }
  }
  
  private showUserNotification(message: string) {
    // Show user-friendly notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Performance Alert', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }
}

interface PerformanceAlert {
  threshold: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
}
```

### 7. Create Performance Reports
```typescript
// Performance reporting
class PerformanceReporter {
  private static instance: PerformanceReporter;
  private performanceMonitor: PerformanceMonitor;
  
  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }
  
  static getInstance(): PerformanceReporter {
    if (!this.instance) {
      this.instance = new PerformanceReporter();
    }
    return this.instance;
  }
  
  generateReport(): PerformanceReport {
    const metrics = this.performanceMonitor.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      webVitals: this.getWebVitalsReport(metrics),
      apiPerformance: this.getApiPerformanceReport(metrics),
      componentPerformance: this.getComponentPerformanceReport(metrics),
      memoryUsage: this.getMemoryUsageReport(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  private getWebVitalsReport(metrics: Record<string, number[]>): WebVitalsReport {
    return {
      LCP: this.getMetricStats(metrics['web-vitals.LCP']),
      FID: this.getMetricStats(metrics['web-vitals.FID']),
      CLS: this.getMetricStats(metrics['web-vitals.CLS']),
      FCP: this.getMetricStats(metrics['web-vitals.FCP']),
      TTFB: this.getMetricStats(metrics['web-vitals.TTFB'])
    };
  }
  
  private getApiPerformanceReport(metrics: Record<string, number[]>): ApiPerformanceReport {
    const apiMetrics = Object.entries(metrics)
      .filter(([key]) => key.startsWith('api-calls'))
      .reduce((acc, [key, values]) => {
        acc[key] = this.getMetricStats(values);
        return acc;
      }, {} as Record<string, MetricStats>);
    
    return { endpoints: apiMetrics };
  }
  
  private getComponentPerformanceReport(metrics: Record<string, number[]>): ComponentPerformanceReport {
    const componentMetrics = Object.entries(metrics)
      .filter(([key]) => key.startsWith('component-renders'))
      .reduce((acc, [key, values]) => {
        acc[key] = this.getMetricStats(values);
        return acc;
      }, {} as Record<string, MetricStats>);
    
    return { components: componentMetrics };
  }
  
  private getMemoryUsageReport(metrics: Record<string, number[]>): MemoryUsageReport {
    return {
      used: this.getMetricStats(metrics['memory.used']),
      total: this.getMetricStats(metrics['memory.total']),
      limit: this.getMetricStats(metrics['memory.limit'])
    };
  }
  
  private getMetricStats(values: number[]): MetricStats {
    if (!values || values.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const average = values.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return { count, average, min, max, p95 };
  }
  
  private generateRecommendations(metrics: Record<string, number[]>): string[] {
    const recommendations: string[] = [];
    
    // Check LCP
    const lcp = metrics['web-vitals.LCP'];
    if (lcp && lcp.some(val => val > 2500)) {
      recommendations.push('Consider optimizing Largest Contentful Paint - some values exceed 2.5 seconds');
    }
    
    // Check FID
    const fid = metrics['web-vitals.FID'];
    if (fid && fid.some(val => val > 100)) {
      recommendations.push('Consider optimizing First Input Delay - some values exceed 100ms');
    }
    
    // Check CLS
    const cls = metrics['web-vitals.CLS'];
    if (cls && cls.some(val => val > 0.1)) {
      recommendations.push('Consider optimizing Cumulative Layout Shift - some values exceed 0.1');
    }
    
    // Check API performance
    const apiMetrics = Object.entries(metrics)
      .filter(([key]) => key.startsWith('api-calls'))
      .filter(([key]) => !key.includes('error'));
    
    for (const [key, values] of apiMetrics) {
      if (values.some(val => val > 2000)) {
        recommendations.push(`Consider optimizing API endpoint ${key} - some calls exceed 2 seconds`);
      }
    }
    
    return recommendations;
  }
}

interface PerformanceReport {
  timestamp: string;
  webVitals: WebVitalsReport;
  apiPerformance: ApiPerformanceReport;
  componentPerformance: ComponentPerformanceReport;
  memoryUsage: MemoryUsageReport;
  recommendations: string[];
}

interface MetricStats {
  count: number;
  average: number;
  min: number;
  max: number;
  p95: number;
}
```

## Testing Required
- [ ] Test performance monitoring setup
- [ ] Verify Web Vitals collection
- [ ] Test custom metrics
- [ ] Verify performance hooks
- [ ] Test performance dashboard
- [ ] Verify performance alerts
- [ ] Test performance reports

## Priority
**MEDIUM** - Important for performance optimization and user experience

## Dependencies
- Can be implemented independently

## Estimated Effort
3-4 days (including testing and implementation)

## Expected Improvements
- Performance visibility
- User experience insights
- Performance optimization guidance
- Proactive performance monitoring

## Related Issues
- Issue #15: No Automated Testing
- Issue #17: Scalability Limitations
