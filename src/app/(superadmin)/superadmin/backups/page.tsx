"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getBackups, createManualBackup, restoreBackup, deleteBackup, getBackupStats } from "@/actions/superadmin-backup-actions";

const STATUS_META: Record<string, { label: string; variant: any; icon: string }> = {
  COMPLETED:   { label: "Muvaffaqiyatli", variant: "success",     icon: "✅" },
  IN_PROGRESS: { label: "Jarayonda",      variant: "warning",     icon: "⏳" },
  PENDING:     { label: "Kutilmoqda",     variant: "secondary",   icon: "🕐" },
  FAILED:      { label: "Xato",           variant: "destructive", icon: "❌" },
};

const TYPE_META: Record<string, { label: string; icon: string }> = {
  MANUAL:    { label: "Qo'lda",    icon: "🖐️" },
  AUTO:      { label: "Avtomatik", icon: "🤖" },
  SCHEDULED: { label: "Rejali",   icon: "⏰" },
};

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const [r, s] = await Promise.all([getBackups(), getBackupStats()]);
    if (r.success && r.data) setBackups(r.data as any[]);
    if (s.success && s.data) setStats(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    showToast("Backup yaratilmoqda...");
    const r = await createManualBackup();
    if (r.success) { load(); showToast("Backup muvaffaqiyatli yaratildi! 💾"); }
    else showToast((r as any).error, "error");
    setCreating(false);
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`"${name}" backup'ini tiklashni tasdiqlaysizmi?`)) return;
    const r = await restoreBackup(id);
    if (r.success) showToast("Tiklash jarayoni boshlandi");
    else showToast((r as any).error, "error");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu backup'ni o'chirasizmi?")) return;
    const r = await deleteBackup(id);
    if (r.success) { load(); showToast("O'chirildi"); }
    else showToast((r as any).error, "error");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <PageHeader
        title="Backup"
        description="Ma'lumotlar zaxira nusxalari"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load}>🔄</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "⏳ Yaratilmoqda..." : "💾 Backup Yaratish"}
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Jami",          value: stats.total,        icon: "📦", color: "text-gray-900 dark:text-white" },
            { label: "Muvaffaqiyatli",value: stats.completed,    icon: "✅", color: "text-green-600" },
            { label: "Xatolar",       value: stats.failed,       icon: "❌", color: "text-red-500" },
            { label: "Umumiy hajm",   value: `${stats.totalSizeMB} MB`, icon: "💾", color: "text-blue-600" },
            { label: "So'nggi backup", value: stats.lastBackupAt ? new Date(stats.lastBackupAt).toLocaleDateString("uz-UZ") : "Yo'q", icon: "🕐", color: "text-gray-700 dark:text-gray-300" },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Auto backup config */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl border border-primary-100 dark:border-primary-800 p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">🤖 Avtomatik Backup</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Har kecha 02:00 da avtomatik backup yaratiladi</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-700 dark:text-green-300 font-medium">Yoqilgan</span>
            </div>
            <Button variant="outline" size="sm">⚙️ Sozlash</Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : backups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
          <p className="text-4xl mb-3">💾</p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Hali backup mavjud emas</p>
          <Button onClick={handleCreate}>💾 Birinchi backupni yaratish</Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Nomi</div>
            <div className="col-span-1">Tur</div>
            <div className="col-span-2">Hajm</div>
            <div className="col-span-2">Yaratilgan</div>
            <div className="col-span-1">Holat</div>
            <div className="col-span-2 text-right">Amallar</div>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {backups.map(b => {
              const sMeta = STATUS_META[b.status] || STATUS_META.PENDING;
              const tMeta = TYPE_META[b.type] || TYPE_META.MANUAL;
              return (
                <div key={b.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors items-center">
                  <div className="lg:col-span-4">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
                    {b.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{b.notes}</p>}
                  </div>
                  <div className="lg:col-span-1">
                    <span className="text-sm" title={tMeta.label}>{tMeta.icon}</span>
                  </div>
                  <div className="lg:col-span-2 text-sm text-gray-600 dark:text-gray-400">
                    {b.sizeMB ? `${b.sizeMB} MB` : "—"}
                  </div>
                  <div className="lg:col-span-2 text-xs text-gray-500 dark:text-gray-400">{formatDate(b.createdAt)}</div>
                  <div className="lg:col-span-1">
                    <Badge variant={sMeta.variant}>{sMeta.icon} {sMeta.label}</Badge>
                  </div>
                  <div className="lg:col-span-2 flex items-center justify-end gap-1">
                    {b.status === "COMPLETED" && (
                      <Button variant="ghost" size="sm" onClick={() => handleRestore(b.id, b.name)} title="Tiklash" className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">🔁</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} title="O'chirish" className="text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">🗑️</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
