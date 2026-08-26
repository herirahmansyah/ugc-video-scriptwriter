import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Type, FastForward, FlipHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { UGCScriptResult } from '../types';

interface TeleprompterModalProps {
  script: UGCScriptResult;
  onClose: () => void;
}

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({ script, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // 1 to 10
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('xl');
  const [isMirrored, setIsMirrored] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<any>(null);

  // Generate clean teleprompter lines from storyboard or full script
  const scriptContent = script.fullSpokenScript || 
    `${script.hook.openingLine}\n\n${script.problem.spokenLine}\n\n${script.solution.demonstrationSteps.map(s => s.dialogue).join('\n\n')}\n\n${script.cta.spokenLine}`;

  // Start with 3-second countdown
  const triggerPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setCountdown(3);
    const countTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countTimer);
          setIsPlaying(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Scroll ticker effect
  useEffect(() => {
    if (isPlaying && containerRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += speed * 0.8;
          // Stop if reached bottom
          if (
            containerRef.current.scrollTop + containerRef.current.clientHeight >=
            containerRef.current.scrollHeight - 10
          ) {
            setIsPlaying(false);
          }
        }
      }, 30);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    }

    return () => {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [isPlaying, speed]);

  const resetScroll = () => {
    setIsPlaying(false);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-lg leading-relaxed';
      case 'md':
        return 'text-2xl leading-relaxed';
      case 'lg':
        return 'text-3xl leading-relaxed';
      case 'xl':
        return 'text-4xl leading-loose';
      case '2xl':
        return 'text-5xl leading-loose';
    }
  };

  return (
    <div
      id="teleprompter-modal"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      {/* Top Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-black/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
            Teleprompter Mode
          </span>
          <h3 className="line-clamp-1 max-w-xs text-sm font-bold text-white/90 sm:max-w-md">
            {script.title}
          </h3>
        </div>

        {/* Center Playback Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetScroll}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            title="Reset ke Awal"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={triggerPlay}
            className={`flex h-11 items-center gap-2 rounded-full px-5 font-bold shadow-lg transition ${
              isPlaying
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5" /> Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current" /> Start Scroll
              </>
            )}
          </button>

          {/* Speed slider */}
          <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 sm:flex">
            <FastForward className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-white/80">Speed {speed}x</span>
            <input
              type="range"
              min="1"
              max="6"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="h-1.5 w-20 cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Font Size Selector */}
          <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 sm:flex">
            {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setFontSize(size)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold transition ${
                  fontSize === size ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Mirror Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition ${
              isMirrored ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title="Mirror Horizontal (untuk rekaman kaca/front-cam)"
          >
            <FlipHorizontal className="h-4 w-4" /> Mirror
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-red-600 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-9xl font-black text-indigo-400 drop-shadow-2xl">{countdown}</span>
            <span className="mt-2 text-2xl font-bold uppercase tracking-widest text-white/80">
              Get Ready to Action!
            </span>
          </div>
        </div>
      )}

      {/* Focus Eye-Level Guide Marker */}
      <div className="pointer-events-none absolute top-1/3 left-0 right-0 z-20 flex items-center justify-between border-y border-indigo-500/30 bg-indigo-500/5 px-4 py-3">
        <span className="rounded bg-indigo-600/80 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
          Eye-Level Guide
        </span>
        <span className="text-[10px] text-indigo-300/70">Tatap kamera pada area ini</span>
      </div>

      {/* Scrolling Script Text Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto px-8 pt-32 pb-64 text-center transition-all ${
          isMirrored ? '-scale-x-100' : ''
        }`}
      >
        <div className="mx-auto max-w-3xl">
          <div className={`font-semibold tracking-wide text-white/95 ${getFontSizeClass()}`}>
            {/* Split by paragraphs and highlight key phrases */}
            {scriptContent.split('\n').map((line, idx) => {
              if (!line.trim()) return <div key={idx} className="h-8" />;
              return (
                <p key={idx} className="my-4 transition-colors hover:text-yellow-300">
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
