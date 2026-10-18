// Cosmetic geometry for the sectional map. Seeded so each world draws its own terrain.
// This is presentation only: it never touches the sim and never affects a run.

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

/** The HUD covers the top bar and the bottom plate, so the route lives in the open band between them. */
export function routeBox(w: number): Box {
  return w < 600 ? { x0: 0.14, x1: 0.82, y0: 0.19, y1: 0.43 } : { x0: 0.1, x1: 0.5, y0: 0.22, y1: 0.58 };
}

/** Route waypoints: start (bottom left of the box), one per hypothesis, destination (top right). */
export function routePoints(n: number, seed: number, w: number, h: number, box: Box): Pt[] {
  const rng = makeRng(seed + 7);
  const start: Pt = [w * box.x0, h * box.y1];
  const dest: Pt = [w * box.x1, h * box.y0];
  const bend = Math.min(w, h) * 0.07;
  const pts: Pt[] = [start];
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const wobble = (i % 2 === 0 ? -1 : 1) * (bend * 0.5 + rng() * bend * 0.5);
    pts.push([start[0] + (dest[0] - start[0]) * t + wobble * 0.5, start[1] + (dest[1] - start[1]) * t + wobble]);
  }
  pts.push(dest);
  return pts;
}

const r = (n: number): number => Math.round(n * 10) / 10;

/** Cubic segments through the points (Catmull-Rom converted to Bezier), one path string per leg. */
export function legPaths(pts: readonly Pt[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)] as Pt;
    const p1 = pts[i] as Pt;
    const p2 = pts[i + 1] as Pt;
    const p3 = pts[Math.min(pts.length - 1, i + 2)] as Pt;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push(`M ${r(p1[0])} ${r(p1[1])} C ${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`);
  }
  return out;
}

/** A wobbly closed loop around a centre, as a smooth path. */
export function blob(cx: number, cy: number, radius: number, rng: () => number, points = 11): string {
  const pts: Pt[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rad = radius * (0.78 + rng() * 0.44);
    pts.push([cx + Math.cos(a) * rad * 1.25, cy + Math.sin(a) * rad]);
  }
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const first = mid(pts[points - 1] as Pt, pts[0] as Pt);
  let d = `M ${r(first[0])} ${r(first[1])}`;
  for (let i = 0; i < points; i++) {
    const p = pts[i] as Pt;
    const m = mid(p, pts[(i + 1) % points] as Pt);
    d += ` Q ${r(p[0])} ${r(p[1])} ${r(m[0])} ${r(m[1])}`;
  }
  return `${d} Z`;
}

export interface Terrain {
  readonly contours: readonly string[];
  readonly lakes: readonly string[];
  readonly trees: readonly Pt[];
  readonly rivers: readonly string[];
}

export function terrain(seed: number, w: number, h: number): Terrain {
  const rng = makeRng(seed);
  const unit = Math.min(w, h) / 300;
  const contours: string[] = [];
  const hills = 3 + Math.floor((w * h) / 250_000);
  for (let i = 0; i < hills; i++) {
    const cx = rng() * w;
    const cy = rng() * h;
    for (const radius of [14, 28, 44, 62, 82]) contours.push(blob(cx, cy, radius * unit, rng, 12));
  }
  const lakes = [0, 1].map(() => blob(rng() * w, rng() * h, (14 + rng() * 14) * unit, rng, 9));
  const rivers: string[] = [];
  for (let i = 0; i < 2; i++) {
    const x = rng() * w;
    rivers.push(`M ${r(x)} 0 C ${r(x + 90 * unit)} ${r(h * 0.3)} ${r(x - 90 * unit)} ${r(h * 0.6)} ${r(x + 40 * unit)} ${r(h)}`);
  }
  const trees: Pt[] = [];
  const count = Math.floor((w * h) / 9000);
  for (let i = 0; i < count; i++) trees.push([rng() * w, rng() * h]);
  return { contours, lakes, trees, rivers };
}
