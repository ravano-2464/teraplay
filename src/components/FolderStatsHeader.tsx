"use client";

import React, { useRef } from "react";
import {
  Folder,
  HardDrive,
  Music,
  Film,
  Image as ImageIcon,
  FileText,
  Archive,
  LayoutGrid,
  List,
  Search,
  PlayCircle,
  Copy,
  Check,
  Sparkles,
  X,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import { TeraBoxFolderResult, FileCategory } from "@/types/terabox";

interface FolderStatsHeaderProps {
  folderData: TeraBoxFolderResult;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "table";
  onToggleViewMode: (mode: "grid" | "table") => void;
  onPlayAllAudio: () => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  filteredCount?: number;
}

export const FolderStatsHeader: React.FC<FolderStatsHeaderProps> = ({
  folderData,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  onPlayAllAudio,
  sortBy = "default",
  onSortChange,
  filteredCount,
}) => {
  const [copied, setCopied] = React.useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { stats } = folderData;

  const handleCopyLink = () => {
    if (folderData.shareUrl) {
      navigator.clipboard.writeText(folderData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const categories = [
    { id: "all", label: "Semua File", count: stats.totalFiles, icon: Folder },
    { id: "audio", label: "Audio", count: stats.audioCount, icon: Music, color: "text-emerald-400" },
    { id: "video", label: "Video", count: stats.videoCount, icon: Film, color: "text-cyan-400" },
    { id: "image", label: "Gambar", count: stats.imageCount, icon: ImageIcon, color: "text-purple-400" },
    { id: "document", label: "Dokumen", count: stats.docCount, icon: FileText, color: "text-amber-400" },
    { id: "archive", label: "Arsip", count: stats.archiveCount, icon: Archive, color: "text-rose-400" },
  ];

  const quickTags = [
    "Slowed",
    "Phonk",
    "Remix",
    "mp4",
    "mp3",
    "FLAC",
  ];

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Folder Information Card */}
      <div className="relative glass-card rounded-3xl p-5 sm:p-7 border border-white/10 overflow-hidden shadow-xl">
        {/* Background ambient light */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-sky-500/10 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          {/* Folder Name & Path */}
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20 shrink-0">
              <Folder className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate">
                  {folderData.folderName}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {folderData.source === "direct-api"
                    ? "Live TeraBox API"
                    : "TeraBox Share"}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 truncate">
                Path: <span className="text-slate-200">{folderData.folderPath}</span>
              </p>

              {folderData.ownerName && (
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  {folderData.ownerAvatar && (
                    <img
                      src={folderData.ownerAvatar}
                      alt={folderData.ownerName}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  )}
                  <span>Pemilik: <span className="text-slate-200 font-medium">{folderData.ownerName}</span></span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics & Total Size in MB */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end flex-wrap">
            {/* Total Size Metric Card */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Kapasitas</p>
                <p className="text-base sm:text-lg font-black text-emerald-300 tracking-tight">
                  {stats.formattedTotalSize}
                </p>
              </div>
            </div>

            {/* Total Files Metric */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Jumlah File</p>
                <p className="text-base sm:text-lg font-black text-sky-300 tracking-tight">
                  {stats.totalFiles} File {stats.totalFolders > 0 ? `(${stats.totalFolders} Subfolder)` : ""}
                </p>
              </div>
            </div>

            {/* Copy Link button */}
            <button
              onClick={handleCopyLink}
              className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer shadow-md"
              title="Salin link TeraBox"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Audio Folder Detected Announcement Bar */}
        {stats.hasAudio && (
          <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-950/80 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Folder Koleksi Audio Terdeteksi!</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {stats.audioCount} Track Musik
                  </span>
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sistem otomatis menyiapkan pemutar musik dengan visualizer & playlist.
                </p>
              </div>
            </div>

            <button
              onClick={onPlayAllAudio}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            >
              <PlayCircle className="w-4 h-4 fill-slate-950 text-emerald-400" />
              <span>Putar Semua Track (Play All)</span>
            </button>
          </div>
        )}
      </div>

      {/* Prominent Search, Category Filters & Sort Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 bg-slate-950/80 flex flex-col gap-3 shadow-lg">
        {/* Top Row: Search Input & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Search Input Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white z-10 pointer-events-none drop-shadow-sm" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari lagu, nama file, artis, atau format..."
              className="w-full pl-10 pr-24 py-2.5 text-sm rounded-xl glass-input bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {hasSearch && (
                <button
                  onClick={() => {
                    onSearchChange("");
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {filteredCount !== undefined && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {filteredCount} file
                </span>
              )}
            </div>
          </div>

          {/* Sort selector & View toggle */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Dropdown */}
            {onSortChange && (
              <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="default" className="bg-slate-900">Urutan Asli</option>
                  <option value="name-asc" className="bg-slate-900">Nama (A - Z)</option>
                  <option value="name-desc" className="bg-slate-900">Nama (Z - A)</option>
                  <option value="size-desc" className="bg-slate-900">Ukuran Terbesar</option>
                  <option value="size-asc" className="bg-slate-900">Ukuran Terkecil</option>
                  <option value="duration-desc" className="bg-slate-900">Durasi Terpanjang</option>
                </select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => onToggleViewMode("table")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-slate-800 text-sky-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
                title="Tampilan Tabel (Table View)"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => onToggleViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-slate-800 text-sky-400 shadow-sm" : "text-slate-500 hover:text-slate-300"
                }`}
                title="Tampilan Grid (Grid View)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Category Pills & Quick Filter Tags */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 pt-1 border-t border-white/5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar w-full lg:w-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-950 border-white shadow-md font-bold"
                      : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-slate-950" : cat.color || "text-slate-400"}`} />
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-slate-900 text-white" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search Tag Suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar text-xs">
            <span className="text-slate-500 text-[11px] flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3" /> Tag:
            </span>
            {quickTags.map((tag) => {
              const isActive = searchQuery.toLowerCase().includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (isActive) {
                      onSearchChange("");
                    } else {
                      onSearchChange(tag);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold"
                      : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
