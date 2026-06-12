"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

// ── Auth yordamchi funksiyasi ─────────────────────────────────
async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Ruxsat yo'q");
  }
  return session;
}

function handleError(error: unknown, fallback: string): ActionResult {
  console.error(`[company-actions] ${fallback}`, error);
  if (error instanceof Error && error.message === "Ruxsat yo'q") {
    return { success: false, error: "Ruxsat yo'q" };
  }
  return { success: false, error: fallback };
}

// ── Plan/tarif aniqlash (subscription summasiga qarab) ─────────
function getPlanFromAmount(amount: number, daysLeft: number | null): string {
  if (daysLeft !== null && daysLeft <= 0) return "free";
  if (daysLeft !== null && daysLeft <= 7) return "trial";
  if (amount >= 500000) return "enterprise";
  if (amount >= 200000) return "business";
  if (amount > 0) return "trial";
  return "free";
}

// ── Kompaniyalar ro'yxati (kengaytirilgan + tushum + faollik) ─
export async function getCompanies(): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();

    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "DIRECTOR" },
          select: { id: true, name: true, phone: true },
          take: 1,
        },
        _count: { select: { users: true, customers: true, orders: true } },
        subscription: {
          select: { endDate: true, isPaid: true, amount: true },
        },
      },
    });

    // Oylik tushum va oxirgi faollikni bir so'rovda olamiz
    const companyIds = companies.map((c) => c.id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [monthlyRevenues, totalRevenues, lastOrders, lastLogins] = await Promise.all([
      // Oylik tushum (kompaniya bo'yicha)
      prisma.order.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds }, status: "DELIVERED", deliveredAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      // Jami tushum
      prisma.order.groupBy({
        by: ["companyId"],
        where: { companyId: { in: companyIds }, status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      // Oxirgi buyurtma vaqti
      prisma.order.findMany({
        where: { companyId: { in: companyIds } },
        orderBy: { createdAt: "desc" },
        distinct: ["companyId"],
        select: { companyId: true, createdAt: true },
      }),
      // Oxirgi kirish (ActivityLog orqali)
      prisma.activityLog.findMany({
        where: { companyId: { in: companyIds }, action: "user_login" },
        orderBy: { createdAt: "desc" },
        distinct: ["companyId"],
        select: { companyId: true, createdAt: true },
      }),
    ]);

    const monthlyMap = Object.fromEntries(monthlyRevenues.map((r) => [r.companyId, r._sum.totalAmount || 0]));
    const totalMap = Object.fromEntries(totalRevenues.map((r) => [r.companyId, r._sum.totalAmount || 0]));
    const lastOrderMap = Object.fromEntries(lastOrders.map((o) => [o.companyId, o.createdAt.toISOString()]));
    const lastLoginMap = Object.fromEntries(lastLogins.map((l) => [l.companyId, l.createdAt.toISOString()]));

    const formatted = companies.map((c) => {
      const daysLeft = c.subscription
        ? Math.ceil((new Date(c.subscription.endDate).getTime() - now.getTime()) / 86400000)
        : null;

      return {
        id: c.id,
        name: c.name,
        subdomain: c.subdomain,
        status: c.status,
        phone: c.phone,
        maxCustomers: c.maxCustomers,
        maxUsers: c.maxUsers,
        createdAt: c.createdAt.toISOString(),
        director: c.users[0] || null,
        _count: c._count,
        subscription: c.subscription
          ? {
              endDate: c.subscription.endDate.toISOString(),
              isPaid: c.subscription.isPaid,
              amount: c.subscription.amount,
            }
          : null,
        // Yangi maydonlar
        plan: getPlanFromAmount(c.subscription?.amount || 0, daysLeft),
        monthlyRevenue: monthlyMap[c.id] || 0,
        totalRevenue: totalMap[c.id] || 0,
        lastOrderAt: lastOrderMap[c.id] || null,
        lastLoginAt: lastLoginMap[c.id] || null,
      };
    });

    return { success: true, data: formatted };
  } catch (error) {
    return handleError(error, "Kompaniyalar yuklanmadi") as ActionResult<any[]>;
  }
}

// ── Umumiy statistika (sahifa yuqori panel uchun) ─────────────
export async function getCompaniesOverview(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      expiringCompanies,
      monthlyRevenue,
      recentActivity,
      newThisMonth,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: "ACTIVE" } }),
      prisma.company.count({ where: { status: "SUSPENDED" } }),
      // Obunasi 7 kun ichida tugaydigan kompaniyalar
      prisma.subscription.count({
        where: { endDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } },
      }),
      // Bu oylik jami tushum
      prisma.order.aggregate({
        where: { status: "DELIVERED", deliveredAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      // So'nggi 7 kunda faol kompaniyalar soni
      prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        distinct: ["companyId"],
        select: { companyId: true },
      }),
      // Bu oy qo'shilgan kompaniyalar
      prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Plan bo'yicha taqsimot
    const allSubs = await prisma.subscription.findMany({
      select: { companyId: true, amount: true, endDate: true },
    });

    let trialCount = 0;
    let freeCount = 0;
    let businessCount = 0;
    let enterpriseCount = 0;

    allSubs.forEach((s) => {
      const daysLeft = Math.ceil((s.endDate.getTime() - now.getTime()) / 86400000);
      const plan = getPlanFromAmount(s.amount, daysLeft);
      if (plan === "trial") trialCount++;
      else if (plan === "free") freeCount++;
      else if (plan === "business") businessCount++;
      else if (plan === "enterprise") enterpriseCount++;
    });

    // Subscriptionsi yo'q kompaniyalar
    const noSubCount = totalCompanies - allSubs.length;
    freeCount += noSubCount;

    return {
      success: true,
      data: {
        totalCompanies,
        activeCompanies,
        suspendedCompanies,
        expiringCompanies,
        monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
        activeLastWeek: recentActivity.length,
        newThisMonth,
        plans: { trial: trialCount, free: freeCount, business: businessCount, enterprise: enterpriseCount },
      },
    };
  } catch (error) {
    return handleError(error, "Statistika yuklanmadi") as ActionResult<any>;
  }
}

