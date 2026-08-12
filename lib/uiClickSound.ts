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

/** @deprecated Prefer balance-driven money-in / money-out sounds. */
export function playPurchaseSound(opts?: { force?: boolean; volume01?: number }) {
  playMoneyOutSound(opts);
}

let lastMoneySfxAt = 0;

function canPlayMoneySfx(force?: boolean): boolean {
  const now = performance.now();
  if (!force && now - lastMoneySfxAt < 550) return false;
  lastMoneySfxAt = now;
  return true;
}

/** Papel gained — bright rising coin cascade. */
export function playMoneyInSound(opts?: { force?: boolean; volume01?: number }) {
  if (typeof window === 'undefined') return;

  const master = opts?.volume01 != null ? Math.min(1, Math.max(0, opts.volume01)) : getSfxVolume01();
  if (!opts?.force && master <= 0.001) return;
  if (!canPlayMoneySfx(opts?.force)) return;

  const ctx = ensureCtx();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const gainMaster = Math.min(0.34, 0.12 + master * 0.22);

  // Rising arpeggio: clearly "up"
  const notes = [
    { freq: 587.33, at: 0, dur: 0.11 },
    { freq: 740.0, at: 0.07, dur: 0.11 },
    { freq: 880.0, at: 0.14, dur: 0.12 },
    { freq: 1174.66, at: 0.22, dur: 0.2 },
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

  // High sparkle = reward cue
  const sparkle = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkle.type = 'sine';
  sparkle.frequency.setValueAtTime(2093, t0 + 0.24);
  sparkleGain.gain.setValueAtTime(0.0001, t0 + 0.24);
  sparkleGain.gain.exponentialRampToValueAtTime(gainMaster * 0.45, t0 + 0.26);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
  sparkle.connect(sparkleGain);
  sparkleGain.connect(ctx.destination);
  sparkle.start(t0 + 0.24);
  sparkle.stop(t0 + 0.44);
}

/** Papel spent / lost — darker falling coin drop. */
export function playMoneyOutSound(opts?: { force?: boolean; volume01?: number }) {
  if (typeof window === 'undefined') return;

  const master = opts?.volume01 != null ? Math.min(1, Math.max(0, opts.volume01)) : getSfxVolume01();
  if (!opts?.force && master <= 0.001) return;
  if (!canPlayMoneySfx(opts?.force)) return;

  const ctx = ensureCtx();
  if (!ctx) return;

  void ctx.resume().catch(() => {});

  const t0 = ctx.currentTime;
  const gainMaster = Math.min(0.3, 0.1 + master * 0.2);

  // Falling arpeggio: clearly "down"
  const notes = [
    { freq: 698.46, at: 0, dur: 0.1 },
    { freq: 523.25, at: 0.08, dur: 0.11 },
    { freq: 392.0, at: 0.16, dur: 0.14 },
    { freq: 293.66, at: 0.26, dur: 0.22 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, t0 + note.at);
    gain.gain.setValueAtTime(0.0001, t0 + note.at);
    gain.gain.exponentialRampToValueAtTime(gainMaster * 0.85, t0 + note.at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + note.at);
    osc.stop(t0 + note.at + note.dur + 0.02);
  }

  // Soft thud = spend cue
  const thud = ctx.createOscillator();
  const thudGain = ctx.createGain();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(140, t0);
  thud.frequency.exponentialRampToValueAtTime(70, t0 + 0.18);
  thudGain.gain.setValueAtTime(0.0001, t0);
  thudGain.gain.exponentialRampToValueAtTime(gainMaster * 0.55, t0 + 0.015);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  thud.connect(thudGain);
  thudGain.connect(ctx.destination);
  thud.start(t0);
  thud.stop(t0 + 0.24);
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
