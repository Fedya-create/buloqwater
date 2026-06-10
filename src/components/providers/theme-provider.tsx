"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // LocalStorage-dan o'qish — faqat foydalanuvchi o'zi o'zgartirgan bo'lsa
    const stored = localStorage.getItem("buloqwater-theme") as Theme | null;
    if (stored) setThemeState(stored);
    // Agar hech narsa saqlanmagan bo'lsa, "light" qoladi
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (t: Theme) => {
      let resolved: "light" | "dark" = "light";

      if (t === "dark") {
        resolved = "dark";
      } else if (t === "system") {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      setResolvedTheme(resolved);
    };

    applyTheme(theme);

    // System theme o'zgarganda
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (theme === "system") applyTheme("system"); };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("buloqwater-theme", t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
