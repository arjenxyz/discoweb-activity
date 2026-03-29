/**
 * Kullanıcı eylemlerini (breadcrumb) bellekte tutan basit store.
 * Hata raporlarına eklenir — "kullanıcı hatadan önce ne yaptı?" sorusunu yanıtlar.
 */

const MAX = 15;

interface Crumb {
  action: string;
  target?: string;
  ts: number;
}

const _crumbs: Crumb[] = [];

export function pushBreadcrumb(action: string, target?: string) {
  _crumbs.push({ action, target: target?.slice(0, 80), ts: Date.now() });
  if (_crumbs.length > MAX) _crumbs.shift();
}

export function getBreadcrumbs(): string[] {
  return _crumbs.map(
    (c) => `${new Date(c.ts).toISOString().slice(11, 19)} ${c.action}${c.target ? ` → ${c.target}` : ''}`
  );
}
