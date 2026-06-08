import type { SvgAssetKind } from './fishTheme';

/** Kenney Fish Pack — SVG sahne asset listeleri (Vector/) */

export const SCENE_BACKDROP = {
  terrain: 'background_terrain.svg',
  surface: 'background_terrain_top.svg',
} as const;

export const SCENE_PARALLAX_SEAWEED = [
  'background_seaweed_a.svg',
  'background_seaweed_b.svg',
  'background_seaweed_c.svg',
  'background_seaweed_d.svg',
  'background_seaweed_e.svg',
  'background_seaweed_f.svg',
  'background_seaweed_g.svg',
  'background_seaweed_h.svg',
] as const;

export const SCENE_PARALLAX_ROCKS = ['background_rock_a.svg', 'background_rock_b.svg'] as const;

export const SCENE_SAND_TILES = [
  'terrain_sand_top_a.svg',
  'terrain_sand_top_b.svg',
  'terrain_sand_top_c.svg',
  'terrain_sand_top_d.svg',
  'terrain_sand_top_e.svg',
  'terrain_sand_top_f.svg',
  'terrain_sand_top_g.svg',
  'terrain_sand_top_h.svg',
] as const;

export const SCENE_BUBBLE_SPRITES = ['bubble_a.svg', 'bubble_b.svg', 'bubble_c.svg'] as const;

export type BottomProp = {
  sprite: string;
  kind: SvgAssetKind;
  xRatio: number;
  width: number;
  height: number;
  flip?: boolean;
};

export const SCENE_BOTTOM_PROPS: BottomProp[] = [
  { sprite: 'rock_a.svg', kind: 'rock', xRatio: 0.02, width: 72, height: 56 },
  { sprite: 'seaweed_grass_a.svg', kind: 'plant', xRatio: 0.08, width: 48, height: 64 },
  { sprite: 'seaweed_green_a.svg', kind: 'plant', xRatio: 0.14, width: 44, height: 88 },
  { sprite: 'seaweed_green_b.svg', kind: 'plant', xRatio: 0.2, width: 40, height: 76 },
  { sprite: 'seaweed_orange_a.svg', kind: 'plant', xRatio: 0.28, width: 42, height: 80 },
  { sprite: 'seaweed_pink_a.svg', kind: 'plant', xRatio: 0.36, width: 38, height: 72 },
  { sprite: 'rock_b.svg', kind: 'rock', xRatio: 0.44, width: 64, height: 52, flip: true },
  { sprite: 'seaweed_green_c.svg', kind: 'plant', xRatio: 0.52, width: 46, height: 92 },
  { sprite: 'seaweed_pink_b.svg', kind: 'plant', xRatio: 0.6, width: 40, height: 78 },
  { sprite: 'seaweed_orange_b.svg', kind: 'plant', xRatio: 0.68, width: 44, height: 84 },
  { sprite: 'seaweed_grass_b.svg', kind: 'plant', xRatio: 0.76, width: 50, height: 66 },
  { sprite: 'seaweed_green_d.svg', kind: 'plant', xRatio: 0.82, width: 42, height: 86 },
  { sprite: 'seaweed_pink_c.svg', kind: 'plant', xRatio: 0.88, width: 38, height: 74 },
  { sprite: 'seaweed_pink_d.svg', kind: 'plant', xRatio: 0.94, width: 36, height: 70, flip: true },
];

export type ParallaxPlant = {
  sprite: string;
  kind: SvgAssetKind;
  baseXRatio: number;
  yRatio: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
};

export const SCENE_PARALLAX_PLANTS: ParallaxPlant[] = SCENE_PARALLAX_SEAWEED.map((sprite, i) => ({
  sprite,
  kind: 'plant' as const,
  baseXRatio: (i * 0.13) % 1,
  yRatio: 0.08 + (i % 4) * 0.11,
  width: 56 + (i % 3) * 12,
  height: 90 + (i % 2) * 24,
  speed: 12 + (i % 5) * 6,
  opacity: 0.35 + (i % 3) * 0.12,
}));

export type SceneBubble = {
  id: number;
  sprite: string;
  xRatio: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
};

export function createBubbles(count: number, height: number): SceneBubble[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    sprite: SCENE_BUBBLE_SPRITES[id % SCENE_BUBBLE_SPRITES.length],
    xRatio: 0.05 + Math.random() * 0.9,
    y: height * (0.15 + Math.random() * 0.75),
    size: 10 + Math.random() * 18,
    speed: 18 + Math.random() * 28,
    wobble: Math.random() * Math.PI * 2,
  }));
}

export type SpriteLoadEntry = { asset: string; kind: SvgAssetKind };

/** PNG veya SVG balık adını normalize eder */
export function normalizeFishSprite(sprite: string): string {
  return sprite.replace(/^Vector\//, '').replace(/\.png$/i, '.svg');
}

export function collectSceneSpriteEntries(fishSprites: string[]): SpriteLoadEntry[] {
  const entries: SpriteLoadEntry[] = [
    { asset: SCENE_BACKDROP.terrain, kind: 'backdrop' },
    { asset: SCENE_BACKDROP.surface, kind: 'water' },
    ...SCENE_PARALLAX_ROCKS.map((asset) => ({ asset, kind: 'rock' as const })),
    ...SCENE_SAND_TILES.map((asset) => ({ asset, kind: 'sand' as const })),
    ...SCENE_BUBBLE_SPRITES.map((asset) => ({ asset, kind: 'bubble' as const })),
    ...SCENE_BOTTOM_PROPS.map((p) => ({ asset: p.sprite, kind: p.kind })),
    ...SCENE_PARALLAX_PLANTS.map((p) => ({ asset: p.sprite, kind: p.kind })),
    ...fishSprites.map((s) => ({ asset: normalizeFishSprite(s), kind: 'fish' as const })),
    ...Array.from({ length: 10 }, (_, i) => ({ asset: `hud_number_${i}.svg`, kind: 'hud' as const })),
    { asset: 'hud_colon.svg', kind: 'hud' },
  ];

  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.asset)) return false;
    seen.add(e.asset);
    return true;
  });
}

export function drawHudValue(
  ctx: CanvasRenderingContext2D,
  images: Record<string, HTMLImageElement>,
  value: string,
  x: number,
  y: number,
  scale: number,
) {
  let cursor = x;
  for (const ch of value) {
    const key = ch === ':' ? 'hud_colon.svg' : `hud_number_${ch}.svg`;
    const img = images[key];
    const w = (img?.width ?? 16) * scale;
    const h = (img?.height ?? 16) * scale;
    if (img?.complete) {
      ctx.drawImage(img, cursor, y, w, h);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${14 * scale}px system-ui`;
      ctx.fillText(ch, cursor, y + h * 0.8);
    }
    cursor += w + scale;
  }
}
