import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Wand2,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowRight,
  Sliders,
  Crop,
  Video,
} from 'lucide-react';
import { GeneratedImageItem } from '../types';
import { authFetch } from '../lib/api';
import { CHARACTER_PRESETS, PRODUCT_PRESETS } from '../data/presets';
import { urlToBase64 } from '../utils/imageHelper';

interface ImageStudioGeneratorProps {
  onUseAsTalent?: (image: { data: string; mimeType: string; previewUrl: string; name?: string }) => void;
  onUseAsProduct?: (image: { data: string; mimeType: string; previewUrl: string; name?: string }) => void;
  onSendToVeoAnimator?: (image: { data: string; mimeType: string; previewUrl: string; name?: string }) => void;
}

const STYLE_PRESETS = [
  {
    id: 'studio_portrait',
    title: '📸 Studio Creator Portrait',
    prompt: 'A photorealistic, highly authentic portrait of a friendly Indonesian UGC content creator holding up a beauty cosmetic product, warm studio softbox lighting, 8k sharp focus.',
    aspectRatio: '9:16',
  },
  {
    id: 'product_commercial',
    title: '✨ Luxury Product Shoot',
    prompt: 'A premium commercial advertisement photo of a sleek skincare bottle on a marble countertop with gentle morning sunlight, botanical leaves shadow, clean minimalist aesthetic.',
    aspectRatio: '1:1',
  },
  {
    id: 'aesthetic_kitchen',
    title: '🍳 Modern Kitchen Setting',
    prompt: 'A bright, clean modern Scandinavian kitchen countertop scene, beautiful natural ambient lighting, aesthetic breakfast lifestyle props.',
    aspectRatio: '16:9',
  },
  {
    id: 'unboxing_vibe',
    title: '📦 Unboxing Flatlay',
    prompt: 'Top-down aesthetic flatlay of a new trending lifestyle gadget, surrounded by pastel packaging, aesthetic stickers, and soft studio lighting.',
    aspectRatio: '4:3',
  },
];

const EDIT_PRESETS = [
  'Ubah latar belakang menjadi studio mewah bernuansa modern minimalis dengan pencahayaan warm',
  'Tambahkan pencahayaan neon aesthetic di bagian pinggir (rim lighting) bernuansa ungu dan cyan',
  'Perbaiki kualitas gambar menjadi jernih, tajam, dan tingkatkan kontras warna produk',
  'Tambahkan efek percikan air segar di sekitar produk untuk menonjolkan kesan hydrating & fresh',
  'Ubah ekspresi model menjadi tersenyum gembira sambil memegang produk di tangan',
];

