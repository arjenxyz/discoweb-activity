'use client';

import { useEffect, useMemo, useState } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';

type ReferralStatus = {
  type: 'success' | 'error';
  message: string;
};

const MILESTONES = [5, 10, 20, 50, 100];

export default function ReferralSection() {
  const [referralCode, setReferralCode] = useState<string>('');
  const [inputCode, setInputCode] = useState('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [totalInvites, setTotalInvites] = useState<number>(0);
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteAvailable, setInviteAvailable] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithCreds('/api/member/profile');
        if (!res.ok) return;
        const data = await res.json();

        setReferralCode(String(data.referral_code ?? ''));
        setReferredBy(data.referred_by ?? null);
        setTotalInvites(Number(data.total_invites ?? 0));
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

  const nextMilestone = useMemo(() => {
    return MILESTONES.find((m) => m > totalInvites) ?? MILESTONES[MILESTONES.length - 1];
  }, [totalInvites]);

  const progressPercent = useMemo(() => {
    const target = nextMilestone;
    const percent = Math.min(100, Math.round((totalInvites / target) * 100));
    return percent;
  }, [totalInvites, nextMilestone]);

  const copyToClipboard = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setStatus({ type: 'success', message: 'Kod kopyalandı!' });
    } catch {
      setStatus({ type: 'error', message: 'Kopyalama başarısız oldu.' });
    }
    window.setTimeout(() => setStatus(null), 2500);
  };

  const submitReferral = async () => {
    if (!inputCode.trim()) {
      setStatus({ type: 'error', message: 'Lütfen bir kod girin.' });
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
        const messages: Record<string, string> = {
          already_referred: 'Zaten davet edildiniz.',
          code_not_found: 'Kod bulunamadı.',
          cannot_use_own_code: 'Kendi kodunuzu kullanamazsınız.',
          invalid_code: 'Geçersiz kod.',
          update_failed: 'Davet bilgisi kaydedilemedi.',
          history_failed: 'Davet geçmişi kaydedilemedi.',
          increment_failed: 'Davet sayısı güncellenemedi.',
        };
        setStatus({ type: 'error', message: messages[data.error] ?? 'Kod doğrulama başarısız oldu.' });
      } else {
        setStatus({ type: 'success', message: 'Kod başarıyla eklendi! 🎉' });
        setReferredBy(inputCode.trim().toUpperCase());
        setTotalInvites((prev) => prev + 1);
      }
    } catch {
      setStatus({ type: 'error', message: 'Sunucuya bağlanırken hata oldu.' });
    } finally {
      setLoading(false);
    }
  };

  const openInviteDialog = async () => {
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

  const inviteButtonClass = useMemo(() => {
    const base =
      'w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400';
    const active = 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/30';
    const disabled = 'bg-white/10 text-white/50 cursor-not-allowed';
    return `${base} ${inviteAvailable ? active : disabled}`;
  }, [inviteAvailable]);

  const milestoneText = totalInvites >= nextMilestone
    ? `Tüm hedeflere ulaştın!`
    : `Bir sonraki hedef: ${nextMilestone} davet (${nextMilestone - totalInvites} kaldı)`;

  return (
    <section id="referral-section" className="space-y-6">
      {/* Davet Kodun */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0b0d12]/70 via-[#0b0d12]/50 to-[#111827]/70 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:items-end sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">Davet Kodun</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-wide text-white">{referralCode || '—'}</h1>
            <p className="mt-1 text-xs text-white/40">Bu kodu arkadaşlarınla paylaşarak ödül kazanabilirsin.</p>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            Kopyala
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </button>
        </div>
      </div>

      {/* Davet Eden */}
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-inner">
        <p className="text-sm font-medium text-white/60">Seni Kim Davet Etti?</p>
        {referredBy ? (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Davet eden: <span className="text-indigo-200">{referredBy}</span></p>
            <p className="text-xs text-white/40">Bu bilgi, davet kodunu ilk kullandığın anda kaydedilir.</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Davet kodu gir…"
              className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={submitReferral}
              disabled={loading}
              className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-40"
            >
              {loading ? 'Onaylanıyor…' : 'Onayla'}
            </button>
          </div>
        )}

        {status && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
              status.type === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      {/* Görev İlerleme */}
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-inner">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">Görev İlerleme</p>
            <p className="text-xs text-white/40">{milestoneText}</p>
          </div>
          <span className="text-sm font-bold text-white/80">{totalInvites} / {nextMilestone}</span>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Davet Ekranı */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0b0d12]/60 via-[#0b0d12]/50 to-[#111827]/50 p-6 shadow-2xl">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-white">Arkadaşlarını Davet Et</p>
          <p className="text-sm text-white/60">Discord davet penceresini açarak doğrudan arkadaşlarını ekle.</p>

          <button
            type="button"
            onClick={openInviteDialog}
            disabled={!inviteAvailable}
            className={inviteButtonClass}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-emerald-300 animate-pulse" />
              Arkadaşlarını Çağır
            </span>
          </button>

          {!inviteAvailable && (
            <p className="text-xs text-white/40">Discord SDK yüklenemiyor — davet penceresi açılamıyor.</p>
          )}
        </div>
      </div>
    </section>
  );
}
