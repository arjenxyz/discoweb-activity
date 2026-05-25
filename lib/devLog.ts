/**
 * Web API'lerinden Discord log kanallarına embed gönderici.
 * Kanal ID'leri Supabase app_config tablosundan okunur.
 * Bot token ile Discord REST API kullanılır.
 */

import { createClient } from '@supabase/supabase-js';

// Simple translation function for dev log library
const t = (key: string, params?: Record<string, string | number>): string => {
  const translations: Record<string, string> = {
    'devlog_treasury_title': '💰 Hazineye Kesinti',
    'devlog_server': 'Sunucu',
    'devlog_spender': 'Harcayan',
    'devlog_spending': 'Harcama',
    'devlog_to_treasury': 'Hazineye',
    'devlog_burned': 'Yakılan',
    'devlog_code': 'Kod',
    'devlog_user': 'Kullanan',
    'devlog_economy_app_title': '🔵 Yüksek Ekonomi Başvurusu',
    'devlog_applicant': 'Başvuran',
    'devlog_starter_package': 'Başlangıç Paketi',
    'devlog_application_id': 'Başvuru ID: {id}',
    'devlog_ipo_title': '📈 IPO Başvurusu',
    'devlog_offered_price': 'Önerilen Fiyat',
    'devlog_founder_ratio': 'Founder Oranı',
    'devlog_trade_executed': '🔄 Trade Gerçekleşti',
    'devlog_lots': 'Lot',
    'devlog_price': 'Fiyat',
    'devlog_total': 'Toplam',
    'devlog_commission': 'Komisyon',
    'devlog_buyer': 'Alıcı',
    'devlog_seller': 'Satıcı',
    'devlog_big_order': '🐋 Büyük {type} Emri',
    'devlog_buy': 'Alış',
    'devlog_sell': 'Satış',
    'devlog_wash_trading': '🚨 Wash Trading Engellendi',
    'devlog_circuit_breaker_title': '⚡ Circuit Breaker Tetiklendi',
    'devlog_current_price': 'Güncel Fiyat',
    'devlog_24h_drop': '24s Düşüş',
    'devlog_ends': 'Bitiş',
    'devlog_warning': '⚠️ Uyarı',
    'devlog_fine': '💸 Para Cezası',
    'devlog_suspension': '🔒 Askıya Alma',
    'devlog_delist': '❌ Delist',
    'devlog_applied': 'Uygulandı',
    'devlog_issuer': 'Veren',
    'devlog_reason': 'Gerekçe',
    'devlog_not_specified': 'Belirtilmedi',
    'devlog_confiscated': 'Yakılan',
    'devlog_triggered_by': 'İşlemi Yapan',
    'devlog_global_freeze_activated': '🧊 Global Freeze Aktive Edildi',
    'devlog_global_freeze_deactivated': '✅ Global Freeze Kaldırıldı'
  };
  
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      result = result.replace(new RegExp(`{${param}}`, 'g'), String(value));
    });
  }
  return result;
};

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
};

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN ?? '';

// Kanal cache (process lifecycle boyunca)
const channelCache: Record<string, string> = {};
let cacheLoaded = false;

async function loadChannelCache() {
  if (cacheLoaded) return;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await supabase
    .from('app_config')
    .select('key, value')
    .like('key', 'log_channel_%');
  for (const row of data ?? []) {
    channelCache[row.key.replace('log_channel_', '')] = row.value;
  }
  cacheLoaded = true;
}

export async function devLog(channelKey: string, embed: Embed): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await loadChannelCache();
    const channelId = channelCache[channelKey];
    if (!channelId) return;
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch { /* log başarısız olsa da ana işlem etkilenmesin */ }
}

// ─── Hazır embed'ler ─────────────────────────────────────────────────────────

