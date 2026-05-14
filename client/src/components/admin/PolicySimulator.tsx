/**
 * ============================================
 * POLICY SIMULATOR COMPONENT - AI Monitoring Dashboard
 * ============================================
 * Test policy changes before deployment
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Play
} from 'lucide-react';

interface PolicyImpact {
  vendorsAffected: number;
  falsePositives: number;
  revenueImpact: number;
}

interface PolicySimulatorProps {
  currentThreshold: number;
  onSimulate: (threshold: number) => void;
  impact?: PolicyImpact | null;
}

const PolicySimulator: React.FC<PolicySimulatorProps> = ({
  currentThreshold,
  onSimulate,
  impact
}) => {
  const [proposedThreshold, setProposedThreshold] = useState(currentThreshold);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      await onSimulate(proposedThreshold);
    } finally {
      setIsSimulating(false);
    }
  };

  const getImpactColor = (value: number, type: 'vendors' | 'positives' | 'revenue') => {
    if (type === 'vendors' || type === 'positives') {
      if (value > 20) return 'text-red-600';
      if (value > 10) return 'text-yellow-600';
      return 'text-green-600';
    }
    // Revenue impact
    if (value > 50000) return 'text-red-600';
    if (value > 25000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getImpactIcon = (value: number, type: 'vendors' | 'positives' | 'revenue') => {
    if (type === 'revenue') {
      return value > 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />;
    }
    return value > 15 ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Policy Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Policy Simulator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium">
                Fraud Detection Threshold
              </label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{proposedThreshold}</Badge>
                <span className="text-sm text-gray-600">Current: {currentThreshold}</span>
              </div>
            </div>

            <Slider
              value={[proposedThreshold]}
              onValueChange={(value) => setProposedThreshold(value[0])}
              min={30}
              max={90}
              step={5}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More Restrictive (30)</span>
              <span>Less Restrictive (90)</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleSimulate}
              disabled={isSimulating || proposedThreshold === currentThreshold}
              className="flex-1"
            >
              {isSimulating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setProposedThreshold(currentThreshold)}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Impact Analysis */}
      {impact && (
        <Card>
          <CardHeader>
            <CardTitle>Impact Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <div className={`text-2xl font-bold mb-1 ${getImpactColor(impact.vendorsAffected, 'vendors')}`}>
                  {impact.vendorsAffected}
                </div>
                <div className="text-sm text-gray-600">Vendors Affected</div>
                <div className={`flex items-center justify-center mt-1 ${getImpactColor(impact.vendorsAffected, 'vendors')}`}>
                  {getImpactIcon(impact.vendorsAffected, 'vendors')}
                </div>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className={`text-2xl font-bold mb-1 ${getImpactColor(impact.falsePositives, 'positives')}`}>
                  {impact.falsePositives}
                </div>
                <div className="text-sm text-gray-600">False Positives</div>
                <div className={`flex items-center justify-center mt-1 ${getImpactColor(impact.falsePositives, 'positives')}`}>
                  {getImpactIcon(impact.falsePositives, 'positives')}
                </div>
              </div>

              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className={`text-2xl font-bold mb-1 ${getImpactColor(Math.abs(impact.revenueImpact), 'revenue')}`}>
                  ₹{Math.abs(impact.revenueImpact).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {impact.revenueImpact > 0 ? 'Revenue Loss' : 'Revenue Gain'}
                </div>
                <div className={`flex items-center justify-center mt-1 ${getImpactColor(Math.abs(impact.revenueImpact), 'revenue')}`}>
                  {getImpactIcon(impact.revenueImpact, 'revenue')}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <Alert className={impact.vendorsAffected > 15 || impact.falsePositives > 10 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {impact.vendorsAffected > 15 || impact.falsePositives > 10 ? (
                  <div>
                    <strong className="text-red-800">High Impact Change:</strong>
                    <ul className="mt-2 text-red-700 space-y-1">
                      <li>• {impact.vendorsAffected} vendors would be restricted</li>
                      <li>• {impact.falsePositives} legitimate vendors may be flagged incorrectly</li>
                      <li>• Consider gradual rollout or additional review process</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <strong className="text-green-800">Low Impact Change:</strong>
                    <ul className="mt-2 text-green-700 space-y-1">
                      <li>• Minimal disruption to legitimate vendors</li>
                      <li>• Good balance between fraud detection and false positives</li>
                      <li>• Safe to deploy with standard monitoring</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Deployment Recommendations */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Deployment Recommendations</h4>
              <div className="space-y-2 text-sm text-gray-700">
                {impact.vendorsAffected > 20 ? (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Deploy gradually with A/B testing</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Safe for immediate deployment</span>
                  </div>
                )}

                {impact.falsePositives > 5 && (
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-yellow-500" />
                    <span>Consider appeal process for flagged vendors</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 text-blue-500" />
                  <span>Monitor impact for 7 days post-deployment</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policy Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="font-medium text-green-800 mb-1">Conservative (70-90)</div>
              <div className="text-green-700">
                Fewer false positives, but may miss some fraud. Good for stable periods.
              </div>
            </div>

            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="font-medium text-yellow-800 mb-1">Balanced (50-70)</div>
              <div className="text-yellow-700">
                Good balance of detection and accuracy. Recommended for most cases.
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="font-medium text-red-800 mb-1">Aggressive (30-50)</div>
              <div className="text-red-700">
                Maximum fraud detection, but higher false positives. Use during high-risk periods.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicySimulator;