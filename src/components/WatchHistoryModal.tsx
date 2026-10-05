"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  X,
  Play,
  Film,
  Music,
  Trash2,
  Youtube,
  Search,
  Shuffle,
  Clock,
  Radio,
  Sparkles,
  AlertTriangle,
  FolderSearch,
  ExternalLink,
} from "lucide-react";
import { WatchHistoryItem } from "@/types/watchHistory";
import { TeraBoxFile } from "@/types/terabox";
import { formatRelativeTime } from "@/lib/watchHistory";
import { useI18n } from "@/context/I18nContext";

interface WatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WatchHistoryItem[];
  onPlayAudio: (file: TeraBoxFile) => void;
  onOpenVideo: (file: TeraBoxFile) => void;
  onPlayAll: (items: TeraBoxFile[]) => void;
  onShuffleAll: (items: TeraBoxFile[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  currentTrackId?: string | null;
  isPlaying?: boolean;
}

export const WatchHistoryModal: React.FC<WatchHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onPlayAudio,
  onOpenVideo,
  onPlayAll,
  onShuffleAll,
  onRemoveItem,
  onClearAll,
  currentTrackId,
  isPlaying,
}) => {
  const { t, language } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "video" | "audio" | "youtube">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter and search history
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Category filter
      if (activeFilter === "video" && item.mediaType !== "video") return false;
      if (activeFilter === "audio" && item.mediaType !== "audio") return false;
      if (
        activeFilter === "youtube" &&
        !(item.sourceType === "youtube-fallback" || item.youtubeId)
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(q) || item.name?.toLowerCase().includes(q);
        const matchesArtist = item.artist?.toLowerCase().includes(q) || item.youtubeChannel?.toLowerCase().includes(q);
        return matchesTitle || matchesArtist;
      }

      return true;
    });
  }, [history, activeFilter, searchQuery]);

  // Extract file list for Play All / Shuffle All
  const filteredFiles = useMemo(() => {
    return filteredHistory.map((h) => h.file);
  }, [filteredHistory]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-md modal-backdrop-animate"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] modal-content-animate"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <History className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  {t.history?.title || "Riwayat Tontonan"}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30">
                  {history.length} {t.history?.itemsCount || "item"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {t.history?.subtitle || "Daftar media dan lagu yang pernah Anda putar atau tonton."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon btn-icon-close p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Batch Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 space-y-3 bg-white dark:bg-slate-900/40">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.history?.searchPlaceholder || "Cari lagu atau video di riwayat..."}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl glass-input text-xs sm:text-sm border border-slate-200 dark:border-white/10 focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {t.history?.filterAll || "Semua"} ({history.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("video")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "video"
                    ? "bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {t.history?.filterVideo || "Video"} ({history.filter((i) => i.mediaType === "video").length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("audio")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "audio"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {t.history?.filterAudio || "Audio"} ({history.filter((i) => i.mediaType === "audio").length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("youtube")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === "youtube"
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                YouTube ({history.filter((i) => i.sourceType === "youtube-fallback" || i.youtubeId).length})
              </button>
            </div>

            {/* Batch Action Buttons */}
            {filteredHistory.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onPlayAll(filteredFiles)}
                  className="btn-icon flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 shadow-sm"
                  title={t.history?.playAll || "Putar Semua"}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">{t.history?.playAll || "Putar Semua"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onShuffleAll(filteredFiles)}
                  className="btn-icon btn-icon-spin flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  title={t.history?.shuffleAll || "Acak Semua"}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.history?.shuffleAll || "Acak"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="btn-icon btn-icon-wiggle p-2 rounded-xl text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/20 transition-all"
                  title={t.history?.clearAll || "Hapus Semua Riwayat"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clear Confirmation Banner */}
        {showClearConfirm && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-500/30 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm text-rose-900 dark:text-rose-100">
                  {t.history?.confirmClear || "Hapus Semua Riwayat?"}
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  {t.history?.confirmClearDesc ||
                    "Semua riwayat lagu dan video yang tersimpan akan dihapus secara permanen dari perangkat ini."}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setShowClearConfirm(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all"
                  >
                    {t.history?.confirmBtn || "Ya, Hapus Semua"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all"
                  >
                    {t.history?.cancelBtn || "Batal"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Items List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 custom-scrollbar min-h-[300px]">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => {
              const isCurrentlyPlaying =
                currentTrackId &&
                isPlaying &&
                (currentTrackId === item.id ||
                  currentTrackId === item.file.id ||
                  (item.youtubeId && currentTrackId === `yt-${item.youtubeId}`));

              const isYoutube =
                item.sourceType === "youtube-fallback" || Boolean(item.youtubeId);

              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    isCurrentlyPlaying
                      ? "bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/30 shadow-md ring-1 ring-sky-500/30"
                      : "bg-white/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md"
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Media Thumbnail */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-xs">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 text-slate-500 dark:text-slate-400">
                          {item.mediaType === "video" ? (
                            <Film className="w-5 h-5 text-cyan-500" />
                          ) : (
                            <Music className="w-5 h-5 text-emerald-500" />
                          )}
                        </div>
                      )}

                      {/* Playing Wave Indicator */}
                      {isCurrentlyPlaying && (
                        <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center gap-0.5 backdrop-blur-[1px]">
                          <span className="w-1 h-3.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-3 bg-sky-400 rounded-full animate-bounce" />
                        </div>
                      )}

                      {/* Media Source Badge Overlay */}
                      <div className="absolute bottom-1 right-1">
                        {isYoutube ? (
                          <div className="p-0.5 rounded-md bg-red-600 text-white shadow-xs">
                            <Youtube className="w-2.5 h-2.5" />
                          </div>
                        ) : item.mediaType === "video" ? (
                          <div className="p-0.5 rounded-md bg-cyan-600 text-white shadow-xs">
                            <Film className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className="p-0.5 rounded-md bg-emerald-600 text-white shadow-xs">
                            <Music className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Title & Metadata */}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate leading-snug ${
                          isCurrentlyPlaying
                            ? "text-sky-600 dark:text-sky-400"
                            : "text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors"
                        }`}
                        title={item.title}
                      >
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="truncate max-w-[140px] sm:max-w-[200px] font-medium text-slate-700 dark:text-slate-300">
                          {item.artist || "TeraBox Media"}
                        </span>
                        <span>•</span>
                        {item.formattedDuration && (
                          <>
                            <span className="font-mono text-[10px] sm:text-[11px]">
                              {item.formattedDuration}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.watchedAt, language)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Play Audio Button */}
                    <button
                      type="button"
                      onClick={() => onPlayAudio(item.file)}
                      className={`btn-icon flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isCurrentlyPlaying
                          ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                          : "bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-sky-500/20 text-slate-700 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400 border border-slate-200/80 dark:border-slate-700/60"
                      }`}
                      title={t.history?.playAudio || "Putar Audio"}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span className="hidden sm:inline">
                        {isCurrentlyPlaying
                          ? t.youtube?.playing || "Memutar"
                          : t.history?.playAudio || "Putar"}
                      </span>
                    </button>

                    {/* Open Video Button */}
                    <button
                      type="button"
                      onClick={() => onOpenVideo(item.file)}
                      className="btn-icon flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-cyan-500/20 text-slate-700 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400 border border-slate-200/80 dark:border-slate-700/60 transition-all"
                      title={t.history?.watchVideo || "Tonton Video"}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">{t.history?.watchVideo || "Video"}</span>
                    </button>

                    {/* Delete Item from History */}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="btn-icon btn-icon-close p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                      title={t.history?.removeItem || "Hapus dari riwayat"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            /* Empty State */
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 flex items-center justify-center mb-3.5 text-slate-400">
                <History className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
                {searchQuery
                  ? "Tidak ada hasil yang cocok"
                  : t.history?.emptyTitle || "Belum Ada Riwayat Tontonan"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                {searchQuery
                  ? `Tidak ditemukan riwayat untuk "${searchQuery}". Coba kata kunci lain.`
                  : t.history?.emptyDesc ||
                    "Lagu atau video yang Anda putar dari folder TeraBox atau YouTube akan otomatis tersimpan di sini."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                >
                  Reset Pencarian
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all"
                >
                  {t.history?.exploreBtn || "Jelajahi Musik & Video"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 select-none">
          <span>
            {t.history?.itemsCount ? `${filteredHistory.length} ${t.history.itemsCount}` : `${filteredHistory.length} item tersimpan`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-interactive px-4 py-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
          >
            {t.videoModal?.close || "Tutup"}
          </button>
        </div>
      </div>
    </div>
  );
};
