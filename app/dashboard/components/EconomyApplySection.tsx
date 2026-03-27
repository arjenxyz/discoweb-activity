'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuLoader, LuTriangleAlert, LuCheck, LuThumbsUp, LuBadgeCheck, LuUsers } from 'react-icons/lu';
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
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0d12] w-full p-6">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/background/background.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
        <div className="relative z-10 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('economy_apply_title')}</h2>
        <p className="text-sm text-white/40 mt-0.5">{t('economy_apply_subtitle')}</p>
      </div>

      {/* What you get */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: LuBadgeCheck, title: t('economy_apply_feat_mari_title'), desc: t('economy_apply_feat_mari_desc') },
          { icon: LuUsers, title: t('economy_apply_feat_exchange_title'), desc: t('economy_apply_feat_exchange_desc') },
          { icon: LuThumbsUp, title: t('economy_apply_feat_tools_title'), desc: t('economy_apply_feat_tools_desc') },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <Icon className="h-5 w-5 text-indigo-400 mb-2" />
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/40 mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LuLoader className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <LuTriangleAlert className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : (
        <>
          {/* Status badge */}
          {app && app.status !== 'none' && (
            <StatusBadge app={app} />
          )}

          {/* Action panel */}
          {app?.status === 'none' && step === 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">{t('economy_apply_step1_title')}</h3>
              <p className="text-sm text-white/50">{t('economy_apply_step1_desc')}</p>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
                <p>{t('economy_apply_warning_title')}</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{t('economy_apply_warning_item_1')}</li>
                  <li>{t('economy_apply_warning_item_2')}</li>
                  <li>{t('economy_apply_warning_item_3')}</li>
                </ul>
              </div>
              <label className="flex items-start gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>{t('economy_apply_ack_label')}</span>
              </label>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={!acknowledged}
                  className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/30 disabled:opacity-40"
                >
                  {t('economy_apply_next')}
                </button>
              </div>
            </div>
          )}

          {app?.status === 'none' && step === 1 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">{t('economy_apply_panel_title')}</h3>
              <p className="text-sm text-white/50">{t('economy_apply_panel_desc')}</p>

              {actionError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />{actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  <LuCheck className="h-3.5 w-3.5 shrink-0" />{actionSuccess}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleApply('direct')}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/30 disabled:opacity-40"
                >
                  {submitting ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : t('economy_apply_direct_button')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApply('vote')}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  {t('economy_apply_vote_button')}
                </button>
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-xs text-white/50 hover:text-white"
                >
                  {t('economy_apply_back')}
                </button>
              </div>
            </div>
          )}

          {/* Voting campaign panel ??? any member can vote */}
          {app?.status === 'voting' && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">{t('economy_apply_vote_title')}</h3>

              {/* Vote progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">{t('economy_apply_votes_collected')}</span>
                  <span className="font-semibold text-white">{app.vote_count ?? 0} / {app.vote_threshold ?? 100}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, ((app.vote_count ?? 0) / (app.vote_threshold ?? 100)) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-white/30">
                  {t('economy_apply_votes_needed', { count: Math.max(0, (app.vote_threshold ?? 100) - (app.vote_count ?? 0)) })}
                </p>
              </div>

              {actionError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />{actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                  <LuCheck className="h-3.5 w-3.5 shrink-0" />{actionSuccess}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleVote()}
                disabled={submitting}
                className="w-full rounded-xl bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/30 disabled:opacity-40"
              >
                {submitting ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : <><LuThumbsUp className="inline mr-2 h-4 w-4" />{t('economy_apply_cast_vote_button')}</>}
              </button>
              <p className="text-xs text-white/25">{t('economy_apply_vote_age_hint')}</p>
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ app }: { app: AppStatus }) {
  const t = useT();
  const configs = {
    pending: { color: 'border-amber-500/20 bg-amber-500/10 text-amber-400', label: t('economy_apply_status_pending'), icon: LuLoader },
    approved: { color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', label: t('economy_apply_status_approved'), icon: LuCheck },
    rejected: { color: 'border-red-500/20 bg-red-500/10 text-red-400', label: t('economy_apply_status_rejected'), icon: LuTriangleAlert },
    voting: { color: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400', label: t('economy_apply_status_voting'), icon: LuUsers },
    none: { color: '', label: '', icon: LuLoader },
  } as const;
  const cfg = configs[app.status];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{cfg.label}</p>
        {app.status === 'pending' && app.scheduled_open_at && (
          <p className="text-xs opacity-70">{t('economy_apply_auto_approves_on', { date: new Date(app.scheduled_open_at).toLocaleDateString('tr-TR') })}</p>
        )}
        {app.status === 'rejected' && app.rejection_reason && (
          <p className="text-xs opacity-70">{t('economy_apply_rejection_reason', { reason: app.rejection_reason })}</p>
        )}
        {app.status === 'approved' && app.reviewed_at && (
          <p className="text-xs opacity-70">{t('economy_apply_approved_on', { date: new Date(app.reviewed_at).toLocaleDateString('tr-TR') })}</p>
        )}
      </div>
    </div>
  );
}
