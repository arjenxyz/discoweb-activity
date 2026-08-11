/**
 * Localhost-only development helpers.
 * Active only when NODE_ENV !== 'production' AND the request host is localhost/127.0.0.1.
 * Never enables on public hosts (even with next dev).
 */

/** Valid-looking snowflake so Discord "member since" derives correctly in local preview */
export const LOCAL_DEV_USER_ID = '123456789012345678';
export const LOCAL_DEV_GUILD_ID = '987654321098765432';
export const LOCAL_DEV_USERNAME = 'kysopea';
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
  nickname: null,
  displayName: 'kysopea',
  avatarUrl: LOCAL_DEV_AVATAR,
  bannerUrl: null as string | null,
  bannerColor: '#d1ba95',
  joinedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  about: 'Local Dev — örnek Activity profili. Gerçek oturumda Discord API + member_profiles verisi gelir.',
  guildName: localDevServerInfo.name,
  guildIcon: LOCAL_DEV_AVATAR,
  roles: [
    { id: 'role-admin', name: 'DiscoWeb', color: 0x5865f2 },
    { id: 'role-vip', name: 'Captain', color: 0xe74c3c },
    { id: 'role-member', name: 'Check-in', color: 0x95a5a6 },
  ],
  tag_granted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  has_tag: true,
  is_booster: true,
  booster_since: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
};

/** Mutable localhost state must live on globalThis — App Router route bundles don't share module singletons. */
type LocalDevGlobal = typeof globalThis & {
  __dwLocalDevWallet?: {
    balance: number;
    mari_balance: number;
    dailyLimit: number;
    taxRate: number;
    sentToday: number;
    transferCountLimit: number | null;
    transferCountPeriod: 'day' | 'week' | 'month' | null;
  };
  __dwLocalDevWatchEarnClaims?: Set<string>;
  __dwLocalDevWatchEarnWatched?: Set<string>;
};

const localDevGlobal = globalThis as LocalDevGlobal;

export const localDevWallet =
  localDevGlobal.__dwLocalDevWallet ??
  (localDevGlobal.__dwLocalDevWallet = {
    balance: 12500,
    mari_balance: 320,
    dailyLimit: 5000,
    taxRate: 0.05,
    sentToday: 250,
    transferCountLimit: null,
    transferCountPeriod: null,
  });

function getLocalDevWatchEarnClaims(): Set<string> {
  if (!localDevGlobal.__dwLocalDevWatchEarnClaims) {
    localDevGlobal.__dwLocalDevWatchEarnClaims = new Set();
  }
  return localDevGlobal.__dwLocalDevWatchEarnClaims;
}

