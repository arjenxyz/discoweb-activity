import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LuAward,
  LuCheck,
  LuCoins,
  LuCopy,
  LuGift,
  LuHistory,
  LuKeyRound,
  LuShare2,
  LuStar,
  LuTrophy,
  LuUserPlus,
  LuUsers,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { siteConfig } from '@/config/site';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';
import { REFERRAL_MILESTONE_REWARDS, REFERRAL_MILESTONES } from '@/lib/referral/constants';
import type { DiscordSDK } from '@discord/embedded-app-sdk';

type ReferralStatus = {
  type: 'success' | 'error';
  message: string;
};

type ReferralStats = {
  total_invites: number;
  total_earned_papel: number;
  claimed_milestones: number[];
  next_milestone: number | null;
  next_milestone_bonus: number;
  invite_history: { invitee_masked: string; status: string; created_at: string }[];
};

type LeaderboardEntry = {
  rank: number;
  user_label: string;
  total_invites: number;
  total_earned: number;
  is_me: boolean;
};

const CARD = 'rounded-2xl border border-slate-800 bg-slate-900/40';
const CARD_PAD = 'p-4 sm:p-5';

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-white ${className}`}
      aria-hidden
    />
  );
}

function StatusLine({ type, message }: { type: 'success' | 'error'; message: string }) {
  return (
    <p
      className={`text-xs font-medium ${type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}
      role="status"
    >
      {message}
    </p>
  );
}

