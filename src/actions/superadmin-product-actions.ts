"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getGlobalProducts(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    // Barcha kompaniyalardagi mahsulotlarni ko'rsatish
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true, subdomain: true } },
      },
    });

    const formatted = products.map(p => ({ ...p, tags: extractTags(p.description) }));
    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: "Mahsulotlar yuklanmadi" };
  }
}

interface GlobalProductInput {
  name: string;
  description?: string;
  price: number;
  category: "WATER" | "PROMO" | "ACCESSORIES";
  tags: string[];
  isBottle: boolean;
}

export async function createGlobalProduct(input: GlobalProductInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    let globalCompany = await prisma.company.findUnique({ where: { subdomain: "global-templates" } });
    if (!globalCompany) {
      globalCompany = await prisma.company.create({
        data: { name: "Global Templates", subdomain: "global-templates", status: "ACTIVE" },
      });
    }

    const desc = input.tags.length > 0
      ? (input.description ? `${input.description}\n#${input.tags.join(" #")}` : `#${input.tags.join(" #")}`)
      : input.description || null;

    await prisma.product.create({
      data: { name: input.name, description: desc, price: input.price, category: input.category, isBottle: input.isBottle, companyId: globalCompany.id },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Yaratishda xatolik" };
  }
}

export async function updateGlobalProduct(productId: string, input: GlobalProductInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    // Ownership tekshiruvi: faqat global-templates kompaniyasining mahsuloti o'zgartirilsin
    const product = await prisma.product.findFirst({
      where: { id: productId, company: { subdomain: "global-templates" } },
    });
    if (!product) return { success: false, error: "Mahsulot topilmadi yoki ruxsat yo'q" };

    const desc = input.tags.length > 0
      ? (input.description ? `${input.description}\n#${input.tags.join(" #")}` : `#${input.tags.join(" #")}`)
      : input.description || null;

    await prisma.product.update({
      where: { id: productId },
      data: { name: input.name, description: desc, price: input.price, category: input.category, isBottle: input.isBottle },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Yangilashda xatolik" };
  }
}

export async function deleteGlobalProduct(productId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") return { success: false, error: "Ruxsat yo'q" };

    // Ownership tekshiruvi: faqat global-templates kompaniyasining mahsuloti o'chirilsin
    const product = await prisma.product.findFirst({
      where: { id: productId, company: { subdomain: "global-templates" } },
    });
    if (!product) return { success: false, error: "Mahsulot topilmadi yoki ruxsat yo'q" };

    await prisma.product.delete({ where: { id: productId } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "O'chirishda xatolik" };
  }
}

function extractTags(description: string | null): string[] {
  if (!description) return [];
  const matches = description.match(/#(\w+)/g);
  return matches ? matches.map(m => m.replace("#", "")) : [];
}
