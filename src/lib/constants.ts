// Chat constants
export const CHAT_CONSTANTS = {
  // Timing
  TYPING_TIMEOUT: 3000, // 3 seconds
  MESSAGE_BATCH_SIZE: 50,
  CONNECTION_TIMEOUT: 5000, // 5 seconds
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  
  // User activity
  USER_INACTIVE_THRESHOLD: 300000, // 5 minutes
  SESSION_CLEANUP_INTERVAL: 600000, // 10 minutes
  
  // Message limits
  MAX_MESSAGE_LENGTH: 1000,
  MAX_MESSAGES_PER_MINUTE: 20,
  
  // Interests
  MAX_INTERESTS: 5,
  MIN_INTEREST_LENGTH: 2,
  MAX_INTEREST_LENGTH: 30,
} as const;

// Available emoji reactions
export const REACTIONS = ['❤️', '😊', '👍', '😢', '😮', '😡'] as const;

// Report reasons
export const REPORT_REASONS = [
  'Inappropriate behavior',
  'Spam or abuse',
  'Harassment',
  'Inappropriate content',
  'Impersonation',
  'Other',
] as const;

// Interest categories (for suggestions)
export const INTEREST_CATEGORIES = {
  'Technology': ['programming', 'gaming', 'AI', 'web development', 'mobile apps', 'cybersecurity'],
  'Arts & Culture': ['painting', 'music', 'photography', 'writing', 'dance', 'theater', 'literature'],
  'Sports & Fitness': ['football', 'basketball', 'tennis', 'running', 'yoga', 'gym', 'swimming'],
  'Entertainment': ['movies', 'TV shows', 'anime', 'comics', 'podcasts', 'YouTube'],
  'Science & Education': ['physics', 'biology', 'chemistry', 'mathematics', 'history', 'psychology'],
  'Lifestyle': ['cooking', 'travel', 'fashion', 'beauty', 'home decor', 'gardening'],
  'Business & Career': ['entrepreneurship', 'marketing', 'finance', 'leadership', 'networking'],
  'Hobbies': ['reading', 'board games', 'crafting', 'collecting', 'puzzles', 'DIY'],
} as const;

// Connection quality thresholds (in milliseconds)
export const CONNECTION_QUALITY = {
  EXCELLENT: 100,
  GOOD: 300,
  POOR: 1000,
} as const;

// UI constants
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 4000,
  MODAL_TRANSITION: 200,
  SCROLL_THRESHOLD: 100,
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  USER_SESSION: 'cozy_chat_session',
  USER_PREFERENCES: 'cozy_chat_preferences',
  DRAFT_MESSAGE: 'cozy_chat_draft',
} as const;

// Environment-based constants
export const ENV_CONFIG = {
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;
