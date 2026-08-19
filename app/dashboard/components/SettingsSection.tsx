'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Image from 'next/image';
import { copyTextToClipboard } from '@/lib/clipboard';
import {
  LuVolume2,
  LuVolumeX,
  LuUser,
  LuCheck,
  LuTriangleAlert,
  LuArrowLeft,
  LuShieldAlert,
  LuInfo,
  LuDownload,
  LuSave,
  LuUndo2,
  LuServer,
  LuTrash2,
  LuSlidersHorizontal,
  LuSparkles,
  LuZap,
  LuEye,
  LuPause,
  LuX,
  LuFileJson,
  LuShieldCheck,
  LuCopy,
  LuTag,
  LuCrown,
  LuKeyRound,
  LuCalendar,
  LuHash,
  LuLink2,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { closeDiscordActivity, isDiscordActivityClient } from '@/lib/discordSdk';
import { playUiClickPreview } from '@/lib/uiClickSound';
import { useLocale, useT } from '@/contexts/LocaleContext';
import type { LanguageCode } from '@/lib/languages';
import type { MemberProfile } from '../types';

const DATE_LOCALES: Record<LanguageCode, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  id: 'id-ID',
  es: 'es-MX',
  de: 'de-DE',
  tr: 'tr-TR',
  fr: 'fr-FR',
  hu: 'hu-HU',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
};

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  profile?: MemberProfile | null;
  profileLoading?: boolean;
  serverCount?: number;
  serverName?: string | null;
  serverIconUrl?: string | null;
  isActivityEmbed?: boolean;
  onBack?: () => void;
};

type TabId = 'general' | 'sound' | 'account';
type Density = 'normal' | 'compact';
type Preset = 'performance' | 'balanced' | 'quality';

const KEYS = {
  musicEnabled: 'dashboard_music_enabled',
  musicVolume: 'dashboard_music_volume',
  sfxVolume: 'dashboard_sfx_volume',
  reduceMotion: 'dashboard_reduce_motion',
  pauseHidden: 'dashboard_pause_music_hidden',
  density: 'dashboard_ui_density',
} as const;

function readBool(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === 'true';
}

function readInt(key: string, fallback: number, min = 0, max = 100) {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  const parsed = Number(stored);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function readDensity(): Density {
  if (typeof window === 'undefined') return 'normal';
  return window.localStorage.getItem(KEYS.density) === 'compact' ? 'compact' : 'normal';
}

function applyDocumentPrefs(reduceMotion: boolean, density: Density) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.reduceMotion = reduceMotion ? 'true' : 'false';
  document.documentElement.dataset.uiDensity = density;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'border-[#5865F2]/50 bg-[#5865F2]' : 'border-white/10 bg-white/10'
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? 'left-[1.35rem]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] px-3.5 py-3 last:border-b-0 sm:gap-4 sm:px-4 sm:py-3.5">
      {Icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-white/45">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/90">{title}</p>
        {description ? <p className="mt-0.5 text-[11px] leading-snug text-white/35">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12151e]/80">
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-2 sm:px-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">{title}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Slider({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex w-[9.5rem] items-center gap-2 sm:w-[11rem] ${disabled ? 'opacity-40' : ''}`}>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#5865F2] disabled:cursor-not-allowed"
      />
      <span className="w-8 text-right font-mono text-[11px] font-semibold tabular-nums text-[#5865F2]">
        {value}
      </span>
    </div>
  );
}

