import { RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  refetch?: () => void;
  title?: string;
  variant?: 'generic' | 'cognition_miss' | 'demand_recorded';
  query?: string;
  category?: string;
  districtName?: string;
}

export function ErrorState({
  message: customMessage,
  refetch,
  title: customTitle,
  variant = 'generic',
  query,
  category,
  districtName
}: ErrorStateProps) {
  let title = customTitle || "Something went wrong";
  let message = customMessage || "Failed to load data";

  if (variant === 'cognition_miss') {
    title = customTitle || "No Providers Found";
    message = customMessage || `No verified ${category} providers found yet in ${districtName}. This demand has been recorded for BharatOS to onboard relevant services soon.`;
  } else if (variant === 'demand_recorded') {
    title = customTitle || "Demand Recorded";
    message = customMessage || `We're working on bringing ${category} services to ${districtName}. Check back soon!`;
  }
  return (
    <div className="p-6 md:p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
        <span className="text-red-500 text-xl">⚠️</span>
      </div>
      <h3 className="text-red-500 font-semibold text-lg mb-2">{title}</h3>
      <p className="text-red-400/80 text-sm mb-4">{message}</p>
      {refetch && (
        <button 
          onClick={refetch}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="p-8 text-center">
      <div className="w-8 h-8 mx-auto mb-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ 
  title = "No data found", 
  description,
  action 
}: EmptyStateProps) {
  return (
    <div className="p-8 text-center bg-slate-800/50 border border-slate-700 rounded-xl">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
        <span className="text-slate-400 text-xl">📭</span>
      </div>
      <h3 className="text-slate-300 font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 text-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}