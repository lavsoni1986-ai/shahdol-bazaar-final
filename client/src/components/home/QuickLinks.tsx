import { Link } from "wouter";
import { Hospital, School, Bus } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";

interface QuickLinksProps {
  onTrack?: (action: string, item: string) => void;
}

export function QuickLinks({ onTrack }: QuickLinksProps) {
  const { currentDistrict } = useDistrict();
  const districtSlug = currentDistrict?.slug || 'shahdol';

  return (
    <section className="mt-16 grid md:grid-cols-3 gap-6">
      <Link 
        href={`/${districtSlug}/hospitals`} 
        onClick={() => onTrack?.('quick_link', 'hospitals')} 
        className="glass-card-sovereign p-6 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Hospital className="text-blue-400" size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Hospitals</h3>
            <p className="text-gray-400 text-sm">Healthcare near you</p>
          </div>
        </div>
      </Link>

      <Link 
        href={`/${districtSlug}/schools`} 
        onClick={() => onTrack?.('quick_link', 'schools')} 
        className="glass-card-sovereign p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <School className="text-purple-400" size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Schools</h3>
            <p className="text-gray-400 text-sm">Education & Admissions</p>
          </div>
        </div>
      </Link>

      <Link 
        href={`/${districtSlug}/bus-timetable`} 
        onClick={() => onTrack?.('quick_link', 'bus')} 
        className="glass-card-sovereign p-6 border border-green-500/20 hover:border-green-500/40 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-xl">
            <Bus className="text-green-400" size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Bus Routes</h3>
            <p className="text-gray-400 text-sm">Transit Schedules</p>
          </div>
        </div>
      </Link>
    </section>
  );
}
