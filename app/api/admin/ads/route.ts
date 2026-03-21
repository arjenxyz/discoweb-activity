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

// GET — aktif reklamı getir
export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  const { data } = await supabase.from('ads').select('*').order('created_at', { ascending: false }).limit(10);
  return NextResponse.json({ ads: data ?? [] });
}

// POST — yeni reklam ekle (eskiyi deaktif et)
export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json() as {
    invite_url: string;
    server_name: string;
    server_description?: string;
    server_icon?: string;
    member_count?: number;
    online_count?: number;
  };

  if (!body.invite_url || !body.server_name) {
    return NextResponse.json({ error: 'invite_url ve server_name zorunlu' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  // Mevcut aktif reklamı kapat
  await supabase.from('ads').update({ active: false }).eq('active', true);

  const { data, error } = await supabase.from('ads').insert({
    invite_url: body.invite_url,
    server_name: body.server_name,
    server_description: body.server_description ?? null,
    server_icon: body.server_icon ?? null,
    member_count: body.member_count ?? null,
    online_count: body.online_count ?? null,
    active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ad: data });
}

// DELETE — aktif reklamı kaldır
export async function DELETE(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'server_error' }, { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    await supabase.from('ads').delete().eq('id', id);
  } else {
    await supabase.from('ads').update({ active: false }).eq('active', true);
  }

  return NextResponse.json({ ok: true });
}
