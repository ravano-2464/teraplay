"use client";

import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElement?: HTMLMediaElement | HTMLVideoElement | null;
  currentTime?: number;
  volume?: number;
  barCount?: number;
  height?: number;
  theme?: "emerald" | "cyan" | "purple" | "rose";
  showPeaks?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  audioElement,
  currentTime = 0,
  volume = 1,
  barCount = 18,
  height = 28,
  theme = "emerald",
  showPeaks = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Attempt Web Audio API connection for HTML5 audio
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
        analyser.fftSize = 128;
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
          // Cross-origin fallback
        }
      }
    } catch {
      // Fallback smoothly
    }
  }, [audioElement, isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface BarState {
      current: number;
      target: number;
    }

    const bars: BarState[] = Array.from({ length: barCount }, () => ({
      current: 2.5,
      target: 2.5,
    }));

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const audioTime = currentTime > 0 ? currentTime : elapsed;
      const effVol = Math.max(0, Math.min(1, volume));

      // Auto-fit high DPI canvas for crisp vector rendering
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 110;
      const displayHeight = canvas.clientHeight || height;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const totalGap = (barCount - 1) * 2;
      const barWidth = Math.max(2.5, (displayWidth - totalGap) / barCount);
      const maxHeight = displayHeight - 4;

      // Check real Web Audio FFT data if available
      let hasRealFft = false;
      if (analyserRef.current && dataArrayRef.current && isPlaying && effVol > 0) {
        try {
          (analyserRef.current as any).getByteFrequencyData(dataArrayRef.current);
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          if (sum > 40) {
            hasRealFft = true;
          }
        } catch {}
      }

      // Buttery smooth Harmonic Audio Synthesizer (continuous wave harmonics without harsh thresholds)
      const beatFreq = 2.133; // 128 BPM
      const beatCycle = audioTime * beatFreq;

      // Exponential impulse envelopes for natural musical accents
      const kickImpulse = Math.pow(Math.max(0, Math.sin(beatCycle * Math.PI)), 4);
      const snareImpulse = Math.pow(Math.max(0, Math.sin((beatCycle - 0.5) * Math.PI)), 5);
      const hihatImpulse = Math.pow(Math.max(0, Math.sin(beatCycle * 4 * Math.PI)), 2);

      // 8-bar breathing phrase modulation
      const phraseMod = Math.sin(audioTime * 0.35) * 0.12 + 0.88;

      bars.forEach((bar, i) => {
        const norm = i / (barCount - 1); // Normalized position 0 (bass) to 1 (treble)

        if (isPlaying && effVol > 0) {
          if (hasRealFft && dataArrayRef.current) {
            const binIdx = Math.floor(norm * (dataArrayRef.current.length - 1));
            const raw = (dataArrayRef.current[binIdx] / 255) * effVol;
            bar.target = Math.max(2.5, Math.pow(raw, 1.2) * maxHeight);
          } else {
            // Overlapping continuous Gaussian curves across the entire spectrum
            const bassGaussian = Math.exp(-Math.pow((norm - 0.15) / 0.18, 2));
            const bassAmp = (kickImpulse * 0.9 + Math.sin(audioTime * 4.5 + norm * 3) * 0.15 + 0.12) * bassGaussian;

            const midGaussian = Math.exp(-Math.pow((norm - 0.5) / 0.25, 2));
            const melodyWave = Math.sin(audioTime * 5.2 - norm * 6.5) * 0.5 + 0.5;
            const midAmp = (snareImpulse * 0.7 + melodyWave * 0.35 + 0.1) * midGaussian;

            const trebleGaussian = Math.exp(-Math.pow((norm - 0.85) / 0.18, 2));
            const shimmer = Math.sin(audioTime * 11.2 + norm * 10) * 0.5 + 0.5;
            const trebleAmp = (hihatImpulse * 0.65 + shimmer * 0.35 + 0.08) * trebleGaussian;

            // Continuous fluid river ripple flowing smoothly across spectrum
            const fluidRiver = (Math.sin(audioTime * 3.2 - norm * 5.5) * 0.5 + 0.5) * 0.22;

            const combinedEnergy = (bassAmp * 1.05 + midAmp * 0.95 + trebleAmp * 0.9 + fluidRiver) * phraseMod;
            const power = Math.pow(Math.max(0, Math.min(1, combinedEnergy)), 1.15) * effVol;

            bar.target = Math.max(2.5, power * maxHeight);
          }
        } else {
          // Resting flat baseline
          bar.target = 2.5;
        }

        // Liquid smooth spring physics (snappy attack, soft velvet gravity decay)
        if (bar.target > bar.current) {
          bar.current += (bar.target - bar.current) * 0.38;
        } else {
          bar.current += (bar.target - bar.current) * 0.14;
        }

        const x = i * (barWidth + 2);
        const barHeight = Math.max(2.5, bar.current);
        const y = displayHeight - barHeight;

        // Rich Multi-stop Luminous Gradient with Top Glow
        const gradient = ctx.createLinearGradient(0, displayHeight, 0, y);
        let highlightColor = "#ffffff";

        if (theme === "rose") {
          // Cyberpunk Crimson / Magenta / Sunset Gold
          gradient.addColorStop(0, "rgba(225, 29, 72, 0.2)");
          gradient.addColorStop(0.55, "#f43f5e");
          gradient.addColorStop(1, "#fb7185");
          highlightColor = "rgba(255, 228, 230, 0.95)";
        } else if (theme === "emerald") {
          // Electric Emerald / Neon Mint
          gradient.addColorStop(0, "rgba(5, 150, 105, 0.2)");
          gradient.addColorStop(0.55, "#10b981");
          gradient.addColorStop(1, "#6ee7b7");
          highlightColor = "rgba(209, 250, 229, 0.95)";
        } else if (theme === "cyan") {
          // Cyber Cyan / Sky Glow
          gradient.addColorStop(0, "rgba(8, 145, 178, 0.2)");
          gradient.addColorStop(0.55, "#06b6d4");
          gradient.addColorStop(1, "#38bdf8");
          highlightColor = "rgba(224, 242, 254, 0.95)";
        } else {
          // Neon Violet / Purple
          gradient.addColorStop(0, "rgba(147, 51, 234, 0.2)");
          gradient.addColorStop(0.55, "#a855f7");
          gradient.addColorStop(1, "#f472b6");
          highlightColor = "rgba(250, 232, 255, 0.95)";
        }

        // Draw smooth rounded pill bar
        const barRadius = Math.min(barWidth / 2, 2.5);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [barRadius, barRadius, 1, 1]);
        ctx.fill();

        // Luminous top tip highlight for extra visual polish (blended seamlessly into the bar)
        if (isPlaying && effVol > 0 && barHeight > 5) {
          ctx.fillStyle = highlightColor;
          ctx.beginPath();
          ctx.roundRect(x + 0.5, y, barWidth - 1, Math.min(2, barHeight * 0.25), [barRadius, barRadius, 0, 0]);
          ctx.fill();
        }
      });

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, volume, barCount, height, theme, showPeaks]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-900/60 dark:bg-slate-950/80 px-2.5 py-1 border border-slate-200/40 dark:border-white/10 shadow-inner backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
