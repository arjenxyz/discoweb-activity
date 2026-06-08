/** Oyun statik dosyaları — Discord Activity /activity prefix desteği */

export function isDiscordActivityHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('discordsays.com') || host.includes('discordapp.com');
}

/** @param relativePath örn. fish/Vector/fish_blue.svg */
export function gameAssetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\/+/, '').replace(/^games\//, '');
  const path = `games/${clean}`;
  if (isDiscordActivityHost()) return `/activity/${path}`;
  return `/${path}`;
}
