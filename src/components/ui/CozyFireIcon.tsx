'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface CozyFireIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animated?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
};

export const CozyFireIcon: React.FC<CozyFireIconProps> = ({ 
  size = 'md', 
  className = '',
  animated = true 
}) => {
  const baseClasses = `${sizeClasses[size]} ${className}`;

  // Fire animation variants
  const fireVariants = {
    initial: { 
      scale: 1,
      rotate: 0,
      filter: 'brightness(1) saturate(1)'
    },
    animate: {
      scale: [1, 1.05, 1, 1.03, 1],
      rotate: [0, 2, -1, 1, 0],
      filter: [
        'brightness(1) saturate(1)',
        'brightness(1.1) saturate(1.2)',
        'brightness(0.95) saturate(0.9)',
        'brightness(1.05) saturate(1.1)',
        'brightness(1) saturate(1)'
      ],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Sparkle animation variants
  const sparkleVariants = {
    initial: { 
      opacity: 0,
      scale: 0,
      rotate: 0
    },
    animate: {
      opacity: [0, 1, 0],
      scale: [0, 1, 0],
      rotate: [0, 180, 360],
      transition: {
        duration: 2,
        repeat: Infinity,
        delay: Math.random() * 2,
        ease: "easeInOut"
      }
    }
  };

  const FireIcon = animated ? motion.svg : 'svg';
  const SparkleIcon = animated ? motion.circle : 'circle';

  return (
    <div className={`${baseClasses} relative flex items-center justify-center`}>
      {/* Main Fire Icon */}
      <FireIcon
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        variants={animated ? fireVariants : undefined}
        initial={animated ? "initial" : undefined}
        animate={animated ? "animate" : undefined}
      >
        {/* Fire base */}
        <path
          d="M12 22C12 22 8 18 8 14C8 12.8954 8.89543 12 10 12C10 10.8954 10.8954 10 12 10C12 8.89543 12.8954 8 14 8C14 6.89543 14.8954 6 16 6C16 4.89543 16.8954 4 18 4C18 2.89543 17.1046 2 16 2C14.8954 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 9.10457 2 8 2C6.89543 2 6 2.89543 6 4C6 5.10457 6.89543 6 8 6C8 7.10457 8.89543 8 10 8C10 9.10457 10.8954 10 12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 9.10457 10 8 10C6.89543 10 6 10.8954 6 12C6 13.1046 6.89543 14 8 14C8 16.2091 9.79086 18 12 18C14.2091 18 16 16.2091 16 14C16 12.8954 16.8954 12 18 12C19.1046 12 20 12.8954 20 14C20 16.2091 18.2091 18 16 18C14.8954 18 14 17.1046 14 16C14 14.8954 13.1046 14 12 14V22Z"
          fill="url(#fireGradient)"
          className="drop-shadow-sm"
        />
        
        {/* Fire gradient */}
        <defs>
          <linearGradient id="fireGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B35" />
            <stop offset="0.3" stopColor="#F7931E" />
            <stop offset="0.6" stopColor="#FFD23F" />
            <stop offset="1" stopColor="#FF6B35" />
          </linearGradient>
          
          {/* Sparkle gradient */}
          <radialGradient id="sparkleGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFA500" />
          </radialGradient>
        </defs>
      </FireIcon>

      {/* Animated Sparkles */}
      {animated && (
        <>
          <SparkleIcon
            cx="6"
            cy="8"
            r="1"
            fill="url(#sparkleGradient)"
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute"
          />
          <SparkleIcon
            cx="18"
            cy="10"
            r="0.8"
            fill="url(#sparkleGradient)"
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute"
          />
          <SparkleIcon
            cx="8"
            cy="16"
            r="0.6"
            fill="url(#sparkleGradient)"
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute"
          />
          <SparkleIcon
            cx="16"
            cy="18"
            r="0.7"
            fill="url(#sparkleGradient)"
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute"
          />
        </>
      )}
    </div>
  );
};

export default CozyFireIcon;
