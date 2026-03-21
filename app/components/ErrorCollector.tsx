'use client';

import { useEffect, useRef } from 'react';

const DEBOUNCE_MS = 5000; // aynı hatayı 5 saniyede bir kez gönder
const sent = new Set<string>(); // session boyunca duplicate'leri önle

function sendError(payload: object) {
  try {
    navigator.sendBeacon('/api/client-error', JSON.stringify(payload));
  } catch {
    // sendBeacon desteklenmiyorsa fetch dene
    try {
      void fetch('/api/client-error', {
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

export default function ErrorCollector() {
  const lastSent = useRef<Map<string, number>>(new Map());

  useEffect(() => {
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

    // JS hataları
    const onError = (event: ErrorEvent) => {
      const key = buildKey(event.message, event.filename);
      if (!shouldSend(key)) return;
      sendError({
        type: 'js_error',
        message: event.message,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack?.slice(0, 1000),
        ...meta(),
      });
    };

    // Promise rejection'ları
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason);
      const key = buildKey(message, 'promise');
      if (!shouldSend(key)) return;
      sendError({
        type: 'unhandled_rejection',
        message,
        stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 1000) : undefined,
        ...meta(),
      });
    };

    // console.error intercept
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      // React'in kendi uyarılarını ve beklenen hataları filtrele
      if (
        message.includes('Warning:') ||
        message.includes('Download the React DevTools') ||
        message.includes('ReactDOM.render is no longer supported')
      ) return;
      const key = buildKey(message, 'console');
      if (!shouldSend(key)) return;
      sendError({
        type: 'console_error',
        message: message.slice(0, 800),
        ...meta(),
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
