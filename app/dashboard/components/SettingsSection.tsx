'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  LuVolume2,
  LuGlobe,
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
} from 'react-icons/lu';
import { useLocale } from '@/contexts/LocaleContext';
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

type TabId = 'account' | 'sound' | 'language';

const SURFACE = 'rounded-2xl border border-white/[0.08] bg-white/[0.03]';
const SURFACE_SOFT = 'rounded-xl border border-white/[0.06] bg-white/[0.02]';

export default function SettingsSection({
  profile,
  serverCount,
  onBack,
}: SettingsSectionProps) {
  const { locale, setDiscordLocale } = useLocale();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const displayName =
    profile?.displayName || profile?.nickname || profile?.username || 'Üye';

  const [activeTab, setActiveTab] = useState<TabId>('account');

  const [savedSoundEnabled, setSavedSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('dashboard_music_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [savedSoundVolume, setSavedSoundVolume] = useState(() => {
    if (typeof window === 'undefined') return 70;
    const stored = window.localStorage.getItem('dashboard_music_volume');
    if (stored !== null) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) return Math.min(100, Math.max(0, parsed));
    }
    return 70;
  });

  const [draftSoundEnabled, setDraftSoundEnabled] = useState(savedSoundEnabled);
  const [draftSoundVolume, setDraftSoundVolume] = useState(savedSoundVolume);
  const [draftLocale, setDraftLocale] = useState(locale);

  useEffect(() => {
    setDraftLocale(locale);
  }, [locale]);

  const hasUnsavedChanges =
    draftSoundEnabled !== savedSoundEnabled ||
    draftSoundVolume !== savedSoundVolume ||
    draftLocale !== locale;

  const handleSaveChanges = () => {
    window.localStorage.setItem('dashboard_music_enabled', String(draftSoundEnabled));
    window.localStorage.setItem('dashboard_music_volume', String(draftSoundVolume));
    window.dispatchEvent(new Event('dashboard-music-settings-changed'));

    if (draftLocale !== locale) {
      setDiscordLocale(draftLocale);
    }

    setSavedSoundEnabled(draftSoundEnabled);
    setSavedSoundVolume(draftSoundVolume);
  };

  const handleResetChanges = () => {
    setDraftSoundEnabled(savedSoundEnabled);
    setDraftSoundVolume(savedSoundVolume);
    setDraftLocale(locale);
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
      title: 'Tüm Verileri Kalıcı Olarak Sil',
      description: 'DiscoWeb platformundaki tüm kişisel verilerinizi kalıcı ve geri dönülemez şekilde siler.',
      button: 'Tüm Verilerimi Sil',
      tone: 'bg-rose-500 hover:bg-rose-600',
      badge: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
      iconTone: 'text-rose-400',
    },
    current: {
      title: 'Yalnızca Mevcut Sunucu Verilerini Sil',
      description: 'Hesabınızı etkilemeden, yalnızca bulunduğunuz sunucuya ait kayıt ve istatistikleri temizler.',
      button: 'Mevcut Sunucu Verilerini Sil',
      tone: 'bg-amber-500 hover:bg-amber-600',
      badge: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
      iconTone: 'text-amber-400',
    },
  };

  const navItems = [
    { id: 'account' as const, label: 'Hesap', icon: LuUser },
    { id: 'sound' as const, label: 'Ses', icon: LuVolume2 },
    { id: 'language' as const, label: 'Dil', icon: LuGlobe },
  ];

  const modalShell = (children: ReactNode) => (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <div className={`${SURFACE} w-full max-w-md overflow-hidden bg-[#0b0d12]/95 shadow-2xl animate-in fade-in zoom-in-95 duration-200`}>
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
            <h2 className="text-lg font-bold text-white">Veri Talep Onayı</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Kişisel verileriniz (profil, cüzdan, vb.) bir .json dosyası olarak size DM üzerinden gönderilecek.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5">
              <div className="flex gap-3">
                <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-100/80">
                  Bu verileri indirdiğiniz andan itibaren güvenliği size aittir. Üçüncü şahıslarla paylaşımından
                  DiscoWeb sorumlu değildir.
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
                    Onayladığınız anda seçtiğiniz kapsamdaki kayıtlar kalıcı olarak silinir.
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

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-1 pb-24 sm:px-2">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mb-3 inline-flex items-center gap-2 text-xs font-medium text-white/40 transition hover:text-white"
            >
              <LuArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              Panoya dön
            </button>
          )}
          <p className="text-xs font-medium text-[#5865F2]">
            {greeting}
            {profile?.nickname ? `, ${profile.nickname}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Ayarlar</h1>
          <p className="mt-1.5 max-w-xl text-sm text-white/40">
            Hesap, ses ve dil tercihlerini buradan yönet.
          </p>
        </div>

        <div className={`${SURFACE} flex items-center gap-3 px-3.5 py-2.5`}>
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
            <Image
              src={profile?.avatarUrl || '/gif/cat.gif'}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
            <p className="truncate text-[11px] text-white/35">@{profile?.username ?? '—'}</p>
          </div>
        </div>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'border-[#5865F2]/40 bg-[#5865F2]/15 text-white'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/45 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/80'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-[#5865F2]' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        {activeTab === 'account' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`${SURFACE} overflow-hidden`}>
              <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-white">Profil özeti</h3>
                <p className="mt-0.5 text-xs text-white/35">Discord hesabından gelen görünür bilgiler</p>
              </div>
              <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2">
                <div className="bg-[#0e1018] p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                    Kullanıcı adı
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{profile?.username ?? '—'}</p>
                  <p className="mt-1 font-mono text-[11px] text-white/30">ID {profile?.userId ?? '—'}</p>
                </div>
                <div className="bg-[#0e1018] p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                    Görünür isim
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{displayName}</p>
                  <p className="mt-1 text-[11px] text-white/30">
                    {profile?.roles?.length ? `${profile.roles.length} rol` : 'Rol yok'}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${SURFACE} flex items-start gap-4 p-4 sm:p-5`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#5865F2]/25 bg-[#5865F2]/10 text-[#5865F2]">
                <LuServer className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tabular-nums text-white">{serverCount ?? 0}</p>
                  <p className="text-sm font-medium text-white/50">aktif sunucu</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/35">
                  Kayıtlarının bulunduğu sunucu sayısı. Ekonomi ve portföy verilerin bu bağlantılara bağlı.
                </p>
              </div>
            </div>

            {(deleteMessage || requestMessage) && (
              <div className="space-y-2">
                {deleteMessage && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    <LuCheck className="h-4 w-4 shrink-0" />
                    {deleteMessage}
                  </div>
                )}
                {requestMessage && (
                  <div className="flex items-center gap-3 rounded-xl border border-[#5865F2]/25 bg-[#5865F2]/10 px-4 py-3 text-sm text-[#a5b4fc]">
                    <LuCheck className="h-4 w-4 shrink-0" />
                    {requestMessage}
                  </div>
                )}
              </div>
            )}

            <div className={`${SURFACE} overflow-hidden`}>
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
                <LuDownload className="h-4 w-4 text-[#5865F2]" />
                <h3 className="text-sm font-semibold text-white">Veri talebi</h3>
              </div>
              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="max-w-md">
                  <p className="text-sm font-medium text-white/90">Verilerini indir</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/35">
                    Aktivite kayıtlarını JSON olarak Discord DM üzerinden isteyebilirsin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequestError(null);
                    setRequestModalOpen(true);
                  }}
                  className="shrink-0 rounded-xl bg-[#5865F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4752C4]"
                >
                  DM olarak gönder
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/[0.04]">
              <div className="flex items-center gap-2 border-b border-rose-500/15 px-4 py-3 sm:px-5">
                <LuTrash2 className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-semibold text-rose-300">Tehlikeli bölge</h3>
              </div>
              <div className="divide-y divide-rose-500/10">
                {(['current', 'all'] as const).map((scope) => {
                  const option = deleteOptionConfig[scope];
                  return (
                    <div
                      key={scope}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    >
                      <div className="max-w-md">
                        <p className="text-sm font-medium text-white/90">{option.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-white/35">{option.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(scope)}
                        className="shrink-0 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500 hover:text-white"
                      >
                        {option.button}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sound' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`${SURFACE} p-4 sm:p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Arka plan müziği</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/35">
                    Dashboard açıldığında müziğin otomatik başlamasına izin ver.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftSoundEnabled}
                  onClick={() => setDraftSoundEnabled(!draftSoundEnabled)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border border-white/10 transition ${
                    draftSoundEnabled ? 'bg-[#5865F2]' : 'bg-white/10'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      draftSoundEnabled ? 'left-[1.35rem]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="my-5 h-px bg-white/[0.06]" />

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Ses seviyesi</p>
                  <span className="font-mono text-xs font-semibold tabular-nums text-[#5865F2]">
                    {draftSoundVolume}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/35">Müzik çıkış seviyesini ayarla.</p>
                <div className="mt-4 flex items-center gap-3">
                  <LuVolume2 className="h-4 w-4 text-white/30" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={draftSoundVolume}
                    onChange={(event) => setDraftSoundVolume(Number(event.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#5865F2]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'language' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: 'tr' as const, label: 'Türkçe', desc: 'Arayüz dilini Türkçe yap' },
                { id: 'en' as const, label: 'English', desc: 'Set interface language to English' },
              ].map((lang) => {
                const active = draftLocale === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setDraftLocale(lang.id)}
                    className={`${SURFACE_SOFT} p-4 text-left transition ${
                      active
                        ? 'border-[#5865F2]/40 bg-[#5865F2]/10'
                        : 'hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/70'}`}>
                        {lang.label}
                      </p>
                      {active && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865F2] text-white">
                          <LuCheck className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-white/35">{lang.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-1/2 z-40 w-[min(40rem,calc(100%-1.5rem))] -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#5865F2]/30 bg-[#0b0d12]/95 p-3 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/15 text-[#5865F2]">
                <LuInfo className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-white/80">Kaydedilmemiş değişikliklerin var</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetChanges}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium text-white/45 transition hover:bg-white/[0.05] hover:text-white sm:flex-none"
              >
                <LuUndo2 className="h-4 w-4" />
                Sıfırla
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition hover:bg-[#4752C4] sm:flex-none"
              >
                <LuSave className="h-4 w-4" />
                Kaydet
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
