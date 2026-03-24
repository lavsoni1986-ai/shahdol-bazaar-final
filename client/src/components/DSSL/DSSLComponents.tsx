/**
 * DSSL Protected Badge Component
 * Displays "DSSL Protected" badge for marketplace footer
 */

import React, { useEffect, useState } from 'react';
import { Shield, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface DSSLBadgeProps {
  score?: number;
  level?: 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  showScore?: boolean;
  compact?: boolean;
}

const getRiskColor = (level?: string) => {
  switch (level) {
    case 'SAFE':
      return 'text-green-600';
    case 'LOW_RISK':
      return 'text-blue-600';
    case 'MEDIUM_RISK':
      return 'text-yellow-600';
    case 'HIGH_RISK':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const getRiskBgColor = (level?: string) => {
  switch (level) {
    case 'SAFE':
      return 'bg-green-50 border-green-200';
    case 'LOW_RISK':
      return 'bg-blue-50 border-blue-200';
    case 'MEDIUM_RISK':
      return 'bg-yellow-50 border-yellow-200';
    case 'HIGH_RISK':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const getRiskIcon = (level?: string) => {
  switch (level) {
    case 'SAFE':
      return CheckCircle;
    case 'LOW_RISK':
      return AlertCircle;
    case 'MEDIUM_RISK':
      return AlertTriangle;
    case 'HIGH_RISK':
      return AlertTriangle;
    default:
      return Shield;
  }
};

export const DSSLBadge: React.FC<DSSLBadgeProps> = ({
  score = 25,
  level = 'SAFE',
  showScore = false,
  compact = false,
}) => {
  const RiskIcon = getRiskIcon(level);
  const colorClass = getRiskColor(level);
  const bgClass = getRiskBgColor(level);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${bgClass} ${colorClass}`}
      >
        <Shield size={14} />
        <span>DSSL Protected</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg border ${bgClass}`}>
      <div className="flex-shrink-0">
        <RiskIcon size={20} className={colorClass} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${colorClass}`}>
          DSSL Protected Marketplace
        </p>
        <p className="text-xs text-gray-600">
          Your transactions are secured by our Digital Safety Signals Layer
        </p>
      </div>
      {showScore && (
        <div className="ml-auto">
          <div className="text-right">
            <p className="text-xs text-gray-600">Safety Score</p>
            <p className={`text-lg font-bold ${colorClass}`}>{score}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Safety Score Card Component
 * Displays detailed safety metrics for admin dashboard
 */

interface SafetyScoreBreakdown {
  ip_reputation: number;
  email_verification: number;
  device_fingerprint: number;
  behavioral_pattern: number;
  transaction_velocity: number;
  account_age: number;
  geographic_anomaly: number;
  credential_strength: number;
}

interface SafetyScoreCardProps {
  overallScore: number;
  level: 'SAFE' | 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  breakdown?: SafetyScoreBreakdown;
  threats?: string[];
  userId?: string;
  timestamp?: Date;
}

export const SafetyScoreCard: React.FC<SafetyScoreCardProps> = ({
  overallScore,
  level,
  breakdown,
  threats = [],
  userId,
  timestamp,
}) => {
  const colorClass = getRiskColor(level);
  const bgClass = getRiskBgColor(level);
  const RiskIcon = getRiskIcon(level);

  const getCategoryScore = (key: string): number => {
    return breakdown?.[key as keyof SafetyScoreBreakdown] ?? 0;
  };

  const getScoreBar = (score: number) => {
    const percent = (score / 100) * 100;
    const barColor =
      score <= 25
        ? 'bg-green-500'
        : score <= 50
          ? 'bg-blue-500'
          : score <= 75
            ? 'bg-yellow-500'
            : 'bg-red-500';

    return (
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  return (
    <div className={`rounded-lg border p-4 ${bgClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <RiskIcon size={24} className={colorClass} />
          <div>
            <h3 className="font-semibold text-gray-900">Safety Score</h3>
            {userId && (
              <p className="text-xs text-gray-600">User: {userId}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${colorClass}`}>
            {overallScore}
          </div>
          <div className="text-xs font-medium text-gray-600">
            {level.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* Overall Score Bar */}
      <div className="mb-4">
        {getScoreBar(overallScore)}
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>Safe</span>
          <span>High Risk</span>
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-xs font-semibold text-gray-900 mb-3">
            Risk Breakdown
          </p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-700 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs font-medium text-gray-900">
                    {value}
                  </span>
                </div>
                {getScoreBar(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats */}
      {threats.length > 0 && (
        <div className="mb-4 pb-4 border-b border-gray-300">
          <p className="text-xs font-semibold text-gray-900 mb-2">
            Detected Threats
          </p>
          <div className="space-y-2">
            {threats.map((threat, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 bg-red-100 rounded text-xs text-red-900"
              >
                <AlertTriangle size={12} />
                <span>{threat.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      {timestamp && (
        <p className="text-xs text-gray-600">
          Assessed: {new Date(timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
};

/**
 * Risk Distribution Chart Component (for dashboard)
 */

interface RiskDistribution {
  safe: number;
  low_risk: number;
  medium_risk: number;
  high_risk: number;
}

interface RiskDistributionChartProps {
  data: RiskDistribution;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({
  data,
}) => {
  const total = data.safe + data.low_risk + data.medium_risk + data.high_risk;
  const safe_percent = total > 0 ? ((data.safe / total) * 100).toFixed(1) : 0;
  const low_percent = total > 0 ? ((data.low_risk / total) * 100).toFixed(1) : 0;
  const medium_percent =
    total > 0 ? ((data.medium_risk / total) * 100).toFixed(1) : 0;
  const high_percent =
    total > 0 ? ((data.high_risk / total) * 100).toFixed(1) : 0;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Risk Distribution</h3>

      {/* Horizontal Stacked Bar */}
      <div className="flex gap-1 rounded-full overflow-hidden mb-4 h-8">
        {data.safe > 0 && (
          <div
            className="bg-green-500 hover:opacity-80 transition-opacity"
            style={{ width: `${safe_percent}%` }}
            title={`Safe: ${data.safe}`}
          />
        )}
        {data.low_risk > 0 && (
          <div
            className="bg-blue-500 hover:opacity-80 transition-opacity"
            style={{ width: `${low_percent}%` }}
            title={`Low Risk: ${data.low_risk}`}
          />
        )}
        {data.medium_risk > 0 && (
          <div
            className="bg-yellow-500 hover:opacity-80 transition-opacity"
            style={{ width: `${medium_percent}%` }}
            title={`Medium Risk: ${data.medium_risk}`}
          />
        )}
        {data.high_risk > 0 && (
          <div
            className="bg-red-500 hover:opacity-80 transition-opacity"
            style={{ width: `${high_percent}%` }}
            title={`High Risk: ${data.high_risk}`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-700">Safe</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data.safe}
            <span className="text-xs text-gray-600 ml-1">({safe_percent}%)</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-700">Low Risk</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data.low_risk}
            <span className="text-xs text-gray-600 ml-1">({low_percent}%)</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-700">Medium</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data.medium_risk}
            <span className="text-xs text-gray-600 ml-1">
              ({medium_percent}%)
            </span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-700">High Risk</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data.high_risk}
            <span className="text-xs text-gray-600 ml-1">({high_percent}%)</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DSSLBadge;
