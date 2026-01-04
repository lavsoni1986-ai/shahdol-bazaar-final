import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { getApprovedShopsByCategory } from "@/lib/shops";

export default function CategoryListing() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug ?? "";

  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    getApprovedShopsByCategory(slug).then((data) => {
      setShops(data);
      setLoading(false);
    });
  }, [slug]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold capitalize mb-6">
        {slug.replace("-", " ")}
      </h1>

      {loading ? (
        <p>Loading shops…</p>
      ) : shops.length === 0 ? (
        <p>No shops found in this category.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <div key={shop.id} className="shop-card">
              <img
                src={shop.image || "https://via.placeholder.com/400x250"}
                className="h-36 w-full rounded-xl object-cover mb-3"
              />
              <h3 className="text-lg font-semibold">{shop.name}</h3>
              <p className="text-sm text-muted-foreground">
                {shop.description}
              </p>
              <Link
                href={`/shop/${shop.id}`}
                className="btn-secondary mt-4 block text-center"
              >
                View Shop
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
