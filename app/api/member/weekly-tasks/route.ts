import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkMaintenance } from '@/lib/maintenance';
import { discordFetch } from '@/lib/discordRest';

export const dynamic = 'force-dynamic';

type WeeklyTaskRow = {
  id: string;
  title: string;
  description: string | null;
  requirement_type: 'join_guild' | 'message_count' | 'voice_minutes' | 'role' | 'event_participation';
  requirement_value: number | null;
  requirement_role_id: string | null;
  requirement_target_guild_id?: string | null;
  reward_mari: number;
};

type TaskStatus = 'locked' | 'in_progress' | 'claimable' | 'claimed';

type TaskResponse = {
  id: string;
  title: string;
  description: string | null;
  requirementType: WeeklyTaskRow['requirement_type'];
  requirementValue: number | null;
  requirementRoleId: string | null;
  requirementTargetGuildId: string | null;
  rewardMari: number;
  status: TaskStatus;
  progress: number | null;
  required: number | null;
};

const getWeekStartUTC = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utcDate.setUTCDate(utcDate.getUTCDate() + diff);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
};

const toDateString = (date: Date) => date.toISOString().slice(0, 10);

const getWeekRange = () => {
  const start = getWeekStartUTC(new Date());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
};

const hasWeeklyTasksTargetGuildId = async (supabase: ReturnType<typeof getSupabaseServiceClient>) => {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'weekly_tasks')
    .eq('column_name', 'requirement_target_guild_id')
    .limit(1);

  return !error && Array.isArray(data) && data.length > 0;
};

const isUserInGuild = async (guildId: string, userId: string): Promise<boolean> => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  const response = await discordFetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  return response.ok;
};

const getMemberRoles = async (guildId: string, userId: string): Promise<string[] | null> => {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  const response = await discordFetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { roles?: string[] };
  return data.roles ?? [];
};

const evaluateTask = (task: WeeklyTaskRow, options: {
  hasJoined: boolean;
  joinAllowed: boolean;
  userMessages: number;
  userVoiceMinutes: number;
  memberRoles: string[] | null;
  eventCount: number;
  isClaimed: boolean;
}): TaskResponse => {
  let progress: number | null = null;
  let required: number | null = null;
  let status: TaskStatus = 'in_progress';
  let isComplete = false;

  if (task.requirement_type === 'join_guild') {
    isComplete = options.joinAllowed && options.hasJoined;
  } else if (task.requirement_type === 'role') {
    const roles = options.memberRoles ?? [];
    isComplete = Boolean(task.requirement_role_id && roles.includes(task.requirement_role_id));
  } else if (task.requirement_type === 'message_count') {
    required = Number(task.requirement_value ?? 0);
    progress = options.userMessages;
    isComplete = progress >= required;
  } else if (task.requirement_type === 'voice_minutes') {
    required = Number(task.requirement_value ?? 0);
    progress = options.userVoiceMinutes;
    isComplete = progress >= required;
  } else if (task.requirement_type === 'event_participation') {
    required = Number(task.requirement_value ?? 0);
    progress = options.eventCount;
    isComplete = progress >= required;
  }

  if (options.isClaimed) {
    status = 'claimed';
  } else if (isComplete) {
    status = 'claimable';
  } else if (task.requirement_type === 'join_guild' && !options.hasJoined) {
    status = 'locked';
  } else {
    status = 'in_progress';
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    requirementType: task.requirement_type,
    requirementValue: task.requirement_value,
    requirementRoleId: task.requirement_role_id,
    requirementTargetGuildId: task.requirement_target_guild_id ?? null,
    rewardMari: Number(task.reward_mari ?? 0),
    status,
    progress,
    required,
  };
};

