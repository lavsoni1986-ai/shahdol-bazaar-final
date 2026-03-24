import { ShoppingCart, MessageCircle } from "lucide-react";
import { Link } from "wouter";
import { openWhatsApp } from "../../lib/order-logic";

interface SovereignProductCardProps {
  data: any;
  onTrack?: (action: string, item: string) => void;
}

export const SovereignProductCard = ({ data, onTrack }: SovereignProductCardProps) => {
  const getImage = () => {
    if (data.imageUrl || data.image) {
      return data.imageUrl || data.image;
    }
    return null;
  };

  const getName = () => {
    return data.title || data.name || "Unknown Product";
  };

  const getCategory = () => {
    return data.category?.name || data.category || 'Product';
  };

  const getPrice = () => {
    if (data.price) {
      return `₹${data.price}`;
    }
    return null;
  };

  const image = getImage();
  const name = getName();
  const price = getPrice();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement cart logic
    console.log('Add to cart:', data.id);
    onTrack?.('add_to_cart', `product_${data.id}`);
  };

  return (
    <Link
      href={`/product/${data.id}`}
      className="block"
      onClick={() => onTrack?.('click', `product_${data.id}`)}
    >
      <div className="relative overflow-hidden rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-0 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 group shadow-[inset_0_0_20px_rgba(249,115,22,0.05)] hover:shadow-[inset_0_0_30px_rgba(249,115,22,0.15)] glass-border sovereign-inner-glow">

        {/* Full-width Image Section */}
        <div className="relative w-full h-40 overflow-hidden rounded-t-[1.5rem]">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-orange-400">{name[0]}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg leading-tight group-hover:text-orange-400 transition-colors mb-1">
              {name}
            </h3>
            <p className="text-white/50 text-xs font-medium">
              {getCategory()}
            </p>
          </div>

          {/* Price Display */}
          {price && (
            <div className="mb-5">
              <span className="text-orange-500 font-bold text-xl">
                {price}
              </span>
            </div>
          )}

          {/* Action Layer: Product Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all">
              View Details
            </button>
            <button
              onClick={handleAddToCart}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold hover:bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all"
            >
              <ShoppingCart className="w-4 h-4" /> Cart
            </button>
          </div>
          
          {/* WhatsApp Order Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openWhatsApp(
                name,
                price || undefined,
                data.store?.name || data.vendor?.name,
                String(data.id),
                String(data.vendorId || data.store?.id),
                String(data.districtId)
              );
              onTrack?.('whatsapp_click', `product_${data.id}`);
            }}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-all"
          >
            <MessageCircle className="w-4 h-4" /> Order on WhatsApp
          </button>
        </div>
      </div>
    </Link>
  );
};