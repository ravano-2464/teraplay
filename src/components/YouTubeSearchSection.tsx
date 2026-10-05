"use client";

import React, { useState } from "react";
import {
  Search,
  Sparkles,
  Clipboard,
  Check,
  Youtube,
  Zap,
  Flame,
  X,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/context/I18nContext";

interface YouTubeSearchSectionProps {
  onSearch: (query: string) => Promise<void>;
  isLoading: boolean;
  initialQuery?: string;
}

const TRENDING_TAGS = [
  { label: "🔥 Trending", query: "Trending Music Hits" },
  { label: "☕ Lofi Beats", query: "lofi hip hop radio beats to relax study to" },
  { label: "⚡ Phonk", query: "Phonk drift music playlist" },
  { label: "🇮🇩 Pop Indo", query: "Pop Indonesia terbaru populer" },
  { label: "✨ Slowed + Reverb", query: "slowed and reverb aesthetic playlist" },
  { label: "🎸 Rock Classics", query: "Rock classics greatest hits" },
  { label: "🎧 EDM / Bass", query: "EDM festival best drops electronic music" },
  { label: "🌸 Anime OST", query: "Anime OST instrumental chill playlist" },
  { label: "🌿 Acoustic Chill", query: "Acoustic relaxing guitar playlist" },
];

export const YouTubeSearchSection: React.FC<YouTubeSearchSectionProps> = ({
  onSearch,
  isLoading,
  initialQuery = "",
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuery(text.trim());
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
        // If it looks like a youtube url, search immediately
        if (text.includes("youtube.com") || text.includes("youtu.be")) {
          onSearch(text.trim());
        }
      }
    } catch (e) {
      console.log("Clipboard read denied or unsupported", e);
    }
  };

  const handleTagClick = (tagQuery: string) => {
    setQuery(tagQuery);
    onSearch(tagQuery);
  };

  return (
    <div className="w-full relative">
      {/* Glow effect backdrop */}
      <div className="absolute -inset-1 bg-gradient-to-r from-red-500/15 via-rose-500/15 to-amber-500/15 dark:from-red-500/25 dark:via-rose-500/25 dark:to-amber-500/25 rounded-3xl blur-xl opacity-75 pointer-events-none" />

      <div className="relative glass-panel rounded-3xl p-4 sm:p-7 border border-rose-200/80 dark:border-rose-500/20 shadow-xl shadow-rose-500/5 dark:shadow-2xl bg-white/90 dark:bg-slate-950/85 transition-colors duration-200">
        <div className="flex flex-col gap-3">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/30">
                  <Youtube className="w-5 h-5" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {t.youtube.title}
                </h2>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-red-500/15 dark:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> {t.youtube.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t.youtube.subtitle}
              </p>
            </div>

            {/* Feature Badges */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.youtube.visualizerReady}</span>
              </div>
            </div>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 text-slate-400 dark:text-rose-400/80 transition-colors">
                  <Search className="w-5 h-5 drop-shadow-sm group-hover:scale-110 transition-transform duration-200" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.youtube.placeholder}
                  className="w-full pl-11 pr-28 sm:pr-32 py-3.5 rounded-2xl glass-input text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 transition-all shadow-inner"
                  suppressHydrationWarning
                />

                <div className="absolute inset-y-1.5 right-1.5 flex items-center gap-1 z-10">
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="btn-icon btn-icon-close p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                      title="Hapus teks"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={handlePaste}
                    className="btn-icon btn-icon-bounce-y px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 shadow-sm transition-all"
                    title="Tempel dari papan klip"
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
              </div>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="btn-icon btn-icon-bounce-x px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-red-500 via-rose-600 to-amber-500 hover:from-red-400 hover:to-amber-400 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                suppressHydrationWarning
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.youtube.searchingBtn}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>{t.youtube.searchBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Trending Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> {t.youtube.quickTags}
            </span>
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => handleTagClick(tag.query)}
                className="btn-interactive text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-500/30 shadow-2xs"
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

