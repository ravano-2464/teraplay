"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { LinkInputSection } from "@/components/LinkInputSection";
import { YouTubeSearchSection } from "@/components/YouTubeSearchSection";
import { YouTubeCard } from "@/components/YouTubeCard";
import { YouTubeTableRow } from "@/components/YouTubeTableRow";
import { Pagination } from "@/components/Pagination";
import { FolderStatsHeader } from "@/components/FolderStatsHeader";
import { FileCard } from "@/components/FileCard";
import { FileTableRow } from "@/components/FileTableRow";
import { FolderTree } from "@/components/FolderTree";
import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { VideoModal } from "@/components/VideoModal";
import { CustomSelect } from "@/components/CustomSelect";
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
  Youtube,
  Zap,
  Play,
  Shuffle,
  LayoutGrid,
  List,
  Loader2,
  ArrowUpDown,
  Flame,
  Radio,
} from "lucide-react";

const mapYouTubeResultToFile = (item: any): TeraBoxFile => ({
  id: `yt-${item.id}`,
  name: item.title,
  size: (item.duration || 210) * 16000,
  formattedSize: item.formattedDuration || "03:30",
  category: "audio",
  extension: "mp3",
  mimeType: "audio/mpeg",
  duration: item.duration || 210,
  formattedDuration: item.formattedDuration || "03:30",
  artist: item.channel || "YouTube Creator",
  isDir: false,
  sourceType: "youtube-fallback",
  isYoutubeFallback: true,
  youtubeId: item.id,
  youtubeTitle: item.title,
  youtubeChannel: item.channel,
  thumbnailUrl: item.thumbnailUrl,
  youtubeThumbnail: item.thumbnailUrl,
});

