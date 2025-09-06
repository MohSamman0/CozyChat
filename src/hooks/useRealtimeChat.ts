import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { 
  addMessage, 
  setCurrentSession, 
  updateSessionStatus,
  setTypingIndicator,
  clearTypingIndicators,
  setLoading,
  setError,
  clearChat,
  Message,
  ChatSession
} from '@/store/slices/chatSlice';
import {
  setConnectionStatus,
  updateLatency,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setConnectionError
} from '@/store/slices/connectionSlice';
import { supabase } from '@/lib/supabase';
import { encryptMessage, decryptMessage, deriveSessionKey } from '@/lib/encryption';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeChatOptions {
  sessionId?: string;
  userId?: string;
  onMessage?: (message: Message) => void;
  onSessionUpdate?: (session: ChatSession) => void;
  onError?: (error: Error) => void;
}

export const useRealtimeChat = (options: UseRealtimeChatOptions = {}) => {
  const dispatch = useAppDispatch();
  const { currentSession } = useAppSelector(state => state.chat);
  const { status: connectionStatus } = useAppSelector(state => state.connection);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { sessionId, userId, onMessage, onSessionUpdate, onError } = options;

  // Initialize encryption key for session
  const initializeEncryption = useCallback(async (sessionId: string) => {
    try {
      encryptionKeyRef.current = await deriveSessionKey(sessionId);
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      dispatch(setConnectionError('Encryption setup failed'));
    }
  }, [dispatch]);

  // Handle message encryption before sending
  const encryptAndSendMessage = useCallback(async (content: string) => {
    if (!currentSession || !userId || !encryptionKeyRef.current) {
      throw new Error('Session not ready for messaging');
    }

    try {
      const encryptedContent = await encryptMessage(content, encryptionKeyRef.current);
      
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSession.id,
          sender_id: userId,
          content,
          encrypted_content: encryptedContent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [currentSession, userId]);

  // Handle incoming message decryption
  const handleIncomingMessage = useCallback(async (payload: any) => {
    if (!encryptionKeyRef.current) return;

    try {
      const decryptedContent = await decryptMessage(
        payload.new.encrypted_content,
        encryptionKeyRef.current
      );

      const message: Message = {
        id: payload.new.id,
        session_id: payload.new.session_id,
        sender_id: payload.new.sender_id,
        content: decryptedContent,
        message_type: payload.new.message_type,
        created_at: payload.new.created_at,
        is_own_message: payload.new.sender_id === userId,
      };

      dispatch(addMessage(message));
      onMessage?.(message);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      dispatch(setError('Failed to decrypt message'));
    }
  }, [dispatch, userId, onMessage]);

  // Connection health monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      if (channelRef.current && connectionStatus === 'connected') {
        const startTime = Date.now();
        
        try {
          // Send a ping to measure latency
          channelRef.current.send({
            type: 'broadcast',
            event: 'ping',
            payload: { timestamp: startTime, user_id: userId }
          });
        } catch (error) {
          console.error('Heartbeat failed:', error);
          dispatch(setConnectionError('Connection lost'));
        }
      }
    }, 30000); // 30 second intervals
  }, [connectionStatus, userId, dispatch]);

  // Handle reconnection logic
  const { metrics } = useAppSelector(state => state.connection);
  
  const attemptReconnection = useCallback((sessionId: string, userId: string, connectFn: (sessionId: string, userId: string) => void) => {
    if (metrics.reconnectAttempts >= metrics.maxReconnectAttempts) {
      dispatch(setConnectionStatus('disconnected'));
      dispatch(setConnectionError('Max reconnection attempts reached'));
      return;
    }

    dispatch(incrementReconnectAttempts());
    dispatch(setConnectionStatus('reconnecting'));

    const delay = Math.min(1000 * Math.pow(2, metrics.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectFn(sessionId, userId);
    }, delay);
  }, [dispatch, metrics]);

  // Setup realtime connection
  const connect = useCallback(async (sessionId: string, userId: string) => {
    console.log('🚀 Starting real-time connection...', { sessionId, userId });
    
    try {
      console.log('📡 Setting connection status to connecting...');
      dispatch(setConnectionStatus('connecting'));
      dispatch(setLoading(true));

      // Initialize encryption
      console.log('🔐 Initializing encryption for session:', sessionId);
      await initializeEncryption(sessionId);
      console.log('✅ Encryption initialized successfully');

      // Create realtime channel
      console.log('📺 Creating realtime channel for session:', sessionId);
      const channel = supabase
        .channel(`chat-session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `session_id=eq.${sessionId}`,
          },
          handleIncomingMessage
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            console.log('🔄 Session status changed:', (payload.old as any)?.status, '→', (payload.new as any).status);
            
            const session: ChatSession = {
              id: payload.new.id,
              user1_id: payload.new.user1_id,
              user2_id: payload.new.user2_id,
              status: payload.new.status,
              started_at: payload.new.started_at,
              ended_at: payload.new.ended_at,
              created_at: payload.new.created_at,
            };
            
            dispatch(updateSessionStatus({
              sessionId: payload.new.id,
              status: payload.new.status
            }));
            
            dispatch(setCurrentSession(session));
            onSessionUpdate?.(session);
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.user_id !== userId) {
            dispatch(setTypingIndicator({
              user_id: payload.payload.user_id,
              is_typing: payload.payload.is_typing,
              timestamp: payload.payload.timestamp,
            }));
          }
        })
        .on('broadcast', { event: 'pong' }, (payload) => {
          const latency = Date.now() - payload.payload.timestamp;
          dispatch(updateLatency(latency));
        })
        .on('broadcast', { event: 'ping' }, (payload) => {
          if (payload.payload.user_id !== userId) {
            // Respond with pong
            channel.send({
              type: 'broadcast',
              event: 'pong',
              payload: { timestamp: payload.payload.timestamp }
            });
          }
        });

      channelRef.current = channel;

      console.log('📡 Subscribing to channel...');
      const status = await channel.subscribe((status) => {
        console.log('📡 Channel subscription status changed:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time channel!');
          
          
          dispatch(setConnectionStatus('connected'));
          dispatch(setLoading(false));
          dispatch(resetReconnectAttempts());
          startHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Channel subscription error');
          dispatch(setConnectionStatus('error'));
          dispatch(setConnectionError('Failed to connect to chat'));
          attemptReconnection(sessionId, userId, connect);
        } else if (status === 'TIMED_OUT') {
          console.log('⏰ Channel subscription timed out');
          dispatch(setConnectionStatus('error'));
          dispatch(setConnectionError('Connection timed out'));
          attemptReconnection(sessionId, userId, connect);
        }
      });

    } catch (error) {
      console.error('Connection error:', error);
      dispatch(setConnectionStatus('error'));
      dispatch(setConnectionError(error instanceof Error ? error.message : 'Unknown error'));
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
      attemptReconnection(sessionId, userId, connect);
    }
  }, [dispatch, initializeEncryption, handleIncomingMessage, onSessionUpdate, onError, startHeartbeat, attemptReconnection]);

  // Disconnect from realtime (but don't cleanup session automatically)
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Don't automatically cleanup session on disconnect
    // Session cleanup should only happen on actual page unload
    // This prevents sessions from ending when users navigate normally

    dispatch(setConnectionStatus('disconnected'));
    dispatch(clearTypingIndicators());
  }, [dispatch]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (channelRef.current && userId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          is_typing: isTyping,
          timestamp: Date.now(),
        },
      });
    }
  }, [userId]);

  // Auto-connect when sessionId and userId are provided
  useEffect(() => {
    console.log('🔗 useRealtimeChat useEffect triggered:', { sessionId, userId });
    
    if (sessionId && userId) {
      console.log('✅ Both sessionId and userId available, attempting connection...');
      connect(sessionId, userId);
    } else {
      console.log('❌ Missing sessionId or userId:', { sessionId: !!sessionId, userId: !!userId });
    }

    return () => {
      console.log('🔌 useRealtimeChat cleanup, disconnecting...');
      disconnect();
    };
  }, [sessionId, userId, connect, disconnect]); // Added connect and disconnect back to deps

  return {
    connect,
    disconnect,
    sendMessage: encryptAndSendMessage,
    sendTypingIndicator,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
};
