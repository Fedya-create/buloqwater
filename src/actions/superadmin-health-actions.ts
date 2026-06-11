"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getSystemHealth(): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      companiesCount,
      activeCompanies,
      suspendedCompanies,
      usersCount,
      activeUsers,
      ordersCount,
      todayOrders,
      pendingOrders,
      deliveredToday,
      customersCount,
      productsCount,
      applicationsCount,
      pendingApplications,
      activityLogs,
      expiringSubs,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.company.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: todayStart } } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.application.count(),
      prisma.application.count({ where: { status: "PENDING" } }),
      prisma.activityLog.count(),
      prisma.subscription.count({ where: { endDate: { lte: sevenDaysLater, gte: now } } }),
    ]);

    const totalRecords = companiesCount + usersCount + ordersCount + customersCount + productsCount;

    const data = {
      database: {
        status: totalRecords > 0 ? "healthy" : "warning",
        totalRecords,
        companiesCount,
        usersCount,
        ordersCount,
        customersCount,
      },
      companies: {
        total: companiesCount,
        active: activeCompanies,
        suspended: suspendedCompanies,
        expiringSoon: expiringSubs,
      },
      orders: {
        total: ordersCount,
        todayOrders,
        pendingOrders,
        deliveredToday,
      },
      storage: {
        totalProducts: productsCount,
        totalApplications: applicationsCount,
        pendingApplications,
        activityLogs,
      },
      performance: {
        avgOrdersPerCompany: companiesCount > 0 ? Math.round(ordersCount / companiesCount) : 0,
        avgCustomersPerCompany: companiesCount > 0 ? Math.round(customersCount / companiesCount) : 0,
        activeUsersPercent: usersCount > 0 ? Math.round((activeUsers / usersCount) * 100) : 0,
      },
    };

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Tizim holati yuklanmadi" };
  }
}

export async function getRecentErrors(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const expiredSubs = await prisma.subscription.findMany({
      where: { endDate: { lt: new Date() } },
      include: { company: { select: { name: true, subdomain: true, status: true } } },
      orderBy: { endDate: "desc" },
      take: 10,
    });

    const issues = expiredSubs.map((sub) => ({
      id: sub.id,
      type: "subscription_expired",
      message: `${sub.company.name} obunasi muddati o'tgan`,
      companyName: sub.company.name,
      date: sub.endDate.toISOString(),
      severity: "warning" as const,
    }));

    return { success: true, data: issues };
  } catch (error) {
    return { success: false, error: "Xatoliklar yuklanmadi" };
  }
}
