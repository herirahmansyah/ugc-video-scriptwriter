import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut } from 'lucide-react';
import App from '../App';
import { useAuth } from '../context/AuthContext';

function daysLeft(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export default function Dashboard() {
  const { user, subscription, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onTrialExpired = () => navigate('/pricing');
    window.addEventListener('ugc:trial-expired', onTrialExpired);
    return () => window.removeEventListener('ugc:trial-expired', onTrialExpired);
  }, [navigate]);

  const isPro = subscription?.plan === 'pro' && subscription.status === 'active';
  const remaining = daysLeft(subscription?.trial_ends_at || null);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <Sparkles className="w-5 h-5 text-fuchsia-400" /> UGC Scriptwriter
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isPro ? (
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-xs">
                PRO
              </span>
            ) : (
              remaining > 0 && (
                <Link
                  to="/pricing"
                  className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 font-semibold text-xs transition"
                >
                  Trial: sisa {remaining} hari — Upgrade
                </Link>
              )
            )}
            {!isPro && (
              <Link
                to="/pricing"
                className="px-4 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 font-semibold transition"
              >
                Upgrade PRO
              </Link>
            )}
            <span className="hidden sm:inline text-slate-400">{user?.email}</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Keluar"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <App />
    </div>
  );
}
