import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Crown, Zap, Star, QrCode, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: (tier: 'SILVER' | 'GOLD') => void;
  subscriptionStatus?: SubscriptionStatus;
}

export default function LimitModal({ isOpen, onClose, onUpgrade, subscriptionStatus }: LimitModalProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'SILVER' | 'GOLD'>('GOLD');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed'>('pending');
  const queryClient = useQueryClient();

  // Check for payment success on modal open
  useEffect(() => {
    if (isOpen) {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('order_id');
      const status = urlParams.get('status');

      if (orderId && status === 'success') {
        // Payment was successful, show success state
        setPaymentStatus('completed');
        setShowPayment(true);

        // Invalidate queries to refresh vendor data
        queryClient.invalidateQueries({ queryKey: ["home-snapshot"] });
        queryClient.invalidateQueries({ queryKey: ["search"] });

        // Show success toast
        toast.success("Boost activated successfully! Your shop is now visible at the top.");

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [isOpen, queryClient]);

  const handleUpgrade = async (tier: 'SILVER' | 'GOLD') => {
    setSelectedTier(tier);
    setShowPayment(true);

    if (onUpgrade) {
      onUpgrade(tier);
    }
  };

  const initiatePayment = async () => {
    setPaymentStatus('processing');

    try {
      const paymentData = {
        planType: selectedTier,
        amount: selectedTier === 'SILVER' ? 299 : 500,
        currency: 'INR',
        description: `${selectedTier} Plan Subscription - Shahdol Bazaar`,
      };

      const response = await apiRequest('POST', '/payments/create', paymentData);

      if (response.success && response.data.paymentLink) {
        // Redirect to Cashfree payment page
        window.location.href = response.data.paymentLink;
      } else {
        throw new Error(response.message || 'Payment creation failed');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setPaymentStatus('pending');
      // Show user-friendly error message
      toast.error('Payment initiation failed. Please try again or contact support.');
    }
  };

  if (!subscriptionStatus) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p>Loading subscription details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const usagePercentage = (subscriptionStatus.productsUsed / subscriptionStatus.productLimit) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {!showPayment ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Subscription Limit Reached
              </DialogTitle>
              <DialogDescription>
                आपने अपनी फ्री लिमिट पूरी कर ली है। अपनी दुकान को बड़ा बनाने के लिए अपग्रेड करें!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Usage Meter */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Current Usage</h3>
                    <Badge variant={subscriptionStatus.tier === 'FREE' ? 'secondary' : 'default'}>
                      {subscriptionStatus.tier} Plan
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Products Listed</span>
                      <span>{subscriptionStatus.productsUsed} / {subscriptionStatus.productLimit}</span>
                    </div>
                    <Progress value={usagePercentage} className="h-2" />
                    <p className="text-xs text-gray-600">
                      {usagePercentage >= 100 ? 'Limit reached!' : `${subscriptionStatus.productLimit - subscriptionStatus.productsUsed} products remaining`}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Upgrade Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Silver Plan */}
                {subscriptionStatus.nextTier === 'SILVER' && (
                  <Card className="border-silver-200 hover:border-silver-300 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Star className="w-5 h-5 text-gray-500" />
                        Silver Plan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-2xl font-bold">₹299<span className="text-sm font-normal">/month</span></div>
                      <ul className="space-y-2 text-sm">
                        <li>✅ 20 प्रोडक्ट लिस्ट कर सकते हैं</li>
                        <li>✅ प्राथमिक सपोर्ट</li>
                        <li>✅ बेसिक एनालिटिक्स</li>
                      </ul>
                      <Button
                        onClick={() => handleUpgrade('SILVER')}
                        className="w-full"
                        variant="outline"
                      >
                        Upgrade to Silver
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Gold Plan */}
                <Card className="border-yellow-200 hover:border-yellow-300 transition-colors relative">
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-yellow-500 text-black">
                      <Crown className="w-3 h-3 mr-1" />
                      Recommended
                    </Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Crown className="w-5 h-5 text-yellow-500" />
                      Gold Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-2xl font-bold">₹500<span className="text-sm font-normal">/month</span></div>
                    <ul className="space-y-2 text-sm">
                      <li>✅ 100+ प्रोडक्ट लिस्ट कर सकते हैं</li>
                      <li>✅ प्रायोरिटी सपोर्ट</li>
                      <li>✅ एडवांस्ड एनालिटिक्स</li>
                      <li>✅ कस्टम AI असिस्टेंट</li>
                      <li>✅ "शहडोल का शोरूम" बैज</li>
                    </ul>
                    <Button
                      onClick={() => handleUpgrade('GOLD')}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Upgrade to Gold
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Benefits */}
              <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">🎯 Gold Plan Benefits</h4>
                  <ul className="text-sm space-y-1">
                    <li>• अपनी दुकान को "शहडोल का शोरूम" बनाएं</li>
                    <li>• ग्राहकों को सबसे ऊपर दिखें</li>
                    <li>• एआई मार्केटिंग और एनालिटिक्स</li>
                    <li>• 24/7 प्रायोरिटी सपोर्ट</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
              <DialogDescription>
                Scan the QR code below to pay for your {selectedTier} subscription
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Payment Details */}
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-2xl font-bold mb-2">
                      ₹{selectedTier === 'SILVER' ? '299' : '500'}
                    </div>
                    <div className="text-gray-600">{selectedTier} Plan Subscription</div>
                  </div>

                  {paymentStatus === 'pending' && (
                    <div className="space-y-4">
                      <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600">
                        UPI ID: merchant@shahdolbazaar
                      </p>
                      <Button onClick={initiatePayment} className="w-full">
                        Pay ₹{selectedTier === 'SILVER' ? '299' : '500'}
                      </Button>
                    </div>
                  )}

                  {paymentStatus === 'processing' && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                      <p>Processing payment...</p>
                      <p className="text-sm text-gray-600 mt-2">Please wait while we verify your payment</p>
                    </div>
                  )}

                  {paymentStatus === 'completed' && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-green-600 mb-2">
                        Payment Successful!
                      </h3>
                      <p className="text-sm text-gray-600">
                        Your {selectedTier} subscription is now active.
                        You can now add {selectedTier === 'SILVER' ? '20' : '100+'} products!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}