"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

const DEFAULT_PASSWORD = "12345678bw";

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
    return { success: false, error: "O'chirishda xatolik" };
  }
}

export async function resetUserPassword(userId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "Topilmadi" };

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });

    return { success: true, message: "Parol standart qiymatiga tiklandi" };
  } catch (error) {
    return { success: false, error: "Parol tiklashda xatolik" };
  }
}
