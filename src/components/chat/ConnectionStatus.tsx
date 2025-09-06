'use client';

import { motion } from 'framer-motion';
import { useAppSelector } from '@/store';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus = ({ className = '' }: ConnectionStatusProps) => {
  const { status, metrics } = useAppSelector(state => state.connection);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500',
          text: 'Connected',
          icon: '🟢',
          details: `${metrics.latency}ms`
        };
      case 'connecting':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500',
          text: 'Connecting',
          icon: '🟡',
          details: 'Establishing connection...'
        };
      case 'reconnecting':
        return {
          color: 'text-orange-500',
          bgColor: 'bg-orange-500',
          text: 'Reconnecting',
          icon: '🟠',
          details: `Attempt ${metrics.reconnectAttempts}/${metrics.maxReconnectAttempts}`
        };
      case 'error':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500',
          text: 'Connection Error',
          icon: '🔴',
          details: 'Trying to reconnect...'
        };
      case 'disconnected':
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500',
          text: 'Disconnected',
          icon: '⚫',
          details: 'Not connected'
        };
    }
  };

  const statusConfig = getStatusConfig();

  const getConnectionQuality = () => {
    if (status !== 'connected' || !metrics.latency) return null;
    
    const latency = metrics.latency;
    if (latency < 100) return { quality: 'Excellent', color: 'text-green-600' };
    if (latency < 300) return { quality: 'Good', color: 'text-yellow-600' };
    if (latency < 500) return { quality: 'Fair', color: 'text-orange-600' };
    return { quality: 'Poor', color: 'text-red-600' };
  };

  const qualityInfo = getConnectionQuality();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 text-sm ${className}`}
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={status === 'connecting' || status === 'reconnecting' ? 
            { scale: [1, 1.2, 1] } : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
          className={`w-2 h-2 rounded-full ${statusConfig.bgColor}`}
        />
        <span className={`font-medium ${statusConfig.color}`}>
          {statusConfig.text}
        </span>
      </div>

      {/* Connection Details */}
      {status === 'connected' && qualityInfo && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-cozy-brown-400">•</span>
          <span className={qualityInfo.color}>
            {qualityInfo.quality}
          </span>
          <span className="text-cozy-brown-400">
            ({metrics.latency}ms)
          </span>
        </div>
      )}

      {/* Error or Connecting Details */}
      {(status === 'error' || status === 'reconnecting' || status === 'connecting') && (
        <div className="text-xs text-cozy-brown-500">
          {statusConfig.details}
        </div>
      )}
    </motion.div>
  );
};
