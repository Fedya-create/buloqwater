"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { registerCustomer } from "@/actions/register-actions";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (step === 1) {
      if (form.phone.length < 9) { setError("Telefon raqam to'liq kiriting"); return; }
      if (form.password.length < 6) { setError("Parol kamida 6 ta belgi bo'lishi kerak"); return; }
      if (form.password !== form.confirmPassword) { setError("Parollar mos kelmaydi"); return; }
      setStep(2);
      return;
    }

    // Step 2 — register
    if (!form.name) { setError("Ismingizni kiriting"); return; }

    setLoading(true);

    const phone = form.phone.startsWith("+") ? form.phone : `+998${form.phone.replace(/\D/g, "")}`;

    const result = await registerCustomer({
      name: form.name,
      phone,
      password: form.password,
    });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Muvaffaqiyatli! Toast ko'rsatish
    setSuccess("🎉 Ro'yxatdan muvaffaqiyatli o'tdingiz! Tizimga kirilmoqda...");

    // Avtomatik login
    const signInResult = await signIn("credentials", {
      phone,
      password: form.password,
      subdomain: "",
      redirect: false,
    });

    if (signInResult?.error) {
      // Login xato — login sahifaga
      setTimeout(() => router.push("/login"), 1000);
    } else {
      setTimeout(() => {
        router.push("/customer");
        router.refresh();
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/icon.svg" alt="BuloqWater" className="h-20 sm:h-32 mx-auto mb-4 object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ro&apos;yxatdan o&apos;tish</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Yangi hisob yarating</p>
        </div>

        {/* Success Toast */}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-medium text-center animate-in">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 max-w-xs mx-auto">
          <div className={`flex-1 h-1.5 rounded-full ${step >= 1 ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"}`} />
          <div className={`flex-1 h-1.5 rounded-full ${step >= 2 ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"}`} />
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-1">
            {step === 1 ? "1. Telefon va parol" : "2. Ismingiz"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            {step === 1 ? "Kirish uchun telefon va parol o'ylab toping" : "Ismingizni kiriting"}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+998</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder="901234567"
                      className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                      required
                      maxLength={9}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Kamida 6 ta belgi"
                      className="w-full px-4 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parolni tasdiqlang</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Parolni qayta kiriting"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ism familiya</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Aziza Nazarova"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                    required
                    autoFocus
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
                >
                  ← Orqaga
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Yaratilmoqda...
                  </span>
                ) : step === 1 ? (
                  "Davom etish →"
                ) : (
                  "Ro'yxatdan o'tish ✅"
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="text-primary-500 font-medium hover:underline">
            Tizimga kirish
          </Link>
        </p>

        {/* Firma egasi bo'limi */}
        <div className="mt-6">
          <Link href="/register/business" className="block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all text-center">
            <span className="text-2xl block mb-2">🏢</span>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Firma egasimisiz?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Platformaga firma sifatida qo'shilish uchun zayavka bering</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
