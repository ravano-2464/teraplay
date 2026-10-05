"use client";

import { useState, useEffect, useCallback } from "react";
import { WatchHistoryItem } from "@/types/watchHistory";
import { TeraBoxFile } from "@/types/terabox";
import {
  getWatchHistory,
  addToWatchHistory as addHelper,
  removeFromWatchHistory as removeHelper,
  clearWatchHistory as clearHelper,
  HISTORY_EVENT_NAME,
} from "@/lib/watchHistory";

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync state from storage
  const syncHistory = useCallback(() => {
    setHistory(getWatchHistory());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    syncHistory();

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<WatchHistoryItem[]>;
      if (customEvent.detail) {
        setHistory(customEvent.detail);
      } else {
        syncHistory();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "teraplay_watch_history_v1") {
        syncHistory();
      }
    };

    window.addEventListener(HISTORY_EVENT_NAME, handleCustomEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(HISTORY_EVENT_NAME, handleCustomEvent);
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncHistory]);

  const add = useCallback(
    (file: TeraBoxFile, mediaType: "audio" | "video") => {
      const updated = addHelper(file, mediaType);
      setHistory(updated);
    },
    []
  );

  const remove = useCallback((id: string) => {
    const updated = removeHelper(id);
    setHistory(updated);
  }, []);

  const clear = useCallback(() => {
    clearHelper();
    setHistory([]);
  }, []);

  return {
    history,
    historyCount: history.length,
    isLoaded,
    addToHistory: add,
    removeFromHistory: remove,
    clearHistory: clear,
    refreshHistory: syncHistory,
  };
}
