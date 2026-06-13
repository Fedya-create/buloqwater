"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";
import { getAnalytics } from "@/actions/superadmin-analytics-actions";

function MiniBar({ data, valueKey, maxVal }: { data: any[]; valueKey: string; maxVal: number }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d, i) => {
        const h = maxVal > 0 ? Math.round((d[valueKey] / maxVal) * 100) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className={`w-full rounded-t-sm transition-all ${d.isForecast ? "bg-primary-200 dark:bg-primary-800 opacity-60 border-t border-dashed border-primary-400" : "bg-primary-500"}`}
              style={{ height: `${h}%`, minHeight: 2 }}
              title={`${d.month}: ${formatCurrency(d[valueKey])}`}
            />
            <span className="text-[8px] text-gray-400 leading-none">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

const CHURN_META: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Xavfsiz",   color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
  medium: { label: "O'rta",    color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  high:   { label: "Yuqori",   color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30" },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "churn" | "forecast">("overview");

  const load = async () => {
    setLoading(true);
    const r = await getAnalytics();
    if (r.success && r.data) setData(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const maxRevenue = data ? Math.max(...data.monthlyRevenue.map((m: any) => m.revenue), 1) : 1;
  const maxOrders  = data ? Math.max(...data.monthlyRevenue.map((m: any) => m.orders), 1) : 1;

  return (
    <div className="relative">
      <PageHeader
        title="AI Analitika"
        description="Kompaniya va daromad tahlili"
        action={<Button variant="outline" size="sm" onClick={load}>🔄 Yangilash</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Ma'lumot yuklanmadi</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Jami daromad",    value: formatCurrency(data.summary.totalRevenue),    icon: "💰", color: "text-green-600" },
              { label: "Jami buyurtmalar",value: data.summary.totalOrders.toLocaleString(),    icon: "📦", color: "text-blue-600" },
              { label: "Faol kompaniyalar",value: data.summary.activeCompanies,                icon: "🏢", color: "text-primary-600" },
              { label: "Shu oy yangi",    value: data.summary.newThisMonth,                    icon: "✨", color: "text-purple-600" },
              { label: "Kompaniya/daromad",value: formatCurrency(data.summary.avgRevenuePerCompany), icon: "📊", color: "text-amber-600" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {[
              { key: "overview", label: "📊 Umumiy" },
              { key: "churn",    label: "⚠️ Chiqib ketish xavfi" },
              { key: "forecast", label: "🔮 Prognoz" },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as any)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daromad grafigi */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Daromad dinamikasi</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary-500 inline-block" />Haqiqiy</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary-200 dark:bg-primary-800 inline-block border border-dashed border-primary-400" />Prognoz</span>
                  </div>
                </div>
                <MiniBar data={data.monthlyRevenue} valueKey="revenue" maxVal={maxRevenue} />
              </div>

              {/* Buyurtmalar grafigi */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Buyurtmalar dinamikasi</h3>
                <MiniBar data={data.monthlyRevenue} valueKey="orders" maxVal={maxOrders} />
              </div>

              {/* Top kompaniyalar */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">🏆 Eng Faol Kompaniyalar</h3>
                <div className="space-y-2">
                  {data.topCompanies.slice(0, 5).map((c: any, i: number) => (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.ordersCount} buyurtma · {c.customersCount} mijoz</p>
                      </div>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(c.revenue)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyurtma statusi */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">📊 Buyurtmalar Taqsimoti</h3>
                <div className="space-y-3">
                  {data.ordersByStatus.map((s: any) => {
                    const total = data.ordersByStatus.reduce((sum: number, x: any) => sum + x.count, 0);
                    const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                    const colors: Record<string, string> = {
                      DELIVERED: "bg-green-500", PENDING: "bg-yellow-400", ASSIGNED: "bg-blue-400",
                      IN_TRANSIT: "bg-purple-400", CANCELLED: "bg-red-400",
                    };
                    const labels: Record<string, string> = {
                      DELIVERED: "Yetkazildi", PENDING: "Kutilmoqda", ASSIGNED: "Biriktirildi",
                      IN_TRANSIT: "Yo'lda", CANCELLED: "Bekor",
                    };
                    return (
                      <div key={s.status}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{labels[s.status] || s.status}</span>
                          <span className="text-gray-500">{s.count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[s.status] || "bg-gray-400"} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Churn Tab */}
          {tab === "churn" && (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                <p className="text-sm text-orange-700 dark:text-orange-300">⚠️ Quyidagi kompaniyalar yaqin orada chiqib ketishi ehtimoli yuqori (obuna muddati 30 kun ichida tugaydi yoki buyurtmalar juda kam)</p>
              </div>
              {data.highChurnRisk.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
                  <p className="text-4xl mb-2">🎉</p><p className="text-gray-500 dark:text-gray-400">Xavfli kompaniya yo'q</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {data.highChurnRisk.map((c: any) => {
                      const churnMeta = CHURN_META[c.churnRisk] || CHURN_META.low;
                      return (
                        <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center">{c.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.ordersCount} buyurtma · {c.customersCount} mijoz</p>
                          </div>
                          <div className="text-right">
                            {c.daysLeft !== null && (
                              <p className="text-xs text-red-500 font-medium">{c.daysLeft > 0 ? `${c.daysLeft} kun qoldi` : `${Math.abs(c.daysLeft)} kun o'tgan`}</p>
                            )}
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${churnMeta.bg} ${churnMeta.color}`}>{churnMeta.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forecast Tab */}
          {tab === "forecast" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">🔮 Daromad Prognozi</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">So'nggi 3 oy trend asosida, 5% o'sish bilan</p>
                <MiniBar data={data.monthlyRevenue} valueKey="revenue" maxVal={maxRevenue} />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {data.monthlyRevenue.filter((m: any) => m.isForecast).map((m: any, i: number) => (
                    <div key={i} className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 text-center border border-dashed border-primary-300 dark:border-primary-700">
                      <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{m.month}</p>
                      <p className="text-sm font-bold text-primary-700 dark:text-primary-300 mt-0.5">{formatCurrency(m.revenue)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.orders} buyurtma</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">💡 Tavsiyalar</h3>
                <div className="space-y-3">
                  {[
                    { icon: "📢", title: "Chiqib ketish xavfi yuqori kompaniyalarga murojaat qiling", desc: `${data.highChurnRisk.length} ta kompaniya xavfli zonada`, color: "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20" },
                    { icon: "💰", title: "Oylik daromad o'sish trendida", desc: "5% o'sish prognozi bilan uch oy oldinga", color: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" },
                    { icon: "🏆", title: "Eng faol kompaniyalarga maxsus takliflar", desc: `Top 3 kompaniya jami buyurtmalarning katta qismini tashkil etadi`, color: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20" },
                  ].map((tip, i) => (
                    <div key={i} className={`rounded-xl border p-3.5 ${tip.color}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg shrink-0">{tip.icon}</span>
                        <div><p className="text-sm font-medium text-gray-900 dark:text-white">{tip.title}</p><p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{tip.desc}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
