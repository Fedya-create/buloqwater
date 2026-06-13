"use client";

import { useState } from "react";
import Link from "next/link";
import { submitApplication } from "@/actions/application-actions";

export default function BusinessRegisterPage() {
  const [form, setForm] = useState({ companyName: "", ownerName: "", phone: "", address: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.companyName || !form.ownerName || !form.phone) { setError("Barcha majburiy maydonlarni to'ldiring"); return; }

    setLoading(true);
    const phone = form.phone.startsWith("+") ? form.phone : `+998${form.phone.replace(/\D/g, "")}`;
    const result = await submitApplication({ ...form, phone });

    if (result.success) { setSuccess(true); }
    else { setError(result.error); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <span className="text-5xl block mb-4">🎉</span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Zayavka yuborildi!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sizning zayavkangiz qabul qilindi. Adminlar tez orada siz bilan bog'lanadi.</p>
            <Link href="/" className="inline-block px-6 py-3 bg-primary-500 text-white font-medium rounded-xl hover:bg-primary-600 transition-all">
              Bosh sahifaga qaytish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/register">
            <img src="/icon.svg" alt="BuloqWater" className="h-16 sm:h-24 mx-auto mb-4 object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏢 Firma zayavkasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platformaga firma sifatida qo'shilish</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          {error && <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kompaniya nomi <span className="text-red-500">*</span></label>
              <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Shifo Suv MChJ" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direktor ismi <span className="text-red-500">*</span></label>
              <input type="text" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Bobur Toshmatov" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon raqami <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+998</span>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} placeholder="901234567" className="w-full pl-14 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" required maxLength={9} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manzil</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Toshkent sh., Yunusobod tumani" className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qo'shimcha ma'lumot</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Firmangiz haqida qisqa ma'lumot..." className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none" rows={3} />
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-[0.98]">
              {loading ? "Yuborilmoqda..." : "📨 Zayavka yuborish"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          <Link href="/register" className="text-primary-500 font-medium hover:underline">← Oddiy ro'yxatdan o'tish</Link>
        </p>
      </div>
    </div>
  );
}
