// Real art, never drawn in code: Kenney's CC0 Tiny Town, Pixel Shmup and Pixel UI packs (see public/art/LICENSES.md).
// Sprites are shown at whole-number scales with nearest-neighbour sampling so pixels stay crisp.
const BASE = import.meta.env.BASE_URL;

export type SheetName = "town" | "shmup" | "ships";

interface Sheet {
  readonly url: string;
  readonly w: number;
  readonly h: number;
  readonly cell: number;
  readonly cols: number;
}

export const SHEETS: Record<SheetName, Sheet> = {
  town: { url: `${BASE}art/tilemap_packed.png`, w: 192, h: 176, cell: 16, cols: 12 },
  shmup: { url: `${BASE}art/tiles_packed.png`, w: 192, h: 160, cell: 16, cols: 12 },
  ships: { url: `${BASE}art/ships_packed.png`, w: 128, h: 192, cell: 32, cols: 4 },
};

/** Shmup tile numbers. */
export const SHMUP = { flag: 96, airfield: 110, boom: 4, smoke: 8 } as const;
/** Tiny Town tile numbers. */
export const TOWN = { grass: [0, 0, 0, 0, 0, 0, 0, 1, 2], dirt: 25, trees: [3, 4, 5, 27, 28, 16], sign: 83, roof: [52, 53], wall: [88, 89], coin: 93 } as const;
/** Pixel Shmup ship numbers (32 px cells). */
export const SHIP = { player: 7, wreck: 5 } as const;

const DIGIT_TILES = [19, 20, 21, 22, 23, 31, 32, 33, 34, 35] as const;
export const digitTile = (d: number): number => DIGIT_TILES[d] ?? 19;

const images = new Map<SheetName, Promise<HTMLImageElement>>();
export function loadSheet(name: SheetName): Promise<HTMLImageElement> {
  let p = images.get(name);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`could not load ${name}`));
      img.src = SHEETS[name].url;
    });
    images.set(name, p);
  }
  return p;
}

/** Draw one tile onto a canvas context, at art-pixel coordinates (the canvas is scaled by CSS, not by the context). */
export function drawTile(ctx: CanvasRenderingContext2D, img: HTMLImageElement, name: SheetName, idx: number, dx: number, dy: number): void {
  const s = SHEETS[name];
  const sx = (idx % s.cols) * s.cell;
  const sy = Math.floor(idx / s.cols) * s.cell;
  ctx.drawImage(img, sx, sy, s.cell, s.cell, dx, dy, s.cell, s.cell);
}

export interface SpriteProps {
  readonly sheet: SheetName;
  readonly idx: number;
  /** Whole-number scale: one art pixel is `scale` screen pixels. */
  readonly scale: number;
  /** Show only a region of the cell, in art pixels. */
  readonly crop?: { x: number; y: number; w: number; h: number };
  readonly class?: string;
  readonly style?: Record<string, string>;
}

export function Sprite({ sheet, idx, scale, crop, class: cls, style }: SpriteProps) {
  const s = SHEETS[sheet];
  const col = idx % s.cols;
  const row = Math.floor(idx / s.cols);
  const ox = col * s.cell + (crop?.x ?? 0);
  const oy = row * s.cell + (crop?.y ?? 0);
  return (
    <span
      class={`sprite ${cls ?? ""}`}
      aria-hidden="true"
      style={{
        width: `${(crop?.w ?? s.cell) * scale}px`,
        height: `${(crop?.h ?? s.cell) * scale}px`,
        backgroundImage: `url(${s.url})`,
        backgroundSize: `${s.w * scale}px ${s.h * scale}px`,
        backgroundPosition: `-${ox * scale}px -${oy * scale}px`,
        ...style,
      }}
    />
  );
}

/** The whole-number scale for a viewport width. */
export const scaleFor = (cssWidth: number): number => (cssWidth < 900 ? 3 : 4);
