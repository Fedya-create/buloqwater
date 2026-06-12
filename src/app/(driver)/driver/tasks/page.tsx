"use client";

import { useState, useEffect } from "react";
import { getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";
import { getDriverOrders, deliverOrder } from "@/actions/order-actions";

export default function DriverTasksPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliverModal, setDeliverModal] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<"CASH" | "CLICK" | "CREDIT">("CASH");
  const [bottlesReturned, setBottlesReturned] = useState(0);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadOrders = async () => { setLoading(true); const r = await getDriverOrders(); if (r.success) setOrders(r.data as any); setLoading(false); };
  useEffect(() => { loadOrders(); }, []);

  const openDeliverModal = (order: any) => {
    setDeliverModal(order);
    setPaymentType("CASH");
    setBottlesReturned(order.bottlesDelivered);
  };

  const handleDeliver = async () => {
    if (!deliverModal) return;
    setDeliverLoading(true);
    const r = await deliverOrder({ orderId: deliverModal.id, paymentType, bottlesReturned });
    if (r.success) { setDeliverModal(null); setToast("Buyurtma muvaffaqiyatli yakunlandi!"); setTimeout(() => setToast(null), 3000); loadOrders(); }
    setDeliverLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      <p className="text-sm text-gray-500">Yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-green-500 text-white shadow-lg animate-bounce">
          <p className="text-sm font-medium">✅ {toast}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vazifalarim</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{orders.length} ta buyurtma kutmoqda</p>
        </div>
        <button onClick={loadOrders} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all">
          🔄
        </button>
      </div>

      {/* Empty state */}
      {orders.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Barcha vazifalar bajarildi!</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Yangi buyurtma tushganda bu yerda ko'rinadi</p>
          <button onClick={loadOrders} className="mt-6 px-6 py-3 bg-primary-500 text-white rounded-xl font-medium shadow-lg active:scale-95 transition-all">
            Yangilash
          </button>
        </div>
      )}

      {/* Order Cards */}
      <div className="space-y-4">
        {orders.map((order, idx) => {
          const isLate = (Date.now() - new Date(order.createdAt).getTime()) > 7200000; // 2 soat
          return (
            <div
              key={order.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-all ${isLate ? "ring-2 ring-red-300 dark:ring-red-700" : ""}`}
            >
              {/* Top: Order Number + Status */}
              <div className={`px-5 py-3 flex items-center justify-between ${isLate ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-700/50"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${isLate ? "bg-red-500" : "bg-primary-500"}`}>
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{order.customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">#{order.orderNumber} {isLate && "· ⚠️ Kechikmoqda"}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
              </div>

              {/* Info */}
              <div className="px-5 py-4 space-y-3">
                {/* Manzil - KATTA SHRIFT */}
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">📍</span>
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{order.customer.address}</p>
                    {order.customer.landmark && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Mo'ljal: {order.customer.landmark}</p>
                    )}
                  </div>
                </div>

                {/* Mahsulotlar */}
                <div className="flex items-start gap-3">
                  <span className="text-xl">📦</span>
                  <div className="flex flex-wrap gap-1.5">
                    {order.items.map((item: any, i: number) => (
                      <span key={i} className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                        {item.product.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons - JUDA KATTA */}
              <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                <a
                  href={`tel:${order.customer.phone1}`}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-blue-500 text-white active:scale-95 transition-all shadow-md"
                >
                  <span className="text-2xl">📞</span>
                  <span className="text-xs font-bold">Qo'ng'iroq</span>
                </a>

                <a
                  href={order.customer.locationLink || `https://yandex.uz/maps/?text=${encodeURIComponent(order.customer.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-purple-500 text-white active:scale-95 transition-all shadow-md"
                >
                  <span className="text-2xl">🗺️</span>
                  <span className="text-xs font-bold">
                    {order.customer.locationLink ? "Yandex Maps" : "Xarita"}
                  </span>
                </a>

                <button
                  onClick={() => openDeliverModal(order)}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-green-500 text-white active:scale-95 transition-all shadow-md"
                >
                  <span className="text-2xl">✅</span>
                  <span className="text-xs font-bold">Yopish</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deliver Drawer (pastdan chiqadi) */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeliverModal(null)} />
          
          {/* Drawer */}
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-6">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Buyurtmani yakunlash</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{deliverModal.customer.name} · {formatCurrency(deliverModal.totalAmount)}</p>
              </div>

              {/* To'lov turi */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">To'lov turi</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "CASH" as const, label: "Naqd", icon: "💵", color: "green" },
                    { value: "CLICK" as const, label: "Click/Payme", icon: "📱", color: "blue" },
                    { value: "CREDIT" as const, label: "Qarz", icon: "📝", color: "orange" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`flex flex-col items-center gap-2 py-5 rounded-2xl border-2 transition-all active:scale-95 ${
                        paymentType === opt.value
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                      }`}
                      onClick={() => setPaymentType(opt.value)}
                    >
                      <span className="text-3xl">{opt.icon}</span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bo'sh idish */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Qaytarilgan baxlalar <span className="text-gray-400 dark:text-gray-500 font-normal">(berilgan: {deliverModal.bottlesDelivered})</span>
                </p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    className="w-14 h-14 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-2xl font-bold hover:bg-gray-200 active:scale-90 transition-all"
                    onClick={() => setBottlesReturned(Math.max(0, bottlesReturned - 1))}
                  >
                    −
                  </button>
                  <span className="text-4xl font-bold text-gray-900 min-w-[60px] text-center">
                    {bottlesReturned}
                  </span>
                  <button
                    type="button"
                    className="w-14 h-14 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-2xl font-bold hover:bg-gray-200 active:scale-90 transition-all"
                    onClick={() => setBottlesReturned(bottlesReturned + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Yakunlash tugmasi */}
              <button
                onClick={handleDeliver}
                disabled={deliverLoading}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-lg font-bold rounded-2xl shadow-lg shadow-green-500/30 active:scale-[0.98] transition-all"
              >
                {deliverLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full" />
                    Yakunlanmoqda...
                  </span>
                ) : (
                  "✅ Yakunlash"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
