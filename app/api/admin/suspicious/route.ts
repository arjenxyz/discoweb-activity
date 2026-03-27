/**
 * Suspicious Activity API
 *
 * GET  /api/admin/suspicious          – list flagged records (filterable)
 * POST /api/admin/suspicious          – run detection scan & insert new flags
 * PATCH /api/admin/suspicious         – update status (reviewed / dismissed / actioned)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEV_GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const DEV_ROLE_ID  = process.env.DEVELOPER_ROLE_ID ?? '';
const ERROR_WEBHOOK = process.env.DISCORD_ERROR_WEBHOOK_URL ?? '';

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
  } catch { return false; }
}

// ── Severity colour for Discord embeds ──────────────────────────────────────
const SEVERITY_COLOR: Record<string, number> = {
  low:      0x5865F2,
  medium:   0xFEE75C,
  high:     0xED4245,
  critical: 0xFF0000,
};

const SEVERITY_EMOJI: Record<string, string> = {
  low:      '🔵',
  medium:   '🟡',
  high:     '🔴',
  critical: '🚨',
};

async function sendDiscordAlert(flag: {
  id: string;
  rule_key: string;
  severity: string;
  title: string;
  description?: string | null;
  guild_id?: string | null;
  user_id?: string | null;
  data?: Record<string, unknown> | null;
}) {
  if (!ERROR_WEBHOOK) return;
  const emoji = SEVERITY_EMOJI[flag.severity] ?? '⚠️';
  const color = SEVERITY_COLOR[flag.severity] ?? 0x5865F2;

  const fields = [];
  if (flag.guild_id) fields.push({ name: 'Sunucu (guild_id)', value: flag.guild_id, inline: true });
  if (flag.user_id)  fields.push({ name: 'Kullanıcı (user_id)', value: flag.user_id, inline: true });
  if (flag.data)     fields.push({ name: 'Detay', value: '```json\n' + JSON.stringify(flag.data, null, 2).slice(0, 900) + '\n```', inline: false });

  const body = {
    embeds: [{
      title: `${emoji} ${flag.title}`,
      description: flag.description ?? `Kural: \`${flag.rule_key}\``,
      color,
      fields,
      footer: { text: `ID: ${flag.id} • Önem: ${flag.severity.toUpperCase()}` },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    await fetch(ERROR_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { /* webhook fail is non-critical */ }
}

// ── Detection rules ──────────────────────────────────────────────────────────

type Flag = {
  guild_id?: string | null;
  user_id?: string | null;
  rule_key: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  data?: Record<string, unknown>;
};

