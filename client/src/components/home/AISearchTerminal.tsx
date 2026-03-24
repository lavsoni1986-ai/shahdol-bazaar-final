import { useState } from "react";
import { Sparkles, ArrowRight, Mic } from "lucide-react";

export const AISearchTerminal = () => {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      // MAGIC WIRE: Opens AI Modal AND sends the message instantly
      window.dispatchEvent(new CustomEvent('open-shahdol-ai', { detail: { message: query.trim() } }));
      setQuery(""); // Clear input after sending
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openAI = () => {
    window.dispatchEvent(new CustomEvent('open-shahdol-ai'));
  };

  const handleSuggestion = (prompt: string) => {
    const cleanPrompt = prompt.replace(/^[^\s]+\s/, "");
    window.dispatchEvent(new CustomEvent('open-shahdol-ai', { detail: { message: cleanPrompt } }));
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto mt-2 mb-8 px-4 box-border z-[50]">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-green-500/10 blur-[80px] rounded-full opacity-60 pointer-events-none" />
      <div className="relative group bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] p-2 shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-all duration-500 focus-within:border-orange-500/40 focus-within:shadow-[0_0_40px_rgba(249,115,22,0.15)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={openAI} type="button" className="p-1 hover:scale-110 transition-transform active:scale-95 shrink-0 z-[60] cursor-pointer">
            <Sparkles className="w-6 h-6 text-orange-400 animate-pulse" />
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            type="text"
            placeholder="Ask anything... (e.g. Biryani shop)"
            className="w-full bg-transparent text-white text-lg placeholder:text-white/20 outline-none font-medium"
            autoComplete="off"
          />
          <button onClick={handleSearch} type="button" className="bg-white/10 hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 text-white rounded-full p-2.5 transition-all duration-300 shrink-0 active:scale-90 z-[60] cursor-pointer pointer-events-auto">
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Suggested Prompts */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
        {["🩺 Find best pediatricians", "🛒 Cheapest grocery shops", "🔧 Mobile repair open now"].map((prompt) => (
          <span key={prompt} onClick={() => handleSuggestion(prompt)} className="whitespace-nowrap px-4 py-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] text-xs font-medium text-white/50 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer active:scale-95 z-[60]">
            {prompt}
          </span>
        ))}
      </div>
    </div>
  );
};
