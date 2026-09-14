"use client";

import React from "react";
import { Folder, ChevronRight, FolderOpen, ArrowRight, CornerDownRight } from "lucide-react";

interface FolderTreeProps {
  folders: {
    name: string;
    path: string;
    itemCount?: number;
  }[];
  onOpenFolder?: (path: string) => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({ folders, onOpenFolder }) => {
  if (!folders || folders.length === 0) return null;

  return (
    <div className="glass-panel rounded-3xl p-5 border border-white/10 bg-slate-950/70 shadow-xl">
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2.5 text-xs font-bold text-white uppercase tracking-wider">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <FolderOpen className="w-4 h-4" />
          </div>
          <span>Subfolder TeraBox ({folders.length})</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Klik folder untuk membuka direktori</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {folders.map((folder, idx) => (
          <div
            key={folder.path || idx}
            onClick={() => onOpenFolder && onOpenFolder(folder.path)}
            className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 hover:bg-gradient-to-r hover:from-slate-900 hover:to-sky-950/40 border border-slate-800/80 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center gap-3 truncate min-w-0 pr-2">
              <div className="p-2.5 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/25 border border-sky-500/20 group-hover:border-sky-500/40 text-sky-400 group-hover:text-sky-300 group-hover:scale-105 transition-all duration-200 shrink-0">
                <Folder className="w-4 h-4 fill-sky-400/20" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 group-hover:text-white truncate transition-colors">
                  {folder.name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 group-hover:text-sky-300/80 truncate mt-0.5">
                  {folder.path}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <div className="w-7 h-7 rounded-xl bg-slate-800/80 group-hover:bg-sky-500 text-slate-400 group-hover:text-slate-950 flex items-center justify-center transition-all duration-200 shadow-sm">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
