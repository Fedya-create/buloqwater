"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

export async function getStaff(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: { companyId: session.user.companyId, role: { in: ["OPERATOR", "DRIVER"] } },
      orderBy: { createdAt: "desc" },
    });

    const driverIds = users.filter((u) => u.role === "DRIVER").map((u) => u.id);

    const driverKpis = await prisma.order.groupBy({
      by: ["driverId", "status"],
      where: { driverId: { in: driverIds }, createdAt: { gte: today } },
      _count: true,
    });

    const driverDeliveries = await prisma.order.findMany({
      where: { driverId: { in: driverIds }, status: "DELIVERED", deliveredAt: { gte: today } },
      select: { driverId: true, bottlesReturned: true, totalAmount: true, paymentType: true, paidAmount: true },
    });

    const driverActiveOrders = await prisma.order.groupBy({
      by: ["driverId"],
      where: { driverId: { in: driverIds }, status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
      _count: true,
    });

    const kpiMap: Record<string, { assigned: number; delivered: number; bottlesCollected: number; cashCollected: number; activeOrders: number }> = {};

    driverKpis.forEach((k) => {
      if (!k.driverId) return;
      if (!kpiMap[k.driverId]) kpiMap[k.driverId] = { assigned: 0, delivered: 0, bottlesCollected: 0, cashCollected: 0, activeOrders: 0 };
      if (k.status === "DELIVERED") kpiMap[k.driverId].delivered += k._count;
      kpiMap[k.driverId].assigned += k._count;
    });

    driverDeliveries.forEach((d) => {
      if (!d.driverId) return;
      if (!kpiMap[d.driverId]) kpiMap[d.driverId] = { assigned: 0, delivered: 0, bottlesCollected: 0, cashCollected: 0, activeOrders: 0 };
      kpiMap[d.driverId].bottlesCollected += d.bottlesReturned;
      if (d.paymentType !== "CREDIT") {
        kpiMap[d.driverId].cashCollected += d.paidAmount;
      }
    });

    driverActiveOrders.forEach((d) => {
      if (!d.driverId) return;
      if (!kpiMap[d.driverId]) kpiMap[d.driverId] = { assigned: 0, delivered: 0, bottlesCollected: 0, cashCollected: 0, activeOrders: 0 };
      kpiMap[d.driverId].activeOrders = d._count;
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      kpi: u.role === "DRIVER" ? kpiMap[u.id] || { assigned: 0, delivered: 0, bottlesCollected: 0, cashCollected: 0, activeOrders: 0 } : undefined,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: "Xodimlar yuklanmadi" };
  }
}

interface CreateStaffInput {
  name: string;
  phone: string;
  password: string;
  role: "OPERATOR" | "DRIVER";
}

export async function createStaff(input: CreateStaffInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const existing = await prisma.user.findFirst({
      where: { phone: input.phone, companyId: session.user.companyId },
    });
    if (existing) return { success: false, error: "Bu telefon raqami allaqachon ro'yxatda" };

    const hashedPassword = await bcrypt.hash(input.password, 10);

    await prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        password: hashedPassword,
        role: input.role,
        companyId: session.user.companyId,
      },
    });

    return { success: true, message: "Xodim muvaffaqiyatli qo'shildi" };
  } catch (error: any) {
    if (error?.code === "P2002") return { success: false, error: "Bu telefon raqami band" };
    return { success: false, error: "Xodim yaratishda xatolik" };
  }
}

export async function toggleStaffStatus(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.user.companyId },
    });
    if (!user) return { success: false, error: "Xodim topilmadi" };

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Status o'zgartirishda xatolik" };
  }
}

interface UpdateStaffInput {
  name?: string;
  phone?: string;
  password?: string;
}

export async function updateStaffMember(userId: string, input: UpdateStaffInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findFirst({
      where: { id: userId, companyId: session.user.companyId },
    });
    if (!user) return { success: false, error: "Xodim topilmadi" };

    const updateData: any = {};

    if (input.name && input.name !== user.name) updateData.name = input.name;

    if (input.phone && input.phone !== user.phone) {
      const existing = await prisma.user.findFirst({
        where: { phone: input.phone, companyId: session.user.companyId, id: { not: userId } },
      });
      if (existing) return { success: false, error: "Bu telefon raqami band" };
      updateData.phone = input.phone;
    }

    if (input.password && input.password.length >= 6) {
      updateData.password = await bcrypt.hash(input.password, 10);
    }

    if (Object.keys(updateData).length === 0) return { success: false, error: "O'zgartirish kiritilmadi" };

    await prisma.user.update({ where: { id: userId }, data: updateData });
    return { success: true, message: "Xodim yangilandi" };
  } catch (error) {
    return { success: false, error: "Yangilashda xatolik" };
  }
}
