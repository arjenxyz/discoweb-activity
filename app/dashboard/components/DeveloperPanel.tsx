'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/api';

type Props = {
  maintenance: boolean;
  onMaintenanceChange: (value: boolean) => void;
  onClose: () => void;
};

export default function DeveloperPanel({ maintenance, onMaintenanceChange, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = async () => {
    setClearLoading(true);
    try {
      // httpOnly cookie'yi sunucu tarafından temizle
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
    } catch {}
    // localStorage'ı temizle
    try {
      localStorage.removeItem('discord_bearer_token');
      localStorage.removeItem('discordUser');
      localStorage.removeItem('auth_ready');
      localStorage.removeItem('selectedGuildId');
      localStorage.removeItem('discord_frame_id');
      localStorage.removeItem('discord_instance_id');
    } catch {}
    // client-side erişilebilir cookie'leri temizle
    ['discord_session', 'csrf_token', 'selected_guild_id'].forEach(name => {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
    window.location.reload();
  };

  const toggleMaintenance = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
      const res = await fetch(apiUrl('/api/activity/maintenance'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ enabled: !maintenance }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { maintenance: boolean };
      onMaintenanceChange(data.maintenance);
    } catch (e) {
      setError(`Hata: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-[#0f1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#5865F2]" />
            <span className="text-sm font-bold text-white">Developer Panel</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 p-5">
          {/* Maintenance Toggle */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Activity Bakım Modu</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {maintenance ? 'Tüm sunucularda aktif' : 'Kapalı'}
                </p>
              </div>
              <button
                onClick={toggleMaintenance}
                disabled={loading}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                  maintenance ? 'bg-[#5865F2]' : 'bg-white/20'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    maintenance ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {maintenance && (
              <p className="mt-3 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Kullanıcılar yalnızca karşılama ekranını görebilir.
              </p>
            )}
          </div>

          {/* Session Temizle */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Oturumu Temizle</p>
            <p className="mt-0.5 text-xs text-white/40 mb-3">Cookie ve localStorage sıfırlanır, sayfa yenilenir.</p>
            <button
              onClick={clearSession}
              disabled={clearLoading}
              className="w-full rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition disabled:opacity-50"
            >
              {clearLoading ? 'Temizleniyor...' : 'Oturumu Sıfırla'}
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>
    </>
  );
}
