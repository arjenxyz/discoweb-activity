'use client';

import { useEffect, useState } from 'react';
import { LuVault, LuArrowRight, LuCheck, LuClock, LuVolume2, LuGlobe, LuUser, LuFileCheck } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { useLocale, useT } from '@/contexts/LocaleContext';
import type { MemberProfile } from '../types';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  currentGuildName?: string | null;
  profile?: MemberProfile | null;
};

export default function SettingsSection({
  currentGuildName,
}: SettingsSectionProps) {
  const { locale, setDiscordLocale, t } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sound' | 'language' | 'account' | 'contracts'>('sound');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(70);
  const [acceptedContracts, setAcceptedContracts] = useState<Record<string, boolean>>({
    privacy_policy: false,
    terms_of_service: false,
    data_processing: false,
  });

  const contractItems = [
    { key: 'privacy_policy', title: 'Gizlilik Politikası', description: 'Kişisel verilerin nasıl işlendiğini kabul ettiniz.' },
    { key: 'terms_of_service', title: 'Kullanım Şartları', description: 'Servis kullanım kurallarını ve sorumlulukları kabul ettiniz.' },
    { key: 'data_processing', title: 'Veri İşleme Onayı', description: 'Veri işleme ve analiz için izin verdiniz.' },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedEnabled = window.localStorage.getItem('dashboard_music_enabled');
    const storedVolume = window.localStorage.getItem('dashboard_music_volume');
    const storedContracts = window.localStorage.getItem('dashboard_accepted_contracts');

    if (storedEnabled !== null) setSoundEnabled(storedEnabled === 'true');
    if (storedVolume !== null) {
      const parsed = Number(storedVolume);
      if (Number.isFinite(parsed)) setSoundVolume(Math.min(100, Math.max(0, parsed)));
    }
    if (storedContracts) {
      try {
        const parsed = JSON.parse(storedContracts) as Record<string, boolean>;
        setAcceptedContracts((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore invalid stored value
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('dashboard_music_enabled', String(soundEnabled));
    window.localStorage.setItem('dashboard_music_volume', String(soundVolume));
    window.dispatchEvent(new Event('dashboard-music-settings-changed'));
  }, [soundEnabled, soundVolume]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('dashboard_accepted_contracts', JSON.stringify(acceptedContracts));
  }, [acceptedContracts]);

  const handleLocaleChange = (value: 'en' | 'tr') => {
    setDiscordLocale(value);
  };

  const soundSettingsContent = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Müzik Etkinliği</p>
            <p className="mt-1 text-xs text-white/60">Dashboard açıldığında müzik otomatik olarak başlaması için ayarlayın.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
            <span>{soundEnabled ? 'Açık' : 'Kapalı'}</span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <p className="text-sm font-semibold text-white">Ses Seviyesi</p>
        <p className="mt-1 text-xs text-white/60">Müzik sesini ayarlayın.</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={soundVolume}
            onChange={(event) => setSoundVolume(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-500"
          />
          <span className="w-12 text-right text-sm text-white/80">{soundVolume}%</span>
        </div>
      </div>
    </div>
  );

  const languageSettingsContent = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <p className="text-sm font-semibold text-white">Arayüz Dili</p>
        <p className="mt-1 text-xs text-white/60">Uygulamanın tercih ettiğiniz dilde görünmesini sağlayın.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {['tr', 'en'].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLocaleChange(lang as 'tr' | 'en')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${locale === lang ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              {lang === 'tr' ? 'Türkçe' : 'English'}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <p className="text-sm font-semibold text-white">Geçerli Dil</p>
        <p className="mt-2 text-sm text-white/80">{locale === 'tr' ? 'Türkçe' : 'English'}</p>
      </div>
    </div>
  );

  const accountSettingsContent = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <p className="text-sm font-semibold text-white">Hesap Bilgileri</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Kullanıcı Adı</p>
            <p className="mt-2 text-sm text-white">{profile?.username ?? 'Bilinmiyor'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Görünür İsim</p>
            <p className="mt-2 text-sm text-white">{profile?.displayName ?? profile?.nickname ?? 'Mevcut yok'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Discord ID</p>
            <p className="mt-2 text-sm text-white">{profile?.userId ?? 'Bilinmiyor'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">Roller</p>
            <p className="mt-2 text-sm text-white">{profile?.roles?.length ? `${profile.roles.length} adet` : 'Yok'}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
        <p className="text-sm font-semibold text-white">Hesap Detayı</p>
        <p className="mt-2 text-sm text-white/60">Bu alandan hesap verilerinizi görüntüleyebilir ve gerektiğinde güncelleme işlemi için destek talebi başlatabilirsiniz.</p>
      </div>
    </div>
  );

  const contractsSettingsContent = (
    <div className="space-y-4">
      {contractItems.map((contract) => (
        <div key={contract.key} className="rounded-2xl border border-white/10 bg-[#121827]/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">{contract.title}</p>
              <p className="mt-1 text-xs text-white/60">{contract.description}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${acceptedContracts[contract.key] ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
              {acceptedContracts[contract.key] ? 'Onaylandı' : 'Beklemede'}
            </span>
          </div>
          {!acceptedContracts[contract.key] && (
            <button
              type="button"
              onClick={() => setAcceptedContracts((prev) => ({ ...prev, [contract.key]: true }))}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <LuCheck className="h-4 w-4" /> Onayla
            </button>
          )}
        </div>
      ))}
    </div>
  );
  const [economyTier, setEconomyTier] = useState<'basic' | 'advanced' | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [starterPackage, setStarterPackage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // IPO başvuru state'leri
  const [ipoListed, setIpoListed] = useState(false);
  const [ipoListing, setIpoListing] = useState<{ status: string; market_price: number; ipo_price: number } | null>(null);
  const [ipoPending, setIpoPending] = useState(false);
  const [ipoPrice, setIpoPrice] = useState('');
  const [ipoFounderRatio, setIpoFounderRatio] = useState('55');
  const [ipoLoading, setIpoLoading] = useState(false);
  const [ipoSuccess, setIpoSuccess] = useState(false);
  const [ipoError, setIpoError] = useState<string | null>(null);
  const [ipoEstimatedDate, setIpoEstimatedDate] = useState('');

  useEffect(() => {
    fetchWithCreds('/api/member/treasury')
      .then(async (r) => {
        if (!r.ok) { console.error(`[treasury/settings] HTTP ${r.status}`); return; }
        const d = await r.json();
        setEconomyTier(d.economy_tier ?? 'basic');
      })
      .catch((err) => console.error('[treasury/settings] fetch failed:', err));

    // Bekleyen başvuru kontrolü
    fetchWithCreds('/api/member/economy-tier-status')
      .then((r) => r.json())
      .then((d) => { if (d.pending) setHasPending(true); })
      .catch(() => {});

    // IPO durum kontrolü
    fetch(apiUrl('/api/member/ipo-status'))
      .then((r) => r.json())
      .then((d) => {
        if (d.listed) {
          setIpoListed(true);
          setIpoListing(d.listing);
        } else if (d.pending) {
          setIpoPending(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleIpoApply = async () => {
    const price = Number(ipoPrice);
    const ratio = Number(ipoFounderRatio) / 100;
    if (!price || price <= 0) { setIpoError(t('settings_error_invalid_price')); return; }
    if (ratio < 0.51 || ratio > 0.80) { setIpoError(t('settings_error_founder_range')); return; }
    setIpoLoading(true);
    setIpoError(null);
    try {
      const res = await fetchWithCreds('/api/member/ipo-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_price: price,
          proposed_founder_ratio: ratio,
          ...(ipoEstimatedDate ? { estimated_date: ipoEstimatedDate } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msgs: Record<string, string> = {
          forbidden: t('settings_error_ipo_forbidden'),
          not_advanced: t('settings_error_not_advanced'),
          already_listed: t('settings_error_already_listed'),
          pending_exists: t('settings_error_pending_exists'),
          invalid_price: t('settings_error_invalid_price'),
          invalid_founder_ratio: t('settings_error_founder_range'),
        };
        throw new Error(msgs[data.error] ?? t('settings_error_ipo_submit_failed'));
      }
      setIpoSuccess(true);
      setIpoPending(true);
    } catch (e: unknown) {
      setIpoError(e instanceof Error ? e.message : t('settings_error_generic'));
    } finally {
      setIpoLoading(false);
    }
  };

  const handleApply = async () => {
    const pkg = Number(starterPackage);
    if (!Number.isFinite(pkg) || pkg < 0) {
      setApplyError(t('settings_error_invalid_amount'));
      return;
    }
    setApplyLoading(true);
    setApplyError(null);
    try {
      const res = await fetchWithCreds('/api/member/economy-tier-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starter_package: pkg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msgs: Record<string, string> = {
          forbidden: t('settings_error_economy_forbidden'),
          already_advanced: t('settings_error_already_advanced'),
          pending_application_exists: t('settings_error_pending_application'),
          invalid_starter_package: t('settings_error_invalid_package'),
        };
        throw new Error(msgs[data.error] ?? t('settings_error_apply_submit_failed'));
      }
      setApplySuccess(true);
      setHasPending(true);
    } catch (e: unknown) {
      setApplyError(e instanceof Error ? e.message : t('settings_error_generic'));
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Hesap Ayarları</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
          {[
            { id: 'sound', label: 'Ses Ayarları', Icon: LuVolume2 },
            { id: 'language', label: 'Dil Seçimi', Icon: LuGlobe2 },
            { id: 'account', label: 'Hesap Verileri', Icon: LuUser },
            { id: 'contracts', label: 'Onaylanan Sözleşmeler', Icon: LuFileCheck },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as 'sound' | 'language' | 'account' | 'contracts')}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === item.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
          {activeTab === 'sound' && soundSettingsContent}
          {activeTab === 'language' && languageSettingsContent}
          {activeTab === 'account' && accountSettingsContent}
          {activeTab === 'contracts' && contractsSettingsContent}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm text-white/60">
            {t('settings_section_description')}
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">{t('settings_code_management_title')}</p>
            <p className="mt-2 text-sm text-white/60">{t('settings_code_management_description')}</p>
            <div className="mt-3">
              <p className="text-sm text-white/60">{t('settings_code_management_hint')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4 text-sm text-white/60">
          {t('settings_account_details_hidden')}
        </div>
      </div>

      {/* Yüksek Ekonomi Başvurusu */}
      {economyTier === 'basic' && (
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <LuVault className="h-4 w-4 text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">{t('settings_advanced_title')}</p>
            {hasPending && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                <LuClock className="h-3 w-3" /> {t('settings_advanced_reviewing')}
              </span>
            )}
          </div>

          {applySuccess || hasPending ? (
            <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
              <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">{t('settings_advanced_success_title')}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {t('settings_advanced_success_description')}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/50 mb-4" dangerouslySetInnerHTML={{ __html: t('settings_advanced_apply_description') }} />

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    {t('settings_advanced_package_label')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={starterPackage}
                    onChange={(e) => setStarterPackage(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50"
                  />
                  <p className="mt-1 text-[11px] text-white/25">
                    {t('settings_advanced_package_hint')}
                  </p>
                </div>

                {applyError && <p className="text-xs text-red-400">{applyError}</p>}

                <button
                  type="button"
                  disabled={applyLoading}
                  onClick={handleApply}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {applyLoading ? t('settings_advanced_submitting') : <><LuArrowRight className="h-4 w-4" /> {t('settings_advanced_submit_button')}</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {economyTier === 'advanced' && (
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-center gap-2">
            <LuVault className="h-4 w-4 text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">{t('settings_advanced_title')}</p>
            <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{t('settings_advanced_active')}</span>
          </div>
          <p className="mt-2 text-sm text-white/40">{t('settings_advanced_status_description')}</p>

          {/* IPO Başvurusu */}
          <div className="mt-4 border-t border-white/10 pt-4">
            {ipoListed && ipoListing ? (
              <div className="flex items-center gap-2">
                <LuCheck className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">{t('settings_ipo_listed_title')}</p>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  ipoListing.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400'
                  : ipoListing.status === 'suspended' ? 'bg-yellow-500/15 text-yellow-400'
                  : 'bg-red-500/15 text-red-400'
                }`}>{ipoListing.status === 'approved' ? t('settings_ipo_status_active') : ipoListing.status === 'suspended' ? t('settings_ipo_status_suspended') : t('settings_ipo_status_delisted')}</span>
              </div>
            ) : ipoPending || ipoSuccess ? (
              <div className="flex items-center gap-2">
                <LuClock className="h-4 w-4 text-yellow-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-300">{t('settings_ipo_pending_title')}</p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300 mb-2">{t('settings_ipo_apply_title')}</p>
                <p className="text-xs text-white/40 mb-3">
                  {t('settings_ipo_apply_description')}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="number"
                    min={1}
                    placeholder={t('settings_ipo_price_placeholder')}
                    value={ipoPrice}
                    onChange={(e) => setIpoPrice(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={51}
                      max={80}
                      placeholder="Founder %"
                      value={ipoFounderRatio}
                      onChange={(e) => setIpoFounderRatio(e.target.value)}
                      className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-white/40">{t('settings_ipo_founder_label')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/40">
                    {t('settings_ipo_date_label')} <span className="text-white/25">{t('settings_ipo_date_hint')}</span>
                  </label>
                  <input
                    type="date"
                    value={ipoEstimatedDate}
                    min={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                    onChange={(e) => setIpoEstimatedDate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIpoApply}
                  disabled={ipoLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {ipoLoading ? t('settings_ipo_submitting') : <><LuArrowRight className="h-3.5 w-3.5" /> {t('settings_ipo_apply_button')}</>}
                </button>
                {ipoError && <p className="mt-2 text-xs text-red-400">{ipoError}</p>}
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">{t('settings_delete_title')}</p>
        <p className="mt-2 text-sm text-white/60">
          {t('settings_delete_description')}
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          onClick={() => {
            setError(null);
            setMessage(null);
            setScope('current');
            setIsModalOpen(true);
          }}
        >
          {t('settings_delete_button')}
        </button>

        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f121a] p-6 shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold">{t('settings_delete_modal_title')}</h3>
            <p className="mt-2 text-sm text-white/70">{t('settings_delete_modal_question')}</p>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={scope === 'current'}
                  onChange={() => setScope('current')}
                  className="h-4 w-4"
                />
                {currentGuildName ? t('settings_delete_current_server', { serverName: currentGuildName }) : t('settings_delete_current_fallback')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="h-4 w-4"
                />
                {t('settings_delete_all_servers')}
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
              >
                {t('settings_delete_cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    setError(null);
                    const response = await fetchWithCreds('/api/member/delete-data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scope }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      throw new Error(data.error || t('settings_delete_error'));
                    }
                    setMessage(t('settings_delete_success'));
                    setIsModalOpen(false);

                    // Oturum cookie'lerini ve auth verilerini temizle
                    // selectedGuildId'yi temizleme — guild bilgisi kişisel veri değil, yönlendirmede gerekli
                    try { localStorage.removeItem('discord_bearer_token'); } catch {}
                    document.cookie = 'discord_session=; Max-Age=0; path=/';
                    document.cookie = 'discord_activity_session=; Max-Age=0; path=/';

                    // guild_id'yi URL'ye ekleyerek yönlendir — aksi halde Activity bot bulamıyor
                    const guildId = data.guildId ?? localStorage.getItem('selectedGuildId') ?? new URLSearchParams(window.location.search).get('guild_id');
                    const redirectUrl = guildId ? `/activity?guild_id=${encodeURIComponent(guildId)}` : '/activity';
                    window.location.assign(redirectUrl);
                    return;
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : t('settings_delete_error'));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? t('settings_delete_deleting') : t('settings_delete_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}