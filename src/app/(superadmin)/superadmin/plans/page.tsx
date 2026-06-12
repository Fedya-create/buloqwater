"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";
import { getPlans, createPlan, updatePlan, deletePlan, togglePlanStatus } from "@/actions/superadmin-plans-actions";

const EMPTY_FORM = {
  name: "", displayName: "", description: "", price: 0, durationDays: 30,
  maxUsers: 5, maxCustomers: 100, maxOrders: 1000, storageGB: 1,
  features: [] as string[], isActive: true, isPopular: false, sortOrder: 0,
};

const PLAN_COLORS: Record<string, string> = {
  Free: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  Start: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  Business: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  Enterprise: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [featureInput, setFeatureInput] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };
  const load = async () => {
    setLoading(true);
    const r = await getPlans();
    if (r.success && r.data) setPlans(r.data as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setFeatureInput(""); setFormError(""); setEditPlan(null); setIsOpen(true); };
  const openEdit = (p: any) => { setForm({ ...p }); setFeatureInput(""); setFormError(""); setEditPlan(p); setIsOpen(true); };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !form.features.includes(f)) { setForm(prev => ({ ...prev, features: [...prev.features, f] })); }
    setFeatureInput("");
  };
  const removeFeature = (f: string) => setForm(prev => ({ ...prev, features: prev.features.filter(x => x !== f) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const r = editPlan ? await updatePlan(editPlan.id, form) : await createPlan(form);
    if (r.success) { setIsOpen(false); load(); showToast(editPlan ? "Yangilandi!" : "Tarif yaratildi!"); }
    else setFormError((r as any).error);
    setFormLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setFormLoading(true);
    const r = await deletePlan(deleteModal.id);
    if (r.success) { setDeleteModal(null); load(); showToast("O'chirildi"); }
    else showToast((r as any).error, "error");
    setFormLoading(false);
  };

  const handleToggle = async (id: string) => {
    await togglePlanStatus(id); load();
  };

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <PageHeader title="Tariflar" description="Obuna rejalari boshqaruvi" action={<Button onClick={openCreate}>+ Yangi Tarif</Button>} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm overflow-hidden flex flex-col ${plan.isPopular ? "border-primary-400 dark:border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800" : "border-gray-100 dark:border-gray-700"}`}>
              {plan.isPopular && (
                <div className="bg-primary-500 text-white text-center text-xs font-bold py-1.5 tracking-wider">⭐ MASHHUR</div>
              )}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${PLAN_COLORS[plan.displayName] || "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>{plan.displayName}</span>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(plan.price)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">/ {plan.durationDays} kun</p>
                  </div>
                  <Badge variant={plan.isActive ? "success" : "secondary"}>{plan.isActive ? "Faol" : "Nofaol"}</Badge>
                </div>
                {plan.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>}

                <div className="space-y-1.5 mb-4">
                  {[
                    { icon: "👥", label: `${plan.maxUsers} xodim` },
                    { icon: "🧑‍💼", label: `${plan.maxCustomers} mijoz` },
                    { icon: "📦", label: `${plan.maxOrders.toLocaleString()} buyurtma` },
                    { icon: "💾", label: `${plan.storageGB} GB xotira` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span>{item.icon}</span><span>{item.label}</span>
                    </div>
                  ))}
                </div>

                {plan.features && plan.features.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-1">
                    {plan.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="text-green-500">✓</span>{f}
                      </div>
                    ))}
                  </div>
                )}

                {plan._count?.subscriptions > 0 && (
                  <p className="mt-3 text-xs text-primary-500 font-medium">{plan._count.subscriptions} ta faol obuna</p>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/30">
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>✏️</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(plan.id)} title={plan.isActive ? "Nofaol qilish" : "Faollashtirish"}>
                    {plan.isActive ? "⏸️" : "▶️"}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" onClick={() => setDeleteModal(plan)}>🗑️</Button>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-4 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Hali tarif yo'q</p>
              <Button onClick={openCreate}>+ Birinchi tarifni yaratish</Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title={editPlan ? `Tahrirlash: ${editPlan.displayName}` : "Yangi Tarif"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {formError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 dark:text-red-300 text-sm">{formError}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Nomi (key)</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Business" required /></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Ko'rsatiladigan nomi</label><Input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="Biznes" required /></div>
          </div>
          <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Tavsif</label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Katta bizneslar uchun" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Narxi (so'm)</label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: +e.target.value }))} min={0} required /></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Davomiyligi (kun)</label><Input type="number" value={form.durationDays} onChange={e => setForm(p => ({ ...p, durationDays: +e.target.value }))} min={1} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Maks. xodim</label><Input type="number" value={form.maxUsers} onChange={e => setForm(p => ({ ...p, maxUsers: +e.target.value }))} min={1} /></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Maks. mijoz</label><Input type="number" value={form.maxCustomers} onChange={e => setForm(p => ({ ...p, maxCustomers: +e.target.value }))} min={1} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Maks. buyurtma</label><Input type="number" value={form.maxOrders} onChange={e => setForm(p => ({ ...p, maxOrders: +e.target.value }))} min={1} /></div>
            <div><label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Xotira (GB)</label><Input type="number" value={form.storageGB} onChange={e => setForm(p => ({ ...p, storageGB: +e.target.value }))} min={0.1} step={0.5} /></div>
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Xususiyatlar</label>
            <div className="flex gap-2 mb-2">
              <Input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="SMS bildirishnoma..." onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addFeature())} />
              <Button type="button" variant="outline" onClick={addFeature} size="sm">+</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features.map((f, i) => (
                <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                  {f} <button type="button" onClick={() => removeFeature(f)} className="text-primary-400 hover:text-primary-700 ml-1">×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} className="rounded" /><span className="text-gray-700 dark:text-gray-300">Faol</span></label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isPopular} onChange={e => setForm(p => ({ ...p, isPopular: e.target.checked }))} className="rounded" /><span className="text-gray-700 dark:text-gray-300">⭐ Mashhur</span></label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "..." : editPlan ? "Saqlash" : "Yaratish"}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Tarifni o'chirish">
        {deleteModal && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-300">⚠️ <strong>{deleteModal.displayName}</strong> tarifini o'chirmoqchimisiz?</p>
              {deleteModal._count?.subscriptions > 0 && <p className="text-xs text-red-600 mt-1">{deleteModal._count.subscriptions} ta faol obuna bor — o'chirib bo'lmaydi!</p>}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteModal(null)}>Bekor</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={formLoading || deleteModal._count?.subscriptions > 0}>{formLoading ? "..." : "O'chirish"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
