'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiUrl } from '@/lib/api';
import { getBreadcrumbs } from '@/lib/breadcrumbs';
import { getDeviceInfo, getCurrentSection } from '@/lib/errorContext';
import { recordAndCheckFlood } from '@/lib/errorFlood';

type CapturedError = {
  message: string;
  stack?: string;
  url: string;
  context: string;
  componentStack?: string;
};

// Modül düzeyinde — session boyunca dedup
const shownKeys = new Set<string>();

let _triggerErrorModal: ((err: CapturedError) => void) | null = null;

export function reportError(err: {
  errorCode?: string;
  message: string;
  stack?: string;
  context?: string;
}) {
  if (typeof window === 'undefined') return;
  const key = err.message.slice(0, 80);
  if (shownKeys.has(key)) return; // aynı hata bu session'da bir kez
  shownKeys.add(key);
  _triggerErrorModal?.({
    message: err.errorCode ? `[${err.errorCode}] ${err.message}` : err.message,
    stack: err.stack,
    url: window.location.href,
    context: err.context ?? '',
  });
}

export default function GlobalErrorReporter() {
  // Hata kuyruğu
  const [queue, setQueue] = useState<CapturedError[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isFlood, setIsFlood] = useState(false);
  const [floodCount, setFloodCount] = useState(0);
  const [floodDismissed, setFloodDismissed] = useState(false);
  const debugLogsRef = useRef<string[]>([]);
  const autoSentRef = useRef(false);

  const current = queue[0] ?? null;

  const trigger = useCallback((err: CapturedError) => {
    const flood = recordAndCheckFlood();
    if (flood) {
      setIsFlood(true);
      setFloodCount(c => c + 1);
    }
    setQueue(q => [...q, err]);
    setSent(false);
    setExpanded(false);
    autoSentRef.current = false;
  }, []);

  useEffect(() => {
    _triggerErrorModal = trigger;
    return () => { _triggerErrorModal = null; };
  }, [trigger]);

  // Console log collector (debug log birikimi)
  useEffect(() => {
    const orig = { error: console.error, warn: console.warn };
    const push = (level: string) => (...args: unknown[]) => {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return String(a); }
      }).join(' ');
      debugLogsRef.current = [...debugLogsRef.current.slice(-49), `[${level}] ${msg}`];
    };
    console.error = (...args) => { push('ERROR')(...args); orig.error(...args); };
    console.warn  = (...args) => { push('WARN')(...args);  orig.warn(...args);  };
    return () => { console.error = orig.error; console.warn = orig.warn; };
  }, []);

  // Otomatik gönder — hata gelince 800ms sonra gönder
  useEffect(() => {
    if (!current || autoSentRef.current || sending || sent) return;
    const timer = setTimeout(() => {
      autoSentRef.current = true;
      handleSend();
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const handleSend = async () => {
    if (!current || sending || sent) return;
    setSending(true);
    try {
      await fetch(apiUrl('/api/support/error-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: current.message,
          stack: current.stack,
          url: current.url,
          context: current.context,
          componentStack: current.componentStack,
          userAgent: navigator.userAgent,
          debugLogs: debugLogsRef.current.slice(-20),
          breadcrumbs: getBreadcrumbs(),
          section: getCurrentSection(),
          deviceInfo: getDeviceInfo(),
        }),
      });
      setSent(true);
      setTimeout(() => {
        setQueue(q => q.slice(1));
        setSent(false);
        setExpanded(false);
        autoSentRef.current = false;
      }, 2000);
    } catch {
      setSent(false);
    } finally {
      setSending(false);
    }
  };

  const dismiss = () => {
    setQueue(q => q.slice(1));
    setSent(false);
    setExpanded(false);
    autoSentRef.current = false;
  };

  return (
    <>
      {/* Flood banner */}
      {isFlood && !floodDismissed && (
        <div className="fixed top-0 left-0 right-0 z-[99999] flex items-center justify-between gap-3 bg-red-600/95 backdrop-blur px-4 py-2.5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 shrink-0">
              <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
            </svg>
            Birden fazla hata tespit edildi
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{floodCount} adet</span>
            — Lütfen sayfayı yenileyin veya yöneticiyle iletişime geçin.
          </div>
          <button
            onClick={() => setFloodDismissed(true)}
            className="shrink-0 rounded p-1 hover:bg-white/20 transition"
            aria-label="Kapat"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>
      )}

      {/* Toast bildirimi — sağ alt köşe */}
      {current && !isFlood && (
        <div className="fixed bottom-4 right-4 z-[99998] w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-red-500/20 bg-[#0e1018]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Üst accent çizgisi */}
          <div className="h-0.5 w-full bg-gradient-to-r from-red-500/70 via-orange-500/40 to-transparent" />

          <div className="p-4">
            {/* Başlık satırı */}
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                sent
                  ? 'bg-emerald-500/15 border-emerald-500/20'
                  : 'bg-red-500/15 border-red-500/20'
              }`}>
                {sent ? (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-emerald-400">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                ) : sending ? (
                  <span className="h-3 w-3 rounded-full border-2 border-red-300/30 border-t-red-300 animate-spin" />
                ) : (
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
                    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold leading-tight ${sent ? 'text-emerald-300' : 'text-white/90'}`}>
                  {sent ? 'Hata raporlandı' : sending ? 'Raporlanıyor...' : 'Arka planda hata oluştu'}
                </p>
                <p className="text-[11px] text-white/40 mt-0.5 truncate">{current.message}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Detay toggle */}
                <button
                  type="button"
                  onClick={() => setExpanded(v => !v)}
                  className="rounded-lg p-1 text-white/30 hover:text-white/60 hover:bg-white/10 transition"
                  aria-label={expanded ? 'Daralt' : 'Detay göster'}
                  title={expanded ? 'Daralt' : 'Detay göster'}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                    <path d="M4.427 9.573a.75.75 0 001.146 0L8 7.148l2.427 2.425a.75.75 0 101.146-.966L8.573 5.930a.75.75 0 00-1.146 0L4.427 8.607a.75.75 0 000 .966z" />
                  </svg>
                </button>
                {/* Kapat */}
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-lg p-1 text-white/30 hover:text-white/60 hover:bg-white/10 transition"
                  aria-label="Kapat"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Detay paneli — expand/collapse */}
            {expanded && (
              <div className="mt-3 space-y-2">
                {/* Hata mesajı */}
                <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-2 max-h-20 overflow-y-auto">
                  <p className="text-[10px] font-mono text-red-300/80 break-all leading-relaxed">{current.message}</p>
                </div>

                {/* Context */}
                {current.context && (
                  <p className="text-[10px] font-mono text-white/30 break-all px-1">{current.context}</p>
                )}

                {/* Stack trace */}
                {current.stack && (
                  <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-2 max-h-24 overflow-y-auto">
                    <p className="text-[9px] font-mono text-white/25 whitespace-pre-wrap break-all leading-relaxed">
                      {current.stack.slice(0, 600)}
                    </p>
                  </div>
                )}

                {/* Bilgi satırı */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono">
                    {getDeviceInfo()}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono">
                    {getCurrentSection()}
                  </span>
                  {queue.length > 1 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 font-semibold">
                      +{queue.length - 1} bekleyen hata
                    </span>
                  )}
                </div>

                {/* Manuel gönder butonu (oto-gönder başarısızsa) */}
                {!sent && !sending && (
                  <button
                    type="button"
                    onClick={handleSend}
                    className="w-full rounded-xl bg-red-500/15 border border-red-500/20 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition"
                  >
                    Tekrar Gönder
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
