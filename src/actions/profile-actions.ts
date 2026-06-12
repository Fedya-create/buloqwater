"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

export async function getProfile(): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, phone: true, role: true, createdAt: true },
    });

    if (!user) return { success: false, error: "Foydalanuvchi topilmadi" };
    return { success: true, data: { ...user, createdAt: user.createdAt.toISOString() } };
  } catch (error) {
    console.error("[getProfile]", error);
    return { success: false, error: "Profil yuklanmadi" };
  }
}

interface UpdateProfileInput {
  name?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return { success: false, error: "Foydalanuvchi topilmadi" };

    const updateData: any = {};

    if (input.name && input.name !== user.name) {
      updateData.name = input.name;
    }

    if (input.phone && input.phone !== user.phone) {
      const existing = await prisma.user.findFirst({
        where: { phone: input.phone, companyId: user.companyId, id: { not: user.id } },
      });
      if (existing) return { success: false, error: "Bu telefon raqami band" };
      updateData.phone = input.phone;
    }

    if (input.currentPassword && input.newPassword) {
      const isValid = await bcrypt.compare(input.currentPassword, user.password);
      if (!isValid) return { success: false, error: "Joriy parol noto'g'ri" };
      if (input.newPassword.length < 6) return { success: false, error: "Yangi parol kamida 6 ta belgi" };
      updateData.password = await bcrypt.hash(input.newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "O'zgartirish kiritilmadi" };
    }

    await prisma.user.update({ where: { id: session.user.id }, data: updateData });
    return { success: true, message: "Profil yangilandi" };
  } catch (error) {
    console.error("[updateProfile]", error);
    return { success: false, error: "Profilni yangilashda xatolik" };
  }
}