export default function SettingsSection({
  profile,
  profileLoading = false,
  serverCount,
  serverName,
  serverIconUrl,
  isActivityEmbed = false,
  onBack,
}: SettingsSectionProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = DATE_LOCALES[locale] ?? 'en-US';
  const displayName =
    profile?.displayName || profile?.nickname || profile?.username || t('settings_ui_member_fallback');

  const formatRoleColor = (color: number) =>
    color ? `#${color.toString(16).padStart(6, '0')}` : '#99aab5';

  const discordCreatedAt = (() => {
    const userId = profile?.userId;
    if (!userId || !/^\d+$/.test(userId)) return null;
    try {
      const ms = Number((BigInt(userId) >> BigInt(22)) + BigInt(1420070400000));
      if (!Number.isFinite(ms) || ms <= 0) return null;
      return new Date(ms);
    } catch {
      return null;
    }
  })();

  const formatDate = (value?: string | Date | null) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (value?: string | Date | null) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyText = async (label: string, value: string) => {
    const ok = await copyTextToClipboard(value);
    if (!ok) return;
    setCopiedField(label);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const oauthScopes = [
    {
      id: 'identify',
      title: 'identify',
      status: 'granted' as const,
      description: t('settings_ui_oauth_identify_desc'),
      uses: t('settings_ui_oauth_identify_uses'),
    },
    {
      id: 'guilds',
      title: 'guilds',
      status: 'granted' as const,
      description: t('settings_ui_oauth_guilds_desc'),
      uses: t('settings_ui_oauth_guilds_uses'),
    },
    {
      id: 'rpc.activities.write',
      title: 'rpc.activities.write',
      status: isActivityEmbed ? ('granted' as const) : ('optional' as const),
      description: t('settings_ui_oauth_rpc_desc'),
      uses: t('settings_ui_oauth_rpc_uses'),
    },
    {
      id: 'guilds.members.read',
      title: 'guilds.members.read',
      status: 'web_only' as const,
      description: t('settings_ui_oauth_members_desc'),
      uses: t('settings_ui_oauth_members_uses'),
    },
  ];

  const activeGuildName = profile?.guildName || serverName || t('settings_ui_current_server');
  const activeGuildIcon = profile?.guildIcon || serverIconUrl || null;
  const accent =
    profile?.bannerColor ||
    (profile?.roles?.find((r) => r.color > 0)
      ? formatRoleColor(profile.roles.find((r) => r.color > 0)!.color)
      : '#5865F2');

  const [activeTab, setActiveTab] = useState<TabId>('general');

  const [savedMusicEnabled, setSavedMusicEnabled] = useState(() => readBool(KEYS.musicEnabled, true));
  const [savedMusicVolume, setSavedMusicVolume] = useState(() => readInt(KEYS.musicVolume, 70));
  const [savedSfxVolume, setSavedSfxVolume] = useState(() => readInt(KEYS.sfxVolume, 60));
  const [savedReduceMotion, setSavedReduceMotion] = useState(() => readBool(KEYS.reduceMotion, false));
  const [savedPauseHidden, setSavedPauseHidden] = useState(() => readBool(KEYS.pauseHidden, true));
  const [savedDensity, setSavedDensity] = useState<Density>(() => readDensity());

  const [draftMusicEnabled, setDraftMusicEnabled] = useState(savedMusicEnabled);
  const [draftMusicVolume, setDraftMusicVolume] = useState(savedMusicVolume);
  const [draftSfxVolume, setDraftSfxVolume] = useState(savedSfxVolume);
  const [draftReduceMotion, setDraftReduceMotion] = useState(savedReduceMotion);
  const [draftPauseHidden, setDraftPauseHidden] = useState(savedPauseHidden);
  const [draftDensity, setDraftDensity] = useState<Density>(savedDensity);

  useEffect(() => {
    applyDocumentPrefs(savedReduceMotion, savedDensity);
  }, [savedReduceMotion, savedDensity]);

  const hasUnsavedChanges =
    draftMusicEnabled !== savedMusicEnabled ||
    draftMusicVolume !== savedMusicVolume ||
    draftSfxVolume !== savedSfxVolume ||
    draftReduceMotion !== savedReduceMotion ||
    draftPauseHidden !== savedPauseHidden ||
    draftDensity !== savedDensity;

  const handleSaveChanges = () => {
    window.localStorage.setItem(KEYS.musicEnabled, String(draftMusicEnabled));
    window.localStorage.setItem(KEYS.musicVolume, String(draftMusicVolume));
    window.localStorage.setItem(KEYS.sfxVolume, String(draftSfxVolume));
    window.localStorage.setItem(KEYS.reduceMotion, String(draftReduceMotion));
    window.localStorage.setItem(KEYS.pauseHidden, String(draftPauseHidden));
    window.localStorage.setItem(KEYS.density, draftDensity);

    applyDocumentPrefs(draftReduceMotion, draftDensity);
    window.dispatchEvent(new Event('dashboard-music-settings-changed'));
    window.dispatchEvent(new Event('dashboard-prefs-changed'));

    setSavedMusicEnabled(draftMusicEnabled);
    setSavedMusicVolume(draftMusicVolume);
    setSavedSfxVolume(draftSfxVolume);
    setSavedReduceMotion(draftReduceMotion);
    setSavedPauseHidden(draftPauseHidden);
    setSavedDensity(draftDensity);
  };

  const handleResetChanges = () => {
    setDraftMusicEnabled(savedMusicEnabled);
    setDraftMusicVolume(savedMusicVolume);
    setDraftSfxVolume(savedSfxVolume);
    setDraftReduceMotion(savedReduceMotion);
    setDraftPauseHidden(savedPauseHidden);
    setDraftDensity(savedDensity);
  };

  const applyPreset = (preset: Preset) => {
    if (preset === 'performance') {
      setDraftReduceMotion(true);
      setDraftDensity('compact');
      setDraftMusicVolume(40);
      setDraftSfxVolume(30);
      setDraftMusicEnabled(true);
      setDraftPauseHidden(true);
    } else if (preset === 'balanced') {
      setDraftReduceMotion(false);
      setDraftDensity('normal');
      setDraftMusicVolume(70);
      setDraftSfxVolume(60);
      setDraftMusicEnabled(true);
      setDraftPauseHidden(true);
    } else {
      setDraftReduceMotion(false);
      setDraftDensity('normal');
      setDraftMusicVolume(90);
      setDraftSfxVolume(80);
      setDraftMusicEnabled(true);
      setDraftPauseHidden(false);
    }
  };

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'all' | 'current' | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [accountDeletedExit, setAccountDeletedExit] = useState(false);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestAcknowledged, setRequestAcknowledged] = useState(false);

  const openDeleteModal = (scope: 'all' | 'current') => {
    setDeleteScope(scope);
    setDeleteError(null);
    setDeleteAcknowledged(false);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteAcknowledged(false);
  };

  const openRequestModal = () => {
    setRequestError(null);
    setRequestAcknowledged(false);
    setRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    if (requestLoading) return;
    setRequestModalOpen(false);
    setRequestAcknowledged(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteScope) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetchWithCreds('/api/member/delete-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: deleteScope === 'all' ? 'all' : 'current' }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) {
        setDeleteError(t('settings_ui_delete_error'));
        return;
      }

      setDeleteMessage(
        deleteScope === 'all' ? t('settings_ui_delete_success_all') : t('settings_ui_delete_success_current'),
      );
      setDeleteModalOpen(false);

      if (deleteScope === 'all') {
        await fetchWithCreds('/api/auth/logout', { method: 'POST' });
        try {
          localStorage.removeItem('discord_bearer_token');
          localStorage.removeItem('discordUser');
          localStorage.removeItem('auth_ready');
        } catch {
          /* ignore */
        }
        setAccountDeletedExit(true);
        if (isDiscordActivityClient()) {
          await closeDiscordActivity();
        }
        return;
      }

      window.location.reload();
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRequestConfirm = async () => {
    setRequestLoading(true);
    setRequestError(null);
    try {
      const response = await fetchWithCreds('/api/member/request-data', { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.error) {
        if (result.error === 'dm_closed') {
          setRequestError(t('settings_ui_request_error_dm'));
        } else {
          setRequestError(t('settings_ui_request_error'));
        }
        return;
      }
      setRequestMessage(t('settings_ui_request_success'));
      setRequestModalOpen(false);
    } finally {
      setRequestLoading(false);
    }
  };

  const deleteOptionConfig = {
    all: {
      title: t('settings_ui_delete_all_title'),
      description: t('settings_ui_delete_all_desc'),
      button: t('settings_ui_delete_all_button'),
      tone: 'bg-rose-600 hover:bg-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.25)]',
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      iconTone: 'text-rose-400',
      severity: t('settings_ui_delete_all_severity'),
      severityTone: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
      ref: 'DEL-ALL',
      scopeLabel: t('settings_ui_delete_all_scope'),
      items: [
        t('settings_ui_delete_all_item1'),
        t('settings_ui_delete_all_item2'),
        t('settings_ui_delete_all_item3'),
      ],
      kept: [] as string[],
    },
    current: {
      title: t('settings_ui_delete_current_title'),
      description: t('settings_ui_delete_current_desc'),
      button: t('settings_ui_delete_current_button'),
      tone: 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.22)]',
      badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      iconTone: 'text-amber-400',
      severity: t('settings_ui_delete_current_severity'),
      severityTone: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      ref: 'DEL-SRV',
      scopeLabel: t('settings_ui_delete_current_scope'),
      items: [
        t('settings_ui_delete_current_item1'),
        t('settings_ui_delete_current_item2'),
        t('settings_ui_delete_current_item3'),
      ],
      kept: [
        t('settings_ui_delete_current_kept1'),
        t('settings_ui_delete_current_kept2'),
        t('settings_ui_delete_current_kept3'),
      ],
    },
  };

  const navItems = [
    { id: 'general' as const, label: t('settings_ui_nav_general'), icon: LuSlidersHorizontal },
    { id: 'sound' as const, label: t('settings_ui_nav_sound'), icon: LuVolume2 },
    { id: 'account' as const, label: t('settings_ui_nav_account'), icon: LuUser },
  ];

  const systemDialog = ({
    accent,
    children,
    onClose,
  }: {
    accent: 'danger' | 'warn' | 'info';
    children: ReactNode;
    onClose: () => void;
  }) => {
    const ring =
      accent === 'danger'
        ? 'shadow-[0_0_0_1px_rgba(244,63,94,0.22),0_28px_80px_rgba(0,0,0,0.65)]'
        : accent === 'warn'
          ? 'shadow-[0_0_0_1px_rgba(245,158,11,0.22),0_28px_80px_rgba(0,0,0,0.65)]'
          : 'shadow-[0_0_0_1px_rgba(88,101,242,0.28),0_28px_80px_rgba(0,0,0,0.65)]';
    const bar =
      accent === 'danger'
        ? 'from-rose-500 via-rose-500/40 to-transparent'
        : accent === 'warn'
          ? 'from-amber-500 via-amber-500/40 to-transparent'
          : 'from-[#5865F2] via-[#5865F2]/40 to-transparent';

    return (
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#05060a]/80 px-4 py-6 backdrop-blur-[10px]"
        onClick={onClose}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c0f16] ${ring} animate-in fade-in zoom-in-95 duration-200`}
        >
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${bar}`} />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-white/40 transition hover:bg-white/[0.06] hover:text-white"
            aria-label={t('settings_ui_close')}
          >
            <LuX className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    );
  };

  const requestConfirmModal = requestModalOpen
    ? systemDialog({
        accent: 'info',
        onClose: closeRequestModal,
        children: (
          <>
            <div className="border-b border-white/[0.07] px-5 pb-4 pt-5 pr-12">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-md border border-[#5865F2]/35 bg-[#5865F2]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#a5b4fc]">
                  {t('settings_ui_request_badge')}
                </span>
                <span className="font-mono text-[10px] text-white/25">REF · GDPR-DM</span>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10">
                  <LuFileJson className="h-5 w-5 text-[#5865F2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    {t('settings_ui_request_title')}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/45 sm:text-sm">
                    {t('settings_ui_request_subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 px-5 py-4">
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">{t('settings_ui_request_package')}</p>
                <ul className="mt-2.5 space-y-2">
                  {[
                    t('settings_ui_request_item1'),
                    t('settings_ui_request_item2'),
                    t('settings_ui_request_item3'),
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-white/65">
                      <LuCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5865F2]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] p-3.5">
                <div className="flex gap-2.5">
                  <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs leading-relaxed text-amber-100/85">
                    {t('settings_ui_request_warning')}
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/10">
                <input
                  type="checkbox"
                  checked={requestAcknowledged}
                  onChange={(e) => setRequestAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-[#5865F2]"
                />
                <span className="text-xs leading-relaxed text-white/60">
                  {t('settings_ui_request_ack')}
                </span>
              </label>

              {requestError && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                  {requestError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRequestModal}
                disabled={requestLoading}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
              >
                {t('settings_ui_cancel')}
              </button>
              <button
                type="button"
                onClick={handleRequestConfirm}
                disabled={requestLoading || !requestAcknowledged}
                className="rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {requestLoading ? t('settings_ui_request_sending') : t('settings_ui_request_confirm')}
              </button>
            </div>
          </>
        ),
      })
    : null;

  const confirmModal =
    deleteModalOpen && deleteScope
      ? systemDialog({
          accent: deleteScope === 'all' ? 'danger' : 'warn',
          onClose: closeDeleteModal,
          children: (
            <>
              <div className="border-b border-white/[0.07] px-5 pb-4 pt-5 pr-12">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${deleteOptionConfig[deleteScope].severityTone}`}
                  >
                    {deleteOptionConfig[deleteScope].severity}
                  </span>
                  <span className="font-mono text-[10px] text-white/25">
                    REF · {deleteOptionConfig[deleteScope].ref}
                  </span>
                </div>
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${deleteOptionConfig[deleteScope].badge}`}
                  >
                    <LuShieldAlert className={`h-5 w-5 ${deleteOptionConfig[deleteScope].iconTone}`} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                      {deleteScope === 'current'
                        ? t('settings_ui_delete_modal_title_current')
                        : t('settings_ui_delete_modal_title_all')}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-white/45 sm:text-sm">
                      {deleteScope === 'current'
                        ? t('settings_ui_delete_modal_body_current')
                        : t('settings_ui_delete_modal_body_all')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 px-5 py-4">
                {deleteScope === 'current' ? (
                  <div className="rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.12] to-transparent p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
                        <LuServer className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200/60">
                          {t('settings_ui_target_server')}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-bold text-white">
                          {serverName?.trim() || t('settings_ui_current_server')}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {t('settings_ui_limited_scope', { username: profile?.username ?? '—' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">{t('settings_ui_scope')}</p>
                      <p className="mt-1 text-xs font-semibold text-white/80">
                        {deleteOptionConfig[deleteScope].scopeLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">{t('settings_ui_account')}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-white/80">
                        @{profile?.username ?? '—'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
                    {t('settings_ui_records_to_delete')}
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {deleteOptionConfig[deleteScope].items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-white/65">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            deleteScope === 'all' ? 'bg-rose-400' : 'bg-amber-400'
                          }`}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {deleteScope === 'current' && deleteOptionConfig.current.kept.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300/80">
                      <LuShieldCheck className="h-3.5 w-3.5" />
                      {t('settings_ui_kept')}
                    </p>
                    <ul className="mt-2.5 space-y-2">
                      {deleteOptionConfig.current.kept.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-emerald-100/70">
                          <LuCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={`rounded-xl border p-3.5 ${
                    deleteScope === 'all'
                      ? 'border-rose-500/25 bg-rose-500/[0.07]'
                      : 'border-amber-500/25 bg-amber-500/[0.07]'
                  }`}
                >
                  <div className="flex gap-2.5">
                    <LuTriangleAlert
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        deleteScope === 'all' ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <p
                      className={`text-xs leading-relaxed ${
                        deleteScope === 'all' ? 'text-rose-100/85' : 'text-amber-100/85'
                      }`}
                    >
                      {deleteOptionConfig[deleteScope].description} {t('settings_ui_delete_no_backups')}
                    </p>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/10">
                  <input
                    type="checkbox"
                    checked={deleteAcknowledged}
                    onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                    className={`mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent ${
                      deleteScope === 'all' ? 'accent-rose-500' : 'accent-amber-500'
                    }`}
                  />
                  <span className="text-xs leading-relaxed text-white/60">
                    {deleteScope === 'current'
                      ? t('settings_ui_delete_ack_current')
                      : t('settings_ui_delete_ack_all')}
                  </span>
                </label>

                {deleteError && (
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
                    {deleteError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] bg-white/[0.015] px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                >
                  {t('settings_ui_cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading || !deleteAcknowledged}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${deleteOptionConfig[deleteScope].tone}`}
                >
                  {deleteLoading ? t('settings_ui_processing') : deleteOptionConfig[deleteScope].button}
                </button>
              </div>
            </>
          ),
        })
      : null;

  if (accountDeletedExit) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[#0b0d12] px-6 text-white">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <LuCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('settings_ui_deleted_title')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {t('settings_ui_deleted_body')}
          </p>
        </div>
      </div>
    );
  }

  const presets: { id: Preset; label: string; icon: typeof LuZap; hint: string }[] = [
    { id: 'performance', label: t('settings_ui_preset_performance'), icon: LuZap, hint: t('settings_ui_preset_performance_hint') },
    { id: 'balanced', label: t('settings_ui_preset_balanced'), icon: LuSparkles, hint: t('settings_ui_preset_balanced_hint') },
    { id: 'quality', label: t('settings_ui_preset_quality'), icon: LuEye, hint: t('settings_ui_preset_quality_hint') },
  ];

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-3 pb-24 sm:gap-4"
      data-settings-density={draftDensity}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/35 transition hover:text-white"
            >
              <LuArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              {t('settings_ui_back')}
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{t('settings_ui_title')}</h1>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
          <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5">
            <Image
              src={profile?.avatarUrl || '/gif/cat.gif'}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="max-w-[9rem] truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="truncate text-[10px] text-white/35">@{profile?.username ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-4">
        <aside className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible custom-scrollbar">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${
                  active
                    ? 'border-[#5865F2]/45 bg-[#5865F2]/15 text-white shadow-[inset_3px_0_0_#5865F2]'
                    : 'border-transparent bg-transparent text-white/45 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-white/80'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-[#5865F2]' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </aside>

        <div className="min-w-0 space-y-3">
          {activeTab === 'general' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <Panel title={t('settings_ui_panel_presets')}>
                <div className="grid gap-2 p-3 sm:grid-cols-3">
                  {presets.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-3 text-left transition hover:border-[#5865F2]/35 hover:bg-[#5865F2]/10"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[#5865F2]" />
                          <span className="text-sm font-semibold text-white">{preset.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-white/35">{preset.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title={t('settings_ui_panel_interface')}>
                <SettingRow
                  icon={LuSparkles}
                  title={t('settings_ui_animations')}
                  description={t('settings_ui_animations_desc')}
                >
                  <Toggle
                    checked={!draftReduceMotion}
                    onChange={() => setDraftReduceMotion((v) => !v)}
                  />
                </SettingRow>
                <SettingRow
                  icon={LuSlidersHorizontal}
                  title={t('settings_ui_density')}
                  description={t('settings_ui_density_desc')}
                >
                  <div className="flex rounded-lg border border-white/10 p-0.5">
                    {(['normal', 'compact'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDraftDensity(mode)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                          draftDensity === mode
                            ? 'bg-[#5865F2] text-white'
                            : 'text-white/45 hover:text-white'
                        }`}
                      >
                        {mode === 'normal' ? t('settings_ui_density_normal') : t('settings_ui_density_compact')}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow
                  icon={LuPause}
                  title={t('settings_ui_pause_hidden')}
                  description={t('settings_ui_pause_hidden_desc')}
                >
                  <Toggle
                    checked={draftPauseHidden}
                    onChange={() => setDraftPauseHidden((v) => !v)}
                  />
                </SettingRow>
              </Panel>
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <Panel title={t('settings_ui_panel_music')}>
                <SettingRow
                  icon={draftMusicEnabled ? LuVolume2 : LuVolumeX}
                  title={t('settings_ui_music')}
                  description={t('settings_ui_music_desc')}
                >
                  <Toggle
                    checked={draftMusicEnabled}
                    onChange={() => setDraftMusicEnabled((v) => !v)}
                  />
                </SettingRow>
                <SettingRow title={t('settings_ui_music_volume')} description={t('settings_ui_volume_range')}>
                  <Slider
                    value={draftMusicVolume}
                    onChange={setDraftMusicVolume}
                    disabled={!draftMusicEnabled}
                  />
                </SettingRow>
              </Panel>

              <Panel title={t('settings_ui_panel_sfx')}>
                <SettingRow
                  icon={LuVolume2}
                  title={t('settings_ui_sfx_volume')}
                  description={t('settings_ui_sfx_volume_desc')}
                >
                  <Slider
                    value={draftSfxVolume}
                    onChange={(value) => {
                      setDraftSfxVolume(value);
                      playUiClickPreview(value);
                    }}
                  />
                </SettingRow>
                <SettingRow title={t('settings_ui_mute_mode')} description={t('settings_ui_mute_mode_desc')}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMusicEnabled(false);
                      setDraftMusicVolume(0);
                      setDraftSfxVolume(0);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {t('settings_ui_mute_all')}
                  </button>
                </SettingRow>
              </Panel>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {profileLoading && !profile ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12151e]/80 animate-pulse">
                  <div className="h-24 bg-white/10" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-40 rounded bg-white/10" />
                    <div className="h-3 w-56 rounded bg-white/10" />
                    <div className="h-20 w-full rounded-xl bg-white/[0.06]" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12151e]/80">
                    <div className="relative h-24 sm:h-28">
                      {profile?.bannerUrl ? (
                        <Image
                          src={profile.bannerUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{
                            background: `linear-gradient(135deg, ${accent} 0%, #0b0d12 78%)`,
                          }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12151e] via-[#12151e]/35 to-transparent" />
                    </div>
                    <div className="relative -mt-10 px-4 pb-4 sm:px-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-end gap-3">
                          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-[#12151e] bg-white/5 shadow-lg sm:h-[4.5rem] sm:w-[4.5rem]">
                            <Image
                              src={profile?.avatarUrl || '/gif/cat.gif'}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="min-w-0 pb-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-lg font-bold text-white">{displayName}</p>
                              {profile?.has_tag && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                                  <LuTag className="h-3 w-3" />
                                  {t('settings_ui_badge_tag')}
                                </span>
                              )}
                              {profile?.is_booster && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-300">
                                  <LuCrown className="h-3 w-3" />
                                  {t('settings_ui_badge_booster')}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/45">@{profile?.username ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-center">
                            <p className="text-base font-bold tabular-nums text-white">{serverCount ?? 0}</p>
                            <p className="text-[10px] text-white/35">{t('settings_ui_connected_servers')}</p>
                          </div>
                          <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-center">
                            <p className="text-base font-bold tabular-nums text-white">
                              {profile?.roles?.length ?? 0}
                            </p>
                            <p className="text-[10px] text-white/35">{t('settings_ui_roles_count')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Panel title={t('settings_ui_panel_identity')}>
                    <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2">
                      {[
                        { label: t('settings_ui_display_name'), value: displayName },
                        { label: t('settings_ui_username'), value: profile?.username ? `@${profile.username}` : '—' },
                        { label: t('settings_ui_nickname'), value: profile?.nickname || t('settings_ui_nickname_none') },
                        {
                          label: t('settings_ui_discord_account'),
                          value: formatDate(discordCreatedAt) || '—',
                          hint: t('settings_ui_snowflake_hint'),
                        },
                      ].map((row) => (
                        <div key={row.label} className="bg-[#12151e] px-3.5 py-3 sm:px-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                            {row.label}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-white/90">{row.value}</p>
                          {'hint' in row && row.hint ? (
                            <p className="mt-0.5 text-[10px] text-white/25">{row.hint}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 border-t border-white/[0.06] px-3.5 py-3 sm:px-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-white/45">
                        <LuHash className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                          {t('settings_ui_discord_user_id')}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-white/75">
                          {profile?.userId ?? '—'}
                        </p>
                      </div>
                      {profile?.userId ? (
                        <button
                          type="button"
                          onClick={() => copyText('id', profile.userId!)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          <LuCopy className="h-3.5 w-3.5" />
                          {copiedField === 'id' ? t('settings_ui_copied') : t('settings_ui_copy')}
                        </button>
                      ) : null}
                    </div>
                  </Panel>

                  <Panel title={t('settings_ui_panel_active_server')}>
                    <div className="flex items-center gap-3 px-3.5 py-3.5 sm:px-4">
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        {activeGuildIcon ? (
                          <Image src={activeGuildIcon} alt="" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/35">
                            <LuServer className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{activeGuildName}</p>
                        <p className="mt-0.5 text-[11px] text-white/40">
                          {formatDate(profile?.joinedAt)
                            ? t('settings_ui_joined', { date: formatDate(profile?.joinedAt) ?? '' })
                            : t('settings_ui_joined_unknown')}
                        </p>
                      </div>
                      <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                        {t('settings_ui_active')}
                      </span>
                    </div>
                    <SettingRow
                      icon={LuCalendar}
                      title={t('settings_ui_server_join')}
                      description={formatDateTime(profile?.joinedAt) || t('settings_ui_join_unavailable')}
                    >
                      <span className="text-xs font-semibold text-white/50">
                        {formatDate(profile?.joinedAt) || '—'}
                      </span>
                    </SettingRow>
                    <SettingRow
                      icon={LuLink2}
                      title={t('settings_ui_linked_servers')}
                      description={t('settings_ui_linked_servers_desc')}
                    >
                      <span className="text-xs font-semibold tabular-nums text-white/70">
                        {serverCount ?? 0}
                      </span>
                    </SettingRow>
                  </Panel>

                  <Panel title={t('settings_ui_panel_roles')}>
                    <div className="px-3.5 py-3 sm:px-4">
                      {profile?.roles?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {profile.roles.map((role) => {
                            const color = role.color > 0 ? formatRoleColor(role.color) : '#99aab5';
                            return (
                              <span
                                key={role.id}
                                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                style={{
                                  borderColor: `${color}55`,
                                  background: `${color}18`,
                                  color,
                                }}
                                title={role.id}
                              >
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ background: color }}
                                />
                                {role.name}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40">{t('settings_ui_no_roles')}</p>
                      )}
                    </div>
                  </Panel>

                  {(profile?.has_tag || profile?.is_booster || profile?.about) && (
                    <Panel title={t('settings_ui_panel_membership')}>
                      {profile?.has_tag && (
                        <SettingRow
                          icon={LuTag}
                          title={t('settings_ui_server_tag')}
                          description={
                            formatDateTime(profile.tag_granted_at)
                              ? t('settings_ui_granted', { date: formatDateTime(profile.tag_granted_at) ?? '' })
                              : t('settings_ui_tag_active')
                          }
                        >
                          <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-300">
                            {t('settings_ui_active')}
                          </span>
                        </SettingRow>
                      )}
                      {profile?.is_booster && (
                        <SettingRow
                          icon={LuCrown}
                          title={t('settings_ui_server_boost')}
                          description={
                            formatDateTime(profile.booster_since)
                              ? t('settings_ui_boost_started', { date: formatDateTime(profile.booster_since) ?? '' })
                              : t('settings_ui_booster_active')
                          }
                        >
                          <span className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-bold text-fuchsia-300">
                            {t('settings_ui_badge_booster')}
                          </span>
                        </SettingRow>
                      )}
                      {profile?.about ? (
                        <div className="border-t border-white/[0.05] px-3.5 py-3 sm:px-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                            {t('settings_ui_about')}
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-white/65">
                            {profile.about}
                          </p>
                        </div>
                      ) : null}
                    </Panel>
                  )}

                  <Panel title={t('settings_ui_panel_oauth')}>
                    <div className="border-b border-white/[0.06] px-3.5 py-3 sm:px-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#5865F2]">
                          <LuKeyRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{t('settings_ui_oauth_title')}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-white/40">
                            {t('settings_ui_oauth_desc')}
                          </p>
                          <p className="mt-1.5 text-[10px] font-medium text-white/30">
                            {t('settings_ui_session_type')}{' '}
                            <span className="text-white/55">
                              {isActivityEmbed ? t('settings_ui_session_activity') : t('settings_ui_session_browser')}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-white/[0.05]">
                      {oauthScopes.map((scope) => {
                        const badge =
                          scope.status === 'granted'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : scope.status === 'optional'
                              ? 'border-white/15 bg-white/[0.04] text-white/45'
                              : 'border-amber-500/30 bg-amber-500/10 text-amber-300';
                        const badgeLabel =
                          scope.status === 'granted'
                            ? t('settings_ui_oauth_granted')
                            : scope.status === 'optional'
                              ? t('settings_ui_oauth_optional')
                              : t('settings_ui_oauth_web_only');
                        return (
                          <div key={scope.id} className="px-3.5 py-3 sm:px-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <code className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#a5b4fc]">
                                {scope.title}
                              </code>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}
                              >
                                {badgeLabel}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-white/60">{scope.description}</p>
                            <p className="mt-1 text-[11px] text-white/30">{t('settings_ui_oauth_usage', { uses: scope.uses })}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </>
              )}

              {(deleteMessage || requestMessage) && (
                <div className="space-y-2">
                  {deleteMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                      <LuCheck className="h-3.5 w-3.5 shrink-0" />
                      {deleteMessage}
                    </div>
                  )}
                  {requestMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#5865F2]/25 bg-[#5865F2]/10 px-3 py-2 text-xs text-[#a5b4fc]">
                      <LuCheck className="h-3.5 w-3.5 shrink-0" />
                      {requestMessage}
                    </div>
                  )}
                </div>
              )}

              <Panel title={t('settings_ui_panel_data')}>
                <SettingRow
                  icon={LuDownload}
                  title={t('settings_ui_request_data')}
                  description={t('settings_ui_request_data_desc')}
                >
                  <button
                    type="button"
                    onClick={openRequestModal}
                    className="rounded-lg bg-[#5865F2] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#4752C4]"
                  >
                    {t('settings_ui_send_dm')}
                  </button>
                </SettingRow>
              </Panel>

              <div className="overflow-hidden rounded-xl border border-rose-500/25 bg-rose-500/[0.04]">
                <div className="border-b border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-2 sm:px-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-300/80">
                    <LuTrash2 className="h-3.5 w-3.5" />
                    {t('settings_ui_danger_zone')}
                  </p>
                </div>
                {(['current', 'all'] as const).map((scope) => {
                  const option = deleteOptionConfig[scope];
                  return (
                    <SettingRow key={scope} title={option.title} description={option.description}>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(scope)}
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500 hover:text-white"
                      >
                        {option.button}
                      </button>
                    </SettingRow>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="fixed bottom-3 left-1/2 z-40 w-[min(36rem,calc(100%-1.25rem))] -translate-x-1/2 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#5865F2]/35 bg-[#0b0d12]/96 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <LuInfo className="h-4 w-4 shrink-0 text-[#5865F2]" />
              <p className="truncate text-xs font-medium text-white/75">{t('settings_ui_unsaved')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetChanges}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/45 transition hover:bg-white/[0.05] hover:text-white"
              >
                <LuUndo2 className="h-3.5 w-3.5" />
                {t('settings_ui_revert')}
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5865F2] px-3.5 text-xs font-bold text-white transition hover:bg-[#4752C4]"
              >
                <LuSave className="h-3.5 w-3.5" />
                {t('settings_ui_apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
      {requestConfirmModal}
    </section>
  );
}
