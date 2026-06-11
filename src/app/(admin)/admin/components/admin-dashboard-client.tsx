"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface WeeklyData {
  day: string;
  date: string;
  orders: number;
  revenue: number;
}

interface Alert {
  type: "warning" | "danger" | "info";
  message: string;
  link?: string;
}

interface PaymentBreakdown {
  cash: number;
  click: number;
  credit: number;
}

interface DashboardStats {
  dailySales: number;
  salesTrend: number;
  dailyDeliveries: number;
  deliveryTrend: number;
  newCustomersMonth: number;
  unreturnedBottles: number;
  totalDebt: number;
  weeklyData: WeeklyData[];
  alerts: Alert[];
  pendingOrders: number;
  inTransitOrders: number;
  cancelledToday: number;
  activeDrivers: number;
  paymentBreakdown: PaymentBreakdown;
  customersWithBottles: number;
  customersWithDebt: number;
  totalCustomerBottles: number;
}

export function AdminDashboardClient({ stats }: { stats: DashboardStats }) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const maxRevenue = Math.max(...stats.weeklyData.map((d) => d.revenue), 1);
  const totalWeeklyRevenue = stats.weeklyData.reduce((s, d) => s + d.revenue, 0);
  const totalWeeklyOrders = stats.weeklyData.reduce((s, d) => s + d.orders, 0);

  const paymentTotal = stats.paymentBreakdown.cash + stats.paymentBreakdown.click + stats.paymentBreakdown.credit;
  const cashPercent = paymentTotal > 0 ? Math.round((stats.paymentBreakdown.cash / paymentTotal) * 100) : 0;
  const clickPercent = paymentTotal > 0 ? Math.round((stats.paymentBreakdown.click / paymentTotal) * 100) : 0;
  const creditPercent = paymentTotal > 0 ? Math.round((stats.paymentBreakdown.credit / paymentTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analitika</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kompaniya ko'rsatkichlari</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/orders">
            <Button variant="success">+ Yangi Buyurtma</Button>
          </Link>
          <Button variant="outline" onClick={() => setIsExportOpen(true)}>📊 Hisobot</Button>
        </div>
      </div>

      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((alert, idx) => (
            <Link
              key={idx}
              href={alert.link || "#"}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer group ${
                alert.type === "danger"
                  ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                  : alert.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
              }`}
            >
              <span className="text-lg">
                {alert.type === "danger" ? "🚨" : alert.type === "warning" ? "⚠️" : "ℹ️"}
              </span>
              <p className="text-sm font-medium flex-1">{alert.message}</p>
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                Ko'rish →
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Kunlik sotuv"
          value={formatCurrency(stats.dailySales)}
          icon={<span className="text-xl">💰</span>}
          trend={stats.salesTrend !== 0 ? { value: Math.abs(stats.salesTrend), positive: stats.salesTrend > 0 } : undefined}
        />
        <StatCard
          title="Yetkazilgan"
          value={`${stats.dailyDeliveries} ta`}
          icon={<span className="text-xl">🚚</span>}
          trend={stats.deliveryTrend !== 0 ? { value: Math.abs(stats.deliveryTrend), positive: stats.deliveryTrend > 0 } : undefined}
        />
        <StatCard
          title="Yangi mijozlar"
          value={stats.newCustomersMonth}
          icon={<span className="text-xl">👤</span>}
          description="Shu oy"
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Qaytarilmagan idish</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.unreturnedBottles} ta</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.unreturnedBottles > 10 ? "⚠️ Diqqat!" : "✅ Norma"}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500">
              <span className="text-xl">🫙</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Jami idishlar (mijozlarda)</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.totalCustomerBottles} ta</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Idishli mijozlar</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{stats.customersWithBottles} ta</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/admin/orders" className="block">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all h-full">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Kutilayotgan</p>
                <p className="text-xl font-bold text-orange-600">{stats.pendingOrders}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-base">⏳</div>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Yo'lda</p>
              <p className="text-xl font-bold text-blue-600">{stats.inTransitOrders}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-base">🚛</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-900/50 p-4 shadow-sm h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Umumiy qarz</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(stats.totalDebt)}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{stats.customersWithDebt} ta mijoz</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-base">💳</div>
          </div>
          {stats.totalDebt > 0 && (
            <Link href="/admin/orders?filter=debt" className="block mt-2 text-[11px] font-medium text-red-600 dark:text-red-400 hover:underline">
              Barchasini ko'rish →
            </Link>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm h-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Haydovchilar</p>
              <p className="text-xl font-bold text-green-600">{stats.activeDrivers}</p>
              {stats.cancelledToday > 0 && (
                <p className="text-[10px] text-red-500 mt-0.5">❌ {stats.cancelledToday} bekor</p>
              )}
            </div>
            <div className="w-9 h-9 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-base">🚚</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Haftalik Buyurtmalar</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Oxirgi 7 kun</p>
            </div>
            <Badge variant="default">
              Jami: {formatCurrency(totalWeeklyRevenue)}
            </Badge>
          </div>

          <div className="flex items-end gap-3 h-36 px-2">
            {stats.weeklyData.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{item.orders} ta</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatCurrency(item.revenue)}</p>
                </div>
                <div
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-300 rounded-t-md transition-all group-hover:from-primary-600 group-hover:to-primary-400 min-h-[4px] cursor-pointer"
                  style={{ height: `${Math.max((item.revenue / maxRevenue) * 100, 4)}px` }}
                />
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.day}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.date}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{totalWeeklyOrders}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Jami buyurtmalar</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalWeeklyRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Jami tushum</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(totalWeeklyOrders / 7)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">O'rtacha kunlik</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Bugungi tushum taqsimoti</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">To'lov turi bo'yicha</p>

          {paymentTotal === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">💤</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Bugun hali tushum yo'q</p>
            </div>
          ) : (
            <>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeDasharray={`${cashPercent} ${100 - cashPercent}`}
                    strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3b82f6" strokeWidth="3"
                    strokeDasharray={`${clickPercent} ${100 - clickPercent}`}
                    strokeDashoffset={`${-(cashPercent)}`} />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f97316" strokeWidth="3"
                    strokeDasharray={`${creditPercent} ${100 - creditPercent}`}
                    strokeDashoffset={`${-(cashPercent + clickPercent)}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(paymentTotal)}</p>
                    <p className="text-[9px] text-gray-400">Jami</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Naqd pul</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.paymentBreakdown.cash)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({cashPercent}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Click/Payme</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.paymentBreakdown.click)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({clickPercent}%)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Qarzga (Nasiya)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.paymentBreakdown.credit)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({creditPercent}%)</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={isExportOpen} onClose={() => setIsExportOpen(false)} title="📊 Hisobot Yuklab Olish">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Quyidagi hisobotlardan birini tanlang. Ma'lumotlar Excel (XLSX) formatda yuklanadi.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleExport("daily")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">📋</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Kunlik hisobot</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Bugungi barcha buyurtmalar va tushumlar</p>
              </div>
            </button>

            <button
              onClick={() => handleExport("weekly")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">📊</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Haftalik hisobot</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Oxirgi 7 kunlik analitika va haydovchilar</p>
              </div>
            </button>

            <button
              onClick={() => handleExport("monthly")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">📈</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Oylik hisobot</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">To'liq oy davomidagi moliyaviy va logistik ma'lumotlar</p>
              </div>
            </button>

            <button
              onClick={() => handleExport("debts")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xl">💳</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Qarzlar ro'yxati</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Barcha qarzli mijozlar kontaktlari bilan</p>
              </div>
            </button>

            <button
              onClick={() => handleExport("bottles")}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition-all text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl">🫙</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Idishlar balansi</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Qaytarilmagan idishlar va mijozlar ro'yxati</p>
              </div>
            </button>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              💡 Hisobotlar .xlsx formatda yuklanadi. Excel, Google Sheets yoki boshqa dasturlarda ochish mumkin.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function handleExport(type: string) {
  const exportUrl = `/api/export?type=${type}&t=${Date.now()}`;
  window.open(exportUrl, "_blank");
}
