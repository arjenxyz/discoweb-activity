/**
 * DiscoWeb Error Code Registry
 * Format: DW-XXXX
 * Docs: https://discoweb.tech/docs/errors
 */

export type ErrorCode = keyof typeof ERROR_CODES;

export const ERROR_CODES = {
  // ── Auth / Session (DW-1xxx) ──────────────────────────────────────────────
  'DW-1001': 'Discord frame_id parametresi bulunamadı. Activity penceresini kapatıp tekrar açın.',
  'DW-1002': 'Discord SDK kimlik doğrulaması zaman aşımına uğradı.',
  'DW-1003': 'Discord Client ID tanımlı değil (NEXT_PUBLIC_DISCORD_CLIENT_ID).',
  'DW-1004': 'Discord SDK kimlik doğrulaması başarısız oldu.',
  'DW-1005': 'Discord OAuth token alınamadı.',

  // ── Gate / Server Config (DW-2xxx) ────────────────────────────────────────
  'DW-2001': 'Sunucu sisteme kayıtlı değil. Yönetici kurulum yapmalı.',
  'DW-2002': 'Sunucu kurulumu tamamlanmamış. Yönetici setup\'ı bitirmeli.',
  'DW-2003': 'Bot sunucuda bulunamıyor. Yönetici botu yeniden davet etmeli.',
  'DW-2004': 'Discord API geçici hata verdi. Birkaç dakika sonra tekrar dene.',
  'DW-2005': 'Sunucu yapılandırması eksik (servis anahtarı).',
  'DW-2006': 'Bot token yapılandırması eksik.',

  // ── User / Permission (DW-3xxx) ───────────────────────────────────────────
  'DW-3001': 'Oturum geçersiz veya süresi dolmuş. Yeniden giriş gerekiyor.',
  'DW-3002': 'Bu sunucuda üye değilsin.',
  'DW-3003': 'Kullanıcı profili bulunamadı.',
  'DW-3004': 'Bu özellik için gerekli rol eksik.',
  'DW-3005': 'Bu işlem için yetkin yok.',

  // ── Economy (DW-4xxx) ─────────────────────────────────────────────────────
  'DW-4001': 'Bu özellik yüksek ekonomi gerektiriyor.',
  'DW-4002': 'İşlem bakiyeniz yetersiz.',
  'DW-4003': 'Günlük transfer limitine ulaşıldı.',

  // ── Network / API (DW-5xxx) ───────────────────────────────────────────────
  'DW-5001': 'Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.',
  'DW-5002': 'API yanıt vermedi. Sunucu geçici olarak meşgul olabilir.',
  'DW-5003': 'Geçersiz API yanıtı alındı.',

  // ── Uncaught / Unknown (DW-9xxx) ──────────────────────────────────────────
  'DW-9001': 'Beklenmeyen bir JavaScript hatası oluştu.',
  'DW-9002': 'İşlenmeyen bir Promise hatası oluştu.',
  'DW-9003': 'Bilinmeyen bir hata oluştu.',
} as const;

export function getErrorMessage(code: ErrorCode): string {
  return ERROR_CODES[code];
}

export function formatError(code: ErrorCode): string {
  return `[${code}] ${ERROR_CODES[code]}`;
}
