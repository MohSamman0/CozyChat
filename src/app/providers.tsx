'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize global theme on app startup
  const { theme } = useTheme();
  
  useEffect(() => {
    // Ensure theme is applied on app initialization
    // Theme system is now ready
  }, [theme]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </Provider>
  );
}