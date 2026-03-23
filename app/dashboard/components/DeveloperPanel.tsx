'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

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
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reklam state'leri
  const [ads, setAds] = useState<Ad[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adFetching, setAdFetching] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [preview, setPreview] = useState<Omit<Ad, 'id' | 'active'> | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/admin/ads'), { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ads: Ad[] }) => { if (d.ads) setAds(d.ads); })
      .catch(() => {});
  }, []);

  const fetchInviteInfo = async (url: string) => {
    const match = url.match(/discord(?:\.gg|app\.com\/invite|\.com\/invite)\/([A-Za-z0-9-]+)/);
    if (!match) { setPreview(null); return; }
    const code = match[1];
    setAdFetching(true);
    setAdError(null);
    try {
      const res = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
      if (!res.ok) throw new Error('Geçersiz davet linki');
      const data = await res.json() as {
        guild?: { name?: string; description?: string | null; icon?: string | null; id?: string };
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };
      const guild = data.guild;
      if (!guild) throw new Error('Sunucu bilgisi alınamadı');
      setPreview({
        invite_url: url,
        server_name: guild.name ?? '',
        server_description: guild.description ?? null,
        server_icon: guild.icon && guild.id
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith('a_') ? 'gif' : 'png'}?size=128`
          : null,
        member_count: data.approximate_member_count ?? null,
        online_count: data.approximate_presence_count ?? null,
      });
    } catch (e) {
      setAdError(e instanceof Error ? e.message : 'Davet bilgisi alınamadı');
      setPreview(null);
    } finally {
      setAdFetching(false);
    }
  };

  const submitAd = async () => {
    if (!preview) return;
    setAdLoading(true);
    setAdError(null);
    setAdSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/admin/ads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preview),
      });
      const data = await res.json() as { ad?: Ad; error?: string };
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      setAdSuccess(true);
      setInviteUrl('');
      setPreview(null);
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
      setError(`${t('developer_panel_error_prefix')} ${e instanceof Error ? e.message : String(e)}`);
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
            <span className="text-sm font-bold text-white">{t('developer_panel_title')}</span>
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
                <p className="text-sm font-semibold text-white">{t('developer_panel_maintenance_title')}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {maintenance ? t('developer_panel_maintenance_active') : t('developer_panel_maintenance_inactive')}
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
                {t('developer_panel_maintenance_warning')}
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

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="discord.gg/... davet linki"
                value={inviteUrl}
                onChange={e => {
                  setInviteUrl(e.target.value);
                  setAdSuccess(false);
                  setAdError(null);
                  setPreview(null);
                }}
                onBlur={e => { if (e.target.value) fetchInviteInfo(e.target.value); }}
                className="flex-1 min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[#5865F2]/50"
              />
              <button
                onClick={() => fetchInviteInfo(inviteUrl)}
                disabled={adFetching || !inviteUrl}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:text-white disabled:opacity-40"
              >
                {adFetching ? '...' : 'Getir'}
              </button>
            </div>

            {/* Önizleme */}
            {preview && (
              <div className="mt-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 p-3">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Önizleme</p>
                <div className="flex items-center gap-3">
                  {preview.server_icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.server_icon} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/30 text-sm font-black text-white">
                      {preview.server_name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">{preview.server_name}</p>
                    {preview.server_description && (
                      <p className="text-[10px] text-white/40 truncate">{preview.server_description}</p>
                    )}
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/30">
                      {preview.online_count != null && <span>🟢 {preview.online_count.toLocaleString()} çevrimiçi</span>}
                      {preview.member_count != null && <span>👥 {preview.member_count.toLocaleString()} üye</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adError && <p className="mt-2 text-xs text-red-400">{adError}</p>}
            {adSuccess && <p className="mt-2 text-xs text-emerald-400">Reklam yayınlandı!</p>}

            {preview && (
              <button
                onClick={submitAd}
                disabled={adLoading}
                className="mt-3 w-full rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 px-3 py-2 text-xs font-semibold text-indigo-300 transition disabled:opacity-40"
              >
                {adLoading ? 'Yayınlanıyor...' : 'Reklam Ver'}
              </button>
            )}

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
