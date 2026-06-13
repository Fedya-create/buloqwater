"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getMonitoringData } from "@/actions/superadmin-monitoring-actions";

function ProgressBar({ value, max = 100, color = "bg-primary-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : color;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{pct}%</span>
        <span className="text-gray-400">{value} / {max}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit, icon, status }: { title: string; value: string | number; unit?: string; icon: string; status?: "ok" | "warn" | "error" }) {
  const statusColors = { ok: "border-green-200 dark:border-green-800", warn: "border-yellow-200 dark:border-yellow-800", error: "border-red-200 dark:border-red-800" };
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border-2 ${status ? statusColors[status] : "border-gray-100 dark:border-gray-700"} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}<span className="text-sm font-normal text-gray-400 ml-1">{unit}</span></p>
    </div>
  );
}

export default function MonitoringPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    const r = await getMonitoringData();
    if (r.success && r.data) { setData(r.data); setLastUpdated(new Date()); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
    return `${h}s ${m}d`;
  };

  return (
    <div className="relative">
      <PageHeader
        title="Monitoring"
        description="Server, ma'lumotlar bazasi va API holati"
        action={
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-gray-400">{lastUpdated.toLocaleTimeString("uz-UZ")}</span>}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
              <span className="text-gray-600 dark:text-gray-300">Auto (15s)</span>
            </label>
            <Button variant="outline" size="sm" onClick={load}>🔄 Yangilash</Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Ma'lumot yuklanmadi</div>
      ) : (
        <div className="space-y-6">
          {/* Server Metrics */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">🖥 Server Holati</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">CPU</span><span className="text-xl">⚙️</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.server.cpu}<span className="text-sm font-normal text-gray-400 ml-1">%</span></p>
                <ProgressBar value={data.server.cpu} color="bg-blue-500" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">RAM</span><span className="text-xl">🧠</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.server.ramUsedMB}<span className="text-sm font-normal text-gray-400 ml-1">MB</span></p>
                <ProgressBar value={data.server.ramUsedMB} max={data.server.ramTotalMB} color="bg-purple-500" />
              </div>
              <MetricCard title="Uptime" value={formatUptime(data.server.uptime)} icon="⏱️" status="ok" />
              <MetricCard title="Node.js" value={data.server.nodeVersion} icon="🟢" status="ok" />
            </div>
          </section>

          {/* Database */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">🗄️ Ma'lumotlar Bazasi</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { key: "companiesCount", label: "Kompaniyalar", icon: "🏢" },
                { key: "usersCount",     label: "Foydalanuvchilar", icon: "👥" },
                { key: "ordersCount",    label: "Buyurtmalar", icon: "📦" },
                { key: "customersCount", label: "Mijozlar",  icon: "🧑‍💼" },
                { key: "productsCount",  label: "Mahsulotlar", icon: "🛍️" },
              ].map(item => (
                <div key={item.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                  <span className="text-2xl">{item.icon}</span>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{data.database.tables[item.key]?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PostgreSQL — Sog'lom</span>
              </div>
              <div className="text-xs text-gray-500">Jami yozuvlar: <strong>{data.database.totalRecords.toLocaleString()}</strong></div>
              <div className="text-xs text-gray-500">Taxminiy hajm: <strong>~{data.database.diskEstimatedMB} MB</strong></div>
            </div>
          </section>

          {/* Orders */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">📦 Buyurtmalar Holati</h3>
            <div className="grid grid-cols-3 gap-4">
              <MetricCard title="Bugungi buyurtmalar" value={data.orders.todayOrders} icon="📅" status="ok" />
              <MetricCard title="Kutilayotgan" value={data.orders.pendingOrders} icon="⏳" status={data.orders.pendingOrders > 50 ? "warn" : "ok"} />
              <MetricCard title="Bugun yetkazildi" value={data.orders.deliveredToday} icon="✅" status="ok" />
            </div>
          </section>

          {/* API */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">🔗 API Monitoring</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard title="So'rovlar/min" value={data.api.requestsPerMinute} icon="⚡" status="ok" />
              <MetricCard title="Xatolar (1s)" value={data.api.errorLogs} icon="❌" status={data.api.errorLogs > 5 ? "error" : data.api.errorLogs > 0 ? "warn" : "ok"} />
              <MetricCard title="Xato darajasi" value={`${data.api.errorRate}%`} icon="📊" status={+data.api.errorRate > 5 ? "error" : +data.api.errorRate > 1 ? "warn" : "ok"} />
              <MetricCard title="Jami loglar" value={data.api.totalLogs} icon="📝" status="ok" />
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">📋 So'nggi Faoliyat</h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700 shadow-sm">
              {data.recentActivity.slice(0, 10).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-sm">📋</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{a.description}</p>
                    <p className="text-xs text-gray-400">{a.companyName && `${a.companyName} · `}{new Date(a.createdAt).toLocaleString("uz-UZ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
