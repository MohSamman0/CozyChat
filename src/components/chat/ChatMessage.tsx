'use client';

import { motion } from 'framer-motion';
import { Message } from '@/types/message';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ChatMessageProps {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
  onReaction?: (messageId: string, reaction: string) => void;
}

const REACTIONS = ['❤️', '😊', '👍', '😢', '😮', '😡'];

export const ChatMessage = ({ 
  message, 
  isOwn, 
  showTimestamp = true,
  onReaction 
}: ChatMessageProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleReaction = (reaction: string) => {
    onReaction?.(message.id, reaction);
    setShowReactions(false);
  };

  return (
    <div className={`cozy-message-wrapper ${isOwn ? 'own' : 'stranger'} group`}>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.2,
          ease: "easeOut"
        }}
        className={`cozy-message-bubble ${isOwn ? 'own' : 'stranger'} relative`}
        whileHover={{ y: -1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowReactions(false);
        }}
      >
        {/* Message Content */}
        <div className="break-words word-wrap">{message.content}</div>
        
        {/* Message Status & Timestamp */}
        <div className="cozy-message-timestamp">
          {showTimestamp && (
            <span>
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
            </span>
          )}
          
          {isOwn && (
            <div className="cozy-message-status">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: 'currentColor' }}
              />
              <span>Sent</span>
            </div>
          )}
        </div>
        
        {/* Reaction Button - Only show on hover */}
        {isHovered && onReaction && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute -top-1 ${isOwn ? '-left-1' : '-right-1'} 
              w-6 h-6 rounded-full flex items-center justify-center text-xs 
              transition-colors z-10`}
            style={{
              backgroundColor: 'var(--cozy-surface)',
              color: 'var(--cozy-text-muted)',
              border: '1px solid var(--cozy-border)',
              boxShadow: 'var(--cozy-shadow-sm)'
            }}
            onClick={() => setShowReactions(!showReactions)}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--cozy-border-hover)';
              (e.target as HTMLElement).style.color = 'var(--cozy-text)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--cozy-surface)';
              (e.target as HTMLElement).style.color = 'var(--cozy-text-muted)';
            }}
          >
            😊
          </motion.button>
        )}
      </motion.div>

      {/* Reaction Picker */}
      {showReactions && onReaction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className={`absolute top-12 ${isOwn ? 'left-0' : 'right-0'} z-20`}
          style={{
            backgroundColor: 'var(--cozy-surface)',
            borderRadius: 'var(--cozy-r-lg)',
            boxShadow: 'var(--cozy-shadow-lg)',
            border: '1px solid var(--cozy-border)',
            padding: 'var(--cozy-sp-2)'
          }}
        >
          <div className="flex gap-1">
            {REACTIONS.map((reaction) => (
              <motion.button
                key={reaction}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors"
                onClick={() => handleReaction(reaction)}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'var(--cozy-accent)';
                  (e.target as HTMLElement).style.opacity = '0.1';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                  (e.target as HTMLElement).style.opacity = '1';
                }}
              >
                {reaction}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
