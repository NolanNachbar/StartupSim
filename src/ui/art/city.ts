// The campus sprites: Kenney CC0 3D kits rendered to isometric WebP by scripts/blender/render_city.py.
// manifest.json records each sprite's size and anchor (the ground centre of its footprint), in pixels at the
// render scale where one ground tile is a 128 px wide diamond.
const BASE = `${import.meta.env.BASE_URL}art/city/`;

export const RENDER_TILE_W = 128;

export interface SpriteMeta {
  readonly w: number;
  readonly h: number;
  readonly ax: number;
  readonly ay: number;
}

let manifest: Promise<Record<string, SpriteMeta>> | null = null;
export function loadManifest(): Promise<Record<string, SpriteMeta>> {
  manifest ??= fetch(`${BASE}manifest.json`).then((r) => r.json() as Promise<Record<string, SpriteMeta>>);
  return manifest;
}

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadSprite(name: string): Promise<HTMLImageElement> {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load sprite ${name}`));
      img.src = `${BASE}${name}.webp`;
    });
    images.set(name, p);
  }
  return p;
}

export const spriteUrl = (name: string): string => `${BASE}${name}.webp`;

export interface Loaded {
  readonly meta: Record<string, SpriteMeta>;
  readonly img: ReadonlyMap<string, HTMLImageElement>;
}

export async function loadSprites(names: Iterable<string>): Promise<Loaded> {
  const meta = await loadManifest();
  const list = [...new Set(names)].filter((n) => n in meta);
  const loaded = await Promise.all(list.map(async (n) => [n, await loadSprite(n)] as const));
  return { meta, img: new Map(loaded) };
}

/** Draw a sprite so its ground anchor lands on (cx, cy). `scale` converts render pixels to canvas pixels. */
export function drawSprite(ctx: CanvasRenderingContext2D, l: Loaded, name: string, cx: number, cy: number, scale: number): void {
  const m = l.meta[name];
  const img = l.img.get(name);
  if (!m || !img) return;
  ctx.drawImage(img, cx - m.ax * scale, cy - m.ay * scale, m.w * scale, m.h * scale);
}
