/**
 * Haftalık cron job — Referral Pasif Gelir
 *
 * Çalışma sıklığı: Her Pazartesi 02:00 UTC (önerilen)
 *
 * Yaptığı işler:
 * - Aktif referral_usages (passive_income_until > now, activated) için
 *   harcama hacmine göre %10 ödeme hesapla ve hazineden davet edene gönder
 * - Hazine yetersizse pending_amount'a ekle (FIFO)
 * - week_id UNIQUE ile idempotent
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function isGlobalFrozen(): Promise<boolean> {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'global_freeze')
    .maybeSingle();
  return data?.value === 'true';
}

function getWeekId(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

async function runReferralPassiveIncome() {
  if (await isGlobalFrozen()) {
    console.log('Global freeze aktif — referral pasif gelir atlandı.');
    return;
  }

  const now = new Date().toISOString();
  const weekId = getWeekId();

  // Aktif referral usage'ları çek (activated ve passive_income_until > now)
  const { data: usages } = await supabase
    .from('referral_usages')
    .select('id, code_id, referred_user_id, guild_id, passive_income_rate, passive_income_until, pending_amount')
    .not('activated_at', 'is', null)
    .gt('passive_income_until', now);

  if (!usages?.length) return;

  // Her usage için referral kodu sahibini bul ve haftanın harcamasını hesapla
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  let totalPaid = 0;
  let totalPending = 0;

  for (const usage of usages) {
    // Bu hafta zaten işlendi mi?
    const { data: existing } = await supabase
      .from('referral_passive_income_log')
      .select('id')
      .eq('referral_usage_id', usage.id)
      .eq('week_id', weekId)
      .maybeSingle();

    if (existing) continue;

    // Davet edilen kişinin bu haftaki harcamaları
    const { data: ledger } = await supabase
      .from('wallet_ledger')
      .select('amount')
      .eq('guild_id', usage.guild_id)
      .eq('user_id', usage.referred_user_id)
      .lt('amount', 0)
      .gte('created_at', sevenDaysAgo);

    const weeklySpend = Math.abs((ledger ?? []).reduce((s, l) => s + (l.amount ?? 0), 0));
    if (weeklySpend <= 0) continue;

    const bonus = Math.floor(weeklySpend * (usage.passive_income_rate ?? 0.10));
    if (bonus <= 0) continue;

    // Referral kodu sahibini bul
    const { data: refCode } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('id', usage.code_id)
      .maybeSingle();

    if (!refCode) continue;
    const referrerId = refCode.user_id;

    // Hazine bakiyesi yeterli mi?
    const { data: treasury } = await supabase
      .from('server_treasury')
      .select('balance')
      .eq('guild_id', usage.guild_id)
      .maybeSingle();

    const treasuryBalance = treasury?.balance ?? 0;

    if (treasuryBalance >= bonus) {
      // Ödeme yap
      const { data: w } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', usage.guild_id)
        .eq('user_id', referrerId)
        .maybeSingle();

      await supabase.from('member_wallets').update({
        balance: (w?.balance ?? 0) + bonus,
        updated_at: new Date().toISOString(),
      }).eq('guild_id', usage.guild_id).eq('user_id', referrerId);

      await supabase.from('wallet_ledger').insert({
        guild_id: usage.guild_id,
        user_id: referrerId,
        amount: bonus,
        type: 'referral_bonus',
        note: `Referral pasif gelir (${weekId}): ${usage.referred_user_id} harcamasından %${Math.round((usage.passive_income_rate ?? 0.10) * 100)}`,
      });

      // Hazineden düş
      await supabase.from('server_treasury').update({
        balance: treasuryBalance - bonus,
        updated_at: new Date().toISOString(),
      }).eq('guild_id', usage.guild_id);

      totalPaid += bonus;
    } else {
      // Hazine yetersiz — pending_amount'a ekle
      await supabase.from('referral_usages').update({
        pending_amount: (usage.pending_amount ?? 0) + bonus,
      }).eq('id', usage.id);

      totalPending += bonus;
    }

    // İdempotency logu
    await supabase.from('referral_passive_income_log').insert({
      referral_usage_id: usage.id,
      week_id: weekId,
      amount: bonus,
    });
  }

  // Bekleyen ödemeleri hazine dolunca karşıla (FIFO)
  await processPendingReferralPayments();

  console.log(`✅ Referral pasif gelir: ${totalPaid.toLocaleString()} Papel ödendi, ${totalPending.toLocaleString()} Papel beklemede (${weekId})`);
}

async function processPendingReferralPayments() {
  const { data: pending } = await supabase
    .from('referral_usages')
    .select('id, code_id, guild_id, pending_amount')
    .gt('pending_amount', 0)
    .order('id', { ascending: true }); // FIFO

  if (!pending?.length) return;

  for (const usage of pending) {
    const { data: treasury } = await supabase
      .from('server_treasury')
      .select('balance')
      .eq('guild_id', usage.guild_id)
      .maybeSingle();

    const treasuryBalance = treasury?.balance ?? 0;
    if (treasuryBalance <= 0) continue;

    const toPay = Math.min(usage.pending_amount, treasuryBalance);

    const { data: refCode } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('id', usage.code_id)
      .maybeSingle();

    if (!refCode) continue;

    const { data: w } = await supabase
      .from('member_wallets')
      .select('balance')
      .eq('guild_id', usage.guild_id)
      .eq('user_id', refCode.user_id)
      .maybeSingle();

    await supabase.from('member_wallets').update({
      balance: (w?.balance ?? 0) + toPay,
      updated_at: new Date().toISOString(),
    }).eq('guild_id', usage.guild_id).eq('user_id', refCode.user_id);

    await supabase.from('wallet_ledger').insert({
      guild_id: usage.guild_id,
      user_id: refCode.user_id,
      amount: toPay,
      type: 'referral_bonus',
      note: `Bekleyen referral ödemesi`,
    });

    await supabase.from('server_treasury').update({
      balance: treasuryBalance - toPay,
      updated_at: new Date().toISOString(),
    }).eq('guild_id', usage.guild_id);

    await supabase.from('referral_usages').update({
      pending_amount: usage.pending_amount - toPay,
    }).eq('id', usage.id);
  }
}

(async () => {
  console.log('🕐 referralPassiveIncome cron başladı:', new Date().toISOString());
  await runReferralPassiveIncome();
  console.log('✅ referralPassiveIncome cron tamamlandı.');
})();
