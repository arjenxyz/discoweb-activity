import { NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { createClient } from '@supabase/supabase-js';
import { discordFetch } from '@/lib/discordRest';
import { logBotError } from '@/lib/activityLogger';

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const guildId = await getSelectedGuildId(request);
  if (!guildId) {
    return NextResponse.json({ error: 'missing_guild' }, { status: 400 });
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: 'missing_bot_token' }, { status: 500 });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: server } = await supabase
    .from('servers')
    .select('verify_role_id')
    .eq('discord_id', guildId)
    .maybeSingle();

  if (!server?.verify_role_id) {
    return NextResponse.json({ error: 'no_verify_role_configured' }, { status: 404 });
  }

  const res = await discordFetch(
    `https://discord.com/api/guilds/${guildId}/members/${session.userId}/roles/${server.verify_role_id}`,
    { method: 'PUT', headers: { Authorization: `Bot ${botToken}` } },
    { retries: 2 },
  );

  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => '');
    console.error('[verify-role] Discord role assign failed', { status: res.status, body });
    await logBotError({ errorType: 'role_assign_failed', userId: session.userId, guildId, roleId: server.verify_role_id, discordStatus: res.status, detail: body.slice(0, 200) });
    return NextResponse.json({ error: 'role_assign_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
