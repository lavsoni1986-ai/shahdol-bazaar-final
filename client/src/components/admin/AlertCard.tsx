/**
 * ============================================
 * ALERT CARD COMPONENT - AI Monitoring Dashboard
 * ============================================
 * Displays smart alerts with explainability
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  confidence: number;
  reasons: string[];
  timestamp: string;
  entityId?: string;
  entityType?: string;
}

interface AlertCardProps {
  alert: AlertItem;
  onClick?: () => void;
  expanded?: boolean;
}

const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onClick,
  expanded = false
}) => {
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-800',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: AlertTriangle
        };
      case 'HIGH':
        return {
          color: 'bg-orange-500',
          textColor: 'text-orange-800',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: Shield
        };
      case 'MEDIUM':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-800',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: Zap
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-800',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: AlertTriangle
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  return (
    <Card className={`border-2 ${config.borderColor} ${config.bgColor} cursor-pointer transition-all hover:shadow-md`}
          onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-5 w-5 ${config.textColor}`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-gray-900">{alert.title}</h4>
                <Badge className={`${config.color} text-white text-xs`}>
                  {alert.severity}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 mb-2">{alert.description}</p>

              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
                <span>{new Date(alert.timestamp).toLocaleString()}</span>
                {alert.entityId && (
                  <span>Entity: {alert.entityType} #{alert.entityId}</span>
                )}
              </div>

              <div className="mt-2">
                <Progress value={alert.confidence * 100} className="h-1" />
              </div>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="font-medium text-sm mb-2">Detection Reasons:</h5>
                  <ul className="space-y-1">
                    {alert.reasons.map((reason, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onClick && (
              <Button variant="ghost" size="sm" onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}>
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertCard;