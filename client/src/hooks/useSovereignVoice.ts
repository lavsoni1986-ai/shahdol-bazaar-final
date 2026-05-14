import { useState, useCallback } from 'react';

export const useSovereignVoice = (onCommand: (cmd: string) => void) => {
  const [isListening, setIsListening] = useState(false);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sovereign Alert: Voice not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Voice Error:", event.error);
      setIsListening(false);
    };

    recognition.start();
  }, [onCommand]);

  return { isListening, startListening };
};