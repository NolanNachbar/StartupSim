// The campus sprites: Kenney CC0 3D kits rendered to isometric WebP by scripts/blender/render_city.py.
// manifest.json records each sprite's size and anchor (the ground centre of its footprint), in pixels at the
// render scale where one ground tile is a 96 px wide diamond.
const BASE = `${import.meta.env.BASE_URL}art/city/`;

export const RENDER_TILE_W = 96;

export interface SpriteMeta {
  readonly w: number;
  readonly h: number;
  readonly ax: number;
  readonly ay: number;
}

let manifest: Promise<Record<string, SpriteMeta>> | null = null;
export function loadManifest(): Promise<Record<string, SpriteMeta>> {
  manifest ??= fetch(`${BASE}manifest.json`)
    .then((r) => r.json() as Promise<Record<string, SpriteMeta>>)
    .catch((e: unknown) => {
      manifest = null; // try again next time
      throw e;
    });
  return manifest;
}

const images = new Map<string, Promise<HTMLImageElement>>();
export function loadSprite(name: string): Promise<HTMLImageElement> {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(name);
        reject(new Error(`could not load sprite ${name}`));
      };
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
  // One sprite that fails to download must not blank the whole map: draw without it.
  const settled = await Promise.allSettled(list.map(async (n) => [n, await loadSprite(n)] as const));
  const loaded = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  return { meta, img: new Map(loaded) };
}

/** Draw a sprite so its ground anchor lands on (cx, cy). `scale` converts render pixels to canvas pixels. */
export function drawSprite(ctx: CanvasRenderingContext2D, l: Loaded, name: string, cx: number, cy: number, scale: number): void {
  const m = l.meta[name];
  const img = l.img.get(name);
  if (!m || !img) return;
  ctx.drawImage(img, cx - m.ax * scale, cy - m.ay * scale, m.w * scale, m.h * scale);
}

/**
 * Paint tints: a colour multiplied into a sprite (the shading and windows stay). 0 is the model as rendered;
 * 1 to 9 are muted building materials (sand, stone, clay, concrete, cream) and 10 to 13 are deeper greens for
 * foliage. Real cities are mostly neutral, so the palette is too.
 */
export const TINTS: readonly string[] = ["", "#ecd9b8", "#d9d2c3", "#e4c9a8", "#c9d3dc", "#f0e6d0", "#d8bfa6", "#bfc7c9", "#e8e2d6", "#cdb99a", "#5f8f4e", "#52814a", "#6a9855", "#477a45"];
const HAZE = "rgba(214, 226, 250, 0.3)";

let scratch: HTMLCanvasElement | null = null;
/** Draw a sprite with an optional tint and distance haze. The colour goes on a scratch copy, so nothing is cached. */
export function drawStyled(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, tint: number, far: boolean): void {
  if (!tint && !far) return void ctx.drawImage(img, x, y, w, h);
  scratch ??= document.createElement("canvas");
  if (scratch.width < img.width) scratch.width = img.width;
  if (scratch.height < img.height) scratch.height = img.height;
  const s = scratch.getContext("2d");
  if (!s) return void ctx.drawImage(img, x, y, w, h);
  s.globalCompositeOperation = "source-over";
  s.clearRect(0, 0, scratch.width, scratch.height);
  s.drawImage(img, 0, 0);
  if (tint) {
    s.globalCompositeOperation = "multiply";
    s.fillStyle = TINTS[tint] ?? "#ffffff";
    s.fillRect(0, 0, img.width, img.height);
    s.globalCompositeOperation = "destination-in"; // multiply fills the transparent pixels too: keep only the sprite's own shape
    s.drawImage(img, 0, 0);
  }
  if (far) {
    s.globalCompositeOperation = "source-atop";
    s.fillStyle = HAZE;
    s.fillRect(0, 0, img.width, img.height);
  }
  ctx.drawImage(scratch, 0, 0, img.width, img.height, x, y, w, h);
}

