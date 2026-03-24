import { MapPin, PhoneCall, ShieldCheck, Navigation } from "lucide-react";
import { Link } from "wouter";

interface SovereignStoreCardProps {
  data: any;
  onTrack?: (action: string, item: string) => void;
}

export const SovereignStoreCard = ({ data, onTrack }: SovereignStoreCardProps) => {
  const getImage = () => {
    if (data.logo || data.imageUrl || data.image) {
      return data.logo || data.imageUrl || data.image;
    }
    return null;
  };

  const getName = () => {
    return data.name || data.shopName || "Unknown Store";
  };

  const getCategory = () => {
    return data.category || data.businessType || 'Store';
  };

  const getMatchScore = () => {
    return data.dsslScore ? `${data.dsslScore}%` : "95%";
  };

  const getDistance = () => {
    if (data.distance) return `${data.distance} KM`;
    if (data.distanceKm) return `${data.distanceKm} KM`;
    return null;
  };

  const isOpen = () => {
    if (data.isOpen !== undefined) return data.isOpen;
    if (data.closingTime) {
      const now = new Date();
      const [hours, minutes] = data.closingTime.split(':').map(Number);
      const closing = new Date();
      closing.setHours(hours, minutes, 0);
      return now < closing;
    }
    return true;
  };

  const getHref = () => {
    return `/shop/${data.slug || data.id}`;
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.phone) {
      window.location.href = `tel:${data.phone}`;
    }
    onTrack?.('call', `store_${data.id}`);
  };

  const image = getImage();
  const name = getName();
  const open = isOpen();
  const distance = getDistance();
  const matchScore = getMatchScore();

  return (
    <Link
      href={getHref()}
      className="block"
      onClick={() => onTrack?.('click', `store_${data.id}`)}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-5 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 group shadow-[inset_0_0_20px_rgba(249,115,22,0.05)] hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.15),0_0_40px_rgba(255,140,0,0.15)] glass-border sovereign-inner-glow">

        {/* 🏛️ SOVEREIGN PRECISION HEADER */}
<div className="relative flex items-start gap-4 mb-4">
  {/* Store Logo: Fixed size, zero squashing */}
  <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 flex items-center justify-center overflow-hidden shadow-inner">
    {image ? (
      <img src={image} alt={name} className="w-full h-full object-cover" />
    ) : (
      <span className="text-orange-400 font-black text-xl">{name[0]}</span>
    )}
  </div>

  {/* Text Engine: Full width, no padding needed */}
  <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5"> 
    <h3 className="text-white font-black text-lg leading-[1.2] group-hover:text-orange-400 transition-colors line-clamp-2">
      {name}
    </h3>
    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.15em] mt-1 truncate">
      {getCategory()}
    </p>
  </div>
</div>

        {/* Middle Layer: Context */}
        <div className="flex items-center gap-4 mb-5 text-xs text-white/60 font-medium">
          {distance && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" /> {distance} away
            </span>
          )}
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {open ? 'Open Now' : 'Closed'}
          </span>
        </div>

        {/* Action Layer: Store Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all">
            <Navigation className="w-4 h-4 text-white/70" /> Direct
          </button>
          <button
            onClick={handleCall}
            disabled={!data.phone}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PhoneCall className="w-4 h-4" /> Call
          </button>
        </div>
      </div>
    </Link>
  );
};