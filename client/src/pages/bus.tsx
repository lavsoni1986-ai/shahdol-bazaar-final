import { Bus as BusIcon, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Bus() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-12 hover:rotate-0 transition-transform duration-300">
            <BusIcon size={48} />
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse shadow-md">
            Updating
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Bus Timetable <br />
            <span className="text-orange-600 italic">Coming Soon!</span>
          </h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Hum Shahdol ke sabhi bus routes aur timings ko verify kar rahe hain. 
            Jald hi aapko yahan sateek jankari milegi.
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 text-left group hover:border-orange-200 transition-colors">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-50 transition-colors">
            <Clock className="text-slate-400 group-hover:text-orange-600" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Verifying Schedules</h3>
            <p className="text-xs text-slate-500">Working with local transport authorities</p>
          </div>
        </div>

        <Link href="/">
          <Button variant="ghost" className="text-slate-600 hover:text-orange-600 font-bold">
            <ArrowLeft size={18} className="mr-2" /> Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
