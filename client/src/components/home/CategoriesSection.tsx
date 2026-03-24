import { Link } from "wouter";
import { Package, Store } from "lucide-react";

interface CategoriesSectionProps {
  categories: any[];
  onTrack?: (action: string, item: string) => void;
}

export function CategoriesSection({ categories, onTrack }: CategoriesSectionProps) {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="px-4">
      <h2 className="text-base font-semibold mb-3">Categories</h2>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat: any) => {
          const IconComponent = Package;
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              onClick={() => onTrack?.('category_click', cat.slug)}
              className="group glass rounded-xl px-4 py-3 flex items-center gap-3 border border-white/10 hover:border-orange-400/30 hover:bg-white/[0.05] hover:shadow-[0_0_25px_rgba(249,115,22,0.25)] transition-all duration-300 hover:scale-[1.03] whitespace-nowrap"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <Store className="text-orange-400 w-4 h-4 group-hover:text-orange-400" />
              </div>
              <p className="text-xs font-medium">{cat.name}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
