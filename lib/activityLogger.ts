/**
 * Activity giriş/çıkış loglarını doğrudan Discord kanalına gönderir.
 * Bot token ile /channels/{id}/messages endpoint'ini kullanır.
 */

const DISCORD_API = 'https://discord.com/api/v10';

const LOGIN_CHANNEL_ID      = '1484938345770651861';
const BOT_ERROR_CHANNEL_ID  = '1484952999515394200';
const LOGOUT_CHANNEL_ID     = '1484938399965122691';
const NEW_USER_CHANNEL_ID   = '1484940513822904350';
const NEW_SERVER_CHANNEL_ID = '1484940664818110544';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type LoginLogPayload = {
  userId: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  guildId: string | null;
  guildName?: string | null;
  guildIcon?: string | null;
  isNewUser: boolean;
  ip: string | null;
  userAgent: string | null;
  tokenExpiresAt: string | null;
};

export type LogoutLogPayload = {
  userId: string | null;
  username?: string | null;
  guildId: string | null;
  guildName?: string | null;
  guildIcon?: string | null;
  ip: string | null;
  userAgent: string | null;
};

export type NewUserPayload = {
  userId: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  guildId: string | null;
  guildName: string | null;
  guildIcon?: string | null;
  ip: string | null;
  userAgent: string | null;
};

export type NewServerPayload = {
  guildId: string;
  guildName: string;
  guildIcon?: string | null;
  ownerId: string;
  registeredBy: string;
  isSetup: boolean;
  adminRoleId?: string | null;
  verifyRoleId?: string | null;
};

export type BotErrorPayload = {
  errorType:
    | 'role_assign_failed'
    | 'role_revoke_failed'
    | 'wallet_deduct_failed_after_role'
    | 'rollback_failed'
    | 'bot_missing_manage_roles'
    | 'bot_role_hierarchy';
  userId?: string | null;
  guildId?: string | null;
  roleId?: string | null;
  orderId?: string | null;
  discordStatus?: number | null;
  detail?: string | null;
};

