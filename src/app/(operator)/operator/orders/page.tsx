"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { getStatusColor, getStatusLabel, formatCurrency, formatPhone } from "@/lib/utils";
import { getOrders, createOrder, assignDriver, getDriversForAssign } from "@/actions/order-actions";
import { searchCustomers, createCustomer } from "@/actions/customer-actions";
import { getProducts } from "@/actions/product-actions";

type TabFilter = "ALL" | "PENDING" | "ASSIGNED" | "DELIVERED" | "CANCELLED";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Yangi buyurtma state
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone1: "", phone2: "", address: "", landmark: "", locationLink: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [o, d] = await Promise.all([getOrders(), getDriversForAssign()]);
    if (o.success) setOrders(o.data as any);
    if (d.success) setDrivers(d.data as any);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Mijoz qidirish (debounce) ──────────────────────────────
  const handleCustomerSearch = useCallback(async (query: string) => {
    setCustomerSearch(query);
    setIsNewCustomer(false);
    if (query.length < 2) { setSearchResults([]); return; }
    const r = await searchCustomers(query);
    if (r.success) setSearchResults(r.data as any);
  }, []);

  // ── Yangi buyurtma ochish ──────────────────────────────────
  const openNewOrder = async () => {
    setIsNewOrderOpen(true);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setSearchResults([]);
    setIsNewCustomer(false);
    setNewCustomerForm({ name: "", phone1: "", phone2: "", address: "", landmark: "", locationLink: "" });
    setFormError("");
    const res = await getProducts();
    if (res.success) {
      const activeProducts = (res.data as any[]).filter((p: any) => p.isActive);
      setProducts(activeProducts);
      if (activeProducts.length > 0) setOrderItems([{ productId: activeProducts[0].id, quantity: 1 }]);
      else setOrderItems([]);
    }
  };

  // ── Mijoz tanlash — ma'lumotlar auto-fill ──────────────────
  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setSearchResults([]);
    setCustomerSearch("");
    setIsNewCustomer(false);
  };

  // ── Yangi mijoz rejimi ─────────────────────────────────────
  const switchToNewCustomer = () => {
    setIsNewCustomer(true);
    setSelectedCustomer(null);
    setSearchResults([]);
    // Agar search-dagi telefon raqam bo'lsa, auto-fill
    if (customerSearch && /^\d/.test(customerSearch)) {
      setNewCustomerForm({ ...newCustomerForm, phone1: customerSearch.startsWith("+") ? customerSearch : `+998${customerSearch}` });
    } else if (customerSearch) {
      setNewCustomerForm({ ...newCustomerForm, name: customerSearch });
    }
  };

  // ── Buyurtma yaratish ──────────────────────────────────────
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true); setFormError("");

    let customerId = selectedCustomer?.id;

    // Agar yangi mijoz bo'lsa — avval uni yaratamiz
    if (isNewCustomer) {
      if (!newCustomerForm.name || !newCustomerForm.phone1 || !newCustomerForm.address) {
        setFormError("Mijoz ismi, telefoni va manzili kiritilishi shart");
        setFormLoading(false);
        return;
      }

      const phone1 = newCustomerForm.phone1.startsWith("+") ? newCustomerForm.phone1 : `+998${newCustomerForm.phone1.replace(/\D/g, "")}`;
      const customerResult = await createCustomer({
        name: newCustomerForm.name,
        phone1,
        phone2: newCustomerForm.phone2 ? (newCustomerForm.phone2.startsWith("+") ? newCustomerForm.phone2 : `+998${newCustomerForm.phone2.replace(/\D/g, "")}`) : undefined,
        address: newCustomerForm.address,
        landmark: newCustomerForm.landmark || undefined,
        locationLink: newCustomerForm.locationLink || undefined,
      });

      if (!customerResult.success) {
        setFormError(customerResult.error);
        setFormLoading(false);
        return;
      }

      // Yangi yaratilgan mijozni topish
      const searchResult = await searchCustomers(phone1);
      if (searchResult.success && (searchResult.data as any[]).length > 0) {
        customerId = (searchResult.data as any[])[0].id;
      } else {
        setFormError("Yangi mijoz yaratildi, lekin topilmadi. Qaytadan urinib ko'ring.");
        setFormLoading(false);
        return;
      }
    }

    if (!customerId) {
      setFormError("Mijozni tanlang yoki yangi mijoz ma'lumotlarini kiriting");
      setFormLoading(false);
      return;
    }

    const validItems = orderItems.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      setFormError("Kamida 1 ta mahsulot tanlang");
      setFormLoading(false);
      return;
    }

    const r = await createOrder({ customerId, items: validItems });
    if (r.success) {
      setIsNewOrderOpen(false);
      setSelectedCustomer(null);
      setCustomerSearch("");
      setOrderItems([]);
      setIsNewCustomer(false);
      loadData();
      showToast("Buyurtma yaratildi!");
    } else {
      setFormError(r.error);
    }
    setFormLoading(false);
  };

  // ── Haydovchiga biriktirish ────────────────────────────────
  const handleAssignDriver = async (orderId: string, driverId: string, driverName: string) => {
    await assignDriver(orderId, driverId);
    loadData();
    showToast(`Buyurtma ${driverName}ga biriktirildi`);
  };

  // ── Filtr ──────────────────────────────────────────────────
  const filteredOrders = activeTab === "ALL"
    ? orders
    : activeTab === "ASSIGNED"
    ? orders.filter((o) => o.status === "ASSIGNED" || o.status === "IN_TRANSIT")
    : orders.filter((o) => o.status === activeTab);

  const tabCounts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    ASSIGNED: orders.filter((o) => o.status === "ASSIGNED" || o.status === "IN_TRANSIT").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          <p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.message}</p>
        </div>
      )}

      <PageHeader
        title="Buyurtmalar Markazi"
        action={<Button variant="success" size="lg" onClick={openNewOrder} className="shadow-lg shadow-green-500/20">+ Yangi Buyurtma</Button>}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {([
          { key: "ALL", label: "Barchasi" },
          { key: "PENDING", label: "Kutilmoqda" },
          { key: "ASSIGNED", label: "Jarayonda" },
          { key: "DELIVERED", label: "Yetkazildi" },
          { key: "CANCELLED", label: "Bekor qilingan" },
        ] as { key: TabFilter; label: string }[]).map((tab) => (
          <button key={tab.key} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-primary-500 text-white shadow-md" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>{tabCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buyurtmalar */}
          <div className="lg:col-span-2 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-500"><p className="text-4xl mb-2">📋</p><p className="text-sm">Bu filtrada buyurtma yo'q</p></div>
            ) : (
              filteredOrders.map((order) => <OrderCard key={order.id} order={order} drivers={drivers} onAssign={handleAssignDriver} />)
            )}
          </div>

          {/* Haydovchilar */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Haydovchilar</h3>
            <div className="space-y-3">
              {drivers.map((d) => {
                const loadPercent = Math.min((d.ordersCount / 10) * 100, 100);
                const loadColor = loadPercent >= 80 ? "bg-red-500" : loadPercent >= 50 ? "bg-yellow-500" : "bg-green-500";
                return (
                  <div key={d.id} className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${loadPercent >= 80 ? "bg-red-500" : "bg-green-500"}`}>{d.name.charAt(0)}</div>
                        <div><p className="text-sm font-medium">{d.name}</p><p className="text-xs text-gray-500">{formatPhone(d.phone)}</p></div>
                      </div>
                      <div className="text-right"><p className="text-xl font-bold">{d.ordersCount}</p><p className="text-[10px] text-gray-500">buyurtma</p></div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${loadColor}`} style={{ width: `${loadPercent}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MODAL: YANGI BUYURTMA (AUTOSEARCH + NEW CUSTOMER)
         ════════════════════════════════════════════════════════ */}
      <Modal open={isNewOrderOpen} onClose={() => setIsNewOrderOpen(false)} title="Yangi Buyurtma" className="max-w-xl">
        <form onSubmit={handleCreateOrder} className="space-y-5">
          {formError && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>}

          {/* ── MIJOZ TANLASH / YARATISH ──────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Mijoz</label>

            {/* Tanlangan mijoz ko'rinishi */}
            {selectedCustomer && !isNewCustomer && (
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-800">{selectedCustomer.name}</p>
                    <p className="text-xs text-green-600 mt-0.5">📞 {selectedCustomer.phone1}</p>
                    <p className="text-xs text-green-600">📍 {selectedCustomer.address}</p>
                    {selectedCustomer.landmark && <p className="text-xs text-green-500 mt-0.5">Mo'ljal: {selectedCustomer.landmark}</p>}
                  </div>
                  <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-green-600 hover:text-green-800 text-xl font-bold">×</button>
                </div>
              </div>
            )}

            {/* Qidiruv (tanlangan bo'lmasa) */}
            {!selectedCustomer && !isNewCustomer && (
              <div className="relative">
                <Input
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  placeholder="Telefon yoki ism kiritib qidiring..."
                  autoFocus
                  className="text-base"
                />
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl max-h-60 overflow-y-auto">
                    {searchResults.map((c) => (
                      <button key={c.id} type="button" className="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-50 last:border-0 transition-colors" onClick={() => selectCustomer(c)}>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">📞 {c.phone1} · 📍 {c.address}</p>
                      </button>
                    ))}
                    {/* Yangi mijoz qo'shish tugmasi */}
                    <button type="button" className="w-full px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors" onClick={switchToNewCustomer}>
                      <p className="text-sm font-semibold">+ Yangi mijoz qo'shish</p>
                      <p className="text-xs opacity-70">Bu raqam/ism bazada yo'q</p>
                    </button>
                  </div>
                )}
                {/* Natija topilmadi */}
                {customerSearch.length >= 2 && searchResults.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-gray-200 shadow-xl">
                    <div className="px-4 py-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">Mijoz topilmadi</p>
                      <Button type="button" variant="outline" size="sm" onClick={switchToNewCustomer}>
                        + Yangi mijoz yaratish
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Yangi mijoz formasi */}
            {isNewCustomer && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-blue-800">🆕 Yangi mijoz ma'lumotlari</p>
                  <button type="button" onClick={() => { setIsNewCustomer(false); setCustomerSearch(""); }} className="text-blue-600 text-xs hover:underline">Bekor</button>
                </div>
                <div>
                  <Input value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} placeholder="Ism familiya *" required className="bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={newCustomerForm.phone1} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone1: e.target.value })} placeholder="Telefon 1 *" required className="bg-white" />
                  <Input value={newCustomerForm.phone2} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone2: e.target.value })} placeholder="Telefon 2" className="bg-white" />
                </div>
                <Input value={newCustomerForm.address} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} placeholder="Manzil *" required className="bg-white" />
                <Input value={newCustomerForm.landmark} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, landmark: e.target.value })} placeholder="Mo'ljal (masalan: 'Sariq darvoza yonida')" className="bg-white" />
                <div className="flex items-center gap-2">
                  <Input value={newCustomerForm.locationLink} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, locationLink: e.target.value })} placeholder="Yandex Maps linki (ixtiyoriy)" className="bg-white flex-1" />
                  <a href="https://yandex.uz/maps" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white rounded-lg border text-xs text-blue-600 hover:bg-blue-50 whitespace-nowrap">🗺️ Maps</a>
                </div>
              </div>
            )}
          </div>

          {/* ── MAHSULOTLAR ────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Mahsulotlar</label>
            <div className="space-y-2">
              {products.map((p) => {
                const item = orderItems.find((i) => i.productId === p.id);
                const qty = item?.quantity || 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? "bg-primary-50 border-primary-200" : "bg-gray-50 border-gray-100"}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(p.price)} {p.isBottle && "· 🫙"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold" onClick={() => { const n = orderItems.filter(i => i.productId !== p.id); if (qty > 1) n.push({ productId: p.id, quantity: qty - 1 }); setOrderItems(n); }}>−</button>
                      <span className="w-8 text-center font-bold text-base">{qty}</span>
                      <button type="button" className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 text-lg font-bold" onClick={() => { const n = orderItems.filter(i => i.productId !== p.id); n.push({ productId: p.id, quantity: qty + 1 }); setOrderItems(n); }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── JAMI ───────────────────────────────────────────── */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Jami summa:</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(orderItems.reduce((sum, item) => { const p = products.find((pr) => pr.id === item.productId); return sum + (p?.price || 0) * item.quantity; }, 0))}
              </span>
            </div>
          </div>

          {/* ── TUGMALAR ───────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNewOrderOpen(false)}>Bekor</Button>
            <Button type="submit" variant="success" disabled={formLoading} size="lg">
              {formLoading ? "Yaratilmoqda..." : "✅ Buyurtma yaratish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ORDER CARD
// ══════════════════════════════════════════════════════════════
function OrderCard({ order, drivers, onAssign }: { order: any; drivers: any[]; onAssign: (o: string, d: string, name: string) => void }) {
  const [showDrivers, setShowDrivers] = useState(false);

  const minutesSinceCreated = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  const isLate = order.status === "PENDING" && minutesSinceCreated > 60;
  const isNew = minutesSinceCreated < 5;

  const borderColor = isLate ? "border-l-red-500" : isNew ? "border-l-green-500" : order.status === "ASSIGNED" ? "border-l-blue-500" : order.status === "DELIVERED" ? "border-l-green-400" : "border-l-yellow-500";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 border-l-4 ${borderColor} p-4 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-gray-400">#{order.orderNumber}</span>
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
            {isLate && <Badge variant="destructive">Kechikkan!</Badge>}
            {isNew && <Badge variant="success">Yangi</Badge>}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.customer.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{order.customer.address}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <a href={`tel:${order.customer.phone1}`} className="text-xs text-blue-600 hover:underline">📞 {order.customer.phone1}</a>
            <span className="text-xs font-medium text-gray-700">💰 {formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {order.items?.map((item: any, idx: number) => (
              <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{item.product.name} ×{item.quantity}</span>
            ))}
          </div>
        </div>

        <div className="ml-3 flex-shrink-0">
          {order.driver ? (
            <div className="text-right"><p className="text-[10px] text-gray-400">Haydovchi</p><p className="text-sm font-medium text-blue-700">{order.driver.name}</p></div>
          ) : order.status === "PENDING" && (
            <div className="relative">
              <Button size="sm" variant="outline" onClick={() => setShowDrivers(!showDrivers)}>🚚 Biriktirish</Button>
              {showDrivers && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl border shadow-xl z-20 overflow-hidden">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">Haydovchi tanlang</p>
                  {drivers.map((d) => (
                    <button key={d.id} className="w-full px-3 py-2.5 text-left hover:bg-primary-50 flex items-center justify-between" onClick={() => { onAssign(order.id, d.id, d.name); setShowDrivers(false); }}>
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${d.ordersCount >= 8 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{d.ordersCount}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
