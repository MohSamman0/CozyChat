import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  animate?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', animate = false, children, onClick }, ref) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'default':
          return {
            backgroundColor: 'var(--cozy-surface)',
            borderRadius: 'var(--cozy-r-2xl)',
            padding: 'var(--cozy-sp-6)',
            border: '1px solid var(--cozy-border)',
            boxShadow: 'var(--cozy-shadow-md)'
          };
        case 'elevated':
          return {
            backgroundColor: 'var(--cozy-surface)',
            borderRadius: 'var(--cozy-r-2xl)',
            padding: 'var(--cozy-sp-6)',
            border: '1px solid var(--cozy-border)',
            boxShadow: 'var(--cozy-shadow-xl)'
          };
        case 'outlined':
          return {
            backgroundColor: 'var(--cozy-surface)',
            borderRadius: 'var(--cozy-r-2xl)',
            padding: 'var(--cozy-sp-6)',
            border: '2px solid var(--cozy-accent)',
            boxShadow: 'var(--cozy-shadow-sm)'
          };
        default:
          return {
            backgroundColor: 'var(--cozy-surface)',
            borderRadius: 'var(--cozy-r-2xl)',
            padding: 'var(--cozy-sp-6)',
            border: '1px solid var(--cozy-border)',
            boxShadow: 'var(--cozy-shadow-md)'
          };
      }
    };
    
    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={className}
          style={getVariantStyles()}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClick}
        >
          {children}
        </motion.div>
      );
    }
    
    return (
      <div
        ref={ref}
        className={className}
        style={getVariantStyles()}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div ref={ref} className={cn('mb-4', className)}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => (
    <h3
      ref={ref}
      className={cn('font-display text-xl font-semibold', className)}
      style={{ color: 'var(--cozy-text)' }}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => (
    <div ref={ref} className={className} style={{ color: 'var(--cozy-text-muted)' }}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
