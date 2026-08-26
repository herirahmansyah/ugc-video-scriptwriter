import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Upload,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  AlertCircle,
  Film,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  Maximize2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { GeneratedVideoItem } from '../types';
import { CHARACTER_PRESETS, PRODUCT_PRESETS } from '../data/presets';
import { urlToBase64 } from '../utils/imageHelper';

interface VeoVideoAnimatorProps {
  initialImage?: {
    data: string;
    mimeType: string;
    previewUrl: string;
    name?: string;
  } | null;
  onSendToUgc?: (image: { data: string; mimeType: string; previewUrl: string; name?: string }, role: 'character' | 'product') => void;
}

const MOTION_PRESETS = [
  {
    id: 'creator_talk',
    label: '✨ Creator Speaking & Smiling',
    prompt: 'A natural, photorealistic video of the creator smiling warmly, speaking with natural subtle head movements and authentic eye contact in a bright studio.',
    aspectRatio: '9:16' as const,
  },
  {
    id: 'product_showcase',
    label: '🛍️ Dynamic Product Showcase',
    prompt: 'Smooth cinematic camera movement revealing the product packaging, with luxury studio lighting reflections and high-end commercial aesthetic.',
    aspectRatio: '9:16' as const,
  },
  {
    id: 'unboxing_action',
    label: '📦 Unboxing & First Impression',
    prompt: 'Fast-paced enthusiastic creator unboxing motion, bringing the product close to the camera with excitement and vibrant bokeh.',
    aspectRatio: '9:16' as const,
  },
  {
    id: 'landscape_cinematic',
    label: '🎬 Cinematic 16:9 Commercial',
    prompt: 'Wide cinematic camera slow tracking shot with dynamic atmospheric lighting, sharp focus, and polished advertising production quality.',
    aspectRatio: '16:9' as const,
  },
];

