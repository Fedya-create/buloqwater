"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getMonitoringData } from "@/actions/superadmin-monitoring-actions";

const TABLES = [
  { name: "companies",       icon: "🏢", desc: "Multi-tenant kompaniyalar" },
  { name: "users",           icon: "👥", desc: "Barcha foydalanuvchilar" },
  { name: "orders",          icon: "📦", desc: "Buyurtmalar" },
  { name: "order_items",     icon: "🛍️", desc: "Buyurtma tarkibi" },
  { name: "customers",       icon: "🧑‍💼", desc: "Mijozlar" },
  { name: "products",        icon: "🎯", desc: "Mahsulotlar" },
  { name: "subscriptions",   icon: "💳", desc: "Eski obunalar" },
  { name: "company_subscriptions", icon: "📅", desc: "Yangi obunalar" },
  { name: "company_payments", icon: "💰", desc: "To'lovlar" },
  { name: "activity_logs",   icon: "📋", desc: "Faoliyat jurnali" },
  { name: "audit_logs",      icon: "🔍", desc: "Audit jurnali" },
  { name: "system_logs",     icon: "⚙️", desc: "Tizim xatolari" },
  { name: "notifications",   icon: "🔔", desc: "Bildirishnomalar" },
  { name: "backups",         icon: "💾", desc: "Backup tarixi" },
  { name: "plans",           icon: "📦", desc: "Tarif rejalari" },
  { name: "permissions",     icon: "🔐", desc: "Ruxsatlar" },
  { name: "role_permissions",icon: "🛡️", desc: "Rol-ruxsat" },
  { name: "session_logs",    icon: "🔑", desc: "Sessiya tarixi" },
  { name: "global_settings", icon: "⚙️", desc: "Global sozlamalar" },
  { name: "support_tickets", icon: "🎫", desc: "Tiketlar" },
  { name: "applications",    icon: "📝", desc: "Zayavkalar" },
  { name: "messages",        icon: "✉️", desc: "Xabarlar" },
];

const CRON_JOBS = [
  { name: "Daily Backup",        schedule: "0 2 * * *",   status: "active", lastRun: "02:00", icon: "💾" },
  { name: "Subscription Check",  schedule: "0 9 * * *",   status: "active", lastRun: "09:00", icon: "📅" },
  { name: "Log Cleanup (30d)",   schedule: "0 3 * * 0",   status: "active", lastRun: "Yakshanba 03:00", icon: "🧹" },
  { name: "Analytics Refresh",   schedule: "*/30 * * * *",status: "active", lastRun: "30 daqiqa oldin", icon: "📊" },
];

const ENV_VARS = [
  { key: "DATABASE_URL",       status: "set", desc: "PostgreSQL ulanish URL" },
  { key: "NEXTAUTH_SECRET",    status: "set", desc: "NextAuth JWT kaliti" },
  { key: "NEXTAUTH_URL",       status: "set", desc: "App URL" },
  { key: "NODE_ENV",           status: "set", desc: "Muhit: production/development" },
];

export default function DeveloperPage() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"schema" | "env" | "cron" | "queue">("schema");

  useEffect(() => {
    getMonitoringData().then(r => { if (r.success) setData(r.data); });
  }, []);

  return (
    <div className="relative">
      <PageHeader title="🛠 Dev Tools" description="Faqat Super Admin — Database, Cron, Muhit o'zgaruvchilari" />

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">⚠️ Diqqat! Bu sahifa faqat ishlab chiquvchilar uchun. Noto'g'ri amalni tizim ishdan chiqishi mumkin.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { key: "schema", label: "🗄️ DB Tables" },
          { key: "env",    label: "🔧 Env Variables" },
          { key: "cron",   label: "⏰ Cron Jobs" },
          { key: "queue",  label: "📬 Queue" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.key ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DB Tables */}
      {tab === "schema" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{TABLES.length} ta jadval · PostgreSQL</p>
            {data && <p className="text-sm text-gray-500">Jami: <strong>{data.database.totalRecords.toLocaleString()}</strong> yozuv</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TABLES.map(t => (
              <div key={t.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3 hover:border-primary-200 dark:hover:border-primary-700 transition-colors">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono font-bold text-gray-900 dark:text-white">{t.name}</code>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Env Variables */}
      {tab === "env" && (
        <div className="space-y-3">
          {ENV_VARS.map(e => (
            <div key={e.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full ${e.status === "set" ? "bg-green-500" : "bg-red-500"}`} />
              <div className="flex-1">
                <code className="text-sm font-mono font-bold text-gray-900 dark:text-white">{e.key}</code>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.desc}</p>
              </div>
              <Badge variant={e.status === "set" ? "success" : "destructive"}>
                {e.status === "set" ? "✅ O'rnatilgan" : "❌ Yo'q"}
              </Badge>
            </div>
          ))}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-4 mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">💡 Muhit o'zgaruvchilari Vercel/server muhitida `.env` faylida saqlanadi. Bu yerda faqat holati ko'rsatiladi.</p>
          </div>
        </div>
      )}

      {/* Cron Jobs */}
      {tab === "cron" && (
        <div className="space-y-3">
          {CRON_JOBS.map((job, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <span className="text-2xl">{job.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{job.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="text-xs text-gray-400 font-mono">{job.schedule}</code>
                  <span className="text-xs text-gray-400">· So'nggi: {job.lastRun}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Faol</span>
                </div>
                <Button variant="ghost" size="sm" title="Hozir ishlatish">▶️</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Queue */}
      {tab === "queue" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Redis", icon: "🔴", status: "Ulanmagan (local)", color: "text-red-500" },
              { label: "Background Jobs", icon: "⚙️", status: "0 ta faol", color: "text-gray-600 dark:text-gray-400" },
              { label: "Cache", icon: "⚡", status: "In-memory (Next.js)", color: "text-blue-600" },
            ].map((q, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 text-center">
                <p className="text-3xl mb-2">{q.icon}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{q.label}</p>
                <p className={`text-xs mt-1 ${q.color}`}>{q.status}</p>
                <Button variant="outline" size="sm" className="mt-3">Tozalash</Button>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">💡 Redis va real-time queue uchun BullMQ/Redis integratsiyasini qo'shish kerak. Hozirda in-memory yechim ishlatilmoqda.</p>
          </div>
        </div>
      )}
    </div>
  );
}
