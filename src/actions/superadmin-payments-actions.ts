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

export async function getPayments(filter?: {
  method?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();
    const where: any = {};
    if (filter?.method && filter.method !== "ALL") where.method = filter.method;
    if (filter?.status && filter.status !== "ALL") where.status = filter.status;
    if (filter?.from) where.paidAt = { ...where.paidAt, gte: new Date(filter.from) };
    if (filter?.to) where.paidAt = { ...where.paidAt, lte: new Date(filter.to) };

    const payments = await prisma.companyPayment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
      include: {
        subscription: {
          include: {
            company: { select: { name: true, subdomain: true } },
            plan: { select: { displayName: true } },
          },
        },
      },
    });
    return {
      success: true,
      data: payments.map(p => ({
        ...p,
        paidAt: p.paidAt.toISOString(),
        companyName: p.subscription?.company?.name || p.companyName || "—",
        subdomain: p.subscription?.company?.subdomain || "—",
        planName: p.subscription?.plan?.displayName || "—",
      })),
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function createPayment(input: {
  subscriptionId?: string;
  companyId?: string;
  companyName?: string;
  amount: number;
  method: string;
  description?: string;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.companyPayment.create({
      data: {
        subscriptionId: input.subscriptionId || null,
        companyId: input.companyId || null,
        companyName: input.companyName || null,
        amount: input.amount,
        method: input.method as any,
        description: input.description,
        status: "COMPLETED",
      },
    });
    return { success: true, message: "To'lov qo'shildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function getPaymentStats(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [total, thisMonth, lastMonth, byMethod, monthly] = await Promise.all([
      prisma.companyPayment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      prisma.companyPayment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
      prisma.companyPayment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
      prisma.companyPayment.groupBy({ by: ["method"], where: { status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      getMonthlyRevenue(),
    ]);

    return {
      success: true,
      data: {
        totalRevenue: total._sum.amount || 0,
        totalCount: total._count,
        thisMonth: { revenue: thisMonth._sum.amount || 0, count: thisMonth._count },
        lastMonth: { revenue: lastMonth._sum.amount || 0 },
        growthPercent: lastMonth._sum.amount
          ? Math.round((((thisMonth._sum.amount || 0) - (lastMonth._sum.amount || 0)) / (lastMonth._sum.amount || 1)) * 100)
          : 0,
        byMethod: byMethod.map(m => ({ method: m.method, amount: m._sum.amount || 0, count: m._count })),
        monthly,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

async function getMonthlyRevenue() {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const agg = await prisma.companyPayment.aggregate({
      where: { status: "COMPLETED", paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: true,
    });
    result.push({
      month: start.toLocaleDateString("uz-UZ", { month: "short", year: "2-digit" }),
      revenue: agg._sum.amount || 0,
      count: agg._count,
    });
  }
  return result;
}
