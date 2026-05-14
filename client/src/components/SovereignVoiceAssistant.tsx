import React from 'react';
import { Mic, X } from 'lucide-react';
import { useSovereignVoice } from '@/hooks/useSovereignVoice';
import { useLocation } from 'wouter';

export default function SovereignVoiceAssistant() {
  const [, setLocation] = useLocation();
  
  const handleCommand = (cmd: string) => {
    const command = cmd.toLowerCase();
    console.log("🎙️ Sovereign Received:", command);

    // Hindi commands
    if (command.includes("बस") || command.includes("गाड़ी") || command.includes("बस टाइम") || command.includes("bus timing") || command.includes("bus time") || command.includes("bus"))
      setLocation("/bus-timetable");
    else if (command.includes("स्कूल") || command.includes("school") || command.includes("शिक्षा"))
      setLocation("/schools");
    else if (command.includes("अस्पताल") || command.includes("डॉक्टर") || command.includes("hospital") || command.includes("doctor") || command.includes("इलाज"))
      setLocation("/hospitals");
    else if (command.includes("ऑर्डर") || command.includes("खरीद") || command.includes("खरीदारी") || command.includes("shop") || command.includes("market") || command.includes("buy"))
      setLocation("/marketplace");
    else if (command.includes("होम") || command.includes("main") || command.includes("home"))
      setLocation("/");
    else setLocation(`/marketplace?search=${encodeURIComponent(cmd)}`);
  };

  const { isListening, startListening } = useSovereignVoice(handleCommand);

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {isListening && (
        <div className="absolute bottom-20 right-0 glass-card-sovereign p-4 w-64 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="pulse-red" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest text-red-500">Listening...</span>
          </div>
          <p className="text-xs text-gray-400 italic">"Try: 'स्कूल दिखाओ' या 'बस टाइमिंग'"</p>
          <div className="flex justify-center gap-1 mt-3">
            {[1,2,3,4,5].map(i => (
              <div 
                key={i} 
                className="w-1 bg-orange-500 rounded-full animate-bounce" 
                style={{ animationDelay: `${i * 0.1}s`, height: `${Math.random() * 20 + 10}px` }} 
              />
            ))}
          </div>
        </div>
      )}
      
      <button 
        onClick={startListening}
        className={`p-5 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)] transition-all active:scale-95 ${isListening ? 'bg-red-600 scale-110' : 'bg-orange-600 hover:bg-orange-500'}`}
      >
        {isListening ? <X className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
      </button>
    </div>
  );
}