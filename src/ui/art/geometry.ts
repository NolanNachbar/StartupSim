// Placement of the route on the pixel map. Seeded so each world lays out differently.
// Presentation only: it never touches the sim and never affects a run. Coordinates are art pixels.

export type Pt = readonly [number, number];

/** Small deterministic generator (mulberry32). Cosmetic use only. */
export function makeRng(seed: number): () => number {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The part of the screen the route may use, as fractions of width and height. */
export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/** The HUD covers the top and the plate and dock cover the bottom, so the route lives in the open band between. */
export function routeBox(cssWidth: number): Box {
  return cssWidth < 600 ? { x0: 0.3, x1: 0.72, y0: 0.26, y1: 0.54 } : { x0: 0.18, x1: 0.5, y0: 0.24, y1: 0.6 };
}

/** Route waypoints: start (bottom left of the box), one per hypothesis, destination (top right). The road winds:
 * waypoints alternate between the left and right of the box so a house beside each one never overlaps its neighbour. */
export function routePoints(n: number, seed: number, w: number, h: number, box: Box): Pt[] {
  const rng = makeRng(seed + 7);
  const bx0 = w * box.x0;
  const bx1 = w * box.x1;
  const by0 = h * box.y0;
  const by1 = h * box.y1;
  const pts: Pt[] = [[Math.round(bx0), Math.round(by1)]];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const side = i % 2 === 0 ? 0.12 : 0.88;
    const jitter = (rng() - 0.5) * 0.08;
    pts.push([Math.round(bx0 + (bx1 - bx0) * (side + jitter)), Math.round(by1 + (by0 - by1) * t)]);
  }
  pts.push([Math.round(bx1), Math.round(by0)]);
  return pts;
}

/** The point a fraction t of the way along the polyline. */
export function pointAlong(pts: readonly Pt[], t: number): Pt {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lens.push(len);
    total += len;
  }
  let at = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    const len = lens[i] as number;
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    if (at <= len || i === lens.length - 1) {
      const f = len === 0 ? 0 : Math.min(1, at / len);
      return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f)];
    }
    at -= len;
  }
  return pts[0] as Pt;
}

/** Houses stand beside the road, alternating sides so neighbours never overlap. Returns the house's top-left, in art pixels. */
export function houseSpot(i: number, p: Pt): Pt {
  return [p[0] + (i % 2 === 0 ? -36 : 4), p[1] - 32];
}
