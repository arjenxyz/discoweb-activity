'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import DashboardHeader from './components/DashboardHeader';
import { useCart } from '../../lib/cart';
import OverviewSection from './components/OverviewSection';
import LeaderboardDrawer from './components/LeaderboardDrawer';
import ProfileSection from './components/ProfileSection';
import StoreSection from './components/StoreSection';
import SettingsSection from './components/SettingsSection';
import MailSection from './components/MailSection';
import RafflesSection from './components/RafflesSection';
import DiscoverSection from './components/DiscoverSection';
import MarketSection from './components/MarketSection';
import TreasuryCard from './components/TreasuryCard';
import NotificationDetailModal from './components/NotificationDetailModal';
import NotificationsModal from './components/NotificationsModal';
import TransferModal from './components/TransferModal';
import PromotionsModal from './components/PromotionsModal';
import DiscountsModal from './components/DiscountsModal';
import EarningsModal from './components/EarningsModal';
import MailDetailModal from './components/MailDetailModal';
import ActivityReadinessGate, { type ActivityReadiness } from './components/ActivityReadinessGate';
import SplashScreen from './components/SplashScreen';
import SidebarNav from './components/SidebarNav';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { useRealtimeDashboard } from '@/lib/utils/useRealtimeDashboard';
import type {
  MemberProfile,
  Notification,
  OverviewStats,
  OverviewStatsExpanded,
  StoreItem,
  MailItem,
  PurchaseFeedback,
  Section,
  BadgeInfo,
} from './types';

