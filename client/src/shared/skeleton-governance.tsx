// Sovereign Skeleton Governance
// Centralized loading, empty, and error state management
// Prevents UI state divergence and improves UX consistency

import React from 'react';

export type SkeletonState = 'loading' | 'empty' | 'error' | 'success';

export interface SkeletonConfig {
  state: SkeletonState;
  loading?: {
    skeleton: React.ReactNode;
    message?: string;
  };
  empty?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  error?: {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    retry?: () => void;
  };
}

// Sovereign Skeleton Renderer
export function renderSkeletonState(config: SkeletonConfig): React.ReactNode {
  switch (config.state) {
    case 'loading':
      return config.loading?.skeleton || <DefaultLoadingSkeleton />;

    case 'empty':
      return (
        <div className="text-center py-12">
          {config.empty?.icon}
          <h3 className="text-lg font-semibold text-white mb-2">
            {config.empty?.title}
          </h3>
          {config.empty?.description && (
            <p className="text-white/60 mb-4">
              {config.empty.description}
            </p>
          )}
          {config.empty?.action}
        </div>
      );

    case 'error':
      return (
        <div className="text-center py-12">
          {config.error?.icon}
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            {config.error?.title || 'Something went wrong'}
          </h3>
          {config.error?.description && (
            <p className="text-white/60 mb-4">
              {config.error.description}
            </p>
          )}
          {config.error?.retry && (
            <button
              onClick={config.error.retry}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
            >
              Try Again
            </button>
          )}
        </div>
      );

    case 'success':
      return null; // Component renders its content

    default:
      return null;
  }
}

// Pre-configured skeleton states for common use cases
export const SKELETON_PRESETS = {
  // Generic loading skeleton
  loading: {
    state: 'loading' as const,
    loading: {
      skeleton: <DefaultLoadingSkeleton />,
      message: 'Loading...'
    }
  },

  // District data loading
  districtLoading: {
    state: 'loading' as const,
    loading: {
      skeleton: (
        <div className="space-y-4">
          <div className="h-8 bg-white/10 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ),
      message: 'Loading district data...'
    }
  },

  // No services found
  noServices: {
    state: 'empty' as const,
    empty: {
      title: 'No service providers found',
      description: 'We could not find any approved service providers for this district yet.',
    }
  },

  // No vendors found
  noVendors: {
    state: 'empty' as const,
    empty: {
      title: 'No shops available',
      description: 'We could not find any approved shops for this district yet.',
    }
  },

  // API error
  apiError: {
    state: 'error' as const,
    error: {
      title: 'Failed to load data',
      description: 'There was an error loading the data. Please try again.',
    }
  }
};

// Default loading skeleton
function DefaultLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 bg-white/10 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-white/10 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Hook for managing skeleton state
export function useSkeletonState(initialState: SkeletonState = 'loading') {
  const [state, setState] = React.useState<SkeletonState>(initialState);

  const setLoading = () => setState('loading');
  const setEmpty = () => setState('empty');
  const setError = () => setState('error');
  const setSuccess = () => setState('success');

  return {
    state,
    setState,
    setLoading,
    setEmpty,
    setError,
    setSuccess
  };
}