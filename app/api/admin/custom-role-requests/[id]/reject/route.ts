import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireGuildAdmin } from '@/lib/guildAdmin';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireGuildAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { admin_note?: string };

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data, error } = await supabase
    .from('custom_role_requests')
    .update({
      status: 'rejected',
      reviewed_by: auth.userId,
      admin_note: String(body.admin_note ?? '').trim().slice(0, 500) || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('guild_id', auth.guildId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ request: data });
}
