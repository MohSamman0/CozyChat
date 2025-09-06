'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle = ({ className = '', showLabel = false }: ThemeToggleProps) => {
  const { theme, toggleTheme, isLight } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a neutral icon during SSR/initial render
  if (!mounted) {
    return (
      <button
        className={`cozy-icon-button ${className}`}
        disabled
      >
        <div className="flex items-center justify-center">
          {/* Neutral theme icon that works for both themes */}
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2v20"/>
          </svg>
        </div>
      </button>
    );
  }

  return (
    <motion.button
      onClick={toggleTheme}
      className={`cozy-icon-button ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={`Switch to ${isLight ? 'warm dark' : 'warm light'} theme`}
      aria-label={`Switch to ${isLight ? 'warm dark' : 'warm light'} theme`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isLight ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex items-center justify-center"
      >
        {isLight ? (
          // Sun icon for light theme
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        ) : (
          // Moon icon for dark theme
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        )}
      </motion.div>
      {showLabel && (
        <span className="ml-2 text-sm font-medium">
          {isLight ? 'Dark' : 'Light'}
        </span>
      )}
    </motion.button>
  );
};
