'use client';

import { useEffect, useState } from 'react';
import { LuVolume2, LuGlobe, LuUser, LuFileCheck, LuCheck } from 'react-icons/lu';
import { useLocale } from '@/contexts/LocaleContext';
import type { MemberProfile } from '../types';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  profile?: MemberProfile | null;
};

export default function SettingsSection({
  profile,
}: SettingsSectionProps) {
  const { locale, setDiscordLocale } = useLocale();
  const [serverTime, setServerTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istanbulTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      const formatted = `UTC+3 ${istanbulTime.toLocaleDateString('tr-TR')} ${istanbulTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      setServerTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const [activeTab, setActiveTab] = useState<'sound' | 'language' | 'account' | 'contracts'>('sound');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('dashboard_music_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window === 'undefined') return 70;
    const stored = window.localStorage.getItem('dashboard_music_volume');
    if (stored !== null) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) return Math.min(100, Math.max(0, parsed));
    }
    return 70;
  });
  const [acceptedContracts, setAcceptedContracts] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {
      privacy_policy: false,
      terms_of_service: false,
      data_processing: false,
    };
    const stored = window.localStorage.getItem('dashboard_accepted_contracts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        return {
          privacy_policy: false,
          terms_of_service: false,
          data_processing: false,
          ...parsed,
        };
      } catch {
        // ignore invalid stored value
      }
    }
    return {
      privacy_policy: false,
      terms_of_service: false,
      data_processing: false,
    };
  });

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
    <section className="flex flex-col gap-4 p-4 sm:p-6">

      {/* SAYFA BAŞLIĞI */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-white/30 mb-0.5">
            {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''} 👋
          </p>
          <h1 className="text-2xl font-black text-white tracking-tight">Ayarlar</h1>
          <p className="mt-1 text-sm text-white/40">
            Uygulama tercihlerinizi yönetin ve hesabınızı özelleştirin.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-white/40">Sunucu Zamanı: {serverTime}</span>
        </div>
      </div>

      {/* TAB BUTTONS */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'sound', label: 'Ses Ayarları', icon: LuVolume2 },
          { id: 'language', label: 'Dil Seçimi', icon: LuGlobe },
          { id: 'account', label: 'Hesap Verileri', icon: LuUser },
          { id: 'contracts', label: 'Sözleşmeler', icon: LuFileCheck },
        ].map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as 'sound' | 'language' | 'account' | 'contracts')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <div className="space-y-4">
        {activeTab === 'sound' && soundSettingsContent}
        {activeTab === 'language' && languageSettingsContent}
        {activeTab === 'account' && accountSettingsContent}
        {activeTab === 'contracts' && contractsSettingsContent}
      </div>
    </section>
  );
}