"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { getSystemHealth } from "@/actions/superadmin-health-actions";

export default function PaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await getSystemHealth();
      if (r.success && r.data) setData(r.data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="To'lovlar" description="Obuna to'lovlari va moliyaviy ko'rsatkichlar" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Faol obunalar" value={data?.companies.active || 0} icon={<span className="text-xl">✅</span>} />
        <StatCard title="Muddati tugayotgan" value={data?.companies.expiringSoon || 0} icon={<span className="text-xl">⏰</span>} description="7 kun ichida" />
        <StatCard title="Muzlatilgan" value={data?.companies.suspended || 0} icon={<span className="text-xl">⏸️</span>} />
        <StatCard title="Jami kompaniyalar" value={data?.companies.total || 0} icon={<span className="text-xl">🏢</span>} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">To'lov Tariflari</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">📋</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Standart</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Asosiy funksiyalar</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">200,000 <span className="text-sm font-normal text-gray-500">so'm/oy</span></p>
            <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>✓ 500 mijoz</li>
              <li>✓ 20 xodim</li>
              <li>✓ Buyurtma boshqaruvi</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 relative">
            <Badge className="absolute top-3 right-3 text-[9px]" variant="default">Mashhur</Badge>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xl">⭐</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Premium</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kengaytirilgan</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">400,000 <span className="text-sm font-normal text-gray-500">so'm/oy</span></p>
            <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>✓ 2000 mijoz</li>
              <li>✓ 50 xodim</li>
              <li>✓ Analitika + Hisobotlar</li>
              <li>✓ Telegram bot</li>
            </ul>
          </div>
          <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">🚀</div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Enterprise</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cheksiz</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">800,000 <span className="text-sm font-normal text-gray-500">so'm/oy</span></p>
            <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <li>✓ Cheksiz mijoz</li>
              <li>✓ Cheksiz xodim</li>
              <li>✓ API integratsiya</li>
              <li>✓ Shaxsiy menejor</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">To'lov Tarixi</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">So'nggi to'lovlar va tranzaksiyalar</p>
        <div className="text-center py-8">
          <p className="text-3xl mb-2">💳</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">To'lov tarixi tez orada qo'shiladi</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Payme/Click integratsiya talab etiladi</p>
        </div>
      </div>
    </div>
  );
}
