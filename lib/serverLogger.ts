import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type LogPayload = {
  event: string;
  status?: string;
  userId?: string;
  guildId?: string;
  roleId?: string;
  metadata?: Record<string, unknown>;
};

type WebhookTarget = {
  name: string;
  url: string;
};

type UserLogChannelKey =
  | 'user_main'
  | 'user_auth'
  | 'user_roles'
  | 'user_exchange'
  | 'user_store';

type AdminLogChannelKey =
  | 'admin_main'
  | 'admin_wallet'
  | 'admin_store'
  | 'admin_notifications'
  | 'admin_settings';

type LogChannelKey = UserLogChannelKey | AdminLogChannelKey;

type LegacyLogChannelKey =
  | 'main'
  | 'auth'
  | 'roles'
  | 'suspicious'
  | 'store'
  | 'wallet'
  | 'notifications'
  | 'settings'
  | 'admin'
  | 'system';

type EmbedField    = { name: string; value: string; inline?: boolean };
type EmbedAuthor   = { name: string; icon_url?: string; url?: string };
type EmbedFooter   = { text: string; icon_url?: string };
type EmbedThumbnail = { url: string };

type DiscordEmbed = {
  author?:      EmbedAuthor;
  title?:       string;
  url?:         string;
  description?: string;
  color?:       number;
  fields?:      EmbedField[];
  thumbnail?:   EmbedThumbnail;
  footer?:      EmbedFooter;
  timestamp?:   string;
};

type DiscordComponent = {
  type: 1;
  components: Array<{
    type: 2;
    style: 5;
    label: string;
    url: string;
    emoji?: { name: string };
  }>;
};