// ── Kompaniya activity logs ────────────────────────────────────
export async function getCompanyLogs(companyId: string, limit = 30): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();

    const logs = await prisma.activityLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, action: true, description: true, createdAt: true, metadata: true },
    });

    return {
      success: true,
      data: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    };
  } catch (error) {
    return handleError(error, "Loglar yuklanmadi") as ActionResult<any[]>;
  }
}

// ── Bulk actions (bir nechta kompaniya) ───────────────────────
export async function bulkCompanyAction(
  companyIds: string[],
  action: "activate" | "suspend" | "delete"
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    if (!companyIds.length) return { success: false, error: "Kompaniya tanlanmagan" };

    if (action === "delete") {
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
      return { success: true, message: `${companyIds.length} ta kompaniya o'chirildi` };
    }

    const newStatus = action === "activate" ? "ACTIVE" : "SUSPENDED";
    await prisma.company.updateMany({
      where: { id: { in: companyIds } },
      data: { status: newStatus },
    });

    // Log yozish
    await prisma.activityLog.createMany({
      data: companyIds.map((id) => ({
        action: `bulk_${action}`,
        description: `Bulk action: ${action}`,
        companyId: id,
      })),
    });

    return {
      success: true,
      message: `${companyIds.length} ta kompaniya ${action === "activate" ? "faollashtirildi" : "muzlatildi"}`,
    };
  } catch (error) {
    return handleError(error, "Bulk action xatoligi");
  }
}

// ── Kompaniyani klonlash ──────────────────────────────────────
export async function cloneCompany(
  sourceId: string,
  newName: string,
  newSubdomain: string,
  directorPhone: string,
  directorPassword: string
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const source = await prisma.company.findUnique({
      where: { id: sourceId },
      include: { products: true },
    });
    if (!source) return { success: false, error: "Manba kompaniya topilmadi" };

    const existing = await prisma.company.findUnique({ where: { subdomain: newSubdomain } });
    if (existing) return { success: false, error: "Bu subdomen band" };

    const hashedPassword = await bcrypt.hash(directorPassword, 10);

    await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: newName,
          subdomain: newSubdomain,
          phone: source.phone,
          maxCustomers: source.maxCustomers,
          maxUsers: source.maxUsers,
        },
      });

      await tx.user.create({
        data: {
          name: `${newName} Direktori`,
          phone: directorPhone,
          password: hashedPassword,
          role: "DIRECTOR",
          companyId: newCompany.id,
        },
      });

      // Mahsulotlarni ko'chirish
      if (source.products.length > 0) {
        await tx.product.createMany({
          data: source.products.map((p) => ({
            name: p.name,
            description: p.description,
            imageUrl: p.imageUrl,
            price: p.price,
            category: p.category,
            isBottle: p.isBottle,
            companyId: newCompany.id,
          })),
        });
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await tx.subscription.create({
        data: { companyId: newCompany.id, endDate, isPaid: false },
      });

      await tx.activityLog.create({
        data: {
          action: "company_cloned",
          description: `"${source.name}" dan klonlandi → "${newName}"`,
          companyId: newCompany.id,
        },
      });
    });

    return { success: true, message: `"${newName}" kompaniyasi muvaffaqiyatli yaratildi` };
  } catch (error: any) {
    if (error?.code === "P2002") return { success: false, error: "Bu telefon yoki subdomen band" };
    return handleError(error, "Klonlashda xatolik");
  }
}

// ── Yangi kompaniya yaratish ──────────────────────────────────
interface CreateCompanyInput {
  companyName: string;
  subdomain: string;
  directorName: string;
  directorPhone: string;
  directorPassword: string;
  plan?: string;
}

