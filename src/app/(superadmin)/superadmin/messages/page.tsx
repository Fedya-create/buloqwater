"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMessages, sendMessage, deleteMessage, getCompaniesForMessage,
} from "@/actions/superadmin-message-actions";

interface Message {
  id: string;
  title: string;
  content: string;
  type: "INFO" | "WARNING" | "URGENT" | "ANNOUNCEMENT";
  isGlobal: boolean;
  companyName: string | null;
  createdAt: string;
}

interface CompanyOption {
  id: string;
  name: string;
  subdomain: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "INFO" | "WARNING" | "URGENT" | "ANNOUNCEMENT">("ALL");
  const [toast, setToast] = useState<string | null>(null);
  const [sendForm, setSendForm] = useState({
    title: "",
    content: "",
    type: "INFO" as Message["type"],
    isGlobal: true,
    companyId: "",
    companyName: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = async () => {
    setLoading(true);
    const [msgRes, compRes] = await Promise.all([getMessages(), getCompaniesForMessage()]);
    if (msgRes.success && msgRes.data) setMessages(msgRes.data as Message[]);
    if (compRes.success && compRes.data) setCompanies(compRes.data as CompanyOption[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const r = await sendMessage({
      title: sendForm.title,
      content: sendForm.content,
      type: sendForm.type,
      isGlobal: sendForm.isGlobal,
      companyId: sendForm.isGlobal ? undefined : sendForm.companyId,
      companyName: sendForm.isGlobal ? undefined : sendForm.companyName,
    });
    if (r.success) {
      setIsSendOpen(false);
      setSendForm({ title: "", content: "", type: "INFO", isGlobal: true, companyId: "", companyName: "" });
      loadData();
      showToast("Xabar yuborildi!");
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xabarni o'chirmoqchimisiz?")) return;
    const r = await deleteMessage(id);
    if (r.success) { loadData(); showToast("O'chirildi"); }
  };

  const handleCompanySelect = (companyId: string) => {
    const comp = companies.find((c) => c.id === companyId);
    setSendForm({ ...sendForm, companyId, companyName: comp?.name || "" });
  };

  const filtered = messages.filter((m) => {
    if (filter !== "ALL" && m.type !== filter) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = { INFO: "ℹ️", WARNING: "⚠️", URGENT: "🚨", ANNOUNCEMENT: "📢" };
    return icons[type] || "📩";
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { INFO: "Ma'lumot", WARNING: "Ogohlantirish", URGENT: "Shoshilinch", ANNOUNCEMENT: "E'lon" };
    return labels[type] || type;
  };

  const getTypeVariant = (type: string): "default" | "warning" | "destructive" | "secondary" => {
    const map: Record<string, "default" | "warning" | "destructive" | "secondary"> = { INFO: "default", WARNING: "warning", URGENT: "destructive", ANNOUNCEMENT: "secondary" };
    return map[type] || "default";
  };

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 shadow-lg animate-in">
          <p className="text-sm font-medium">✅ {toast}</p>
        </div>
      )}

      <PageHeader
        title="Xabarlar"
        description={`${messages.length} ta xabar yuborilgan`}
        action={<Button onClick={() => setIsSendOpen(true)}>📤 Xabar Yuborish</Button>}
      />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(["ALL", "INFO", "WARNING", "URGENT", "ANNOUNCEMENT"] as const).map((f) => (
          <button key={f} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filter === f ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`} onClick={() => setFilter(f)}>
            {f === "ALL" ? "Barchasi" : `${getTypeIcon(f)} ${getTypeLabel(f)}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-500 dark:text-gray-400">Xabar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <div key={msg.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getTypeIcon(msg.type)}</span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{msg.title}</h3>
                    <Badge variant={getTypeVariant(msg.type)}>{getTypeLabel(msg.type)}</Badge>
                    {msg.isGlobal && <Badge variant="secondary">🌍 Global</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{msg.content}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                    {msg.companyName && <span>🏢 {msg.companyName}</span>}
                    <span>📅 {new Date(msg.createdAt).toLocaleString("uz-UZ")}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(msg.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={isSendOpen} onClose={() => setIsSendOpen(false)} title="Xabar Yuborish">
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sarlavha *</label>
            <Input value={sendForm.title} onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })} required placeholder="Xabar sarlavhasi" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Matn *</label>
            <textarea
              value={sendForm.content}
              onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
              required
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Xabar matni..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Xabar turi</label>
              <select value={sendForm.type} onChange={(e) => setSendForm({ ...sendForm, type: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                <option value="INFO">ℹ️ Ma'lumot</option>
                <option value="WARNING">⚠️ Ogohlantirish</option>
                <option value="URGENT">🚨 Shoshilinch</option>
                <option value="ANNOUNCEMENT">📢 E'lon</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Qabul qiluvchi</label>
              <select
                value={sendForm.isGlobal ? "global" : "company"}
                onChange={(e) => setSendForm({ ...sendForm, isGlobal: e.target.value === "global" })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="global">🌍 Barcha kompaniyalar</option>
                <option value="company">🏢 Bitta kompaniya</option>
              </select>
            </div>
          </div>

          {!sendForm.isGlobal && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kompaniyani tanlang</label>
              <select
                value={sendForm.companyId}
                onChange={(e) => handleCompanySelect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                required
              >
                <option value="">-- Tanlang --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.subdomain})</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsSendOpen(false)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Yuborilmoqda..." : "📤 Yuborish"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
