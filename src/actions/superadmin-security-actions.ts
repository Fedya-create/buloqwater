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

export async function getSessionLogs(filter?: {
  userId?: string;
  companyId?: string;
  page?: number;
}): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const page = filter?.page || 1;
    const limit = 50;
    const where: any = {};
    if (filter?.userId) where.userId = filter.userId;
    if (filter?.companyId) where.companyId = filter.companyId;

    const [logs, total] = await Promise.all([
      prisma.sessionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sessionLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function getSecurityStats(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalLogins, todayLogins, weekLogins,
      uniqueUsers, blockedUsers,
      recentLogins,
    ] = await Promise.all([
      prisma.sessionLog.count({ where: { action: "login" } }),
      prisma.sessionLog.count({ where: { action: "login", createdAt: { gte: todayStart } } }),
      prisma.sessionLog.count({ where: { action: "login", createdAt: { gte: weekAgo } } }),
      prisma.sessionLog.groupBy({ by: ["userId"], _count: true }).then(r => r.length),
      prisma.user.count({ where: { isActive: false } }),
      prisma.sessionLog.findMany({
        where: { action: "login" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      success: true,
      data: {
        totalLogins,
        todayLogins,
        weekLogins,
        uniqueUsers,
        blockedUsers,
        recentLogins: recentLogins.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function logSession(data: {
  userId: string;
  userName?: string;
  userRole?: string;
  companyId?: string;
  companyName?: string;
  ipAddress?: string;
  userAgent?: string;
  action?: string;
}): Promise<void> {
  try {
    await prisma.sessionLog.create({
      data: {
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        companyId: data.companyId,
        companyName: data.companyName,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        action: data.action || "login",
      },
    });
  } catch {}
}
