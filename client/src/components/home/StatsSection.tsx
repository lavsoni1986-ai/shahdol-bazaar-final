interface StatsSectionProps {
  storesCount: number;
  productsCount: number;
  hospitalsCount: number;
}

export function StatsSection({ storesCount, productsCount, hospitalsCount }: StatsSectionProps) {
  return (
    <div className="flex justify-center gap-12 mt-6">
      <div>
        <p className="text-2xl font-bold text-white">{storesCount}</p>
        <p className="text-gray-500 text-sm">Stores</p>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{productsCount}</p>
        <p className="text-gray-500 text-sm">Products</p>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{hospitalsCount}</p>
        <p className="text-gray-500 text-sm">Healthcare</p>
      </div>
    </div>
  );
}
