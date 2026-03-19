export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // URL'nin her zaman '/' ile başlamasını garanti altına alalım
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Eğer Discord Activity içindeysek, webview üzerinden çağrılan API path'leri
  // next.config rewrite ile '/activity/api/:path*' -> '/api/:path*' olarak yönlendirilecek.
  // Böylece discord host (ör: 146xxxxx.discordsays.com) üzerinde /activity/api
  // olarak çalışan endpoint'ler uygulamanın backend'ine ulaşır.
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    if (normalizedPath.startsWith('/api/')) {
      return `/activity${normalizedPath}`;
    }
    return normalizedPath;
  }

  // Normal tarayıcı/web ortamı için base URL birleştirmesi
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  if (!normalizedBase) return normalizedPath;
  
  return `${normalizedBase}${normalizedPath}`;
}
