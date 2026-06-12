"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AuditEntry {
  id: string;
  action: string;
  description: string;
  metadata: string | null;
  createdAt: string;
  userId: string | null;
  companyId: string | null;
  company: { name: string; subdomain: string } | null;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      if (!session?.user) { setLoading(false); return; }

      const response = await fetch("/api/audit-logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
      setLoading(false);
    })();
  }, []);

  const actions = ["ALL", ...new Set(logs.map(l => l.action))];

  const filtered = logs.filter((l) => {
    if (filterAction !== "ALL" && l.action !== filterAction) return false;
    if (search && !l.description.toLowerCase().includes(search.toLowerCase()) && !l.action.includes(search.toLowerCase())) return false;
    return true;
  });

  const getActionColor = (action: string) => {
    if (action.includes("created")) return "success";
    if (action.includes("suspended") || action.includes("deleted")) return "destructive";
    if (action.includes("login")) return "default";
    return "secondary";
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      company_created: "🏢", company_suspended: "⏸️", company_activated: "▶️",
      user_created: "👤", user_login: "🔑", order_delivered: "📦",
      payment_received: "💰", subscription_extended: "📅",
    };
    return icons[action] || "📋";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" description="Tizim faoliyat jurnali" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Qidirish..." className="max-w-xs" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {actions.slice(0, 6).map((a) => (
            <button key={a} onClick={() => setFilterAction(a)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${filterAction === a ? "bg-primary-500 text-white" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}>
              {a === "ALL" ? "Barchasi" : a.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 dark:text-gray-400">Faoliyat topilmadi</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">Icon</div>
            <div className="col-span-2">Harakat</div>
            <div className="col-span-4">Tavsif</div>
            <div className="col-span-2">Kompaniya</div>
            <div className="col-span-3">Vaqt</div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map((log) => (
              <div key={log.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors items-center">
                <div className="col-span-1 text-lg">{getActionIcon(log.action)}</div>
                <div className="col-span-2">
                  <Badge variant={getActionColor(log.action) as any} className="text-[10px]">{log.action.replace(/_/g, " ")}</Badge>
                </div>
                <div className="col-span-4"><p className="text-sm text-gray-800 dark:text-gray-200 truncate">{log.description}</p></div>
                <div className="col-span-2"><span className="text-xs text-primary-500">{log.company?.name || "—"}</span></div>
                <div className="col-span-3"><span className="text-xs text-gray-400 dark:text-gray-500">{new Date(log.createdAt).toLocaleString("uz-UZ")}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
