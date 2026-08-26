import React, { useState } from 'react';
import { Sliders, Video, Globe2, Sparkles, ChevronDown, ChevronUp, Clock, Target, Tag } from 'lucide-react';
import { UGCRequestOptions } from '../types';

interface CampaignSettingsBarProps {
  options: Partial<UGCRequestOptions>;
  onChange: (updates: Partial<UGCRequestOptions>) => void;
  disabled?: boolean;
}

export const CampaignSettingsBar: React.FC<CampaignSettingsBarProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const platformList: { id: UGCRequestOptions['platform']; name: string; icon: string; badge: string }[] = [
    { id: 'tiktok', name: 'TikTok', icon: '🎵', badge: 'Keranjang Kuning' },
    { id: 'reels', name: 'Instagram Reels', icon: '📸', badge: 'Link in Bio / DM' },
    { id: 'shorts', name: 'YouTube Shorts', icon: '▶️', badge: 'Pinned Comment' },
    { id: 'shopee', name: 'Shopee Video', icon: '🛍️', badge: 'Flash Voucher' },
  ];

  const languageList: { id: UGCRequestOptions['language']; name: string; desc: string }[] = [
    { id: 'id_casual', name: '🇮🇩 Indonesia Santai', desc: 'Luwes & natural sehari-hari' },
    { id: 'id_jaksel', name: '🇮🇩 Indonesia Jaksel / Viral', desc: 'Gaul, slang kekinian & racun' },
    { id: 'id_formal', name: '🇮🇩 Indonesia Edukatif', desc: 'Rapi & persuasif berwibawa' },
    { id: 'en_casual', name: '🇺🇸 English Casual', desc: 'Authentic creator tone' },
    { id: 'en_genz', name: '🇺🇸 English Gen-Z', desc: 'Fast, witty & trending' },
  ];

  const hookStyles: { id: UGCRequestOptions['hookStyle']; title: string; example: string }[] = [
    { id: 'shocking_regret', title: 'Nyesel Baru Tahu (Regret)', example: '"Jujur nyesel banget baru nemu ini..."' },
    { id: 'problem_solver', title: 'Direct Problem Solver', example: '"Stop scroll kalau kalian punya masalah..."' },
    { id: 'storytelling', title: 'Emotional Storytelling', example: '"Kemarin temen kantor nanya kok muka bisa..."' },
    { id: 'relatable_pov', title: 'POV Relatable Drama', example: '"POV: Tiap pagi lu selalu ribet sama..."' },
    { id: 'curiosity', title: 'Open Loop Curiosity', example: '"Kalian sadar ga kenapa ini viral di mana-mana?"' },
    { id: 'unboxing', title: 'Unboxing & First Impression', example: '"Finally nyobain yang katanya sold out terus..."' },
    { id: 'before_after', title: 'Before vs After Result', example: '"Gue ga nyangka hasilnya bakal se-drastis ini..."' },
  ];

  const durations: UGCRequestOptions['durationTarget'][] = ['15s', '30s', '45s', '60s'];

  return (
    <div
      id="campaign-settings-panel"
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Konfigurasi Strategi & Persona Video
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sesuaikan target platform, gaya bahasa, dan hook pembuka
            </p>
          </div>
        </div>

        {/* Duration selector pill */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
          <Clock className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Durasi:</span>
          {durations.map((dur) => (
            <button
              key={dur}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ durationTarget: dur })}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                (options.durationTarget || '30s') === dur
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {dur}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Platform, Language, Hook Formula */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Platform Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Video className="h-3.5 w-3.5 text-indigo-500" /> Target Platform
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {platformList.map((p) => {
              const isSelected = (options.platform || 'tiktok') === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`btn-platform-${p.id}`}
                  disabled={disabled}
                  onClick={() => onChange({ platform: p.id })}
                  className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base">{p.icon}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shadow-2xs dark:bg-slate-800 dark:text-slate-300">
                      {p.badge}
                    </span>
                  </div>
                  <span className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Globe2 className="h-3.5 w-3.5 text-indigo-500" /> Bahasa & Dialek Bicara
          </label>
          <div className="mt-2 space-y-1.5">
            {languageList.map((lang) => {
              const isSelected = (options.language || 'id_casual') === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  id={`btn-lang-${lang.id}`}
                  disabled={disabled}
                  onClick={() => onChange({ language: lang.id })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 font-semibold text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium">{lang.name}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{lang.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hook Style Selection */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Formula Hook (0-3 Detik)
          </label>
          <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {hookStyles.map((hook) => {
              const isSelected = (options.hookStyle || 'shocking_regret') === hook.id;
              return (
                <button
                  key={hook.id}
                  type="button"
                  id={`btn-hook-${hook.id}`}
                  disabled={disabled}
                  onClick={() => onChange({ hookStyle: hook.id })}
                  className={`flex w-full flex-col rounded-xl border p-2.5 text-left transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40 dark:ring-indigo-500'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{hook.title}</span>
                  <span className="mt-0.5 line-clamp-1 text-[11px] italic text-slate-500 dark:text-slate-400">
                    {hook.example}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Advanced Collapsible Options */}
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {isAdvancedOpen ? 'Tutup Pengaturan Tambahan' : 'Tambah Detail Produk & Instruksi Kreator (Opsional)'}
        </button>

        {isAdvancedOpen && (
          <div className="mt-3 grid grid-cols-1 gap-3 rounded-xl bg-slate-50/80 p-4 dark:bg-slate-950/60 sm:grid-cols-3">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <Target className="h-3 w-3" /> Target Audiens Khusus
              </label>
              <input
                type="text"
                value={options.targetAudience || ''}
                onChange={(e) => onChange({ targetAudience: e.target.value })}
                placeholder="Contoh: Mahasiswa, Ibu muda, Cowok gym..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <Tag className="h-3 w-3" /> Poin Keunggulan / Promo Wajib
              </label>
              <input
                type="text"
                value={options.productKeyPoints || ''}
                onChange={(e) => onChange({ productKeyPoints: e.target.value })}
                placeholder="Contoh: Diskon 50% gajian, BPOM certified, tahan 24 jam..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                <Sparkles className="h-3 w-3" /> Catatan Aksen / Vibe Talent
              </label>
              <input
                type="text"
                value={options.creatorVibeNotes || ''}
                onChange={(e) => onChange({ creatorVibeNotes: e.target.value })}
                placeholder="Contoh: Bawaan heboh, ekspresi kaget, gaya whispering..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
