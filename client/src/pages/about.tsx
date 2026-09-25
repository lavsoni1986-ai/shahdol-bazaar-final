import React, { useState } from "react";
import { Link } from "wouter";
import {
  ShieldCheck,
  MapPin,
  Users,
  Zap,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Building2,
  Cpu,
  Bus,
  FileText,
  Phone,
  MessageCircle,
  Eye,
  ShoppingBag,
  Clock
} from "lucide-react";

interface ArchivalArtifactProps {
  imageSrc: string;
  altText: string;
  year: string;
  dateBadge: string;
  headline: string;
  subtext: string;
  documentItems: string[];
}

function ArchivalVisualCard({
  imageSrc,
  altText,
  year,
  dateBadge,
  headline,
  subtext,
  documentItems
}: ArchivalArtifactProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative rounded-2xl bg-[#0d0d0d] border border-amber-500/20 p-5 shadow-[0_0_30px_rgba(245,158,11,0.05)] overflow-hidden group">
      {/* Archival Header Tape */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-[11px] font-mono tracking-widest uppercase text-amber-400 font-bold">
            Archival Evidence • {year}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
          {dateBadge}
        </span>
      </div>

      {/* Visual / Document Body */}
      {!imageError ? (
        <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 mb-4 aspect-[4/3] flex items-center justify-center">
          <img
            src={imageSrc}
            alt={altText}
            onError={() => setImageError(true)}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        /* Fallback Document Replica if image file is not yet dropped into /assets/history/ */
        <div className="rounded-xl bg-gradient-to-br from-[#1a140b] to-[#0d0a05] border border-amber-500/30 p-5 mb-4 font-mono text-left">
          <div className="flex items-center justify-between text-[11px] text-amber-500/80 mb-2 border-b border-amber-500/20 pb-2">
            <span>HISTORICAL ARCHIVE RECORD</span>
            <span>{dateBadge}</span>
          </div>
          <h5 className="text-white text-base font-black tracking-tight mb-1 font-sans">{headline}</h5>
          <p className="text-amber-200/80 text-xs italic mb-3 font-sans leading-relaxed">{subtext}</p>
          <div className="bg-black/50 rounded-lg p-3 border border-amber-500/20">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-bold">
              Documented Capabilities in Artifact:
            </span>
            <ul className="text-xs text-slate-300 space-y-1">
              {documentItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-amber-400">›</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Caption & Authentic Provenance */}
      <div className="text-left">
        <h4 className="text-white font-bold text-sm tracking-tight">{headline}</h4>
        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{subtext}</p>
      </div>
    </div>
  );
}

export default function About() {
  const handleJoinClick = () => {
    setTimeout(() => {
      window.open(
        "https://wa.me/919753239303?text=नमस्ते लव भाई, मैं शहडोल बाज़ार पर अपना स्टोर रजिस्टर करना चाहता हूँ।",
        "_blank"
      );
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500 selection:text-white pb-24">
      {/* ======================================================== */}
      {/* 1. HERO SECTION: OUR JOURNEY                             */}
      {/* ======================================================== */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-white/10 overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-orange-500/15 via-red-500/10 to-transparent blur-[140px] pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold tracking-widest uppercase mb-8">
            <Clock size={14} className="text-orange-500" />
            <span>2018 — 2026 • Origin & Evolution</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight uppercase leading-tight mb-6">
            OUR <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-red-500 bg-clip-text text-transparent">JOURNEY</span>
          </h1>

          <p className="text-2xl md:text-3xl font-bold tracking-tight text-white/90 mb-8 italic">
            “The technology changed. The vision didn't.”
          </p>

          <p className="text-base md:text-lg text-slate-300 font-light leading-relaxed max-w-2xl mx-auto mb-10">
            What started as a local digital-market and business-discovery initiative in Shahdol evolved with technology
            into ShahdolBazaar SaaS and ultimately BharatOS — a district-scale operating system connecting citizens,
            businesses, services, and local intelligence.
          </p>

          {/* Continuity Flow Pills */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-medium text-slate-300">
            <span className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30">
              Local Digital Discovery
            </span>
            <ArrowRight size={14} className="text-slate-500 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Digital Marketplace
            </span>
            <ArrowRight size={14} className="text-slate-500 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
              SaaS Platform
            </span>
            <ArrowRight size={14} className="text-slate-500 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/30 to-red-500/30 text-white font-bold border border-orange-500/40">
              District AI Operating System
            </span>
          </div>

          <div className="mt-8 text-xs text-slate-400 font-mono">
            * The Shahdol Bazaar vision began in 2018 and evolved into BharatOS.
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. CHRONOLOGICAL EVOLUTION TIMELINE                      */}
      {/* ======================================================== */}
      <section className="py-20 md:py-28 container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            The Timeline of Transformation
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            From early hyperlocal social promotion to autonomous AI cognition: how one district problem led to a national architecture.
          </p>
        </div>

        <div className="relative border-l-2 border-white/10 ml-4 md:ml-32 pl-6 md:pl-12 space-y-20">

          {/* ---------------------------------------------------- */}
          {/* MILESTONE 1: 2018 — SHAHDOL BAZAAR ORIGIN            */}
          {/* ---------------------------------------------------- */}
          <div className="relative group">
            {/* Year marker on timeline axis */}
            <div className="absolute -left-[35px] md:-left-[63px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border-2 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.4)] text-amber-400 font-mono font-bold text-xs">
              '18
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">
                  <Calendar size={12} /> December 2018 • Origin
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  SHAHDOL BAZAAR
                </h3>
                <h4 className="text-base text-amber-300 font-semibold mb-4">
                  Local Digital Marketing & Business Discovery
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  In December 2018, the original initiative was launched as <strong>ShahdolBazaar.com</strong> to bridge
                  the digital divide for local merchants and citizens across Shahdol. The original mission was clear:
                  empower small-town traders with digital marketing, discoverability, and community announcements.
                </p>

                {/* Documented 2018 capabilities list */}
                <div className="mb-6 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/90 font-bold block mb-3">
                    Documented 2018 Capabilities:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {[
                      "Digital Advertisement",
                      "Social Media Advertisement",
                      "Local Offers",
                      "Local Services",
                      "Local Jobs / News",
                      "Matrimonial",
                      "Website Designing"
                    ].map((cap, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono italic">
                  Branding Motto (19 Dec 2018): “Lead Your Business To Success”
                </div>
              </div>

              {/* Archival Artifact Visual Card */}
              <div className="md:col-span-5">
                <ArchivalVisualCard
                  imageSrc="/assets/history/shahdol-bazaar-2018-branding.jpg"
                  altText="Original Shahdol Bazaar 2018 branding archival creative"
                  year="2018"
                  dateBadge="19 Dec 2018"
                  headline="Original ShahdolBazaar.com Launch"
                  subtext="Archival branding: Digital Marketing & Social Media Advertisement for local business promotion in Shahdol."
                  documentItems={[
                    "Digital Marketing & Local Ads",
                    "Lead Your Business To Success",
                    "Local Offers & Services Directory"
                  ]}
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* MILESTONE 2: 2019 — EXPANDING LOCAL DISCOVERY        */}
          {/* ---------------------------------------------------- */}
          <div className="relative group">
            {/* Year marker on timeline axis */}
            <div className="absolute -left-[35px] md:-left-[63px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border-2 border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.4)] text-orange-400 font-mono font-bold text-xs">
              '19
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">
                  <Calendar size={12} /> January 2019 • Utility Expansion
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  EXPANDING LOCAL DISCOVERY
                </h3>
                <h4 className="text-base text-orange-300 font-semibold mb-4">
                  District Utilities, Bus Timetables & Regional Reach
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  By January 2019, the initiative recognized that citizens needed more than static ads — they required
                  reliable everyday utilities. The platform publicly documented the <strong>Bus Timing</strong> utility
                  concept (<em>“Coming Soon in shahdolbazaar.com”</em>) and broader trade promotion connecting remote towns
                  across the Vindhya division.
                </p>

                <div className="mb-6 bg-white/[0.02] border border-white/10 rounded-xl p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400/90 font-bold block mb-3">
                    Documented 2019 Expansions:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {[
                      "District Bus Timing Concept",
                      "Regional Transit Connectivity",
                      "Local Shop Promotions",
                      "Vindhya Trade Outreach"
                    ].map((cap, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Bus size={13} className="text-orange-400 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Archival Artifact Visual Card */}
              <div className="md:col-span-5">
                <ArchivalVisualCard
                  imageSrc="/assets/history/shahdol-bazaar-bus-timing-2019.jpg"
                  altText="Shahdol Bazaar 2019 Bus Timing Concept Archive"
                  year="2019"
                  dateBadge="Jan 2019"
                  headline="Publicly documented Bus Timing concept — January 2019"
                  subtext="Archival record: 'Coming Soon in shahdolbazaar.com', establishing early district transit and utility exploration."
                  documentItems={[
                    "Intercity Bus Timetable Discovery",
                    "Public Transport Information",
                    "Local Utility Integration"
                  ]}
                />
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* MILESTONE 3: 2025–26 — SHAHDOLBAZAAR SaaS             */}
          {/* ---------------------------------------------------- */}
          <div className="relative group">
            {/* Year marker on timeline axis */}
            <div className="absolute -left-[35px] md:-left-[63px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border-2 border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-blue-400 font-mono font-bold text-xs">
              '25
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">
                  <Layers size={12} /> 2025–2026 • Platform Modernization
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  SHAHDOLBAZAAR SaaS
                </h3>
                <h4 className="text-base text-blue-300 font-semibold mb-4">
                  Multi-Domain Digital Commerce & Services Platform
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  The manual discovery system transitioned into a full-scale transactional software platform.
                  Local merchants received dedicated storefront dashboards, while citizens gained instant access to
                  verified doctors, emergency hospitals, technicians, and local goods with complete inventory controls.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300 mb-6">
                  {[
                    "Products Catalog",
                    "Verified Shops",
                    "Services & Workers",
                    "Healthcare & Beds",
                    "Education Listings",
                    "Transport Timetables",
                    "Orders & Cart",
                    "Direct Appointments",
                    "Merchant Dashboard"
                  ].map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/10 px-2.5 py-1.5 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modern SaaS Snapshot Card */}
              <div className="md:col-span-5">
                <div className="rounded-2xl bg-[#0d0d0d] border border-blue-500/20 p-5 text-left shadow-[0_0_30px_rgba(59,130,246,0.08)]">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-blue-400 font-bold">
                      Platform Architecture
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                      SaaS Stack
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-base mb-2">Structured Local Commerce</h4>
                  <p className="text-slate-400 text-xs leading-relaxed mb-4">
                    Enabled real-time merchant onboarding, cash-on-delivery checkouts, verified hospital bed capacity,
                    and standardized multi-district domain routing.
                  </p>
                  <div className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono text-slate-300">
                    <div className="text-blue-300">● 7 Canonical Domains</div>
                    <div className="text-slate-400">● Multi-Tenant District Partitioning</div>
                    <div className="text-slate-400">● Real-time Merchant Admin Portal</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* MILESTONE 4: 2026 — BHARATOS DISTRICT OPERATING SYSTEM*/}
          {/* ---------------------------------------------------- */}
          <div className="relative group">
            {/* Year marker on timeline axis */}
            <div className="absolute -left-[35px] md:-left-[63px] top-0 flex items-center justify-center w-10 h-10 rounded-full bg-[#0a0a0a] border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] text-orange-400 font-mono font-black text-xs animate-pulse">
              '26
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-7 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 text-orange-400 font-mono text-xs font-bold mb-3 uppercase tracking-wider">
                  <Sparkles size={12} className="text-orange-400 animate-spin" /> 2026 • Current Vision
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                  BHARATOS
                </h3>
                <h4 className="text-base font-bold bg-gradient-to-r from-orange-400 via-amber-300 to-red-400 bg-clip-text text-transparent mb-4">
                  DISTRICT OPERATING SYSTEM
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Today, BharatOS represents the culmination of this continuous journey: an AI-driven,
                  district-scale Operating System that replaces static searching with grounded intelligence.
                  Powered by multi-stage cognition, verified data grounding, and DSSL trust scoring, it enables
                  citizens to take direct, authentic action.
                </p>

                {/* Capabilities grid */}
                <div className="mb-6 bg-gradient-to-br from-orange-500/10 via-transparent to-red-500/5 border border-orange-500/30 rounded-xl p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-bold block mb-3">
                    BharatOS Core Architecture:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                    {[
                      "District AI & Cognition Engine",
                      "Unified Discovery Feed",
                      "Grounded AI Concierge",
                      "District Intelligence Memory",
                      "DSSL Sovereign Trust Scoring",
                      "Verified Healthcare & Emergency Blood",
                      "Intercity Transit Utilities",
                      "Zero Hallucination Grounding"
                    ].map((cap, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Sparkles size={13} className="text-orange-400 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Citizen Actions Bar */}
                <div className="text-left bg-black/60 border border-white/10 rounded-xl p-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                    Actionable Citizen Surfaces:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: <Eye size={12} />, label: "VIEW" },
                      { icon: <Phone size={12} />, label: "CALL" },
                      { icon: <MessageCircle size={12} />, label: "WHATSAPP" },
                      { icon: <Calendar size={12} />, label: "BOOK" },
                      { icon: <ShoppingBag size={12} />, label: "BUY" }
                    ].map((act, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/15 text-xs font-bold text-slate-200 tracking-wider font-mono hover:border-orange-500/50 transition-colors"
                      >
                        <span className="text-orange-400">{act.icon}</span>
                        <span>{act.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modern BharatOS Visual Card */}
              <div className="md:col-span-5">
                <div className="rounded-2xl bg-gradient-to-b from-[#120a05] to-[#0a0a0a] border border-orange-500/40 p-6 text-left shadow-[0_0_40px_rgba(249,115,22,0.15)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-orange-400 font-bold">
                      Current Milestone
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                      Active Live
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black shadow-lg">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-black text-lg">District Operating System</h4>
                      <p className="text-xs text-orange-400/90 font-mono">Shahdol Sambhag Pilot</p>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed mb-4">
                    Direct integration of real-world district supply, ground truth verification, and citizen-first
                    intelligence designed specifically for Tier-2, Tier-3, and rural Bharat.
                  </p>

                  <div className="p-3 bg-black/80 rounded-xl border border-orange-500/20 text-xs space-y-1 font-mono">
                    <div className="text-orange-400 font-bold">✓ Grounded AI Concierge Active</div>
                    <div className="text-slate-300">✓ DSSL Trust Scoring Operational</div>
                    <div className="text-slate-300">✓ Single-Touch Citizen Action Cards</div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10">
                    <Link
                      href="/shahdol/ai/concierge"
                      className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      <span>Experience AI Concierge Live</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. SAMBHAG PRIDE & REGIONAL IDENTITY                     */}
      {/* ======================================================== */}
      <section className="py-20 bg-white/[0.02] border-y border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 text-left">
              <span className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold block mb-2">
                Rooted in Vindhya
              </span>
              <h2 className="text-3xl md:text-4xl font-black mb-6 leading-tight">
                Shahdol: Ek Jila Nahi,<br />
                <span className="text-orange-500">Ek Gauravshali Sambhag Hai.</span>
              </h2>
              <p className="text-slate-300 leading-relaxed mb-6 text-sm md:text-base">
                BharatOS is being developed as district-scale digital infrastructure rooted in Shahdol and designed for the realities of Tier-3/4 India. Shree Ram Hospital se lekar local market tak, Shahdol Sambhag (Anuppur, Umaria) ki har ek dhadkan ab structured digital framework par jud rahi hai.
              </p>
              <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
                <div>
                  <h4 className="text-2xl font-black text-white">Sambhag</h4>
                  <p className="text-slate-400 text-xs mt-1">Division Focus: Shahdol, Anuppur, Umaria</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white">DSSL</h4>
                  <p className="text-slate-400 text-xs mt-1">Sovereign Digital Trust Framework</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="aspect-square bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl rotate-2 flex items-center justify-center p-1 shadow-2xl shadow-orange-500/20">
                <div className="bg-[#050505] w-full h-full rounded-[1.4rem] flex flex-col items-center justify-center text-center p-8">
                  <MapPin size={48} className="text-orange-500 mb-6" />
                  <h3 className="text-2xl font-black italic">Shahdol Operating System</h3>
                  <p className="text-slate-400 mt-4 text-xs font-medium">Headquartered & Pioneered in Shahdol, MP</p>
                  <div className="mt-4 text-[10px] font-mono text-orange-400/80 uppercase tracking-widest">
                    Vindhya Digital Frontier
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. VALUE PILLARS                                         */}
      {/* ======================================================== */}
      <section className="py-20 container mx-auto px-4 max-w-5xl">
        <div className="grid md:grid-cols-4 gap-6 text-left">
          {[
            { icon: <ShieldCheck size={24} />, title: "Digital Safety", desc: "DSSL framework ke sath 100% fraud protection aur authentic vendor verification." },
            { icon: <Zap size={24} />, title: "Hyperlocal Grounding", desc: "Shahdol ki galiyo se lekar hospitals tak ki direct, fact-checked access." },
            { icon: <Users size={24} />, title: "Merchant Sovereignty", desc: "Local vyapariyon ko global tech capability aur autonomous digital reach dena." },
            { icon: <Cpu size={24} />, title: "District Intelligence", desc: "Zero hallucination, deterministic routing aur citizen action cards." }
          ].map((feature, i) => (
            <div key={i} className="group p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-orange-500/40 transition-all duration-300">
              <div className="text-orange-500 mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h4 className="text-base font-black mb-2">{feature.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. CALL TO ACTION                                        */}
      {/* ======================================================== */}
      <section className="py-20 text-center relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-orange-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10 max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-orange-400 font-bold block mb-3">
            Be Part of the Evolution
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            Shuru karein Shahdol ki <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Digital Kranti?
            </span>
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed mb-8">
            Whether you are a merchant looking to scale your store, or a citizen searching for verified healthcare,
            education, and services — the journey is open.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleJoinClick}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-black text-sm rounded-full transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_50px_rgba(249,115,22,0.5)] active:scale-95 border border-white/10"
            >
              JOIN AS MERCHANT
            </button>

            <Link
              href="/shahdol/ai/concierge"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-full transition-all border border-white/10"
            >
              TRY AI CONCIERGE
            </Link>
          </div>

          <p className="mt-8 text-slate-500 text-xs font-mono">
            Powered by BharatOS • Verified with <span className="text-orange-400">DSSL Security Framework</span>
          </p>
        </div>
      </section>
    </div>
  );
}
