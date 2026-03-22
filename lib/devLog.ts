/**
 * Web API'lerinden Discord log kanallarına embed gönderici.
 * Kanal ID'leri Supabase app_config tablosundan okunur.
 * Bot token ile Discord REST API kullanılır.
 */

import { createClient } from '@supabase/supabase-js';

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
      title: '💰 Hazineye Kesinti',
      color: 0x57F287,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Harcayan', value: `<@${userId}>`, inline: true },
        { name: 'Harcama', value: `${totalSpent.toLocaleString()} Papel`, inline: true },
        { name: 'Hazineye', value: `+${treasuryAmount.toLocaleString()} Papel`, inline: true },
        { name: 'Yakılan', value: `🔥 ${burnAmount.toLocaleString()} Papel`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  referralAktivasyon(guildId: string, referrerId: string, referredId: string, code: string): Embed {
    return {
      title: '🔗 Referral Aktive Edildi',
      color: 0x00B0F4,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Davet Eden', value: `<@${referrerId}>`, inline: true },
        { name: 'Davet Edilen', value: `<@${referredId}>`, inline: true },
        { name: 'Kod', value: `\`${code}\``, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  referralKodKullanildi(guildId: string, userId: string, code: string): Embed {
    return {
      title: '🔗 Referral Kodu Kullanıldı',
      color: 0x5865F2,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Kullanan', value: `<@${userId}>`, inline: true },
        { name: 'Kod', value: `\`${code}\``, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  ekonomiBasvuru(guildId: string, applicantId: string, starterPackage: number, applicationId: string): Embed {
    return {
      title: '🔵 Yüksek Ekonomi Başvurusu',
      color: 0x5865F2,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Başvuran', value: `<@${applicantId}>`, inline: true },
        { name: 'Başlangıç Paketi', value: `${starterPackage.toLocaleString()} Papel`, inline: true },
      ],
      footer: { text: `Başvuru ID: ${applicationId}` },
      timestamp: new Date().toISOString(),
    };
  },

  ipoBasvuru(guildId: string, applicantId: string, price: number, founderRatio: number, applicationId: string): Embed {
    return {
      title: '📈 IPO Başvurusu',
      color: 0x5865F2,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Başvuran', value: `<@${applicantId}>`, inline: true },
        { name: 'Önerilen Fiyat', value: `${price.toLocaleString()} Papel/lot`, inline: true },
        { name: 'Founder Oranı', value: `%${Math.round(founderRatio * 100)}`, inline: true },
      ],
      footer: { text: `Başvuru ID: ${applicationId}` },
      timestamp: new Date().toISOString(),
    };
  },

  trade(guildId: string, buyerUserId: string, sellerUserId: string, lotCount: number, pricePerLot: number, totalAmount: number, platformFee: number): Embed {
    return {
      title: '🔄 Trade Gerçekleşti',
      color: 0x00B0F4,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Lot', value: lotCount.toLocaleString(), inline: true },
        { name: 'Fiyat', value: `${pricePerLot.toLocaleString()} P/lot`, inline: true },
        { name: 'Toplam', value: `${totalAmount.toLocaleString()} Papel`, inline: true },
        { name: 'Komisyon', value: `${platformFee.toLocaleString()} Papel`, inline: true },
        { name: 'Alıcı', value: `<@${buyerUserId}>`, inline: true },
        { name: 'Satıcı', value: `<@${sellerUserId}>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  buyukIslem(guildId: string, userId: string, type: string, lotCount: number, totalAmount: number): Embed {
    return {
      title: `🐋 Büyük ${type === 'buy' ? 'Alış' : 'Satış'} Emri`,
      color: 0xFEE75C,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Kullanıcı', value: `<@${userId}>`, inline: true },
        { name: 'Lot', value: lotCount.toLocaleString(), inline: true },
        { name: 'Toplam', value: `${totalAmount.toLocaleString()} Papel`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  suphe(guildId: string, buyerUserId: string, sellerUserId: string): Embed {
    return {
      title: '🚨 Wash Trading Engellendi',
      color: 0xED4245,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Alıcı', value: `<@${buyerUserId}>`, inline: true },
        { name: 'Satıcı', value: `<@${sellerUserId}>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  circuitBreaker(guildId: string, marketPrice: number, dropPct: number, until: string): Embed {
    return {
      title: '⚡ Circuit Breaker Tetiklendi',
      color: 0xFFA500,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Güncel Fiyat', value: `${marketPrice.toLocaleString()} Papel`, inline: true },
        { name: '24s Düşüş', value: `%${dropPct.toFixed(1)}`, inline: true },
        { name: 'Bitiş', value: `<t:${Math.floor(new Date(until).getTime() / 1000)}:R>`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
  },

  ceza(guildId: string, type: string, reason: string, issuedBy: string, fineAmount?: number): Embed {
    const labels: Record<string, string> = { warning: '⚠️ Uyarı', fine: '💸 Para Cezası', suspension: '🔒 Askıya Alma', delist: '❌ Delist' };
    const colors: Record<string, number> = { warning: 0xFEE75C, fine: 0xFFA500, suspension: 0xED4245, delist: 0x2C2F33 };
    return {
      title: `${labels[type] ?? type} Uygulandı`,
      color: colors[type] ?? 0xED4245,
      fields: [
        { name: 'Sunucu', value: `\`${guildId}\``, inline: true },
        { name: 'Veren', value: `<@${issuedBy}>`, inline: true },
        { name: 'Gerekçe', value: reason || 'Belirtilmedi', inline: false },
        ...(fineAmount ? [{ name: 'Yakılan', value: `${fineAmount.toLocaleString()} Papel`, inline: true }] : []),
      ],
      timestamp: new Date().toISOString(),
    };
  },

  freeze(active: boolean, triggeredBy?: string): Embed {
    return {
      title: active ? '🧊 Global Freeze Aktive Edildi' : '✅ Global Freeze Kaldırıldı',
      color: active ? 0xED4245 : 0x57F287,
      fields: triggeredBy ? [{ name: 'İşlemi Yapan', value: `<@${triggeredBy}>`, inline: true }] : [],
      timestamp: new Date().toISOString(),
    };
  },
};
