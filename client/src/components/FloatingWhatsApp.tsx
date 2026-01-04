import { MessageCircle } from "lucide-react";

const SUPPORT_NUMBER = "919753239303"; // update to desired support number
const PREFILL = "Hello Shahdol Bazaar, mujhe shopping mein madad chahiye.";

export function FloatingWhatsApp() {
  const handleClick = () => {
    const url = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent(PREFILL)}`;
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      aria-label="WhatsApp Support"
      className="fixed bottom-28 right-4 md:bottom-16 md:right-8 z-40 flex items-center gap-3 bg-[#25D366] text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer group"
      style={{ animation: "pulse 2s infinite" }}
    >
      <span className="hidden sm:inline text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
        Shahdol Bazaar Support - Help chahiye?
      </span>
      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
        <MessageCircle size={22} className="text-white" />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(37, 211, 102, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
      `}} />
    </button>
  );
}

