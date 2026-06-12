"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getCustomers(search?: string): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const where: any = { companyId: session.user.companyId };

    if (search && search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone1: { contains: search } },
        { phone2: { contains: search } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { orders: true } } },
    });

    return { success: true, data: customers as any };
  } catch (error) {
    console.error("[getCustomers]", error);
    return { success: false, error: "Mijozlar yuklanmadi" };
  }
}(query: string): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };
    if (query.length < 2) return { success: true, data: [] };

    const customers = await prisma.customer.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone1: { contains: query } },
          { phone2: { contains: query } },
        ],
      },
      select: { id: true, name: true, phone1: true, address: true },
      take: 10,
    });

    return { success: true, data: customers };
  } catch (error) {
    console.error("[searchCustomers]", error);
    return { success: false, error: "Qidiruv xatoligi" };
  }
}
  name: string;
  phone1: string;
  phone2?: string;
  address: string;
  landmark?: string;
  locationLink?: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const existing = await prisma.customer.findFirst({
      where: { phone1: input.phone1, companyId: session.user.companyId },
    });
    if (existing) return { success: false, error: "Bu telefon raqamli mijoz allaqachon mavjud" };

    await prisma.customer.create({
      data: {
        name: input.name,
        phone1: input.phone1,
        phone2: input.phone2 || null,
        address: input.address,
        landmark: input.landmark || null,
        locationLink: input.locationLink || null,
        companyId: session.user.companyId,
      },
    });

    return { success: true, message: "Mijoz qo'shildi" };
  } catch (error: any) {
    console.error("[createCustomer]", error);
    if (error?.code === "P2002") return { success: false, error: "Bu telefon raqami band" };
    return { success: false, error: "Mijoz yaratishda xatolik" };
  }
}
