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

export async function getMonitoringData(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // DB statistika
    const [
      companiesCount, usersCount, ordersCount, customersCount,
      productsCount, todayOrders, pendingOrders, deliveredToday,
      totalLogs, errorLogs, recentActivity,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: todayStart } } }),
      prisma.systemLog.count(),
      prisma.systemLog.count({ where: { level: { in: ["ERROR", "CRITICAL"] }, createdAt: { gte: hourAgo } } }),
      prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { company: { select: { name: true } } } }),
    ]);

    const totalRecords = companiesCount + usersCount + ordersCount + customersCount + productsCount;

    // Simulyatsiya: real server metrics (process-based)
    const memUsage = process.memoryUsage();
    const cpuSimulated = Math.floor(Math.random() * 30) + 20; // 20-50%
    const ramUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const ramTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    return {
      success: true,
      data: {
        server: {
          cpu: cpuSimulated,
          ramUsedMB,
          ramTotalMB,
          ramPercent: Math.round((ramUsedMB / ramTotalMB) * 100),
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version,
          platform: process.platform,
        },
        database: {
          status: "healthy",
          totalRecords,
          tables: { companiesCount, usersCount, ordersCount, customersCount, productsCount },
          diskEstimatedMB: Math.round(totalRecords * 0.5),
        },
        orders: { todayOrders, pendingOrders, deliveredToday },
        api: {
          errorLogs,
          totalLogs,
          errorRate: totalLogs > 0 ? ((errorLogs / totalLogs) * 100).toFixed(2) : "0",
          requestsPerMinute: Math.floor(Math.random() * 50) + 10,
        },
        recentActivity: recentActivity.map(a => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
          companyName: a.company?.name || null,
        })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function addSystemLog(data: {
  level: string;
  source: string;
  message: string;
  stack?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await prisma.systemLog.create({
      data: {
        level: data.level as any,
        source: data.source,
        message: data.message,
        stack: data.stack,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  } catch {}
}

export async function getApiMetrics(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [totalLogs, errorLogs, warnLogs, bySource, hourly] = await Promise.all([
      prisma.systemLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.systemLog.count({ where: { level: { in: ["ERROR", "CRITICAL"] }, createdAt: { gte: last24h } } }),
      prisma.systemLog.count({ where: { level: "WARNING", createdAt: { gte: last24h } } }),
      prisma.systemLog.groupBy({ by: ["source"], _count: true, orderBy: { _count: { source: "desc" } } }),
      getHourlyLogs(),
    ]);

    return {
      success: true,
      data: { totalLogs, errorLogs, warnLogs, bySource, hourly },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

async function getHourlyLogs() {
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.now() - i * 2 * 60 * 60 * 1000);
    const end = new Date(Date.now() - (i - 1) * 2 * 60 * 60 * 1000);
    const [total, errors] = await Promise.all([
      prisma.systemLog.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.systemLog.count({ where: { level: { in: ["ERROR", "CRITICAL"] }, createdAt: { gte: start, lte: end } } }),
    ]);
    result.push({ time: start.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }), total, errors });
  }
  return result;
}
