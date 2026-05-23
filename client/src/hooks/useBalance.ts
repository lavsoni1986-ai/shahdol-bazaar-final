import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export interface WalletBalance {
  wallet: number;
  walletCredit: number;
  totalSpent: number;
  availableBalance: number;
}

export interface TransactionItem {
  id: number;
  userId: number | null;
  merchantId: number | null;
  amount: number;
  type: string;
  method: string;
  status: string;
  description: string | null;
  lavShare: number | null;
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: TransactionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const useBalance = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user-balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/user/balance");
      if (!res?.success) {
        throw new Error(res?.error || "Failed to fetch balance");
      }
      return res.data as WalletBalance;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!isAuthenticated, // 🛑 CRITICAL: Do NOT run if logged out
  });
};

export const useTransactions = (page = 1, limit = 20) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user-transactions", page, limit],
    queryFn: async () => {
      const res = await apiRequest("GET", `/user/transactions?page=${page}&limit=${limit}`);
      if (!res?.success) {
        throw new Error(res?.error || "Failed to fetch transactions");
      }
      return res.data as TransactionsResponse;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!isAuthenticated, // 🛑 CRITICAL: Do NOT run if logged out
  });
};