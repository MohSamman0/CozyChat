'use client';

import { motion } from 'framer-motion';

export const ChatSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Status Skeleton */}
      <div className="bg-white rounded-lg p-6 border border-cozy-brown-100">
        <div className="text-center space-y-3">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-12 h-12 bg-cozy-orange-100 rounded-full mx-auto"
          />
          <div className="space-y-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="h-6 bg-cozy-brown-100 rounded mx-auto w-48"
            />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="h-4 bg-cozy-brown-50 rounded mx-auto w-64"
            />
          </div>
        </div>
      </div>

      {/* Chat Messages Skeleton */}
      <div className="bg-white rounded-lg border border-cozy-brown-100">
        <div className="p-4 border-b border-cozy-brown-50">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-6 bg-cozy-brown-100 rounded w-32"
          />
        </div>
        
        <div className="p-4 space-y-4">
          {/* Message Skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                className={`max-w-xs rounded-2xl p-4 ${
                  i % 2 === 0 
                    ? 'bg-cozy-orange-100' 
                    : 'bg-cozy-brown-50'
                }`}
              >
                <div className="space-y-2">
                  <div className="h-4 bg-white/50 rounded w-full" />
                  <div className="h-4 bg-white/50 rounded w-3/4" />
                  <div className="h-3 bg-white/30 rounded w-16" />
                </div>
              </motion.div>
            </div>
          ))}
        </div>
        
        {/* Input Skeleton */}
        <div className="p-4 border-t border-cozy-brown-50">
          <div className="flex gap-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex-1 h-10 bg-cozy-brown-50 rounded-lg"
            />
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              className="w-20 h-10 bg-cozy-orange-100 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
