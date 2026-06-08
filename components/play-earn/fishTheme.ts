export type PersonaId = 'ocean' | 'coral' | 'emerald' | 'sunset' | 'violet';
export type TimeOfDay = 'day' | 'night';
export type TimeMode = 'auto' | TimeOfDay;

export type SvgAssetKind = 'backdrop' | 'water' | 'plant' | 'rock' | 'sand' | 'fish' | 'bubble' | 'hud' | 'neutral';

export type FishVisualTheme = {
  time: TimeOfDay;
  persona: PersonaId;
  waterGradient: [string, string, string];
  sandColor: string;
  surfaceGlow: string;
  vignette: number;
  moonGlow?: boolean;
};

export const PERSONAS: Array<{ id: PersonaId; labelKey: string; accent: string }> = [
  { id: 'ocean', labelKey: 'play_earn_persona_ocean', accent: '#38bdf8' },
  { id: 'coral', labelKey: 'play_earn_persona_coral', accent: '#fb7185' },
  { id: 'emerald', labelKey: 'play_earn_persona_emerald', accent: '#34d399' },
  { id: 'sunset', labelKey: 'play_earn_persona_sunset', accent: '#fb923c' },
  { id: 'violet', labelKey: 'play_earn_persona_violet', accent: '#a78bfa' },
];

const PERSONA_HUE: Record<PersonaId, number> = {
  ocean: 198,
  coral: 350,
  emerald: 152,
  sunset: 28,
  violet: 265,
};

const STORAGE_PERSONA = 'play-earn-persona';
const STORAGE_TIME_MODE = 'play-earn-time-mode';

export function resolveTimeOfDay(mode: TimeMode): TimeOfDay {
  if (mode === 'auto') {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 19 ? 'day' : 'night';
  }
  return mode;
}

export function loadStoredPersona(): PersonaId {
  if (typeof window === 'undefined') return 'ocean';
  const raw = localStorage.getItem(STORAGE_PERSONA);
  if (raw && raw in PERSONA_HUE) return raw as PersonaId;
  return 'ocean';
}

export function storePersona(persona: PersonaId) {
  localStorage.setItem(STORAGE_PERSONA, persona);
}

export function loadStoredTimeMode(): TimeMode {
  if (typeof window === 'undefined') return 'auto';
  const raw = localStorage.getItem(STORAGE_TIME_MODE);
  if (raw === 'day' || raw === 'night' || raw === 'auto') return raw;
  return 'auto';
}

export function storeTimeMode(mode: TimeMode) {
  localStorage.setItem(STORAGE_TIME_MODE, mode);
}

export function buildVisualTheme(persona: PersonaId, time: TimeOfDay): FishVisualTheme {
  const accent = PERSONAS.find((p) => p.id === persona)?.accent ?? '#38bdf8';

  if (time === 'day') {
    return {
      time,
      persona,
      waterGradient: ['#5ec8e8', '#2a9fc4', '#1578a8'],
      sandColor: '#d4b483',
      surfaceGlow: 'rgba(255,255,255,0.35)',
      vignette: 0.08,
    };
  }

  return {
    time,
    persona,
    waterGradient: ['#0f2d4a', '#081f38', '#040f1f'],
    sandColor: '#6b5a45',
    surfaceGlow: `color-mix(in srgb, ${accent} 35%, #1e3a5f)`,
    vignette: 0.35,
    moonGlow: true,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  h /= 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

function lerpHue(a: number, b: number, t: number) {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

export function remapSvgColor(hex: string, kind: SvgAssetKind, theme: FishVisualTheme): string {
  const { r, g, b } = hexToRgb(hex);
  let { h, s, l } = rgbToHsl(r, g, b);

  if (theme.time === 'night') {
    l = clamp(l * 0.72 - 0.04, 0, 1);
    s = clamp(s * 0.82, 0, 1);
    h = lerpHue(h, 220, 0.12);
  } else {
    l = clamp(l * 1.04 + 0.03, 0, 1);
    s = clamp(s * 1.06, 0, 1);
  }

  const personaHue = PERSONA_HUE[theme.persona];

  if (kind === 'fish') {
    h = lerpHue(h, personaHue, theme.time === 'night' ? 0.42 : 0.28);
    if (theme.time === 'night') l = clamp(l + 0.14, 0, 1);
    s = clamp(s * 1.15, 0, 1);
  } else if (kind === 'bubble') {
    h = lerpHue(h, personaHue, 0.55);
    l = clamp(l + (theme.time === 'night' ? 0.2 : 0.08), 0, 1);
    s = clamp(s * 0.7, 0, 1);
  } else if (kind === 'plant') {
    if (theme.time === 'night') {
      l *= 0.55;
      s *= 0.65;
      h = lerpHue(h, personaHue, 0.15);
    }
  } else if (kind === 'rock' || kind === 'sand') {
    if (theme.time === 'night') l *= 0.5;
  } else if (kind === 'backdrop' || kind === 'water') {
    if (theme.time === 'night') {
      h = lerpHue(h, 215, 0.35);
      l *= 0.45;
    }
  } else if (kind === 'hud') {
    if (theme.time === 'night') l = clamp(l + 0.25, 0, 1);
    h = lerpHue(h, personaHue, 0.2);
  }

  const out = hslToRgb(h, s, l);
  return rgbToHex(out.r, out.g, out.b);
}

export function applyThemeToSvg(svg: string, kind: SvgAssetKind, theme: FishVisualTheme): string {
  return svg.replace(/(fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g, (_m, attr: string, color: string) => {
    return `${attr}="${remapSvgColor(color, kind, theme)}"`;
  });
}
