"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") throw new Error("Ruxsat yo'q");
  return session;
}

const DEFAULT_PERMISSIONS = [
  // Users
  { key: "users.view", label: "Foydalanuvchilarni ko'rish", category: "users" },
  { key: "users.create", label: "Foydalanuvchi yaratish", category: "users" },
  { key: "users.update", label: "Foydalanuvchini tahrirlash", category: "users" },
  { key: "users.delete", label: "Foydalanuvchini o'chirish", category: "users" },
  // Orders
  { key: "orders.view", label: "Buyurtmalarni ko'rish", category: "orders" },
  { key: "orders.create", label: "Buyurtma yaratish", category: "orders" },
  { key: "orders.update", label: "Buyurtmani yangilash", category: "orders" },
  { key: "orders.assign", label: "Haydovchiga biriktirish", category: "orders" },
  { key: "orders.deliver", label: "Yetkazib berildi belgilash", category: "orders" },
  { key: "orders.cancel", label: "Bekor qilish", category: "orders" },
  // Customers
  { key: "customers.view", label: "Mijozlarni ko'rish", category: "customers" },
  { key: "customers.create", label: "Mijoz yaratish", category: "customers" },
  { key: "customers.update", label: "Mijozni tahrirlash", category: "customers" },
  { key: "customers.delete", label: "Mijozni o'chirish", category: "customers" },
  // Products
  { key: "products.view", label: "Mahsulotlarni ko'rish", category: "products" },
  { key: "products.create", label: "Mahsulot yaratish", category: "products" },
  { key: "products.update", label: "Mahsulotni yangilash", category: "products" },
  { key: "products.delete", label: "Mahsulotni o'chirish", category: "products" },
  // Reports
  { key: "reports.view", label: "Hisobotlarni ko'rish", category: "reports" },
  { key: "reports.export", label: "Hisobotni yuklab olish", category: "reports" },
  // Settings
  { key: "settings.view", label: "Sozlamalarni ko'rish", category: "settings" },
  { key: "settings.update", label: "Sozlamalarni o'zgartirish", category: "settings" },
  // Staff
  { key: "staff.view", label: "Xodimlarni ko'rish", category: "staff" },
  { key: "staff.create", label: "Xodim qo'shish", category: "staff" },
  { key: "staff.update", label: "Xodimni tahrirlash", category: "staff" },
  { key: "staff.delete", label: "Xodimni o'chirish", category: "staff" },
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  DIRECTOR: DEFAULT_PERMISSIONS.map(p => p.key),
  OPERATOR: [
    "orders.view", "orders.create", "orders.update", "orders.assign", "orders.cancel",
    "customers.view", "customers.create", "customers.update",
    "products.view",
    "reports.view",
    "staff.view",
  ],
  DRIVER: [
    "orders.view", "orders.deliver",
    "customers.view",
  ],
};

export async function getPermissions(): Promise<ActionResult<any[]>> {
  try {
    await requireSuperAdmin();
    let perms = await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
    if (perms.length === 0) {
      await prisma.permission.createMany({ data: DEFAULT_PERMISSIONS });
      perms = await prisma.permission.findMany({ orderBy: [{ category: "asc" }, { key: "asc" }] });
    }
    return { success: true, data: perms };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function getRolePermissions(): Promise<ActionResult<any>> {
  try {
    await requireSuperAdmin();
    const perms = await prisma.permission.findMany();
    const rolePerms = await prisma.rolePermission.findMany({ include: { permission: true } });

    const roles = ["DIRECTOR", "OPERATOR", "DRIVER"];
    const result: Record<string, string[]> = {};
    for (const role of roles) {
      result[role] = rolePerms.filter(rp => rp.role === role).map(rp => rp.permission.key);
    }

    // Agar hali sozlanmagan bo'lsa — default'larni qaytarish
    const hasAny = rolePerms.length > 0;
    if (!hasAny) {
      return { success: true, data: { permissions: perms, rolePermissions: DEFAULT_ROLE_PERMISSIONS } };
    }

    return { success: true, data: { permissions: perms, rolePermissions: result } };
  } catch (e: any) {
    return { success: false, error: e.message || "Yuklanmadi" };
  }
}

export async function saveRolePermissions(role: string, permissionKeys: string[]): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const perms = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

    await prisma.$transaction(async tx => {
      await tx.rolePermission.deleteMany({ where: { role } });
      if (perms.length > 0) {
        await tx.rolePermission.createMany({
          data: perms.map(p => ({ role, permissionId: p.id })),
        });
      }
    });
    return { success: true, message: `${role} roli ruxsatlari saqlandi` };
  } catch (e: any) {
    return { success: false, error: e.message || "Saqlashda xatolik" };
  }
}

export async function resetToDefault(): Promise<ActionResult> {
  try {
    await requireSuperAdmin();
    const perms = await prisma.permission.findMany();
    await prisma.rolePermission.deleteMany();

    for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const matchedPerms = perms.filter(p => keys.includes(p.key));
      if (matchedPerms.length > 0) {
        await prisma.rolePermission.createMany({
          data: matchedPerms.map(p => ({ role, permissionId: p.id })),
        });
      }
    }
    return { success: true, message: "Default ruxsatlar tiklandi" };
  } catch (e: any) {
    return { success: false, error: e.message || "Xatolik" };
  }
}
