import React from "react";
import { useTransactions, type TransactionItem } from "@/hooks/useBalance";
import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TransactionRow = ({ tx }: { tx: TransactionItem }) => {
  const isCredit = tx.type === "CREDIT";
  const isSuccess = tx.status === "SUCCESS";

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isCredit ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {isCredit ? (
            <ArrowDownLeft className="w-4 h-4 text-green-500" />
          ) : (
            <ArrowUpRight className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div>
          <p className="font-medium text-white">
            {tx.description || tx.type}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(tx.createdAt)} • {formatTime(tx.createdAt)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold ${isCredit ? "text-green-500" : "text-red-500"}`}>
          {isCredit ? "+" : "-"}₹{tx.amount?.toLocaleString()}
        </p>
        <p className={`text-xs ${isSuccess ? "text-green-500" : "text-yellow-500"}`}>
          {tx.status}
        </p>
      </div>
    </div>
  );
};

export default function TransactionsPage() {
  const { currentDistrict } = useDistrict();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const districtSlug = currentDistrict?.slug || "shahdol";

  const { data, isLoading, error } = useTransactions(1, 20);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please login to view transactions</p>
          <button
            onClick={() => setLocation(`/${districtSlug}/auth`)}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/5 p-4 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation(`/${districtSlug}`)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Transactions</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">Failed to load transactions</p>
          </div>
        ) : data?.transactions?.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.transactions?.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}

        {/* Pagination Info */}
        {data?.pagination && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Page {data.pagination.page} of {data.pagination.pages} •{" "}
            {data.pagination.total} total transactions
          </div>
        )}
      </div>
    </div>
  );
}