export async function GET(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { start, end } = getWeekRange();
  const weekStart = toDateString(start);
  const weekEnd = toDateString(end);
  const supportsTargetGuildId = await hasWeeklyTasksTargetGuildId(supabase);

  const selectCols = ['id', 'title', 'description', 'requirement_type', 'requirement_value', 'requirement_role_id', 'reward_mari'].join(',')
    + (supportsTargetGuildId ? ',requirement_target_guild_id' : '');

  const { data: tasks } = await supabase
    .from('weekly_tasks')
    .select(selectCols)
    .eq('guild_id', guildId)
    .eq('week_start', weekStart)
    .eq('active', true)
    .order('sort_order', { ascending: true }) as { data: WeeklyTaskRow[] | null };

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ weekStart, weekEnd, tasks: [] });
  }

  const joinTargets = Array.from(new Set(
    tasks
      .filter((task) => task.requirement_type === 'join_guild')
      .map((task) => task.requirement_target_guild_id)
      .filter((id): id is string => Boolean(id)),
  ));

  const [claims, memberStats, eventRows, memberRoles, joinClaimRows, joinEligibleAds] = await Promise.all([
    supabase
      .from('weekly_task_claims')
      .select('task_id')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .eq('week_start', weekStart),
    supabase
      .from('member_daily_stats')
      .select('message_count,voice_minutes')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .gte('stat_date', weekStart)
      .lte('stat_date', weekEnd),
    supabase
      .from('activity_participation')
      .select('id')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .gte('join_at', `${weekStart}T00:00:00.000Z`)
      .lte('join_at', `${weekEnd}T23:59:59.999Z`),
    getMemberRoles(guildId, userId),
    joinTargets.length
      ? supabase
        .from('weekly_task_join_claims')
        .select('target_guild_id')
        .eq('user_id', userId)
        .in('target_guild_id', joinTargets)
      : Promise.resolve({ data: [] as Array<{ target_guild_id: string }> }),
    joinTargets.length
      ? supabase
        .from('ads')
        .select('target_guild_id')
        .eq('active', true)
        .eq('task_enabled', true)
        .in('target_guild_id', joinTargets)
      : Promise.resolve({ data: [] as Array<{ target_guild_id: string | null }> }),
  ]);

  const claimIds = new Set((claims.data ?? []).map((row: { task_id: string }) => row.task_id));
  const messages = (memberStats.data ?? []).reduce((sum: number, row: { message_count: number | null }) => sum + Number(row.message_count ?? 0), 0);
  const voiceMinutes = (memberStats.data ?? []).reduce((sum: number, row: { voice_minutes: number | null }) => sum + Number(row.voice_minutes ?? 0), 0);
  const eventCount = (eventRows.data ?? []).length ?? 0;
  const joinClaimedSet = new Set((joinClaimRows.data ?? []).map((row: { target_guild_id: string }) => row.target_guild_id));
  const joinAllowedSet = new Set((joinEligibleAds.data ?? []).map((row: { target_guild_id: string | null }) => row.target_guild_id).filter(Boolean) as string[]);
  const joinStatusMap = new Map<string, boolean>();

  for (const targetId of joinTargets) {
    if (!joinAllowedSet.has(targetId)) {
      joinStatusMap.set(targetId, false);
      continue;
    }
    // One-by-one to avoid Discord API rate spikes
    // eslint-disable-next-line no-await-in-loop
    const isMember = await isUserInGuild(targetId, userId);
    joinStatusMap.set(targetId, isMember);
  }

  const responseTasks = tasks.map((task) => evaluateTask(task, {
    hasJoined: task.requirement_target_guild_id ? (joinStatusMap.get(task.requirement_target_guild_id) ?? false) : false,
    joinAllowed: task.requirement_target_guild_id ? joinAllowedSet.has(task.requirement_target_guild_id) : false,
    userMessages: messages,
    userVoiceMinutes: voiceMinutes,
    memberRoles,
    eventCount,
    isClaimed: claimIds.has(task.id) || (task.requirement_target_guild_id ? joinClaimedSet.has(task.requirement_target_guild_id) : false),
  }));

  return NextResponse.json({ weekStart, weekEnd, tasks: responseTasks });
}

