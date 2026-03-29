'use client';

import { useEffect, useRef } from 'react';
import { pushClientError } from '@/lib/clientErrorStore';
import { reportError } from '@/components/GlobalErrorReporter';
import { pushBreadcrumb } from '@/lib/breadcrumbs';
import { registerClientErrorReporter } from '@/lib/reportClientError';

const DEBOUNCE_MS = 5000;
const sent = new Set<string>();

function getClientErrorUrl(): string {
  const isActivity = typeof window !== 'undefined' &&
    window.location.hostname.includes('discordsays.com');
  return isActivity ? '/activity/api/client-error' : '/api/client-error';
}

function sendError(payload: object) {
  const url = getClientErrorUrl();
  try {
    navigator.sendBeacon(url, JSON.stringify(payload));
  } catch {
    try {
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {}
  }
}

function buildKey(message: string, source?: string): string {
  return `${message.slice(0, 80)}|${(source ?? '').slice(0, 40)}`;
}

const ERROR_NOISE = [
  'Warning:',
  'Download the React DevTools',
  'ReactDOM.render is no longer supported',
  'WebSocket connection',
  'RealtimeClient',
  'Realtime connection',
];

const WARN_PATTERNS = [
  'Accrued',
  'failed',
  'HTTP 4',
  'HTTP 5',
  '[treasury]',
  '[load-accrued]',
];

export default function ErrorCollector() {
  const lastSent = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // reportClientError bağlantısı — lib dosyaları bu fonksiyonu kullanır
    registerClientErrorReporter((message, context, stack) => {
      reportError({ message, context, stack });
    });

    const shouldSend = (key: string): boolean => {
      if (sent.has(key)) return false;
      const last = lastSent.current.get(key) ?? 0;
      if (Date.now() - last < DEBOUNCE_MS) return false;
      lastSent.current.set(key, Date.now());
      sent.add(key);
      return true;
    };

    const meta = () => ({
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Sayfa yükleme performansı
    const checkPageLoad = () => {
      try {
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (entries.length > 0) {
          const nav = entries[0];
          const loadTime = Math.round(nav.loadEventEnd - nav.startTime);
          if (loadTime > 5000) {
            pushBreadcrumb('slow_page_load', `${loadTime}ms`);
            sendError({
              type: 'slow_load',
              message: `Sayfa yükleme süresi: ${loadTime}ms`,
              loadTime,
              ...meta(),
            });
          }
        }
      } catch {}
    };

    if (document.readyState === 'complete') {
      checkPageLoad();
    } else {
      const onLoad = () => checkPageLoad();
      window.addEventListener('load', onLoad, { once: true });
    }

    // Otomatik click breadcrumbs
    const onDocClick = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement;
        const el = target.closest('button, a, [data-breadcrumb]');
        if (!el) return;
        const label =
          (el as HTMLElement).dataset?.breadcrumb ||
          el.getAttribute('aria-label') ||
          el.textContent?.trim().slice(0, 60) ||
          el.tagName.toLowerCase();
        pushBreadcrumb('click', label ?? undefined);
      } catch {}
    };
    document.addEventListener('click', onDocClick, { passive: true });

    // JS hataları
    const onError = (event: ErrorEvent) => {
      pushBreadcrumb('js_error', event.message?.slice(0, 60));
      const key = buildKey(event.message, event.filename);
      const payload = {
        type: 'js_error',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        stack: event.error?.stack?.slice(0, 1000),
        timestamp: new Date().toISOString(),
      };
      pushClientError(payload);
      setTimeout(() => reportError({
        message: event.message,
        stack: event.error?.stack,
        context: `${event.filename ?? ''}:${event.lineno ?? ''}:${event.colno ?? ''}`,
      }), 0);
      if (!shouldSend(key)) return;
      sendError({ ...payload, col: event.colno, ...meta() });
    };

    // Promise rejection'ları
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
      pushBreadcrumb('promise_rejection', message.slice(0, 60));
      const key = buildKey(message, 'promise');
      const payload = {
        type: 'unhandled_rejection',
        message,
        stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 1000) : undefined,
        timestamp: new Date().toISOString(),
      };
      pushClientError(payload);
      setTimeout(() => reportError({
        message,
        stack: event.reason instanceof Error ? event.reason.stack : undefined,
        context: 'Unhandled Promise Rejection',
      }), 0);
      if (!shouldSend(key)) return;
      sendError({ ...payload, ...meta() });
    };

    // console.error intercept
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      const message = args.map(a =>
        typeof a === 'object' ? (() => { try { return JSON.stringify(a); } catch { return String(a); } })() : String(a)
      ).join(' ');
      if (ERROR_NOISE.some(n => message.includes(n))) return;
      // setTimeout(0): render phase'de setState çağrısını önler (React #310)
      setTimeout(() => reportError({ message: message.slice(0, 300), context: 'console.error' }), 0);
      const key = buildKey(message, 'console');
      if (!shouldSend(key)) return;
      sendError({ type: 'console_error', message: message.slice(0, 800), ...meta() });
    };

    // console.warn intercept — sadece önemli pattern'lar, modal gösterme
    const originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      originalConsoleWarn(...args);
      const message = args.map(a => String(a)).join(' ');
      if (!WARN_PATTERNS.some(p => message.includes(p))) return;
      const key = buildKey(message, 'warn');
      if (!shouldSend(key)) return;
      sendError({ type: 'console_warn', message: message.slice(0, 800), ...meta() });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      document.removeEventListener('click', onDocClick);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  return null;
}
