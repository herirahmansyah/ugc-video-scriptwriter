import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, Square, X, Gauge, RefreshCw } from 'lucide-react';
import { UGCScriptResult } from '../types';

interface AudioVoiceoverPlayerProps {
  script: UGCScriptResult;
  onClose: () => void;
}

export const AudioVoiceoverPlayer: React.FC<AudioVoiceoverPlayerProps> = ({ script, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0); // 0.8 to 1.5
  const [pitch, setPitch] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  const fullTextToRead = script.fullSpokenScript || 
    `${script.hook.openingLine}. ${script.problem.spokenLine}. ${script.solution.demonstrationSteps.map(s => s.dialogue).join('. ')}. ${script.cta.spokenLine}`;

  // Populate browser speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Try to match language code
        const isIndonesian = script.language.startsWith('id');
        const defaultVoice = isIndonesian
          ? voices.find((v) => v.lang.includes('id') || v.lang.includes('ID')) ||
            voices.find((v) => v.name.toLowerCase().includes('indonesia')) ||
            voices[0]
          : voices.find((v) => v.lang.includes('en-US')) || voices[0];

        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [script.language]);

  const togglePlay = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis tidak didukung di browser ini.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullTextToRead);
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voice = availableVoices.find((v) => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <div
      id="voiceover-player-bar"
      className="fixed bottom-4 left-1/2 z-50 w-11/12 max-w-2xl -translate-x-1/2 rounded-2xl border border-indigo-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-indigo-900/60 dark:bg-slate-900/95"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Audio Voiceover Preview (UGC Audio Flow)
            </h4>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            stopAudio();
            onClose();
          }}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* Play / Stop Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" /> Jeda Voiceover
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Putar Script
              </>
            )}
          </button>
          {isPlaying && (
            <button
              type="button"
              onClick={stopAudio}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              title="Stop"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          )}
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 pl-1">Kecepatan:</span>
          {[0.9, 1.0, 1.15, 1.3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRate(r);
                if (isPlaying) {
                  stopAudio();
                }
              }}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                rate === r
                  ? 'bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {r}x
            </button>
          ))}
        </div>

        {/* Voice selector */}
        {availableVoices.length > 0 && (
          <select
            value={selectedVoice}
            onChange={(e) => {
              setSelectedVoice(e.target.value);
              if (isPlaying) stopAudio();
            }}
            className="max-w-[140px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:max-w-xs"
          >
            {availableVoices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
