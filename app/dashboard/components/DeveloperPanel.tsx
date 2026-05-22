'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LuLayoutDashboard, LuScrollText, LuTriangleAlert, LuClipboardList,
  LuServer, LuUsers, LuMegaphone, LuChevronLeft, LuRefreshCw,
  LuShield, LuSearch, LuTrash2, LuCheck, LuX, LuCopy, LuLink, LuBug, LuMessageSquare, LuListChecks,
} from 'react-icons/lu';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';
import DeveloperSidebarNav from '@/app/developer/components/DeveloperSidebarNav';
import DeveloperHeader from '@/app/developer/components/DeveloperHeader';
import AIFixPanel from '@/app/developer/components/AIFixPanel';
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

type TabId = 'overview' | 'logs' | 'apps' | 'servers' | 'profiles' | 'ads' | 'suspicious' | 'reports' | 'bans' | 'announcements' | 'weeklyTasks';

type BugReport = {
  id: string;
  user_id: string;
  guild_id?: string | null;
  type: 'bug' | 'suggestion';
  section?: string | null;
  description: string;
  status: string;
  dev_note?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type AnnouncementAdminItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
  poll?: {
    id: string;
    question: string;
    options: Array<{ id: string; label: string; position: number; voteCount: number }>;
  } | null;
};

type BanScope = 'member' | 'server';

type WeeklyTaskType = 'join_guild' | 'message_count' | 'voice_minutes' | 'role' | 'event_participation';

type WeeklyTaskAdmin = {
  id: string;
  guild_id: string;
  guild_name?: string | null;
  week_start: string;
  title: string;
  description: string | null;
  requirement_type: WeeklyTaskType;
  requirement_value: number | null;
  requirement_role_id: string | null;
  requirement_target_guild_id: string | null;
  reward_mari: number;
  sort_order: number;
  active: boolean;
};

