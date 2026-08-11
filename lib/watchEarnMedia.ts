/**
 * Discord Activity içinde dış Supabase URL'leri CSP/proxy yüzünden açılmaz.
 * Public storage linklerini same-origin `/cdn/...` yoluna çevir.
 */
const SUPABASE_PUBLIC_STORAGE_RE =
  /^https?:\/\/(?:[a-z0-9-]+\.)?supabase\.co\/storage\/v1\/object\/public\/(.+)$/i;

export function toActivityMediaUrl(url: string | null | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';

  const match = raw.match(SUPABASE_PUBLIC_STORAGE_RE);
  if (match?.[1]) {
    return `/cdn/${match[1].replace(/^\/+/, '')}`;
  }

  // Zaten /cdn veya relative path
  if (raw.startsWith('/cdn/') || raw.startsWith('/menu-background/') || raw.startsWith('/')) {
    return raw;
  }

  return raw;
}
