"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") throw new Error("Ruxsat yo'q");
  return session;
}

export async function getAnalytics(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Eng faol kompaniyalar
    const topCompanies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      include: {
        _count: { select: { orders: true, customers: true, users: true } },
        orders: {
          where: { status: "DELIVERED" },
          select: { totalAmount: true },
        },
        subscription: { select: { endDate: true, isPaid: true } },
      },
    });

    const companiesWithScore = topCompanies.map(c => {
      const revenue = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const daysLeft = c.subscription
        ? Math.ceil((new Date(c.subscription.endDate).getTime() - now.getTime()) / 86400000)
        : null;

      // Chiqib ketish ehtimoli: obuna muddati 0-30 kun + buyurtmalar kam bo'lsa yuqori
      const churnRisk =
        daysLeft !== null && daysLeft <= 30
          ? daysLeft <= 7
            ? "high"
            : "medium"
          : c._count.orders < 10
          ? "medium"
          : "low";

      return {
        id: c.id,
        name: c.name,
        subdomain: c.subdomain,
        status: c.status,
        ordersCount: c._count.orders,
        customersCount: c._count.customers,
        usersCount: c._count.users,
        revenue,
        daysLeft,
        churnRisk,
        score: c._count.orders * 2 + c._count.customers + revenue / 10000,
      };
    });

    const sortedByScore = [...companiesWithScore].sort((a, b) => b.score - a.score).slice(0, 10);
    const highChurnRisk = companiesWithScore.filter(c => c.churnRisk === "high").slice(0, 10);

    // Daromad prognozi (o'tgan 3 oy trend asosida)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const agg = await prisma.order.aggregate({
        where: { status: "DELIVERED", deliveredAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
        _count: true,
      });
      monthlyRevenue.push({
        month: start.toLocaleDateString("uz-UZ", { month: "short" }),
        revenue: agg._sum.totalAmount || 0,
        orders: agg._count,
        label: start.toLocaleDateString("uz-UZ", { month: "long", year: "numeric" }),
      });
    }

    // Prognoz: oxirgi 3 oy o'rtachasidan 10% o'sish
    const last3 = monthlyRevenue.slice(-3);
    const avgRevenue = last3.reduce((s, m) => s + m.revenue, 0) / 3;
    const avgOrders = last3.reduce((s, m) => s + m.orders, 0) / 3;
    const forecast = [1, 2, 3].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        month: d.toLocaleDateString("uz-UZ", { month: "short" }),
        revenue: Math.round(avgRevenue * (1 + 0.05 * i)),
        orders: Math.round(avgOrders * (1 + 0.03 * i)),
        isForecast: true,
      };
    });

    // Umumiy statistika
    const [totalRevenue, totalOrders, activeCompaniesCount, newThisMonth] = await Promise.all([
      prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Buyurtmalar taqsimoti (status bo'yicha)
    const ordersByStatus = await prisma.order.groupBy({
      by: ["status"],
      _count: true,
    });

    return {
      success: true,
      data: {
        topCompanies: sortedByScore,
        highChurnRisk,
        monthlyRevenue: [...monthlyRevenue, ...forecast],
        summary: {
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalOrders,
          activeCompanies: activeCompaniesCount,
          newThisMonth,
          avgRevenuePerCompany:
            activeCompaniesCount > 0
              ? Math.round((totalRevenue._sum.totalAmount || 0) / activeCompaniesCount)
              : 0,
        },
        ordersByStatus: ordersByStatus.map(o => ({ status: o.status, count: o._count })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function getCompanyDeepStats(companyId: string): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: { select: { orders: true, customers: true, users: true } },
        subscription: true,
      },
    });
    if (!company) return { success: false, error: "Topilmadi" };

    const [revenue, daily30] = await Promise.all([
      prisma.order.aggregate({ where: { companyId, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      getDailyOrders(companyId),
    ]);

    return {
      success: true,
      data: {
        company: { ...company, createdAt: company.createdAt.toISOString() },
        revenue: revenue._sum.totalAmount || 0,
        daily30,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

async function getDailyOrders(companyId: string) {
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(start.getTime() + 86400000);
    const [count, agg] = await Promise.all([
      prisma.order.count({ where: { companyId, createdAt: { gte: start, lt: end } } }),
      prisma.order.aggregate({ where: { companyId, status: "DELIVERED", deliveredAt: { gte: start, lt: end } }, _sum: { totalAmount: true } }),
    ]);
    result.push({ day: start.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" }), orders: count, revenue: agg._sum.totalAmount || 0 });
  }
  return result;
}
