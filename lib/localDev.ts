/**
 * Localhost-only development helpers.
 * Active only when NODE_ENV !== 'production' AND the request host is localhost/127.0.0.1.
 * Never enables on public hosts (even with next dev).
 */

export const LOCAL_DEV_USER_ID = 'dev-user-12345';
export const LOCAL_DEV_GUILD_ID = 'dev-guild';
export const LOCAL_DEV_USERNAME = 'Local Dev';
export const LOCAL_DEV_AVATAR = '/gif/cat.gif';

export function isLocalDevHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const hostname = host.split(',')[0]?.trim().split(':')[0]?.toLowerCase() ?? '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

export function isLocalDevRequest(request: Request): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    if (isLocalDevHost(new URL(request.url).hostname)) return true;
  } catch {
    // ignore
  }
  return isLocalDevHost(request.headers.get('host') ?? request.headers.get('x-forwarded-host'));
}

/** Cookie/header-based paths without an explicit Request (App Router). */
export async function isLocalDev(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    return isLocalDevHost(h.get('x-forwarded-host') ?? h.get('host'));
  } catch {
    return false;
  }
}

export const localDevUser = {
  id: LOCAL_DEV_USER_ID,
  username: LOCAL_DEV_USERNAME,
  avatar: LOCAL_DEV_AVATAR,
};

export const localDevServerInfo = {
  id: LOCAL_DEV_GUILD_ID,
  name: 'Local Dev Server',
  iconUrl: LOCAL_DEV_AVATAR,
  memberCount: 42,
  isSetup: true,
  features: {
    shop: true,
    daily: true,
    coupons: true,
    leaderboard: true,
  },
};

export const localDevProfile = {
  userId: LOCAL_DEV_USER_ID,
  username: LOCAL_DEV_USERNAME,
  nickname: 'Dev',
  displayName: LOCAL_DEV_USERNAME,
  avatarUrl: LOCAL_DEV_AVATAR,
  about: 'Localhost development profile — Discord OAuth gerekmez.',
  guildName: localDevServerInfo.name,
  guildIcon: LOCAL_DEV_AVATAR,
  roles: [
    { id: 'role-admin', name: 'Admin', color: 0xe74c3c },
    { id: 'role-vip', name: 'VIP', color: 0xf1c40f },
    { id: 'role-member', name: 'Üye', color: 0x3498db },
  ],
  tag_granted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  has_tag: true,
  is_booster: true,
  booster_since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};

export const localDevWallet = {
  balance: 12500,
  mari_balance: 320,
  dailyLimit: 5000,
  taxRate: 0.05,
  sentToday: 250,
};

const nowIso = () => new Date().toISOString();