function getLocalDevWatchEarnWatched(): Set<string> {
  if (!localDevGlobal.__dwLocalDevWatchEarnWatched) {
    localDevGlobal.__dwLocalDevWatchEarnWatched = new Set();
  }
  return localDevGlobal.__dwLocalDevWatchEarnWatched;
}

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
      role_name: 'VIP',
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
      role_name: 'Premium',
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
      role_name: 'Özel Renk',
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
    id: 'mail-long-1',
    title: 'Uzun duyuru — changelog & test (örnek)',
    body: [
      'Merhaba,',
      '',
      'Bu mail uzun içerik scroll testidir. Modal yüksekliği viewport ile sınırlı kalmalı; başlık sabit, gövde kaydırılabilir olmalıdır.',
      '',
      '## 1. Özet',
      'DiscoWeb Activity sürümünde mail detayı artık masaüstünde modal olarak açılıyor. Kısa mailler ortalanır; uzun mailler max-height içinde kayar.',
      '',
      '## 2. Değişiklik listesi',
      '1. Sidebar sadeleştirildi, fotoğraflı aktif arka plan kaldırıldı.',
      '2. İzle Kazan kartları PC’de 2–3 sütun grid oldu.',
      '3. Video oynatıcıda kalan süre ve tam ekran eklendi.',
      '4. Header içerik sütununa hizalandı; sol menüye binmiyor.',
      '5. Ana içerik max-width kaldırıldı; sağda boşluk kalmıyor.',
      '',
      '## 3. Detaylı açıklama',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      '',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      '',
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
      '',
      '## 4. Test adımları',
      '- Bu maili aç.',
      '- Modalın ekranı taşmadığını doğrula.',
      '- İçeriği aşağı kaydır; üst header (geri / kategori / yıldız) sabit kalsın.',
      '- Kapatıp listeye dön.',
      '',
      '## 5. Ek notlar',
      'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante.',
      '',
      'Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.',
      '',
      'Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui.',
      '',
      '## 6. Kapanış',
      'Teşekkürler — DiscoWeb ekibi. Bu paragraf kasıtlı olarak uzundur ki scroll çubuğu görünsün ve uzun mail deneyimi doğrulanabilsin. Son satır buradadır.',
    ].join('\n'),
    category: 'announcement',
    status: 'published' as const,
    created_at: new Date(Date.now() - 1_800_000).toISOString(),
    author_name: 'DiscoWeb',
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
    id: 'mail-transfer-1',
    title: 'Papel transferi aldınız',
    body: [
      'Size 250 Papel gönderildi.',
      'Gönderen: thearjen',
      '',
      'Açıklama: Anlam evrensel değil. Aynı veri, farklı zihinlerde başka şeyler ifade eder.',
    ].join('\n'),
    category: 'system',
    status: 'published' as const,
    created_at: new Date(Date.now() - 2_400_000).toISOString(),
    author_name: 'thearjen',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: {
      kind: 'transfer',
      i18nKey: 'transfer',
      amount: 250,
      note: 'Anlam evrensel değil. Aynı veri, farklı zihinlerde başka şeyler ifade eder. Bu yüzden uzun notlar da kutunun içinde satır kırarak kalmalı; taşmamalı ve layoutu bozmamalı.',
      senderId: '139725308086878208',
      senderUsername: 'thearjen',
      senderAvatarUrl: LOCAL_DEV_AVATAR,
    },
  },
  {
    id: 'mail-promo-1',
    title: 'Promosyon kodu kullanıldı',
    body: [
      'WELCOME50 kodu başarıyla kullanıldı.',
      '50 Papel hesabınıza eklendi.',
      'Yeni bakiye: 1250 Papel',
    ].join('\n'),
    category: 'system',
    status: 'published' as const,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: {
      kind: 'promotion',
      i18nKey: 'promotion',
      code: 'WELCOME50',
      amount: 50,
      balanceAfter: 1250,
    },
  },
  {
    id: 'mail-discount-1',
    title: 'Yeni indirim kodu',
    body: [
      'SAVE20 indirim kodu yayında.',
      'İndirim oranı: %20',
      'Kod: SAVE20',
      'Minimum sepet: 100 Papel',
      'Kupon kullanım limiti: 50',
      'Kişi başı limit: 1',
      'Bitiş tarihi: Yok',
      '',
      'Not: Sepette görünmesi birkaç saniye alabilir; görünmüyorsa sayfayı yenileyin.',
    ].join('\n'),
    category: 'system',
    status: 'published' as const,
    created_at: new Date(Date.now() - 2_400_000).toISOString(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: {
      kind: 'discount',
      i18nKey: 'discount',
      code: 'SAVE20',
      percent: 20,
      minSpend: 100,
      maxUses: 50,
      perUserLimit: 1,
      expiresAt: null,
      noteKey: 'mail_discount_note_cart_delay',
      is_special: true,
      max_uses: 50,
      per_user_limit: 1,
      min_spend: 100,
      expires_at: null,
    },
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
    title: 'Sipariş onayı',
    body: 'Sipariş No: DW-1042\nToplam: 500 Papel',
    category: 'order',
    status: 'published' as const,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: true,
    is_starred: false,
    metadata: {
      kind: 'order_confirmed',
      i18nKey: 'order_confirmed',
      order_id: 'DW-1042',
      items: [{ title: 'VIP Rolü', qty: 1, price: 500, total: 500 }],
      subtotal: 500,
      discount: 0,
      total: 500,
      status: 'confirmed',
    },
  },
  {
    id: 'mail-order-reject-1',
    title: 'Sipariş reddedildi',
    body: 'Sipariş No: DW-1043\nDurum: reddedildi',
    category: 'order',
    status: 'published' as const,
    created_at: new Date(Date.now() - 160_000_000).toISOString(),
    author_name: 'DiscoWeb',
    author_avatar_url: LOCAL_DEV_AVATAR,
    is_read: false,
    is_starred: false,
    metadata: {
      kind: 'order_rejected',
      i18nKey: 'order_rejected',
      order_id: 'DW-1043',
      items: [{ title: 'VIP Rolü', qty: 1, price: 500, total: 500 }],
      subtotal: 500,
      discount: 0,
      total: 500,
      reason: 'role_assign_failed',
      status: 'rejected',
    },
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
  watched: boolean;
  watchedAt: string | null;
  createdAt: string;
};

const localDevWatchEarnSeed: Omit<
  LocalDevWatchEarnTask,
  'claimed' | 'claimedAt' | 'watched' | 'watchedAt'
>[] = [
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
  {
    id: 'watch-earn-exodus-1',
    title: 'EXODUS TRAILER GÖREVİ (ÖRNEK)',
    logoText: 'EXODUS',
    sponsor: 'Wizards of the Coast',
    reward: 150,
    multiplier: '1,1 kat kilit aç',
    banner: '/menu-background/varyant.jpg',
    videoUrl: '/cdn/Storage/Test3.mp4',
    startsAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 'watch-earn-monopoly-1',
    title: 'MONOPOLY GO! GÖREVİ (ÖRNEK)',
    logoText: 'MONOPOLY GO!',
    sponsor: 'Scopely',
    reward: 180,
    multiplier: '1,2 kat kilit aç',
    banner: '/menu-background/varyant2.jpg',
    videoUrl: '/cdn/Storage/Test4.mp4',
    startsAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7_200_000).toISOString(),
  },
];

