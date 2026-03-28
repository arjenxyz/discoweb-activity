import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return createClient(url, key, { auth: { persistSession: false } });
};

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID  = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID   = process.env.DEVELOPER_ROLE_ID ?? '';

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
  } catch { return false; }
}

// GET /api/admin/reports?type=all|bug|suggestion&status=open|closed&limit=50&offset=0
export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type    = searchParams.get('type')   ?? 'all';
  const status  = searchParams.get('status') ?? 'open';
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset  = parseInt(searchParams.get('offset') ?? '0', 10);

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type !== 'all') query = query.eq('type', type);
  if (status !== 'all') query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ reports: data ?? [], total: count ?? 0 });
}

// PATCH /api/admin/reports — update status
export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json() as { id?: string; status?: string; note?: string };
  const { id, status, note } = body;
  if (!id || !status) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  const VALID_STATUSES = ['open', 'reviewing', 'need_info', 'critical', 'fixed_pending', 'resolved', 'not_found', 'duplicate', 'invalid', 'planned_next', 'long_term', 'closed'];
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('bug_reports')
    .update({
      status,
      ...(note ? { dev_note: note } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}
