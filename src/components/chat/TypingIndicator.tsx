'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  isVisible: boolean;
  username?: string;
}

export const TypingIndicator = ({ isVisible, username = "Stranger" }: TypingIndicatorProps) => {
  if (!isVisible) return null;

  return (
    <div className="cozy-typing-indicator">
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ 
          duration: 0.2,
          ease: "easeOut"
        }}
        className="cozy-typing-bubble"
      >
        <span>{username} is typing</span>
        <div className="cozy-typing-dots">
          <div className="cozy-typing-dot" />
          <div className="cozy-typing-dot" />
          <div className="cozy-typing-dot" />
        </div>
      </motion.div>
    </div>
  );
};
