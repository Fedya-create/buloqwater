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

export async function getSubscriptions(filter?: { status?: string; companyId?: string }): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();
    const where: any = {};
    if (filter?.status && filter.status !== "ALL") where.status = filter.status;
    if (filter?.companyId) where.companyId = filter.companyId;

    const subs = await prisma.companySubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true, subdomain: true, status: true } },
        plan: { select: { id: true, displayName: true, price: true } },
        _count: { select: { payments: true } },
      },
    });
    return {
      success: true,
      data: subs.map(s => ({
        ...s,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        createdAt: s.createdAt.toISOString(),
        daysLeft: Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86400000),
      })),
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function createSubscription(input: {
  companyId: string;
  planId?: string;
  durationDays: number;
  amount: number;
  isPaid: boolean;
  notes?: string;
}): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + input.durationDays);
    await prisma.companySubscription.create({
      data: {
        companyId: input.companyId,
        planId: input.planId || null,
        endDate,
        amount: input.amount,
        isPaid: input.isPaid,
        notes: input.notes,
        status: "ACTIVE",
      },
    });
    return { success: true, message: "Obuna yaratildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function extendSubscriptionNew(id: string, days: number, amount: number): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const sub = await prisma.companySubscription.findUnique({ where: { id } });
    if (!sub) return { success: false, error: "Obuna topilmadi" };
    const baseDate = sub.endDate > new Date() ? sub.endDate : new Date();
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + days);
    await prisma.$transaction(async tx => {
      await tx.companySubscription.update({ where: { id }, data: { endDate: newEnd, status: "ACTIVE" } });
      if (amount > 0) {
        await tx.companyPayment.create({
          data: { subscriptionId: id, amount, description: `${days} kunlik obuna uzaytirish`, companyId: sub.companyId },
        });
      }
    });
    return { success: true, message: "Obuna uzaytirildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function cancelSubscription(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.companySubscription.update({ where: { id }, data: { status: "CANCELLED" } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function confirmPayment(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.companySubscription.update({ where: { id }, data: { isPaid: true } });
    return { success: true, message: "To'lov tasdiqlandi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function getSubscriptionStats(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 86400000);
    const [total, active, expired, cancelled, expiringSoon, revenue] = await Promise.all([
      prisma.companySubscription.count(),
      prisma.companySubscription.count({ where: { status: "ACTIVE" } }),
      prisma.companySubscription.count({ where: { status: "EXPIRED" } }),
      prisma.companySubscription.count({ where: { status: "CANCELLED" } }),
      prisma.companySubscription.count({ where: { status: "ACTIVE", endDate: { lte: in7days, gte: now } } }),
      prisma.companyPayment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    ]);
    return { success: true, data: { total, active, expired, cancelled, expiringSoon, totalRevenue: revenue._sum.amount || 0 } };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