type MemberBan = {
  id: string;
  user_id: string;
  guild_id?: string | null;
  reason?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  expires_at?: string | null;
  lifted_at?: string | null;
  lifted_by?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ServerBan = {
  id: string;
  guild_id: string;
  reason?: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  expires_at?: string | null;
  lifted_at?: string | null;
  lifted_by?: string | null;
  metadata?: Record<string, unknown> | null;
};

const NAV_ITEMS: { id: TabId; labelKey: string; Icon: React.ElementType; accent: string }[] = [
  { id: 'overview',   labelKey: 'dev_nav_overview',   Icon: LuLayoutDashboard, accent: 'text-[#7289da]' },
  { id: 'logs',       labelKey: 'dev_nav_logs',       Icon: LuScrollText,      accent: 'text-emerald-400' },
  { id: 'suspicious', labelKey: 'dev_nav_suspicious', Icon: LuTriangleAlert,   accent: 'text-red-400' },
  { id: 'apps',       labelKey: 'dev_nav_apps',       Icon: LuClipboardList,   accent: 'text-amber-400' },
  { id: 'servers',    labelKey: 'dev_nav_servers',    Icon: LuServer,          accent: 'text-violet-400' },
  { id: 'profiles',   labelKey: 'dev_nav_profiles',   Icon: LuUsers,           accent: 'text-sky-400' },
  { id: 'ads',        labelKey: 'dev_nav_ads',        Icon: LuMegaphone,       accent: 'text-pink-400' },
  { id: 'weeklyTasks', labelKey: 'dev_nav_weekly_tasks', Icon: LuListChecks,     accent: 'text-emerald-400' },
  { id: 'announcements', labelKey: 'dev_nav_announcements', Icon: LuMessageSquare, accent: 'text-cyan-300' },
  { id: 'reports',    labelKey: 'dev_nav_reports',    Icon: LuBug,             accent: 'text-orange-400' },
  { id: 'bans',       labelKey: 'dev_nav_bans',       Icon: LuShield,          accent: 'text-rose-400' },
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
  const [reports, setReports] = useState<BugReport[]>([]);
  const [reportFilter, setReportFilter] = useState<string>('open');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [reportNoteInputs, setReportNoteInputs] = useState<Record<string, string>>({});
  const [reportUpdating, setReportUpdating] = useState<string | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adLoading, setAdLoading] = useState(false);
  const [adFetching, setAdFetching] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [adSuccess, setAdSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [preview, setPreview] = useState<Omit<Ad, 'id' | 'active'> | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementAdminItem[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);
  const [announcementForm, setAnnouncementForm] = useState<{
    title: string;
    body: string;
    mediaUrl: string;
    linkUrl: string;
    pollQuestion: string;
    pollOptions: string;
  }>({
    title: '',
    body: '',
    mediaUrl: '',
    linkUrl: '',
    pollQuestion: '',
    pollOptions: '',
  });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [announcementView, setAnnouncementView] = useState<'list' | 'editor'>('list');
  const [announcementSaving, setAnnouncementSaving] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);
  const [announcementDeleteLoadingId, setAnnouncementDeleteLoadingId] = useState<string | null>(null);
  const [banScope, setBanScope] = useState<BanScope>('member');
  const [memberBans, setMemberBans] = useState<MemberBan[]>([]);
  const [serverBans, setServerBans] = useState<ServerBan[]>([]);
  const [banActiveOnly, setBanActiveOnly] = useState(true);
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyTaskAdmin[]>([]);
  const [weeklyTasksLoading, setWeeklyTasksLoading] = useState(false);
  const [weeklyTasksError, setWeeklyTasksError] = useState<string | null>(null);
  const [weeklyTaskCreating, setWeeklyTaskCreating] = useState(false);
  const [weeklyTaskSuccess, setWeeklyTaskSuccess] = useState<string | null>(null);
  const [weeklyTaskForm, setWeeklyTaskForm] = useState({
    guildId: '',
    title: '',
    description: '',
    requirementType: 'message_count' as WeeklyTaskType,
    requirementValue: '10',
    requirementRoleId: '',
    requirementTargetGuildId: '',
    rewardMari: '10',
    sortOrder: '0',
    active: true,
  });
  const [banSortBy, setBanSortBy] = useState<'created_at' | 'expires_at'>('created_at');
  const [banSortDir, setBanSortDir] = useState<'desc' | 'asc'>('desc');
  const [banSearch, setBanSearch] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [banLiftingId, setBanLiftingId] = useState<string | null>(null);
  const [memberBanMode, setMemberBanMode] = useState<'temporary' | 'permanent'>('permanent');
  const [serverBanMode, setServerBanMode] = useState<'temporary' | 'permanent'>('permanent');
  const [memberBanForm, setMemberBanForm] = useState({ userId: '', guildId: '', reason: '', expiresAt: '' });
  const [serverBanForm, setServerBanForm] = useState({ guildId: '', reason: '', expiresAt: '' });

  const MEMBER_BAN_REASONS = [
    'Bot veya exploit kullanarak hile yapmak',
    'Hesap güvenliğini ihlal etmek (çoklu hesap, paylaşım)',
    'Ekonomik dolandırıcılık yapmak (sahte işlemler, manipülasyon)',
    'Sistemi kandırmaya yönelik hareketler (bot kullanımı, script)',
    'Süpheli aktiviteler sergilemek (anormal işlem sıklığı)',
    'Rate limiting kurallarını ihlal etmek (çok fazla işlem)',
    'Diğer üyeleri etkilemek (negatif davranış)',
    'Sunucu kurallarını ihlal etmek',
    'Aktivite katılım koşullarını karşılamamak',
  ];

  const SERVER_BAN_REASONS = [
    'Bot kötüye kullanımı veya exploit gerçekleştirmek',
    'Güvenlik ihlali gerçekleştirmek (veri sızıntısı, hack)',
    'Yönetim kararına uymamak (uyarılara rağmen devam)',
    'Ekonomik sistemi manipüle etmek (borsa manipülasyonu)',
    'Süpheli aktiviteler barındırmak (dolandırıcılık merkezi)',
    'Sunucu kurallarını ciddi şekilde ihlal etmek',
    'Aktivite katılım koşullarını karşılamamak',
    'Diğer sunucuları etkilemek (negatif etki)',
  ];

  async function fetchAnnouncements() {
    setAnnouncementsLoading(true);
    setAnnouncementsError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/announcements?lang=tr'), { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setAnnouncements(data.announcements ?? []);
    } catch (e) {
      setAnnouncementsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnnouncementsLoading(false);
    }
  }

  async function fetchSection(section: TabId) {
    if (section === 'announcements') {
      await fetchAnnouncements();
      return;
    }
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
      } else if (section === 'weeklyTasks') {
        await fetchWeeklyTasks();
        return;
      } else if (section === 'suspicious') {
        await fetchSuspicious(suspiciousFilter);
        return;
      } else if (section === 'reports') {
        await fetchReports(reportFilter, reportTypeFilter);
        return;
      } else if (section === 'bans') {
        await fetchBans();
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTab(false);
    }
  }

  const fetchWeeklyTasks = async () => {
    setWeeklyTasksLoading(true);
    setWeeklyTasksError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/weekly-tasks'), { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setWeeklyTasks(data.tasks ?? []);
    } catch (e) {
      setWeeklyTasksError(e instanceof Error ? e.message : String(e));
    } finally {
      setWeeklyTasksLoading(false);
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
      if (!res.ok) throw new Error(t('dev_invalid_invite'));
      const data = await res.json() as {
        guild?: { name?: string; description?: string | null; icon?: string | null; id?: string };
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };
      const guild = data.guild;
      if (!guild) throw new Error(t('dev_server_info_error'));
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
      setAdError(e instanceof Error ? e.message : t('dev_invite_info_error'));
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

  const createWeeklyTask = async () => {
    setWeeklyTaskCreating(true);
    setWeeklyTaskSuccess(null);
    setWeeklyTasksError(null);
    try {
      const payload = {
        guild_id: weeklyTaskForm.guildId.trim(),
        title: weeklyTaskForm.title.trim(),
        description: weeklyTaskForm.description.trim(),
        requirement_type: weeklyTaskForm.requirementType,
        requirement_value: weeklyTaskForm.requirementValue ? Number(weeklyTaskForm.requirementValue) : null,
        requirement_role_id: weeklyTaskForm.requirementRoleId.trim() || null,
        requirement_target_guild_id: weeklyTaskForm.requirementTargetGuildId.trim() || null,
        reward_mari: Number(weeklyTaskForm.rewardMari),
        sort_order: Number(weeklyTaskForm.sortOrder),
        active: weeklyTaskForm.active,
      };
      const res = await fetch(apiUrl('/api/admin/weekly-tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setWeeklyTaskSuccess('Weekly task created successfully.');
      setWeeklyTaskForm({
        guildId: '',
        title: '',
        description: '',
        requirementType: 'message_count',
        requirementValue: '10',
        requirementRoleId: '',
        requirementTargetGuildId: '',
        rewardMari: '10',
        sortOrder: '0',
        active: true,
      });
      await fetchWeeklyTasks();
    } catch (e) {
      setWeeklyTasksError(e instanceof Error ? e.message : String(e));
    } finally {
      setWeeklyTaskCreating(false);
    }
  };

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/admin/ads'), { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setAds(data.ads ?? []);
    } catch {}
  }, []);

  const buildAnnouncementBody = ({
    content,
    mediaUrl,
    linkUrl,
    pollQuestion,
    pollOptions,
  }: {
    content: string;
    mediaUrl: string;
    linkUrl: string;
    pollQuestion: string;
    pollOptions: string;
  }) => {
    const sections: string[] = [content.trim()];

    if (mediaUrl.trim()) {
      sections.push(`Medya: ${mediaUrl.trim()}`);
    }
    if (linkUrl.trim()) {
      sections.push(`Link: ${linkUrl.trim()}`);
    }
    if (pollQuestion.trim()) {
      const options = pollOptions
        .split('\n')
        .map((option) => option.trim())
        .filter(Boolean);
      const pollLines = [`Anket: ${pollQuestion.trim()}`, ...options.map((option) => `- ${option}`)];
      sections.push(pollLines.join('\n'));
    }

    return sections.filter(Boolean).join('\n\n');
  };

  const parseAnnouncementBody = (body: string) => {
    const lines = body.split('\n');
    let mediaUrl = '';
    let linkUrl = '';
    const filtered: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith('medya:')) {
        mediaUrl = trimmed.slice(6).trim();
        return;
      }
      if (trimmed.toLowerCase().startsWith('link:')) {
        linkUrl = trimmed.slice(5).trim();
        return;
      }
      filtered.push(line);
    });

    return {
      body: filtered.join('\n').trim(),
      mediaUrl,
      linkUrl,
    };
  };

  const resetAnnouncementForm = () => {
    setAnnouncementError(null);
    setAnnouncementSuccess(null);
    setEditingAnnouncementId(null);
    setAnnouncementForm({ title: '', body: '', mediaUrl: '', linkUrl: '', pollQuestion: '', pollOptions: '' });
  };

  const startEditAnnouncement = (announcement: AnnouncementAdminItem) => {
    const parsed = parseAnnouncementBody(announcement.content);
    const pollQuestion = announcement.poll?.question ?? '';
    const pollOptions = announcement.poll?.options
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((option) => option.label)
      .join('\n') ?? '';
    setEditingAnnouncementId(announcement.id);
    setAnnouncementForm({
      title: announcement.title,
      body: parsed.body,
      mediaUrl: parsed.mediaUrl,
      linkUrl: parsed.linkUrl,
      pollQuestion,
      pollOptions,
    });
    setAnnouncementError(null);
    setAnnouncementSuccess(null);
    setAnnouncementView('editor');
  };

  const saveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.body.trim()) {
      setAnnouncementError('Başlık ve içerik zorunludur.');
      return;
    }
    setAnnouncementSaving(true);
    setAnnouncementError(null);
    setAnnouncementSuccess(null);
    try {
      const payload = {
        title: announcementForm.title.trim(),
        body: buildAnnouncementBody({
          content: announcementForm.body,
          mediaUrl: announcementForm.mediaUrl,
          linkUrl: announcementForm.linkUrl,
          pollQuestion: announcementForm.pollQuestion,
          pollOptions: announcementForm.pollOptions,
        }),
        lang: 'tr',
        poll: announcementForm.pollQuestion.trim()
          ? {
              question: announcementForm.pollQuestion.trim(),
              options: announcementForm.pollOptions
                .split('\n')
                .map((option) => option.trim())
                .filter(Boolean),
            }
          : undefined,
      };

      const method = editingAnnouncementId ? 'PATCH' : 'POST';
      const url = editingAnnouncementId
        ? apiUrl('/api/admin/announcements')
        : apiUrl('/api/admin/announcements');
      const body = editingAnnouncementId ? { ...payload, id: editingAnnouncementId } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchAnnouncements();
      setAnnouncementSuccess(editingAnnouncementId ? 'Duyuru güncellendi.' : 'Duyuru oluşturuldu.');
      resetAnnouncementForm();
      setAnnouncementView('list');
    } catch (e) {
      setAnnouncementError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!window.confirm('Bu duyuruyu kalıcı olarak silmek istiyor musunuz?')) return;
    setAnnouncementError(null);
    setAnnouncementSuccess(null);
    setAnnouncementDeleteLoadingId(id);
    try {
      const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
      const res = await fetch(apiUrl(`/api/admin/announcements?id=${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchAnnouncements();
      setAnnouncementSuccess('Duyuru silindi.');
      if (editingAnnouncementId === id) {
        resetAnnouncementForm();
        setAnnouncementView('list');
      }
    } catch (e) {
      setAnnouncementError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnnouncementDeleteLoadingId(null);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSection('overview'); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeTab !== 'overview') fetchSection(activeTab); }, [activeTab]);
  useEffect(() => { if (activeTab === 'ads') fetchAds(); }, [activeTab, fetchAds]);

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

  const fetchReports = async (statusF = reportFilter, typeF = reportTypeFilter) => {
    setLoadingTab(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/reports?status=${statusF}&type=${typeF}&limit=100`), { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setReports(data.reports ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoadingTab(false); }
  };

  const updateReport = async (id: string, status: string, note?: string) => {
    setReportUpdating(id);
    try {
      const res = await fetch(apiUrl('/api/admin/reports'), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ id, status, note }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status, ...(note ? { dev_note: note } : {}) } : r));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setReportUpdating(null); }
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

  const fetchBans = async () => {
    setLoadingTab(true);
    try {
      const query = new URLSearchParams({
        type: 'all',
        active: banActiveOnly ? 'true' : 'false',
      });
      const res = await fetch(apiUrl(`/api/admin/bans?${query.toString()}`), { credentials: 'include' });
      const data = await res.json() as { member?: MemberBan[]; server?: ServerBan[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setMemberBans(data.member ?? []);
      setServerBans(data.server ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const changeBanActiveOnly = async (value: boolean) => {
    setBanActiveOnly(value);
    if (activeTab !== 'bans') return;
    setLoadingTab(true);
    try {
      const query = new URLSearchParams({
        type: 'all',
        active: value ? 'true' : 'false',
      });
      const res = await fetch(apiUrl(`/api/admin/bans?${query.toString()}`), { credentials: 'include' });
      const data = await res.json() as { member?: MemberBan[]; server?: ServerBan[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setMemberBans(data.member ?? []);
      setServerBans(data.server ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingTab(false);
    }
  };

  const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

  const createMemberBan = async () => {
    if (!memberBanForm.userId.trim()) return;
    if (memberBanMode === 'temporary' && !memberBanForm.expiresAt) {
      setError('Geçici üye banı için bitiş tarihi zorunludur.');
      return;
    }
    setBanSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/bans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'member',
          userId: memberBanForm.userId.trim(),
          guildId: memberBanForm.guildId.trim() || undefined,
          reason: memberBanForm.reason.trim() || undefined,
          expiresAt: memberBanMode === 'temporary' ? toIsoOrNull(memberBanForm.expiresAt) : null,
          metadata: { ban_mode: memberBanMode },
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setMemberBanForm({ userId: '', guildId: '', reason: '', expiresAt: '' });
      await fetchBans();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBanSubmitting(false);
    }
  };

  const createServerBan = async () => {
    if (!serverBanForm.guildId.trim()) return;
    if (serverBanMode === 'temporary' && !serverBanForm.expiresAt) {
      setError('Geçici sunucu banı için bitiş tarihi zorunludur.');
      return;
    }
    setBanSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/bans'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'server',
          guildId: serverBanForm.guildId.trim(),
          reason: serverBanForm.reason.trim() || undefined,
          expiresAt: serverBanMode === 'temporary' ? toIsoOrNull(serverBanForm.expiresAt) : null,
          metadata: { ban_mode: serverBanMode },
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setServerBanForm({ guildId: '', reason: '', expiresAt: '' });
      await fetchBans();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBanSubmitting(false);
    }
  };

  const liftBan = async (type: BanScope, id: string) => {
    setBanLiftingId(id);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/admin/bans'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      await fetchBans();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBanLiftingId(null);
    }
  };

  const applyBanSearch = <T extends MemberBan | ServerBan>(rows: T[]) => {
    const q = banSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const keys = [
        'user_id' in row ? row.user_id : '',
        row.guild_id ?? '',
        row.reason ?? '',
        row.created_by ?? '',
        row.lifted_by ?? '',
      ].join(' ').toLowerCase();
      return keys.includes(q);
    });
  };

  const sortBanRows = <T extends MemberBan | ServerBan>(rows: T[]) => {
    const dir = banSortDir === 'asc' ? 1 : -1;
    const score = (v?: string | null) => (v ? new Date(v).getTime() : -8640000000000000);
    return [...rows].sort((a, b) => (score(a[banSortBy]) - score(b[banSortBy])) * dir);
  };

  const visibleMemberBans = sortBanRows(applyBanSearch(memberBans));
  const visibleServerBans = sortBanRows(applyBanSearch(serverBans));

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
            
            {/* AI Fix Panel Integration for error_log types */}
            {(selectedLog.type === 'error_log' || selectedLog.type === 'api_error') && (
              <AIFixPanel 
                logId={selectedLog.id}
                errorTitle={selectedLog.title}
                filePath={selectedLog.data?.file_path}
                stackTrace={selectedLog.data?.context?.stack}
              />
            )}
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
            { key: 'economy_vote_threshold',          labelKey: 'dev_votes_label',               stateKey: 'voteThreshold' },
            { key: 'economy_direct_member_threshold', labelKey: 'dev_member_label',       stateKey: 'directMemberThreshold' },
            { key: 'economy_auto_approve_days',       labelKey: 'dev_apps_auto_days',     stateKey: 'autoApproveDays' },
          ] as const).map(({ key, labelKey, stateKey }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="flex-1 text-xs text-white/50">{t(labelKey)}</span>
              <input type="number" min={1} value={thresholdInputs[stateKey] ?? String(thresholds[stateKey])}
                onChange={(e) => setThresholdInputs((p) => ({ ...p, [stateKey]: e.target.value }))}
                className="w-24 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white focus:border-[#5865F2]/50 focus:outline-none" />
              <button onClick={() => saveThreshold(key, thresholdInputs[stateKey])} disabled={thresholdSaving === key}
                className="rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-3 py-1.5 text-[11px] font-medium text-[#7289da] transition disabled:opacity-50">
                {thresholdSaving === key ? '...' : t('dev_save_button')}
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
                <span>{t('dev_member_label')}: <strong className="text-white">{app.criteria?.memberCount ?? 0}</strong></span>
                <span>{t('dev_votes_label')}: <strong className="text-white">{app.criteria?.voteCount ?? 0}</strong>/{app.criteria?.voteThreshold ?? 120}</span>
                <span>{t('dev_setup_label')}: <strong className={app.criteria?.isSetup ? 'text-emerald-400' : 'text-red-400'}>{app.criteria?.isSetup ? t('dev_has') : t('dev_not_has')}</strong></span>
                <span>{t('dev_eligible_label')}: <strong className={app.criteria?.eligible ? 'text-emerald-400' : 'text-red-400'}>{app.criteria?.eligible ? t('dev_yes') : t('dev_no')}</strong></span>
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
              <p className="text-[11px] text-white/50 mb-3">{t('dev_applicant_label')}: <strong className="text-white">{app.applicant_user_id}</strong></p>
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
                <span>{server.member_count ?? 0} {t('dev_members_suffix')}</span>
                <span className={server.is_setup ? 'text-emerald-400' : 'text-white/25'}>{server.is_setup ? t('dev_established') : t('dev_not_established')}</span>
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
                [t('dev_server_detail_members'), `${selectedServer.member_count ?? 0}`],
                [t('dev_server_detail_setup'), selectedServer.is_setup ? t('dev_has') : t('dev_not_has')],
                [t('dev_server_detail_economy'), selectedServer.economy_tier],
                [t('dev_server_detail_admin_role'), selectedServer.admin_role_id ?? '—'],
                [t('dev_server_detail_verify_role'), selectedServer.verify_role_id ?? '—'],
                [t('dev_server_detail_market'), selectedServer.market_hours_enabled ? `${selectedServer.market_open_time ?? ''}-${selectedServer.market_close_time ?? ''}` : t('dev_market_closed')],
                [t('dev_server_detail_timezone'), selectedServer.market_timezone ?? '—'],
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
              {inviteLoading ? t('dev_invite_loading') : t('dev_invite_button')}
            </button>
            {inviteResult && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <p className="text-[11px] font-bold text-emerald-300 mb-1.5">{t('dev_invite_ready')}</p>
                <a href={inviteResult.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 underline break-all">{inviteResult.url}</a>
                {inviteResult.expires && <p className="text-[10px] text-white/30 mt-1">{t('dev_invite_validity')} {formatDate(inviteResult.expires)}</p>}
                <button onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                  className="mt-2 flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-2.5 py-1 text-[10px] text-white/60 transition">
                  <LuCopy className="w-3 h-3" /> {t('dev_copy_button')}
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
                  {flag.guild_id && <span>{t('dev_suspicious_server_label')} {flag.guild_id}</span>}
                  {flag.user_id && <span>{t('dev_suspicious_user_label')} {flag.user_id}</span>}
                  <span>{formatDate(flag.created_at)}</span>
                </div>
              </div>
              {flag.status === 'open' && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {[
                    { status: 'reviewed',  label: t('dev_suspicious_reviewed'),    cls: 'border-sky-400/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' },
                    { status: 'actioned',  label: t('dev_suspicious_actioned'), cls: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' },
                    { status: 'dismissed', label: t('dev_suspicious_dismissed'),       cls: 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10' },
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
            <p className="text-xs">{t('dev_suspicious_empty')}</p>
          </div>
        )}
      </div>
    </div>
  );

  const REPORT_STATUS_OPTIONS = [
    { value: 'reviewing',     label: t('dev_report_status_reviewing'),     cls: 'border-amber-400/25 bg-amber-500/10 text-amber-300' },
    { value: 'need_info',     label: t('dev_report_status_need_info'),     cls: 'border-blue-400/25 bg-blue-500/10 text-blue-300' },
    { value: 'critical',      label: t('dev_report_status_critical'),      cls: 'border-red-400/25 bg-red-500/10 text-red-300' },
    { value: 'fixed_pending', label: t('dev_report_status_fixed_pending'), cls: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300' },
    { value: 'planned_next',  label: t('dev_report_status_planned_next'),  cls: 'border-teal-400/25 bg-teal-500/10 text-teal-300' },
    { value: 'long_term',     label: t('dev_report_status_long_term'),     cls: 'border-purple-400/25 bg-purple-500/10 text-purple-300' },
    { value: 'resolved',      label: t('dev_report_status_resolved'),      cls: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300' },
    { value: 'not_found',     label: t('dev_report_status_not_found'),     cls: 'border-red-400/25 bg-red-500/10 text-red-300' },
    { value: 'duplicate',     label: t('dev_report_status_duplicate'),     cls: 'border-white/10 bg-white/5 text-white/50' },
    { value: 'invalid',       label: t('dev_report_status_invalid'),       cls: 'border-white/10 bg-white/5 text-white/30' },
    { value: 'closed',        label: t('dev_report_status_closed'),        cls: 'border-white/10 bg-white/5 text-white/30' },
  ];

  const REPORT_STATUS_BADGE: Record<string, string> = {
    open:          'border-orange-400/30 bg-orange-500/10 text-orange-300',
    reviewing:     'border-amber-400/30 bg-amber-500/10 text-amber-300',
    need_info:     'border-blue-400/30 bg-blue-500/10 text-blue-300',
    critical:      'border-red-400/30 bg-red-500/10 text-red-300',
    fixed_pending: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
    planned_next:  'border-teal-400/30 bg-teal-500/10 text-teal-300',
    long_term:     'border-purple-400/30 bg-purple-500/10 text-purple-300',
    resolved:      'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    not_found:     'border-red-400/30 bg-red-500/10 text-red-300',
    duplicate:     'border-white/10 bg-white/5 text-white/50',
    invalid:       'border-white/10 bg-white/5 text-white/30',
    closed:        'border-white/10 bg-white/5 text-white/25',
  };

  const reportsSection = (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {['open','reviewing','need_info','resolved','closed','all'].map((s) => (
            <button key={s} onClick={() => { setReportFilter(s); fetchReports(s, reportTypeFilter); }}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${reportFilter === s ? 'border-orange-400/40 bg-orange-500/15 text-orange-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {[{v:'all',l:'Tümü'},{v:'bug',l:'🐛 Hata'},{v:'suggestion',l:'💡 Öneri'}].map(({v,l}) => (
            <button key={v} onClick={() => { setReportTypeFilter(v); fetchReports(reportFilter, v); }}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${reportTypeFilter === v ? 'border-[#5865F2]/40 bg-[#5865F2]/15 text-[#7289da]' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 max-h-[680px] overflow-y-auto pr-1">
        {reports.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-[#0b0d12] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">{r.type === 'bug' ? '🐛' : '💡'}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${REPORT_STATUS_BADGE[r.status] ?? 'border-white/10 text-white/30'}`}>
                  {r.status}
                </span>
                {r.section && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-white/50">{r.section}</span>
                )}
              </div>
              <span className="text-[10px] text-white/25 shrink-0">{formatDate(r.created_at)}</span>
            </div>

            {/* Description */}
            <div className="px-4 pb-3">
              <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{r.description}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-white/30">
                <span>{t('dev_report_user_label')} <span className="text-white/50">{r.user_id}</span></span>
                {r.guild_id && <span>{t('dev_report_server_label')} <span className="text-white/50">{r.guild_id}</span></span>}
              </div>
            </div>

            {/* Dev note */}
            {r.dev_note && (
              <div className="mx-4 mb-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 px-3 py-2">
                <p className="text-[10px] text-[#7289da] font-semibold mb-0.5">{t('dev_report_dev_note_title')}</p>
                <p className="text-[11px] text-white/60">{r.dev_note}</p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-white/[0.06] px-4 py-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {REPORT_STATUS_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    disabled={r.status === opt.value || reportUpdating === r.id}
                    onClick={() => updateReport(r.id, opt.value)}
                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium transition disabled:opacity-40 ${opt.cls}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('dev_report_note_placeholder')}
                  value={reportNoteInputs[r.id] ?? ''}
                  onChange={(e) => setReportNoteInputs((p) => ({ ...p, [r.id]: e.target.value }))}
                  className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-[#5865F2]/40"
                />
                <button
                  disabled={!reportNoteInputs[r.id] || reportUpdating === r.id}
                  onClick={() => updateReport(r.id, r.status, reportNoteInputs[r.id])}
                  className="shrink-0 rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 px-3 py-1.5 text-[10px] text-[#7289da] transition disabled:opacity-40">
                  <LuMessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-white/25">
            <LuBug className="w-8 h-8" />
            <p className="text-xs">{t('dev_ads_empty')}</p>
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
          <input type="text" placeholder={t('dev_ads_invite_placeholder')} value={inviteUrl}
            onChange={e => { setInviteUrl(e.target.value); setAdSuccess(false); setAdError(null); setPreview(null); }}
            onBlur={e => { if (e.target.value) fetchInviteInfo(e.target.value); }}
            className="flex-1 min-w-0 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white placeholder-white/25 outline-none focus:border-[#5865F2]/40" />
          <button onClick={() => fetchInviteInfo(inviteUrl)} disabled={adFetching || !inviteUrl}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 text-xs text-white/60 transition hover:text-white disabled:opacity-40">
            {adFetching ? '...' : t('dev_ads_fetch_button')}
          </button>
        </div>
        {preview && (
          <div className="mt-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 p-3 flex items-center gap-3">
            {preview.server_icon
              ? <Image src={preview.server_icon} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-xl object-cover shrink-0" />
              : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2]/25 text-sm font-black text-white">{preview.server_name.charAt(0)}</div>
            }
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{preview.server_name}</p>
              {preview.server_description && <p className="text-[10px] text-white/40 truncate">{preview.server_description}</p>}
              <div className="mt-0.5 flex gap-3 text-[10px] text-white/30">
                {preview.online_count != null && <span>{preview.online_count.toLocaleString()} {t('dev_ads_online_suffix')}</span>}
                {preview.member_count != null && <span>{preview.member_count.toLocaleString()} {t('dev_ads_member_suffix')}</span>}
              </div>
            </div>
          </div>
        )}
        {adError && <p className="mt-2 text-xs text-red-400">{adError}</p>}
        {adSuccess && <p className="mt-2 text-xs text-emerald-400">{t('dev_ads_published')}</p>}
        {preview && (
          <button onClick={submitAd} disabled={adLoading}
            className="mt-3 w-full rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 px-4 py-2.5 text-xs font-bold text-[#7289da] transition disabled:opacity-50">
            {adLoading ? t('dev_ads_loading') : t('dev_ads_submit')}
          </button>
        )}
      </div>
      {ads.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">{t('dev_ads_current_title')}</p>
          <div className="flex flex-col gap-2">
            {ads.map(a => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{a.server_name}</p>
                  <p className={`text-[10px] ${a.active ? 'text-emerald-400' : 'text-white/30'}`}>{a.active ? t('dev_ads_status_active') : t('dev_ads_status_hidden')}</p>
                </div>
                <button onClick={() => deleteAd(a.id)}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 text-[10px] text-red-400 transition">
                  <LuTrash2 className="w-3 h-3" /> {t('dev_ads_delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const announcementsSection = (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
        <div>
          <h2 className="text-lg font-bold text-white">Duyuru Yönetimi</h2>
          <p className="mt-1 text-xs text-white/40">Duyuru listesi ve duyuru düzenleme formunu ayrı görün.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAnnouncementView('list');
              fetchAnnouncements();
            }}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition ${announcementView === 'list' ? 'bg-white/10 text-white border border-white/15' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => {
              resetAnnouncementForm();
              setAnnouncementView('editor');
            }}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition ${announcementView === 'editor' ? 'bg-sky-500/15 text-sky-200 border border-sky-400/20' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'}`}
          >
            {editingAnnouncementId ? 'Düzenle' : 'Yeni Duyuru'}
          </button>
        </div>
      </div>

      {announcementView === 'editor' ? (
        <div className="rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/60">Başlık</label>
              <input
                value={announcementForm.title}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                placeholder="Duyuru başlığı"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/60">İçerik</label>
              <textarea
                value={announcementForm.body}
                onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, body: event.target.value }))}
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                placeholder="Duyuru metni"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Medya URL</label>
                <input
                  value={announcementForm.mediaUrl}
                  onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Link</label>
                <input
                  value={announcementForm.linkUrl}
                  onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Anket Sorusu</label>
                <input
                  value={announcementForm.pollQuestion}
                  onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, pollQuestion: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Örnek: Yeni özellik beğenildi mi?"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Anket Seçenekleri</label>
                <textarea
                  value={announcementForm.pollOptions}
                  onChange={(event) => setAnnouncementForm((prev) => ({ ...prev, pollOptions: event.target.value }))}
                  className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Her seçeneği yeni satıra yazın"
                />
              </div>
            </div>

            {announcementError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{announcementError}</div>
            ) : null}
            {announcementSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{announcementSuccess}</div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveAnnouncement}
                disabled={announcementSaving}
                className="rounded-full bg-[#5865F2] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {announcementSaving ? 'Kaydediliyor...' : editingAnnouncementId ? 'Güncelle' : 'Duyuru Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAnnouncementForm();
                  setAnnouncementView('list');
                }}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {announcementView === 'list' ? (
        <div className="rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">Duyurular</h3>
              <p className="mt-1 text-xs text-white/40">Mevcut duyuruları düzenleyebilir veya silebilirsiniz.</p>
            </div>
            <button
              type="button"
              onClick={fetchAnnouncements}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 transition hover:bg-white/10"
            >
              Yenile
            </button>
          </div>

          {announcementError ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{announcementError}</div>
          ) : null}
          {announcementSuccess ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{announcementSuccess}</div>
          ) : null}

          {announcementsLoading ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">Yükleniyor...</div>
          ) : announcementsError ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">{announcementsError}</div>
          ) : announcements.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">Henüz duyuru yok.</div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/20 max-h-[55vh] overflow-y-auto pr-1">
              <div className="space-y-4 p-4">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{announcement.title}</p>
                        <p className="text-xs text-white/40">{formatDate(announcement.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditAnnouncement(announcement)}
                          className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-500/20"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(announcement.id)}
                          disabled={announcementDeleteLoadingId === announcement.id}
                          className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {announcementDeleteLoadingId === announcement.id ? 'Siliniyor...' : 'Sil'}
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-white/70 whitespace-pre-line">{announcement.content}</p>
                    {announcement.poll ? (
                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                        <p className="font-semibold text-white">Anket: {announcement.poll.question}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/60">
                          {announcement.poll.options
                            .slice()
                            .sort((a, b) => a.position - b.position)
                            .map((option) => (
                              <li key={option.id}>{option.label}</li>
                            ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const weeklyTasksSection = (
    <div className="grid gap-5">
      <div className="rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Weekly Task Yönetimi</h2>
            <p className="mt-1 text-xs text-white/40">Yeni haftalık görevler oluşturun ve mevcut görevleri görüntüleyin.</p>
          </div>
          <button
            type="button"
            onClick={fetchWeeklyTasks}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:bg-white/10"
          >
            Yenile
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/60">Guild ID</label>
              <input
                value={weeklyTaskForm.guildId}
                onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, guildId: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                placeholder="123456789012345678"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/60">Başlık</label>
              <input
                value={weeklyTaskForm.title}
                onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                placeholder="Örnek: Haftalık mesaj hedefi"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-semibold text-white/60">Açıklama</label>
              <textarea
                value={weeklyTaskForm.description}
                onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-[100px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                placeholder="Görev detayları"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Görev Türü</label>
                <select
                  value={weeklyTaskForm.requirementType}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, requirementType: event.target.value as WeeklyTaskType }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                >
                  <option value="message_count">Mesaj sayısı</option>
                  <option value="voice_minutes">Ses dakikası</option>
                  <option value="join_guild">Sunucuya katılma</option>
                  <option value="role">Rol sahibi olma</option>
                  <option value="event_participation">Etkinlik katılımı</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Değer</label>
                <input
                  value={weeklyTaskForm.requirementValue}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, requirementValue: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="10"
                />
              </div>
            </div>

            {weeklyTaskForm.requirementType === 'role' ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Rol ID</label>
                <input
                  value={weeklyTaskForm.requirementRoleId}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, requirementRoleId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Role ID girin"
                />
              </div>
            ) : null}

            {weeklyTaskForm.requirementType === 'join_guild' ? (
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Hedef Sunucu ID</label>
                <input
                  value={weeklyTaskForm.requirementTargetGuildId}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, requirementTargetGuildId: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Katılım için hedef sunucu ID"
                />
              </div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Ödül (Mari)</label>
                <input
                  value={weeklyTaskForm.rewardMari}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, rewardMari: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="10"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-white/60">Sıra</label>
                <input
                  value={weeklyTaskForm.sortOrder}
                  onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="0"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={weeklyTaskForm.active}
                onChange={(event) => setWeeklyTaskForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="h-4 w-4 rounded border-white/10 bg-black/30 text-sky-400"
              />
              Aktif
            </label>

            {weeklyTasksError ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{weeklyTasksError}</div>
            ) : null}
            {weeklyTaskSuccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{weeklyTaskSuccess}</div>
            ) : null}

            <button
              type="button"
              onClick={createWeeklyTask}
              disabled={weeklyTaskCreating}
              className="rounded-full bg-[#26a69a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f8e84] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {weeklyTaskCreating ? 'Oluşturuluyor...' : 'Görev Oluştur'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0b0d12] p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Mevcut Görevler</h3>
              <p className="mt-1 text-xs text-white/40">Haftalık görev listesi</p>
            </div>
          </div>

          {weeklyTasksLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">Yükleniyor...</div>
          ) : weeklyTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/50">Henüz görev yok.</div>
          ) : (
            <div className="space-y-3">
              {weeklyTasks.map((task) => (
                <div key={task.id} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <p className="text-xs text-white/40">{task.guild_name ?? task.guild_id} • {task.active ? 'Aktif' : 'Pasif'}</p>
                    </div>
                    <div className="text-right text-[11px] text-white/50">
                      <div>Ödül: {task.reward_mari} Mari</div>
                      <div>Sıra: {task.sort_order}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-white/70">{task.description ?? 'Açıklama yok.'}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/50">
                    <span>Tip: {task.requirement_type}</span>
                    {task.requirement_value != null && <span>Değer: {task.requirement_value}</span>}
                    {task.requirement_role_id && <span>Rol ID: {task.requirement_role_id}</span>}
                    {task.requirement_target_guild_id && <span>Hedef Sunucu: {task.requirement_target_guild_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const bansSection = (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-[#0b0d12] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setBanScope('member')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${banScope === 'member' ? 'border-sky-400/40 bg-sky-500/15 text-sky-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Üye Banları
            </button>
            <button
              type="button"
              onClick={() => setBanScope('server')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${banScope === 'server' ? 'border-violet-400/40 bg-violet-500/15 text-violet-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Sunucu Banları
            </button>
          </div>

          <label className="ml-auto flex items-center gap-2 text-[11px] text-white/60">
            <input
              type="checkbox"
              checked={banActiveOnly}
              onChange={(e) => { void changeBanActiveOnly(e.target.checked); }}
              className="h-3.5 w-3.5 rounded border-white/20 bg-black/30"
            />
            Sadece aktif banlar
          </label>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input
            value={banSearch}
            onChange={(e) => setBanSearch(e.target.value)}
            placeholder="Ara: user_id, guild_id, sebep, işlem yapan"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-[#5865F2]/40"
          />
          <select
            value={banSortBy}
            onChange={(e) => setBanSortBy(e.target.value as 'created_at' | 'expires_at')}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-[#5865F2]/40"
          >
            <option value="created_at">Sıralama: Oluşturulma Tarihi</option>
            <option value="expires_at">Sıralama: Bitiş Tarihi</option>
          </select>
          <select
            value={banSortDir}
            onChange={(e) => setBanSortDir(e.target.value as 'desc' | 'asc')}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-[#5865F2]/40"
          >
            <option value="desc">Yeni - Eski</option>
            <option value="asc">Eski - Yeni</option>
          </select>
        </div>
      </div>

      {banScope === 'member' ? (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">Yeni Üye Banı</p>
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMemberBanMode('permanent')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${memberBanMode === 'permanent' ? 'border-rose-400/40 bg-rose-500/15 text-rose-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Kalıcı
            </button>
            <button
              type="button"
              onClick={() => setMemberBanMode('temporary')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${memberBanMode === 'temporary' ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Geçici
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={memberBanForm.userId}
              onChange={(e) => setMemberBanForm((p) => ({ ...p, userId: e.target.value }))}
              placeholder="user_id (zorunlu)"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-sky-400/40"
            />
            <input
              value={memberBanForm.guildId}
              onChange={(e) => setMemberBanForm((p) => ({ ...p, guildId: e.target.value }))}
              placeholder="guild_id (opsiyonel, boşsa global)"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-sky-400/40"
            />
            {memberBanMode === 'temporary' ? (
              <input
                type="datetime-local"
                value={memberBanForm.expiresAt}
                onChange={(e) => setMemberBanForm((p) => ({ ...p, expiresAt: e.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-sky-400/40"
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/45">
                Kalıcı ban için bitiş tarihi gerekmez.
              </div>
            )}
            <button
              type="button"
              onClick={createMemberBan}
              disabled={banSubmitting || !memberBanForm.userId.trim()}
              className="rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-40"
            >
              {banSubmitting ? 'Kaydediliyor...' : 'Üye Banı Ekle'}
            </button>
          </div>
          <textarea
            value={memberBanForm.reason}
            onChange={(e) => setMemberBanForm((p) => ({ ...p, reason: e.target.value }))}
            rows={3}
            placeholder="Ban sebebi (detaylı)"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-sky-400/40"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {MEMBER_BAN_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setMemberBanForm((p) => ({ ...p, reason: reason }))}
                className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">Yeni Sunucu Banı</p>
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setServerBanMode('permanent')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${serverBanMode === 'permanent' ? 'border-rose-400/40 bg-rose-500/15 text-rose-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Kalıcı
            </button>
            <button
              type="button"
              onClick={() => setServerBanMode('temporary')}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${serverBanMode === 'temporary' ? 'border-amber-400/40 bg-amber-500/15 text-amber-300' : 'border-white/10 text-white/40 hover:text-white/70'}`}
            >
              Geçici
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input
              value={serverBanForm.guildId}
              onChange={(e) => setServerBanForm((p) => ({ ...p, guildId: e.target.value }))}
              placeholder="guild_id (zorunlu)"
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-violet-400/40"
            />
            {serverBanMode === 'temporary' ? (
              <input
                type="datetime-local"
                value={serverBanForm.expiresAt}
                onChange={(e) => setServerBanForm((p) => ({ ...p, expiresAt: e.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40"
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/45">
                Kalıcı ban için bitiş tarihi gerekmez.
              </div>
            )}
          </div>
          <textarea
            value={serverBanForm.reason}
            onChange={(e) => setServerBanForm((p) => ({ ...p, reason: e.target.value }))}
            rows={3}
            placeholder="Ban sebebi (detaylı)"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-violet-400/40"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {SERVER_BAN_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setServerBanForm((p) => ({ ...p, reason: reason }))}
                className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {reason}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={createServerBan}
            disabled={banSubmitting || !serverBanForm.guildId.trim()}
            className="mt-2 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/25 disabled:opacity-40"
          >
            {banSubmitting ? 'Kaydediliyor...' : 'Sunucu Banı Ekle'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
        {(banScope === 'member' ? visibleMemberBans : visibleServerBans).map((ban) => {
          const expired = Boolean(ban.expires_at && new Date(ban.expires_at).getTime() <= Date.now());
          const active = ban.is_active && !expired;
          const temporary = Boolean(ban.expires_at);
          const badge = active
            ? 'border-red-400/30 bg-red-500/10 text-red-300'
            : expired
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
              : 'border-white/10 bg-white/5 text-white/40';
          return (
            <div key={ban.id} className="rounded-2xl border border-white/[0.08] bg-[#0b0d12] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${badge}`}>
                    {active ? 'Aktif' : expired ? 'Süresi Dolmuş' : 'Kaldırıldı'}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${temporary ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300'}`}>
                    {temporary ? 'Geçici' : 'Kalıcı'}
                  </span>
                  {'user_id' in ban ? (
                    <span className="text-[11px] text-sky-300">user: {ban.user_id}</span>
                  ) : (
                    <span className="text-[11px] text-violet-300">guild: {ban.guild_id}</span>
                  )}
                  {ban.guild_id && 'user_id' in ban && (
                    <span className="text-[11px] text-white/35">guild: {ban.guild_id}</span>
                  )}
                </div>
                <span className="text-[10px] text-white/25">{formatDate(ban.created_at)}</span>
              </div>

              <p className="mt-2 text-xs text-white/75 whitespace-pre-wrap">{ban.reason || 'Sebep belirtilmedi.'}</p>

              <div className="mt-2 grid gap-1 text-[10px] text-white/35 md:grid-cols-2">
                <span>Ban ID: {ban.id}</span>
                <span>Oluşturan: {ban.created_by ?? '—'}</span>
                <span>Bitiş: {formatDate(ban.expires_at ?? null)}</span>
                <span>Kaldırılma: {formatDate(ban.lifted_at ?? null)}</span>
              </div>

              {active && (
                <button
                  type="button"
                  onClick={() => liftBan(banScope, ban.id)}
                  disabled={banLiftingId === ban.id}
                  className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                >
                  {banLiftingId === ban.id ? 'İşleniyor...' : 'Unban'}
                </button>
              )}
            </div>
          );
        })}

        {(banScope === 'member' ? visibleMemberBans : visibleServerBans).length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-white/25">
            <LuShield className="w-8 h-8" />
            <p className="text-xs">Bu filtrede ban kaydı bulunamadı.</p>
          </div>
        )}
      </div>
    </div>
  );

  const SECTION_CONTENT: Record<TabId, React.ReactNode> = {
    overview:   overviewSection,
    logs:       logsSection,
    apps:       appsSection,
    servers:    serversSection,
    profiles:   profilesSection,
    ads:        adsSection,
    weeklyTasks: weeklyTasksSection,
    announcements: announcementsSection,
    suspicious: suspiciousSection,
    reports:    reportsSection,
    bans:       bansSection,
  };

  const activeNav = NAV_ITEMS.find(n => n.id === activeTab)!;

  /* ─── LAYOUT ─── */

  const inner = (
    <div className="flex h-screen w-full bg-[#0b0d12] overflow-hidden">
      <DeveloperSidebarNav
        activeSection={activeTab}
        onNavigate={(section: TabId) => setActiveTab(section)}
        profile={{ username: 'Admin', avatarUrl: null }}
      />
      <div className="flex flex-1 flex-col min-w-0 bg-[#0e1018]">
        <DeveloperHeader
          activeSection={activeTab}
          onNavigate={(section: TabId) => setActiveTab(section)}
          profile={{ username: 'Admin', avatarUrl: null }}
          onClose={onClose}
        />
        <main className="flex-1 overflow-y-auto p-5 md:p-8 relative">
          {/* Glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 bg-[#10B981]/10 rounded-full blur-[100px]" />

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

  return (
    <>
      {variant === 'panel' && <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />}
      <div className={variant === 'panel' ? "fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-6xl flex-col bg-[#0b0d12] text-white shadow-2xl border-l border-white/[0.06]" : "h-[100dvh] w-full bg-[#0b0d12] text-white overflow-hidden flex flex-col"}>
        {inner}
      </div>
    </>
  );
}
