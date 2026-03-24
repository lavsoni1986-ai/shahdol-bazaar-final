import { Link } from "wouter";

interface SearchResult {
  id: number;
  name: string;
  type: 'product' | 'store';
  matchScore: string;
  category?: string;
  price?: string;
  imageUrl?: string | null;
}

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  loading: boolean;
  results: SearchResult[];
  aiResponse: string | null;
}

export function SearchBar({ query, setQuery, onSearch, loading, results, aiResponse }: SearchBarProps) {
  return (
    <div>
      {/* Search Results & AI Response */}
      {(results.length > 0 || aiResponse) && (
        <div className="space-y-4">
          {/* AI Response */}
          {aiResponse && (
            <div className="glass-card-3d p-4 border border-violet-500/30">
              <p className="text-xs text-violet-400 mb-1">AI Recommendation</p>
              <p className="text-gray-300 text-sm">{aiResponse}</p>
            </div>
          )}

          {/* Search Results Grid */}
          {results.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-3">{results.length} results found</p>
              <div className="grid grid-cols-2 gap-3">
                {results.map((item) => (
                  <Link
                    key={item.id}
                    href={item.type === 'product' ? `/product/${item.id}` : `/shop/${item.id}`}
                    className="block"
                  >
                    <div className="glass-card-3d p-3 border border-white/10 hover:border-orange-500/40 transition-all group cursor-pointer">
                      <div className="aspect-square relative overflow-hidden rounded-xl mb-2">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-xl text-white font-bold">{item.name[0]}</span>
                          </div>
                        )}
                        <span className="absolute top-2 right-2 text-xs bg-orange-600/90 px-2 py-1 rounded-full">
                          {item.matchScore}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-400 text-xs capitalize">{item.category || item.type}</span>
                        {item.price && <span className="text-orange-400 font-bold text-sm">{item.price}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
