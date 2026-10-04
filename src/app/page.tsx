"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { LinkInputSection } from "@/components/LinkInputSection";
import { Pagination } from "@/components/Pagination";
import { FolderStatsHeader } from "@/components/FolderStatsHeader";
import { FileCard } from "@/components/FileCard";
import { FileTableRow } from "@/components/FileTableRow";
import { FolderTree } from "@/components/FolderTree";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { VideoModal } from "@/components/VideoModal";
import { TeraBoxFolderResult, TeraBoxFile, AudioTrack } from "@/types/terabox";
import { detectFileCategory, formatBytes, formatDuration } from "@/lib/formatters";
import { calculateFolderStats } from "@/lib/teraboxParser";
import {
  Music,
  FolderOpen,
  Sparkles,
  AlertCircle,
  FileQuestion,
  HelpCircle,
  Volume2,
  HardDrive,
  Key,
  FolderSearch,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const [folderData, setFolderData] = useState<TeraBoxFolderResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters, Search, Sort & Pagination State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<AudioTrack[]>([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"all" | "one" | "off">("all");
  const [playbackHistory, setPlaybackHistory] = useState<string[]>([]);

  // Video Modal State
  const [selectedVideo, setSelectedVideo] = useState<TeraBoxFile | null>(null);

  // Cookie and auth modal state
  const [ndusCookie, setNdusCookie] = useState<string>("");
  const [cookieStatus, setCookieStatus] = useState<"none" | "checking" | "valid" | "expired" | "error">("none");
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Validate ndus cookie status against TeraBox API
  const handleValidateCookie = useCallback(async (cookieToTest: string) => {
    if (!cookieToTest || !cookieToTest.trim()) {
      setCookieStatus("none");
      return { isValid: false, isExpired: false, status: "none", message: "Cookie kosong" };
    }

    setCookieStatus("checking");
    try {
      const res = await fetch("/api/terabox/validate-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: cookieToTest }),
      });
      const data = await res.json();
      if (data.isValid) {
        setCookieStatus("valid");
      } else if (data.isExpired) {
        setCookieStatus("expired");
      } else {
        setCookieStatus("error");
      }
      return data;
    } catch {
      setCookieStatus("error");
      return { isValid: false, isExpired: false, status: "error", message: "Gagal memverifikasi cookie" };
    }
  }, []);

  // Update real duration for a file across all states
  const handleUpdateFileDuration = useCallback((fileId: string, durationInSeconds: number) => {
    if (!durationInSeconds || isNaN(durationInSeconds) || durationInSeconds <= 0) return;
    const rounded = Math.round(durationInSeconds);

    setFolderData((prev) => {
      if (!prev) return prev;
      const updatedFiles = prev.files.map((file) => {
        if (file.id === fileId || file.fsId === fileId) {
          return {
            ...file,
            duration: rounded,
            formattedDuration: formatDuration(rounded),
          };
        }
        return file;
      });
      return {
        ...prev,
        files: updatedFiles,
      };
    });

    setPlaylist((prev) =>
      prev.map((track) => {
        if (track.id === fileId || track.fsId === fileId) {
          return {
            ...track,
            duration: rounded,
            formattedDuration: formatDuration(rounded),
          };
        }
        return track;
      })
    );

    setCurrentTrack((prev) => {
      if (prev && (prev.id === fileId || prev.fsId === fileId)) {
        return {
          ...prev,
          duration: rounded,
          formattedDuration: formatDuration(rounded),
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("terabox_ndus_cookie");
    if (saved && saved.trim()) {
      const clean = saved.trim();
      setNdusCookie(clean);
      handleValidateCookie(clean).then((res) => {
        if (res && res.isValid) {
          setFolderData((current) => {
            if (!current) {
              handleInspectUrl("https://dm.terabox.com/main?path=/", clean);
            }
            return current;
          });
        }
      });
    }
  }, [handleValidateCookie]);

  // Reset pagination when category, search query, or sort changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handleSaveCookie = async (newCookie: string) => {
    const trimmed = newCookie.trim();
    setNdusCookie(trimmed);
    if (trimmed) {
      localStorage.setItem("terabox_ndus_cookie", trimmed);
      const res = await handleValidateCookie(trimmed);
      if (res && res.isValid) {
        const targetUrl =
          folderData?.shareUrl && !folderData.shareUrl.startsWith("Custom")
            ? folderData.shareUrl
            : "https://dm.terabox.com/main?path=/";
        handleInspectUrl(targetUrl, trimmed);
      }
    } else {
      localStorage.removeItem("terabox_ndus_cookie");
      setCookieStatus("none");
    }
  };

  const handleClearCookie = () => {
    setNdusCookie("");
    setCookieStatus("none");
    localStorage.removeItem("terabox_ndus_cookie");
    setFolderData(null);
  };

  const handleInspectUrl = async (url: string, cookieOverride?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const activeCookie = cookieOverride !== undefined ? cookieOverride : ndusCookie;

    try {
      const res = await fetch("/api/terabox/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, cookie: activeCookie }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Gagal memproses link TeraBox");
      }

      const data: TeraBoxFolderResult = json.data;
      setFolderData(data);
      setSelectedCategory("all");
      setSearchQuery("");
      setCurrentPage(1);

      // Prepare audio playlist if audio files exist
      const audioFiles = data.files.filter((f) => f.category === "audio" || f.extension === "mp4");
      if (audioFiles.length > 0) {
        setPlaylist(audioFiles as AudioTrack[]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Terjadi kesalahan saat memeriksa link TeraBox.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle parsing custom text list from user
  const handleImportCustomFiles = (rawText: string) => {
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsedFiles: TeraBoxFile[] = [];

    lines.forEach((line, idx) => {
      // Regex to detect file name and optional size like "46.7M", "95.6MB", "1024KB"
      const sizeMatch = line.match(/(\d+(?:\.\d+)?)\s*(M|MB|G|GB|K|KB|B)/i);
      let sizeBytes = 10000000;
      let formattedSize = "10 MB";

      if (sizeMatch) {
        const val = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        if (unit.startsWith("G")) {
          sizeBytes = val * 1024 * 1024 * 1024;
          formattedSize = `${val} GB`;
        } else if (unit.startsWith("M")) {
          sizeBytes = val * 1024 * 1024;
          formattedSize = `${val} MB`;
        } else if (unit.startsWith("K")) {
          sizeBytes = val * 1024;
          formattedSize = `${val} KB`;
        }
      }

      // Clean file name
      let fileName = line.replace(/(\d+(?:\.\d+)?)\s*(M|MB|G|GB|K|KB|B).*/i, "").trim();
      if (!fileName) fileName = `Track_${idx + 1}.mp4`;

      const { category, extension } = detectFileCategory(fileName);
      const isMusicLike = fileName.toLowerCase().includes("slowed") || fileName.toLowerCase().includes("video") || fileName.toLowerCase().includes("music");

      parsedFiles.push({
        id: `custom-file-${idx}`,
        name: fileName,
        size: sizeBytes,
        formattedSize,
        category: isMusicLike ? "audio" : category,
        extension: extension || "mp4",
        mimeType: isMusicLike ? "audio/mpeg" : "video/mp4",
        artist: fileName.split("-")[0]?.trim() || "TeraBox Music",
        isDir: false,
        path: `/Imported/${fileName}`,
        sourceType: "terabox-live",
      });
    });

    const stats = calculateFolderStats(parsedFiles, 0);

    const customFolderResult: TeraBoxFolderResult = {
      folderName: "Imported TeraBox Files",
      folderPath: "/Imported",
      shareUrl: "Custom Imported List",
      stats,
      files: parsedFiles,
      folders: [],
      isAudioFolder: true,
      source: "parsed-share",
    };

    setFolderData(customFolderResult);
    setPlaylist(parsedFiles as AudioTrack[]);
    setCurrentTrack(parsedFiles[0] as AudioTrack);
    setCurrentPage(1);
  };

  // Open & navigate into subfolder on private drive
  const handleOpenFolder = (folderPath: string) => {
    const cleanPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
    const targetUrl = `https://dm.terabox.com/main?path=${encodeURIComponent(cleanPath)}`;
    handleInspectUrl(targetUrl);
  };

  // Video Player Modal Open Handler
  const handleOpenVideo = (file: TeraBoxFile) => {
    // 1. Immediately pause background audio to prevent double sound
    setIsPlaying(false);
    // 2. Open the video modal
    setSelectedVideo(file);
  };

  // Audio Player Handlers
  const handlePlayAudio = (file: TeraBoxFile) => {
    // Close video modal if open
    setSelectedVideo(null);

    if (folderData) {
      const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
      setPlaylist(audioFiles as AudioTrack[]);
    }

    if (currentTrack?.id === file.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(file as AudioTrack);
      setIsPlaying(true);
    }
  };

  // Direct Ad-Free YouTube Playback Handler
  const handlePlayYouTube = async (file: TeraBoxFile) => {
    setSelectedVideo(null);

    if (folderData) {
      const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
      setPlaylist(audioFiles as AudioTrack[]);
    }

    // Set track immediately with YouTube fallback flag
    const ytTrackInitial: AudioTrack = {
      ...file,
      sourceType: "youtube-fallback",
      isYoutubeFallback: true,
      youtubeId: file.youtubeId,
      youtubeTitle: file.youtubeTitle || file.name,
      youtubeChannel: file.youtubeChannel || file.artist || "Mencari di YouTube...",
      youtubeThumbnail: file.youtubeThumbnail || file.thumbnailUrl,
    };
    setCurrentTrack(ytTrackInitial);
    setIsPlaying(true);

    try {
      const res = await fetch(
        `/api/youtube/search?filename=${encodeURIComponent(file.name)}&artist=${encodeURIComponent(
          file.artist || ""
        )}&best=true`
      );
      const data = await res.json();
      if (data.success && data.track) {
        const fullTrack: AudioTrack = {
          ...file,
          sourceType: "youtube-fallback",
          isYoutubeFallback: true,
          youtubeId: data.track.id,
          youtubeTitle: data.track.title,
          youtubeChannel: data.track.channel,
          youtubeThumbnail: data.track.thumbnailUrl,
          duration: data.track.duration || file.duration,
          formattedDuration: data.track.formattedDuration || file.formattedDuration,
        };
        setCurrentTrack(fullTrack);
        if (data.track.duration) {
          handleUpdateFileDuration(file.id, data.track.duration);
        }
      }
    } catch (e) {
      console.warn("YouTube search error on direct click:", e);
    }
  };

  const handleToggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const handleToggleRepeat = () => {
    setRepeatMode((prev) => (prev === "all" ? "one" : prev === "one" ? "off" : "all"));
  };

  const handlePlayAllAudio = () => {
    if (!folderData) return;
    const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
    if (audioFiles.length > 0) {
      setPlaylist(audioFiles as AudioTrack[]);
      setIsShuffle(false);
      setCurrentTrack(audioFiles[0] as AudioTrack);
      setPlaybackHistory([audioFiles[0].id]);
      setIsPlaying(true);
    }
  };

  const handleShuffleAllAudio = () => {
    if (!folderData) return;
    const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
    if (audioFiles.length > 0) {
      setPlaylist(audioFiles as AudioTrack[]);
      setIsShuffle(true);
      const randomIdx = Math.floor(Math.random() * audioFiles.length);
      const chosen = audioFiles[randomIdx] as AudioTrack;
      setCurrentTrack(chosen);
      setPlaybackHistory([chosen.id]);
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (!currentTrack || playlist.length === 0) return;

    if (isShuffle) {
      if (playlist.length === 1) {
        setCurrentTrack(playlist[0]);
        setIsPlaying(true);
        return;
      }

      const otherTracks = playlist.filter((t) => t.id !== currentTrack.id);
      const recentWindow = Math.min(playbackHistory.length, Math.max(1, Math.floor(playlist.length / 2)));
      const recentIds = playbackHistory.slice(-recentWindow);
      let candidatePool = otherTracks.filter((t) => !recentIds.includes(t.id));
      if (candidatePool.length === 0) {
        candidatePool = otherTracks;
      }

      const randomTrack = candidatePool[Math.floor(Math.random() * candidatePool.length)];
      setPlaybackHistory((prev) => [...prev.slice(-50), currentTrack.id]);
      setCurrentTrack(randomTrack);
      setIsPlaying(true);
    } else {
      const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex === -1) {
        setCurrentTrack(playlist[0]);
        setIsPlaying(true);
      } else if (repeatMode === "off" && currentIndex === playlist.length - 1) {
        setIsPlaying(false);
      } else {
        const nextIndex = (currentIndex + 1) % playlist.length;
        setPlaybackHistory((prev) => [...prev.slice(-50), currentTrack.id]);
        setCurrentTrack(playlist[nextIndex]);
        setIsPlaying(true);
      }
    }
  };

  const handlePrevTrack = () => {
    if (!currentTrack || playlist.length === 0) return;

    if (isShuffle && playbackHistory.length > 0) {
      const lastTrackId = playbackHistory[playbackHistory.length - 1];
      const prevTrack = playlist.find((t) => t.id === lastTrackId);
      setPlaybackHistory((prev) => prev.slice(0, -1));
      if (prevTrack) {
        setCurrentTrack(prevTrack);
        setIsPlaying(true);
        return;
      }
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrack(playlist[prevIndex]);
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (!currentTrack && playlist.length > 0) {
      setCurrentTrack(playlist[0]);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Filtered & Sorted files list
  const filteredAndSortedFiles = useMemo(() => {
    if (!folderData) return [];

    let list = folderData.files.filter((file) => {
      const matchesCategory =
        selectedCategory === "all" ||
        file.category === selectedCategory ||
        (selectedCategory === "video" && file.extension === "mp4") ||
        (selectedCategory === "audio" && file.category === "audio");

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        file.name.toLowerCase().includes(q) ||
        file.extension.toLowerCase().includes(q) ||
        (file.artist && file.artist.toLowerCase().includes(q)) ||
        (file.album && file.album.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });

    // Apply Sorting
    if (sortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "size-desc") {
      list.sort((a, b) => b.size - a.size);
    } else if (sortBy === "size-asc") {
      list.sort((a, b) => a.size - b.size);
    } else if (sortBy === "duration-desc") {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    return list;
  }, [folderData, selectedCategory, searchQuery, sortBy]);

  // Paginated files subset
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = useMemo(() => {
    if (itemsPerPage >= 99999) return filteredAndSortedFiles;
    return filteredAndSortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFiles, startIndex, itemsPerPage]);

  return (
    <div className="min-h-screen flex flex-col pb-36">
      {/* Top Navigation */}
      <Navbar
        currentFolder={folderData?.folderName}
        isAudioDetected={folderData?.isAudioFolder}
        ndusCookie={ndusCookie}
        cookieStatus={cookieStatus}
        onSaveCookie={handleSaveCookie}
        onClearCookie={handleClearCookie}
        onValidateCookie={handleValidateCookie}
        isCookieModalOpen={isCookieModalOpen}
        onToggleCookieModal={setIsCookieModalOpen}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 w-full flex-1 flex flex-col gap-6">
        {/* Link Input Card */}
        <LinkInputSection
          onInspect={handleInspectUrl}
          isLoading={isLoading}
          onImportCustomFiles={handleImportCustomFiles}
        />

        {/* Private Folder / Cookie Required Banner */}
        {folderData?.requiresCookie && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {cookieStatus === "expired"
                    ? "Sesi Cookie ndus Kedaluwarsa (Expired)"
                    : "Folder Private TeraBox (dm.terabox.com)"}
                </p>
                <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                  {folderData.noticeMessage ||
                    "Link ini adalah folder private TeraBox Anda. Untuk mengakses file dan streaming, hubungkan Cookie ndus yang aktif."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsCookieModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap self-end sm:self-auto"
            >
              {cookieStatus === "expired" ? "Perbarui Cookie ndus" : "Hubungkan Cookie ndus"}
            </button>
          </div>
        )}

        {/* Error Alert with Auto-Fallback Notice */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-rose-950 dark:text-white text-sm">Kendala API TeraBox</p>
                <p className="text-rose-700 dark:text-rose-300 text-xs mt-0.5">{errorMessage}</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                  ⚡ Fitur YouTube Auto-Fallback aktif: Lagu yang error akan otomatis dicari dan diputar dari YouTube secara 100% Bebas Iklan.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Initial Welcome State if no folder loaded */}
        {!folderData && !isLoading && !errorMessage && (
          <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/60 shadow-xl shadow-slate-200/30 dark:shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/15 to-indigo-500/15 dark:from-sky-500/20 dark:to-indigo-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center mb-4">
              <FolderSearch className="w-8 h-8" />
            </div>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white">
              Siap Menginspeksi Link TeraBox Anda
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg">
              Masukkan link share TeraBox (<code className="text-sky-600 dark:text-sky-300 font-mono">terabox.com/s/1xxxx</code>) atau link folder pribadi di kolom atas untuk melihat daftar file lengkap, rincian ukuran MB, serta memutar audio dan video secara langsung.
            </p>
          </div>
        )}

        {/* Folder Results */}
        {folderData && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* Header, Stats & Search Controls */}
            <FolderStatsHeader
              folderData={folderData}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategoryChange}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              viewMode={viewMode}
              onToggleViewMode={setViewMode}
              onPlayAllAudio={handlePlayAllAudio}
              onShuffleAllAudio={handleShuffleAllAudio}
              onOpenFolder={handleOpenFolder}
              sortBy={sortBy}
              onSortChange={handleSortChange}
              filteredCount={filteredAndSortedFiles.length}
            />

            {/* Subfolders if any */}
            {folderData.folders && folderData.folders.length > 0 && (
              <FolderTree
                folders={
                  searchQuery.trim()
                    ? folderData.folders.filter(
                        (f) =>
                          f.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                          f.path.toLowerCase().includes(searchQuery.toLowerCase().trim())
                      )
                    : folderData.folders
                }
                onOpenFolder={handleOpenFolder}
              />
            )}

            {/* Files View: Table or Grid */}
            {paginatedFiles.length > 0 ? (
              <>
                {viewMode === "table" ? (
                  /* Table View */
                  <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/70 shadow-lg shadow-slate-200/30 dark:shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <th className="py-3 pl-4 pr-2 w-12 text-center">#</th>
                            <th className="py-3 px-3">Nama File</th>
                            <th className="py-3 px-3 hidden sm:table-cell">Format</th>
                            <th className="py-3 px-3">Ukuran (MB)</th>
                            <th className="py-3 px-3 hidden md:table-cell">Durasi</th>
                            <th className="py-3 pr-4 pl-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedFiles.map((file, idx) => (
                            <FileTableRow
                              key={file.id || `${startIndex}-${idx}`}
                              file={file}
                              index={startIndex + idx}
                              isCurrentlyPlayingAudio={
                                currentTrack?.id === file.id && isPlaying
                              }
                              onPlayAudio={handlePlayAudio}
                              onOpenVideo={handleOpenVideo}
                              onPlayYouTube={handlePlayYouTube}
                              onOpenFolder={handleOpenFolder}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Grid View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginatedFiles.map((file, idx) => (
                      <FileCard
                        key={file.id || `${startIndex}-${idx}`}
                        file={file}
                        isCurrentlyPlayingAudio={
                          currentTrack?.id === file.id && isPlaying
                        }
                        onPlayAudio={handlePlayAudio}
                        onOpenVideo={handleOpenVideo}
                        onPlayYouTube={handlePlayYouTube}
                        onOpenFolder={handleOpenFolder}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Pagination Controls */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredAndSortedFiles.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            ) : (
              /* Empty Search / Category State */
              <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/40 shadow-lg">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 mb-3">
                  <FileQuestion className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Tidak ada file yang cocok</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Tidak ditemukan file untuk kategori <span className="text-sky-600 dark:text-sky-400 font-semibold">"{selectedCategory}"</span>
                  {searchQuery ? ` dengan kata kunci "${searchQuery}"` : ""}.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all cursor-pointer shadow-sm"
                >
                  Reset Filter & Pencarian
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Audio Player Deck */}
      {currentTrack && (
        <AudioPlayerBar
          playlist={playlist}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          ndusCookie={ndusCookie}
          cookieStatus={cookieStatus}
          onPlayTrack={handlePlayAudio}
          onTogglePlay={handleTogglePlay}
          onNextTrack={handleNextTrack}
          onPrevTrack={handlePrevTrack}
          isShuffle={isShuffle}
          onToggleShuffle={handleToggleShuffle}
          repeatMode={repeatMode}
          onToggleRepeat={handleToggleRepeat}
          onClosePlayer={() => {
            setIsPlaying(false);
            setCurrentTrack(null);
          }}
          onOpenCookieModal={() => setIsCookieModalOpen(true)}
          onDurationLoaded={handleUpdateFileDuration}
        />
      )}

      {/* Video Player Modal */}
      <VideoModal
        file={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onDurationLoaded={handleUpdateFileDuration}
      />
    </div>
  );
}
