import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';

export const dynamic = 'force-dynamic';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

/** 8 karakterlik benzersiz kod üretir */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışıklık yaratanlar (0/O, 1/I) çıkarıldı
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** GET — kullanıcının mevcut referral kodunu döner (yoksa oluşturur) */
export async function GET(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  // Sunucu Yüksek Ekonomi'de mi?
  const { data: server } = await supabase
    .from('servers')
    .select('economy_tier')
    .eq('discord_id', guildId)
    .eq('is_setup', true)
    .maybeSingle();

  if (!server) return NextResponse.json({ error: 'server_not_found' }, { status: 404 });
  if (server.economy_tier !== 'advanced') {
    return NextResponse.json({ error: 'not_advanced', code: null, economy_tier: server.economy_tier });
  }

  // Mevcut kodu çek
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('id, code, created_at')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { count } = await supabase
      .from('referral_usages')
      .select('*', { count: 'exact', head: true })
      .eq('code_id', existing.id);

    return NextResponse.json({ code: existing.code, usage_count: count ?? 0, economy_tier: 'advanced' });
  }

  // Yeni kod oluştur (çakışma olursa tekrar dene)
  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!clash) break;
    code = generateCode();
  }

  const { data: created, error } = await supabase
    .from('referral_codes')
    .insert({ guild_id: guildId, user_id: userId, code })
    .select('code')
    .single();

  if (error || !created) return NextResponse.json({ error: 'create_failed' }, { status: 500 });

  return NextResponse.json({ code: created.code, usage_count: 0, economy_tier: 'advanced' });
}

/** POST — referral kodunu kullan (davet edilen kişi kullanır) */
export async function POST(request: Request) {
  const session = await requireSessionUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });

  const guildId = await getSelectedGuildId(request);
  if (!guildId) return NextResponse.json({ error: 'no_selected_guild' }, { status: 400 });

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'missing_code' }, { status: 400 });

  // Kodu bul
  const { data: referralCode } = await supabase
    .from('referral_codes')
    .select('id, user_id, guild_id')
    .eq('code', code)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (!referralCode) return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  if (referralCode.user_id === userId) return NextResponse.json({ error: 'own_code' }, { status: 400 });

  // Zaten kullanmış mı?
  const { data: alreadyUsed } = await supabase
    .from('referral_usages')
    .select('id')
    .eq('referred_user_id', userId)
    .eq('guild_id', guildId)
    .maybeSingle();

  if (alreadyUsed) return NextResponse.json({ error: 'already_used' }, { status: 400 });

  // Kaydı oluştur (henüz aktive olmadı — ilk harcamada aktive olacak)
  await supabase.from('referral_usages').insert({
    code_id: referralCode.id,
    referred_user_id: userId,
    guild_id: guildId,
  });

  return NextResponse.json({ ok: true });
}
