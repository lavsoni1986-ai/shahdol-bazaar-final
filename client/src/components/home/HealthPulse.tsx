import { useLocation } from "wouter";
import { HeartPulse } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";

interface HealthPulseProps {
  hospitals?: CanonicalEntity[];
}

export default function HealthPulse({ hospitals = [] }: HealthPulseProps) {
  const { currentDistrict } = useDistrict();
  const [, setLocation] = useLocation();
  const safeHospitals = hospitals;

  if (safeHospitals.length === 0) {
    return (
      <div className="text-center py-12">
        <HeartPulse className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/40">No healthcare facilities found</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-black text-white mb-6 tracking-tighter">Health Pulse</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeHospitals.slice(0, 4).map((hospital) => (
          <div key={`hospital-${hospital.id}`} onClick={() => setLocation(hospital.route)}>
            <SovereignEntityCard entity={hospital} variant="grid" />
          </div>
        ))}
      </div>
    </section>
  );
}
