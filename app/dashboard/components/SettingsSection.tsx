'use client';

import { useEffect, useState } from 'react';
import { LuVolume2, LuGlobe, LuUser, LuFileCheck, LuCheck } from 'react-icons/lu';
import { useLocale } from '@/contexts/LocaleContext';
import type { MemberProfile } from '../types';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  currentGuildName?: string | null;
  profile?: MemberProfile | null;
};

export default function SettingsSection({
  currentGuildName,
  profile,
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
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl border border-white/10 bg-[#0b121a]/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">Ayarlar</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Dashboard Ayarları</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Ses, dil, hesap ve sözleşme onayları gibi en önemli tercihleriniz burada toplanıyor. Bu alan, ayarlarınızı hızlıca gözden geçirmenizi sağlar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-3xl border border-white/10 bg-[#0b0d12]/70 p-5 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.4)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Bölümler</p>
          </div>
          {[
            { id: 'sound', label: 'Ses Ayarları', Icon: LuVolume2 },
            { id: 'language', label: 'Dil Seçimi', Icon: LuGlobe },
            { id: 'account', label: 'Hesap Verileri', Icon: LuUser },
            { id: 'contracts', label: 'Sözleşmeler', Icon: LuFileCheck },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as 'sound' | 'language' | 'account' | 'contracts')}
              className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-[#0b0d12]/70 p-6 shadow-[0_24px_80px_-48px_rgba(0,0,0,0.4)]">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{activeTab === 'sound' ? 'Ses Ayarları' : activeTab === 'language' ? 'Dil Seçimi' : activeTab === 'account' ? 'Hesap Verileri' : 'Sözleşmeler'}</h2>
                <p className="mt-2 text-sm text-white/60">
                  {activeTab === 'sound'
                    ? 'Müzik tercihlerinizi burada yönetin.'
                    : activeTab === 'language'
                      ? 'Arayüz dilini seçin ve tercihlerinizi kaydedin.'
                      : activeTab === 'account'
                        ? 'Discord hesabınıza ait temel bilgileri görüntüleyin.'
                        : 'Onayladığınız sözleşmeleri buradan takip edebilirsiniz.'}
                </p>
              </div>
            </div>

            {activeTab === 'sound' && soundSettingsContent}
            {activeTab === 'language' && languageSettingsContent}
            {activeTab === 'account' && accountSettingsContent}
            {activeTab === 'contracts' && contractsSettingsContent}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b0d12]/60 p-6">
            <p className="text-sm font-semibold text-white">Ayarlar Sayfası Bilgisi</p>
            <p className="mt-3 text-sm text-white/60">
              Bu sayfa, hesabınızın en önemli ayarlarını tek bir yerde toplar. Seçtiğiniz dil ve ses tercihleri, tarayıcınızda otomatik olarak saklanır.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}