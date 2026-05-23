// 🛡️ BHARAT-OS: PREMIUM CARD — CANONICAL ENTITY CARD WITH PRODUCT DELEGATION
// This card handles multi-type entity display (product, store, hospital, school, service).
// For product type: delegates to SovereignProductCard (single canonical source of truth).
// For non-product types: maintains legacy PremiumCard presentation.

import { Link } from "wouter";
import { motion } from "framer-motion";
import { safeText } from "@/lib/admin-response";
import { partnerRoutes, getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";
import { SovereignProductCard, type ProductCardData } from "@/components/shared/SovereignProductCard";

interface PremiumCardProps {
  item: any;
  type: "product" | "store" | "hospital" | "school" | "service";
  onTrack?: (action: string, item: string) => void;
  getVendorGradient?: (name: string) => string;
}

// ─── ADAPTER: transform raw item to canonical ProductCardData ───
function toSovereignProductData(item: any): ProductCardData {
  const name = item.name || item.title || item.shopName || "Product";
  return {
    id: item.id,
    title: name,
    name,
    price: item.price || 0,
    mrp: item.mrp ?? null,
    imageUrl: item.imageUrl || item.image || item.logo || null,
    image: null,
    category: item.category?.name || item.category || "General",
    slug: item.slug || null,
    isSponsored: Boolean(item.isSponsored),
    isTrending: Boolean(item.isTrending),
    discount: item.discount ?? null,
    sellerName: item.sellerName || item.partner?.shopName || null,
    sellerSlug: item.sellerSlug || item.partner?.slug || null,
    sellerVerified: Boolean(item.sellerVerified ?? item.partner?.isVerified),
    dsslScore: item.dsslScore ?? item.partner?.dsslScore ?? null,
    district: item.district ?? null,
    deliveryInfo: item.deliveryInfo ?? null,
    rating: item.rating ?? null,
    reviewCount: item.reviewCount ?? null,
  };
}

export function PremiumCard({ item, type, onTrack }: PremiumCardProps) {
  const getImage = () => {
    if (item.imageUrl || item.image || item.logo) {
      return item.imageUrl || item.image || item.logo;
    }
    return null;
  };

  const getName = () => {
    return item.name || item.title || item.shopName || item.hospitalName || item.schoolName || "Unknown";
  };

  const getCategory = () => {
    if (type === "product") return safeText(item.category?.name || item.category || "Product");
    if (type === "store") return safeText(item.category?.name || item.category || item.businessType || "Store");
    if (type === "hospital") return safeText(item.hospitalType || "Hospital");
    if (type === "school") return safeText(item.board || "School");
    if (type === "service") return safeText(item.specialties?.[0] || item.businessType || "Service");
    return "";
  };

  const getPrice = () => {
    if (type === "product" && item.price) {
      return `₹${item.price}`;
    }
    return null;
  };

  const image = getImage();
  const name = getName();

  const getHref = () => {
    if (type === "product") {
      if (!item.slug) {
        console.warn("Missing slug for product:", item);
        return `/marketplace/products/${item.id}`; // fallback to ID
      }
      return `/marketplace/products/${item.slug}`;
    }
    if (type === "store") {
      if (!item.slug) {
        console.warn("Missing slug for store:", item);
        return null;
      }
      return partnerRoutes.profile(getCurrentDistrictSlug(), item.slug);
    }
    if (type === "hospital") {
      if (!item.slug) {
        console.warn("Missing slug for hospital:", item);
        return null;
      }
      return `/hospital/${item.slug}`;
    }
    return null;
  };

  const href = getHref();

  // ── PRODUCT: DELEGATE TO CANONICAL SOVEREIGN PRODUCT CARD ──
  if (type === "product") {
    const productData = toSovereignProductData(item);
    const vendorInfo = item?.partner
      ? { isVerified: item.partner.isVerified, dsslScore: item.partner.dsslScore }
      : null;

    return (
      <SovereignProductCard
        data={productData}
        variant="featured"
        vendor={vendorInfo}
        onTrack={(action, id) => onTrack?.(action, `product_${id}`)}
      />
    );
  }

  // ── NON-PRODUCT: LEGACY PREMIUM CARD ──
  if (!href) {
    return (
      <div className="group relative rounded-2xl overflow-hidden aspect-[4/5] backdrop-blur-xl opacity-50 cursor-not-allowed">
        <div className="relative overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-48 object-cover grayscale" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-500/20 to-gray-700/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-500">{name[0]}</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col justify-between h-full">
          <div>
            <h3 className="font-semibold text-gray-400">{name}</h3>
            <p className="text-xs text-gray-500 mt-1">Coming Soon</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block"
      onClick={() => onTrack?.("click", `store_${item.id}`)}
    >
      <div
        className={`group relative rounded-2xl overflow-hidden aspect-[4/5] backdrop-blur-xl transition duration-500 ${item.isSponsored
            ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-2 border-yellow-500/40 shadow-[inset_0_0_30px_rgba(234,179,8,0.2),0_0_50px_rgba(234,179,8,0.3)] hover:shadow-[inset_0_0_40px_rgba(234,179,8,0.3),0_0_60px_rgba(234,179,8,0.4)]"
            : "bg-white/5 border border-white/10 hover:shadow-2xl hover:shadow-orange-500/20"
          }`}
      >
        {/* Image */}
        <div className="relative overflow-hidden">
          {image ? (
            <img src={image} alt={name} className="w-full h-48 object-cover group-hover:scale-110 transition duration-700" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-500/20 to-blue-500/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-orange-500">{name[0]}</span>
            </div>
          )}

          {/* Sponsored Badge */}
          {item.isSponsored && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg border-2 border-yellow-300/50">
              ⭐ SPONSORED
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col justify-between h-full">
          <div>
            <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
              {name}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{getCategory()}</p>
          </div>

          <div className="flex justify-between items-center mt-4">
            <button className="text-sm px-3 py-1 rounded-full border border-white/10 hover:bg-orange-500 hover:text-white transition">
              Visit Store →
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default PremiumCard;
