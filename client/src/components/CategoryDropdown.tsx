import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SubCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  imageUrl?: string;
  subcategories?: SubCategory[];
}

interface CategoryDropdownProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryChange: (categoryName: string | null) => void;
  onSubcategoryChange?: (subcategoryName: string) => void;
}

export function CategoryDropdown({
  categories,
  activeCategory,
  onCategoryChange,
  onSubcategoryChange,
}: CategoryDropdownProps) {
  const [hoveredMainId, setHoveredMainId] = useState<number | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = (categoryId: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredMainId(categoryId);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredMainId(null);
    }, 200); // Small delay to prevent flickering
  };

  const handleSubcategoryClick = (category: Category, subcategory: SubCategory) => {
    onCategoryChange(category.name);
    onSubcategoryChange?.(subcategory.name);
    setDropdownVisible(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Main Categories Dropdown Button */}
      <button
        onClick={() => setDropdownVisible(!dropdownVisible)}
        className="px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2"
      >
        <span className="font-semibold text-slate-700">📂 Categories</span>
        <ChevronDown size={16} className={`transition-transform ${dropdownVisible ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownVisible && (
        <div
          className="absolute top-full left-0 mt-2 w-full max-w-6xl bg-white border border-slate-200 rounded-lg shadow-xl z-50 grid grid-cols-5 gap-0"
          onMouseLeave={handleMouseLeave}
        >
          {categories.map((mainCat) => (
            <div
              key={mainCat.id}
              className="border-r border-slate-100 last:border-r-0"
              onMouseEnter={() => handleMouseEnter(mainCat.id)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Main Category Header */}
              <button
                onClick={() => {
                  onCategoryChange(mainCat.name);
                  setDropdownVisible(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100"
              >
                <span>{mainCat.icon || "📦"}</span>
                <span className="text-sm">{mainCat.name}</span>
              </button>

              {/* Sub-categories List */}
              <div className="bg-slate-50">
                {mainCat.subcategories && mainCat.subcategories.length > 0 ? (
                  mainCat.subcategories.map((subCat) => (
                    <button
                      key={subCat.id}
                      onClick={() => handleSubcategoryClick(mainCat, subCat)}
                      className="w-full px-4 py-2 text-left hover:bg-white transition-colors text-slate-700 text-sm hover:text-[#e4488f] hover:font-semibold border-b border-slate-200 last:border-b-0"
                    >
                      {subCat.icon && <span className="mr-2">{subCat.icon}</span>}
                      {subCat.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-slate-500 text-xs">No sub-categories</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryDropdown;
