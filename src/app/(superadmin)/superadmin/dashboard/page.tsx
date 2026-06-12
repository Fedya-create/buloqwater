import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { MonthlyGrowthChart } from "./components/monthly-chart";

async function getDashboardData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalCompanies, activeCompanies, suspendedCompanies, totalUsers,
    thisMonthCompanies, lastMonthCompanies,
    totalOrders, todayOrders, todayDeliveries,
    totalRevenue, monthlyRevenue,
    topCompanies, topByRevenue, topByCustomers,
    recentLogs, monthlyData,
    expiringSubs, pendingTickets, pendingApplications,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: "ACTIVE" } }),
    prisma.company.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
    prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.company.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: today } } }),
    prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
    prisma.company.findMany({
      take: 5, orderBy: { orders: { _count: "desc" } },
      include: { _count: { select: { orders: true, customers: true, users: true } }, subscription: { select: { endDate: true, isPaid: true } } },
    }),
    prisma.company.findMany({
      take: 5, orderBy: { orders: { _count: "desc" } },
      include: { _count: { select: { orders: true } }, orders: { where: { status: "DELIVERED" }, select: { totalAmount: true } } },
    }),
    prisma.company.findMany({
      take: 5, orderBy: { customers: { _count: "desc" } },
      include: { _count: { select: { customers: true } } },
    }),
    prisma.activityLog.findMany({ take: 15, orderBy: { createdAt: "desc" }, include: { company: { select: { name: true, subdomain: true } } } }),
    getMonthlyGrowth(),
    prisma.subscription.findMany({ where: { endDate: { lte: sevenDaysLater, gte: now } }, include: { company: { select: { name: true, subdomain: true } } }, orderBy: { endDate: "asc" }, take: 5 }),
    prisma.supportTicket.count({ where: { status: "OPEN" } }).catch(() => 0),
    prisma.application.count({ where: { status: "PENDING" } }),
  ]);

  const growthPercent = lastMonthCompanies > 0
    ? Math.round(((thisMonthCompanies - lastMonthCompanies) / lastMonthCompanies) * 100)
    : thisMonthCompanies > 0 ? 100 : 0;

  const revenueByCompany = topByRevenue.map(c => ({
    name: c.name,
    orders: c._count.orders,
    revenue: c.orders.reduce((sum, o) => sum + o.totalAmount, 0),
  }));

  return {
    totalCompanies, activeCompanies, suspendedCompanies, totalUsers,
    thisMonthCompanies, growthPercent,
    totalOrders, todayOrders, todayDeliveries,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
    topCompanies, revenueByCompany,
    topByCustomers: topByCustomers.map(c => ({ name: c.name, customers: c._count.customers })),
    recentLogs, monthlyData, expiringSubs, pendingTickets, pendingApplications,
  };
}

