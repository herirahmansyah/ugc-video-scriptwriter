import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: any) => void };
  }
}

const SNAP_SCRIPT = (import.meta as any).env?.VITE_MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';
const CLIENT_KEY = (import.meta as any).env?.VITE_MIDTRANS_CLIENT_KEY || '';

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

export default function Pricing() {
  const { user, subscription, refreshSubscription } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = subscription?.price_idr ?? 99000;

  useEffect(() => {
    if (document.querySelector(`script[src="${SNAP_SCRIPT}"]`)) return;
    const script = document.createElement('script');
    script.src = SNAP_SCRIPT;
    script.setAttribute('data-client-key', CLIENT_KEY);
    document.body.appendChild(script);
  }, []);

  async function handleSubscribe() {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ugc_token')}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulai pembayaran.');

      if (!window.snap) throw new Error('Snap Midtrans belum termuat. Refresh halaman.');
      window.snap.pay(data.token, {
        onSuccess: () => {
          refreshSubscription();
          alert('Pembayaran berhasil! Langganan PRO Anda aktif.');
        },
        onPending: () => alert('Transaksi tertunda. Selesaikan pembayaran Anda.'),
        onError: () => setError('Terjadi kesalahan pembayaran. Silakan coba lagi.'),
        onClose: () => {
          setError('Anda menutup popup pembayaran sebelum menyelesaikan transaksi.');
        },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-6 h-6 text-fuchsia-400" /> UGC Scriptwriter
        </Link>
        <Link to={user ? '/app' : '/login'} className="px-4 py-2 text-sm text-slate-300 hover:text-white">
          {user ? 'Buka Aplikasi' : 'Masuk'}
        </Link>
      </nav>

      <div className="max-w-md mx-auto px-6 pt-10 pb-24 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Berlangganan PRO</h1>
        <p className="text-slate-400 mb-12">Satu paket, semua fitur terbuka penuh.</p>

        <div className="p-8 rounded-2xl bg-slate-900 border-2 border-fuchsia-500/50 text-left space-y-5">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-lg">PRO Bulanan</span>
            {subscription?.plan === 'pro' && subscription.status === 'active' ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
                Aktif
              </span>
            ) : subscription ? (
              <span className="px-3 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 text-xs font-semibold">
                Trial
              </span>
            ) : null}
          </div>
          <div>
            <span className="text-4xl font-extrabold">{formatRupiah(price)}</span>
            <span className="text-slate-400"> /bulan</span>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-300">
            {[
              'Script UGC tanpa batas',
              'Generate video Veo (image to video)',
              'Image Studio tanpa batas',
              'Voiceover & teleprompter',
              'Semua platform: TikTok, Reels, Shorts, Shopee',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}

          {subscription?.plan === 'pro' && subscription.status === 'active' ? (
            <Link
              to="/app"
              className="block w-full py-3.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition"
            >
              Lanjut ke Aplikasi
            </Link>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? 'Memproses...' : 'Bayar dengan Midtrans'}
            </button>
          )}
          <p className="text-xs text-center text-slate-500">
            Pembayaran aman via Midtrans: QRIS, Transfer Bank, E-Wallet, Kartu Kredit
          </p>
        </div>

        <Link to={user ? '/app' : '/login'} className="inline-block mt-8 text-sm text-slate-400 hover:text-white">
          ← Kembali
        </Link>
      </div>
    </div>
  );
}
