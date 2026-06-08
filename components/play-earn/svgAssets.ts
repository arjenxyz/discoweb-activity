import { gameAssetUrl } from '@/lib/gameAssets';
import { applyThemeToSvg, type FishVisualTheme, type SvgAssetKind } from './fishTheme';

const imageCache = new Map<string, HTMLImageElement>();
const svgTextCache = new Map<string, string>();
const objectUrls: string[] = [];

export function fishAssetBase(file: string): string {
  const normalized = file.replace(/^Vector\//, '').replace(/\.png$/i, '.svg');
  const path = file.startsWith('Vector/') || !file.includes('/')
    ? `fish/Vector/${normalized}`
    : `fish/${file.replace(/\.png$/i, '.svg')}`;
  return gameAssetUrl(path);
}

export function cacheKey(asset: string, theme: FishVisualTheme) {
  return `${asset}|${theme.time}|${theme.persona}`;
}

async function fetchSvgText(url: string): Promise<string> {
  if (svgTextCache.has(url)) return svgTextCache.get(url)!;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`svg_fetch_failed:${url}:${res.status}`);
  const text = await res.text();
  if (!text.includes('<svg')) throw new Error(`svg_invalid:${url}`);
  svgTextCache.set(url, text);
  return text;
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg_image_decode_failed'));
    img.src = url;
  });
}

const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="transparent"/></svg>';

async function loadPlaceholder(): Promise<HTMLImageElement> {
  return svgToImage(PLACEHOLDER_SVG);
}

export async function loadThemedSvg(
  asset: string,
  kind: SvgAssetKind,
  theme: FishVisualTheme,
): Promise<HTMLImageElement> {
  const key = cacheKey(asset, theme);
  const cached = imageCache.get(key);
  if (cached) return cached;

  try {
    const url = fishAssetBase(asset);
    const raw = await fetchSvgText(url);
    const themed = applyThemeToSvg(raw, kind, theme);
    const img = await svgToImage(themed);
    imageCache.set(key, img);
    return img;
  } catch {
    const fallback = await loadPlaceholder();
    imageCache.set(key, fallback);
    return fallback;
  }
}

export async function preloadThemedSprites(
  entries: Array<{ asset: string; kind: SvgAssetKind }>,
  theme: FishVisualTheme,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Record<string, HTMLImageElement>> {
  const images: Record<string, HTMLImageElement> = {};
  let loaded = 0;

  await Promise.all(
    entries.map(async ({ asset, kind }) => {
      const img = await loadThemedSvg(asset, kind, theme);
      images[asset] = img;
      loaded += 1;
      onProgress?.(loaded, entries.length);
    }),
  );

  return images;
}

export function getCachedImage(asset: string, theme: FishVisualTheme): HTMLImageElement | undefined {
  return imageCache.get(cacheKey(asset, theme));
}

export function clearSvgImageCache() {
  for (const url of objectUrls.splice(0)) URL.revokeObjectURL(url);
  imageCache.clear();
}
