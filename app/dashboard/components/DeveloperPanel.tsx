'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LuLayoutDashboard, LuScrollText, LuTriangleAlert, LuClipboardList,
  LuServer, LuUsers, LuMegaphone, LuChevronLeft, LuRefreshCw,
  LuShield, LuSearch, LuTrash2, LuCheck, LuX, LuCopy, LuLink,
} from 'react-icons/lu';
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

type SuspiciousFlag = {
  id: string;
  guild_id?: string | null;
  user_id?: string | null;
  rule_key: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string | null;
  data?: Record<string, unknown> | null;
  status: string;
  discord_alerted: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
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
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR');
};

const prettyJson = (value: unknown) => {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

type TabId = 'overview' | 'logs' | 'apps' | 'servers' | 'profiles' | 'ads' | 'suspicious';

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ElementType; accent: string }[] = [
  { id: 'overview',   label: 'Genel Bakış',   Icon: LuLayoutDashboard, accent: 'text-[#7289da]' },
  { id: 'logs',       label: 'Loglar',         Icon: LuScrollText,      accent: 'text-emerald-400' },
  { id: 'suspicious', label: 'Şüpheli',        Icon: LuTriangleAlert,   accent: 'text-red-400' },
  { id: 'apps',       label: 'Başvurular',     Icon: LuClipboardList,   accent: 'text-amber-400' },
  { id: 'servers',    label: 'Sunucular',      Icon: LuServer,          accent: 'text-violet-400' },
  { id: 'profiles',   label: 'Profiller',      Icon: LuUsers,           accent: 'text-sky-400' },
  { id: 'ads',        label: 'Reklamlar',      Icon: LuMegaphone,       accent: 'text-pink-400' },
];

