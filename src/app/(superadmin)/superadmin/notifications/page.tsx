"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getNotifications, sendNotification, deleteNotification } from "@/actions/superadmin-notifications-actions";
import { getCompanies } from "@/actions/company-actions";

const TYPE_META: Record<string, { label: string; icon: string; variant: any }> = {
  INFO:         { label: "Ma'lumot",  icon: "ℹ️",  variant: "secondary" },
  WARNING:      { label: "Ogohlantirish", icon: "⚠️", variant: "warning" },
  SUCCESS:      { label: "Muvaffaqiyat", icon: "✅", variant: "success" },
  DANGER:       { label: "Xavf",     icon: "🚨", variant: "destructive" },
  ANNOUNCEMENT: { label: "E'lon",    icon: "📢", variant: "default" },
};

const CHANNEL_META: Record<string, { label: string; icon: string }> = {
  IN_APP:   { label: "Ilova ichida", icon: "🔔" },
  SMS:      { label: "SMS",         icon: "📱" },
  TELEGRAM: { label: "Telegram",    icon: "✈️" },
  PUSH:     { label: "Push",        icon: "📲" },
  EMAIL:    { label: "Email",       icon: "📧" },
};

const EMPTY_FORM = { title: "", body: "", type: "INFO", channel: "IN_APP", isGlobal: true, companyId: "", companyName: "" };

export default function NotificationsPage() {
  const [data, setData] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const [r, c] = await Promise.all([getNotifications(), getCompanies()]);
    if (r.success && r.data) setData(r.data);
    if (c.success && c.data) setCompanies((c.data as any[]).filter(c => c.status === "ACTIVE" && c.subdomain !== "global-templates"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const r = await sendNotification(form);
    if (r.success) { setIsOpen(false); setForm(EMPTY_FORM); load(); showToast("Xabar yuborildi! 🎉"); }
    else showToast((r as any).error, "error");
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    const r = await deleteNotification(id);
    if (r.success) { load(); showToast("O'chirildi"); }
    else showToast((r as any).error, "error");
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <PageHeader
        title="Xabarlar Markazi"
        description="Kompaniyalarga bildirishnomalar yuborish"
        action={<Button onClick={() => setIsOpen(true)}>+ Yangi Xabar</Button>}
      />

      {/* Channel info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {Object.entries(CHANNEL_META).map(([key, m]) => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-center">
            <p className="text-2xl mb-1">{m.icon}</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{m.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {(!data?.items || data.items.length === 0) ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
              <p className="text-4xl mb-3">📢</p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Hali xabar yuborilmagan</p>
              <Button onClick={() => setIsOpen(true)}>+ Birinchi xabar yuborish</Button>
            </div>
          ) : (data?.items || []).map((n: any) => {
            const tMeta = TYPE_META[n.type] || TYPE_META.INFO;
            const cMeta = CHANNEL_META[n.channel] || CHANNEL_META.IN_APP;
            return (
              <div key={n.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-xl shrink-0">{tMeta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</h4>
                        <Badge variant={tMeta.variant}>{tMeta.label}</Badge>
                        {n.isGlobal && <Badge variant="outline">🌐 Global</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{n.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{cMeta.icon} {cMeta.label}</span>
                        <span>•</span>
                        <span>{n.companyName || "Barcha kompaniyalar"}</span>
                        <span>•</span>
                        <span>{formatDate(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(n.id)} className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 shrink-0">🗑️</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Modal */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Yangi Xabar Yuborish">
        <form onSubmit={handleSend} className="space-y-4">
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Sarlavha</label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Texnik ishlar haqida..." required />
          </div>
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Xabar matni</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} required rows={4}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Xabar tafsilotlari..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Tur</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Object.entries(TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Kanal</label>
              <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                {Object.entries(CHANNEL_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700">
              <input type="radio" checked={form.isGlobal} onChange={() => setForm(p => ({ ...p, isGlobal: true, companyId: "", companyName: "" }))} />
              <div><p className="text-sm font-medium text-gray-900 dark:text-white">🌐 Barcha kompaniyalarga</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hozirda faol bo'lgan barcha kompaniyalarga yuboriladi</p></div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-100 dark:border-gray-700">
              <input type="radio" checked={!form.isGlobal} onChange={() => setForm(p => ({ ...p, isGlobal: false }))} />
              <div className="flex-1"><p className="text-sm font-medium text-gray-900 dark:text-white">🏢 Bitta kompaniyaga</p></div>
            </label>
            {!form.isGlobal && (
              <select value={form.companyId} onChange={e => {
                const c = companies.find(c => c.id === e.target.value);
                setForm(p => ({ ...p, companyId: e.target.value, companyName: c?.name || "" }));
              }} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" required={!form.isGlobal}>
                <option value="">Kompaniya tanlang...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Yuborilmoqda..." : "📢 Yuborish"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
