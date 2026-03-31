'use client';

import { useEffect, useState, useCallback } from 'react';
import { LuLoader, LuTriangleAlert, LuCheck, LuInfo } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { useT } from '@/contexts/LocaleContext';

type IpoStatus = {
  listed?: boolean;
  listing?: {
    status: string;
    market_price: number;
    ipo_price: number;
    listed_at?: string;
    founder_lots: number;
    public_lots: number;
    total_lots: number;
  };
  application?: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    proposed_price: number;
    proposed_founder_ratio: number;
    created_at: string;
    estimated_date?: string | null;
    rejection_reason?: string | null;
  };
};

const FOUNDER_RATIO_MIN = 0.51;
const FOUNDER_RATIO_MAX = 0.80;
const TOTAL_LOTS = 1_000_000;

export default function IpoApplySection() {
  const t = useT();
  const [status, setStatus] = useState<IpoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [price, setPrice] = useState('');
  const [founderRatio, setFounderRatio] = useState('0.60');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithCreds(apiUrl('/api/member/ipo-status'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const founderRatioNum = parseFloat(founderRatio) || 0.6;
  const founderLots = Math.round(TOTAL_LOTS * founderRatioNum);
  const publicLots = TOTAL_LOTS - founderLots;
  const priceNum = parseFloat(price) || 0;
  const marketCap = priceNum * publicLots;

  const handleSubmit = async () => {
    if (!priceNum || priceNum <= 0) { setSubmitError(t('ipo_error_valid_price')); return; }
    if (founderRatioNum < FOUNDER_RATIO_MIN || founderRatioNum > FOUNDER_RATIO_MAX) {
      setSubmitError(t('ipo_error_ratio_range'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      const body: Record<string, unknown> = {
        proposed_price: priceNum,
        proposed_founder_ratio: founderRatioNum,
      };
      if (estimatedDate) body.estimated_date = estimatedDate;

      const res = await fetchWithCreds(apiUrl('/api/member/ipo-apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        const msgs: Record<string, string> = {
          forbidden: t('ipo_error_forbidden'),
          invalid_price: t('ipo_error_invalid_price'),
          invalid_founder_ratio: t('ipo_error_invalid_ratio'),
          already_applied: t('ipo_error_already_applied'),
          already_listed: t('ipo_error_already_listed'),
          global_freeze: t('ipo_error_freeze'),
        };
        setSubmitError(msgs[json.error] ?? json.error ?? t('ipo_error_submission'));
      } else {
        setSubmitSuccess(t('ipo_success_submitted'));
        void load();
      }
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // Min date: today + 3 days
  const minDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">{t('ipo_title')}</h2>
        <p className="text-sm text-white/40 mt-0.5">{t('ipo_subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <LuLoader className="h-6 w-6 animate-spin text-white/30" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <LuTriangleAlert className="h-4 w-4 shrink-0" />{error}
        </div>
      ) : status?.listed ? (
        /* Already listed */
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <LuCheck className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{t('ipo_already_listed')}</p>
              <p className="text-xs opacity-70">{t('ipo_already_listed_desc')}</p>
            </div>
          </div>
          {status.listing && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label={t('ipo_status_label')} value={status.listing.status} />
              <StatBox label={t('ipo_market_price_label')} value={`${status.listing.market_price.toFixed(2)} MRI`} />
              <StatBox label={t('ipo_ipo_price_label')} value={`${status.listing.ipo_price.toFixed(2)} MRI`} />
              <StatBox label={t('ipo_public_lots_label')} value={status.listing.public_lots.toLocaleString()} />
            </div>
          )}
        </div>
      ) : status?.application ? (
        /* Pending/rejected application */
        <ApplicationStatusCard app={status.application} onReapply={() => { setStatus(null); void load(); }} />
      ) : (
        /* Application form */
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-5">
            <h3 className="text-sm font-semibold text-white">{t('ipo_application_title')}</h3>

            {/* Price */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                {t('ipo_price_label')}
              </label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('ipo_price_placeholder')}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
              />
            </div>

            {/* Founder ratio */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-white/50">
                {t('ipo_founder_ratio_label')}
                <span className="text-white/25">{t('ipo_founder_ratio_hint')}</span>
              </label>
              <input
                type="range"
                min={0.51}
                max={0.80}
                step={0.01}
                value={founderRatio}
                onChange={(e) => setFounderRatio(e.target.value)}
                className="w-full accent-indigo-500"
              />
              <div className="mt-1 flex justify-between text-xs text-white/35">
                <span>51% {t('ipo_founder_lots').toLowerCase()}</span>
                <span className="text-white font-semibold">{Math.round(founderRatioNum * 100)}% {t('ipo_founder_lots').toLowerCase()}</span>
                <span>80% {t('ipo_founder_lots').toLowerCase()}</span>
              </div>
            </div>

            {/* Estimated date */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                {t('ipo_estimated_date_label')} <span className="text-white/25">{t('ipo_estimated_date_hint')}</span>
              </label>
              <input
                type="date"
                min={minDate}
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/20 [color-scheme:dark]"
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <LuTriangleAlert className="h-3.5 w-3.5 shrink-0" />{submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
                <LuCheck className="h-3.5 w-3.5 shrink-0" />{submitSuccess}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !price}
              className="w-full rounded-xl bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-500/30 disabled:opacity-40"
            >
              {submitting ? <LuLoader className="mx-auto h-4 w-4 animate-spin" /> : t('ipo_submit_button')}
            </button>
          </div>

          {/* Preview / info */}
          <div className="space-y-4">
            {/* Lot distribution preview */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <h3 className="mb-3 text-sm font-semibold text-white">{t('ipo_distribution_preview')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t('ipo_total_lots')}</span>
                  <span className="font-semibold text-white">1,000,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t('ipo_founder_lots')} ({Math.round(founderRatioNum * 100)}%)</span>
                  <span className="font-semibold text-white">{founderLots.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">{t('ipo_public_lots')} ({Math.round((1 - founderRatioNum) * 100)}%)</span>
                  <span className="font-semibold text-white">{publicLots.toLocaleString()}</span>
                </div>
                {priceNum > 0 && (
                  <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                    <span className="text-white/50">{t('ipo_public_market_cap')}</span>
                    <span className="font-semibold text-indigo-400">
                      {marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })} MRI
                    </span>
                  </div>
                )}
              </div>

              {/* Visual bar */}
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10 flex">
                <div className="h-full bg-indigo-500/60" style={{ width: `${founderRatioNum * 100}%` }} />
                <div className="h-full bg-emerald-500/60" style={{ width: `${(1 - founderRatioNum) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex gap-4 text-xs text-white/35">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-indigo-500/60" />{t('ipo_founder_locked')}</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500/60" />{t('ipo_public_label')}</span>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                <LuInfo className="h-4 w-4" /> {t('ipo_how_it_works')}
              </div>
              <ul className="space-y-1.5 text-xs text-white/40 list-disc list-inside">
                <li>{t('ipo_info_1')}</li>
                <li>{t('ipo_info_2')}</li>
                <li>{t('ipo_info_3')}</li>
                <li>{t('ipo_info_4')}</li>
                <li>{t('ipo_info_5')}</li>
                <li>{t('ipo_info_6')}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/30">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function ApplicationStatusCard({
  app,
  onReapply,
}: {
  app: NonNullable<IpoStatus['application']>;
  onReapply: () => void;
}) {
  const t = useT();
  const isPending = app.status === 'pending';
  const isRejected = app.status === 'rejected';
  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        isPending ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
      }`}>
        {isPending ? <LuLoader className="h-4 w-4 mt-0.5 shrink-0 animate-spin" /> : <LuTriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />}
        <div>
          <p className="font-semibold">{isPending ? t('ipo_app_under_review') : t('ipo_app_rejected')}</p>
          <p className="text-xs opacity-70 mt-0.5">
            {isPending ? `${t('ipo_submitted_on')} ${new Date(app.created_at).toLocaleDateString()}` : app.rejection_reason ?? t('ipo_no_reason')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBox label={t('ipo_proposed_price_label')} value={`${app.proposed_price.toFixed(2)} MRI`} />
        <StatBox label={t('ipo_founder_ratio_display')} value={`${Math.round(app.proposed_founder_ratio * 100)}%`} />
        {app.estimated_date && <StatBox label={t('ipo_target_date_label')} value={app.estimated_date} />}
      </div>

      {isRejected && (
        <button
          type="button"
          onClick={onReapply}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          {t('ipo_submit_new')}
        </button>
      )}
    </div>
  );
}
