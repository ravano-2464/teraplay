"use client";

import React, { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElement?: HTMLMediaElement | HTMLVideoElement | null;
  barCount?: number;
  height?: number;
  theme?: "emerald" | "cyan" | "purple" | "rose";
  showPeaks?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  audioElement,
  barCount = 24,
  height = 32,
  theme = "emerald",
  showPeaks = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Attempt Web Audio API connection if audioElement is available
  useEffect(() => {
    if (!audioElement) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === "suspended" && isPlaying) {
        audioCtx.resume().catch(() => {});
      }

      if (!analyserRef.current) {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      if (!sourceNodeRef.current && analyserRef.current) {
        try {
          const source = audioCtx.createMediaElementSource(audioElement);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioCtx.destination);
          sourceNodeRef.current = source;
        } catch {
          // Ignore cross-origin error and use advanced rhythm fallback
        }
      }
    } catch {
      // Ignore Web Audio API issues and fallback smoothly
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface BarData {
      current: number;
      target: number;
      peak: number;
      peakHold: number;
      velocity: number;
      freqOffset: number;
      decaySpeed: number;
    }

    const bars: BarData[] = Array.from({ length: barCount }, (_, idx) => {
      // Frequency distribution weight: left is bass/sub, middle is vocal/mid, right is treble/air
      const normIdx = idx / (barCount - 1);
      const isBass = normIdx < 0.3;
      const isMid = normIdx >= 0.3 && normIdx <= 0.7;
      return {
        current: 4,
        target: 4,
        peak: 4,
        peakHold: 0,
        velocity: 0,
        freqOffset: idx * 0.45,
        decaySpeed: isBass ? 0.22 : isMid ? 0.28 : 0.35,
      };
    });

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const totalSpacing = (barCount - 1) * 2;
      const barWidth = Math.max(2, (width - totalSpacing) / barCount);
      const maxHeight = canvas.height - (showPeaks ? 4 : 2);

      // Check if real Web Audio API frequency data is available
      let hasRealFft = false;
      if (analyserRef.current && dataArrayRef.current && isPlaying) {
        try {
          (analyserRef.current as any).getByteFrequencyData(dataArrayRef.current);
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          if (sum > 50) {
            hasRealFft = true;
          }
        } catch {}
      }

      // Dynamic Musical Rhythm Calculation
      // 128 BPM base beat pulse (0.46875s per beat)
      const beatTime = elapsed * 2.133;
      const kickPulse = Math.pow(Math.max(0, Math.sin(beatTime * Math.PI)), 4);
      const snarePulse = Math.pow(Math.max(0, Math.sin((beatTime - 0.5) * Math.PI)), 6);
      const hihatPulse = Math.pow(Math.max(0, Math.sin(beatTime * 4 * Math.PI)), 2);
      const subRumble = Math.sin(elapsed * 4.5) * 0.5 + 0.5;

      bars.forEach((bar, i) => {
        const normIdx = i / (barCount - 1);

        if (isPlaying) {
          if (hasRealFft && dataArrayRef.current) {
            // Map real FFT frequency bin to bar
            const binIdx = Math.floor(normIdx * (dataArrayRef.current.length - 1));
            const rawVal = dataArrayRef.current[binIdx] / 255;
            bar.target = Math.max(3, rawVal * maxHeight);
          } else {
            // Rhythm Simulation
            let energy = 0;
            if (normIdx < 0.25) {
              // Sub & Bass: Reacts heavily to Kick pulse & sub rumble
              energy = kickPulse * 0.75 + subRumble * 0.2 + (Math.random() * 0.15);
            } else if (normIdx < 0.65) {
              // Mids & Vocals: Reacts to Snare & melody waves
              const melodyWave = Math.sin(elapsed * 7.2 + bar.freqOffset) * 0.4 + 0.6;
              energy = snarePulse * 0.55 + melodyWave * 0.35 + (Math.random() * 0.12);
            } else {
              // Treble & Highs: Reacts to Hi-hats & fast sparkle
              const highHarmonic = Math.cos(elapsed * 12.5 + bar.freqOffset * 2) * 0.3 + 0.7;
              energy = hihatPulse * 0.6 + highHarmonic * 0.25 + (Math.random() * 0.18);
            }

            // Apply slight arch curve so center/bass pop nicely
            const curve = 1 - Math.pow((normIdx - 0.45) * 1.4, 2) * 0.35;
            const finalAmp = Math.min(1, Math.max(0.08, energy * curve));
            bar.target = Math.max(3, finalAmp * maxHeight);
          }
        } else {
          bar.target = 3;
        }

        // Snappy attack & smooth exponential decay physics
        if (bar.target > bar.current) {
          bar.current += (bar.target - bar.current) * 0.45; // Fast attack
        } else {
          bar.current += (bar.target - bar.current) * bar.decaySpeed; // Smooth gravity drop
        }

        // Peak Hold Physics
        if (showPeaks) {
          if (bar.current >= bar.peak) {
            bar.peak = bar.current;
            bar.peakHold = 12; // Hold frames
          } else {
            if (bar.peakHold > 0) {
              bar.peakHold--;
            } else {
              bar.peak = Math.max(bar.current, bar.peak - 1.2);
            }
          }
        }

        const x = i * (barWidth + 2);
        const y = canvas.height - bar.current;

        // Theme-based dynamic gradients
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (theme === "emerald") {
          gradient.addColorStop(0, "rgba(5, 150, 105, 0.4)");
          gradient.addColorStop(0.5, "#10b981");
          gradient.addColorStop(1, "#6ee7b7");
        } else if (theme === "rose") {
          gradient.addColorStop(0, "rgba(225, 29, 72, 0.4)");
          gradient.addColorStop(0.5, "#f43f5e");
          gradient.addColorStop(1, "#fda4af");
        } else if (theme === "cyan") {
          gradient.addColorStop(0, "rgba(8, 145, 178, 0.4)");
          gradient.addColorStop(0.5, "#06b6d4");
          gradient.addColorStop(1, "#67e8f9");
        } else {
          gradient.addColorStop(0, "rgba(147, 51, 234, 0.4)");
          gradient.addColorStop(0.5, "#a855f7");
          gradient.addColorStop(1, "#d8b4fe");
        }

        // Draw main frequency bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(2, bar.current), [2, 2, 0, 0]);
        ctx.fill();

        // Draw floating peak cap dot
        if (showPeaks && bar.peak > 4) {
          const peakY = Math.max(0, canvas.height - bar.peak - 2);
          ctx.fillStyle = theme === "rose" ? "#ffe4e6" : theme === "emerald" ? "#d1fae5" : "#e0f2fe";
          ctx.beginPath();
          ctx.roundRect(x, peakY, barWidth, 1.5, [1, 1, 1, 1]);
          ctx.fill();
        }
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, barCount, height, theme, showPeaks]);

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-900/80 px-2 py-1 border border-white/10 shadow-inner">
      <canvas
        ref={canvasRef}
        width={barCount * 6}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};
