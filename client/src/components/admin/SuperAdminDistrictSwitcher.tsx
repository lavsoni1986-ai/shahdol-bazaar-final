import { useState } from "react";
import { useDistrict } from "@/contexts/DistrictContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, ShieldCheck } from "lucide-react";
import { SOVEREIGN_CONFIG } from "@/lib/SovereignConstants";

export function SuperAdminDistrictSwitcher() {
  const { isSuperAdmin } = useAuth();
  const { currentDistrict, refreshDistrict } = useDistrict();

  if (!isSuperAdmin) return null;

  const { data: districts } = useQuery<any[]>({
    queryKey: ["districts"],
  });

  const handleDistrictChange = async (slug: string) => {
    const selected = districts?.find(d => d.slug === slug);
    if (selected) {
      localStorage.setItem(SOVEREIGN_CONFIG.STORAGE_KEYS.DISTRICT_ID, String(selected.id));
      localStorage.setItem(SOVEREIGN_CONFIG.STORAGE_KEYS.DISTRICT_SLUG, selected.slug);
      
      if (refreshDistrict) await refreshDistrict();
      window.location.href = `/${selected.slug}`;
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
      <ShieldCheck className="w-4 h-4 text-orange-500" />
      <span className="text-xs font-bold uppercase tracking-wider text-orange-500">Super Admin:</span>
      <Select value={currentDistrict?.slug} onValueChange={handleDistrictChange}>
        <SelectTrigger className="w-[180px] h-8 bg-white/5 border-white/10 text-xs text-white">
          <Globe className="w-3 h-3 mr-2" />
          <SelectValue placeholder="Switch District" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-white/10">
          {districts?.map((d) => (
            <SelectItem key={d.id} value={d.slug} className="text-xs text-white focus:bg-orange-500/20">
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}