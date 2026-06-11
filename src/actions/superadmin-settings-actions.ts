"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

const DEFAULT_SETTINGS = [
  { key: "platform_name", value: "BuloqWater", label: "Platforma nomi", description: "Asosiy platforma nomi", category: "general" },
  { key: "support_phone", value: "+998901234567", label: "Yordam telefoni", description: "Texnik yordam telefon raqami", category: "general" },
  { key: "support_email", value: "support@buloqwater.uz", label: "Yordam email", description: "Email manzili", category: "general" },
  { key: "max_companies", value: "100", label: "Maksimal kompaniyalar", description: "Platformadagi maksimal kompaniyalar soni", category: "limits" },
  { key: "default_max_customers", value: "500", label: "Default max mijozlar", description: "Yangi kompaniya uchun default mijozlar limiti", category: "limits" },
  { key: "default_max_users", value: "20", label: "Default max xodimlar", description: "Yangi kompaniya uchun default xodimlar limiti", category: "limits" },
  { key: "trial_days", value: "14", label: "Sinov muddati (kun)", description: "Yangi kompaniya uchun bepul sinov muddati", category: "subscription" },
  { key: "monthly_price", value: "200000", label: "Oylik narx (so'm)", description: "Standart oylik obuna narxi", category: "subscription" },
  { key: "yearly_discount", value: "20", label: "Yillik chegirma (%)", description: "Yillik obuna uchun chegirma foizi", category: "subscription" },
  { key: "maintenance_mode", value: "false", label: "Texnik ishlar rejimi", description: "Platformani texnik ishlar rejimiga o'tkazish", category: "system" },
  { key: "allow_registration", value: "true", label: "Ro'yxatdan o'tish", description: "Yangi kompaniyalar ro'yxatdan o'tishi mumkinmi", category: "system" },
  { key: "notification_enabled", value: "true", label: "Bildirishnomalar", description: "Push bildirishnomalar yoqilganmi", category: "system" },
];

export async function getSettings(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    let settings = await prisma.globalSetting.findMany({
      orderBy: { category: "asc" },
    });

    if (settings.length === 0) {
      await prisma.globalSetting.createMany({
        data: DEFAULT_SETTINGS,
      });
      settings = await prisma.globalSetting.findMany({
        orderBy: { category: "asc" },
      });
    }

    return {
      success: true,
      data: settings.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, error: "Sozlamalar yuklanmadi" };
  }
}

export async function updateSetting(key: string, value: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.globalSetting.update({
      where: { key },
      data: { value },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Sozlama yangilashda xatolik" };
  }
}

export async function updateMultipleSettings(
  updates: { key: string; value: string }[]
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.globalSetting.update({
          where: { key: u.key },
          data: { value: u.value },
        })
      )
    );

    return { success: true };
  } catch (error) {
    return { success: false, error: "Sozlamalar yangilashda xatolik" };
  }
}

export async function resetSettings(): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.globalSetting.deleteMany();
    await prisma.globalSetting.createMany({ data: DEFAULT_SETTINGS });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Tiklashda xatolik" };
  }
}
