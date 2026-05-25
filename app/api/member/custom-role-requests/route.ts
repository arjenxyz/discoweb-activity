import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { CUSTOM_ROLE_NAME_MAX, hexToDiscordColor } from '@/lib/customRoles/types';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const EMOJI_RE = /^\p{Extended_Pictographic}$/u;

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_guild' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data } = await supabase
    .from('custom_role_requests')
    .select('*')
    .eq('guild_id', guildId)
    .eq('requester_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_guild' }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    role_name?: string;
    role_color?: string;
    role_emoji?: string;
    hoist?: boolean;
    mentionable?: boolean;
    requester_note?: string;
  };

  const roleName = String(body.role_name ?? '').trim();
  if (!roleName || roleName.length > CUSTOM_ROLE_NAME_MAX) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }

  const emoji = String(body.role_emoji ?? '').trim();
  if (emoji && !EMOJI_RE.test(emoji)) {
    return NextResponse.json({ error: 'invalid_emoji' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { count } = await supabase
    .from('custom_role_requests')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', guildId)
    .eq('requester_id', session.userId)
    .eq('status', 'pending');

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'pending_limit' }, { status: 429 });
  }

  const displayName = emoji ? `${emoji} ${roleName}` : roleName;

  const { data, error } = await supabase
    .from('custom_role_requests')
    .insert({
      guild_id: guildId,
      requester_id: session.userId,
      status: 'pending',
      role_name: displayName.slice(0, CUSTOM_ROLE_NAME_MAX),
      role_color: hexToDiscordColor(String(body.role_color ?? '#5865F2')),
      role_emoji: emoji || null,
      hoist: Boolean(body.hoist),
      mentionable: Boolean(body.mentionable),
      requester_note: String(body.requester_note ?? '').trim().slice(0, 500) || null,
      source: 'user_request',
    })
    .select('*')
    .single();

  if (error) {
    console.error('[custom-role-requests] insert', error);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
