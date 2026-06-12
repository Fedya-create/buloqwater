"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export const metadata = {
  title: "BuloqWater - Haydovchi",
  description: "Haydovchi vazifalar paneli",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BuloqWater",
  },
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (
    !session ||
    (session.user.role !== "DRIVER" &&
      session.user.role !== "DIRECTOR" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    return null;
  }

  const handleSignOut = () => {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
    signOut({ callbackUrl: `${currentOrigin}/login` });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* PWA-optimized Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="BuloqWater"
              className="w-9 h-9 dark:invert"
            />
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">
                BuloqWater
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Haydovchi paneli
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
              🟢 {session.user.name}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">{children}</main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-lg safe-bottom z-40">
        <div className="flex items-center justify-around max-w-lg mx-auto py-2">
          <a
            href="/driver/tasks"
            className="flex flex-col items-center gap-0.5 py-1 px-4 text-primary-600 dark:text-primary-400">
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-bold">Vazifalar</span>
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 py-1 px-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <span className="text-xl">🚪</span>
            <span className="text-[10px] font-medium">Chiqish</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
