"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from "@/actions/forgot-password-action";

// ─── Bosqichlar ───────────────────────────────────────────────────────────────
type Step = "phone" | "otp" | "newPassword" | "success";

const RESEND_COOLDOWN = 60; // soniya

// ─── Logotip + izoh (har bosqichda bir xil) ──────────────────────────────────
function Logo() {
  return (
    <div className="text-center mb-8">
      <Link href="/login">
        <div className="relative h-36 sm:h-56 mx-auto mb-2">
          <img src="/image.png" alt="BuloqWater Logo" className="w-full h-full object-contain" />
        </div>
      </Link>
      <p className="text-sm text-gray-500 dark:text-gray-400">Suv yetkazish boshqaruv tizimi</p>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
const STEPS: Step[] = ["phone", "otp", "newPassword", "success"];
const STEP_LABELS = ["Telefon", "Tasdiqlash", "Yangi parol", "Tayyor"];

function ProgressBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center flex-1">
            {/* Doira */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  active ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>
            {/* Chiziq (oxirgisidan keyin yo'q) */}
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded transition-all duration-300 ${done ? "bg-green-400" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Xato banneri ─────────────────────────────────────────────────────────────
function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
      <span className="shrink-0 mt-0.5">❌</span>
      <span>{msg}</span>
    </div>
  );
}

// ─── Asosiy komponent ─────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // OTP input lar uchun ref massiv
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Qayta yuborish taymeri
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Step 1: Telefon yuborish ─────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await sendPasswordResetOtp(phone);
    setLoading(false);

    if (!res.success) { setError(res.error); return; }

    setUserName(res.data!.name);
    setMaskedPhone(res.data!.maskedPhone);
    setCooldown(RESEND_COOLDOWN);
    setOtp(["", "", "", "", "", ""]);
    setStep("otp");
    // Birinchi OTP katakchaga fokus
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  // ── OTP qayta yuborish ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);
    const res = await sendPasswordResetOtp(phone);
    setLoading(false);
    if (!res.success) { setError(res.error); return; }
    setCooldown(RESEND_COOLDOWN);
    setOtp(["", "", "", "", "", ""]);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  // ── OTP input handler ───────────────────────────────────────────────────
  const handleOtpChange = useCallback((index: number, value: string) => {
    // Paste: 6 xonali kodni to'g'ridan-to'g'ri qo'yib olish
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      setOtp(value.split(""));
      otpRefs.current[5]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Step 2: OTP tekshirish ───────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Barcha 6 ta raqamni kiriting"); return; }
    setError("");
    setLoading(true);

    const res = await verifyPasswordResetOtp(phone, code);
    setLoading(false);

    if (!res.success) { setError(res.error); return; }
    setStep("newPassword");
  };

  // ── Step 3: Yangi parol saqlash ─────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Parollar mos kelmadi"); return;
    }
    if (newPassword.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak"); return;
    }

    setLoading(true);
    const res = await resetPassword(phone, newPassword, confirmPassword);
    setLoading(false);

    if (!res.success) { setError(res.error); return; }
    setStep("success");
  };

  // ── Parol kuchi indikatori ──────────────────────────────────────────────
  const strength = newPassword.length === 0 ? 0
    : newPassword.length < 6 ? 1
    : newPassword.length < 8 ? 2
    : /[A-Z]/.test(newPassword) && /\d/.test(newPassword) ? 4
    : 3;
  const strengthLabel = ["", "Juda zaif", "Zaif", "O'rtacha", "Kuchli"];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Logo />

        <ProgressBar current={step} />

        {/* ══════════════════ STEP 1 — TELEFON ══════════════════ */}
        {step === "phone" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Parolni tiklash</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Telefon raqamingizga 6 xonali tasdiqlash kodi yuboramiz.
              </p>
            </div>

            <ErrorBanner msg={error} />

            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon raqami
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
                    +998
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="901234567"
                    maxLength={9}
                    required
                    disabled={loading}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 9}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 active:scale-[0.98] disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Yuborilmoqda...
                  </span>
                ) : "SMS kod yuborish"}
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════ STEP 2 — OTP ══════════════════ */}
        {step === "otp" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Tasdiqlash kodi</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{maskedPhone}</span> raqamiga
                yuborilgan 6 xonali kodni kiriting.
              </p>
            </div>

            <ErrorBanner msg={error} />

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* OTP katakchalar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tasdiqlash kodi
                </label>
                <div className="flex gap-2 justify-between">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      disabled={loading}
                      className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150
                        ${digit
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                          : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        }
                        focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900
                        disabled:opacity-50`}
                    />
                  ))}
                </div>
              </div>

              {/* Qayta yuborish */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Kod kelmadimi?</span>
                {cooldown > 0 ? (
                  <span className="text-gray-400 dark:text-gray-500 tabular-nums">
                    {cooldown}s kutish
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
                  >
                    Qayta yuborish
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setError(""); }}
                  className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  ← Orqaga
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.join("").length < 6}
                  className="flex-[2] py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 active:scale-[0.98] disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Tekshirilmoqda...
                    </span>
                  ) : "Tasdiqlash"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════ STEP 3 — YANGI PAROL ══════════════════ */}
        {step === "newPassword" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Yangi parol</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span>, yangi parolingizni belgilang.
              </p>
            </div>

            <ErrorBanner msg={error} />

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Yangi parol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yangi parol
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kamida 6 ta belgi"
                    required
                    disabled={loading}
                    className="w-full px-4 pr-12 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                    aria-label={showNew ? "Yashirish" : "Ko'rsatish"}
                  >
                    {showNew ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Parol kuchi indikatori */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            strength >= lvl ? strengthColor[strength] : "bg-gray-200 dark:bg-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      strength <= 1 ? "text-red-500" :
                      strength === 2 ? "text-orange-400" :
                      strength === 3 ? "text-yellow-500" : "text-green-500"
                    }`}>
                      {strengthLabel[strength]}
                    </p>
                  </div>
                )}
              </div>

              {/* Tasdiqlash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parolni tasdiqlang
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Parolni qayta kiriting"
                    required
                    disabled={loading}
                    className={`w-full px-4 pr-12 py-3 border rounded-xl focus:ring-2 focus:border-primary-500 outline-none transition-all text-sm disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400
                      ${confirmPassword && newPassword !== confirmPassword
                        ? "border-red-400 focus:ring-red-100 dark:focus:ring-red-900"
                        : confirmPassword && newPassword === confirmPassword
                        ? "border-green-400 focus:ring-green-100 dark:focus:ring-green-900"
                        : "border-gray-200 dark:border-gray-600 focus:ring-primary-100"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    {showConfirm ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {/* Mos/mos emas belgisi */}
                {confirmPassword && (
                  <p className={`text-xs mt-1 font-medium ${newPassword === confirmPassword ? "text-green-500" : "text-red-500"}`}>
                    {newPassword === confirmPassword ? "✓ Parollar mos" : "✗ Parollar mos emas"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 active:scale-[0.98] disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saqlanmoqda...
                  </span>
                ) : "Parolni saqlash"}
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════ STEP 4 — MUVAFFAQIYAT ══════════════════ */}
        {step === "success" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
            <div className="flex items-center justify-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Parol muvaffaqiyatli o'zgartirildi!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              <span className="font-medium text-gray-700 dark:text-gray-300">{userName}</span>, endi
              yangi parolingiz bilan tizimga kirishingiz mumkin.
            </p>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 py-3 px-8 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/25 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Tizimga kirish
            </Link>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          &copy; {new Date().getFullYear()} BuloqWater. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
