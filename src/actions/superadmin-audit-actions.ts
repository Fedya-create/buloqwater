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

export async function getAuditLogs(filter?: {
  entity?: string;
  companyId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
}): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const page = filter?.page || 1;
    const limit = 50;
    const where: any = {};
    if (filter?.entity && filter.entity !== "ALL") where.entity = filter.entity;
    if (filter?.companyId) where.companyId = filter.companyId;
    if (filter?.from) where.createdAt = { ...where.createdAt, gte: new Date(filter.from) };
    if (filter?.to) where.createdAt = { ...where.createdAt, lte: new Date(filter.to) };
    if (filter?.search) where.OR = [
      { action: { contains: filter.search, mode: "insensitive" } },
      { actorName: { contains: filter.search, mode: "insensitive" } },
      { companyName: { contains: filter.search, mode: "insensitive" } },
    ];

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function getActivityLogs(filter?: {
  action?: string;
  companyId?: string;
  page?: number;
}): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const page = filter?.page || 1;
    const limit = 50;
    const where: any = {};
    if (filter?.action && filter.action !== "ALL") where.action = { contains: filter.action };
    if (filter?.companyId) where.companyId = filter.companyId;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { company: { select: { name: true, subdomain: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function getSystemLogs(filter?: {
  level?: string;
  source?: string;
  page?: number;
}): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const page = filter?.page || 1;
    const limit = 50;
    const where: any = {};
    if (filter?.level && filter.level !== "ALL") where.level = filter.level;
    if (filter?.source && filter.source !== "ALL") where.source = filter.source;

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function createAuditLog(data: {
  action: string;
  entity: string;
  entityId?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  companyId?: string;
  companyName?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...data,
        oldValue: data.oldValue ? JSON.stringify(data.oldValue) : null,
        newValue: data.newValue ? JSON.stringify(data.newValue) : null,
      },
    });
  } catch {}
}
