"use client";

import React from "react";
import { Folder, ChevronRight, FolderOpen } from "lucide-react";

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
    <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-slate-950/60">
      <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <FolderOpen className="w-4 h-4 text-sky-400" />
        <span>Subfolder Dalam Direktori ({folders.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {folders.map((folder, idx) => (
          <div
            key={idx}
            onClick={() => onOpenFolder && onOpenFolder(folder.path)}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
              <Folder className="w-4 h-4 text-sky-400 group-hover:text-sky-300 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                  {folder.name}
                </p>
                {folder.itemCount !== undefined && (
                  <p className="text-[10px] text-slate-400">
                    {folder.itemCount} items
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
