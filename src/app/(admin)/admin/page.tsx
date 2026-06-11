import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "./components/admin-dashboard-client";

async function getAdminStats(companyId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const [
    dailySales,
    yesterdaySales,
    dailyDeliveries,
    yesterdayDeliveries,
    newCustomersMonth,
    unreturnedBottlesAgg,
    totalDebtAgg,
    weeklyData,
    alerts,
    pendingOrders,
    inTransitOrders,
    cancelledToday,
    activeDrivers,
    paymentBreakdown,
    customersWithBottles,
    customersWithDebt,
    totalCustomerBottles,
  ] = await Promise.all([
    // Bugungi sotuv
    prisma.order.aggregate({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: today } }, _sum: { totalAmount: true } }),
    // Kechagi sotuv (trend uchun)
    prisma.order.aggregate({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: yesterday, lt: today } }, _sum: { totalAmount: true } }),
    // Bugungi yetkazish
    prisma.order.count({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: today } } }),
    // Kechagi yetkazish
    prisma.order.count({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: yesterday, lt: today } } }),
    // Yangi mijozlar (oy)
    prisma.customer.count({ where: { companyId, createdAt: { gte: monthStart } } }),
    // Qaytarilmagan idishlar jami
    prisma.customer.aggregate({ where: { companyId, bottleBalance: { gt: 0 } }, _sum: { bottleBalance: true } }),
    // Umumiy qarz
    prisma.customer.aggregate({ where: { companyId, debtBalance: { gt: 0 } }, _sum: { debtBalance: true } }),
    // Haftalik grafik
    getWeeklyData(companyId, today),
    // Alertlar
    getAlerts(companyId),
    // Kutilayotgan buyurtmalar
    prisma.order.count({ where: { companyId, status: "PENDING" } }),
    // Yo'ldagi buyurtmalar
    prisma.order.count({ where: { companyId, status: "IN_TRANSIT" } }),
    // Bekor qilingan (bugun)
    prisma.order.count({ where: { companyId, status: "CANCELLED", updatedAt: { gte: today } } }),
    // Faol haydovchilar
    prisma.user.count({ where: { companyId, role: "DRIVER", isActive: true } }),
    // To'lov turi bo'yicha bugungi breakdown
    getPaymentBreakdown(companyId, today),
    // Idishli mijozlar soni
    prisma.customer.count({ where: { companyId, bottleBalance: { gt: 0 } } }),
    // Qarzli mijozlar soni
    prisma.customer.count({ where: { companyId, debtBalance: { gt: 0 } } }),
    // Mijozlardagi jami idishlar
    prisma.customer.aggregate({ where: { companyId }, _sum: { bottleBalance: true } }),
  ]);

  const todaySalesAmount = dailySales._sum.totalAmount || 0;
  const yesterdaySalesAmount = yesterdaySales._sum.totalAmount || 0;
  const salesTrend = yesterdaySalesAmount > 0
    ? Math.round(((todaySalesAmount - yesterdaySalesAmount) / yesterdaySalesAmount) * 100)
    : todaySalesAmount > 0 ? 100 : 0;

  const deliveryTrend = yesterdayDeliveries > 0
    ? Math.round(((dailyDeliveries - yesterdayDeliveries) / yesterdayDeliveries) * 100)
    : dailyDeliveries > 0 ? 100 : 0;

  return {
    dailySales: todaySalesAmount,
    salesTrend,
    dailyDeliveries,
    deliveryTrend,
    newCustomersMonth,
    unreturnedBottles: unreturnedBottlesAgg._sum.bottleBalance || 0,
    totalDebt: totalDebtAgg._sum.debtBalance || 0,
    weeklyData,
    alerts,
    pendingOrders,
    inTransitOrders,
    cancelledToday,
    activeDrivers,
    paymentBreakdown,
    customersWithBottles,
    customersWithDebt,
    totalCustomerBottles: totalCustomerBottles._sum.bottleBalance || 0,
  };
}

async function getPaymentBreakdown(companyId: string, today: Date) {
  const [cashAmount, clickAmount, creditAmount] = await Promise.all([
    prisma.order.aggregate({ where: { companyId, status: "DELIVERED", paymentType: "CASH", deliveredAt: { gte: today } }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { companyId, status: "DELIVERED", paymentType: "CLICK", deliveredAt: { gte: today } }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { companyId, status: "DELIVERED", paymentType: "CREDIT", deliveredAt: { gte: today } }, _sum: { totalAmount: true } }),
  ]);

  return {
    cash: cashAmount._sum.totalAmount || 0,
    click: clickAmount._sum.totalAmount || 0,
    credit: creditAmount._sum.totalAmount || 0,
  };
}

async function getWeeklyData(companyId: string, today: Date) {
  const data = [];
  const dayNames = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
  const monthNames = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today); dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const [orders, revenue] = await Promise.all([
      prisma.order.count({ where: { companyId, createdAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.order.aggregate({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: dayStart, lt: dayEnd } }, _sum: { totalAmount: true } }),
    ]);

    data.push({
      day: dayNames[dayStart.getDay()],
      date: `${dayStart.getDate()}-${monthNames[dayStart.getMonth()]}`,
      orders,
      revenue: revenue._sum.totalAmount || 0,
    });
  }
  return data;
}

async function getAlerts(companyId: string) {
  const alerts: { type: "warning" | "danger" | "info"; message: string; link?: string }[] = [];

  // 5+ idish qaytarmagan mijozlar
  const longBottles = await prisma.customer.count({
    where: { companyId, bottleBalance: { gte: 5 } },
  });
  if (longBottles > 0) {
    alerts.push({ type: "warning", message: `${longBottles} ta mijozda 5+ idish qaytarilmagan`, link: "/admin/orders?filter=bottles" });
  }

  // Katta qarz
  const bigDebt = await prisma.customer.count({
    where: { companyId, debtBalance: { gte: 100000 } },
  });
  if (bigDebt > 0) {
    alerts.push({ type: "danger", message: `${bigDebt} ta mijozning qarzi 100,000+ so'm`, link: "/admin/orders?filter=debt" });
  }

  // Biriktirilmagan buyurtmalar (1 soatdan ko'p)
  const pending = await prisma.order.count({
    where: { companyId, status: "PENDING", createdAt: { lt: new Date(Date.now() - 3600000) } },
  });
  if (pending > 0) {
    alerts.push({ type: "danger", message: `${pending} ta buyurtma 1+ soatdan beri biriktirilmagan`, link: "/admin/orders" });
  }

  // Nofaol haydovchi
  const inactiveDrivers = await prisma.user.count({
    where: { companyId, role: "DRIVER", isActive: false },
  });
  if (inactiveDrivers > 0) {
    alerts.push({ type: "info", message: `${inactiveDrivers} ta haydovchi nofaol holatda`, link: "/admin/staff" });
  }

  return alerts;
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user.companyId) return null;

  const stats = await getAdminStats(session.user.companyId);

  return <AdminDashboardClient stats={stats} />;
}
