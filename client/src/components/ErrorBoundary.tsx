import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 SOVEREIGN CRASH DETECTED:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#030003] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">System Glitch Detected</h1>
          <p className="text-slate-400 max-w-md mb-8 text-sm">
            Something in the Sovereign Engine skipped a beat. Don't worry, your data is safe.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-orange-600 text-black font-bold px-8 py-6 rounded-xl hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> REBOOT UI
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}