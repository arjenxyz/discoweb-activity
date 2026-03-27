'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiUrl } from '@/lib/api';

type CapturedError = {
  message: string;
  stack?: string;
  url: string;
  context: string;
  componentStack?: string;
};

// Global fonksiyon — herhangi bir yerden hata tetiklemek için
let _triggerErrorModal: ((err: CapturedError) => void) | null = null;

export function reportError(err: {
  errorCode?: string;
  message: string;
  stack?: string;
  context?: string;
}) {
  _triggerErrorModal?.({
    message: err.errorCode ? `[${err.errorCode}] ${err.message}` : err.message,
    stack: err.stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    context: err.context ?? '',
  });
}

export default function GlobalErrorReporter() {
  const [error, setError] = useState<CapturedError | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const debugLogsRef = useRef<string[]>([]);

  const trigger = useCallback((err: CapturedError) => {
    setError(err);
    setSent(false);
  }, []);

  useEffect(() => {
    _triggerErrorModal = trigger;
    return () => { _triggerErrorModal = null; };
  }, [trigger]);

  // Console log collector
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

  // Event listeners are handled by ErrorCollector — no duplicates here

  const handleSend = async () => {
    if (!error || sending || sent) return;
    setSending(true);
    try {
      const res = await fetch(apiUrl('/api/support/error-report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          url: error.url,
          context: error.context,
          componentStack: error.componentStack,
          userAgent: navigator.userAgent,
          debugLogs: debugLogsRef.current.slice(-20),
        }),
      });
      if (res.ok) {
        setSent(true);
        setTimeout(() => setError(null), 1500);
      }
    } catch { /* sessizce geç */ } finally {
      setSending(false);
    }
  };

  if (!error) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0e1018] shadow-2xl overflow-hidden">
        {/* Top accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-red-500/60 via-orange-500/40 to-transparent" />

        <div className="p-6 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 text-red-400">
                <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Arka planda bir hata oluştu</p>
              <p className="text-xs text-white/40 mt-0.5">Geliştiriciye bildirirsen sorunu daha hızlı çözebiliriz.</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 rounded-lg p-1 text-white/30 hover:text-white/60 transition"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>

          {/* Error message */}
          <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 max-h-24 overflow-y-auto">
            <p className="text-[11px] font-mono text-red-300/80 break-all leading-relaxed">{error.message}</p>
            {error.context && (
              <p className="text-[10px] font-mono text-white/20 mt-1 break-all">{error.context}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || sent}
              className="flex-1 rounded-xl bg-red-500/20 border border-red-500/25 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {sent ? (
                <>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-green-400">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                  <span className="text-green-300">Bildirildi</span>
                </>
              ) : sending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-red-300/30 border-t-red-300 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M3.5 2a.5.5 0 01.5-.5h8a.5.5 0 01.354.854L9.207 5.5l3.147 3.146A.5.5 0 0112 9.5H4.5V14a.5.5 0 01-1 0V2z" />
                  </svg>
                  Geliştiricide Bildir
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/70"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
