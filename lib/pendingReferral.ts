/**
 * Bekleyen referral bilgisi — DiscordActivityAuth tarafından set edilir,
 * ReferralSection tarafından okunur ve kullanıcıya onay gösterilir.
 */

type PendingReferral =
  | { type: 'by_user'; referrer_discord_id: string }
  | { type: 'by_code'; code: string };

let _pending: PendingReferral | null = null;
const _listeners: Array<(r: PendingReferral | null) => void> = [];

export function setPendingReferral(r: PendingReferral | null) {
  _pending = r;
  _listeners.forEach((fn) => fn(r));
}

export function getPendingReferral(): PendingReferral | null {
  return _pending;
}

export function onPendingReferralChange(fn: (r: PendingReferral | null) => void): () => void {
  _listeners.push(fn);
  return () => {
    const i = _listeners.indexOf(fn);
    if (i !== -1) _listeners.splice(i, 1);
  };
}
