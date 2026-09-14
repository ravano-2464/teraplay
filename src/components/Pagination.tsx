"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = "",
}) => {
  const isAll = itemsPerPage >= totalItems && totalItems > 0;
  const totalPages = isAll ? 1 : Math.ceil(totalItems / itemsPerPage) || 1;
  const [jumpPage, setJumpPage] = useState<string>("");

  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpPage("");
    }
  };

  return (
    <div
      className={`glass-panel rounded-2xl p-4 border border-white/10 bg-slate-950/70 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl text-xs select-none relative z-20 ${className}`}
    >
      {/* Left: Summary Info & Items Per Page Selector */}
      <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start text-slate-400">
        <div>
          Menampilkan{" "}
          <span className="font-bold text-white">
            {isAll ? `1 - ${totalItems}` : `${startItem} - ${endItem}`}
          </span>{" "}
          dari <span className="font-bold text-sky-400">{totalItems}</span> file
        </div>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Page size dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 hidden sm:inline">Per halaman:</span>
          <CustomSelect
            value={isAll ? 99999 : itemsPerPage}
            onChange={(val) => {
              onItemsPerPageChange(Number(val));
              onPageChange(1);
            }}
            options={[
              { value: 10, label: "10 file" },
              { value: 25, label: "25 file" },
              { value: 50, label: "50 file" },
              { value: 100, label: "100 file" },
              { value: 99999, label: `Semua (${totalItems})` },
            ]}
            size="sm"
            dropUp={true}
            align="left"
            minWidth="min-w-[140px]"
          />
        </div>
      </div>

      {/* Right: Pagination Controls & Jump to Page */}
      <div className="flex items-center gap-2 flex-wrap justify-center md:justify-end">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-500 font-mono"
                >
                  ...
                </span>
              );
            }

            const isCurrent = currentPage === p;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 px-2 rounded-xl font-bold font-mono transition-all cursor-pointer text-xs ${
                  isCurrent
                    ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/30 border border-sky-400/50"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Jump to Page Form */}
        {totalPages > 4 && (
          <form
            onSubmit={handleJumpSubmit}
            className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/10"
          >
            <span className="text-slate-500 hidden sm:inline">Ke hal:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={`${currentPage}`}
              className="w-12 px-2 py-1 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
