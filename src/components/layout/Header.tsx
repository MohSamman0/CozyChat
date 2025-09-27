'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Container } from './Container';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../chat/ThemeToggle';
import { CozyFireIcon } from '../ui/CozyFireIcon';

export interface HeaderProps {
  showNav?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showNav = true }) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{
        backgroundColor: 'var(--cozy-surface)',
        borderBottom: '1px solid var(--cozy-border)',
        opacity: 0.95
      }}
    >
      <Container>
        <div className="flex items-center justify-between py-4">
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ 
                background: 'var(--cozy-accent)',
                boxShadow: 'var(--cozy-shadow-sm)'
              }}
            >
              <CozyFireIcon size="sm" animated={true} className="text-white" />
            </div>
            <h1 
              className="font-display text-2xl font-bold"
              style={{ color: 'var(--cozy-text)' }}
            >
              CozyChat
            </h1>
          </motion.div>
          
          <div className="flex items-center gap-4">
            {showNav && (
              <nav className="hidden md:flex items-center space-x-6">
                <Button variant="ghost" size="sm">
                  How it Works
                </Button>
                <Button variant="ghost" size="sm">
                  Safety
                </Button>
              </nav>
            )}
            
            {/* Theme Toggle - Always visible */}
            <ThemeToggle />
            
            {showNav && (
              <div className="md:hidden">
                <Button variant="primary" size="sm">
                  Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </motion.header>
  );
};

export { Header };