function DiscordMark({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.029.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.04.001-.088-.041-.104a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.105c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

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
  const [sdkChecking, setSdkChecking] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualStatus, setManualStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [pendingReferrer, setPendingReferrerState] = useState<
    { type: 'by_user'; referrer_discord_id: string } | { type: 'by_code'; code: string } | null
  >(null);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myInvites, setMyInvites] = useState<number>(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboard'>('stats');

  const refreshStats = useCallback(() => {
    fetchWithCreds('/api/member/referral-stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});
  }, []);

  const onReferralApplied = useCallback(
    (reward: number, inviterLabel: string) => {
      setReferredBy(inviterLabel);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
      refreshStats();
      try {
        window.dispatchEvent(new CustomEvent('wallet:refresh'));
      } catch {
        /* ignore */
      }
      void fetchWithCreds('/api/member/profile')
        .then((r) => r.json())
        .then((data) => {
          setTotalInvites(Number(data.total_invites ?? 0));
          setReferralReward(Number(data.referral_reward ?? reward));
        })
        .catch(() => {});
    },
    [refreshStats],
  );

  const referralErrorMessages = useMemo(
    (): Record<string, string> => ({
      already_referred: t('referral_error_already_referred'),
      code_not_found: t('referral_error_code_not_found'),
      cannot_use_own_code: t('referral_error_own_code'),
      self_referral: t('referral_error_self'),
      invalid_code: t('referral_error_invalid_code'),
      update_failed: t('referral_error_update_failed'),
      history_failed: t('referral_error_history_failed'),
      new_account: t('referral_error_new_account'),
      referrer_not_found: t('referral_pending_referrer_not_found'),
      ip_rate_limit: t('referral_error_ip_limit'),
      inviter_daily_limit: t('referral_error_inviter_limit'),
    }),
    [t],
  );

  const discordSdkRef = useRef<DiscordSDK | null>(null);
  const sdkReadyRef = useRef(false);

  useEffect(() => {
    fetchWithCreds('/api/member/profile')
      .then((r) => r.json())
      .then((data) => {
        setReferralCode(String(data.referral_code ?? ''));
        setReferredBy(data.referred_by ?? null);
        setTotalInvites(Number(data.total_invites ?? 0));
        setReferralReward(Number(data.referral_reward ?? 500));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    import('@/lib/pendingReferral')
      .then(({ getPendingReferral, onPendingReferralChange }) => {
        const current = getPendingReferral();
        if (current) setPendingReferrerState(current);
        return onPendingReferralChange((r) => setPendingReferrerState(r));
      })
      .then((unsub) => () => {
        if (typeof unsub === 'function') unsub();
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'stats') return;
    setStatsLoading(true);
    fetchWithCreds('/api/member/referral-stats')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'leaderboard') return;
    setLeaderboardLoading(true);
    fetchWithCreds('/api/member/referral-leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setLeaderboard(data.entries ?? []);
          setMyRank(data.my_rank ?? null);
          setMyInvites(data.my_invites ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false));
  }, [activeTab]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode || refSubmitted || referredBy || pendingReferrer) return;
    const code = refCode.trim().toUpperCase();
    if (code.length !== 6) return;
    import('@/lib/pendingReferral')
      .then(({ setPendingReferral, getPendingReferral }) => {
        if (!getPendingReferral()) {
          setPendingReferral({ type: 'by_code', code });
          setPendingReferrerState({ type: 'by_code', code });
        }
      })
      .catch(() => {});
    setRefSubmitted(true);
  }, [searchParams, refSubmitted, referredBy, pendingReferrer]);

  useEffect(() => {
    const getFrameId = (): string | null => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const frameIdFromUrl = params.get('frame_id');
      if (frameIdFromUrl) {
        try {
          localStorage.setItem('discord_frame_id', frameIdFromUrl);
        } catch {
          /* ignore */
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
        return true;
      }
    };

    const checkSdk = async () => {
      try {
        const frameId = getFrameId();
        if (!frameId && !isInIframe()) {
          setSdkChecking(false);
          return;
        }
        try {
          const { getDiscordSdk } = await import('@/lib/discordSdk');
          for (let i = 0; i < 10; i++) {
            const existingSdk = getDiscordSdk();
            if (existingSdk) {
              discordSdkRef.current = existingSdk;
              sdkReadyRef.current = true;
              setInviteAvailable(true);
              setSdkChecking(false);
              return;
            }
            await new Promise((r) => setTimeout(r, 500));
          }
        } catch {
          /* lib missing */
        }
        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
        if (clientId && frameId) {
          try {
            const { DiscordSDK } = await import('@discord/embedded-app-sdk');
            const sdk = new DiscordSDK(clientId);
            await sdk.ready();
            discordSdkRef.current = sdk;
            sdkReadyRef.current = true;
            setInviteAvailable(true);
          } catch {
            /* SDK init failed */
          }
        }
      } finally {
        setSdkChecking(false);
      }
    };
    void checkSdk();
  }, []);

  const nextMilestone = useMemo(
    () => REFERRAL_MILESTONES.find((m) => m > totalInvites) ?? REFERRAL_MILESTONES[REFERRAL_MILESTONES.length - 1],
    [totalInvites],
  );
  const progressPercent = useMemo(
    () => Math.min(100, Math.round((totalInvites / nextMilestone) * 100)),
    [totalInvites, nextMilestone],
  );
  const milestoneText =
    totalInvites >= nextMilestone
      ? t('referral_milestone_reached')
      : t('referral_milestone_next', { target: nextMilestone, remaining: nextMilestone - totalInvites });

  const displayTotalInvites = stats?.total_invites ?? totalInvites;
  const displayTotalEarned = stats?.total_earned_papel ?? 0;
  const claimedMilestones = stats?.claimed_milestones ?? [];

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
      setShareStatus({ type: 'error', message: t('referral_error_discord_sdk') });
      return;
    }
    setShareLoading(true);
    setShareStatus(null);
    try {
      let linkId: string | null = null;
      try {
        const res = await fetchWithCreds(apiUrl('/api/member/discord-share-link'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            custom_id: referralCode ? `ref:${referralCode}` : undefined,
            title: t('referral_share_title'),
            description: t('referral_share_description'),
          }),
        });
        if (res.ok) {
          const d = await res.json();
          linkId = d.link_id ?? null;
        }
      } catch {
        /* fall through */
      }
      const args = linkId
        ? { message: t('referral_share_message'), link_id: linkId }
        : {
            message: t('referral_share_message'),
            custom_id: referralCode ? `ref:${referralCode}` : undefined,
          };
      const result = await discordSdkRef.current.commands.shareLink(args);
      if (result?.success) {
        setShareStatus({ type: 'success', message: t('referral_share_success') });
      } else {
        setShareStatus({ type: 'error', message: t('referral_share_cancelled') });
      }
    } catch (e: unknown) {
      setShareStatus({
        type: 'error',
        message: (e instanceof Error ? e.message : null) ?? t('referral_share_failed'),
      });
    } finally {
      setShareLoading(false);
      window.setTimeout(() => setShareStatus(null), 4000);
    }
  };

  const openInviteDialog = async () => {
    if (!sdkReadyRef.current || !discordSdkRef.current) {
      const inviteUrl = siteConfig.bot.inviteUrl;
      if (inviteUrl) window.open(inviteUrl, '_blank');
      return;
    }
    try {
      await discordSdkRef.current.commands.openInviteDialog();
    } catch {
      /* silent */
    }
  };

  const dismissPending = () => {
    import('@/lib/pendingReferral')
      .then(({ setPendingReferral }) => setPendingReferral(null))
      .catch(() => {});
    setPendingReferrerState(null);
  };

  const acceptPendingReferral = async () => {
    if (!pendingReferrer) return;
    setPendingSubmitting(true);
    setPendingStatus(null);
    try {
      let res: Response;
      if (pendingReferrer.type === 'by_code') {
        res = await fetchWithCreds('/api/member/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pendingReferrer.code }),
        });
      } else {
        res = await fetchWithCreds('/api/member/referral-by-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referrer_discord_id: pendingReferrer.referrer_discord_id }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPendingStatus({
          type: 'error',
          message:
            referralErrorMessages[data.error as string] ??
            t('referral_pending_unknown_error', { error: data.error ?? 'bilinmiyor' }),
        });
      } else {
        const reward = Number(data.reward ?? referralReward);
        setPendingStatus({ type: 'success', message: t('referral_pending_success', { reward }) });
        const label =
          pendingReferrer.type === 'by_code'
            ? pendingReferrer.code
            : pendingReferrer.referrer_discord_id;
        onReferralApplied(reward, label);
        dismissPending();
      }
    } catch {
      setPendingStatus({ type: 'error', message: t('referral_pending_server_error') });
    } finally {
      setPendingSubmitting(false);
    }
  };

  const submitManualCode = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setManualStatus({ type: 'error', message: t('referral_manual_code_length') });
      return;
    }
    setManualSubmitting(true);
    setManualStatus(null);
    try {
      const res = await fetchWithCreds('/api/member/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setManualStatus({
          type: 'error',
          message:
            referralErrorMessages[data.error as string] ??
            t('referral_manual_unknown_error', { error: data.error ?? 'bilinmiyor' }),
        });
      } else {
        const reward = Number(data.reward ?? referralReward);
        setManualStatus({ type: 'success', message: t('referral_manual_success', { reward }) });
        onReferralApplied(reward, code);
        setManualCode('');
      }
    } catch {
      setManualStatus({ type: 'error', message: t('referral_manual_server_error') });
    } finally {
      setManualSubmitting(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-indigo-500/15 text-indigo-400'
        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
    }`;

  return (
    <section id="referral-section" className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-3 sm:px-5 sm:py-4">
      {showCelebration && (
        <div
          className="fixed inset-x-4 top-4 z-50 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
          role="status"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
            <LuCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-300">{t('referral_celebration_title')}</p>
            <p className="text-xs text-slate-400">
              {t('referral_celebration_body', { reward: referralReward })}
            </p>
          </div>
        </div>
      )}

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">
          {t('dashboard_invite_earn')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">{t('referral_share_hint')}</p>
      </header>

      {pendingReferrer && !referredBy && (
        <div className={`${CARD} ${CARD_PAD} border-indigo-500/30 bg-indigo-500/5`}>
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15">
              <LuGift className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{t('referral_pending_title')}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {pendingReferrer.type === 'by_code'
                  ? t('referral_pending_code_label', { code: pendingReferrer.code })
                  : t('referral_pending_user_label', {
                      id: pendingReferrer.referrer_discord_id.slice(-4),
                    })}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t('referral_pending_accept_hint', { reward: referralReward.toLocaleString() })}
              </p>
              {pendingStatus && (
                <div className="mt-2">
                  <StatusLine type={pendingStatus.type} message={pendingStatus.message} />
                </div>
              )}
            </div>
          </div>
          {(!pendingStatus?.type || pendingStatus.type === 'error') && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pendingSubmitting}
                onClick={acceptPendingReferral}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingSubmitting ? <Spinner /> : <LuCheck className="h-4 w-4" />}
                {t('referral_pending_accept_button')}
              </button>
              <button
                type="button"
                onClick={dismissPending}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:text-white"
              >
                {t('referral_pending_reject_button')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`${CARD} ${CARD_PAD}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('referral_your_code_label')}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em] text-white sm:text-3xl">
              {referralCode || '—'}
            </p>
            {referralReward > 0 ? (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                <LuGift className="h-3.5 w-3.5 shrink-0" />
                {t('referral_card_reward_text', { reward: referralReward.toLocaleString('tr-TR') })}
              </span>
            ) : (
              <span className="mt-2 inline-block text-xs text-slate-500">{t('referral_card_no_reward')}</span>
            )}
            {status && (
              <div className="mt-2">
                <StatusLine type={status.type} message={status.message} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            disabled={!referralCode}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-40"
          >
            <LuCopy className="h-4 w-4 text-slate-400" />
            {t('referral_copy_button')}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row">
          {sdkChecking ? (
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-800/60" />
          ) : inviteAvailable ? (
            <>
              <button
                type="button"
                onClick={shareWithReferral}
                disabled={shareLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {shareLoading ? <Spinner /> : <DiscordMark />}
                {t('referral_discord_share_button')}
              </button>
              <button
                type="button"
                onClick={openInviteDialog}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/70"
              >
                <LuUserPlus className="h-4 w-4 text-indigo-400" />
                {t('referral_invite_button')}
              </button>
            </>
          ) : (
            <p className="flex flex-1 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-500">
              <LuShare2 className="h-4 w-4 shrink-0 text-slate-600" />
              {t('referral_discord_only')}
            </p>
          )}
        </div>
        {shareStatus && (
          <div className="mt-2">
            <StatusLine type={shareStatus.type} message={shareStatus.message} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          {
            icon: LuCoins,
            label: t('referral_stats_total_earned'),
            value: displayTotalEarned.toLocaleString(),
            sub: 'Papel',
            accent: false,
          },
          {
            icon: LuUsers,
            label: t('referral_stats_active_referrals'),
            value: String(displayTotalInvites),
            sub: t('referral_stats_invites_unit'),
            accent: false,
          },
          {
            icon: LuTrophy,
            label: t('referral_stats_next_target'),
            value: String(stats?.next_milestone ?? nextMilestone),
            sub: t('referral_stats_target_unit'),
            accent: true,
          },
        ].map((item) => (
          <div key={item.label} className={`${CARD} p-3 sm:p-4`}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  item.accent ? 'bg-indigo-500/15' : 'bg-slate-800/80'
                }`}
              >
                <item.icon className={`h-4 w-4 ${item.accent ? 'text-indigo-400' : 'text-slate-400'}`} />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 leading-tight">
                {item.label}
              </p>
            </div>
            <p className="mt-2 text-lg font-bold text-white tabular-nums">{item.value}</p>
            <p className="text-[10px] text-slate-500">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className={`flex gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1`}>
        <button type="button" onClick={() => setActiveTab('stats')} className={tabClass(activeTab === 'stats')}>
          {t('referral_tab_stats')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={tabClass(activeTab === 'leaderboard')}
        >
          {t('referral_tab_leaderboard')}
        </button>
      </div>

      {activeTab === 'stats' && (
        <div className="flex flex-col gap-3">
          {referredBy && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2.5 text-sm">
              <LuUserPlus className="h-4 w-4 shrink-0 text-indigo-400" />
              <span className="text-slate-300">
                {t('referral_invited_by', { name: referredBy })}
              </span>
            </div>
          )}

          <div className={`${CARD} ${CARD_PAD}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">{t('referral_progress_label')}</p>
                <p className="text-xs text-slate-500">{milestoneText}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-300">
                {totalInvites} / {nextMilestone}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('referral_milestone_title')}
            </p>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {REFERRAL_MILESTONES.map((m) => {
                const claimed = claimedMilestones.includes(m);
                const isNext =
                  !claimed &&
                  m > displayTotalInvites &&
                  REFERRAL_MILESTONES.find((ms) => ms > displayTotalInvites) === m;
                return (
                  <div
                    key={m}
                    className={`flex flex-col items-center rounded-lg border px-1 py-2 text-center transition ${
                      claimed
                        ? 'border-amber-500/35 bg-amber-500/10'
                        : isNext
                          ? 'border-indigo-500/40 bg-indigo-500/10'
                          : 'border-slate-800 bg-slate-900/50'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        claimed ? 'text-amber-400' : isNext ? 'text-indigo-400' : 'text-slate-600'
                      }`}
                    >
                      {claimed ? (
                        <LuStar className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[11px] font-bold">{m}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 text-[9px] font-semibold leading-tight ${
                        claimed ? 'text-amber-400/90' : isNext ? 'text-indigo-300' : 'text-slate-600'
                      }`}
                    >
                      +{(REFERRAL_MILESTONE_REWARDS[m] ?? 0).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!referredBy && (
            <div className={`${CARD} ${CARD_PAD}`}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
                  <LuKeyRound className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('referral_manual_title')}</p>
                  <p className="text-xs text-slate-500">
                    {t('referral_manual_description', { reward: referralReward.toLocaleString() })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) =>
                    setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  disabled={manualSubmitting}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 font-mono text-sm font-semibold tracking-widest text-white uppercase outline-none placeholder:text-slate-600 focus:border-indigo-500/50 disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={manualSubmitting || manualCode.length !== 6}
                  onClick={submitManualCode}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {manualSubmitting ? <Spinner /> : null}
                  {t('referral_manual_apply_button')}
                </button>
              </div>
              {manualStatus && (
                <div className="mt-2">
                  <StatusLine type={manualStatus.type} message={manualStatus.message} />
                </div>
              )}
            </div>
          )}

          <div className={`${CARD} ${CARD_PAD}`}>
            <div className="mb-3 flex items-center gap-2">
              <LuHistory className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-medium text-white">{t('referral_invite_history_title')}</p>
            </div>
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-800/60" />
                ))}
              </div>
            ) : (stats?.invite_history?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">{t('referral_invite_history_empty')}</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {(stats?.invite_history ?? []).map((row, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-300">
                      {row.invitee_masked.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-200">{row.invitee_masked}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(row.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {t('referral_status_accepted')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className={`${CARD} ${CARD_PAD}`}>
          <p className="mb-3 text-sm font-medium text-white">{t('referral_leaderboard_title')}</p>
          {leaderboardLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800/60" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-slate-500">{t('referral_leaderboard_empty')}</p>
          ) : (
            <>
              <div className="mb-1 grid grid-cols-[2rem_1fr_3.5rem_4.5rem] gap-2 px-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                <span>#</span>
                <span>{t('referral_leaderboard_header_user')}</span>
                <span className="text-right">{t('referral_leaderboard_header_invites')}</span>
                <span className="text-right">{t('referral_leaderboard_header_earned')}</span>
              </div>
              <ul className="space-y-1">
                {leaderboard.map((entry) => (
                  <li
                    key={entry.rank}
                    className={`grid grid-cols-[2rem_1fr_3.5rem_4.5rem] items-center gap-2 rounded-lg px-2 py-2 ${
                      entry.is_me
                        ? 'border border-indigo-500/30 bg-indigo-500/10'
                        : 'bg-slate-900/40'
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      {entry.rank <= 3 ? (
                        <LuAward
                          className={`h-4 w-4 ${
                            entry.rank === 1
                              ? 'text-amber-400'
                              : entry.rank === 2
                                ? 'text-slate-300'
                                : 'text-amber-700'
                          }`}
                        />
                      ) : (
                        <span className="text-xs font-medium text-slate-500">{entry.rank}</span>
                      )}
                    </span>
                    <span
                      className={`truncate text-sm ${entry.is_me ? 'font-semibold text-indigo-200' : 'text-slate-300'}`}
                    >
                      {entry.user_label}
                      {entry.is_me && (
                        <span className="text-slate-500">{t('referral_leaderboard_you_suffix')}</span>
                      )}
                    </span>
                    <span className="text-right text-sm font-medium tabular-nums text-white">
                      {entry.total_invites}
                    </span>
                    <span className="text-right text-xs tabular-nums text-slate-500">
                      {entry.total_earned.toLocaleString()} P
                    </span>
                  </li>
                ))}
              </ul>
              {myRank !== null && !leaderboard.some((e) => e.is_me) && (
                <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                  {t('referral_leaderboard_rank', { rank: myRank })} · {myInvites}{' '}
                  {t('referral_stats_invites_unit')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
