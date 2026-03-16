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
import ReferralSection from './components/ReferralSection';
import MailSection from './components/MailSection';
import NotificationDetailModal from './components/NotificationDetailModal';
import NotificationsModal from './components/NotificationsModal';
import TransferModal from './components/TransferModal';
import PromotionsModal from './components/PromotionsModal';
import DiscountsModal from './components/DiscountsModal';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import type {
  MemberProfile,
  Notification,
  OverviewStats,
  OverviewStatsExpanded,
  StoreItem,
  MailItem,
  PurchaseFeedback,
  Section,
} from './types';

export default function DashboardPage() {
  const cart = useCart();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const unauthorizedRef = useRef(unauthorized);
  const tickRef = useRef(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | OverviewStatsExpanded | null>(null);
  const [, setAdminOverview] = useState<any | null>(null);
  const [, setAdminOverviewLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [storeItemsLoading, setStoreItemsLoading] = useState(true);
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
  const [promotionsModalOpen, setPromotionsModalOpen] = useState(false);
  const [discountsModalOpen, setDiscountsModalOpen] = useState(false);
  const [headerServer, setHeaderServer] = useState({
    data: null as { id: string; name: string; iconUrl: string | null } | null,
    loading: true,
    guilds: [] as Array<{ id: string; name: string; iconUrl: string | null; isAdmin: boolean; isSetup: boolean }>,
  });
  const [purchaseFeedback, setPurchaseFeedback] = useState<PurchaseFeedback>({});
  const [purchaseLoadingId, setPurchaseLoadingId] = useState<string | null>(null);
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [mailLoading, setMailLoading] = useState(true);
  const [mailError, setMailError] = useState<string | null>(null);

  const effectiveSection = unauthorized && activeSection !== 'store' ? 'overview' : activeSection;

  const loadSelectedServer = useCallback(async (attempt = 1): Promise<void> => {
    if (unauthorizedRef.current) return;

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    try {
      const response = await fetchWithCreds('/api/member/server-info');
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

    return () => {
      isMounted = false;
    };
  }, []);

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
    if (!maintenanceLoading && isSiteMaintenance) {
      router.replace('/maintenance');
    }
  }, [isSiteMaintenance, maintenanceLoading, router]);

  const refreshMailRef = useRef<() => Promise<void>>();
  const refreshWalletRef = useRef<() => Promise<void>>();
  const refreshStoreRef = useRef<() => Promise<void>>();

  useEffect(() => {
    const refreshMail = async () => {
      setMailLoading(true);
      try {
        const response = await fetch(apiUrl('/api/mail'));
        if (response.ok) {
          const data = (await response.json()) as MailItem[];
          setMailItems(data);
          setMailError(null);
        } else {
          setMailError('Mail bilgileri alınamadı.');
        }
      } catch {
        setMailError('Mail bilgileri alınamadı.');
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
  }, []);

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
          setProfileError('Profil bilgileri alınamadı.');
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
        setProfileError('Profil bilgileri alınamadı.');
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const refreshWalletBalance = async () => {
    try {
      const response = await fetchWithCreds('/api/member/wallet');
      if (response.ok) {
        const data = (await response.json()) as { balance: number };
        setWalletBalance(Number(data.balance ?? 0));
      } else if (response.status === 401) {
        setUnauthorized(true);
      }
    } catch (error) {
      console.warn('Wallet balance refresh failed:', error);
    }
  };
  refreshWalletRef.current = refreshWalletBalance;

  useEffect(() => {
    const loadWallet = async () => {
      await refreshWalletBalance();
      setWalletLoading(false);
    };

    loadWallet();
  }, [unauthorized]);

  useEffect(() => {
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

    loadOverview();
  }, []);

  useEffect(() => {
    // fetch admin overview stats if user has admin guilds
    const hasAdminGuilds = Array.isArray(headerServer.guilds) && headerServer.guilds.length > 0;
    if (!hasAdminGuilds) return;
    let isMounted = true;
    const loadAdminOverview = async () => {
      setAdminOverviewLoading(true);
      try {
        const res = await fetch(apiUrl('/api/admin/overview-stats?rangeHours=24'), { cache: 'no-store' });
        if (!res.ok) {
          setAdminOverview(null);
          setAdminOverviewLoading(false);
          return;
        }
        const data = await res.json();
        if (isMounted) setAdminOverview(data);
      } catch (err) {
        console.warn('Admin overview yüklenemedi:', err);
        if (isMounted) setAdminOverview(null);
      }
      if (isMounted) setAdminOverviewLoading(false);
    };
    void loadAdminOverview();
    return () => { isMounted = false; };
  }, [headerServer.guilds]);

  const refreshStoreItems = async (page = 1, append = false) => {
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
        };

        setStoreItems((prev) =>
          append ? [...prev, ...(data.items ?? [])] : (data.items ?? []),
        );
        setStorePage(page);
        setStoreHasMore(data.hasMore ?? ((data.items?.length ?? 0) >= 20));
      }
    } catch (err) {
      console.warn('Mağaza ürünleri yüklenemedi:', err);
    } finally {
      if (page === 1) {
        setStoreItemsLoading(false);
      } else {
        setStoreLoadingMore(false);
      }
    }
  };
  refreshStoreRef.current = () => refreshStoreItems(1, false);

  const handleSelectServer = useCallback(async (guildId: string) => {
    if (unauthorizedRef.current || isActivityEmbed) return;

    document.cookie = `selected_guild_id=${guildId}; path=/; max-age=31536000`;
    setHeaderServer(prev => ({ ...prev, loading: true }));

    try {
      await loadSelectedServer();
    } finally {
      setHeaderServer(prev => ({ ...prev, loading: false }));
    }

    await refreshWalletBalance();
    await refreshStoreItems(1, false);
  }, [isActivityEmbed, loadSelectedServer, refreshWalletBalance, refreshStoreItems]);

  useEffect(() => {
    const loadStoreItems = async () => {
      await refreshStoreItems(1, false);
    };

    loadStoreItems();
  }, [unauthorized]);

  useEffect(() => {
    if (unauthorized || isActivityEmbed) return;
    let isMounted = true;

    const loadServerData = async () => {
      if (isMounted) setHeaderServer(prev => ({ ...prev, loading: true }));
      try {
        const adminGuilds = localStorage.getItem('adminGuilds');
        if (!adminGuilds) {
          if (isMounted) setHeaderServer(prev => ({ ...prev, loading: false }));
          return;
        }

        try {
          const parsedGuilds = JSON.parse(adminGuilds);
          type GuildFromStorage = {
            id: string;
            name: string;
            icon?: string | null;
            isAdmin?: boolean;
            isSetup?: boolean;
          };
          const guilds = (parsedGuilds as GuildFromStorage[]).map((guild) => ({
            id: guild.id,
            name: guild.name,
            iconUrl: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
            isAdmin: guild.isAdmin || false,
            isSetup: guild.isSetup || false,
          }));
          if (isMounted) setHeaderServer(prev => ({ ...prev, guilds, loading: false }));
        } catch (parseError) {
          console.warn('adminGuilds parse hatası:', parseError);
          if (isMounted) setHeaderServer(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.warn('Server verisi yüklenemedi:', error);
        if (isMounted) setHeaderServer(prev => ({ ...prev, loading: false }));
      }
    };

    loadServerData();
    return () => { isMounted = false; };
  }, [unauthorized, isActivityEmbed]);

  useEffect(() => {
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
  }, [loadSelectedServer]);

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
      setTransferError(transfersReason ?? 'Papel gönderme bakımdadır.');
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);

    const amountValue = Number(transferAmount);
    if (!transferRecipientId.trim()) {
      setTransferError('Alıcı ID zorunlu.');
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setTransferError('Geçerli bir miktar girin.');
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
        setTransferError('Geçersiz miktar.');
      } else if (data.error === 'self_transfer') {
        setTransferError('Kendinize transfer yapamazsınız.');
      } else if (data.error === 'insufficient_funds') {
        setTransferError('Yetersiz bakiye.');
      } else if (data.error === 'daily_limit_exceeded') {
        setTransferError('Günlük transfer limiti aşıldı.');
      } else if (data.error === 'invalid_payload') {
        setTransferError('Eksik bilgi gönderildi.');
      } else if (data.error === 'unauthorized') {
        setTransferError('Oturum gerekli.');
      } else {
        setTransferError('Transfer başarısız.');
      }
      setTransferLoading(false);
      return;
    }

    if (typeof data.senderBalance === 'number') {
      setWalletBalance(data.senderBalance);
    }
    setTransferSuccess(`Transfer tamamlandı. Kesinti: ${Number(data.taxAmount ?? 0).toFixed(2)} papel.`);
    setTransferRecipientId('');
    setTransferAmount('');
    setTransferLoading(false);
    // Bakiye güncellemesi için yeniden yükle
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

  const markNotificationRead = async (id: string) => {
    await fetch(apiUrl('/api/notifications'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  };

  const handleOpenNotification = (item: Notification) => {
    setActiveNotification(item);
    if (!item.is_read) {
      void markNotificationRead(item.id);
    }
  };

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
  }, []);

  const handleToggleSettings = useCallback(() => {
    setSettingsOpen((prev) => !prev);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setActiveSection('settings');
    setSettingsOpen(false);
  }, []);

  const handleOpenTransfer = useCallback(() => {
    if (isSiteMaintenance || isTransfersMaintenance) {
      setTransferError(transfersReason ?? 'Papel gönderme bakımdadır.');
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
    };

    setPurchaseLoadingId(null);

    if (!response.ok) {
      const errorMessages: Record<string, string> = {
        bot_missing_manage_roles: 'Bot rol yönetim yetkisine sahip değil',
        insufficient_balance: 'Yetersiz bakiye',
        item_not_found: 'Ürün bulunamadı',
        already_owned: 'Bu ürüne zaten sahipsiniz',
        role_not_found: 'Rol bulunamadı',
        not_verified: 'Hesabınız doğrulanmamış',
        forbidden: 'Erişim reddedildi',
      };
      const msg = errorMessages[data.error ?? ''] || data.error || 'Satın alma başarısız';
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: msg } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
      return;
    }

    if (data.success && typeof data.newBalance === 'number') {
      setWalletBalance(data.newBalance);
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'success', message: 'Satın alındı!' } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
    } else {
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: 'Bilinmeyen hata' } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
    }
    // Bakiye ve mağaza ürünleri güncellemesi için yeniden yükle
    await refreshWalletBalance();
    await refreshStoreItems();
  };

  const handleLoadMoreStore = async () => {
    if (storeLoadingMore || !storeHasMore) return;
    await refreshStoreItems(storePage + 1, true);
  };

  const mainWrapperClass = effectiveSection === 'mail'
    ? 'mx-0 w-full max-w-full px-0'
    : effectiveSection === 'store'
      ? isActivityEmbed
        ? 'mx-0 w-full max-w-full px-0'
        : 'mx-auto max-w-6xl px-0 sm:px-6'
      : 'mx-auto max-w-6xl px-3 sm:px-6';
  const mainSpacingClass = effectiveSection === 'mail'
    ? 'py-0 gap-0'
    : effectiveSection === 'store'
      ? isActivityEmbed
        ? 'md:pt-20 pb-28 gap-0 md:pb-0'
        : 'md:pt-20 pb-28 sm:pb-10 gap-0 sm:gap-6 md:pb-0'
      : 'md:pt-24 pb-28 md:pt-24 md:pb-0 gap-6';

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white overflow-auto">
      <div className="flex flex-col min-h-0 h-full">
        {effectiveSection !== 'mail' && (
        <DashboardHeader
          unauthorized={unauthorized}
          walletLoading={walletLoading}
          walletBalance={walletBalance}
          loginUrl={loginUrl}
          isDeveloper={false}
          isAdmin={false}
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
          renderNotificationBody={renderNotificationBody}
          leaderboardOpen={leaderboardOpen}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          settings={{
            open: settingsOpen,
            onToggle: handleToggleSettings,
            onOpenSettings: handleOpenSettings,
            onOpenReferral: () => {
              setActiveSection('store');
              setTimeout(() => {
                document.getElementById('referral-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 50);
            },
            onOpenTransfer: handleOpenTransfer,
            onOpenPromotions: openPromotionsModal,
            onOpenDiscounts: openDiscountsModal,
            logoutHref: '/api/auth/logout',
            menuRef: settingsMenuRef,
          }}
        />
        )}

        <main className={`${mainWrapperClass} flex-1 flex flex-col min-h-0 ${mainSpacingClass} overflow-y-auto custom-scrollbar`}>
            {!maintenanceLoading && isSiteMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                <p className="text-sm font-semibold text-amber-200">Site bakımda</p>
                <p className="mt-2 text-sm text-amber-100/80">
                  {siteReason ?? 'Sistem geçici olarak bakıma alınmıştır. Lütfen daha sonra tekrar deneyin.'}
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
                <p className="text-sm font-semibold text-rose-200">Oturumunuz sonlandı</p>
                <p className="mt-2 text-sm text-rose-100/80">Lütfen tekrar giriş yapın.</p>
                <Link
                  href={loginUrl}
                  className="mt-4 inline-flex rounded-full border border-rose-300/40 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-200"
                >
                  Discord ile tekrar giriş
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
                />
                {/* Chat is now a separate page at /chat */}
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
                {storeReason ?? 'Mağaza geçici olarak bakımdadır.'}
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
              <>
                <ReferralSection />
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
                />
              </>
            )}

            {effectiveSection === 'settings' && !isSiteMaintenance && isPromotionsMaintenance && (
              <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100/80">
                {promotionsReason ?? 'Promosyon ve indirim kodları şu anda bakımdadır.'}
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
              />
            )}

            {effectiveSection === 'mail' && !isSiteMaintenance && (
              <MailSection
                loading={mailLoading}
                error={mailError}
                items={mailItems}
                onOpenMail={(mail) => router.push(`/dashboard/mail/${mail.id}`)}
                onBack={() => setActiveSection('overview')}
              />
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
  );
}
