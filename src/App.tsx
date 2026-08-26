import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Video,
  Wand2,
  Tv,
  History,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Flame,
  ArrowRight,
  Lightbulb,
  Film,
  Image as ImageIcon,
} from 'lucide-react';
import { ImageSlotUploader } from './components/ImageSlotUploader';
import { CampaignSettingsBar } from './components/CampaignSettingsBar';
import { UGCScriptViewer } from './components/UGCScriptViewer';
import { TeleprompterModal } from './components/TeleprompterModal';
import { AudioVoiceoverPlayer } from './components/AudioVoiceoverPlayer';
import { SavedScriptsDrawer } from './components/SavedScriptsDrawer';
import { VeoVideoAnimator } from './components/VeoVideoAnimator';
import { ImageStudioGenerator } from './components/ImageStudioGenerator';
import { CHARACTER_PRESETS, PRODUCT_PRESETS } from './data/presets';
import { UGCRequestOptions, UGCScriptResult } from './types';
import { urlToBase64 } from './utils/imageHelper';
import { authFetch } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ugc' | 'veo' | 'image_studio'>('ugc');

  const [characterImage, setCharacterImage] = useState<UGCRequestOptions['characterImage'] | null>(null);
  const [productImage, setProductImage] = useState<UGCRequestOptions['productImage'] | null>(null);

  // Dedicated slot for passing images between tools (e.g. from Image Studio to Veo)
  const [veoInitialImage, setVeoInitialImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
    name?: string;
  } | null>(null);

  const [campaignOptions, setCampaignOptions] = useState<Partial<UGCRequestOptions>>({
    platform: 'tiktok',
    language: 'id_casual',
    hookStyle: 'shocking_regret',
    durationTarget: '30s',
    targetAudience: '',
    productKeyPoints: '',
    creatorVibeNotes: '',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentScript, setCurrentScript] = useState<UGCScriptResult | null>(null);

  // Preview image state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Modals & Drawers state
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Saved scripts history in localStorage
  const [savedScripts, setSavedScripts] = useState<UGCScriptResult[]>(() => {
    try {
      const saved = localStorage.getItem('ugc_saved_scripts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ugc_saved_scripts', JSON.stringify(savedScripts));
    } catch (e) {
      console.error('Failed to sync saved scripts:', e);
    }
  }, [savedScripts]);

  // Quick 1-Click Demo loader
  const handleLoadQuickDemo = async () => {
    try {
      setIsGenerating(true);
      setGenerationStep('Memuat foto preset karakter & produk...');
      const charPreset = CHARACTER_PRESETS[0];
      const prodPreset = PRODUCT_PRESETS[0];

      const charB64 = await urlToBase64(charPreset.imageUrl);
      const prodB64 = await urlToBase64(prodPreset.imageUrl);

      const charImg = {
        data: charB64.data,
        mimeType: charB64.mimeType,
        previewUrl: charPreset.imageUrl,
        name: charPreset.name,
      };

      const prodImg = {
        data: prodB64.data,
        mimeType: prodB64.mimeType,
        previewUrl: prodPreset.imageUrl,
        name: prodPreset.name,
      };

      setCharacterImage(charImg);
      setProductImage(prodImg);
      setErrorMessage(null);
      setActiveTab('ugc');

      // Auto generate script for the demo
      await executeScriptGeneration(charImg, prodImg, {
        ...campaignOptions,
        targetAudience: 'Wanita 18-35th yang ingin kulit glowing bebas flek',
        productKeyPoints: 'Serum Vit C 10% Niacinamide, hasil glowing 7 hari, BPOM verified',
      });
    } catch (err: any) {
      console.error('Demo error:', err);
      setErrorMessage('Gagal memuat preset contoh. Silakan coba unggah foto manual.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Main Script Generation execution
  const executeScriptGeneration = async (
    charImg: UGCRequestOptions['characterImage'],
    prodImg: UGCRequestOptions['productImage'],
    options: Partial<UGCRequestOptions>
  ) => {
    if (!charImg || !prodImg) {
      setErrorMessage('Harap unggah Foto Talent/Karakter dan Foto Produk terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    setGenerationStep('Menganalisis persona & ekspresi talent...');

    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Menganalisis kemasan, tekstur, & USP produk...');
    }, 2000);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Menyusun formula Hook 0-3 detik & Problem relatable...');
    }, 4500);

    const stepTimer3 = setTimeout(() => {
      setGenerationStep('Menyusun demonstrasi B-roll, CTA platform, & Caption viral...');
    }, 7000);

    try {
      const response = await authFetch('/api/generate-ugc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterImage: {
            data: charImg.data,
            mimeType: charImg.mimeType,
          },
          productImage: {
            data: prodImg.data,
            mimeType: prodImg.mimeType,
          },
          platform: options.platform || 'tiktok',
          language: options.language || 'id_casual',
          hookStyle: options.hookStyle || 'shocking_regret',
          targetAudience: options.targetAudience || '',
          productKeyPoints: options.productKeyPoints || '',
          creatorVibeNotes: options.creatorVibeNotes || '',
          durationTarget: options.durationTarget || '30s',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memproses analisis AI UGC.');
      }

      const data: UGCScriptResult = await response.json();
      setCurrentScript(data);
      setPreviewImage(null); // Reset preview for new script

      // Save to history
      setSavedScripts((prev) => [data, ...prev.filter((s) => s.id !== data.id)].slice(0, 25));

      // Scroll smoothly to output
      setTimeout(() => {
        const viewerEl = document.getElementById('ugc-script-viewer');
        if (viewerEl) {
          viewerEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (err: any) {
      console.error('Generation failure:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleGenerateClick = () => {
    if (!characterImage || !productImage) {
      setErrorMessage('Harap lengkapi kedua foto: 1. Foto Talent dan 2. Foto Produk.');
      return;
    }
    executeScriptGeneration(characterImage, productImage, campaignOptions);
  };

  const handleOptionChange = (updates: Partial<UGCRequestOptions>) => {
    setCampaignOptions((prev) => ({ ...prev, ...updates }));
  };

  const handleGeneratePreview = async () => {
    if (!characterImage || !productImage) return;
    setIsGeneratingPreview(true);
    try {
      const prompt = `Create a UGC-style product review photo: a real person (from the reference photo) casually using or holding this product in a natural, authentic setting. The person looks natural and genuine, like they are recommending the product to a friend. Product should be clearly visible and well-lit. Natural lighting, smartphone-quality aesthetic, not overly polished or commercial.`;
      const response = await authFetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          baseImage: {
            data: characterImage.data,
            mimeType: characterImage.mimeType,
          },
          aspectRatio: '9:16',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) setPreviewImage(data.imageUrl);
      }
    } catch (err) {
      console.error('Preview generation failed:', err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  AI UGC Video & Visual Studio
                </h1>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Veo & Gemini 3.1
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Script Director • Veo Video Animator • Image Studio
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-demo"
              type="button"
              onClick={handleLoadQuickDemo}
              disabled={isGenerating}
              className="hidden items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 sm:inline-flex"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              <span>⚡ Demo Instan</span>
            </button>

            <button
              id="btn-open-history"
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <History className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Riwayat Script</span>
              {savedScripts.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {savedScripts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex border-t border-slate-100 dark:border-slate-800/80">
            <button
              id="tab-ugc-director"
              type="button"
              onClick={() => setActiveTab('ugc')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                activeTab === 'ugc'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              <span>🎬 UGC Script Director (Dual-Visual)</span>
            </button>

            <button
              id="tab-veo-animator"
              type="button"
              onClick={() => setActiveTab('veo')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                activeTab === 'veo'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Film className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>🎥 Animate Video (Veo)</span>
              <span className="rounded-full bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                16:9 / 9:16
              </span>
            </button>

            <button
              id="tab-image-studio"
              type="button"
              onClick={() => setActiveTab('image_studio')}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                activeTab === 'image_studio'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>🎨 Create & Edit Images</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Flash Image
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Tab 1: UGC Script Director */}
        {activeTab === 'ugc' && (
          <div>
            {/* Banner Announcement */}
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white p-5 dark:border-indigo-950 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600/10 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                    <Flame className="h-3.5 w-3.5" /> High-Converting UGC Formula
                  </span>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Ubah 2 Foto Menjadi Script Iklan Video TikTok & Reels yang Menjual
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    AI Marketing Director akan menganalisis ekspresi talent, kemasan produk, lalu menyusun 6 struktur wajib:
                    <strong className="text-slate-800 dark:text-slate-200"> Analisis Visual, Hook (0-3s), Problem, Solusi & Demo, CTA, serta Caption & Hashtags</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('veo')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300"
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Buat Video Veo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('image_studio')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Generate Foto AI</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <div className="flex-1">
                  <span className="font-bold">Perhatian:</span> {errorMessage}
                </div>
              </div>
            )}

            {/* 2-Slot Dual Photo Input Section */}
            <section id="photo-upload-section" className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  Langkah 1: Input 2 Foto Wajib
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Unggah file sendiri atau gunakan preset di bawahnya
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Slot 1: Character / Talent Photo */}
                <ImageSlotUploader
                  id="talent-photo"
                  role="character"
                  title="Foto Talent / Karakter Kreator"
                  subtitle="Foto influencer, model, atau kreator yang akan membawakan video"
                  badge="1. Talent Visual"
                  value={characterImage}
                  onChange={setCharacterImage}
                  presets={CHARACTER_PRESETS}
                  isLoading={isGenerating}
                />

                {/* Slot 2: Product Photo */}
                <ImageSlotUploader
                  id="product-photo"
                  role="product"
                  title="Foto Produk yang Diiklankan"
                  subtitle="Foto barang, kemasan botol, gadget, makanan, atau item promosi"
                  badge="2. Product Item"
                  value={productImage}
                  onChange={setProductImage}
                  presets={PRODUCT_PRESETS}
                  isLoading={isGenerating}
                />
              </div>
            </section>

            {/* Campaign Settings Bar */}
            <section id="campaign-settings-section" className="mb-6">
              <div className="mb-3">
                <h2 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
                  Langkah 2: Tentukan Platform & Persona Suara
                </h2>
              </div>
              <CampaignSettingsBar
                options={campaignOptions}
                onChange={handleOptionChange}
                disabled={isGenerating}
              />
            </section>

            {/* Big Action Button */}
            <div className="mb-10 flex flex-col items-center justify-center">
              <button
                id="btn-generate-ugc-script"
                type="button"
                onClick={handleGenerateClick}
                disabled={isGenerating || !characterImage || !productImage}
                className={`group relative flex w-full max-w-md items-center justify-center gap-3 rounded-2xl p-4 text-sm font-black text-white shadow-xl transition-all ${
                  isGenerating || !characterImage || !productImage
                    ? 'cursor-not-allowed bg-slate-400 opacity-70 dark:bg-slate-700'
                    : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 active:scale-[0.99]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>{generationStep || 'Memproses Analisis AI...'}</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    <span>Analisis 2 Foto & Generate Script UGC Video</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {!characterImage || !productImage ? (
                <p className="mt-2 text-xs text-slate-400">
                  * Silakan lengkapi kedua foto di atas atau klik{' '}
                  <button
                    type="button"
                    onClick={handleLoadQuickDemo}
                    className="font-semibold text-indigo-600 underline dark:text-indigo-400"
                  >
                    Contoh Demo Instan
                  </button>
                </p>
              ) : (
                <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ 2 foto siap dianalisis dengan Gemini Multimodal
                </p>
              )}
            </div>

            {/* Loading Progress Skeleton */}
            {isGenerating && (
              <div className="mb-10 rounded-2xl border border-indigo-200 bg-white p-8 text-center shadow-sm dark:border-indigo-950 dark:bg-slate-900">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 animate-pulse">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
                  {generationStep || 'Sedang Menganalisis Visual Talent & Produk...'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Memproses kecocokan visual persona, hook 0-3 detik, storyboard per shot, serta caption viral...
                </p>
                <div className="mx-auto mt-4 h-2 w-64 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-full bg-indigo-600 animate-[indeterminate_1.5s_infinite_linear]" />
                </div>
              </div>
            )}

            {/* Output Section */}
            {currentScript && (
              <section id="ugc-output-section" className="scroll-mt-20">
                <UGCScriptViewer
                  script={currentScript}
                  onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
                  onPlayAudio={() => setIsAudioPlayerOpen(true)}
                  previewImage={previewImage}
                  onGeneratePreview={handleGeneratePreview}
                  isGeneratingPreview={isGeneratingPreview}
                />
              </section>
            )}
          </div>
        )}

        {/* Tab 2: Veo Video Animator */}
        {activeTab === 'veo' && (
          <VeoVideoAnimator
            initialImage={veoInitialImage || characterImage || productImage}
            onSendToUgc={(img, role) => {
              if (role === 'character') {
                setCharacterImage(img);
              } else {
                setProductImage(img);
              }
              setActiveTab('ugc');
            }}
          />
        )}

        {/* Tab 3: Create & Edit Images Studio */}
        {activeTab === 'image_studio' && (
          <ImageStudioGenerator
            onUseAsTalent={(img) => {
              setCharacterImage(img);
              setActiveTab('ugc');
            }}
            onUseAsProduct={(img) => {
              setProductImage(img);
              setActiveTab('ugc');
            }}
            onSendToVeoAnimator={(img) => {
              setVeoInitialImage(img);
              setActiveTab('veo');
            }}
          />
        )}
      </main>

      {/* Floating Teleprompter Modal */}
      {isTeleprompterOpen && currentScript && (
        <TeleprompterModal
          script={currentScript}
          onClose={() => setIsTeleprompterOpen(false)}
        />
      )}

      {/* Floating Audio Voiceover Player Bar */}
      {isAudioPlayerOpen && currentScript && (
        <AudioVoiceoverPlayer
          script={currentScript}
          onClose={() => setIsAudioPlayerOpen(false)}
        />
      )}

      {/* Saved Scripts History Drawer */}
      <SavedScriptsDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        savedScripts={savedScripts}
        onSelectScript={(script) => {
          setCurrentScript(script);
          setActiveTab('ugc');
        }}
        onDeleteScript={(id) => {
          setSavedScripts((prev) => prev.filter((s) => s.id !== id));
        }}
        onClearAll={() => {
          if (confirm('Hapus seluruh riwayat script tersimpan?')) {
            setSavedScripts([]);
          }
        }}
      />
    </div>
  );
}
