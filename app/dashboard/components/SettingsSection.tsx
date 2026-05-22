'use client';

import { useEffect, useState } from 'react';
import { LuVolume2, LuGlobe, LuUser, LuFileCheck, LuCheck, LuTriangleAlert, LuArrowLeft, LuShieldAlert, LuInfo } from 'react-icons/lu';
import { useLocale } from '@/contexts/LocaleContext';
import fetchWithCreds from '@/lib/fetchWithCreds';
import type { MemberProfile } from '../types';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  profile?: MemberProfile | null;
  serverCount?: number;
  onBack?: () => void;
};

export default function SettingsSection({
  profile,
  serverCount,
  onBack,
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

  const contractItems = [
    { key: 'privacy_policy', title: 'Gizlilik Politikası', description: 'Kişisel verilerin nasıl işlendiğini kabul ettiniz.' },
    { key: 'terms_of_service', title: 'Kullanım Şartları', description: 'Servis kullanım kurallarını ve sorumlulukları kabul ettiniz.' },
    { key: 'data_processing', title: 'Veri İşleme Onayı', description: 'Veri işleme ve analiz için izin verdiniz.' },
  ];

  const [activeTab, setActiveTab] = useState<'sound' | 'language' | 'account' | 'contracts'>('account');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('dashboard_music_enabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'all' | 'current' | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

      setDeleteMessage(deleteScope === 'all'
        ? 'Tüm verileriniz silindi. Güvenli çıkış için yönlendiriliyorsunuz...'
        : 'Sunucu verileriniz silindi. Sayfa yenileniyor...');
      setDeleteModalOpen(false);

      if (deleteScope === 'all') {
        await fetchWithCreds('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
        return;
      }

      window.location.reload();
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteOptionConfig = {
    all: {
      title: 'Tüm Verileri Kalıcı Olarak Sil',
      description: 'DiscoWeb platformundaki tüm kişisel verilerinizi kalıcı ve geri dönülemez şekilde siler.',
      button: 'Tüm Verilerimi Sil',
      tone: 'bg-red-500 hover:bg-red-600 focus:ring-red-500/50',
      borderTone: 'border-red-500/30 bg-red-500/5',
      iconTone: 'text-red-400',
    },
    current: {
      title: 'Yalnızca Mevcut Sunucu Verilerini Sil',
      description: 'Hesabınızı etkilemeden, yalnızca bulunduğunuz sunucuya ait kayıt ve istatistikleri temizler.',
      button: 'Mevcut Sunucu Verilerini Sil',
      tone: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500/50',
      borderTone: 'border-orange-500/30 bg-orange-500/5',
      iconTone: 'text-orange-400',
    },
  };

  const confirmModal = deleteModalOpen && deleteScope ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/70 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex flex-col items-center border-b border-slate-800 p-8 text-center">
          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${deleteOptionConfig[deleteScope].borderTone}`}>
             <LuShieldAlert className={`h-8 w-8 ${deleteOptionConfig[deleteScope].iconTone}`} />
          </div>
          <h2 className="text-xl font-bold text-white">Bu işlem geri alınamaz!</h2>
          <p className="mt-2 text-sm text-slate-400">
            {deleteOptionConfig[deleteScope].description}
          </p>
        </div>

        <div className="bg-slate-900/50 p-6">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <LuTriangleAlert className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm leading-relaxed text-amber-200/90">
                İşlemi onayladığınız an, belirlediğiniz kapsama giren veri tabanı kayıtları sistemden tamamen kaldırılır. Yedeklere erişilemez. Emin olmadan lütfen onaylamayın.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {deleteError}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all focus:outline-none focus:ring-4 ${deleteOptionConfig[deleteScope].tone}`}
            >
              {deleteLoading ? 'Siliniyor...' : deleteOptionConfig[deleteScope].button}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const soundSettingsContent = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Ses Ayarları</h3>
        <p className="mt-1 text-sm text-slate-400">Arka plan müziği ve arayüz ses efektlerini buradan yapılandırın.</p>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-white">Müzik Etkinliği</p>
            <p className="text-sm text-slate-400">Dashboard açıldığında müziğin otomatik olarak başlamasına izin verin.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        
        <div className="h-px w-full bg-slate-800" />

        <div>
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">Ses Seviyesi</p>
            <span className="text-sm font-medium text-indigo-400">{soundVolume}%</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">Sistem genelindeki müzik ses seviyesini belirleyin.</p>
          <div className="mt-6 flex items-center gap-4">
            <LuVolume2 className="h-5 w-5 text-slate-500" />
            <input
              type="range"
              min={0}
              max={100}
              value={soundVolume}
              onChange={(event) => setSoundVolume(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-indigo-500 outline-none hover:bg-slate-700"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const languageSettingsContent = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Bölge & Dil</h3>
        <p className="mt-1 text-sm text-slate-400">Uygulama arayüzünün dilini kişiselleştirin.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: 'tr', label: 'Türkçe', desc: 'Sistem dilini Türkçe yap' },
            { id: 'en', label: 'English', desc: 'Set system language to English' },
          ].map((lang) => {
            const isActive = locale === lang.id;
            return (
              <div 
                key={lang.id}
                onClick={() => handleLocaleChange(lang.id as 'tr' | 'en')}
                className={`group cursor-pointer rounded-xl border p-4 transition-all duration-200 ${isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/80'}`}
              >
                <div className="flex items-center justify-between">
                  <p className={`font-semibold ${isActive ? 'text-indigo-400' : 'text-slate-300 group-hover:text-white'}`}>{lang.label}</p>
                  {isActive && <LuCheck className="h-5 w-5 text-indigo-400" />}
                </div>
                <p className="mt-2 text-sm text-slate-500">{lang.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const accountSettingsContent = (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Hesap Verileri & Profil</h3>
        <p className="mt-1 text-sm text-slate-400">Hesap bilgilerinizi görüntüleyin ve veri izni yönetimini sağlayın.</p>
      </div>

      {/* Profil Detayları */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
          <h4 className="font-medium text-slate-200">Kişisel Bilgiler</h4>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Kullanıcı Adı</p>
            <p className="mt-2 text-lg font-medium text-white">{profile?.username ?? 'Bilinmiyor'}</p>
            <p className="mt-1 text-sm text-slate-500">ID: {profile?.userId ?? '-'}</p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Görünür İsim / Roller</p>
            <p className="mt-2 text-lg font-medium text-white">{profile?.displayName ?? profile?.nickname ?? 'Belirtilmedi'}</p>
            <p className="mt-1 text-sm text-slate-500">{profile?.roles?.length ? `${profile.roles.length} role sahip` : 'Rol bulunmuyor'}</p>
          </div>
        </div>
      </div>

      {/* Sunucu Yönetimi Özeti */}
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <LuGlobe className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{serverCount ?? 0}</p>
              <p className="text-sm font-medium text-indigo-300">Aktif Sunucu Bağlantısı</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Kayıtlarınızın aktif olarak bulunduğu sunucu sayısı. Bu sunucularda ekonomi işlemleriniz ve portföyleriniz yer almaktadır.
          </p>
        </div>
      </div>

      {deleteMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
          <LuCheck className="h-5 w-5" />
          <p className="text-sm font-medium">{deleteMessage}</p>
        </div>
      )}

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-sm">
        <div className="border-b border-red-500/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <LuTriangleAlert className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-red-500">Tehlikeli Bölge (Danger Zone)</h4>
          </div>
        </div>
        <div className="divide-y divide-red-500/10">
          {(['current', 'all'] as const).map((scope) => {
            const option = deleteOptionConfig[scope];
            return (
              <div key={scope} className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div className="max-w-md">
                  <p className="font-medium text-slate-200">{option.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDeleteModal(scope)}
                  className="shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500 hover:text-white"
                >
                  {option.button}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const contractsSettingsContent = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Yasal Metinler & Sözleşmeler</h3>
        <p className="mt-1 text-sm text-slate-400">Hizmet standartlarımız ve veri gizliliği yükümlülüklerimiz.</p>
      </div>

      <div className="flex flex-col gap-4">
        {contractItems.map((contract) => {
          const isAccepted = acceptedContracts[contract.key];
          return (
            <div key={contract.key} className={`flex flex-col items-start justify-between gap-4 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center ${isAccepted ? 'border-slate-800 bg-slate-900/40' : 'border-indigo-500/30 bg-indigo-950/20'}`}>
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium text-white">{contract.title}</p>
                  {isAccepted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      <LuCheck className="h-3 w-3" /> Onaylandı
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">{contract.description}</p>
              </div>
              {!isAccepted && (
                <button
                  type="button"
                  onClick={() => setAcceptedContracts((prev) => ({ ...prev, [contract.key]: true }))}
                  className="shrink-0 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600 focus:ring-4 focus:ring-indigo-500/30"
                >
                  Sözleşmeyi Onayla
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const navItems = [
    { id: 'account', label: 'Hesap & Veriler', icon: LuUser },
    { id: 'sound', label: 'Ses Tercihleri', icon: LuVolume2 },
    { id: 'language', label: 'Bölge & Dil', icon: LuGlobe },
    { id: 'contracts', label: 'Sözleşmeler', icon: LuFileCheck },
  ] as const;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* BAŞLIK & HEADER */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <LuArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Panoya Dön
            </button>
          )}
          <p className="mb-1 text-sm font-medium text-indigo-400">
            {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Ayarlar</h1>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-400 backdrop-blur-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          {serverTime}
        </div>
      </div>

      {/* MASTER-DETAIL LAYOUT */}
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        
        {/* SOL MENÜ (Master) */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-indigo-500/10 text-indigo-400 shadow-sm shadow-indigo-500/5' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* SAĞ İÇERİK (Detail) */}
        <main className="min-h-[500px]">
          {activeTab === 'account' && accountSettingsContent}
          {activeTab === 'sound' && soundSettingsContent}
          {activeTab === 'language' && languageSettingsContent}
          {activeTab === 'contracts' && contractsSettingsContent}
        </main>

      </div>
      
      {confirmModal}
    </section>
  );
}