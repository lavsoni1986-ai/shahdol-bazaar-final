import { Link } from "wouter";
import { ArrowLeft, Shield, MessageCircle, CheckCircle, AlertTriangle } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#030003] text-white/70">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-900/50 to-purple-900/50 text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-black mb-4 text-orange-500">नियम और शर्तें</h1>
          <p className="text-lg md:text-xl opacity-90">शहडोल बाज़ार का उपयोग करने से पहले पढ़ें</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Introduction */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <p className="text-white/70 leading-relaxed">
            "शहडोल बाज़ार" एक ऑनलाइन मार्केटप्लेटफॉर्म है जो Lav Digital Systems द्वारा संचालित है। 
            इस वेबसाइट का उपयोग करने से पहले, कृपया इन नियमों और शर्तों को ध्यानपूर्वक पढ़ें। 
            इस वेबसाइट का उपयोग करके, आप इन सभी नियमों से सहमत होते हैं।
          </p>
        </div>

        {/* Rules */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <CheckCircle className="text-green-500 h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-orange-500">आपको क्या करना चाहिए</h2>
          </div>
          
          <ul className="space-y-4 text-white/70">
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>सही जानकारी दें:</strong> अपनी दुकान, उत्पाद और सेवाओं के बारे में सटीक और सत्य जानकारी प्रदान करें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>असली फ़ोटो उपयोग करें:</strong> अपने उत्पादों की वास्तविक तस्वीरें अपलोड करें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>मूल्य निर्धारण में ईमानदार रहें:</strong> उचित और प्रतिस्पर्धी मूल्य रखें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>ग्राहकों से सम्मान से बात करें:</strong> हर ग्राहक का सम्मान करें और समय पर जवाब दें।</span>
            </li>
          </ul>
        </div>

        {/* Restrictions */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <AlertTriangle className="text-red-500 h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-orange-500">आपको क्या नहीं करना चाहिए</h2>
          </div>
          
          <ul className="space-y-4 text-white/70">
            <li className="flex items-start gap-3">
              <span className="text-red-500 font-bold">✗</span>
              <span><strong>झूठी जानकारी:</strong> गलत या भ्रामक जानकारी प्रकाशित न करें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 font-bold">✗</span>
              <span><strong>कॉपी उत्पाद:</strong> कॉपी या नकली सामान न बेचें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 font-bold">✗</span>
              <span><strong>धोखाधड़ी:</strong> ग्राहकों को धोखा देने का प्रयास न करें।</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 font-bold">✗</span>
              <span><strong>स्पैम:</strong> अनावश्यक या दोहराव वाली जानकारी न भेजें।</span>
            </li>
          </ul>
        </div>

        {/* WhatsApp Leads */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <MessageCircle className="text-green-500 h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-orange-500">व्हाट्सएप लीड्स का सही उपयोग</h2>
          </div>
          
          <p className="text-white/70 leading-relaxed mb-4">
            जब कोई ग्राहक आपकी दुकान पर व्हाट्सएप से संपर्क करता है, तो यह एक "लीड" होती है। 
            कृपया इन लीड्स का सही उपयोग करें:
          </p>
          <ul className="space-y-2 text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>10-15 मिनट के अंदर जवाब दें</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>विनम्र भाषा में बात करें</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>ग्राहक की जरूरत को समझें और मदद करें</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>बिक्री के बाद भी संपर्क में रहें</span>
            </li>
          </ul>
        </div>

        {/* Rights */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Shield className="text-blue-500 h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-orange-500">Lav Digital Systems के अधिकार</h2>
          </div>
          
          <p className="text-white/70 leading-relaxed mb-4">
            Lav Digital Systems को निम्नलिखित अधिकार सुरक्षित हैं:
          </p>
          <ul className="space-y-2 text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>किसी भी दुकान या उत्पाद को हटाने का अधिकार बिना कारण बताए</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>नियमों का उल्लंघन करने पर खाता बंद करने का अधिकार</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>वेबसाइट की सेवाओं में किसी भी समय बदलाव करने का अधिकार</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>किसी भी समय इन नियमों को अपडेट करने का अधिकार</span>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 md:p-8 text-center">
          <p className="text-white/70 mb-4">
            क्या आपके कोई सवाल हैं? हमसे संपर्क करें:
          </p>
          <Link href="/contact">
            <button className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-500 transition-colors">
              संपर्क करें
            </button>
          </Link>
        </div>

        {/* Back */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-white/70 font-bold hover:text-orange-500">
            <ArrowLeft size={20} />
            वापस होम पर जाएं
          </Link>
        </div>
      </div>
    </div>
  );
}
