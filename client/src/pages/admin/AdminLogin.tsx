import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext"; // 🛡️ AUTH CONTEXT IMPORT
import { apiRequest } from "@/lib/api-client";

export default function AdminLogin() {
  const [email, setEmail] = useState("lav_soni"); // 🎯 Default to your username
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { checkAuth, setUserData, user } = useAuth(); // 🛡️ USE SOVEREIGN AUTH FUNCTION

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Clear access token to prevent old session interference
    localStorage.removeItem("accessToken");

    try {
      const data = await apiRequest("POST", "/auth/login", {
        username: email,
        password: password
      });

      // Backend returns: { success: true, data: { user: {...} } }
      if (data?.success && data?.data?.user) {
        // Token is now in httpOnly cookie - no need to store in localStorage

        // Set user data from login response
        const loginUser = {
          id: data.data.user.id,
          username: data.data.user.username,
          role: data.data.user.role,
          shopId: data.data.user.shopId ?? null,
          isAdmin: data.data.user.isAdmin ?? false,
          isVendor: data.data.user.isVendor ?? false,
          districtId: data.data.user.districtId ?? null,
        };
        setUserData(loginUser);

        console.log("🚀 [AdminLogin] Redirecting to /admin/dashboard");
        // Give browser time to receive and store cookies before navigation
        await new Promise(res => setTimeout(res, 300));
        setLocation('/admin/dashboard');
      } else {
        alert("❌ Sovereign Error: Invalid credentials.");
      }
    } catch (err: any) {
      console.error("❌ [AdminLogin] Login Error:", err);
      alert(`🚨 Login Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans']">
      <div className="max-w-md w-full bg-[#111] border border-orange-500/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.1)]">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent uppercase tracking-tighter">
            BharatOS Admin
          </h1>
          <p className="text-gray-500 mt-2 text-xs font-black uppercase tracking-widest">Sovereign Command Center</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Admin Identity</label>
            <input
              type="text"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-orange-500 transition-all text-sm font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">Secret Key</label>
            <input 
              type="password" placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl text-white outline-none focus:border-orange-500 transition-all text-sm"
            />
          </div>
          <button 
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 p-4 rounded-xl font-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-900/20 uppercase tracking-widest text-sm"
          >
            {loading ? "Authenticating..." : "Enter Command Center"}
          </button>
        </form>

        {/* 🔍 DEBUG INFO (Remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-3 bg-white/5 rounded border border-white/10 text-[10px] text-gray-500 font-mono">
            <p>Test credentials: lav_soni / [password]</p>
            <p>This panel auto-redirects after successful login.</p>
          </div>
        )}
      </div>
    </div>
  );
}