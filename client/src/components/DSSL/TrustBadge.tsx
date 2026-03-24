// BharatOS - DSSL (Digital Safety Score) Trust Badge Component
// Displays vendor trust score and verification status

import { Shield, CheckCircle, Award, Star } from "lucide-react";

interface TrustBadgeProps {
  dsslScore?: number;
  isVerified?: boolean;
  safetyBadges?: string[];
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  showGlow?: boolean;  // Enable glowing border for DSSL > 80
}

export function TrustBadge({ 
  dsslScore = 0, 
  isVerified = false, 
  safetyBadges = [],
  size = "md",
  showScore = true,
  showGlow = false
}: TrustBadgeProps) {
  
  // Check if DSSL score is high enough for verified glow
  const isHighScore = dsslScore >= 80;
  const shouldShowGlow = showGlow || isHighScore;
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 70) return "bg-blue-100";
    if (score >= 50) return "bg-yellow-100";
    return "bg-red-100";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${shouldShowGlow ? 'dssl-verified-glow rounded-lg p-1' : ''}`}>
      {/* DSSL Score Badge */}
      {showScore && (
        <div className={`flex items-center gap-1 rounded-full ${sizeClasses[size]} ${getScoreBgColor(dsslScore)}`}>
          <Shield size={iconSizes[size]} className={getScoreColor(dsslScore)} />
          <span className={`font-bold ${getScoreColor(dsslScore)}`}>
            DSSL {dsslScore}
          </span>
        </div>
      )}

      {/* Verified Badge */}
      {isVerified ? (
        <div className={`flex items-center gap-1 rounded-full ${sizeClasses[size]} bg-blue-100 text-blue-700`}>
          <CheckCircle size={iconSizes[size]} />
          <span>Verified</span>
        </div>
      ) : (
        <div className={`flex items-center gap-1 rounded-full ${sizeClasses[size]} bg-gray-100 text-gray-500`}>
          <Shield size={iconSizes[size]} />
          <span>Pending Verification</span>
        </div>
      )}

      {/* High Score Badge - Verified Infrastructure */}
      {isHighScore && (
        <div className={`flex items-center gap-1 rounded-full ${sizeClasses[size]} bg-gradient-to-r from-yellow-100 to-amber-200 text-amber-800 border border-amber-300`}>
          <Award size={iconSizes[size]} />
          <span className="font-semibold">Verified Infrastructure</span>
        </div>
      )}

      {/* Safety Badges */}
      {safetyBadges.map((badge, index) => (
        <div 
          key={index}
          className={`flex items-center gap-1 rounded-full ${sizeClasses[size]} bg-purple-100 text-purple-700`}
        >
          <Award size={iconSizes[size]} />
          <span className="capitalize">{badge}</span>
        </div>
      ))}
    </div>
  );
}

// Compact version for inline display
export function TrustBadgeCompact({ 
  dsslScore = 0, 
  isVerified = false 
}: { 
  dsslScore?: number; 
  isVerified?: boolean;
}) {
  const getColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex items-center gap-1">
      <Shield size={14} className={getColor(dsslScore)} />
      <span className={`text-xs font-semibold ${getColor(dsslScore)}`}>
        {dsslScore}
      </span>
      {isVerified && (
        <CheckCircle size={14} className="text-blue-600 ml-1" />
      )}
    </div>
  );
}

// Star rating component for vendor ratings
export function VendorRating({ 
  rating = 0, 
  reviewCount = 0,
  size = "md" 
}: { 
  rating?: number; 
  reviewCount?: number;
  size?: "sm" | "md" | "lg";
}) {
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={iconSizes[size]}
            className={star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
          />
        ))}
      </div>
      {reviewCount > 0 && (
        <span className="text-xs text-gray-500 ml-1">({reviewCount})</span>
      )}
    </div>
  );
}
