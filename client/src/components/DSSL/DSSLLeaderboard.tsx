import { apiRequest } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal, Award, Crown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  id: number;
  name: string;
  score: number;
  badge: string;
  category: string;
  productCount: number;
  rating: number;
}

export default function DSSLLeaderboard({ districtId }: { districtId: number }) {
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ["dssl/leaderboard", districtId],
    queryFn: async () => {
      return await apiRequest("GET", `dssl/leaderboard?district=${districtId}`);
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="glass-card-sovereign p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !leaderboardData?.leaderboard) {
    return (
      <div className="glass-card-sovereign p-6 border-red-500/30">
        <div className="text-center text-red-400">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Unable to load leaderboard</p>
        </div>
      </div>
    );
  }

  const { leaderboard, total } = leaderboardData;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-white/70">#{rank}</span>;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'ELITE':
        return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
      case 'TRUSTED':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="glass-card-sovereign p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h2 className="text-2xl font-black text-white">DSSL Leaderboard</h2>
          <p className="text-gray-400 text-sm">Top-performing vendors in your district</p>
        </div>
      </div>

      <div className="space-y-3">
        {leaderboard.map((entry: LeaderboardEntry) => (
          <div
            key={entry.id}
            className="flex items-center gap-4 p-4 rounded-lg bg-black/20 border border-white/5 hover:border-white/10 transition-all"
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-10">
              {getRankIcon(entry.rank)}
            </div>

            {/* Vendor Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-white font-semibold">{entry.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getBadgeColor(entry.badge)}`}>
                  {entry.badge}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{entry.category}</span>
                <span>{entry.productCount} products</span>
                <span>★ {entry.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Score */}
            <div className="text-right">
              <div className="text-2xl font-black text-white">{entry.score}</div>
              <div className="text-xs text-gray-400">DSSL Score</div>
            </div>
          </div>
        ))}
      </div>

      {total === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No vendors qualify for the leaderboard yet</p>
          <p className="text-sm">Vendors need DSSL score ≥ 70 to appear</p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-xs text-gray-500 text-center">
          Leaderboard updates every 5 minutes • Only verified vendors with score ≥ 70 shown
        </p>
      </div>
    </div>
  );
}