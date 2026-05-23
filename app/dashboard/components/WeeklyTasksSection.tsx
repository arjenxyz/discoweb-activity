'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCircleCheck, LuClock, LuGift, LuListChecks, LuLock, LuSparkles, LuTarget, LuTrendingUp } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { useT } from '@/contexts/LocaleContext';

export type WeeklyTaskItem = {
  id: string;
  title: string;
  description: string | null;
  requirementType: 'join_guild' | 'message_count' | 'voice_minutes' | 'role' | 'event_participation';
  requirementValue: number | null;
  requirementRoleId?: string | null;
  requirementTargetGuildId?: string | null;
  rewardMari: number;
  status: 'locked' | 'in_progress' | 'claimable' | 'claimed';
  progress?: number | null;
  required?: number | null;
};

type WeeklyTasksResponse = {
  weekStart: string;
  weekEnd: string;
  tasks: WeeklyTaskItem[];
};

type WeeklyTasksSectionProps = {
  initialTasks?: WeeklyTasksResponse | null;
};

type TaskFilter = 'all' | WeeklyTaskItem['status'];

const formatRange = (start: string, end: string, locale?: string) => {
  try {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const fmt = new Intl.DateTimeFormat(locale ?? undefined, { month: 'short', day: 'numeric' });
    return `${fmt.format(startDate)} - ${fmt.format(endDate)}`;
  } catch {
    return `${start} - ${end}`;
  }
};

const statusBadge = (status: WeeklyTaskItem['status'], t: (key: string, vars?: Record<string, string>) => string) => {
  switch (status) {
    case 'claimable':
      return { label: t('tasks_status_claimable'), icon: LuSparkles, className: 'bg-emerald-500/15 text-emerald-100 border-emerald-500/30' };
    case 'claimed':
      return { label: t('tasks_status_claimed'), icon: LuCircleCheck, className: 'bg-sky-500/15 text-sky-100 border-sky-500/30' };
    case 'locked':
      return { label: t('tasks_status_locked'), icon: LuLock, className: 'bg-white/5 text-white/45 border-white/10' };
    default:
      return { label: t('tasks_status_progress'), icon: LuClock, className: 'bg-amber-500/15 text-amber-100 border-amber-500/30' };
  }
};

const getRequirementLabel = (task: WeeklyTaskItem, t: (key: string, vars?: Record<string, string>) => string) => {
  if (task.requirementType === 'join_guild') return t('tasks_requirement_join');
  if (task.requirementType === 'role') return t('tasks_requirement_role');
  if (task.requirementType === 'message_count') return t('tasks_requirement_messages', { count: String(task.requirementValue ?? 0) });
  if (task.requirementType === 'voice_minutes') return t('tasks_requirement_voice', { count: String(task.requirementValue ?? 0) });
  if (task.requirementType === 'event_participation') return t('tasks_requirement_event', { count: String(task.requirementValue ?? 0) });
  return t('tasks_requirement_unknown');
};

const getWeeklyTaskError = (code: string | undefined, detail: string | undefined, t: (key: string, vars?: Record<string, string>) => string) => {
  switch (code) {
    case 'no_guild_selected':
      return t('tasks_error_no_guild_selected');
    case 'missing_service_role':
      return t('tasks_error_missing_service_role');
    case 'maintenance':
      return t('tasks_error_maintenance', { reason: detail ?? '' });
    case 'task_not_found':
      return t('tasks_error_task_not_found');
    case 'already_claimed':
      return t('tasks_error_already_claimed');
    case 'task_not_configured':
      return t('tasks_error_task_not_configured');
    case 'task_not_available':
      return t('tasks_error_task_not_available');
    case 'task_not_complete':
      return t('tasks_error_task_not_complete');
    case 'invalid_reward':
      return t('tasks_error_invalid_reward');
    case 'invalid_payload':
      return t('tasks_error_invalid_payload');
    case 'claim_failed':
      return t('tasks_error_claim');
    default:
      return detail ? `${t('tasks_error_load')} (${detail})` : t('tasks_error_load');
  }
};

const statusOrder: Record<WeeklyTaskItem['status'], number> = {
  claimable: 0,
  in_progress: 1,
  locked: 2,
  claimed: 3,
};

