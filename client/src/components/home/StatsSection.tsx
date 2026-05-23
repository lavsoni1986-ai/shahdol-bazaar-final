import React from "react";
import { Users, ShoppingBag, Activity, Globe } from "lucide-react";

interface StatsProps {
  vendors: number | string;
  services: number | string;
  activeUsers: number | string;
}

// 🛡️ BHARAT-OS: DISTRICT-LOCKED STATS COMPONENT
export default function StatsSection({ vendors, services, activeUsers }: StatsProps) {
  const stats = [
    {
      label: "Verified Vendors",
      value: vendors,
      icon: <Users className="w-6 h-6 text-blue-500" />,
      color: "blue"
    },
    {
      label: "Live Services",
      value: services,
      icon: <ShoppingBag className="w-6 h-6 text-orange-500" />,
      color: "orange"
    },
    {
      label: "Active Users",
      value: activeUsers,
      icon: <Activity className="w-6 h-6 text-emerald-500" />,
      color: "emerald"
    },
    {
      label: "Global Pulse",
      value: "99.9%",
      icon: <Globe className="w-6 h-6 text-cyan-500" />,
      color: "cyan"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <div key={index} className="glass-card-sovereign p-8 group hover:border-orange-500/30 transition-all">
            <div className={`p-4 rounded-2xl bg-${stat.color}-500/10 w-fit mb-6 group-hover:scale-110 transition-transform`}>
              {stat.icon}
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2">
              {stat.label}
            </p>
            <h4 className="text-4xl font-black text-white tracking-tighter group-hover:text-orange-500 transition-colors">
              {stat.value || "—"}
            </h4>
          </div>
        ))}
      </div>
    </div>
  );
}