"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export interface PlanInput {
  name: string;
  displayName: string;
  description?: string;
  price: number;
  durationDays: number;
  maxUsers: number;
  maxCustomers: number;
  maxOrders: number;
  storageGB: number;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") throw new Error("Ruxsat yo'q");
  return session;
}

export async function getPlans(): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    });
    return { success: true, data: plans.map(p => ({ ...p, features: p.features ? JSON.parse(p.features) : [] })) };
  } catch (e: any) {
    return { success: false, error: e.message || "Tariflar yuklanmadi" };
  }
}

export async function createPlan(input: PlanInput): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const existing = await prisma.plan.findUnique({ where: { name: input.name } });
    if (existing) return { success: false, error: "Bu nom bilan tarif mavjud" };
    await prisma.plan.create({
      data: { ...input, features: JSON.stringify(input.features) },
    });
    return { success: true, message: "Tarif yaratildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Tarif yaratishda xatolik" };
  }
}

export async function updatePlan(id: string, input: PlanInput): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.plan.update({
      where: { id },
      data: { ...input, features: JSON.stringify(input.features) },
    });
    return { success: true, message: "Tarif yangilandi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Yangilashda xatolik" };
  }
}

export async function deletePlan(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const count = await prisma.companySubscription.count({ where: { planId: id, status: "ACTIVE" } });
    if (count > 0) return { success: false, error: `${count} ta faol obuna bor, o'chirib bo'lmaydi` };
    await prisma.plan.delete({ where: { id } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "O'chirishda xatolik" };
  }
}

export async function togglePlanStatus(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) return { success: false, error: "Topilmadi" };
    await prisma.plan.update({ where: { id }, data: { isActive: !plan.isActive } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
