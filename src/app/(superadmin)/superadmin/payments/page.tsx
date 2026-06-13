"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";
import { getPayments, getPaymentStats } from "@/actions/superadmin-payments-actions";

const METHOD_META: Record<string, { label: string; icon: string; color: string }> = {
  CASH:          { label: "Naqd",     icon: "💵", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  CLICK:         { label: "Click",    icon: "📱", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" },
  PAYME:         { label: "Payme",    icon: "💳", color: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300" },
  UZUM:          { label: "Uzum",     icon: "🟣", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  STRIPE:        { label: "Stripe",   icon: "⚡", color: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
  BANK_TRANSFER: { label: "Bank",     icon: "🏦", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      getPayments({ method: methodFilter, from: dateFrom || undefined, to: dateTo || undefined }),
      getPaymentStats(),
    ]);
    if (r.success && r.data) setPayments(r.data as any[]);
    if (s.success && s.data) setStats(s.data);
    setLoading(false);
  }, [methodFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter(p =>
    !search || p.companyName?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative">
      {toast && <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg bg-green-50 dark:bg-green-900/30 border border-green-200 text-green-800 dark:text-green-200 text-sm font-medium">✅ {toast}</div>}

      <PageHeader title="To'lovlar" description="Barcha to'lovlar tarixi" />

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Jami daromad</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stats.totalCount} ta to'lov</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Bu oy</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.thisMonth?.revenue || 0)}</p>
            <p className={`text-xs mt-0.5 font-medium ${stats.growthPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
              {stats.growthPercent >= 0 ? "↑" : "↓"} {Math.abs(stats.growthPercent)}% o'tgan oyga nisbatan
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">O'tgan oy</p>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mt-1">{formatCurrency(stats.lastMonth?.revenue || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">To'lov usullari</p>
            <div className="space-y-1">
              {(stats.byMethod || []).slice(0, 3).map((m: any) => (
                <div key={m.method} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{METHOD_META[m.method]?.icon} {METHOD_META[m.method]?.label || m.method}</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{m.count} ta</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Oylik grafik */}
      {stats?.monthly && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Oylik Daromad Grafigi</h3>
          <div className="flex items-end gap-2 h-24">
            {stats.monthly.map((m: any, i: number) => {
              const max = Math.max(...stats.monthly.map((x: any) => x.revenue), 1);
              const h = Math.round((m.revenue / max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary-500 rounded-t-sm hover:bg-primary-600 transition-colors cursor-default" style={{ height: `${h}%`, minHeight: 2 }} title={`${formatCurrency(m.revenue)}`} />
                  <span className="text-[9px] text-gray-400">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 flex-wrap">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Kompaniya yoki tavsif..." className="max-w-xs" />
        <div className="flex gap-2 flex-wrap">
          {["ALL", ...Object.keys(METHOD_META)].map(m => (
            <button key={m} onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${methodFilter === m ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
              {m === "ALL" ? "Barchasi" : `${METHOD_META[m]?.icon} ${METHOD_META[m]?.label}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
          <span className="text-gray-400 text-xs">—</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Kompaniya</div>
            <div className="col-span-2">Tarif</div>
            <div className="col-span-2">Summa</div>
            <div className="col-span-2">Usul</div>
            <div className="col-span-3">Sana</div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 dark:text-gray-500"><p className="text-3xl mb-2">💰</p>To'lov topilmadi</div>
            ) : filtered.map(p => {
              const mMeta = METHOD_META[p.method] || { label: p.method, icon: "💳", color: "bg-gray-100 text-gray-600" };
              return (
                <div key={p.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors items-center">
                  <div className="lg:col-span-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{p.companyName}</p>
                    <p className="text-xs text-gray-400">{p.subdomain}</p>
                  </div>
                  <div className="lg:col-span-2 text-sm text-gray-600 dark:text-gray-400">{p.planName}</div>
                  <div className="lg:col-span-2 text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</div>
                  <div className="lg:col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${mMeta.color}`}>
                      {mMeta.icon} {mMeta.label}
                    </span>
                  </div>
                  <div className="lg:col-span-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(p.paidAt)}</div>
                </div>
              );
            })}
          </div>
          {filtered.length > 0 && (
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-500">{filtered.length} ta to'lov</p>
              <p className="text-sm font-semibold text-green-600">Jami: {formatCurrency(filtered.reduce((s, p) => s + p.amount, 0))}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
