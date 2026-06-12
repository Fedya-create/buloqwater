"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { getRolePermissions, saveRolePermissions, resetToDefault } from "@/actions/superadmin-rbac-actions";

const ROLE_META: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  DIRECTOR: { label: "Direktor",  icon: "👑", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",   desc: "Kompaniya egasi — barcha ruxsatlar" },
  OPERATOR: { label: "Operator",  icon: "🖥",  color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",       desc: "Buyurtma va mijozlar bilan ishlaydi" },
  DRIVER:   { label: "Haydovchi", icon: "🚚", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",   desc: "Yetkazib berish bilan shug'ullanadi" },
};

const CATEGORY_ICONS: Record<string, string> = {
  users: "👥", orders: "📦", customers: "🧑‍💼", products: "🛍️", reports: "📊", settings: "⚙️", staff: "👤",
};

export default function RBACPage() {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState("DIRECTOR");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    const r = await getRolePermissions();
    if (r.success && r.data) {
      setPermissions(r.data.permissions);
      setRolePerms(r.data.rolePermissions);
    }
    setLoading(false);
    setIsDirty(false);
  };

  useEffect(() => { load(); }, []);

  const hasPermission = (key: string) => (rolePerms[selectedRole] || []).includes(key);

  const togglePermission = (key: string) => {
    setRolePerms(prev => {
      const current = prev[selectedRole] || [];
      const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, [selectedRole]: updated };
    });
    setIsDirty(true);
  };

  const toggleCategory = (cat: string) => {
    const catPerms = permissions.filter(p => p.category === cat).map(p => p.key);
    const allSelected = catPerms.every(k => hasPermission(k));
    setRolePerms(prev => {
      const current = prev[selectedRole] || [];
      const updated = allSelected
        ? current.filter(k => !catPerms.includes(k))
        : [...new Set([...current, ...catPerms])];
      return { ...prev, [selectedRole]: updated };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await saveRolePermissions(selectedRole, rolePerms[selectedRole] || []);
    if (r.success) { showToast((r as any).message || "Saqlandi"); setIsDirty(false); }
    else showToast((r as any).error, "error");
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm("Barcha rollarni default holga qaytarasizmi?")) return;
    setSaving(true);
    const r = await resetToDefault();
    if (r.success) { showToast("Default ruxsatlar tiklandi"); load(); }
    else showToast((r as any).error, "error");
    setSaving(false);
  };

  const categories = [...new Set(permissions.map(p => p.category))];

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <PageHeader
        title="Rollar & Ruxsatlar"
        description="RBAC — kimga nima ko'rinadi"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>🔄 Default</Button>
            {isDirty && <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "..." : "💾 Saqlash"}</Button>}
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Rol tanlash */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Rollar</h3>
            {Object.entries(ROLE_META).map(([role, meta]) => {
              const count = (rolePerms[role] || []).length;
              return (
                <button key={role} onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedRole === role ? "border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600"}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${meta.color}`}>{meta.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</p>
                      <p className="text-xs text-primary-500">{count} ruxsat</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{meta.desc}</p>
                </button>
              );
            })}

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-3 mt-4">
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">ℹ️ Ma'lumot</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Super Admin va Customer rollari avtomatik boshqariladi.</p>
            </div>
          </div>

          {/* Ruxsatlar jadvali */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {ROLE_META[selectedRole]?.icon} {ROLE_META[selectedRole]?.label} — Ruxsatlar
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {(rolePerms[selectedRole] || []).length} / {permissions.length} ta tanlangan
              </span>
            </div>

            {categories.map(cat => {
              const catPerms = permissions.filter(p => p.category === cat);
              const selectedCount = catPerms.filter(p => hasPermission(p.key)).length;
              const allSelected = selectedCount === catPerms.length;
              const someSelected = selectedCount > 0 && !allSelected;

              return (
                <div key={cat} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => toggleCategory(cat)}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_ICONS[cat] || "🔧"}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{cat}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({selectedCount}/{catPerms.length})</span>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${allSelected ? "bg-primary-500 border-primary-500 text-white" : someSelected ? "bg-primary-200 dark:bg-primary-800 border-primary-400" : "border-gray-300 dark:border-gray-600"}`}>
                      {allSelected && <span className="text-white text-xs">✓</span>}
                      {someSelected && <span className="text-primary-600 dark:text-primary-300 text-xs">—</span>}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {catPerms.map(perm => (
                      <label key={perm.key} className="flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={hasPermission(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{perm.label}</p>
                          <code className="text-xs text-gray-400 dark:text-gray-500">{perm.key}</code>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
