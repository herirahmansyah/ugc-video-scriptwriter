import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(name, email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-lg mb-8">
          <Sparkles className="w-6 h-6 text-fuchsia-400" /> UGC Scriptwriter
        </Link>
        <form
          onSubmit={handleSubmit}
          className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
        >
          <h1 className="text-2xl font-bold">Daftar sekarang</h1>
          <div className="rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 p-4 space-y-2">
            <p className="flex items-center gap-2 text-sm text-fuchsia-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Gratis 7 hari penuh, tanpa kartu kredit
            </p>
            <p className="flex items-center gap-2 text-sm text-fuchsia-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Akses semua fitur: script, video Veo & image studio
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-fuchsia-500 outline-none"
              placeholder="Nama Anda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-fuchsia-500 outline-none"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password (min. 8 karakter)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-fuchsia-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition disabled:opacity-50"
          >
            {busy ? 'Memproses...' : 'Mulai Trial Gratis'}
          </button>
          <p className="text-sm text-center text-slate-400">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-fuchsia-400 hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
