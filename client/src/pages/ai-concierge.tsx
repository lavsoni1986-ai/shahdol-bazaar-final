// 📁 client/src/pages/ai-concierge.tsx
import AISearchTerminal from "@/components/AISearchTerminal";

export default function AIConciergePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            BharatOS AI Concierge
          </h1>
          <p className="text-lg text-gray-600">
            Ask me anything about Shahdol's services, shops, and marketplace
          </p>
        </div>
        <AISearchTerminal />
      </div>
    </div>
  );
}