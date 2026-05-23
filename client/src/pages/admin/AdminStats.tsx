// 📁 client/src/pages/admin/AdminStats.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";

export default function AdminStats() {
  // 🚀 BHARAT-OS: Fetching real stats from the database
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const result = await apiRequest("GET", "public/stats?districtId=1"); // Shahdol ID: 1
      if (!result.success) throw new Error(result.error || "Failed to fetch stats");
      return result.data;
    }
  });

  return (
    <>
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Command Center: Shahdol</h1>
        <div className="bg-green-500/20 text-green-500 px-4 py-1 rounded-full text-sm border border-green-500/30">
          Sovereign Admin: Online
        </div>
      </header>

      {/* 🧱 Stats Overview Shell */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500">Total Vendors</p>
          <h3 className="text-4xl font-bold mt-2">
            {isLoading ? "..." : stats?.vendors || 0}
          </h3>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500">Active Services</p>
          <h3 className="text-4xl font-bold mt-2 text-orange-500">
            {isLoading ? "..." : stats?.services || 0}
          </h3>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <p className="text-gray-500">Active Users</p>
          <h3 className="text-4xl font-bold mt-2 text-green-500">
            {isLoading ? "..." : stats?.activeUsers || 0}
          </h3>
        </div>
      </div>
    </>
  );
}