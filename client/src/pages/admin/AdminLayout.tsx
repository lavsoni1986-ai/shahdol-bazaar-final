// 📁 client/src/pages/admin/AdminLayout.tsx

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Home, Users, Store, AlertTriangle, Settings, Activity, FileText, AlertCircle, BarChart3, Brain, Package, ShoppingCart, Layers, Image, MessageSquare, Zap, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StickyAlerts from "../../components/archive/legacy/StickyAlerts";

interface AdminLayoutProps {
  children: ReactNode;
}

type District = {
  id: number;
  slug: string;
  name: string;
};

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  { name: "AI Control", href: "/admin/ai-dashboard", icon: Brain },
  { name: "Vendors", href: "/admin/vendors", icon: Store },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { name: "Categories", href: "/admin/categories", icon: Layers },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Reviews", href: "/admin/reviews", icon: MessageSquare },
  { name: "Banners", href: "/admin/banners", icon: Image },
  { name: "News", href: "/admin/news", icon: Zap },
  { name: "Districts", href: "/admin/districts", icon: Globe },
  { name: "Fraud Center", href: "/admin/fraud", icon: AlertTriangle },
  { name: "Policy", href: "/admin/policy", icon: Settings },
  { name: "Audit", href: "/admin/audit", icon: FileText },
  { name: "Emergency", href: "/admin/emergency", icon: AlertCircle },
];

// Districts will be loaded from backend via TanStack Query
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";


export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  // 🌍 District Switcher Function - backend-driven
  const { data: districts = [], isLoading: districtsLoading } = useQuery<District[]>({
    queryKey: ['admin-districts'],
    queryFn: async () => {
      const res = await apiRequest('GET', 'admin/districts');
      return (res?.data ?? []) as District[];
    }
  });

  const switchDistrict = (slug: string) => {
    localStorage.setItem('districtSlug', slug);
    setLocation(`/${slug}/admin/dashboard`);
  };

  const currentDistrict = localStorage.getItem('districtSlug') || (districts[0]?.slug || 'shahdol');

  return (
    <div className="min-h-screen bg-nebula-gradient flex">
      {/* Sidebar */}
      <div className="w-64 bg-black/80 backdrop-blur-lg border-r border-gray-700">
        <div className="p-6">
          {/* District Switcher */}
          <select
            className="w-full bg-black/40 text-orange-500 border border-orange-500/30 rounded-lg px-3 py-2 text-sm font-bold outline-none cursor-pointer mb-4"
            value={currentDistrict}
            onChange={(e) => switchDistrict(e.target.value)}
          >
            {districtsLoading && (
              <option value={currentDistrict}>Loading districts…</option>
            )}
            {!districtsLoading && districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                🌍 {d.name} (ID: {d.id})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-orange-500" />
            <h1 className="text-xl font-bold text-white">BHARAT-OS</h1>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                    }`}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header Bar */}
        <div className="bg-black/50 backdrop-blur-lg border-b border-gray-700 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* User Profile */}
            <div className="flex items-center gap-2 text-gray-300">
              <Shield size={16} />
              <span>{JSON.parse(localStorage.getItem("user") || "{}")?.username || "Admin"}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                console.log("🔴 ADMIN LOGOUT CLICKED");
                logout(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 relative z-50"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-x-hidden">
          <div className="max-w-full">
            {children}
          </div>
        </div>
      </div>

      {/* Sticky Alerts */}
      <StickyAlerts />
    </div>
  );
}