export default function WeeklyTasksSection({ initialTasks }: WeeklyTasksSectionProps) {
  const t = useT();
  const [tasksData, setTasksData] = useState<WeeklyTasksResponse | null>(initialTasks ?? null);
  const [loading, setLoading] = useState(!initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithCreds('/api/member/weekly-tasks');
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(getWeeklyTaskError(data.error, data.message, t));
        setTasksData(null);
        return;
      }
      setTasksData(data as WeeklyTasksResponse);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('tasks_error_load'));
      setTasksData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleClaim = useCallback(async (taskId: string) => {
    setClaimingId(taskId);
    setError(null);
    try {
      const response = await fetchWithCreds('/api/member/weekly-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        setError(getWeeklyTaskError(data.error, data.message, t));
        return;
      }
      await loadTasks();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('tasks_error_claim'));
    } finally {
      setClaimingId(null);
    }
  }, [loadTasks, t]);

  useEffect(() => {
    if (!tasksData) {
      void loadTasks();
    }
  }, [tasksData, loadTasks]);

  const weekLabel = useMemo(() => {
    if (!tasksData) return t('tasks_week_label');
    return `${t('tasks_week_label')} · ${formatRange(tasksData.weekStart, tasksData.weekEnd)}`;
  }, [tasksData, t]);

  const sortedTasks = useMemo(() => {
    if (!tasksData?.tasks) return [];
    return [...tasksData.tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [tasksData]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return sortedTasks;
    return sortedTasks.filter((task) => task.status === filter);
  }, [sortedTasks, filter]);

  const taskStats = useMemo(() => {
    const base = { total: 0, claimable: 0, claimed: 0, in_progress: 0, locked: 0, rewardTotal: 0 };
    if (!tasksData?.tasks?.length) return base;
    return tasksData.tasks.reduce(
      (acc, task) => {
        acc.total += 1;
        acc.rewardTotal += Number(task.rewardMari ?? 0);
        acc[task.status] += 1;
        return acc;
      },
      { ...base },
    );
  }, [tasksData]);

  const completionRate = useMemo(() => {
    if (!taskStats.total) return 0;
    return Math.round((taskStats.claimed / taskStats.total) * 100);
  }, [taskStats]);

  const filters: Array<{ id: TaskFilter; label: string; count: number }> = useMemo(
    () => [
      { id: 'all', label: t('tasks_week_label'), count: taskStats.total },
      { id: 'claimable', label: t('tasks_status_claimable'), count: taskStats.claimable },
      { id: 'in_progress', label: t('tasks_status_in_progress'), count: taskStats.in_progress },
      { id: 'claimed', label: t('tasks_status_claimed'), count: taskStats.claimed },
    ],
    [t, taskStats],
  );

  return (
    <section className="space-y-5">
      <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#11182a] via-[#101728] to-[#0b0f1a] p-6 shadow-[0_20px_80px_rgba(3,8,20,0.35)]">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-200/60">{t('tasks_kicker')}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t('tasks_title')}</h2>
              <p className="mt-2 text-sm text-white/60">{t('tasks_subtitle')}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">
                <LuListChecks className="h-3.5 w-3.5 text-indigo-200/80" />
                {weekLabel}
              </p>
            </div>

            <div className="grid min-w-[220px] gap-2">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                <p className="text-[11px] text-emerald-100/75">{t('tasks_status_claimable')}</p>
                <p className="mt-1 text-xl font-bold text-emerald-100">{taskStats.claimable}</p>
              </div>
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
                <p className="text-[11px] text-sky-100/75">{t('tasks_status_claimed')}</p>
                <p className="mt-1 text-xl font-bold text-sky-100">{taskStats.claimed}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] text-white/50">{t('tasks_progress_label')}</p>
              <p className="mt-1 text-lg font-semibold text-white">{completionRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] text-white/50">{t('tasks_week_label')}</p>
              <p className="mt-1 text-lg font-semibold text-white">{taskStats.total}</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3">
              <p className="text-[11px] text-violet-100/75">Toplam Ödül</p>
              <p className="mt-1 text-lg font-semibold text-violet-100">{taskStats.rewardTotal} Mari</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
      </header>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          {t('tasks_loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100/80">
          {error}
        </div>
      )}

      {!loading && !error && tasksData?.tasks?.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          {t('tasks_empty')}
        </div>
      )}

      {!loading && !error && tasksData?.tasks?.length ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  filter === item.id
                    ? 'border-indigo-400/40 bg-indigo-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label} <span className="ml-1 text-white/45">{item.count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTasks.map((task) => {
            const badge = statusBadge(task.status, t);
            const Icon = badge.icon;
            const progressValue = task.progress ?? 0;
            const requiredValue = task.required ?? task.requirementValue ?? 0;
            const progressPct = requiredValue > 0 ? Math.min(100, Math.round((progressValue / requiredValue) * 100)) : 0;

            return (
              <article
                key={task.id}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#101523] to-[#0d121d] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.25)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-[260px] flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
                      {task.status === 'claimable' ? (
                        <LuGift className="h-4.5 w-4.5 text-emerald-300" />
                      ) : task.status === 'claimed' ? (
                        <LuCircleCheck className="h-4.5 w-4.5 text-sky-300" />
                      ) : (
                        <LuTarget className="h-4.5 w-4.5 text-indigo-200/80" />
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">{task.title}</p>
                      {task.description && <p className="mt-1 text-sm text-white/60">{task.description}</p>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {badge.label}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">{getRequirementLabel(task, t)}</span>
                  <span className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-100/85">
                      +{task.rewardMari} Mari
                    </span>
                </div>

                {requiredValue > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-white/50">
                      <span>{t('tasks_progress_label')}</span>
                      <span className="inline-flex items-center gap-1">
                        <LuTrendingUp className="h-3.5 w-3.5" />
                        {progressValue}/{requiredValue}
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 transition-[width] duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs text-white/45">{t('tasks_status_hint')}</p>
                  {task.status === 'claimable' ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(task.id)}
                      disabled={claimingId === task.id}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {claimingId === task.id ? t('tasks_claiming') : t('tasks_claim')}
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-white/40">{t(`tasks_status_${task.status}`)}</span>
                  )}
                </div>
              </article>
            );
          })}
            {filteredTasks.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                {t('tasks_empty')}
              </div>
            )}
          </div>
        </>
      ) : null}

      {!loading && !tasksData && (
        <button
          type="button"
          onClick={loadTasks}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
        >
          {t('tasks_retry')}
        </button>
      )}
    </section>
  );
}
