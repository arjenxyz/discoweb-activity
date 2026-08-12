'use client';

const SFX_VOLUME_KEY = 'dashboard_sfx_volume';
const PREFS_EVENT = 'dashboard-prefs-changed';

let audioCtx: AudioContext | null = null;
let lastPlayAt = 0;

function getSfxVolume01(): number {
  if (typeof window === 'undefined') return 0.6;
  const raw = Number(window.localStorage.getItem(SFX_VOLUME_KEY));
  if (!Number.isFinite(raw)) return 0.6;
  return Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw));
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Soft Discord-like UI click — synthesized, no asset file. */
export function playUiClick(opts?: { force?: boolean; volumeScale?: number; volume01?: number }) {
  if (typeof window === 'undefined') return;

  const master = opts?.volume01 != null ? Math.min(1, Math.max(0, opts.volume01)) : getSfxVolume01();
  if (!opts?.force && master <= 0.001) return;

  const now = performance.now();
  if (!opts?.force && now - lastPlayAt < 45) return;
  lastPlayAt = now;

  const ctx = ensureCtx();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const gainMaster = Math.min(0.22, 0.06 + master * 0.16) * (opts?.volumeScale ?? 1);

  // Soft high tick
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(920, t0);
  osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.045);
  oscGain.gain.setValueAtTime(0.0001, t0);
  oscGain.gain.exponentialRampToValueAtTime(gainMaster, t0 + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.055);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.06);

  // Quiet low body
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(180, t0);
  body.frequency.exponentialRampToValueAtTime(90, t0 + 0.05);
  bodyGain.gain.setValueAtTime(0.0001, t0);
  bodyGain.gain.exponentialRampToValueAtTime(gainMaster * 0.35, t0 + 0.003);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(t0);
  body.stop(t0 + 0.08);
}

export function playUiClickPreview(volumePercent?: number) {
  const volume01 =
    volumePercent == null
      ? getSfxVolume01()
      : Math.min(1, Math.max(0, volumePercent / 100));
  playUiClick({ force: true, volumeScale: 1.1, volume01: Math.max(volume01, 0.05) });
}

/** Coin / purchase confirm — short bright chime for buy buttons. */
export function playPurchaseSound(opts?: { force?: boolean; volume01?: number }) {
  if (typeof window === 'undefined') return;

  const master = opts?.volume01 != null ? Math.min(1, Math.max(0, opts.volume01)) : getSfxVolume01();
  if (!opts?.force && master <= 0.001) return;

  const ctx = ensureCtx();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const gainMaster = Math.min(0.28, 0.08 + master * 0.2);

  const notes = [
    { freq: 880, at: 0, dur: 0.12 },
    { freq: 1174.66, at: 0.07, dur: 0.14 },
    { freq: 1567.98, at: 0.14, dur: 0.22 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, t0 + note.at);
    gain.gain.setValueAtTime(0.0001, t0 + note.at);
    gain.gain.exponentialRampToValueAtTime(gainMaster, t0 + note.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + note.at);
    osc.stop(t0 + note.at + note.dur + 0.02);
  }

  // Soft shimmer overtone
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.setValueAtTime(2349, t0 + 0.12);
  shimmerGain.gain.setValueAtTime(0.0001, t0 + 0.12);
  shimmerGain.gain.exponentialRampToValueAtTime(gainMaster * 0.35, t0 + 0.14);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
  shimmer.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.start(t0 + 0.12);
  shimmer.stop(t0 + 0.4);
}

let lastMoneyInAt = 0;

/** Incoming funds — warmer coin cascade when Papel balance increases. */
export function playMoneyInSound(opts?: { force?: boolean; volume01?: number }) {
  if (typeof window === 'undefined') return;

  const master = opts?.volume01 != null ? Math.min(1, Math.max(0, opts.volume01)) : getSfxVolume01();
  if (!opts?.force && master <= 0.001) return;

  const now = performance.now();
  if (!opts?.force && now - lastMoneyInAt < 700) return;
  lastMoneyInAt = now;

  const ctx = ensureCtx();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const gainMaster = Math.min(0.32, 0.1 + master * 0.22);

  const notes = [
    { freq: 523.25, at: 0, dur: 0.16 },
    { freq: 659.25, at: 0.08, dur: 0.16 },
    { freq: 783.99, at: 0.16, dur: 0.18 },
    { freq: 1046.5, at: 0.26, dur: 0.28 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, t0 + note.at);
    gain.gain.setValueAtTime(0.0001, t0 + note.at);
    gain.gain.exponentialRampToValueAtTime(gainMaster * 0.9, t0 + note.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + note.at);
    osc.stop(t0 + note.at + note.dur + 0.02);
  }

  // Soft low cash body
  const body = ctx.createOscillator();
  const bodyGain = ctx.createGain();
  body.type = 'triangle';
  body.frequency.setValueAtTime(220, t0);
  body.frequency.exponentialRampToValueAtTime(140, t0 + 0.2);
  bodyGain.gain.setValueAtTime(0.0001, t0);
  bodyGain.gain.exponentialRampToValueAtTime(gainMaster * 0.4, t0 + 0.02);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
  body.connect(bodyGain);
  bodyGain.connect(ctx.destination);
  body.start(t0);
  body.stop(t0 + 0.38);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target.closest(
    'button, a[href], [role="button"], [role="switch"], [role="tab"], [role="menuitem"], summary, label[for], input[type="checkbox"], input[type="radio"], input[type="range"], select',
  );
  if (!el) return false;
  if (el instanceof HTMLButtonElement && el.disabled) return false;
  if (el instanceof HTMLInputElement && el.disabled) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  if (el.closest('[data-no-click-sound="true"]')) return false;
  return true;
}

/** Attach once — plays soft click on interactive pointerdowns. */
export function bindGlobalUiClickSound(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (!isInteractiveTarget(event.target)) return;
    playUiClick();
  };

  const unlock = () => {
    const ctx = ensureCtx();
    void ctx?.resume().catch(() => {});
  };

  window.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener(PREFS_EVENT, unlock);

  return () => {
    window.removeEventListener('pointerdown', onPointerDown, true);
    window.removeEventListener(PREFS_EVENT, unlock);
  };
}