async function runDetection(supabase: NonNullable<ReturnType<typeof getSupabase>>): Promise<Flag[]> {
  const flags: Flag[] = [];
  const since1h  = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();

  // ── 1. RAPID EARN — çok hızlı kazanç (1 saatte >500 Papel) ─────────────
  {
    const { data } = await supabase
      .from('wallet_ledger')
      .select('user_id, guild_id, amount')
      .gte('created_at', since1h)
      .eq('type', 'earn');

    // Aggregate per user+guild
    const map = new Map<string, { user_id: string; guild_id: string; total: number }>();
    for (const row of data ?? []) {
      const key = `${row.user_id}:${row.guild_id}`;
      const cur = map.get(key) ?? { user_id: row.user_id, guild_id: row.guild_id, total: 0 };
      cur.total += Number(row.amount ?? 0);
      map.set(key, cur);
    }
    for (const { user_id, guild_id, total } of map.values()) {
      if (total > 500) {
        flags.push({
          user_id, guild_id,
          rule_key: 'rapid_earn',
          severity: total > 2000 ? 'critical' : total > 1000 ? 'high' : 'medium',
          title: 'Hızlı Kazanç Tespit Edildi',
          description: `1 saat içinde ${total.toFixed(0)} Papel kazanıldı (eşik: 500).`,
          data: { total, window: '1h', threshold: 500 },
        });
      }
    }
  }

  // ── 2. WASH TRADING — aynı kullanıcı kendi sunucusuyla alım+satım ──────
  {
    const { data: trades } = await supabase
      .from('market_trades')
      .select('buyer_user_id, seller_user_id, guild_id, lot_count, total_amount, created_at')
      .gte('created_at', since24h);

    const washMap = new Map<string, { count: number; total: number; guild_id: string }>();
    for (const t of trades ?? []) {
      if (t.buyer_user_id === t.seller_user_id) {
        const key = `${t.buyer_user_id}:${t.guild_id}`;
        const cur = washMap.get(key) ?? { count: 0, total: 0, guild_id: t.guild_id };
        cur.count++;
        cur.total += Number(t.total_amount ?? 0);
        washMap.set(key, cur);
      }
    }
    for (const [key, { count, total, guild_id }] of washMap.entries()) {
      const user_id = key.split(':')[0];
      flags.push({
        user_id, guild_id,
        rule_key: 'wash_trading',
        severity: 'critical',
        title: 'Wash Trading Tespit Edildi',
        description: `Kullanıcı kendi lot'larını ${count} kez kendine sattı. Toplam: ${total.toFixed(0)} Papel.`,
        data: { trade_count: count, total_amount: total },
      });
    }
  }

  // ── 3. LOT HOARDING — tek kullanıcı toplam lot'un >%40'ı ───────────────
  {
    const { data: holdings } = await supabase
      .from('investor_holdings')
      .select('user_id, guild_id, lot_count');
    const { data: listings } = await supabase
      .from('server_listings')
      .select('guild_id, total_lots');

    const listingMap = new Map((listings ?? []).map((l) => [l.guild_id, l.total_lots]));
    for (const h of holdings ?? []) {
      const total = listingMap.get(h.guild_id) ?? 0;
      if (total > 0) {
        const pct = (h.lot_count / total) * 100;
        if (pct >= 40) {
          flags.push({
            user_id: h.user_id, guild_id: h.guild_id,
            rule_key: 'lot_hoarding',
            severity: pct >= 70 ? 'critical' : 'high',
            title: 'Lot Yığma Tespit Edildi',
            description: `Kullanıcı toplam lot'ların %${pct.toFixed(1)}'ine sahip (${h.lot_count}/${total}).`,
            data: { lot_count: h.lot_count, total_lots: total, pct: pct.toFixed(1) },
          });
        }
      }
    }
  }

  // ── 4. PUMP & DUMP — 24s içinde %30+ fiyat artışı + büyük satış ────────
  {
    const { data: snapshots } = await supabase
      .from('server_activity_snapshots')
      .select('guild_id, price_delta_pct, snapshot_date')
      .gte('snapshot_date', since24h)
      .not('price_delta_pct', 'is', null);

    for (const s of snapshots ?? []) {
      const delta = Math.abs(Number(s.price_delta_pct ?? 0));
      if (delta >= 30) {
        flags.push({
          guild_id: s.guild_id,
          rule_key: 'pump_dump',
          severity: delta >= 60 ? 'critical' : 'high',
          title: 'Fiyat Manipülasyonu Şüphesi',
          description: `24 saat içinde fiyat %${delta.toFixed(1)} değişti.`,
          data: { price_delta_pct: delta, snapshot_date: s.snapshot_date },
        });
      }
    }
  }

  // ── 5. VOTE FLOOD — 1 saatte aynı sunucuya >10 oy ───────────────────────
  {
    const { data: votes } = await supabase
      .from('economy_votes')
      .select('guild_id, voted_at')
      .gte('voted_at', since1h);

    const voteMap = new Map<string, number>();
    for (const v of votes ?? []) {
      voteMap.set(v.guild_id, (voteMap.get(v.guild_id) ?? 0) + 1);
    }
    for (const [guild_id, count] of voteMap.entries()) {
      if (count > 10) {
        flags.push({
          guild_id,
          rule_key: 'vote_flood',
          severity: count > 30 ? 'critical' : 'high',
          title: 'Oylama Saldırısı Şüphesi',
          description: `1 saat içinde ${count} oy kullanıldı (eşik: 10).`,
          data: { vote_count: count, window: '1h' },
        });
      }
    }
  }

  // ── 6. REFERRAL CHAIN — A→B→A döngüsel referral ─────────────────────────
  {
    const { data: refs } = await supabase
      .from('referral_history')
      .select('inviter_id, invitee_id')
      .gte('created_at', since7d);

    const pairs = new Set((refs ?? []).map((r) => `${r.inviter_id}:${r.invitee_id}`));
    for (const r of refs ?? []) {
      if (pairs.has(`${r.invitee_id}:${r.inviter_id}`)) {
        const key = [r.inviter_id, r.invitee_id].sort().join(':');
        flags.push({
          user_id: r.inviter_id,
          rule_key: 'referral_loop',
          severity: 'critical',
          title: 'Döngüsel Referral Tespit Edildi',
          description: `Kullanıcı ${r.inviter_id} ve ${r.invitee_id} birbirini davet etmiş.`,
          data: { inviter_id: r.inviter_id, invitee_id: r.invitee_id, pair_key: key },
        });
      }
    }
  }

  // ── 7. NEW ACCOUNT LARGE TRADE — yeni hesap büyük işlem ─────────────────
  {
    const DISCORD_EPOCH = 1420070400000;
    const { data: trades } = await supabase
      .from('market_trades')
      .select('buyer_user_id, seller_user_id, guild_id, total_amount, created_at')
      .gte('created_at', since24h)
      .gte('total_amount', 1000);

    const suspectUsers = new Set<string>();
    for (const t of trades ?? []) {
      for (const uid of [t.buyer_user_id, t.seller_user_id]) {
        const snowflake = parseInt(uid, 10);
        if (!isNaN(snowflake)) {
          const ageDays = (Date.now() - (Math.floor(snowflake / 4194304) + DISCORD_EPOCH)) / 86400000;
          if (ageDays < 30 && !suspectUsers.has(uid)) {
            suspectUsers.add(uid);
            flags.push({
              user_id: uid, guild_id: t.guild_id,
              rule_key: 'new_account_trade',
              severity: 'high',
              title: 'Yeni Hesap Büyük İşlem',
              description: `${Math.floor(ageDays)} günlük hesap 1000+ Papel değerinde işlem yaptı.`,
              data: { account_age_days: Math.floor(ageDays), total_amount: t.total_amount },
            });
          }
        }
      }
    }
  }

  return flags;
}

