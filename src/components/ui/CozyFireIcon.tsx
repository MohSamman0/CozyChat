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

  // Fire flame animations - different flames flicker at different speeds
  const flame1Variants = {
    animate: {
      d: [
        // Base flame shape
        "M12 20 C8 18, 7 15, 7 12 C7 10, 8.5 9, 10 9 C10 8, 11 7, 12 7 C13 7, 14 8, 14 9 C15.5 9, 17 10, 17 12 C17 15, 16 18, 12 20 Z",
        // Flickering variations
        "M12 20 C8.5 17.5, 7.2 14.8, 7.2 12.2 C7.2 10.1, 8.7 9.1, 10.1 9.1 C10.1 7.8, 11.2 6.8, 12.1 6.8 C13 6.8, 14.1 7.9, 14.1 9.1 C15.4 9.1, 16.8 10.2, 16.8 12.2 C16.8 14.9, 15.8 17.6, 12 20 Z",
        "M12 20 C7.8 18.2, 6.8 15.2, 6.8 11.8 C6.8 9.8, 8.3 8.9, 9.9 8.9 C9.9 7.9, 10.8 6.9, 11.9 6.9 C12.9 6.9, 13.9 7.8, 13.9 8.9 C15.6 8.9, 17.2 9.7, 17.2 11.8 C17.2 15.1, 16.1 18.1, 12 20 Z",
        // Back to base
        "M12 20 C8 18, 7 15, 7 12 C7 10, 8.5 9, 10 9 C10 8, 11 7, 12 7 C13 7, 14 8, 14 9 C15.5 9, 17 10, 17 12 C17 15, 16 18, 12 20 Z"
      ],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const flame2Variants = {
    animate: {
      d: [
        // Inner flame
        "M12 17 C10 16, 9 14, 9 12.5 C9 11.5, 10 11, 11 11 C11 10.5, 11.5 10, 12 10 C12.5 10, 13 10.5, 13 11 C14 11, 15 11.5, 15 12.5 C15 14, 14 16, 12 17 Z",
        "M12 17 C10.2 15.8, 9.1 13.9, 9.1 12.6 C9.1 11.4, 10.1 10.9, 11.1 10.9 C11.1 10.3, 11.6 9.8, 12.1 9.8 C12.6 9.8, 13.1 10.4, 13.1 10.9 C14.1 10.9, 14.9 11.3, 14.9 12.6 C14.9 13.8, 13.9 15.7, 12 17 Z",
        "M12 17 C9.9 15.9, 8.9 14.1, 8.9 12.4 C8.9 11.6, 9.8 11.1, 10.9 11.1 C10.9 10.6, 11.4 10.1, 11.9 10.1 C12.4 10.1, 12.9 10.5, 12.9 11.1 C13.9 11.1, 15.1 11.5, 15.1 12.4 C15.1 14.0, 14.2 15.8, 12 17 Z",
        "M12 17 C10 16, 9 14, 9 12.5 C9 11.5, 10 11, 11 11 C11 10.5, 11.5 10, 12 10 C12.5 10, 13 10.5, 13 11 C14 11, 15 11.5, 15 12.5 C15 14, 14 16, 12 17 Z"
      ],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
        delay: 0.3
      }
    }
  };

  // Glow animation
  const glowVariants = {
    animate: {
      opacity: [0.4, 0.7, 0.5, 0.6, 0.4],
      scale: [1, 1.1, 1.05, 1.08, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const FirePath1 = animated ? motion.path : 'path';
  const FirePath2 = animated ? motion.path : 'path';
  const GlowCircle = animated ? motion.circle : 'circle';

  return (
    <div className={`${baseClasses} relative flex items-center justify-center`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Fire gradients */}
          <linearGradient id="outerFlameGradient" x1="12" y1="7" x2="12" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="30%" stopColor="#FF8C00" />
            <stop offset="70%" stopColor="#FF6347" />
            <stop offset="100%" stopColor="#DC143C" />
          </linearGradient>
          
          <linearGradient id="innerFlameGradient" x1="12" y1="10" x2="12" y2="17" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFF700" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FF8C00" />
          </linearGradient>
          
          <radialGradient id="glowGradient" cx="12" cy="14" r="8" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#FF6347" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FF6347" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Glow effect */}
        {animated && (
          <GlowCircle
            cx="12"
            cy="14"
            r="8"
            fill="url(#glowGradient)"
            variants={glowVariants}
            animate="animate"
          />
        )}

        {/* Outer flame */}
        <FirePath1
          d="M12 20 C8 18, 7 15, 7 12 C7 10, 8.5 9, 10 9 C10 8, 11 7, 12 7 C13 7, 14 8, 14 9 C15.5 9, 17 10, 17 12 C17 15, 16 18, 12 20 Z"
          fill="url(#outerFlameGradient)"
          variants={animated ? flame1Variants : undefined}
          animate={animated ? "animate" : undefined}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(255, 99, 71, 0.3))' }}
        />

        {/* Inner flame */}
        <FirePath2
          d="M12 17 C10 16, 9 14, 9 12.5 C9 11.5, 10 11, 11 11 C11 10.5, 11.5 10, 12 10 C12.5 10, 13 10.5, 13 11 C14 11, 15 11.5, 15 12.5 C15 14, 14 16, 12 17 Z"
          fill="url(#innerFlameGradient)"
          variants={animated ? flame2Variants : undefined}
          animate={animated ? "animate" : undefined}
        />

        {/* Hot core */}
        <circle
          cx="12"
          cy="13"
          r="2"
          fill="#FFFF99"
          opacity="0.8"
          style={{ filter: 'blur(1px)' }}
        />
      </svg>
    </div>
  );
};

export default CozyFireIcon;