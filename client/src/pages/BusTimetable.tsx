import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bus, Clock, MapPin, IndianRupee, Search, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";
import { apiRequest, getArrayData } from "@/lib/api-client";

export default function BusTimetable() {
  const { currentDistrict, isReady } = useDistrict();
  const [searchQuery, setSearchQuery] = useState("");

  if (!isReady || !currentDistrict?.id) {
    return (
      <div className="sovereign-bg min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse">Initializing...</div>
      </div>
    );
  }

  const { data, isLoading } = useQuery({
    queryKey: ["bus-timetable", currentDistrict.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/bus-timetable");
      return getArrayData(res);
    },
    enabled: !!currentDistrict?.id
  });

  const buses = data || [];
  const filteredBuses = buses.filter((b: any) =>
    (b.toCity || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.fromCity || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="sovereign-bg min-h-screen pb-24 selection:bg-orange-500/30">
      <header className="nebula-header pt-16 pb-12 px-6">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-600 rounded-2xl shadow-[0_0_20px_rgba(234,88,12,0.4)]">
              <Bus className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-sovereign-title text-3xl md:text-4xl leading-none">
                Bus Control Panel
              </h1>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mt-1">
                Live Timetable • {currentDistrict?.name || 'District'} Junction
              </p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="अपनी मंज़िल लिखें (जैसे: Rewa, Umaria...)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all text-white placeholder:text-gray-600 backdrop-blur-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="px-6 max-w-4xl mx-auto -mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="pulse-green"></div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">System Online</span>
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            {filteredBuses.length} Routes Found
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 w-full glass-card-sovereign animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBuses.map((bus: any) => (
              <div key={bus.id} className="glass-card-sovereign p-6 group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase">From</p>
                      <h3 className="text-lg font-black text-white italic">{bus.fromCity}</h3>
                    </div>
                    <ArrowRight className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
                    <div className="text-center">
                      <p className="text-[10px] font-black text-gray-500 uppercase">To</p>
                      <h3 className="text-lg font-black text-orange-500 italic">{bus.toCity}</h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 md:gap-8 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase">Departure</p>
                        <p className="text-xs font-bold text-white tracking-tighter">{bus.firstBusTime || "06:00 AM"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase">Fare</p>
                        <p className="text-xs font-black text-emerald-500 tracking-tighter">{bus.fare || "₹100"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-[8px] font-black text-gray-600 uppercase">Type</p>
                        <p className="text-xs font-bold text-blue-400 tracking-tighter">{bus.busType || "Express"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <MapPin className="w-3 h-3 text-orange-500" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                      Via: {bus.boardingPoint || bus.routeDescription || "Shahdol Bus Stand"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                      Verified Route
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredBuses.length === 0 && !isLoading && (
          <div className="text-center py-20">
            <p className="text-gray-500 font-black uppercase tracking-widest text-xs italic">
              No results found for "{searchQuery}"
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
