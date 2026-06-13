import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import Link from "next/link";
import { MonthlyGrowthChart } from "./components/monthly-chart";

async function getDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  const [
    totalCompanies, activeCompanies, suspendedCompanies,
    totalUsers, thisMonthCompanies, lastMonthCompanies,
    todayOrders, monthlyRevenue, totalOrders,
    expiringSoon, topCompanies, recentLogs, monthlyData,
    pendingApplications, openTickets,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.company.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
    prisma.order.count(),
    prisma.subscription.count({ where: { endDate: { lte: new Date(now.getTime() + 7 * 86400000), gte: now } } }),
    prisma.company.findMany({
      take: 5,
      orderBy: { orders: { _count: "desc" } },
      include: {
        _count: { select: { orders: true, customers: true, users: true } },
        subscription: { select: { endDate: true, isPaid: true } },
      },
    }),
    prisma.activityLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    }),
    getMonthlyGrowth(),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const growthPercent =
    lastMonthCompanies > 0
      ? Math.round(((thisMonthCompanies - lastMonthCompanies) / lastMonthCompanies) * 100)
      : thisMonthCompanies > 0 ? 100 : 0;

  return {
    totalCompanies, activeCompanies, suspendedCompanies,
    totalUsers, thisMonthCompanies, growthPercent,
    todayOrders, monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
    totalOrders, expiringSoon,
    topCompanies, recentLogs, monthlyData,
    pendingApplications, openTickets,
  };
}

async function getMonthlyGrowth() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const [count, revenue] = await Promise.all([
      prisma.company.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
    ]);
    months.push({
      month: start.toLocaleDateString("uz-UZ", { month: "short" }),
      companies: count,
      revenue: Math.round((revenue._sum.totalAmount || 0) / 1000),
    });
  }
  return months;
}

function getTimeDiff(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

const ACTION_META: Record<string, { icon: string; color: string }> = {
  company_created:      { icon: "🏢", color: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  company_suspended:    { icon: "⏸️", color: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  company_activated:    { icon: "▶️", color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  user_created:         { icon: "👤", color: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
  subscription_extended:{ icon: "📅", color: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" },
  backup_created:       { icon: "💾", color: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" },
  notification_sent:    { icon: "📢", color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" },
};

export default async function SuperAdminDashboard() {
  const data = await getDashboardData();

  const stats = [
    { title: "Jami Kompaniyalar",   value: data.totalCompanies,  icon: "🏢", desc: `Shu oy: +${data.thisMonthCompanies}`,          trend: data.growthPercent !== 0 ? { value: Math.abs(data.growthPercent), positive: data.growthPercent >= 0 } : undefined, href: "/superadmin/companies" },
    { title: "Faol Kompaniyalar",   value: data.activeCompanies, icon: "✅", desc: `${data.totalCompanies > 0 ? Math.round((data.activeCompanies / data.totalCompanies) * 100) : 0}% faollik`, href: "/superadmin/companies" },
    { title: "Bloklangan",          value: data.suspendedCompanies, icon: "⏸️", desc: data.suspendedCompanies > 0 ? "Diqqat talab" : "Hammasi yaxshi", href: "/superadmin/companies" },
    { title: "Jami Foydalanuvchi",  value: data.totalUsers,      icon: "👥", desc: "Barcha tenantlar",                               href: "/superadmin/users" },
    { title: "Bugungi Buyurtmalar", value: data.todayOrders,     icon: "📦", desc: `Jami: ${data.totalOrders}`,                     href: "/superadmin/companies" },
    { title: "Oylik Daromad",       value: formatCurrency(data.monthlyRevenue), icon: "💰", desc: "Joriy oy, yetkazilgan",          href: "/superadmin/payments" },
    { title: "Obuna Tugayapti",     value: data.expiringSoon,    icon: "⚠️", desc: "7 kun ichida",                                  href: "/superadmin/subscriptions" },
    { title: "Ochiq Tiketlar",      value: data.openTickets + data.pendingApplications, icon: "🎫", desc: `${data.openTickets} tiket · ${data.pendingApplications} zayavka`, href: "/superadmin/tickets" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString("uz-UZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/superadmin/companies">
            <Button size="sm" className="shadow-sm">+ Kompaniya</Button>
          </Link>
          <Link href="/superadmin/notifications">
            <Button variant="outline" size="sm">📢 Xabar</Button>
          </Link>
          <Link href="/superadmin/backups">
            <Button variant="outline" size="sm">💾 Backup</Button>
          </Link>
        </div>
      </div>

      {/* 8 ta stat karta */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Link key={i} href={s.href} className="group">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{s.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 leading-none">{s.value}</p>
                  {s.desc && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{s.desc}</p>}
                  {s.trend && (
                    <span className={`inline-flex items-center gap-0.5 mt-1 text-xs font-medium ${s.trend.positive ? "text-green-600" : "text-red-500"}`}>
                      {s.trend.positive ? "↑" : "↓"} {s.trend.value}%
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center text-xl shrink-0 ml-2 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Asosiy grafik */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Oylik O'sish Dinamikasi</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Oxirgi 6 oy · Kompaniyalar va daromad</p>
          </div>
          <Link href="/superadmin/analytics">
            <Button variant="ghost" size="sm" className="text-xs">Batafsil →</Button>
          </Link>
        </div>
        <MonthlyGrowthChart data={data.monthlyData} />
      </div>

      {/* 2 ustunli panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top kompaniyalar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Eng Faol Kompaniyalar</h3>
            <Link href="/superadmin/companies" className="text-xs text-primary-500 hover:underline">Hammasi →</Link>
          </div>
          <div className="space-y-2">
            {data.topCompanies.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Hali kompaniya yo'q</div>
            ) : data.topCompanies.map((c, idx) => {
              const daysLeft = c.subscription
                ? Math.ceil((new Date(c.subscription.endDate).getTime() - Date.now()) / 86400000)
                : null;
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-sm font-bold">{idx + 1}</div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</p>
                      <p className="text-xs text-gray-400">{c._count.orders} buyurtma · {c._count.customers} mijoz</p>
                    </div>
                  </div>
                  {daysLeft !== null && (
                    <Badge variant={daysLeft > 7 ? "success" : daysLeft > 0 ? "warning" : "destructive"} >
                      {daysLeft > 0 ? `${daysLeft}k` : "⚠️"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Faoliyat jurnali */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">So'nggi Faoliyat</h3>
            <Link href="/superadmin/audit-logs" className="text-xs text-primary-500 hover:underline">Hammasi →</Link>
          </div>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {data.recentLogs.length === 0 ? (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500 text-sm">Hali faoliyat yo'q</div>
            ) : data.recentLogs.map((log) => {
              const meta = ACTION_META[log.action] || { icon: "📋", color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
              return (
                <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-tight">{log.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{getTimeDiff(log.createdAt)}</span>
                      {log.company && <span className="text-xs text-primary-500">· {log.company.name}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tezkor havolalar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { href: "/superadmin/plans",         label: "Tariflar",    icon: "📦" },
          { href: "/superadmin/subscriptions",  label: "Obunalar",   icon: "💳" },
          { href: "/superadmin/analytics",      label: "Analitika",  icon: "📈" },
          { href: "/superadmin/monitoring",     label: "Monitoring", icon: "🖥" },
          { href: "/superadmin/backups",        label: "Backup",     icon: "💾" },
          { href: "/superadmin/security",       label: "Xavfsizlik", icon: "🔒" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col items-center gap-2 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all text-center">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
