"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getTickets(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
      },
    });

    return {
      success: true,
      data: tickets.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        resolvedAt: t.resolvedAt?.toISOString() || null,
        replies: t.replies.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    };
  } catch (error) {
    return { success: false, error: "Tiketlar yuklanmadi" };
  }
}

interface CreateTicketInput {
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  companyId?: string;
  companyName?: string;
  userName?: string;
  userPhone?: string;
}

export async function createTicket(input: CreateTicketInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.supportTicket.create({
      data: {
        subject: input.subject,
        description: input.description,
        priority: input.priority,
        companyId: input.companyId || null,
        companyName: input.companyName || null,
        userName: input.userName || session.user.name,
        userPhone: input.userPhone || session.user.phone,
      },
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Tiket yaratishda xatolik" };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const updateData: any = { status };
    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: "Status yangilashda xatolik" };
  }
}

export async function replyToTicket(ticketId: string, message: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.ticketReply.create({
      data: {
        ticketId,
        message,
        isAdmin: true,
        authorName: session.user.name || "Super Admin",
      },
    });

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Javob yuborishda xatolik" };
  }
}

export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.supportTicket.delete({ where: { id: ticketId } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "O'chirishda xatolik" };
  }
}
