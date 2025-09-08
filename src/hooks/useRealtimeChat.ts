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
  ChatSession
} from '@/store/slices/chatSlice';
import { Message, mapMessageRowToMessage } from '@/types/message';
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
  const sessionPollingRef = useRef<NodeJS.Timeout | null>(null);
  
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

      const json = await response.json();

      // Optimistically add the message to local state in case realtime delivery is delayed
      const nowIso = new Date().toISOString();
      const messageRow = {
        id: json?.message_id || `${Date.now()}`,
        session_id: currentSession.id,
        sender_id: userId,
        content,
        encrypted_content: encryptedContent,
        message_type: 'text' as const,
        is_flagged: false,
        created_at: nowIso,
        updated_at: nowIso,
      };
      const optimistic = mapMessageRowToMessage(messageRow, userId);
      dispatch(addMessage(optimistic));

      return json;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [currentSession, userId, dispatch]);

  // Handle incoming message decryption
  const handleIncomingMessage = useCallback(async (payload: any) => {
    if (!userId) return;

    try {
      let content: string;

      if (payload.new.message_type === 'system') {
        // System messages are not encrypted; use plain content
        content = payload.new.content;
      } else {
        if (!encryptionKeyRef.current) return;
        content = await decryptMessage(
          payload.new.encrypted_content,
          encryptionKeyRef.current
        );
      }

      const messageRow = {
        id: payload.new.id,
        session_id: payload.new.session_id,
        sender_id: payload.new.sender_id,
        content,
        encrypted_content: payload.new.encrypted_content,
        message_type: payload.new.message_type,
        is_flagged: payload.new.is_flagged,
        created_at: payload.new.created_at,
        updated_at: payload.new.updated_at,
      };

      const message = mapMessageRowToMessage(messageRow, userId);

      dispatch(addMessage(message));
      onMessage?.(message);
    } catch (error) {
      console.error('Failed to process incoming message:', error);
      dispatch(setError('Failed to process incoming message'));
    }
  }, [dispatch, userId, onMessage]);

  // Session polling for waiting users (re-enabled as fallback if realtime update is missed)
  const startSessionPolling = useCallback((sessionId: string, userId: string) => {
    if (sessionPollingRef.current) {
      clearInterval(sessionPollingRef.current);
    }

    sessionPollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/chat/session-status?id=${sessionId}`);
        if (!resp.ok) return;
        const json = await resp.json();
        const sessionData = json.session;
        if (sessionData) {
          const session: ChatSession = {
            id: sessionData.id,
            user1_id: sessionData.user1_id,
            user2_id: sessionData.user2_id,
            status: sessionData.status,
            started_at: sessionData.started_at,
            ended_at: sessionData.ended_at,
            created_at: sessionData.created_at,
          };

          dispatch(setCurrentSession(session));
          dispatch(updateSessionStatus({ sessionId: session.id, status: session.status }));

          if (session.status === 'active') {
            clearInterval(sessionPollingRef.current!);
            sessionPollingRef.current = null;
          }
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
  }, [dispatch]);

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
    try {
      dispatch(setConnectionStatus('connecting'));
      dispatch(setLoading(true));

      // Initialize encryption
      await initializeEncryption(sessionId);

      // Create realtime channel
      const channel = supabase
        .channel(`chat-session-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            // Filter client-side by session_id to avoid Realtime filter validation issues
            if (payload?.new?.session_id === sessionId) {
              handleIncomingMessage(payload);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Filter client-side by session_id to avoid Realtime filter validation issues
            if (payload?.new?.id === sessionId) {
              console.log('Session update received:', payload.new);
              
              const session: ChatSession = {
                id: payload.new.id,
                user1_id: payload.new.user1_id,
                user2_id: payload.new.user2_id,
                status: payload.new.status,
                started_at: payload.new.started_at,
                ended_at: payload.new.ended_at,
                created_at: payload.new.created_at,
              };
              
              // Update session status in store
              dispatch(updateSessionStatus({
                sessionId: payload.new.id,
                status: payload.new.status
              }));
              
              // Update current session with full details
              dispatch(setCurrentSession(session));
              
              // Notify parent component
              onSessionUpdate?.(session);
              
              // If session became active, trigger a refresh of messages
              if ((payload.new as any)?.status === 'active' && (payload.old as any)?.status === 'waiting') {
                console.log('Session became active, refreshing messages...');
                // The message listener will handle new messages automatically
              }
              
              // If session ended, stop session polling
              if ((payload.new as any)?.status === 'ended') {
                console.log('Session ended, stopping polling...');
                if (sessionPollingRef.current) {
                  clearInterval(sessionPollingRef.current);
                  sessionPollingRef.current = null;
                }
              }
            }
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

      const status = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          dispatch(setConnectionStatus('connected'));
          dispatch(setLoading(false));
          dispatch(resetReconnectAttempts());
          startHeartbeat();
          
          // Start session polling as a fallback; it will stop itself when session becomes active
          // Call startSessionPolling directly to avoid circular dependency
          if (sessionPollingRef.current) {
            clearInterval(sessionPollingRef.current);
          }

          sessionPollingRef.current = setInterval(async () => {
            try {
              const resp = await fetch(`/api/chat/session-status?id=${sessionId}`);
              if (!resp.ok) return;
              const json = await resp.json();
              const sessionData = json.session;
              if (sessionData) {
                const session: ChatSession = {
                  id: sessionData.id,
                  user1_id: sessionData.user1_id,
                  user2_id: sessionData.user2_id,
                  status: sessionData.status,
                  started_at: sessionData.started_at,
                  ended_at: sessionData.ended_at,
                  created_at: sessionData.created_at,
                };

                dispatch(setCurrentSession(session));
                dispatch(updateSessionStatus({ sessionId: session.id, status: session.status }));

                if (session.status === 'active') {
                  clearInterval(sessionPollingRef.current!);
                  sessionPollingRef.current = null;
                }
              }
            } catch {
              // ignore transient errors
            }
          }, 2000);
        } else if (status === 'CHANNEL_ERROR') {
          dispatch(setConnectionStatus('error'));
          dispatch(setConnectionError('Failed to connect to chat'));
          attemptReconnection(sessionId, userId, connect);
        } else if (status === 'TIMED_OUT') {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, initializeEncryption, handleIncomingMessage, onSessionUpdate, onError, startHeartbeat, attemptReconnection]); // Intentionally excluding startSessionPolling to prevent circular dependency

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

    if (sessionPollingRef.current) {
      clearInterval(sessionPollingRef.current);
      sessionPollingRef.current = null;
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
    // Only attempt connection if both sessionId and userId are valid strings
    if (sessionId && userId && typeof sessionId === 'string' && typeof userId === 'string') {
      connect(sessionId, userId);
    } else {
      // Don't attempt connection if we don't have valid IDs
      return;
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId]); // Intentionally excluding connect and disconnect to prevent infinite loop

  return {
    connect,
    disconnect,
    sendMessage: encryptAndSendMessage,
    sendTypingIndicator,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
};
