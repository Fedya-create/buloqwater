"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
}

interface SidebarProps {
  items: NavItem[];
  title: string;
  subtitle?: string;
}

export function Sidebar({ items, title, subtitle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src="/icon.svg"
            alt="BuloqWater"
            className="w-10 h-10 dark:invert"
          />
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )}>
              <span
                className={cn(
                  "w-5 h-5",
                  isActive
                    ? "text-primary-500"
                    : "text-gray-400 dark:text-gray-500",
                )}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold text-sm">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {session?.user?.name || "Foydalanuvchi"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {session?.user?.phone}
            </p>
          </div>
          <ThemeToggleCompact />
        </div>
        <button
          onClick={() => {
            // Hozirgi sahifadan /login ga qaytarish (subdomen saqlanadi)
            const currentOrigin =
              typeof window !== "undefined" ? window.location.origin : "";
            signOut({ callbackUrl: `${currentOrigin}/login` });
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Chiqish
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center"
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? (
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-gray-700 dark:text-gray-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: fixed, Mobile: slide in */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}>
        {navContent}
      </aside>
    </>
  );
}
