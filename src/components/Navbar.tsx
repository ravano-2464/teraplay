"use client";

import React, { useState, useEffect } from "react";
import {
  Disc3,
  FolderSearch,
  Sparkles,
  Music2,
  Key,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  HelpCircle,
} from "lucide-react";

interface NavbarProps {
  currentFolder?: string;
  isAudioDetected?: boolean;
  ndusCookie?: string;
  cookieStatus?: "none" | "checking" | "valid" | "expired" | "error";
  onSaveCookie?: (cookie: string) => void;
  onClearCookie?: () => void;
  onValidateCookie?: (cookie: string) => Promise<{ isValid: boolean; isExpired: boolean; message: string; status: string }>;
  isCookieModalOpen?: boolean;
  onToggleCookieModal?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentFolder,
  isAudioDetected,
  ndusCookie = "",
  cookieStatus = "none",
  onSaveCookie,
  onClearCookie,
  onValidateCookie,
  isCookieModalOpen,
  onToggleCookieModal,
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState(ndusCookie);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    status: "valid" | "expired" | "error" | "none";
    message: string;
  } | null>(null);

  const showKeyModal = isCookieModalOpen !== undefined ? isCookieModalOpen : internalModalOpen;
  const setShowKeyModal = (open: boolean) => {
    if (onToggleCookieModal) {
      onToggleCookieModal(open);
    } else {
      setInternalModalOpen(open);
    }
  };

  useEffect(() => {
    setCookieInput(ndusCookie);
    setValidationResult(null);
  }, [ndusCookie, showKeyModal]);

  const handleValidate = async (targetVal?: string) => {
    const val = targetVal !== undefined ? targetVal : cookieInput;
    if (!val.trim()) {
      setValidationResult({
        status: "none",
        message: "Masukkan nilai cookie ndus terlebih dahulu untuk diverifikasi.",
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      if (onValidateCookie) {
        const res = await onValidateCookie(val.trim());
        setValidationResult({
          status: res.isValid ? "valid" : res.isExpired ? "expired" : "error",
          message: res.message,
        });
      } else {
        const res = await fetch("/api/terabox/validate-cookie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cookie: val.trim() }),
        });
        const json = await res.json();
        setValidationResult({
          status: json.isValid ? "valid" : json.isExpired ? "expired" : "error",
          message: json.message || (json.isValid ? "Cookie valid & aktif!" : "Cookie tidak valid / kedaluwarsa."),
        });
      }
    } catch (e: any) {
      setValidationResult({
        status: "error",
        message: "Gagal memverifikasi ke server TeraBox: " + (e?.message || String(e)),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    if (onSaveCookie) {
      onSaveCookie(cookieInput.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setShowKeyModal(false);
      }, 1200);
    }
  };

  const handleClear = () => {
    setCookieInput("");
    setValidationResult(null);
    if (onClearCookie) {
      onClearCookie();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 shadow-lg shadow-sky-500/20 text-white">
              <Disc3 className="w-6 h-6 animate-spin-slow" />
              <div
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  cookieStatus === "valid"
                    ? "bg-emerald-400 animate-pulse"
                    : cookieStatus === "expired"
                    ? "bg-rose-500 animate-pulse"
                    : "bg-sky-400"
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                  TeraBox Shows
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  v1.0 Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Folder Inspector & Intelligent Media Player
              </p>
            </div>
          </div>

          {/* Center / Status info */}
          {currentFolder && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <FolderSearch className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Folder:</span>
              <span className="font-semibold text-white truncate max-w-[180px]">{currentFolder}</span>
              {isAudioDetected && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <Music2 className="w-3 h-3" /> Audio Active
                </span>
              )}
            </div>
          )}

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* TeraBox ndus Cookie Config */}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                cookieStatus === "expired"
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25"
                  : ndusCookie || cookieStatus === "valid"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
              }`}
              title="Konfigurasi Cookie ndus TeraBox untuk Live Direct Fetch"
            >
              <Key
                className={`w-3.5 h-3.5 ${
                  cookieStatus === "expired"
                    ? "text-rose-400 animate-pulse"
                    : ndusCookie || cookieStatus === "valid"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              />
              <span className="hidden sm:inline">
                {cookieStatus === "expired"
                  ? "Cookie ndus Expired (Perbarui)"
                  : cookieStatus === "valid"
                  ? "Live API Connected (Valid)"
                  : ndusCookie
                  ? "Live API Connected"
                  : "Set TeraBox Cookie (ndus)"}
              </span>
              <span className="sm:hidden">
                {cookieStatus === "expired" ? "Expired" : ndusCookie ? "Connected" : "Cookie"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal TeraBox ndus Cookie */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Live TeraBox Drive API (ndus Cookie)</h3>
              </div>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <p>
                Link dengan format <code className="text-sky-300 bg-slate-800 px-1 py-0.5 rounded">dm.terabox.com/main?path=...</code> adalah <strong>folder drive private</strong> Anda di TeraBox.
              </p>
              <p>
                Agar server dapat langsung menembak API TeraBox (<code className="text-slate-400 font-mono">dm.terabox.com/api/list</code> & stream) secara real-time dari akun Anda, masukkan nilai cookie <code className="text-emerald-400 font-mono">ndus</code>:
              </p>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-1 text-[11px] text-slate-400">
                <p className="font-semibold text-slate-200">Cara ambil cookie ndus:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Buka tab browser ke <strong className="text-white">terabox.com</strong> (pastikan sudah login).</li>
                  <li>Tekan <kbd className="bg-slate-800 px-1 rounded text-white">F12</kbd> → Tab <strong>Application / Storage</strong> → <strong>Cookies</strong>.</li>
                  <li>Salin nilai cookie bernama <code className="text-emerald-300 font-mono">ndus</code>.</li>
                </ol>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Nilai Cookie ndus:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                    placeholder="Contoh: YXNkZjEyMz... atau ndus=YXNkZjEyMz..."
                    className="w-full p-2.5 rounded-xl glass-input text-xs font-mono text-white border border-slate-700 focus:border-sky-500"
                  />
                  {cookieInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                      title="Hapus token tersimpan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Validation Result Banner */}
              {validationResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                    validationResult.status === "valid"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                      : validationResult.status === "expired"
                      ? "bg-rose-950/60 border-rose-500/40 text-rose-200"
                      : "bg-amber-950/60 border-amber-500/40 text-amber-200"
                  }`}
                >
                  {validationResult.status === "valid" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-bold">
                      {validationResult.status === "valid"
                        ? "Token ndus VALID & Aktif"
                        : validationResult.status === "expired"
                        ? "Token ndus Kedaluwarsa (Expired)"
                        : "Hasil Pengecekan Token"}
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">{validationResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                disabled={isValidating || !cookieInput.trim()}
                onClick={() => handleValidate()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? "animate-spin text-sky-400" : ""}`} />
                <span>{isValidating ? "Memverifikasi..." : "Verifikasi Validitas Token"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20 cursor-pointer transition-all"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Memuat Drive...</span>
                    </>
                  ) : (
                    <span>
                      {validationResult?.status === "valid" ? "Simpan & Buka Root Drive" : "Simpan & Tampilkan File"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
