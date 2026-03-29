/**
 * Hata raporları için bağlam bilgisi:
 * - Aktif section (sayfa bölümü)
 * - Cihaz/ortam bilgisi
 */

let _section = 'unknown';

export function setCurrentSection(section: string) {
  _section = section;
}

export function getCurrentSection(): string {
  return _section;
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'server';
  const isActivity = window.location.hostname.includes('discordsays.com');
  return [
    `${window.innerWidth}×${window.innerHeight}`,
    isActivity ? 'Discord Activity' : 'Browser',
    navigator.platform ?? 'unknown',
  ].join(' | ');
}
