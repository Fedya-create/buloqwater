"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { getActivityLogs } from "@/actions/superadmin-audit-actions";

const ACTION_META: Record<string, { icon: string; color: string }> = {
  company_created:       { icon: "🏢", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  company_suspended:     { icon: "⏸️", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  company_activated:     { icon: "▶️", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  user_created:          { icon: "👤", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  subscription_extended: { icon: "📅", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  backup_created:        { icon: "💾", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  notification_sent:     { icon: "📢", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
  backup_restore_initiated: { icon: "🔁", color: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" },
};

export default function AuditLogsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"activity" | "system">("activity");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getActivityLogs({ page });
    if (r.success && r.data) setData(r.data);
    setLoading(false);
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const filtered = (data?.logs || []).filter((l: any) =>
    !search || l.description?.toLowerCase().includes(search.toLowerCase()) || l.action?.includes(search.toLowerCase()) || l.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative">
      <PageHeader title="Audit Log" description="Tizimdagi barcha harakatlar" />

      {/* Tab */}
      <div className="flex gap-2 mb-5 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: "activity", label: "📋 Faoliyat Jurnali" },
          { key: "system",   label: "⚠️ Tizim Xatolari" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "activity" ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Harakat, kompaniya..." className="max-w-sm" />
            <Button variant="outline" size="sm" onClick={load}>🔄</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1">Amal</div>
                  <div className="col-span-5">Tavsif</div>
                  <div className="col-span-3">Kompaniya</div>
                  <div className="col-span-3">Vaqt</div>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400"><p className="text-3xl mb-2">📋</p>Log topilmadi</div>
                  ) : filtered.map((log: any) => {
                    const meta = ACTION_META[log.action] || { icon: "📋", color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
                    return (
                      <div key={log.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors items-center">
                        <div className="lg:col-span-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${meta.color}`}>{meta.icon}</div>
                        </div>
                        <div className="lg:col-span-5">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
                          <code className="text-xs text-gray-400 dark:text-gray-500">{log.action}</code>
                        </div>
                        <div className="lg:col-span-3 text-sm text-gray-600 dark:text-gray-400">{log.company?.name || <span className="text-gray-300 dark:text-gray-600">—</span>}</div>
                        <div className="lg:col-span-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(log.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Oldingi</Button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{page} / {data.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>Keyingi →</Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center shadow-sm">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Tizim xatolari (System Log) hozircha bo'sh</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">API xatolari avtomatik bu yerga yoziladi</p>
        </div>
      )}
    </div>
  );
}
