"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import {
  getTickets, createTicket, updateTicketStatus, replyToTicket, deleteTicket,
} from "@/actions/superadmin-ticket-actions";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  adminNote: string | null;
  companyName: string | null;
  userName: string | null;
  userPhone: string | null;
  resolvedAt: string | null;
  createdAt: string;
  replies: { id: string; message: string; isAdmin: boolean; authorName: string; createdAt: string }[];
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED">("ALL");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    subject: "", description: "", priority: "MEDIUM" as const,
    companyName: "", userName: "", userPhone: "",
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadData = async () => {
    setLoading(true);
    const r = await getTickets();
    if (r.success && r.data) setTickets(r.data as Ticket[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const r = await createTicket({
      subject: createForm.subject,
      description: createForm.description,
      priority: createForm.priority,
      companyName: createForm.companyName || undefined,
      userName: createForm.userName || undefined,
      userPhone: createForm.userPhone || undefined,
    });
    if (r.success) {
      setIsCreateOpen(false);
      setCreateForm({ subject: "", description: "", priority: "MEDIUM", companyName: "", userName: "", userPhone: "" });
      loadData();
      showToast("Tiket yaratildi!");
    }
    setFormLoading(false);
  };

  const handleStatusChange = async (ticketId: string, newStatus: Ticket["status"]) => {
    const r = await updateTicketStatus(ticketId, newStatus);
    if (r.success) { loadData(); showToast("Status yangilandi"); }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setFormLoading(true);
    const r = await replyToTicket(selectedTicket.id, replyText);
    if (r.success) { setReplyText(""); loadData(); showToast("Javob yuborildi"); }
    setFormLoading(false);
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Tiketni o'chirmoqchimisiz?")) return;
    const r = await deleteTicket(ticketId);
    if (r.success) { setSelectedTicket(null); loadData(); showToast("O'chirildi"); }
  };

  const filtered = tickets.filter((t) => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.companyName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = { OPEN: "Ochiq", IN_PROGRESS: "Jarayonda", RESOLVED: "Hal qilindi", CLOSED: "Yopilgan" };
    return labels[s] || s;
  };

  const getStatusVariant = (s: string): "warning" | "default" | "success" | "secondary" => {
    const map: Record<string, "warning" | "default" | "success" | "secondary"> = { OPEN: "warning", IN_PROGRESS: "default", RESOLVED: "success", CLOSED: "secondary" };
    return map[s] || "secondary";
  };

  const getPriorityIcon = (p: string) => {
    const icons: Record<string, string> = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", CRITICAL: "🔴" };
    return icons[p] || "⚪";
  };

  const openCount = tickets.filter((t) => t.status === "OPEN").length;

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 shadow-lg animate-in">
          <p className="text-sm font-medium">✅ {toast}</p>
        </div>
      )}

      <PageHeader
        title="Yordam Tiketi"
        description={`${tickets.length} ta tiket${openCount > 0 ? ` · ${openCount} ta ochiq` : ""}`}
        action={<Button onClick={() => setIsCreateOpen(true)}>+ Yangi Tiket</Button>}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Qidirish..." className="max-w-xs" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((f) => (
            <button key={f} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${filter === f ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`} onClick={() => setFilter(f)}>
              {f === "ALL" ? "Barchasi" : getStatusLabel(f)}
              {f === "OPEN" && openCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">{openCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-4xl mb-3">🎫</p>
          <p className="text-gray-500 dark:text-gray-400">Tiket topilmadi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{getPriorityIcon(ticket.priority)}</span>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {ticket.companyName && <span>🏢 {ticket.companyName}</span>}
                    {ticket.userName && <span>👤 {ticket.userName}</span>}
                    <span>📅 {new Date(ticket.createdAt).toLocaleDateString("uz-UZ")}</span>
                    {ticket.replies.length > 0 && <span>💬 {ticket.replies.length}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(ticket.status)}>{getStatusLabel(ticket.status)}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Yangi Tiket">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mavzu *</label>
            <Input value={createForm.subject} onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })} required placeholder="Muammo mavzusi" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tavsif *</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              required
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              placeholder="Muammo haqida batafsil..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioritet</label>
              <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                <option value="LOW">Past</option>
                <option value="MEDIUM">O'rta</option>
                <option value="HIGH">Yuqori</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kompaniya</label>
              <Input value={createForm.companyName} onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })} placeholder="Kompaniya nomi" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Murojatchi</label>
              <Input value={createForm.userName} onChange={(e) => setCreateForm({ ...createForm, userName: e.target.value })} placeholder="Ism" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telefon</label>
              <Input value={createForm.userPhone} onChange={(e) => setCreateForm({ ...createForm, userPhone: e.target.value })} placeholder="+998..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Yuklanmoqda..." : "Yaratish"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={selectedTicket?.subject || ""}>
        {selectedTicket && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
              <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTicket.description}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <Badge variant={getStatusVariant(selectedTicket.status)}>{getStatusLabel(selectedTicket.status)}</Badge>
                <span>{getPriorityIcon(selectedTicket.priority)} {selectedTicket.priority}</span>
                {selectedTicket.companyName && <span>🏢 {selectedTicket.companyName}</span>}
                {selectedTicket.userName && <span>👤 {selectedTicket.userName}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status:</span>
              {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedTicket.id, s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedTicket.status === s ? "bg-primary-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}
                >
                  {getStatusLabel(s)}
                </button>
              ))}
            </div>

            {selectedTicket.replies.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Yozishmalar:</p>
                {selectedTicket.replies.map((reply) => (
                  <div key={reply.id} className={`p-3 rounded-xl text-sm ${reply.isAdmin ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 ml-4" : "bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 mr-4"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{reply.authorName}</span>
                      <span className="text-[10px] text-gray-400">{new Date(reply.createdAt).toLocaleString("uz-UZ")}</span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Javob yozing..."
                onKeyDown={(e) => e.key === "Enter" && handleReply()}
              />
              <Button onClick={handleReply} disabled={formLoading || !replyText.trim()} size="sm">Yuborish</Button>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedTicket.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️ O'chirish</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
