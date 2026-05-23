import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion.config";
import { apiRequest } from "@/lib/api-client";
import { ACTION_TYPES } from "@/constants/action-types";
import { useDistrict } from "@/contexts/DistrictContext";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import { CanonicalEntity } from "@/shared/api/response-normalizers";
import { normalizeCanonicalEntity } from "@/shared/api/response-normalizers";

export default function AISearchTerminal() {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const { currentDistrict: district } = useDistrict();
  const { data, isLoading } = useSearch(query);

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
    return results.map(v => normalizeCanonicalEntity({
      id: v.id,
      name: v.name,
      phone: v.phone,
      address: v.address,
      rating: v.rating,
      description: v.reason,
      isVerified: true,
    }));
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
            className={`px-4 py-3 rounded-lg transition-all duration-200 ${
              isListening
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
        {isLoading && <p className="text-white">Searching...</p>}

        {/* AI ANSWER */}
        {data?.answer && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4">
            <p className="text-orange-400 text-sm">{data.answer}</p>
            {data.confidenceMessage && (
              <p className="text-xs text-gray-400 mt-1">AI Confidence: {data.confidenceMessage}</p>
            )}
          </div>
        )}

        {/* DEFAULT STATE - Show when no query and no results */}
        {!isLoading && !query && (!data?.results || data.results.length === 0) && (
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

        {!isLoading && data?.telemetryTruth?.matchedEntities > 0 && (
          <p className="text-sm text-gray-300 mb-3">
            Found {data.telemetryTruth.matchedEntities} results in Shahdol
          </p>
        )}

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

                return (
                  <div key={`${entity.canonicalId || entity.id || 'unknown'}-${index}`} className="mb-3">
                    <SovereignEntityCard
                      entity={entity}
                      variant="search"
                      onTrack={(action) => trackAction(entity.id, action, query)}
                    />

                    {/* Response mode badges */}
                    {index === 0 && (
                      <div className="mt-1">
                        <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                          Best Match
                        </span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {Array.isArray(rawVendor.actions) && rawVendor.actions.length > 0 && (
                      <div className="flex gap-2 mt-2 ml-2">
                        {rawVendor.actions.map((action: any) => (
                          <button
                            key={action.type}
                            onClick={() => {
                              trackAction(entity.id, ACTION_TYPES[action.type.toUpperCase() + "_VENDOR"] || action.type, query);
                              if (action.type === "CALL") {
                                window.location.href = `tel:${action.value}`;
                              } else if (action.type === "WHATSAPP") {
                                window.open(`https://wa.me/${action.value}`, "_blank");
                              } else if (action.type === "MAPS") {
                                window.open(action.value, "_blank");
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
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