export function getLocalDevWatchEarnTasks(): LocalDevWatchEarnTask[] {
  const claims = getLocalDevWatchEarnClaims();
  const watched = getLocalDevWatchEarnWatched();
  const tasks = localDevWatchEarnSeed.map((task) => {
    const isClaimed = claims.has(task.id);
    const isWatched = isClaimed || watched.has(task.id);
    return {
      ...task,
      claimed: isClaimed,
      claimedAt: isClaimed ? nowIso() : null,
      watched: isWatched,
      watchedAt: isWatched ? nowIso() : null,
    };
  });
  tasks.sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return tasks;
}

export function completeLocalDevWatchEarn(
  taskId: string,
): { ok: true; watchedAt: string } | { ok: false; error: string } {
  const task = localDevWatchEarnSeed.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: 'task_not_found' };
  getLocalDevWatchEarnWatched().add(taskId);
  return { ok: true, watchedAt: nowIso() };
}

export function claimLocalDevWatchEarn(
  taskId: string,
): { ok: true; reward: number; balance: number } | { ok: false; error: string } {
  const task = localDevWatchEarnSeed.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: 'task_not_found' };
  const claims = getLocalDevWatchEarnClaims();
  if (claims.has(taskId)) return { ok: false, error: 'already_claimed' };
  const watched = getLocalDevWatchEarnWatched();
  if (!watched.has(taskId)) {
    // Claim öncesi izleme zorunlu — localDev de aynı kural
    return { ok: false, error: 'not_watched' };
  }
  claims.add(taskId);
  localDevWallet.balance = Number((localDevWallet.balance + task.reward).toFixed(2));
  return { ok: true, reward: task.reward, balance: localDevWallet.balance };
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
