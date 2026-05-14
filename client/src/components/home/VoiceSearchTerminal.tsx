import React, { useState } from 'react';
import { Mic, Search, Zap, Command } from 'lucide-react';
import { useLocation } from 'wouter';
import { useDistrict } from '@/contexts/DistrictContext';

export default function VoiceSearchTerminal() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [, setLocation] = useLocation();
  const { currentDistrict } = useDistrict();
  const districtSlug = currentDistrict?.slug || 'shahdol';

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setTranscript(text);
      
      // Hindi + English command mapping
      if (text.includes("बस") || text.includes("गाड़ी") || text.includes("bus") || text.includes("timing") || text.includes("time"))
        setLocation(`/${districtSlug}/bus-timetable`);
      else if (text.includes("अस्पताल") || text.includes("इलाज") || text.includes("hospital") || text.includes("doctor") || text.includes("डॉक्टर"))
        setLocation(`/${districtSlug}/hospitals`);
      else if (text.includes("स्कूल") || text.includes("शिक्षा") || text.includes("school") || text.includes("education"))
        setLocation(`/${districtSlug}/schools`);
      else if (text.includes("बाजार") || text.includes("खरीद") || text.includes("market") || text.includes("shop") || text.includes("buy"))
        setLocation(`/${districtSlug}/marketplace`);
      else setLocation(`/${districtSlug}/marketplace?search=${encodeURIComponent(text)}`);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleTagClick = (tag: string) => {
    const routes: Record<string, string> = {
      "Buses": `/${districtSlug}/bus-timetable`,
      "Schools": `/${districtSlug}/schools`,
      "Hospitals": `/${districtSlug}/hospitals`,
      "Marketplace": `/${districtSlug}/marketplace`
    };
    setLocation(routes[tag] || `/${districtSlug}/marketplace`);
  };

  return (
    <div className="glass-card-sovereign p-8 max-w-3xl mx-auto -mt-4 relative z-20">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-orange-500" />
          <input 
            type="text"
            placeholder={isListening ? "Listening to your command..." : "Search Shahdol (Try: 'बस दिखाओ' or 'School search')"}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 transition-all"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && transcript) {
                setLocation(`/marketplace?search=${encodeURIComponent(transcript)}`);
              }
            }}
          />
        </div>
        <button 
          onClick={handleVoiceInput}
          className={`p-5 rounded-2xl transition-all active:scale-95 ${isListening ? 'bg-red-600 animate-pulse' : 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.3)]'}`}
        >
          <Mic className="w-6 h-6 text-white" />
        </button>
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        {["Buses", "Schools", "Hospitals", "Marketplace"].map((tag) => (
          <button 
            key={tag} 
            onClick={() => handleTagClick(tag)}
            className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-orange-500 hover:border-orange-500/30 transition-all"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}