/**
 * lib dosyaları 'use client' component'lerini import edemez.
 * Bu modül, herhangi bir yerden (fetchWithCreds, utils vb.) hata modalını
 * tetiklemek için kullanılır. GlobalErrorReporter bağlanır, lib dosyaları kullanır.
 */

type Reporter = (message: string, context?: string, stack?: string) => void;

let _reporter: Reporter | null = null;

export function registerClientErrorReporter(fn: Reporter) {
  _reporter = fn;
}

export function reportClientError(message: string, context?: string, stack?: string) {
  if (typeof window === 'undefined') return;
  _reporter?.(message, context, stack);
}
