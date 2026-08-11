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
    background_image: '/store-background/invincible/invincible2.jpg',
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
    background_image: '/store-background/invincible/invincible3.jpg',
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
      background_image: '/store-background/invincible/invincible.jpg',
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
      background_image: '/store-background/invincible/invincible2.jpg',
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
      background_image: '/store-background/invincible/invincible3.jpg',
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
    background_image: '/store-background/invincible/invincible4.jpg',
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
    background_image: '/store-background/invincible/invincible5.jpg',
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
      background_image: '/store-background/invincible/invincible4.jpg',
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
      background_image: '/store-background/invincible/invincible5.jpg',
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

export const localDevMailsSeed = [
  {
    id: 'mail-system-1',
    title: 'Hoş geldin (örnek)',
    body: 'Localhost geliştirme ortamına hoş geldin. Discord girişi gerekmez. Bu bir sistem maili örneğidir.',
    category: 'system',
    status: 'published' as const,
    created_at: nowIso(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-announcement-1',
    title: 'Yeni özellik duyurusu (örnek)',
    body: 'Dashboard güncellendi — menü ve modallar yenilendi. Bu bir duyuru maili örneğidir.',
    category: 'announcement',
    status: 'published' as const,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-update-1',
    title: 'Ürün güncellemesi v2.4 (örnek)',
    body: 'Performans iyileştirmeleri ve hata düzeltmeleri yayınlandı. Bu bir update maili örneğidir.',
    category: 'update',
    status: 'published' as const,
    created_at: new Date(Date.now() - 7_200_000).toISOString(),
    author_name: 'Ürün Ekibi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-reward-1',
    title: '50 Papel ödülü (örnek)',
    body: 'Bu ödül maili localhost UI testleri içindir. Hepsini Al ile talep edebilirsin.',
    category: 'reward',
    status: 'published' as const,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    author_name: 'Ödül Merkezi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: true,
    metadata: { reward_amount: 50 },
  },
  {
    id: 'mail-reward-2',
    title: '100 Papel bonus (örnek)',
    body: 'İkinci ödül maili — birden fazla claim test etmek için.',
    category: 'reward',
    status: 'published' as const,
    created_at: new Date(Date.now() - 90_000_000).toISOString(),
    author_name: 'Ödül Merkezi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: { reward_amount: 100 },
  },
  {
    id: 'mail-order-1',
    title: 'Sipariş onaylandı (örnek)',
    body: 'VIP Rolü satın alımın tamamlandı. Sipariş no: #DW-1042. Bu bir sipariş maili örneğidir.',
    category: 'order',
    status: 'published' as const,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    author_name: 'Sipariş Yönetimi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: true,
    is_starred: false,
    details_url: 'https://example.com/orders/DW-1042',
  },
  {
    id: 'mail-maintenance-1',
    title: 'Planlı bakım (örnek)',
    body: 'Yarın 03:00–04:00 arasında kısa bir bakım yapılacak. Bu bir bakım maili örneğidir.',
    category: 'maintenance',
    status: 'published' as const,
    created_at: new Date(Date.now() - 10_800_000).toISOString(),
    author_name: 'Bakım Ekibi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-sponsor-1',
    title: 'Sponsor teklifi (örnek)',
    body: 'Yeni bir iş ortaklığı duyurusu. Bu bir sponsor maili örneğidir.',
    category: 'sponsor',
    status: 'published' as const,
    created_at: new Date(Date.now() - 14_400_000).toISOString(),
    author_name: 'İş Ortaklıkları',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
  },
  {
    id: 'mail-lottery-1',
    title: 'Çekiliş sonucu (örnek)',
    body: 'Haftalık çekilişte 25 Papel kazandın! Bu bir lottery maili örneğidir.',
    category: 'lottery',
    status: 'published' as const,
    created_at: new Date(Date.now() - 50_400_000).toISOString(),
    author_name: 'Kampanya Yönetimi',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: { reward_amount: 25 },
  },
] as const;

type LocalDevMail = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: 'published';
  created_at: string;
  author_name: string;
  author_avatar_url: string;
  is_read: boolean;
  is_starred: boolean;
  metadata?: { reward_amount?: number };
  details_url?: string | null;
  image_url?: string | null;
};

