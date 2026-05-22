'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LuCoins, LuUsers, LuClock, LuTrophy, LuStar } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { siteConfig } from '@/config/site';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

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

const MILESTONE_REWARDS: Record<number, number> = {
  5: 500,
  10: 1500,
  20: 3000,
  50: 10000,
  100: 25000,
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
  const [sdkChecking, setSdkChecking] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualStatus, setManualStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pending referral — Discord SDK'dan gelen, onay bekleyen davet
  const [pendingReferrer, setPendingReferrerState] = useState<
    { type: 'by_user'; referrer_discord_id: string } | { type: 'by_code'; code: string } | null
  >(null);
  const [pendingSubmitting, setPendingSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Stats & leaderboard
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myInvites, setMyInvites] = useState<number>(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'leaderboard'>('stats');


  const discordSdkRef = useRef<any | null>(null);
  const sdkReadyRef = useRef(false);

  // Load profile
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

  // Pending referral listener
  useEffect(() => {
    import('@/lib/pendingReferral').then(({ getPendingReferral, onPendingReferralChange }) => {
      const current = getPendingReferral();
      if (current) setPendingReferrerState(current);
      return onPendingReferralChange((r) => setPendingReferrerState(r));
    }).then((unsub) => {
      return () => { if (typeof unsub === 'function') unsub(); };
    }).catch(() => {});
  }, []);


  // Load stats
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

  // Load leaderboard
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

  // Auto-apply referral from URL
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
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      } catch {
        setStatus({ type: 'error', message: t('referral_error_server') });
      } finally {
        setRefSubmitted(true);
      }
    };
    void submitRef();
  }, [searchParams, refSubmitted]);

  // Discord SDK init
  useEffect(() => {
    const getFrameId = (): string | null => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const frameIdFromUrl = params.get('frame_id');
      if (frameIdFromUrl) {
        try { localStorage.setItem('discord_frame_id', frameIdFromUrl); } catch { /* ignore */ }
        return frameIdFromUrl;
      }
      try { return localStorage.getItem('discord_frame_id'); } catch { return null; }
    };

    const isInIframe = () => {
      if (typeof window === 'undefined') return false;
      try { return window.self !== window.top; } catch { return true; }
    };

    const checkSdk = async () => {
      try {
        const frameId = getFrameId();
        if (!frameId && !isInIframe()) {
          // Kesinlikle Discord dışı — hemen bitir
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
            await new Promise(r => setTimeout(r, 500));
          }
        } catch { /* lib yoksa devam */ }

        const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
        if (clientId && frameId) {
          try {
            const { DiscordSDK } = await import('@discord/embedded-app-sdk');
            const sdk = new DiscordSDK(clientId);
            await sdk.ready();
            discordSdkRef.current = sdk;
            sdkReadyRef.current = true;
            setInviteAvailable(true);
          } catch { /* SDK başlatılamadı */ }
        }
      } finally {
        setSdkChecking(false);
      }
    };
    void checkSdk();
  }, []);

  const nextMilestone = useMemo(() => MILESTONES.find((m) => m > totalInvites) ?? MILESTONES[MILESTONES.length - 1], [totalInvites]);
  const progressPercent = useMemo(() => Math.min(100, Math.round((totalInvites / nextMilestone) * 100)), [totalInvites, nextMilestone]);
  const milestoneText = totalInvites >= nextMilestone
    ? t('referral_milestone_reached')
    : t('referral_milestone_next', { target: nextMilestone, remaining: nextMilestone - totalInvites });

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
      } catch { /* fall through */ }

      const args = linkId
        ? { message: t('referral_share_message'), link_id: linkId }
        : { message: t('referral_share_message'), custom_id: referralCode ? `ref:${referralCode}` : undefined };

      const result = await discordSdkRef.current.commands.shareLink(args);
      if (result?.success) {
        setShareStatus({ type: 'success', message: t('referral_share_success') });
      } else {
        setShareStatus({ type: 'error', message: t('referral_share_cancelled') });
      }
    } catch (e: unknown) {
      setShareStatus({ type: 'error', message: (e instanceof Error ? e.message : null) ?? t('referral_share_failed') });
    } finally {
      setShareLoading(false);
      window.setTimeout(() => setShareStatus(null), 4000);
    }
  };


  const openInviteDialog = async () => {
    if (!sdkReadyRef.current || !discordSdkRef.current) {
      // Discord dışında — bot invite URL'sine yönlendir
      const inviteUrl = siteConfig.bot.inviteUrl;
      if (inviteUrl) window.open(inviteUrl, '_blank');
      return;
    }
    try {
      await discordSdkRef.current.commands.openInviteDialog();
    } catch {
      // Başarısız olursa sessizce geç
    }
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
        const msgs: Record<string, string> = {
          already_referred: t('referral_pending_already_referred'),
          new_account: t('referral_pending_new_account'),
          self_referral: t('referral_pending_self_referral'),
          referrer_not_found: t('referral_pending_referrer_not_found'),
          code_not_found: t('referral_pending_code_not_found'),
        };
        setPendingStatus({ type: 'error', message: msgs[data.error] ?? t('referral_pending_unknown_error', { error: data.error ?? 'bilinmiyor' }) });
      } else {
        const reward = data.reward ?? referralReward;
        setPendingStatus({ type: 'success', message: t('referral_pending_success', { reward }) });
        setReferredBy(
          pendingReferrer.type === 'by_code'
            ? pendingReferrer.code
            : pendingReferrer.referrer_discord_id,
        );
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3500);
        // Clear pending
        import('@/lib/pendingReferral').then(({ setPendingReferral }) => setPendingReferral(null)).catch(() => {});
        setPendingReferrerState(null);
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
        const msgs: Record<string, string> = {
          already_referred: t('referral_manual_already_referred'),
          code_not_found: t('referral_manual_code_not_found'),
          cannot_use_own_code: t('referral_manual_own_code'),
          invalid_code: t('referral_manual_invalid_code'),
          new_account: t('referral_manual_new_account'),
          update_failed: t('referral_manual_update_failed'),
        };
        setManualStatus({ type: 'error', message: msgs[data.error] ?? t('referral_manual_unknown_error', { error: data.error ?? 'bilinmiyor' }) });
      } else {
        setManualStatus({ type: 'success', message: t('referral_manual_success', { reward: data.reward ?? referralReward }) });
        setReferredBy(code);
        setManualCode('');
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3500);
      }
    } catch {
      setManualStatus({ type: 'error', message: t('referral_manual_server_error') });
    } finally {
      setManualSubmitting(false);
    }
  };




  // Display stats to use (from API or fallback to profile data)
  const displayTotalInvites = stats?.total_invites ?? totalInvites;
  const displayTotalEarned = stats?.total_earned_papel ?? 0;
  const claimedMilestones = stats?.claimed_milestones ?? [];

  return (
    <section id="referral-section" className="space-y-6">
      {/* Celebration Toast */}
      {showCelebration && (
        <div className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-5 py-4 shadow-2xl backdrop-blur animate-bounce">
          <p className="text-base font-bold text-emerald-300">{t('referral_celebration_title')}</p>
          <p className="text-sm text-emerald-200/70">{t('referral_celebration_body', { reward: referralReward })}</p>
        </div>
      )}

      {/* Pending Referral Banner — Discord shareLink'ten geldi, onay bekliyor */}
      {pendingReferrer && !referredBy && (
        <div className="rounded-3xl border border-indigo-500/40 bg-indigo-500/10 p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-indigo-200">{t('referral_pending_title')}</p>
              <p className="mt-0.5 text-xs text-indigo-300/70">
                {pendingReferrer.type === 'by_code'
                  ? t('referral_pending_code_label', { code: pendingReferrer.code })
                  : t('referral_pending_user_label', { id: pendingReferrer.referrer_discord_id.slice(-4) })}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {t('referral_pending_accept_hint', { reward: referralReward.toLocaleString() })}
              </p>
              {pendingStatus && (
                <p className={`mt-2 text-sm font-semibold ${pendingStatus.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {pendingStatus.message}
                </p>
              )}
            </div>
          </div>
          {!pendingStatus?.type || pendingStatus.type === 'error' ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pendingSubmitting}
                onClick={acceptPendingReferral}
                className="flex-1 rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pendingSubmitting ? (
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
                ) : t('referral_pending_accept_button')}
              </button>
              <button
                type="button"
                onClick={() => {
                  import('@/lib/pendingReferral').then(({ setPendingReferral }) => setPendingReferral(null)).catch(() => {});
                  setPendingReferrerState(null);
                }}
                className="rounded-xl bg-white/8 px-4 py-2.5 text-sm text-white/50 transition hover:bg-white/12"
              >
                {t('referral_pending_reject_button')}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Davet Kodun Kartı */}
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0b0d12]/70 via-[#0b0d12]/50 to-[#111827]/70 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:items-end sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{t('referral_your_code_label')}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-wide text-white">{referralCode || '—'}</h1>
            <p className="mt-1 text-xs text-white/40">{t('referral_share_hint')}</p>
            {referralReward > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <span>🎁</span>
                <span>{t('referral_card_reward_text', { reward: referralReward.toLocaleString('tr-TR') })}</span>
              </div>
            )}
            {referralReward === 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/30">
                {t('referral_card_no_reward')}
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

      {/* Stats Row — 3 chip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-white/50">
            <LuCoins className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{t('referral_stats_total_earned')}</span>
          </div>
          <p className="text-lg font-black text-white">{displayTotalEarned.toLocaleString()}</p>
          <p className="text-[10px] text-white/30">Papel</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-white/50">
            <LuUsers className="h-3.5 w-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{t('referral_stats_active_referrals')}</span>
          </div>
          <p className="text-lg font-black text-white">{displayTotalInvites}</p>
          <p className="text-[10px] text-white/30">{t('referral_stats_invites_unit')}</p>
        </div>

          <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-indigo-400/60">
              <LuTrophy className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">{t('referral_stats_next_target')}</span>
            </div>
            <p className="text-lg font-black text-white">{stats?.next_milestone ?? nextMilestone}</p>
            <p className="text-[10px] text-indigo-300/40">{t('referral_stats_target_unit')}</p>
          </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'stats' ? 'bg-indigo-500 text-white shadow' : 'text-white/50 hover:text-white/80'}`}
        >
          {t('referral_tab_stats')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'leaderboard' ? 'bg-indigo-500 text-white shadow' : 'text-white/50 hover:text-white/80'}`}
        >
          {t('referral_tab_leaderboard')}
        </button>
      </div>

      {/* ── İSTATİSTİKLER SEKMESİ ── */}
      {activeTab === 'stats' && (
        <>
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
              <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${status.type === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                {status.message}
              </div>
            )}
          </div>

          {/* Milestone Şeridi */}
          <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">{t('referral_milestone_title')}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MILESTONES.map((m) => {
                const claimed = claimedMilestones.includes(m);
                const isCurrent = !claimed && m > displayTotalInvites && (MILESTONES.find(ms => ms > displayTotalInvites) === m);
                return (
                  <div
                    key={m}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 min-w-[80px] transition
                      ${claimed
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : isCurrent
                        ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                        : 'border-white/8 bg-white/3 text-white/30'
                      }`}
                  >
                    {claimed ? (
                      <LuStar className="h-4 w-4 text-amber-400" />
                    ) : (
                      <span className="text-xs font-bold">{m}</span>
                    )}
                    <span className="text-[10px] font-semibold">{t('referral_milestone_invite_count', { count: m })}</span>
                    <span className={`text-[10px] font-black ${claimed ? 'text-amber-300' : isCurrent ? 'text-indigo-300' : 'text-white/20'}`}>
                      +{(MILESTONE_REWARDS[m] ?? 0).toLocaleString()}
                    </span>
                    {claimed && <span className="text-[9px] text-amber-400/70">{t('referral_milestone_badge_reached')}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
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

          {/* Davet Geçmişi */}
          <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
            <p className="mb-3 text-sm font-semibold text-white">{t('referral_invite_history_title')}</p>
            {statsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (stats?.invite_history?.length ?? 0) === 0 ? (
              <p className="text-sm text-white/30">{t('referral_invite_history_empty')}</p>
            ) : (
              <div className="space-y-2">
                {(stats?.invite_history ?? []).map((row, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                      {row.invitee_masked.slice(-1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{row.invitee_masked}</p>
                    </div>
                    <p className="text-[10px] text-white/30 shrink-0">
                      {new Date(row.created_at).toLocaleDateString('tr-TR')}
                    </p>
                    <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {t('referral_status_accepted')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>



          {/* Davet Ekranı */}
          {/* Arkadaşını Davet Et — sadece Discord Activity içindeyken */}
          <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-[#0b0d12]/60 via-[#0b0d12]/50 to-[#111827]/50 p-6 shadow-2xl">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-white">{t('referral_invite_section_title')}</p>
              <p className="text-sm text-white/60">{t('referral_invite_description')}</p>
              {sdkChecking ? (
                <div className="h-11 w-full rounded-2xl bg-white/5 animate-pulse" />
              ) : inviteAvailable ? (
                <>
                  <button
                    type="button"
                    onClick={shareWithReferral}
                    disabled={shareLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#5865F2] bg-[#5865F2] text-white hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shareLoading ? (
                      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.029.05a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.04.001-.088-.041-.104a13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.105c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                    )}
                    {t('referral_discord_share_button')}
                  </button>
                  {shareStatus && (
                    <p className={`text-xs text-center ${shareStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {shareStatus.message}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={openInviteDialog}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <span className="inline-flex h-3 w-3 rounded-full bg-emerald-300 animate-pulse" />
                    {t('referral_invite_button')}
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-xs text-white/35">
                  {t('referral_discord_only')}
                </div>
              )}
            </div>
          </div>

          {/* Manuel Kod Girişi — zaten davet edilmemişse göster */}
          {!referredBy && (
            <div className="rounded-3xl border border-white/15 bg-white/5 p-6">
              <p className="text-sm font-semibold text-white mb-1">{t('referral_manual_title')}</p>
              <p className="text-xs text-white/40 mb-3">{t('referral_manual_description', { reward: referralReward.toLocaleString() })}</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC123"
                  maxLength={6}
                  disabled={manualSubmitting}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-white placeholder-white/20 outline-none focus:border-indigo-500/50 uppercase disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={manualSubmitting || manualCode.length !== 6}
                  onClick={submitManualCode}
                  className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {manualSubmitting ? (
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : t('referral_manual_apply_button')}
                </button>
              </div>
              {manualStatus && (
                <p className={`mt-2 text-sm font-medium ${manualStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {manualStatus.message}
                </p>
              )}
            </div>
          )}


        </>
      )}

      {/* ── LİDERLİK SEKMESİ ── */}
      {activeTab === 'leaderboard' && (
        <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
          <p className="mb-4 text-sm font-semibold text-white">{t('referral_leaderboard_title')}</p>
          {leaderboardLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-white/30">{t('referral_leaderboard_empty')}</p>
          ) : (
            <>
              {/* Header */}
              <div className="mb-2 grid grid-cols-[2rem_1fr_4rem_5rem] gap-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                <span>{t('referral_leaderboard_header_rank')}</span>
                <span>{t('referral_leaderboard_header_user')}</span>
                <span className="text-right">{t('referral_leaderboard_header_invites')}</span>
                <span className="text-right">{t('referral_leaderboard_header_earned')}</span>
              </div>
              <div className="space-y-1.5">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-[2rem_1fr_4rem_5rem] items-center gap-2 rounded-xl px-3 py-2.5 transition
                      ${entry.is_me
                        ? 'border border-indigo-500/40 bg-indigo-500/10'
                        : 'bg-white/5 hover:bg-white/8'
                      }`}
                  >
                    <span className={`text-sm font-bold ${entry.rank <= 3 ? 'text-amber-400' : 'text-white/40'}`}>
                      {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </span>
                    <span className={`text-sm truncate ${entry.is_me ? 'font-bold text-indigo-200' : 'text-white/80'}`}>
                      {entry.user_label}{entry.is_me && t('referral_leaderboard_you_suffix')}
                    </span>
                    <span className="text-right text-sm font-semibold text-white">{entry.total_invites}</span>
                    <span className="text-right text-xs text-white/50">{entry.total_earned.toLocaleString()} P</span>
                  </div>
                ))}
              </div>

              {/* Kendi sırası top 10 dışındaysa */}
              {myRank !== null && !leaderboard.some((e) => e.is_me) && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/60">
                  {t('referral_leaderboard_rank', { rank: myRank })} · {myInvites} {t('referral_stats_invites_unit')}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
