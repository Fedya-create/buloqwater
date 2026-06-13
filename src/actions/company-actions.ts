"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";

// ── Kompaniyalar ro'yxati (kengaytirilgan) ────────────────────
export async function getCompanies(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

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

    const formatted = companies.map((c) => ({
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
        ? { endDate: c.subscription.endDate.toISOString(), isPaid: c.subscription.isPaid, amount: c.subscription.amount }
        : null,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: "Kompaniyalar yuklanmadi" };
  }
}

// ── Yangi kompaniya yaratish ──────────────────────────────────
interface CreateCompanyInput {
  companyName: string;
  subdomain: string;
  directorName: string;
  directorPhone: string;
  directorPassword: string;
}

export async function createCompany(input: CreateCompanyInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

    const existing = await prisma.company.findUnique({ where: { subdomain: input.subdomain } });
    if (existing) return { success: false, error: `"${input.subdomain}" subdomeni allaqachon band` };

    const hashedPassword = await bcrypt.hash(input.directorPassword, 10);

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: input.companyName, subdomain: input.subdomain, phone: input.directorPhone },
      });

      await tx.user.create({
        data: { name: input.directorName, phone: input.directorPhone, password: hashedPassword, role: "DIRECTOR", companyId: company.id },
      });

      // Obuna yaratish (1 oylik default)
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await tx.subscription.create({
        data: { companyId: company.id, endDate, isPaid: false },
      });

      // Activity log
      await tx.activityLog.create({
        data: { action: "company_created", description: `"${input.companyName}" kompaniyasi yaratildi`, companyId: company.id },
      });
    });

    return { success: true, message: "Kompaniya muvaffaqiyatli yaratildi" };
  } catch (error: any) {
    if (error?.code === "P2002") return { success: false, error: "Bu telefon raqami yoki subdomen band" };
    return { success: false, error: "Kompaniya yaratishda xatolik yuz berdi" };
  }
}

// ── Kompaniya statusini o'zgartirish ──────────────────────────
export async function toggleCompanyStatus(companyId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

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
    return { success: false, error: "Status o'zgartirishda xatolik" };
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

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
    return { success: false, error: "Yangilashda xatolik" };
  }
}

// ── Obuna muddatini uzaytirish ───────────────────────────────
export async function extendSubscription(companyId: string, months: number, amount: number): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    await prisma.$transaction(async (tx) => {
      if (company.subscription) {
        // Mavjud obuna — muddatni uzaytirish
        const currentEnd = new Date(company.subscription.endDate);
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        const newEnd = new Date(baseDate);
        newEnd.setMonth(newEnd.getMonth() + months);

        await tx.subscription.update({
          where: { id: company.subscription.id },
          data: {
            endDate: newEnd,
            amount: { increment: amount },
            isPaid: amount > 0,
          },
        });

        // To'lov qayd etish
        if (amount > 0) {
          await tx.payment.create({
            data: { amount, subscriptionId: company.subscription.id, description: `${months} oylik obuna` },
          });
        }
      } else {
        // Yangi obuna yaratish
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

      // Activity log
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
    return { success: false, error: "Obuna uzaytirishda xatolik" };
  }
}

// ── Kompaniya statistikasi (batafsil) ─────────────────────────
export async function getCompanyStats(companyId: string): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN")
      return { success: false, error: "Ruxsat yo'q" };

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: { select: { endDate: true, isPaid: true, amount: true } } },
    });
    if (!company) return { success: false, error: "Kompaniya topilmadi" };

    const [totalOrders, deliveredOrders, revenue, totalCustomers, users, recentOrders, products] = await Promise.all([
      prisma.order.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: "DELIVERED" } }),
      prisma.order.aggregate({ where: { companyId, status: "DELIVERED" }, _sum: { totalAmount: true } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.user.findMany({ where: { companyId }, select: { id: true, name: true, phone: true, role: true, isActive: true }, orderBy: { role: "asc" } }),
      prisma.order.findMany({ where: { companyId }, take: 10, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } }),
      prisma.product.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    ]);

    return {
      success: true,
      data: {
        company: { id: company.id, name: company.name, subdomain: company.subdomain, status: company.status, createdAt: company.createdAt.toISOString(), subscription: company.subscription },
        stats: { totalOrders, deliveredOrders, totalRevenue: revenue._sum.totalAmount || 0, totalCustomers },
        users,
        recentOrders: recentOrders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
        products,
      },
    };
  } catch (error) {
    return { success: false, error: "Statistika yuklanmadi" };
  }
}
