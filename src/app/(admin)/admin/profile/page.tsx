"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getRoleLabel, formatDateOnly } from "@/lib/utils";
import { getProfile, updateProfile } from "@/actions/profile-actions";
import { ImageUpload } from "@/components/ui/image-upload";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("998")) {
      const rest = digits.slice(3);
      if (rest.length <= 2) return `+998 (${rest}`;
      if (rest.length <= 5) return `+998 (${rest.slice(0, 2)}) ${rest.slice(2)}`;
      if (rest.length <= 7) return `+998 (${rest.slice(0, 2)}) ${rest.slice(2, 5)}-${rest.slice(5)}`;
      return `+998 (${rest.slice(0, 2)}) ${rest.slice(2, 5)}-${rest.slice(5, 7)}-${rest.slice(7, 9)}`;
    }
    if (digits.length <= 2) return `+998 (${digits}`;
    if (digits.length <= 5) return `+998 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `+998 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `+998 (${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length > 12) return;
    setFormData({ ...formData, phone: value });
  };

  const getRawPhone = (formatted: string) => {
    const digits = formatted.replace(/\D/g, "");
    if (digits.startsWith("998")) return `+${digits}`;
    return `+998${digits}`;
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    (async () => {
      const r = await getProfile();
      if (r.success && r.data) {
        setProfile(r.data);
        setFormData({ name: r.data.name, phone: r.data.phone });
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast("error", "Ism bo'sh bo'lishi mumkin emas"); return; }
    setSaving(true);
    const rawPhone = getRawPhone(formData.phone);
    const r = await updateProfile({ name: formData.name.trim(), phone: rawPhone });
    if (r.success) {
      showToast("success", "Profil ma'lumotlari muvaffaqiyatli yangilandi!");
      const pr = await getProfile();
      if (pr.success && pr.data) setProfile(pr.data);
    } else {
      showToast("error", r.error);
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) { showToast("error", "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak"); return; }
    if (passwordData.newPassword !== passwordData.confirmPassword) { showToast("error", "Yangi parollar bir-biriga mos kelmaydi"); return; }
    if (passwordData.currentPassword === passwordData.newPassword) { showToast("error", "Yangi parol joriy paroldan farqli bo'lishi kerak"); return; }

    setSaving(true);
    const r = await updateProfile({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
    if (r.success) {
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("success", "Parol muvaffaqiyatli yangilandi!");
    } else {
      showToast("error", r.error);
    }
    setSaving(false);
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: "Kuchsiz", color: "bg-red-500" };
    if (score <= 2) return { level: 2, label: "O'rtacha", color: "bg-yellow-500" };
    if (score <= 3) return { level: 3, label: "Yaxshi", color: "bg-blue-500" };
    return { level: 4, label: "Kuchli", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);
  const isPasswordFormValid = passwordData.currentPassword && passwordData.newPassword.length >= 6 && passwordData.confirmPassword === passwordData.newPassword;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg border animate-in max-w-sm ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          <p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.text}</p>
        </div>
      )}

      <PageHeader title="Profil" description="Shaxsiy ma'lumotlarni tahrirlash" />

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-18 h-18 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-2xl w-[72px] h-[72px]">
                {profile?.name?.charAt(0)}
              </div>
              <button
                type="button"
                className="absolute inset-0 w-full h-full rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Rasm yuklash (tez orada)"
              >
                <span className="text-white text-lg">📷</span>
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge>{getRoleLabel(profile?.role)}</Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">Qo'shilgan: {formatDateOnly(profile?.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ism familiya <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁa-zA-ZʼʻOʻoʻ\s'-]/g, "");
                setFormData({ ...formData, name: val });
              }}
              placeholder="Bobur Toshmatov"
              required
              maxLength={50}
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Faqat harflar, bo'shliq va chiziqcha</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon raqami <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.phone.includes("(") ? formData.phone : formatPhoneInput(formData.phone.replace(/\D/g, "").replace(/^(\+)?998/, ""))}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+998 (90) 123-45-67"
              required
            />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Format: +998 (XX) XXX-XX-XX</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving || !formData.name.trim()}>
              {saving ? "Saqlanmoqda..." : "💾 Saqlash"}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="text-lg">🔑</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Parolni o'zgartirish</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Xavfsizlik uchun kuchli parol tanlang</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Joriy parol</label>
            <div className="relative">
              <Input
                type={showPasswords.current ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
                placeholder="Hozirgi parolingiz"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPasswords.current ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yangi parol</label>
            <div className="relative">
              <Input
                type={showPasswords.new ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Kamida 6 ta belgi"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPasswords.new ? "🙈" : "👁️"}
              </button>
            </div>
            {passwordData.newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className={`h-1.5 flex-1 rounded-full transition-all ${level <= passwordStrength.level ? passwordStrength.color : "bg-gray-200 dark:bg-gray-700"}`} />
                  ))}
                </div>
                <p className={`text-[11px] font-medium ${passwordStrength.color.replace("bg-", "text-")}`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yangi parolni tasdiqlash</label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
                minLength={6}
                placeholder="Yangi parolni qayta kiriting"
                className={`pr-10 ${passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword ? "border-red-300 dark:border-red-700" : passwordData.confirmPassword && passwordData.confirmPassword === passwordData.newPassword ? "border-green-300 dark:border-green-700" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPasswords.confirm ? "🙈" : "👁️"}
              </button>
            </div>
            {passwordData.confirmPassword && (
              <p className={`text-[11px] mt-1 font-medium ${passwordData.confirmPassword === passwordData.newPassword ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {passwordData.confirmPassword === passwordData.newPassword ? "✅ Parollar mos" : "❌ Parollar mos kelmaydi"}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving || !isPasswordFormValid}
              className={`transition-all ${isPasswordFormValid ? "opacity-100" : "opacity-50"}`}
            >
              {saving ? "O'zgartirilmoqda..." : "🔑 Parolni o'zgartirish"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
