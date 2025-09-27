import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, onClick, type = 'button' }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizes = {
      sm: 'px-4 py-2 text-sm rounded-xl',
      md: 'px-6 py-3 text-base rounded-2xl',
      lg: 'px-8 py-4 text-lg rounded-2xl',
    };
    
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: 'var(--cozy-accent)',
            color: 'var(--cozy-accent-contrast)',
            boxShadow: 'var(--cozy-shadow-md)',
            border: 'none'
          };
        case 'secondary':
          return {
            backgroundColor: 'var(--cozy-surface-2)',
            color: 'var(--cozy-text)',
            boxShadow: 'var(--cozy-shadow-sm)',
            border: '1px solid var(--cozy-border)'
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            color: 'var(--cozy-accent)',
            border: '2px solid var(--cozy-accent)',
            boxShadow: 'none'
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: 'var(--cozy-text-muted)',
            border: 'none',
            boxShadow: 'none'
          };
        default:
          return {};
      }
    };
    
    const motionProps: HTMLMotionProps<'button'> = {
      whileHover: !disabled && !isLoading ? { scale: variant === 'ghost' ? 1 : 1.05 } : {},
      whileTap: !disabled && !isLoading ? { scale: variant === 'ghost' ? 0.98 : 0.95 } : {},
    };
    
    return (
      <motion.button
        ref={ref}
        type={type}
        className={cn(baseClasses, sizes[size], className)}
        style={getVariantStyles()}
        disabled={disabled || isLoading}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (disabled || isLoading) return;
          const target = e.target as HTMLElement;
          switch (variant) {
            case 'primary':
              target.style.backgroundColor = 'var(--cozy-accent-hover)';
              target.style.boxShadow = 'var(--cozy-shadow-lg)';
              break;
            case 'secondary':
              target.style.backgroundColor = 'var(--cozy-border-hover)';
              break;
            case 'outline':
              target.style.backgroundColor = 'var(--cozy-accent)';
              target.style.color = 'var(--cozy-accent-contrast)';
              break;
            case 'ghost':
              target.style.backgroundColor = 'var(--cozy-border-hover)';
              target.style.color = 'var(--cozy-text)';
              break;
          }
        }}
        onMouseLeave={(e) => {
          if (disabled || isLoading) return;
          const target = e.target as HTMLElement;
          const originalStyles = getVariantStyles();
          Object.keys(originalStyles).forEach((key) => {
            (target.style as any)[key] = (originalStyles as any)[key];
          });
        }}
        {...motionProps}
      >
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
