"use client";

import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, Sparkles } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { LanguageKey } from "@/i18n";
import { FlagIcon } from "./FlagIcon";

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, currentMeta, availableLanguages, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (langKey: LanguageKey) => {
    setLanguage(langKey);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left z-50">
      {/* Trigger Button */}
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm select-none shrink-0 ${
          isOpen
            ? "bg-white dark:bg-slate-900 border-sky-500 text-sky-600 dark:text-sky-400 shadow-md ring-2 ring-sky-500/25"
            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700/60"
        }`}
        title={`${t.nav.language}: ${currentMeta.label}`}
        aria-label="Pilih Bahasa / Select Language"
      >
        <FlagIcon country={currentMeta.key} size="md" className="shrink-0" />
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-sky-500" : ""
          }`}
        />
      </button>

      {/* Language Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-20px)] rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-slate-900/5 dark:ring-white/10 max-h-84 overflow-y-auto custom-scrollbar z-50">
          {/* Header */}
          <div className="px-3 py-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10 mb-1 flex items-center justify-between select-none">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{t.nav.language}</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              {availableLanguages.length} Languages
            </span>
          </div>

          {/* Language Items */}
          <div className="space-y-0.5">
            {availableLanguages.map((lang) => {
              const isSelected = lang.key === language;
              return (
                <button
                  key={lang.key}
                  type="button"
                  onClick={() => handleSelect(lang.key)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer group select-none ${
                    isSelected
                      ? "bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold border border-sky-500/30 shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Real SVG Country Flag */}
                    <FlagIcon
                      country={lang.key}
                      size="lg"
                      className="group-hover:scale-105 transition-transform duration-150"
                    />

                    {/* Language Names */}
                    <div className="flex flex-col text-left min-w-0">
                      <span className="truncate font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {lang.nativeName}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {lang.label}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-500/15 dark:bg-sky-500/30 flex items-center justify-center shrink-0 border border-sky-500/40">
                      <Check className="w-3 h-3 text-sky-600 dark:text-sky-400 stroke-[2.5]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
