// Ortak Section tipi
export type Section = 'overview' | 'store' | 'notifications' | 'profile' | 'settings' | 'mail' | 'transactions' | 'tracking' | 'leaderboard' | 'discover' | 'tag-badge' | 'duyuru' | 'quiz';
export type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'mail';
  created_at: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  is_read?: boolean;
  details_url?: string | null;
  image_url?: string | null;
};

export type MailItem = {
  id: string;
  title: string;
  body: string;
  metadata?: any;
  category: 'announcement' | 'system' | 'update' | 'lottery' | 'reward' | 'order' | string;
  status?: 'published' | 'draft';
  created_at: string;
  user_id?: string | null;
  author_name?: string | null;
  author_avatar_url?: string | null;
  is_read?: boolean;
  is_starred?: boolean;
  image_url?: string | null;
  details_url?: string | null;
};

export type MemberProfile = {
  userId?: string;                      // Discord/user unique id (optional for legacy profiles)
  username: string;
  nickname: string | null;
  displayName: string | null;
  avatarUrl: string;
  roles: Array<{ id: string; name: string; color: number }>;
  about: string | null;
  guildName?: string | null;
  guildIcon?: string | null;
};

export type StoreItem = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price?: number | null;
  image_url?: string | null;
  status: 'active' | 'inactive';
  role_id: string | null;
  duration_days: number;
  created_at: string;
};

export type CartItem = {
  itemId: string;
  title: string;
  price: number;
  qty: number;
  appliedDiscount?: {
    id: string;
    code: string;
    percent: number;
    discountAmount: number;
    finalPrice: number;
  } | null;
};

export type Order = {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  expires_at?: string | Date | null;
  created_at: string;
  can_refund?: boolean;
  failure_reason?: string | null;
  item_title?: string | null;
  role_id?: string | null;
  duration_days?: number | null;
};

export type OverviewStats = {
  joinedAt: string | null;
  serverMessages: number;
  serverVoiceMinutes: number;
  userMessages: number;
  userVoiceMinutes: number;
};

export type ActivePerk = {
  role_id: string;
  title: string | null;
  applied_at: string | null;
  expires_at: string | null;
};

export type TotalsSince = {
  messages: number;
  voice_minutes: number;
};

export type OverviewStatsExpanded = OverviewStats & {
  hasVerifyRole?: boolean;
  verifiedSince?: string | null;
  totalsSinceVerified?: TotalsSince | null;
  messagesLast24h?: number;
  voiceMinutesLast24h?: number;
  activePerks?: ActivePerk[];
  // tag / booster info
  tagBonusMessage?: number;
  tagBonusVoice?: number;
  boosterBonusMessage?: number;
  boosterBonusVoice?: number;
  hasTag?: boolean;
  tagGrantedAt?: string | null;
  isBooster?: boolean;
  boosterSince?: string | null;
  // papel leaderboard/support
  papelLeaderboard?: Array<{
    userId: string;
    avatarUrl?: string;
    nickname?: string;
    displayName?: string;
    username?: string;
    papel: number;
    isCurrentUser?: boolean;
  }>;
  // current user stats for leaderboard
  currentUserRank?: number;
  currentUser?: {
    userId: string;
    avatarUrl?: string;
    nickname?: string | null;
    displayName?: string | null;
    username?: string;
    papel: number;
  };
  papel?: number;
};

export type OrderStats = {
  paidTotal: number;
  pendingCount: number;
  refundedCount: number;
  failedCount: number;
  totalCount: number;
};


export type PurchaseFeedback = Record<
  string,
  { status: 'success' | 'error'; message: string } | undefined
>;

export type BadgeTier = {
  id: string;
  name: string;
  emoji: string | null;
  days_required: number;
  color: string | null;
  description: string | null;
  sort_order: number;
  reward_papel?: number | null;
  reward_earn_multiplier?: number | null;
  reward_message?: string | null;
  role_id?: string | null;
  background_image?: string | null;
};

export type BoosterTier = {
  id: string;
  name: string;
  emoji: string | null;
  months_required: number;
  color: string | null;
  description: string | null;
  sort_order: number;
  reward_papel?: number | null;
  reward_earn_multiplier?: number | null;
  reward_message?: string | null;
  role_id?: string | null;
  background_image?: string | null;
};

export type BadgeInfo = {
  // tag info
  currentBadge: BadgeTier | null;
  nextBadge: BadgeTier | null;
  tagDays: number;
  daysToNext: number | null;
  hasTag: boolean;
  earnMultiplier: number;
  allTiers: BadgeTier[];

  // booster info
  currentBoosterBadge: BoosterTier | null;
  nextBoosterBadge: BoosterTier | null;
  boosterMonths: number;
  monthsToNext: number | null;
  isBooster: boolean;
  boosterEarnMultiplier: number;
  allBoosterTiers: BoosterTier[];
};