type ErrorLogPayload = {
  reason: string;
  status?: string;
  ip: string | null;
  userAgent: string | null;
  guildId?: string | null;
  metadata?: Record<string, unknown>;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const cdnAvatar = (userId: string, avatarHash: string | null) =>
  avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> BigInt(22)) % 6}.png`;

const cdnGuildIcon = (guildId: string, iconHash: string | null | undefined) =>
  iconHash
    ? `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png?size=64`
    : null;

const ts = (date: Date = new Date()) =>
  `<t:${Math.floor(date.getTime() / 1000)}:F>`;

const tsR = (date: Date) =>
  `<t:${Math.floor(date.getTime() / 1000)}:R>`;

/** UA'dan okunabilir platform/tarayıcı çıkar */
function parseUA(ua: string | null): string {
  if (!ua) return '—';
  const u = ua.toLowerCase();
  const parts: string[] = [];

  if (u.includes('discord')) parts.push('Discord İstemcisi');
  else if (u.includes('android')) parts.push('Android');
  else if (u.includes('iphone') || u.includes('ipad')) parts.push('iOS');
  else if (u.includes('windows')) parts.push('Windows');
  else if (u.includes('macintosh') || u.includes('mac os')) parts.push('macOS');
  else if (u.includes('linux')) parts.push('Linux');
  else parts.push('Bilinmeyen OS');

  if (!u.includes('discord')) {
    if (u.includes('edg/')) parts.push('Edge');
    else if (u.includes('chrome') && !u.includes('chromium')) parts.push('Chrome');
    else if (u.includes('firefox')) parts.push('Firefox');
    else if (u.includes('safari') && !u.includes('chrome')) parts.push('Safari');
    else if (u.includes('opera') || u.includes('opr/')) parts.push('Opera');
  }

  return parts.join(' · ');
}

/** Sunucu bilgisini footer için hazırla */
function guildFooter(guildId: string | null, guildName: string | null | undefined, guildIcon: string | null | undefined, suffix: string) {
  const iconUrl = guildId ? cdnGuildIcon(guildId, guildIcon) : null;
  const name = guildName ? `${guildName} · ${suffix}` : suffix;
  return iconUrl
    ? { text: name, icon_url: iconUrl }
    : { text: name };
}

async function postToChannel(channelId: string, payload: Record<string, unknown>): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;
  try {
    await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch { /* sessizce geç */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

export async function logActivityLogin(data: LoginLogPayload): Promise<void> {
  const tag = data.discriminator && data.discriminator !== '0'
    ? `${data.username}#${data.discriminator}`
    : data.username;

  const guildIconUrl = data.guildId ? cdnGuildIcon(data.guildId, data.guildIcon) : null;

  const embed = {
    author: {
      name: tag,
      icon_url: cdnAvatar(data.userId, data.avatar),
    },
    title: data.isNewUser ? '🆕 İlk Giriş' : '✅ Activity Açıldı',
    description: data.isNewUser
      ? `**${data.username}** sisteme ilk kez giriş yaptı.`
      : `**${data.username}** Activity'yi açtı.`,
    color: data.isNewUser ? 0x57F287 : 0x1ABC9C,
    thumbnail: { url: guildIconUrl ?? cdnAvatar(data.userId, data.avatar) },
    fields: [
      { name: '👤 Kullanıcı', value: `<@${data.userId}>\n\`${data.userId}\``, inline: true },
      {
        name: '🏠 Sunucu',
        value: data.guildName
          ? `**${data.guildName}**\n\`${data.guildId}\``
          : (data.guildId ? `\`${data.guildId}\`` : '—'),
        inline: true,
      },
      {
        name: '⏱️ Token Sona Erer',
        value: data.tokenExpiresAt
          ? `${tsR(new Date(data.tokenExpiresAt))}\n${ts(new Date(data.tokenExpiresAt))}`
          : '—',
        inline: true,
      },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ Platform', value: parseUA(data.userAgent), inline: true },
      { name: '📅 Zaman', value: ts(), inline: true },
      ...(data.userAgent ? [{ name: '📋 User Agent', value: `\`\`\`\n${data.userAgent.slice(0, 300)}\n\`\`\``, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: guildFooter(data.guildId, data.guildName, data.guildIcon, 'Activity Giriş'),
  };

  await postToChannel(LOGIN_CHANNEL_ID, { embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function logActivityLogout(data: LogoutLogPayload): Promise<void> {
  const embed = {
    title: '🚪 Activity Kapandı',
    description: data.username
      ? `**${data.username}** Activity'den ayrıldı.`
      : data.userId
        ? `<@${data.userId}> Activity'den ayrıldı.`
        : 'Bir kullanıcı Activity\'den ayrıldı.',
    color: 0x747F8D,
    fields: [
      {
        name: '👤 Kullanıcı',
        value: data.userId
          ? `<@${data.userId}>${data.username ? ` **(${data.username})**` : ''}\n\`${data.userId}\``
          : '—',
        inline: true,
      },
      {
        name: '🏠 Sunucu',
        value: data.guildName
          ? `**${data.guildName}**\n\`${data.guildId}\``
          : (data.guildId ? `\`${data.guildId}\`` : '—'),
        inline: true,
      },
      { name: '📅 Zaman', value: ts(), inline: true },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ Platform', value: parseUA(data.userAgent), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: guildFooter(data.guildId, data.guildName, data.guildIcon, 'Activity Çıkış'),
  };

  await postToChannel(LOGOUT_CHANNEL_ID, { embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW USER
// ─────────────────────────────────────────────────────────────────────────────

export async function logNewUser(data: NewUserPayload): Promise<void> {
  const tag = data.discriminator && data.discriminator !== '0'
    ? `${data.username}#${data.discriminator}`
    : data.username;

  const guildIconUrl = data.guildId ? cdnGuildIcon(data.guildId, data.guildIcon) : null;

  const embed = {
    author: {
      name: tag,
      icon_url: cdnAvatar(data.userId, data.avatar),
    },
    title: '🎉 Yeni Kullanıcı Katıldı!',
    description: `**${data.username}** sisteme ilk kez kayıt oldu.\nHoş geldin! 👋`,
    color: 0x5865F2,
    thumbnail: { url: guildIconUrl ?? cdnAvatar(data.userId, data.avatar) },
    fields: [
      { name: '👤 Kullanıcı', value: `<@${data.userId}>\n\`${data.userId}\``, inline: true },
      {
        name: '🏠 İlk Sunucu',
        value: data.guildName
          ? `**${data.guildName}**\n\`${data.guildId}\``
          : (data.guildId ? `\`${data.guildId}\`` : '—'),
        inline: true,
      },
      { name: '📅 Kayıt Zamanı', value: ts(), inline: true },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ Platform', value: parseUA(data.userAgent), inline: true },
      ...(data.userAgent ? [{ name: '📋 User Agent', value: `\`\`\`\n${data.userAgent.slice(0, 300)}\n\`\`\``, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: guildFooter(data.guildId, data.guildName, data.guildIcon, 'Yeni Kullanıcı'),
  };

  await postToChannel(NEW_USER_CHANNEL_ID, { embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW SERVER
// ─────────────────────────────────────────────────────────────────────────────

export async function logNewServer(data: NewServerPayload): Promise<void> {
  const guildIconUrl = cdnGuildIcon(data.guildId, data.guildIcon);

  const embed = {
    author: guildIconUrl
      ? { name: data.guildName, icon_url: guildIconUrl }
      : { name: data.guildName },
    title: data.isSetup ? '🚀 Yeni Sunucu Kurulumu Tamamlandı' : '📋 Yeni Sunucu Sisteme Eklendi',
    description: data.isSetup
      ? `**${data.guildName}** sunucusu kurulumunu tamamladı ve sisteme dahil oldu.`
      : `**${data.guildName}** sunucusu sisteme kaydedildi, kurulum bekleniyor.`,
    color: data.isSetup ? 0x57F287 : 0xF1C40F,
    thumbnail: guildIconUrl ? { url: guildIconUrl } : undefined,
    fields: [
      { name: '🏠 Sunucu', value: `**${data.guildName}**\n\`${data.guildId}\``, inline: true },
      { name: '👑 Sunucu Sahibi', value: `<@${data.ownerId}>\n\`${data.ownerId}\``, inline: true },
      {
        name: data.ownerId === data.registeredBy ? '🔧 Kuran' : '🔧 Kaydeden',
        value: `<@${data.registeredBy}>\n\`${data.registeredBy}\``,
        inline: true,
      },
      ...(data.isSetup ? [
        {
          name: '🎭 Admin Rolü',
          value: data.adminRoleId ? `<@&${data.adminRoleId}>\n\`${data.adminRoleId}\`` : '—',
          inline: true,
        },
        {
          name: '✅ Verify Rolü',
          value: data.verifyRoleId ? `<@&${data.verifyRoleId}>\n\`${data.verifyRoleId}\`` : '—',
          inline: true,
        },
        { name: '📋 Durum', value: '`is_setup: true`', inline: true },
      ] : [
        { name: '📋 Durum', value: '`is_setup: false` — kurulum bekleniyor', inline: true },
      ]),
      { name: '📅 Zaman', value: ts(), inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: guildIconUrl
      ? { text: `${data.guildName} · ${data.isSetup ? 'Sunucu Kurulumu' : 'Sunucu Kaydı'}`, icon_url: guildIconUrl }
      : { text: `DiscoWeb · ${data.isSetup ? 'Sunucu Kurulumu' : 'Sunucu Kaydı'}` },
  };

  await postToChannel(NEW_SERVER_CHANNEL_ID, { embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ERROR
// ─────────────────────────────────────────────────────────────────────────────

export async function logActivityAuthError(data: ErrorLogPayload): Promise<void> {
  const embed = {
    title: '⚠️ Activity Auth Hatası',
    color: 0xED4245,
    fields: [
      { name: '🔖 Sebep', value: `\`${data.reason}\``, inline: true },
      ...(data.status ? [{ name: '📋 Durum', value: `\`${data.status}\``, inline: true }] : []),
      ...(data.guildId ? [{ name: '🏠 Guild ID', value: `\`${data.guildId}\``, inline: true }] : []),
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ User Agent', value: data.userAgent ? `\`${data.userAgent.slice(0, 200)}\`` : '—', inline: false },
      ...(data.metadata ? [{ name: '📄 Detay', value: `\`\`\`json\n${JSON.stringify(data.metadata, null, 2).slice(0, 900)}\n\`\`\``, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'DiscoWeb · Auth Hata' },
  };

  await postToChannel(LOGIN_CHANNEL_ID, { embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// BOT / SİSTEM HATASI
// ─────────────────────────────────────────────────────────────────────────────

const BOT_ERROR_LABELS: Record<BotErrorPayload['errorType'], string> = {
  role_assign_failed:              '🟠 Rol Atama Başarısız',
  role_revoke_failed:              '🟡 Rol İptal Başarısız',
  wallet_deduct_failed_after_role: '🔴 KRİTİK: Rol Verildi, Para Düşülemedi',
  rollback_failed:                 '🔴 KRİTİK: Rollback Başarısız',
  bot_missing_manage_roles:        '🟠 Bot MANAGE_ROLES Yetkisi Yok',
  bot_role_hierarchy:              '🟠 Bot Rol Hiyerarşisi Yetersiz',
};

const BOT_ERROR_COLORS: Record<BotErrorPayload['errorType'], number> = {
  role_assign_failed:              0xFFA500,
  role_revoke_failed:              0xF1C40F,
  wallet_deduct_failed_after_role: 0xED4245,
  rollback_failed:                 0xED4245,
  bot_missing_manage_roles:        0xFFA500,
  bot_role_hierarchy:              0xFFA500,
};

export async function logBotError(data: BotErrorPayload): Promise<void> {
  const embed = {
    title: BOT_ERROR_LABELS[data.errorType] ?? `⚠️ ${data.errorType}`,
    color: BOT_ERROR_COLORS[data.errorType] ?? 0xFFA500,
    fields: [
      { name: '🔖 Hata Tipi', value: `\`${data.errorType}\``, inline: true },
      ...(data.userId ? [{ name: '👤 Kullanıcı', value: `<@${data.userId}>\n\`${data.userId}\``, inline: true }] : []),
      ...(data.guildId ? [{ name: '🏠 Guild', value: `\`${data.guildId}\``, inline: true }] : []),
      ...(data.roleId ? [{ name: '🎭 Rol', value: `<@&${data.roleId}>\n\`${data.roleId}\``, inline: true }] : []),
      ...(data.orderId ? [{ name: '🧾 Sipariş', value: `\`${data.orderId}\``, inline: true }] : []),
      ...(data.discordStatus != null ? [{ name: '📡 Discord HTTP', value: `\`${data.discordStatus}\``, inline: true }] : []),
      ...(data.detail ? [{ name: '📄 Detay', value: `\`\`\`\n${data.detail.slice(0, 500)}\n\`\`\``, inline: false }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'DiscoWeb · Bot Hata' },
  };

  await postToChannel(BOT_ERROR_CHANNEL_ID, { embeds: [embed] });
}
