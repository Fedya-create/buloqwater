"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStatus,
  getProductTemplates,
} from "@/actions/product-actions";
import { ImageUpload } from "@/components/ui/image-upload";

type Category = "WATER" | "PROMO" | "ACCESSORIES";

const CATEGORIES: {
  value: Category;
  label: string;
  icon: string;
  color: string;
}[] = [
  { value: "WATER", label: "Suvlar", icon: "💧", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { value: "PROMO", label: "Aksiyalar", icon: "🔥", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800" },
  { value: "ACCESSORIES", label: "Aksessuarlar", icon: "🔧", color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [globalTemplates, setGlobalTemplates] = useState<any[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<"ALL" | Category>("ALL");
  const [createForm, setCreateForm] = useState({
    name: "", description: "", price: "", category: "WATER" as Category, imageUrl: "", isBottle: true,
  });
  const [editForm, setEditForm] = useState({
    name: "", description: "", price: "", category: "WATER" as Category, imageUrl: "", isBottle: true,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const loadProducts = async () => { setLoading(true); const r = await getProducts(); if (r.success && r.data) setProducts(r.data as any); setLoading(false); };
  useEffect(() => { loadProducts(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleImageError = (productId: string) => {
    setImgErrors((prev) => new Set(prev).add(productId));
  };

  const openCreateChoice = () => { setIsCreateOpen(true); };

  const openTemplates = async () => {
    setIsCreateOpen(false);
    setIsTemplateOpen(true);
    setTemplateLoading(true);
    const r = await getProductTemplates();
    if (r.success && r.data) setGlobalTemplates(r.data as any);
    setTemplateLoading(false);
  };

  const importFromTemplate = (template: any) => {
    setIsTemplateOpen(false);
    setCreateForm({
      name: template.name,
      description: template.description || "",
      price: template.price.toString(),
      category: template.category || "WATER",
      imageUrl: template.imageUrl || "",
      isBottle: template.isBottle,
    });
    setIsCreateOpen(true);
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const r = await createProduct({
      name: createForm.name, description: createForm.description || undefined,
      price: parseFloat(createForm.price), category: createForm.category,
      imageUrl: createForm.imageUrl || undefined, isBottle: createForm.isBottle,
    });
    if (r.success) { setIsCreateOpen(false); setCreateForm({ name: "", description: "", price: "", category: "WATER", imageUrl: "", isBottle: true }); loadProducts(); showToast("Mahsulot qo'shildi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editProduct) return;
    setFormLoading(true); setFormError("");
    const r = await updateProduct(editProduct.id, {
      name: editForm.name, description: editForm.description,
      price: parseFloat(editForm.price), category: editForm.category,
      imageUrl: editForm.imageUrl || undefined, isBottle: editForm.isBottle,
    });
    if (r.success) { setEditProduct(null); loadProducts(); showToast("Mahsulot yangilandi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setEditForm({ name: p.name, description: p.description || "", price: p.price.toString(), category: p.category || "WATER", imageUrl: p.imageUrl || "", isBottle: p.isBottle });
    setFormError("");
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    await toggleProductStatus(id);
    loadProducts();
    showToast(isActive ? "Mahsulot nofaol qilindi" : "Mahsulot faollashtirildi");
  };

  const filtered = filterCategory === "ALL" ? products : products.filter((p) => p.category === filterCategory);
  const activeProducts = filtered.filter((p) => p.isActive);
  const inactiveProducts = filtered.filter((p) => !p.isActive);

  return (
    <div className="relative">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 shadow-lg animate-in">
          <p className="text-sm font-medium">✅ {toast}</p>
        </div>
      )}

      <PageHeader
        title="Mahsulotlar"
        description={`${products.length} ta mahsulot`}
        action={<Button onClick={openCreateChoice}>+ Yangi Mahsulot</Button>}
      />

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filterCategory === "ALL" ? "bg-primary-500 text-white shadow-md" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
          onClick={() => setFilterCategory("ALL")}>
          📦 Barchasi ({products.length})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${filterCategory === cat.value ? "bg-primary-500 text-white shadow-md" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"}`}
            onClick={() => setFilterCategory(cat.value)}>
            {cat.icon} {cat.label} ({products.filter(p => p.category === cat.value).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-4xl mb-2">📦</p>
                <p>Bu filtrada mahsulot yo'q</p>
              </div>
            ) : (
              activeProducts.map((p) => {
                const catInfo = getCategoryInfo(p.category);
                const hasImgError = imgErrors.has(p.id);
                return (
                  <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="h-28 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center relative overflow-hidden">
                      {p.imageUrl && !hasImgError ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(p.id)}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-4xl">{p.isBottle ? "💧" : catInfo.icon}</span>
                          {hasImgError && <span className="text-[9px] text-gray-400 dark:text-gray-500">Rasm yuklanmadi</span>}
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catInfo.color}`}>
                          {catInfo.icon} {catInfo.label}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{p.name}</h3>
                      <div className="min-h-[36px] mt-0.5">
                        {p.description ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                        ) : (
                          <p className="text-xs text-gray-300 dark:text-gray-600 italic">Tavsif qo'shilmagan</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(p.price)}</p>
                          {p.isBottle && <span className="text-[10px] text-blue-600 dark:text-blue-400">🫙 Idish hisoblanadi</span>}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-700/30">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(p)}>✏️ Tahrirlash</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(p.id, p.isActive)} title="Nofaol qilish">🚫</Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {inactiveProducts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>⏸️</span> Nofaol ({inactiveProducts.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {inactiveProducts.map((p) => (
                  <div key={p.id} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-4 opacity-50 hover:opacity-70 transition-opacity">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl grayscale">{p.isBottle ? "🫙" : "💧"}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">{p.name}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{formatCurrency(p.price)}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(p.id, p.isActive)} className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20">
                        ✅ Faollashtirish
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Yangi Mahsulot Qo'shish">
        {!createForm.name && !formError ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Mahsulot qo'shish usulini tanlang:</p>

            <button onClick={openTemplates} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">📋</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">Shablonlardan tanlash</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Global mahsulotlar bazasidan tayyor shablonni import qilish</p>
              </div>
            </button>

            <button onClick={() => setCreateForm({ ...createForm, name: " " })} className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-2xl">✍️</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300">O'zim qo'shaman</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Noldan yangi mahsulot ma'lumotlarini kiritish</p>
              </div>
            </button>
          </div>
        ) : (
          /* Forma */
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">{formError}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategoriya <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat.value} type="button" className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${createForm.category === cat.value ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-sm" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`} onClick={() => setCreateForm({ ...createForm, category: cat.value })}>
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomi <span className="text-red-500">*</span></label><Input value={createForm.name.trim() === "" ? "" : createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="19L Kumush Suv" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tavsif</label><Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Toza tog' suvidan filtrlangan" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Narxi (so'm) <span className="text-red-500">*</span></label><Input type="number" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="15000" required min={0} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mahsulot rasmi</label><ImageUpload value={createForm.imageUrl} onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })} /></div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 cursor-pointer border border-gray-100 dark:border-gray-700">
              <input type="checkbox" checked={createForm.isBottle} onChange={(e) => setCreateForm({ ...createForm, isBottle: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">🫙 Idish (baxla) hisoblansin</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Buyurtmada idish hisobi yuritiladi</p>
              </div>
            </label>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setCreateForm({ name: "", description: "", price: "", category: "WATER", imageUrl: "", isBottle: true }); }}>Bekor</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? "Saqlanmoqda..." : "Qo'shish"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={isTemplateOpen} onClose={() => setIsTemplateOpen(false)} title="📋 Global Shablonlardan Tanlash">
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Superadmin yaratgan tayyor mahsulot shablonlaridan birini tanlang:</p>

          {templateLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-3 border-primary-500 border-t-transparent rounded-full" /></div>
          ) : globalTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hozircha shablon mavjud emas</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {globalTemplates.map((t) => {
                const catInfo = getCategoryInfo(t.category);
                return (
                  <button key={t.id} onClick={() => importFromTemplate(t)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                      {t.isBottle ? "💧" : catInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catInfo.color}`}>{catInfo.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(t.price)}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <Button variant="outline" size="sm" onClick={() => { setIsTemplateOpen(false); setCreateForm({ ...createForm, name: " " }); setIsCreateOpen(true); }} className="w-full">
              ✍️ Yoki noldan o'zim qo'shaman
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={`Tahrirlash: ${editProduct?.name || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm border border-red-200 dark:border-red-800">{formError}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategoriya</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${editForm.category === cat.value ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30" : "border-gray-200 dark:border-gray-700"}`} onClick={() => setEditForm({ ...editForm, category: cat.value })}>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nomi</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tavsif</label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Narxi (so'm)</label><Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} required min={0} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mahsulot rasmi</label><ImageUpload value={editForm.imageUrl} onChange={(url) => setEditForm({ ...editForm, imageUrl: url })} /></div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 cursor-pointer border border-gray-100 dark:border-gray-700">
            <input type="checkbox" checked={editForm.isBottle} onChange={(e) => setEditForm({ ...editForm, isBottle: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary-500" />
            <span className="text-sm text-gray-700 dark:text-gray-300">🫙 Idish hisoblansin</span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditProduct(null)}>Bekor</Button>
            <Button type="submit" disabled={formLoading}>{formLoading ? "..." : "💾 Saqlash"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
