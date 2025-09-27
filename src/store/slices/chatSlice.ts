import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '@/types/message';

export interface ChatSession {
  id: string;
  user1_id: string;
  user2_id?: string;
  status: 'waiting' | 'active' | 'ended';
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface TypingIndicator {
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}

interface ChatState {
  currentSession: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  typingIndicators: TypingIndicator[];
  messageHistory: Record<string, Message[]>; // sessionId -> messages
}

const initialState: ChatState = {
  currentSession: null,
  messages: [],
  isLoading: false,
  error: null,
  typingIndicators: [],
  messageHistory: {},
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<ChatSession | null>) => {
      state.currentSession = action.payload;
      state.messages = action.payload ? state.messageHistory[action.payload.id] || [] : [];
    },
    
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // Check for duplicates before adding
      const existingMessage = state.messages.find(m => m.id === message.id);
      if (!existingMessage) {
        state.messages.push(message);
        
        // Store in history
        if (message.session_id) {
          if (!state.messageHistory[message.session_id]) {
            state.messageHistory[message.session_id] = [];
          }
          // Also check for duplicates in history
          const existingInHistory = state.messageHistory[message.session_id].find(m => m.id === message.id);
          if (!existingInHistory) {
            state.messageHistory[message.session_id].push(message);
          }
        }
      }
    },
    
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
      
      // Update history for current session
      if (state.currentSession && action.payload.length > 0) {
        state.messageHistory[state.currentSession.id] = action.payload;
      }
    },
    
    updateSessionStatus: (state, action: PayloadAction<{ sessionId: string; status: ChatSession['status'] }>) => {
      if (state.currentSession && state.currentSession.id === action.payload.sessionId) {
        state.currentSession.status = action.payload.status;
      }
    },
    
    setTypingIndicator: (state, action: PayloadAction<TypingIndicator>) => {
      const { user_id, is_typing } = action.payload;
      const existingIndex = state.typingIndicators.findIndex(t => t.user_id === user_id);
      
      if (existingIndex >= 0) {
        if (is_typing) {
          state.typingIndicators[existingIndex] = action.payload;
        } else {
          state.typingIndicators.splice(existingIndex, 1);
        }
      } else if (is_typing) {
        state.typingIndicators.push(action.payload);
      }
    },
    
    clearTypingIndicators: (state) => {
      state.typingIndicators = [];
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearChat: (state) => {
      state.currentSession = null;
      state.messages = [];
      state.typingIndicators = [];
      state.error = null;
    },
    
    clearHistory: (state, action: PayloadAction<string>) => {
      delete state.messageHistory[action.payload];
    },
  },
});

export const {
  setCurrentSession,
  addMessage,
  setMessages,
  updateSessionStatus,
  setTypingIndicator,
  clearTypingIndicators,
  setLoading,
  setError,
  clearChat,
  clearHistory,
} = chatSlice.actions;
