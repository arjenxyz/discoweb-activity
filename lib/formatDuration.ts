/**
 * Format duration in minutes to human-readable Turkish text.
 * duration_days column now stores MINUTES (not days).
 *
 * Examples:
 *   0       → "Süresiz"
 *   30      → "30 Dakika"
 *   60      → "1 Saat"
 *   90      → "1 Saat 30 Dakika"
 *   1440    → "1 Gün"
 *   2880    → "2 Gün"
 *   10080   → "7 Gün"
 *   43200   → "1 Ay"
 *   44640   → "1 Ay 1 Gün"
 */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'Süresiz';

  const months = Math.floor(minutes / 43200); // 30 * 1440
  const remAfterMonths = minutes % 43200;
  const days = Math.floor(remAfterMonths / 1440);
  const hours = Math.floor((remAfterMonths % 1440) / 60);
  const mins = remAfterMonths % 60;

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} Ay`);
  if (days > 0) parts.push(`${days} Gün`);
  if (hours > 0) parts.push(`${hours} Saat`);
  if (mins > 0) parts.push(`${mins} Dakika`);

  return parts.join(' ') || 'Süresiz';
}

/** Full format for detail views (same wording; kept for call sites) */
export function formatDurationLong(minutes: number): string {
  return formatDuration(minutes);
}
