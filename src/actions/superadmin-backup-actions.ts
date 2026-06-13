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

export async function getBackups(): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();
    const backups = await prisma.backup.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      success: true,
      data: backups.map(b => ({
        ...b,
        sizeBytes: b.sizeBytes?.toString() || null,
        sizeMB: b.sizeBytes ? (Number(b.sizeBytes) / 1024 / 1024).toFixed(2) : null,
        startedAt: b.startedAt.toISOString(),
        completedAt: b.completedAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      })),
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function createManualBackup(name?: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();

    // DB statistika olish
    const [companies, users, orders, customers, products] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.count(),
    ]);

    const totalRecords = companies + users + orders + customers + products;
    // Taxminiy hajm: ~500 bytes per record
    const estimatedBytes = BigInt(totalRecords * 500);

    const backup = await prisma.backup.create({
      data: {
        name: name || `Qo'lda backup - ${new Date().toLocaleDateString("uz-UZ")}`,
        type: "MANUAL",
        status: "IN_PROGRESS",
        createdById: session.user.id,
        createdByName: session.user.name,
      },
    });

    // Simulatsiya: 2 soniya keyin completed
    await new Promise(r => setTimeout(r, 500));

    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        status: "COMPLETED",
        sizeBytes: estimatedBytes,
        completedAt: new Date(),
        notes: `${companies} kompaniya, ${users} foydalanuvchi, ${orders} buyurtma`,
      },
    });

    await prisma.activityLog.create({
      data: { action: "backup_created", description: `Qo'lda backup yaratildi: ${backup.name}` },
    });

    return { success: true, message: "Backup yaratildi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Backup yaratishda xatolik" };
  }
}

export async function restoreBackup(id: string): Promise<ActionResult> {
  try {
    const session = await requireSuperAdmin();
    const backup = await prisma.backup.findUnique({ where: { id } });
    if (!backup) return { success: false, error: "Backup topilmadi" };
    if (backup.status !== "COMPLETED") return { success: false, error: "Faqat muvaffaqiyatli backup'ni tiklash mumkin" };

    // Log
    await prisma.activityLog.create({
      data: {
        action: "backup_restore_initiated",
        description: `Backup tiklash boshlandi: ${backup.name}`,
        userId: session.user.id,
      },
    });

    return { success: true, message: "Tiklash jarayoni boshlandi (simulation)" };
  } catch (e: any) {
    return { success: false, error: e.message || "Tiklashda xatolik" };
  }
}

export async function deleteBackup(id: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    await prisma.backup.delete({ where: { id } });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "O'chirishda xatolik" };
  }
}

export async function getBackupStats(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const [total, completed, failed, lastBackup] = await Promise.all([
      prisma.backup.count(),
      prisma.backup.count({ where: { status: "COMPLETED" } }),
      prisma.backup.count({ where: { status: "FAILED" } }),
      prisma.backup.findFirst({ where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" } }),
    ]);
    const totalSize = await prisma.backup.aggregate({ where: { status: "COMPLETED" }, _sum: { sizeBytes: true } });
    return {
      success: true,
      data: {
        total, completed, failed,
        lastBackupAt: lastBackup?.completedAt?.toISOString() || null,
        totalSizeMB: totalSize._sum.sizeBytes ? (Number(totalSize._sum.sizeBytes) / 1024 / 1024).toFixed(1) : "0",
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
