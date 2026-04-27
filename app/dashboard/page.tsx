'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { apiUrl } from '@/lib/api';
import { setCurrentSection } from '@/lib/errorContext';
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
import SessionExpiredModal from './components/SessionExpiredModal';
import DiscoverSection from './components/DiscoverSection';
import MarketSection from './components/MarketSection';
import BorsaSection from './components/BorsaSection';
import BorsaDetailSection from './components/BorsaDetailSection';
import PortfolioSection from './components/PortfolioSection';
import DividendSection from './components/DividendSection';
import IpoSection from './components/IpoSection';
import EconomyApplySection from './components/EconomyApplySection';
import TagBadgeSection from './components/TagBadgeSection';
import IpoApplySection from './components/IpoApplySection';
import MarketNewsSection from './components/MarketNewsSection';
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
import { useT } from '@/contexts/LocaleContext';
import { getDiscordSdk } from '@/lib/discordSdk';
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
  const t = useT();
  const cart = useCart();
  const router = useRouter();
  const openLink = useCallback(async (url: string) => {
    try {
      const sdk = getDiscordSdk();
      if (sdk) { await sdk.commands.openExternalLink({ url }); return; }
    } catch { /* fallback */ }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const DEFAULT_MUSIC_TRACK = '/music/music.mp3';
  const [splashDone, setSplashDone] = useState(false);
  const dashboardMusicRef = useRef<HTMLAudioElement | null>(null);
  const [musicReady, setMusicReady] = useState(false);
  const musicPlaylistRef = useRef<string[]>([]);
  const MUSIC_ENABLED_KEY = 'dashboard_music_enabled';
  const MUSIC_VOLUME_KEY = 'dashboard_music_volume';

  const getSavedMusicEnabled = () => {
    if (typeof window === 'undefined') return true;
    const value = window.localStorage.getItem(MUSIC_ENABLED_KEY);
    return value === null ? true : value === 'true';
  };

  const getSavedMusicVolume = () => {
    if (typeof window === 'undefined') return 0.7;
    const value = window.localStorage.getItem(MUSIC_VOLUME_KEY);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.7;
  };

  const updateAudioFromSettings = () => {
    if (!dashboardMusicRef.current) return;
    const enabled = getSavedMusicEnabled();
    const volume = getSavedMusicVolume();
    dashboardMusicRef.current.muted = !enabled;
    dashboardMusicRef.current.volume = volume;
    if (!enabled) {
      dashboardMusicRef.current.pause();
    } else if (dashboardMusicRef.current.paused) {
      void dashboardMusicRef.current.play().catch(() => {});
    }
  };
  const shufflePlaylist = useCallback((tracks: string[]) => {
    const list = [...tracks];
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, []);
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
  const [economyApproved, setEconomyApproved] = useState(false);
  const [mariConvertOpen, setMariConvertOpen] = useState(false);
  const [mariConvertInfo, setMariConvertInfo] = useState<{ mari_rate: number; server_used_today: number; global_used_today: number; papel_balance: number; mari_balance: number; server_limit: number; global_limit: number } | null>(null);
  const [mariConvertInput, setMariConvertInput] = useState('');
  const [mariConvertLoading, setMariConvertLoading] = useState(false);
  const [mariConvertError, setMariConvertError] = useState<string | null>(null);
  const [mariConvertSuccess, setMariConvertSuccess] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | OverviewStatsExpanded | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [pendingEarnings, setPendingEarnings] = useState<{ pending: number; messageTotal: number; voiceTotal: number; count: number } | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [badgeInfo, setBadgeInfo] = useState<BadgeInfo | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [storeItemsLoading, setStoreItemsLoading] = useState(true);
  const [ownedRoleIds, setOwnedRoleIds] = useState<string[]>([]);
  const [storePage, setStorePage] = useState(1);
  const [storeHasMore, setStoreHasMore] = useState(true);
  const [storeLoadingMore, setStoreLoadingMore] = useState(false);
  const [activeSection, setActiveSectionState] = useState<Section>('overview');
  const setActiveSection = useCallback((s: Section) => {
    setActiveSectionState(s);
    setCurrentSection(s);
  }, []);
  const [borsaDetailGuildId, setBorsaDetailGuildId] = useState<string | null>(null);
  const [dividendGuildId, setDividendGuildId] = useState<string | null>(null);

  const handleBorsaNavigate = useCallback((section: Section, extra?: unknown) => {
    if (section === 'borsa-detail' && typeof extra === 'string') {
      setBorsaDetailGuildId(extra);
      setActiveSection('borsa-detail');
    } else if (section === 'dividend' && typeof extra === 'string') {
      setDividendGuildId(extra);
      setActiveSection('dividend');
    } else {
      setActiveSection(section);
    }
  }, []);
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

  useEffect(() => {
    let isMounted = true;

    const loadPlaylist = async () => {
      try {
        const response = await fetch('/api/dashboard-music', { cache: 'no-store' });
        if (!response.ok) throw new Error('playlist fetch failed');
        const data = await response.json();
        const tracks = Array.isArray(data.tracks) && data.tracks.length > 0
          ? data.tracks
          : [DEFAULT_MUSIC_TRACK];
        const shuffled = shufflePlaylist(tracks);
        musicPlaylistRef.current = shuffled;
      } catch {
        musicPlaylistRef.current = [DEFAULT_MUSIC_TRACK];
      } finally {
        if (isMounted) setMusicReady(true);
      }
    };

    void loadPlaylist();

    return () => {
      isMounted = false;
    };
  }, [shufflePlaylist]);

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
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [discountsModalOpen, setDiscountsModalOpen] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountSuccess, setDiscountSuccess] = useState<string | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
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
  const activeServerName = headerServer.data?.name ?? t('server_unknown');
  const [activityReadiness, setActivityReadiness] = useState<ActivityReadiness | null>(null);
  const [activityReadinessLoading, setActivityReadinessLoading] = useState(true);

  useEffect(() => {
    if (!splashDone || activityReadinessLoading || activityReadiness?.blocking || !musicReady) return;
    if (dashboardMusicRef.current) return;
    if (musicPlaylistRef.current.length === 0) return;

    let currentIndex = 0;
    const audio = new Audio(musicPlaylistRef.current[currentIndex]);
    audio.preload = 'auto';
    audio.loop = musicPlaylistRef.current.length === 1;

    const tryPlay = async () => {
      const enabled = getSavedMusicEnabled();
      audio.muted = !enabled;
      audio.volume = getSavedMusicVolume();
      try {
        await audio.play();
        return true;
      } catch {
        return false;
      }
    };

    let pendingGesture = false;
    const onUserGesture = async () => {
      if (pendingGesture) {
        pendingGesture = false;
        if (await tryPlay()) {
          document.removeEventListener('pointerdown', onUserGesture, true);
        }
      }
    };

    const playTrack = async (track: string) => {
      if (audio.src !== track) {
        audio.src = track;
      }
      const played = await tryPlay();
      if (!played) {
        pendingGesture = true;
        document.addEventListener('pointerdown', onUserGesture, true);
      }
    };

    const handleEnded = () => {
      currentIndex = (currentIndex + 1) % musicPlaylistRef.current.length;
      void playTrack(musicPlaylistRef.current[currentIndex]);
    };

    const handleSettingsChange = () => {
      if (!dashboardMusicRef.current) return;
      updateAudioFromSettings();
    };

    window.addEventListener('dashboard-music-settings-changed', handleSettingsChange);
    audio.addEventListener('ended', handleEnded);
    dashboardMusicRef.current = audio;
    void playTrack(musicPlaylistRef.current[currentIndex]);

    return () => {
      document.removeEventListener('pointerdown', onUserGesture, true);
      window.removeEventListener('dashboard-music-settings-changed', handleSettingsChange);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.currentTime = 0;
      if (dashboardMusicRef.current === audio) {
        dashboardMusicRef.current = null;
      }
    };
  }, [splashDone, activityReadinessLoading, activityReadiness?.blocking, musicReady]);

  const isBlockedByReadiness = Boolean(activityReadiness?.blocking);

  const ADVANCED_ONLY_SECTIONS: Section[] = ['borsa', 'borsa-detail', 'portfolio', 'dividend', 'ipo-apply', 'ipo', 'market-news', 'market', 'treasury'];
  const effectiveSection = unauthorized && activeSection !== 'store'
    ? 'overview'
    : activeSection === 'treasury'
      ? 'overview'
    : (!economyApproved && ADVANCED_ONLY_SECTIONS.includes(activeSection as Section))
      ? 'economy-apply'
      : activeSection;

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
        const data = (await response.json()) as { balance: number; mari_balance?: number; economy_approved?: boolean };
        setWalletBalance(Number(data.balance ?? 0));
        setEconomyApproved(data.economy_approved ?? false);
        setMariBalance(data.economy_approved ? Number(data.mari_balance ?? 0) : 0);
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

    const loadPendingEarnings = async () => {
      try {
        const res = await fetchWithCreds('/api/member/load-accrued');
        if (res.ok) {
          const data = await res.json();
          setPendingEarnings(data);
        }
      } catch (err) {
        console.error('[pending-earnings] fetch failed:', err);
      }
    };

    const loadBadges = async () => {
      try {
        const response = await fetchWithCreds('/api/member/badges');
        if (response.ok) {
          const data = (await response.json()) as BadgeInfo;
          setBadgeInfo(data);
        } else {
          // API hata döndürdüğünde loading ekranında takılmaması için boş set et
          setBadgeInfo({ currentBadge: null, nextBadge: null, tagDays: 0, daysToNext: null, hasTag: false, earnMultiplier: 1, allTiers: [] });
        }
      } catch {
        setBadgeInfo({ currentBadge: null, nextBadge: null, tagDays: 0, daysToNext: null, hasTag: false, earnMultiplier: 1, allTiers: [] });
      }
    };

    const run = async () => {
      await Promise.all([loadPendingEarnings(), loadOverview(), loadBadges()]);
    };

    run();
  }, [activityReadinessLoading, isBlockedByReadiness]);

  const claimEarnings = useCallback(async () => {
    setClaimLoading(true);
    try {
      const res = await fetchWithCreds('/api/member/load-accrued', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.totalTransferred > 0) {
          setWalletBalance(prev => Number((prev + data.totalTransferred).toFixed(2)));
        }
        setPendingEarnings({ pending: 0, messageTotal: 0, voiceTotal: 0, count: 0 });
      } else {
        const errorData = await res.json().catch(() => ({ error: 'unknown' }));
        console.error('[claim-earnings] API error:', errorData);
        // Optionally show user error
      }
    } catch (err) {
      console.error('[claim-earnings] failed:', err);
      // Optionally show user error
    }
    setClaimLoading(false);
  }, []);

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
      setTransferError(transfersReason ?? t('transfer_error_maintenance'));
      return;
    }

    setTransferError(null);
    setTransferSuccess(null);

    const amountValue = Number(transferAmount);
    if (!transferRecipientId.trim()) {
      setTransferError(t('transfer_error_no_recipient'));
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setTransferError(t('transfer_error_invalid_amount'));
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
        setTransferError(t('transfer_error_invalid_amount_api'));
      } else if (data.error === 'self_transfer') {
        setTransferError(t('transfer_error_self'));
      } else if (data.error === 'insufficient_funds') {
        setTransferError(t('transfer_error_insufficient'));
      } else if (data.error === 'daily_limit_exceeded') {
        setTransferError(t('transfer_error_daily_limit'));
      } else if (data.error === 'invalid_payload') {
        setTransferError(t('transfer_error_invalid_payload'));
      } else if (data.error === 'unauthorized') {
        setTransferError(t('transfer_error_unauthorized'));
      } else {
        setTransferError(t('transfer_error_generic'));
      }
      setTransferLoading(false);
      return;
    }

    if (typeof data.senderBalance === 'number') {
      setWalletBalance(data.senderBalance);
    }
    setTransferSuccess(t('transfer_success', { amount: Number(data.taxAmount ?? 0).toFixed(2) }));
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
      setTransferError(transfersReason ?? t('transfer_error_maintenance'));
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


  const handleApplyPromoCode = async (code: string) => {
    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);
    try {
      const res = await fetchWithCreds('/api/promotion/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { success?: boolean; message?: string; amount?: number; newBalance?: number; error?: string };
      if (!res.ok) {
        const errorMap: Record<string, string> = {
          wrong_server: t('promo_error_wrong_server'),
          invalid_code: t('promo_error_invalid_code'),
          expired: t('promo_error_expired'),
          usage_limit_exceeded: t('promo_error_usage_limit'),
          already_used: t('promo_error_already_used'),
          profile_not_found: t('promo_error_profile_not_found'),
          wallet_update_failed: t('promo_error_wallet_failed'),
        };
        setPromoError(errorMap[data.error ?? ''] ?? t('promo_error_generic'));
      } else {
        setPromoSuccess(t('promo_success', { amount: data.amount ?? 0 }));
        if (typeof data.newBalance === 'number') setWalletBalance(data.newBalance);
        setTimeout(() => { setPromoSuccess(null); setPromotionsModalOpen(false); }, 2000);
      }
    } catch {
      setPromoError(t('promo_error_generic'));
    }
    setPromoLoading(false);
  };

  const handlePurchase = async (itemId: string) => {
    if (isSiteMaintenance || isStoreMaintenance) {
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: t('purchase_error_maintenance') } }));
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
        missing_bot_token: t('purchase_error_missing_bot_token'),
        bot_missing_manage_roles: t('purchase_error_bot_manage_roles'),
        bot_role_hierarchy: t('purchase_error_bot_hierarchy'),
        insufficient_balance: t('purchase_error_insufficient_balance'),
        item_not_found: t('purchase_error_item_not_found'),
        invalid_item_price: t('purchase_error_invalid_price'),
        already_owned: t('purchase_error_already_owned'),
        role_not_found: t('purchase_error_role_not_found'),
        not_verified: t('purchase_error_not_verified'),
        server_not_found: t('purchase_error_server_not_found'),
        no_guild_selected: t('purchase_error_no_guild'),
        forbidden: t('purchase_error_forbidden'),
        rollback_failed: t('purchase_error_rollback_failed'),
        role_assign_failed: t('purchase_error_role_assign_failed'),
      };
      const msg = errorMessages[data.error ?? ''] || data.error || t('purchase_error_generic');
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: msg } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 4000);
      return;
    }

    if (data.success && typeof data.newBalance === 'number') {
      setWalletBalance(data.newBalance);
      const successMsg = data.mailInserted === false
        ? t('purchase_success_no_mail')
        : t('purchase_success');
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'success', message: successMsg } }));
      setTimeout(() => setPurchaseFeedback(prev => ({ ...prev, [itemId]: undefined })), 3000);
    } else {
      setPurchaseFeedback(prev => ({ ...prev, [itemId]: { status: 'error', message: t('purchase_error_unknown') } }));
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

  const FULL_WIDTH_SECTIONS = ['mail', 'market', 'store', 'economy-apply'];
  const mainWrapperClass = FULL_WIDTH_SECTIONS.includes(effectiveSection)
    ? (effectiveSection === 'store' && !isActivityEmbed)
      ? 'w-full max-w-4xl px-0 sm:px-6'
      : 'mx-0 w-full max-w-full px-0'
    : 'w-full max-w-4xl px-4 sm:px-6';
  // pb-20 on mobile ensures content clears the fixed bottom nav bar (~64px + safe area)
  const mainSpacingClass = effectiveSection === 'mail'
    ? 'py-0 gap-0 pb-20 lg:pb-0'
    : effectiveSection === 'market'
      ? 'md:pt-16 pb-20 lg:pb-0 gap-0'
      : effectiveSection === 'store'
        ? isActivityEmbed
          ? 'md:pt-20 pb-28 gap-0 md:pb-0'
          : 'md:pt-20 pb-28 sm:pb-10 gap-0 sm:gap-6 md:pb-0'
        : effectiveSection === 'economy-apply'
            ? 'pt-6 md:pt-16 pb-0 gap-0'
            : 'md:pt-24 pb-20 lg:pb-6 gap-6';

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
        onBackToSplash={() => {
          setSplashDone(false);
        }}
        openLink={openLink}
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
            isAdvancedEconomy={economyApproved}
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
          mariBalance={economyApproved ? mariBalance : undefined}
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
          openLink={openLink}
          isAdvancedEconomy={economyApproved}
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
            onOpenMariConvert: economyApproved ? async () => {
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
            } : undefined,
            menuRef: settingsMenuRef,
          }}
        />
        )}

        <main className={`${mainWrapperClass} flex flex-col flex-1 ${mainSpacingClass} overflow-y-auto custom-scrollbar bg-[#0e1018]`}>
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
            {unauthorized && <SessionExpiredModal loginUrl={loginUrl} />}
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
                  pendingEarnings={pendingEarnings}
                  claimLoading={claimLoading}
                  onClaim={claimEarnings}
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
                {promotionsReason ?? t('promotions_maintenance_fallback')}
                {promotionsUpdater && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-amber-100/70">
                    <Image
                      src={promotionsUpdater.avatarUrl}
                      alt="avatar"
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full border border-amber-200/40"
                    />
                    <span>{t('promotions_maintenance_authority', { name: promotionsUpdater.name })}</span>
                  </div>
                )}
              </section>
            )}
            {effectiveSection === 'settings' && !isSiteMaintenance && !isPromotionsMaintenance && (
              <SettingsSection
                onOpenPromotionsModal={openPromotionsModal}
                onOpenDiscountsModal={openDiscountsModal}
                currentGuildName={headerServer.data?.name ?? null}
                profile={profile}
              />
            )}

            {effectiveSection === 'tag-badge' && !isSiteMaintenance && (
              <TagBadgeSection
                badgeInfo={badgeInfo}
                loading={!badgeInfo && !unauthorized}
                overviewStats={overviewStats}
              />
            )}

            {effectiveSection === 'mail' && !isSiteMaintenance && (
              <MailSection
                loading={mailLoading}
                error={mailError}
                items={mailItems}
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
              <MarketSection userId={profile?.userId} economyApproved={economyApproved} />
            )}

            {effectiveSection === 'borsa' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <BorsaSection onNavigate={handleBorsaNavigate} />
              </div>
            )}

            {effectiveSection === 'borsa-detail' && borsaDetailGuildId && (
              <div className="p-4 sm:p-6 lg:p-8">
                <BorsaDetailSection
                  guildId={borsaDetailGuildId}
                  onBack={() => setActiveSection('borsa')}
                  onNavigate={handleBorsaNavigate}
                />
              </div>
            )}

            {effectiveSection === 'portfolio' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <PortfolioSection onNavigate={handleBorsaNavigate} />
              </div>
            )}

            {effectiveSection === 'dividend' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <DividendSection guildId={dividendGuildId ?? undefined} />
              </div>
            )}

            {effectiveSection === 'ipo' && borsaDetailGuildId && (
              <div className="p-4 sm:p-6 lg:p-8">
                <IpoSection
                  guildId={borsaDetailGuildId}
                  onBack={() => setActiveSection('borsa')}
                  onNavigate={handleBorsaNavigate}
                />
              </div>
            )}

            {effectiveSection === 'ipo-apply' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <IpoApplySection />
              </div>
            )}

            {effectiveSection === 'economy-apply' && (
              <div className="flex flex-1 min-h-0 w-full">
                <EconomyApplySection />
              </div>
            )}

            {effectiveSection === 'market-news' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <MarketNewsSection />
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
        onClose={() => { setPromotionsModalOpen(false); setPromoError(null); setPromoSuccess(null); }}
        onApply={handleApplyPromoCode}
        loading={promoLoading}
        error={promoError}
        success={promoSuccess}
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
                  <p className="text-sm font-bold text-white">{t('mari_convert_title')}</p>
                </div>
                <p className="text-[11px] text-white/40 mt-0.5">{t('mari_convert_subtitle')}</p>
              </div>
              <button type="button" onClick={() => setMariConvertOpen(false)} className="text-white/30 hover:text-white/70 text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {mariConvertInfo ? (
                <>
                  {/* Kur ve limit bilgisi */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('mari_convert_rate_label')}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Image src="/Mari.gif" alt="Mari" width={14} height={14} className="h-3.5 w-3.5" unoptimized />
                        <p className="text-sm font-bold text-white">= {mariConvertInfo.mari_rate.toLocaleString()} P</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('mari_convert_balance_label')}</p>
                      <p className="text-sm font-bold text-white mt-0.5">{mariConvertInfo.papel_balance.toLocaleString()} P</p>
                    </div>
                  </div>
                  {/* Limitler */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>{t('mari_convert_server_limit')}</span>
                        <span className="flex items-center gap-1">{mariConvertInfo.server_used_today.toFixed(3)} / {mariConvertInfo.server_limit} <Image src="/Mari.gif" alt="" width={10} height={10} className="h-2.5 w-2.5 inline" unoptimized /></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (mariConvertInfo.server_used_today / mariConvertInfo.server_limit) * 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-white/40 mb-1">
                        <span>{t('mari_convert_global_limit')}</span>
                        <span className="flex items-center gap-1">{mariConvertInfo.global_used_today.toFixed(3)} / {mariConvertInfo.global_limit} <Image src="/Mari.gif" alt="" width={10} height={10} className="h-2.5 w-2.5 inline" unoptimized /></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-400" style={{ width: `${Math.min(100, (mariConvertInfo.global_used_today / mariConvertInfo.global_limit) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  {/* Input */}
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1.5">{t('mari_convert_input_label')}</label>
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
                        {t('mari_convert_will_receive', { amount: (Number(mariConvertInput) / mariConvertInfo.mari_rate).toFixed(6) })} <Image src="/Mari.gif" alt="Mari" width={12} height={12} className="h-3 w-3 inline" unoptimized />
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
                          const errorMap: Record<string, string> = {
                            economy_not_approved: t('mari_convert_error_economy_not_approved'),
                            insufficient_papel: t('mari_convert_error_insufficient_papel'),
                            server_daily_limit: t('mari_convert_error_server_daily_limit'),
                            global_daily_limit: t('mari_convert_error_global_daily_limit'),
                            amount_too_small: t('mari_convert_error_amount_too_small'),
                            no_selected_guild: t('mari_convert_error_no_guild'),
                          };
                          setMariConvertError(errorMap[d.error ?? ''] ?? t('mari_convert_error_generic'));
                        } else {
                          setMariConvertSuccess(t('mari_convert_success', { amount: (d.mari_received ?? 0).toFixed(6) }));
                          setMariBalance(d.new_mari_balance ?? mariBalance);
                          setMariConvertInput('');
                          const infoRes = await fetchWithCreds('/api/member/mari-convert');
                          if (infoRes.ok) setMariConvertInfo(await infoRes.json() as NonNullable<typeof mariConvertInfo>);
                        }
                      } catch {
                        setMariConvertError(t('mari_convert_error_connection'));
                      }
                      setMariConvertLoading(false);
                    }}
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-2.5 text-sm font-bold text-white transition"
                  >
                    {mariConvertLoading ? t('mari_convert_loading') : t('mari_convert_button')}
                  </button>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-white/30">{t('mari_convert_loading_info')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <DiscountsModal
        isOpen={discountsModalOpen}
        onClose={() => { setDiscountsModalOpen(false); setDiscountError(null); setDiscountSuccess(null); }}
        onApply={async (code: string) => {
          setDiscountLoading(true);
          setDiscountError(null);
          setDiscountSuccess(null);
          try {
            const res = await fetchWithCreds('/api/discount/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (!res.ok) {
              const errorMap: Record<string, string> = {
                wrong_server: t('discount_error_wrong_server'),
                invalid_code: t('discount_error_invalid_code'),
                expired: t('discount_error_expired'),
                usage_limit_exceeded: t('discount_error_usage_limit'),
                item_not_found: t('discount_error_item_not_found'),
              };
              setDiscountError(errorMap[data.error ?? ''] ?? t('discount_error_generic'));
            } else {
              setDiscountSuccess(t('coupon_applied_success'));
              setTimeout(() => { setDiscountSuccess(null); setDiscountsModalOpen(false); }, 2000);
            }
          } catch {
            setDiscountError(t('discount_error_generic'));
          }
          setDiscountLoading(false);
        }}
        loading={discountLoading}
        error={discountError}
        success={discountSuccess}
      />
      </div>
    </div>
  );
}


