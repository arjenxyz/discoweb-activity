export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // Discord Activity iframe runs under a proxy origin like `*.discordsays.com`.
  // That origin enforces a strict CSP, so cross-origin fetches (to our real
  // domain) are blocked. In that case, we must keep the request relative so
  // it goes through the proxy. We also need to avoid leading `/` because the
  // proxy likely only forwards within the activity route (e.g. `/activity/...`).
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    // Proxy may serve the activity under an `/activity` prefix. Ensure requests
    // go to the activity-scoped path so the proxy will forward them to our
    // backend. If the caller already provided an `activity/` prefix (or a
    // leading `/activity/...`), don't add another one to avoid double-prefixing
    // which causes 404s (e.g. `/activity/activity/auth`).
    let cleaned = path.replace(/^\/+/, '');
    // If caller already provided `activity/` path, use it as-is.
    if (cleaned.startsWith('activity/')) return cleaned;
    // If caller provided `/api/activity/...`, normalize to avoid
    // producing `activity/api/activity/...` which leads to 404s.
    if (cleaned.startsWith('api/activity/')) {
      cleaned = 'api/' + cleaned.slice('api/activity/'.length);
    }
    return `activity/${cleaned}`;
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedBase) return `/${normalizedPath}`;
  return `${normalizedBase}/${normalizedPath}`;
}
