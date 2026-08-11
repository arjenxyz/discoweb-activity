'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { LuCircleCheck, LuPlay, LuX, LuGift, LuMaximize, LuMinimize } from 'react-icons/lu';
import fetchWithCreds from '@/lib/fetchWithCreds';
import { toActivityMediaUrl } from '@/lib/watchEarnMedia';
import {
  isDiscordActivityClient,
  setDiscordOrientationLock,
} from '@/lib/discordSdk';

type WatchEarnTask = {
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
  watched?: boolean;
  watchedAt?: string | null;
};

const WATCHED_STORAGE_KEY = 'dw:watch-earn:watched';

const readWatchedStorage = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WATCHED_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (value) out[id] = true;
    }
    return out;
  } catch {
    return {};
  }
};

const writeWatchedStorage = (map: Record<string, boolean>) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
};

const markWatchedLocal = (taskId: string) => {
  const next = { ...readWatchedStorage(), [taskId]: true };
  writeWatchedStorage(next);
  return next;
};

const clearWatchedLocal = (taskId: string) => {
  const next = { ...readWatchedStorage() };
  delete next[taskId];
  writeWatchedStorage(next);
  return next;
};

const formatEndDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
};

const formatClaimedDate = (iso: string | null) => {
  if (!iso) return new Date().toLocaleDateString('tr-TR');
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString('tr-TR');
  return d.toLocaleDateString('tr-TR');
};

const formatRemaining = (totalSeconds: number) => {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const isCoarsePointerMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
};