export const localDevOverview = {
  joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  serverMessages: 128_450,
  serverVoiceMinutes: 54_320,
  userMessages: 1842,
  userVoiceMinutes: 960,
  tagBonusMessage: 1.25,
  tagBonusVoice: 1.25,
  boosterBonusMessage: 1.5,
  boosterBonusVoice: 1.5,
  hasTag: true,
  tagGrantedAt: localDevProfile.tag_granted_at,
  isBooster: true,
  boosterSince: localDevProfile.booster_since,
  hasVerifyRole: true,
  verifiedSince: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  totalsSinceVerified: { messages: 1600, voice_minutes: 800 },
  messagesLast24h: 48,
  voiceMinutesLast24h: 95,
  activePerks: [
    {
      role_id: 'role-vip',
      item_title: 'VIP Rolü',
      applied_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  papelLeaderboard: [
    {
      userId: LOCAL_DEV_USER_ID,
      avatarUrl: LOCAL_DEV_AVATAR,
      nickname: 'Dev',
      displayName: LOCAL_DEV_USERNAME,
      username: LOCAL_DEV_USERNAME,
      papel: 12500,
      isCurrentUser: true,
    },
    {
      userId: 'sample-user-2',
      avatarUrl: LOCAL_DEV_AVATAR,
      nickname: 'Alice',
      displayName: 'Alice',
      username: 'alice',
      papel: 9800,
      isCurrentUser: false,
    },
    {
      userId: 'sample-user-3',
      avatarUrl: LOCAL_DEV_AVATAR,
      nickname: 'Bob',
      displayName: 'Bob',
      username: 'bob',
      papel: 7200,
      isCurrentUser: false,
    },
  ],
  currentUserRank: 1,
  currentUser: {
    userId: LOCAL_DEV_USER_ID,
    avatarUrl: LOCAL_DEV_AVATAR,
    nickname: 'Dev',
    displayName: LOCAL_DEV_USERNAME,
    username: LOCAL_DEV_USERNAME,
    papel: 12500,
  },
  totalLeaderboardCount: 3,
};

export const localDevBadges = {
  currentBadge: {
    id: 'badge-silver',
    name: 'Gümüş',
    emoji: '🥈',
    days_required: 30,
    color: '#c0c0c0',
    description: '30 gün tag',
    sort_order: 2,
    reward_papel: 500,
    reward_earn_multiplier: 1.15,
    reward_message: null,
    role_id: null,
    background_image: null,
  },
  nextBadge: {
    id: 'badge-gold',
    name: 'Altın',
    emoji: '🥇',
    days_required: 60,
    color: '#ffd700',
    description: '60 gün tag',
    sort_order: 3,
    reward_papel: 1000,
    reward_earn_multiplier: 1.3,
    reward_message: null,
    role_id: null,
    background_image: null,
  },
  tagDays: 45,
  daysToNext: 15,
  hasTag: true,
  earnMultiplier: 1.15,
  allTiers: [
    {
      id: 'badge-bronze',
      name: 'Bronz',
      emoji: '🥉',
      days_required: 7,
      color: '#cd7f32',
      description: '7 gün tag',
      sort_order: 1,
      reward_papel: 100,
      reward_earn_multiplier: 1.05,
      reward_message: null,
      role_id: null,
      background_image: null,
    },
    {
      id: 'badge-silver',
      name: 'Gümüş',
      emoji: '🥈',
      days_required: 30,
      color: '#c0c0c0',
      description: '30 gün tag',
      sort_order: 2,
      reward_papel: 500,
      reward_earn_multiplier: 1.15,
      reward_message: null,
      role_id: null,
      background_image: null,
    },
    {
      id: 'badge-gold',
      name: 'Altın',
      emoji: '🥇',
      days_required: 60,
      color: '#ffd700',
      description: '60 gün tag',
      sort_order: 3,
      reward_papel: 1000,
      reward_earn_multiplier: 1.3,
      reward_message: null,
      role_id: null,
      background_image: null,
    },
  ],
  currentBoosterBadge: {
    id: 'boost-1',
    name: 'Booster I',
    emoji: '🚀',
    months_required: 1,
    color: '#f47fff',
    description: '1 ay boost',
    sort_order: 1,
    reward_papel: 200,
    reward_earn_multiplier: 1.1,
    reward_message: null,
    role_id: null,
    background_image: null,
  },
  nextBoosterBadge: {
    id: 'boost-2',
    name: 'Booster II',
    emoji: '💎',
    months_required: 3,
    color: '#9b59b6',
    description: '3 ay boost',
    sort_order: 2,
    reward_papel: 600,
    reward_earn_multiplier: 1.25,
    reward_message: null,
    role_id: null,
    background_image: null,
  },
  boosterMonths: 2,
  monthsToNext: 1,
  isBooster: true,
  boosterEarnMultiplier: 1.1,
  allBoosterTiers: [
    {
      id: 'boost-1',
      name: 'Booster I',
      emoji: '🚀',
      months_required: 1,
      color: '#f47fff',
      description: '1 ay boost',
      sort_order: 1,
      reward_papel: 200,
      reward_earn_multiplier: 1.1,
      reward_message: null,
      role_id: null,
      background_image: null,
    },
    {
      id: 'boost-2',
      name: 'Booster II',
      emoji: '💎',
      months_required: 3,
      color: '#9b59b6',
      description: '3 ay boost',
      sort_order: 2,
      reward_papel: 600,
      reward_earn_multiplier: 1.25,
      reward_message: null,
      role_id: null,
      background_image: null,
    },
  ],
};

export const localDevStore = {
  promotions: [
    {
      id: 'promo-welcome',
      code: 'WELCOME10',
      value: 10,
      max_uses: 100,
      used_count: 12,
      status: 'active',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: nowIso(),
    },
  ],
  items: [
    {
      id: 'item-vip',
      title: 'VIP Rolü',
      description: 'Özel renk ve yetkiler — örnek ürün',
      price: 500,
      status: 'active' as const,
      role_id: 'role-vip',
      duration_days: 30,
      created_at: nowIso(),
      image_url: LOCAL_DEV_AVATAR,
    },
    {
      id: 'item-premium',
      title: 'Premium Rolü',
      description: 'Tüm premium özellikler — örnek ürün',
      price: 1000,
      status: 'active' as const,
      role_id: 'role-premium',
      duration_days: 30,
      created_at: nowIso(),
      image_url: LOCAL_DEV_AVATAR,
    },
    {
      id: 'item-custom',
      title: 'Özel Renk',
      description: 'Kendi renginizi seçin — örnek ürün',
      price: 750,
      status: 'active' as const,
      role_id: 'role-color',
      duration_days: 14,
      created_at: nowIso(),
      image_url: LOCAL_DEV_AVATAR,
    },
  ],
  hasMore: false,
  page: 1,
  limit: 20,
  ownedRoleIds: ['role-vip'],
};

export const localDevCoupons = {
  coupons: [
    {
      id: 'welcome10',
      code: 'WELCOME10',
      discount: 10,
      description: 'Hoş geldin indirim! İlk alışverişinde %10 indirim',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      maxUses: 1,
      type: 'percentage',
    },
    {
      id: 'weekend20',
      code: 'WEEKEND20',
      discount: 20,
      description: 'Hafta sonu özel! %20 indirim',
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      maxUses: 1,
      type: 'percentage',
    },
  ],
};

export const localDevReadiness = {
  status: 'ready' as const,
  blocking: false,
  guildId: LOCAL_DEV_GUILD_ID,
  guildName: localDevServerInfo.name,
  isAdmin: true,
  canInviteBot: false,
  inviteUrl: null,
  botInGuild: true,
  debug: { localDev: true },
};

export const localDevLoadAccrued = {
  pending: 128.5,
  messageTotal: 42,
  voiceTotal: 86.5,
  count: 6,
};

export const localDevNotifications = [
  {
    id: 'notif-1',
    title: 'Localhost geliştirme modu',
    body: 'Oturum ve Discord OAuth olmadan örnek verilerle çalışıyorsunuz.',
    type: 'announcement' as const,
    created_at: nowIso(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
  },
  {
    id: 'notif-2',
    title: 'Örnek bildirim',
    body: 'Bu bir örnek bildirimdir — UI geliştirmesi için.',
    type: 'mail' as const,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
    author_name: 'Sistem',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: true,
  },
];

export const localDevMails = [
  {
    id: 'mail-1',
    title: 'Hoş geldin (örnek)',
    body: 'Localhost geliştirme ortamına hoş geldin. Discord girişi gerekmez.',
    category: 'system',
    status: 'published' as const,
    created_at: nowIso(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-2',
    title: 'Örnek ödül maili',
    body: 'Bu mail UI testleri için örnek veridir.',
    category: 'reward',
    status: 'published' as const,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    author_name: 'Bot',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: true,
    is_starred: true,
  },
];

export const localDevTransactions = [
  {
    id: 'tx-1',
    type: 'earn',
    amount: 128.5,
    created_at: nowIso(),
    description: 'Günlük kazanç (örnek)',
  },
  {
    id: 'tx-2',
    type: 'purchase',
    amount: -500,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    description: 'VIP Rolü satın alındı (örnek)',
  },
  {
    id: 'tx-3',
    type: 'transfer_in',
    amount: 250,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    description: 'Alice\'den transfer (örnek)',
  },
];
