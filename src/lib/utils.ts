import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a random anonymous user ID
 */
export function generateAnonymousId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Formats timestamp for chat messages
 */
export function formatChatTime(timestamp: Date): string {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(timestamp);
}

/**
 * Note: Encryption functions have been moved to /lib/encryption.ts
 * Using Web Crypto API for proper end-to-end encryption
 */

/**
 * Sanitizes user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Checks if a string contains only whitespace
 */
export function isWhitespaceOnly(str: string): boolean {
  return !str.trim().length;
}
