'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import fetchWithCreds from '@/lib/fetchWithCreds';
import type { OverviewStatsExpanded } from '../types';
import { useT } from '@/contexts/LocaleContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function EarningsModal({ open, onClose }: Props) {
  const t = useT();
  const [data, setData] = useState<OverviewStatsExpanded | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [papel, setPapel] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, walletRes] = await Promise.all([
        fetchWithCreds('/api/member/overview', { cache: 'no-store' }),
        fetchWithCreds('/api/member/wallet', { cache: 'no-store' }),
      ]);
      if (overviewRes.ok) {
        const json = (await overviewRes.json()) as OverviewStatsExpanded;
        setData(json);
      } else {
        setError(t('earnings_fetch_error'));
      }
      if (walletRes.ok) {
        const w = (await walletRes.json()) as { balance: number };
        setPapel(Number(w.balance ?? 0));
      }
    } catch {
      setError(t('earnings_connection_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtDate = (s: string | null | undefined) =>
    s ? new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const baseMsg = 1; // her mesaj için temel kazanç (platform sabit)
  const baseVoice = 1; // her dakika için temel kazanç
  const tagMsg = data?.tagBonusMessage ?? 0;
  const tagVoice = data?.tagBonusVoice ?? 0;
  const boostMsg = data?.boosterBonusMessage ?? 0;
  const boostVoice = data?.boosterBonusVoice ?? 0;

  const effectiveMsg = baseMsg + (data?.hasTag ? tagMsg : 0) + (data?.isBooster ? boostMsg : 0);
  const effectiveVoice = baseVoice + (data?.hasTag ? tagVoice : 0) + (data?.isBooster ? boostVoice : 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#13151a] border border-white/10 shadow-2xl custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[#13151a]/95 backdrop-blur-sm px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">{t('earnings_modal_title')}</p>
            <p className="text-lg font-black text-white mt-0.5">{t('earnings_modal_subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {loading && (
            <p className="text-center text-sm text-white/50 py-8">{t('loading')}</p>
          )}
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
          )}

          {!loading && data && (
            <>
              {/* Güncel Bakiye */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
                <Image src="/papel.gif" alt="papel" width={40} height={40} className="h-10 w-10" />
                <div>
                  <p className="text-xs text-white/50">{t('earnings_balance_label')}</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {papel !== null ? fmt(papel) : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchData}
                  className="ml-auto text-xs text-white/40 hover:text-white transition"
                  title={t('earnings_refresh_title')}
                >
                  ↻
                </button>
              </div>

              {/* Kazanç Oranları */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-3">{t('earnings_rates_title')}</p>
                <div className="space-y-2">
                  <RateRow
                    label={t('earnings_rate_per_message')}
                    base={baseMsg}
                    tag={data.hasTag ? tagMsg : null}
                    boost={data.isBooster ? boostMsg : null}
                    effective={effectiveMsg}
                  />
                  <RateRow
                    label={t('earnings_rate_per_voice')}
                    base={baseVoice}
                    tag={data.hasTag ? tagVoice : null}
                    boost={data.isBooster ? boostVoice : null}
                    effective={effectiveVoice}
                  />
                </div>

                {/* Durum rozetleri */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    active={Boolean(data.hasTag)}
                    activeLabel={t('earnings_tag_active')}
                    inactiveLabel={t('earnings_tag_inactive')}
                    color="indigo"
                  />
                  <Badge
                    active={Boolean(data.isBooster)}
                    activeLabel={`${t('earnings_booster_active')}${data.boosterSince ? ' · ' + fmtDate(data.boosterSince) : ''}`}
                    inactiveLabel={t('earnings_booster_inactive')}
                    color="pink"
                  />
                </div>
              </div>

              {/* Bugünkü & Toplam İstatistikler */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-3">{t('earnings_stats_title')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label={t('earnings_stat_messages_24h')} value={data.messagesLast24h ?? 0} />
                  <StatCard label={t('earnings_stat_voice_24h')} value={data.voiceMinutesLast24h ?? 0} />
                  <StatCard label={t('earnings_stat_total_messages')} value={data.userMessages ?? 0} />
                  <StatCard label={t('earnings_stat_total_voice')} value={data.userVoiceMinutes ?? 0} />
                </div>

                {data.totalsSinceVerified && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#0b0d12]/60 p-3">
                    <p className="text-xs text-white/40 mb-1">
                      {t('earnings_since_verified')}{data.verifiedSince ? ` (${fmtDate(data.verifiedSince)})` : ''}
                    </p>
                    <p className="text-sm text-white/70">
                      <span className="font-semibold text-white">{fmt(data.totalsSinceVerified.messages)}</span> {t('earnings_messages_suffix')} ·{' '}
                      <span className="font-semibold text-white">{fmt(data.totalsSinceVerified.voice_minutes)}</span> {t('earnings_voice_suffix')}
                    </p>
                  </div>
                )}
              </div>

              {/* Aktif Yetkiler */}
              {data.activePerks && data.activePerks.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-3">{t('earnings_perks_title')}</p>
                  <div className="space-y-2">
                    {data.activePerks.map((perk, i) => (
                      <div key={perk.role_id + i} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0b0d12]/60 px-3 py-2">
                        <p className="text-sm text-white">{perk.title ?? t('earnings_perk_default_title')}</p>
                        <p className="text-xs text-white/40">
                          {perk.expires_at ? t('earnings_perk_until', { date: fmtDate(perk.expires_at) }) : t('earnings_perk_permanent')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RateRow({
  label,
  base,
  tag,
  boost,
  effective,
}: {
  label: string;
  base: number;
  tag: number | null;
  boost: number | null;
  effective: number;
}) {
  const t = useT();
  
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-white/70">{label}</p>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-white/50">{base}</span>
        {tag !== null && tag > 0 && (
          <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.5 text-indigo-300">+{tag} {t('earnings_rate_tag')}</span>
        )}
        {boost !== null && boost > 0 && (
          <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-pink-300">+{boost} {t('earnings_rate_boost')}</span>
        )}
        <span className="font-bold text-emerald-400">{effective} {t('earnings_rate_currency')}</span>
      </div>
    </div>
  );
}

function Badge({
  active,
  activeLabel,
  inactiveLabel,
  color,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  color: 'indigo' | 'pink';
}) {
  const colors = {
    indigo: active
      ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
      : 'border-white/10 bg-white/5 text-white/30',
    pink: active
      ? 'border-pink-500/30 bg-pink-500/15 text-pink-300'
      : 'border-white/10 bg-white/5 text-white/30',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${colors[color]}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const fmt = (n: number) => n.toLocaleString('tr-TR');
  return (
    <div className="rounded-xl border border-white/5 bg-[#0b0d12]/60 p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{fmt(value)}</p>
    </div>
  );
}
