"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/layout/page-header";
import { getStatusColor, getStatusLabel, formatCurrency, formatPhone, formatDate } from "@/lib/utils";
import { getOrders, createOrder, assignDriver, getDriversForAssign } from "@/actions/order-actions";
import { searchCustomers, createCustomer } from "@/actions/customer-actions";
import { getProducts } from "@/actions/product-actions";

type StatusFilter = "ALL" | "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
type DateFilter = "ALL" | "TODAY" | "YESTERDAY" | "WEEK";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [assignOrderCustomer, setAssignOrderCustomer] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("ALL");
  const [search, setSearch] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone1: "", address: "", landmark: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const loadData = async () => { setLoading(true); const [o, d] = await Promise.all([getOrders(), getDriversForAssign()]); if (o.success) setOrders(o.data as any); if (d.success) setDrivers(d.data as any); setLoading(false); };
  useEffect(() => { loadData(); }, []);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (dateFilter !== "ALL") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);

      result = result.filter((o) => {
        const orderDate = new Date(o.createdAt);
        if (dateFilter === "TODAY") return orderDate >= todayStart;
        if (dateFilter === "YESTERDAY") return orderDate >= yesterdayStart && orderDate < todayStart;
        if (dateFilter === "WEEK") return orderDate >= weekStart;
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone1.includes(q) ||
        o.customer.address.toLowerCase().includes(q) ||
        String(o.orderNumber).includes(q)
      );
    }

    return result;
  }, [orders, statusFilter, dateFilter, search]);

  const statusCounts = useMemo(() => {
    return {
      ALL: orders.length,
      PENDING: orders.filter((o) => o.status === "PENDING").length,
      ASSIGNED: orders.filter((o) => o.status === "ASSIGNED").length,
      IN_TRANSIT: orders.filter((o) => o.status === "IN_TRANSIT").length,
      DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    };
  }, [orders]);

  const handleCustomerSearch = useCallback(async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const r = await searchCustomers(query);
    if (r.success) setSearchResults(r.data as any);
  }, []);

  const openNewOrder = async () => {
    setIsNewOrderOpen(true); setSelectedCustomer(null); setCustomerSearch(""); setSearchResults([]); setIsNewCustomer(false); setFormError("");
    const res = await getProducts();
    if (res.success) { const active = (res.data as any[]).filter((p: any) => p.isActive); setProducts(active); if (active.length > 0) setOrderItems([{ productId: active[0].id, quantity: 1 }]); else setOrderItems([]); }
  };

  const openAssignModal = (orderId: string, customerName: string) => {
    setAssignOrderId(orderId);
    setAssignOrderCustomer(customerName);
    setIsAssignOpen(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError("");
    let customerId = selectedCustomer?.id;

    if (isNewCustomer) {
      if (!newCustomerForm.name || !newCustomerForm.phone1 || !newCustomerForm.address) { setFormError("Mijoz ismi, telefoni va manzili kerak"); setFormLoading(false); return; }
      const phone1 = newCustomerForm.phone1.startsWith("+") ? newCustomerForm.phone1 : `+998${newCustomerForm.phone1.replace(/\D/g, "")}`;
      const cr = await createCustomer({ name: newCustomerForm.name, phone1, address: newCustomerForm.address, landmark: newCustomerForm.landmark || undefined });
      if (!cr.success) { setFormError(cr.error); setFormLoading(false); return; }
      const sr = await searchCustomers(phone1);
      if (sr.success && (sr.data as any[]).length > 0) customerId = (sr.data as any[])[0].id;
      else { setFormError("Mijoz yaratildi lekin topilmadi"); setFormLoading(false); return; }
    }

    if (!customerId) { setFormError("Mijozni tanlang"); setFormLoading(false); return; }
    const validItems = orderItems.filter((i) => i.quantity > 0);
    if (validItems.length === 0) { setFormError("Kamida 1 mahsulot tanlang"); setFormLoading(false); return; }

    const r = await createOrder({ customerId, items: validItems });
    if (r.success) { setIsNewOrderOpen(false); loadData(); showToast("Buyurtma yaratildi!"); }
    else setFormError(r.error);
    setFormLoading(false);
  };

  const handleAssign = async (driverId: string, driverName: string) => {
    if (!assignOrderId) return;
    setFormLoading(true);
    await assignDriver(assignOrderId, driverId);
    setIsAssignOpen(false);
    setAssignOrderId(null);
    loadData();
    showToast(`${driverName}ga biriktirildi`);
    setFormLoading(false);
  };

  return (
    <div className="relative">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-in ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}><p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.message}</p></div>}

      <PageHeader title="Buyurtmalar" description={`${orders.length} ta buyurtma`} action={<Button variant="success" onClick={openNewOrder}>+ Yangi Buyurtma</Button>} />

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {([
            { key: "ALL", label: "Barchasi", icon: "📋" },
            { key: "PENDING", label: "Kutilmoqda", icon: "⏳" },
            { key: "ASSIGNED", label: "Biriktirilgan", icon: "👤" },
            { key: "IN_TRANSIT", label: "Yo'lda", icon: "🚚" },
            { key: "DELIVERED", label: "Yetkazildi", icon: "✅" },
            { key: "CANCELLED", label: "Bekor", icon: "❌" },
          ] as { key: StatusFilter; label: string; icon: string }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === tab.key
                  ? tab.key === "PENDING" ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                  : tab.key === "DELIVERED" ? "bg-green-500 text-white shadow-sm shadow-green-200"
                  : tab.key === "CANCELLED" ? "bg-red-500 text-white shadow-sm shadow-red-200"
                  : "bg-primary-500 text-white shadow-sm shadow-primary-200"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {statusCounts[tab.key] > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.key
                    ? "bg-white/30 text-white"
                    : tab.key === "PENDING" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                }`}>
                  {statusCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Mijoz ismi, telefoni yoki buyurtma #..."
              className="pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >✕</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">📅</span>
            {([
              { key: "ALL", label: "Barchasi" },
              { key: "TODAY", label: "Bugun" },
              { key: "YESTERDAY", label: "Kecha" },
              { key: "WEEK", label: "Shu hafta" },
            ] as { key: DateFilter; label: string }[]).map((df) => (
              <button
                key={df.key}
                onClick={() => setDateFilter(df.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === df.key
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>
        </div>

        {(statusFilter !== "ALL" || dateFilter !== "ALL" || search) && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 dark:text-gray-500">Natija:</span>
            <Badge variant="secondary">{filteredOrders.length} ta buyurtma</Badge>
            {(statusFilter !== "ALL" || dateFilter !== "ALL" || search) && (
              <button
                onClick={() => { setStatusFilter("ALL"); setDateFilter("ALL"); setSearch(""); }}
                className="text-xs text-primary-500 hover:underline font-medium"
              >
                Tozalash
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div> : (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
              <p className="text-4xl mb-3">{search ? "🔍" : "📋"}</p>
              <p className="text-gray-500 dark:text-gray-400">
                {search ? `"${search}" bo'yicha buyurtma topilmadi` : "Bu filtrdagi buyurtma yo'q"}
              </p>
              {(statusFilter !== "ALL" || search) && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setStatusFilter("ALL"); setSearch(""); }}>
                  Filtrni tozalash
                </Button>
              )}
            </div>
          ) : filteredOrders.map((order) => (
            <OrderRow key={order.id} order={order} onOpenAssign={openAssignModal} />
          ))}
        </div>
      )}

      <Modal open={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="🚚 Haydovchi Biriktirish">
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">Buyurtma</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{assignOrderCustomer}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Faol haydovchilarni tanlang:</p>
            {drivers.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🚫</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Faol haydovchi topilmadi</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {drivers.map((driver) => {
                  const loadLevel = driver.ordersCount === 0 ? "free" : driver.ordersCount <= 3 ? "normal" : "busy";
                  return (
                    <button
                      key={driver.id}
                      onClick={() => handleAssign(driver.id, driver.name)}
                      disabled={formLoading}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          loadLevel === "free" ? "bg-green-500" : loadLevel === "normal" ? "bg-blue-500" : "bg-orange-500"
                        }`}>
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">{driver.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatPhone(driver.phone)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant={loadLevel === "free" ? "success" : loadLevel === "normal" ? "default" : "warning"}>
                            {driver.ordersCount === 0 ? "Bo'sh" : `${driver.ordersCount} ta yo'nalish`}
                          </Badge>
                        </div>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Bo'sh</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 1-3 buyurtma</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> 4+ buyurtma</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={isNewOrderOpen} onClose={() => setIsNewOrderOpen(false)} title="Yangi Buyurtma" className="max-w-xl">
        <form onSubmit={handleCreateOrder} className="space-y-5">
          {formError && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{formError}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mijoz</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div><p className="text-sm font-medium text-green-800 dark:text-green-200">{selectedCustomer.name}</p><p className="text-xs text-green-600 dark:text-green-400">{selectedCustomer.phone1} · {selectedCustomer.address}</p></div>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(""); }} className="text-green-600 text-lg">×</button>
              </div>
            ) : !isNewCustomer ? (
              <div className="relative">
                <Input value={customerSearch} onChange={(e) => handleCustomerSearch(e.target.value)} placeholder="Telefon yoki ism..." autoFocus />
                {searchResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl max-h-48 overflow-y-auto">
                    {searchResults.map((c) => <button key={c.id} type="button" className="w-full px-4 py-2.5 text-left hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm" onClick={() => { setSelectedCustomer(c); setSearchResults([]); }}><p className="font-medium text-gray-900 dark:text-white">{c.name}</p><p className="text-xs text-gray-500">{c.phone1}</p></button>)}
                    <button type="button" className="w-full px-4 py-2.5 text-left bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium" onClick={() => setIsNewCustomer(true)}>+ Yangi mijoz</button>
                  </div>
                )}
                {customerSearch.length >= 2 && searchResults.length === 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border shadow-xl p-4 text-center">
                    <p className="text-sm text-gray-500 mb-2">Topilmadi</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsNewCustomer(true)}>+ Yangi mijoz</Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex justify-between"><p className="text-sm font-medium text-blue-800 dark:text-blue-200">Yangi mijoz</p><button type="button" onClick={() => setIsNewCustomer(false)} className="text-xs text-blue-600 hover:underline">Bekor</button></div>
                <Input value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} placeholder="Ism *" className="bg-white dark:bg-gray-700" />
                <Input value={newCustomerForm.phone1} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone1: e.target.value })} placeholder="Telefon *" className="bg-white dark:bg-gray-700" />
                <Input value={newCustomerForm.address} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} placeholder="Manzil *" className="bg-white dark:bg-gray-700" />
                <Input value={newCustomerForm.landmark} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, landmark: e.target.value })} placeholder="Mo'ljal" className="bg-white dark:bg-gray-700" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mahsulotlar</label>
            <div className="space-y-2">
              {products.map((p) => {
                const item = orderItems.find((i) => i.productId === p.id);
                const qty = item?.quantity || 0;
                return (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${qty > 0 ? "bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700"}`}>
                    <div><p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.price)}</p></div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="w-8 h-8 rounded-full bg-white dark:bg-gray-600 border flex items-center justify-center font-bold" onClick={() => { const n = orderItems.filter(i => i.productId !== p.id); if (qty > 1) n.push({ productId: p.id, quantity: qty - 1 }); setOrderItems(n); }}>−</button>
                      <span className="w-6 text-center font-bold text-sm text-gray-900 dark:text-white">{qty}</span>
                      <button type="button" className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center font-bold" onClick={() => { const n = orderItems.filter(i => i.productId !== p.id); n.push({ productId: p.id, quantity: qty + 1 }); setOrderItems(n); }}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">Jami:</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(orderItems.reduce((s, i) => { const p = products.find(pr => pr.id === i.productId); return s + (p?.price || 0) * i.quantity; }, 0))}</span>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsNewOrderOpen(false)}>Bekor</Button>
            <Button type="submit" variant="success" disabled={formLoading}>{formLoading ? "Yaratilmoqda..." : "✅ Buyurtma yaratish"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function OrderRow({ order, onOpenAssign }: { order: any; onOpenAssign: (orderId: string, customerName: string) => void }) {
  const getTimeSincePending = () => {
    if (order.status !== "PENDING") return null;
    const diff = Date.now() - new Date(order.createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} daqiqa`;
    const hours = Math.floor(minutes / 60);
    return `${hours} soat ${minutes % 60} daqiqa`;
  };

  const pendingTime = getTimeSincePending();
  const isUrgent = order.status === "PENDING" && pendingTime && (Date.now() - new Date(order.createdAt).getTime() > 3600000);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${
      isUrgent ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10" : "border-gray-100 dark:border-gray-700"
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">#{order.orderNumber}</span>
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(order.createdAt)}</span>
            {pendingTime && (
              <span className={`text-[10px] font-medium ${isUrgent ? "text-red-600 dark:text-red-400" : "text-orange-500"}`}>
                ⏱️ {pendingTime}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{order.customer.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer.address} · {formatPhone(order.customer.phone1)}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {order.items?.map((item: any, idx: number) => (
              <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300">
                {item.product.name} ×{item.quantity}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</p>
          {order.driver ? (
            <Badge variant="default">🚚 {order.driver.name}</Badge>
          ) : order.status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenAssign(order.id, order.customer.name)}
              className="border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              🚚 Biriktirish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