// ── GET — list ───────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'open';
  const limit  = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') ?? 50)));

  let query = supabase
    .from('suspicious_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ flags: data ?? [] });
}

// ── POST — run scan ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const flags = await runDetection(supabase);

  if (flags.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, message: 'Şüpheli hareket bulunamadı.' });
  }

  // De-dupe: skip rules already open for same guild+user in last 24h
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('suspicious_activity_log')
    .select('rule_key, guild_id, user_id')
    .eq('status', 'open')
    .gte('created_at', since24h);

  const existingSet = new Set(
    (existing ?? []).map((e) => `${e.rule_key}:${e.guild_id ?? ''}:${e.user_id ?? ''}`)
  );

  const toInsert = flags.filter(
    (f) => !existingSet.has(`${f.rule_key}:${f.guild_id ?? ''}:${f.user_id ?? ''}`)
  );

  if (toInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, message: 'Tüm bayraklar zaten mevcut.' });
  }

  const { data: inserted, error } = await supabase
    .from('suspicious_activity_log')
    .insert(toInsert)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send Discord alerts for high/critical
  for (const flag of inserted ?? []) {
    if (flag.severity === 'high' || flag.severity === 'critical') {
      await sendDiscordAlert(flag);
      await supabase
        .from('suspicious_activity_log')
        .update({ discord_alerted: true })
        .eq('id', flag.id);
    }
  }

  return NextResponse.json({ ok: true, inserted: (inserted ?? []).length, flags: inserted });
}

// ── PATCH — update status ────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const session = await requireSessionUser(request);
  if (!session.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await isDeveloper(session.userId))) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const body = await request.json() as { id: string; status: string };
  const ALLOWED = ['reviewed', 'dismissed', 'actioned'];
  if (!body.id || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  await supabase
    .from('suspicious_activity_log')
    .update({ status: body.status, reviewed_by: session.userId, reviewed_at: new Date().toISOString() })
    .eq('id', body.id);

  return NextResponse.json({ ok: true });
}
