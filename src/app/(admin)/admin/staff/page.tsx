"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatPhone, formatDateOnly, formatCurrency } from "@/lib/utils";
import { getStaff, createStaff, toggleStaffStatus, updateStaffMember } from "@/actions/staff-actions";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: any; type: "block" | "delete" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "OPERATOR" | "DRIVER">("ALL");
  const [createForm, setCreateForm] = useState({ name: "", phone: "", password: "", role: "OPERATOR" as "OPERATOR" | "DRIVER" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", password: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadStaff = async () => { setLoading(true); const r = await getStaff(); if (r.success && r.data) setStaff(r.data as any); setLoading(false); };
  useEffect(() => { loadStaff(); }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const r = await createStaff({ name: createForm.name, phone: createForm.phone.startsWith("+") ? createForm.phone : `+998${createForm.phone}`, password: createForm.password, role: createForm.role });
    if (r.success) { setIsCreateOpen(false); setCreateForm({ name: "", phone: "", password: "", role: "OPERATOR" }); loadStaff(); showToast("Xodim qo'shildi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editUser) return;
    setFormLoading(true); setFormError("");
    const r = await updateStaffMember(editUser.id, {
      name: editForm.name,
      phone: editForm.phone,
      ...(editForm.password ? { password: editForm.password } : {}),
    });
    if (r.success) { setEditUser(null); loadStaff(); showToast("Xodim yangilandi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({ name: user.name, phone: user.phone, password: "" });
    setFormError("");
  };

  const handleToggle = async () => {
    if (!confirmAction) return;
    setFormLoading(true);
    await toggleStaffStatus(confirmAction.user.id);
    loadStaff();
    showToast(confirmAction.user.isActive ? "Xodim bloklandi (tizimga kira olmaydi)" : "Xodim faollashtirildi");
    setConfirmAction(null);
    setFormLoading(false);
  };

  const filtered = staff.filter((s) => {
    if (filterRole !== "ALL" && s.role !== filterRole) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.phone.includes(search)) return false;
    return true;
  });

  const operators = filtered.filter((s) => s.role === "OPERATOR");
  const drivers = filtered.filter((s) => s.role === "DRIVER");

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-in ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          <p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.message}</p>
        </div>
      )}

      <PageHeader
        title="Xodimlar"
        description={`Jami ${staff.length} ta xodim`}
        action={<Button onClick={() => setIsCreateOpen(true)}>+ Yangi Xodim</Button>}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Ism yoki telefon..." className="max-w-xs" />
        <div className="flex items-center gap-2">
          {(["ALL", "OPERATOR", "DRIVER"] as const).map((role) => (
            <button
              key={role}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRole === role ? "bg-primary-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
              onClick={() => setFilterRole(role)}
            >
              {role === "ALL" ? `Barchasi (${staff.length})` : role === "OPERATOR" ? `☎️ Operatorlar (${staff.filter(s => s.role === "OPERATOR").length})` : `🚚 Haydovchilar (${staff.filter(s => s.role === "DRIVER").length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-8">
          {(filterRole === "ALL" || filterRole === "OPERATOR") && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>☎️</span> Operatorlar <Badge variant="secondary">{operators.length}</Badge>
              </h3>
              {operators.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Operator topilmadi</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {operators.map((s) => (
                    <StaffCard key={s.id} user={s} onEdit={() => openEdit(s)} onBlock={() => setConfirmAction({ user: s, type: "block" })} />
                  ))}
                </div>
              )}
            </div>
          )}

          {(filterRole === "ALL" || filterRole === "DRIVER") && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>🚚</span> Haydovchilar <Badge variant="secondary">{drivers.length}</Badge>
              </h3>
              {drivers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400 text-sm">Haydovchi topilmadi</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {drivers.map((s) => (
                    <StaffCard key={s.id} user={s} onEdit={() => openEdit(s)} onBlock={() => setConfirmAction({ user: s, type: "block" })} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={confirmAction?.user.isActive ? "🚫 Xodimni bloklash" : "✅ Xodimni faollashtirish"}>
        {confirmAction && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${confirmAction.user.isActive ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}>
              {confirmAction.user.isActive ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    <strong>{confirmAction.user.name}</strong>ni bloklashni xohlaysizmi?
                  </p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                    <li>Xodim tizimga kira olmaydi</li>
                    <li>Yangi buyurtmalar biriktirilmaydi</li>
                    <li>Eski buyurtmalar tarixi saqlanadi</li>
                  </ul>
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-2 italic">
                    💡 Bu soft-block: xodim bazadan o'chirilmaydi, faqat tizimga kirishi bloklanadi.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    <strong>{confirmAction.user.name}</strong>ni qayta faollashtirasizmi?
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Xodim yana tizimga kirib ishlashni boshlaydi.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Bekor</Button>
              <Button
                variant={confirmAction.user.isActive ? "destructive" : "success"}
                onClick={handleToggle}
                disabled={formLoading}
              >
                {formLoading ? "..." : confirmAction.user.isActive ? "🚫 Bloklash" : "✅ Faollashtirish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Yangi Xodim Qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism familiya</label><Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Jasur Eshmatov" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon raqami</label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+998903333333" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parol</label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Kamida 6 ta belgi" required minLength={6} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lavozimi</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className={`py-4 rounded-xl text-sm font-medium border-2 transition-all ${createForm.role === "OPERATOR" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-700 dark:text-gray-300"}`} onClick={() => setCreateForm({ ...createForm, role: "OPERATOR" })}>
                <span className="text-2xl block mb-1">☎️</span>Operator
              </button>
              <button type="button" className={`py-4 rounded-xl text-sm font-medium border-2 transition-all ${createForm.role === "DRIVER" ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-700 dark:text-gray-300"}`} onClick={() => setCreateForm({ ...createForm, role: "DRIVER" })}>
                <span className="text-2xl block mb-1">🚚</span>Haydovchi
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "Saqlanmoqda..." : "Qo'shish"}</Button></div>
        </form>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Tahrirlash: ${editUser?.name || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism familiya</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required /></div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🔑 Parolni yangilash</label>
            <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Yangi parol (bo'sh = o'zgarmaydi)" minLength={6} />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Xodim parolini unutgan bo'lsa, yangi parol kiriting (kamida 6 belgi)</p>
          </div>

          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setEditUser(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "💾 Saqlash"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function StaffCard({ user, onEdit, onBlock }: { user: any; onEdit: () => void; onBlock: () => void }) {
  const getDriverStatus = () => {
    if (!user.isActive) return { label: "Bloklangan", color: "destructive" as const, icon: "🚫" };
    if (user.kpi?.activeOrders > 0) return { label: "Yo'nalishda", color: "default" as const, icon: "🚛" };
    return { label: "Bo'sh", color: "success" as const, icon: "✅" };
  };

  const driverStatus = user.role === "DRIVER" ? getDriverStatus() : null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${!user.isActive ? "opacity-60 border-red-200 dark:border-red-800" : "border-gray-100 dark:border-gray-700"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${user.isActive ? (user.role === "DRIVER" ? "bg-green-500" : "bg-blue-500") : "bg-gray-400"}`}>
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(user.phone)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {driverStatus ? (
            <Badge variant={driverStatus.color} className="text-[10px]">
              {driverStatus.icon} {driverStatus.label}
            </Badge>
          ) : (
            <Badge variant={user.isActive ? "success" : "destructive"} className="text-[10px]">
              {user.isActive ? "Faol" : "Bloklangan"}
            </Badge>
          )}
        </div>
      </div>

      {user.kpi && (
        <div className="mb-3 space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Yetkazish</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{user.kpi.delivered}/{user.kpi.assigned}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${user.kpi.assigned > 0 && user.kpi.delivered / user.kpi.assigned >= 0.8 ? "bg-green-500" : user.kpi.assigned > 0 ? "bg-yellow-500" : "bg-gray-300"}`}
                style={{ width: `${user.kpi.assigned > 0 ? (user.kpi.delivered / user.kpi.assigned) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5 border border-amber-100 dark:border-amber-800/50">
              <p className="text-[10px] text-amber-600 dark:text-amber-400">🫙 Idish yig'ildi</p>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">{user.kpi.bottlesCollected} ta</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-2.5 py-1.5 border border-green-100 dark:border-green-800/50">
              <p className="text-[10px] text-green-600 dark:text-green-400">💵 Kassa</p>
              <p className="text-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(user.kpi.cashCollected)}</p>
            </div>
          </div>

          {user.kpi.activeOrders > 0 && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Hozir {user.kpi.activeOrders} ta buyurtma yo'nalishida</span>
            </div>
          )}
        </div>
      )}

      {user.role === "OPERATOR" && (
        <div className="mb-3 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50">
          <p className="text-[10px] text-blue-600 dark:text-blue-400">☎️ Operator</p>
          <p className="text-xs text-blue-800 dark:text-blue-200">Buyurtma qabul qilish va mijozlar bilan ishlash</p>
        </div>
      )}

      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
        📅 Qo'shilgan: {formatDateOnly(user.createdAt)}
      </p>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>✏️ Tahrirlash</Button>
        <Button
          variant={user.isActive ? "destructive" : "success"}
          size="sm"
          className="flex-1"
          onClick={onBlock}
        >
          {user.isActive ? "🚫 Bloklash" : "✅ Faollashtirish"}
        </Button>
      </div>
    </div>
  );
}
