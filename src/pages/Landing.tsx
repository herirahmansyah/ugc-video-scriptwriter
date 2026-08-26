import { Link } from 'react-router-dom';
import {
  Sparkles,
  Video,
  Wand2,
  CheckCircle2,
  Zap,
  Film,
  Image as ImageIcon,
  Mic,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Film,
    title: 'Script UGC Otomatis',
    desc: 'Upload foto talent & produk, AI menyusun script lengkap: hook, pain point, demo, CTA, sampai storyboard shot-by-shot.',
  },
  {
    icon: Video,
    title: 'Animate ke Video (Veo)',
    desc: 'Ubah foto produk menjadi video iklan vertikal 9:16 siap posting dengan Google Veo.',
  },
  {
    icon: ImageIcon,
    title: 'Image Studio',
    desc: 'Generate atau edit visual produk dengan AI untuk konten yang konsisten dan eye-catching.',
  },
  {
    icon: Mic,
    title: 'Voiceover & Teleprompter',
    desc: 'Pratinjau voiceover langsung dan baca script lewat mode teleprompter saat rekam.',
  },
];

const PLATFORMS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Shopee Video'];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-6 h-6 text-fuchsia-400" />
          UGC Scriptwriter
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white">
            Masuk
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-sm font-semibold transition"
          >
            Coba Gratis 7 Hari
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-24 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold mb-6">
          Ditenagai Google Gemini & Veo
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
          Script Iklan UGC yang{' '}
          <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
            Konversi Tinggi
          </span>
          ,<br />
          Dibuat dalam Hitungan Detik
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-slate-400 text-lg">
          Upload foto talent dan produk Anda — AI kami merangkai script video iklan TikTok, Reels,
          Shorts, hingga Shopee lengkap dengan storyboard, caption, dan hashtag viral.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition shadow-lg shadow-fuchsia-900/40"
          >
            Mulai Gratis 7 Hari <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/pricing"
            className="px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 font-semibold transition"
          >
            Lihat Harga
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">Tanpa kartu kredit. Batalkan kapan saja.</p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
          <Zap className="hidden" />
          {PLATFORMS.map((p) => (
            <span key={p} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {p}
            </span>
          ))}
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">Satu Tool, Semua Kebutuhan Konten</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-fuchsia-500/40 transition"
            >
              <f.icon className="w-8 h-8 text-fuchsia-400 mb-4" />
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <Wand2 className="w-10 h-10 text-fuchsia-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Siap bikin konten UGC yang menjual?
          </h2>
          <p className="text-slate-400 mb-8">
            Coba gratis 7 hari. Setelah itu lanjut berlangganan sebulan hanya Rp 99.000.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition"
          >
            Coba Sekarang <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} UGC Scriptwriter. All rights reserved.
      </footer>
    </div>
  );
}
