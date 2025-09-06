export interface AnonymousUser {
  id: string;
  sessionId: string;
  interests: string[];
  isActive: boolean;
  connectedAt: string;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  user1Id: string;
  user2Id: string | null;
  status: 'waiting' | 'active' | 'ended';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  encryptedContent: string;
  messageType: 'text' | 'system';
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: '❤️' | '😊' | '👍' | '😢' | '😮' | '😡';
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  sessionId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BannedUser {
  id: string;
  userId: string;
  bannedBy: string;
  reason: string;
  expiresAt?: string;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  role: 'admin' | 'moderator';
  assignedBy: string;
  createdAt: string;
}

export interface SystemStats {
  id: string;
  activeUsers: number;
  totalSessions: number;
  totalMessages: number;
  recordedAt: string;
}

// Client-side types
export interface ChatState {
  currentUser: AnonymousUser | null;
  currentSession: ChatSession | null;
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  partnerTyping: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export interface MatchingPreferences {
  interests: string[];
}

export type ChatEvent = 
  | { type: 'user_joined'; user: AnonymousUser }
  | { type: 'user_left'; userId: string }
  | { type: 'message_received'; message: Message }
  | { type: 'typing_start'; userId: string }
  | { type: 'typing_stop'; userId: string }
  | { type: 'session_ended'; sessionId: string }
  | { type: 'user_reported'; reportId: string }
  | { type: 'reaction_added'; reaction: MessageReaction }
  | { type: 'reaction_removed'; reactionId: string };

export interface ChatContextType {
  state: ChatState;
  startMatching: (preferences: MatchingPreferences) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  endSession: () => Promise<void>;
  reportUser: (reason: string, description?: string) => Promise<void>;
  addReaction: (messageId: string, reaction: MessageReaction['reaction']) => Promise<void>;
  removeReaction: (reactionId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
}
