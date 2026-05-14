import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudRain, Sun, Cloud, MapPin, Thermometer, Calendar } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useDistrict } from "@/contexts/DistrictContext";
import { apiRequest } from "@/lib/api-client";

interface LocalPulseBannerProps {
  districtSlug?: string;
  districtId?: number;
}

export default function LocalPulseBanner({ districtSlug: propSlug, districtId: propId }: LocalPulseBannerProps) {
  const { currentDistrict, isReady } = useDistrict();

  const districtSlugFinal = propSlug || currentDistrict?.slug || "";
  const districtIdFinal = propId || currentDistrict?.id;

  const { data: pulseData } = useQuery({
    queryKey: ["local/pulse", districtSlugFinal],
    queryFn: async () => {
      if (!isReady || !districtIdFinal) return null;
      const response = await apiRequest("GET", "/local/pulse");
      return response.data;
    },
    enabled: isReady && !!districtIdFinal
  });

  if (!isReady || !currentDistrict?.id) {
    return null;
  }

  if (!pulseData) return null;

  const getWeatherIcon = (weather: string) => {
    switch (weather.toLowerCase()) {
      case 'hot': return <Sun className="w-6 h-6 text-orange-500" />;
      case 'rainy': return <CloudRain className="w-6 h-6 text-blue-500" />;
      default: return <Cloud className="w-6 h-6 text-gray-500" />;
    }
  };

  const getWeatherColor = (weather: string) => {
    switch (weather.toLowerCase()) {
      case 'hot': return 'from-orange-500/20 to-yellow-500/20 border-orange-500/30';
      case 'rainy': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      default: return 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
    }
  };

  return (
    <Card className={`bg-gradient-to-r ${getWeatherColor(pulseData.weather)} border backdrop-blur-xl`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-white/70" />
              <span className="text-white font-medium">Shahdol Local Pulse</span>
            </div>

            <div className="flex items-center gap-3">
              {getWeatherIcon(pulseData.weather)}
              <div className="flex items-center gap-1">
                <Thermometer className="w-4 h-4 text-white/70" />
                <span className="text-white text-sm">{pulseData.temperature}°C</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {pulseData.isFestival && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">
                  {pulseData.eventName || 'Festival'}
                </span>
              </div>
            )}

            {pulseData.trafficCondition === 'heavy' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                <span className="text-red-400 text-sm font-medium">Heavy Traffic</span>
              </div>
            )}
          </div>
        </div>

        {pulseData.localNews && pulseData.localNews.length > 0 && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
            <p className="text-white/90 text-sm">
              📢 {pulseData.localNews[0]}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}