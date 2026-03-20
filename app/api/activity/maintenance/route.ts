import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServiceClient';
import { requireSessionUser } from '@/lib/auth';

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
    const member = await res.json() as { roles?: string[] };
    return Array.isArray(member.roles) && member.roles.includes(DEV_ROLE_ID);
  } catch {
    return false;
  }
}

// server_id: web projesindeki servers tablosundan DEV_GUILD_ID'ye karşılık gelen id
// Basit çözüm: servers tablosundan discord_id ile çek
async function getServerId(supabase: ReturnType<typeof getSupabaseServiceClient>): Promise<string | null> {
  if (!supabase || !DEV_GUILD_ID) return null;
  const { data } = await supabase
    .from('servers')
    .select('id')
    .eq('discord_id', DEV_GUILD_ID)
    .single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ maintenance: false });

  const serverId = await getServerId(supabase);
  if (!serverId) return NextResponse.json({ maintenance: false });

  const { data } = await supabase
    .from('maintenance_flags')
    .select('is_active')
    .eq('server_id', serverId)
    .eq('key', 'activity')
    .single();

  return NextResponse.json({ maintenance: data?.is_active === true });
}

export async function PATCH(request: Request) {
  const auth = await requireSessionUser(request);
  if (!auth.ok) return auth.response;

  const dev = await isDeveloper(auth.userId);
  if (!dev) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { enabled } = (await request.json()) as { enabled: boolean };

  const supabase = getSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: 'db_unavailable' }, { status: 500 });

  const serverId = await getServerId(supabase);
  if (!serverId) return NextResponse.json({ error: 'server_not_found' }, { status: 500 });

  const { error } = await supabase
    .from('maintenance_flags')
    .upsert({ server_id: serverId, key: 'activity', is_active: enabled, reason: null }, { onConflict: 'server_id,key' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ maintenance: enabled });
}
