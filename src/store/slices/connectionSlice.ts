import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface ConnectionMetrics {
  latency: number;
  lastPingTime: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ConnectionState {
  status: ConnectionStatus;
  isOnline: boolean;
  metrics: ConnectionMetrics;
  error: string | null;
  lastConnected: number | null;
  heartbeatInterval: number | null;
}

const initialState: ConnectionState = {
  status: 'disconnected',
  isOnline: navigator?.onLine ?? true,
  metrics: {
    latency: 0,
    lastPingTime: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    connectionQuality: 'excellent',
  },
  error: null,
  lastConnected: null,
  heartbeatInterval: null,
};

const calculateConnectionQuality = (latency: number): ConnectionMetrics['connectionQuality'] => {
  if (latency < 100) return 'excellent';
  if (latency < 300) return 'good';
  if (latency < 600) return 'fair';
  return 'poor';
};

export const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
      
      if (action.payload === 'connected') {
        state.lastConnected = Date.now();
        state.metrics.reconnectAttempts = 0;
        state.error = null;
      }
    },
    
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (!action.payload && state.status === 'connected') {
        state.status = 'disconnected';
      }
    },
    
    updateLatency: (state, action: PayloadAction<number>) => {
      state.metrics.latency = action.payload;
      state.metrics.lastPingTime = Date.now();
      state.metrics.connectionQuality = calculateConnectionQuality(action.payload);
    },
    
    incrementReconnectAttempts: (state) => {
      state.metrics.reconnectAttempts += 1;
    },
    
    resetReconnectAttempts: (state) => {
      state.metrics.reconnectAttempts = 0;
    },
    
    setConnectionError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      if (action.payload) {
        state.status = 'error';
      }
    },
    
    setHeartbeatInterval: (state, action: PayloadAction<number | null>) => {
      state.heartbeatInterval = action.payload;
    },
    
    resetConnection: (state) => {
      state.status = 'disconnected';
      state.error = null;
      state.metrics.reconnectAttempts = 0;
      state.lastConnected = null;
      state.heartbeatInterval = null;
    },
  },
});

export const {
  setConnectionStatus,
  setOnlineStatus,
  updateLatency,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setConnectionError,
  setHeartbeatInterval,
  resetConnection,
} = connectionSlice.actions;
