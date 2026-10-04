"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden shadow-sm select-none ${
        isDark
          ? "bg-slate-900 hover:bg-slate-850 text-indigo-300 border-slate-700/80 hover:border-indigo-500/50 hover:shadow-indigo-500/10"
          : "bg-white hover:bg-amber-50/50 text-amber-600 border-slate-200 hover:border-amber-400/60 hover:shadow-amber-500/10"
      } ${className}`}
      title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
      aria-label="Ganti Tema Tampilan"
    >
      {/* Background glow on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
          isDark
            ? "bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-transparent"
            : "bg-gradient-to-tr from-amber-500/15 via-orange-500/10 to-transparent"
        }`}
      />

      {/* Animated Icon */}
      <div className="relative w-4 h-4 flex items-center justify-center transition-transform duration-300 group-active:scale-90">
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-400 group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 group-hover:rotate-90 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
        )}
      </div>
    </button>
  );
};
