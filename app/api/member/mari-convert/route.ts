/**
 * POST /api/member/mari-convert
 * Papel → Mari dönüşümü
 *
 * Kontroller:
 *  1. Yeterli papel bakiyesi
 *  2. Minimum emek şartı (günde 50+ geçerli mesaj VEYA 30+ dk ses)
 *  3. Sunucu başı günlük limit (2 MRI)
 *  4. Global günlük limit (6 MRI)
 *
 * Body: { papel_amount: number }
 * Response: { ok, mari_gained, new_mari_balance, new_papel_balance }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';
import { checkGlobalFreeze } from '@/lib/maintenance';
import { addUserMari, getUserMariBalance, insertMariLedger } from '@/lib/mariWallet';

export const dynamic = 'force-dynamic';

const SERVER_DAILY_MARI_LIMIT = 2;   // sunucu başı günlük max Mari
const GLOBAL_DAILY_MARI_LIMIT = 6;   // tüm sunucular toplam günlük max
const PLATFORM_REFERANS = 2;         // daily_cap / PLATFORM_REFERANS = mari_rate
const MIN_MESSAGES_FOR_CONVERT = 50; // veya 30 dk ses
const MIN_VOICE_MINUTES = 30;
const MIN_ACCOUNT_AGE_DAYS = 30;     // hesap yaşı kontrolü (convert için değil, oy için)

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

export async function POST(request: Request) {
  const freeze = await checkGlobalFreeze();
  if (freeze.frozen) {
    return NextResponse.json({ error: 'global_freeze' }, { status: 503 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const body = (await request.json()) as { papel_amount?: number };
  const papelAmount = body.papel_amount;

  if (!papelAmount || papelAmount <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 });
  }

  // Sunucunun daily_cap ve mari_rate_override'ını çek
  const { data: server } = await supabase
    .from('servers')
    .select('daily_papel_cap, mari_rate_override')
    .eq('discord_id', guildId)
    .maybeSingle() as {
      data: { daily_papel_cap: number; mari_rate_override: number | null } | null;
    };

  if (!server) {
    return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  }

  // Sunucunun yüksek ekonomi onayı var mı?
  const { data: econApp } = await supabase
    .from('economy_applications')
    .select('status')
    .eq('guild_id', guildId)
    .maybeSingle();

  if (!econApp || econApp.status !== 'approved') {
    return NextResponse.json({ error: 'economy_not_approved' }, { status: 403 });
  }

  // Mari kuru hesapla
  const dailyCap = server.daily_papel_cap ?? 500;
  const mariRate = server.mari_rate_override ?? (dailyCap / PLATFORM_REFERANS);
  // mariRate = 1 Mari kaç papel (örn: 500 papel = 1 Mari)

  const mariAmount = papelAmount / mariRate;

  if (mariAmount < 0.000001) {
    return NextResponse.json({ error: 'amount_too_small' }, { status: 400 });
  }

  // Minimum emek şartı: bugün bu sunucuda geçerli mesaj veya ses süresi
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: activitySnap } = await supabase
    .from('server_activity_snapshots')
    .select('message_count, voice_minutes')
    .eq('guild_id', guildId)
    .eq('snapshot_date', todayStart.toISOString().split('T')[0])
    .maybeSingle();

  // Bot'tan gelen günlük mesaj sayısı snapshot'ta tutulur
  // Alternatif: member_daily_activity tablosu — şimdilik snapshot kullanıyoruz
  // TODO: Bot'un kişi bazlı günlük mesaj sayısını kaydetmesi gerekecek
  // Geçici: snapshot yoksa emek şartını geç (bot entegrasyonu tamamlanınca aktif et)
  const userMessages = activitySnap?.message_count ?? MIN_MESSAGES_FOR_CONVERT;
  const userVoiceMinutes = activitySnap?.voice_minutes ?? MIN_VOICE_MINUTES;

  const meetsActivity =
    userMessages >= MIN_MESSAGES_FOR_CONVERT ||
    userVoiceMinutes >= MIN_VOICE_MINUTES;

  if (!meetsActivity) {
    return NextResponse.json({
      error: 'min_activity_required',
      required_messages: MIN_MESSAGES_FOR_CONVERT,
      required_voice_minutes: MIN_VOICE_MINUTES,
      current_messages: userMessages,
      current_voice_minutes: userVoiceMinutes,
    }, { status: 400 });
  }

  // Bugün bu sunucuda ne kadar Mari dönüştürdü?
  const { data: todayServerConversions } = await supabase
    .from('mari_conversions')
    .select('mari_amount')
    .eq('user_id', userId)
    .eq('guild_id', guildId)
    .gte('converted_at', todayStart.toISOString());

  const todayServerMari = (todayServerConversions ?? []).reduce(
    (sum, r) => sum + (r.mari_amount ?? 0), 0
  );

  if (todayServerMari + mariAmount > SERVER_DAILY_MARI_LIMIT) {
    const remaining = Math.max(0, SERVER_DAILY_MARI_LIMIT - todayServerMari);
    return NextResponse.json({
      error: 'server_daily_limit',
      remaining_mari: remaining,
      limit: SERVER_DAILY_MARI_LIMIT,
    }, { status: 400 });
  }

  // Bugün tüm sunucularda ne kadar Mari dönüştürdü?
  const { data: todayGlobalConversions } = await supabase
    .from('mari_conversions')
    .select('mari_amount')
    .eq('user_id', userId)
    .gte('converted_at', todayStart.toISOString());

  const todayGlobalMari = (todayGlobalConversions ?? []).reduce(
    (sum, r) => sum + (r.mari_amount ?? 0), 0
  );

  if (todayGlobalMari + mariAmount > GLOBAL_DAILY_MARI_LIMIT) {
    const remaining = Math.max(0, GLOBAL_DAILY_MARI_LIMIT - todayGlobalMari);
    return NextResponse.json({
      error: 'global_daily_limit',
      remaining_mari: remaining,
      limit: GLOBAL_DAILY_MARI_LIMIT,
    }, { status: 400 });
  }

  // Papel bakiyesi yeterli mi?
  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance, reserved_balance')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  const availablePapel = (wallet?.balance ?? 0) - (wallet?.reserved_balance ?? 0);
  if (availablePapel < papelAmount) {
    return NextResponse.json({
      error: 'insufficient_papel',
      available: availablePapel,
    }, { status: 400 });
  }

  const newPapelBalance = (wallet?.balance ?? 0) - papelAmount;
  const newMariBalance = await addUserMari(supabase, userId, mariAmount);

  await supabase
    .from('member_wallets')
    .update({
      balance: newPapelBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  await supabase.from('mari_conversions').insert({
    user_id: userId,
    guild_id: guildId,
    papel_amount: papelAmount,
    mari_amount: mariAmount,
    converted_at: new Date().toISOString(),
  });

  await insertMariLedger(supabase, {
    userId,
    amount: mariAmount,
    type: 'mari_convert',
    balanceAfter: newMariBalance,
    contextGuildId: guildId,
    metadata: { papel_amount: papelAmount, rate: mariRate },
  });

  return NextResponse.json({
    ok: true,
    mari_gained: mariAmount,
    new_mari_balance: newMariBalance,
    new_papel_balance: newPapelBalance,
    rate_used: mariRate, // 1 Mari = X papel
  });
}

/** GET /api/member/mari-convert — Kur ve limit bilgisi */
export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const [serverRes, walletRes, todayServerRes, todayGlobalRes] = await Promise.all([
    supabase
      .from('servers')
      .select('daily_papel_cap, mari_rate_override')
      .eq('discord_id', guildId)
      .maybeSingle(),
    supabase
      .from('member_wallets')
      .select('balance, reserved_balance')
      .eq('guild_id', guildId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('mari_conversions')
      .select('mari_amount')
      .eq('user_id', userId)
      .eq('guild_id', guildId)
      .gte('converted_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from('mari_conversions')
      .select('mari_amount')
      .eq('user_id', userId)
      .gte('converted_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ]);

  const server = serverRes.data;
  const wallet = walletRes.data;
  const dailyCap = server?.daily_papel_cap ?? 500;
  const mariRate = server?.mari_rate_override ?? (dailyCap / PLATFORM_REFERANS);

  const todayServerMari = (todayServerRes.data ?? []).reduce((s, r) => s + r.mari_amount, 0);
  const todayGlobalMari = (todayGlobalRes.data ?? []).reduce((s, r) => s + r.mari_amount, 0);
  const mariBalance = await getUserMariBalance(supabase, userId);

  return NextResponse.json({
    mari_rate: mariRate,            // 1 Mari = X papel
    papel_balance: (wallet?.balance ?? 0) - (wallet?.reserved_balance ?? 0),
    mari_balance: mariBalance,
    server_limit: SERVER_DAILY_MARI_LIMIT,
    server_used_today: todayServerMari,
    server_remaining_today: Math.max(0, SERVER_DAILY_MARI_LIMIT - todayServerMari),
    global_limit: GLOBAL_DAILY_MARI_LIMIT,
    global_used_today: todayGlobalMari,
    global_remaining_today: Math.max(0, GLOBAL_DAILY_MARI_LIMIT - todayGlobalMari),
  });
}
