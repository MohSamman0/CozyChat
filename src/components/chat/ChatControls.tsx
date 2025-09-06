'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { ChatSession } from '@/store/slices/chatSlice';

interface ChatControlsProps {
  currentSession: ChatSession | null;
  isConnected: boolean;
  onEndChat: () => void;
  onNewChat: () => void;
  onSkipUser: () => void;
  onReportUser: () => void;
  onGoHome: () => void;
  disabled?: boolean;
}

export const ChatControls = ({
  currentSession,
  isConnected,
  onEndChat,
  onNewChat,
  onSkipUser,
  onReportUser,
  onGoHome,
  disabled = false
}: ChatControlsProps) => {
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const isActive = currentSession?.status === 'active';
  const isWaiting = currentSession?.status === 'waiting';
  const isEnded = !currentSession || currentSession?.status === 'ended';

  const handleSkipUser = () => {
    setShowSkipConfirm(false);
    onSkipUser();
  };

  const handleEndChat = () => {
    setShowEndConfirm(false);
    onEndChat();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ Chat Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Active Chat Controls */}
          {isActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Button 
                variant="outline" 
                className="w-full text-left justify-start"
                onClick={() => setShowEndConfirm(true)}
                disabled={disabled}
              >
                <span className="mr-2">👋</span>
                End Chat
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-left justify-start"
                onClick={() => setShowSkipConfirm(true)}
                disabled={disabled}
              >
                <span className="mr-2">⏭️</span>
                Skip to Next Person
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-left justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowReportDialog(true)}
                disabled={disabled}
              >
                <span className="mr-2">🚩</span>
                Report User
              </Button>
            </motion.div>
          )}

          {/* Waiting Controls */}
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Button 
                variant="outline" 
                className="w-full text-left justify-start"
                onClick={onNewChat}
                disabled={disabled}
              >
                <span className="mr-2">🔄</span>
                Find New Match
              </Button>
            </motion.div>
          )}

          {/* No Session Controls */}
          {isEnded && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Button 
                className="w-full text-left justify-start"
                onClick={onNewChat}
                disabled={disabled}
              >
                <span className="mr-2">💬</span>
                Start New Chat
              </Button>
            </motion.div>
          )}

          {/* Always Available Controls */}
          <div className="border-t border-cozy-brown-200 pt-3">
            <Button 
              variant="ghost" 
              className="w-full text-left justify-start text-cozy-brown-600"
              onClick={onGoHome}
            >
              <span className="mr-2">🏠</span>
              Back Home
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Safety Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-cozy-brown-600">
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Be respectful and kind</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>No personal information</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Report inappropriate behavior</span>
            </div>
            <div className="flex items-start gap-2">
              <span>•</span>
              <span>Enjoy the conversation!</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <AnimatePresence>
        {/* Skip Confirmation */}
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSkipConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Skip to Next Person?</h3>
              <p className="text-cozy-brown-600 mb-6">
                This will end the current chat and find you a new person to talk to.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSkipConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSkipUser}>
                  Skip User
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* End Chat Confirmation */}
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">End Chat?</h3>
              <p className="text-cozy-brown-600 mb-6">
                This will end the conversation. You can start a new chat anytime!
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowEndConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEndChat}>
                  End Chat
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Report Dialog */}
        {showReportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3 text-red-600">Report User</h3>
              <p className="text-cozy-brown-600 mb-4">
                Help us keep CozyChat safe by reporting inappropriate behavior.
              </p>
              
              <div className="space-y-3 mb-6">
                {[
                  { id: 'harassment', label: 'Harassment or bullying', icon: '😢' },
                  { id: 'inappropriate', label: 'Inappropriate content', icon: '🚫' },
                  { id: 'spam', label: 'Spam or advertising', icon: '📢' },
                  { id: 'other', label: 'Other (please specify)', icon: '❓' }
                ].map((reason) => (
                  <button
                    key={reason.id}
                    className="w-full text-left p-3 rounded-lg border border-cozy-brown-200 hover:bg-cozy-orange-50 hover:border-cozy-orange-300 transition-colors"
                    onClick={() => {
                      onReportUser();
                      setShowReportDialog(false);
                    }}
                  >
                    <span className="mr-3">{reason.icon}</span>
                    {reason.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
