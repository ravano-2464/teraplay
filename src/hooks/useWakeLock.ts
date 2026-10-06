"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useWakeLock(autoEnable = false) {
  const [isSupported, setIsSupported] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockSentinelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setIsSupported(true);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return false;

    try {
      if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
        return true;
      }
      const sentinel = await (navigator as any).wakeLock.request("screen");
      wakeLockSentinelRef.current = sentinel;
      setIsLocked(true);

      sentinel.addEventListener("release", () => {
        setIsLocked(false);
        wakeLockSentinelRef.current = null;
      });

      return true;
    } catch (err) {
      console.warn("WakeLock request failed:", err);
      setIsLocked(false);
      return false;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {}
      wakeLockSentinelRef.current = null;
    }
    setIsLocked(false);
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (isLocked) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  }, [isLocked, releaseWakeLock, requestWakeLock]);

  // Re-acquire wake lock if tab visibility changes back to visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isLocked && !wakeLockSentinelRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLocked, requestWakeLock]);

  useEffect(() => {
    if (autoEnable) {
      requestWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [autoEnable, requestWakeLock, releaseWakeLock]);

  return {
    isSupported,
    isLocked,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock,
  };
}
