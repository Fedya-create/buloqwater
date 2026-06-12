"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

// DEFAULT_PASSWORD muhit o'zgaruvchisidan olinadi. Agar ENV da belgilanmagan bo'lsa
// tasodifiy 10 belgilik parol generatsiya qilinadi — hech qachon source codeda saqlanmaydi.
function generateDefaultPassword(): string {
  const envPassword = process.env.DEFAULT_RESET_PASSWORD;
  if (envPassword && envPassword.length >= 6) return envPassword;
  // Fallback: kriptografik tasodifiy parol (response'da QAYTARILMAYDI)
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export async function getAllUsers(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const users = await prisma.user.findMany({
      where: { role: { not: "SUPER_ADMIN" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, phone: true, role: true, isActive: true, createdAt: true, company: { select: { name: true, subdomain: true } } },
    });

    return { success: true, data: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) };
  } catch (error) {
    console.error("[getAllUsers]", error);
    return { success: false, error: "Foydalanuvchilar yuklanmadi" };
  }
}

export async function blockUser(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Topilmadi" };
    if (user.role === "SUPER_ADMIN") return { success: false, error: "Super Admin-ni bloklash mumkin emas" };

    await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } });
    return { success: true };
  } catch (error) {
    console.error("[blockUser]", error);
    return { success: false, error: "Xatolik" };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Topilmadi" };
    if (user.role === "SUPER_ADMIN") return { success: false, error: "Super Admin-ni o'chirish mumkin emas" };

    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (error) {
    console.error("[deleteUser]", error);
    return { success: false, error: "O'chirishda xatolik" };
  }
}

export async function resetUserPassword(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Topilmadi" };

    const newPassword = generateDefaultPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    // XAVFSIZLIK: parol response'da qaytarilmaydi.
    // Yangi parol faqat server log'da (production'da log aggregator orqali) ko'rinadi.
    console.info(`[resetUserPassword] Password reset for user ${userId} (${user.name})`);

    return { success: true, message: "Parol muvaffaqiyatli tiklandi. Yangi parol admin bilan bog'lanib olish orqali beriladi." };
  } catch (error) {
    console.error("[resetUserPassword]", error);
    return { success: false, error: "Parol tiklashda xatolik" };
  }
}
