'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { siteConfig } from '@/config/site';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type ReferralStatus = {
  type: 'success' | 'error';
  message: string;
};

const MILESTONES = [5, 10, 20, 50, 100];

export default function ReferralSection() {
  const t = useT();
  const searchParams = useSearchParams();

  const [referralCode, setReferralCode] = useState<string>('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [totalInvites, setTotalInvites] = useState<number>(0);
  const [referralReward, setReferralReward] = useState<number>(500);
  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [refSubmitted, setRefSubmitted] = useState(false);
  const [inviteAvailable, setInviteAvailable] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFallbackUrl, setInviteFallbackUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Yüksek Ekonomi pasif gelir referral state'leri
  const [advancedCode, setAdvancedCode] = useState<string | null>(null);
  const [advancedCodeUsage, setAdvancedCodeUsage] = useState(0);
  const [advancedCodeCopied, setAdvancedCodeCopied] = useState(false);
  const [advancedInput, setAdvancedInput] = useState('');
  const [advancedSubmitting, setAdvancedSubmitting] = useState(false);
  const [advancedStatus, setAdvancedStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const discordSdkRef = useRef<any | null>(null);
  const sdkReadyRef = useRef(false);

  // Yüksek Ekonomi referral kodunu yükle
  useEffect(() => {
    fetch(apiUrl('/api/member/referral-code'))
      .then((r) => r.json())
      .then((d) => {
        if (d.economy_tier === 'advanced' && d.code) {
          setAdvancedCode(d.code);
          setAdvancedCodeUsage(d.usage_count ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const handleAdvancedCodeSubmit = async () => {
    const code = advancedInput.trim().toUpperCase();
    if (!code) return;
    setAdvancedSubmitting(true);
    setAdvancedStatus(null);
    try {
      const res = await fetchWithCreds('/api/member/referral-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_code: 'Geçersiz kod.',
          own_code: 'Kendi kodunu kullanamazsın.',
          already_used: 'Bu sunucuda zaten bir davet kodu kullandın.',
          not_advanced: 'Bu sunucu Yüksek Ekonomi kademesinde değil.',
        };
        throw new Error(msgs[data.error] ?? 'Kod kullanılamadı.');
      }
      setAdvancedStatus({ type: 'success', message: 'Kod kaydedildi! İlk harcamanızda aktif olacak.' });
      setAdvancedInput('');
    } catch (e: unknown) {
      setAdvancedStatus({ type: 'error', message: e instanceof Error ? e.message : 'Bir hata oluştu.' });
    } finally {
      setAdvancedSubmitting(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchWithCreds('/api/member/profile');
        if (!res.ok) return;
        const data = await res.json();

        setReferralCode(String(data.referral_code ?? ''));
        setReferredBy(data.referred_by ?? null);
        setTotalInvites(Number(data.total_invites ?? 0));
        setReferralReward(Number(data.referral_reward ?? 500));
      } catch {
        // ignore
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode || refSubmitted) return;

    const submitRef = async () => {
      setStatus(null);

      try {
        const res = await fetchWithCreds('/api/member/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refCode.trim().toUpperCase() }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const messages: Record<string, string> = {
            already_referred: t('referral_error_already_referred'),
            code_not_found: t('referral_error_code_not_found'),
            cannot_use_own_code: t('referral_error_own_code'),
            invalid_code: t('referral_error_invalid_code'),
            update_failed: t('referral_error_update_failed'),
            history_failed: t('referral_error_history_failed'),
            increment_failed: t('referral_error_increment_failed'),
            new_account: t('referral_error_new_account'),
          };
          setStatus({ type: 'error', message: messages[data.error] ?? t('referral_error_validation_failed') });
        } else {
          setStatus({ type: 'success', message: t('referral_success_added') });
          setReferredBy(refCode.trim().toUpperCase());
          setTotalInvites((prev) => prev + 1);
        }
      } catch {
        setStatus({ type: 'error', message: t('referral_error_server') });
      } finally {
        setRefSubmitted(true);
      }
    };

    void submitRef();
  }, [searchParams, refSubmitted]);

  useEffect(() => {
    const getFrameId = (): string | null => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const frameIdFromUrl = params.get('frame_id');
      if (frameIdFromUrl) {
        try {
          localStorage.setItem('discord_frame_id', frameIdFromUrl);
        } catch {
          // ignore storage failures
        }
        return frameIdFromUrl;
      }

      try {
        return localStorage.getItem('discord_frame_id');
      } catch {
        return null;
      }
    };

    const isInIframe = () => {
      if (typeof window === 'undefined') return false;
      try {
        return window.self !== window.top;
      } catch {
        return true; // cross-origin iframe
      }
    };

    const checkSdk = async () => {
      const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
      if (!clientId) {
        setInviteAvailable(false);
        setInviteError('Discord client ID bulunamadı. Lütfen `NEXT_PUBLIC_DISCORD_CLIENT_ID` çevre değişkenini ayarlayın.');
        return;
      }

      const frameId = getFrameId();
      if (!frameId) {
        setInviteError(
          isInIframe()
            ? 'Discord Activity içinde çalışıyor ancak `frame_id` URL parametresi bulunamadı. Bu durumda davet penceresi açılamayabilir.'
            : 'Uygulama Discord içinde açılmıyor. Davet penceresi yalnızca Discord Activity içinde açılabilir.',
        );
        return;
      }

      try {
        const discordSdkModule = await import('@discord/embedded-app-sdk');
        const DiscordSDK = discordSdkModule?.DiscordSDK;
        if (!DiscordSDK) {
          setInviteAvailable(false);
          setInviteError('Discord SDK modülü yüklendi ancak DiscordSDK tanımlı değil.');
          return;
        }

        const sdk = new DiscordSDK(clientId);
        await sdk.ready();
        discordSdkRef.current = sdk;
        sdkReadyRef.current = true;
        setInviteAvailable(true);
        setInviteError(null);
      } catch (error) {
        setInviteAvailable(false);
        setInviteError((error as Error)?.message ?? 'Discord SDK yüklenemedi.');
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
      setStatus({ type: 'success', message: t('referral_copied') });
    } catch {
      setStatus({ type: 'error', message: t('referral_copy_failed') });
    }
    window.setTimeout(() => setStatus(null), 2500);
  };

  const shareWithReferral = async () => {
    if (!discordSdkRef.current || !sdkReadyRef.current) {
      setShareStatus({ type: 'error', message: 'Discord SDK bağlantısı hazır değil.' });
      return;
    }
    setShareLoading(true);
    setShareStatus(null);
    try {
      // 1. Generate ephemeral quick-link from backend
      let linkId: string | null = null;
      try {
        const res = await fetchWithCreds(apiUrl('/api/member/discord-share-link'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            custom_id: referralCode ? `ref:${referralCode}` : undefined,
            title: 'DiscoWeb — Sunucu Paneli',
            description: 'Sunucu ekonomisi, mağaza ve borsa yönetimi!',
          }),
        });
        if (res.ok) {
          const d = await res.json();
          linkId = d.link_id ?? null;
        }
      } catch {
        // fall through to custom_id fallback
      }

      // 2. Call shareLink — prefer link_id, fallback to custom_id
      const args = linkId
        ? { message: 'DiscoWeb ile sunucu yönetimini keşfet! 🚀', link_id: linkId }
        : { message: 'DiscoWeb ile sunucu yönetimini keşfet! 🚀', custom_id: referralCode ? `ref:${referralCode}` : undefined };

      const result = await discordSdkRef.current.commands.shareLink(args);
      if (result?.success) {
        setShareStatus({ type: 'success', message: 'Bağlantı paylaşıldı! 🎉' });
      } else {
        setShareStatus({ type: 'error', message: 'Paylaşım iptal edildi.' });
      }
    } catch (e: unknown) {
      setShareStatus({ type: 'error', message: (e instanceof Error ? e.message : null) ?? 'Paylaşım başarısız.' });
    } finally {
      setShareLoading(false);
      window.setTimeout(() => setShareStatus(null), 4000);
    }
  };

  const openInviteDialog = async () => {
    const inviteUrl = siteConfig.bot.inviteUrl;

    const frameId = (() => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const frameIdFromUrl = params.get('frame_id');
      if (frameIdFromUrl) {
        try {
          localStorage.setItem('discord_frame_id', frameIdFromUrl);
        } catch {
          // ignore
        }
        return frameIdFromUrl;
      }
      try {
        return localStorage.getItem('discord_frame_id');
      } catch {
        return null;
      }
    })();

    if (!frameId) {
      // Discord embed içinde değilsek SDK openInviteDialog kesinlikle çalışmaz,
      // ayrıca sandboxed iframe'lerde popup açma yetkisi yok.
      console.warn('frame_id bulunamadı; SDK invite fonksiyonu atlanıyor');
      setInviteFallbackUrl(inviteUrl);
      return;
    }

    if (!sdkReadyRef.current || !discordSdkRef.current) {
      setInviteFallbackUrl(inviteUrl);
      setInviteError('Discord SDK bağlantısı hazır değil; davet penceresi açılamıyor.');
      return;
    }

    try {
      await discordSdkRef.current.commands.openInviteDialog();
    } catch (err) {
      console.warn('Davet penceresi açılamadı, alternatif URL kullanılacak', err);
      setInviteFallbackUrl(inviteUrl);
      setInviteError(
        (err as Error)?.message ? `Davet penceresi açılamadı: ${(err as Error).message}` : 'Davet penceresi açılamadı.',
      );
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
    ? t('referral_milestone_reached')
    : t('referral_milestone_next', { target: nextMilestone, remaining: nextMilestone - totalInvites });

  return (
    <section id="referral-section" className="space-y-6">
      {/* Davet Kodun */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0b0d12]/70 via-[#0b0d12]/50 to-[#111827]/70 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:items-end sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{t('referral_your_code_label')}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-wide text-white">{referralCode || '—'}</h1>
            <p className="mt-1 text-xs text-white/40">{t('referral_share_hint')}</p>
            {referralReward > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <span>🎁</span>
                <span>Her davet → her iki kişiye +{referralReward.toLocaleString('tr-TR')} Papel</span>
              </div>
            )}
            {referralReward === 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/30">
                Şu an ödül verilmiyor
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {t('referral_copy_button')}
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </button>
        </div>
      </div>

      {/* Davet Eden */}
      <div className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-inner">
        <p className="text-sm font-medium text-white/60">{t('referral_who_invited_label')}</p>
        {referredBy ? (
          <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">{t('referral_invited_by', { code: referredBy })}</p>
            <p className="text-xs text-white/40">{t('referral_invited_by_note')}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">{t('referral_auto_running')}</p>
            <p className="text-xs text-white/40">{t('referral_no_code_hint')}</p>
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
            <p className="text-sm font-medium text-white/60">{t('referral_progress_label')}</p>
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
          <p className="text-sm font-semibold text-white">{t('referral_invite_section_title')}</p>
          <p className="text-sm text-white/60">{t('referral_invite_description')}</p>

          {/* Discord Incentivized Share Link */}
          <button
            type="button"
            onClick={shareWithReferral}
            disabled={!inviteAvailable || shareLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#5865F2] bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {shareLoading ? (
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.029.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.04.001-.088-.041-.104a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.105c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            )}
            Discord&apos;da Paylaş
          </button>

          {shareStatus && (
            <p className={`text-xs text-center ${shareStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {shareStatus.message}
            </p>
          )}

          {/* Classic invite dialog */}
          <button
            type="button"
            onClick={openInviteDialog}
            className={inviteButtonClass}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-emerald-300 animate-pulse" />
              {t('referral_invite_button')}
            </span>
          </button>

          {!inviteAvailable && (
            <div className="text-xs text-white/40">
              <p>{t('referral_sdk_unavailable')}</p>
              {inviteError && <p className="mt-1">{t('referral_sdk_error_prefix')} {inviteError}</p>}
              {inviteFallbackUrl && (
                <div className="mt-2 rounded-lg border border-white/15 bg-white/5 p-3">
                  <p className="text-xs text-white/60">{t('referral_fallback_hint')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteFallbackUrl}
                      className="w-full rounded-xl bg-black/40 px-3 py-2 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(inviteFallbackUrl);
                        } catch {
                          // ignore
                        }
                      }}
                      className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white"
                    >
                      {t('referral_copy_button')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Yüksek Ekonomi Pasif Gelir Referral */}
      {advancedCode !== null && (
        <div className="rounded-3xl border border-blue-500/20 bg-blue-500/[0.04] p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-400 mb-1">Yüksek Ekonomi · Pasif Gelir</p>
          <h2 className="text-lg font-black text-white">Davet Kodu</h2>
          <p className="mt-1 text-sm text-white/40">
            Arkadaşların bu kodu kullanırsa, ilk 3 ay boyunca yaptıkları harcamaların <span className="text-blue-300 font-semibold">%10'u</span> sunucu hazinesinden sana akar.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xl font-black tracking-widest text-white">{advancedCode}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(advancedCode).catch(() => {});
                setAdvancedCodeCopied(true);
                setTimeout(() => setAdvancedCodeCopied(false), 2000);
              }}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              {advancedCodeCopied ? '✓ Kopyalandı' : 'Kopyala'}
            </button>
          </div>

          <p className="mt-2 text-xs text-white/25">{advancedCodeUsage} kişi bu kodu kullandı</p>

          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-sm font-semibold text-white mb-2">Davet Kodu Kullan</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={advancedInput}
                onChange={(e) => setAdvancedInput(e.target.value.toUpperCase())}
                placeholder="Kod girin"
                maxLength={8}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 uppercase"
              />
              <button
                type="button"
                disabled={advancedSubmitting || !advancedInput}
                onClick={handleAdvancedCodeSubmit}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-40"
              >
                {advancedSubmitting ? '...' : 'Kullan'}
              </button>
            </div>
            {advancedStatus && (
              <p className={`mt-2 text-xs ${advancedStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {advancedStatus.message}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
