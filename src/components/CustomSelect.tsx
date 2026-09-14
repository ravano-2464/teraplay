"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  align?: "left" | "right";
  dropUp?: boolean;
  minWidth?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  options,
  onChange,
  icon,
  placeholder = "Pilih opsi...",
  size = "md",
  className = "",
  align = "right",
  dropUp = false,
  minWidth = "min-w-[160px]",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: T) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group relative flex items-center justify-between gap-2.5 rounded-xl border font-medium transition-all duration-200 cursor-pointer select-none ${
          size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-xs sm:text-sm"
        } ${
          isOpen
            ? "bg-slate-900 border-sky-500/60 text-white shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/20"
            : "bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && (
            <span className={`shrink-0 transition-colors duration-200 ${isOpen ? "text-sky-400" : "text-slate-400 group-hover:text-slate-200"}`}>
              {icon}
            </span>
          )}
          <span className="truncate font-semibold">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Animated Chevron: Rotates smoothly from 0deg (down) to 180deg (up) */}
        <div className="shrink-0 flex items-center pl-1">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
              isOpen ? "rotate-180 text-sky-400" : "rotate-0 text-slate-400 group-hover:text-slate-200"
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu Popup with Glassmorphic styling and smooth animations */}
      {isOpen && (
        <div
          className={`absolute z-50 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          } ${
            align === "right" ? "right-0" : "left-0"
          } ${minWidth} rounded-2xl bg-slate-950/95 border border-sky-500/30 backdrop-blur-2xl shadow-2xl p-1.5 space-y-1 animate-in ${
            dropUp ? "slide-in-from-bottom-2" : "slide-in-from-top-2"
          } fade-in zoom-in-95 duration-200`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-white border border-sky-500/40 shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon && (
                    <span className={`shrink-0 ${isSelected ? "text-sky-400" : "text-slate-400"}`}>
                      {option.icon}
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {option.badge !== undefined && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/5">
                      {option.badge}
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-in zoom-in duration-150" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
