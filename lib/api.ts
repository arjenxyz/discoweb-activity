export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Discord Activity iframe runs under a proxy origin like `*.discordsays.com`.
  // That origin enforces a strict CSP, so cross-origin fetches (to our real
  // domain) are blocked. In that case, we must keep the request relative so
  // it goes through the proxy.
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedBase) return `/${normalizedPath}`;
  return `${normalizedBase}/${normalizedPath}`;
}
