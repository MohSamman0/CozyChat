'use client';

import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  variant?: 'chat' | 'lobby' | 'error';
}

export const AnimatedBackground = ({ 
  children, 
  variant = 'chat' 
}: AnimatedBackgroundProps) => {
  const getBackgroundConfig = () => {
    switch (variant) {
      case 'chat':
        return {
          from: 'from-cozy-cream-50',
          via: 'via-cozy-orange-50',
          to: 'to-cozy-gold-50',
          particles: 6,
          colors: ['cozy-orange-200', 'cozy-gold-200', 'cozy-cream-200']
        };
      case 'lobby':
        return {
          from: 'from-cozy-orange-50',
          via: 'via-cozy-gold-50', 
          to: 'to-cozy-cream-50',
          particles: 8,
          colors: ['cozy-gold-300', 'cozy-orange-300', 'cozy-cream-300']
        };
      case 'error':
        return {
          from: 'from-red-50',
          via: 'via-cozy-cream-50',
          to: 'to-cozy-orange-50',
          particles: 4,
          colors: ['red-200', 'cozy-brown-200']
        };
      default:
        return {
          from: 'from-cozy-cream-50',
          via: 'via-cozy-orange-50', 
          to: 'to-cozy-gold-50',
          particles: 6,
          colors: ['cozy-orange-200', 'cozy-gold-200']
        };
    }
  };

  const config = getBackgroundConfig();

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.from} ${config.via} ${config.to} relative overflow-hidden`}>
      {/* Animated Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: config.particles }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 bg-${config.colors[i % config.colors.length]} rounded-full opacity-30`}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * (window?.innerWidth || 1200),
              y: Math.random() * (window?.innerHeight || 800),
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
              delay: i * 2,
            }}
          />
        ))}
      </div>

      {/* Subtle Floating Shapes */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`shape-${i}`}
            className={`absolute w-20 h-20 bg-gradient-to-br from-${config.colors[0]} to-${config.colors[1]} rounded-full opacity-10`}
            initial={{
              x: Math.random() * (window?.innerWidth || 1200),
              y: Math.random() * (window?.innerHeight || 800),
              scale: 0.5 + Math.random() * 0.5,
            }}
            animate={{
              x: Math.random() * (window?.innerWidth || 1200),
              y: Math.random() * (window?.innerHeight || 800),
              scale: 0.3 + Math.random() * 0.7,
              rotate: 360,
            }}
            transition={{
              duration: 30 + Math.random() * 20,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
              delay: i * 5,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

interface FloatingElementProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  intensity?: number;
}

export const FloatingElement = ({ 
  children, 
  delay = 0, 
  duration = 3,
  intensity = 10 
}: FloatingElementProps) => {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-intensity, intensity, -intensity] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};

export const PulsingElement = ({ 
  children,
  delay = 0,
  scale = 1.05,
  duration = 2
}: {
  children: React.ReactNode;
  delay?: number;
  scale?: number;
  duration?: number;
}) => {
  return (
    <motion.div
      initial={{ scale: 1 }}
      animate={{ scale: [1, scale, 1] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};
