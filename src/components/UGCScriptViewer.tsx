import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Play,
  Share2,
  Download,
  Flame,
  Volume2,
  Tv,
  ArrowRight,
  Eye,
  AlertTriangle,
  Lightbulb,
  ShoppingBag,
  Hash,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UGCScriptResult } from '../types';

interface UGCScriptViewerProps {
  script: UGCScriptResult;
  onOpenTeleprompter: () => void;
  onPlayAudio: () => void;
  onGenerateAlternativeHooks?: () => void;
  isGeneratingHooks?: boolean;
  previewImage?: string | null;
  onGeneratePreview?: () => void;
  isGeneratingPreview?: boolean;
}

export const UGCScriptViewer: React.FC<UGCScriptViewerProps> = ({
  script,
  onOpenTeleprompter,
  onPlayAudio,
  onGenerateAlternativeHooks,
  isGeneratingHooks = false,
  previewImage = null,
  onGeneratePreview,
  isGeneratingPreview = false,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'script' | 'storyboard' | 'caption'>('script');
  const [viewMode, setViewMode] = useState<'simple' | 'full'>('simple');

  const copyToClipboard = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'tiktok':
        return { name: 'TikTok (Keranjang Kuning)', bg: 'bg-black text-white' };
      case 'reels':
        return { name: 'Instagram Reels', bg: 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' };
      case 'shorts':
        return { name: 'YouTube Shorts', bg: 'bg-red-600 text-white' };
      default:
        return { name: 'Shopee Video', bg: 'bg-orange-600 text-white' };
    }
  };

  const platformBadge = getPlatformBadge(script.platform);

  return (
    <div
      id="ugc-script-viewer"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold shadow-xs ${platformBadge.bg}`}>
              {platformBadge.name}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {script.hookStyle.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(script.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {script.title || 'UGC High-Converting Video Ad Script'}
          </h2>
        </div>

        {/* Quick Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-voiceover-preview"
            type="button"
            onClick={onPlayAudio}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Volume2 className="h-4 w-4 text-indigo-500" /> Preview Suara (TTS)
          </button>
          <button
            id="btn-open-teleprompter"
            type="button"
            onClick={onOpenTeleprompter}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Tv className="h-4 w-4" /> Buka Teleprompter
          </button>
          <button
            id="btn-copy-full-script"
            type="button"
            onClick={() =>
              copyToClipboard(
                `JUDUL: ${script.title}\n\n1. ANALISIS VISUAL:\n${JSON.stringify(
                  script.analisisVisual,
                  null,
                  2
                )}\n\n2. HOOK (0-3 DETIK):\nVisual: ${script.hook.visualAction}\nBicara: "${
                  script.hook.openingLine
                }"\n\n3. PROBLEM:\nVisual: ${script.problem.visualAction}\nBicara: "${
                  script.problem.spokenLine
                }"\n\n4. SOLUTION & DEMO:\nVisual: ${script.solution.introductionAction}\nBicara: ${
                  script.solution.demonstrationSteps.map((s) => s.dialogue).join(' ')
                }\n\n5. CTA:\nVisual: ${script.cta.closingAction}\nBicara: "${
                  script.cta.spokenLine
                }"\n\n6. CAPTION & HASHTAGS:\n${script.caption.fullCaptionReadyToPost}`,
                'full'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {copiedSection === 'full' ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" /> Tersalin!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Salin Lengkap
              </>
            )}
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setViewMode('simple')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            viewMode === 'simple'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Ringkas
        </button>
        <button
          type="button"
          onClick={() => setViewMode('full')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            viewMode === 'full'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Lengkap
        </button>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
          {viewMode === 'simple' ? 'Tampilan untuk pemula' : 'Semua detail & analisis'}
        </span>
      </div>

      {/* View Mode Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'script'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" /> 6 Format Utama UGC
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('storyboard')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'storyboard'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" /> Storyboard Timeline ({script.storyboard?.length || 4} Shots)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('caption')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'caption'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Hash className="h-4 w-4" /> Caption & Hashtags Siap Post
        </button>
      </div>

      {/* TAB 1: Simple View (Ringkas) */}
      {activeTab === 'script' && viewMode === 'simple' && (
        <div className="space-y-5">
          {/* Preview Image (if generated) */}
          {previewImage && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-indigo-950 dark:bg-indigo-950/20">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                🎨 Preview Gambar Talent + Produk
              </span>
              <img
                src={previewImage}
                alt="Preview Talent + Produk"
                className="mt-2 rounded-lg max-h-64 w-full object-cover"
              />
            </div>
          )}

          {/* Generate Preview Button */}
          {onGeneratePreview && !previewImage && (
            <button
              type="button"
              onClick={onGeneratePreview}
              disabled={isGeneratingPreview}
              className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 p-4 text-sm text-indigo-600 hover:bg-indigo-50 transition disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400"
            >
              {isGeneratingPreview ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  Membuat preview gambar...
                </span>
              ) : (
                '✨ Buat Preview Gambar Talent + Produk'
              )}
            </button>
          )}

          {/* HOOK - Apa yang dikatakan di 3 detik pertama */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Flame className="h-4 w-4" /> HOOK (0-3 Detik)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(`Hook: ${script.hook.openingLine}\nTeks Layar: ${script.hook.screenText}`, 'hook-simple')}
                className="text-[11px] text-amber-700 hover:text-amber-800 dark:text-amber-300"
              >
                {copiedSection === 'hook-simple' ? '✓ Tersalin' : 'Salin'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Dialog:</span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  "{script.hook.openingLine}"
                </p>
              </div>
              {script.hook.screenText && (
                <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-yellow-300 dark:bg-black">
                  📱 Teks di Layar: {script.hook.screenText}
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Aksi Visual:</span>
                <p className="text-xs text-slate-700 dark:text-slate-300">{script.hook.visualAction}</p>
              </div>
            </div>
          </div>

          {/* FULL SCRIPT - Spoken Script siap baca */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Volume2 className="h-4 w-4" /> SCRIPT LENGKAP (Siap Baca)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPlayAudio}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300"
                >
                  <Volume2 className="h-3 w-3" /> Audio
                </button>
                <button
                  type="button"
                  onClick={onOpenTeleprompter}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  <Tv className="h-3 w-3" /> Teleprompter
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(script.fullSpokenScript, 'full-script')}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                >
                  {copiedSection === 'full-script' ? '✓ Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-200">
              {script.fullSpokenScript}
            </div>
          </div>

          {/* CTA - Apa yang dilakukan talent di akhir */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/60 dark:bg-purple-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300">
                <ShoppingBag className="h-4 w-4" /> CTA / Penutup
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(`CTA: ${script.cta.spokenLine}\nTarget: ${script.cta.actionType}`, 'cta-simple')}
                className="text-[11px] text-purple-700 hover:text-purple-800 dark:text-purple-300"
              >
                {copiedSection === 'cta-simple' ? '✓ Tersalin' : 'Salin'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Dialog Penutup:</span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  "{script.cta.spokenLine}"
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  🎯 {script.cta.actionType}
                </span>
                {script.cta.onScreenSticker && (
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {script.cta.onScreenSticker}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CAPTION - Siap copy paste */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300">
                <Hash className="h-4 w-4" /> Caption Siap Post
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(script.caption.fullCaptionReadyToPost, 'caption-simple')}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-700"
              >
                {copiedSection === 'caption-simple' ? <><Check className="h-3 w-3" /> Tersalin</> : '📋 Salin Caption'}
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-800 whitespace-pre-wrap shadow-sm dark:bg-slate-900 dark:text-slate-200">
              {script.caption.fullCaptionReadyToPost}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {script.caption.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Full View (6 Sections) */}
      {activeTab === 'script' && viewMode === 'full' && (
        <div className="space-y-6">
          {/* SECTION 1: Analisis Visual */}
          <div
            id="section-1-analisis-visual"
            className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5 dark:border-indigo-950 dark:bg-indigo-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  1
                </span>
                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Analisis Visual: Talent & Produk
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `ANALISIS VISUAL:\nVibe Talent: ${script.analisisVisual.characterVibe}\nSelling Points Produk: ${script.analisisVisual.productCoreSellingPoints}\nStrategi Sinergi: ${script.analisisVisual.synergyStrategy}\nKesesuaian Audiens: ${script.analisisVisual.audienceMatch}`,
                    'analisis'
                  )
                }
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                {copiedSection === 'analisis' ? 'Tersalin' : 'Salin Analisis'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  👤 Vibe & Persona Talent
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {script.analisisVisual.characterVibe}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  📦 Core Selling Points Produk
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {script.analisisVisual.productCoreSellingPoints}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  ⚡ Sinergi & Alasan Konversi
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {script.analisisVisual.synergyStrategy}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  🎯 Target Demografi Audiens
                </span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {script.analisisVisual.audienceMatch}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Hook (0-3 detik) */}
          <div
            id="section-2-hook"
            className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                  2
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hook Pembuka ({script.hook.timeframe || '0-3 detik'})
                </h3>
                <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  <Flame className="h-3 w-3" /> Penentu Retensi 3 Detik Pertama
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `HOOK (0-3s):\nAksi Visual: ${script.hook.visualAction}\nDialog: "${script.hook.openingLine}"\nOn-screen Text: "${script.hook.screenText}"`,
                    'hook'
                  )
                }
                className="text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300"
              >
                {copiedSection === 'hook' ? 'Tersalin' : 'Salin Hook'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <Eye className="h-3.5 w-3.5 text-indigo-500" /> AKSI VISUAL PADA KAMERA
                </span>
                <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {script.hook.visualAction}
                </p>
                {script.hook.screenText && (
                  <div className="mt-2.5 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-yellow-300 shadow-2xs dark:bg-black">
                    Teks Overlay di Layar: <span className="font-bold">"{script.hook.screenText}"</span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <Volume2 className="h-3.5 w-3.5 text-amber-500" /> DIALOG / KALIMAT YANG DIUCAPKAN
                </span>
                <p className="mt-1 text-xs font-bold leading-relaxed text-indigo-950 dark:text-indigo-200">
                  "{script.hook.openingLine}"
                </p>
                {script.hook.audioTip && (
                  <p className="mt-2 text-[11px] text-slate-500 italic dark:text-slate-400">
                    🎵 Audio Cue: {script.hook.audioTip}
                  </p>
                )}
              </div>
            </div>

            {/* Alternative Hook variations */}
            {script.hook.alternativeHooks && script.hook.alternativeHooks.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-200/80 bg-white/70 p-3 dark:border-amber-900/40 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                  💡 Pilihan Alternatif Hook untuk A/B Testing:
                </span>
                <div className="mt-2 space-y-1.5">
                  {script.hook.alternativeHooks.map((alt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      <span className="italic">"{alt}"</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(alt, `alt-${idx}`)}
                        className="ml-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        {copiedSection === `alt-${idx}` ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Problem / Pain Point */}
          <div
            id="section-3-problem"
            className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-950 dark:bg-rose-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">
                  3
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Problem / Pain Point ({script.problem.timeframe || '0:03 - 0:10'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `PROBLEM:\nMasalah: ${script.problem.painPointDescription}\nVisual: ${script.problem.visualAction}\nBicara: "${script.problem.spokenLine}"`,
                    'problem'
                  )
                }
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                {copiedSection === 'problem' ? 'Tersalin' : 'Salin Problem'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" /> EMOSI & AKSI FRUSTRASI DI LAYAR
                </span>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{script.problem.visualAction}</p>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Isu Inti: {script.problem.painPointDescription}
                </p>
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  DIALOG PENGAKUAN RELATABLE
                </span>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                  "{script.problem.spokenLine}"
                </p>
                {script.problem.onScreenText && (
                  <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                    Stiker Teks: <span className="font-semibold">{script.problem.onScreenText}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Solution & Demonstration */}
          <div
            id="section-4-solution"
            className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-950 dark:bg-emerald-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  4
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Solution & Demonstration ({script.solution.timeframe || '0:10 - 0:25'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `SOLUSI & DEMO:\nIntro: ${script.solution.introductionAction}\nLangkah Demo:\n${script.solution.demonstrationSteps
                      .map((d) => `Step ${d.step}: ${d.action} -> "${d.dialogue}" (B-roll: ${d.brollSuggestion})`)
                      .join('\n')}\nHighlight: ${script.solution.keyBenefitHighlight}`,
                    'solution'
                  )
                }
                className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                {copiedSection === 'solution' ? 'Tersalin' : 'Salin Solusi'}
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-800 shadow-2xs dark:bg-slate-800/90 dark:text-slate-200">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                Cara Masuk Produk ke Frame:
              </span>{' '}
              {script.solution.introductionAction}
            </div>

            {/* Demonstration Step Cards */}
            <div className="mt-3 space-y-2.5">
              {script.solution.demonstrationSteps.map((step) => (
                <div
                  key={step.step}
                  className="flex flex-col gap-2 rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90 sm:flex-row sm:items-start"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {step.action}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        B-Roll: {step.brollSuggestion}
                      </span>
                    </div>
                    <p className="mt-1 text-xs italic text-indigo-950 dark:text-indigo-200">
                      "{step.dialogue}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-lg bg-emerald-100/70 p-3 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
              ✨ Benefit Utama Terbukti: {script.solution.keyBenefitHighlight}
            </div>
          </div>

          {/* SECTION 5: Call to Action (CTA) */}
          <div
            id="section-5-cta"
            className="rounded-xl border border-purple-200 bg-purple-50/40 p-5 dark:border-purple-950 dark:bg-purple-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                  5
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Call to Action (CTA) ({script.cta.timeframe || '0:25 - 0:30'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    `CTA:\nAksi Penutup: ${script.cta.closingAction}\nDialog: "${script.cta.spokenLine}"\nTipe: ${script.cta.actionType}`,
                    'cta'
                  )
                }
                className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                {copiedSection === 'cta' ? 'Tersalin' : 'Salin CTA'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                  <ShoppingBag className="h-3.5 w-3.5" /> GESTUR & ARAHAN KLIK
                </span>
                <p className="mt-1 text-xs text-slate-800 dark:text-slate-200">{script.cta.closingAction}</p>
                <div className="mt-2 inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Target: {script.cta.actionType}
                </div>
              </div>

              <div className="rounded-lg bg-white p-3.5 shadow-2xs dark:bg-slate-800/90">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  PUNCHLINE PENUTUP / FOMO
                </span>
                <p className="mt-1 text-xs font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                  "{script.cta.spokenLine}"
                </p>
                {script.cta.onScreenSticker && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Stiker/Banner: {script.cta.onScreenSticker}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 6: Social Media Caption & Hashtags Preview Card */}
          <div
            id="section-6-caption"
            className="rounded-xl border border-sky-200 bg-sky-50/40 p-5 dark:border-sky-950 dark:bg-sky-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                  6
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Social Media Caption & Hashtags
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(script.caption.fullCaptionReadyToPost, 'caption')}
                className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-sky-700"
              >
                {copiedSection === 'caption' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSection === 'caption' ? 'Caption Tersalin!' : 'Salin Caption Siap Post'}
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-white p-4 font-mono text-xs text-slate-800 shadow-2xs whitespace-pre-wrap dark:bg-slate-950 dark:text-slate-200">
              {script.caption.fullCaptionReadyToPost}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {script.caption.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-sky-700 shadow-2xs dark:bg-slate-800 dark:text-sky-300"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>

          {/* Director Filming Tips */}
          {script.directorTips && script.directorTips.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Tips Sutradara Saat Take Video:
              </span>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {script.directorTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Storyboard Timeline View */}
      {activeTab === 'storyboard' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Panduan take video per shot kamera dengan instruksi visual, dialog, dan teks overlay.
            </p>
            <button
              type="button"
              onClick={() =>
                copyToClipboard(
                  script.storyboard
                    .map(
                      (s) =>
                        `SHOT ${s.shotNumber} (${s.timeframe} - ${s.shotType}):\nVisual: ${s.visualDirection}\nDialog: "${s.spokenDialogue}"\nTeks: ${s.textOverlay}\nAudio: ${s.sfxOrMusicTip}`
                    )
                    .join('\n\n'),
                  'storyboard'
                )
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              {copiedSection === 'storyboard' ? 'Tersalin' : 'Salin Semua Shot'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {script.storyboard.map((shot) => (
              <div
                key={shot.shotNumber}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 shadow-2xs transition-all hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950/70"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      Shot #{shot.shotNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {shot.timeframe}
                      </span>
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {shot.shotType}
                      </span>
                    </div>
                  </div>

                  {/* Visual direction */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      Aksi Visual Kamera
                    </span>
                    <p className="mt-0.5 text-xs text-slate-800 dark:text-slate-200">{shot.visualDirection}</p>
                  </div>

                  {/* Dialogue */}
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold tracking-wide text-indigo-500 uppercase">
                      Dialog / Voiceover
                    </span>
                    <p className="mt-0.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                      "{shot.spokenDialogue}"
                    </p>
                  </div>
                </div>

                {/* Overlays and SFX footer */}
                <div className="mt-3 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Teks Overlay:</span>{' '}
                    {shot.textOverlay || '-'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Audio/SFX:</span>{' '}
                    {shot.sfxOrMusicTip || '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Caption & Hashtags Detailed Post View */}
      {activeTab === 'caption' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Format Teks Caption Siap Publikasi
              </h4>
              <button
                type="button"
                onClick={() => copyToClipboard(script.caption.fullCaptionReadyToPost, 'caption-full')}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700"
              >
                {copiedSection === 'caption-full' ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Salin Lengkap
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 font-sans text-xs leading-relaxed text-slate-800 shadow-2xs whitespace-pre-wrap dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {script.caption.fullCaptionReadyToPost}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hook Line</span>
                <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {script.caption.hookLine}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Body Story</span>
                <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {script.caption.bodyText}
                </p>
              </div>
              <div className="rounded-lg bg-white p-3 shadow-2xs dark:bg-slate-900">
                <span className="text-[10px] font-bold text-slate-400 uppercase">CTA & Trigger</span>
                <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {script.caption.ctaLine}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
