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

interface UseSecureRealtimeChatOptions {
  sessionId?: string;
  userId?: string;
  onMessage?: (message: Message) => void;
  onSessionUpdate?: (session: ChatSession) => void;
  onError?: (error: Error) => void;
}

// Rate limiting for realtime connections
const connectionAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_CONNECTION_ATTEMPTS = 5;
const CONNECTION_RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkConnectionRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const attempts = connectionAttempts.get(sessionId);

  if (!attempts || now - attempts.lastAttempt > CONNECTION_RATE_LIMIT_WINDOW) {
    connectionAttempts.set(sessionId, { count: 1, lastAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_CONNECTION_ATTEMPTS) {
    return false;
  }

  attempts.count += 1;
  attempts.lastAttempt = now;
  return true;
}

export const useSecureRealtimeChat = (options: UseSecureRealtimeChatOptions = {}) => {
  const dispatch = useAppDispatch();
  const { currentSession } = useAppSelector(state => state.chat);
  const { status: connectionStatus } = useAppSelector(state => state.connection);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { sessionId, userId, onMessage, onSessionUpdate, onError } = options;

  // Validate session ID format
  const isValidSessionId = useCallback((id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }, []);

  // Validate user ID format
  const isValidUserId = useCallback((id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }, []);

  // Initialize encryption key for session
  const initializeEncryption = useCallback(async (sessionId: string) => {
    if (!isValidSessionId(sessionId)) {
      throw new Error('Invalid session ID format');
    }

    try {
      encryptionKeyRef.current = await deriveSessionKey(sessionId);
    } catch (error) {
      // Don't log sensitive encryption details
      dispatch(setConnectionError('Encryption setup failed'));
      throw error;
    }
  }, [dispatch, isValidSessionId]);

  // Handle message encryption before sending
  const encryptAndSendMessage = useCallback(async (content: string) => {
    if (!currentSession || !userId || !encryptionKeyRef.current) {
      throw new Error('Session not ready for messaging');
    }

    if (!isValidSessionId(currentSession.id) || !isValidUserId(userId)) {
      throw new Error('Invalid session or user ID');
    }

    // Validate message content
    if (!content || content.length > 1000) {
      throw new Error('Invalid message content');
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

      // Optimistically add the message to local state
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
      // Don't log sensitive message details
      throw error;
    }
  }, [currentSession, userId, dispatch, isValidSessionId, isValidUserId]);

  // Handle incoming message decryption with validation
  const handleIncomingMessage = useCallback(async (payload: any) => {
    if (!userId || !isValidUserId(userId)) return;

    // Validate payload structure
    if (!payload?.new || !payload.new.id || !payload.new.session_id || !payload.new.sender_id) {
      return;
    }

    // Validate session ID matches
    if (payload.new.session_id !== currentSession?.id) {
      return;
    }

    try {
      let content: string;

      if (payload.new.message_type === 'system') {
        // System messages are not encrypted
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
      // Don't log sensitive message details
      dispatch(setError('Failed to process incoming message'));
    }
  }, [dispatch, userId, currentSession, onMessage, isValidUserId]);

  // Session polling with validation
  const startSessionPolling = useCallback((sessionId: string, userId: string) => {
    if (!isValidSessionId(sessionId) || !isValidUserId(userId)) {
      return;
    }

    if (sessionPollingRef.current) {
      clearInterval(sessionPollingRef.current);
    }

    sessionPollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/chat/session-status?id=${encodeURIComponent(sessionId)}`);
        if (!resp.ok) return;
        const json = await resp.json();
        const sessionData = json.session;
        if (sessionData) {
          const session: ChatSession = {
            id: sessionData.id,
            user1_id: '', // Don't expose user IDs
            user2_id: '', // Don't expose user IDs
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
        // Ignore transient errors
      }
    }, 2000);
  }, [dispatch, isValidSessionId, isValidUserId]);

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
          dispatch(setConnectionError('Connection lost'));
        }
      }
    }, 30000); // 30 second intervals
  }, [connectionStatus, userId, dispatch]);

  // Handle reconnection logic with rate limiting
  const { metrics } = useAppSelector(state => state.connection);
  
  const attemptReconnection = useCallback((sessionId: string, userId: string, connectFn: (sessionId: string, userId: string) => void) => {
    if (!isValidSessionId(sessionId) || !isValidUserId(userId)) {
      dispatch(setConnectionStatus('disconnected'));
      dispatch(setConnectionError('Invalid session or user ID'));
      return;
    }

    if (!checkConnectionRateLimit(sessionId)) {
      dispatch(setConnectionStatus('disconnected'));
      dispatch(setConnectionError('Too many connection attempts'));
      return;
    }

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
  }, [dispatch, metrics, isValidSessionId, isValidUserId]);

  // Setup secure realtime connection
  const connect = useCallback(async (sessionId: string, userId: string) => {
    // Validate inputs
    if (!isValidSessionId(sessionId) || !isValidUserId(userId)) {
      dispatch(setConnectionStatus('error'));
      dispatch(setConnectionError('Invalid session or user ID'));
      return;
    }

    // Check rate limiting
    if (!checkConnectionRateLimit(sessionId)) {
      dispatch(setConnectionStatus('error'));
      dispatch(setConnectionError('Too many connection attempts'));
      return;
    }

    try {
      dispatch(setConnectionStatus('connecting'));
      dispatch(setLoading(true));

      // Initialize encryption
      await initializeEncryption(sessionId);

      // Create realtime channel with secure naming
      const channel = supabase
        .channel(`secure-chat-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `session_id=eq.${sessionId}`, // Server-side filtering
          },
          (payload) => {
            // Additional client-side validation
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
            filter: `id=eq.${sessionId}`, // Server-side filtering
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            // Additional client-side validation
            if (payload?.new?.id === sessionId) {
              const session: ChatSession = {
                id: payload.new.id,
                user1_id: '', // Don't expose user IDs
                user2_id: '', // Don't expose user IDs
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
              
              if ((payload.new as any)?.status === 'ended') {
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
          
          // Start session polling as fallback
          if (sessionPollingRef.current) {
            clearInterval(sessionPollingRef.current);
          }

          sessionPollingRef.current = setInterval(async () => {
            try {
              const resp = await fetch(`/api/chat/session-status?id=${encodeURIComponent(sessionId)}`);
              if (!resp.ok) return;
              const json = await resp.json();
              const sessionData = json.session;
              if (sessionData) {
                const session: ChatSession = {
                  id: sessionData.id,
                  user1_id: '', // Don't expose user IDs
                  user2_id: '', // Don't expose user IDs
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
              // Ignore transient errors
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
      dispatch(setConnectionStatus('error'));
      dispatch(setConnectionError('Connection failed'));
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
      attemptReconnection(sessionId, userId, connect);
    }
  }, [dispatch, initializeEncryption, handleIncomingMessage, onSessionUpdate, onError, startHeartbeat, attemptReconnection, isValidSessionId, isValidUserId]);

  // Disconnect from realtime
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

    dispatch(setConnectionStatus('disconnected'));
    dispatch(clearTypingIndicators());
  }, [dispatch]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (channelRef.current && userId && isValidUserId(userId)) {
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
  }, [userId, isValidUserId]);

  // Auto-connect when sessionId and userId are provided
  useEffect(() => {
    if (sessionId && userId && isValidSessionId(sessionId) && isValidUserId(userId)) {
      connect(sessionId, userId);
    } else {
      return;
    }

    return () => {
      disconnect();
    };
  }, [sessionId, userId, connect, disconnect, isValidSessionId, isValidUserId]);

  return {
    connect,
    disconnect,
    sendMessage: encryptAndSendMessage,
    sendTypingIndicator,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
  };
};
