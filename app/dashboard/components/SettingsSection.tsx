'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import Image from 'next/image';
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
  LuMessageSquare,
  LuSave,
  LuUndo2,
  LuServer,
  LuTrash2,
  LuSlidersHorizontal,
  LuSparkles,
  LuZap,
  LuEye,
  LuPause,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { closeDiscordActivity, isDiscordActivityClient } from '@/lib/discordSdk';
import type { MemberProfile } from '../types';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  profile?: MemberProfile | null;
  serverCount?: number;
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
  serverCount,
  onBack,
}: SettingsSectionProps) {
  const displayName =
    profile?.displayName || profile?.nickname || profile?.username || 'Üye';

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
  const [accountDeletedExit, setAccountDeletedExit] = useState(false);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const openDeleteModal = (scope: 'all' | 'current') => {
    setDeleteScope(scope);
    setDeleteError(null);
    setDeleteModalOpen(true);
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
        setDeleteError('Veri silme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        return;
      }

      setDeleteMessage(
        deleteScope === 'all' ? 'Tüm verileriniz silindi.' : 'Sunucu verileriniz silindi. Sayfa yenileniyor...',
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
          setRequestError(
            'Veriler gönderilemedi. Lütfen Discord hesabınızda "Sunucu üyelerinden doğrudan mesaja izin ver" ayarınızın açık olduğundan emin olun.',
          );
        } else {
          setRequestError('Veri talep işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        }
        return;
      }
      setRequestMessage('Kişisel verileriniz başarıyla derlendi ve size Özel Mesaj (DM) olarak gönderildi!');
      setRequestModalOpen(false);
    } finally {
      setRequestLoading(false);
    }
  };

  const deleteOptionConfig = {
    all: {
      title: 'Tüm verileri sil',
      description: 'Platformdaki tüm Activity kayıtların kalıcı olarak silinir.',
      button: 'Hepsini sil',
      tone: 'bg-rose-500 hover:bg-rose-600',
      badge: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
      iconTone: 'text-rose-400',
    },
    current: {
      title: 'Bu sunucu verilerini sil',
      description: 'Yalnızca bulunduğun sunucuya ait kayıtlar temizlenir.',
      button: 'Sunucuyu temizle',
      tone: 'bg-amber-500 hover:bg-amber-600',
      badge: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
      iconTone: 'text-amber-400',
    },
  };

  const navItems = [
    { id: 'general' as const, label: 'Genel', icon: LuSlidersHorizontal },
    { id: 'sound' as const, label: 'Ses', icon: LuVolume2 },
    { id: 'account' as const, label: 'Hesap', icon: LuUser },
  ];

  const modalShell = (children: ReactNode) => (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0d12]/95 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );

  const requestConfirmModal = requestModalOpen
    ? modalShell(
        <>
          <div className="border-b border-white/[0.08] px-5 py-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#5865F2]/30 bg-[#5865F2]/10">
              <LuMessageSquare className="h-5 w-5 text-[#5865F2]" />
            </div>
            <h2 className="text-lg font-bold text-white">Veri talep onayı</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Verilerin JSON olarak Discord DM üzerinden gönderilecek.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <div className="flex gap-3">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-100/80">
                  İndirdiğin andan itibaren dosyanın güvenliği sana aittir.
                </p>
              </div>
            </div>
            {requestError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                {requestError}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleRequestConfirm}
                disabled={requestLoading}
                className="rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4] disabled:opacity-60"
              >
                {requestLoading ? 'Gönderiliyor...' : 'Kabul edip gönder'}
              </button>
            </div>
          </div>
        </>,
      )
    : null;

  const confirmModal =
    deleteModalOpen && deleteScope
      ? modalShell(
          <>
            <div className="border-b border-white/[0.08] px-5 py-5 text-center">
              <div
                className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border ${deleteOptionConfig[deleteScope].badge}`}
              >
                <LuShieldAlert className={`h-5 w-5 ${deleteOptionConfig[deleteScope].iconTone}`} />
              </div>
              <h2 className="text-lg font-bold text-white">Bu işlem geri alınamaz</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/45">
                {deleteOptionConfig[deleteScope].description}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
                <div className="flex gap-3">
                  <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-xs leading-relaxed text-amber-100/80">
                    Onayladığın anda seçtiğin kapsamdaki kayıtlar kalıcı olarak silinir.
                  </p>
                </div>
              </div>
              {deleteError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                  {deleteError}
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${deleteOptionConfig[deleteScope].tone}`}
                >
                  {deleteLoading ? 'Siliniyor...' : deleteOptionConfig[deleteScope].button}
                </button>
              </div>
            </div>
          </>,
        )
      : null;

  if (accountDeletedExit) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[#0b0d12] px-6 text-white">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <LuCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Verilerin silindi</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            DiscoWeb Activity verilerin kalıcı olarak kaldırıldı. Bu pencereyi kapatabilirsin.
          </p>
        </div>
      </div>
    );
  }

  const presets: { id: Preset; label: string; icon: typeof LuZap; hint: string }[] = [
    { id: 'performance', label: 'Performans', icon: LuZap, hint: 'Az animasyon, düşük ses' },
    { id: 'balanced', label: 'Dengeli', icon: LuSparkles, hint: 'Önerilen varsayılan' },
    { id: 'quality', label: 'Kalite', icon: LuEye, hint: 'Tam efekt, yüksek ses' },
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
              Geri
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Ayarlar</h1>
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
              <Panel title="Önerilen profil">
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

              <Panel title="Arayüz">
                <SettingRow
                  icon={LuSparkles}
                  title="Animasyonlar"
                  description="Geçiş ve vurgu animasyonlarını kapatır"
                >
                  <Toggle
                    checked={!draftReduceMotion}
                    onChange={() => setDraftReduceMotion((v) => !v)}
                  />
                </SettingRow>
                <SettingRow
                  icon={LuSlidersHorizontal}
                  title="Yoğun görünüm"
                  description="Daha sıkı boşluklarla kompakt panel"
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
                        {mode === 'normal' ? 'Normal' : 'Kompakt'}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow
                  icon={LuPause}
                  title="Sekme gizlenince müziği duraklat"
                  description="Activity arka plandayken müziği otomatik kes"
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
              <Panel title="Müzik">
                <SettingRow
                  icon={draftMusicEnabled ? LuVolume2 : LuVolumeX}
                  title="Arka plan müziği"
                  description="Dashboard açılışında müzik çalsın"
                >
                  <Toggle
                    checked={draftMusicEnabled}
                    onChange={() => setDraftMusicEnabled((v) => !v)}
                  />
                </SettingRow>
                <SettingRow title="Müzik seviyesi" description="0–100">
                  <Slider
                    value={draftMusicVolume}
                    onChange={setDraftMusicVolume}
                    disabled={!draftMusicEnabled}
                  />
                </SettingRow>
              </Panel>

              <Panel title="Arayüz sesleri">
                <SettingRow
                  icon={LuVolume2}
                  title="Efekt seviyesi"
                  description="Tıklama ve bildirim sesleri için saklanır"
                >
                  <Slider value={draftSfxVolume} onChange={setDraftSfxVolume} />
                </SettingRow>
                <SettingRow title="Sessiz mod" description="Müzik ve efektleri tek tuşta kapat">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMusicEnabled(false);
                      setDraftMusicVolume(0);
                      setDraftSfxVolume(0);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Hepsini sustur
                  </button>
                </SettingRow>
              </Panel>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <Panel title="Profil">
                <div className="flex items-center gap-3 px-3.5 py-3.5 sm:px-4">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10">
                    <Image
                      src={profile?.avatarUrl || '/gif/cat.gif'}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{displayName}</p>
                    <p className="truncate text-xs text-white/40">@{profile?.username ?? '—'}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-white/25">
                      ID {profile?.userId ?? '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-center">
                    <p className="text-lg font-bold tabular-nums text-white">{serverCount ?? 0}</p>
                    <p className="text-[10px] font-medium text-white/35">sunucu</p>
                  </div>
                </div>
                <SettingRow
                  icon={LuServer}
                  title="Roller"
                  description={
                    profile?.roles?.length
                      ? `${profile.roles.length} rol bağlı`
                      : 'Bu sunucuda rol yok'
                  }
                >
                  <span className="text-xs font-semibold tabular-nums text-white/50">
                    {profile?.roles?.length ?? 0}
                  </span>
                </SettingRow>
              </Panel>

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

              <Panel title="Veri">
                <SettingRow
                  icon={LuDownload}
                  title="Veri dosyasını iste"
                  description="JSON arşivini Discord DM ile gönder"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setRequestError(null);
                      setRequestModalOpen(true);
                    }}
                    className="rounded-lg bg-[#5865F2] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#4752C4]"
                  >
                    DM gönder
                  </button>
                </SettingRow>
              </Panel>

              <div className="overflow-hidden rounded-xl border border-rose-500/25 bg-rose-500/[0.04]">
                <div className="border-b border-rose-500/15 bg-rose-500/[0.06] px-3.5 py-2 sm:px-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-300/80">
                    <LuTrash2 className="h-3.5 w-3.5" />
                    Tehlikeli bölge
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
              <p className="truncate text-xs font-medium text-white/75">Uygulanmamış değişiklikler</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetChanges}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white/45 transition hover:bg-white/[0.05] hover:text-white"
              >
                <LuUndo2 className="h-3.5 w-3.5" />
                Geri al
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#5865F2] px-3.5 text-xs font-bold text-white transition hover:bg-[#4752C4]"
              >
                <LuSave className="h-3.5 w-3.5" />
                Uygula
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
