import { Link } from "wouter";

interface PremiumCardProps {
  item: any;
  type: 'product' | 'store' | 'hospital' | 'school' | 'service';
  onTrack?: (action: string, item: string) => void;
  getVendorGradient?: (name: string) => string;
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
    if (type === 'product') return item.category?.name || item.category || 'Product';
    if (type === 'store') return item.category || item.businessType || 'Store';
    if (type === 'hospital') return item.hospitalType || 'Hospital';
    if (type === 'school') return item.board || 'School';
    if (type === 'service') return item.specialties?.[0] || item.businessType || 'Service';
    return '';
  };

  const getPrice = () => {
    if (type === 'product' && item.price) {
      return `₹${item.price}`;
    }
    return null;
  };

  const image = getImage();
  const name = getName();

  const getHref = () => {
    if (type === 'product') return `/product/${item.id}`;
    if (type === 'store') return `/shop/${item.slug}`;
    if (type === 'hospital') return `/hospital/${item.id}`;
    return '#';
  };

  // Product Card Design 2.0
  if (type === 'product') {
    return (
      <Link 
        href={getHref()}
        className="block"
        onClick={() => onTrack?.('click', `product_${item.id}`)}
      >
        <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-[4/5] backdrop-blur-xl hover:shadow-2xl hover:shadow-orange-500/20 hover:translate-y-[-4px] transition duration-500">
          {/* Image */}
          <div className="relative overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-full h-48 object-cover group-hover:scale-110 transition duration-700"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-orange-500/20 to-blue-500/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-orange-500">{name[0]}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col justify-between h-full">
            <div>
              <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
                {name}
              </h3>

              <p className="text-xs text-gray-400 mt-1">
                {getCategory()}
              </p>
            </div>

            <div className="flex justify-between items-center mt-4">
              <span className="text-orange-500 font-bold text-lg">
                {getPrice()}
              </span>

              <button className="text-sm px-3 py-1 rounded-full border border-white/10 hover:bg-orange-500 hover:text-white transition">
                View
              </button>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Store Card Design 2.0
  return (
    <Link 
      href={getHref()}
      className="block"
      onClick={() => onTrack?.('click', `store_${item.id}`)}
    >
      <div className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-[4/5] backdrop-blur-xl hover:shadow-2xl hover:shadow-orange-500/20 transition duration-500">
        {/* Image */}
        <div className="relative overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-48 object-cover group-hover:scale-110 transition duration-700"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-orange-500/20 to-blue-500/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-orange-500">{name[0]}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col justify-between h-full">
          <div>
            <h3 className="font-semibold text-white group-hover:text-orange-400 transition">
              {name}
            </h3>

            <p className="text-xs text-gray-400 mt-1">
              {getCategory()}
            </p>
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
