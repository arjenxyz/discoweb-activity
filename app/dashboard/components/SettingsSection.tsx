'use client';

import { useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';

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
                    if (!response.ok) {
                      const data = await response.json().catch(() => ({}));
                      throw new Error(data.error || 'Silme işlemi başarısız.');
                    }
                    setMessage('Veriler başarıyla silindi. Yönlendiriliyorsunuz...');
                    setIsModalOpen(false);

                    // Temizle
                    try { localStorage.removeItem('selectedGuildId'); } catch {};
                    try { localStorage.removeItem('discord_bearer_token'); } catch {};
                    document.cookie = 'selected_guild_id=; Max-Age=0; path=/';
                    document.cookie = 'discord_session=; Max-Age=0; path=/';
                    document.cookie = 'discord_activity_session=; Max-Age=0; path=/';

                    // Redirect to welcome/activity page
                    window.location.assign('/activity');
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