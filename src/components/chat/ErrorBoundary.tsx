'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                ⚠️ Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-cozy-brown-600">
                  We encountered an error while loading the chat. This might be a temporary issue.
                </p>
                
                {this.state.error && (
                  <details className="text-xs text-cozy-brown-500">
                    <summary className="cursor-pointer hover:text-cozy-brown-700">
                      Error details
                    </summary>
                    <pre className="mt-2 p-2 bg-cozy-brown-50 rounded overflow-x-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    🔄 Reload Page
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/'}
                    className="flex-1"
                  >
                    🏠 Go Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
