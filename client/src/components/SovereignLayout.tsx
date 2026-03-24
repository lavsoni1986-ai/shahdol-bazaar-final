import React from "react";
import { ShieldCheck, Phone, MapPin, Clock, Star, ArrowLeft, ArrowRight, MessageCircle, Package, MapPinned } from "lucide-react";

export type PageType = "school" | "hospital" | "product";

interface SovereignHeaderProps {
  title: string;
  category: string;
  type: PageType;
  subtitle?: string;
}

const themeConfigs = {
  school: {
    gradient: "from-purple-600 to-indigo-600",
    iconColor: "text-black",
    badge: "EDUCATION VERIFIED",
  },
  hospital: {
    gradient: "from-red-600 to-rose-600",
    iconColor: "text-white",
    badge: "HEALTHCARE VERIFIED",
  },
  product: {
    gradient: "from-orange-600 to-amber-600",
    iconColor: "text-black",
    badge: "DSSL VERIFIED",
  },
};

export function SovereignPageHeader({ title, category, type, subtitle }: SovereignHeaderProps) {
  const config = themeConfigs[type];

  return (
    <div className={`relative pt-20 pb-16 px-6 rounded-b-[3.5rem] bg-gradient-to-br ${config.gradient} overflow-hidden shadow-2xl`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className={`w-5 h-5 ${config.iconColor}`} />
          <span className="text-[10px] font-black uppercase text-black/60 tracking-widest">{category} • {config.badge}</span>
        </div>
        <h1 className="text-3xl font-black uppercase italic text-black tracking-tighter leading-none text-sovereign-title">{title}</h1>
        {subtitle && <p className="text-black/60 text-sm font-medium mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

interface SovereignBackButtonProps {
  onClick?: () => void;
}

export function SovereignBackButton({ onClick }: SovereignBackButtonProps) {
  return (
    <button 
      onClick={onClick || (() => window.history.back())}
      className="absolute top-6 left-6 z-50 p-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full hover:bg-orange-600 transition-all"
    >
      <ArrowLeft className="w-5 h-5 text-white" />
    </button>
  );
}

interface ContactButtonProps {
  type: "call" | "map" | "hours" | "whatsapp";
  value?: string;
  onClick?: () => void;
  href?: string;
}

export function SovereignContactButton({ type, value, onClick, href }: ContactButtonProps) {
  const configs = {
    call: { icon: Phone, label: "Call", color: "text-green-400" },
    map: { icon: MapPin, label: "Map", color: "text-red-400" },
    hours: { icon: Clock, label: "Open", color: "text-blue-400" },
    whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-emerald-400" },
  };

  const config = configs[type];
  const Icon = config.icon;

  const content = (
    <div className="glass-card-3d p-4 rounded-3xl flex flex-col items-center justify-center gap-2 border border-white/10 hover:bg-white/[0.1] transition-all cursor-pointer">
      <Icon className={`w-5 h-5 ${config.color}`} />
      <span className="text-[8px] font-black uppercase text-slate-500 tracking-tighter">{config.label}</span>
      {value && type !== "call" && type !== "whatsapp" && <span className="text-[10px] text-white font-bold truncate max-w-full">{value}</span>}
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  
  return <button onClick={onClick}>{content}</button>;
}

interface ContactGridProps {
  phone?: string;
  address?: string;
  hours?: string;
  mapLink?: string;
  whatsapp?: string;
}

export function SovereignContactGrid({ phone, address, hours, mapLink, whatsapp }: ContactGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 -mt-12 relative z-10 px-4">
      {phone && (
        <a href={`tel:${phone}`}>
          <SovereignContactButton type="call" />
        </a>
      )}
      {address && (
        <a href={mapLink || `https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer">
          <SovereignContactButton type="map" value={address} />
        </a>
      )}
      {hours && (
        <SovereignContactButton type="hours" value={hours} />
      )}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
          <SovereignContactButton type="whatsapp" />
        </a>
      )}
    </div>
  );
}

interface FeatureItemProps {
  icon?: React.ReactNode;
  text: string;
  value?: string;
}

export function SovereignFeatureItem({ icon, text, value }: FeatureItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3">
        {icon || <ArrowRight className="w-4 h-4 text-orange-500" />}
        <span className="text-sm font-bold text-slate-300">{text}</span>
      </div>
      {value && <span className="text-xs text-orange-400 font-bold">{value}</span>}
    </div>
  );
}

interface FeatureSectionProps {
  title: string;
  features: string[];
}

export function SovereignFeatureSection({ title, features }: FeatureSectionProps) {
  return (
    <div className="glass-card-3d p-6 rounded-[2rem] border border-white/10 mb-6">
      <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">{title}</h3>
      <div className="space-y-3">
        {features.map((feature, index) => (
          <SovereignFeatureItem key={index} text={feature} />
        ))}
      </div>
    </div>
  );
}

export function SovereignVerifiedBadge() {
  return (
    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center gap-4">
      <div className="p-3 bg-emerald-500 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)]">
        <Star className="w-6 h-6 text-black fill-current" />
      </div>
      <div>
        <h4 className="text-emerald-400 font-black italic uppercase text-sm">Sovereign Standard</h4>
        <p className="text-white/50 text-[10px] font-bold">Verified by Shahdol Bazaar Authority</p>
      </div>
    </div>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SovereignGlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div className={`glass-card-3d p-6 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

interface SpecGridProps {
  items: { label: string; value: string; icon?: React.ReactNode }[];
}

export function SovereignSpecGrid({ items }: SpecGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {items.map((item, index) => (
        <div key={index} className="p-4 bg-white/5 rounded-2xl border border-white/5">
          {item.icon && <div className="mb-2">{item.icon}</div>}
          <p className="text-[10px] text-slate-500 uppercase font-black">{item.label}</p>
          <p className="text-sm font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

interface ProductSpecsProps {
  stock?: string;
  district?: string;
  category?: string;
  price?: string;
  originalPrice?: number;
}

export function SovereignProductSpecs({ stock = "In Stock", district = "Shahdol", category, price, originalPrice }: ProductSpecsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
        <Package className="w-4 h-4 text-orange-500 mb-2" />
        <p className="text-[10px] text-slate-500 uppercase font-black">Stock Status</p>
        <p className="text-sm font-bold">{stock}</p>
      </div>
      <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
        <MapPin className="w-4 h-4 text-orange-500 mb-2" />
        <p className="text-[10px] text-slate-500 uppercase font-black">Service Area</p>
        <p className="text-sm font-bold">{district}</p>
      </div>
      {category && (
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 col-span-2">
          <p className="text-[10px] text-slate-500 uppercase font-black">Category</p>
          <p className="text-sm font-bold">{category}</p>
        </div>
      )}
    </div>
  );
}

interface WhatsAppButtonProps {
  onClick?: () => void;
  text?: string;
}

export function SovereignWhatsAppButton({ onClick, text = "Order on WhatsApp" }: WhatsAppButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-orange-600 text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_20px_40px_rgba(234,88,12,0.3)] hover:bg-orange-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
    >
      <MessageCircle className="w-6 h-6 fill-current" />
      {text}
    </button>
  );
}
