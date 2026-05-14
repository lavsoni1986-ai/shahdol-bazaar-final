/**
 * ============================================
 * EXPLAIN CARD COMPONENT - AI Monitoring Dashboard
 * ============================================
 * Visual AI decision explainability
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, TrendingUp, TrendingDown } from 'lucide-react';

interface ExplainData {
  entity: string;
  score: number;
  breakdown: Record<string, number>;
  confidence: number;
  reasons: string[];
}

interface ExplainCardProps {
  data: ExplainData;
}

const ExplainCard: React.FC<ExplainCardProps> = ({ data }) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalBreakdown = Object.values(data.breakdown).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-blue-600" />
            <span>AI Explainability Analysis</span>
            <Badge className={`ml-auto ${getConfidenceColor(data.confidence)}`}>
              {(data.confidence * 100).toFixed(0)}% Confidence
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${getScoreColor(data.score)}`}>
              {data.score}
            </div>
            <div className="text-lg text-gray-600">{data.entity} Score</div>
            <div className="mt-4">
              <Progress value={data.score} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Score Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(data.breakdown).map(([factor, value]) => {
            const percentage = (value / totalBreakdown) * 100;
            return (
              <div key={factor} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {factor.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{value}</span>
                    <span className="text-xs text-gray-500">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* AI Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>AI Decision Reasoning</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              The AI evaluated this {data.entity.toLowerCase()} based on the following factors:
            </p>
            <ul className="space-y-2">
              {data.reasons.map((reason, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Key Insights</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• This score reflects real-time analysis of behavioral patterns</li>
              <li>• Confidence level indicates reliability of the assessment</li>
              <li>• Score components are weighted based on historical performance</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Meter */}
      <Card>
        <CardHeader>
          <CardTitle>AI Confidence Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Confidence</span>
              <span className={`text-sm font-bold ${getConfidenceColor(data.confidence).split(' ')[0]}`}>
                {(data.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={data.confidence * 100} className="h-3" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className={`p-3 rounded-lg ${data.confidence >= 0.8 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                <div className="text-lg font-bold text-green-600">High</div>
                <div className="text-xs text-gray-600">80-100%</div>
              </div>
              <div className={`p-3 rounded-lg ${data.confidence >= 0.6 && data.confidence < 0.8 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
                <div className="text-lg font-bold text-yellow-600">Medium</div>
                <div className="text-xs text-gray-600">60-79%</div>
              </div>
              <div className={`p-3 rounded-lg ${data.confidence < 0.6 ? 'bg-red-50 border-red-200' : 'bg-gray-50'}`}>
                <div className="text-lg font-bold text-red-600">Low</div>
                <div className="text-xs text-gray-600">0-59%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExplainCard;