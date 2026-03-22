/**
 * POST /api/admin/market-event — Piyasa olayı oluştur (developer only)
 * GET  /api/admin/market-event — Aktif market event'lerini listele
 * DELETE /api/admin/market-event?id=<uuid> — Event kapat
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { devLog, DevLogEmbeds } from '@/lib/devLog';

export const dynamic = 'force-dynamic';

const DEVELOPER_USER_ID = process.env.DEVELOPER_DISCORD_USER_ID ?? '';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

const isDeveloper = (userId: string) => DEVELOPER_USER_ID && userId === DEVELOPER_USER_ID;

export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const { data: events } = await supabase
    .from('market_events')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return NextResponse.json({ events: events ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = (await request.json()) as {
    guild_id?: string;
    type: string;
    severity?: string;
    title: string;
    description?: string;
    price_impact?: number;
    expires_hours?: number;
  };

  if (!body.type || !body.title) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const expiresAt = body.expires_hours
    ? new Date(Date.now() + body.expires_hours * 3600 * 1000).toISOString()
    : null;

  const { data: event, error } = await supabase
    .from('market_events')
    .insert({
      guild_id: body.guild_id ?? null,
      type: body.type,
      severity: body.severity ?? 'info',
      title: body.title,
      description: body.description ?? null,
      price_impact: body.price_impact ?? 0,
      is_active: true,
      created_by_user_id: session.userId,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !event) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  // global_freeze veya read_only_mode event'i ise app_config güncelle
  if (body.type === 'freeze') {
    await supabase.from('app_config').upsert({ key: 'global_freeze', value: 'true' }, { onConflict: 'key' });
    devLog('freeze_log', DevLogEmbeds.freeze(true, session.userId));
  } else if (body.type === 'unfreeze') {
    await supabase.from('app_config').upsert({ key: 'global_freeze', value: 'false' }, { onConflict: 'key' });
    devLog('freeze_log', DevLogEmbeds.freeze(false, session.userId));
  }

  // Sunucuya bildiri gönder (guild_id varsa)
  if (body.guild_id && BOT_TOKEN) {
    try {
      const { data: logRow } = await supabase
        .from('bot_log_channels')
        .select('channel_id')
        .eq('guild_id', body.guild_id)
        .maybeSingle();

      if (logRow?.channel_id) {
        const colorMap: Record<string, number> = { info: 0x5865F2, warning: 0xFEE75C, critical: 0xED4245 };
        await fetch(`https://discord.com/api/channels/${logRow.channel_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `📢 ${body.title}`,
              description: body.description ?? '',
              color: colorMap[body.severity ?? 'info'] ?? 0x5865F2,
              footer: { text: `Tür: ${body.type} · Önem: ${body.severity ?? 'info'}` },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
    } catch { /* bildirim başarısız olsa da event oluşturuldu */ }
  }

  return NextResponse.json({ ok: true, event_id: event.id });
}

export async function DELETE(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  await supabase.from('market_events').update({ is_active: false }).eq('id', id);

  return NextResponse.json({ ok: true });
}
