'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LuLoader, LuTriangleAlert, LuCheck, LuThumbsUp,
  LuBadgeCheck, LuUsers, LuChevronRight, LuShield,
  LuTrendingUp, LuStar, LuArrowLeft, LuCircleCheck,
  LuCircleX, LuClock, LuVote,
} from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type AppStatus = {
  status: 'none' | 'pending' | 'approved' | 'rejected' | 'voting';
  guild_id?: string;
  type?: 'direct' | 'vote';
  vote_count?: number;
  vote_threshold?: number;
  scheduled_open_at?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

export default function EconomyApplySection() {
  const t = useT();
  const [app, setApp] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  const getGuildId = () => {
    try { return localStorage.getItem('selectedGuildId'); } catch { return null; }
  };
  const getStepKey = (gid: string | null) => gid ? `economy_apply_step_${gid}` : 'economy_apply_step';
  const getAckKey = (gid: string | null) => gid ? `economy_apply_ack_${gid}` : 'economy_apply_ack';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/economy-apply'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setApp(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const gid = getGuildId();
    try {
      const savedStep = localStorage.getItem(getStepKey(gid));
      const savedAck = localStorage.getItem(getAckKey(gid));
      if (savedStep) {
        const parsed = Number(savedStep);
        if (Number.isFinite(parsed)) setStep(parsed);
      }
      if (savedAck) setAcknowledged(savedAck === '1');
    } catch {}
  }, []);

  useEffect(() => {
    const gid = getGuildId();
    try {
      localStorage.setItem(getStepKey(gid), String(step));
      localStorage.setItem(getAckKey(gid), acknowledged ? '1' : '0');
    } catch {}
  }, [step, acknowledged]);

  const handleApply = async (type: 'direct' | 'vote') => {
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/economy-apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          already_applied: t('economy_apply_error_already_applied'),
          forbidden: t('economy_apply_error_forbidden'),
          global_freeze: t('economy_apply_error_global_freeze'),
        };
        setActionError(msgs[json.error] ?? json.error ?? t('economy_apply_error_generic'));
      } else {
        setActionSuccess(type === 'direct' ? t('economy_apply_success_direct') : t('economy_apply_success_vote'));
        void load();
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async () => {
    setSubmitting(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/economy-apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cast_vote' }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          already_voted: t('economy_apply_error_already_voted'),
          no_active_voting: t('economy_apply_error_no_active_voting'),
        };
        setActionError(msgs[json.error] ?? json.error ?? t('economy_apply_error_generic'));
      } else if (!json.vote_counted) {
        setActionError(t('economy_apply_error_vote_age', { days: json.account_age_days }));
      } else {
        setActionSuccess(t('economy_apply_success_vote_cast'));
        void load();
      }
    } catch (e) {
      setActionError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[#0e1018]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/background/background.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-transparent to-purple-950/20" />
      </div>

      <div className="relative flex-1 w-full px-4 py-6 sm:px-8 sm:py-10">
        <div className="relative z-10 max-w-2xl mx-auto space-y-5">

          {/* Hero card — Papara tarzı gradient kart */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-6 shadow-2xl shadow-violet-900/40">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <LuTrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Premium</span>
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">{t('economy_apply_title')}</h1>
              <p className="text-sm text-white/65 mt-1.5">{t('economy_apply_subtitle')}</p>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: LuBadgeCheck, title: t('economy_apply_feat_mari_title'), desc: t('economy_apply_feat_mari_desc'), color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
              { icon: LuUsers, title: t('economy_apply_feat_exchange_title'), desc: t('economy_apply_feat_exchange_desc'), color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
              { icon: LuStar, title: t('economy_apply_feat_tools_title'), desc: t('economy_apply_feat_tools_desc'), color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={`rounded-2xl border p-4 ${bg}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 mb-3`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-white/45 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Content area */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                <span className="text-xs text-white/30">Yükleniyor...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-400">
              <LuTriangleAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Status card */}
              {app && app.status !== 'none' && (
                <StatusCard app={app} />
              )}

              {/* Step 0 — Bilgilendirme */}
              {app?.status === 'none' && step === 0 && (
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15">
                        <LuShield className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{t('economy_apply_step1_title')}</h3>
                        <p className="text-xs text-white/40 mt-0.5">{t('economy_apply_step1_desc')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Warning items */}
                    <div className="space-y-2.5">
                      {[
                        t('economy_apply_warning_item_1'),
                        t('economy_apply_warning_item_2'),
                        t('economy_apply_warning_item_3'),
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl bg-amber-500/8 border border-amber-500/15 px-3.5 py-3">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                            <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                          </div>
                          <p className="text-xs text-amber-200/80 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>

                    {/* Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                          acknowledged
                            ? 'border-violet-500 bg-violet-500'
                            : 'border-white/20 bg-white/5 group-hover:border-white/40'
                        }`}
                        onClick={() => setAcknowledged(!acknowledged)}
                      >
                        {acknowledged && <LuCheck className="h-3 w-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                      />
                      <span className="text-xs text-white/60 leading-relaxed select-none">{t('economy_apply_ack_label')}</span>
                    </label>

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={!acknowledged}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-900/50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {t('economy_apply_next')}
                      <LuChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1 — Başvuru seçeneği */}
              {app?.status === 'none' && step === 1 && (
                <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
                  <div className="p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/15">
                        <LuTrendingUp className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{t('economy_apply_panel_title')}</h3>
                        <p className="text-xs text-white/40 mt-0.5">{t('economy_apply_panel_desc')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Alerts */}
                    {actionError && (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                        <LuTriangleAlert className="h-4 w-4 shrink-0" />{actionError}
                      </div>
                    )}
                    {actionSuccess && (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
                        <LuCircleCheck className="h-4 w-4 shrink-0" />{actionSuccess}
                      </div>
                    )}

                    {/* Option cards */}
                    <button
                      type="button"
                      onClick={() => void handleApply('direct')}
                      disabled={submitting}
                      className="w-full flex items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/25 px-4 py-4 text-left transition-all hover:from-violet-600/30 hover:to-purple-600/30 hover:border-violet-500/40 disabled:opacity-40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20">
                        {submitting ? (
                          <LuLoader className="h-5 w-5 animate-spin text-violet-400" />
                        ) : (
                          <LuBadgeCheck className="h-5 w-5 text-violet-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{t('economy_apply_direct_button')}</p>
                        <p className="text-xs text-white/40 mt-0.5">500+ üye için anında başvuru</p>
                      </div>
                      <LuChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleApply('vote')}
                      disabled={submitting}
                      className="w-full flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 text-left transition-all hover:bg-white/[0.07] hover:border-white/15 disabled:opacity-40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/8">
                        <LuUsers className="h-5 w-5 text-white/60" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white/80">{t('economy_apply_vote_button')}</p>
                        <p className="text-xs text-white/40 mt-0.5">100 oy ile topluluk onayı</p>
                      </div>
                      <LuChevronRight className="h-4 w-4 text-white/30 shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors mt-1"
                    >
                      <LuArrowLeft className="h-3.5 w-3.5" />
                      {t('economy_apply_back')}
                    </button>
                  </div>
                </div>
              )}

              {/* Voting campaign */}
              {app?.status === 'voting' && (
                <VotingCard
                  app={app}
                  submitting={submitting}
                  actionError={actionError}
                  actionSuccess={actionSuccess}
                  onVote={handleVote}
                  t={t}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({ app }: { app: AppStatus }) {
  const t = useT();

  const configs = {
    pending: {
      gradient: 'from-amber-600/20 to-orange-600/20',
      border: 'border-amber-500/25',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-400',
      label: t('economy_apply_status_pending'),
      icon: LuClock,
    },
    approved: {
      gradient: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/25',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
      label: t('economy_apply_status_approved'),
      icon: LuCircleCheck,
    },
    rejected: {
      gradient: 'from-red-600/20 to-rose-600/20',
      border: 'border-red-500/25',
      iconBg: 'bg-red-500/20',
      textColor: 'text-red-400',
      label: t('economy_apply_status_rejected'),
      icon: LuCircleX,
    },
    voting: {
      gradient: 'from-violet-600/20 to-purple-600/20',
      border: 'border-violet-500/25',
      iconBg: 'bg-violet-500/20',
      textColor: 'text-violet-400',
      label: t('economy_apply_status_voting'),
      icon: LuVote,
    },
    none: {
      gradient: '',
      border: 'border-white/10',
      iconBg: 'bg-white/10',
      textColor: 'text-white/60',
      label: '',
      icon: LuLoader,
    },
  } as const;

  const cfg = configs[app.status];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-4 rounded-3xl border bg-gradient-to-r px-5 py-4 ${cfg.gradient} ${cfg.border}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.iconBg}`}>
        <Icon className={`h-5 w-5 ${cfg.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.textColor}`}>{cfg.label}</p>
        {app.status === 'pending' && app.scheduled_open_at && (
          <p className="text-xs text-white/40 mt-0.5">{t('economy_apply_auto_approves_on', { date: new Date(app.scheduled_open_at).toLocaleDateString('tr-TR') })}</p>
        )}
        {app.status === 'rejected' && app.rejection_reason && (
          <p className="text-xs text-white/40 mt-0.5">{t('economy_apply_rejection_reason', { reason: app.rejection_reason })}</p>
        )}
        {app.status === 'approved' && app.reviewed_at && (
          <p className="text-xs text-white/40 mt-0.5">{t('economy_apply_approved_on', { date: new Date(app.reviewed_at).toLocaleDateString('tr-TR') })}</p>
        )}
      </div>
    </div>
  );
}

function VotingCard({
  app, submitting, actionError, actionSuccess, onVote, t,
}: {
  app: AppStatus;
  submitting: boolean;
  actionError: string | null;
  actionSuccess: string | null;
  onVote: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const voteCount = app.vote_count ?? 0;
  const voteThreshold = app.vote_threshold ?? 100;
  const pct = Math.min(100, (voteCount / voteThreshold) * 100);

  return (
    <div className="rounded-3xl border border-violet-500/20 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600/15 to-purple-600/15 px-5 py-4 border-b border-violet-500/15">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-500/20">
            <LuVote className="h-4 w-4 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">{t('economy_apply_vote_title')}</h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Progress */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-3xl font-bold text-white">{voteCount}</span>
              <span className="text-lg text-white/40 ml-1">/ {voteThreshold}</span>
            </div>
            <span className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1">
              {t('economy_apply_votes_needed', { count: Math.max(0, voteThreshold - voteCount) })}
            </span>
          </div>

          {/* Track */}
          <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-white/25">
            <span>0</span>
            <span>{Math.round(pct)}%</span>
            <span>{voteThreshold}</span>
          </div>
        </div>

        {/* Alerts */}
        {actionError && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
            <LuTriangleAlert className="h-4 w-4 shrink-0" />{actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
            <LuCircleCheck className="h-4 w-4 shrink-0" />{actionSuccess}
          </div>
        )}

        {/* Vote button */}
        <button
          type="button"
          onClick={onVote}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-all hover:from-violet-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <LuLoader className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LuThumbsUp className="h-4 w-4" />
              {t('economy_apply_cast_vote_button')}
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-white/25">{t('economy_apply_vote_age_hint')}</p>
      </div>
    </div>
  );
}
