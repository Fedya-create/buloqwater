import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";

// Ruxsat etilgan fayl turlari
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
// Maksimal fayl hajmi: 4 MB
const MAX_SIZE_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Auth tekshiruvi — faqat login qilgan foydalanuvchilar
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
    }

    // Faqat DIRECTOR va SUPER_ADMIN ruxsat etiladi
    if (session.user.role !== "DIRECTOR" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fayl tanlanmagan" }, { status: 400 });
    }

    // Fayl turi tekshiruvi
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Faqat JPG, PNG, WEBP yoki SVG formatdagi rasmlar yuklanishi mumkin" },
        { status: 400 }
      );
    }

    // Fayl hajmi tekshiruvi
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fayl hajmi 4 MB dan oshmasligi kerak" },
        { status: 400 }
      );
    }

    // Xavfsiz fayl nomi — original nom o'rniga UUID ishlatamiz
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeFileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const blob = await put(safeFileName, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json(
      { error: "Fayl yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

// GET so'rovlarini rad etish
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
