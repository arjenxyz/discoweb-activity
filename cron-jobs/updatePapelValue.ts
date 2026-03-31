/**
 * Haftalık cron job — Papel değer çarpanı + founder_vested_lots + halving
 *
 * Çalışma sıklığı: Her Pazartesi 01:00 UTC (önerilen)
 *
 * Yaptığı işler:
 * 1. Her sunucu için papel_value_multiplier hesapla (plan formülü)
 * 2. Global supply eşiğine göre earn_multiplier_override (halving)
 * 3. IPO'lu sunucularda founder_vested_lots güncelle (vesting takvimi)
 * 4. Süresi dolan market_orders emirlerini 'expired' yap, reserved_balance serbest bırak
 * 5. app_config global_freeze kontrolü — dondurulmuşsa işlem yapma
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// Simple translation function for cron job
const t = (key: string, params?: Record<string, string | number>): string => {
  const translations: Record<string, string> = {
    'cron_papel_freeze_active': 'Global freeze aktif — updatePapelValue atlandı.',
    'cron_papel_update_error': 'Papel value update hatası ({guildId}):',
    'cron_papel_success_log': '✅ Papel değer çarpanı güncellendi: {serverCount} sunucu',
    'cron_halving_success_log': '✅ Halving: global supply={globalSupply}, earn_multiplier={earnMultiplier}',
    'cron_vesting_success_log': '✅ Founder vesting güncellendi: {listingCount} listing',
    'cron_orders_expired_log': '✅ Süresi dolan emirler iptal edildi: {orderCount} emir',
    'cron_papel_started': '🕐 updatePapelValue cron başladı: {timestamp}',
    'cron_papel_completed': '✅ updatePapelValue cron tamamlandı.'
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

async function updatePapelValues() {
  if (await isGlobalFrozen()) {
    console.log(t('cron_papel_freeze_active'));
    return;
  }

  // Tüm setup'lı sunucuları çek
  const { data: servers } = await supabase
    .from('servers')
    .select('discord_id, economy_tier')
    .eq('is_setup', true);

  if (!servers?.length) return;

  for (const server of servers) {
    const guildId = server.discord_id;

    try {
      // Dolaşımdaki toplam Papel (circulating_supply)
      const { data: walletAgg } = await supabase
        .from('member_wallets')
        .select('balance')
        .eq('guild_id', guildId);

      const circulatingSupply = (walletAgg ?? []).reduce((s, w) => s + (w.balance ?? 0), 0);
      const effectiveSupply = Math.max(circulatingSupply, 1);

      // Günlük harcama hacmi (son 7 gün, benzersiz çiftler dahil)
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const { data: ledger } = await supabase
        .from('wallet_ledger')
        .select('amount')
        .eq('guild_id', guildId)
        .lt('amount', 0) // harcamalar negatif
        .gte('created_at', sevenDaysAgo);

      const weeklySpend = Math.abs((ledger ?? []).reduce((s, l) => s + (l.amount ?? 0), 0));
      const dailySpendVolume = weeklySpend / 7;

      // Hazine bakiyesi
      const { data: treasury } = await supabase
        .from('server_treasury')
        .select('balance')
        .eq('guild_id', guildId)
        .maybeSingle();

      const treasuryBalance = treasury?.balance ?? 0;

      // Papel değer çarpanı formülü (plan belgesi)
      const papelValueMultiplier =
        (dailySpendVolume / effectiveSupply) *
        (1 + treasuryBalance / effectiveSupply);

      await supabase
        .from('servers')
        .update({ papel_value_multiplier: papelValueMultiplier })
        .eq('discord_id', guildId);

    } catch (err) {
      console.error(t('cron_papel_update_error', { guildId }), err);
    }
  }

  console.log(t('cron_papel_success_log', { serverCount: servers.length }));
}

async function updateHalving() {
  if (await isGlobalFrozen()) return;

  // Global toplam supply
  const { data: wallets } = await supabase
    .from('member_wallets')
    .select('balance');

  const globalSupply = (wallets ?? []).reduce((s, w) => s + (w.balance ?? 0), 0);

  let earnMultiplier: number;
  if (globalSupply < 10_000_000) earnMultiplier = 1.00;
  else if (globalSupply < 50_000_000) earnMultiplier = 0.75;
  else if (globalSupply < 200_000_000) earnMultiplier = 0.50;
  else earnMultiplier = 0.25;

  // Tüm sunuculara uygula
  await supabase
    .from('servers')
    .update({ earn_multiplier_override: earnMultiplier })
    .eq('is_setup', true);

  console.log(t('cron_halving_success_log', { globalSupply: globalSupply.toLocaleString(), earnMultiplier }));
}

async function updateFounderVesting() {
  if (await isGlobalFrozen()) return;

  const { data: listings } = await supabase
    .from('server_listings')
    .select('guild_id, founder_lots, founder_vesting_start, founder_vested_lots')
    .eq('status', 'approved')
    .not('founder_vesting_start', 'is', null);

  if (!listings?.length) return;

  const now = new Date();

  for (const listing of listings) {
    const vestingStart = new Date(listing.founder_vesting_start);
    const daysSinceVesting = (now.getTime() - vestingStart.getTime()) / (1000 * 86400);

    // 30 gün cliff
    if (daysSinceVesting < 30) continue;

    // Her ay (30 gün) %10 açılır
    const monthsVested = Math.floor((daysSinceVesting - 30) / 30) + 1; // cliff sonrası 1. ay
    const vestedRatio = Math.min(monthsVested * 0.10, 1.0);
    const vestedLots = Math.floor(listing.founder_lots * vestedRatio);

    if (vestedLots <= listing.founder_vested_lots) continue; // zaten güncellendi

    await supabase
      .from('server_listings')
      .update({ founder_vested_lots: vestedLots })
      .eq('guild_id', listing.guild_id);
  }

  console.log(t('cron_vesting_success_log', { listingCount: listings.length }));
}

async function expireOldOrders() {
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from('market_orders')
    .select('id, user_id, guild_id, type, remaining_lots, price_per_lot')
    .in('status', ['open', 'partial'])
    .lt('expires_at', now);

  if (!expired?.length) return;

  for (const ord of expired) {
    await supabase.from('market_orders').update({ status: 'expired' }).eq('id', ord.id);

    if (ord.type === 'buy') {
      const refund = ord.remaining_lots * ord.price_per_lot;
      const { data: w } = await supabase
        .from('member_wallets')
        .select('reserved_balance')
        .eq('guild_id', ord.guild_id)
        .eq('user_id', ord.user_id)
        .maybeSingle();

      await supabase.from('member_wallets').update({
        reserved_balance: Math.max(0, (w?.reserved_balance ?? 0) - refund),
      }).eq('guild_id', ord.guild_id).eq('user_id', ord.user_id);
    }
  }

  console.log(t('cron_orders_expired_log', { orderCount: expired.length }));
}

// Ana çalıştırıcı
(async () => {
  console.log(t('cron_papel_started', { timestamp: new Date().toISOString() }));
  await Promise.all([
    updatePapelValues(),
    updateHalving(),
    updateFounderVesting(),
    expireOldOrders(),
  ]);
  console.log(t('cron_papel_completed'));
})();
