"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { getSystemHealth } from "@/actions/superadmin-health-actions";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");

  useEffect(() => {
    (async () => {
      const r = await getSystemHealth();
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-center py-20"><p className="text-gray-500 dark:text-gray-400">Ma'lumot yuklanmadi</p></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Analitika" description="Platforma ko'rsatkichlari va trendlar" />

      <div className="flex items-center gap-2">
        {(["week", "month", "year"] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
            {p === "week" ? "Hafta" : p === "month" ? "Oy" : "Yil"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami kompaniyalar" value={data.companies.total} icon={<span className="text-xl">🏢</span>} description={`${data.companies.active} faol`} />
        <StatCard title="Jami buyurtmalar" value={data.orders.total} icon={<span className="text-xl">📦</span>} description={`Bugun: ${data.orders.todayOrders}`} />
        <StatCard title="Foydalanuvchilar" value={data.database.usersCount} icon={<span className="text-xl">👥</span>} description={`${data.performance.activeUsersPercent}% faol`} />
        <StatCard title="Mijozlar" value={data.database.customersCount} icon={<span className="text-xl">🧑‍💼</span>} description={`O'rtacha: ${data.performance.avgCustomersPerCompany}/komp`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Kompaniya O'sishi</h3>
          <div className="space-y-3">
            <MetricRow label="Faol" value={data.companies.active} total={data.companies.total} color="bg-green-500" />
            <MetricRow label="Muzlatilgan" value={data.companies.suspended} total={data.companies.total} color="bg-red-500" />
            <MetricRow label="Obunasi tugayotgan" value={data.companies.expiringSoon} total={data.companies.total} color="bg-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Buyurtmalar Statistikasi</h3>
          <div className="space-y-3">
            <MetricRow label="Bugungi" value={data.orders.todayOrders} total={data.orders.total} color="bg-blue-500" />
            <MetricRow label="Kutilmoqda" value={data.orders.pendingOrders} total={data.orders.total} color="bg-orange-500" />
            <MetricRow label="Yetkazildi (bugun)" value={data.orders.deliveredToday} total={data.orders.total} color="bg-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Performance Ko'rsatkichlari</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{data.performance.avgOrdersPerCompany}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">O'rtacha buyurtma / kompaniya</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">{data.performance.avgCustomersPerCompany}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">O'rtacha mijoz / kompaniya</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{data.performance.activeUsersPercent}%</p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Faol foydalanuvchilar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}
