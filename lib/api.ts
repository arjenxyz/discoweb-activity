export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function apiUrl(path: string): string {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // URL'nin her zaman '/' ile başlamasını garanti altına alalım
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Eğer Discord Activity içindeysek, hiçbir ekleme yapmadan doğrudan relative path'i döndür.
  // Çünkü Discord proxy'miz '/api' isteklerini otomatik yakalayıp Vercel'e iletecek.
  if (typeof window !== 'undefined' && window.location.hostname.includes('discordsays.com')) {
    return normalizedPath;
  }

  // Normal tarayıcı/web ortamı için base URL birleştirmesi
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  if (!normalizedBase) return normalizedPath;
  
  return `${normalizedBase}${normalizedPath}`;
}
