import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { requireSessionUser } from '@/lib/auth';
import { getSelectedGuildId } from '@/lib/guild';


const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

// Mail'den ödül miktarını çıkar - önce metadata, sonra başlık
function getRewardAmount(mail: any): number {
  // 1. metadata.reward_amount (güvenilir kaynak)
  if (mail.metadata && typeof mail.metadata === 'object' && typeof mail.metadata.reward_amount === 'number') {
    return mail.metadata.reward_amount;
  }
  // 2. Başlıktan parse et (eski mailler için fallback)
  const match = String(mail.title ?? '').match(/([\d.,]+)\s*Papel/i);
  if (match) return parseFloat(match[1].replace(',', '.')) || 0;
  return 0;
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'missing_service_role' }, { status: 500 });
  }

  const session = await requireSessionUser(request);
  if (!session.ok) {
    return session.response;
  }
  const userId = session.userId;
  const selectedGuildId = await getSelectedGuildId(request);

  const payload = (await request.json()) as { ids?: string[] };
  const ids = payload.ids ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: 'no_ids' }, { status: 400 });
  }

  // Reward maillerini getir (metadata dahil)
  const { data: mails, error: mailError } = await supabase
    .from('system_mails')
    .select('id,title,metadata,category,user_id,guild_id')
    .in('id', ids)
    .eq('guild_id', selectedGuildId)
    .eq('category', 'reward')
    .eq('status', 'published');

  if (mailError || !mails || mails.length === 0) {
    return NextResponse.json({ error: 'no_reward_mails' }, { status: 400 });
  }

  // Sadece bu kullanıcıya ait veya herkese (user_id=null) olanları filtrele
  const eligible = mails.filter((m: any) => m.user_id === null || m.user_id === userId);
  if (eligible.length === 0) {
    return NextResponse.json({ error: 'no_eligible_rewards' }, { status: 400 });
  }

  // Daha önce claim edilmiş mi kontrol et (okundu = claim edilmiş)
  const { data: reads } = await supabase
    .from('system_mail_reads')
    .select('mail_id')
    .eq('user_id', userId)
    .in('mail_id', eligible.map((m: any) => m.id));

  const alreadyClaimed = new Set((reads ?? []).map((r: any) => r.mail_id));
  const unclaimed = eligible.filter((m: any) => !alreadyClaimed.has(m.id));

  if (unclaimed.length === 0) {
    return NextResponse.json({ error: 'already_claimed' }, { status: 400 });
  }

  // Toplam ödül miktarını hesapla
  let totalReward = 0;
  for (const mail of unclaimed) {
    totalReward += getRewardAmount(mail);
  }

  // Mailleri okundu işaretle (claim edilmiş olarak)
  const now = new Date().toISOString();
  const upserts = unclaimed.map((m: any) => ({ mail_id: m.id, user_id: userId, read_at: now }));
  await (supabase.from('system_mail_reads') as any).upsert(upserts, { onConflict: 'mail_id,user_id' });

  if (totalReward <= 0) {
    return NextResponse.json({ status: 'ok', claimed: 0 });
  }

  // Mevcut bakiyeyi getir
  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('balance')
    .eq('guild_id', selectedGuildId)
    .eq('user_id', userId)
    .maybeSingle();

  const currentBalance = Number((wallet as any)?.balance ?? 0);
  const newBalance = Number((currentBalance + totalReward).toFixed(2));

  // Bakiyeyi güncelle
  await (supabase.from('member_wallets') as any).upsert(
    {
      guild_id: selectedGuildId,
      user_id: userId,
      balance: newBalance,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'guild_id,user_id' },
  );

  // Ledger kaydı
  await (supabase.from('wallet_ledger') as any).insert({
    guild_id: selectedGuildId,
    user_id: userId,
    amount: totalReward,
    type: 'reward_claim',
    balance_after: newBalance,
    metadata: {
      source: 'mail_reward',
      mail_ids: unclaimed.map((m: any) => m.id),
    },
  });

  return NextResponse.json({
    status: 'ok',
    claimed: totalReward,
    newBalance,
    count: unclaimed.length,
  });
}
