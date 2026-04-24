import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEVELOPER_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

const isDeveloper = (userId: string) => DEVELOPER_USER_ID && userId === DEVELOPER_USER_ID;

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'all';
  const activeOnly = searchParams.get('active') !== 'false';

  const result: Record<string, unknown> = {};

  if (type === 'all' || type === 'member') {
    let q = supabase
      .from('member_bans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    result.member = data ?? [];
  }

  if (type === 'all' || type === 'server') {
    let q = supabase
      .from('server_bans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (activeOnly) q = q.eq('is_active', true);
    const { data } = await q;
    result.server = data ?? [];
  }

  return NextResponse.json(result);
}

type CreateBanBody = {
  type: 'member' | 'server';
  userId?: string;
  guildId?: string;
  reason?: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = (await request.json()) as CreateBanBody;
  if (!body?.type) return NextResponse.json({ error: 'missing_type' }, { status: 400 });

  if (body.type === 'server') {
    if (!body.guildId) return NextResponse.json({ error: 'missing_guild_id' }, { status: 400 });
    const { data, error } = await supabase
      .from('server_bans')
      .insert({
        guild_id: body.guildId,
        reason: body.reason ?? null,
        is_active: true,
        created_by: session.userId,
        expires_at: body.expiresAt ?? null,
        metadata: body.metadata ?? {},
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: 'insert_failed', details: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ban: data });
  }

  if (!body.userId) return NextResponse.json({ error: 'missing_user_id' }, { status: 400 });
  const { data, error } = await supabase
    .from('member_bans')
    .insert({
      user_id: body.userId,
      guild_id: body.guildId ?? null,
      reason: body.reason ?? null,
      is_active: true,
      created_by: session.userId,
      expires_at: body.expiresAt ?? null,
      metadata: body.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'insert_failed', details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ban: data });
}

type LiftBanBody = {
  type: 'member' | 'server';
  id: string;
};

export async function DELETE(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = (await request.json()) as LiftBanBody;
  if (!body?.type || !body?.id) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const table = body.type === 'server' ? 'server_bans' : 'member_bans';

  const { error } = await supabase
    .from(table)
    .update({
      is_active: false,
      lifted_at: new Date().toISOString(),
      lifted_by: session.userId,
    })
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: 'update_failed', details: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
