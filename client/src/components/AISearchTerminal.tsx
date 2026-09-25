import { useState } from "react";
import { Link } from "wouter";
import { Phone, MessageCircle, MapPin, ArrowRight } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion.config";
import { apiRequest } from "@/lib/api-client";
import { ACTION_TYPES } from "@/constants/action-types";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";
import { normalizeCanonicalEntity } from "@/shared/api/response-normalizers";
import { useDistrict } from "@/contexts/DistrictContext";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

export default function AISearchTerminal() {
  const [query, setQuery] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("q") || "";
    }
    return "";
  });
  const [isListening, setIsListening] = useState(false);
  const { currentDistrict: district } = useDistrict();
  const { data, isLoading, isError, error, refetch } = useSearch(query);

  const handleSearch = (q: string) => {
    if (q.trim() !== query.trim()) {
      setQuery(q.trim());
    }
  };

  const startVoice = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("आपका ब्राउज़र वॉइस सर्च सपोर्ट नहीं करता।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      handleSearch(text);
    };

    recognition.onerror = (event: any) => {
      const errorMap: Record<string, string> = {
        "not-allowed": "कृपया माइक की परमिशन दें।",
        "network": "इंटरनेट कनेक्शन चेक करें।",
        "no-speech": "कुछ सुनाई नहीं दिया, फिर से बोलें।",
      };

      toast.warning(errorMap[event.error] || "वॉइस सर्च में समस्या आई।");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    // ⏱️ safety timeout
    setTimeout(() => {
      recognition.stop();
      setIsListening(false);
    }, 6000);

    recognition.start();
  };

  const trackAction = (vendorId: number, actionType: string, query: string) => {
    apiRequest("POST", "/ai/action-learn", {
      vendorId,
      actionType,
      query
    }).catch(err => console.error("Action tracking failed:", err));
  };

  const normalizeSearchResults = (results: any[]): CanonicalEntity[] => {
    return results.map(v => normalizeCanonicalEntity(v, district?.slug));
  };

  return (
    <div className="p-4 bg-black/80 rounded-xl">
      {/* 🔎 INPUT */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative"
      >
        {/* Glow background */}
        <div className="absolute inset-0 bg-orange-500/10 blur-3xl rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500" />

        <div className="flex gap-2 relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Search anything..."
            className="flex-1 p-3 rounded-lg bg-white/5 backdrop-blur border border-white/10
            focus:ring-2 focus:ring-orange-500 transition-all duration-300 hover:border-orange-500/30 text-white"
          />

          {/* 🎤 MIC */}
          <motion.button
            onClick={startVoice}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-3 rounded-lg transition-all duration-200 ${isListening
              ? "bg-red-600 animate-pulse text-white shadow-lg shadow-red-500/25"
              : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25"
              }`}
          >
            🎤
          </motion.button>
        </div>
      </motion.div>

      {/* ⚡ QUICK CHIPS */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {[
          "Night Food",
          "Doctor",
          "Bus Timing",
          "Emergency Blood",
          "Cheapest Gas"
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => handleSearch(chip)}
            className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700 text-white"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* SHOW INTENT CONFIRMATION */}
      {query && (
        <p className="text-xs text-gray-400 mt-2">
          Searching for "{query}" in {district?.name || "your district"}
        </p>
      )}

      {/* VOICE LISTENING INDICATOR */}
      {isListening && (
        <p className="text-xs text-green-400 mt-2">
          🎤 सुन रहा हूँ...
        </p>
      )}

      {/* 📊 RESULTS */}
      <div className="mt-4">
        {isLoading && (
          <div className="flex items-center gap-2 py-4 text-orange-400">
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Searching in {district?.name || "Shahdol"}...</span>
          </div>
        )}

        {/* ERROR STATE WITH RETRY */}
        {isError && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm mb-2">
              {(error as any)?.message || "सर्च लोड करने में समस्या आई। कृपया पुनः प्रयास करें।"}
            </p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors"
            >
              फिर से कोशिश करें (Retry)
            </button>
          </div>
        )}

        {/* AI ANSWER */}
        {data?.answer && !isLoading && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-orange-400 text-sm">{data.answer}</p>
            {data.confidenceMessage && (
              <p className="text-xs text-gray-400 mt-1">AI Confidence: {data.confidenceMessage}</p>
            )}
          </div>
        )}

        {/* DEFAULT STATE - Show when no query and no results */}
        {!isLoading && !isError && !query && (!data?.results || data.results.length === 0) && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔥</span>
            </div>
            <h3 className="text-white font-semibold mb-2">Trending in Shahdol</h3>
            <p className="text-gray-400 text-sm mb-4">
              What's popular right now
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
              {[
                { term: "Doctor", icon: "👨‍⚕️" },
                { term: "Mobile Repair", icon: "📱" },
                { term: "Night Food", icon: "🍕" },
                { term: "Gas Agency", icon: "⛽" },
                { term: "Plumber", icon: "🔧" },
                { term: "Grocery", icon: "🛒" }
              ].map(({ term, icon }) => (
                <button
                  key={term}
                  onClick={() => handleSearch(term)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 text-gray-300 text-sm rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700/50"
                >
                  <span>{icon}</span>
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* NO RESULTS FALLBACK */}
        {!isLoading && !isError && query.length >= 2 && (!data?.results || data.results.length === 0) && !data?.answer && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>"{query}" के लिए कोई सीधा परिणाम नहीं मिला।</p>
            <p className="text-xs text-gray-500 mt-1">अन्य कीवर्ड से खोजें या ट्रेंडिंग सुझाव देखें।</p>
          </div>
        )}

        {(() => {
          const telemetryCount = data?.telemetryTruth?.matchedEntities ?? data?.telemetry?.matchedEntities ?? 0;
          return !isLoading && telemetryCount > 0 ? (
            <p className="text-sm text-gray-300 mb-3">
              Found {telemetryCount} results in {district?.name || "Shahdol"}
            </p>
          ) : null;
        })()}

        {(() => {
          const safeResults = Array.isArray(data?.results) ? data.results : [];
          const normalizedResults = normalizeSearchResults(safeResults);

          return (
            <>
              {process.env.NODE_ENV === 'development' && data?.telemetryTruth && (
                <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-900 rounded">
                  Telemetry: {data.telemetryTruth.matchedEntities} entities
                  | UI: {normalizedResults.length} results
                  | Match: {data.telemetryTruth.matchedEntities === normalizedResults.length ? '✅' : '❌'}
                </div>
              )}
              {normalizedResults.map((entity, index) => {
                const rawVendor = safeResults[index];
                const rawPhone = entity.phone || rawVendor?.phone || rawVendor?.meta?.phone;
                const cleanPhone = rawPhone ? String(rawPhone).replace(/\D/g, '') : null;
                const phone10 = cleanPhone && cleanPhone.length >= 10 ? cleanPhone.slice(-10) : null;
                const addressText = entity.address || rawVendor?.address || rawVendor?.meta?.address;

                // Entity-specific canonical view label
                const viewLabel = (() => {
                  switch (entity.kind) {
                    case 'product': return 'View Product';
                    case 'hospital': return 'View Hospital';
                    case 'service': return 'View Service';
                    case 'bus': return 'View Timetable';
                    case 'school': return 'View School';
                    default: return 'Visit Store';
                  }
                })();

                const whatsappText = entity.kind === 'product'
                  ? `नमस्ते, मुझे शहडोल बाज़ार पर "${entity.title}" के बारे में जानकारी चाहिए।`
                  : `नमस्ते, मुझे शहडोल बाज़ार पर "${entity.title}" के बारे में जानकारी चाहिए।`;

                return (
                  <div key={`${entity.id || 'unknown'}-${index}`} className="mb-4">
                    {/* Best Match indicator */}
                    {index === 0 && (
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider rounded-full">
                          ★ Best Match
                        </span>
                      </div>
                    )}

                    {/* Rich Grounded Entity Card */}
                    <SovereignEntityCard
                      entity={entity}
                      variant="search"
                      onTrack={(action) => trackAction(entity.id, action, query)}
                    />

                    {/* Direct Citizen Actions Bar */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* 1. Primary Canonical View CTA */}
                      <Link
                        href={entity.route}
                        onClick={() => trackAction(entity.id, ACTION_TYPES.BOOK_VENDOR, query)}
                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-bold transition-all active:scale-[0.98] min-h-[44px] shadow-sm"
                      >
                        <span>{viewLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {/* 2. Direct Call Action */}
                      {phone10 && (
                        <a
                          href={`tel:${phone10}`}
                          onClick={() => trackAction(entity.id, ACTION_TYPES.CALL_VENDOR, query)}
                          className="flex-1 min-w-[85px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-[0.98] min-h-[44px]"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      )}

                      {/* 3. Direct WhatsApp Action */}
                      {phone10 && (
                        <a
                          href={`https://wa.me/91${phone10}?text=${encodeURIComponent(whatsappText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackAction(entity.id, ACTION_TYPES.WHATSAPP_VENDOR, query)}
                          className="flex-1 min-w-[95px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all active:scale-[0.98] min-h-[44px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {/* 4. Directions Action (for physical locations) */}
                      {addressText && entity.kind !== 'product' && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText + ", " + (district?.name || "Shahdol"))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackAction(entity.id, ACTION_TYPES.OPEN_MAPS, query)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10 text-xs font-medium transition-all active:scale-[0.98] min-h-[44px]"
                        >
                          <MapPin className="w-3.5 h-3.5 text-orange-400" />
                          <span>Map</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* EMPTY STATE */}
        {(() => {
          const safeResults = Array.isArray(data?.results) ? data.results : [];
          const normalizedResults = normalizeSearchResults(safeResults);
          return !isLoading && query && normalizedResults.length === 0 && (
            <p className="text-gray-400">No verified shops found yet. You can still explore manually.</p>
          );
        })()}
      </div>
    </div>
  );
}
