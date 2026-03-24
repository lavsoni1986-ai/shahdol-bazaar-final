import { Link } from "wouter";
import { SovereignStoreCard } from "./SovereignStoreCard";
import { ArrowRight, Store, MapPin, Clock } from "lucide-react";

interface FeaturedStoresProps {
  stores: any[];
  onTrack?: (action: string, item: string) => void;
  getVendorGradient?: (name: string) => string;
}

const isStoreOpen = (store: any): boolean => {
  if (store.isOpen !== undefined) return store.isOpen;
  if (store.closingTime) {
    const now = new Date();
    const [hours, minutes] = store.closingTime.split(':').map(Number);
    const closing = new Date();
    closing.setHours(hours, minutes, 0);
    return now < closing;
  }
  return true;
};

const getDistance = (store: any): string => {
  if (store.distance) return `${store.distance} KM`;
  if (store.distanceKm) return `${store.distanceKm} KM`;
  return (Math.random() * 3 + 0.5).toFixed(1) + ' KM';
};

export function FeaturedStores({ stores, onTrack, getVendorGradient }: FeaturedStoresProps) {
  if (!stores || stores.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-xl font-bold text-white sovereign-heading flex items-center gap-3">
          <Store className="text-violet-400" /> Near You
        </h2>
        <Link href="/marketplace/stores" className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors">
          View All <ArrowRight size={18} />
        </Link>
      </div>
      
      {/* Grid layout for SovereignStoreCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4">
        {stores.slice(0, 4).map((item) => (
          <SovereignStoreCard
            key={item.id}
            data={item}
            onTrack={onTrack}
          />
        ))}
      </div>
    </section>
  );
}
