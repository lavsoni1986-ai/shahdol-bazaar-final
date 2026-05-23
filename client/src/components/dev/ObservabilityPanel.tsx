// Sovereign Observability Panel
// Development debugging overlay for React Query and API operations
// Shows cache status, response times, district context, and telemetry

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDistrict } from '@/contexts/DistrictContext';
import { X, Eye, EyeOff, Zap, Clock, Database, MapPin } from 'lucide-react';

interface ObservabilityPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ObservabilityPanel({ isOpen, onToggle }: ObservabilityPanelProps) {
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const [queryCache, setQueryCache] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Get current query cache state
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll().map(query => ({
        key: query.queryKey,
        state: query.state,
        dataUpdatedAt: query.state.dataUpdatedAt,
        errorUpdatedAt: query.state.errorUpdatedAt,
        isStale: query.isStale(),
        observersCount: query.getObserversCount()
      }));
      setQueryCache(queries);
    }
  }, [isOpen, queryClient]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-orange-500/20 border border-orange-500/50 text-orange-400 px-3 py-2 rounded-lg text-xs font-mono hover:bg-orange-500/30 transition"
      >
        <Eye size={14} className="inline mr-1" />
        OBSERVE
      </button>
    );
  }

  const formatTime = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getQueryStatusColor = (query: any) => {
    if (query.state.error) return 'text-red-400';
    if (query.state.isFetching) return 'text-blue-400';
    if (query.isStale) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 border border-orange-500/50 rounded-lg p-4 max-w-md max-h-96 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-orange-400 font-mono text-sm font-bold flex items-center gap-2">
          <Zap size={14} />
          SOVEREIGN OBSERVABILITY
        </h3>
        <button
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      {/* District Context */}
      <div className="mb-3 p-2 bg-gray-800/50 rounded">
        <div className="flex items-center gap-2 text-xs text-gray-300 mb-1">
          <MapPin size={12} />
          <span className="font-mono">DISTRICT CONTEXT</span>
        </div>
        <div className="text-xs font-mono">
          <div>ID: {currentDistrict?.id || 'null'}</div>
          <div>Slug: {currentDistrict?.slug || 'null'}</div>
          <div>Name: {currentDistrict?.name || 'null'}</div>
        </div>
      </div>

      {/* Query Cache Status */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
          <Database size={12} />
          <span className="font-mono">REACT QUERY CACHE ({queryCache.length})</span>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {queryCache.map((query, index) => (
            <div key={index} className="text-xs font-mono p-1 bg-gray-800/30 rounded">
              <div className={`font-bold ${getQueryStatusColor(query)}`}>
                {JSON.stringify(query.key)}
              </div>
              <div className="text-gray-400 mt-1">
                <Clock size={10} className="inline mr-1" />
                Updated: {formatTime(query.dataUpdatedAt)}
              </div>
              <div className="text-gray-500">
                Observers: {query.observersCount} | Stale: {query.isStale ? 'Yes' : 'No'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="text-xs text-gray-400 font-mono">
        <div>🔍 Open DevTools → Network for API timing</div>
        <div>📊 Check console for [TRANSPORT] logs</div>
        <div>🎯 Sovereign governance active</div>
      </div>
    </div>
  );
}

// Hook to integrate observability into components
export function useObservability() {
  const [metrics, setMetrics] = useState({
    apiCalls: 0,
    cacheHits: 0,
    responseTime: 0,
    lastUpdate: Date.now()
  });

  const trackApiCall = (duration: number, success: boolean) => {
    setMetrics(prev => ({
      ...prev,
      apiCalls: prev.apiCalls + 1,
      responseTime: duration,
      lastUpdate: Date.now()
    }));
  };

  const trackCacheHit = () => {
    setMetrics(prev => ({
      ...prev,
      cacheHits: prev.cacheHits + 1,
      lastUpdate: Date.now()
    }));
  };

  return {
    metrics,
    trackApiCall,
    trackCacheHit
  };
}