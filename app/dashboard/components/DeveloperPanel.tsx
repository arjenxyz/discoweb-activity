'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  maintenance: boolean;
  onMaintenanceChange: (value: boolean) => void;
  onClose: () => void;
  variant?: 'panel' | 'page';
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

type LogItem = {
  id: string;
  type: string;
  title: string;
  created_at: string;
  severity?: string | null;
  data?: Record<string, unknown> | null;
};

type Overview = {
  userCount: number;
  serverCount: number;
  profileCount: number;
  advancedServerCount: number;
  economyAutoApprove: boolean;
};

type EconomyApp = {
  id: string;
  guild_id: string;
  status: string;
  application_type?: string | null;
  vote_count?: number | null;
  vote_threshold?: number | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  scheduled_open_at?: string | null;
  created_at: string;
  server?: {
    discord_id: string;
    name: string;
    member_count: number | null;
    is_setup: boolean;
    economy_tier: string;
  } | null;
  criteria?: {
    memberCount: number;
    isSetup: boolean;
    voteCount: number;
    voteThreshold: number;
    memberOk: boolean;
    voteOk: boolean;
    eligible: boolean;
  } | null;
};

type EconomyTierApp = {
  id: string;
  guild_id: string;
  applicant_user_id: string;
  status: string;
  starter_package?: number | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  server?: {
    discord_id: string;
    name: string;
    member_count: number | null;
    is_setup: boolean;
    economy_tier: string;
  } | null;
};

type ServerRow = {
  discord_id: string;
  name: string;
  is_setup: boolean;
  economy_tier: string;
  member_count: number | null;
  created_at: string;
  admin_role_id?: string | null;
  verify_role_id?: string | null;
  market_hours_enabled?: boolean | null;
  market_open_time?: string | null;
  market_close_time?: string | null;
  market_timezone?: string | null;
};

type ProfileRow = {
  id: string;
  guild_id: string;
  user_id: string;
  about?: string | null;
  created_at: string;
  updated_at: string;
  has_tag?: boolean | null;
  is_booster?: boolean | null;
  booster_since?: string | null;
  referral_code?: string | null;
  referred_by?: string | null;
  total_invites?: number | null;
  user?: {
    discord_id: string;
    username: string;
    avatar: string | null;
    created_at: string;
  } | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('tr-TR');
};

const prettyJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function DeveloperPanel({ maintenance, onMaintenanceChange, onClose, variant = 'panel' }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'apps' | 'servers' | 'profiles' | 'ads'>('overview');
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [economyApps, setEconomyApps] = useState<EconomyApp[]>([]);
  const [tierApps, setTierApps] = useState<EconomyTierApp[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedServer, setSelectedServer] = useState<ServerRow | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);

  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adFetching, setAdFetching] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [preview, setPreview] = useState<Omit<Ad, 'id' | 'active'> | null>(null);

  useEffect(() => {
    fetchSection('overview');
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') return;
    fetchSection(activeTab);
  }, [activeTab]);

  const fetchSection = async (section: typeof activeTab) => {
    setLoadingTab(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/dev-panel?section=${section}`), { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));

      if (section === 'overview') {
        setOverview(data.overview ?? null);
      } else if (section === 'logs') {
        setLogs(data.logs ?? []);
        setSelectedLog(null);
      } else if (section === 'apps') {
        setEconomyApps(data.economy ?? []);
        setTierApps(data.tier ?? []);
        setAutoApprove(Boolean(data.autoApprove));
      } else if (section === 'servers') {
        setServers(data.servers ?? []);
        setSelectedServer(null);
      } else if (section === 'profiles') {
        setProfiles(data.profiles ?? []);
        setSelectedProfile(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTab(false);
    }
  };
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
      if (!guild) throw new Error('Sunucu bilgisi alýnamadý');
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
      setAdError(e instanceof Error ? e.message : 'Davet bilgisi alýnamadý');
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

  const fetchAds = async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/ads'), { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setAds(data.ads ?? []);
    } catch {}
  };

  useEffect(() => {
    if (activeTab !== 'ads') return;
    fetchAds();
  }, [activeTab]);

  const clearSession = async () => {
    setClearLoading(true);
    try {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
    } catch {}
    try {
      localStorage.removeItem('discord_bearer_token');
      localStorage.removeItem('discordUser');
      localStorage.removeItem('auth_ready');
      localStorage.removeItem('selectedGuildId');
      localStorage.removeItem('discord_frame_id');
      localStorage.removeItem('discord_instance_id');
    } catch {}
    ['discord_session', 'csrf_token', 'selected_guild_id'].forEach(name => {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
    window.location.reload();
  };

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
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
      setMaintenanceLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.type === logFilter);
  }, [logs, logFilter]);

  const setAutoApproveFlag = async (value: boolean) => {
    try {
      const res = await fetch(apiUrl('/api/admin/dev-panel'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'set_auto_approve', value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setAutoApprove(Boolean(data.economyAutoApprove));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDecision = async (table: 'economy_applications' | 'economy_tier_applications', id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? window.prompt(t('developer_panel_reject_reason_placeholder')) ?? '' : undefined;
    try {
      const res = await fetch(apiUrl('/api/admin/dev-panel'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, table, id, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchSection('apps');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const header = (
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
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
  );

  const tabs = [
    { id: 'overview', label: t('developer_tab_overview') },
    { id: 'logs', label: t('developer_tab_logs') },
    { id: 'apps', label: t('developer_tab_apps') },
    { id: 'servers', label: t('developer_tab_servers') },
    { id: 'profiles', label: t('developer_tab_profiles') },
    { id: 'ads', label: t('developer_tab_ads') },
  ] as const;

  const overviewCard = (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-white/40">{t('developer_stat_users')}</p>
        <p className="mt-1 text-xl font-semibold text-white">{overview?.userCount ?? ''}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-white/40">{t('developer_stat_servers')}</p>
        <p className="mt-1 text-xl font-semibold text-white">{overview?.serverCount ?? ''}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-white/40">{t('developer_stat_profiles')}</p>
        <p className="mt-1 text-xl font-semibold text-white">{overview?.profileCount ?? ''}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-white/40">{t('developer_stat_advanced')}</p>
        <p className="mt-1 text-xl font-semibold text-white">{overview?.advancedServerCount ?? ''}</p>
      </div>
    </div>
  );

  const maintenanceCard = (
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
          disabled={maintenanceLoading}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
            maintenance ? 'bg-[#5865F2]' : 'bg-white/20'
          } ${maintenanceLoading ? 'opacity-50' : ''}`}
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
  );

  const clearCard = (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{t('developer_panel_clear_title')}</p>
      <p className="mt-0.5 text-xs text-white/40 mb-3">{t('developer_panel_clear_desc')}</p>
      <button
        onClick={clearSession}
        disabled={clearLoading}
        className="w-full rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition disabled:opacity-50"
      >
        {clearLoading ? t('developer_panel_clear_loading') : t('developer_panel_clear_action')}
      </button>
    </div>
  );

  const logsSection = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'auth_login', 'auth_logout', 'new_user', 'new_server', 'bug', 'suggestion', 'error_log', 'client_error'].map((type) => (
            <button
              key={type}
              onClick={() => setLogFilter(type)}
              className={`rounded-full border px-3 py-1 text-[11px] transition ${
                logFilter === type
                  ? 'border-[#5865F2] bg-[#5865F2]/20 text-white'
                  : 'border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {type === 'all' ? t('developer_logs_all') : type}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 max-h-[520px] overflow-auto pr-1">
          {filteredLogs.map((log) => (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className={`text-left rounded-lg border px-3 py-2 transition ${
                selectedLog?.id === log.id
                  ? 'border-[#5865F2]/50 bg-[#5865F2]/10'
                  : 'border-white/10 bg-black/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">{log.title}</p>
                <span className="text-[10px] text-white/40">{formatDate(log.created_at)}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">{log.type}</p>
            </button>
          ))}
          {filteredLogs.length === 0 && (
            <p className="text-xs text-white/40">{t('developer_logs_empty')}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {selectedLog ? (
          <>
            <p className="text-sm font-semibold text-white">{selectedLog.title}</p>
            <p className="text-[11px] text-white/40">{formatDate(selectedLog.created_at)}</p>
            <div className="mt-3 rounded-lg bg-black/30 p-3 text-[11px] text-white/70 whitespace-pre-wrap">
              <pre className="whitespace-pre-wrap">{prettyJson(selectedLog.data)}</pre>
            </div>
          </>
        ) : (
          <p className="text-xs text-white/40">{t('developer_logs_hint')}</p>
        )}
      </div>
    </div>
  );
  const appsSection = (
    <div className="grid gap-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{t('developer_apps_auto_title')}</p>
          <p className="text-xs text-white/40">{t('developer_apps_auto_desc')}</p>
        </div>
        <button
          onClick={() => setAutoApproveFlag(!autoApprove)}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
            autoApprove ? 'bg-[#57F287]' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              autoApprove ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white mb-2">{t('developer_apps_economy_title')}</p>
        <div className="flex flex-col gap-2">
          {economyApps.map((app) => (
            <div key={app.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-white">{app.server?.name ?? app.guild_id}</p>
                  <p className="text-[10px] text-white/40">{app.guild_id}</p>
                </div>
                <span className="text-[10px] text-white/50">{formatDate(app.created_at)}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/60">
                <span>Durum: <strong className="text-white">{app.status}</strong></span>
                <span>Üye: <strong className="text-white">{app.criteria?.memberCount ?? 0}</strong></span>
                <span>Oy: <strong className="text-white">{app.criteria?.voteCount ?? 0}</strong> / {app.criteria?.voteThreshold ?? 120}</span>
                <span>Kurulum: <strong className="text-white">{app.criteria?.isSetup ? 'var' : 'yok'}</strong></span>
                <span>Uygun: <strong className="text-white">{app.criteria?.eligible ? 'evet' : 'hayýr'}</strong></span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleDecision('economy_applications', app.id, 'approve')}
                  className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20"
                >
                  {t('developer_apps_approve')}
                </button>
                <button
                  onClick={() => handleDecision('economy_applications', app.id, 'reject')}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                >
                  {t('developer_apps_reject')}
                </button>
              </div>
            </div>
          ))}
          {economyApps.length === 0 && (
            <p className="text-xs text-white/40">{t('developer_apps_empty')}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white mb-2">{t('developer_apps_tier_title')}</p>
        <div className="flex flex-col gap-2">
          {tierApps.map((app) => (
            <div key={app.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-white">{app.server?.name ?? app.guild_id}</p>
                  <p className="text-[10px] text-white/40">{app.guild_id}</p>
                </div>
                <span className="text-[10px] text-white/50">{formatDate(app.created_at)}</span>
              </div>
              <div className="mt-2 text-[11px] text-white/60">
                <span>Baþvuran: <strong className="text-white">{app.applicant_user_id}</strong></span>
                <span className="ml-3">Durum: <strong className="text-white">{app.status}</strong></span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleDecision('economy_tier_applications', app.id, 'approve')}
                  className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20"
                >
                  {t('developer_apps_approve')}
                </button>
                <button
                  onClick={() => handleDecision('economy_tier_applications', app.id, 'reject')}
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
                >
                  {t('developer_apps_reject')}
                </button>
              </div>
            </div>
          ))}
          {tierApps.length === 0 && (
            <p className="text-xs text-white/40">{t('developer_apps_empty')}</p>
          )}
        </div>
      </div>
    </div>
  );

  const serversSection = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 max-h-[520px] overflow-auto pr-1">
          {servers.map((server) => (
            <button
              key={server.discord_id}
              onClick={() => setSelectedServer(server)}
              className={`text-left rounded-lg border px-3 py-2 transition ${
                selectedServer?.discord_id === server.discord_id
                  ? 'border-[#5865F2]/50 bg-[#5865F2]/10'
                  : 'border-white/10 bg-black/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">{server.name}</p>
                <span className="text-[10px] text-white/40">{formatDate(server.created_at)}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">{server.discord_id}</p>
              <p className="mt-1 text-[11px] text-white/50">Tier: {server.economy_tier} · Üye: {server.member_count ?? 0} · Kurulum: {server.is_setup ? 'var' : 'yok'}</p>
            </button>
          ))}
          {servers.length === 0 && (
            <p className="text-xs text-white/40">{t('developer_servers_empty')}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {selectedServer ? (
          <>
            <p className="text-sm font-semibold text-white">{selectedServer.name}</p>
            <p className="text-[11px] text-white/40">{selectedServer.discord_id}</p>
            <div className="mt-3 text-[11px] text-white/60 space-y-1">
              <div>Üye: <strong className="text-white">{selectedServer.member_count ?? 0}</strong></div>
              <div>Kurulum: <strong className="text-white">{selectedServer.is_setup ? 'var' : 'yok'}</strong></div>
              <div>Ekonomi: <strong className="text-white">{selectedServer.economy_tier}</strong></div>
              <div>Admin Rol: <strong className="text-white">{selectedServer.admin_role_id ?? ''}</strong></div>
              <div>Verify Rol: <strong className="text-white">{selectedServer.verify_role_id ?? ''}</strong></div>
              <div>Market Saatleri: <strong className="text-white">{selectedServer.market_hours_enabled ? `${selectedServer.market_open_time ?? ''} - ${selectedServer.market_close_time ?? ''}` : 'kapalý'}</strong></div>
              <div>Zaman Dilimi: <strong className="text-white">{selectedServer.market_timezone ?? ''}</strong></div>
            </div>
          </>
        ) : (
          <p className="text-xs text-white/40">{t('developer_servers_hint')}</p>
        )}
      </div>
    </div>
  );

  const profilesSection = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-2 max-h-[520px] overflow-auto pr-1">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={`text-left rounded-lg border px-3 py-2 transition ${
                selectedProfile?.id === profile.id
                  ? 'border-[#5865F2]/50 bg-[#5865F2]/10'
                  : 'border-white/10 bg-black/20 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">{profile.user?.username ?? profile.user_id}</p>
                <span className="text-[10px] text-white/40">{formatDate(profile.created_at)}</span>
              </div>
              <p className="mt-1 text-[11px] text-white/40">{profile.guild_id}</p>
            </button>
          ))}
          {profiles.length === 0 && (
            <p className="text-xs text-white/40">{t('developer_profiles_empty')}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {selectedProfile ? (
          <>
            <p className="text-sm font-semibold text-white">{selectedProfile.user?.username ?? selectedProfile.user_id}</p>
            <p className="text-[11px] text-white/40">{selectedProfile.user_id}</p>
            <div className="mt-3 text-[11px] text-white/60 space-y-1">
              <div>Sunucu: <strong className="text-white">{selectedProfile.guild_id}</strong></div>
              <div>Etiket: <strong className="text-white">{selectedProfile.has_tag ? 'var' : 'yok'}</strong></div>
              <div>Booster: <strong className="text-white">{selectedProfile.is_booster ? 'evet' : 'hayýr'}</strong></div>
              <div>Davet: <strong className="text-white">{selectedProfile.total_invites ?? 0}</strong></div>
              <div>Referral: <strong className="text-white">{selectedProfile.referral_code ?? ''}</strong></div>
              <div>Hakkýnda: <strong className="text-white">{selectedProfile.about ?? ''}</strong></div>
            </div>
            <div className="mt-3 rounded-lg bg-black/30 p-3 text-[11px] text-white/60 whitespace-pre-wrap">
              <pre className="whitespace-pre-wrap">{prettyJson(selectedProfile)}</pre>
            </div>
          </>
        ) : (
          <p className="text-xs text-white/40">{t('developer_profiles_hint')}</p>
        )}
      </div>
    </div>
  );
  const adsSection = (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white mb-3">{t('developer_ads_title')}</p>

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
                {preview.online_count != null && <span>?? {preview.online_count.toLocaleString()} çevrimiçi</span>}
                {preview.member_count != null && <span>?? {preview.member_count.toLocaleString()} üye</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {adError && <p className="mt-2 text-xs text-red-400">{adError}</p>}
      {adSuccess && <p className="mt-2 text-xs text-emerald-400">Reklam yayýnlandý!</p>}

      {preview && (
        <button
          onClick={submitAd}
          disabled={adLoading}
          className="mt-3 w-full rounded-lg bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 px-3 py-2 text-xs font-semibold text-indigo-300 transition disabled:opacity-40"
        >
          {adLoading ? 'Yayýnlanýyor...' : 'Reklam Ver'}
        </button>
      )}

      {ads.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Mevcut Reklamlar</p>
          {ads.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{a.server_name}</p>
                <p className="text-[10px] text-white/30">{a.active ? '?? Görüntüleniyor' : '? Gizlendi'}</p>
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
  );

  const content = (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              activeTab === tab.id
                ? 'border-[#5865F2] bg-[#5865F2]/20 text-white'
                : 'border-white/10 text-white/60 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingTab && (
        <p className="text-xs text-white/40">{t('developer_panel_loading')}</p>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      {activeTab === 'overview' && (
        <div className="grid gap-3">
          {overviewCard}
          <div className="grid gap-3 lg:grid-cols-2">
            {maintenanceCard}
            {clearCard}
          </div>
        </div>
      )}

      {activeTab === 'logs' && logsSection}
      {activeTab === 'apps' && appsSection}
      {activeTab === 'servers' && serversSection}
      {activeTab === 'profiles' && profilesSection}
      {activeTab === 'ads' && adsSection}
    </div>
  );

  if (variant === 'page') {
    return (
      <div className="w-full max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
          {header}
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-50 flex h-full w-[520px] flex-col bg-[#0f1117] shadow-2xl">
        {header}
        {content}
      </div>
    </>
  );
}
