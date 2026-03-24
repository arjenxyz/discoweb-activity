'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuLoader, LuTriangleAlert, LuCheck, LuThumbsUp, LuBadgeCheck, LuUsers } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';

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
  const [app, setApp] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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
          already_applied: 'Already applied.',
          forbidden: 'Only server admins can apply.',
          global_freeze: 'System is under maintenance.',
        };
        setActionError(msgs[json.error] ?? json.error ?? 'Failed.');
      } else {
        setActionSuccess(type === 'direct' ? 'Application submitted! We will review it soon.' : 'Voting campaign started! Share with your members.');
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
          already_voted: 'You already voted.',
          no_active_voting: 'No active voting campaign.',
        };
        setActionError(msgs[json.error] ?? json.error ?? 'Failed.');
      } else if (!json.vote_counted) {
        setActionError(`Vote not counted: account must be at least 30 days old (yours: ${json.account_age_days} days).`);
      } else {
        setActionSuccess('Vote cast successfully!');
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
      <div>
        <h2 className="text-xl font-bold text-white">Yüksek Ekonomi — Advanced Economy</h2>
        <p className="text-sm text-white/40 mt-0.5">Unlock advanced economy features for your server</p>
      </div>

      {/* What you get */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: LuBadgeCheck, title: 'Mari Currency', desc: 'Enable MRI global currency conversion for your members' },
          { icon: LuUsers, title: 'Exchange Listing', desc: 'List your server on the borsa (requires separate IPO application)' },
          { icon: LuThumbsUp, title: 'Advanced Tools', desc: 'Treasury, dividends, leaderboards and more' },
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
          {app?.status === 'none' && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Apply for Advanced Economy</h3>
              <p className="text-sm text-white/50">
                Servers with <span className="text-white">500+ members</span> can apply directly.
                Smaller servers can start a <span className="text-white">community vote</span> (100 votes needed).
              </p>

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
                  {submitting ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : 'Direct Apply'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApply('vote')}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  Start Vote
                </button>
              </div>
            </div>
          )}

          {/* Voting campaign panel — any member can vote */}
          {app?.status === 'voting' && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Community Vote in Progress</h3>

              {/* Vote progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Votes collected</span>
                  <span className="font-semibold text-white">{app.vote_count ?? 0} / {app.vote_threshold ?? 100}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.min(100, ((app.vote_count ?? 0) / (app.vote_threshold ?? 100)) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-white/30">{Math.max(0, (app.vote_threshold ?? 100) - (app.vote_count ?? 0))} more votes needed</p>
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
                {submitting ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : <><LuThumbsUp className="inline mr-2 h-4 w-4" />Cast My Vote</>}
              </button>
              <p className="text-xs text-white/25">Requires Discord account older than 30 days to count.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ app }: { app: AppStatus }) {
  const configs = {
    pending: { color: 'border-amber-500/20 bg-amber-500/10 text-amber-400', label: 'Under Review', icon: LuLoader },
    approved: { color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', label: 'Approved ✓', icon: LuCheck },
    rejected: { color: 'border-red-500/20 bg-red-500/10 text-red-400', label: 'Rejected', icon: LuTriangleAlert },
    voting: { color: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400', label: 'Voting in Progress', icon: LuUsers },
    none: { color: '', label: '', icon: LuLoader },
  };
  const cfg = configs[app.status];
  const Icon = cfg.icon;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${cfg.color}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{cfg.label}</p>
        {app.status === 'pending' && app.scheduled_open_at && (
          <p className="text-xs opacity-70">Auto-approves on {new Date(app.scheduled_open_at).toLocaleDateString()}</p>
        )}
        {app.status === 'rejected' && app.rejection_reason && (
          <p className="text-xs opacity-70">Reason: {app.rejection_reason}</p>
        )}
        {app.status === 'approved' && app.reviewed_at && (
          <p className="text-xs opacity-70">Approved on {new Date(app.reviewed_at).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
