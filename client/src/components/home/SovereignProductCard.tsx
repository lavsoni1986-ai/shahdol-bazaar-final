// 🛡️ BHARAT-OS: RE-EXPORT TO CANONICAL SOVEREIGN PRODUCT CARD
// Backward-compatible re-export so existing consumers (TrendingSection, marketplace)
// don't need import changes. All NEW code imports from @/components/shared/SovereignProductCard.

import { SovereignProductCard as SPC, ProductCardSkeleton as PCS } from "@/components/shared/SovereignProductCard";
import type { ProductCardVariant as PCV, ProductCardData as PCD } from "@/components/shared/SovereignProductCard";

export type ProductCardVariant = PCV;
export type ProductCardData = PCD;
export const SovereignProductCard = SPC;
export const ProductCardSkeleton = PCS;
export default SPC;
