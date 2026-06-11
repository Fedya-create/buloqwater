"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSystemHealth, getRecentErrors } from "@/actions/superadmin-health-actions";

interface SystemHealthData {
  database: {
    status: "healthy" | "warning" | "error";
    totalRecords: number;
    companiesCount: number;
    usersCount: number;
    ordersCount: number;
    customersCount: number;
  };
  companies: {
    total: number;
    active: number;
    suspended: number;
    expiringSoon: number;
  };
  orders: {
    total: number;
    todayOrders: number;
    pendingOrders: number;
    deliveredToday: number;
  };
  storage: {
    totalProducts: number;
    totalApplications: number;
    pendingApplications: number;
    activityLogs: number;
  };
  performance: {
    avgOrdersPerCompany: number;
    avgCustomersPerCompany: number;
    activeUsersPercent: number;
  };
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    const [healthRes, errorsRes] = await Promise.all([
      getSystemHealth(),
      getRecentErrors(),
    ]);
    if (healthRes.success && healthRes.data) setHealth(healthRes.data);
    if (errorsRes.success && errorsRes.data) setErrors(errorsRes.data);
    setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const getStatusBadge = (status: string) => {
    if (status === "healthy") return <Badge variant="success">✅ Sog'lom</Badge>;
    if (status === "warning") return <Badge variant="warning">⚠️ Ogohlantirish</Badge>;
    return <Badge variant="destructive">❌ Xatolik</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-500 dark:text-gray-400">Ma'lumot yuklanmadi</p>
        <Button onClick={loadData} className="mt-4">Qayta yuklash</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tizim Holati"
        description={`Oxirgi yangilanish: ${lastUpdated}`}
        action={<Button onClick={loadData} variant="outline">🔄 Yangilash</Button>}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${health.database.status === "healthy" ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}`}>
              {health.database.status === "healthy" ? "💚" : "💛"}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Umumiy Holat</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tizimning joriy holati</p>
            </div>
          </div>
          {getStatusBadge(health.database.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard emoji="🏢" title="Kompaniyalar" value={health.companies.total} details={[
          { label: "Faol", value: health.companies.active, color: "text-green-600" },
          { label: "Muzlatilgan", value: health.companies.suspended, color: "text-red-600" },
          { label: "Obunasi tugayapti", value: health.companies.expiringSoon, color: "text-yellow-600" },
        ]} />
        <MetricCard emoji="📦" title="Buyurtmalar" value={health.orders.total} details={[
          { label: "Bugungi", value: health.orders.todayOrders, color: "text-blue-600" },
          { label: "Kutilmoqda", value: health.orders.pendingOrders, color: "text-yellow-600" },
          { label: "Bugun yetkazildi", value: health.orders.deliveredToday, color: "text-green-600" },
        ]} />
        <MetricCard emoji="💾" title="Ma'lumotlar" value={health.database.totalRecords} details={[
          { label: "Foydalanuvchilar", value: health.database.usersCount, color: "text-blue-600" },
          { label: "Mijozlar", value: health.database.customersCount, color: "text-purple-600" },
          { label: "Mahsulotlar", value: health.storage.totalProducts, color: "text-indigo-600" },
        ]} />
        <MetricCard emoji="📊" title="Ishlash" value={`${health.performance.activeUsersPercent}%`} details={[
          { label: "O'rtacha buyurtma/komp", value: health.performance.avgOrdersPerCompany, color: "text-blue-600" },
          { label: "O'rtacha mijoz/komp", value: health.performance.avgCustomersPerCompany, color: "text-green-600" },
          { label: "Faol foydalanuvchilar", value: `${health.performance.activeUsersPercent}%`, color: "text-purple-600" },
        ]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">🗄️</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ma'lumotlar Bazasi</h3>
          </div>
          <div className="space-y-3">
            <ProgressRow label="Kompaniyalar" value={health.database.companiesCount} max={100} />
            <ProgressRow label="Foydalanuvchilar" value={health.database.usersCount} max={1000} />
            <ProgressRow label="Buyurtmalar" value={health.database.ordersCount} max={10000} />
            <ProgressRow label="Mijozlar" value={health.database.customersCount} max={5000} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">📋</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tizim Xizmatlari</h3>
          </div>
          <div className="space-y-3">
            <ServiceRow name="Zayavkalar" count={health.storage.totalApplications} pending={health.storage.pendingApplications} />
            <ServiceRow name="Faoliyat jurnali" count={health.storage.activityLogs} pending={0} />
            <ServiceRow name="Mahsulotlar katalogi" count={health.storage.totalProducts} pending={0} />
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-yellow-200 dark:border-yellow-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">⚠️</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Diqqat Talab Masalalar</h3>
            <Badge variant="warning">{errors.length}</Badge>
          </div>
          <div className="space-y-2">
            {errors.map((err) => (
              <div key={err.id} className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⏰</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{err.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(err.date).toLocaleDateString("uz-UZ")}</p>
                  </div>
                </div>
                <Badge variant="warning">Obuna</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ emoji, title, value, details }: {
  emoji: string;
  title: string;
  value: number | string;
  details: { label: string; value: number | string; color: string }[];
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-700">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{d.label}</span>
            <span className={`text-xs font-semibold ${d.color}`}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{value.toLocaleString()}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percent > 80 ? "bg-red-500" : percent > 50 ? "bg-yellow-500" : "bg-green-500"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ServiceRow({ name, count, pending }: { name: string; count: number; pending: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{count}</span>
        {pending > 0 && <Badge variant="warning">{pending} kutilmoqda</Badge>}
      </div>
    </div>
  );
}
