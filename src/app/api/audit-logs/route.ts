import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
    }

    const logs = await prisma.activityLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true, subdomain: true } } },
    });

    return NextResponse.json({
      logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    });
  } catch {
    return NextResponse.json({ error: "Xatolik" }, { status: 500 });
  }
}