export default function WatchEarnSection() {
  const [tasks, setTasks] = useState<WatchEarnTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [watchedTasks, setWatchedTasks] = useState<Record<string, boolean>>({});
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerShellRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ open: boolean; message: string; type?: 'success' | 'error' }>({
    open: false,
    message: '',
  });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ open: true, message, type });
    toastTimerRef.current = setTimeout(() => setToast({ open: false, message: '', type }), 3500);
  };

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithCreds('/api/member/watch-earn');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'load_failed');
      const incoming = (data?.tasks ?? []) as WatchEarnTask[];
      const localWatched = readWatchedStorage();
      const nextWatched: Record<string, boolean> = {};
      for (const task of incoming) {
        if (task.claimed) continue;
        if (task.watched || localWatched[task.id]) nextWatched[task.id] = true;
      }
      writeWatchedStorage(nextWatched);
      setWatchedTasks(nextWatched);
      setTasks(
        incoming.map((task) => ({
          ...task,
          banner: toActivityMediaUrl(task.banner),
          videoUrl: toActivityMediaUrl(task.videoUrl),
        })),
      );
    } catch {
      setTasks([]);
      showToast('Görevler yüklenemedi.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Remount sonrası localStorage'dan hemen claim-ready göster
    setWatchedTasks(readWatchedStorage());
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!activeVideo) {
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(true);
      setIsFullscreen(false);
      return;
    }

    let cancelled = false;
    // Orientation lock'u video mount/play sonrası uygula (iframe remount + play race riskini azaltır)
    let orientTimer: ReturnType<typeof setTimeout> | undefined;
    if (isDiscordActivityClient() && isCoarsePointerMobile()) {
      orientTimer = setTimeout(() => {
        if (cancelled) return;
        void setDiscordOrientationLock('landscape').then(() => {
          if (!cancelled) setIsFullscreen(true);
        });
      }, 250);
    }

    return () => {
      cancelled = true;
      if (orientTimer) clearTimeout(orientTimer);
      const video = videoRef.current;
      if (video) video.pause();
    };
  }, [activeVideo]);

  useEffect(() => {
    const onFsChange = () => {
      const shell = playerShellRef.current;
      // Discord CSS immersive mode uses isFullscreen state without document.fullscreenElement
      if (isDiscordActivityClient() && !document.fullscreenElement) return;
      const active =
        !!document.fullscreenElement &&
        (!!shell?.contains(document.fullscreenElement) || document.fullscreenElement === shell);
      setIsFullscreen(active);
      if (!active) {
        try {
          const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
          orientation?.unlock?.();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const exitFullscreenSafe = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientation?.unlock?.();
    } catch {
      /* ignore */
    }
    if (isDiscordActivityClient()) {
      // Dashboard portrait — videodan çıkınca geri dön
      await setDiscordOrientationLock('portrait');
    }
    setIsFullscreen(false);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const shell = playerShellRef.current;

    // Discord Activity iframe: Fullscreen API + screen.orientation.lock engellenir.
    // Doğru yol: SDK orientation lock + CSS immersive (zaten fixed inset-0 overlay).
    if (isDiscordActivityClient()) {
      await setDiscordOrientationLock('landscape');
      setIsFullscreen(true);
      return;
    }

    try {
      if (shell?.requestFullscreen) {
        await shell.requestFullscreen();
      } else {
        const video = videoRef.current as HTMLVideoElement & {
          webkitEnterFullscreen?: () => void;
        };
        video?.webkitEnterFullscreen?.();
      }
    } catch {
      // Browser FS başarısız olsa bile CSS immersive devam eder
    }

    if (isCoarsePointerMobile()) {
      try {
        await (screen.orientation as ScreenOrientation & {
          lock?: (orientation: OrientationLockType) => Promise<void>;
        })?.lock?.('landscape');
      } catch {
        /* iOS Safari / insecure context */
      }
    }

    setIsFullscreen(true);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen || document.fullscreenElement) {
      await exitFullscreenSafe();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreenSafe, isFullscreen]);

  const closePlayer = useCallback(async () => {
    await exitFullscreenSafe();
    setActiveVideo(null);
    showToast('Videoyu kapattığın için ödül kazanamadın.', 'error');
  }, [exitFullscreenSafe]);

  const handleVideoEnded = async () => {
    const taskId = activeVideo;
    if (taskId) {
      const next = markWatchedLocal(taskId);
      setWatchedTasks(next);
      try {
        await fetchWithCreds('/api/member/watch-earn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action: 'complete' }),
        });
      } catch {
        // localStorage yeterli — sunucu yazılamasa bile claim-ready kalır
      }
    }
    await exitFullscreenSafe();
    setActiveVideo(null);
    showToast('Görevi tamamladın! Şimdi ödülünü alabilirsin.', 'success');
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        void videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleClaim = async (id: string) => {
    if (claimingId) return;
    setClaimingId(id);
    try {
      // Claim öncesi izleme kaydını sunucuya yaz (sayfa değişiminde kaybolmuş olabilir)
      if (watchedTasks[id]) {
        try {
          await fetchWithCreds('/api/member/watch-earn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: id, action: 'complete' }),
          });
        } catch {
          /* claim yine denenecek */
        }
      }

      const res = await fetchWithCreds('/api/member/watch-earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id, action: 'claim' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.error === 'already_claimed') {
          showToast('Bu ödülü zaten aldın.', 'error');
          clearWatchedLocal(id);
          await loadTasks();
          return;
        }
        if (data?.error === 'not_watched') {
          showToast('Önce videoyu sonuna kadar izlemen gerekiyor.', 'error');
          return;
        }
        throw new Error(data?.error ?? 'claim_failed');
      }
      clearWatchedLocal(id);
      setWatchedTasks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      showToast(
        typeof data?.reward === 'number'
          ? `+${data.reward} Papel hesabına eklendi!`
          : 'Ödül başarıyla hesabınıza eklendi!',
        'success',
      );
      try {
        window.dispatchEvent(new CustomEvent('wallet:refresh'));
      } catch {
        // ignore
      }
      await loadTasks();
    } catch {
      showToast('Ödül alınamadı. Tekrar dene.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const activeTask = tasks.find((t) => t.id === activeVideo) ?? null;
  const remaining = Math.max(0, duration - currentTime);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const playerOverlay =
    activeTask && portalReady
      ? createPortal(
          <div
            ref={playerShellRef}
            className="fixed inset-0 z-[99999] flex w-full flex-col overflow-hidden bg-black"
            style={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#12141c] px-3 py-2.5 sm:px-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/80 sm:text-sm">{activeTask.logoText}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-center">
                <p className="text-[9px] font-medium uppercase tracking-wider text-white/35">Kalan</p>
                <p className="font-mono text-sm font-bold tabular-nums text-white sm:text-base">
                  {duration > 0 ? formatRemaining(remaining) : '—:—'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleFullscreen();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}
              >
                {isFullscreen ? <LuMinimize className="h-5 w-5" /> : <LuMaximize className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void closePlayer();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Kapat"
              >
                <LuX className="h-5 w-5" />
              </button>
            </div>

            <div className="relative min-h-0 w-full flex-1 cursor-pointer bg-black" onClick={togglePlay}>
              <video
                key={activeTask.id}
                ref={videoRef}
                src={toActivityMediaUrl(activeTask.videoUrl)}
                className="h-full w-full bg-black object-contain"
                onEnded={() => void handleVideoEnded()}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration || 0);
                  setCurrentTime(e.currentTarget.currentTime || 0);
                }}
                onLoadedData={(e) => {
                  // Mount sonrası güvenli autoplay (play() race'ini azaltır)
                  const video = e.currentTarget;
                  void video.play().then(
                    () => setIsPlaying(true),
                    (err: unknown) => {
                      const aborted =
                        (err instanceof DOMException && err.name === 'AbortError') ||
                        (err instanceof Error && /interrupted|aborted/i.test(err.message));
                      if (!aborted) setIsPlaying(false);
                    },
                  );
                }}
                onTimeUpdate={(e) => {
                  setCurrentTime(e.currentTarget.currentTime || 0);
                  if (!duration && e.currentTarget.duration) {
                    setDuration(e.currentTarget.duration);
                  }
                }}
                onError={() => {
                  setIsPlaying(false);
                  showToast('Video yüklenemedi. MP4 /cdn linkini kontrol et.', 'error');
                }}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload noplaybackrate noremoteplayback"
                onContextMenu={(e) => e.preventDefault()}
              />

              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5865F2] pl-1 text-white shadow-2xl shadow-[#5865F2]/40 sm:h-20 sm:w-20 sm:pl-1.5">
                    <LuPlay className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-[#12141c] px-3 py-2.5 sm:px-4">
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#5865F2] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40">
                <span className="font-mono tabular-nums">{formatRemaining(currentTime)}</span>
                <span>İleri saramazsın</span>
                <span className="font-mono tabular-nums">{duration > 0 ? formatRemaining(duration) : '—:—'}</span>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">İzle Kazan Görevleri</h1>
          <p className="text-sm text-white/50 mt-1">Videoları sonuna kadar izleyerek Papel ödüllerini topla.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-white/40 text-center py-10">Yükleniyor...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-white/40 text-center py-10">Şu an aktif İzle Kazan görevi yok.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
          {tasks.map((task) => {
            const isWatched = Boolean(watchedTasks[task.id] || task.watched || task.claimed);
            const isClaimed = task.claimed;

            return (
              <div
                key={task.id}
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1f25] shadow-lg"
              >
                <div className="relative h-32 w-full shrink-0 sm:h-36">
                  <Image src={task.banner} alt={task.title} fill className="object-cover opacity-70" unoptimized />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e1f25] via-[#1e1f25]/60 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-black italic tracking-wider text-white drop-shadow-md sm:text-2xl">
                        {task.logoText}
                      </h3>
                      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-white/70">
                        <span className="shrink-0">Tarafından sunuluyor</span>
                        <LuCircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate font-bold text-white">{task.sponsor}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-[11px] font-medium text-white/50">
                      Bitiş: {formatEndDate(task.endsAt)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                  <h4 className="line-clamp-2 text-sm font-bold uppercase tracking-wide text-white sm:text-base">
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <Image src="/papel.gif" alt="Papel" width={18} height={18} unoptimized />
                      <span className="text-base sm:text-lg">{task.reward} Papel</span>
                    </div>
                    {task.multiplier && (
                      <div className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 sm:text-xs">
                        <LuPlay className="h-3 w-3" />
                        {task.multiplier}
                      </div>
                    )}
                  </div>
                  {isClaimed && (
                    <p className="text-xs font-medium text-white/40">
                      Bu ödülü {formatClaimedDate(task.claimedAt)} tarihinde aldın
                    </p>
                  )}

                  <div className="mt-auto flex w-full items-center pt-1">
                    {!isWatched && !isClaimed && (
                      <button
                        onClick={() => setActiveVideo(task.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#5865F2]/20 transition-colors hover:bg-[#4752C4]"
                      >
                        <LuPlay className="h-5 w-5" />
                        İzle
                      </button>
                    )}

                    {isWatched && !isClaimed && (
                      <button
                        onClick={() => void handleClaim(task.id)}
                        disabled={claimingId === task.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-600 disabled:opacity-60"
                      >
                        <LuGift className="h-5 w-5" />
                        {claimingId === task.id ? 'Alınıyor...' : 'Ödülü Al'}
                      </button>
                    )}

                    {isClaimed && (
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/40"
                      >
                        Ödül Alındı
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {playerOverlay}

      {toast.open && portalReady
        ? createPortal(
            <div className="fixed bottom-6 right-6 z-[10001] animate-in fade-in slide-in-from-bottom-5">
              <div
                className={`flex items-center gap-3 rounded-2xl px-5 py-4 shadow-2xl border ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                <span className="text-sm font-semibold">{toast.message}</span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
