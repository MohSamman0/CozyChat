'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store';
import { Button } from '@/components/ui';

interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

interface ReactionPickerProps {
  messageId: string;
  currentUserId: string;
  existingReactions?: MessageReaction[];
  onReact: (messageId: string, reaction: string) => Promise<void>;
  onRemoveReaction: (messageId: string, reaction: string) => Promise<void>;
  disabled?: boolean;
}

const AVAILABLE_REACTIONS = [
  { emoji: '❤️', name: 'love', shortcut: 'l' },
  { emoji: '😊', name: 'happy', shortcut: 'h' },
  { emoji: '👍', name: 'thumbs_up', shortcut: 'y' },
  { emoji: '😢', name: 'sad', shortcut: 's' },
  { emoji: '😮', name: 'wow', shortcut: 'w' },
  { emoji: '😡', name: 'angry', shortcut: 'a' },
  { emoji: '😂', name: 'laugh', shortcut: 'f' },
  { emoji: '🤔', name: 'thinking', shortcut: 't' },
];

export const ReactionPicker = ({
  messageId,
  currentUserId,
  existingReactions = [],
  onReact,
  onRemoveReaction,
  disabled = false
}: ReactionPickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isReacting, setIsReacting] = useState<string | null>(null);

  // Group reactions by emoji and count them
  const reactionCounts = existingReactions.reduce((acc, reaction) => {
    acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check which reactions the current user has made
  const userReactions = new Set(
    existingReactions
      .filter(r => r.user_id === currentUserId)
      .map(r => r.reaction)
  );

  const handleReaction = async (reaction: string) => {
    if (disabled || isReacting) return;

    setIsReacting(reaction);

    try {
      if (userReactions.has(reaction)) {
        await onRemoveReaction(messageId, reaction);
      } else {
        await onReact(messageId, reaction);
      }
    } catch (error) {
      console.error('Failed to update reaction:', error);
    } finally {
      setIsReacting(null);
      setShowPicker(false);
    }
  };

  // Keyboard shortcuts for reactions
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showPicker && !disabled) {
        const reaction = AVAILABLE_REACTIONS.find(r => r.shortcut === e.key.toLowerCase());
        if (reaction) {
          e.preventDefault();
          handleReaction(reaction.emoji);
        } else if (e.key === 'Escape') {
          setShowPicker(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showPicker, disabled, handleReaction]);

  return (
    <div className="relative">
      {/* Existing Reactions Display */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                userReactions.has(emoji)
                  ? 'bg-cozy-orange-100 border-cozy-orange-300 text-cozy-orange-700'
                  : 'bg-cozy-brown-50 border-cozy-brown-200 text-cozy-brown-600 hover:bg-cozy-brown-100'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => handleReaction(emoji)}
              disabled={disabled}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Add Reaction Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-dashed transition-colors ${
          disabled
            ? 'border-cozy-brown-200 text-cozy-brown-300 cursor-not-allowed'
            : showPicker
            ? 'border-cozy-orange-400 text-cozy-orange-600 bg-cozy-orange-50'
            : 'border-cozy-brown-300 text-cozy-brown-500 hover:border-cozy-orange-400 hover:text-cozy-orange-600'
        }`}
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
      >
        {isReacting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border border-current border-t-transparent rounded-full"
          />
        ) : (
          <span className="text-sm">+</span>
        )}
      </motion.button>

      {/* Reaction Picker */}
      <AnimatePresence>
        {showPicker && !disabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-cozy-brown-200 p-3 z-20"
          >
            <div className="grid grid-cols-4 gap-2">
              {AVAILABLE_REACTIONS.map((reaction, index) => (
                <motion.button
                  key={reaction.emoji}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-cozy-orange-50 transition-colors ${
                    userReactions.has(reaction.emoji)
                      ? 'bg-cozy-orange-100 ring-2 ring-cozy-orange-300'
                      : ''
                  }`}
                  onClick={() => handleReaction(reaction.emoji)}
                  title={`${reaction.name} (${reaction.shortcut})`}
                >
                  {reaction.emoji}
                </motion.button>
              ))}
            </div>
            
            {/* Keyboard shortcut hint */}
            <div className="text-xs text-cozy-brown-500 text-center mt-2 border-t border-cozy-brown-100 pt-2">
              Use keyboard shortcuts: {AVAILABLE_REACTIONS.map(r => r.shortcut).join(', ')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
