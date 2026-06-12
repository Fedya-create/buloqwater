"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getOrders(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const orders = await prisma.order.findMany({
      where: {
        companyId: session.user.companyId,
        OR: [
          { status: { in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] } },
          { status: "DELIVERED", deliveredAt: { gte: twoDaysAgo } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, phone1: true, address: true, landmark: true, locationLink: true } },
        driver: { select: { id: true, name: true, phone: true } },
        operator: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    return { success: true, data: orders as any };
  } catch (error) {
    return { success: false, error: "Buyurtmalar yuklanmadi" };
  }
}

export async function getDriversForAssign(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drivers = await prisma.user.findMany({
      where: { companyId: session.user.companyId, role: "DRIVER", isActive: true },
      select: {
        id: true, name: true, phone: true,
        _count: {
          select: { assignedOrders: { where: { status: { in: ["ASSIGNED", "IN_TRANSIT"] }, createdAt: { gte: today } } } },
        },
      },
    });

    const formatted = drivers.map((d) => ({
      id: d.id, name: d.name, phone: d.phone, ordersCount: d._count.assignedOrders,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    return { success: false, error: "Haydovchilar yuklanmadi" };
  }
}

interface CreateOrderInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
}

export async function createOrder(input: CreateOrderInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const companyId = session.user.companyId;
    const productIds = input.items.map((i) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, companyId } });

    if (products.length === 0) return { success: false, error: "Mahsulotlar topilmadi" };

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
          customerId: input.customerId,
          operatorId: session.user.id,
          totalAmount,
          bottlesDelivered: totalBottles,
          status: "PENDING",
          items: { create: orderItems },
        },
      });
    });

    return { success: true, message: "Buyurtma yaratildi" };
  } catch (error) {
    return { success: false, error: "Buyurtma yaratishda xatolik" };
  }
}

export async function assignDriver(orderId: string, driverId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const order = await prisma.order.findFirst({ where: { id: orderId, companyId: session.user.companyId } });
    if (!order) return { success: false, error: "Buyurtma topilmadi" };

    await prisma.order.update({ where: { id: orderId }, data: { driverId, status: "ASSIGNED" } });

    return { success: true, message: "Haydovchi biriktirildi" };
  } catch (error) {
    return { success: false, error: "Biriktirish xatoligi" };
  }
}

interface DeliverOrderInput {
  orderId: string;
  paymentType: "CASH" | "CLICK" | "CREDIT";
  bottlesReturned: number;
}

export async function deliverOrder(input: DeliverOrderInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const order = await prisma.order.findFirst({
      where: {
        id: input.orderId,
        companyId: session.user.companyId,
        driverId: session.user.id,
      },
      include: { customer: true },
    });
    if (!order) return { success: false, error: "Buyurtma topilmadi yoki ruxsat yo'q" };

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: input.orderId },
        data: {
          status: "DELIVERED",
          paymentType: input.paymentType,
          bottlesReturned: input.bottlesReturned,
          paidAmount: input.paymentType === "CREDIT" ? 0 : order.totalAmount,
          deliveredAt: new Date(),
        },
      });

      const bottleChange = order.bottlesDelivered - input.bottlesReturned;
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          bottleBalance: { increment: bottleChange },
          ...(input.paymentType === "CREDIT" ? { debtBalance: { increment: order.totalAmount } } : {}),
        },
      });
    });

    return { success: true, message: "Buyurtma yetkazildi" };
  } catch (error) {
    return { success: false, error: "Yetkazishda xatolik" };
  }
}

export async function getDriverOrders(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) return { success: false, error: "Ruxsat yo'q" };

    const orders = await prisma.order.findMany({
      where: {
        companyId: session.user.companyId,
        driverId: session.user.id,
        status: { in: ["ASSIGNED", "IN_TRANSIT"] },
      },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { id: true, name: true, phone1: true, phone2: true, address: true, landmark: true, locationLink: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });

    return { success: true, data: orders as any };
  } catch (error) {
    return { success: false, error: "Buyurtmalar yuklanmadi" };
  }
}
