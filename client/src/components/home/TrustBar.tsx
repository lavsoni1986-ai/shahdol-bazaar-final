import { Shield, Clock, Users } from "lucide-react";

export function TrustBar() {
  return (
    <section className="px-4">
      <div className="flex items-center justify-center gap-6 py-3 bg-black/40 backdrop-blur-sm rounded-full border border-white/10">
        <div className="flex items-center gap-2 text-green-400">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">500+ Trusted</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-blue-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">4min Response</span>
        </div>
        <div className="w-px h-4 bg-white/20" />
        <div className="flex items-center gap-2 text-orange-400">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">2.3L+ Served</span>
        </div>
      </div>
    </section>
  );
}

export default TrustBar;