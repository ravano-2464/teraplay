"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Clipboard,
  ArrowRight,
  Loader2,
  Link2,
  Music,
  Film,
  Check,
  FileText,
  Upload,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";

interface LinkInputSectionProps {
  onInspect: (url: string) => Promise<void>;
  isLoading: boolean;
  initialUrl?: string;
  onImportCustomFiles?: (text: string) => void;
}

export const LinkInputSection: React.FC<LinkInputSectionProps> = ({
  onInspect,
  isLoading,
  initialUrl = "",
  onImportCustomFiles,
}) => {
  const { t } = useI18n();
  const [url, setUrl] = useState(initialUrl);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onInspect(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
      }
    } catch (e) {
      console.log("Clipboard read denied or unsupported", e);
    }
  };

  const setPresetUrl = (preset: string) => {
    setUrl(preset);
    onInspect(preset);
  };

  const handleCustomImportSubmit = () => {
    if (importText.trim() && onImportCustomFiles) {
      onImportCustomFiles(importText.trim());
      setShowImportModal(false);
      setImportText("");
    }
  };

  return (
    <div className="w-full relative">
      {/* Glow effect backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

      <div className="relative glass-panel rounded-3xl p-4 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-200/30 dark:shadow-2xl bg-white/85 dark:bg-slate-950/80 transition-colors duration-200">
        <div className="flex flex-col gap-3">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-6 h-6 text-sky-500 dark:text-sky-400" />
                <span>{t.teraboxInput.title}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t.teraboxInput.subtitle}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowImportModal(true)}
                className="btn-icon btn-icon-wiggle flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.teraboxInput.pasteManual}</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                <span>{t.teraboxInput.autoDetect}</span>
              </div>
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-slate-400 dark:text-white transition-colors">
                  <Search className="w-5 h-5 drop-shadow-sm group-hover:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.teraboxInput.placeholder}
                  className="w-full pl-11 pr-24 py-3.5 rounded-2xl glass-input text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all shadow-inner"
                  required
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handlePaste}
                  className="btn-icon btn-icon-bounce-y absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 shadow-sm"
                  title="Paste from clipboard"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">{t.teraboxInput.pastedBtn}</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t.teraboxInput.pasteBtn}</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="btn-icon btn-icon-bounce-x px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-950 bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                suppressHydrationWarning
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{t.teraboxInput.inspectingBtn}</span>
                  </>
                ) : (
                  <>
                    <span>{t.teraboxInput.inspectBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">{t.teraboxInput.quickSamples}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              https://terabox.com/s/1xxxxxx
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              https://1024tera.com/s/1xxxxxx
            </span>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() =>
                setPresetUrl("https://dm.terabox.com/main?category=all&path=%2F")
              }
              className="btn-icon btn-icon-bounce-x px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 flex items-center gap-1.5 font-medium shadow-xs"
              title="Inspect Root Private Drive"
            >
              <Search className="w-3 h-3 text-sky-500 dark:text-sky-400" />
              <span>{t.teraboxInput.sampleDrive}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual File Importer Modal with Animated Backdrop & Dialog */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md modal-backdrop-animate">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/40 rounded-3xl p-6 shadow-2xl modal-content-animate">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-bounce" />
              <span>{t.teraboxInput.manualModalTitle}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t.teraboxInput.manualModalDesc}
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t.teraboxInput.manualModalPlaceholder}
              rows={7}
              className="w-full p-3 rounded-2xl glass-input text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 font-mono mb-4"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowImportModal(false)}
                className="btn-interactive px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.teraboxInput.manualModalCancel}
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleCustomImportSubmit}
                disabled={!importText.trim()}
                className="btn-icon flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                <span>{t.teraboxInput.manualModalSubmit}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

