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

type LogItem = {
  id: string;
  type: string;
  title: string;
  created_at: string;
  severity?: string | null;
  data?: Record<string, unknown> | null;
};

async function getOverview(supabase: ReturnType<typeof getSupabase>) {
  if (!supabase) return null;

  const [{ count: userCount }, { count: serverCount }, { count: profileCount }] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('servers').select('id', { count: 'exact', head: true }),
    supabase.from('member_profiles').select('id', { count: 'exact', head: true }),
  ]);

  return {
    userCount: userCount ?? 0,
    serverCount: serverCount ?? 0,
    profileCount: profileCount ?? 0,
    economyAutoApprove: (autoConfig?.value ?? 'false') === 'true',
  };
}

async function getLogs(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (!supabase) return [] as LogItem[];

  const [authLogs, newUsers, newServers, bugReports, errorLogs, clientErrors] = await Promise.all([
    supabase
      .from('admin_actions')
      .select('id, action_type, created_at, payload_after, payload_before')
      .in('action_type', ['auth_login', 'auth_logout'])
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('users')
      .select('discord_id, username, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('servers')
      .select('discord_id, name, is_setup, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('bug_reports')
      .select('id, type, section, description, user_id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('error_logs')
      .select('id, code, title, severity, category, context, status, file_path, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('client_error_log')
      .select('id, error_key, message, type, last_seen, total_hits, unique_ips, critical_alerted')
      .order('last_seen', { ascending: false })
      .limit(limit),
  ]);

  const logs: LogItem[] = [];

  for (const row of authLogs.data ?? []) {
    logs.push({
      id: `auth_${row.id}`,
      type: row.action_type,
      title: row.action_type === 'auth_login' ? 'Auth Login' : 'Auth Logout',
      created_at: row.created_at,
      data: {
        after: row.payload_after,
        before: row.payload_before,
      },
    });
  }

  for (const row of newUsers.data ?? []) {
    logs.push({
      id: `user_${row.discord_id}`,
      type: 'new_user',
      title: `Yeni Kullanıcı: ${row.username}`,
      created_at: row.created_at,
      data: { user_id: row.discord_id, username: row.username },
    });
  }

  for (const row of newServers.data ?? []) {
    logs.push({
      id: `server_${row.discord_id}`,
      type: 'new_server',
      title: `Yeni Sunucu: ${row.name}`,
      created_at: row.created_at,
      data: { guild_id: row.discord_id, name: row.name, is_setup: row.is_setup },
    });
  }

  for (const row of bugReports.data ?? []) {
    logs.push({
      id: `bug_${row.id}`,
      type: row.type === 'suggestion' ? 'suggestion' : 'bug',
      title: row.type === 'suggestion' ? 'Öneri' : 'Hata Bildirimi',
      created_at: row.created_at,
      data: {
        section: row.section,
        description: row.description,
        user_id: row.user_id,
        status: row.status,
      },
    });
  }

  for (const row of errorLogs.data ?? []) {
    logs.push({
      id: `err_${row.id}`,
      type: 'error_log',
      title: row.title,
      created_at: row.created_at,
      severity: row.severity,
      data: { 
        code: row.code, 
        category: row.category, 
        context: row.context,
        status: row.status,
        file_path: row.file_path 
      },
    });
  }

  for (const row of clientErrors.data ?? []) {
    logs.push({
      id: `client_${row.id}`,
      type: 'client_error',
      title: row.message,
      created_at: row.last_seen,
      severity: row.critical_alerted ? 'critical' : 'info',
      data: { error_key: row.error_key, type: row.type, total_hits: row.total_hits, unique_ips: row.unique_ips },
    });
  }

  logs.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  return logs.slice(0, limit);
}

async function getApplications(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (!supabase) return { economy: [], autoApprove: false };

  const [{ data: economy }, { data: configs }] = await Promise.all([
    supabase
      .from('economy_applications')
      .select('id, guild_id, status, application_type, vote_count, vote_threshold, submitted_at, reviewed_at, rejection_reason, scheduled_open_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['economy_auto_approve', 'economy_vote_threshold', 'economy_direct_member_threshold', 'economy_auto_approve_days']),
  ]);

  const configMap = new Map((configs ?? []).map((c: { key: string; value: string }) => [c.key, c.value]));

  const guildIds = Array.from(new Set([
    ...(economy ?? []).map((i) => i.guild_id),
  ])).filter(Boolean);

  const { data: servers } = guildIds.length
    ? await supabase
      .from('servers')
      .select('discord_id, name, member_count, is_setup')
      .in('discord_id', guildIds)
    : { data: [] as Array<{ discord_id: string; name: string; member_count: number | null; is_setup: boolean }> };

  const serverMap = new Map((servers ?? []).map((s) => [s.discord_id, s]));
  const autoApprove = (configMap.get('economy_auto_approve') ?? 'false') === 'true';
  const voteThresholdGlobal = parseInt(configMap.get('economy_vote_threshold') ?? '120', 10);
  const directMemberThreshold = parseInt(configMap.get('economy_direct_member_threshold') ?? '500', 10);
  const autoApproveDays = parseInt(configMap.get('economy_auto_approve_days') ?? '7', 10);

  const enrichedEconomy = (economy ?? []).map((app) => {
    const server = serverMap.get(app.guild_id);
    const memberCount = server?.member_count ?? 0;
    const isSetup = server?.is_setup ?? false;
    const voteThreshold = app.vote_threshold ?? voteThresholdGlobal;
    const voteOk = (app.vote_count ?? 0) >= voteThreshold;
    const memberOk = memberCount >= directMemberThreshold;
    const eligible = isSetup && (memberOk || voteOk);
    return {
      ...app,
      server,
      criteria: {
        memberCount,
        isSetup,
        voteCount: app.vote_count ?? 0,
        voteThreshold,
        memberOk,
        voteOk,
        eligible,
      },
      autoApprove,
    };
  });

  return {
    economy: enrichedEconomy,
    autoApprove,
    thresholds: {
      voteThreshold: voteThresholdGlobal,
      directMemberThreshold,
      autoApproveDays,
    },
  };
}

async function getServers(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (!supabase) return [] as Array<Record<string, unknown>>;

  const { data } = await supabase
    .from('servers')
    .select('discord_id, name, is_setup, member_count, created_at, admin_role_id, verify_role_id, market_hours_enabled, market_open_time, market_close_time, market_timezone')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

async function getProfiles(supabase: ReturnType<typeof getSupabase>, limit: number) {
  if (!supabase) return [] as Array<Record<string, unknown>>;

  const { data: profiles } = await supabase
    .from('member_profiles')
    .select('id, guild_id, user_id, about, created_at, updated_at, has_tag, is_booster, booster_since, referral_code, referred_by, total_invites')
    .order('created_at', { ascending: false })
    .limit(limit);

  const userIds = Array.from(new Set((profiles ?? []).map((p) => p.user_id)));
  const { data: users } = userIds.length
    ? await supabase
      .from('users')
      .select('discord_id, username, avatar, created_at')
      .in('discord_id', userIds)
    : { data: [] as Array<{ discord_id: string; username: string; avatar: string | null; created_at: string }> };

  const userMap = new Map((users ?? []).map((u) => [u.discord_id, u]));
  return (profiles ?? []).map((p) => ({
    ...p,
    user: userMap.get(p.user_id) ?? null,
  }));
}

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const section = url.searchParams.get('section') ?? 'overview';
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') ?? 50)));

  if (section === 'logs') {
    const logs = await getLogs(supabase, limit);
    return NextResponse.json({ logs });
  }

  if (section === 'apps') {
    const apps = await getApplications(supabase, limit);
    return NextResponse.json(apps);
  }

  if (section === 'servers') {
    const servers = await getServers(supabase, limit);
    return NextResponse.json({ servers });
  }

  if (section === 'profiles') {
    const profiles = await getProfiles(supabase, limit);
    return NextResponse.json({ profiles });
  }

  const overview = await getOverview(supabase);
  return NextResponse.json({ overview });
}

export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = await request.json() as {
    action?: 'set_auto_approve' | 'set_config' | 'approve' | 'reject';
    value?: boolean;
    configKey?: string;
    configValue?: string | number;
    table?: 'economy_applications';
    id?: string;
    reason?: string;
  };

  if (body.action === 'set_auto_approve') {
    const value = body.value ? 'true' : 'false';
    await supabase.from('app_config').upsert({ key: 'economy_auto_approve', value }, { onConflict: 'key' });
    return NextResponse.json({ ok: true, economyAutoApprove: value === 'true' });
  }

  if (body.action === 'set_config' && body.configKey) {
    const ALLOWED_KEYS = ['economy_vote_threshold', 'economy_direct_member_threshold', 'economy_auto_approve_days'];
    if (!ALLOWED_KEYS.includes(body.configKey)) {
      return NextResponse.json({ error: 'invalid_config_key' }, { status: 400 });
    }
    const val = String(body.configValue ?? '');
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 1) return NextResponse.json({ error: 'invalid_value' }, { status: 400 });
    await supabase.from('app_config').upsert({ key: body.configKey, value: String(num) }, { onConflict: 'key' });
    return NextResponse.json({ ok: true, key: body.configKey, value: num });
  }

  if ((body.action === 'approve' || body.action === 'reject') && body.id && body.table) {
    const table = body.table;
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = body.action === 'approve'
      ? { status: 'approved', reviewed_at: now, reviewed_by: session.userId }
      : { status: 'rejected', reviewed_at: now, reviewed_by: session.userId, rejection_reason: body.reason ?? 'Belirtilmedi' };

    const { data: app } = await supabase
      .from(table)
      .update(updates)
      .eq('id', body.id)
      .select('guild_id')
      .single();

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
