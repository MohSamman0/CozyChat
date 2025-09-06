/**
 * Client-side message encryption/decryption utilities
 * Uses Web Crypto API for secure message handling
 */

// Generate a random encryption key for the session
export const generateEncryptionKey = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // not extractable for security
    ['encrypt', 'decrypt']
  );
};

// Generate a random initialization vector
const generateIV = (): ArrayBuffer => {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv.buffer;
};

// Encrypt a message
export const encryptMessage = async (
  message: string,
  key: CryptoKey
): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = generateIV();

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Combine IV and encrypted data, then base64 encode
    const ivArray = new Uint8Array(iv);
    const combined = new Uint8Array(ivArray.length + encrypted.byteLength);
    combined.set(ivArray);
    combined.set(new Uint8Array(encrypted), ivArray.length);
    
    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

// Decrypt a message
export const decryptMessage = async (
  encryptedMessage: string,
  key: CryptoKey
): Promise<string> => {
  try {
    // Base64 decode
    const binaryString = atob(encryptedMessage);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

// Simple hash function for session-based key derivation
export const deriveSessionKey = async (sessionId: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionId + process.env.NEXT_PUBLIC_ENCRYPTION_SALT || 'cozy-chat-salt'),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cozy-chat-session'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
};

// Utility to check if encryption is supported
export const isEncryptionSupported = (): boolean => {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.generateKey === 'function'
  );
};

// Rate limiting utility
export class MessageRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxMessages: number;
  private readonly timeWindowMs: number;

  constructor(maxMessages = 10, timeWindowMs = 60000) {
    this.maxMessages = maxMessages;
    this.timeWindowMs = timeWindowMs;
  }

  canSendMessage(userId: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    
    // Remove old attempts outside the time window
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.timeWindowMs
    );
    
    // Update the attempts for this user
    this.attempts.set(userId, recentAttempts);
    
    return recentAttempts.length < this.maxMessages;
  }

  recordMessageSent(userId: string): void {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    userAttempts.push(now);
    this.attempts.set(userId, userAttempts);
  }

  getRemainingMessages(userId: string): number {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || [];
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.timeWindowMs
    );
    
    return Math.max(0, this.maxMessages - recentAttempts.length);
  }

  getTimeUntilReset(userId: string): number {
    const userAttempts = this.attempts.get(userId) || [];
    if (userAttempts.length === 0) return 0;
    
    const oldestAttempt = Math.min(...userAttempts);
    const timeUntilReset = this.timeWindowMs - (Date.now() - oldestAttempt);
    
    return Math.max(0, timeUntilReset);
  }
}