type LogChannelConfigRow = {
  channel_type: LogChannelKey | LegacyLogChannelKey | string;
  webhook_url: string;
  is_active: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────

const getServerSupabase = () => {
  const supabaseUrl    = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const getRequestIp = (request: Request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') ?? null;
};

const str = (meta: Record<string, unknown>, key: string): string | null => {
  const v = meta[key];
  return v === undefined || v === null || v === '' ? null : String(v);
};

const formatUser  = (id?: string | null) => (id ? `<@${id}>` : '—');
const formatRole  = (id?: string | null) => (id ? `<@&${id}>` : '—');
const formatCoins = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? `**${v.toFixed(2).replace(/\.00$/, '')}** <a:papel:1467470043850735739>`
    : `**${String(v ?? '0')}** <a:papel:1467470043850735739>`;

const ts = (date: Date = new Date()) => `<t:${Math.floor(date.getTime() / 1000)}:F>`;
const trunc = (s: string, n = 1024) => (s.length > n ? s.slice(0, n - 3) + '...' : s);

const humanizeEvent = (event: string) =>
  event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL KEY
// ─────────────────────────────────────────────────────────────────────────────

const normalizeChannelKey = (value: string): LogChannelKey | null => {
  switch (value) {
    case 'user_main': case 'user_auth': case 'user_roles':
    case 'user_exchange': case 'user_store':
    case 'admin_main': case 'admin_wallet': case 'admin_store':
    case 'admin_notifications': case 'admin_settings':
      return value as LogChannelKey;
    case 'main':          return 'user_main';
    case 'auth':          return 'user_auth';
    case 'roles':         return 'user_roles';
    case 'store':         return 'user_store';
    case 'wallet':        return 'admin_wallet';
    case 'notifications': return 'admin_notifications';
    case 'settings':      return 'admin_settings';
    case 'admin':         return 'admin_main';
    case 'system': case 'suspicious': return 'admin_main';
    default:              return null;
  }
};

const isSuspiciousEvent = (payload: LogPayload): boolean => {
  const s = (payload.status ?? '').toLowerCase();
  const e = payload.event.toLowerCase();
  return (
    s.includes('failed') || s.includes('missing') ||
    s.includes('unauthorized') || s.includes('error') ||
    e.includes('failed') || e.includes('unauthorized')
  );
};

const resolveEventChannel = (payload: LogPayload): LogChannelKey => {
  const event = payload.event.toLowerCase();
  const hasAdminPrefix = event.startsWith('admin_');
  const isSuspect = isSuspiciousEvent(payload);

  if (isSuspect) return hasAdminPrefix ? 'admin_main' : 'user_main';

  if (hasAdminPrefix) {
    if (event.startsWith('admin_wallet'))       return 'admin_wallet';
    if (event.startsWith('admin_notification')) return 'admin_notifications';
    if (event.startsWith('admin_settings') || event.startsWith('admin_log_channels'))
      return 'admin_settings';
    if (
      event.startsWith('admin_store')    ||
      event.startsWith('admin_promo')    ||
      event.startsWith('admin_order')    ||
      event.startsWith('admin_discount')
    ) return 'admin_store';
    return 'admin_main';
  }

  if (event.startsWith('store_'))                                        return 'user_store';
  if (event.includes('exchange'))                                        return 'user_exchange';
  if (event.includes('role_check') || event.includes('role_assign') || event.includes('role_assigned'))
    return 'user_roles';
  if (event.includes('auth') || event.includes('login') || event.includes('verify') || event.includes('callback'))
    return 'user_auth';

  return 'user_main';
};

// ─────────────────────────────────────────────────────────────────────────────
// RENK PALETİ
// ─────────────────────────────────────────────────────────────────────────────

const COLORS: Record<LogChannelKey, number> = {
  user_main:            0x5865F2, // Discord Blurple
  user_auth:            0x1ABC9C, // Teal
  user_roles:           0x9B59B6, // Mor
  user_exchange:        0x3498DB, // Mavi
  user_store:           0x57F287, // Yeşil
  admin_main:           0xE67E22, // Turuncu
  admin_wallet:         0xF1C40F, // Altın
  admin_store:          0x27AE60, // Koyu Yeşil
  admin_notifications:  0x2980B9, // Koyu Mavi
  admin_settings:       0x95A5A6, // Gri
};

const ERROR_COLOR = 0xED4245;

const resolveColor = (payload: LogPayload): number => {
  if (isSuspiciousEvent(payload)) return ERROR_COLOR;
  return COLORS[resolveEventChannel(payload)] ?? COLORS.user_main;
};

// ─────────────────────────────────────────────────────────────────────────────
// KANAL ETİKETLERİ
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<LogChannelKey, string> = {
  user_main:           '🌐 Web · Genel',
  user_auth:           '🔐 Web · Kimlik Doğrulama',
  user_roles:          '🎭 Web · Roller',
  user_exchange:       '🔄 Web · Exchange',
  user_store:          '🛒 Web · Mağaza',
  admin_main:          '⚡ Admin · Genel',
  admin_wallet:        '💰 Admin · Cüzdan',
  admin_store:         '📦 Admin · Mağaza / Sipariş',
  admin_notifications: '📬 Admin · Bildirimler',
  admin_settings:      '⚙️ Admin · Ayarlar',
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTOR / TARGET ÇÖZÜMLEYICI
// ─────────────────────────────────────────────────────────────────────────────

const resolveActorDisplay = (payload: LogPayload): string => {
  const m = payload.metadata ?? {};
  const name =
    str(m, 'actorName') || str(m, 'adminName') ||
    str(m, 'userName')  || str(m, 'username');
  return name || (payload.userId ? `<@${payload.userId}>` : 'Bilinmiyor');
};

const resolveActorAvatarUrl = (payload: LogPayload): string | null => {
  const m = payload.metadata ?? {};
  return str(m, 'actorAvatarUrl') || str(m, 'avatarUrl') || str(m, 'adminAvatarUrl') || null;
};

const resolveTargetDisplay = (payload: LogPayload): string | null => {
  const m  = payload.metadata ?? {};
  const name = str(m, 'targetUserName') || str(m, 'targetUsername');
  const id   = str(m, 'targetUserId');
  return name || (id ? `<@${id}>` : null);
};

const resolveTargetId = (payload: LogPayload): string | null =>
  str(payload.metadata ?? {}, 'targetUserId') ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// EMBED BUILDER — FIELDS
// ─────────────────────────────────────────────────────────────────────────────

const adminHeader = (payload: LogPayload, action?: string): EmbedField[] => [
  { name: '👑 Yetkili', value: formatUser(payload.userId), inline: true },
  { name: '🔖 İşlem',  value: action ?? humanizeEvent(payload.event), inline: true },
];

const dateField = (): EmbedField => ({ name: '📅 Tarih', value: ts(), inline: true });

function buildFields(payload: LogPayload): EmbedField[] {
  const m        = payload.metadata ?? {};
  const event    = payload.event.toLowerCase();
  const isSuspect = isSuspiciousEvent(payload);

  // ── Hata / Şüpheli ─────────────────────────────────────────────────────────
  if (isSuspect) {
    const fields: EmbedField[] = [
      { name: '🔖 Olay',     value: humanizeEvent(payload.event),  inline: true  },
      { name: '📋 Durum',    value: payload.status ?? 'Bilinmiyor', inline: true },
    ];
    if (payload.userId)  fields.push({ name: '👤 Kullanıcı',  value: formatUser(payload.userId),  inline: true });
    if (payload.guildId) fields.push({ name: '🏠 Sunucu ID',  value: `\`${payload.guildId}\``,    inline: true });
    const ip = str(m, 'ip') || str(m, 'ipAddress');
    if (ip)  fields.push({ name: '🌐 IP',     value: `\`${ip}\``,    inline: true });
    const ua = str(m, 'userAgent');
    if (ua)  fields.push({ name: '🖥️ UA',    value: trunc(ua, 256), inline: false });
    return fields;
  }

  // ── store_purchase ──────────────────────────────────────────────────────────
  if (event === 'store_purchase') {
    const fields: EmbedField[] = [
      { name: '👤 Üye',        value: formatUser(payload.userId),             inline: true },
      { name: '🎭 Rol',        value: formatRole(payload.roleId),             inline: true },
      { name: '💰 Ödeme',      value: formatCoins(m.price ?? m.amount),      inline: true },
    ];
    const orderId = str(m, 'orderId');
    const title   = str(m, 'title');
    const discount = str(m, 'discount') || str(m, 'discountPercent');
    const balance = m.newBalance ?? m.balance;

    if (title)    fields.push({ name: '📦 Ürün',           value: title,                      inline: true });
    if (orderId)  fields.push({ name: '🆔 Sipariş ID',     value: `\`${orderId}\``,           inline: true });
    if (discount) fields.push({ name: '🏷️ İndirim',       value: `%${discount}`,             inline: true });
    if (balance !== undefined && balance !== null)
      fields.push({ name: '💼 Kalan Bakiye', value: formatCoins(balance), inline: true });
    fields.push(dateField());
    return fields;
  }

  // ── admin_wallet_adjust ─────────────────────────────────────────────────────
  if (event === 'admin_wallet_adjust') {
    const scope   = str(m, 'scope') || 'user';
    const mode    = str(m, 'mode') ?? '—';
    const updated = str(m, 'updatedCount');
    const note    = str(m, 'message') || str(m, 'note');
    const targetId = resolveTargetId(payload);

    const fields: EmbedField[] = [
      ...adminHeader(payload, mode),
      { name: '💰 Tutar',    value: formatCoins(m.amount ?? m.value),        inline: true },
      {
        name: '🎯 Kapsam',
        value: scope === 'all'
          ? `Tüm üyeler${updated ? ` (**${updated}** kişi)` : ''}`
          : (targetId ? formatUser(targetId) : (resolveTargetDisplay(payload) ?? '—')),
        inline: true,
      },
    ];
    if (note) fields.push({ name: '📝 Not', value: trunc(note, 512), inline: false });
    fields.push(dateField());
    return fields;
  }

  // ── admin_order_* ───────────────────────────────────────────────────────────
  if (event.startsWith('admin_order')) {
    const orderId  = str(m, 'orderId');
    const title    = str(m, 'title') || str(m, 'itemTitle');
    const targetId = resolveTargetId(payload);
    const note     = str(m, 'note') || str(m, 'message') || str(m, 'reason');
    const refundAmt = m.refundAmount ?? m.amount;

    const fields: EmbedField[] = [...adminHeader(payload)];
    if (targetId) fields.push({ name: '👤 Üye',       value: formatUser(targetId), inline: true });
    if (orderId)  fields.push({ name: '🆔 Sipariş',   value: `\`${orderId}\``,     inline: true });
    if (title)    fields.push({ name: '📦 Ürün',       value: title,                inline: true });
    if (refundAmt !== undefined && refundAmt !== null)
      fields.push({ name: '💰 İade', value: formatCoins(refundAmt), inline: true });
    if (note) fields.push({ name: '📝 Not', value: trunc(note, 512), inline: false });
    fields.push(dateField());
    return fields;
  }

  // ── admin_discount_* ────────────────────────────────────────────────────────
  if (event.startsWith('admin_discount')) {
    const code      = str(m, 'code');
    const percent   = str(m, 'percent') || str(m, 'discountPercent');
    const maxUses   = str(m, 'maxUses') || str(m, 'limit');
    const expiresAt = str(m, 'expiresAt');
    const note      = str(m, 'note') || str(m, 'message');

    const fields: EmbedField[] = [...adminHeader(payload)];
    if (code)    fields.push({ name: '🔑 Kod',     value: `\`${code}\``,                    inline: true });
    if (percent) fields.push({ name: '🏷️ İndirim', value: `%${percent}`,                    inline: true });
    if (maxUses) fields.push({ name: '🔢 Limit',   value: maxUses,                           inline: true });
    if (expiresAt) {
      const parsed = Date.parse(expiresAt);
      fields.push({ name: '⏰ Son Kullanım', value: Number.isNaN(parsed) ? expiresAt : ts(new Date(parsed)), inline: true });
    }
    if (note) fields.push({ name: '📝 Not', value: trunc(note, 512), inline: false });
    fields.push(dateField());
    return fields;
  }

  // ── admin_notification_* ────────────────────────────────────────────────────
  if (event.startsWith('admin_notification')) {
    const title  = str(m, 'title') || str(m, 'subject');
    const type   = str(m, 'type') || str(m, 'notifType');
    const target = str(m, 'targetUserId');
    const count  = str(m, 'count') || str(m, 'recipientCount');

    const fields: EmbedField[] = [...adminHeader(payload)];
    if (title)  fields.push({ name: '📌 Başlık', value: trunc(title, 256), inline: false });
    if (type)   fields.push({ name: '📂 Tür',    value: type,              inline: true  });
    if (target) fields.push({ name: '👤 Hedef',  value: formatUser(target), inline: true });
    if (count)  fields.push({ name: '👥 Kişi',   value: count,             inline: true  });
    fields.push(dateField());
    return fields;
  }

  // ── admin_store / admin_promo ───────────────────────────────────────────────
  if (event.startsWith('admin_store') || event.startsWith('admin_promo')) {
    const title    = str(m, 'title') || str(m, 'itemTitle');
    const price    = m.price ?? m.amount;
    const roleId   = str(m, 'roleId') ?? payload.roleId;
    const code     = str(m, 'code');
    const percent  = str(m, 'percent');
    const maxUses  = str(m, 'maxUses');
    const note     = str(m, 'note') || str(m, 'message');

    const fields: EmbedField[] = [...adminHeader(payload)];
    if (title)    fields.push({ name: '📦 Ürün',      value: title,              inline: true });
    if (price !== undefined && price !== null)
      fields.push({ name: '💰 Fiyat', value: formatCoins(price), inline: true });
    if (roleId)   fields.push({ name: '🎭 Rol',       value: formatRole(roleId), inline: true });
    if (code)     fields.push({ name: '🔑 Kod',       value: `\`${code}\``,      inline: true });
    if (percent)  fields.push({ name: '🏷️ İndirim',  value: `%${percent}`,      inline: true });
    if (maxUses)  fields.push({ name: '🔢 Limit',     value: maxUses,            inline: true });
    if (note)     fields.push({ name: '📝 Not',       value: trunc(note, 512),   inline: false });
    fields.push(dateField());
    return fields;
  }

  // ── admin_settings / admin_log_channels ────────────────────────────────────
  if (event.startsWith('admin_settings') || event.startsWith('admin_log_channels')) {
    const fields: EmbedField[] = [...adminHeader(payload)];
    const key   = str(m, 'key')   || str(m, 'settingKey');
    const value = str(m, 'value') || str(m, 'settingValue');
    if (key)   fields.push({ name: '🔧 Ayar', value: key,             inline: true });
    if (value) fields.push({ name: '📝 Değer', value: trunc(value, 512), inline: true });
    fields.push(dateField());
    return fields;
  }

  // ── user_auth / exchange / login ────────────────────────────────────────────
  if (event.includes('auth') || event.includes('login') || event.includes('verify') || event.includes('callback') || event.includes('exchange')) {
    const fields: EmbedField[] = [
      { name: '👤 Kullanıcı', value: formatUser(payload.userId),  inline: true },
      { name: '🔖 Olay',     value: humanizeEvent(payload.event), inline: true },
    ];
    if (payload.roleId) fields.push({ name: '🎭 Rol',    value: formatRole(payload.roleId), inline: true });
    const ip = str(m, 'ip') || str(m, 'ipAddress');
    if (ip)  fields.push({ name: '🌐 IP', value: `\`${ip}\``, inline: true });
    const statusCode = str(m, 'statusCode');
    if (statusCode) fields.push({ name: '📡 HTTP', value: statusCode, inline: true });
    fields.push(dateField());
    return fields;
  }

  // ── Genel user eventi ──────────────────────────────────────────────────────
  const fields: EmbedField[] = [
    { name: '👤 Kullanıcı', value: formatUser(payload.userId),  inline: true },
    { name: '🔖 Olay',     value: humanizeEvent(payload.event), inline: true },
  ];
  if (payload.roleId) fields.push({ name: '🎭 Rol',  value: formatRole(payload.roleId), inline: true });
  const target = resolveTargetDisplay(payload);
  if (target) fields.push({ name: '🎯 Hedef', value: target, inline: true });
  const note = str(m, 'note') || str(m, 'message');
  if (note) fields.push({ name: '📝 Not', value: trunc(note, 512), inline: false });
  fields.push({ name: '📅 Tarih', value: ts(), inline: true });
  return fields;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBED BUILDER — BAŞLIK
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TITLES: Record<string, string> = {
  store_purchase:             '🛒 Rol Satın Alındı',
  store_purchase_failed:      '❌ Satın Alma Başarısız',
  admin_wallet_adjust:        '💰 Cüzdan Düzenlendi',
  admin_order_approve:        '✅ Sipariş Onaylandı',
  admin_order_reject:         '❌ Sipariş Reddedildi',
  admin_order_refund:         '↩️ Sipariş İade Edildi',
  admin_store_add:            '➕ Ürün Eklendi',
  admin_store_remove:         '🗑️ Ürün Kaldırıldı',
  admin_discount_create:      '🏷️ İndirim Kodu Oluşturuldu',
  admin_discount_delete:      '🗑️ İndirim Kodu Silindi',
  admin_notification_create:  '📬 Bildirim Gönderildi',
  admin_notification_delete:  '🗑️ Bildirim Silindi',
  admin_promo_create:         '🎁 Promosyon Kodu Oluşturuldu',
  admin_promo_delete:         '🗑️ Promosyon Kodu Silindi',
  admin_settings_update:      '⚙️ Ayarlar Güncellendi',
  admin_log_channels_update:  '📡 Log Kanalları Güncellendi',
  auth_login:                 '🔐 Giriş Yapıldı',
  auth_logout:                '🚪 Çıkış Yapıldı',
  auth_failed:                '⚠️ Giriş Başarısız',
  auth_callback:              '🔄 OAuth Tamamlandı',
  exchange_success:           '🔄 Exchange Başarılı',
  exchange_failed:            '❌ Exchange Başarısız',
  role_assigned:              '🎭 Rol Atandı',
  role_check_failed:          '⚠️ Rol Kontrolü Başarısız',
  promo_redeem:               '🎁 Promosyon Kullanıldı',
  promo_redeem_failed:        '❌ Promosyon Kullanımı Başarısız',
};

const resolveTitle = (payload: LogPayload): string =>
  EVENT_TITLES[payload.event] ?? humanizeEvent(payload.event);

// ─────────────────────────────────────────────────────────────────────────────
// EMBED BUILDER — BUTONLAR (webhook = yalnızca link buton)
// ─────────────────────────────────────────────────────────────────────────────

function buildComponents(payload: LogPayload): DiscordComponent[] {
  const m      = payload.metadata ?? {};
  const buttons: Array<{ label: string; url: string; emoji?: string }> = [];

  // Kullanıcı profil butonu
  const uid = payload.userId;
  if (uid) buttons.push({ label: 'Kullanıcı', url: `https://discord.com/users/${uid}`, emoji: '👤' });

  // Hedef kullanıcı butonu
  const targetId = resolveTargetId(payload);
  if (targetId && targetId !== uid)
    buttons.push({ label: 'Hedef Üye', url: `https://discord.com/users/${targetId}`, emoji: '🎯' });

  // Sipariş butonu (eğer dashboard URL varsa)
  const orderId = str(m, 'orderId');
  const webUrl  = process.env.NEXT_PUBLIC_WEB_URL || process.env.WEB_URL;
  if (orderId && webUrl)
    buttons.push({ label: `Sipariş #${orderId}`, url: `${webUrl}/dashboard/orders`, emoji: '📦' });

  if (buttons.length === 0) return [];

  return [{
    type: 1,
    components: buttons.slice(0, 5).map((b) => ({
      type:    2 as const,
      style:   5 as const,
      label:   b.label,
      url:     b.url,
      ...(b.emoji ? { emoji: { name: b.emoji } } : {}),
    })),
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBED BUILDER — MASTER
// ─────────────────────────────────────────────────────────────────────────────

const buildEmbedAndComponents = (
  payload: LogPayload,
): { embed: DiscordEmbed; components: DiscordComponent[] } => {
  const channelType    = resolveEventChannel(payload);
  const actorAvatarUrl = resolveActorAvatarUrl(payload);
  const actorDisplay   = resolveActorDisplay(payload);
  const isSuspect      = isSuspiciousEvent(payload);

  const embed: DiscordEmbed = {
    author: {
      name:     actorDisplay,
      icon_url: actorAvatarUrl ?? undefined,
    },
    title:       resolveTitle(payload),
    color:       resolveColor(payload),
    fields:      buildFields(payload),
    thumbnail:   actorAvatarUrl ? { url: actorAvatarUrl } : undefined,
    footer: {
      text: isSuspect
        ? `⚠️ Şüpheli Aktivite · ${CHANNEL_LABELS[channelType]}`
        : CHANNEL_LABELS[channelType],
    },
    timestamp: new Date().toISOString(),
  };

  const components = buildComponents(payload);

  return { embed, components };
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK TARGETS — DB
// ─────────────────────────────────────────────────────────────────────────────

const getDbWebhookTargets = async (
  supabase: unknown,
  guildId?: string,
): Promise<Partial<Record<LogChannelKey, WebhookTarget>>> => {
  if (!supabase || !guildId) return {};
  const client = supabase as ReturnType<typeof createClient>;
  // log_channel_configs (web) veya bot_log_channels (bot) tablosunu dene
  let data: LogChannelConfigRow[] | null = null;
  const { data: d1 } = await client
    .from('log_channel_configs')
    .select('channel_type, webhook_url, is_active')
    .eq('guild_id', guildId)
    .eq('is_active', true);
  data = d1 as LogChannelConfigRow[] | null;
  if (!data || data.length === 0) {
    const { data: d2 } = await client
      .from('bot_log_channels')
      .select('channel_type, webhook_url, is_active')
      .eq('guild_id', guildId)
      .eq('is_active', true);
    data = d2 as LogChannelConfigRow[] | null;
  }
  if (!data) return {};
  return (data as LogChannelConfigRow[]).reduce<Partial<Record<LogChannelKey, WebhookTarget>>>(
    (acc, row) => {
      const key = normalizeChannelKey(row.channel_type);
      if (key) acc[key] = { name: key, url: row.webhook_url };
      return acc;
    },
    {},
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DISCORD WEBHOOK SENDER
// ─────────────────────────────────────────────────────────────────────────────

const sendDiscordWebhook = async (
  target: WebhookTarget,
  embed: DiscordEmbed,
  components: DiscordComponent[],
) => {
  const body: Record<string, unknown> = {
    username:         '📖 Veri Merkezi',
    allowed_mentions: { parse: [] },
    embeds:           [embed],
  };
  if (components.length > 0) body.components = components;

  await fetch(target.url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — logWebEvent
// ─────────────────────────────────────────────────────────────────────────────

export const logWebEvent = async (request: Request, payload: LogPayload) => {
  try {
    const supabase = getServerSupabase();

    // 1. Audit log → Supabase
    if (supabase) {
      await supabase.from('web_audit_logs').insert({
        event:      payload.event,
        status:     payload.status,
        user_id:    payload.userId  ?? null,
        guild_id:   payload.guildId ?? null,
        role_id:    payload.roleId  ?? null,
        ip_address: getRequestIp(request),
        user_agent: request.headers.get('user-agent'),
        metadata:   payload.metadata ?? {},
      });
    }

    if (!payload.guildId) return;

    const channelType          = resolveEventChannel(payload);
    const { embed, components } = buildEmbedAndComponents(payload);
    const botApiUrl            = process.env.BOT_API_URL || 'http://localhost:3000';

    // 2. Bot API üzerinden gönder (varsa)
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 5000);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const botApiKey = process.env.BOT_API_KEY;
      if (botApiKey) headers['Authorization'] = `Bearer ${botApiKey}`;

      const response = await fetch(`${botApiUrl}/api/log`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ guildId: payload.guildId, channelType, embed, components }),
        signal:  controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) return; // Başarılı — webhook fallback'e gerek yok
    } catch {
      // Bot API ulaşılamıyor, fallback'e geç
    }

    // 3. Fallback: direkt webhook
    if (!supabase) return;
    const dbTargets = await getDbWebhookTargets(supabase, payload.guildId);
    const target    = dbTargets[channelType] ?? dbTargets.user_main ?? dbTargets.admin_main;
    if (!target) return;
    await sendDiscordWebhook(target, embed, components);

  } catch {
    // Loglar uygulama akışını bozmasın
  }
};