export function VeoVideoAnimator({ initialImage, onSendToUgc }: VeoVideoAnimatorProps) {
  const [sourceImage, setSourceImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
    name?: string;
  } | null>(initialImage || null);

  const [prompt, setPrompt] = useState<string>(
    'Animate this photo into an engaging, high-converting social media UGC video clip with natural movements and bright studio lighting.'
  );
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completed video
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideoItem | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // History list
  const [videoHistory, setVideoHistory] = useState<GeneratedVideoItem[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingTimerRef = useRef<any>(null);

  // Sync initialImage if provided
  useEffect(() => {
    if (initialImage && !sourceImage) {
      setSourceImage(initialImage);
    }
  }, [initialImage]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.split(',')[1];
      setSourceImage({
        data: base64Clean,
        mimeType: file.type,
        previewUrl: result,
        name: file.name,
      });
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (preset: typeof CHARACTER_PRESETS[0]) => {
    try {
      setErrorMessage(null);
      const b64 = await urlToBase64(preset.imageUrl);
      setSourceImage({
        data: b64.data,
        mimeType: b64.mimeType,
        previewUrl: preset.imageUrl,
        name: preset.name,
      });
    } catch {
      setErrorMessage('Gagal memuat preset gambar.');
    }
  };

  // Poll video status until done, then download
  const pollAndFetchVideo = (operationName: string, promptUsed: string, ratio: '9:16' | '16:9') => {
    let attempts = 0;
    const maxAttempts = 75; // ~2.5 minutes with 2s intervals

    const steps = [
      'Menghubungkan ke Veo 3.1 Fast Video Engine...',
      'Menganalisis pose objek & kedalaman visual...',
      'Merender frame video fotorealistik...',
      'Menghaluskan transisi fisik & pencahayaan...',
      'Finalisasi encoding MP4 format ' + (ratio === '9:16' ? '9:16 Portrait' : '16:9 Landscape') + '...',
    ];

    pollingTimerRef.current = setInterval(async () => {
      attempts++;
      const stepIndex = Math.min(Math.floor((attempts / 15) * steps.length), steps.length - 1);
      setProgressStep(steps[stepIndex]);
      setProgressPercent(Math.min(94, Math.round((attempts / 30) * 100)));

      try {
        const res = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        if (!res.ok) {
          throw new Error('Gagal memeriksa status video');
        }

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error.message || 'Proses pembuatan video gagal.');
        }

        if (data.done) {
          clearInterval(pollingTimerRef.current);
          setProgressPercent(98);
          setProgressStep('Mengunduh stream video MP4...');

          // Download video stream from proxy
          const downloadRes = await fetch('/api/video-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName }),
          });

          if (!downloadRes.ok) {
            throw new Error('Gagal mengunduh file video');
          }

          const blob = await downloadRes.blob();
          const objectUrl = URL.createObjectURL(blob);

          const newVideoItem: GeneratedVideoItem = {
            id: 'video_' + Date.now(),
            operationName,
            videoUrl: objectUrl,
            prompt: promptUsed,
            aspectRatio: ratio,
            status: 'completed',
            timestamp: Date.now(),
          };

          setVideoBlobUrl(objectUrl);
          setCurrentVideo(newVideoItem);
          setVideoHistory((prev) => [newVideoItem, ...prev]);
          setIsGenerating(false);
          setProgressPercent(100);
          setProgressStep('Video berhasil dibuat!');
        } else if (attempts >= maxAttempts) {
          throw new Error('Waktu tunggu pembuatan video habis. Silakan coba lagi.');
        }
      } catch (err: any) {
        clearInterval(pollingTimerRef.current);
        setIsGenerating(false);
        setErrorMessage(err.message || 'Terjadi kesalahan saat memproses video Veo.');
      }
    }, 2500);
  };

  const handleStartGeneration = async () => {
    if (!sourceImage) {
      setErrorMessage('Harap unggah atau pilih foto terlebih dahulu.');
      return;
    }

    if (!prompt.trim()) {
      setErrorMessage('Harap masukkan deskripsi / prompt gerakan video.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setProgressPercent(10);
    setProgressStep('Mengirim request ke Veo (veo-3.1-fast-generate-preview)...');

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: {
            data: sourceImage.data,
            mimeType: sourceImage.mimeType,
          },
          prompt: prompt.trim(),
          aspectRatio,
          resolution,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal memulai pembuatan video');
      }

      const { operationName } = await response.json();
      if (!operationName) {
        throw new Error('Format respon server tidak valid.');
      }

      // Start polling status
      pollAndFetchVideo(operationName, prompt, aspectRatio);
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMessage(err.message || 'Gagal terhubung ke API Veo Video.');
    }
  };

  const handleDownloadMp4 = () => {
    if (!videoBlobUrl) return;
    const a = document.createElement('a');
    a.href = videoBlobUrl;
    a.download = `veo-video-${aspectRatio.replace(':', '-')}-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Feature Header Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-white p-5 dark:border-indigo-950 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600/10 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                <Video className="h-3.5 w-3.5" /> Veo Video Generation
              </span>
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                veo-3.1-fast-generate-preview
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Animate Images into Video
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-slate-600 dark:text-slate-400">
              Unggah foto produk atau talent apa pun, pilih orientasi <strong className="text-slate-800 dark:text-slate-200">16:9 (Landscape)</strong> atau <strong className="text-slate-800 dark:text-slate-200">9:16 (Portrait TikTok/Reels)</strong>, dan saksikan AI Veo mengubahnya menjadi klip video gerak realistis.
            </p>
          </div>
        </div>
      </div>

      {/* Error Message Box */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-bold">Perhatian:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Image Input & Motion Controls (5 cols) */}
        <div className="space-y-5 lg:col-span-5">
          {/* 1. Photo Input Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Pilih Foto Sumber
              </h3>
              {sourceImage && (
                <button
                  type="button"
                  onClick={() => setSourceImage(null)}
                  className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Ganti Foto
                </button>
              )}
            </div>

            {sourceImage ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                <img
                  src={sourceImage.previewUrl}
                  alt="Source for animation"
                  className="h-56 w-full object-contain"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                  <p className="text-xs font-semibold truncate">{sourceImage.name || 'Foto Siap Dianimasikan'}</p>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 group-hover:scale-110 transition dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  Klik atau Tarik Foto ke Sini
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Mendukung JPG, PNG, WEBP untuk dianimasikan oleh Veo
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Quick Sample Presets */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Atau pilih contoh foto cepat:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[...CHARACTER_PRESETS.slice(0, 3), ...PRODUCT_PRESETS.slice(0, 2)].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <img src={p.imageUrl} alt={p.name} className="h-5 w-5 rounded object-cover" />
                    <span className="truncate max-w-[90px]">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Aspect Ratio & Motion Prompt */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Pengaturan Format & Gerakan
            </h3>

            {/* Aspect Ratio Selector */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Rasio Aspek Video (Wajib: 16:9 atau 9:16)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    aspectRatio === '9:16'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                  }`}
                >
                  <div className="flex h-5 w-3.5 items-center justify-center rounded-xs border-2 border-current text-[8px]">
                    9:16
                  </div>
                  <span>9:16 (TikTok/Reels)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    aspectRatio === '16:9'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                  }`}
                >
                  <div className="flex h-3.5 w-5 items-center justify-center rounded-xs border-2 border-current text-[8px]">
                    16:9
                  </div>
                  <span>16:9 (Landscape)</span>
                </button>
              </div>
            </div>

            {/* Motion Presets Chips */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Preset Gaya Gerakan Cepat
              </label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {MOTION_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setAspectRatio(item.aspectRatio);
                    }}
                    className="text-left rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Textarea */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Deskripsi Arah Gerakan (Motion Prompt)
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: Model menggerakkan tangan memperlihatkan kemasan produk, tersenyum alami dengan pencahayaan studio lembut..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* Generate Action Button */}
            <button
              id="btn-animate-veo"
              type="button"
              onClick={handleStartGeneration}
              disabled={isGenerating || !sourceImage}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sedang Membuat Video Veo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Animasikan Foto Jadi Video (Veo)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Video Player & Output Results (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Hasil Video Preview
                </h3>
              </div>
              {currentVideo && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ✓ Siap Ditonton / Unduh
                </span>
              )}
            </div>

            {/* Loading / Generating State Card */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-8 text-center dark:border-indigo-950 dark:from-indigo-950/30 dark:to-slate-900">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <Video className="h-7 w-7 text-indigo-600" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Veo sedang menghasilkan video...
                </h4>
                <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                  {progressStep}
                </p>

                {/* Progress Bar */}
                <div className="mt-4 w-full max-w-sm overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Estimasi 10-30 detik • Model: veo-3.1-fast-generate-preview
                </p>
              </div>
            )}

            {/* Video Player Display */}
            {!isGenerating && videoBlobUrl && (
              <div className="space-y-4">
                <div
                  className={`relative mx-auto overflow-hidden rounded-2xl bg-black shadow-lg ${
                    aspectRatio === '9:16' ? 'max-w-[280px] aspect-[9/16]' : 'w-full aspect-[16/9]'
                  }`}
                >
                  <video
                    ref={videoRef}
                    src={videoBlobUrl}
                    controls
                    autoPlay
                    loop={isLooping}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadMp4}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700"
                    >
                      <Download className="h-4 w-4" />
                      <span>Unduh Video (.MP4)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsLooping(!isLooping)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        isLooping
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Loop: {isLooping ? 'On' : 'Off'}</span>
                    </button>
                  </div>

                  {/* Send Source Image to UGC options */}
                  {onSendToUgc && sourceImage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSendToUgc(sourceImage, 'character')}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Pakai sebagai Talent UGC
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendToUgc(sourceImage, 'product')}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                      >
                        Pakai sebagai Produk UGC
                      </button>
                    </div>
                  )}
                </div>

                {/* Prompt Card */}
                {currentVideo && (
                  <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Prompt yang digunakan:</span>{' '}
                    {currentVideo.prompt}
                  </div>
                )}
              </div>
            )}

            {/* Empty Placeholder State */}
            {!isGenerating && !videoBlobUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <Film className="h-7 w-7" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Video yang Dibuat
                </h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Unggah atau pilih foto di panel kiri, pilih aspek rasio 16:9 atau 9:16, lalu klik tombol animasikan untuk membuat video Veo.
                </p>
              </div>
            )}
          </div>

          {/* History List */}
          {videoHistory.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Riwayat Video Sesi Ini ({videoHistory.length})
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {videoHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.videoUrl) {
                        setVideoBlobUrl(item.videoUrl);
                        setCurrentVideo(item);
                        setAspectRatio(item.aspectRatio);
                      }
                    }}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="relative aspect-video rounded-lg bg-black flex items-center justify-center overflow-hidden">
                      <Play className="h-6 w-6 text-white/80 group-hover:scale-125 transition" />
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                        {item.aspectRatio}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-slate-700 truncate dark:text-slate-300">
                      {item.prompt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
