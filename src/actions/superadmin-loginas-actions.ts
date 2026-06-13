"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

/**
 * Super Admin kompaniyaning director sifatida kirishi uchun
 * Direktoring login ma'lumotlarini qaytaradi
 */
export async function getCompanyDirectorCredentials(companyId: string): Promise<ActionResult<{
  subdomain: string;
  directorPhone: string;
  companyName: string;
  loginUrl: string;
}>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          where: { role: "DIRECTOR", isActive: true },
          select: { id: true, name: true, phone: true },
          take: 1,
        },
      },
    });

    if (!company) return { success: false, error: "Kompaniya topilmadi" };
    if (company.users.length === 0) return { success: false, error: "Bu kompaniyada direktor topilmadi" };

    const director = company.users[0];

    // Log
    await prisma.activityLog.create({
      data: {
        action: "superadmin_login_as",
        description: `Super Admin "${company.name}" kompaniyasiga ${director.name} sifatida kirdi`,
        companyId: company.id,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      data: {
        subdomain: company.subdomain,
        directorPhone: director.phone,
        companyName: company.name,
        loginUrl: `${process.env.NEXTAUTH_URL || ""}/${company.subdomain}/login`,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
