'use client';

import { useEffect, useState } from 'react';
import { LuVault, LuArrowRight, LuCheck, LuClock } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

type SettingsSectionProps = {
  onOpenPromotionsModal: () => void;
  onOpenDiscountsModal: () => void;
  currentGuildName?: string | null;
};

export default function SettingsSection({
  currentGuildName,
}: SettingsSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Yüksek Ekonomi başvuru state'leri
  const [economyTier, setEconomyTier] = useState<'basic' | 'advanced' | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const [starterPackage, setStarterPackage] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/member/treasury'))
      .then((r) => r.json())
      .then((d) => {
        setEconomyTier(d.economy_tier ?? 'basic');
      })
      .catch(() => {});

    // Bekleyen başvuru kontrolü
    fetch(apiUrl('/api/member/economy-tier-status'))
      .then((r) => r.json())
      .then((d) => { if (d.pending) setHasPending(true); })
      .catch(() => {});
  }, []);

  const handleApply = async () => {
    const pkg = Number(starterPackage);
    if (!Number.isFinite(pkg) || pkg < 0) {
      setApplyError('Geçersiz başlangıç paketi miktarı.');
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
          forbidden: 'Sadece sunucu yöneticileri başvurabilir.',
          already_advanced: 'Sunucu zaten Yüksek Ekonomi kademesinde.',
          pending_application_exists: 'Zaten bekleyen bir başvurunuz var.',
          invalid_starter_package: 'Geçersiz başlangıç paketi.',
        };
        throw new Error(msgs[data.error] ?? 'Başvuru gönderilemedi.');
      }
      setApplySuccess(true);
      setHasPending(true);
    } catch (e: unknown) {
      setApplyError(e instanceof Error ? e.message : 'Bir hata oluştu.');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">Ayarlar</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-sm text-white/60">
            Buradan promosyon veya indirim kodu ekleyebilirsiniz. Kod ekleme işlemi ilgili modali açarak yapılır.
          </p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">Kod Yönetimi</p>
            <p className="mt-2 text-sm text-white/60">Promosyon veya indirim kodunu eklemek için aşağıdaki seçenekleri kullanın.</p>
            <div className="mt-3">
              <p className="text-sm text-white/60">Promosyon ve indirim kodlarını eklemek için lütfen sağ üstteki hesap menüsündeki <span className="font-semibold text-white">Promosyon</span> veya <span className="font-semibold text-white">İndirim kodu</span> seçeneklerine tıklayın.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4 text-sm text-white/60">
          Hesap detayları bu ekranda görüntülenmez.
        </div>
      </div>

      {/* Yüksek Ekonomi Başvurusu */}
      {economyTier === 'basic' && (
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <LuVault className="h-4 w-4 text-blue-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Yüksek Ekonomi</p>
            {hasPending && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                <LuClock className="h-3 w-3" /> İnceleniyor
              </span>
            )}
          </div>

          {applySuccess || hasPending ? (
            <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
              <LuCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-white">Başvurunuz alındı</p>
                <p className="mt-0.5 text-xs text-white/40">
                  Yüksek Ekonomi başvurunuz inceleniyor. Onaylanınca tüm bakiyeler sıfırlanır ve hazine paketi yüklenir.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/50 mb-4">
                Sunucunuzu <span className="font-semibold text-white">Yüksek Ekonomi</span> kademesine yükseltmek için başvurun.
                Onay sonrası tüm bakiyeler sıfırlanır ve hazine sistemi aktive edilir.{' '}
                <span className="text-amber-400 font-medium">Bu işlem geri alınamaz.</span>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">
                    Başlangıç Hazine Paketi (Papel) — isteğe bağlı
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
                    Developer tarafından onaylanırken hazineye yüklenecek başlangıç miktarı.
                  </p>
                </div>

                {applyError && <p className="text-xs text-red-400">{applyError}</p>}

                <button
                  type="button"
                  disabled={applyLoading}
                  onClick={handleApply}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {applyLoading ? 'Gönderiliyor...' : <><LuArrowRight className="h-4 w-4" /> Başvuruyu Gönder</>}
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">Yüksek Ekonomi</p>
            <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Aktif</span>
          </div>
          <p className="mt-2 text-sm text-white/40">Bu sunucu Yüksek Ekonomi kademesinde çalışıyor.</p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b0d12]/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300">Discoweb Activity Verilerimi Sil</p>
        <p className="mt-2 text-sm text-white/60">
          Mevcut sunucudaki veya tüm sunuculardaki Activity verilerinizi tamamen kaldırabilirsiniz.
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
          Discoweb activity verilerimi sil
        </button>

        {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f121a] p-6 shadow-2xl border border-white/10">
            <h3 className="text-lg font-bold">Veri silme seçeneği</h3>
            <p className="mt-2 text-sm text-white/70">Hangi verileri silmek istiyorsunuz?</p>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={scope === 'current'}
                  onChange={() => setScope('current')}
                  className="h-4 w-4"
                />
                {currentGuildName ? `${currentGuildName} (şu anki sunucu)` : 'Şu anki sunucu verileri'}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="deleteScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="h-4 w-4"
                />
                Tüm sunuculardaki Discord Activity verilerim
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5"
              >
                İptal
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
                      throw new Error(data.error || 'Silme işlemi başarısız.');
                    }
                    setMessage('Veriler başarıyla silindi. Yönlendiriliyorsunuz...');
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
                    setError(err instanceof Error ? err.message : 'Silme işlemi başarısız.');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {isDeleting ? 'Siliniyor...' : 'Onaylıyorum, sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}