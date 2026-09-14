"use client";

import React, { useState, useEffect } from "react";
import { Disc3, FolderSearch, Sparkles, Music2, Key, ShieldCheck, Check, X } from "lucide-react";

interface NavbarProps {
  currentFolder?: string;
  isAudioDetected?: boolean;
  ndusCookie?: string;
  onSaveCookie?: (cookie: string) => void;
  isCookieModalOpen?: boolean;
  onToggleCookieModal?: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentFolder,
  isAudioDetected,
  ndusCookie = "",
  onSaveCookie,
  isCookieModalOpen,
  onToggleCookieModal,
}) => {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState(ndusCookie);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
  }, [ndusCookie]);

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

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 shadow-lg shadow-sky-500/20 text-white">
              <Disc3 className="w-6 h-6 animate-spin-slow" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
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
                ndusCookie
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/60"
              }`}
              title="Konfigurasi Cookie ndus TeraBox untuk Live Direct Fetch"
            >
              <Key className={`w-3.5 h-3.5 ${ndusCookie ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="hidden sm:inline">{ndusCookie ? "Live API Connected" : "Set TeraBox Cookie (ndus)"}</span>
              <span className="sm:hidden">Cookie</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal TeraBox ndus Cookie */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
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
                className="p-1 rounded-lg text-slate-400 hover:text-white"
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
                <input
                  type="text"
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="Contoh: YXNkZjEyMz... atau ndus=YXNkZjEyMz..."
                  className="w-full p-2.5 rounded-xl glass-input text-xs font-mono text-white border border-slate-700 focus:border-sky-500"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Tutup
              </button>
              <button
                type="button"
                suppressHydrationWarning
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg shadow-sky-500/20"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <span>Simpan & Aktifkan Live Fetch</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
