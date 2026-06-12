"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

// ── Mijoz uchun mahsulotlar (vitrina) ─────────────────────────
export async function getCustomerProducts(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);

    let products;

    if (session?.user?.companyId) {
      // Kompaniyaga bog'langan mijoz — faqat shu kompaniya mahsulotlari
      products = await prisma.product.findMany({
        where: { companyId: session.user.companyId, isActive: true },
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      });
    } else {
      // Erkin mijoz yoki session yo'q — barcha faol kompaniyalar mahsulotlari
      products = await prisma.product.findMany({
        where: {
          isActive: true,
          company: { status: "ACTIVE" },
        },
        orderBy: { createdAt: "desc" },
        include: { company: { select: { name: true } } },
      });
    }

    return { success: true, data: products as any };
  } catch (error) {
    return { success: false, error: "Mahsulotlar yuklanmadi" };
  }
}

// ── Mijoz profili ─────────────────────────────────────────────
export async function getCustomerProfile(): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    // Customer-ni telefon bo'yicha topish
    let customer;
    if (session.user.companyId) {
      customer = await prisma.customer.findFirst({
        where: { companyId: session.user.companyId, phone1: session.user.phone },
      });
    } else {
      customer = await prisma.customer.findFirst({
        where: { phone1: session.user.phone },
      });
    }

    if (customer) {
      return { success: true, data: customer };
    }

    // Customer topilmasa — bo'sh qaytarish
    return { success: true, data: { address: "", landmark: "", locationLink: "" } };
  } catch (error) {
    return { success: false, error: "Profil yuklanmadi" };
  }
}

// ── Manzilni yangilash ────────────────────────────────────────
export async function updateCustomerAddress(input: { address: string; landmark?: string; locationLink?: string }): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    // Customer-ni telefon bo'yicha topish (companyId bor yoki yo'q)
    let customer;
    if (session.user.companyId) {
      customer = await prisma.customer.findFirst({
        where: { companyId: session.user.companyId, phone1: session.user.phone },
      });
    } else {
      // Erkin customer — phone bo'yicha birinchi topilgan
      customer = await prisma.customer.findFirst({
        where: { phone1: session.user.phone },
      });
    }

    if (customer) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          address: input.address,
          landmark: input.landmark || null,
          locationLink: input.locationLink || null,
        },
      });
      return { success: true, message: "Manzil yangilandi" };
    }

    // Customer topilmasa — yangi yaratish (erkin user uchun)
    // Erkin customer uchun birinchi faol kompaniyaga bog'laymiz yoki xato qaytaramiz
    return { success: false, error: "Mijoz profili topilmadi. Avval buyurtma bering." };
  } catch (error) {
    return { success: false, error: "Manzilni yangilashda xatolik" };
  }
}

// ── Mijoz buyurtmalari tarixi ─────────────────────────────────
export async function getCustomerOrders(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    let customer;
    if (session.user.companyId) {
      customer = await prisma.customer.findFirst({ where: { companyId: session.user.companyId, phone1: session.user.phone } });
    } else {
      customer = await prisma.customer.findFirst({ where: { phone1: session.user.phone } });
    }

    if (!customer) return { success: true, data: [] };

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: { include: { product: { select: { name: true, isBottle: true } } } },
        driver: { select: { name: true, phone: true } },
      },
    });

    return { success: true, data: orders as any };
  } catch (error) {
    return { success: false, error: "Buyurtmalar yuklanmadi" };
  }
}

// ── Idish balansi ─────────────────────────────────────────────
export async function getCustomerBalance(): Promise<ActionResult<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    let customer;
    if (session.user.companyId) {
      customer = await prisma.customer.findFirst({ where: { companyId: session.user.companyId, phone1: session.user.phone } });
    } else {
      customer = await prisma.customer.findFirst({ where: { phone1: session.user.phone } });
    }

    if (!customer) return { success: true, data: { bottleBalance: 0, debtBalance: 0 } };

    return {
      success: true,
      data: {
        bottleBalance: customer.bottleBalance,
        debtBalance: customer.debtBalance,
      },
    };
  } catch (error) {
    return { success: false, error: "Balans yuklanmadi" };
  }
}

// ── Mijoz buyurtma berish ─────────────────────────────────────
interface PlaceOrderInput {
  items: { productId: string; quantity: number }[];
  notes?: string;
}

export async function placeCustomerOrder(input: PlaceOrderInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, error: "Tizimga kiring" };

    // Mahsulotlarni olish (companyId bo'lsa shu kompaniya, bo'lmasa barcha)
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length === 0) return { success: false, error: "Mahsulotlar topilmadi" };

    // Cross-tenant tekshiruvi: barcha mahsulotlar bir kompaniyaga tegishli bo'lishi shart
    const firstCompanyId = products[0].companyId;
    const hasMixedCompanies = products.some((p) => p.companyId !== firstCompanyId);
    if (hasMixedCompanies) {
      return { success: false, error: "Faqat bitta kompaniya mahsulotlarini buyurtma qilish mumkin" };
    }

    // Buyurtma qaysi kompaniyaga tegishli (mahsulotning kompaniyasidan olinadi)
    const companyId = products[0].companyId;

    // Mijozni topish
    let customer = await prisma.customer.findFirst({
      where: { phone1: session.user.phone, companyId },
    });

    if (!customer) {
      // Agar customer yo'q bo'lsa — yaratamiz
      customer = await prisma.customer.create({
        data: {
          name: session.user.name || "Mijoz",
          phone1: session.user.phone,
          address: "Manzil kiritilmagan",
          companyId,
        },
      });
    }

    // Hisoblash
    let totalAmount = 0;
    let totalBottles = 0;
    const orderItems = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error("Mahsulot topilmadi");
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      if (product.isBottle) totalBottles += item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice: product.price, totalPrice: itemTotal };
    });

    // Yaratish
    await prisma.$transaction(async (tx) => {
      const lastOrder = await tx.order.findFirst({
        where: { companyId },
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

      await tx.order.create({
        data: {
          orderNumber: nextOrderNumber,
          companyId,
          customerId: customer!.id,
          totalAmount,
          bottlesDelivered: totalBottles,
          notes: input.notes || null,
          status: "PENDING",
          items: { create: orderItems },
        },
      });
    });

    return { success: true, message: "Buyurtma qabul qilindi!" };
  } catch (error) {
    return { success: false, error: "Buyurtma berishda xatolik" };
  }
}
