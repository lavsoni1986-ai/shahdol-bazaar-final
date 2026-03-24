import { MessageCircle } from "lucide-react";

const SUPPORT_NUMBER = "919753239303";
const PREFILL = "Hello Shahdol Bazaar, mujhe shopping mein madad chahiye.";

const trackLead = async (source: string, action: string) => {
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        action,
        metadata: { 
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      })
    });
  } catch (e) {
    console.error('Lead tracking failed:', e);
  }
};

export function FloatingWhatsApp() {
  const handleClick = () => {
    trackLead('floating_whatsapp', 'click');
    const url = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(PREFILL)}`;
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      aria-label="WhatsApp Support"
      title="Chat on WhatsApp"
      className="fixed bottom-24 right-6 md:bottom-24 md:right-8 z-[9999] w-14 h-14 md:w-16 md:h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(37,211,102,0.6)]"
    >
      <MessageCircle size={28} className="text-white" />
    </button>
  );
}
