"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { getSecurityStats } from "@/actions/superadmin-security-actions";

export default function SecurityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await getSecurityStats();
    if (r.success && r.data) setData(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d: string) => new Date(d).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative">
      <PageHeader title="Xavfsizlik" description="Login tarixi, sessiyalar va himoya" action={<Button variant="outline" size="sm" onClick={load}>🔄</Button>} />

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">Ma'lumot yuklanmadi</div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Jami loginlar",    value: data.totalLogins,  icon: "🔑", color: "text-gray-900 dark:text-white" },
              { label: "Bugungi loginlar", value: data.todayLogins,  icon: "📅", color: "text-blue-600" },
              { label: "Haftalik loginlar",value: data.weekLogins,   icon: "📊", color: "text-primary-600" },
              { label: "Unikal foydalanuvchilar", value: data.uniqueUsers, icon: "👥", color: "text-green-600" },
              { label: "Bloklangan",       value: data.blockedUsers, icon: "🚫", color: data.blockedUsers > 0 ? "text-red-500" : "text-gray-500" },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 2FA va boshqa xavfsizlik sozlamalari */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { icon: "🔐", title: "2FA (Ikki faktorli tasdiqlash)", desc: "Hozirda o'chirilgan. Super Admin uchun ixtiyoriy.", status: "off", action: "Yoqish" },
              { icon: "📍", title: "IP Whitelist", desc: "Faqat ruxsat etilgan IP manzillardan kirish.", status: "off", action: "Sozlash" },
              { icon: "📱", title: "Qurilmalar kuzatuvi", desc: "Noma'lum qurilmadan kirishda ogohlantirish.", status: "on", action: "Ko'rish" },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">{item.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === "on" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                      {item.status === "on" ? "✅ Yoqilgan" : "⭕ O'chirilgan"}
                    </span>
                    <Button variant="outline" size="sm">{item.action}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Login tarixi */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">So'nggi Login Tarixi</h3>
            </div>
            {data.recentLogins.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500"><p className="text-3xl mb-2">🔑</p>Login tarixi yo'q</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {data.recentLogins.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-sm font-bold">
                      {l.userName?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{l.userName || l.userId}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {l.userRole && <span>{l.userRole}</span>}
                        {l.companyName && <><span>·</span><span>{l.companyName}</span></>}
                        {l.ipAddress && <><span>·</span><span>📍 {l.ipAddress}</span></>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.action === "login" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                        {l.action === "login" ? "🔑 Kirdi" : "🚪 Chiqdi"}
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(l.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
