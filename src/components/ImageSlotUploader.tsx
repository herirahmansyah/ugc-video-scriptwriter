import React, { useRef, useState } from 'react';
import { Upload, Camera, Sparkles, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { PresetItem } from '../types';
import { fileToBase64, urlToBase64 } from '../utils/imageHelper';

interface ImageSlotUploaderProps {
  id: string;
  role: 'character' | 'product';
  title: string;
  subtitle: string;
  badge: string;
  value: {
    data: string;
    mimeType: string;
    previewUrl: string;
    name?: string;
  } | null;
  onChange: (val: { data: string; mimeType: string; previewUrl: string; name?: string } | null) => void;
  presets: PresetItem[];
  isLoading?: boolean;
}

export const ImageSlotUploader: React.FC<ImageSlotUploaderProps> = ({
  id,
  role,
  title,
  subtitle,
  badge,
  value,
  onChange,
  presets,
  isLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // File upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsConverting(true);
      const { data, mimeType } = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onChange({
        data,
        mimeType,
        previewUrl,
        name: file.name,
      });
    } catch (err) {
      console.error('Failed to read file:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setIsConverting(true);
      const { data, mimeType } = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      onChange({
        data,
        mimeType,
        previewUrl,
        name: file.name,
      });
    } catch (err) {
      console.error('Failed to read dropped file:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Preset selection handler
  const handleSelectPreset = async (preset: PresetItem) => {
    try {
      setIsConverting(true);
      setIsPresetsOpen(false);
      const { data, mimeType } = await urlToBase64(preset.imageUrl);
      onChange({
        data,
        mimeType,
        previewUrl: preset.imageUrl,
        name: preset.name,
      });
    } catch (err) {
      console.error('Failed to load preset image:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Camera capture handlers
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: role === 'character' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera sudah diaktifkan.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const [header, base64] = dataUrl.split(',');
    stopCamera();
    onChange({
      data: base64,
      mimeType: 'image/jpeg',
      previewUrl: dataUrl,
      name: `Kamera_${role === 'character' ? 'Talent' : 'Produk'}_${Date.now()}.jpg`,
    });
  };

  return (
    <div
      id={`slot-card-${id}`}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                role === 'character'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
              }`}
            >
              {badge}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        {value && (
          <button
            id={`btn-clear-${id}`}
            type="button"
            onClick={() => onChange(null)}
            disabled={isLoading || isConverting}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Hapus foto"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id={`file-input-${id}`}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload Box / Preview */}
      <div className="mt-2 flex-1">
        {value ? (
          <div className="group relative aspect-4/3 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <img
              src={value.previewUrl}
              alt={value.name || title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 opacity-90 transition-opacity group-hover:opacity-100">
              <div className="flex justify-end">
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[11px] font-medium text-white shadow">
                  <CheckCircle2 className="h-3 w-3" /> Siap Dianalisis
                </span>
              </div>
              <div>
                <p className="line-clamp-1 text-xs font-semibold text-white drop-shadow">
                  {value.name || 'Foto Terpilih'}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-800 shadow-sm backdrop-blur hover:bg-white dark:bg-slate-900/90 dark:text-slate-100"
                  >
                    Ganti Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPresetsOpen(true)}
                    className="rounded bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/60"
                  >
                    Pilih Preset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex aspect-4/3 flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/20'
                : 'border-slate-300 bg-slate-50/70 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-slate-600'
            }`}
          >
            {isConverting ? (
              <div className="flex flex-col items-center">
                <RefreshCw className="h-7 w-7 animate-spin text-indigo-600 dark:text-indigo-400" />
                <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">Memproses gambar...</p>
              </div>
            ) : (
              <>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <Upload className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Tarik & lepas foto di sini
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">JPG, PNG, WebP (Maks 10MB)</p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    id={`btn-browse-${id}`}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                  >
                    <Upload className="h-3.5 w-3.5" /> Pilih File
                  </button>
                  <button
                    id={`btn-camera-${id}`}
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Camera className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" /> Kamera
                  </button>
                  <button
                    id={`btn-preset-open-${id}`}
                    type="button"
                    onClick={() => setIsPresetsOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Contoh Preset
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preset Quick Chips Bar */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
          Quick:
        </span>
        {presets.slice(0, 3).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handleSelectPreset(preset)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100/80 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 whitespace-nowrap"
          >
            <img src={preset.imageUrl} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
            <span>{preset.tag}</span>
          </button>
        ))}
      </div>

      {/* Presets Modal */}
      {isPresetsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pilih Preset {role === 'character' ? 'Talent / Karakter' : 'Produk'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gunakan contoh visual siap pakai untuk pengujian instan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPresetsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-96 grid-cols-1 gap-3 overflow-y-auto pt-2 sm:grid-cols-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="group flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-2.5 transition-all hover:border-indigo-500 hover:bg-indigo-50/40 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20"
                >
                  <img
                    src={preset.imageUrl}
                    alt={preset.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-col justify-between overflow-hidden">
                    <div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-slate-800 dark:text-indigo-400">
                        {preset.tag}
                      </span>
                      <h5 className="mt-1 line-clamp-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                        {preset.name}
                      </h5>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {preset.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-indigo-400" />
                <h4 className="text-sm font-bold">Ambil Foto {role === 'character' ? 'Talent' : 'Produk'}</h4>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="my-6 rounded-xl bg-red-950/50 p-4 text-center text-xs text-red-300">
                {cameraError}
              </div>
            ) : (
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${role === 'character' ? '-scale-x-100' : ''}`}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-3/4 w-3/4 rounded-2xl border border-dashed border-white/40" />
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!!cameraError}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" /> Jepret Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
