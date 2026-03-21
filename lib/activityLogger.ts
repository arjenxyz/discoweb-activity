/**
 * Activity giriş/çıkış loglarını doğrudan Discord kanalına gönderir.
 * Bot token ile /channels/{id}/messages endpoint'ini kullanır.
 */

const DISCORD_API = 'https://discord.com/api/v10';

const LOGIN_CHANNEL_ID     = '1484938345770651861';
const LOGOUT_CHANNEL_ID    = '1484938399965122691';
const NEW_USER_CHANNEL_ID  = '1484940513822904350';
const NEW_SERVER_CHANNEL_ID = '1484940664818110544';

type LoginLogPayload = {
  userId: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  guildId: string | null;
  guildName?: string | null;
  isNewUser: boolean;
  ip: string | null;
  userAgent: string | null;
  tokenExpiresAt: string | null;
};

type LogoutLogPayload = {
  userId: string | null;
  username?: string | null;
  guildId: string | null;
  ip: string | null;
  userAgent: string | null;
};

type ErrorLogPayload = {
  reason: string;
  status?: string;
  ip: string | null;
  userAgent: string | null;
  guildId?: string | null;
  metadata?: Record<string, unknown>;
};

const avatarUrl = (userId: string, avatarHash: string | null) =>
  avatarHash
    ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=64`
    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(userId) >> BigInt(22)) % 6}.png`;

async function postToChannel(channelId: string, payload: Record<string, unknown>): Promise<void> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Log gönderilemedi — sessizce geç, ana akışı engelleme
  }
}

export async function logActivityLogin(data: LoginLogPayload): Promise<void> {
  const embed = {
    author: {
      name: `${data.username}${data.discriminator && data.discriminator !== '0' ? `#${data.discriminator}` : ''}`,
      icon_url: avatarUrl(data.userId, data.avatar),
    },
    title: data.isNewUser ? '🆕 Yeni Kullanıcı Girişi' : '✅ Activity Girişi',
    color: data.isNewUser ? 0x57F287 : 0x1ABC9C,
    fields: [
      { name: '👤 Kullanıcı', value: `<@${data.userId}> \`${data.userId}\``, inline: false },
      { name: '🏠 Sunucu', value: data.guildName ? `${data.guildName} \`${data.guildId}\`` : (data.guildId ?? '—'), inline: false },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '⏱️ Token Süresi', value: data.tokenExpiresAt ? `<t:${Math.floor(new Date(data.tokenExpiresAt).getTime() / 1000)}:R>` : '—', inline: true },
      { name: '🖥️ User Agent', value: data.userAgent ? `\`${data.userAgent.slice(0, 200)}\`` : '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Activity · Giriş' },
  };

  await postToChannel(LOGIN_CHANNEL_ID, { embeds: [embed] });
}

export async function logActivityLogout(data: LogoutLogPayload): Promise<void> {
  const embed = {
    title: '🚪 Activity Çıkışı',
    color: 0xE67E22,
    fields: [
      {
        name: '👤 Kullanıcı',
        value: data.userId
          ? `<@${data.userId}> \`${data.userId}\`${data.username ? ` (${data.username})` : ''}`
          : '—',
        inline: false,
      },
      { name: '🏠 Sunucu ID', value: data.guildId ? `\`${data.guildId}\`` : '—', inline: true },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ User Agent', value: data.userAgent ? `\`${data.userAgent.slice(0, 200)}\`` : '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Activity · Çıkış' },
  };

  await postToChannel(LOGOUT_CHANNEL_ID, { embeds: [embed] });
}

type NewUserPayload = {
  userId: string;
  username: string;
  discriminator?: string;
  avatar: string | null;
  guildId: string | null;
  guildName: string | null;
  ip: string | null;
  userAgent: string | null;
};

type NewServerPayload = {
  guildId: string;
  guildName: string;
  ownerId: string;
  registeredBy: string; // userId
  isSetup: boolean;     // false = sadece kayıt, true = kurulum tamamlandı
  adminRoleId?: string | null;
  verifyRoleId?: string | null;
};

export async function logNewUser(data: NewUserPayload): Promise<void> {
  const embed = {
    author: {
      name: `${data.username}${data.discriminator && data.discriminator !== '0' ? `#${data.discriminator}` : ''}`,
      icon_url: avatarUrl(data.userId, data.avatar),
    },
    title: '🎉 Yeni Kullanıcı',
    color: 0x57F287,
    fields: [
      { name: '👤 Kullanıcı', value: `<@${data.userId}> \`${data.userId}\``, inline: false },
      { name: '🏠 İlk Sunucu', value: data.guildName ? `${data.guildName} \`${data.guildId}\`` : (data.guildId ?? '—'), inline: false },
      { name: '🌐 IP', value: data.ip ? `\`${data.ip}\`` : '—', inline: true },
      { name: '🖥️ User Agent', value: data.userAgent ? `\`${data.userAgent.slice(0, 200)}\`` : '—', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Activity · Yeni Kullanıcı' },
  };

  await postToChannel(NEW_USER_CHANNEL_ID, { embeds: [embed] });
}

export async function logNewServer(data: NewServerPayload): Promise<void> {
  const embed = {
    title: data.isSetup ? '✅ Yeni Sunucu Kurulumu Tamamlandı' : '📋 Yeni Sunucu Kaydedildi',
    color: data.isSetup ? 0x5865F2 : 0xF1C40F,
    fields: [
      { name: '🏠 Sunucu', value: `${data.guildName} \`${data.guildId}\``, inline: false },
      { name: '👑 Sunucu Sahibi', value: `<@${data.ownerId}>`, inline: true },
      { name: '🔧 Kaydeden', value: `<@${data.registeredBy}>`, inline: true },
      ...(data.isSetup ? [
        { name: '🎭 Admin Rolü', value: data.adminRoleId ? `<@&${data.adminRoleId}>` : '—', inline: true },
        { name: '✅ Verify Rolü', value: data.verifyRoleId ? `<@&${data.verifyRoleId}>` : '—', inline: true },
      ] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `Activity · ${data.isSetup ? 'Kurulum Tamamlandı' : 'Sunucu Kaydı'}` },
  };

  await postToChannel(NEW_SERVER_CHANNEL_ID, { embeds: [embed] });
}

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
    footer: { text: 'Activity · Auth Hata' },
  };

  await postToChannel(LOGIN_CHANNEL_ID, { embeds: [embed] });
}
