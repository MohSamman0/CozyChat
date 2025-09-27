/**
 * Secure logging utility that prevents sensitive data exposure
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /(password|passwd|pwd)\s*[:=]\s*[^\s,}]+/gi,
  /(token|key|secret)\s*[:=]\s*[^\s,}]+/gi,
  /(session_id|user_id|id)\s*[:=]\s*[a-f0-9-]{20,}/gi,
  /(email|e-mail)\s*[:=]\s*[^\s,}]+/gi,
  /(phone|mobile|tel)\s*[:=]\s*[^\s,}]+/gi,
  /(credit_card|card_number|cc)\s*[:=]\s*[^\s,}]+/gi,
  /(ssn|social_security)\s*[:=]\s*[^\s,}]+/gi,
  /(api_key|apikey)\s*[:=]\s*[^\s,}]+/gi,
  /(auth_token|access_token|refresh_token)\s*[:=]\s*[^\s,}]+/gi,
  /(jwt|bearer)\s*[:=]\s*[^\s,}]+/gi,
  /(encrypted_content|encrypted)\s*[:=]\s*[^\s,}]+/gi,
  /(content)\s*[:=]\s*[^\s,}]{50,}/gi, // Long content might be sensitive
];

// Redact sensitive information from strings
function redactSensitiveData(input: string): string {
  let redacted = input;
  
  SENSITIVE_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, (match) => {
      const [key, ...valueParts] = match.split(/[:=]/);
      return `${key.trim()}=[REDACTED]`;
    });
  });
  
  return redacted;
}

// Redact sensitive information from objects
function redactSensitiveObject(obj: any): any {
  if (typeof obj === 'string') {
    return redactSensitiveData(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveObject);
  }
  
  if (obj && typeof obj === 'object') {
    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Skip sensitive keys entirely
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('key') || 
          lowerKey.includes('secret') ||
          lowerKey.includes('session_id') ||
          lowerKey.includes('user_id') ||
          lowerKey.includes('encrypted') ||
          lowerKey.includes('content')) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveObject(value);
      }
    }
    return redacted;
  }
  
  return obj;
}

// Check if we should log based on environment
function shouldLog(level: LogLevel): boolean {
  if (typeof window !== 'undefined') {
    // Client-side: only log errors and warnings in production
    return process.env.NODE_ENV === 'development' || level === 'error' || level === 'warn';
  } else {
    // Server-side: log all levels in development, only errors and warnings in production
    return process.env.NODE_ENV === 'development' || level === 'error' || level === 'warn';
  }
}

// Create log entry
function createLogEntry(level: LogLevel, message: string, context?: any): LogEntry {
  return {
    level,
    message: redactSensitiveData(message),
    timestamp: new Date().toISOString(),
    context: context ? redactSensitiveObject(context) : undefined,
  };
}

// Secure logger class
class SecureLogger {
  private log(level: LogLevel, message: string, context?: any): void {
    if (!shouldLog(level)) {
      return;
    }

    const logEntry = createLogEntry(level, message, context);
    
    // Use appropriate console method
    switch (level) {
      case 'debug':
        console.debug(`[${logEntry.timestamp}] ${logEntry.message}`, logEntry.context);
        break;
      case 'info':
        console.info(`[${logEntry.timestamp}] ${logEntry.message}`, logEntry.context);
        break;
      case 'warn':
        console.warn(`[${logEntry.timestamp}] ${logEntry.message}`, logEntry.context);
        break;
      case 'error':
        console.error(`[${logEntry.timestamp}] ${logEntry.message}`, logEntry.context);
        break;
    }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  // Special method for API errors that should never expose sensitive data
  apiError(endpoint: string, status: number, message: string): void {
    this.error(`API Error: ${endpoint} returned ${status}`, { 
      endpoint, 
      status, 
      message: redactSensitiveData(message) 
    });
  }

  // Special method for database errors
  dbError(operation: string, error: any): void {
    this.error(`Database Error: ${operation} failed`, { 
      operation, 
      error: redactSensitiveData(error?.message || 'Unknown error') 
    });
  }

  // Special method for authentication errors
  authError(operation: string, reason: string): void {
    this.error(`Authentication Error: ${operation}`, { 
      operation, 
      reason: redactSensitiveData(reason) 
    });
  }
}

// Export singleton instance
export const logger = new SecureLogger();

// Export utility functions for advanced usage
export { redactSensitiveData, redactSensitiveObject };
