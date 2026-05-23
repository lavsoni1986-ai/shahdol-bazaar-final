import React from "react";
import { Bus, Clock, MapPin, IndianRupee } from "lucide-react";

interface BusRoute {
  id: number;
  fromCity: string;
  toCity: string;
  time: string;
  price: number;
  type: string;
  routeDescription: string;
}

interface TransitLiveProps {
  buses?: BusRoute[];
}

export default function TransitLive({ buses = [] }: TransitLiveProps) {
  if (buses.length === 0) {
    return (
      <div className="text-center py-12">
        <Bus className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/40">No bus routes found</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-black text-white mb-6 tracking-tighter">Transit Live</h2>
      <div className="space-y-4">
        {buses.map((bus) => (
          <div key={bus.id} className="glass-card-sovereign p-6 group">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-500 uppercase">From</p>
                  <h3 className="text-lg font-black text-white italic">{bus.fromCity}</h3>
                </div>
                <Bus className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition-transform" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-500 uppercase">To</p>
                  <h3 className="text-lg font-black text-orange-500 italic">{bus.toCity}</h3>
                </div>
              </div>

              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase">Departure</p>
                    <p className="text-xs font-bold text-white tracking-tighter">{bus.time || "06:00 AM"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-[8px] font-black text-gray-600 uppercase">Fare</p>
                    <p className="text-xs font-black text-emerald-500 tracking-tighter">₹{bus.price || "100"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <MapPin className="w-3 h-3 text-orange-500" />
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                  {bus.routeDescription || "Main Highway"}
                </span>
              </div>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                {bus.type || "Express"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}