"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "teraplay_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or default
  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem(THEME_KEY) as Theme) || "dark";
      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeState(savedTheme);
      }
    } catch (e) {
      console.warn("Unable to access localStorage for theme", e);
    }
    setMounted(true);
  }, []);

  // Update resolvedTheme and document class whenever theme changes or system preference changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const computeResolvedTheme = (currentTheme: Theme): ResolvedTheme => {
      if (currentTheme === "system") {
        return mediaQuery.matches ? "dark" : "light";
      }
      return currentTheme;
    };

    const updateDOM = (resTheme: ResolvedTheme) => {
      const root = document.documentElement;
      if (resTheme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        root.style.colorScheme = "light";
      }
      setResolvedTheme(resTheme);
    };

    const currentResolved = computeResolvedTheme(theme);
    updateDOM(currentResolved);

    // Listen to OS system color-scheme changes if theme is set to "system"
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        const nextResolved = e.matches ? "dark" : "light";
        updateDOM(nextResolved);
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {
      console.warn("Unable to save theme to localStorage", e);
    }
  };

  const toggleTheme = () => {
    // Quick toggle between light and dark
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
