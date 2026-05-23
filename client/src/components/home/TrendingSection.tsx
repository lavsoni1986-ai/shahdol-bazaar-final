import { Link } from "wouter";
import { SovereignProductCard } from "./SovereignProductCard";
import { ArrowRight } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";

interface TrendingSectionProps {
  products?: any[];
  onTrack?: (action: string, item: string) => void;
}

export function TrendingSection({ products = [], onTrack }: TrendingSectionProps) {
  const { currentDistrict, isReady: districtReady } = useDistrict();

  if (!districtReady || !currentDistrict?.id) {
    return null;
  }

  if (!products || products.length === 0) return null;

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold sovereign-heading">Trending Products</h2>
        <Link href="/marketplace" className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-400 transition">
          View All <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.slice(0, 4).map((item: any) => (
          <SovereignProductCard
            key={item.id}
            data={item}
            variant="featured"
          />
        ))}
      </div>
    </section>
  );
}

export default TrendingSection;