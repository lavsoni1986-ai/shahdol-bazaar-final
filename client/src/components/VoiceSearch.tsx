import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/api-client";
import { SOVEREIGN_CONFIG } from "@/lib/SovereignConstants";

interface VoiceSearchResult {
  type: "product" | "store" | "category" | "navigation";
  query: string;
  url: string;
  message?: string;
}

export default function VoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Voice search is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US"; // Auto-detect language

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      try {
        const current = event.resultIndex;
        const transcript_text = event.results[current][0].transcript;
        setTranscript(transcript_text);

        // If final result
        if (event.results[current].isFinal) {
          handleVoiceCommand(transcript_text);
        }
      } catch (err) {
        console.error("Voice result processing error:", err);
        setError("Failed to process voice input. Please try again.");
        setIsListening(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Voice recognition error:", event.error);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone permissions.");
      } else {
        setError("Voice recognition error. Please try again.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    setError(null);
    setResult(null);
    setTranscript("");
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start recognition:", err);
        setError("Failed to start voice recognition.");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const data = await apiRequest("POST", "/ai/voice-search", {
        text: command,
        voiceTranscript: command,
        districtId: SOVEREIGN_CONFIG.DEFAULT_DISTRICT_ID
      });

      if (data.results && data.results.length > 0) {
        // Navigate to marketplace with intent results
        const topResult = data.results[0];
        setResult({
          type: "store",
          query: command,
          url: `/marketplace`,
          message: `Found ${data.results.length} matches for "${data.intent.intent}"`
        });
        setTimeout(() => {
          setLocation(`/marketplace`);
        }, 1500);
      } else {
        // Fallback to search
        setResult({
          type: "navigation",
          query: command,
          url: `/search?q=${encodeURIComponent(command)}`,
          message: "Searching for your request..."
        });
        setTimeout(() => {
          setLocation(`/search?q=${encodeURIComponent(command)}`);
        }, 1500);
      }
    } catch (err) {
      console.error("Voice command processing error:", err);
      // Fallback: try basic text search
      const searchQuery = encodeURIComponent(command);
      setResult({
        type: "navigation",
        query: command,
        url: `/search?q=${searchQuery}`,
        message: `Searching for "${command}"...`
      });
      setTimeout(() => {
        setLocation(`/search?q=${searchQuery}`);
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (transcript.trim()) {
      handleVoiceCommand(transcript);
    }
  };

  const closeAndReset = () => {
    setResult(null);
    setTranscript("");
    setError(null);
  };

  return (
    <div className="relative">
      {/* Voice Search Button */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={`rounded-full transition-all ${
          isListening 
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
            : "bg-slate-800 hover:bg-slate-700"
        }`}
        onClick={isListening ? stopListening : startListening}
        title="Voice Search (बोलकर खोजें)"
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </Button>

      {/* Voice Search Overlay */}
      {(isListening || isProcessing || result) && (
        <div className="absolute top-full right-0 mt-2 w-80 z-50">
          <Card className="bg-slate-900 border-slate-700 shadow-xl">
            <CardContent className="p-4">
              {/* Close button */}
              <button 
                onClick={closeAndReset}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Processing State */}
              {isProcessing && (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                  <p className="text-slate-300">Processing...</p>
                  <p className="text-slate-500 text-sm">Understanding your request</p>
                </div>
              )}

              {/* Listening State */}
              {isListening && !isProcessing && (
                <div className="text-center py-6">
                  <div className="relative inline-block">
                    <Mic className="w-12 h-12 text-red-500 animate-pulse mx-auto" />
                    <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></span>
                  </div>
                  <p className="text-white mt-4 font-medium">Listening...</p>
                  <p className="text-slate-400 text-sm mt-1">Speak in Hindi or Bagheli</p>
                  <p className="text-slate-500 text-xs mt-4">
                    Example: "दूध खोजो" or "गुड़ू किराना दुकान"
                  </p>
                </div>
              )}

              {/* Result State */}
              {result && !isProcessing && (
                <div className="text-center py-4">
                  {result.message ? (
                    <p className="text-orange-400 font-medium mb-2">{result.message}</p>
                  ) : (
                    <>
                      <Search className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-white font-medium mb-1">Found!</p>
                    </>
                  )}
                  <p className="text-slate-400 text-sm">"{result.query}"</p>
                  <p className="text-slate-500 text-xs mt-2">Redirecting...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Manual Input as fallback */}
              {!isListening && !isProcessing && !result && (
                <form onSubmit={handleManualSearch} className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Type or speak..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                    <Button type="submit" size="sm" className="bg-orange-600">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
