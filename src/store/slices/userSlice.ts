import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AnonymousUser {
  id: string;
  session_id: string;
  interests: string[];
  is_active: boolean;
  connected_at: string;
  last_seen: string;
}

interface UserState {
  currentUser: AnonymousUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<AnonymousUser | null>) => {
      state.currentUser = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    
    updateUserInterests: (state, action: PayloadAction<string[]>) => {
      if (state.currentUser) {
        state.currentUser.interests = action.payload;
      }
    },
    
    updateUserActivity: (state, action: PayloadAction<{ is_active: boolean; last_seen: string }>) => {
      if (state.currentUser) {
        state.currentUser.is_active = action.payload.is_active;
        state.currentUser.last_seen = action.payload.last_seen;
      }
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearUser: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const {
  setCurrentUser,
  updateUserInterests,
  updateUserActivity,
  setLoading,
  setError,
  clearUser,
} = userSlice.actions;
