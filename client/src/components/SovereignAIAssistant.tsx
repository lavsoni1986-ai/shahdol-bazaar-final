import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "../lib/api-client";
import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { SOVEREIGN_CONFIG, DISTRICT_AI_PERSONAS } from "@/lib/SovereignConstants";

interface Message {
  role: "user" | "assistant";
  content: string;
  requiresLogin?: boolean;
  actions?: any[];
}

export function SovereignAIAssistant() {
  const { currentDistrict } = useDistrict();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [, setLocation] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const districtId = currentDistrict?.id || SOVEREIGN_CONFIG.DEFAULT_DISTRICT_ID;
  const persona = DISTRICT_AI_PERSONAS[districtId] || DISTRICT_AI_PERSONAS[2];

  useEffect(() => {
    const handleOpenAI = () => setIsOpen(true);
    window.addEventListener('open-shahdol-ai', handleOpenAI);
    
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('open-shahdol-ai', handleOpenAI);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleActionClick = (url: string) => {
    if (url.startsWith('/')) {
      setLocation(url);
    } else {
      window.location.href = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
const data = await apiRequest("POST", "/ai/concierge", {
         message: userMessage
       });
      
      // Handle both response formats (reply or response)
      const aiResponse = data.reply || data.response || "";
      
      if (aiResponse) {
        let enhancedResponse = aiResponse;
        
        // Add DSSL verified vendors if present
        if (data.results && data.results?.length > 0) {
          const dsslVendors = data.results?.filter(
            (v: any) => v.isVerified && v.dsslScore >= 70
          );
          if (dsslVendors && dsslVendors.length > 0) {
            enhancedResponse += "\n\n✅ DSSL वेरिफाइड:\n" + 
              dsslVendors.map((v: any) => 
                `• ${v.name} (Score: ${v.dsslScore})`
              ).join("\n");
          }
        }
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: enhancedResponse,
          requiresLogin: data.requiresLogin,
          actions: data.actions
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.message || "माफ़ करें, कुछ गलत हो गया। फिर से कोशिश करें।"
        }]);
      }
    } catch (error: any) {
      // Check if it's a 401 (Unauthorized) error
      const errorMessage = error?.message || '';
      const isUnauthorized = errorMessage.includes('401') || errorMessage.includes('Unauthorized');
      
      if (isUnauthorized) {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "कृपया लॉगिन करें।" 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "इंटरनेट कनेक्शन में समस्या है।" 
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button - HIDDEN: Now triggered by bottom nav orb */}

      {/* Glassmorphism Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 md:right-10 z-[99999] w-80 md:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Glassmorphism Container */}
          <div 
            className="backdrop-blur-xl bg-black/60 border-t-4 rounded-2xl shadow-2xl overflow-hidden"
            style={{ borderColor: 'var(--sovereign-accent, #f97316)' }}
          >
            {/* Header with gradient */}
            <div 
              className="p-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(to right, var(--sovereign-accent, #f97316), var(--district-secondary, #fb923c))' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="text-white w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-white">{persona.name}</span>
                  <p className="text-[10px] text-white/80">Powered by Sovereign Intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages - Glassmorphism */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-black/20 backdrop-blur-sm">
              {messages.length === 0 && (
                <div className="text-center text-slate-300 py-8">
                  <div 
                    className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(to right, var(--sovereign-accent, #f97316), var(--district-secondary, #fb923c))' }}
                  >
                    <Sparkles className="text-white w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium">{persona.greeting}</p>
                  <p className="text-xs mt-2 text-slate-400">आप मुझसे {currentDistrict?.name || 'शहडोल'} में दुकानों, हॉस्पिटल्स, बसों और products के बारे में पूछ सकते हैं।</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl text-sm backdrop-blur-sm ${
                    msg.role === "user" 
                      ? "bg-orange-600/30 text-white ml-8 border border-orange-500/30" 
                      : "bg-white/10 text-slate-200 mr-8 border border-white/10"
                  }`}
                >
                  {msg.content}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {msg.actions.map((action: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleActionClick(action.url)}
                          className="text-left text-xs bg-orange-600/30 hover:bg-orange-600/50 px-2 py-1 rounded mt-1 transition-colors border border-orange-500/20"
                        >
                          {action.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="bg-white/10 text-slate-300 p-3 rounded-xl mr-8 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    <span>सोच रहा हूँ...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Glassmorphism */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/30 backdrop-blur-sm flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type in Hindi or English..."
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-slate-400"
                disabled={loading}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={loading || !input.trim()}
                className="border-0"
                style={{ background: 'linear-gradient(to right, var(--sovereign-accent, #f97316), var(--district-secondary, #fb923c))' }}
              >
                <Send size={18} />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default SovereignAIAssistant;