export async function createCompany(input: CreateCompanyInput): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const existing = await prisma.company.findUnique({ where: { subdomain: input.subdomain } });
    if (existing) return { success: false, error: `"${input.subdomain}" subdomeni allaqachon band` };

    const hashedPassword = await bcrypt.hash(input.directorPassword, 10);

    // Plan asosida initial subscription amount
    const planAmounts: Record<string, number> = {
      free: 0, trial: 50000, business: 200000, enterprise: 500000,
    };
    const amount = planAmounts[input.plan || "trial"] || 0;

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: input.companyName, subdomain: input.subdomain, phone: input.directorPhone },
      });

      await tx.user.create({
        data: {
          name: input.directorName,
          phone: input.directorPhone,
          password: hashedPassword,
          role: "DIRECTOR",
          companyId: company.id,
        },
      });

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await tx.subscription.create({
        data: { companyId: company.id, endDate, isPaid: amount > 0, amount },
      });

      await tx.activityLog.create({
        data: {
          action: "company_created",
          description: `"${input.companyName}" kompaniyasi yaratildi (${input.plan || "trial"} tarif)`,
          companyId: company.id,
        },
      });
    });

    return { success: true, message: "Kompaniya muvaffaqiyatli yaratildi" };
  } catch (error: any) {
    if (error?.code === "P2002") return { success: false, error: "Bu telefon raqami yoki subdomen band" };
    return handleError(error, "Kompaniya yaratishda xatolik yuz berdi");
  }
}

// ── Kompaniya statusini o'zgartirish ──────────────────────────
export async function toggleCompanyStatus(companyId: string): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    const newStatus = company.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    await prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: companyId }, data: { status: newStatus as any } });
      await tx.activityLog.create({
        data: {
          action: newStatus === "ACTIVE" ? "company_activated" : "company_suspended",
          description: `"${company.name}" ${newStatus === "ACTIVE" ? "faollashtirildi" : "muzlatildi"}`,
          companyId,
        },
      });
    });

    return { success: true, message: "Status o'zgartirildi" };
  } catch (error) {
    return handleError(error, "Status o'zgartirishda xatolik");
  }
}

// ── Kompaniya ma'lumotlarini yangilash ────────────────────────
interface UpdateCompanyInput {
  name?: string;
  phone?: string;
  address?: string;
  maxCustomers?: number;
  maxUsers?: number;
}

export async function updateCompany(companyId: string, input: UpdateCompanyInput): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    const updateData: any = {};
    if (input.name) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.maxCustomers) updateData.maxCustomers = input.maxCustomers;
    if (input.maxUsers) updateData.maxUsers = input.maxUsers;

    await prisma.company.update({ where: { id: companyId }, data: updateData });
    return { success: true, message: "Kompaniya yangilandi" };
  } catch (error) {
    return handleError(error, "Yangilashda xatolik");
  }
}

// ── Obuna muddatini uzaytirish ───────────────────────────────
export async function extendSubscription(
  companyId: string,
  months: number,
  amount: number
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    await prisma.$transaction(async (tx) => {
      if (company.subscription) {
        const currentEnd = new Date(company.subscription.endDate);
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        const newEnd = new Date(baseDate);
        newEnd.setMonth(newEnd.getMonth() + months);

        await tx.subscription.update({
          where: { id: company.subscription.id },
          data: { endDate: newEnd, amount: { increment: amount }, isPaid: amount > 0 },
        });

        if (amount > 0) {
          await tx.payment.create({
            data: {
              amount,
              subscriptionId: company.subscription.id,
              description: `${months} oylik obuna`,
            },
          });
        }
      } else {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + months);
        const sub = await tx.subscription.create({
          data: { companyId, endDate, amount, isPaid: amount > 0 },
        });
        if (amount > 0) {
          await tx.payment.create({
            data: { amount, subscriptionId: sub.id, description: `${months} oylik obuna` },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          action: "subscription_extended",
          description: `"${company.name}" obunasi ${months} oyga uzaytirildi`,
          companyId,
        },
      });
    });

    return { success: true, message: "Obuna uzaytirildi" };
  } catch (error) {
    return handleError(error, "Obuna uzaytirishda xatolik");
  }
}

// ── Kompaniya batafsil statistikasi (modal uchun) ─────────────
export async function getCompanyStats(companyId: string): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders, deliveredOrders, revenue, monthlyRevenue,
      totalCustomers, users, recentOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: "DELIVERED" } }),
      prisma.order.aggregate({ where: { companyId, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({
        where: { companyId, status: "DELIVERED", deliveredAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      prisma.customer.count({ where: { companyId } }),
      prisma.user.findMany({
        where: { companyId },
        select: { id: true, name: true, phone: true, role: true, isActive: true },
        orderBy: { role: "asc" },
      }),
      prisma.order.findMany({
        where: { companyId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { name: true } } },
      }),
    ]);

    return {
      success: true,
      data: {
        company: {
          id: company.id, name: company.name, subdomain: company.subdomain,
          status: company.status, createdAt: company.createdAt.toISOString(),
          subscription: company.subscription
            ? { endDate: company.subscription.endDate.toISOString(), isPaid: company.subscription.isPaid, amount: company.subscription.amount }
            : null,
        },
        stats: {
          totalOrders, deliveredOrders,
          totalRevenue: revenue._sum.totalAmount || 0,
          monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
          totalCustomers,
        },
        users,
        recentOrders: recentOrders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
      },
    };
  } catch (error) {
    return handleError(error, "Statistika yuklanmadi") as ActionResult<any>;
  }
}
