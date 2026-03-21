'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';

type Props = {
  maintenance: boolean;
  onMaintenanceChange: (value: boolean) => void;
  onClose: () => void;
};

type Ad = {
  id: string;
  invite_url: string;
  server_name: string;
  server_description?: string | null;
  server_icon?: string | null;
  member_count?: number | null;
  online_count?: number | null;
  active: boolean;
};

export default function DeveloperPanel({ maintenance, onMaintenanceChange, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reklam state'leri
  const [ads, setAds] = useState<Ad[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState(false);
  const [adForm, setAdForm] = useState({
    invite_url: '',
    server_name: '',
    server_description: '',
    server_icon: '',
    member_count: '',
    online_count: '',
  });

  useEffect(() => {
    fetch(apiUrl('/api/admin/ads'), { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ads: Ad[] }) => { if (d.ads) setAds(d.ads); })
      .catch(() => {});
  }, []);

  const submitAd = async () => {
    setAdLoading(true);
    setAdError(null);
    setAdSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/admin/ads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          invite_url: adForm.invite_url,
          server_name: adForm.server_name,
          server_description: adForm.server_description || undefined,
          server_icon: adForm.server_icon || undefined,
          member_count: adForm.member_count ? Number(adForm.member_count) : undefined,
          online_count: adForm.online_count ? Number(adForm.online_count) : undefined,
        }),
      });
      const data = await res.json() as { ad?: Ad; error?: string };
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      setAdSuccess(true);
      setAdForm({ invite_url: '', server_name: '', server_description: '', server_icon: '', member_count: '', online_count: '' });
      if (data.ad) setAds(prev => [data.ad!, ...prev.map(a => ({ ...a, active: false }))]);
    } catch (e) {
      setAdError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdLoading(false);
    }
  };

  const deleteAd = async (id: string) => {
    await fetch(apiUrl(`/api/admin/ads?id=${id}`), { method: 'DELETE', credentials: 'include' });
    setAds(prev => prev.filter(a => a.id !== id));
  };

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

          {/* Reklam Yönetimi */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white mb-3">Reklam Yönetimi</p>

            <div className="flex flex-col gap-2">
              {(['invite_url', 'server_name', 'server_description', 'server_icon', 'member_count', 'online_count'] as const).map((field) => (
                <input
                  key={field}
                  type={field === 'member_count' || field === 'online_count' ? 'number' : 'text'}
                  placeholder={{
                    invite_url: 'Discord davet linki *',
                    server_name: 'Sunucu adı *',
                    server_description: 'Açıklama (opsiyonel)',
                    server_icon: 'İkon URL (opsiyonel)',
                    member_count: 'Toplam üye (opsiyonel)',
                    online_count: 'Çevrimiçi sayısı (opsiyonel)',
                  }[field]}
                  value={adForm[field]}
                  onChange={e => setAdForm(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#5865F2]/50"
                />
              ))}

              {adError && <p className="text-xs text-red-400">{adError}</p>}
              {adSuccess && <p className="text-xs text-emerald-400">Reklam yayınlandı!</p>}

              <button
                onClick={submitAd}
                disabled={adLoading || !adForm.invite_url || !adForm.server_name}
                className="w-full rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 px-3 py-2 text-xs font-semibold text-indigo-300 transition disabled:opacity-40"
              >
                {adLoading ? 'Yükleniyor...' : 'Reklam Ver'}
              </button>
            </div>

            {ads.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Mevcut Reklamlar</p>
                {ads.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{a.server_name}</p>
                      <p className="text-[10px] text-white/30">{a.active ? '🟢 Aktif' : '⚫ Pasif'}</p>
                    </div>
                    <button
                      onClick={() => deleteAd(a.id)}
                      className="shrink-0 rounded-md bg-red-500/10 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/20 transition"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
