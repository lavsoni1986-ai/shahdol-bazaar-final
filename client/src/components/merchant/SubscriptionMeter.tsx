import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Star, AlertTriangle, TrendingUp } from "lucide-react";
import LimitModal from "./LimitModal";
import { apiRequest } from "@/lib/api-client";

interface UsageStats {
  currentUsage: number;
  limit: number;
  percentage: number;
  tier: string;
  daysLeft?: number;
}

interface SubscriptionStatus {
  tier: 'FREE' | 'SILVER' | 'GOLD';
  productLimit: number;
  productsUsed: number;
  isActive: boolean;
  canAddProducts: boolean;
  upgradeRequired: boolean;
  nextTier?: 'SILVER' | 'GOLD';
  nextTierLimit?: number;
  nextTierPrice?: number;
}

export default function SubscriptionMeter() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usageData, subData] = await Promise.all([
        apiRequest("GET", "/billing/usage"),
        apiRequest("GET", "/billing/status")
      ]);

      setStats(usageData);
      setSubscription(subData);
    } catch (error) {
      // TODO: Replace with proper logger when client-side logging is implemented
      // For now, silent error handling to avoid console spam
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'SILVER' | 'GOLD') => {
    // This will be handled by the LimitModal component
    console.log('Upgrading to', tier);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || !subscription) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Failed to load subscription data</p>
          <Button onClick={loadData} variant="outline" className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'GOLD': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'SILVER': return <Star className="w-5 h-5 text-gray-500" />;
      default: return <TrendingUp className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'bg-yellow-500';
      case 'SILVER': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const isNearLimit = stats.percentage > 80;
  const isAtLimit = stats.percentage >= 100;

  return (
    <>
      <Card className={`transition-all ${isAtLimit ? 'border-red-300 bg-red-50' : isNearLimit ? 'border-orange-300 bg-orange-50' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTierIcon(stats.tier)}
              <span>{stats.tier} Plan</span>
              <Badge variant="secondary" className={getTierColor(stats.tier)}>
                {stats.currentUsage}/{stats.limit} Products
              </Badge>
            </div>
            {stats.daysLeft && (
              <Badge variant="outline">
                {stats.daysLeft} days left
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Usage Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Product Usage</span>
              <span>{stats.percentage.toFixed(0)}% used</span>
            </div>
            <Progress
              value={stats.percentage}
              className={`h-3 ${isAtLimit ? 'bg-red-200' : isNearLimit ? 'bg-orange-200' : ''}`}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{stats.limit - stats.currentUsage} products remaining</span>
              <span>Limit: {stats.limit}</span>
            </div>
          </div>

          {/* Status Messages */}
          {isAtLimit && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">Limit Reached!</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                आपने सभी {stats.limit} प्रोडक्ट डाल दिए हैं। अपग्रेड करके और प्रोडक्ट जोड़ें।
              </p>
            </div>
          )}

          {isNearLimit && !isAtLimit && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">Approaching Limit</span>
              </div>
              <p className="text-orange-700 text-sm mt-1">
                आपने {stats.percentage.toFixed(0)}% लिमिट यूज़ कर ली है। जल्दी अपग्रेड करें।
              </p>
            </div>
          )}

          {/* Upgrade Button */}
          {subscription.upgradeRequired && (
            <Button
              onClick={() => setShowLimitModal(true)}
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to {subscription.nextTier} Plan
              {subscription.nextTierPrice && (
                <span className="ml-2 text-sm">₹{subscription.nextTierPrice}/month</span>
              )}
            </Button>
          )}

          {/* Plan Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-800">{stats.limit}</div>
              <div className="text-xs text-blue-600">Max Products</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="font-semibold text-green-800">
                {subscription.tier === 'GOLD' ? '24/7' : subscription.tier === 'SILVER' ? 'Priority' : 'Basic'}
              </div>
              <div className="text-xs text-green-600">Support</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="font-semibold text-purple-800">
                {subscription.tier === 'GOLD' ? 'Advanced' : subscription.tier === 'SILVER' ? 'Basic' : 'None'}
              </div>
              <div className="text-xs text-purple-600">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limit Modal */}
      <LimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={handleUpgrade}
        subscriptionStatus={subscription}
      />
    </>
  );
}