export const DevLogEmbeds = {
  hazineGiris(guildId: string, userId: string, totalSpent: number, treasuryAmount: number, burnAmount: number): Embed {
    return {
      title: t('devlog_treasury_title'),
      color: 0x57F287,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_spender'), value: `<@${userId}>`, inline: true },
        { name: t('devlog_spending'), value: `${totalSpent.toLocaleString()} Papel`, inline: true },
        { name: t('devlog_to_treasury'), value: `+${treasuryAmount.toLocaleString()} Papel`, inline: true },
        { name: t('devlog_burned'), value: `🔥 ${burnAmount.toLocaleString()} Papel`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  ekonomiBasvuru(guildId: string, applicantId: string, starterPackage: number, applicationId: string): Embed {
    return {
      title: t('devlog_economy_app_title'),
      color: 0x5865F2,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_applicant'), value: `<@${applicantId}>`, inline: true },
        { name: t('devlog_starter_package'), value: `${starterPackage.toLocaleString()} Papel`, inline: true },
      ],
      footer: { text: t('devlog_application_id', { id: applicationId }) },
      timestamp: new Date().toISOString(),
    };
  },

  ipoBasvuru(guildId: string, applicantId: string, price: number, founderRatio: number, applicationId: string): Embed {
    return {
      title: t('devlog_ipo_title'),
      color: 0x5865F2,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_applicant'), value: `<@${applicantId}>`, inline: true },
        { name: t('devlog_offered_price'), value: `${price.toLocaleString()} Papel/lot`, inline: true },
        { name: t('devlog_founder_ratio'), value: `%${Math.round(founderRatio * 100)}`, inline: true },
      ],
      footer: { text: t('devlog_application_id', { id: applicationId }) },
      timestamp: new Date().toISOString(),
    };
  },

  trade(guildId: string, buyerUserId: string, sellerUserId: string, lotCount: number, pricePerLot: number, totalAmount: number, platformFee: number): Embed {
    return {
      title: t('devlog_trade_executed'),
      color: 0x00B0F4,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_lots'), value: lotCount.toLocaleString(), inline: true },
        { name: t('devlog_price'), value: `${pricePerLot.toLocaleString()} P/lot`, inline: true },
        { name: t('devlog_total'), value: `${totalAmount.toLocaleString()} Papel`, inline: true },
        { name: t('devlog_commission'), value: `${platformFee.toLocaleString()} Papel`, inline: true },
        { name: t('devlog_buyer'), value: `<@${buyerUserId}>`, inline: true },
        { name: t('devlog_seller'), value: `<@${sellerUserId}>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  buyukIslem(guildId: string, userId: string, type: string, lotCount: number, totalAmount: number): Embed {
    return {
      title: t('devlog_big_order', { type: type === 'buy' ? t('devlog_buy') : t('devlog_sell') }),
      color: 0xFEE75C,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_user'), value: `<@${userId}>`, inline: true },
        { name: t('devlog_lots'), value: lotCount.toLocaleString(), inline: true },
        { name: t('devlog_total'), value: `${totalAmount.toLocaleString()} Papel`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  suphe(guildId: string, buyerUserId: string, sellerUserId: string): Embed {
    return {
      title: t('devlog_wash_trading'),
      color: 0xED4245,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_buyer'), value: `<@${buyerUserId}>`, inline: true },
        { name: t('devlog_seller'), value: `<@${sellerUserId}>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  circuitBreaker(guildId: string, marketPrice: number, dropPct: number, until: string): Embed {
    return {
      title: t('devlog_circuit_breaker_title'),
      color: 0xFFA500,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_current_price'), value: `${marketPrice.toLocaleString()} Papel`, inline: true },
        { name: t('devlog_24h_drop'), value: `%${dropPct.toFixed(1)}`, inline: true },
        { name: t('devlog_ends'), value: `<t:${Math.floor(new Date(until).getTime() / 1000)}:R>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  ceza(guildId: string, type: string, reason: string, issuedBy: string, fineAmount?: number): Embed {
    const labels: Record<string, string> = { warning: t('devlog_warning'), fine: t('devlog_fine'), suspension: t('devlog_suspension'), delist: t('devlog_delist') };
    const colors: Record<string, number> = { warning: 0xFEE75C, fine: 0xFFA500, suspension: 0xED4245, delist: 0x2C2F33 };
    return {
      title: `${labels[type] ?? type} ${t('devlog_applied')}`,
      color: colors[type] ?? 0xED4245,
      fields: [
        { name: t('devlog_server'), value: `\`${guildId}\``, inline: true },
        { name: t('devlog_issuer'), value: `<@${issuedBy}>`, inline: true },
        { name: t('devlog_reason'), value: reason || t('devlog_not_specified'), inline: false },
        ...(fineAmount ? [{ name: t('devlog_confiscated'), value: `${fineAmount.toLocaleString()} Papel`, inline: true }] : []),
      ],
      timestamp: new Date().toISOString(),
    };
  },

  freeze(active: boolean, triggeredBy?: string): Embed {
    return {
      title: active ? t('devlog_global_freeze_activated') : t('devlog_global_freeze_deactivated'),
      color: active ? 0xED4245 : 0x57F287,
      fields: triggeredBy ? [{ name: t('devlog_triggered_by'), value: `<@${triggeredBy}>`, inline: true }] : [],
      timestamp: new Date().toISOString(),
    };
  },
};
