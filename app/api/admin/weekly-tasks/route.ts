import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

async function isDeveloper(userId: string): Promise<boolean> {
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) return false;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const member = await res.json() as { roles?: string[] };
    return Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
  } catch {
    return false;
  }
}

const getCurrentWeekStart = () => {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = (day + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return utc.toISOString().slice(0, 10);
};

const hasWeeklyTasksTargetGuildId = async (supabase: ReturnType<typeof getSupabase>) => {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'weekly_tasks')
    .eq('column_name', 'requirement_target_guild_id')
    .limit(1);
  return !error && Array.isArray(data) && data.length > 0;
};

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');
  const weekStart = getCurrentWeekStart();
  const supportsTargetGuildId = await hasWeeklyTasksTargetGuildId(supabase);
  const selectCols = ['id', 'guild_id', 'week_start', 'title', 'description', 'requirement_type', 'requirement_value', 'requirement_role_id', 'reward_mari', 'sort_order', 'active']
    .concat(supportsTargetGuildId ? ['requirement_target_guild_id'] : [])
    .join(',');

  const query = supabase
    .from('weekly_tasks')
    .select(selectCols)
    .eq('week_start', weekStart)
    .order('sort_order', { ascending: true });

  if (guildId) query.eq('guild_id', guildId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = data ?? [];
  const guildIds = Array.from(new Set(tasks.map((task) => task.guild_id).filter(Boolean)));
  const serverMap = new Map<string, string>();

  if (guildIds.length > 0) {
    const { data: servers } = await supabase
      .from('servers')
      .select('discord_id,name')
      .in('discord_id', guildIds);

    servers?.forEach((server) => {
      if (server && server.discord_id) serverMap.set(server.discord_id, server.name || '');
    });
  }

  const responseTasks = tasks.map((task) => ({
    ...task,
    guild_name: serverMap.get(task.guild_id) ?? null,
  }));

  return NextResponse.json({ weekStart, tasks: responseTasks });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json() as {
    guild_id: string;
    title: string;
    description?: string;
    requirement_type: string;
    requirement_value?: number | null;
    requirement_role_id?: string | null;
    requirement_target_guild_id?: string | null;
    reward_mari: number;
    sort_order?: number;
    active?: boolean;
  };

  if (!body.guild_id || !body.title || !body.requirement_type || typeof body.reward_mari !== 'number') {
    return NextResponse.json({ error: 'guild_id, title, requirement_type ve reward_mari zorunlu' }, { status: 400 });
  }

  if (body.requirement_type === 'role' && !body.requirement_role_id) {
    return NextResponse.json({ error: 'requirement_role_id role görevleri için zorunlu' }, { status: 400 });
  }

  if (body.requirement_type === 'join_guild' && !body.requirement_target_guild_id) {
    return NextResponse.json({ error: 'requirement_target_guild_id join_guild görevleri için zorunlu' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  const supportsTargetGuildId = await hasWeeklyTasksTargetGuildId(supabase);
  if (body.requirement_type === 'join_guild' && !supportsTargetGuildId) {
    return NextResponse.json({
      error: 'missing_column',
      message: 'Database missing weekly_tasks.requirement_target_guild_id. Apply migration supabase/migrations/20260514000002_weekly_tasks_join_rewards.sql',
    }, { status: 500 });
  }

  const weekStart = getCurrentWeekStart();
  const insertPayload: Record<string, unknown> = {
    guild_id: body.guild_id,
    week_start: weekStart,
    title: body.title,
    description: body.description ?? null,
    requirement_type: body.requirement_type,
    requirement_value: body.requirement_value ?? null,
    requirement_role_id: body.requirement_role_id ?? null,
    reward_mari: body.reward_mari,
    sort_order: body.sort_order ?? 0,
    active: body.active ?? true,
  };

  if (supportsTargetGuildId) {
    insertPayload.requirement_target_guild_id = body.requirement_target_guild_id ?? null;
  }

  const { data, error } = await supabase.from('weekly_tasks').insert(insertPayload).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
