import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';
import { getMaintenanceFlags } from '@/lib/maintenance';
import { syncBotMaintenanceToBot } from '@/lib/botMaintenanceSync';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID = process.env.DEVELOPER_ROLE_ID ?? '';

async function isDeveloper(userId: string): Promise<boolean> {
  if (!DEV_GUILD_ID || !DEV_ROLE_ID) return false;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;
  try {
    const res = await fetch(`https://discord.com/api/guilds/${DEV_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return false;
    const member = (await res.json()) as { roles?: string[] };
    return Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
  } catch {
    return false;
  }
}

/** Global activity + bot maintenance status for Discord bot / Activity clients. */
export async function GET() {
  const data = await getMaintenanceFlags();
  const activity = Boolean(data?.flags.activity?.is_active);
  const bot = Boolean(data?.flags.bot?.is_active);
  const site = Boolean(data?.flags.site?.is_active);

  return NextResponse.json({
    scope: 'global',
    maintenance: activity || site,
    activity,
    bot,
    site,
    reason:
      data?.flags.activity?.reason ??
      data?.flags.bot?.reason ??
      data?.flags.site?.reason ??
      null,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser(request);
  if (!auth.ok) return auth.response;

  const dev = await isDeveloper(auth.userId);
  if (!dev) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = (await request.json()) as { enabled?: boolean; key?: 'activity' | 'bot' };
  const key = body.key === 'bot' ? 'bot' : 'activity';
  const enabled = Boolean(body.enabled);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: 'db_unavailable' }, { status: 500 });

  const { error } = await supabase.from('global_maintenance_flags').upsert(
    {
      key,
      is_active: enabled,
      reason: null,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (key === 'bot') {
    void syncBotMaintenanceToBot(enabled, null);
  }

  return NextResponse.json({ maintenance: enabled, key, scope: 'global' });
}
