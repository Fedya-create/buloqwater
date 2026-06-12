"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

// ── Zayavka yuborish (Register sahifadan) ─────────────────────
interface SubmitApplicationInput {
  companyName: string;
  ownerName: string;
  phone: string;
  address?: string;
  description?: string;
}

export async function submitApplication(input: SubmitApplicationInput): Promise<ActionResult> {
  try {
    const existing = await prisma.application.findFirst({
      where: { phone: input.phone, status: "PENDING" },
    });
    if (existing) {
      return { success: false, error: "Sizning zayavkangiz allaqachon ko'rib chiqilmoqda" };
    }

    await prisma.application.create({
      data: {
        companyName: input.companyName,
        ownerName: input.ownerName,
        phone: input.phone,
        address: input.address || null,
        description: input.description || null,
      },
    });

    return { success: true, message: "Zayavka muvaffaqiyatli yuborildi! Tez orada siz bilan bog'lanamiz." };
  } catch (error) {
    console.error("[submitApplication]", error);
    return { success: false, error: "Zayavka yuborishda xatolik" };
  }
}

// ── Super Admin: Barcha zayavkalar ────────────────────────────
export async function getApplications(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: applications.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })) };
  } catch (error) {
    console.error("[getApplications]", error);
    return { success: false, error: "Zayavkalar yuklanmadi" };
  }
}

// ── Super Admin: Zayavkani qabul qilish ──────────────────────
export async function approveApplication(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    await prisma.application.update({ where: { id }, data: { status: "APPROVED" } });
    return { success: true };
  } catch (error) {
    console.error("[approveApplication]", error);
    return { success: false, error: "Qabul qilishda xatolik" };
  }
}

// ── Super Admin: Zayavkani rad etish ─────────────────────────
export async function rejectApplication(id: string, note?: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    await prisma.application.update({ where: { id }, data: { status: "REJECTED", adminNote: note || null } });
    return { success: true };
  } catch (error) {
    console.error("[rejectApplication]", error);
    return { success: false, error: "Rad etishda xatolik" };
  }
}
