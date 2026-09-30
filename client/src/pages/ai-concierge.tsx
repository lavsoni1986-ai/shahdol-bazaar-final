// 📁 client/src/pages/ai-concierge.tsx
import AISearchTerminal from "@/components/AISearchTerminal";

export default function AIConciergePage() {
  return (
    <div className="min-h-screen bg-[#030003] text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
            BharatOS AI Concierge
          </h1>
          <p className="text-base text-zinc-400">
            Ask me anything about Shahdol's services, shops, healthcare, and education
          </p>
        </div>
        <AISearchTerminal />
      </div>
    </div>
  );
}