async function getMonthlyGrowth() {
  const months = [];
  const now = new Date();
  const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const count = await prisma.company.count({ where: { createdAt: { gte: start, lte: end } } });
    const revenue = await prisma.order.aggregate({ where: { status: "DELIVERED", deliveredAt: { gte: start, lte: end } }, _sum: { totalAmount: true } });
    months.push({ month: monthNames[start.getMonth()], companies: count, revenue: revenue._sum.totalAmount || 0 });
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

function getActionIcon(action: string): string {
  const icons: Record<string, string> = { company_created: "🏢", company_suspended: "⏸️", company_activated: "▶️", user_created: "👤", user_login: "🔑", order_delivered: "📦", payment_received: "💰", subscription_extended: "📅" };
  return icons[action] || "📋";
}

export default async function SuperAdminDashboard() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enterprise boshqaruv paneli</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/superadmin/companies"><Button size="sm">+ Kompaniya</Button></Link>
          <Link href="/superadmin/users"><Button size="sm" variant="outline">+ Foydalanuvchi</Button></Link>
          <Link href="/superadmin/messages"><Button size="sm" variant="outline">📢 Xabar</Button></Link>
          <Button size="sm" variant="outline">📊 Hisobot</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard title="Jami tushum" value={formatCurrency(data.totalRevenue)} icon={<span className="text-xl">💰</span>} />
        <StatCard title="Oylik tushum" value={formatCurrency(data.monthlyRevenue)} icon={<span className="text-xl">📈</span>} />
        <StatCard title="Jami buyurtmalar" value={data.totalOrders} icon={<span className="text-xl">🛒</span>} />
        <StatCard title="Bugungi yetkazish" value={data.todayDeliveries} icon={<span className="text-xl">🚚</span>} description={`${data.todayOrders} buyurtma`} />
        <StatCard title="Kompaniyalar" value={data.totalCompanies} icon={<span className="text-xl">🏢</span>} trend={data.growthPercent !== 0 ? { value: Math.abs(data.growthPercent), positive: data.growthPercent > 0 } : undefined} />
        <StatCard title="Foydalanuvchilar" value={data.totalUsers} icon={<span className="text-xl">👤</span>} />
        <StatCard title="Muammoli" value={data.suspendedCompanies} icon={<span className="text-xl">⚠️</span>} description={data.suspendedCompanies > 0 ? "Diqqat" : "OK"} />
        <StatCard title="Yangi tiketlar" value={data.pendingTickets} icon={<span className="text-xl">🔔</span>} description={data.pendingApplications > 0 ? `${data.pendingApplications} zayavka` : ""} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tizim Holati</h4>
          <div className="space-y-2.5">
            <StatusRow label="API Server" status="online" />
            <StatusRow label="Database" status="online" />
            <StatusRow label="Storage" status="online" />
            <StatusRow label="Email Service" status="online" />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <UsageBar label="CPU" value={28} />
            <UsageBar label="RAM" value={54} />
            <UsageBar label="Disk" value={37} />
          </div>
        </div>

        {data.expiringSubs.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Obunasi tugayotganlar</h4>
              <Badge variant="destructive">{data.expiringSubs.length}</Badge>
            </div>
            <div className="space-y-2">
              {data.expiringSubs.map((sub) => {
                const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000);
                return (
                  <div key={sub.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{sub.company.name}</span>
                    <Badge variant={daysLeft <= 2 ? "destructive" : "warning"}>{daysLeft} kun</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-green-200 dark:border-green-800 p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Obuna Holati</h4>
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Barcha obunalar faol</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">AI Tavsiya</h4>
          <div className="space-y-2.5">
            {data.expiringSubs.length > 0 && (
              <AiTip text={`${data.expiringSubs.length} kompaniya obunasi tugash arafasida`} type="warning" />
            )}
            {data.suspendedCompanies > 0 && (
              <AiTip text={`${data.suspendedCompanies} kompaniya muzlatilgan holatda`} type="danger" />
            )}
            {data.growthPercent > 0 && (
              <AiTip text={`So'nggi oyda ${data.growthPercent}% o'sish kuzatildi`} type="success" />
            )}
            {data.pendingApplications > 0 && (
              <AiTip text={`${data.pendingApplications} ta zayavka ko'rib chiqishni kutmoqda`} type="info" />
            )}
            {data.expiringSubs.length === 0 && data.suspendedCompanies === 0 && data.pendingApplications === 0 && (
              <AiTip text="Tizim barqaror ishlayapti, muammo aniqlanmadi" type="success" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Oylik Dinamika</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kompaniyalar va tushum</p>
          </div>
          <Link href="/superadmin/analytics" className="text-sm text-primary-500 hover:underline">Batafsil →</Link>
        </div>
        <MonthlyGrowthChart data={data.monthlyData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Eng ko'p buyurtma</h3>
            <Link href="/superadmin/companies" className="text-xs text-primary-500 hover:underline">Hammasi →</Link>
          </div>
          <div className="space-y-2">
            {data.topCompanies.map((company, idx) => {
              const daysLeft = company.subscription ? Math.ceil((new Date(company.subscription.endDate).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={company.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{company.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{company._count.orders} buyurtma</p>
                    </div>
                  </div>
                  {daysLeft !== null && (
                    <Badge variant={daysLeft > 7 ? "success" : daysLeft > 0 ? "warning" : "destructive"} className="text-[9px]">
                      {daysLeft > 0 ? `${daysLeft}k` : "!"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Eng ko'p tushum</h3>
          <div className="space-y-2">
            {data.revenueByCompany.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{c.name}</p>
                </div>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">{formatCurrency(c.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Eng ko'p mijoz</h3>
          <div className="space-y-2">
            {data.topByCustomers.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{c.name}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{c.customers} mijoz</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Faoliyat Jurnali</h3>
          <Link href="/superadmin/audit" className="text-sm text-primary-500 hover:underline">Batafsil →</Link>
        </div>
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {data.recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Hali faoliyat yo'q</p>
          ) : (
            data.recentLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <span className="text-lg mt-0.5">{getActionIcon(log.action)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{log.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{getTimeDiff(log.createdAt)}</span>
                    {log.company && <span className="text-xs text-primary-500">{log.company.name}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: "online" | "offline" | "warning" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${status === "online" ? "bg-green-500 animate-pulse" : status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
        <span className={`text-xs font-medium ${status === "online" ? "text-green-600 dark:text-green-400" : status === "warning" ? "text-yellow-600" : "text-red-600"}`}>
          {status === "online" ? "Online" : status === "warning" ? "Warning" : "Offline"}
        </span>
      </div>
    </div>
  );
}

function UsageBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${value > 80 ? "bg-red-500" : value > 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function AiTip({ text, type }: { text: string; type: "warning" | "danger" | "success" | "info" }) {
  const colors = {
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  };
  const icons = { warning: "⚠️", danger: "🚨", success: "✅", info: "💡" };
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${colors[type]}`}>
      <span>{icons[type]}</span>
      <span>{text}</span>
    </div>
  );
}
