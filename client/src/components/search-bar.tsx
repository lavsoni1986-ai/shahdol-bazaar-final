import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

type SearchBarProps = {
  initialValue?: string;
  onSearch: (term: string) => void;
  placeholder?: string;
};

export function SearchBar({ initialValue = "", onSearch, placeholder = "Search for products, shops..." }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value.trim());
  };

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3 relative">
        <Search className="text-slate-400" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
        />
        <Button
          type="submit"
          className="bg-[#e4488f] hover:bg-[#d53e83] px-4 cursor-pointer relative z-50 pointer-events-auto"
        >
          Search
        </Button>
      </form>
    </div>
  );
}

