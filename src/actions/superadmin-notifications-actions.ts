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

export async function getNotifications(page = 1): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const limit = 30;
    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count(),
    ]);
    return {
      success: true,
      data: {
        items: items.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), sentAt: n.sentAt?.toISOString() || null })),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function sendNotification(input: {
  title: string;
  body: string;
  type: string;
  channel: string;
  isGlobal: boolean;
  companyId?: string;
  companyName?: string;
}): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    await prisma.notification.create({
      data: {
        title: input.title,
        body: input.body,
        type: input.type as any,
        channel: input.channel as any,
        isGlobal: input.isGlobal,
        companyId: input.isGlobal ? null : (input.companyId || null),
        companyName: input.isGlobal ? "Barcha kompaniyalar" : (input.companyName || null),
        createdById: session.user.id,
        sentAt: new Date(),
      },
    });

    // Xabarnoma yuborilishi log qilinadi
    await prisma.activityLog.create({
      data: {
        action: "notification_sent",
        description: `"${input.title}" xabari ${input.isGlobal ? "barcha kompaniyalarga" : input.companyName || "kompaniyaga"} yuborildi`,
        companyId: input.isGlobal ? null : input.companyId,
      },
    });

    return { success: true, message: "Xabar yuborildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.notification.delete({ where: { id } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
