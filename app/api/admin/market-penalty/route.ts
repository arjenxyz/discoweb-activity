/**
 * POST /api/admin/market-penalty — Sunucuya ceza ver (developer only)
 * DELETE /api/admin/market-penalty?id=<uuid> — Cezayı kaldır
 * GET  /api/admin/market-penalty?guild_id=<id> — Sunucu cezalarını listele
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

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

  const url = new URL(request.url);
  const guildId = url.searchParams.get('guild_id');

  let query = supabase.from('server_penalties').select('*').order('issued_at', { ascending: false });
  if (guildId) query = query.eq('guild_id', guildId);

  const { data: penalties } = await query;
  return NextResponse.json({ penalties: penalties ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  if (!isDeveloper(session.userId)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = (await request.json()) as {
    guild_id: string;
    type: string;         // warning | fine | suspension | delist
    reason?: string;
    fine_amount?: number;
    price_multiplier?: number;
  };

  if (!body.guild_id || !body.type) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const priceMultiplier = body.price_multiplier ?? (
    body.type === 'warning' ? 0.90 :
    body.type === 'fine' ? 0.80 : 1.0
  );

  const { data: penalty, error } = await supabase
    .from('server_penalties')
    .insert({
      guild_id: body.guild_id,
      type: body.type,
      reason: body.reason ?? null,
      fine_amount: body.fine_amount ?? 0,
      price_multiplier: priceMultiplier,
      is_active: true,
      issued_by_user_id: session.userId,
    })
    .select('id')
    .single();

  if (error || !penalty) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  // Suspension: listing'i suspend et
  if (body.type === 'suspension') {
    await supabase
      .from('server_listings')
      .update({ status: 'suspended' })
      .eq('guild_id', body.guild_id);
  }

  // Delist: tam tasfiye
  if (body.type === 'delist') {
    await supabase
      .from('server_listings')
      .update({ status: 'delisted', delisted_at: new Date().toISOString() })
      .eq('guild_id', body.guild_id);

    // Açık emirleri iptal et, reserved_balance serbest bırak
    const { data: openOrders } = await supabase
      .from('market_orders')
      .select('id, user_id, type, remaining_lots, price_per_lot')
      .eq('guild_id', body.guild_id)
      .in('status', ['open', 'partial']);

    for (const ord of openOrders ?? []) {
      await supabase.from('market_orders').update({ status: 'cancelled' }).eq('id', ord.id);
      if (ord.type === 'buy') {
        const refund = ord.remaining_lots * ord.price_per_lot;
        const { data: w } = await supabase
          .from('member_wallets')
          .select('reserved_balance')
          .eq('guild_id', body.guild_id)
          .eq('user_id', ord.user_id)
          .maybeSingle();
        await supabase.from('member_wallets').update({
          reserved_balance: Math.max(0, (w?.reserved_balance ?? 0) - refund),
        }).eq('guild_id', body.guild_id).eq('user_id', ord.user_id);
      }
    }

    // Hazineyi yatırımcılara oransal dağıt
    const { data: treasury } = await supabase
      .from('server_treasury')
      .select('balance')
      .eq('guild_id', body.guild_id)
      .maybeSingle();

    const treasuryBalance = treasury?.balance ?? 0;
    if (treasuryBalance > 0) {
      const { data: holdings } = await supabase
        .from('investor_holdings')
        .select('user_id, lot_count')
        .eq('guild_id', body.guild_id)
        .gt('lot_count', 0);

      const totalLots = (holdings ?? []).reduce((s, h) => s + h.lot_count, 0);

      if (totalLots > 0) {
        for (const h of holdings ?? []) {
          const share = Math.floor((h.lot_count / totalLots) * treasuryBalance);
          if (share <= 0) continue;

          const { data: w } = await supabase
            .from('member_wallets')
            .select('balance')
            .eq('guild_id', body.guild_id)
            .eq('user_id', h.user_id)
            .maybeSingle();

          await supabase.from('member_wallets').update({
            balance: (w?.balance ?? 0) + share,
            updated_at: new Date().toISOString(),
          }).eq('guild_id', body.guild_id).eq('user_id', h.user_id);

          await supabase.from('wallet_ledger').insert({
            guild_id: body.guild_id,
            user_id: h.user_id,
            amount: share,
            type: 'dividend',
            note: `Delist tasfiyesi: ${h.lot_count} lot`,
          });
        }

        // Temettü kayıt
        const weekId = new Date().toISOString().slice(0, 10);
        await supabase.from('dividend_payouts').insert({
          guild_id: body.guild_id,
          week_id: `delist-${weekId}`,
          total_amount: treasuryBalance,
          per_lot_amount: treasuryBalance / totalLots,
          holdings_snapshot: holdings,
          triggered_by: 'liquidation',
          triggered_by_user_id: session.userId,
        });

        // Hazineyi sıfırla
        await supabase.from('server_treasury').update({
          balance: 0,
          updated_at: new Date().toISOString(),
        }).eq('guild_id', body.guild_id);
      }
    }

    // Holdings sil
    await supabase.from('investor_holdings').delete().eq('guild_id', body.guild_id);
  }

  // Fine: hazineden ceza miktarı yakar
  if (body.type === 'fine' && (body.fine_amount ?? 0) > 0) {
    const { data: treasury } = await supabase
      .from('server_treasury')
      .select('balance, total_burned')
      .eq('guild_id', body.guild_id)
      .maybeSingle();

    if (treasury) {
      const burn = Math.min(body.fine_amount!, treasury.balance);
      await supabase.from('server_treasury').update({
        balance: treasury.balance - burn,
        total_burned: (treasury.total_burned ?? 0) + burn,
        updated_at: new Date().toISOString(),
      }).eq('guild_id', body.guild_id);
    }
  }

  // Sunucuya bildirim
  if (BOT_TOKEN) {
    try {
      const { data: logRow } = await supabase
        .from('bot_log_channels')
        .select('channel_id')
        .eq('guild_id', body.guild_id)
        .maybeSingle();

      if (logRow?.channel_id) {
        const typeLabels: Record<string, string> = {
          warning: '⚠️ Uyarı', fine: '💸 Para Cezası', suspension: '🔒 Askıya Alma', delist: '❌ Delist',
        };
        const colorMap: Record<string, number> = {
          warning: 0xFEE75C, fine: 0xFFA500, suspension: 0xED4245, delist: 0x2C2F33,
        };
        await fetch(`https://discord.com/api/channels/${logRow.channel_id}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: `${typeLabels[body.type] ?? body.type} Uygulandı`,
              description: body.reason ?? 'Neden belirtilmedi.',
              color: colorMap[body.type] ?? 0xED4245,
              fields: body.fine_amount ? [{ name: 'Ceza Miktarı', value: `${body.fine_amount.toLocaleString('tr-TR')} Papel yakıldı`, inline: true }] : [],
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, penalty_id: penalty.id });
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

  await supabase.from('server_penalties').update({
    is_active: false,
    lifted_at: new Date().toISOString(),
    lifted_by_user_id: session.userId,
  }).eq('id', id);

  return NextResponse.json({ ok: true });
}
