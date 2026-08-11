'use client';

import { useEffect, useState } from 'react';
import { LuVolume2, LuGlobe, LuUser, LuFileCheck, LuCheck, LuTriangleAlert, LuArrowLeft, LuShieldAlert, LuInfo, LuDownload, LuMessageSquare, LuSave, LuUndo2 } from 'react-icons/lu';
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

  const contractItems = [
    { key: 'privacy_policy', title: 'Gizlilik Politikası', description: 'Kişisel verilerin nasıl işlendiğini kabul ettiniz.' },
    { key: 'terms_of_service', title: 'Kullanım Şartları', description: 'Servis kullanım kurallarını ve sorumlulukları kabul ettiniz.' },
    { key: 'data_processing', title: 'Veri İşleme Onayı', description: 'Veri işleme ve analiz için izin verdiniz.' },
  ];

  const [activeTab, setActiveTab] = useState<'sound' | 'language' | 'account' | 'contracts'>('account');
  
  // SAVED STATES (from local storage / context)
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
  const [savedAcceptedContracts, setSavedAcceptedContracts] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { privacy_policy: false, terms_of_service: false, data_processing: false };
    const stored = window.localStorage.getItem('dashboard_accepted_contracts');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        return { privacy_policy: false, terms_of_service: false, data_processing: false, ...parsed };
      } catch { /* ignore */ }
    }
    return { privacy_policy: false, terms_of_service: false, data_processing: false };
  });

  // DRAFT STATES (edited in UI before saving)
  const [draftSoundEnabled, setDraftSoundEnabled] = useState(savedSoundEnabled);
  const [draftSoundVolume, setDraftSoundVolume] = useState(savedSoundVolume);
  const [draftAcceptedContracts, setDraftAcceptedContracts] = useState(savedAcceptedContracts);
  const [draftLocale, setDraftLocale] = useState(locale);

  // Sync initial locale to draft (handles next.js hydration)
  useEffect(() => {
    setDraftLocale(locale);
  }, [locale]);

  // Unsaved changes check
  const hasUnsavedChanges = 
    draftSoundEnabled !== savedSoundEnabled ||
    draftSoundVolume !== savedSoundVolume ||
    JSON.stringify(draftAcceptedContracts) !== JSON.stringify(savedAcceptedContracts) ||
    draftLocale !== locale;

  const handleSaveChanges = () => {
    // 1. Commit to localStorage
    window.localStorage.setItem('dashboard_music_enabled', String(draftSoundEnabled));
    window.localStorage.setItem('dashboard_music_volume', String(draftSoundVolume));
    window.localStorage.setItem('dashboard_accepted_contracts', JSON.stringify(draftAcceptedContracts));
    window.dispatchEvent(new Event('dashboard-music-settings-changed'));

    // 2. Commit locale to context
    if (draftLocale !== locale) {
      setDiscordLocale(draftLocale);
    }

    // 3. Sync saved state
    setSavedSoundEnabled(draftSoundEnabled);
    setSavedSoundVolume(draftSoundVolume);
    setSavedAcceptedContracts(draftAcceptedContracts);
  };

  const handleResetChanges = () => {
    setDraftSoundEnabled(savedSoundEnabled);
    setDraftSoundVolume(savedSoundVolume);
    setDraftAcceptedContracts(savedAcceptedContracts);
    setDraftLocale(locale);
  };

  // Modals state
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

      setDeleteMessage(deleteScope === 'all'
        ? 'Tüm verileriniz silindi.'
        : 'Sunucu verileriniz silindi. Sayfa yenileniyor...');
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
        // '/' yönlendirmesi guild_id'yi düşürüp yanlışlıkla DmScreen ("We Need a Server") açıyordu.
        // DM ekranı yalnızca gerçek DM bağlamında gösterilmeli.
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
          setRequestError('Veriler gönderilemedi. Lütfen Discord hesabınızda "Sunucu üyelerinden doğrudan mesaja izin ver" ayarınızın açık olduğundan emin olun.');
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

  const requestConfirmModal = requestModalOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/70 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex flex-col items-center border-b border-slate-800 p-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/5">
             <LuMessageSquare className="h-6 w-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Veri Talep Onayı</h2>
          <p className="mt-2 text-sm text-slate-400">
            Kişisel verileriniz (profil, cüzdan, vb.) bir .json dosyası olarak size DM'den (Özel Mesaj) gönderilecektir.
          </p>
        </div>

        <div className="bg-slate-900/50 p-4 sm:p-5">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <LuTriangleAlert className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-200/90 leading-relaxed">
                <strong>Sorumluluk Reddi:</strong> Bu verileri DM kutunuza veya cihazınıza indirdiğiniz andan itibaren verilerin güvenliği tamamen size aittir. Dosyayı üçüncü şahıslarla paylaşırsanız oluşabilecek sorunlardan DiscoWeb sorumlu değildir.
              </p>
            </div>
          </div>

          {requestError && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {requestError}
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleRequestConfirm}
              disabled={requestLoading}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            >
              {requestLoading ? 'Gönderiliyor...' : 'Sorumluluğu Kabul Edip Gönder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

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
        
        <div className="flex flex-col items-center border-b border-slate-800 p-5 text-center">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${deleteOptionConfig[deleteScope].borderTone}`}>
             <LuShieldAlert className={`h-6 w-6 ${deleteOptionConfig[deleteScope].iconTone}`} />
          </div>
          <h2 className="text-xl font-bold text-white">Bu işlem geri alınamaz!</h2>
          <p className="mt-2 text-sm text-slate-400">
            {deleteOptionConfig[deleteScope].description}
          </p>
        </div>

        <div className="bg-slate-900/50 p-4 sm:p-5">
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

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Ses Ayarları</h3>
        <p className="mt-1 text-sm text-slate-400">Arka plan müziği ve arayüz ses efektlerini buradan yapılandırın.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-white">Müzik Etkinliği</p>
            <p className="text-sm text-slate-400">Dashboard açıldığında müziğin otomatik olarak başlamasına izin verin.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draftSoundEnabled}
            onClick={() => setDraftSoundEnabled(!draftSoundEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${draftSoundEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${draftSoundEnabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        
        <div className="h-px w-full bg-slate-800" />

        <div>
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">Ses Seviyesi</p>
            <span className="text-sm font-medium text-indigo-400">{draftSoundVolume}%</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">Sistem genelindeki müzik ses seviyesini belirleyin.</p>
          <div className="mt-4 flex items-center gap-3">
            <LuVolume2 className="h-5 w-5 text-slate-500" />
            <input
              type="range"
              min={0}
              max={100}
              value={draftSoundVolume}
              onChange={(event) => setDraftSoundVolume(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-indigo-500 outline-none hover:bg-slate-700"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const languageSettingsContent = (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Bölge & Dil</h3>
        <p className="mt-1 text-sm text-slate-400">Uygulama arayüzünün dilini kişiselleştirin.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { id: 'tr', label: 'Türkçe', desc: 'Sistem dilini Türkçe yap' },
            { id: 'en', label: 'English', desc: 'Set system language to English' },
          ].map((lang) => {
            const isActive = draftLocale === lang.id;
            return (
              <div 
                key={lang.id}
                onClick={() => setDraftLocale(lang.id as 'tr' | 'en')}
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Hesap Verileri & Profil</h3>
        <p className="mt-1 text-sm text-slate-400">Hesap bilgilerinizi görüntüleyin ve veri izni yönetimini sağlayın.</p>
      </div>

      {/* Profil Detayları */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-5">
          <h4 className="font-medium text-slate-200">Kişisel Bilgiler</h4>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Kullanıcı Adı</p>
            <p className="mt-2 text-lg font-medium text-white">{profile?.username ?? 'Bilinmiyor'}</p>
            <p className="mt-1 text-sm text-slate-500">ID: {profile?.userId ?? '-'}</p>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Görünür İsim / Roller</p>
            <p className="mt-2 text-lg font-medium text-white">{profile?.displayName ?? profile?.nickname ?? 'Belirtilmedi'}</p>
            <p className="mt-1 text-sm text-slate-500">{profile?.roles?.length ? `${profile.roles.length} role sahip` : 'Rol bulunmuyor'}</p>
          </div>
        </div>
      </div>

      {/* Sunucu Yönetimi Özeti */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <LuGlobe className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{serverCount ?? 0}</p>
              <p className="text-sm font-medium text-indigo-300">Aktif Sunucu Bağlantısı</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
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

      {requestMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-indigo-300">
          <LuCheck className="h-5 w-5" />
          <p className="text-sm font-medium">{requestMessage}</p>
        </div>
      )}

      {/* Veri Talebi Alanı */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="border-b border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <LuDownload className="h-5 w-5 text-indigo-400" />
            <h4 className="font-semibold text-slate-200">Kişisel Veri Talebi (GDPR)</h4>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="max-w-md">
            <p className="font-medium text-slate-200">Verilerinizi İndirin</p>
            <p className="mt-1 text-sm text-slate-400">Tüm uygulama ve sunucu aktivitelerinizi kapsayan veri dosyanızı (JSON) botumuz aracılığıyla özel mesaj olarak talep edebilirsiniz.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRequestError(null);
              setRequestModalOpen(true);
            }}
            className="shrink-0 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-400 transition-colors hover:bg-indigo-500 hover:text-white"
          >
            Verilerimi Özel Mesaj (DM) Gönder
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-sm">
        <div className="border-b border-red-500/20 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <LuTriangleAlert className="h-5 w-5 text-red-500" />
            <h4 className="font-semibold text-red-500">Tehlikeli Bölge (Danger Zone)</h4>
          </div>
        </div>
        <div className="divide-y divide-red-500/10">
          {(['current', 'all'] as const).map((scope) => {
            const option = deleteOptionConfig[scope];
            return (
              <div key={scope} className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h3 className="text-lg font-semibold text-white">Yasal Metinler & Sözleşmeler</h3>
        <p className="mt-1 text-sm text-slate-400">Hizmet standartlarımız ve veri gizliliği yükümlülüklerimiz.</p>
      </div>

      <div className="flex flex-col gap-4">
        {contractItems.map((contract) => {
          const isAccepted = draftAcceptedContracts[contract.key];
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
                  onClick={() => setDraftAcceptedContracts((prev) => ({ ...prev, [contract.key]: true }))}
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

  if (accountDeletedExit) {
    return (
      <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-[#0b0d12] px-6 text-white">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <LuCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Verilerin silindi</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            DiscoWeb Activity verilerin kalıcı olarak kaldırıldı. Bu pencereyi kapatabilirsin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3 sm:px-5 sm:py-4 lg:px-6">
      {/* BAŞLIK & HEADER */}
      <div className="mb-3">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="group mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              <LuArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Panoya Dön
            </button>
          )}
          <p className="mb-1 text-sm font-medium text-indigo-400">
            {greeting}{profile?.nickname ? `, ${profile.nickname}` : ''}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Ayarlar</h1>
        </div>
      </div>

      {/* MASTER-DETAIL LAYOUT */}
      <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:gap-6">
        
        {/* SOL MENÜ (Master) */}
        <aside>
          <nav className="sticky top-4 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive ? 'bg-indigo-500/10 text-indigo-400 shadow-sm shadow-indigo-500/5' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {item.label}
              </button>
            );
          })}
          </nav>
        </aside>

        {/* SAĞ İÇERİK (Detail) */}
        <main className="min-h-0 pb-10">
          {activeTab === 'account' && accountSettingsContent}
          {activeTab === 'sound' && soundSettingsContent}
          {activeTab === 'language' && languageSettingsContent}
          {activeTab === 'contracts' && contractsSettingsContent}
        </main>

      </div>
      
      {/* UNSAVED CHANGES BANNER */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 z-40 flex w-full justify-center p-3 sm:p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-4 px-6 shadow-[0_-8px_30px_-15px_rgba(99,102,241,0.3)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                <LuInfo className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-slate-200">
                Dikkat — kaydedilmemiş değişiklikleriniz var!
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetChanges}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <LuUndo2 className="h-4 w-4" />
                Sıfırla
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 text-sm font-medium text-white transition-all hover:bg-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
              >
                <LuSave className="h-4 w-4" />
                Değişiklikleri Kaydet
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