export default function DeveloperPanel({ maintenance, onMaintenanceChange, onClose, variant = 'panel' }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loadingTab, setLoadingTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [economyApps, setEconomyApps] = useState<EconomyApp[]>([]);
  const [tierApps, setTierApps] = useState<EconomyTierApp[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [thresholds, setThresholds] = useState({ voteThreshold: 120, directMemberThreshold: 500, autoApproveDays: 7 });
  const [suspiciousFlags, setSuspiciousFlags] = useState<SuspiciousFlag[]>([]);
  const [suspiciousFilter, setSuspiciousFilter] = useState<string>('open');
  const [suspiciousScanLoading, setSuspiciousScanLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; expires: string } | null>(null);
  const [thresholdInputs, setThresholdInputs] = useState({ voteThreshold: '120', directMemberThreshold: '500', autoApproveDays: '7' });
  const [thresholdSaving, setThresholdSaving] = useState<string | null>(null);
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

  useEffect(() => { fetchSection('overview'); }, []);
  useEffect(() => { if (activeTab !== 'overview') fetchSection(activeTab); }, [activeTab]);
  useEffect(() => { if (activeTab === 'ads') fetchAds(); }, [activeTab]);

  const fetchSection = async (section: TabId) => {
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
        if (data.thresholds) {
          setThresholds(data.thresholds);
          setThresholdInputs({
            voteThreshold: String(data.thresholds.voteThreshold),
            directMemberThreshold: String(data.thresholds.directMemberThreshold),
            autoApproveDays: String(data.thresholds.autoApproveDays),
          });
        }
      } else if (section === 'servers') {
        setServers(data.servers ?? []);
        setSelectedServer(null);
      } else if (section === 'profiles') {
        setProfiles(data.profiles ?? []);
        setSelectedProfile(null);
      } else if (section === 'suspicious') {
        await fetchSuspicious(suspiciousFilter);
        return;
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
    setAdLoading(true); setAdError(null); setAdSuccess(false);
    try {
      const res = await fetch(apiUrl('/api/admin/ads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(preview),
      });
      const data = await res.json() as { ad?: Ad; error?: string };
      if (!res.ok) throw new Error(data.error ?? `${res.status}`);
      setAdSuccess(true); setInviteUrl(''); setPreview(null);
      if (data.ad) setAds(prev => [data.ad!, ...prev.map(a => ({ ...a, active: false }))]);
    } catch (e) {
      setAdError(e instanceof Error ? e.message : String(e));
    } finally { setAdLoading(false); }
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

  const clearSession = async () => {
    setClearLoading(true);
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'include' });
    } catch {}
    try {
      ['discord_bearer_token','discordUser','auth_ready','selectedGuildId','discord_frame_id','discord_instance_id'].forEach(k => localStorage.removeItem(k));
    } catch {}
    ['discord_session','csrf_token','selected_guild_id'].forEach(name => {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    });
    window.location.reload();
  };

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true); setError(null);
    try {
      const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
      const res = await fetch(apiUrl('/api/activity/maintenance'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ enabled: !maintenance }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json() as { maintenance: boolean };
      onMaintenanceChange(data.maintenance);
    } catch (e) {
      setError(`${t('developer_panel_error_prefix')} ${e instanceof Error ? e.message : String(e)}`);
    } finally { setMaintenanceLoading(false); }
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
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const saveThreshold = async (configKey: string, value: string) => {
    setThresholdSaving(configKey);
    try {
      const res = await fetch(apiUrl('/api/admin/dev-panel'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'set_config', configKey, configValue: parseInt(value, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setThresholds((prev) => ({ ...prev, [configKey.replace('economy_', '').replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as keyof typeof thresholds]: data.value }));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setThresholdSaving(null); }
  };

  const fetchSuspicious = async (statusFilter = suspiciousFilter) => {
    setLoadingTab(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/suspicious?status=${statusFilter}&limit=100`), { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setSuspiciousFlags(data.flags ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingTab(false); }
  };

  const runScan = async () => {
    setSuspiciousScanLoading(true); setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/suspicious'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchSuspicious('open'); setSuspiciousFilter('open');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setSuspiciousScanLoading(false); }
  };

  const updateFlagStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(apiUrl('/api/admin/suspicious'), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSuspiciousFlags((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  const generateInvite = async (guildId: string) => {
    setInviteLoading(true); setInviteResult(null); setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/dev-panel/invite'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ guild_id: guildId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setInviteResult({ url: data.invite_url, expires: data.expires_at ?? '' });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setInviteLoading(false); }
  };

  const handleDecision = async (table: 'economy_applications' | 'economy_tier_applications', id: string, action: 'approve' | 'reject') => {
    const reason = action === 'reject' ? window.prompt(t('developer_panel_reject_reason_placeholder')) ?? '' : undefined;
    try {
      const res = await fetch(apiUrl('/api/admin/dev-panel'), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ action, table, id, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchSection('apps');
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };

  /* ─── SECTION RENDERERS ─── */

  const overviewSection = (
    <div className="flex flex-col gap-5">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#5865F2]/8 rounded-full blur-[80px] pointer-events-none" />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          { label: t('developer_stat_users'),    value: overview?.userCount,           color: 'from-[#5865F2]/20 to-[#5865F2]/5  border-[#5865F2]/20',  text: 'text-[#7289da]' },
          { label: t('developer_stat_servers'),  value: overview?.serverCount,         color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20', text: 'text-emerald-400' },
          { label: t('developer_stat_profiles'), value: overview?.profileCount,        color: 'from-amber-500/20 to-amber-500/5  border-amber-500/20',  text: 'text-amber-400' },
          { label: t('developer_stat_advanced'), value: overview?.advancedServerCount, color: 'from-violet-500/20 to-violet-500/5 border-violet-500/20', text: 'text-violet-400' },
        ]).map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${s.color} p-4`}>
            <p className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{s.label}</p>
            <p className={`mt-2 text-3xl font-bold ${s.text}`}>
              {s.value != null ? s.value.toLocaleString('tr-TR') : <span className="text-white/20">—</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Maintenance */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
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
              className={`relative h-7 w-12 rounded-full transition-colors duration-200 disabled:opacity-50 ${maintenance ? 'bg-[#5865F2]' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${maintenance ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {maintenance && (
            <p className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
              {t('developer_panel_maintenance_warning')}
            </p>
          )}
        </div>

        {/* Clear session */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
          <p className="text-sm font-semibold text-white">{t('developer_panel_clear_title')}</p>
          <p className="mt-0.5 text-xs text-white/40 mb-4">{t('developer_panel_clear_desc')}</p>
          <button
            onClick={clearSession}
            disabled={clearLoading}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400 transition disabled:opacity-50"
          >
            {clearLoading ? t('developer_panel_clear_loading') : t('developer_panel_clear_action')}
          </button>
        </div>
      </div>
    </div>
  );

  const logsSection = (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {['all','auth_login','auth_logout','new_user','new_server','bug','suggestion','error_log','client_error'].map((type) => (
            <button key={type} onClick={() => setLogFilter(type)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${logFilter === type ? 'border-[#5865F2]/50 bg-[#5865F2]/20 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {type === 'all' ? t('developer_logs_all') : type}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredLogs.map((log) => (
            <button key={log.id} onClick={() => setSelectedLog(log)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-all ${selectedLog?.id === log.id ? 'border-[#5865F2]/40 bg-[#5865F2]/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white truncate">{log.title}</p>
                <span className="shrink-0 text-[10px] text-white/30">{formatDate(log.created_at)}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/40">{log.type}</p>
            </button>
          ))}
          {filteredLogs.length === 0 && <p className="text-xs text-white/30 py-4 text-center">{t('developer_logs_empty')}</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        {selectedLog ? (
          <>
            <p className="text-sm font-bold text-white">{selectedLog.title}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{formatDate(selectedLog.created_at)}</p>
            <div className="mt-3 rounded-xl bg-black/40 border border-white/[0.06] p-3 text-[11px] text-white/60 max-h-[400px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">{prettyJson(selectedLog.data)}</pre>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-white/25">{t('developer_logs_hint')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const appsSection = (
    <div className="flex flex-col gap-4">
      {/* Auto approve + thresholds */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">{t('developer_apps_auto_title')}</p>
            <p className="text-xs text-white/40">{t('developer_apps_auto_desc')}</p>
          </div>
          <button onClick={() => setAutoApproveFlag(!autoApprove)}
            className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${autoApprove ? 'bg-emerald-500' : 'bg-white/20'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${autoApprove ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="grid gap-2.5">
          {([
            { key: 'economy_vote_threshold',          label: 'Oy Eşiği',               stateKey: 'voteThreshold' },
            { key: 'economy_direct_member_threshold', label: 'Direkt Üye Eşiği',       stateKey: 'directMemberThreshold' },
            { key: 'economy_auto_approve_days',       label: 'Otomatik Onay Günü',     stateKey: 'autoApproveDays' },
          ] as const).map(({ key, label, stateKey }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="flex-1 text-xs text-white/50">{label}</span>
              <input type="number" min={1} value={thresholdInputs[stateKey]}
                onChange={(e) => setThresholdInputs((p) => ({ ...p, [stateKey]: e.target.value }))}
                className="w-24 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white focus:border-[#5865F2]/50 focus:outline-none" />
              <button onClick={() => saveThreshold(key, thresholdInputs[stateKey])} disabled={thresholdSaving === key}
                className="rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-3 py-1.5 text-[11px] font-medium text-[#7289da] transition disabled:opacity-50">
                {thresholdSaving === key ? '...' : 'Kaydet'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Economy apps */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
        <p className="text-sm font-semibold text-white mb-3">{t('developer_apps_economy_title')}</p>
        <div className="flex flex-col gap-2">
          {economyApps.map((app) => (
            <div key={app.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-bold text-white">{app.server?.name ?? app.guild_id}</p>
                  <p className="text-[10px] text-white/30">{app.guild_id}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${app.status === 'pending' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-white/10 text-white/40'}`}>{app.status}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-white/50 mb-3">
                <span>Üye: <strong className="text-white">{app.criteria?.memberCount ?? 0}</strong></span>
                <span>Oy: <strong className="text-white">{app.criteria?.voteCount ?? 0}</strong>/{app.criteria?.voteThreshold ?? 120}</span>
                <span>Kurulum: <strong className={app.criteria?.isSetup ? 'text-emerald-400' : 'text-red-400'}>{app.criteria?.isSetup ? 'var' : 'yok'}</strong></span>
                <span>Uygun: <strong className={app.criteria?.eligible ? 'text-emerald-400' : 'text-red-400'}>{app.criteria?.eligible ? 'evet' : 'hayır'}</strong></span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDecision('economy_applications', app.id, 'approve')}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-300 transition">
                  <LuCheck className="w-3 h-3" />{t('developer_apps_approve')}
                </button>
                <button onClick={() => handleDecision('economy_applications', app.id, 'reject')}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-300 transition">
                  <LuX className="w-3 h-3" />{t('developer_apps_reject')}
                </button>
              </div>
            </div>
          ))}
          {economyApps.length === 0 && <p className="text-xs text-white/30 py-3 text-center">{t('developer_apps_empty')}</p>}
        </div>
      </div>

      {/* Tier apps */}
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
        <p className="text-sm font-semibold text-white mb-3">{t('developer_apps_tier_title')}</p>
        <div className="flex flex-col gap-2">
          {tierApps.map((app) => (
            <div key={app.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-bold text-white">{app.server?.name ?? app.guild_id}</p>
                  <p className="text-[10px] text-white/30">{app.guild_id}</p>
                </div>
                <span className="text-[10px] text-white/30">{formatDate(app.created_at)}</span>
              </div>
              <p className="text-[11px] text-white/50 mb-3">Başvuran: <strong className="text-white">{app.applicant_user_id}</strong></p>
              <div className="flex gap-2">
                <button onClick={() => handleDecision('economy_tier_applications', app.id, 'approve')}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-300 transition">
                  <LuCheck className="w-3 h-3" />{t('developer_apps_approve')}
                </button>
                <button onClick={() => handleDecision('economy_tier_applications', app.id, 'reject')}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 text-[11px] font-medium text-red-300 transition">
                  <LuX className="w-3 h-3" />{t('developer_apps_reject')}
                </button>
              </div>
            </div>
          ))}
          {tierApps.length === 0 && <p className="text-xs text-white/30 py-3 text-center">{t('developer_apps_empty')}</p>}
        </div>
      </div>
    </div>
  );

  const serversSection = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
          {servers.map((server) => (
            <button key={server.discord_id} onClick={() => setSelectedServer(server)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-all ${selectedServer?.discord_id === server.discord_id ? 'border-[#5865F2]/40 bg-[#5865F2]/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-white truncate">{server.name}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold border ${server.economy_tier === 'advanced' ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-white/10 text-white/30'}`}>
                  {server.economy_tier}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">{server.discord_id}</p>
              <div className="mt-1 flex gap-3 text-[10px] text-white/40">
                <span>{server.member_count ?? 0} üye</span>
                <span className={server.is_setup ? 'text-emerald-400' : 'text-white/25'}>{server.is_setup ? 'kurulu' : 'kurulmamış'}</span>
              </div>
            </button>
          ))}
          {servers.length === 0 && <p className="text-xs text-white/30 py-4 text-center">{t('developer_servers_empty')}</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        {selectedServer ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold text-white">{selectedServer.name}</p>
              <p className="text-[11px] text-white/30 mt-0.5">{selectedServer.discord_id}</p>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/[0.06] p-3 grid gap-2 text-[11px]">
              {([
                ['Üye', `${selectedServer.member_count ?? 0}`],
                ['Kurulum', selectedServer.is_setup ? 'var' : 'yok'],
                ['Ekonomi', selectedServer.economy_tier],
                ['Admin Rol', selectedServer.admin_role_id ?? '—'],
                ['Verify Rol', selectedServer.verify_role_id ?? '—'],
                ['Market', selectedServer.market_hours_enabled ? `${selectedServer.market_open_time ?? ''}-${selectedServer.market_close_time ?? ''}` : 'kapalı'],
                ['Timezone', selectedServer.market_timezone ?? '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-white/40">{k}</span>
                  <span className="font-semibold text-white text-right">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setInviteResult(null); generateInvite(selectedServer.discord_id); }} disabled={inviteLoading}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-4 py-2.5 text-xs font-semibold text-[#7289da] transition disabled:opacity-50">
              <LuLink className="w-3.5 h-3.5" />
              {inviteLoading ? 'Oluşturuluyor...' : 'Davet Oluştur (1 kullanım · 10 dk)'}
            </button>
            {inviteResult && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-[11px] font-bold text-emerald-300 mb-1.5">Davet hazır!</p>
                <a href={inviteResult.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline break-all">{inviteResult.url}</a>
                {inviteResult.expires && <p className="text-[10px] text-white/30 mt-1">Geçerlilik: {formatDate(inviteResult.expires)}</p>}
                <button onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[10px] text-white/60 transition">
                  <LuCopy className="w-3 h-3" /> Kopyala
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-white/25">{t('developer_servers_hint')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const profilesSection = (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        <div className="flex flex-col gap-1.5 max-h-[560px] overflow-y-auto pr-1">
          {profiles.map((profile) => (
            <button key={profile.id} onClick={() => setSelectedProfile(profile)}
              className={`text-left rounded-xl border px-3 py-2.5 transition-all ${selectedProfile?.id === profile.id ? 'border-[#5865F2]/40 bg-[#5865F2]/10' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-white">{profile.user?.username ?? profile.user_id}</p>
                <span className="text-[10px] text-white/30">{formatDate(profile.created_at)}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">{profile.guild_id}</p>
            </button>
          ))}
          {profiles.length === 0 && <p className="text-xs text-white/30 py-4 text-center">{t('developer_profiles_empty')}</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        {selectedProfile ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-bold text-white">{selectedProfile.user?.username ?? selectedProfile.user_id}</p>
              <p className="text-[11px] text-white/30">{selectedProfile.user_id}</p>
            </div>
            <div className="rounded-xl bg-black/30 border border-white/[0.06] p-3 grid gap-2 text-[11px]">
              {([
                ['Sunucu', selectedProfile.guild_id],
                ['Etiket', selectedProfile.has_tag ? 'var' : 'yok'],
                ['Booster', selectedProfile.is_booster ? 'evet' : 'hayır'],
                ['Davet', String(selectedProfile.total_invites ?? 0)],
                ['Referral', selectedProfile.referral_code ?? '—'],
                ['Hakkında', selectedProfile.about ?? '—'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-white/40">{k}</span>
                  <span className="font-semibold text-white text-right truncate max-w-[140px]">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-black/40 border border-white/[0.06] p-3 max-h-[180px] overflow-y-auto">
              <pre className="text-[10px] text-white/50 whitespace-pre-wrap font-mono">{prettyJson(selectedProfile)}</pre>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-white/25">{t('developer_profiles_hint')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const SEVERITY_STYLE: Record<string, string> = {
    low:      'border-[#5865F2]/25 bg-[#5865F2]/8  text-[#7289da]',
    medium:   'border-amber-500/25 bg-amber-500/8  text-amber-300',
    high:     'border-orange-500/25 bg-orange-500/8 text-orange-300',
    critical: 'border-red-500/25  bg-red-500/8   text-red-300',
  };

  const suspiciousSection = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {['open','reviewed','dismissed','actioned','all'].map((s) => (
            <button key={s} onClick={() => { setSuspiciousFilter(s); fetchSuspicious(s); }}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${suspiciousFilter === s ? 'border-[#5865F2]/50 bg-[#5865F2]/20 text-white' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={runScan} disabled={suspiciousScanLoading}
          className="flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-300 transition disabled:opacity-50">
          <LuSearch className="w-3.5 h-3.5" />
          {suspiciousScanLoading ? 'Taranıyor...' : 'Şimdi Tara'}
        </button>
      </div>
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
        {suspiciousFlags.map((flag) => (
          <div key={flag.id} className={`rounded-2xl border p-4 ${SEVERITY_STYLE[flag.severity] ?? 'border-white/10 bg-white/5 text-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_STYLE[flag.severity] ?? ''}`}>{flag.severity}</span>
                  <span className="text-[10px] text-white/30">{flag.rule_key}</span>
                  {flag.discord_alerted && <span className="text-[10px] text-indigo-400">Discord</span>}
                </div>
                <p className="text-xs font-bold text-white">{flag.title}</p>
                {flag.description && <p className="mt-0.5 text-[11px] text-white/50">{flag.description}</p>}
                <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-white/30">
                  {flag.guild_id && <span>Sunucu: {flag.guild_id}</span>}
                  {flag.user_id && <span>Kullanıcı: {flag.user_id}</span>}
                  <span>{formatDate(flag.created_at)}</span>
                </div>
              </div>
              {flag.status === 'open' && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {[
                    { status: 'reviewed',  label: 'İncelendi',    cls: 'border-sky-400/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' },
                    { status: 'actioned',  label: 'İşlem Alındı', cls: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' },
                    { status: 'dismissed', label: 'Yoksay',       cls: 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10' },
                  ].map((btn) => (
                    <button key={btn.status} onClick={() => updateFlagStatus(flag.id, btn.status)}
                      className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition ${btn.cls}`}>
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {suspiciousFlags.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-white/25">
            <LuShield className="w-8 h-8" />
            <p className="text-xs">Kayıtlı şüpheli hareket yok. Tarama başlatmak için &quot;Şimdi Tara&quot; butonunu kullan.</p>
          </div>
        )}
      </div>
    </div>
  );

  const adsSection = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
        <p className="text-sm font-semibold text-white mb-3">{t('developer_ads_title')}</p>
        <div className="flex gap-2">
          <input type="text" placeholder="discord.gg/... davet linki" value={inviteUrl}
            onChange={e => { setInviteUrl(e.target.value); setAdSuccess(false); setAdError(null); setPreview(null); }}
            onBlur={e => { if (e.target.value) fetchInviteInfo(e.target.value); }}
            className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none focus:border-[#5865F2]/40" />
          <button onClick={() => fetchInviteInfo(inviteUrl)} disabled={adFetching || !inviteUrl}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 text-xs text-white/60 transition hover:text-white disabled:opacity-40">
            {adFetching ? '...' : 'Getir'}
          </button>
        </div>
        {preview && (
          <div className="mt-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 p-3 flex items-center gap-3">
            {preview.server_icon
              ? <img src={preview.server_icon} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
              : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/25 text-sm font-black text-white">{preview.server_name.charAt(0)}</div>
            }
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{preview.server_name}</p>
              {preview.server_description && <p className="text-[10px] text-white/40 truncate">{preview.server_description}</p>}
              <div className="mt-0.5 flex gap-3 text-[10px] text-white/30">
                {preview.online_count != null && <span>{preview.online_count.toLocaleString()} çevrimiçi</span>}
                {preview.member_count != null && <span>{preview.member_count.toLocaleString()} üye</span>}
              </div>
            </div>
          </div>
        )}
        {adError && <p className="mt-2 text-xs text-red-400">{adError}</p>}
        {adSuccess && <p className="mt-2 text-xs text-emerald-400">Reklam yayınlandı!</p>}
        {preview && (
          <button onClick={submitAd} disabled={adLoading}
            className="mt-3 w-full rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-4 py-2.5 text-xs font-bold text-[#7289da] transition disabled:opacity-50">
            {adLoading ? 'Yayınlanıyor...' : 'Reklam Ver'}
          </button>
        )}
      </div>
      {ads.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Mevcut Reklamlar</p>
          <div className="flex flex-col gap-2">
            {ads.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{a.server_name}</p>
                  <p className={`text-[10px] ${a.active ? 'text-emerald-400' : 'text-white/30'}`}>{a.active ? 'Görüntüleniyor' : 'Gizlendi'}</p>
                </div>
                <button onClick={() => deleteAd(a.id)}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[10px] text-red-400 transition">
                  <LuTrash2 className="w-3 h-3" /> Sil
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const SECTION_CONTENT: Record<TabId, React.ReactNode> = {
    overview:   overviewSection,
    logs:       logsSection,
    apps:       appsSection,
    servers:    serversSection,
    profiles:   profilesSection,
    ads:        adsSection,
    suspicious: suspiciousSection,
  };

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)!;

  /* ─── LAYOUT ─── */

  const inner = (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="sticky top-0 h-full w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0d12] hidden md:flex">
        {/* Logo / back */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-[#7289da]">
                <path fillRule="evenodd" d="M8.837 1.626c-.246-.835-1.428-.835-1.674 0l-1.32 4.064H1.8c-.88 0-1.245 1.128-.534 1.64l3.353 2.437-1.28 3.94c-.255.785.643 1.436 1.31.967L8 12.09l3.352 2.584c.666.469 1.564-.182 1.309-.967l-1.28-3.94 3.353-2.437c.711-.512.346-1.64-.534-1.64H11.157L8.837 1.626z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white">Dev Panel</span>
          </div>
          <button onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-white/70 transition"
            title="Geri dön">
            <LuChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, Icon, accent }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 ${active ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/[0.06] hover:text-white/75'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${active ? accent : 'text-white/30 group-hover:text-white/60'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium leading-none">{label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/50" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-[#0e1018]">
        {/* Section header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0e1018] px-5">
          <div className="flex items-center gap-2.5">
            <span className={`${activeNav.accent}`}><activeNav.Icon className="h-4 w-4" /></span>
            <span className="text-sm font-bold text-white">{activeNav.label}</span>
            {loadingTab && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />}
          </div>
          <button onClick={() => fetchSection(activeTab)} disabled={loadingTab}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs text-white/50 transition hover:text-white/80 disabled:opacity-40">
            <LuRefreshCw className={`h-3 w-3 ${loadingTab ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        {/* Mobile tab bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] bg-[#0b0d12] px-3 py-2 md:hidden">
          {NAV_ITEMS.map(({ id, label, Icon, accent }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === id ? `bg-white/10 text-white border border-white/15` : 'text-white/40 border border-transparent hover:text-white/70'}`}>
              <span className={activeTab === id ? accent : 'text-white/25'}><Icon className="h-3.5 w-3.5" /></span>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 relative">
          {/* Glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-[#5865F2]/5 rounded-full blur-[100px]" />

          {error && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
              <LuTriangleAlert className="h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {SECTION_CONTENT[activeTab]}
        </main>
      </div>
    </div>
  );

  if (variant === 'page') {
    return (
      <div className="h-[calc(100vh-0px)] bg-[#0b0d12] text-white overflow-hidden flex flex-col">
        {inner}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[680px] flex-col bg-[#0b0d12] text-white shadow-2xl border-l border-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        {inner}
      </div>
    </>
  );
}
