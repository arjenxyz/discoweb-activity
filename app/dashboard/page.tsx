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
import UiClickSound from './components/UiClickSound';
import MailSection from './components/MailSection';
import SessionExpiredModal from './components/SessionExpiredModal';
import TagBadgeSection from './components/TagBadgeSection';
import QuizEventSection from './components/QuizEventSection';
import WatchEarnSection from './components/WatchEarnSection';
import NotificationDetailModal from './components/NotificationDetailModal';
import NotificationsModal from './components/NotificationsModal';
import TransferModal, { TransferConfirmModal } from './components/TransferModal';
import PromotionsModal from './components/PromotionsModal';
import DiscountsModal from './components/DiscountsModal';
import ActivityReadinessGate, { type ActivityReadiness } from './components/ActivityReadinessGate';
import SplashScreen from './components/SplashScreen';
import IncidentOverlay from './components/IncidentOverlay';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { useRealtimeDashboard } from '@/lib/utils/useRealtimeDashboard';
import { useT } from '@/contexts/LocaleContext';
import { getDiscordSdk } from '@/lib/discordSdk';
import DuyuruPage from './duyuru/page';
import { ENABLE_TAG_BADGE_SECTION } from './featureFlags';
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
  const [quizImmersive, setQuizImmersive] = useState(false);
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
    if (!Number.isFinite(parsed)) return 0.7;
    // Settings UI stores 0–100; older values may already be 0–1
    const normalized = parsed > 1 ? parsed / 100 : parsed;
    return Math.min(1, Math.max(0, normalized));
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
  const [walletLoading, setWalletLoading] = useState(true);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | OverviewStatsExpanded | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [pendingEarnings, setPendingEarnings] = useState<{ pending: number; messageTotal: number; voiceTotal: number; count: number } | null>(null);
  const [claimResult, setClaimResult] = useState<{ kind: 'idle' | 'success' | 'error' | 'empty'; message?: string }>({ kind: 'idle' });
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

        document.documentElement.dataset.reduceMotion =
          window.localStorage.getItem('dashboard_reduce_motion') === 'true' ? 'true' : 'false';
        document.documentElement.dataset.uiDensity =
          window.localStorage.getItem('dashboard_ui_density') === 'compact' ? 'compact' : 'normal';
      }
    } catch {}
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPlaylist = async () => {
      try {
        const response = await fetchWithCreds('/api/dashboard-music', { cache: 'no-store' });
        if (!response.ok) throw new Error('playlist fetch failed');
        const data = await response.json() as { tracks?: unknown };
        const tracks = Array.isArray(data.tracks)
          ? data.tracks.filter((track: unknown): track is string => typeof track === 'string' && track.toLowerCase().endsWith('.mp3'))
          : [];
        const playlist = tracks.length > 0 ? shufflePlaylist(tracks) : [DEFAULT_MUSIC_TRACK];
        musicPlaylistRef.current = playlist;
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
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferTaxRate, setTransferTaxRate] = useState(0);
  const [transferRecipientProfile, setTransferRecipientProfile] = useState<null | {
    userId: string;
    username: string;
    displayName?: string | null;
    nickname?: string | null;
    avatarUrl?: string | null;
  }>(null);
  const [transferRecipientStatus, setTransferRecipientStatus] = useState<'idle' | 'loading' | 'ready' | 'not_found' | 'error'>('idle');
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
  const activeServerName = headerServer.data?.name ?? t('server_unknown');
  const [activityReadiness, setActivityReadiness] = useState<ActivityReadiness | null>(null);
  const [activityReadinessLoading, setActivityReadinessLoading] = useState(true);

  const isBlockedByReadiness = Boolean(
    activityReadiness?.blocking &&
      !(
        (activityReadiness.status === 'maintenance' ||
          activityReadiness.status === 'bot_maintenance') &&
        isDeveloper
      ),
  );

  useEffect(() => {
    if (!splashDone || activityReadinessLoading || isBlockedByReadiness || !musicReady) return;
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

    const handleAudioError = () => {
      console.warn('Dashboard music track failed, skipping to next track:', audio.src);
      if (musicPlaylistRef.current.length > 1) {
        currentIndex = (currentIndex + 1) % musicPlaylistRef.current.length;
        void playTrack(musicPlaylistRef.current[currentIndex]);
      }
    };

    const handleSettingsChange = () => {
      if (!dashboardMusicRef.current) return;
      updateAudioFromSettings();
    };

    const shouldPauseWhenHidden = () => {
      if (typeof window === 'undefined') return true;
      const stored = window.localStorage.getItem('dashboard_pause_music_hidden');
      return stored === null ? true : stored === 'true';
    };

    const handleVisibilityChange = () => {
      const el = dashboardMusicRef.current;
      if (!el || !shouldPauseWhenHidden()) return;
      if (document.hidden) {
        el.pause();
      } else if (getSavedMusicEnabled()) {
        void el.play().catch(() => {});
      }
    };

    window.addEventListener('dashboard-music-settings-changed', handleSettingsChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleAudioError);
    dashboardMusicRef.current = audio;
    void playTrack(musicPlaylistRef.current[currentIndex]);

    return () => {
      document.removeEventListener('pointerdown', onUserGesture, true);
      window.removeEventListener('dashboard-music-settings-changed', handleSettingsChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleAudioError);
      audio.pause();
      audio.currentTime = 0;
      if (dashboardMusicRef.current === audio) {
        dashboardMusicRef.current = null;
      }
    };
  }, [splashDone, activityReadinessLoading, isBlockedByReadiness, musicReady]);

  const effectiveSection = unauthorized && activeSection !== 'store'
    ? 'overview'
    : !ENABLE_TAG_BADGE_SECTION && activeSection === 'tag-badge'
      ? 'overview'
      : activeSection;

  useEffect(() => {
    if (effectiveSection !== 'quiz') setQuizImmersive(false);
  }, [effectiveSection]);

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
  const isActivityMaintenance = Boolean(maintenanceFlags?.activity?.is_active);
  const isFullMaintenance = isSiteMaintenance || isActivityMaintenance;
  const siteReason =
    (isSiteMaintenance ? maintenanceFlags?.site?.reason : null) ??
    (isActivityMaintenance ? maintenanceFlags?.activity?.reason : null);
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
    if (!maintenanceLoading && isFullMaintenance && !isDeveloper) {
      router.replace('/maintenance');
    }
  }, [isFullMaintenance, maintenanceLoading, isDeveloper, router]);

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
          const data = (await response.json()) as MailItem[] | { error?: string };
          if (Array.isArray(data)) {
            setMailItems(data);
            setMailError(null);
          } else {
            setMailItems([]);
            setMailError('Mailler yüklenemedi.');
          }
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

  const loadPendingEarnings = useCallback(async () => {
    try {
      const res = await fetchWithCreds('/api/member/load-accrued?debug=1');
      const data = await res.json();
      console.log('[pending-earnings] status:', res.status, 'response:', JSON.stringify(data));
      if (res.ok) {
        setPendingEarnings(data);
        setClaimResult(prev => prev.kind === 'idle' ? { kind: 'idle' } : prev);
      } else {
        console.warn('[pending-earnings] non-ok response:', res.status, data);
      }
    } catch (err) {
      console.error('[pending-earnings] fetch failed:', err);
    }
  }, []);

  const refreshWalletBalance = useCallback(async () => {
    try {
      const response = await fetchWithCreds('/api/member/wallet');
      if (response.ok) {
        const data = (await response.json()) as { balance: number; mari_balance?: number; taxRate?: number };
        setWalletBalance(Number(data.balance ?? 0));
        setMariBalance(Number(data.mari_balance ?? 0));
        setTransferTaxRate(Number(data.taxRate ?? 0));
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
    const onWalletRefresh = () => {
      void refreshWalletRef.current?.();
    };
    window.addEventListener('wallet:refresh', onWalletRefresh);
    return () => window.removeEventListener('wallet:refresh', onWalletRefresh);
  }, []);

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

    const loadBadges = async () => {
      const fallbackBadgeInfo = {
        currentBadge: null, nextBadge: null, tagDays: 0, daysToNext: null, hasTag: false, earnMultiplier: 1, allTiers: [],
        currentBoosterBadge: null, nextBoosterBadge: null, boosterMonths: 0, monthsToNext: null, isBooster: false, boosterEarnMultiplier: 1, allBoosterTiers: []
      };
      try {
        const response = await fetchWithCreds('/api/member/badges');
        if (response.ok) {
          const data = (await response.json()) as BadgeInfo;
          setBadgeInfo(data);
        } else {
          // API hata döndürdüğünde loading ekranında takılmaması için boş set et
          setBadgeInfo(fallbackBadgeInfo);
        }
      } catch {
        setBadgeInfo(fallbackBadgeInfo);
      }
    };

    const run = async () => {
      await Promise.all([loadPendingEarnings(), loadOverview(), loadBadges()]);
    };

    run();
  }, [activityReadinessLoading, isBlockedByReadiness, loadPendingEarnings]);

  // Biriken kazancı activity tekrar öne gelince yenile (polling yok, sıfır overhead)
  useEffect(() => {
    if (activityReadinessLoading || isBlockedByReadiness) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadPendingEarnings();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [activityReadinessLoading, isBlockedByReadiness, loadPendingEarnings]);

  const claimEarnings = useCallback(async () => {
    setClaimLoading(true);
    setClaimResult({ kind: 'idle' });
    // Claim öncesi anlık miktarı yenile (kullanıcı eski değeri görmesin)
    await loadPendingEarnings();
    try {
      const res = await fetchWithCreds('/api/member/load-accrued', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.totalTransferred > 0) {
          setWalletBalance(prev => Number((prev + data.totalTransferred).toFixed(2)));
          setClaimResult({
            kind: 'success',
            message: t('pending_earnings_success', {
              amount: Number(data.totalTransferred).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            }),
          });
          setPendingEarnings({ pending: 0, messageTotal: 0, voiceTotal: 0, count: 0 });
          await refreshWalletBalance();
        } else {
          setClaimResult({ kind: 'empty', message: t('pending_earnings_empty') });
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'unknown' }));
        const message = typeof errorData?.message === 'string'
          ? errorData.message
          : typeof errorData?.error === 'string'
            ? errorData.error
            : t('pending_earnings_error');
        console.error('[claim-earnings] API error:', errorData);
        setClaimResult({ kind: 'error', message });
      }
    } catch (err) {
      console.error('[claim-earnings] failed:', err);
      setClaimResult({ kind: 'error', message: t('pending_earnings_error_retry') });
    }
    setClaimLoading(false);
  }, [refreshWalletBalance, loadPendingEarnings, t]);

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

    try {
      window.localStorage.setItem('selectedGuildId', guildId);
    } catch {
      // ignore
    }
    document.cookie = `selected_guild_id=${guildId}; path=/; max-age=31536000`;
    try {
      window.dispatchEvent(new Event('dw:guild-changed'));
    } catch {
      // ignore
    }
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
    onDailyEarningsUpdate: () => { void loadPendingEarnings(); },
    onQuizEventUpdate: (payload) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quiz-event-update', { detail: payload }));
      }
    },
    onQuizParticipantUpdate: (payload) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quiz-participant-update', { detail: payload }));
      }
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
      // Canlı quiz varken state machine ilerlesin (quiz sekmesinde olmasa bile)
      void fetchWithCreds(apiUrl('/api/member/quiz/active'), { cache: 'no-store' }).catch(() => {});
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

  useEffect(() => {
    if (!transferRecipientId.trim()) {
      setTransferRecipientProfile(null);
      setTransferRecipientStatus('idle');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setTransferRecipientStatus('loading');
      try {
        const response = await fetchWithCreds(
          `/api/member/recipient?user_id=${encodeURIComponent(transferRecipientId.trim())}`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = await response.json() as {
            userId: string;
            username: string;
            displayName?: string | null;
            nickname?: string | null;
            avatarUrl?: string | null;
          };
          setTransferRecipientProfile(data);
          setTransferRecipientStatus('ready');
          return;
        }
        if (response.status === 404) {
          setTransferRecipientProfile(null);
          setTransferRecipientStatus('not_found');
          return;
        }
        setTransferRecipientProfile(null);
        setTransferRecipientStatus('error');
      } catch {
        if (!controller.signal.aborted) {
          setTransferRecipientProfile(null);
          setTransferRecipientStatus('error');
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [transferRecipientId]);

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
    if (transferRecipientStatus !== 'ready' || !transferRecipientProfile) {
      setTransferError(t('transfer_error_no_recipient'));
      return;
    }
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      setTransferError(t('transfer_error_invalid_amount'));
      return;
    }

    setTransferConfirmOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (transferLoading) return;
    setTransferError(null);
    setTransferSuccess(null);

    const amountValue = Number(transferAmount);
    const trimmedRecipient = transferRecipientId.trim();
    if (!trimmedRecipient) {
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
      body: JSON.stringify({
        recipientId: trimmedRecipient,
        amount: amountValue,
        note: transferNote.trim() || undefined,
      }),
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
      } else if (data.error === 'recipient_not_found') {
        setTransferError(t('transfer_error_no_recipient'));
      } else if (data.error === 'insufficient_funds') {
        setTransferError(t('transfer_error_insufficient'));
      } else if (data.error === 'daily_limit_exceeded') {
        setTransferError(t('transfer_error_daily_limit'));
      } else if (data.error === 'transfer_count_limit_exceeded') {
        setTransferError(t('transfer_error_count_limit'));
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
    setTransferNote('');
    setTransferLoading(false);
    setTransferConfirmOpen(false);
    // Bakiye güncellemesi için yeniden yükle
    await refreshWalletBalance();
  };

  const mailUnreadCount = useMemo(
    () => mailItems.filter((item) => !item.is_read).length,
    [mailItems],
  );

  const [duyuruEveryoneUnreadCount, setDuyuruEveryoneUnreadCount] = useState(0);

  const refreshDuyuruEveryoneCount = useCallback(async () => {
    if (unauthorized) {
      setDuyuruEveryoneUnreadCount(0);
      return;
    }
    try {
      const res = await fetchWithCreds(apiUrl('/api/duyuru/unread-everyone'), { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setDuyuruEveryoneUnreadCount(Number(data.count ?? 0));
    } catch {
      // ignore
    }
  }, [unauthorized]);

  useEffect(() => {
    void refreshDuyuruEveryoneCount();
    const onRefresh = () => { void refreshDuyuruEveryoneCount(); };
    window.addEventListener('duyuru:refresh-count', onRefresh);
    return () => window.removeEventListener('duyuru:refresh-count', onRefresh);
  }, [refreshDuyuruEveryoneCount]);

  useEffect(() => {
    if (effectiveSection !== 'duyuru' || unauthorized) return;
    void (async () => {
      try {
        await fetchWithCreds(apiUrl('/api/duyuru/read'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        setDuyuruEveryoneUnreadCount(0);
        window.dispatchEvent(new CustomEvent('duyuru:refresh-count'));
      } catch {
        // ignore
      }
    })();
  }, [effectiveSection, unauthorized]);

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
      <span className="text-xs font-semibold text-amber-400">papel</span>
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
    setTransferConfirmOpen(false);
    setTransferRecipientProfile(null);
    setTransferRecipientStatus('idle');
    setTransferNote('');
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
      setTransferRecipientProfile(null);
      setTransferRecipientStatus('idle');
      setSettingsOpen(false);
      return;
    }
    setTransferModalOpen(true);
    setSettingsOpen(false);
    setTransferError(null);
    setTransferSuccess(null);
    setTransferRecipientProfile(null);
    setTransferRecipientStatus('idle');
  }, [isSiteMaintenance, isTransfersMaintenance, transfersReason]);

  const handleAddToCart = (_item: StoreItem) => {
    try {
      cart.addToCart(_item);
    } catch (err) {
      console.error('Sepete eklenemedi:', err);
    }
  };

  const openPromotionsModal = () => {
    setSettingsOpen(false);
    setPromotionsModalOpen(true);
  };

  const openDiscountsModal = () => {
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
          maintenance: t('purchase_error_maintenance'),
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

  const mainWrapperClass =
    effectiveSection === 'mail' || (effectiveSection === 'quiz' && quizImmersive)
      ? 'mx-0 w-full max-w-full px-0'
      : 'w-full max-w-full px-4 sm:px-6';
  // Mail is full-screen on mobile (no bottom nav); avoid extra bottom padding gap.
  const mainSpacingClass = effectiveSection === 'mail'
    ? 'py-0 gap-0 pb-0'
    : effectiveSection === 'duyuru'
      ? 'lg:pt-24 pb-20 lg:pb-0 gap-0'
      : effectiveSection === 'store'
        ? isActivityEmbed
          ? 'lg:pt-24 pb-28 gap-0 md:pb-0'
          : 'lg:pt-24 pb-28 sm:pb-10 gap-0 sm:gap-6 md:pb-0'
        : effectiveSection === 'settings'
          ? 'md:pt-6 pb-12 lg:pb-3 gap-3'
          : effectiveSection === 'quiz' && quizImmersive
              ? 'py-0 pb-0 gap-0 px-0 flex-1 min-h-0 overflow-hidden'
              : 'lg:pt-24 pb-20 lg:pb-6 gap-6';

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
            <p className="text-sm text-white/50">{t('splash_checking_server_status')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isBlockedByReadiness && activityReadiness) {
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
      <UiClickSound />
      <IncidentOverlay bypass={isDeveloper} />
      <div className="flex flex-1 min-h-0">
        {/* Sağ taraf: header + main */}
        <div className="relative flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden bg-[#0e1018]">
        {effectiveSection !== 'mail' && !(effectiveSection === 'quiz' && quizImmersive) && (
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
          duyuruEveryoneUnreadCount={duyuruEveryoneUnreadCount}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          openLink={openLink}
          renderNotificationBody={renderNotificationBody}
          settings={{
            open: settingsOpen,
            onToggle: handleToggleSettings,
            onOpenSettings: handleOpenSettings,
            onOpenTransfer: handleOpenTransfer,
            onOpenPromotions: openPromotionsModal,
            onOpenDiscounts: openDiscountsModal,
            menuRef: settingsMenuRef,
          }}
        />
        )}

        <main className={`${mainWrapperClass} flex flex-col flex-1 min-h-0 ${mainSpacingClass} ${effectiveSection === 'quiz' && quizImmersive ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} bg-[#0e1018]`}>
            {!maintenanceLoading && isFullMaintenance && (
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
                  pendingEarnings={pendingEarnings}
                  claimLoading={claimLoading}
                  claimResult={claimResult}
                  onClaim={claimEarnings}
                  onClearClaimResult={() => setClaimResult({ kind: 'idle' })}
                  badgeInfo={badgeInfo}
                  onNavigateToPrivileges={ENABLE_TAG_BADGE_SECTION ? () => setActiveSection('tag-badge') : undefined}
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
                onBack={() => setActiveSection('overview')}
                profile={profile}
                profileLoading={profileLoading}
                serverCount={
                  headerServer.guilds.length > 0
                    ? headerServer.guilds.length
                    : headerServer.data
                      ? 1
                      : 0
                }
                serverName={headerServer.data?.name ?? activeServerName}
                serverIconUrl={headerServer.data?.iconUrl ?? profile?.guildIcon ?? null}
                isActivityEmbed={isActivityEmbed}
              />
            )}

            {ENABLE_TAG_BADGE_SECTION && effectiveSection === 'tag-badge' && !isSiteMaintenance && (
              <TagBadgeSection
                badgeInfo={badgeInfo}
                loading={!badgeInfo && !unauthorized}
                overviewStats={overviewStats}
                userId={profile?.userId ?? null}
                guildId={getCurrentGuildId()}
                displayName={profile?.nickname ?? profile?.displayName ?? profile?.username ?? 'User'}
                avatarUrl={profile?.avatarUrl ?? null}
              />
            )}

            {effectiveSection === 'mail' && !isSiteMaintenance && (
              <MailSection
                loading={mailLoading}
                error={mailError}
                items={mailItems}
                onOpenMail={async (mail) => {
                  if (!mail.is_read && mail.category !== 'reward') {
                    try {
                      await fetchWithCreds(apiUrl('/api/mail'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: mail.id }),
                      });
                      setMailItems((prev) =>
                        prev.map((m) =>
                          String(m.id) === String(mail.id) ? { ...m, is_read: true } : m,
                        ),
                      );
                    } catch {
                      // ignore
                    }
                  }
                }}
                onBack={() => setActiveSection('overview')}
              />
            )}

            {effectiveSection === 'duyuru' && !isSiteMaintenance && (
              <div className="flex min-h-0 flex-1 flex-col">
                <DuyuruPage variant="panel" />
              </div>
            )}

            {effectiveSection === 'quiz' && !isSiteMaintenance && (
              <div className={quizImmersive ? 'flex min-h-0 w-full flex-1' : undefined}>
                <QuizEventSection
                  onQuizEnded={() => setActiveSection('overview')}
                  onImmersiveChange={setQuizImmersive}
                  profileMenu={
                    !unauthorized && profile
                      ? {
                          username: profile.username,
                          avatarUrl: profile.avatarUrl ?? null,
                          serverName: headerServer.data?.name ?? null,
                          serverIconUrl: headerServer.data?.iconUrl ?? null,
                          onExit: () => setActiveSection('overview'),
                          onOpenSettings: handleOpenSettings,
                        }
                      : null
                  }
                />
              </div>
            )}

            {effectiveSection === 'watch-earn' && !isSiteMaintenance && (
              <WatchEarnSection />
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
        note={transferNote}
        loading={transferLoading}
        error={transferError}
        success={transferSuccess}
        taxRate={transferTaxRate}
        recipientProfile={transferRecipientProfile}
        recipientStatus={transferRecipientStatus}
        onRecipientChange={setTransferRecipientId}
        onAmountChange={setTransferAmount}
        onNoteChange={setTransferNote}
        onClose={handleCloseTransferModal}
        onSubmit={handleTransfer}
      />
      {transferConfirmOpen && transferRecipientProfile && (
        <TransferConfirmModal
          open={transferConfirmOpen}
          loading={transferLoading}
          error={transferError}
          recipientProfile={transferRecipientProfile}
          amount={moneyFormatter.format(Number(transferAmount || 0))}
          taxAmount={moneyFormatter.format(Number((Number(transferAmount || 0) * transferTaxRate).toFixed(2)))}
          totalDebit={moneyFormatter.format(Number((Number(transferAmount || 0) * (1 + transferTaxRate)).toFixed(2)))}
          note={transferNote}
          onClose={() => setTransferConfirmOpen(false)}
          onConfirm={handleConfirmTransfer}
        />
      )}
      <PromotionsModal
        isOpen={promotionsModalOpen}
        onClose={() => { setPromotionsModalOpen(false); setPromoError(null); setPromoSuccess(null); }}
        onApply={handleApplyPromoCode}
        loading={promoLoading}
        error={promoError}
        success={promoSuccess}
        maintenance={
          maintenanceFlags?.promotions?.is_active || isSiteMaintenance
            ? {
                is_active: true,
                reason: maintenanceFlags?.promotions?.reason ?? siteReason ?? null,
              }
            : null
        }
      />

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
              if (data.error === 'maintenance') {
                setDiscountError(t('purchase_error_maintenance'));
              } else {
              const errorMap: Record<string, string> = {
                wrong_server: t('discount_error_wrong_server'),
                invalid_code: t('discount_error_invalid_code'),
                expired: t('discount_error_expired'),
                usage_limit_exceeded: t('discount_error_usage_limit'),
                item_not_found: t('discount_error_item_not_found'),
              };
              setDiscountError(errorMap[data.error ?? ''] ?? t('discount_error_generic'));
              }
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
        maintenance={
          maintenanceFlags?.discounts?.is_active || isSiteMaintenance
            ? {
                is_active: true,
                reason: maintenanceFlags?.discounts?.reason ?? siteReason ?? null,
              }
            : null
        }
      />
      </div>
    </div>
  );
}


