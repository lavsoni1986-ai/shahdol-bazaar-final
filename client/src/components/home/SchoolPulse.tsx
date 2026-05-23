import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";

interface SchoolPulseProps {
  schools: CanonicalEntity[];
}

export default function SchoolPulse({ schools = [] }: SchoolPulseProps) {
  const { currentDistrict, isReady } = useDistrict();
  const [, setLocation] = useLocation();
  const safeSchools = schools;

  if (!isReady || !currentDistrict?.id) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 w-full glass-card-sovereign animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {safeSchools.length === 0 ? (
        <div className="col-span-full text-center py-8">
          <div className="w-16 h-16 text-white/20 mx-auto mb-4">📚</div>
          <p className="text-white/40">No schools found</p>
        </div>
      ) : (
        safeSchools.slice(0, 4).map((school) => (
          <div key={`school-${school.id}`} onClick={() => setLocation(school.route)}>
            <SovereignEntityCard entity={school} variant="grid" />
          </div>
        ))
      )}
    </div>
  );
}