"use client";

interface DataPoint {
  month: string;
  companies?: number;
  revenue?: number;
}

export function MonthlyGrowthChart({ data }: { data: DataPoint[] }) {
  const maxCompanies = Math.max(...data.map((d) => d.companies || 0), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue || 0), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-0.5 h-32">
              <div
                className="flex-1 bg-primary-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${((d.companies || 0) / maxCompanies) * 100}%`, minHeight: 2 }}
                title={`${d.companies} kompaniya`}
              />
              <div
                className="flex-1 bg-emerald-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${((d.revenue || 0) / maxRevenue) * 100}%`, minHeight: 2 }}
                title={`${(d.revenue || 0).toLocaleString()} so'm`}
              />
            </div>
            <span className="text-[10px] text-gray-400">{d.month}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary-500 inline-block" />Kompaniyalar</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />Daromad</span>
      </div>
    </div>
  );
}
