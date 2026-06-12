"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency, formatDateOnly, formatPhone, cn } from "@/lib/utils";
import {
  createCompany, getCompanies, getCompaniesOverview, getCompanyLogs,
  getCompanyStats, toggleCompanyStatus, updateCompany, extendSubscription,
  bulkCompanyAction, cloneCompany,
} from "@/actions/company-actions";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface Company {
  id: string; name: string; subdomain: string; status: "ACTIVE" | "SUSPENDED";
  phone: string | null; maxCustomers: number; maxUsers: number; createdAt: string;
  director: { id: string; name: string; phone: string } | null;
  _count: { users: number; customers: number; orders: number };
  subscription: { endDate: string; isPaid: boolean; amount: number } | null;
  plan: "free" | "trial" | "business" | "enterprise";
  monthlyRevenue: number; totalRevenue: number;
  lastOrderAt: string | null; lastLoginAt: string | null;
}

interface Overview {
  totalCompanies: number; activeCompanies: number; suspendedCompanies: number;
  expiringCompanies: number; monthlyRevenue: number; activeLastWeek: number;
  newThisMonth: number; plans: { trial: number; free: number; business: number; enterprise: number };
}

type ViewMode = "card" | "table";
type FilterType = "ALL" | "ACTIVE" | "SUSPENDED" | "TRIAL" | "FREE" | "BUSINESS" | "ENTERPRISE" | "EXPIRING";
const ITEMS_PER_PAGE = 12;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const PLAN_META: Record<string, { label: string; icon: string; cls: string }> = {
  free:       { label: "Free",       icon: "⚪", cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" },
  trial:      { label: "Trial",      icon: "🟡", cls: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  business:   { label: "Business",   icon: "🟢", cls: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  enterprise: { label: "Enterprise", icon: "👑", cls: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
};

function getDaysLeft(sub: Company["subscription"]) {
  if (!sub) return null;
  return Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000);
}

function getSubStatus(sub: Company["subscription"], daysLeft: number | null) {
  if (!sub || daysLeft === null) return { label: "Obuna yo'q", cls: "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400", icon: "⚪" };
  if (daysLeft <= 0) return { label: "Muddati tugagan", cls: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300", icon: "🔴" };
  if (daysLeft <= 7) return { label: `${daysLeft} kun qoldi`, cls: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300", icon: "⚠️" };
  if (daysLeft <= 30) return { label: `${daysLeft} kun qoldi`, cls: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300", icon: "🟡" };
  return { label: "Aktiv", cls: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300", icon: "✅" };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Noma'lum";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} soat oldin`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} kun oldin`;
  return formatDateOnly(iso);
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function CompaniesPage() {
  // ── State ────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [cloneSource, setCloneSource] = useState<Company | null>(null);
  const [subscriptionCompany, setSubscriptionCompany] = useState<Company | null>(null);
  const [settingsCompany, setSettingsCompany] = useState<Company | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Company | null>(null);
  const [logsCompany, setLogsCompany] = useState<Company | null>(null);
  const [statsCompany, setStatsCompany] = useState<Company | null>(null);
  const [bulkAction, setBulkAction] = useState<"activate" | "suspend" | "delete" | null>(null);

  // Logs/Stats data
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState({ companyName: "", subdomain: "", directorName: "", directorPhone: "", directorPassword: "", plan: "trial" });
  const [editForm, setEditForm] = useState({ name: "", phone: "" });
  const [cloneForm, setCloneForm] = useState({ newName: "", newSubdomain: "", directorPhone: "", directorPassword: "" });
  const [subForm, setSubForm] = useState({ months: "1", amount: "" });
  const [settingsForm, setSettingsForm] = useState({ maxCustomers: "500", maxUsers: "20" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Helpers ──────────────────────────────────────────────
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [cRes, oRes] = await Promise.all([getCompanies(), getCompaniesOverview()]);
    if (cRes.success && cRes.data) setCompanies(cRes.data as Company[]);
    if (oRes.success && oRes.data) setOverview(oRes.data as Overview);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { setCurrentPage(1); setSelected(new Set()); }, [search, filter]);

  // ── Filtered list ─────────────────────────────────────────
  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.subdomain.includes(q) && !(c.director?.name.toLowerCase().includes(q))) return false;
      }
      if (filter === "ACTIVE") return c.status === "ACTIVE";
      if (filter === "SUSPENDED") return c.status === "SUSPENDED";
      if (filter === "TRIAL") return c.plan === "trial";
      if (filter === "FREE") return c.plan === "free";
      if (filter === "BUSINESS") return c.plan === "business";
      if (filter === "ENTERPRISE") return c.plan === "enterprise";
      if (filter === "EXPIRING") {
        const d = getDaysLeft(c.subscription);
        return d !== null && d >= 0 && d <= 7;
      }
      return true;
    });
  }, [companies, search, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Selection helpers ─────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((c) => c.id)));
  };

  // ── AI Tavsiyalar (client-side heuristics) ────────────────
  const aiSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    const expiring = companies.filter((c) => { const d = getDaysLeft(c.subscription); return d !== null && d >= 0 && d <= 7; });
    if (expiring.length > 0) suggestions.push(`⚠️ ${expiring.length} ta kompaniya obunasi 7 kun ichida tugaydi: ${expiring.slice(0, 2).map((c) => c.name).join(", ")}${expiring.length > 2 ? ` va yana ${expiring.length - 2} ta` : ""}`);
    const inactive = companies.filter((c) => { if (!c.lastOrderAt && !c.lastLoginAt) return true; const last = c.lastOrderAt || c.lastLoginAt; return last && (Date.now() - new Date(last).getTime()) > 7 * 86400000; });
    if (inactive.length > 0) suggestions.push(`😴 ${inactive.length} ta kompaniya 7 kundan beri faoliyat ko'rsatmayapti`);
    const topGrowing = [...companies].filter((c) => c.monthlyRevenue > 0).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 1);
    if (topGrowing.length) suggestions.push(`🚀 "${topGrowing[0].name}" bu oy eng yuqori tushum: ${formatCurrency(topGrowing[0].monthlyRevenue)}`);
    const freePlan = companies.filter((c) => c.plan === "free" && c.status === "ACTIVE");
    if (freePlan.length > 0) suggestions.push(`💡 ${freePlan.length} ta faol kompaniya hali Free tarifda — konvertatsiya imkoniyati bor`);
    return suggestions;
  }, [companies]);

  // ── Form handlers ─────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const r = await createCompany({
      companyName: createForm.companyName,
      subdomain: createForm.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      directorName: createForm.directorName,
      directorPhone: createForm.directorPhone.startsWith("+") ? createForm.directorPhone : `+998${createForm.directorPhone}`,
      directorPassword: createForm.directorPassword,
      plan: createForm.plan,
    });
    if (r.success) {
      setIsCreateOpen(false);
      setCreateForm({ companyName: "", subdomain: "", directorName: "", directorPhone: "", directorPassword: "", plan: "trial" });
      loadAll(); showToast("✅ Kompaniya yaratildi!");
    } else setFormError(r.error);
    setFormLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editCompany) return; setFormLoading(true); setFormError("");
    const r = await updateCompany(editCompany.id, { name: editForm.name, phone: editForm.phone });
    if (r.success) { setEditCompany(null); loadAll(); showToast("Yangilandi!"); } else setFormError(r.error);
    setFormLoading(false);
  };

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault(); if (!cloneSource) return; setFormLoading(true); setFormError("");
    const r = await cloneCompany(
      cloneSource.id,
      cloneForm.newName,
      cloneForm.newSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      cloneForm.directorPhone.startsWith("+") ? cloneForm.directorPhone : `+998${cloneForm.directorPhone}`,
      cloneForm.directorPassword,
    );
    if (r.success) { setCloneSource(null); loadAll(); showToast("📋 Kompaniya klonlandi!"); } else setFormError(r.error);
    setFormLoading(false);
  };

  const handleExtendSub = async (e: React.FormEvent) => {
    e.preventDefault(); if (!subscriptionCompany) return; setFormLoading(true); setFormError("");
    const r = await extendSubscription(subscriptionCompany.id, parseInt(subForm.months), parseFloat(subForm.amount || "0"));
    if (r.success) { setSubscriptionCompany(null); loadAll(); showToast("Obuna uzaytirildi!"); } else setFormError(r.error);
    setFormLoading(false);
  };

  const handleSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!settingsCompany) return; setFormLoading(true);
    const r = await updateCompany(settingsCompany.id, { maxCustomers: parseInt(settingsForm.maxCustomers), maxUsers: parseInt(settingsForm.maxUsers) });
    if (r.success) { setSettingsCompany(null); loadAll(); showToast("Sozlamalar saqlandi!"); }
    setFormLoading(false);
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return; setFormLoading(true);
    await toggleCompanyStatus(confirmToggle.id);
    loadAll();
    showToast(confirmToggle.status === "ACTIVE" ? "⏸️ Muzlatildi" : "▶️ Faollashtirildi");
    setConfirmToggle(null); setFormLoading(false);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || !selected.size) return; setFormLoading(true);
    const r = await bulkCompanyAction(Array.from(selected), bulkAction);
    if (r.success) { showToast(r.message || "Bajarildi"); setSelected(new Set()); loadAll(); }
    else showToast(r.error, "error");
    setBulkAction(null); setFormLoading(false);
  };

  const openLogs = async (c: Company) => {
    setLogsCompany(c); setLogsLoading(true); setLogs([]);
    const r = await getCompanyLogs(c.id);
    if (r.success && r.data) setLogs(r.data);
    setLogsLoading(false);
  };

  const openStats = async (c: Company) => {
    setStatsCompany(c); setStatsLoading(true); setStatsData(null);
    const r = await getCompanyStats(c.id);
    if (r.success && r.data) setStatsData(r.data);
    setStatsLoading(false);
  };

  const handleLoginAs = (c: Company) => {
    window.open(`https://${c.subdomain}.buloqwater.uz`, "_blank");
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="relative space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={cn("fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border animate-in slide-in-from-top-2 duration-300 text-sm font-medium",
          toast.type === "success" ? "bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
            : "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
        )}>
          {toast.message}
        </div>
      )}

      {/* ── Page Header ── */}
      <PageHeader
        title="Kompaniyalar"
        description={`Jami ${companies.length} ta tenant`}
        action={
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button onClick={() => setViewMode("card")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "card" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}>⊞ Karta</button>
              <button onClick={() => setViewMode("table")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "table" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400")}>☰ Jadval</button>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>+ Yangi Kompaniya</Button>
          </div>
        }
      />

      {/* ── Overview Stats Panel ── */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Jami", value: overview.totalCompanies, icon: "🏢", cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800" },
            { label: "Faol", value: overview.activeCompanies, icon: "🟢", cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800" },
            { label: "Muzlatilgan", value: overview.suspendedCompanies, icon: "🔴", cls: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800" },
            { label: "Trial", value: overview.plans.trial, icon: "🟡", cls: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-100 dark:border-yellow-800" },
            { label: "Tugayotgan", value: overview.expiringCompanies, icon: "⚠️", cls: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800" },
            { label: "Bu oy yangi", value: overview.newThisMonth, icon: "✨", cls: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800" },
            { label: "Oylik tushum", value: formatCurrency(overview.monthlyRevenue), icon: "💰", cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800", wide: true },
          ].map((s, i) => (
            <div key={i} className={cn("rounded-2xl border p-3 flex flex-col gap-1", s.cls, (s as any).wide ? "sm:col-span-2 lg:col-span-1" : "")}>
              <span className="text-lg">{s.icon}</span>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="text-xs opacity-75 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── AI Tavsiyalar ── */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Tizim tavsiyalari</h3>
          </div>
          <ul className="space-y-1.5">
            {aiSuggestions.map((s, i) => (
              <li key={i} className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Nomi, subdomen yoki direktor..."
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { key: "ALL", label: `Barchasi (${companies.length})` },
            { key: "ACTIVE", label: `🟢 Faol (${companies.filter(c => c.status === "ACTIVE").length})` },
            { key: "SUSPENDED", label: `🔴 Muzlatilgan (${companies.filter(c => c.status === "SUSPENDED").length})` },
            { key: "TRIAL", label: `🟡 Trial` },
            { key: "BUSINESS", label: `🟢 Business` },
            { key: "ENTERPRISE", label: `👑 Enterprise` },
            { key: "FREE", label: `⚪ Free` },
            { key: "EXPIRING", label: `⚠️ Tugayotgan` },
          ] as { key: FilterType; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border",
                filter === f.key
                  ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl px-4 py-3 animate-in slide-in-from-top-1">
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">✅ {selected.size} ta tanlandi</span>
          <div className="flex items-center gap-2 ml-2">
            <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900/20" onClick={() => setBulkAction("activate")}>▶️ Faollashtirish</Button>
            <Button size="sm" variant="outline" className="text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700 dark:hover:bg-orange-900/20" onClick={() => setBulkAction("suspend")}>⏸️ Muzlatish</Button>
            <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20" onClick={() => setBulkAction("delete")}>🗑️ O'chirish</Button>
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">✕ Bekor</button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Kompaniya topilmadi</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Qidiruv yoki filtrni o'zgartiring</p>
        </div>
      ) : viewMode === "card" ? (
        /* ════════════════ CARD VIEW ════════════════ */
        <>
          {/* Select all */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-primary-500 cursor-pointer" />
            <span>Barchasini tanlash ({paginated.length})</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((company) => <CompanyCard key={company.id} company={company} selected={selected.has(company.id)} onSelect={() => toggleSelect(company.id)} onEdit={() => { setEditCompany(company); setEditForm({ name: company.name, phone: company.phone || "" }); setFormError(""); }} onClone={() => { setCloneSource(company); setCloneForm({ newName: `${company.name} (Kopya)`, newSubdomain: `${company.subdomain}-2`, directorPhone: "", directorPassword: "" }); setFormError(""); }} onSub={() => { setSubscriptionCompany(company); setSubForm({ months: "1", amount: "" }); setFormError(""); }} onSettings={() => { setSettingsCompany(company); setSettingsForm({ maxCustomers: company.maxCustomers.toString(), maxUsers: company.maxUsers.toString() }); }} onToggle={() => setConfirmToggle(company)} onLogs={() => openLogs(company)} onStats={() => openStats(company)} onLoginAs={() => handleLoginAs(company)} />)}
          </div>
        </>
      ) : (
        /* ════════════════ TABLE VIEW ════════════════ */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-left w-8"><input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded accent-primary-500 cursor-pointer" /></th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Kompaniya</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Tarif</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Obuna</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Oylik</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Stats</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Oxirgi faollik</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {paginated.map((company) => {
                  const daysLeft = getDaysLeft(company.subscription);
                  const subStatus = getSubStatus(company.subscription, daysLeft);
                  const plan = PLAN_META[company.plan];
                  return (
                    <tr key={company.id} className={cn("hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors", selected.has(company.id) ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "")}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selected.has(company.id)} onChange={() => toggleSelect(company.id)} className="w-4 h-4 rounded accent-primary-500 cursor-pointer" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0", company.status === "ACTIVE" ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{company.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{company.subdomain}.buloqwater.uz</p>
                          </div>
                          {company.status === "SUSPENDED" && <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md">Muzlatilgan</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", plan.cls)}>{plan.icon} {plan.label}</span></td>
                      <td className="px-4 py-3"><span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full", subStatus.cls)}>{subStatus.icon} {subStatus.label}</span></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white text-xs">{company.monthlyRevenue > 0 ? formatCurrency(company.monthlyRevenue) : <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span title="Mijozlar">👥{company._count.customers}</span>
                          <span title="Buyurtmalar">📦{company._count.orders}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{timeAgo(company.lastOrderAt || company.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Tip text="Kirish"><button onClick={() => handleLoginAs(company)} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-colors text-base">🔑</button></Tip>
                          <Tip text="Batafsil"><button onClick={() => openStats(company)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors text-base">👁️</button></Tip>
                          <Tip text="Tahrirlash"><button onClick={() => { setEditCompany(company); setEditForm({ name: company.name, phone: company.phone || "" }); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors text-base">✏️</button></Tip>
                          <Tip text={company.status === "ACTIVE" ? "Muzlatish" : "Faollashtirish"}><button onClick={() => setConfirmToggle(company)} className={cn("p-1.5 rounded-lg transition-colors text-base", company.status === "ACTIVE" ? "hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500" : "hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500")}>{company.status === "ACTIVE" ? "⏸️" : "▶️"}</button></Tip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>← Oldingi</Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={cn("w-8 h-8 rounded-lg text-xs font-medium transition-all", currentPage === page ? "bg-primary-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700")}>{page}</button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Keyingi →</Button>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{filtered.length} ta / {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════ */}

      {/* ── Confirm Toggle ── */}
      <Modal open={!!confirmToggle} onClose={() => setConfirmToggle(null)} title={confirmToggle?.status === "ACTIVE" ? "⚠️ Kompaniyani muzlatish" : "✅ Kompaniyani faollashtirish"}>
        {confirmToggle && (
          <div className="space-y-4">
            <div className={cn("p-4 rounded-xl border text-sm", confirmToggle.status === "ACTIVE" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200")}>
              {confirmToggle.status === "ACTIVE" ? (
                <><p className="font-semibold mb-2">"{confirmToggle.name}" muzlatiladi:</p><ul className="space-y-1 list-disc pl-4 text-xs opacity-90"><li>Foydalanuvchilar tizimga kira olmaydi</li><li>Buyurtmalar to'xtatiladi</li><li>Mijozlar ilovadan foydalana olmaydi</li></ul></>
              ) : (
                <p>"{confirmToggle.name}" qayta faollashtiriladi va barcha foydalanuvchilari kirishni tiklaydi.</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmToggle(null)}>Bekor</Button>
              <Button variant={confirmToggle.status === "ACTIVE" ? "destructive" : "success"} onClick={handleToggleStatus} disabled={formLoading}>
                {formLoading ? "..." : confirmToggle.status === "ACTIVE" ? "⏸️ Muzlatish" : "▶️ Faollashtirish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Bulk Confirm ── */}
      <Modal open={!!bulkAction} onClose={() => setBulkAction(null)} title="Bulk amal tasdiqlash">
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {selected.size} ta kompaniyaga <strong>{bulkAction === "activate" ? "faollashtirish" : bulkAction === "suspend" ? "muzlatish" : "o'chirish"}</strong> amalini bajarmoqchimisiz?
          </p>
          {bulkAction === "delete" && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">⚠️ Bu amal qaytarib bo'lmaydi! Barcha ma'lumotlar o'chib ketadi.</div>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBulkAction(null)}>Bekor</Button>
            <Button variant={bulkAction === "delete" ? "destructive" : bulkAction === "activate" ? "success" : "outline"} onClick={handleBulkAction} disabled={formLoading}>
              {formLoading ? "..." : "Tasdiqlash"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Create ── */}
      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="✨ Yangi Kompaniya">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <ErrorBox>{formError}</ErrorBox>}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Kompaniya nomi" colSpan><Input value={createForm.companyName} onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })} placeholder="Shifo Suv MChJ" required /></FormField>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Subdomen</label>
              <div className="flex items-center gap-1.5"><Input value={createForm.subdomain} onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="shifo" required /><span className="text-xs text-gray-400 whitespace-nowrap">.buloqwater.uz</span></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tarif rejasi</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(PLAN_META).map(([key, meta]) => (
                <button key={key} type="button" onClick={() => setCreateForm({ ...createForm, plan: key })} className={cn("py-2.5 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1", createForm.plan === key ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400")}>
                  <span className="text-lg">{meta.icon}</span>{meta.label}
                </button>
              ))}
            </div>
          </div>
          <hr className="border-gray-100 dark:border-gray-700" />
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Direktor</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ismi"><Input value={createForm.directorName} onChange={(e) => setCreateForm({ ...createForm, directorName: e.target.value })} required /></FormField>
            <FormField label="Telefon"><Input value={createForm.directorPhone} onChange={(e) => setCreateForm({ ...createForm, directorPhone: e.target.value })} placeholder="901234567" required /></FormField>
            <FormField label="Parol" colSpan><Input type="password" value={createForm.directorPassword} onChange={(e) => setCreateForm({ ...createForm, directorPassword: e.target.value })} required minLength={6} /></FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "Yaratilmoqda..." : "✅ Yaratish"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit ── */}
      <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title={`✏️ Tahrirlash: ${editCompany?.name}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <ErrorBox>{formError}</ErrorBox>}
          <FormField label="Nomi"><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></FormField>
          <FormField label="Telefon"><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></FormField>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setEditCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Saqlash"}</Button></div>
        </form>
      </Modal>

      {/* ── Clone ── */}
      <Modal open={!!cloneSource} onClose={() => setCloneSource(null)} title={`📋 Klonlash: ${cloneSource?.name}`}>
        <form onSubmit={handleClone} className="space-y-4">
          {formError && <ErrorBox>{formError}</ErrorBox>}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-xs text-blue-700 dark:text-blue-300">Mahsulotlar va sozlamalar ko'chiriladi. Mijozlar va buyurtmalar ko'chirilmaydi.</div>
          <FormField label="Yangi nom"><Input value={cloneForm.newName} onChange={(e) => setCloneForm({ ...cloneForm, newName: e.target.value })} required /></FormField>
          <div><label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Subdomen</label><div className="flex items-center gap-1.5"><Input value={cloneForm.newSubdomain} onChange={(e) => setCloneForm({ ...cloneForm, newSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} required /><span className="text-xs text-gray-400 whitespace-nowrap">.buloqwater.uz</span></div></div>
          <FormField label="Direktor tel."><Input value={cloneForm.directorPhone} onChange={(e) => setCloneForm({ ...cloneForm, directorPhone: e.target.value })} placeholder="901234567" required /></FormField>
          <FormField label="Direktor paroli"><Input type="password" value={cloneForm.directorPassword} onChange={(e) => setCloneForm({ ...cloneForm, directorPassword: e.target.value })} required minLength={6} /></FormField>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setCloneSource(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "Klonlanmoqda..." : "📋 Klonlash"}</Button></div>
        </form>
      </Modal>

      {/* ── Subscription ── */}
      <Modal open={!!subscriptionCompany} onClose={() => setSubscriptionCompany(null)} title={`📅 Obuna: ${subscriptionCompany?.name}`}>
        <form onSubmit={handleExtendSub} className="space-y-4">
          {formError && <ErrorBox>{formError}</ErrorBox>}
          {subscriptionCompany?.subscription && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">Hozirgi muddat: <strong>{formatDateOnly(subscriptionCompany.subscription.endDate)}</strong></p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Jami to'lov: {formatCurrency(subscriptionCompany.subscription.amount)}</p>
            </div>
          )}
          <div><label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Necha oy?</label><div className="grid grid-cols-4 gap-2">{["1","3","6","12"].map((m) => (<button key={m} type="button" className={cn("py-3 rounded-xl text-sm font-semibold border-2 transition-all", subForm.months === m ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400")} onClick={() => setSubForm({ ...subForm, months: m })}>{m} oy</button>))}</div></div>
          <FormField label="To'lov (so'm)"><Input type="number" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} placeholder="200000" /></FormField>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setSubscriptionCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Qo'shish"}</Button></div>
        </form>
      </Modal>

      {/* ── Settings ── */}
      <Modal open={!!settingsCompany} onClose={() => setSettingsCompany(null)} title={`⚙️ Limitlar: ${settingsCompany?.name}`}>
        <form onSubmit={handleSettings} className="space-y-4">
          <FormField label="Maks. mijozlar"><Input type="number" value={settingsForm.maxCustomers} onChange={(e) => setSettingsForm({ ...settingsForm, maxCustomers: e.target.value })} min={1} /></FormField>
          <FormField label="Maks. xodimlar"><Input type="number" value={settingsForm.maxUsers} onChange={(e) => setSettingsForm({ ...settingsForm, maxUsers: e.target.value })} min={1} /></FormField>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" onClick={() => setSettingsCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Saqlash"}</Button></div>
        </form>
      </Modal>

      {/* ── Logs ── */}
      <Modal open={!!logsCompany} onClose={() => setLogsCompany(null)} title={`📜 Loglar: ${logsCompany?.name}`}>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logsLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-7 w-7 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Log topilmadi</p>
          ) : logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
              <span className="text-lg shrink-0">{log.action.includes("create") ? "✨" : log.action.includes("suspend") ? "⏸️" : log.action.includes("activ") ? "▶️" : log.action.includes("login") ? "🔑" : log.action.includes("sub") ? "📅" : "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{log.description}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDateOnly(log.createdAt)} · {log.action}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Stats Modal ── */}
      <Modal open={!!statsCompany} onClose={() => setStatsCompany(null)} title={`👁️ Batafsil: ${statsCompany?.name}`}>
        {statsLoading ? (
          <div className="flex justify-center py-10"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : statsData ? (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xl">{statsData.company.name.charAt(0)}</div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{statsData.company.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{statsData.company.subdomain}.buloqwater.uz</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Ro'yxatdan: {formatDateOnly(statsData.company.createdAt)}</p>
              </div>
              <div className="ml-auto">
                <Button size="sm" onClick={() => { setStatsCompany(null); handleLoginAs(statsCompany!); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">🔑 Kirish</Button>
              </div>
            </div>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Jami buyurtma", value: statsData.stats.totalOrders, icon: "📦" },
                { label: "Yetkazilgan", value: statsData.stats.deliveredOrders, icon: "✅" },
                { label: "Mijozlar", value: statsData.stats.totalCustomers, icon: "👥" },
                { label: "Oylik tushum", value: formatCurrency(statsData.stats.monthlyRevenue), icon: "💰" },
              ].map((s, i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                  <p className="text-2xl mb-1">{s.icon}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
            {/* Jami tushum */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">💰 Jami tushum</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(statsData.stats.totalRevenue)}</span>
            </div>
            {/* Xodimlar */}
            {statsData.users.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">👤 Xodimlar ({statsData.users.length})</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {statsData.users.map((u: any) => (
                    <div key={u.id} className="flex items-center gap-2 text-sm">
                      <span className={cn("w-2 h-2 rounded-full", u.isActive ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600")} />
                      <span className="font-medium text-gray-900 dark:text-white flex-1">{u.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Oxirgi buyurtmalar */}
            {statsData.recentOrders.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">📦 Oxirgi buyurtmalar</p>
                <div className="space-y-1.5">
                  {statsData.recentOrders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{o.customer.name}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(o.totalAmount)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(o.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Ma'lumot yuklanmadi</p>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPANY CARD
// ─────────────────────────────────────────────────────────────
interface CardProps {
  company: Company; selected: boolean;
  onSelect: () => void; onEdit: () => void; onClone: () => void;
  onSub: () => void; onSettings: () => void; onToggle: () => void;
  onLogs: () => void; onStats: () => void; onLoginAs: () => void;
}

function CompanyCard({ company, selected, onSelect, onEdit, onClone, onSub, onSettings, onToggle, onLogs, onStats, onLoginAs }: CardProps) {
  const daysLeft = getDaysLeft(company.subscription);
  const subStatus = getSubStatus(company.subscription, daysLeft);
  const plan = PLAN_META[company.plan];
  const isTemplate = company.subdomain === "global-templates";
  const isActive = company.status === "ACTIVE";
  const lastActivity = company.lastOrderAt || company.lastLoginAt;
  const isOnline = lastActivity && (Date.now() - new Date(lastActivity).getTime()) < 15 * 60000;

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden group",
      selected ? "ring-2 ring-primary-500 border-primary-200 dark:border-primary-700" : isTemplate ? "border-purple-200 dark:border-purple-800" : !isActive ? "border-red-200 dark:border-red-800 opacity-80" : "border-gray-100 dark:border-gray-700"
    )}>
      {/* ── Top strip: Plan badge ── */}
      <div className={cn("h-1 w-full", company.plan === "enterprise" ? "bg-gradient-to-r from-purple-400 to-pink-400" : company.plan === "business" ? "bg-gradient-to-r from-green-400 to-emerald-400" : company.plan === "trial" ? "bg-gradient-to-r from-yellow-400 to-orange-400" : "bg-gray-200 dark:bg-gray-700")} />

      <div className="p-5 pb-3">
        {/* ── Header row ── */}
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {!isTemplate && (
            <input type="checkbox" checked={selected} onChange={onSelect} className="mt-1 w-4 h-4 rounded accent-primary-500 cursor-pointer shrink-0" />
          )}

          {/* Avatar + Online dot */}
          <div className="relative shrink-0">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg", isTemplate ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : isActive ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")}>
              {company.name.charAt(0)}
            </div>
            {/* Online indicator */}
            <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800", isOnline ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600")} title={isOnline ? "Online" : "Offline"} />
          </div>

          {/* Name + subdomain */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white truncate">{company.name}</p>
            <code className="text-xs text-gray-400 dark:text-gray-500 truncate block">{company.subdomain}.buloqwater.uz</code>
          </div>

          {/* Plan + Status badges */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full", plan.cls)}>
              {plan.icon} {plan.label}
            </span>
            {isTemplate ? (
              <span className="text-[11px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">Shablon</span>
            ) : (
              <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", isActive ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400")}>
                {isActive ? "Faol" : "Muzlatilgan"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pb-4 space-y-3">
        {/* ── Director ── */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-base">👤</span>
          {company.director ? (
            <><span className="font-medium text-gray-800 dark:text-gray-200 truncate">{company.director.name}</span><span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">{formatPhone(company.director.phone)}</span></>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 italic text-xs">Direktor biriktirilmagan</span>
          )}
        </div>

        {/* ── Subscription status ── */}
        {!isTemplate && (
          <div className="flex items-center justify-between">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full", subStatus.cls)}>
              {subStatus.icon} {subStatus.label}
            </span>
            {company.subscription?.isPaid && <span className="text-xs text-gray-400 dark:text-gray-500">✅ To'langan</span>}
          </div>
        )}

        {/* ── Stats chips ── */}
        <div className="flex items-center gap-1.5">
          <Tip text="Xodimlar"><div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">👥 {company._count.users}<span className="font-normal text-blue-400 dark:text-blue-500">/{company.maxUsers}</span></div></Tip>
          <Tip text="Mijozlar"><div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-semibold">🧑‍💼 {company._count.customers}</div></Tip>
          <Tip text="Buyurtmalar"><div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">📦 {company._count.orders}</div></Tip>
        </div>

        {/* ── Revenue ── */}
        {(company.monthlyRevenue > 0 || company.totalRevenue > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">💰 Oylik</p>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(company.monthlyRevenue)}</p>
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-2.5">
              <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">💎 Jami</p>
              <p className="text-sm font-bold text-teal-800 dark:text-teal-200">{formatCurrency(company.totalRevenue)}</p>
            </div>
          </div>
        )}

        {/* ── Last activity ── */}
        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 pt-0.5">
          <span title="Oxirgi buyurtma">📦 {company.lastOrderAt ? timeAgo(company.lastOrderAt) : "Hech qachon"}</span>
          <span title="Ro'yxatga olingan">📅 {formatDateOnly(company.createdAt)}</span>
        </div>
      </div>

      {/* ── Action footer ── */}
      {!isTemplate && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2.5 bg-gray-50/60 dark:bg-gray-700/30 flex items-center justify-between gap-1">
          {/* Left: utility buttons */}
          <div className="flex items-center gap-0.5">
            <Tip text="🔑 Tenantga kirish">
              <button onClick={onLoginAs} className="p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 transition-colors font-semibold text-base">🔑</button>
            </Tip>
            <Tip text="👁️ Batafsil">
              <button onClick={onStats} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors text-base">👁️</button>
            </Tip>
            <Tip text="✏️ Tahrirlash">
              <button onClick={onEdit} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors text-base">✏️</button>
            </Tip>
            <Tip text="📋 Klonlash">
              <button onClick={onClone} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors text-base">📋</button>
            </Tip>
            <Tip text="📅 Obuna">
              <button onClick={onSub} className="p-2 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 transition-colors text-base">📅</button>
            </Tip>
            <Tip text="⚙️ Limitlar">
              <button onClick={onSettings} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors text-base">⚙️</button>
            </Tip>
            <Tip text="📜 Loglar">
              <button onClick={onLogs} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors text-base">📜</button>
            </Tip>
          </div>
          {/* Right: toggle */}
          <button
            onClick={onToggle}
            className={cn("px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
              isActive
                ? "bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : "bg-green-500 border-green-500 text-white hover:bg-green-600"
            )}
          >
            {isActive ? "⏸️ Muzlatish" : "▶️ Faollashtirish"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SMALL UTILITY COMPONENTS
// ─────────────────────────────────────────────────────────────
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{children}</div>;
}

function FormField({ label, children, colSpan }: { label: string; children: React.ReactNode; colSpan?: boolean }) {
  return (
    <div className={colSpan ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
