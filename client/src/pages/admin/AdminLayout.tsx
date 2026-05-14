// 📁 client/src/pages/admin/AdminLayout.tsx

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Home, Users, Store, AlertTriangle, Settings, Activity, FileText, AlertCircle, BarChart3, Brain, Package, ShoppingCart, Layers, Image, MessageSquare, Zap, Globe } from "lucide-react";
import StickyAlerts from "../../components/admin/StickyAlerts";

interface AdminLayoutProps {
  children: ReactNode;
}

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

// 🌍 AVAILABLE DISTRICTS FOR SWITCHING
const DISTRICTS = [
  { slug: "shahdol", name: "Shahdol", id: 121 },
  { slug: "rewa", name: "Rewa", id: 122 },
  { slug: "umaria", name: "Umaria", id: 123 },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();

  // 🌍 District Switcher Function
  const switchDistrict = (slug: string) => {
    localStorage.setItem('districtSlug', slug);
    setLocation(`/${slug}/admin/dashboard`);
  };

  const currentDistrict = localStorage.getItem('districtSlug') || 'shahdol';

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
            {DISTRICTS.map(d => (
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
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
                localStorage.clear();
                window.location.href = "/admin/login";
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>

      {/* Sticky Alerts */}
      <StickyAlerts />
    </div>
  );
}
