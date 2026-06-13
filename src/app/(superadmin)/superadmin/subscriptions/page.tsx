"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateOnly, formatCurrency } from "@/lib/utils";
import { getSubscriptions, extendSubscriptionNew, cancelSubscription, confirmPayment, getSubscriptionStats } from "@/actions/superadmin-subscriptions-actions";

const STATUS_MAP: Record<string, { label: string; variant: any }> = {
  ACTIVE:    { label: "Faol",     variant: "success" },
  EXPIRED:   { label: "Muddati o'tgan", variant: "destructive" },
  CANCELLED: { label: "Bekor",   variant: "secondary" },
  TRIAL:     { label: "Sinov",   variant: "warning" },
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [extendModal, setExtendModal] = useState<any | null>(null);
  const [extendForm, setExtendForm] = useState({ days: "30", amount: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      getSubscriptions({ status: statusFilter }),
      getSubscriptionStats(),
    ]);
    if (r.success && r.data) setSubs(r.data as any[]);
    if (s.success && s.data) setStats(s.data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = subs.filter(s =>
    !search || s.company?.name?.toLowerCase().includes(search.toLowerCase()) || s.company?.subdomain?.includes(search.toLowerCase())
  );

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModal) return;
    setFormLoading(true);
    const r = await extendSubscriptionNew(extendModal.id, +extendForm.days, +extendForm.amount || 0);
    if (r.success) { setExtendModal(null); load(); showToast("Obuna uzaytirildi!"); }
    else showToast((r as any).error, "error");
    setFormLoading(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Bekor qilmoqchimisiz?")) return;
    const r = await cancelSubscription(id);
    if (r.success) { load(); showToast("Bekor qilindi"); }
    else showToast((r as any).error, "error");
  };

  const handleConfirmPayment = async (id: string) => {
    const r = await confirmPayment(id);
    if (r.success) { load(); showToast("To'lov tasdiqlandi ✓"); }
    else showToast((r as any).error, "error");
  };

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <PageHeader title="Obunalar" description="Kompaniya obunalarini boshqarish" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Jami", value: stats.total, color: "text-gray-900 dark:text-white" },
            { label: "Faol", value: stats.active, color: "text-green-600" },
            { label: "Muddati o'tgan", value: stats.expired, color: "text-red-500" },
            { label: "7 kun ichida", value: stats.expiringSoon, color: "text-yellow-500" },
            { label: "Jami daromad", value: formatCurrency(stats.totalRevenue), color: "text-primary-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Kompaniya nomi..." className="max-w-xs" />
        <div className="flex items-center gap-2 flex-wrap">
          {["ALL", "ACTIVE", "EXPIRED", "CANCELLED", "TRIAL"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === s ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
              {s === "ALL" ? "Barchasi" : STATUS_MAP[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-4xl mb-3">💳</p><p className="text-gray-500 dark:text-gray-400">Obuna topilmadi</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Kompaniya</div>
            <div className="col-span-2">Tarif</div>
            <div className="col-span-2">Boshlangan</div>
            <div className="col-span-2">Tugaydi</div>
            <div className="col-span-1">Holat</div>
            <div className="col-span-2 text-right">Amallar</div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map(sub => {
              const st = STATUS_MAP[sub.status] || { label: sub.status, variant: "secondary" };
              const isExpiring = sub.daysLeft !== null && sub.daysLeft > 0 && sub.daysLeft <= 7;
              return (
                <div key={sub.id} className={`grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors items-center ${isExpiring ? "border-l-2 border-yellow-400" : ""}`}>
                  <div className="lg:col-span-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{sub.company?.name || "—"}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{sub.company?.subdomain}.buloqwater.uz</p>
                  </div>
                  <div className="lg:col-span-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{sub.plan?.displayName || "—"}</span>
                    {sub.amount > 0 && <p className="text-xs text-green-600">{formatCurrency(sub.amount)}</p>}
                  </div>
                  <div className="lg:col-span-2 text-sm text-gray-600 dark:text-gray-400">{formatDateOnly(sub.startDate)}</div>
                  <div className="lg:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDateOnly(sub.endDate)}</p>
                    {sub.daysLeft !== null && (
                      <p className={`text-xs font-medium ${sub.daysLeft > 7 ? "text-green-500" : sub.daysLeft > 0 ? "text-yellow-500" : "text-red-500"}`}>
                        {sub.daysLeft > 0 ? `${sub.daysLeft} kun qoldi` : `${Math.abs(sub.daysLeft)} kun o'tgan`}
                      </p>
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {!sub.isPaid && sub.status === "ACTIVE" && <p className="text-xs text-orange-500 mt-0.5">To'lanmagan</p>}
                  </div>
                  <div className="lg:col-span-2 flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setExtendModal(sub); setExtendForm({ days: "30", amount: "" }); }} title="Uzaytirish">📅</Button>
                    {!sub.isPaid && <Button variant="ghost" size="sm" onClick={() => handleConfirmPayment(sub.id)} title="To'lovni tasdiqlash">✅</Button>}
                    {sub.status === "ACTIVE" && <Button variant="ghost" size="sm" onClick={() => handleCancel(sub.id)} title="Bekor qilish" className="hover:bg-red-50 dark:hover:bg-red-900/20">🚫</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!extendModal} onClose={() => setExtendModal(null)} title={`Obunani uzaytirish: ${extendModal?.company?.name || ""}`}>
        <form onSubmit={handleExtend} className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
            Hozirgi tugash sanasi: <strong>{extendModal ? formatDateOnly(extendModal.endDate) : "—"}</strong>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Necha kun?</label>
            <div className="grid grid-cols-4 gap-2">
              {["7", "30", "90", "365"].map(d => (
                <button key={d} type="button"
                  className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${extendForm.days === d ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
                  onClick={() => setExtendForm(p => ({ ...p, days: d }))}>
                  {d === "365" ? "1 yil" : `${d} kun`}
                </button>
              ))}
            </div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">To'lov summasi (so'm)</label><Input type="number" value={extendForm.amount} onChange={e => setExtendForm(p => ({ ...p, amount: e.target.value }))} placeholder="0 (bepul uzaytirish)" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setExtendModal(null)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Uzaytirish"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
