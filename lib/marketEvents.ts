/**
 * marketEvents.ts
 * Borsa olayı üretme ve headline oluşturma yardımcıları.
 * Trade endpoint'inde, bot cron'larında çağrılır.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type MarketEventType =
  | 'big_buy'
  | 'big_sell'
  | 'full_exit'
  | 'ath'
  | 'ipo_launch'
  | 'delist_warning'
  | 'delist'
  | 'treasury_support'
  | 'dividend_paid'
  | 'held_through_dip'
  | 'big_winner'
  | 'market_recovery'
  | 'price_crash';

type EventMeta = {
  lot_count?: number;
  price?: number;
  pct?: number;
  mari?: number;
  server_name?: string;
  [key: string]: unknown;
};

// ── Headline şablonları ────────────────────────────────────────────────────────
// Her event tipinde birden fazla şablon var, rastgele biri seçilir.

const TEMPLATES: Record<MarketEventType, ((meta: EventMeta, actor: string) => string)[]> = {
  big_buy: [
    (m, a) => `${a} düşüşlere inat ${m.lot_count?.toLocaleString()} lot biriktirdi 🐂`,
    (m, a) => `Cesur bir hamle: ${a} piyasa dalgalanmasında ${m.lot_count?.toLocaleString()} lot kapattı`,
    (m, a) => `${a} bugün ${m.lot_count?.toLocaleString()} lot alarak büyük bir pozisyon açtı`,
    (m, a) => `Kimse sormadı ama ${a} yine de ${m.lot_count?.toLocaleString()} lot aldı 🤝`,
  ],
  big_sell: [
    (m, a) => `${a} kar realizasyonu yaptı — ${m.lot_count?.toLocaleString()} lot piyasaya sürüldü`,
    (m, a) => `${a} masadan kalktı: ${m.lot_count?.toLocaleString()} lot satışı gerçekleşti`,
    (m, a) => `Sert bir çıkış: ${a} ${m.lot_count?.toLocaleString()} lot sattı`,
  ],
  full_exit: [
    (m, a) => `💼 ${a} tüm pozisyonunu kapattı — ${m.server_name ?? 'sunucu'}'daki tüm mal varlığını çekti`,
    (m, a) => `${a} ile ${m.server_name ?? 'sunucu'} arasındaki ortaklık sona erdi`,
    (m, a) => `Dramatik ayrılık: ${a} ${m.server_name ?? 'sunucu'} hisselerini tamamen tasfiye etti`,
    (m, a) => `İçeriden haber: ${a} ve ${m.server_name ?? 'sunucu'} anlaşamadı, tüm varlıklar çekildi 🚪`,
  ],
  ath: [
    (m) => `🚀 ${m.server_name ?? 'Sunucu'} tarihinin en yüksek fiyatına ulaştı! ${m.price?.toFixed(2)} MRI`,
    (m) => `Tüm zamanların rekoru kırıldı — ${m.server_name ?? 'Sunucu'} ${m.price?.toFixed(2)} MRI'yi gördü`,
    (m) => `📈 ${m.server_name ?? 'Sunucu'} ATH'da: ${m.price?.toFixed(2)} MRI/lot`,
  ],
  ipo_launch: [
    (m) => `🔔 Yeni halka arz: ${m.server_name ?? 'Bir sunucu'} bugün borsaya açıldı — ${m.price?.toFixed(2)} MRI/lot`,
    (m) => `${m.server_name ?? 'Yeni bir sunucu'} yatırımcılarla buluşuyor! IPO fiyatı: ${m.price?.toFixed(2)} MRI`,
    (m) => `Piyasaya merhaba: ${m.server_name ?? 'Sunucu'} halka arz edildi 🎉`,
  ],
  delist_warning: [
    (m) => `⚠️ ${m.server_name ?? 'Sunucu'} tehlike bölgesinde — fiyat ${m.pct?.toFixed(0)}% düşüşle eşik altında`,
    (m) => `Alarm: ${m.server_name ?? 'Sunucu'} ${m.pct?.toFixed(0)}% değer kaybıyla delist sınırına yaklaştı`,
    (m) => `${m.server_name ?? 'Sunucu'} yatırımcıları gergin — fiyat kritik eşiğin altında`,
  ],
  delist: [
    (m) => `🔴 ${m.server_name ?? 'Sunucu'} borsadan çıkarıldı — tüm yatırımcılara tazminat ödendi`,
    (m) => `Üzücü son: ${m.server_name ?? 'Sunucu'} delist edildi, lot sahipleri tazminat aldı`,
  ],
  treasury_support: [
    (m) => `🏦 ${m.server_name ?? 'Sunucu'} hazinesi devreye girdi — ${m.lot_count?.toLocaleString()} lot alındı, fiyat desteklendi`,
    (m) => `Savunma hattı: ${m.server_name ?? 'Sunucu'} hazinesi fiyat düşüşünü ${m.lot_count?.toLocaleString()} lot alımıyla durdurdu`,
    (m) => `${m.server_name ?? 'Sunucu'} hazinesi ${m.lot_count?.toLocaleString()} lot alarak piyasaya güven mesajı verdi`,
  ],
  dividend_paid: [
    (m) => `💰 Haftalık temettü dağıtıldı — ${m.server_name ?? 'sunucu'} lot sahipleri toplam ${m.mari?.toFixed(2)} MRI kazandı`,
    (m) => `${m.server_name ?? 'Sunucu'} yatırımcıları bu hafta da kazandı: ${m.mari?.toFixed(2)} MRI temettü ödendi`,
    (m) => `🎁 Pasif gelir günü: ${m.server_name ?? 'Sunucu'}'da ${m.mari?.toFixed(2)} MRI temettü dağıtıldı`,
  ],
  held_through_dip: [
    (m, a) => `Demir eller kazandı — ${a} ${m.pct?.toFixed(1)}% düşüşe direndi ve bugün ${m.pct?.toFixed(1)}% karda kapattı 💪`,
    (m, a) => `${a} paniklemedi, bekledi, kazandı. ${m.pct?.toFixed(1)}% değer artışı cebe girdi`,
    (m, a) => `Sabır bir erdem: ${a} günün sonunda ${m.mari?.toFixed(2)} MRI richer 🧘`,
  ],
  big_winner: [
    (m, a) => `🏆 Günün kazananı: ${a} bugün ${m.mari?.toFixed(2)} MRI kar etti`,
    (m, a) => `Portfolyo gülüyor — ${a} doğru zamanda doğru hamlelerle ${m.mari?.toFixed(2)} MRI kazandı`,
  ],
  market_recovery: [
    (m) => `💹 ${m.server_name ?? 'Piyasa'} dipten döndü — ${m.pct?.toFixed(1)}% toparlanma kaydedildi`,
    (m) => `${m.server_name ?? 'Sunucu'} ayağa kalktı: ${m.pct?.toFixed(1)}% günlük yükseliş`,
  ],
  price_crash: [
    (m) => `📉 ${m.server_name ?? 'Sunucu'}'da sert satış: ${m.pct?.toFixed(1)}% günlük düşüş`,
    (m) => `Kırmızı gün: ${m.server_name ?? 'Sunucu'} ${m.pct?.toFixed(1)}% değer kaybetti`,
  ],
};

// Actor adını anonim/gizli göster: "ali***" veya "Cesur Bir Yatırımcı"
const ANONYMOUS_ACTORS = [
  'Gizemli bir yatırımcı',
  'Büyük bir aktör',
  'Cesur bir hamle yapan isim',
  'Piyasanın demir eli',
  'Stratejik bir yatırımcı',
  'Sinirler çelik olan biri',
];

export const formatActor = (userId: string | null, username?: string | null): string => {
  if (!username) {
    // Rastgele anonim isim
    return ANONYMOUS_ACTORS[Math.floor(Math.random() * ANONYMOUS_ACTORS.length)];
  }
  // İlk 3 karakter + ***
  return `@${username.slice(0, 3)}***`;
};

export const generateHeadline = (
  eventType: MarketEventType,
  meta: EventMeta,
  actorDisplay: string,
): string => {
  const templates = TEMPLATES[eventType];
  if (!templates || templates.length === 0) return `${eventType} event`;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(meta, actorDisplay);
};

// ── Event insert yardımcısı ───────────────────────────────────────────────────

export const insertMarketEvent = async (
  supabase: SupabaseClient,
  params: {
    eventType: MarketEventType;
    guildId?: string | null;
    actorId?: string | null;
    actorUsername?: string | null;
    meta?: EventMeta;
    body?: string;
  },
): Promise<void> => {
  const actor = formatActor(params.actorId ?? null, params.actorUsername ?? null);
  const headline = generateHeadline(params.eventType, params.meta ?? {}, actor);

  await supabase.from('market_events').insert({
    event_type: params.eventType,
    guild_id: params.guildId ?? null,
    actor_id: params.actorId ?? null,
    headline,
    body: params.body ?? null,
    metadata: params.meta ?? null,
  });
};

// ── Eşik sabitleri (trade endpoint'inde kullanılır) ───────────────────────────
export const BIG_TRADE_LOT_THRESHOLD = 1000;   // 1000+ lot → big_buy / big_sell
export const FULL_EXIT_REMAINING = 0;           // 0 lot kalırsa → full_exit
export const PRICE_CHANGE_EVENT_PCT = 5;        // %5+ günlük değişim → crash/recovery event