export default function Home() {
  // App Mode: TeraBox Folder Inspector vs Full YouTube No-Ads
  const [appMode, setAppMode] = useState<"terabox" | "youtube">("terabox");

  // TeraBox State
  const [folderData, setFolderData] = useState<TeraBoxFolderResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TeraBox Filters, Search, Sort & Pagination State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // YouTube Mode State
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<TeraBoxFile[]>([]);
  const [isYtSearching, setIsYtSearching] = useState(false);
  const [ytErrorMessage, setYtErrorMessage] = useState<string | null>(null);
  const [ytViewMode, setYtViewMode] = useState<"grid" | "table">("grid");
  const [ytPage, setYtPage] = useState(1);
  const [ytItemsPerPage, setYtItemsPerPage] = useState(24);
  const [ytSortBy, setYtSortBy] = useState("default");

  // Audio Player State (Shared between TeraBox and YouTube modes)
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

  // YouTube Search Action
  const handleSearchYouTube = useCallback(async (query: string) => {
    setIsYtSearching(true);
    setYtErrorMessage(null);
    setYtQuery(query);

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&limit=30`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat hasil pencarian YouTube");
      }
      const files = (data.results || []).map(mapYouTubeResultToFile);
      setYtResults(files);
      setYtPage(1);
    } catch (err: any) {
      setYtErrorMessage(err.message || "Terjadi kendala saat mencari di YouTube.");
    } finally {
      setIsYtSearching(false);
    }
  }, []);

  // Initial load
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

  // Load initial YouTube tracks on switching to YouTube mode
  useEffect(() => {
    if (appMode === "youtube" && ytResults.length === 0 && !isYtSearching) {
      handleSearchYouTube("");
    }
  }, [appMode, ytResults.length, isYtSearching, handleSearchYouTube]);

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

  const handleOpenFolder = (folderPath: string) => {
    const cleanPath = folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
    const targetUrl = `https://dm.terabox.com/main?path=${encodeURIComponent(cleanPath)}`;
    handleInspectUrl(targetUrl);
  };

  const handleOpenVideo = (file: TeraBoxFile) => {
    setIsPlaying(false);
    setSelectedVideo(file);
  };

  const handlePlayAudio = (file: TeraBoxFile) => {
    setSelectedVideo(null);

    if (appMode === "terabox" && folderData) {
      const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
      setPlaylist(audioFiles as AudioTrack[]);
    } else if (appMode === "youtube") {
      setPlaylist(filteredAndSortedYtFiles as AudioTrack[]);
    }

    if (currentTrack?.id === file.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(file as AudioTrack);
      setIsPlaying(true);
    }
  };

  const handleAddToQueue = (track: TeraBoxFile) => {
    setPlaylist((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      return [...prev, track as AudioTrack];
    });
  };

  const handlePlayYouTube = async (file: TeraBoxFile) => {
    setSelectedVideo(null);

    if (folderData) {
      const audioFiles = folderData.files.filter((f) => f.category === "audio" || f.extension === "mp4");
      setPlaylist(audioFiles as AudioTrack[]);
    }

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

  // YouTube Mode Play All & Shuffle All
  const handlePlayAllYouTube = () => {
    if (filteredAndSortedYtFiles.length === 0) return;
    setPlaylist(filteredAndSortedYtFiles as AudioTrack[]);
    setIsShuffle(false);
    setCurrentTrack(filteredAndSortedYtFiles[0] as AudioTrack);
    setPlaybackHistory([filteredAndSortedYtFiles[0].id]);
    setIsPlaying(true);
  };

  const handleShuffleAllYouTube = () => {
    if (filteredAndSortedYtFiles.length === 0) return;
    setPlaylist(filteredAndSortedYtFiles as AudioTrack[]);
    setIsShuffle(true);
    const randomIdx = Math.floor(Math.random() * filteredAndSortedYtFiles.length);
    const chosen = filteredAndSortedYtFiles[randomIdx] as AudioTrack;
    setCurrentTrack(chosen);
    setPlaybackHistory([chosen.id]);
    setIsPlaying(true);
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

  // TeraBox Filtered & Sorted files list
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

  // TeraBox Paginated subset
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFiles = useMemo(() => {
    if (itemsPerPage >= 99999) return filteredAndSortedFiles;
    return filteredAndSortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFiles, startIndex, itemsPerPage]);

  // YouTube Sorted files list
  const filteredAndSortedYtFiles = useMemo(() => {
    let list = [...ytResults];
    if (ytSortBy === "name-asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (ytSortBy === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (ytSortBy === "duration-desc") {
      list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (ytSortBy === "duration-asc") {
      list.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    }
    return list;
  }, [ytResults, ytSortBy]);

  // YouTube Paginated subset
  const ytStartIndex = (ytPage - 1) * ytItemsPerPage;
  const paginatedYtFiles = useMemo(() => {
    if (ytItemsPerPage >= 99999) return filteredAndSortedYtFiles;
    return filteredAndSortedYtFiles.slice(ytStartIndex, ytStartIndex + ytItemsPerPage);
  }, [filteredAndSortedYtFiles, ytStartIndex, ytItemsPerPage]);

  return (
    <div className="min-h-screen flex flex-col pb-36">
      {/* Top Navigation */}
      <Navbar
        currentFolder={appMode === "terabox" ? folderData?.folderName : undefined}
        isAudioDetected={appMode === "terabox" ? folderData?.isAudioFolder : true}
        ndusCookie={ndusCookie}
        cookieStatus={cookieStatus}
        onSaveCookie={handleSaveCookie}
        onClearCookie={handleClearCookie}
        onValidateCookie={handleValidateCookie}
        isCookieModalOpen={isCookieModalOpen}
        onToggleCookieModal={setIsCookieModalOpen}
        appMode={appMode}
        onModeChange={(mode) => {
          setAppMode(mode);
        }}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 w-full flex-1 flex flex-col gap-6">
        {/* ========================================================= */}
        {/* YOUTUBE MODE VIEW                                         */}
        {/* ========================================================= */}
        {appMode === "youtube" && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Search Section for YouTube */}
            <YouTubeSearchSection
              onSearch={handleSearchYouTube}
              isLoading={isYtSearching}
              initialQuery={ytQuery}
            />

            {/* Error Alert if search failed */}
            {ytErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-3 shadow-md">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <p className="font-semibold">{ytErrorMessage}</p>
              </div>
            )}

            {/* YouTube Results Header Toolbar */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-950/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white shadow-md shadow-red-500/20">
                  <Youtube className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{ytQuery ? `Hasil Pencarian: "${ytQuery}"` : "🔥 Musik & Video Populer"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                      {filteredAndSortedYtFiles.length} item
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Semua lagu dan video diputar langsung 100% bebas iklan dengan audio visualizer responsif.
                  </p>
                </div>
              </div>

              {/* Action Buttons: Play All, Shuffle All, View Toggle, Sort */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Play All Audio */}
                <button
                  type="button"
                  onClick={handlePlayAllYouTube}
                  disabled={filteredAndSortedYtFiles.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-md shadow-red-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Putar semua hasil dari atas ke bawah"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Putar Semua</span>
                </button>

                {/* Shuffle All Audio */}
                <button
                  type="button"
                  onClick={handleShuffleAllYouTube}
                  disabled={filteredAndSortedYtFiles.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  title="Putar acak (shuffle) semua hasil"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Acak Semua</span>
                </button>

                {/* View Mode Toggle: Grid vs Table */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setYtViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      ytViewMode === "grid"
                        ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setYtViewMode("table")}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      ytViewMode === "table"
                        ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    }`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort dropdown */}
                <CustomSelect
                  value={ytSortBy}
                  onChange={(val) => setYtSortBy(String(val))}
                  icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                  size="sm"
                  minWidth="min-w-[170px]"
                  options={[
                    { value: "default", label: "Urutan YouTube" },
                    { value: "name-asc", label: "Judul (A - Z)" },
                    { value: "name-desc", label: "Judul (Z - A)" },
                    { value: "duration-desc", label: "Durasi Terpanjang" },
                    { value: "duration-asc", label: "Durasi Terpendek" },
                  ]}
                />
              </div>
            </div>

            {/* YouTube Search Loading State */}
            {isYtSearching && (
              <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/60 shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-3" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  Mencari di YouTube (Bebas Iklan)...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Menyiapkan hasil streaming audio & video berkualitas tinggi.
                </p>
              </div>
            )}

            {/* YouTube Search Results: Grid or Table */}
            {!isYtSearching && paginatedYtFiles.length > 0 && (
              <>
                {ytViewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {paginatedYtFiles.map((track, idx) => (
                      <YouTubeCard
                        key={track.id || `yt-${idx}`}
                        track={track}
                        isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
                        onPlayAudio={handlePlayAudio}
                        onOpenVideo={handleOpenVideo}
                        onAddToQueue={handleAddToQueue}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/70 shadow-lg">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <th className="py-3 pl-4 pr-2 w-12 text-center">#</th>
                            <th className="py-3 px-3">Judul & Artis YouTube</th>
                            <th className="py-3 px-3 hidden sm:table-cell">Kategori</th>
                            <th className="py-3 px-3">Durasi</th>
                            <th className="py-3 pr-4 pl-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedYtFiles.map((track, idx) => (
                            <YouTubeTableRow
                              key={track.id || `yt-${idx}`}
                              track={track}
                              index={ytStartIndex + idx}
                              isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
                              onPlayAudio={handlePlayAudio}
                              onOpenVideo={handleOpenVideo}
                              onAddToQueue={handleAddToQueue}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bottom Pagination for YouTube */}
                <Pagination
                  currentPage={ytPage}
                  totalItems={filteredAndSortedYtFiles.length}
                  itemsPerPage={ytItemsPerPage}
                  onPageChange={setYtPage}
                  onItemsPerPageChange={setYtItemsPerPage}
                />
              </>
            )}

            {/* YouTube Empty Result */}
            {!isYtSearching && filteredAndSortedYtFiles.length === 0 && (
              <div className="glass-panel rounded-3xl p-12 text-center flex flex-col items-center justify-center border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-slate-950/40 shadow-lg">
                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 mb-3">
                  <FileQuestion className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  Tidak ada video yang ditemukan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  Coba gunakan kata kunci pencarian yang lain atau pilih salah satu tag cepat di atas.
                </p>
                <button
                  type="button"
                  onClick={() => handleSearchYouTube("")}
                  className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-transparent transition-all cursor-pointer shadow-sm"
                >
                  Tampilkan Lagu Populer
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TERABOX MODE VIEW                                         */}
        {/* ========================================================= */}
        {appMode === "terabox" && (
          <>
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
                <button
                  type="button"
                  onClick={() => setAppMode("youtube")}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Youtube className="w-4 h-4 fill-current" />
                  <span>Coba Full YouTube Mode (Bebas Iklan)</span>
                </button>
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
          </>
        )}
      </main>

      {/* Floating Audio Player Deck (Unified for TeraBox & YouTube Modes) */}
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

      {/* Video Player Modal (Unified for TeraBox & YouTube Modes) */}
      <VideoModal
        file={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onDurationLoaded={handleUpdateFileDuration}
      />
    </div>
  );
}
