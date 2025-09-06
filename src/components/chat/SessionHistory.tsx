'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useAppSelector } from '@/store';
import { formatDistanceToNow, format } from 'date-fns';

interface SessionHistoryItem {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  messageCount: number;
  duration: number; // in minutes
  lastMessage?: string;
  status: 'completed' | 'interrupted' | 'active';
}

interface SessionHistoryProps {
  isVisible: boolean;
  onClose: () => void;
  onClearHistory: () => void;
}

export const SessionHistory = ({ 
  isVisible, 
  onClose, 
  onClearHistory 
}: SessionHistoryProps) => {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const { messageHistory } = useAppSelector(state => state.chat);

  useEffect(() => {
    if (isVisible) {
      loadSessionHistory();
    }
  }, [isVisible, messageHistory]);

  const loadSessionHistory = () => {
    // Load session history from localStorage
    const savedHistory = localStorage.getItem('cozy-chat-session-history');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      const sessions: SessionHistoryItem[] = parsed.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
      }));
      setHistory(sessions.sort((a: SessionHistoryItem, b: SessionHistoryItem) => b.startTime.getTime() - a.startTime.getTime()));
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('cozy-chat-session-history');
    setHistory([]);
    setShowClearConfirm(false);
    onClearHistory();
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    return `${hours}h ${remainingMins}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'interrupted': return '⚡';
      case 'active': return '💬';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'interrupted': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'active': return 'text-cozy-orange-600 bg-cozy-orange-50 border-cozy-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Calculate statistics
  const stats = {
    totalSessions: history.length,
    totalDuration: history.reduce((sum, session) => sum + session.duration, 0),
    totalMessages: history.reduce((sum, session) => sum + session.messageCount, 0),
    averageDuration: history.length > 0 ? 
      history.reduce((sum, session) => sum + session.duration, 0) / history.length : 0,
    completedSessions: history.filter(s => s.status === 'completed').length,
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-0 shadow-none h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    📚 Chat History
                  </span>
                  <div className="flex items-center gap-2">
                    {history.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowClearConfirm(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        🗑️ Clear
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      ×
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="overflow-y-auto">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💭</div>
                    <h3 className="text-lg font-semibold text-cozy-brown-800 mb-2">
                      No Chat History Yet
                    </h3>
                    <p className="text-cozy-brown-600">
                      Your chat sessions will appear here once you start chatting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-cozy-orange-50 border border-cozy-orange-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-cozy-orange-600">
                          {stats.totalSessions}
                        </div>
                        <div className="text-xs text-cozy-orange-700">Sessions</div>
                      </div>
                      <div className="bg-cozy-gold-50 border border-cozy-gold-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-cozy-gold-600">
                          {formatDuration(stats.totalDuration)}
                        </div>
                        <div className="text-xs text-cozy-gold-700">Total Time</div>
                      </div>
                      <div className="bg-cozy-green-50 border border-cozy-green-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-cozy-green-600">
                          {stats.totalMessages}
                        </div>
                        <div className="text-xs text-cozy-green-700">Messages</div>
                      </div>
                      <div className="bg-cozy-brown-50 border border-cozy-brown-200 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-cozy-brown-600">
                          {formatDuration(stats.averageDuration)}
                        </div>
                        <div className="text-xs text-cozy-brown-700">Avg Length</div>
                      </div>
                    </div>

                    {/* Session List */}
                    <div className="space-y-3">
                      {history.map((session, index) => (
                        <motion.div
                          key={session.sessionId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border border-cozy-brown-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                                  {getStatusIcon(session.status)} {session.status}
                                </span>
                                <span className="text-sm text-cozy-brown-500">
                                  {formatDistanceToNow(session.startTime, { addSuffix: true })}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-cozy-brown-600 mb-2">
                                <span>🕒 {formatDuration(session.duration)}</span>
                                <span>💬 {session.messageCount} messages</span>
                                <span>📅 {format(session.startTime, 'MMM d, HH:mm')}</span>
                              </div>
                              
                              {session.lastMessage && (
                                <div className="text-sm text-cozy-brown-500 italic">
                                  &quot;{session.lastMessage.length > 50 
                                    ? session.lastMessage.substring(0, 50) + '...' 
                                    : session.lastMessage}&quot;
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clear Confirmation Dialog */}
            <AnimatePresence>
              {showClearConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white rounded-lg p-6 max-w-sm w-full mx-4"
                  >
                    <h3 className="text-lg font-semibold mb-3 text-red-600">
                      Clear Chat History?
                    </h3>
                    <p className="text-cozy-brown-600 mb-6">
                      This will permanently delete all your chat history. This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleClearHistory}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Clear History
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
