import React from "react";
import { LanguageKey } from "@/i18n";

interface FlagIconProps {
  country: LanguageKey | string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const FlagIcon: React.FC<FlagIconProps> = ({
  country,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-4 h-3 rounded-[3px]",
    md: "w-5 h-3.5 rounded-[4px]",
    lg: "w-6 h-4.5 rounded-[5px]",
  }[size];

  const key = (country || "").toLowerCase();

  const renderFlagSvg = () => {
    switch (key) {
      case "indonesia":
      case "indonesian":
      case "id":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#e70011" d="M0 0h640v240H0z" />
            <path fill="#ffffff" d="M0 240h640v240H0z" />
          </svg>
        );

      case "jepang":
      case "japanese":
      case "ja":
      case "jp":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover bg-white">
            <circle cx="320" cy="240" r="140" fill="#bc002d" />
          </svg>
        );

      case "italia":
      case "italian":
      case "it":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#009246" d="M0 0h213.3v480H0z" />
            <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#ce2b37" d="M426.7 0H640v480H426.7z" />
          </svg>
        );

      case "spanyol":
      case "spanish":
      case "es":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#aa151b" d="M0 0h640v480H0z" />
            <path fill="#f1bf00" d="M0 120h640v240H0z" />
            <circle cx="180" cy="240" r="30" fill="#aa151b" opacity="0.9" />
          </svg>
        );

      case "belanda":
      case "dutch":
      case "nl":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#ae1c28" d="M0 0h640v160H0z" />
            <path fill="#ffffff" d="M0 160h640v160H0z" />
            <path fill="#21468b" d="M0 320h640v160H0z" />
          </svg>
        );

      case "jerman":
      case "german":
      case "de":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#000000" d="M0 0h640v160H0z" />
            <path fill="#dd0000" d="M0 160h640v160H0z" />
            <path fill="#ffce00" d="M0 320h640v160H0z" />
          </svg>
        );

      case "prancis":
      case "french":
      case "fr":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#002395" d="M0 0h213.3v480H0z" />
            <path fill="#ffffff" d="M213.3 0h213.4v480H213.3z" />
            <path fill="#ed2939" d="M426.7 0H640v480H426.7z" />
          </svg>
        );

      case "russia":
      case "russian":
      case "ru":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#ffffff" d="M0 0h640v160H0z" />
            <path fill="#0039a6" d="M0 160h640v160H0z" />
            <path fill="#d52b1e" d="M0 320h640v160H0z" />
          </svg>
        );

      case "melayu":
      case "malay":
      case "ms":
      case "my":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#cc0000" d="M0 0h640v480H0z" />
            <path stroke="#ffffff" strokeWidth="34.3" d="M0 51.4h640M0 120h640M0 188.6h640M0 257.1h640M0 325.7h640M0 394.3h640M0 462.9h640" />
            <path fill="#000066" d="M0 0h320v274.3H0z" />
            <circle cx="160" cy="137.1" r="70" fill="#ffcc00" />
            <circle cx="180" cy="137.1" r="60" fill="#000066" />
            <polygon points="190,137 215,125 200,148 222,138 205,160 220,170 195,165 190,190 180,165 160,180 170,158 150,148 172,140 160,120" fill="#ffcc00" />
          </svg>
        );

      case "china":
      case "chinese":
      case "zh":
      case "cn":
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#de2910" d="M0 0h640v480H0z" />
            <polygon points="100,40 119,98 178,98 130,133 149,191 100,155 51,191 70,133 22,98 81,98" fill="#ffde00" transform="scale(0.7) translate(30, 20)" />
            <polygon points="100,40 119,98 178,98 130,133 149,191 100,155 51,191 70,133 22,98 81,98" fill="#ffde00" transform="scale(0.24) translate(480, 80) rotate(23)" />
            <polygon points="100,40 119,98 178,98 130,133 149,191 100,155 51,191 70,133 22,98 81,98" fill="#ffde00" transform="scale(0.24) translate(580, 180) rotate(45)" />
            <polygon points="100,40 119,98 178,98 130,133 149,191 100,155 51,191 70,133 22,98 81,98" fill="#ffde00" transform="scale(0.24) translate(580, 320) rotate(70)" />
            <polygon points="100,40 119,98 178,98 130,133 149,191 100,155 51,191 70,133 22,98 81,98" fill="#ffde00" transform="scale(0.24) translate(480, 430) rotate(90)" />
          </svg>
        );

      case "english":
      case "en":
      case "us":
      default:
        return (
          <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
            <path fill="#bd3d44" d="M0 0h640v480H0z" />
            <path stroke="#ffffff" strokeWidth="36.9" d="M0 55.4h640M0 129.2h640M0 203h640M0 276.9h640M0 350.8h640M0 424.6h640" />
            <path fill="#192f5d" d="M0 0h256v258.5H0z" />
            <g fill="#ffffff">
              <circle cx="35" cy="30" r="10" />
              <circle cx="95" cy="30" r="10" />
              <circle cx="155" cy="30" r="10" />
              <circle cx="215" cy="30" r="10" />
              <circle cx="65" cy="65" r="10" />
              <circle cx="125" cy="65" r="10" />
              <circle cx="185" cy="65" r="10" />
              <circle cx="35" cy="100" r="10" />
              <circle cx="95" cy="100" r="10" />
              <circle cx="155" cy="100" r="10" />
              <circle cx="215" cy="100" r="10" />
              <circle cx="65" cy="135" r="10" />
              <circle cx="125" cy="135" r="10" />
              <circle cx="185" cy="135" r="10" />
              <circle cx="35" cy="170" r="10" />
              <circle cx="95" cy="170" r="10" />
              <circle cx="155" cy="170" r="10" />
              <circle cx="215" cy="170" r="10" />
              <circle cx="65" cy="205" r="10" />
              <circle cx="125" cy="205" r="10" />
              <circle cx="185" cy="205" r="10" />
            </g>
          </svg>
        );
    }
  };

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-black/15 dark:border-white/20 shadow-xs ring-1 ring-black/5 ${sizeClasses} ${className}`}
      style={{ aspectRatio: "4 / 3" }}
    >
      {renderFlagSvg()}
    </div>
  );
};
