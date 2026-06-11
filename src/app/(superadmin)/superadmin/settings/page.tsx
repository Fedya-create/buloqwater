"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getSettings, updateMultipleSettings, resetSettings } from "@/actions/superadmin-settings-actions";

interface Setting {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string | null;
  category: string;
}

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    const r = await getSettings();
    if (r.success && r.data) {
      setSettings(r.data as Setting[]);
      const values: Record<string, string> = {};
      (r.data as Setting[]).forEach((s) => { values[s.key] = s.value; });
      setEditValues(values);
      setChangedKeys(new Set());
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
    const original = settings.find((s) => s.key === key);
    if (original && original.value !== value) {
      setChangedKeys((prev) => new Set(prev).add(key));
    } else {
      setChangedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  const handleSaveAll = async () => {
    if (changedKeys.size === 0) return;
    setSaving(true);
    const updates = Array.from(changedKeys).map((key) => ({ key, value: editValues[key] }));
    const r = await updateMultipleSettings(updates);
    if (r.success) {
      showToast("Sozlamalar saqlandi!");
      loadData();
    } else {
      showToast(r.error, "error");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm("Barcha sozlamalarni boshlang'ich holatiga qaytarmoqchimisiz?")) return;
    setSaving(true);
    const r = await resetSettings();
    if (r.success) { showToast("Sozlamalar tiklandi!"); loadData(); }
    else showToast(r.error, "error");
    setSaving(false);
  };

  const categories = [
    { key: "general", label: "Umumiy", icon: "⚙️" },
    { key: "limits", label: "Limitlar", icon: "📊" },
    { key: "subscription", label: "Obuna", icon: "💳" },
    { key: "system", label: "Tizim", icon: "🖥️" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border animate-in ${toast.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"}`}>
          <p className="text-sm font-medium">{toast.type === "success" ? "✅" : "❌"} {toast.message}</p>
        </div>
      )}

      <PageHeader
        title="Global Sozlamalar"
        description={`${settings.length} ta sozlama`}
        action={
          <div className="flex items-center gap-2">
            {changedKeys.size > 0 && (
              <Badge variant="warning">{changedKeys.size} ta o'zgarish</Badge>
            )}
            <Button variant="outline" onClick={handleReset} disabled={saving}>🔄 Tiklash</Button>
            <Button onClick={handleSaveAll} disabled={saving || changedKeys.size === 0}>
              {saving ? "Saqlanmoqda..." : "💾 Saqlash"}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {categories.map((category) => {
          const catSettings = settings.filter((s) => s.category === category.key);
          if (catSettings.length === 0) return null;
          return (
            <div key={category.key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{category.label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{catSettings.length} ta sozlama</p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {catSettings.map((setting) => {
                  const isBoolean = setting.value === "true" || setting.value === "false";
                  const isChanged = changedKeys.has(setting.key);

                  return (
                    <div key={setting.key} className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isChanged ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{setting.label}</p>
                          {isChanged && <span className="text-xs text-yellow-600 dark:text-yellow-400">•</span>}
                        </div>
                        {setting.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{setting.description}</p>
                        )}
                      </div>
                      <div className="w-full sm:w-64">
                        {isBoolean ? (
                          <button
                            onClick={() => handleChange(setting.key, editValues[setting.key] === "true" ? "false" : "true")}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editValues[setting.key] === "true" ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${editValues[setting.key] === "true" ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        ) : (
                          <Input
                            value={editValues[setting.key] || ""}
                            onChange={(e) => handleChange(setting.key, e.target.value)}
                            className={`text-sm ${isChanged ? "border-yellow-300 dark:border-yellow-700" : ""}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {changedKeys.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button onClick={handleSaveAll} disabled={saving} size="lg" className="shadow-xl shadow-primary-500/30">
            {saving ? "⏳ Saqlanmoqda..." : `💾 ${changedKeys.size} ta o'zgarishni saqlash`}
          </Button>
        </div>
      )}
    </div>
  );
}
