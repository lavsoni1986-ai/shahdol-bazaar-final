import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function PaymentVerifyPage() {
  const [, setLocation] = useLocation();
  const [orderId, setOrderId] = useState<string>("");
  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing");

  useEffect(() => {
    // Get order_id from URL params
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get("order_id");
    if (orderIdParam) {
      setOrderId(orderIdParam);
      // Simulate payment verification (in real app, call API)
      setTimeout(() => {
        setStatus("success");
      }, 1500);
    } else {
      setStatus("failed");
    }
  }, []);

  const handleGoHome = () => {
    setLocation("/");
  };

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Verifying Payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">There was an issue processing your payment. Please try again.</p>
          <button
            onClick={handleGoHome}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-4">Thank you for your order</p>
        
        {orderId && (
          <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="text-lg font-mono font-semibold text-gray-800">{orderId}</p>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mb-6">
          A confirmation has been sent to your registered phone number.
        </p>
        
        <button
          onClick={handleGoHome}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Go Home
        </button>
      </div>
    </div>
  );
}
