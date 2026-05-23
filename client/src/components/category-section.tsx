import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

type Category = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
};

export function CategorySection() {
  const { data, isLoading, error, status } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/categories");
      
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.status}`);
      }
      
      const json = await res.json();
      
      if (!json.categories || !Array.isArray(json.categories)) {
        return [];
      }
      
      return json.categories as Category[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center py-8 text-red-600">
        <p>Failed to load categories. Please refresh the page.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center py-8 text-gray-500">
        <p>No categories available</p>
      </div>
    );
  }

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Shop by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {data.map((category) => (
            <Link
              key={category.id}
              href={`/category-listing?category=${category.slug}`}
              className="group"
            >
              <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg hover:shadow-lg transition-shadow duration-200">
                {/* Icon or Image */}
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="w-16 h-16 object-cover rounded-full mb-3 group-hover:scale-110 transition-transform duration-200"
                  />
                ) : category.icon ? (
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                    {category.icon}
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-orange-200 rounded-full mb-3 flex items-center justify-center text-2xl font-bold text-orange-600">
                    {category.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Category Name */}
                <p className="text-center text-sm font-semibold text-gray-700 group-hover:text-orange-600 transition-colors duration-200">
                  {category.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