export async function POST(request: Request) {
  const maintenance = await checkMaintenance(['site']);
  if (maintenance.blocked) {
    return NextResponse.json(
      { error: 'maintenance', key: maintenance.key, reason: maintenance.reason },
      { status: 503 },
    );
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_guild_selected' }, { status: 400 });

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const payload = (await request.json().catch(() => ({}))) as { taskId?: string };
  if (!payload.taskId) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { start, end } = getWeekRange();
  const weekStart = toDateString(start);
  const weekEnd = toDateString(end);

  const supportsTargetGuildId = await hasWeeklyTasksTargetGuildId(supabase);
  const selectCols = ['id', 'title', 'description', 'requirement_type', 'requirement_value', 'requirement_role_id', 'reward_mari', 'active'].join(',')
    + (supportsTargetGuildId ? ',requirement_target_guild_id' : '');

  const { data: task } = await supabase
    .from('weekly_tasks')
    .select(selectCols)
    .eq('id', payload.taskId)
    .eq('guild_id', guildId)
    .eq('week_start', weekStart)
    .maybeSingle() as { data: (WeeklyTaskRow & { active: boolean }) | null };

  if (!task || !task.active) return NextResponse.json({ error: 'task_not_found' }, { status: 404 });

  const { data: existingClaim } = await supabase
    .from('weekly_task_claims')
    .select('id')
    .eq('task_id', task.id)
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existingClaim) return NextResponse.json({ error: 'already_claimed' }, { status: 409 });

  if (task.requirement_type === 'join_guild') {
    if (!task.requirement_target_guild_id) {
      return NextResponse.json({ error: 'task_not_configured' }, { status: 400 });
    }
    const { data: joinEligible } = await supabase
      .from('ads')
      .select('target_guild_id')
      .eq('active', true)
      .eq('task_enabled', true)
      .eq('target_guild_id', task.requirement_target_guild_id)
      .maybeSingle();

    if (!joinEligible?.target_guild_id) {
      return NextResponse.json({ error: 'task_not_available' }, { status: 400 });
    }

    const { data: joinClaim } = await supabase
      .from('weekly_task_join_claims')
      .select('id')
      .eq('user_id', userId)
      .eq('target_guild_id', task.requirement_target_guild_id)
      .maybeSingle();

    if (joinClaim) {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
    }
  }

  const [memberStats, eventRows, memberRoles, hasJoined] = await Promise.all([
    supabase
      .from('member_daily_stats')
      .select('message_count,voice_minutes')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .gte('stat_date', weekStart)
      .lte('stat_date', weekEnd),
    supabase
      .from('activity_participation')
      .select('id')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .gte('join_at', `${weekStart}T00:00:00.000Z`)
      .lte('join_at', `${weekEnd}T23:59:59.999Z`),
    getMemberRoles(guildId, userId),
    task.requirement_target_guild_id
      ? isUserInGuild(task.requirement_target_guild_id, userId)
      : Promise.resolve(false),
  ]);

  const messages = (memberStats.data ?? []).reduce((sum: number, row: { message_count: number | null }) => sum + Number(row.message_count ?? 0), 0);
  const voiceMinutes = (memberStats.data ?? []).reduce((sum: number, row: { voice_minutes: number | null }) => sum + Number(row.voice_minutes ?? 0), 0);
  const eventCount = (eventRows.data ?? []).length ?? 0;

  const evaluated = evaluateTask(task, {
    hasJoined,
    joinAllowed: task.requirement_type !== 'join_guild' || Boolean(task.requirement_target_guild_id),
    userMessages: messages,
    userVoiceMinutes: voiceMinutes,
    memberRoles,
    eventCount,
    isClaimed: false,
  });

  if (evaluated.status !== 'claimable') {
    return NextResponse.json({ error: 'task_not_complete' }, { status: 400 });
  }

  const reward = Number(task.reward_mari ?? 0);
  if (!Number.isFinite(reward) || reward <= 0) {
    return NextResponse.json({ error: 'invalid_reward' }, { status: 400 });
  }

  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('mari_balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle() as { data: { mari_balance?: number } | null };

  const newMariBalance = Number((Number(wallet?.mari_balance ?? 0) + reward).toFixed(6));

  const { error: claimError } = await supabase.from('weekly_task_claims').insert({
    task_id: task.id,
    user_id: userId,
    guild_id: guildId,
    week_start: weekStart,
    reward_mari: reward,
  });
  if (task.requirement_type === 'join_guild' && task.requirement_target_guild_id) {
    await supabase.from('weekly_task_join_claims').insert({
      user_id: userId,
      target_guild_id: task.requirement_target_guild_id,
      task_id: task.id,
      claimed_at: new Date().toISOString(),
    });
  }

  if (claimError) {
    if (claimError.code === '23505') {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 });
    }
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
  }

  await supabase.from('member_wallets').upsert(
    {
      guild_id: guildId,
      user_id: userId,
      mari_balance: newMariBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  await supabase.from('wallet_ledger').insert({
    guild_id: guildId,
    user_id: userId,
    amount: reward,
    type: 'weekly_task_reward',
    balance_after: newMariBalance,
    metadata: {
      task_id: task.id,
      requirement_type: task.requirement_type,
    },
  });

  return NextResponse.json({ ok: true, reward, mari_balance: newMariBalance });
}
