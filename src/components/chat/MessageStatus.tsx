'use client';

import { motion } from 'framer-motion';

export type MessageStatusType = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: MessageStatusType;
  timestamp?: Date;
  showAnimation?: boolean;
}

export const MessageStatus = ({ 
  status, 
  timestamp, 
  showAnimation = true 
}: MessageStatusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'sending':
        return {
          icon: '⏳',
          text: 'Sending...',
          color: 'text-cozy-brown-400',
          bgColor: 'bg-cozy-brown-100',
          animate: true
        };
      case 'sent':
        return {
          icon: '✓',
          text: 'Sent',
          color: 'text-cozy-orange-500',
          bgColor: 'bg-cozy-orange-100',
          animate: false
        };
      case 'delivered':
        return {
          icon: '✓✓',
          text: 'Delivered',
          color: 'text-cozy-orange-600',
          bgColor: 'bg-cozy-orange-200',
          animate: false
        };
      case 'read':
        return {
          icon: '👁️',
          text: 'Read',
          color: 'text-cozy-green-600',
          bgColor: 'bg-cozy-green-100',
          animate: false
        };
      case 'failed':
        return {
          icon: '❌',
          text: 'Failed to send',
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          animate: false
        };
      default:
        return {
          icon: '?',
          text: 'Unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100',
          animate: false
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-1 text-xs">
      {/* Status Indicator */}
      <motion.div
        initial={showAnimation ? { scale: 0 } : {}}
        animate={showAnimation ? { scale: 1 } : {}}
        transition={{ duration: 0.2, delay: 0.1 }}
        className={`flex items-center justify-center w-4 h-4 rounded-full ${config.bgColor}`}
      >
        <motion.span
          animate={config.animate ? { rotate: 360 } : {}}
          transition={config.animate ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
          className={`text-xs ${config.color}`}
        >
          {config.icon}
        </motion.span>
      </motion.div>

      {/* Status Text */}
      <motion.span
        initial={showAnimation ? { opacity: 0 } : {}}
        animate={showAnimation ? { opacity: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={config.color}
      >
        {config.text}
      </motion.span>

      {/* Timestamp */}
      {timestamp && (
        <>
          <span className="text-cozy-brown-300 mx-1">•</span>
          <motion.span
            initial={showAnimation ? { opacity: 0 } : {}}
            animate={showAnimation ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="text-cozy-brown-400"
          >
            {timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </motion.span>
        </>
      )}
    </div>
  );
};

interface BatchMessageStatusProps {
  messages: Array<{
    id: string;
    status: MessageStatusType;
    timestamp: Date;
  }>;
  compact?: boolean;
}

export const BatchMessageStatus = ({ 
  messages, 
  compact = false 
}: BatchMessageStatusProps) => {
  if (messages.length === 0) return null;

  // Get the latest status
  const latestMessage = messages[messages.length - 1];
  const allSent = messages.every(msg => 
    ['sent', 'delivered', 'read'].includes(msg.status)
  );
  const anySending = messages.some(msg => msg.status === 'sending');
  const anyFailed = messages.some(msg => msg.status === 'failed');

  if (compact) {
    if (anySending) {
      return <MessageStatus status="sending" showAnimation={true} />;
    }
    if (anyFailed) {
      return <MessageStatus status="failed" showAnimation={false} />;
    }
    if (allSent) {
      return (
        <div className="flex items-center gap-1 text-xs text-cozy-orange-500">
          <span>✓</span>
          <span>{messages.length} sent</span>
        </div>
      );
    }
  }

  return (
    <MessageStatus 
      status={latestMessage.status} 
      timestamp={latestMessage.timestamp}
      showAnimation={false}
    />
  );
};
