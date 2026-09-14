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
      <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-70 pointer-events-none" />

      <div className="relative glass-panel rounded-3xl p-4 sm:p-7 border border-white/10 shadow-2xl bg-slate-950/80">
        <div className="flex flex-col gap-3">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <Link2 className="w-6 h-6 text-sky-400" />
                <span>Inspeksi Link Folder TeraBox</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Masukkan link TeraBox untuk melihat isi file, ukuran MB, dan deteksi otomatis media player.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Daftar File Manual</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Detect Media</span>
              </div>
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-white transition-colors">
                  <Search className="w-5 h-5 text-white drop-shadow-sm" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste link TeraBox (contoh: https://terabox.com/s/1xxxxxx atau https://dm.terabox.com/main?path=/)"
                  className="w-full pl-11 pr-24 py-3.5 rounded-2xl glass-input text-sm text-white placeholder-slate-500 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition-all shadow-inner"
                  required
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handlePaste}
                  className="absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Paste from clipboard"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Pasted</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Paste</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-950 bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 hover:from-sky-300 hover:to-emerald-300 shadow-lg shadow-sky-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                suppressHydrationWarning
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <span>Inspect Folder</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs">
            <span className="text-slate-400 font-medium">Format yang didukung:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[11px]">
              https://terabox.com/s/1xxxxxx
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-mono text-[11px]">
              https://1024tera.com/s/1xxxxxx
            </span>
            <button
              type="button"
              suppressHydrationWarning
              onClick={() =>
                setPresetUrl("https://dm.terabox.com/main?category=all&path=%2F")
              }
              className="px-3 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              title="Inspect Root Private Drive Anda"
            >
              <Search className="w-3 h-3 text-sky-400" />
              <span>Root Drive Pribadi (/)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual File Importer Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span>Paste Daftar File / Data TeraBox</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Anda dapat menempelkan teks daftar file hasil salinan dari halaman TeraBox web Anda (nama file dan ukurannya).
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Contoh:\nATLXS - PASSO BEM SOLTO (SLOWED).mp4  46.7M\nslxughter - fragment (slowed).mp4  4.3M\n.Feast - o,Tuan (Official Music Video).mp4  30.8M\nNadin Amizah - Taruh (Official Lyric Video).mp4  95.6M`}
              rows={7}
              className="w-full p-3 rounded-2xl glass-input text-xs text-slate-200 placeholder-slate-500 border border-slate-700 focus:border-indigo-500 font-mono mb-4"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleCustomImportSubmit}
                disabled={!importText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
              >
                Impor & Deteksi File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
