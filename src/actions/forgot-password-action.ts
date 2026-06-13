"use server";

import { prisma } from "@/lib/prisma";
import { sendOtp, verifyOtp } from "@/lib/sms";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

// ─── Telefon normalizatsiya ──────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (phone.startsWith("+")) return phone.trim();
  return `+998${digits}`;
}

// ─── Step 1: Telefon raqamni tekshirib OTP yuborish ─────────────────────────

export async function sendPasswordResetOtp(
  phone: string
): Promise<ActionResult<{ name: string; maskedPhone: string }>> {
  try {
    const formatted = normalizePhone(phone);

    const user = await prisma.user.findFirst({
      where: { phone: formatted, isActive: true },
      select: { name: true },
    });

    if (!user) {
      return {
        success: false,
        error: "Bu telefon raqam tizimda ro'yxatdan o'tmagan",
      };
    }

    // OTP yuborish — 6 xonali, 5 daqiqa, 3 urinish
    await sendOtp(formatted, {
      length: 6,
      ttl: 300,
      template: "BuloqWater: parolingizni tiklash kodi {code}. Hech kimga bermang!",
      max_attempts: 3,
    });

    // Telefon raqamni maskalaymiz: +998 90 ***45 67
    const digits = formatted.replace(/\D/g, ""); // 998901234567
    const maskedPhone = `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ***${digits.slice(8, 10)} ${digits.slice(10)}`;

    return {
      success: true,
      data: { name: user.name, maskedPhone },
    };
  } catch (err) {
    console.error("[sendPasswordResetOtp]", err);
    return { success: false, error: "SMS yuborishda xatolik yuz berdi. Keyinroq urinib ko'ring." };
  }
}

// ─── Step 2: OTP kodni tekshirish ────────────────────────────────────────────

export async function verifyPasswordResetOtp(
  phone: string,
  code: string
): Promise<ActionResult> {
  try {
    const formatted = normalizePhone(phone);

    const result = await verifyOtp(formatted, code.trim());

    if (!result.valid) {
      return {
        success: false,
        error: result.message ?? "Kod noto'g'ri yoki muddati o'tgan",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[verifyPasswordResetOtp]", err);
    return { success: false, error: "Kodni tekshirishda xatolik yuz berdi" };
  }
}

// ─── Step 3: Yangi parolni saqlash ───────────────────────────────────────────

export async function resetPassword(
  phone: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> {
  try {
    if (newPassword !== confirmPassword) {
      return { success: false, error: "Parollar mos kelmadi" };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" };
    }

    const formatted = normalizePhone(phone);

    const user = await prisma.user.findFirst({
      where: { phone: formatted, isActive: true },
      select: { id: true },
    });

    if (!user) {
      return { success: false, error: "Foydalanuvchi topilmadi" };
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, updatedAt: new Date() },
    });

    return { success: true, message: "Parol muvaffaqiyatli o'zgartirildi" };
  } catch (err) {
    console.error("[resetPassword]", err);
    return { success: false, error: "Parolni saqlashda xatolik yuz berdi" };
  }
}
