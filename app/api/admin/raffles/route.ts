import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { isGuildAdmin } from '@/lib/adminAuth';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'missing_guild' }, { status: 400 });

  if (!(await isGuildAdmin(session.userId, guildId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('guild_id', guildId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'missing_guild' }, { status: 400 });

  if (!(await isGuildAdmin(session.userId, guildId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const payload = (await request.json()) as {
    title?: string;
    description?: string | null;
    prizes?: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    min_tag_days?: number;
    is_active?: boolean;
    winner_count?: number;
    prize_type?: 'papel' | 'role' | 'custom';
    prize_papel_amount?: number | null;
    prize_role_id?: string | null;
  };

  if (!payload.title?.trim()) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Başlık zorunludur' }, { status: 400 });
  }
  if (payload.start_date && payload.end_date && new Date(payload.end_date) <= new Date(payload.start_date)) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 });
  }

  const { error } = await supabase.from('raffles').insert({
    guild_id: guildId,
    title: payload.title.trim(),
    description: payload.description ?? null,
    prizes: payload.prizes ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    min_tag_days: payload.min_tag_days ?? 1,
    is_active: payload.is_active ?? true,
    winner_count: payload.winner_count ?? 1,
    prize_type: payload.prize_type ?? 'custom',
    prize_papel_amount: payload.prize_papel_amount ?? null,
    prize_role_id: payload.prize_role_id ?? null,
  });

  if (error) return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok' });
}

export async function PUT(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'missing_guild' }, { status: 400 });

  if (!(await isGuildAdmin(session.userId, guildId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const payload = (await request.json()) as {
    id?: string;
    title?: string;
    description?: string | null;
    prizes?: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    min_tag_days?: number;
    is_active?: boolean;
    winner_count?: number;
    prize_type?: 'papel' | 'role' | 'custom';
    prize_papel_amount?: number | null;
    prize_role_id?: string | null;
  };

  if (!payload.id) return NextResponse.json({ error: 'invalid_payload', message: 'id zorunludur' }, { status: 400 });
  if (payload.start_date && payload.end_date && new Date(payload.end_date) <= new Date(payload.start_date)) {
    return NextResponse.json({ error: 'invalid_payload', message: 'Bitiş tarihi başlangıçtan sonra olmalı' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (payload.title !== undefined) update.title = payload.title.trim();
  if (payload.description !== undefined) update.description = payload.description;
  if (payload.prizes !== undefined) update.prizes = payload.prizes;
  if (payload.start_date !== undefined) update.start_date = payload.start_date;
  if (payload.end_date !== undefined) update.end_date = payload.end_date;
  if (payload.min_tag_days !== undefined) update.min_tag_days = payload.min_tag_days;
  if (payload.is_active !== undefined) update.is_active = payload.is_active;
  if (payload.winner_count !== undefined) update.winner_count = payload.winner_count;
  if (payload.prize_type !== undefined) update.prize_type = payload.prize_type;
  if (payload.prize_papel_amount !== undefined) update.prize_papel_amount = payload.prize_papel_amount;
  if (payload.prize_role_id !== undefined) update.prize_role_id = payload.prize_role_id;

  const { error } = await supabase.from('raffles').update(update).eq('id', payload.id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok' });
}

export async function DELETE(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'missing_guild' }, { status: 400 });

  if (!(await isGuildAdmin(session.userId, guildId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { id } = (await request.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const { error } = await supabase.from('raffles').delete().eq('id', id).eq('guild_id', guildId);
  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  return NextResponse.json({ status: 'ok' });
}