export function ImageStudioGenerator({
  onUseAsTalent,
  onUseAsProduct,
  onSendToVeoAnimator,
}: ImageStudioGeneratorProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  // Input fields
  const [prompt, setPrompt] = useState<string>(
    'A photorealistic portrait of an enthusiastic young content creator holding a skincare serum, smiling with glowing skin in a bright studio.'
  );
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  // For Edit Mode: source image
  const [sourceImage, setSourceImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
    name?: string;
  } | null>(null);

  // States
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<GeneratedImageItem | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedImageItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file gambar (JPG, PNG, WEBP).');
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
      const b64 = await urlToBase64(preset.imageUrl);
      setSourceImage({
        data: b64.data,
        mimeType: b64.mimeType,
        previewUrl: preset.imageUrl,
        name: preset.name,
      });
      setErrorMessage(null);
    } catch {
      setErrorMessage('Gagal memuat preset gambar.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMessage('Harap masukkan deskripsi / instruksi gambar.');
      return;
    }

    if (mode === 'edit' && !sourceImage) {
      setErrorMessage('Harap unggah atau pilih foto yang ingin diedit terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const payload: any = {
        prompt: prompt.trim(),
        aspectRatio,
      };

      if (mode === 'edit' && sourceImage) {
        payload.baseImage = {
          data: sourceImage.data,
          mimeType: sourceImage.mimeType,
        };
      }

      const response = await authFetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Gagal membuat/mengedit gambar.');
      }

      const data = await response.json();
      if (!data.imageUrl) {
        throw new Error('Gambar tidak ditemukan pada respon AI.');
      }

      const newItem: GeneratedImageItem = {
        id: 'img_' + Date.now(),
        imageUrl: data.imageUrl,
        prompt: prompt.trim(),
        mode,
        sourceImageUrl: mode === 'edit' ? sourceImage?.previewUrl : undefined,
        aspectRatio,
        timestamp: Date.now(),
      };

      setCurrentImage(newItem);
      setImageHistory((prev) => [newItem, ...prev]);
    } catch (err: any) {
      console.error('Image Gen error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses gambar dengan model Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage?.imageUrl) return;
    const a = document.createElement('a');
    a.href = currentImage.imageUrl;
    a.download = `ai-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getImageObject = (imageUrl: string) => {
    const dataPart = imageUrl.split(',')[1];
    const mime = imageUrl.split(';')[0].replace('data:', '') || 'image/png';
    return {
      data: dataPart,
      mimeType: mime,
      previewUrl: imageUrl,
      name: 'AI Generated Image',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-white p-5 dark:border-indigo-950 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600/10 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                <Wand2 className="h-3.5 w-3.5" /> AI Visual Studio
              </span>
              <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                gemini-3.1-flash-image-preview
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Create & Edit Images with AI
            </h2>
            <p className="mt-1 max-w-3xl text-xs text-slate-600 dark:text-slate-400">
              Buat foto talent atau produk baru dari instruksi teks, atau edit foto yang sudah ada (ubah latar belakang, pencahayaan, atau tambah elemen), lalu langsung gunakan di UGC Script Director atau Animasikan di Veo.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <div className="flex-1">
            <span className="font-bold">Perhatian:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form: Controls (5 cols) */}
        <div className="space-y-5 lg:col-span-5">
          {/* Mode Switcher */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Pilih Mode Gambar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setPrompt(
                    'A photorealistic portrait of an enthusiastic young content creator holding a skincare serum, smiling with glowing skin in a bright studio.'
                  );
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                  mode === 'create'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                <span>Buat Baru (Text to Image)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('edit');
                  setPrompt('Ubah latar belakang menjadi studio mewah bernuansa modern minimalis dengan pencahayaan warm');
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-xs font-bold transition ${
                  mode === 'edit'
                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300'
                }`}
              >
                <Wand2 className="h-4 w-4" />
                <span>Edit Foto (Image to Image)</span>
              </button>
            </div>
          </div>

          {/* If in Edit Mode: Source Image Upload */}
          {mode === 'edit' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Foto yang Ingin Diedit
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
                    alt="Source to edit"
                    className="h-44 w-full object-contain"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 text-white">
                    <p className="text-xs font-semibold truncate">{sourceImage.name || 'Foto Terpilih'}</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-950/60"
                >
                  <Upload className="h-6 w-6 text-indigo-500 group-hover:scale-110 transition" />
                  <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    Unggah Foto untuk Diedit
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">JPG, PNG, WEBP</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* Sample Presets for edit */}
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Atau gunakan contoh foto:
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[...CHARACTER_PRESETS.slice(0, 2), ...PRODUCT_PRESETS.slice(0, 2)].map((p) => (
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
          )}

          {/* Aspect Ratio & Prompt Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            {/* Aspect Ratio */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                Rasio Aspek Gambar
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { ratio: '1:1', label: '1:1' },
                  { ratio: '9:16', label: '9:16' },
                  { ratio: '16:9', label: '16:9' },
                  { ratio: '4:3', label: '4:3' },
                  { ratio: '3:4', label: '3:4' },
                ].map((item) => (
                  <button
                    key={item.ratio}
                    type="button"
                    onClick={() => setAspectRatio(item.ratio)}
                    className={`rounded-lg border py-2 text-center text-xs font-bold transition ${
                      aspectRatio === item.ratio
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-2xs dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {mode === 'create' ? 'Inspirasi Gaya Prompt Cepat' : 'Instruksi Edit Populer'}
              </label>
              <div className="space-y-1.5">
                {mode === 'create'
                  ? STYLE_PRESETS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPrompt(item.prompt);
                          setAspectRatio(item.aspectRatio);
                        }}
                        className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      >
                        <span className="font-bold">{item.title}:</span>{' '}
                        <span className="text-slate-500 dark:text-slate-400 truncate block">
                          {item.prompt}
                        </span>
                      </button>
                    ))
                  : EDIT_PRESETS.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(inst)}
                        className="w-full text-left rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"
                      >
                        • {inst}
                      </button>
                    ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {mode === 'create' ? 'Deskripsi Prompt Gambar' : 'Instruksi Modifikasi / Edit'}
              </label>
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'create'
                    ? 'Deskripsikan gambar yang ingin dibuat secara detail...'
                    : 'Instruksikan perubahan apa yang ingin diterapkan pada foto...'
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* Submit Action Button */}
            <button
              id="btn-generate-image-studio"
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || (mode === 'edit' && !sourceImage)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] px-5 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sedang Memproses Gambar Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{mode === 'create' ? 'Buat Gambar dengan AI' : 'Terapkan Edit pada Foto'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output Viewer (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Hasil Visual AI
                </h3>
              </div>
              {currentImage && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ✓ Berhasil Dibuat
                </span>
              )}
            </div>

            {/* Loading Indicator */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-12 text-center dark:border-indigo-950 dark:from-indigo-950/30 dark:to-slate-900">
                <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                  <Sparkles className="h-7 w-7 text-indigo-600" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Gemini Flash Image sedang me-render...
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Model: gemini-3.1-flash-image-preview • Resolusi tinggi 1K
                </p>
              </div>
            )}

            {/* Generated Image Result */}
            {!isGenerating && currentImage && (
              <div className="space-y-4">
                {/* Before / After side-by-side if edit mode */}
                {currentImage.mode === 'edit' && currentImage.sourceImageUrl ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                      <p className="mb-1.5 text-center text-[11px] font-bold text-slate-500 uppercase">
                        Foto Asli (Sebelum)
                      </p>
                      <img
                        src={currentImage.sourceImageUrl}
                        alt="Before"
                        className="h-64 w-full rounded-lg object-contain bg-black/5"
                      />
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-2 dark:border-indigo-950 dark:bg-indigo-950/30">
                      <p className="mb-1.5 text-center text-[11px] font-bold text-indigo-600 uppercase dark:text-indigo-400">
                        Hasil Edit AI (Sesudah)
                      </p>
                      <img
                        src={currentImage.imageUrl}
                        alt="After Edit"
                        className="h-64 w-full rounded-lg object-contain bg-black/5 shadow-md"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative mx-auto flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950 p-2 shadow-inner">
                    <img
                      src={currentImage.imageUrl}
                      alt="AI Generated"
                      className="max-h-[420px] w-auto max-w-full rounded-xl object-contain shadow-lg"
                    />
                  </div>
                )}

                {/* Workflow Actions */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950 dark:bg-indigo-950/30">
                  <p className="mb-2.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    ⚡ Tindakan Lanjutan Cepat:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      <span>Unduh Gambar PNG</span>
                    </button>

                    {onUseAsTalent && (
                      <button
                        type="button"
                        onClick={() => onUseAsTalent(getImageObject(currentImage.imageUrl))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        <span>Pakai jadi Foto Talent UGC</span>
                      </button>
                    )}

                    {onUseAsProduct && (
                      <button
                        type="button"
                        onClick={() => onUseAsProduct(getImageObject(currentImage.imageUrl))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50 transition dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                        <span>Pakai jadi Foto Produk UGC</span>
                      </button>
                    )}

                    {onSendToVeoAnimator && (
                      <button
                        type="button"
                        onClick={() => onSendToVeoAnimator(getImageObject(currentImage.imageUrl))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-100 transition dark:border-purple-900 dark:bg-purple-950/60 dark:text-purple-300"
                      >
                        <Video className="h-4 w-4 text-purple-600" />
                        <span>Animasikan di Veo Video</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt Info */}
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Prompt:</span>{' '}
                  {currentImage.prompt}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isGenerating && !currentImage && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <ImageIcon className="h-7 w-7" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada Gambar yang Dibuat
                </h4>
                <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Tuliskan ide deskripsi foto di panel kiri atau unggah foto untuk diedit, lalu klik tombol Buat Gambar.
                </p>
              </div>
            )}
          </div>

          {/* History Gallery */}
          {imageHistory.length > 1 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Galeri Gambar Sesi Ini ({imageHistory.length})
              </h4>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {imageHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentImage(item)}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="aspect-square w-full rounded-lg object-cover group-hover:scale-105 transition"
                    />
                    <p className="mt-1 text-[10px] font-medium text-slate-600 truncate dark:text-slate-400">
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
