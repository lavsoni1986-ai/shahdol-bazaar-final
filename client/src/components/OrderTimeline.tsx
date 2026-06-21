import React from "react";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle,
  HelpCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stage {
  key: string;
  label: string;
  timestamp: string | null;
  completed: boolean;
}

interface TimelinePayload {
  currentStatus: string;
  stages: Stage[];
  cancelledAt: string | null;
  cancelledReason: string | null;
}

interface OrderTimelineProps {
  order: {
    id: number;
    status: string;
    timeline?: TimelinePayload;
  };
}

const STAGE_ICONS: Record<string, React.ComponentType<any>> = {
  pending: Package,
  accepted: CheckCircle2,
  preparing: Clock,
  ready: Truck,
  delivered: CheckCircle2,
};

export default function OrderTimeline({ order }: OrderTimelineProps) {
  // Graceful fallback if timeline metadata is missing
  if (!order.timeline) {
    const isCancelled = ["cancelled", "rejected"].includes(order.status?.toLowerCase());
    return (
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardContent className="p-4 flex items-center gap-3">
          {isCancelled ? (
            <>
              <XCircle className="w-5 h-5 text-red-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-red-400">ऑर्डर रद्द (Order Cancelled)</p>
                <p className="text-xs text-slate-400">यह ऑर्डर निरस्त कर दिया गया है।</p>
              </div>
            </>
          ) : (
            <>
              <HelpCircle className="w-5 h-5 text-slate-400 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-slate-300">स्थिति: {order.status}</p>
                <p className="text-xs text-slate-500">ट्रैकिंग विवरण अनुपलब्ध है।</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const { stages, cancelledAt, cancelledReason } = order.timeline;

  // Format timestamp helper
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  // Find the index of the active stage (last completed stage)
  const activeIndex = [...stages].reverse().findIndex(s => s.completed);
  const lastCompletedIndex = activeIndex === -1 ? 0 : stages.length - 1 - activeIndex;

  return (
    <div className="space-y-4">
      {/* 🔴 TERMINAL STATE: Cancelled Alert Banner */}
      {cancelledAt && (
        <div className="bg-red-950/45 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-200">
          <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-red-400 text-sm">ऑर्डर रद्द कर दिया गया है / Order Cancelled</h4>
            <p className="text-xs text-slate-300 font-medium">रद्द होने का समय: {formatTime(cancelledAt)}</p>
            <p className="text-xs text-slate-400 italic">विवरण: {cancelledReason}</p>
          </div>
        </div>
      )}

      {/* 📱 MOBILE VIEW: Vertical Timeline (width < md) */}
      <div className="block md:hidden space-y-4 pr-2">
        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-850">
          {stages.map((stage, idx) => {
            const Icon = STAGE_ICONS[stage.key] || HelpCircle;
            const isCompleted = stage.completed;
            const isCurrent = idx === lastCompletedIndex && !cancelledAt && order.status.toLowerCase() !== "delivered";
            
            return (
              <div key={stage.key} className="relative flex items-start gap-4">
                {/* Visual Bullet Icon */}
                <div 
                  className={`
                    absolute left-[-21px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-300
                    ${isCompleted 
                      ? "bg-green-500 text-white shadow-md shadow-green-950/20" 
                      : "bg-slate-900 text-slate-600 border-2 border-slate-800"
                    }
                    ${isCurrent ? "ring-2 ring-[#FFB800] ring-offset-2 ring-offset-slate-950 animate-pulse bg-amber-500 text-black border-0" : ""}
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0 bg-slate-900/50 border border-slate-850 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className={`text-xs font-bold truncate ${
                        isCompleted 
                          ? "text-slate-200" 
                          : "text-slate-500"
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] text-green-400 font-medium shrink-0 bg-green-950/30 px-1.5 py-0.5 rounded border border-green-900/20">
                        ✓ Complete
                      </span>
                    )}
                  </div>
                  {stage.timestamp && (
                    <p className="text-[10px] text-[#FFB800] mt-1 font-mono">
                      {formatTime(stage.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 💻 DESKTOP VIEW: Horizontal Timeline (width >= md) */}
      <div className="hidden md:flex items-stretch justify-between relative py-4">
        {/* Connector Line */}
        <div className="absolute top-[32px] left-[10%] right-[10%] h-[2px] bg-slate-800 z-0">
          <div 
            className="h-full bg-green-500 transition-all duration-500" 
            style={{ 
              width: `${(lastCompletedIndex / (stages.length - 1)) * 100}%` 
            }}
          />
        </div>

        {stages.map((stage, idx) => {
          const Icon = STAGE_ICONS[stage.key] || HelpCircle;
          const isCompleted = stage.completed;
          const isCurrent = idx === lastCompletedIndex && !cancelledAt && order.status.toLowerCase() !== "delivered";

          return (
            <div 
              key={stage.key} 
              className="flex flex-col items-center flex-1 z-10 text-center px-2 group"
            >
              {/* Outer Step Circle */}
              <div 
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                  ${isCompleted 
                    ? "bg-green-500 text-white shadow-lg shadow-green-950/20 scale-105" 
                    : "bg-slate-900 text-slate-500 border-2 border-slate-800"
                  }
                  ${isCurrent ? "ring-4 ring-amber-500/30 bg-[#FFB800] text-black border-0 scale-110" : ""}
                `}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Stage Text details */}
              <span 
                className={`text-[11px] font-bold transition-colors ${
                  isCompleted 
                    ? "text-slate-300" 
                    : "text-slate-500"
                }`}
              >
                {stage.label}
              </span>
              
              {stage.timestamp ? (
                <span className="text-[9px] text-[#FFB800] font-mono mt-1 block">
                  {formatTime(stage.timestamp)}
                </span>
              ) : (
                <span className="text-[9px] text-slate-600 block mt-1 select-none">
                  --
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
