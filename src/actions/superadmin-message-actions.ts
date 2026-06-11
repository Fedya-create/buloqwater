"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

export async function getMessages(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const messages = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: messages.map((m) => ({
        ...m,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, error: "Xabarlar yuklanmadi" };
  }
}

interface SendMessageInput {
  title: string;
  content: string;
  type: "INFO" | "WARNING" | "URGENT" | "ANNOUNCEMENT";
  isGlobal: boolean;
  companyId?: string;
  companyName?: string;
}

export async function sendMessage(input: SendMessageInput): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    if (input.isGlobal) {
      const companies = await prisma.company.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true },
      });

      await prisma.message.createMany({
        data: companies.map((company) => ({
          title: input.title,
          content: input.content,
          type: input.type,
          isGlobal: true,
          companyId: company.id,
          companyName: company.name,
        })),
      });

      await prisma.message.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          isGlobal: true,
          companyId: null,
          companyName: "Barcha kompaniyalar",
        },
      });
    } else {
      await prisma.message.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          isGlobal: false,
          companyId: input.companyId || null,
          companyName: input.companyName || null,
        },
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: "Xabar yuborishda xatolik" };
  }
}

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    await prisma.message.delete({ where: { id: messageId } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "O'chirishda xatolik" };
  }
}

export async function getCompaniesForMessage(): Promise<ActionResult<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Ruxsat yo'q" };
    }

    const companies = await prisma.company.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: "asc" },
    });

    return { success: true, data: companies };
  } catch (error) {
    return { success: false, error: "Kompaniyalar yuklanmadi" };
  }
}
