import { useEffect, useState } from "react";
import { Star, Megaphone } from "lucide-react";

type Offer = {
  id: number;
  content: string;
};

export default function NewsTicker() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ FIXED: Fetching from local path instead of external Render URL
    fetch('/api/offers')
      .then(res => res.json())
      .then(data => {
        // API array return karti hai, use state mein set karein
        setOffers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Ticker fetch error:", err);
        setLoading(false);
      });
  }, []);

  // Agar news nahi hai toh component hide rakhein
  if (loading || offers.length === 0) return null;

  return (
    <div className="bg-yellow-400 border-b border-yellow-600 overflow-hidden relative group py-2">
      <div className="max-w-7xl mx-auto flex items-center px-4">
        {/* News Label */}
        <div className="flex-shrink-0 flex items-center gap-2 bg-black text-yellow-400 px-3 py-1 rounded-md text-xs font-bold uppercase mr-6 z-10 shadow-md">
          <Megaphone size={14} className="animate-bounce" />
          Market News
        </div>
        
        {/* Scrolling Container */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
            {offers.map((offer) => (
              <div key={offer.id} className="flex items-center gap-4">
                <span className="text-black font-bold text-sm md:text-base">
                  {offer.content}
                </span>
                <Star size={12} fill="black" className="opacity-30" />
              </div>
            ))}
            {/* Loop transition ke liye duplicate content */}
            {offers.map((offer) => (
              <div key={`dup-${offer.id}`} className="flex items-center gap-4">
                <span className="text-black font-bold text-sm md:text-base">
                  {offer.content}
                </span>
                <Star size={12} fill="black" className="opacity-30" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}