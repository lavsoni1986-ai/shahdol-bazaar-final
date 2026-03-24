interface HeroProps {
  districtName: string;
  isAuthenticated?: boolean;
  userGreeting?: {
    title: string;
  };
}

export function Hero({ districtName, isAuthenticated, userGreeting }: HeroProps) {
  return (
    <section className="relative isolate z-10 px-4 pt-16 md:pt-20 pb-8 text-center min-h-[50vh] flex flex-col justify-center overflow-hidden">


      {/* Background glow - ONLY gradient, no bg-black conflict */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/60 to-transparent">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/10 blur-3xl rounded-full" />
      </div>

      {/* User-aware banner */}
      {isAuthenticated && userGreeting && (
        <div className="mb-5 inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full">
          <span className="text-orange-400 text-xs font-medium">{userGreeting.title}</span>
        </div>
      )}

      {/* Heading */}
      <div className="max-w-md mx-auto space-y-4 flex flex-col items-center text-center">
        <h1 className="text-3xl md:text-5xl font-black leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          Find Anything in{" "}
          <span className="text-orange-500">{districtName}</span>
        </h1>

        {/* Subheading */}
        <p className="text-sm md:text-base text-gray-400">
          Search shops, services & products in Shahdol — instantly with AI
        </p>

        {/* Trust line */}
        <p className="text-xs text-gray-500">
          <span className="text-orange-400 font-semibold">500+</span> trusted local businesses
        </p>
      </div>
    </section>
  );
}
