'use client';

import { useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';

export default function ReferralSection() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteAvailable, setInviteAvailable] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithCreds('/api/member/profile');
        if (!res.ok) return;
        const data = await res.json();
        setReferralCode(String(data.referral_code ?? ''));
      } catch {
        // ignore
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const checkSdk = async () => {
      try {
        const discordSdkModule = await import('@discord/embedded-app-sdk');
        const DiscordSDK = discordSdkModule?.DiscordSDK;
        if (!DiscordSDK) return;
        const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
        await sdk.ready();
        setInviteAvailable(true);
      } catch {
        setInviteAvailable(false);
      }
    };

    void checkSdk();
  }, []);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setStatus({ type: 'success', message: 'Kod kopyalandı!' });
    } catch {
      setStatus({ type: 'error', message: 'Kopyalama başarısız.' });
    }
    window.setTimeout(() => setStatus(null), 3000);
  };

  const handleSubmit = async () => {
    if (!inputCode.trim()) {
      setStatus({ type: 'error', message: 'Lütfen kod girin.' });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await fetchWithCreds('/api/member/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode.trim().toUpperCase() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msgMap: Record<string, string> = {
          already_referred: 'Zaten bir kod kullandınız.',
          code_not_found: 'Kod bulunamadı.',
          cannot_use_own_code: 'Kendi kodunuzu kullanamazsınız.',
          invalid_code: 'Geçersiz kod.',
        };
        setStatus({ type: 'error', message: msgMap[data.error] ?? 'Kod doğrulama başarısız.' });
      } else {
        setStatus({ type: 'success', message: 'Kod başarılı! +500 Coin kazandınız.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Sunucu hatası. Tekrar deneyin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      const discordSdkModule = await import('@discord/embedded-app-sdk');
      const DiscordSDK = discordSdkModule?.DiscordSDK;
      if (!DiscordSDK) return;
      const sdk = new DiscordSDK(process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!);
      await sdk.ready();
      await sdk.commands.openInviteDialog();
    } catch {
      // ignore
    }
  };

  const buttonClass = useMemo(() => {
    const base = 'w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition';
    const primary = 'bg-[#5865F2] text-white hover:bg-[#4752c4]';
    const disabled = 'opacity-50 cursor-not-allowed';
    return `${base} ${inviteAvailable ? primary : disabled}`;
  }, [inviteAvailable]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-2xl space-y-4">
      <h2 className="text-lg font-semibold text-white">Davet Et & Kazan</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm text-white/70">Kendi referral kodun</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={referralCode ?? ''}
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 transition"
            >
              Kopyala
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-white/70">Bir arkadaşının kodunu gir</p>
          <div className="flex items-center gap-2">
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="REF123"
              className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? 'Onaylanıyor…' : 'Kodu Onayla'}
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            status.type === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="button"
        onClick={handleInvite}
        disabled={!inviteAvailable}
        className={buttonClass}
      >
        Arkadaşlarını Davet Et
      </button>

      {!inviteAvailable && (
        <p className="text-xs text-white/50">Discord SDK yüklenemedi, davet penceresi açılamıyor.</p>
      )}
    </section>
  );
}
