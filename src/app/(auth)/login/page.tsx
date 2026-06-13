"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error || "");
  const [successMsg, setSuccessMsg] = useState("");

  const getSubdomain = (): string => {
    if (typeof window === "undefined") return "";
    const urlParams = new URLSearchParams(window.location.search);
    const paramSubdomain = urlParams.get("subdomain");
    if (paramSubdomain) return paramSubdomain;
    const hostname = window.location.hostname;
    if (hostname.endsWith(".vercel.app")) return "";
    const baseDomain = "buloqwater.uz";
    if (hostname.endsWith(baseDomain) && hostname !== baseDomain && hostname !== `www.${baseDomain}`) {
      return hostname.replace(`.${baseDomain}`, "");
    }
    if (hostname.includes(".localhost")) return hostname.split(".")[0];
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const subdomain = getSubdomain();

      let formattedPhone = phone.replace(/\D/g, "");
      if (formattedPhone.startsWith("998") && formattedPhone.length === 12) {
        formattedPhone = `+${formattedPhone}`;
      } else if (formattedPhone.length === 9) {
        formattedPhone = `+998${formattedPhone}`;
      } else if (phone.startsWith("+")) {
        formattedPhone = phone;
      } else {
        formattedPhone = `+998${formattedPhone}`;
      }

      const result = await signIn("credentials", {
        phone: formattedPhone,
        password,
        subdomain,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg(result.error);
        setLoading(false);
      } else {
        setSuccessMsg("✅ Kirish muvaffaqiyatli! Kutib turing...");

        setTimeout(async () => {
          try {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();
            const role = session?.user?.role;

            if (role === "SUPER_ADMIN") router.push("/superadmin/dashboard");
            else if (role === "DIRECTOR") router.push("/admin");
            else if (role === "OPERATOR") router.push("/operator/orders");
            else if (role === "DRIVER") router.push("/driver/tasks");
            else if (role === "CUSTOMER") router.push("/customer");
            else router.push("/");

            router.refresh();
          } catch {
            router.push("/");
            router.refresh();
          }
        }, 500);
      }
    } catch (err) {
      setErrorMsg("Tizimda xatolik yuz berdi");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">

        {/* Logo — faqat logotip, takroriy sarlavhasiz */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="relative h-36 sm:h-56 mx-auto mb-2">
              <img
                src="/image.png"
                alt="BuloqWater Logo"
                className="w-full h-full object-contain transition-all duration-300"
              />
            </div>
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">Suv yetkazish boshqaruv tizimi</p>
        </div>

        {/* Success Toast */}
        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm font-medium text-center animate-in">
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {successMsg}
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Tizimga kirish</h2>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm animate-in">
              ❌ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon raqami</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">+998</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="901234567"
                  className="w-full pl-14 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                  required
                  maxLength={9}
                  disabled={loading || !!successMsg}
                />
              </div>
            </div>

            {/* Parol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parol</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 pr-12 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                  required
                  disabled={loading || !!successMsg}
                />
                {/* Ko'zcha ikonkasi — placeholder rangi bilan bir xil, diqqatni chalg'itmaydi */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit — primary-600 for better contrast */}
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 hover:shadow-primary-600/35 active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Tekshirilmoqda...
                </span>
              ) : successMsg ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Yo'naltirilmoqda...
                </span>
              ) : (
                "Kirish"
              )}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 space-y-2 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Parolni unutdingizmi?{" "}
            <Link href="/forgot-password" className="text-primary-600 font-medium hover:underline">
              Tiklash
            </Link>
          </p>
          <p>
            Hisobingiz yo&apos;qmi?{" "}
            <Link href="/register" className="text-primary-600 font-medium hover:underline">
              Ro&apos;yxatdan o&apos;tish
            </Link>
          </p>
        </div>

        {/* Dinamik copyright yili */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          &copy; {new Date().getFullYear()} BuloqWater. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