export default function DashboardPage() {
  const cart = useCart();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const unauthorizedRef = useRef(unauthorized);
  const tickRef = useRef(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [mariBalance, setMariBalance] = useState(0);
  const [mariConvertOpen, setMariConvertOpen] = useState(false);
  const [mariConvertInfo, setMariConvertInfo] = useState<{ mari_rate: number; server_used_today: number; global_used_today: number; papel_balance: number; mari_balance: number; server_limit: number; global_limit: number } | null>(null);
  const [mariConvertInput, setMariConvertInput] = useState('');
  const [mariConvertLoading, setMariConvertLoading] = useState(false);
  const [mariConvertError, setMariConvertError] = useState<string | null>(null);
  const [mariConvertSuccess, setMariConvertSuccess] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | OverviewStatsExpanded | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [storeItemsLoading, setStoreItemsLoading] = useState(true);
  const [ownedRoleIds, setOwnedRoleIds] = useState<string[]>([]);
  const [storePage, setStorePage] = useState(1);
  const [storeHasMore, setStoreHasMore] = useState(true);
  const [storeLoadingMore, setStoreLoadingMore] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [isActivityEmbed, setIsActivityEmbed] = useState(false);
  const [, setSearchParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        setSearchParams(sp);
        const s = sp.get('section');
        if (s === 'mail') setActiveSection('mail');

        // Detect if we're running inside Discord Activity (discordsays subdomain)
        const host = window.location.hostname;
        if (host.endsWith('.discordsays.com') || host.endsWith('.discordapp.com')) {
          setIsActivityEmbed(true);
        }
      }
    } catch {}
  }, []);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferRecipientId, setTransferRecipientId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [maintenanceFlags, setMaintenanceFlags] = useState<Record<string, { is_active: boolean; reason: string | null; updated_by?: string | null }> | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceUpdaters, setMaintenanceUpdaters] = useState<Record<string, { id: string; name: string; avatarUrl: string }>>({});
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [promotionsModalOpen, setPromotionsModalOpen] = useState(false);
  const [discountsModalOpen, setDiscountsModalOpen] = useState(false);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [headerServer, setHeaderServer] = useState({
    data: null as { id: string; name: string; iconUrl: string | null } | null,
    loading: true,
    guilds: [] as Array<{ id: string; name: string; iconUrl: string | null; isSetup: boolean }>,
  });
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedback>({});
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [mailLoading, setMailLoading] = useState(true);
  const [mailError, setMailError] = useState<string | null>(null);
  const [activeMail, setActiveMail] = useState<MailItem | null>(null);
  const activeServerName = headerServer.data?.name ?? 'Sunucu bilinmiyor';
  const [activityReadiness, setActivityReadiness] = useState<ActivityReadiness | null>(null);
  const [activityReadinessLoading, setActivityReadinessLoading] = useState(true);

  const isBlockedByReadiness = Boolean(activityReadiness?.blocking);

  const effectiveSection = unauthorized && activeSection !== 'store' ? 'overview' : activeSection;

  const getCurrentGuildId = () => {
    if (typeof window === 'undefined') return null;

    const urlGuildId = new URL(window.location.href).searchParams.get('guild_id');
    if (urlGuildId) {
      // URL'den gelen guild_id varsa hem cookie hem localStorage'da güncelle
      try {
        window.localStorage.setItem('selectedGuildId', urlGuildId);
      } catch {
        // ignore
      }
      document.cookie = `selected_guild_id=${urlGuildId}; path=/; max-age=31536000`;
      return urlGuildId;
    }

    const localGuildId = window.localStorage.getItem('selectedGuildId');
    if (localGuildId) return localGuildId;

    const cookieMatch = document.cookie.match(/(?:^|; )selected_guild_id=([^;]+)/);
    if (cookieMatch) return decodeURIComponent(cookieMatch[1] || '');

    return null;
  };

  const checkActivityReadiness = useCallback(async () => {
    setActivityReadinessLoading(true);
    try {
      const guildId = getCurrentGuildId();
      const readinessUrl = `/api/activity/readiness${guildId ? `?guild_id=${encodeURIComponent(guildId)}` : ''}`;
      const response = await fetchWithCreds(readinessUrl, { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as ActivityReadiness | null;

      if (data && typeof data.status === 'string') {
        setActivityReadiness(data);
      } else {
        setActivityReadiness({
          status: 'discord_api_error',
          blocking: true,
          guildId: null,
          guildName: null,
          isAdmin: false,
          canInviteBot: false,
          inviteUrl: null,
        });
      }
    } catch {
      setActivityReadiness({
        status: 'discord_api_error',
        blocking: true,
        guildId: null,
        guildName: null,
        isAdmin: false,
        canInviteBot: false,
        inviteUrl: null,
      });
    } finally {
      setActivityReadinessLoading(false);
    }
  }, []);

  const loadSelectedServer = useCallback(async (attempt = 1): Promise<void> => {
    if (unauthorizedRef.current) return;

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    try {
      const guildId = getCurrentGuildId();
      const serverInfoUrl = `/api/member/server-info${guildId ? `?guild_id=${encodeURIComponent(guildId)}` : ''}`;
      const response = await fetchWithCreds(serverInfoUrl);
      if (response.ok) {
        const data = (await response.json()) as { id: string; name: string; iconUrl: string | null };
        setHeaderServer(prev => ({ ...prev, data }));
        return;
      }
      if (response.status === 401) return;
      if (attempt < 2) {
        await sleep(1000);
        return loadSelectedServer(attempt + 1);
      }
    } catch {
      if (attempt < 2) {
        await sleep(1000);
        return loadSelectedServer(attempt + 1);
      }
    }
  }, []);

  useEffect(() => {
    // mirror `unauthorized` into a ref so effects can read it without
    // changing dependency array lengths.
    unauthorizedRef.current = unauthorized;
  }, [unauthorized]);

  useEffect(() => {
    if (!splashDone) return;
    void checkActivityReadiness();
  }, [checkActivityReadiness, splashDone]);

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setMaintenanceLoading(false);
      return;
    }

    let isMounted = true;

    const loadMaintenance = async () => {
      if (isMounted) {
        setMaintenanceLoading(true);
      }
      const response = await fetch(apiUrl('/api/maintenance'), { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as {
          flags: Record<string, { is_active: boolean; reason: string | null; updated_by?: string | null }>;
          updaterProfiles?: Record<string, { id: string; name: string; avatarUrl: string }>;
        };
        if (isMounted) {
          setMaintenanceFlags(data.flags ?? {});
          setMaintenanceUpdaters(data.updaterProfiles ?? {});
        }
      } else {
        if (isMounted) {
          setMaintenanceFlags({});
          setMaintenanceUpdaters({});
        }
      }
      if (isMounted) {
        setMaintenanceLoading(false);
      }
    };

    loadMaintenance();

    // Developer rol kontrolü
    const token = (() => { try { return localStorage.getItem('discord_bearer_token'); } catch { return null; } })();
    fetch(apiUrl('/api/activity/is-developer'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((d: { isDeveloper?: boolean }) => { if (isMounted && d.isDeveloper) setIsDeveloper(true); })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [activityReadinessLoading, isBlockedByReadiness]);

  const isSiteMaintenance = Boolean(maintenanceFlags?.site?.is_active);
  const siteReason = maintenanceFlags?.site?.reason;
  const isStoreMaintenance = Boolean(maintenanceFlags?.store?.is_active);
  const storeReason = maintenanceFlags?.store?.reason;
  const storeUpdater = maintenanceFlags?.store?.updated_by ? maintenanceUpdaters[maintenanceFlags.store.updated_by] : null;
  const isPromotionsMaintenance = Boolean(
    maintenanceFlags?.promotions?.is_active || maintenanceFlags?.discounts?.is_active,
  );
  const promotionsReason =
    maintenanceFlags?.promotions?.reason ?? maintenanceFlags?.discounts?.reason ?? null;
  const isTransfersMaintenance = Boolean(maintenanceFlags?.transfers?.is_active);
  const transfersReason = maintenanceFlags?.transfers?.reason;
  const siteUpdater = maintenanceFlags?.site?.updated_by ? maintenanceUpdaters[maintenanceFlags.site.updated_by] : null;
  const promotionsUpdater = maintenanceFlags?.promotions?.updated_by
    ? maintenanceUpdaters[maintenanceFlags.promotions.updated_by]
    : maintenanceFlags?.discounts?.updated_by
      ? maintenanceUpdaters[maintenanceFlags.discounts.updated_by]
      : null;

  useEffect(() => {
    if (!maintenanceLoading && isSiteMaintenance && !isDeveloper) {
      router.replace('/maintenance');
    }
  }, [isSiteMaintenance, maintenanceLoading, isDeveloper, router]);

  const refreshMailRef = useRef<() => Promise<void>>();
  const refreshWalletRef = useRef<() => Promise<void>>();
  const refreshStoreRef = useRef<() => Promise<void>>();

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setMailLoading(false);
      return;
    }

    const refreshMail = async () => {
      setMailLoading(true);
      try {
        const response = await fetchWithCreds(apiUrl('/api/mail'));
        if (response.ok) {
          const data = (await response.json()) as MailItem[];
          setMailItems(data);
          setMailError(null);
        } else {
          // Hata anında mevcut listeyi koruyup sadece banner göster
          setMailError('Mailler güncellenemedi. Mevcut liste gösteriliyor.');
        }
      } catch {
        setMailError('Mailler güncellenemedi. Mevcut liste gösteriliyor.');
      }
      setMailLoading(false);
    };

    refreshMailRef.current = refreshMail;

    // initial load
    refreshMail();

    const onRefresh = () => {
      void refreshMail();
    };
    window.addEventListener('mail:refresh', onRefresh as EventListener);

    return () => {
      window.removeEventListener('mail:refresh', onRefresh as EventListener);
    };
  }, [activityReadinessLoading, isBlockedByReadiness]);

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetchWithCreds(apiUrl('/api/notifications'));
        if (response.ok) {
          const data = (await response.json()) as Notification[];
          setNotifications(data);
        }
      } catch {
        // Bildirimler yüklenemedi, sessizce devam et
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [activityReadinessLoading, isBlockedByReadiness]);

  useEffect(() => {
    if (!notificationsOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!notificationsMenuRef.current) {
        return;
      }
      if (!notificationsMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }

    const handleClick = (event: MouseEvent) => {
      if (!settingsMenuRef.current) {
        return;
      }
      if (!settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setProfileLoading(false);
      return;
    }

    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const loadProfile = async (attempt = 1): Promise<void> => {
      try {
        const response = await fetchWithCreds('/api/member/profile');
        if (response.status === 401) {
          setUnauthorized(true);
          setProfileLoading(false);
          return;
        }
        if (!response.ok) {
          if (attempt < 3) {
            await sleep(1000 * attempt);
            return loadProfile(attempt + 1);
          }
          setProfileError('Profil bilgileri alÄ±namadÄ±.');
          setProfileLoading(false);
          return;
        }
        const data = (await response.json()) as MemberProfile;
        setProfile(data);
        setProfileLoading(false);
      } catch {
        if (attempt < 3) {
          await sleep(1000 * attempt);
          return loadProfile(attempt + 1);
        }
        setProfileError('Profil bilgileri alÄ±namadÄ±.');
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [activityReadinessLoading, isBlockedByReadiness]);

  const refreshWalletBalance = useCallback(async () => {
    try {
      const response = await fetchWithCreds('/api/member/wallet');
      if (response.ok) {
        const data = (await response.json()) as { balance: number; mari_balance?: number };
        setWalletBalance(Number(data.balance ?? 0));
        setMariBalance(Number(data.mari_balance ?? 0));
      } else if (response.status === 401) {
        setUnauthorized(true);
      }
    } catch (error) {
      console.warn('Wallet balance refresh failed:', error);
    }
  }, []);
  refreshWalletRef.current = refreshWalletBalance;

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setWalletLoading(false);
      return;
    }

    const loadWallet = async () => {
      await refreshWalletBalance();
      setWalletLoading(false);
    };

    loadWallet();
  }, [activityReadinessLoading, isBlockedByReadiness, unauthorized, refreshWalletBalance]);

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setOverviewLoading(false);
      return;
    }

    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    const loadOverview = async (attempt = 1): Promise<void> => {
      try {
        const response = await fetchWithCreds('/api/member/overview');
        if (response.ok) {
          const data = (await response.json()) as OverviewStats;
          setOverviewStats(data);
        } else if (attempt < 3) {
          await sleep(1000 * attempt);
          return loadOverview(attempt + 1);
        }
      } catch {
        if (attempt < 3) {
          await sleep(1000 * attempt);
          return loadOverview(attempt + 1);
        }
        console.warn('Overview yüklenemedi (tüm denemeler başarısız)');
      }
      setOverviewLoading(false);
    };

    const loadAccrued = async () => {
      try {
        await fetchWithCreds('/api/member/load-accrued', { method: 'POST' });
      } catch (err) {
        console.warn('Accrued earnings sync failed:', err);
      }
    };

    const loadBadges = async () => {
      try {
        const response = await fetchWithCreds('/api/member/badges');
        if (response.ok) {
          const data = (await response.json()) as BadgeInfo;
          setBadgeInfo(data);
        }
      } catch {
        // badge bilgisi yüklenemezse sessizce geç
      }
    };

    const run = async () => {
      await loadAccrued();
      await loadOverview();
      await loadBadges();
    };

    run();
  }, [activityReadinessLoading, isBlockedByReadiness]);

  const refreshStoreItems = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setStoreItemsLoading(true);
    } else {
      setStoreLoadingMore(true);
    }

    try {
      const response = await fetchWithCreds(`/api/member/store?page=${page}&limit=20`);
      if (response.ok) {
        const data = (await response.json()) as {
          items: StoreItem[];
          hasMore?: boolean;
          ownedRoleIds?: string[];
        };

        setStoreItems((prev) =>
          append ? [...prev, ...(data.items ?? [])] : (data.items ?? []),
        );
        setStorePage(page);
        setStoreHasMore(data.hasMore ?? ((data.items?.length ?? 0) >= 20));
        if (!append && data.ownedRoleIds) setOwnedRoleIds(data.ownedRoleIds);
      }
    } catch (err) {
      console.warn('MaÄŸaza Ã¼rÃ¼nleri yÃ¼klenemedi:', err);
    } finally {
      if (page === 1) {
        setStoreItemsLoading(false);
      } else {
        setStoreLoadingMore(false);
      }
    }
  }, []);
  refreshStoreRef.current = () => refreshStoreItems(1, false);

  const handleSelectServer = useCallback(async (guildId: string) => {
    if (unauthorizedRef.current || isActivityEmbed) return;

    document.cookie = `selected_guild_id=${guildId}; path=/; max-age=31536000`;
    setHeaderServer(prev => ({ ...prev, loading: true }));

    try {
      await loadSelectedServer();
      await checkActivityReadiness();
    } finally {
      setHeaderServer(prev => ({ ...prev, loading: false }));
    }

    await refreshWalletBalance();
    await refreshStoreItems(1, false);
  }, [checkActivityReadiness, isActivityEmbed, loadSelectedServer, refreshWalletBalance, refreshStoreItems]);

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) {
      setStoreItemsLoading(false);
      return;
    }

    const loadStoreItems = async () => {
      await refreshStoreItems(1, false);
    };

    loadStoreItems();
  }, [activityReadinessLoading, isBlockedByReadiness, refreshStoreItems, unauthorized]);

  // Realtime abonelikleri
  useRealtimeDashboard({
    guildId: getCurrentGuildId(),
    userId: profile?.userId ?? null,
    onWalletUpdate: (balance) => setWalletBalance(balance),
    onMailInsert: () => { void refreshMailRef.current?.(); },
    onNotificationInsert: () => {
      void fetchWithCreds(apiUrl('/api/notifications'))
        .then((r) => r.ok ? r.json() : null)
        .then((data: unknown) => { if (Array.isArray(data)) setNotifications(data as Notification[]); })
        .catch(() => {});
    },
    onOverviewStatsUpdate: () => {
      void fetchWithCreds('/api/member/overview')
        .then((r) => r.ok ? r.json() : null)
        .then((data: unknown) => { if (data && typeof data === 'object') setOverviewStats(data as OverviewStats); })
        .catch(() => {});
    },
  });

  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) return;
    if (unauthorizedRef.current) return;

    void loadSelectedServer();

    const interval = setInterval(() => {
      if (unauthorizedRef.current) return;
      tickRef.current += 1;
      void refreshMailRef.current?.();
      if (tickRef.current % 2 === 0) void refreshWalletRef.current?.();
      if (tickRef.current % 20 === 0) void refreshStoreRef.current?.();
    }, 15000);

    return () => clearInterval(interval);
  }, [activityReadinessLoading, isBlockedByReadiness, loadSelectedServer]);

  const loginUrl = useMemo(() => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '';
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? '';
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&response_type=code&scope=identify%20guilds%20guilds.members.read`;
  }, []);

  const moneyFormatter = useMemo(
    () => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [],
  );

  const handleTransfer = async () => {
    if (isSiteMaintenance || isTransfersMaintenance) {
      setTransferError(transfersReason ?? 'Papel gÃ¶nderme bakÄ±mdadÄ±r.');
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);

    const amountValue = Number(transferAmount);
    if (!transferRecipientId.trim()) {
      setTransferError('AlÄ±cÄ± ID zorunlu.');
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setTransferError('GeÃ§erli bir miktar girin.');
      return;
    }

    setTransferLoading(true);
    const response = await fetchWithCreds('/api/member/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: transferRecipientId.trim(), amount: amountValue }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      senderBalance?: number;
      taxAmount?: number;
    };

    if (!response.ok) {
      if (data.error === 'invalid_amount') {
        setTransferError('GeÃ§ersiz miktar.');
      } else if (data.error === 'self_transfer') {
        setTransferError('Kendinize transfer yapamazsÄ±nÄ±z.');
      } else if (data.error === 'insufficient_funds') {
        setTransferError('Yetersiz bakiye.');
      } else if (data.error === 'daily_limit_exceeded') {
        setTransferError('GÃ¼nlÃ¼k transfer limiti aÅŸÄ±ldÄ±.');
      } else if (data.error === 'invalid_payload') {
        setTransferError('Eksik bilgi gÃ¶nderildi.');
      } else if (data.error === 'unauthorized') {
        setTransferError('Oturum gerekli.');
      } else {
        setTransferError('Transfer baÅŸarÄ±sÄ±z.');
      }
      setTransferLoading(false);
      return;
    }

    if (typeof data.senderBalance === 'number') {
      setWalletBalance(data.senderBalance);
    }
    setTransferSuccess(`Transfer tamamlandÄ±. Kesinti: ${Number(data.taxAmount ?? 0).toFixed(2)} papel.`);
    setTransferRecipientId('');
    setTransferAmount('');
    setTransferLoading(false);
    // Bakiye gÃ¼ncellemesi iÃ§in yeniden yÃ¼kle
    await refreshWalletBalance();
  };

  const mailUnreadCount = useMemo(
    () => mailItems.filter((item) => !item.is_read).length,
    [mailItems],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const markNotificationRead = useCallback(async (id: string) => {
    await fetch(apiUrl('/api/notifications'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  }, []);

  const handleOpenNotification = useCallback((item: Notification) => {
    setActiveNotification(item);
    if (!item.is_read) {
      void markNotificationRead(item.id);
    }
  }, [markNotificationRead]);

  const renderPapelAmount = (value: number) => (
    <span className="inline-flex items-center gap-2">
      <Image src="/papel.gif" alt="papel" width={18} height={18} className="h-4 w-4" />
      <span className="text-white">{moneyFormatter.format(value)}</span>
      <span className="text-xs text-white/40">papel</span>
    </span>
  );

  const formatRoleColor = (color: number) =>
    color ? `#${color.toString(16).padStart(6, '0')}` : '#64748b';

  const renderNotificationBody = useCallback((body: string) => {
    const safeBody = sanitizeHtml(body);
    return <span dangerouslySetInnerHTML={{ __html: safeBody }} />;
  }, []);

  const handleCloseNotificationModal = useCallback(() => {
    setActiveNotification(null);
  }, []);

  // mail detail is now a standalone page (see /dashboard/mail/[id])

  const handleCloseTransferModal = useCallback(() => {
    setTransferModalOpen(false);
    setTransferError(null);
    setTransferSuccess(null);
  }, []);

  const handleCloseNotificationsModal = useCallback(() => {
    setNotificationsModalOpen(false);
    setActiveNotification(null);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen((prev) => !prev);
  }, []);

  const handleOpenNotificationsModal = useCallback(() => {
    setNotificationsOpen(false);
    setNotificationsModalOpen(true);
  }, []);

  const handleNotificationClick = useCallback((item: Notification) => {
    handleOpenNotification(item);
    setNotificationsOpen(false);
  }, [handleOpenNotification]);

  const handleToggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setActiveSection('settings');
    setSettingsOpen(false);
  }, []);

  const handleOpenTransfer = useCallback(() => {
    if (isSiteMaintenance || isTransfersMaintenance) {
      setTransferError(transfersReason ?? 'Papel gÃ¶nderme bakÄ±mdadÄ±r.');
      setTransferSuccess(null);
      setTransferModalOpen(true);
      setSettingsOpen(false);
      return;
    }
    setTransferModalOpen(true);
    setSettingsOpen(false);
    setTransferError(null);
    setTransferSuccess(null);
  }, [isSiteMaintenance, isTransfersMaintenance, transfersReason]);

  const handleAddToCart = (_item: StoreItem) => {
    try {
      cart.addToCart(_item);
    } catch (err) {
      console.error('Sepete eklenemedi:', err);
    }
  };

  const openPromotionsModal = () => {
    setActiveSection('settings');
    setSettingsOpen(false);
    setPromotionsModalOpen(true);
  };

  const openDiscountsModal = () => {
    setActiveSection('settings');
    setSettingsOpen(false);
    setDiscountsModalOpen(true);
  };


  const handleApplyPromoCode = async () => {
    // TODO: promo code API entegrasyonu
  };

  const handlePurchase = async (itemId: string) => {
    if (isSiteMaintenance || isStoreMaintenance) {
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: 'Mağaza bakımda' } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
      return;
    }

    setPurchaseLoadingId(itemId);
    setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })); // clear previous

    const response = await fetchWithCreds('/api/member/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ itemId, qty: 1 }] }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      newBalance?: number;
      mailInserted?: boolean;
    };

    setPurchaseLoadingId(null);

    if (!response.ok) {
      const errorMessages: Record<string, string> = {
        missing_bot_token: 'Bot yapılandırması eksik, yöneticiye haber ver.',
        bot_missing_manage_roles: 'Botun rol yönetim yetkisi yok.',
        bot_role_hierarchy: 'Botun rol sırası hedef rolden düşük, yönetici düzeltmeli.',
        insufficient_balance: 'Yetersiz bakiye.',
        item_not_found: 'Ürün bulunamadı.',
        invalid_item_price: 'Ürün fiyatı geçersiz, yöneticiye haber ver.',
        already_owned: 'Bu ürüne zaten sahipsin.',
        role_not_found: 'Rol bulunamadı.',
        not_verified: 'Hesabın doğrulanmamış.',
        server_not_found: 'Sunucu ayarları bulunamadı, kurulum tekrar yapılmalı.',
        no_guild_selected: 'Sunucu seçimi bulunamadı, Activity\'yi yeniden aç.',
        forbidden: 'Erişim reddedildi.',
        rollback_failed: 'İşlem sırasında hata oluştu, yönetici bilgilendirildi.',
        role_assign_failed: 'Rol verilemedi, ödeme alınmadı.',
      };
      const msg = errorMessages[data.error ?? ''] || data.error || 'Satın alma başarısız.';
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: msg } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 4000);
      return;
    }

    if (data.success && typeof data.newBalance === 'number') {
      setWalletBalance(data.newBalance);
      const successMsg = data.mailInserted === false
        ? 'Satın alındı! (Bildirim maili gönderilemedi)'
        : 'Satın alındı!';
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'success', message: successMsg } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
    } else {
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: 'Bilinmeyen hata oluştu.' } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
    }
    // Bakiye ve maÄŸaza Ã¼rÃ¼nleri gÃ¼ncellemesi iÃ§in yeniden yÃ¼kle
    await refreshWalletBalance();
    await refreshStoreItems();
  };

  const handleLoadMoreStore = async () => {
    if (storeLoadingMore || !storeHasMore) return;
    await refreshStoreItems(storePage + 1, true);
  };

  const mainWrapperClass = effectiveSection === 'mail'
    ? 'mx-0 w-full max-w-full px-0'
    : effectiveSection === 'market'
      ? 'mx-0 w-full max-w-full px-0'
      : effectiveSection === 'store'
        ? isActivityEmbed
          ? 'mx-0 w-full max-w-full px-0'
          : 'w-full max-w-4xl px-0 sm:px-6'
        : 'w-full max-w-4xl px-4 sm:px-6';
  const mainSpacingClass = effectiveSection === 'mail'
    ? 'py-0 gap-0'
    : effectiveSection === 'market'
      ? 'md:pt-16 pb-0 gap-0'
      : effectiveSection === 'store'
        ? isActivityEmbed
          ? 'md:pt-20 pb-28 gap-0 md:pb-0'
          : 'md:pt-20 pb-28 sm:pb-10 gap-0 sm:gap-6 md:pb-0'
        : 'md:pt-24 pb-6 gap-6';

  // Splash — readiness sorgulanmadan önce gösterilir
  if (!splashDone) {
    return (
      <SplashScreen
        onEnter={() => setSplashDone(true)}
      />
    );
  }

  if (activityReadinessLoading) {
    return (
      <div className="relative isolate flex min-h-screen w-full flex-col items-start justify-end overflow-hidden bg-[#0b0d12] px-6 pb-10 sm:px-10 sm:pb-12">
        {true && (
          <>
            <video
              src="/cdn/Storage/test.mp4"
              autoPlay loop muted playsInline disablePictureInPicture
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </>
        )}
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
            <p className="text-sm text-white/50">Sunucu durumu kontrol ediliyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (activityReadiness?.blocking) {
    return (
      <ActivityReadinessGate
        readiness={activityReadiness}
        loading={activityReadinessLoading}
        onRetry={() => {
          void checkActivityReadiness();
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-[#0b0d12] text-white overflow-hidden flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {effectiveSection !== 'mail' && !unauthorized && (
          <SidebarNav
            effectiveSection={effectiveSection}
            unauthorized={unauthorized}
            onNavigate={setActiveSection}
            profile={profile}
          />
        )}

        {/* Sağ taraf: header + main */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden bg-[#0e1018]">
        {effectiveSection !== 'mail' && (
        <DashboardHeader
          isActivityEmbed={isActivityEmbed}
          unauthorized={unauthorized}
          walletLoading={walletLoading}
          walletBalance={walletBalance}
          mariBalance={mariBalance}
          loginUrl={loginUrl}
          server={{ ...headerServer, onSelectServer: isActivityEmbed ? undefined : handleSelectServer }}
          navigation={{
            activeSection: effectiveSection,
            onNavigate: setActiveSection,
          }}
          profile={
            profile
              ? {
                  name: profile.nickname ?? profile.displayName ?? profile.username,
                  username: profile.username,
                  avatarUrl: profile.avatarUrl ?? null,
                }
              : null
          }
          profileLoading={profileLoading}
          notifications={{
            open: notificationsOpen,
            unreadCount,
            loading,
            items: notifications,
            onToggle: handleToggleNotifications,
            onOpenModal: handleOpenNotificationsModal,
            onOpenNotification: handleNotificationClick,
            menuRef: notificationsMenuRef,
          }}
          mailUnreadCount={mailUnreadCount}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          renderNotificationBody={renderNotificationBody}
          settings={{
            open: settingsOpen,
            onToggle: handleToggleSettings,
            onOpenSettings: handleOpenSettings,
            onOpenReferral: () => {
              router.push('/dashboard/referral');
            },
            onOpenTransfer: handleOpenTransfer,
            onOpenPromotions: openPromotionsModal,
            onOpenDiscounts: openDiscountsModal,
            onOpenEarnings: () => setEarningsModalOpen(true),
            onOpenMariConvert: async () => {
              setMariConvertOpen(true);
              setMariConvertError(null);
              setMariConvertSuccess(null);
              setMariConvertInput('');
              setMariConvertInfo(null);
              try {
                const res = await fetchWithCreds('/api/member/mari-convert');
                if (res.ok) {
                  const d = await res.json() as NonNullable<typeof mariConvertInfo>;
                  setMariConvertInfo(d);
                }
              } catch { /* ignore */ }
            },
            menuRef: settingsMenuRef,
          }}
        />
        )}

        <main className={`${mainWrapperClass} flex-1 ${mainSpacingClass} overflow-y-auto custom-scrollbar`}>
            {!maintenanceLoading && isSiteMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <p className="text-sm font-semibold text-amber-200">Site bakÄ±mda</p>
                <p className="mt-2 text-sm text-amber-100/80">
                  {siteReason ?? 'Sistem geÃ§ici olarak bakÄ±ma alÄ±nmÄ±ÅŸtÄ±r. LÃ¼tfen daha sonra tekrar deneyin.'}
                </p>
                {siteUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <Image
                      src={siteUpdater.avatarUrl}
                      alt="avatar"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {siteUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {unauthorized && (
              <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
                <p className="text-sm font-semibold text-rose-200">Oturumunuz sonlandÄ±</p>
                <p className="mt-2 text-sm text-rose-100/80">LÃ¼tfen tekrar giriÅŸ yapÄ±n.</p>
                <Link
                  href={loginUrl}
                  className="mt-4 inline-flex rounded-full border border-rose-300/40 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-200"
                >
                  Discord ile tekrar giriÅŸ
                </Link>
              </section>
            )}
            {!isSiteMaintenance && effectiveSection === 'overview' && (
              <>
                {/* Server quick stats removed as requested */}
                <OverviewSection
                  overviewLoading={overviewLoading}
                  overviewStats={overviewStats}
                  profileLoading={profileLoading}
                  profileError={profileError}
                  unauthorized={unauthorized}
                  profile={profile}
                  renderPapelAmount={renderPapelAmount}
                  formatRoleColor={formatRoleColor}
                  badgeInfo={badgeInfo}
                />
                
              </>
            )}

            <LeaderboardDrawer
              isOpen={leaderboardOpen}
              onClose={() => setLeaderboardOpen(false)}
              overviewStats={overviewStats}
              overviewLoading={overviewLoading}
              profile={profile}
              renderPapelAmount={renderPapelAmount}
            />

            {!isSiteMaintenance && effectiveSection === 'profile' && (
              <ProfileSection
                profileLoading={profileLoading}
                profileError={profileError}
                unauthorized={unauthorized}
                profile={profile}
                formatRoleColor={formatRoleColor}
              />
            )}

            {effectiveSection === 'store' && !isSiteMaintenance && isStoreMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {storeReason ?? 'MaÄŸaza geÃ§ici olarak bakÄ±mdadÄ±r.'}
                {storeUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <Image
                      src={storeUpdater.avatarUrl}
                      alt="avatar"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {storeUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'store' && !isSiteMaintenance && !isStoreMaintenance && (
              <StoreSection
                storeLoading={storeItemsLoading}
                isLoadingMore={storeLoadingMore}
                hasMore={storeHasMore}
                onLoadMore={handleLoadMoreStore}
                items={storeItems}
                purchaseLoadingId={purchaseLoadingId}
                purchaseFeedback={purchaseFeedback}
                onPurchase={handlePurchase}
                onAddToCart={handleAddToCart}
                renderPapelAmount={renderPapelAmount}
                ownedRoleIds={ownedRoleIds}
              />
            )}

            {effectiveSection === 'settings' && !isSiteMaintenance && isPromotionsMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {promotionsReason ?? 'Promosyon ve indirim kodlarÄ± ÅŸu anda bakÄ±mdadÄ±r.'}
                {promotionsUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <Image
                      src={promotionsUpdater.avatarUrl}
                      alt="avatar"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>Yetkili: {promotionsUpdater.name}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'settings' && !isSiteMaintenance && !isPromotionsMaintenance && (
              <SettingsSection
                onOpenPromotionsModal={openPromotionsModal}
                onOpenDiscountsModal={openDiscountsModal}
                currentGuildName={headerServer.data?.name ?? null}
              />
            )}

            {effectiveSection === 'raffles' && !isSiteMaintenance && (
              <RafflesSection
                badgeInfo={badgeInfo}
                loading={!badgeInfo && !unauthorized}
                onJoinRaffle={async (raffleId) => {
                  const response = await fetchWithCreds('/api/member/raffles/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ raffle_id: raffleId }),
                  });
                  if (!response.ok) {
                    const data = (await response.json().catch(() => ({}))) as { error?: string };
                    throw new Error(data.error ?? 'join_failed');
                  }
                  // Refresh badge info to reflect joined state
                  const refreshed = await fetchWithCreds('/api/member/badges');
                  if (refreshed.ok) {
                    const data = (await refreshed.json()) as typeof badgeInfo;
                    setBadgeInfo(data);
                  }
                }}
              />
            )}

            {effectiveSection === 'mail' && !isSiteMaintenance && (
              <MailSection
                loading={mailLoading}
                error={mailError}
                items={mailItems}
                serverName={activeServerName}
                onOpenMail={async (mail) => {
                  setActiveMail(mail);
                  if (!mail.is_read) {
                    try {
                      await fetchWithCreds(apiUrl('/api/mail'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: mail.id }),
                      });
                      setMailItems(prev => prev.map(m => String(m.id) === String(mail.id) ? { ...m, is_read: true } : m));
                    } catch {}
                  }
                }}
                onBack={() => setActiveSection('overview')}
              />
            )}

            {effectiveSection === 'discover' && (
              <DiscoverSection />
            )}
            {effectiveSection === 'market' && (
              <MarketSection userId={profile?.userId} />
            )}
            {effectiveSection === 'treasury' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <TreasuryCard />
              </div>
            )}
          </main>
        </div>
      <NotificationsModal
        open={notificationsModalOpen}
        loading={loading}
        notifications={notifications}
        activeNotification={activeNotification}
        onClose={handleCloseNotificationsModal}
        onOpenNotification={handleOpenNotification}
        renderNotificationBody={renderNotificationBody}
      />
      <NotificationDetailModal
        notification={activeNotification}
        onClose={handleCloseNotificationModal}
      />
      {/* Mail detail moved to dedicated page */}
      <TransferModal
        open={transferModalOpen}
        recipientId={transferRecipientId}
        amount={transferAmount}
        loading={transferLoading}
        error={transferError}
        success={transferSuccess}
        onRecipientChange={setTransferRecipientId}
        onAmountChange={setTransferAmount}
        onClose={handleCloseTransferModal}
        onSubmit={handleTransfer}
      />
      <PromotionsModal
        isOpen={promotionsModalOpen}
        onClose={() => setPromotionsModalOpen(false)}
        onApply={handleApplyPromoCode}
        loading={false}
        error={null}
        success={null}
      />

      {activeMail && (
        <MailDetailModal
          mail={activeMail}
          onClose={() => setActiveMail(null)}
          onDelete={async (id) => {
            try {
              await fetchWithCreds(apiUrl('/api/mail'), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
              });
              setMailItems(prev => prev.filter(m => String(m.id) !== String(id)));
              setActiveMail(null);
            } catch {}
          }}
          onStar={async (id) => {
            try {
              const mail = mailItems.find(m => String(m.id) === String(id));
              const method = mail?.is_starred ? 'DELETE' : 'POST';
              await fetchWithCreds(apiUrl('/api/mail/star'), {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: String(id) }),
              });
              setMailItems(prev => prev.map(m => String(m.id) === String(id) ? { ...m, is_starred: !m.is_starred } : m));
              setActiveMail(prev => prev && String(prev.id) === String(id) ? { ...prev, is_starred: !prev.is_starred } : prev);
            } catch {}
          }}
        />
      )}

      <EarningsModal
        open={earningsModalOpen}
        onClose={() => setEarningsModalOpen(false)}
      />

      {/* MRI Dönüştürme Modal */}
      {mariConvertOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setMariConvertOpen(false)}>
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0f1116] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-white/[0.06] px-5 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Image src="/Mari.gif" alt="Mari" width={20} height={20} className="h-5 w-5" unoptimized />
                  <p className="text-sm font-bold text-white">Papel → Mari Dönüştür</p>
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">Papel harcayarak global rezerv para birimi edin</p>
              </div>
              <button type="button" onClick={() => setMariConvertOpen(false)} className="text-white/30 hover:text-white/70 text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {mariConvertInfo ? (
                <>
                  {/* Kur ve limit bilgisi */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Kur</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Image src="/Mari.gif" alt="Mari" width={14} height={14} className="h-3.5 w-3.5" unoptimized />
                        <p className="text-sm font-bold text-white">= {mariConvertInfo.mari_rate.toLocaleString('tr-TR')} P</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">Papel Bakiye</p>
                      <p className="text-sm font-bold text-white mt-0.5">{mariConvertInfo.papel_balance.toLocaleString('tr-TR')} P</p>
                    </div>
                  </div>
                  {/* Limitler */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>Sunucu günlük limit</span>
                        <span className="flex items-center gap-1">{mariConvertInfo.server_used_today.toFixed(3)} / {mariConvertInfo.server_limit} <Image src="/Mari.gif" alt="" width={10} height={10} className="h-2.5 w-2.5 inline" unoptimized /></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (mariConvertInfo.server_used_today / mariConvertInfo.server_limit) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>Global günlük limit</span>
                        <span className="flex items-center gap-1">{mariConvertInfo.global_used_today.toFixed(3)} / {mariConvertInfo.global_limit} <Image src="/Mari.gif" alt="" width={10} height={10} className="h-2.5 w-2.5 inline" unoptimized /></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, (mariConvertInfo.global_used_today / mariConvertInfo.global_limit) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  {/* Input */}
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1.5">Dönüştürmek istediğin papel miktarı</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={mariConvertInput}
                        onChange={e => setMariConvertInput(e.target.value)}
                        placeholder="0"
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setMariConvertInput(String(Math.floor(Math.min(mariConvertInfo.papel_balance, (mariConvertInfo.server_limit - mariConvertInfo.server_used_today) * mariConvertInfo.mari_rate))))}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
                      >MAX</button>
                    </div>
                    {mariConvertInput && Number(mariConvertInput) > 0 && (
                      <p className="text-[11px] text-violet-400 mt-1.5">
                        ≈ {(Number(mariConvertInput) / mariConvertInfo.mari_rate).toFixed(6)} <Image src="/Mari.gif" alt="Mari" width={12} height={12} className="h-3 w-3 inline" unoptimized /> alacaksın
                      </p>
                    )}
                  </div>
                  {mariConvertError && <p className="text-xs text-rose-400">{mariConvertError}</p>}
                  {mariConvertSuccess && <p className="text-xs text-emerald-400">{mariConvertSuccess}</p>}
                  <button
                    type="button"
                    disabled={mariConvertLoading || !mariConvertInput || Number(mariConvertInput) <= 0}
                    onClick={async () => {
                      setMariConvertLoading(true);
                      setMariConvertError(null);
                      setMariConvertSuccess(null);
                      try {
                        const res = await fetchWithCreds('/api/member/mari-convert', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ papel_amount: Number(mariConvertInput) }),
                        });
                        const d = await res.json() as { error?: string; mari_received?: number; new_mari_balance?: number };
                        if (!res.ok) {
                          setMariConvertError(d.error ?? 'Dönüşüm başarısız');
                        } else {
                          setMariConvertSuccess(`${(d.mari_received ?? 0).toFixed(6)} Mari edinildi!`);
                          setMariBalance(d.new_mari_balance ?? mariBalance);
                          setMariConvertInput('');
                          const infoRes = await fetchWithCreds('/api/member/mari-convert');
                          if (infoRes.ok) setMariConvertInfo(await infoRes.json() as NonNullable<typeof mariConvertInfo>); // eslint-disable-line @typescript-eslint/no-explicit-any
                        }
                      } catch {
                        setMariConvertError('Bağlantı hatası');
                      }
                      setMariConvertLoading(false);
                    }}
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-bold text-white transition"
                  >
                    {mariConvertLoading ? 'Dönüştürülüyor...' : 'Dönüştür'}
                  </button>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-white/30">Yükleniyor...</div>
              )}
            </div>
          </div>
        </div>
      )}

      <DiscountsModal
        isOpen={discountsModalOpen}
        onClose={() => setDiscountsModalOpen(false)}
        onApply={async (code: string) => {
          // minimal handler: attempt to post and close
          try {
            await fetch(apiUrl('/api/discount/validate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
          } catch {
            // ignore
          }
          setDiscountsModalOpen(false);
        }}
      />
      </div>
    </div>
  );
}



