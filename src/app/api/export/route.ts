import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.companyId) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily";

    let csvContent = "";
    let filename = "";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (type) {
      case "daily": {
        filename = `kunlik-hisobot-${today.toISOString().split("T")[0]}.csv`;
        const orders = await prisma.order.findMany({
          where: { companyId, createdAt: { gte: today } },
          include: {
            customer: { select: { name: true, phone1: true, address: true } },
            driver: { select: { name: true } },
            items: { include: { product: { select: { name: true } } } },
          },
          orderBy: { createdAt: "asc" },
        });

        csvContent = "Buyurtma #,Mijoz,Telefon,Manzil,Mahsulotlar,Jami (so'm),To'lov turi,Status,Haydovchi,Vaqt\n";
        orders.forEach((o) => {
          const items = o.items.map((i) => `${i.product.name} x${i.quantity}`).join("; ");
          const payType = o.paymentType === "CASH" ? "Naqd" : o.paymentType === "CLICK" ? "Click/Payme" : o.paymentType === "CREDIT" ? "Qarz" : "-";
          const status = o.status === "PENDING" ? "Kutilmoqda" : o.status === "ASSIGNED" ? "Biriktirilgan" : o.status === "IN_TRANSIT" ? "Yo'lda" : o.status === "DELIVERED" ? "Yetkazildi" : "Bekor";
          csvContent += `${o.orderNumber},"${o.customer.name}",${o.customer.phone1},"${o.customer.address}","${items}",${o.totalAmount},${payType},${status},${o.driver?.name || "-"},${o.createdAt.toLocaleTimeString("uz-UZ")}\n`;
        });
        break;
      }

      case "weekly": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filename = `haftalik-hisobot-${today.toISOString().split("T")[0]}.csv`;

        const orders = await prisma.order.findMany({
          where: { companyId, createdAt: { gte: weekAgo } },
          include: {
            customer: { select: { name: true, phone1: true } },
            driver: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        csvContent = "Sana,Buyurtma #,Mijoz,Telefon,Jami (so'm),To'lov turi,Status,Haydovchi\n";
        orders.forEach((o) => {
          const payType = o.paymentType === "CASH" ? "Naqd" : o.paymentType === "CLICK" ? "Click/Payme" : o.paymentType === "CREDIT" ? "Qarz" : "-";
          const status = o.status === "DELIVERED" ? "Yetkazildi" : o.status === "CANCELLED" ? "Bekor" : "Jarayonda";
          csvContent += `${o.createdAt.toLocaleDateString("uz-UZ")},${o.orderNumber},"${o.customer.name}",${o.customer.phone1},${o.totalAmount},${payType},${status},${o.driver?.name || "-"}\n`;
        });
        break;
      }

      case "monthly": {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filename = `oylik-hisobot-${today.toISOString().split("T")[0]}.csv`;

        const orders = await prisma.order.findMany({
          where: { companyId, createdAt: { gte: monthStart } },
          include: {
            customer: { select: { name: true, phone1: true } },
            driver: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        csvContent = "Sana,Buyurtma #,Mijoz,Telefon,Jami (so'm),To'lov turi,Status,Haydovchi\n";
        orders.forEach((o) => {
          const payType = o.paymentType === "CASH" ? "Naqd" : o.paymentType === "CLICK" ? "Click/Payme" : o.paymentType === "CREDIT" ? "Qarz" : "-";
          const status = o.status === "DELIVERED" ? "Yetkazildi" : o.status === "CANCELLED" ? "Bekor" : "Jarayonda";
          csvContent += `${o.createdAt.toLocaleDateString("uz-UZ")},${o.orderNumber},"${o.customer.name}",${o.customer.phone1},${o.totalAmount},${payType},${status},${o.driver?.name || "-"}\n`;
        });
        break;
      }

      case "debts": {
        filename = `qarzlar-${today.toISOString().split("T")[0]}.csv`;
        const customers = await prisma.customer.findMany({
          where: { companyId, debtBalance: { gt: 0 } },
          orderBy: { debtBalance: "desc" },
          select: { name: true, phone1: true, phone2: true, address: true, debtBalance: true, bottleBalance: true },
        });

        csvContent = "Mijoz,Telefon 1,Telefon 2,Manzil,Qarz (so'm),Idishlar\n";
        customers.forEach((c) => {
          csvContent += `"${c.name}",${c.phone1},${c.phone2 || "-"},"${c.address}",${c.debtBalance},${c.bottleBalance}\n`;
        });
        break;
      }

      case "bottles": {
        filename = `idishlar-${today.toISOString().split("T")[0]}.csv`;
        const customers = await prisma.customer.findMany({
          where: { companyId, bottleBalance: { gt: 0 } },
          orderBy: { bottleBalance: "desc" },
          select: { name: true, phone1: true, phone2: true, address: true, bottleBalance: true, debtBalance: true },
        });

        csvContent = "Mijoz,Telefon 1,Telefon 2,Manzil,Qaytarilmagan idishlar,Qarz (so'm)\n";
        customers.forEach((c) => {
          csvContent += `"${c.name}",${c.phone1},${c.phone2 || "-"},"${c.address}",${c.bottleBalance},${c.debtBalance}\n`;
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Noto'g'ri hisobot turi" }, { status: 400 });
    }

    const bom = "\uFEFF";
    const blob = bom + csvContent;

    return new NextResponse(blob, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Hisobot yaratishda xatolik" }, { status: 500 });
  }
}
