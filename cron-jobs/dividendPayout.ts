/**
 * Haftalık cron job — Temettü Dağıtımı
 *
 * Çalışma sıklığı: Her Pazar 00:00 UTC
 *
 * Yaptığı işler:
 * - Her `approved` listing için hazine bakiyesinin %1'ini hissedarlara dağıt
 * - week_id UNIQUE constraint sayesinde idempotent (2 kez çalışırsa ON CONFLICT DO NOTHING)
 * - app_config global_freeze kontrolü
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Simple translation function for cron job
const t = (key: string, params?: Record<string, string | number>): string => {
  const translations: Record<string, string> = {
    'cron_dividend_freeze_active': 'Global freeze aktif — temettü atlandı.',
    'cron_dividend_note': 'Haftalık temettü: {lotCount} lot × {perLotAmount} Papel ({weekId})',
    'cron_dividend_success_log': '✅ Temettü dağıtıldı: {totalListings} sunucu, toplam {totalPaid} Papel ({weekId})',
    'cron_dividend_started': '🕐 dividendPayout cron başladı: {timestamp}',
    'cron_dividend_completed': '✅ dividendPayout cron tamamlandı.'
  };
  
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      result = result.replace(new RegExp(`{${param}}`, 'g'), String(value));
    });
  }
  return result;
};

async function isGlobalFrozen(): Promise<boolean> {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'global_freeze')
    .maybeSingle();
  return data?.value === 'true';
}

function getWeekId(): string {
  // UTC bazlı ISO hafta numarası: 2026-W12
  const now = new Date();
  const year = now.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

async function runDividendPayout() {
  if (await isGlobalFrozen()) {
    console.log(t('cron_dividend_freeze_active'));
    return;
  }

  const weekId = getWeekId();

  const { data: listings } = await supabase
    .from('server_listings')
    .select('guild_id, total_lots')
    .eq('status', 'approved');

  if (!listings?.length) return;

  let totalPaid = 0;
  let totalListings = 0;

  for (const listing of listings) {
    const guildId = listing.guild_id;

    // Zaten bu hafta dağıtıldı mı?
    const { data: existing } = await supabase
      .from('dividend_payouts')
      .select('id')
      .eq('guild_id', guildId)
      .eq('week_id', weekId)
      .maybeSingle();

    if (existing) continue; // idempotent

    // Hazine bakiyesi
    const { data: treasury } = await supabase
      .from('server_treasury')
      .select('balance')
      .eq('guild_id', guildId)
      .maybeSingle();

    const balance = treasury?.balance ?? 0;
    if (balance <= 0) continue;

    // Admin ayarlanabilir temettü oranı — varsayılan %1
    const { data: serverSettings } = await supabase
      .from('servers')
      .select('dividend_rate')
      .eq('discord_id', guildId)
      .maybeSingle();

    // dividend_rate yoksa varsayılan 0.01 kullan
    const dividendRate = (serverSettings as { dividend_rate?: number } | null)?.dividend_rate ?? 0.01;
    const totalDividend = Math.floor(balance * dividendRate);
    if (totalDividend <= 0) continue;

    // Hissedarları çek
    const { data: holdings } = await supabase
      .from('investor_holdings')
      .select('user_id, lot_count')
      .eq('guild_id', guildId)
      .gt('lot_count', 0);

    if (!holdings?.length) continue;

    const totalLots = holdings.reduce((s, h) => s + h.lot_count, 0);
    const perLotAmount = totalDividend / totalLots;

    // Her hissedara ödeme
    for (const holding of holdings) {
      const share = Math.floor(holding.lot_count * perLotAmount);
      if (share <= 0) continue;

      const { data: w } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', guildId)
        .eq('user_id', holding.user_id)
        .maybeSingle();

      await supabase.from('member_wallets').update({
        balance: (w?.balance ?? 0) + share,
        updated_at: new Date().toISOString(),
      }).eq('guild_id', guildId).eq('user_id', holding.user_id);

      await supabase.from('wallet_ledger').insert({
        guild_id: guildId,
        user_id: holding.user_id,
        amount: share,
        type: 'dividend',
        note: t('cron_dividend_note', { lotCount: holding.lot_count, perLotAmount: perLotAmount.toFixed(4), weekId }),
      });
    }

    // Hazineden düş
    await supabase.from('server_treasury').update({
      balance: balance - totalDividend,
      total_dividends_paid: ((treasury as { total_dividends_paid?: number } | null)?.total_dividends_paid ?? 0) + totalDividend,
      updated_at: new Date().toISOString(),
    }).eq('guild_id', guildId);

    // Kayıt
    await supabase.from('dividend_payouts').insert({
      guild_id: guildId,
      week_id: weekId,
      total_amount: totalDividend,
      per_lot_amount: perLotAmount,
      holdings_snapshot: holdings,
      triggered_by: 'auto',
    });

    totalPaid += totalDividend;
    totalListings++;
  }

  console.log(t('cron_dividend_success_log', { totalListings, totalPaid: totalPaid.toLocaleString(), weekId }));
}

(async () => {
  console.log(t('cron_dividend_started', { timestamp: new Date().toISOString() }));
  await runDividendPayout();
  console.log(t('cron_dividend_completed'));
})();
