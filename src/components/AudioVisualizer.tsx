"use client";

import React, { useEffect, useRef } from "react";

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
  barCount = 18,
  height = 28,
  theme = "emerald",
  showPeaks = true,
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
        analyser.smoothingTimeConstant = 0.65;
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
      peak: number;
      peakHold: number;
      freqOffset: number;
      speed: number;
      bouncePhase: number;
    }

    const bars: BarState[] = Array.from({ length: barCount }, (_, i) => ({
      current: 2,
      target: 2,
      peak: 2,
      peakHold: 0,
      freqOffset: i * 0.38 + Math.random() * 0.2,
      speed: 0.25 + Math.random() * 0.2,
      bouncePhase: Math.random() * Math.PI * 2,
    }));

    let startTime = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      
      // Auto-fit high DPI canvas
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 96;
      const displayHeight = canvas.clientHeight || height;
      
      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const totalSpacing = (barCount - 1) * 2;
      const barWidth = Math.max(2.5, (displayWidth - totalSpacing) / barCount);
      const maxHeight = displayHeight - 4;

      // Check real FFT data if available
      let hasRealFft = false;
      if (analyserRef.current && dataArrayRef.current && isPlaying) {
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

      // Punchy Musical Rhythm & Beat Synthesizer (130 BPM sync)
      const beatFreq = 2.166; // 130 BPM
      const beatCycle = elapsed * beatFreq;
      
      // Heavy 4-on-the-floor kick drum (snappy exponential spike)
      const kickImpulse = Math.pow(Math.max(0, Math.sin(beatCycle * Math.PI)), 6);
      
      // Snare on 2nd and 4th beats
      const snareImpulse = Math.pow(Math.max(0, Math.sin((beatCycle - 0.5) * Math.PI)), 8);
      
      // 16th-note rapid hi-hats
      const hihatImpulse = Math.pow(Math.max(0, Math.sin(beatCycle * 4 * Math.PI)), 3);
      
      // Dynamic musical phrase energy (8-bar build-up and drops)
      const phraseEnergy = Math.sin(elapsed * 0.4) * 0.25 + 0.75;

      bars.forEach((bar, i) => {
        const norm = i / (barCount - 1); // 0 (bass) to 1 (treble)

        if (isPlaying) {
          if (hasRealFft && dataArrayRef.current) {
            const binIdx = Math.floor(norm * (dataArrayRef.current.length - 1));
            const raw = dataArrayRef.current[binIdx] / 255;
            bar.target = Math.max(2, Math.pow(raw, 1.2) * maxHeight);
          } else {
            // Highly dynamic, punchy rhythm simulation
            let amp = 0;
            if (norm < 0.3) {
              // Bass / Sub (Bars 0-5): Jumps dramatically with Kick & Sub Bass
              const subWobble = Math.sin(elapsed * 6 + bar.freqOffset) * 0.15;
              amp = (kickImpulse * 0.85 + subWobble + Math.random() * 0.1) * phraseEnergy;
            } else if (norm < 0.7) {
              // Mids / Vocals (Bars 6-12): Jumps with Snare & Melody
              const melodyPulse = Math.cos(elapsed * 8.5 + bar.freqOffset * 2) * 0.35 + 0.35;
              amp = (snareImpulse * 0.65 + melodyPulse * 0.4 + Math.random() * 0.15) * phraseEnergy;
            } else {
              // Treble / Sparkle (Bars 13-17): Rapid hi-hat flutter
              const sparkle = Math.sin(elapsed * 14 + bar.freqOffset * 3) * 0.25 + 0.25;
              amp = (hihatImpulse * 0.6 + sparkle * 0.3 + Math.random() * 0.2) * phraseEnergy;
            }

            // Non-linear punch curve (bass & peaks pop high, quiet drops to 2px)
            const punch = Math.pow(Math.min(1, Math.max(0, amp)), 1.3);
            bar.target = Math.max(2, punch * maxHeight);
          }
        } else {
          bar.target = 2;
        }

        // Snappy Attack & Spring Gravity Drop
        if (bar.target > bar.current) {
          bar.current += (bar.target - bar.current) * 0.65; // Ultra fast attack
        } else {
          bar.current += (bar.target - bar.current) * 0.28; // Snappy decay
        }

        // Floating Peak Cap Physics
        if (showPeaks) {
          if (bar.current >= bar.peak) {
            bar.peak = bar.current;
            bar.peakHold = 8;
          } else {
            if (bar.peakHold > 0) {
              bar.peakHold--;
            } else {
              bar.peak = Math.max(bar.current, bar.peak - 1.4);
            }
          }
        }

        const x = i * (barWidth + 2);
        const barHeight = Math.max(2, bar.current);
        const y = displayHeight - barHeight;

        // Vibrant Multi-Stop Gradient with Top Glow
        const gradient = ctx.createLinearGradient(0, displayHeight, 0, y);
        if (theme === "rose") {
          // Cyberpunk Crimson / Magenta / Sunset Gold
          gradient.addColorStop(0, "rgba(225, 29, 72, 0.4)");
          gradient.addColorStop(0.6, "#f43f5e");
          gradient.addColorStop(1, "#fb7185");
        } else if (theme === "emerald") {
          // Electric Emerald / Neon Mint
          gradient.addColorStop(0, "rgba(5, 150, 105, 0.4)");
          gradient.addColorStop(0.6, "#10b981");
          gradient.addColorStop(1, "#6ee7b7");
        } else if (theme === "cyan") {
          // Cyber Cyan / Sky Glow
          gradient.addColorStop(0, "rgba(8, 145, 178, 0.4)");
          gradient.addColorStop(0.6, "#06b6d4");
          gradient.addColorStop(1, "#38bdf8");
        } else {
          // Neon Violet / Purple
          gradient.addColorStop(0, "rgba(147, 51, 234, 0.4)");
          gradient.addColorStop(0.6, "#a855f7");
          gradient.addColorStop(1, "#f472b6");
        }

        // Render main rounded pill bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        // Render floating neon peak cap
        if (showPeaks && bar.peak > 4) {
          const peakY = Math.max(0, displayHeight - bar.peak - 2);
          ctx.fillStyle = theme === "rose" ? "#ffe4e6" : theme === "emerald" ? "#d1fae5" : "#e0f2fe";
          ctx.beginPath();
          ctx.roundRect(x, peakY, barWidth, 1.5, [1, 1, 1, 1]);
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
  }, [isPlaying, barCount, height, theme, showPeaks]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-slate-100/90 dark:bg-slate-900/90 px-2 py-1 border border-slate-200/80 dark:border-white/10 shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};
