import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Package, MapPin } from "lucide-react";
import { openWhatsApp } from "@/lib/order-logic";
import { useDistrict } from "@/contexts/DistrictContext";
import { 
  SovereignPageHeader, 
  SovereignBackButton,
  SovereignGlassCard,
  SovereignProductSpecs,
  SovereignWhatsAppButton,
  SovereignVerifiedBadge
} from "@/components/SovereignLayout";

export default function ProductDetail() {
  const { id } = useParams();
  const { districtId } = useDistrict();
  const { data: product, isLoading } = useQuery({ queryKey: [`/api/products/${id}`] });

  if (isLoading) return (
    <div className="min-h-screen sovereign-bg flex items-center justify-center text-orange-500 animate-pulse font-black">
      SYSTEM LOADING...
    </div>
  );
  
  if (!product) return (
    <div className="min-h-screen sovereign-bg flex items-center justify-center text-red-500 font-black italic uppercase">
      404: Product Not Found
    </div>
  );

  const handleWhatsAppOrder = () => {
    openWhatsApp(
      product.name || product.title,
      product.price ? `₹${product.price}` : undefined,
      product.storeName || product.shopName,
      String(product.id),
      String(product.vendorId || product.shopId),
      String(districtId || 1)
    );
  };

  return (
    <div className="min-h-screen sovereign-bg text-white selection:bg-orange-500/30">
      {/* Image Hero */}
      <div className="relative h-[60vh] w-full">
        <SovereignBackButton />
        <img 
          src={product.imageUrl} 
          className="w-full h-full object-cover shadow-[0_30px_100px_rgba(0,0,0,0.9)]" 
          alt={product.name} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030005] via-[#030005]/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="px-6 -mt-32 relative z-10 pb-20">
        <SovereignGlassCard className="p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black tracking-widest uppercase border border-emerald-500/30">
              DSSL Verified
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">ID: #{id}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-2 text-sovereign-title">
            {product.name}
          </h1>
          
          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <p className="text-4xl font-black text-orange-500 italic">₹{product.price}</p>
            <div className="h-6 w-px bg-white/10" />
            <p className="text-slate-500 text-xs font-bold line-through">₹{Math.round(product.price * 1.2)}</p>
          </div>

          {/* Description */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
            {product.description || "शहडोल के विश्वसनीय वेंडर द्वारा उपलब्ध कराया गया प्रीमियम प्रोडक्ट।"}
          </p>

          {/* Specs */}
          <SovereignProductSpecs 
            stock="In Stock" 
            district="Shahdol" 
            category={product.category}
          />

          {/* WhatsApp Action */}
          <SovereignWhatsAppButton onClick={handleWhatsAppOrder} />
        </SovereignGlassCard>

        {/* Verified Badge */}
        <div className="mt-6">
          <SovereignVerifiedBadge />
        </div>
      </div>
    </div>
  );
}
