"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateOnly, formatPhone } from "@/lib/utils";
import {
  createCompany, getCompanies, toggleCompanyStatus, updateCompany, extendSubscription,
} from "@/actions/company-actions";

interface Company {
  id: string; name: string; subdomain: string; status: "ACTIVE" | "SUSPENDED";
  phone: string | null; maxCustomers: number; maxUsers: number; createdAt: string;
  director: { id: string; name: string; phone: string } | null;
  _count: { users: number; customers: number; orders: number };
  subscription: { endDate: string; isPaid: boolean; amount: number } | null;
}

const ITEMS_PER_PAGE = 12;

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [subscriptionCompany, setSubscriptionCompany] = useState<Company | null>(null);
  const [settingsCompany, setSettingsCompany] = useState<Company | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [createForm, setCreateForm] = useState({ companyName: "", subdomain: "", directorName: "", directorPhone: "", directorPassword: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", address: "" });
  const [subForm, setSubForm] = useState({ months: "1", amount: "" });
  const [settingsForm, setSettingsForm] = useState({ maxCustomers: "500", maxUsers: "20" });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const loadCompanies = async () => { setLoading(true); const r = await getCompanies(); if (r.success && r.data) setCompanies(r.data as any); setLoading(false); };
  useEffect(() => { loadCompanies(); }, []);

  const filtered = companies.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.subdomain.includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedCompanies = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    const r = await createCompany({ companyName: createForm.companyName, subdomain: createForm.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""), directorName: createForm.directorName, directorPhone: createForm.directorPhone.startsWith("+") ? createForm.directorPhone : `+998${createForm.directorPhone}`, directorPassword: createForm.directorPassword });
    if (r.success) { setIsCreateOpen(false); setCreateForm({ companyName: "", subdomain: "", directorName: "", directorPhone: "", directorPassword: "" }); loadCompanies(); showToast("Kompaniya yaratildi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const openEdit = (c: Company) => { setEditCompany(c); setEditForm({ name: c.name, phone: c.phone || "", address: "" }); setFormError(""); };
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editCompany) return; setFormLoading(true); setFormError("");
    const r = await updateCompany(editCompany.id, { name: editForm.name, phone: editForm.phone });
    if (r.success) { setEditCompany(null); loadCompanies(); showToast("Yangilandi!"); } else setFormError(r.error);
    setFormLoading(false);
  };

  const openSubscription = (c: Company) => { setSubscriptionCompany(c); setSubForm({ months: "1", amount: "" }); setFormError(""); };
  const handleExtendSub = async (e: React.FormEvent) => {
    e.preventDefault(); if (!subscriptionCompany) return; setFormLoading(true); setFormError("");
    const r = await extendSubscription(subscriptionCompany.id, parseInt(subForm.months), parseFloat(subForm.amount || "0"));
    if (r.success) { setSubscriptionCompany(null); loadCompanies(); showToast("Obuna uzaytirildi!"); } else setFormError(r.error);
    setFormLoading(false);
  };

  const openSettings = (c: Company) => { setSettingsCompany(c); setSettingsForm({ maxCustomers: c.maxCustomers.toString(), maxUsers: c.maxUsers.toString() }); };
  const handleSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!settingsCompany) return; setFormLoading(true);
    const r = await updateCompany(settingsCompany.id, { maxCustomers: parseInt(settingsForm.maxCustomers), maxUsers: parseInt(settingsForm.maxUsers) });
    if (r.success) { setSettingsCompany(null); loadCompanies(); showToast("Sozlamalar saqlandi!"); }
    setFormLoading(false);
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    setFormLoading(true);
    await toggleCompanyStatus(confirmToggle.id);
    loadCompanies();
    showToast(confirmToggle.status === "ACTIVE" ? "Kompaniya muzlatildi" : "Kompaniya faollashtirildi");
    setConfirmToggle(null);
    setFormLoading(false);
  };

  const getDaysLeft = (sub: Company["subscription"]) => { if (!sub) return null; return Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000); };

  const isSystemTemplate = (c: Company) => c.subdomain === "global-templates";

  const activeCount = companies.filter(c => c.status === "ACTIVE").length;
  const suspendedCount = companies.filter(c => c.status === "SUSPENDED").length;

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-in ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          <p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.message}</p>
        </div>
      )}

      <PageHeader title="Kompaniyalar" description={`Jami ${companies.length} ta kompaniya`} action={<Button onClick={() => setIsCreateOpen(true)}>+ Yangi Kompaniya</Button>} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Kompaniya nomi yoki subdomen..." className="max-w-sm" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === "ALL" ? "bg-primary-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            Barchasi ({companies.length})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === "ACTIVE" ? "bg-green-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            ✅ Faol ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("SUSPENDED")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === "SUSPENDED" ? "bg-red-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
          >
            ⏸️ Muzlatilgan ({suspendedCount})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-gray-500 dark:text-gray-400">Kompaniya topilmadi</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedCompanies.map((company) => {
              const daysLeft = getDaysLeft(company.subscription);
              const isTemplate = isSystemTemplate(company);
              return (
                <div key={company.id} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${isTemplate ? "border-purple-200 dark:border-purple-800" : company.status === "SUSPENDED" ? "border-red-200 dark:border-red-800 opacity-80" : "border-gray-100 dark:border-gray-700"}`}>
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${isTemplate ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" : "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300"}`}>
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{company.name}</p>
                          <code className="text-xs text-gray-500 dark:text-gray-400">{company.subdomain}.buloqwater.uz</code>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isTemplate ? (
                          <Badge variant="secondary">🧪 Tizim shabloni</Badge>
                        ) : (
                          <Badge variant={company.status === "ACTIVE" ? "success" : "destructive"}>
                            {company.status === "ACTIVE" ? "Faol" : "Muzlatilgan"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-4 space-y-3">
                    {company.director ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 dark:text-gray-500">👤</span>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{company.director.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatPhone(company.director.phone)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                        <span>👤</span>
                        <span className="italic">Direktor biriktirilmagan</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Tooltip text="Xodimlar soni">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                          <span>👥</span> {company._count.users}
                        </div>
                      </Tooltip>
                      <Tooltip text="Mijozlar soni">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs font-medium">
                          <span>🧑‍💼</span> {company._count.customers}
                        </div>
                      </Tooltip>
                      <Tooltip text="Buyurtmalar soni">
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
                          <span>📦</span> {company._count.orders}
                        </div>
                      </Tooltip>
                    </div>

                    {!isTemplate && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {daysLeft !== null ? (
                            <>
                              <Badge variant={daysLeft > 7 ? "success" : daysLeft > 0 ? "warning" : "destructive"}>
                                {daysLeft > 0 ? `📅 ${daysLeft} kun qoldi` : `⚠️ ${Math.abs(daysLeft)} kun o'tgan`}
                              </Badge>
                              {company.subscription?.isPaid && (
                                <Tooltip text="To'lov qilingan">
                                  <span className="text-xs">✅</span>
                                </Tooltip>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Obuna mavjud emas</span>
                          )}
                        </div>
                        {company.phone && (
                          <Tooltip text="Kompaniya telefoni">
                            <span className="text-xs text-gray-400 dark:text-gray-500">📞 {formatPhone(company.phone)}</span>
                          </Tooltip>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                      <Tooltip text="Maksimal mijozlar limiti">
                        <span>🎯 {company._count.customers}/{company.maxCustomers}</span>
                      </Tooltip>
                      <Tooltip text="Maksimal xodimlar limiti">
                        <span>👥 {company._count.users}/{company.maxUsers}</span>
                      </Tooltip>
                      <span>📅 {formatDateOnly(company.createdAt)}</span>
                    </div>
                  </div>

                  {!isTemplate && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-gray-700/30">
                      <div className="flex items-center gap-1">
                        <Tooltip text="Tahrirlash">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(company)}>✏️</Button>
                        </Tooltip>
                        <Tooltip text="Obunani uzaytirish">
                          <Button variant="ghost" size="sm" onClick={() => openSubscription(company)}>📅</Button>
                        </Tooltip>
                        <Tooltip text="Limitlar sozlamasi">
                          <Button variant="ghost" size="sm" onClick={() => openSettings(company)}>⚙️</Button>
                        </Tooltip>
                        <Tooltip text="Kompaniya sifatida kirish">
                          <Button variant="ghost" size="sm" className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">👁️</Button>
                        </Tooltip>
                      </div>
                      <Button
                        variant={company.status === "ACTIVE" ? "destructive" : "success"}
                        size="sm"
                        onClick={() => setConfirmToggle(company)}
                      >
                        {company.status === "ACTIVE" ? "⏸️ Muzlatish" : "▶️ Faollashtirish"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ← Oldingi
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${currentPage === page ? "bg-primary-500 text-white shadow-sm" : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Keyingi →
              </Button>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {filtered.length} tadan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
              </span>
            </div>
          )}
        </>
      )}
      <Modal open={!!confirmToggle} onClose={() => setConfirmToggle(null)} title={confirmToggle?.status === "ACTIVE" ? "⚠️ Kompaniyani muzlatish" : "✅ Kompaniyani faollashtirish"}>
        {confirmToggle && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${confirmToggle.status === "ACTIVE" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"}`}>
              {confirmToggle.status === "ACTIVE" ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Haqiqatdan ham <strong>{confirmToggle.name}</strong> kompaniyasini muzlatmoqchimisiz?</p>
                  <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                    <li>Kompaniya foydalanuvchilari tizimga kira olmaydi</li>
                    <li>Barcha buyurtmalar to'xtatiladi</li>
                    <li>Mijozlar ilovadan foydalana olmaydi</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200"><strong>{confirmToggle.name}</strong> kompaniyasini qayta faollashtirasizmi?</p>
                  <p className="text-xs text-green-700 dark:text-green-300">Kompaniya va barcha foydalanuvchilari yana tizimdan foydalana boshlaydi.</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">{confirmToggle.name.charAt(0)}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{confirmToggle.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{confirmToggle.subdomain}.buloqwater.uz · {confirmToggle._count.users} xodim · {confirmToggle._count.customers} mijoz</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setConfirmToggle(null)}>Bekor qilish</Button>
              <Button
                variant={confirmToggle.status === "ACTIVE" ? "destructive" : "success"}
                onClick={handleToggleStatus}
                disabled={formLoading}
              >
                {formLoading ? "..." : confirmToggle.status === "ACTIVE" ? "⏸️ Muzlatish" : "▶️ Faollashtirish"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Yangi Kompaniya Qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kompaniya nomi</label><Input value={createForm.companyName} onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })} placeholder="Shifo Suv MChJ" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subdomen</label><div className="flex items-center gap-2"><Input value={createForm.subdomain} onChange={(e) => setCreateForm({ ...createForm, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="shifo" required /><span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">.buloqwater.uz</span></div></div>
          <hr className="border-gray-100 dark:border-gray-700" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Direktor ma'lumotlari</p>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ismi</label><Input value={createForm.directorName} onChange={(e) => setCreateForm({ ...createForm, directorName: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefoni</label><Input value={createForm.directorPhone} onChange={(e) => setCreateForm({ ...createForm, directorPhone: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parol</label><Input type="password" value={createForm.directorPassword} onChange={(e) => setCreateForm({ ...createForm, directorPassword: e.target.value })} required minLength={6} /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "Saqlanmoqda..." : "Yaratish"}</Button></div>
        </form>
      </Modal>

      <Modal open={!!editCompany} onClose={() => setEditCompany(null)} title={`Tahrirlash: ${editCompany?.name || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          {formError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{formError}</div>}
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kompaniya nomi</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setEditCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Saqlash"}</Button></div>
        </form>
      </Modal>

      <Modal open={!!subscriptionCompany} onClose={() => setSubscriptionCompany(null)} title={`Obuna: ${subscriptionCompany?.name || ""}`}>
        <form onSubmit={handleExtendSub} className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">{subscriptionCompany?.subscription ? `Hozirgi muddat: ${formatDateOnly(subscriptionCompany.subscription.endDate)}` : "Obuna hali qo'shilmagan"}</p>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Necha oy?</label><div className="grid grid-cols-4 gap-2">{["1","3","6","12"].map((m) => (<button key={m} type="button" className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${subForm.months === m ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300" : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"}`} onClick={() => setSubForm({ ...subForm, months: m })}>{m} oy</button>))}</div></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To'lov (so'm)</label><Input type="number" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} placeholder="500000" /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setSubscriptionCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Muddat qo'shish"}</Button></div>
        </form>
      </Modal>

      <Modal open={!!settingsCompany} onClose={() => setSettingsCompany(null)} title={`Sozlamalar: ${settingsCompany?.name || ""}`}>
        <form onSubmit={handleSettings} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maks. mijozlar</label><Input type="number" value={settingsForm.maxCustomers} onChange={(e) => setSettingsForm({ ...settingsForm, maxCustomers: e.target.value })} min={1} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maks. xodimlar</label><Input type="number" value={settingsForm.maxUsers} onChange={(e) => setSettingsForm({ ...settingsForm, maxUsers: e.target.value })} min={1} /></div>
          <div className="flex justify-end gap-3 pt-4"><Button type="button" variant="outline" onClick={() => setSettingsCompany(null)}>Bekor</Button><Button type="submit" disabled={formLoading}>{formLoading ? "..." : "Saqlash"}</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
      </div>
    </div>
  );
}
