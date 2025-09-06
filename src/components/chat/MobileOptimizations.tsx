'use client';

import { ReactNode, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

interface MobileChatLayoutProps {
  children: ReactNode;
  showControls: boolean;
  onToggleControls: () => void;
}

export const MobileChatLayout = ({ 
  children, 
  showControls, 
  onToggleControls 
}: MobileChatLayoutProps) => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Detect virtual keyboard on mobile
    const detectKeyboard = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const originalHeight = window.screen.height;
      const heightDifference = originalHeight - currentHeight;
      
      // If height difference is more than 150px, keyboard is likely visible
      setIsKeyboardVisible(heightDifference > 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', detectKeyboard);
      return () => {
        window.visualViewport?.removeEventListener('resize', detectKeyboard);
      };
    }

    // Fallback for older browsers
    window.addEventListener('resize', detectKeyboard);
    return () => window.removeEventListener('resize', detectKeyboard);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] lg:h-auto relative">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Chat Content - takes most space */}
        <div className={`flex-1 overflow-hidden ${isKeyboardVisible ? 'pb-2' : 'pb-16'}`}>
          {children}
        </div>

        {/* Mobile Controls Toggle */}
        {!isKeyboardVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-4 right-4 z-30"
          >
            <Button
              onClick={onToggleControls}
              className="rounded-full w-12 h-12 shadow-lg"
              size="sm"
            >
              {showControls ? '×' : '⋯'}
            </Button>
          </motion.div>
        )}

        {/* Mobile Controls Sheet */}
        {showControls && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-0 bg-white border-t border-cozy-brown-200 p-4 z-20 rounded-t-lg shadow-xl"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-cozy-brown-800">Chat Controls</h3>
                <Button variant="ghost" size="sm" onClick={onToggleControls}>
                  ×
                </Button>
              </div>
              
              {/* Controls will be rendered here by parent component */}
            </div>
          </motion.div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        {children}
      </div>
    </div>
  );
};

interface TouchOptimizedInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TouchOptimizedInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type your message...',
  disabled = false
}: TouchOptimizedInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex gap-2 p-3 bg-white border-t border-cozy-brown-200 lg:border-0 lg:p-0">
      <div className="flex-1 relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-4 py-3 lg:py-2 rounded-full border border-cozy-brown-200 
            focus:outline-none focus:ring-2 focus:ring-cozy-orange-500 focus:border-transparent
            text-base lg:text-sm transition-all duration-200
            ${isFocused ? 'shadow-lg lg:shadow-sm' : 'shadow-sm'}
            ${disabled ? 'bg-cozy-brown-50 text-cozy-brown-400' : 'bg-white text-cozy-brown-800'}
          `}
        />
        
        {/* Character count for mobile */}
        {value.length > 100 && (
          <div className="absolute -top-6 right-2 text-xs text-cozy-brown-400">
            {value.length}/500
          </div>
        )}
      </div>
      
      <Button
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
        className="px-6 py-3 lg:px-4 lg:py-2 rounded-full text-base lg:text-sm shrink-0"
      >
        Send
      </Button>
    </div>
  );
};

export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};
