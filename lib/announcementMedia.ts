import { apiUrl } from '@/lib/api';

const DISCORD_MEDIA_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);

/** Medya: satırından gelen URL'leri temizle (sondaki boşluk, &, ?) */
export function normalizeMediaUrl(url: string): string {
  let u = url.trim();
  u = u.replace(/[&\s]+$/, '');
  return u;
}

export function isDiscordCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DISCORD_MEDIA_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function isImageUrl(url: string) {
  const path = url.split('?')[0] ?? url;
  return /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(path) || /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url);
}

export function isVideoUrl(url: string) {
  const path = url.split('?')[0] ?? url;
  if (/\.(mp4|webm|mov|m4v|avi|ogg|ogv)$/i.test(path)) return true;
  return /\.(mp4|webm|mov|m4v|avi|ogg|ogv)(\?.*)?$/i.test(url);
}

/** Discord CDN videoları same-origin proxy üzerinden; diğerleri doğrudan */
export function getVideoPlaybackUrl(url: string): string | null {
  const normalized = normalizeMediaUrl(url);
  if (!normalized || !isVideoUrl(normalized)) return null;
  if (isDiscordCdnUrl(normalized)) {
    return apiUrl(`/api/media-proxy?url=${encodeURIComponent(normalized)}`);
  }
  return normalized;
}

export function getProxiedImageUrl(url: string): string {
  const normalized = normalizeMediaUrl(url);
  if (isDiscordCdnUrl(normalized)) {
    return apiUrl(`/api/media-proxy?url=${encodeURIComponent(normalized)}`);
  }
  return normalized;
}
