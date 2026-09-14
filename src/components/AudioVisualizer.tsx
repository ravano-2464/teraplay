"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  theme?: "emerald" | "cyan" | "purple";
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  barCount = 28,
  height = 36,
  theme = "emerald",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    const bars = Array.from({ length: barCount }, () => ({
      currentHeight: 4,
      targetHeight: 4,
      speed: 0.1 + Math.random() * 0.15,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const barWidth = width / barCount - 2;

      phase += 0.08;

      bars.forEach((bar, i) => {
        if (isPlaying) {
          // Dynamic procedural waves mimicking sound frequency bands
          const wave1 = Math.sin(phase + i * 0.35) * 0.5 + 0.5;
          const wave2 = Math.cos(phase * 1.5 + i * 0.2) * 0.5 + 0.5;
          const noise = Math.random() * 0.3;
          const combined = (wave1 * 0.6 + wave2 * 0.3 + noise * 0.1);
          bar.targetHeight = Math.max(4, combined * (canvas.height - 4));
        } else {
          bar.targetHeight = 4;
        }

        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.2;

        const x = i * (barWidth + 2);
        const y = canvas.height - bar.currentHeight;

        // Gradient coloring
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (theme === "emerald") {
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.4)");
          gradient.addColorStop(0.7, "#10b981");
          gradient.addColorStop(1, "#34d399");
        } else if (theme === "cyan") {
          gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)");
          gradient.addColorStop(0.7, "#06b6d4");
          gradient.addColorStop(1, "#38bdf8");
        } else {
          gradient.addColorStop(0, "rgba(168, 85, 247, 0.4)");
          gradient.addColorStop(0.7, "#a855f7");
          gradient.addColorStop(1, "#e879f9");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(2, barWidth), Math.max(3, bar.currentHeight), [2, 2, 0, 0]);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, barCount, theme]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-slate-900/60 px-2 py-1 border border-white/5">
      <canvas
        ref={canvasRef}
        width={barCount * 8}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};
