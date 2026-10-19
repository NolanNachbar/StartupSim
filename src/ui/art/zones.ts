// A smooth, seeded field over the city's blocks. Neighbouring blocks get similar values, so the city has districts
// (a tower core, mid-rise belts, low streets) instead of noise. Presentation only: never touches the sim.

/** A stateless hash of a seed and two integers, in [0, 1). */
export function hash2(seed: number, x: number, y: number): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Value noise in [0, 1): `scale` is how many blocks a feature spans. */
export function valueNoise(seed: number, x: number, y: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const a = hash2(seed, x0, y0);
  const b = hash2(seed, x0 + 1, y0);
  const c = hash2(seed, x0, y0 + 1);
  const d = hash2(seed, x0 + 1, y0 + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/**
 * How built-up a block is, from 0 (open) to 1 (a core of towers): broad districts, a finer variation inside them,
 * and a lift toward a core placed away from the route so the road crosses several districts.
 */
export function intensity(seed: number, bx: number, by: number, coreX: number, coreY: number): number {
  const broad = valueNoise(seed + 11, bx, by, 5);
  const fine = valueNoise(seed + 29, bx, by, 2);
  const dist = Math.hypot(bx - coreX, by - coreY);
  const lift = Math.max(0, 1 - dist / 9);
  return Math.min(1, broad * 0.5 + fine * 0.2 + lift * 0.45);
}
