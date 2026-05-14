/**
 * ============================================
 * MODEL STATUS COMPONENT - AI Monitoring Dashboard
 * ============================================
 * AI model performance and learning status
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface ModelStatusData {
  drift: number;
  patternsLearned: number;
  autoTuning: boolean;
  confidence: number;
  lastUpdate: string;
}

interface ModelStatusProps {
  data: ModelStatusData;
  detailed?: boolean;
}

const ModelStatus: React.FC<ModelStatusProps> = ({ data, detailed = false }) => {
  const getDriftColor = (drift: number) => {
    if (drift > 10) return 'text-red-600';
    if (drift > 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAutoTuningStatus = (autoTuning: boolean) => {
    return autoTuning ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Manual
      </Badge>
    );
  };

  const timeSinceUpdate = () => {
    const now = new Date();
    const update = new Date(data.lastUpdate);
    const diffMs = now.getTime() - update.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours} hours ago`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Core Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className={`text-xl font-bold mb-1 ${getDriftColor(data.drift)}`}>
            {data.drift}%
          </div>
          <div className="text-xs text-gray-600">Model Drift</div>
          <div className="mt-1">
            <Progress value={Math.min(100, data.drift * 10)} className="h-1" />
          </div>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className={`text-xl font-bold mb-1 ${getConfidenceColor(data.confidence)}`}>
            {(data.confidence * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600">Confidence</div>
          <div className="mt-1">
            <Progress value={data.confidence * 100} className="h-1" />
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Auto-tuning</span>
          {getAutoTuningStatus(data.autoTuning)}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Patterns Learned</span>
          <span className="text-sm font-bold text-blue-600">{data.patternsLearned}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Last Update</span>
          <span className="text-sm text-gray-600">{timeSinceUpdate()}</span>
        </div>
      </div>

      {/* Detailed View */}
      {detailed && (
        <>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Learning Progress</span>
            </h4>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Pattern Recognition</span>
                  <span>89%</span>
                </div>
                <Progress value={89} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Anomaly Detection</span>
                  <span>76%</span>
                </div>
                <Progress value={76} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Behavioral Analysis</span>
                  <span>92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Risk Assessment</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
            </div>
          </div>

          {/* Model Health Alerts */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Model Health</h4>

            {data.drift > 10 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>High Model Drift Detected:</strong> Model performance may be degrading.
                  Consider retraining with recent data.
                </AlertDescription>
              </Alert>
            )}

            {data.confidence < 0.7 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Zap className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Low Confidence:</strong> Model predictions may be unreliable.
                  Monitor performance closely.
                </AlertDescription>
              </Alert>
            )}

            {data.drift <= 5 && data.confidence >= 0.85 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Model Performing Well:</strong> Low drift and high confidence indicate
                  healthy model performance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Recent Activity */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Recent Model Activity</span>
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span>Pattern learning completed</span>
                <span className="text-gray-600">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span>Model validation passed</span>
                <span className="text-gray-600">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span>Auto-tuning adjustment</span>
                <span className="text-gray-600">6 hours ago</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelStatus;