/**
 * ============================================
 * METRIC CARD COMPONENT - AI Monitoring Dashboard
 * ============================================
 * Displays key AI performance metrics with trends
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: LucideIcon;
  color?: 'green' | 'red' | 'blue' | 'orange' | 'purple' | 'gray';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  icon: Icon,
  color = 'blue'
}) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'red':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'blue':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'orange':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'purple':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.startsWith('+')) return <TrendingUp className="h-3 w-3" />;
    if (trend.startsWith('-')) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-600';
    if (trend.startsWith('+')) return 'text-green-600';
    if (trend.startsWith('-')) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className={`border-2 ${getColorClasses()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getColorClasses()}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>

          {trend && (
            <Badge variant="secondary" className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs">{trend}</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;