const cloneMailSeed = (): LocalDevMail[] =>
  localDevMailsSeed.map((m) => ({
    ...m,
    metadata: 'metadata' in m && (m as { metadata?: { reward_amount?: number } }).metadata
      ? { ...(m as { metadata: { reward_amount?: number } }).metadata }
      : undefined,
    details_url: 'details_url' in m ? ((m as { details_url?: string }).details_url ?? null) : null,
  }));

let localDevMailStore: LocalDevMail[] = cloneMailSeed();

export function resetLocalDevMails() {
  localDevMailStore = cloneMailSeed();
  return getLocalDevMails();
}

export function getLocalDevMails(): LocalDevMail[] {
  if (localDevMailStore.length === 0) {
    localDevMailStore = cloneMailSeed();
  } else {
    // Yeni eklenen seed örneklerini mevcut store'a ekle (silinenler geri gelmez)
    const existing = new Set(localDevMailStore.map((m) => m.id));
    for (const seed of cloneMailSeed()) {
      if (!existing.has(seed.id)) localDevMailStore.push(seed);
    }
  }
  return localDevMailStore.map((m) => ({
    ...m,
    metadata: m.metadata ? { ...m.metadata } : undefined,
  }));
}

export function markLocalDevMailsRead(ids: string[]) {
  const idSet = new Set(ids);
  localDevMailStore = localDevMailStore.map((m) => (idSet.has(m.id) ? { ...m, is_read: true } : m));
}

export function deleteLocalDevMails(ids: string[]) {
  const idSet = new Set(ids);
  localDevMailStore = localDevMailStore.filter((m) => !idSet.has(m.id));
}

export function setLocalDevMailStarred(id: string, starred: boolean) {
  localDevMailStore = localDevMailStore.map((m) => (m.id === id ? { ...m, is_starred: starred } : m));
}

/** @deprecated use getLocalDevMails() */
export const localDevMails = localDevMailsSeed;

type LocalDevWatchEarnTask = {
  id: string;
  title: string;
  logoText: string;
  sponsor: string;
  reward: number;
  multiplier: string | null;
  banner: string;
  videoUrl: string;
  startsAt: string;
  endsAt: string;
  claimed: boolean;
  claimedAt: string | null;
  createdAt: string;
};

const localDevWatchEarnSeed: Omit<LocalDevWatchEarnTask, 'claimed' | 'claimedAt'>[] = [
  {
    id: 'watch-earn-invincible-1',
    title: 'INVINCIBLE GAMEPLAY GÖREVİ (ÖRNEK)',
    logoText: 'INVINCIBLE',
    sponsor: 'Amazon MGM Studios',
    reward: 200,
    multiplier: '1,2 kat kilit aç',
    banner: '/menu-background/varyant3.jpg',
    // Thragg.mp4 ~49MB — mevcut storage içindeki en uzun örnek video
    videoUrl: '/cdn/Storage/Thragg.mp4',
    startsAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso(),
  },
];

const localDevWatchEarnClaims = new Set<string>();

export function getLocalDevWatchEarnTasks(): LocalDevWatchEarnTask[] {
  const tasks = localDevWatchEarnSeed.map((task) => ({
    ...task,
    claimed: localDevWatchEarnClaims.has(task.id),
    claimedAt: localDevWatchEarnClaims.has(task.id) ? nowIso() : null,
  }));
  tasks.sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return tasks;
}

export function claimLocalDevWatchEarn(taskId: string): { ok: true; reward: number } | { ok: false; error: string } {
  const task = localDevWatchEarnSeed.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: 'task_not_found' };
  if (localDevWatchEarnClaims.has(taskId)) return { ok: false, error: 'already_claimed' };
  localDevWatchEarnClaims.add(taskId);
  return { ok: true, reward: task.reward };
}

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
