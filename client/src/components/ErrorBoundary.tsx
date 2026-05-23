// client/src/components/ErrorBoundary.tsx
// ============================================
// SOVEREIGN ERROR BOUNDARY — NO MORE WHITE SCREENS
// ============================================
// Includes:
// - Retry button (attempts to re-render children)
// - Clear Cache & Retry button
// - Checkout-specific fallback
// - Error ID for debugging
// - Structured error logging

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Trash2, Bug, AlertTriangle, ShoppingBag } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** SOVEREIGN: Context identifier for better error grouping */
  contextName?: string;
  /** SOVEREIGN: Called when error is cleared after retry */
  onRecovery?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  /** SOVEREIGN: Unique error ID for debugging */
  errorId: string;
  /** SOVEREIGN: Number of consecutive errors (for circuit breaker) */
  errorCount: number;
}

function generateErrorId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ERR-${timestamp}-${random}`;
}

/**
 * Helper to clear cart-related localStorage entries
 */
function clearCartCache() {
  try {
    // Clear all cart storage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cart_') || key === 'guest_cart')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 [ERROR BOUNDARY] Cart cache cleared:', keysToRemove.length, 'entries');
  } catch (e) {
    console.warn('⚠️ [ERROR BOUNDARY] Could not clear cache:', e);
  }
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: generateErrorId(),
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ [ERROR BOUNDARY] Caught error:', {
      errorId: this.state.errorId,
      context: this.props.contextName || 'unknown',
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));
  }

  /**
   * SOVEREIGN: Retry — resets error state so children re-render
   */
  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: generateErrorId(),
    }, () => {
      this.props.onRecovery?.();
    });
  };

  /**
   * SOVEREIGN: Clear cache and retry — more aggressive recovery
   */
  handleClearAndRetry = () => {
    clearCartCache();
    this.handleRetry();
  };

  render() {
    if (this.state.hasError) {
      // SOVEREIGN: Custom fallback takes priority
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // SOVEREIGN: Circuit breaker — if too many consecutive errors, show aggressive recovery
      const isCircuitBreakerActive = this.state.errorCount >= 3;
      const isCheckoutContext = this.props.contextName?.toLowerCase().includes('checkout');

      // Checkout-specific fallback with cart recovery
      if (isCheckoutContext) {
        return (
          <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-2">
                Checkout Error
              </h1>
              <p className="text-slate-400 mb-2">
                We encountered an issue while processing your checkout.
              </p>
              <p className="text-xs text-slate-500 mb-6 font-mono">
                Error ID: {this.state.errorId}
              </p>

              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>

                <button
                  onClick={this.handleClearAndRetry}
                  className="w-full border border-slate-700 hover:bg-slate-800 text-slate-300 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Cart Cache & Retry
                </button>

                <a
                  href="/"
                  className="block text-sm text-slate-500 hover:text-slate-300 py-2 transition-colors"
                >
                  ← Return to Home
                </a>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <summary className="cursor-pointer text-sm font-medium text-slate-400">
                    <Bug className="h-3 w-3 inline mr-1" />
                    Error Details (Development Only)
                  </summary>
                  <pre className="text-xs text-slate-500 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {'\n\nComponent Stack:\n'}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      // Default fallback
      return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-2">
              {this.props.contextName
                ? `An error occurred in the ${this.props.contextName} section.`
                : "We're sorry for the inconvenience."}
            </p>
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Error ID: {this.state.errorId}
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <button
                onClick={this.handleClearAndRetry}
                className="w-full border border-orange-200 hover:bg-orange-50 text-orange-700 font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cache & Retry
              </button>

              <a
                href="/"
                className="block text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                ← Return to Homepage
              </a>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  <Bug className="h-3 w-3 inline mr-1" />
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {'\n\nComponent Stack:\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  contextName?: string
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} contextName={contextName}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export { ErrorBoundary };
