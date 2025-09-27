'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Header, Container } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCurrentUser, clearUser } from '@/store/slices/userSlice';
import { setCurrentSession, clearChat, updateSessionStatus } from '@/store/slices/chatSlice';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/chat/ThemeToggle';
import { setSessionContext } from '@/lib/supabase';
// Global cozy theme is now imported via globals.css

export default function ChatPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Initialize theme hook at the top to ensure it's available throughout component lifecycle
  const themeHook = useTheme();
  
  const { currentUser } = useAppSelector((state: any) => state.user);
  const { currentSession, messages, isLoading, typingIndicators } = useAppSelector((state: any) => state.chat);
  const { status: connectionStatus, metrics } = useAppSelector((state: any) => state.connection);
  
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [initializingUser, setInitializingUser] = useState(true);
  const [isStuck, setIsStuck] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stuckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { sendMessage, sendTypingIndicator, isConnected } = useRealtimeChat({
    sessionId: currentSession?.id,
    userId: currentUser?.id,
    onMessage: (message) => {
      // Message received, scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onSessionUpdate: (session) => {
      // Session updated (e.g., someone joined)
      console.log('Session updated in chat page:', session);
      dispatch(setCurrentSession(session));
      
      // If session became active, clear any stuck state
      if (session.status === 'active') {
        setIsStuck(false);
        if (stuckTimeoutRef.current) {
          clearTimeout(stuckTimeoutRef.current);
          stuckTimeoutRef.current = null;
        }
      }
    },
    onError: (error) => {
      console.error('Realtime chat error:', error);
      setIsStuck(true);
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up timeout to detect if user is stuck
  useEffect(() => {
    if (initializingUser || !currentUser) {
      // Start timeout when user is initializing
      stuckTimeoutRef.current = setTimeout(() => {
        setIsStuck(true);
      }, 10000); // 10 seconds timeout
    } else {
      // Clear timeout when user is initialized
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current);
        stuckTimeoutRef.current = null;
      }
      setIsStuck(false);
    }

    return () => {
      if (stuckTimeoutRef.current) {
        clearTimeout(stuckTimeoutRef.current);
        stuckTimeoutRef.current = null;
      }
    };
  }, [initializingUser, currentUser]);

  // Clean up session when user leaves the page (but not on normal navigation)
  useEffect(() => {
    const cleanupSession = async () => {
      if (currentSession && currentUser && currentSession.status === 'active') {
        try {
          // Use fetch with keepalive for more reliable cleanup
          await fetch('/api/chat/close-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: currentSession.id,
              user_id: currentUser.id,
            }),
            keepalive: true, // Ensures request completes even if page unloads
          });
        } catch (error) {
          console.error('Session cleanup failed:', error);
          // Fallback to sendBeacon if fetch fails
          navigator.sendBeacon('/api/chat/close-session', JSON.stringify({
            session_id: currentSession.id,
            user_id: currentUser.id,
          }));
        }
      }
    };

    const handleBeforeUnload = () => {
      cleanupSession();
    };

    // Only cleanup on actual page unload, not on tab switches or normal navigation
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      // Remove event listeners (but don't cleanup session on component unmount)
      // This prevents cleanup when users navigate normally within the app
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [currentSession, currentUser]);

  // Initialize anonymous user on component mount
  useEffect(() => {
    const isCreatingUser = sessionStorage.getItem('cozy-chat-creating-user');
    const existingUserId = sessionStorage.getItem('cozy-chat-user-id');
    
    // If user is being created, wait for it to complete
    if (isCreatingUser === 'true') {
      setInitializingUser(false);
      return;
    }

    // If we have a user ID in sessionStorage but no currentUser in Redux (page refresh)
    if (existingUserId && !currentUser) {
      // Recovering user from sessionStorage after refresh
      
      // Clear any existing session state to ensure fresh start
      dispatch(clearChat());
      
      // Recover user from sessionStorage
      dispatch(setCurrentUser({
        id: existingUserId,
        session_id: existingUserId, // Use user ID as temporary session ID
        interests: [], // Default interests, can be enhanced later
        is_active: true,
        connected_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      }));

      // Set session context for RLS policies (async)
      setSessionContext(existingUserId).catch((error) => {
        console.error('Failed to set session context:', error);
      });
      
      setInitializingUser(false);
      return;
    }

    // If we already have a currentUser, we're good
    if (currentUser) {
      setInitializingUser(false);
      return;
    }

    // Create new user if none exists
    const initializeUser = async () => {
      sessionStorage.setItem('cozy-chat-creating-user', 'true');
      
      // Read interests from session storage
      const storedInterests = sessionStorage.getItem('cozy-chat-interests');
      const userInterests = storedInterests ? JSON.parse(storedInterests) : [];
      
      try {
        const response = await fetch('/api/user/create-anonymous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interests: userInterests }),
        });

        if (!response.ok) throw new Error('Failed to create user');

        const data = await response.json();
        if (data.success) {
          sessionStorage.setItem('cozy-chat-user-id', data.user.id);
          sessionStorage.removeItem('cozy-chat-creating-user');
          
          dispatch(setCurrentUser({
            id: data.user.id,
            session_id: data.user.session_id,
            interests: data.user.interests,
            is_active: true,
            connected_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          }));

          // Set session context for RLS policies (async)
          setSessionContext(data.user.session_id).catch((error) => {
            console.error('Failed to set session context:', error);
          });
        }
      } catch (error) {
        console.error('Failed to initialize user:', error);
        sessionStorage.removeItem('cozy-chat-creating-user');
      } finally {
        setInitializingUser(false);
      }
    };

    initializeUser();
  }, [currentUser, dispatch]);

  // Create or join chat session
  useEffect(() => {
    let isCreatingSession = false;
    
    const createSession = async () => {
      // Only create session if:
      // 1. We have a current user
      // 2. User initialization is complete
      // 3. We don't already have an active session
      // 4. We're not already creating a session
      // 5. We don't have an ended session (user should choose what to do next)
      if (!currentUser || initializingUser || isCreatingSession) return;
      
      // If we have a current session, only proceed if it's ended AND user hasn't made a choice yet
      if (currentSession && currentSession.status !== 'ended') {
        return;
      }

      // Don't auto-create session if current session is ended - let user choose
      if (currentSession && currentSession.status === 'ended') {
        return;
      }

      isCreatingSession = true;
      // Creating/joining session for user
      
      // Add a small random delay to prevent race conditions
      const delay = Math.random() * 2000; // 0-2 seconds
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        // Read interests from session storage for session creation
        const storedInterests = sessionStorage.getItem('cozy-chat-interests');
        const sessionInterests = storedInterests ? JSON.parse(storedInterests) : (currentUser.interests || []);
        
        const response = await fetch('/api/chat/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            interests: sessionInterests,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create session');
        }

        const data = await response.json();
        if (data.success) {
          // Session created/joined successfully
          dispatch(setCurrentSession({
            id: data.session_id,
            user1_id: currentUser.id,
            status: data.message === 'Joined existing session' ? 'active' : 'waiting',
            created_at: new Date().toISOString(),
          }));
        }
      } catch (error) {
        console.error('Failed to create session:', error);
        // If session creation fails, clear any existing session to allow retry
        if (currentSession) {
          dispatch(clearChat());
        }
      } finally {
        isCreatingSession = false;
      }
    };

    createSession();
  }, [currentUser, initializingUser, dispatch, currentSession]); // Include currentSession but with proper logic to prevent auto-creation after ended sessions

  // Heartbeat to keep user active
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = async () => {
      try {
        await fetch('/api/user/update-activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id }),
        });
      } catch (error) {
        console.error('Failed to update user activity:', error);
      }
    };

    // Update activity immediately
    updateActivity();

    // Set up heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(updateActivity, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [currentUser]);

  const handleSendMessage = async () => {
    if (!message.trim() || !isConnected || !sendMessage || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(message.trim());
      setMessage('');
      
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!currentSession || !currentUser) return;

    try {
      const response = await fetch('/api/chat/close-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSession.id,
          user_id: currentUser.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to close session:', error);
      } else {
        // Session closed successfully - update local state
        dispatch(updateSessionStatus({
          sessionId: currentSession.id,
          status: 'ended'
        }));
        
        // Update the current session object with ended status
        dispatch(setCurrentSession({
          ...currentSession,
          status: 'ended',
          ended_at: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Error closing session:', error);
      // Even if the API call fails, update local state to show ended
      dispatch(updateSessionStatus({
        sessionId: currentSession.id,
        status: 'ended'
      }));
    }
  };

  const handleNextChat = async () => {
    if (!currentUser) return;
    
    setIsSending(true);
    try {
      // If there's a current session, end it first
      if (currentSession && currentSession.status === 'active') {
        try {
          await fetch('/api/chat/close-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: currentSession.id,
              user_id: currentUser.id,
            }),
          });
        } catch (error) {
          console.error('Error closing current session:', error);
          // Continue anyway
        }
      }
      
      // Clear current chat state
      dispatch(clearChat());
      
      // Read interests from session storage for new chat
      const storedInterests = sessionStorage.getItem('cozy-chat-interests');
      const newChatInterests = storedInterests ? JSON.parse(storedInterests) : (currentUser.interests || []);
      
      // Start a new chat
      const response = await fetch('/api/chat/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          interests: newChatInterests,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to start new chat:', error);
      } else {
        const result = await response.json();
        // New chat started successfully
        
        // Set new session
        if (result.success) {
          dispatch(setCurrentSession({
            id: result.session_id,
            user1_id: currentUser.id,
            status: result.message === 'Joined existing session' ? 'active' : 'waiting',
            created_at: new Date().toISOString(),
          }));
        }
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartFresh = async () => {
    try {
      // Clear all session storage
      sessionStorage.removeItem('cozy-chat-user-id');
      sessionStorage.removeItem('cozy-chat-creating-user');
      
      // Clear Redux state
      dispatch(clearUser());
      dispatch(clearChat());
      
      // Reset local state
      setIsStuck(false);
      setInitializingUser(true);
      
      // Create new user
      const response = await fetch('/api/user/create-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests: [] }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          sessionStorage.setItem('cozy-chat-user-id', data.user.id);
          
          dispatch(setCurrentUser({
            id: data.user.id,
            session_id: data.user.session_id,
            interests: data.user.interests,
            is_active: true,
            connected_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          }));
        }
      }
    } catch (error) {
      console.error('Failed to start fresh:', error);
    } finally {
      setInitializingUser(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 1000);
  };

  const getStatusDisplay = () => {
    if (initializingUser) {
      return {
        icon: '⚡',
        title: 'Initializing...',
        description: 'Setting up your anonymous session',
        color: 'text-orange-600'
      };
    }

    switch (currentSession?.status) {
      case 'waiting':
        return {
          icon: '⏳',
          title: 'Waiting for match...',
          description: 'Finding someone perfect for you',
          color: 'text-yellow-600'
        };
      case 'active':
        return {
          icon: '💬',
          title: 'Connected!',
          description: 'You\'re chatting with a friendly stranger',
          color: 'text-green-600'
        };
      case 'ended':
        return {
          icon: '👋',
          title: 'Chat Ended',
          description: 'Hope you had a great conversation!',
          color: 'text-gray-600'
        };
      default:
        return {
          icon: '🔍',
          title: 'Connecting...',
          description: 'Looking for someone to chat with',
          color: 'text-orange-600'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  if (initializingUser || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center"
           style={{ 
             backgroundColor: 'var(--cozy-bg)',
             color: 'var(--cozy-text)' 
           }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-3 border-current opacity-30 border-t-current rounded-full mx-auto mb-6 cozy-loading"
            style={{ borderColor: 'var(--cozy-accent)', borderTopColor: 'var(--cozy-accent)' }}
          />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--cozy-text)' }}>Setting up your cozy chat</h2>
          <p style={{ color: 'var(--cozy-text-muted)' }}>Just a moment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" 
         style={{ 
           backgroundColor: 'var(--cozy-bg)',
           color: 'var(--cozy-text)' 
         }}>
      {/* Cozy Top Bar */}
      <div className="cozy-top-bar">
        <div className="cozy-logo">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'var(--cozy-accent)' }}
          >
            C
          </div>
          <span>CozyChat</span>
        </div>
        
        <div className="cozy-status-title">
          {currentSession?.status === 'waiting' && '⏳ Finding someone...'}
          {currentSession?.status === 'active' && '💬 Connected'}
          {currentSession?.status === 'ended' && '👋 Chat ended'}
          {!currentSession && '🔍 Connecting...'}
        </div>
        
        <div className="cozy-top-bar-controls">
          <button 
            className="cozy-icon-button"
            title="Report user"
            aria-label="Report this user"
            disabled={currentSession?.status !== 'active'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Transcript Area */}
        <div className="cozy-transcript-area flex-1">
          
          {/* Status Message */}
          {currentSession?.status === 'waiting' && (
            <div className="cozy-system-message">
              <div className="cozy-system-pill connecting">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-3 h-3 border border-current border-t-transparent rounded-full"
                />
                Finding someone perfect for you...
              </div>
            </div>
          )}
          
          {currentSession?.status === 'active' && messages.length === 0 && (
            <div className="cozy-system-message">
              <div className="cozy-system-pill connected">
                ✨ You&apos;re connected—say hi!
              </div>
            </div>
          )}

          {!currentSession && (
            <div className="cozy-system-message">
              <div className="cozy-system-pill connecting">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--cozy-accent)' }} />
                Setting up your cozy space...
              </div>
              
              {/* Show Start Fresh button if user is stuck */}
              {isStuck && (
                <div className="mt-4 flex justify-center">
                  <button 
                    className="cozy-button primary"
                    onClick={handleStartFresh}
                    style={{ 
                      backgroundColor: 'var(--cozy-accent)',
                      color: 'var(--cozy-accent-contrast)',
                      border: 'none'
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start Fresh
                  </button>
                </div>
              )}
            </div>
          )}

          {currentSession?.status === 'ended' && (
            <div className="cozy-system-message">
              <div className="cozy-system-pill disconnected">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Chat ended. Hope you had a great conversation!
              </div>
            </div>
          )}

          {/* Messages Container */}
          <div className="cozy-messages-container" id="cozy-messages-container">
            {messages.map((msg: any) => (
              <div 
                key={msg.id}
                className={`cozy-message-wrapper ${msg.is_own_message ? 'own' : 'stranger'}`}
              >
                <div className={`cozy-message-bubble ${msg.is_own_message ? 'own' : 'stranger'}`}>
                  <div>{msg.content}</div>
                  <div className="cozy-message-timestamp">
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {msg.is_own_message && (
                      <div className="cozy-message-status">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'currentColor' }}
                        />
                        <span>Sent</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typingIndicators.filter((t: any) => t.is_typing).length > 0 && (
              <div className="cozy-typing-indicator">
                <div className="cozy-typing-bubble">
                  <span>Stranger is typing</span>
                  <div className="cozy-typing-dots">
                    <div className="cozy-typing-dot" />
                    <div className="cozy-typing-dot" />
                    <div className="cozy-typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Chat Controls Bar - Show when connected or ended */}
        {(currentSession?.status === 'active' || currentSession?.status === 'ended') && (
          <div className="cozy-controls-bar">
              <button 
                className="cozy-button secondary"
                onClick={handleNextChat}
                disabled={isSending}
                title="Start a new chat with someone else"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Chat
              </button>
              {currentSession?.status === 'ended' ? (
                <button 
                  className="cozy-button ghost"
                  onClick={() => {
                    // Clear session state when going home to ensure fresh start on return
                    dispatch(clearChat());
                    router.push('/');
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go Home
                </button>
              ) : (
                <button 
                  className="cozy-button ghost"
                  onClick={handleEndChat}
                  style={{ borderColor: 'var(--cozy-error)', color: 'var(--cozy-error)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  End Chat
                </button>
              )}
          </div>
        )}
      </div>

      {/* Input Dock */}
      <div className="cozy-input-dock">
        <div className="cozy-input-container">
          <button 
            className="cozy-icon-button" 
            title="Add emoji"
            aria-label="Add emoji"
            disabled={!isConnected || currentSession?.status !== 'active'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
            </svg>
          </button>
          
          <textarea
            className="cozy-input"
            placeholder={
              isConnected && currentSession?.status === 'active'
                ? 'Type a cozy message...'
                : 'Connecting...'
            }
            value={message}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={!isConnected || currentSession?.status !== 'active'}
            rows={1}
            style={{ 
              minHeight: '44px',
              maxHeight: '120px',
              resize: 'none',
              overflow: 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '44px';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          
          <button 
            className="cozy-button primary"
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected || currentSession?.status !== 'active' || isSending}
            style={{ minWidth: '80px' }}
          >
            {isSending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border border-current border-t-transparent rounded-full"
              />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                </svg>
                Send
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
}