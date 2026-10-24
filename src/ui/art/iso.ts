// Isometric placement for the campus: projection, the route as a road, road-tile selection and a seeded city.
// Presentation only: it never touches the sim and never affects a run. A cell is (gx, gy). Moving +gx goes down and
// to the right on screen, +gy goes down and to the left (a 2:1 diamond grid).
import { makeRng } from "./geometry";
import { intensity } from "./zones";

export interface Cell {
  readonly gx: number;
  readonly gy: number;
}
export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Screen directions of the four neighbours. */
export const DIR = { UL: 1, UR: 2, DR: 4, DL: 8 } as const;
const STEP: Record<number, readonly [number, number]> = { 1: [-1, 0], 2: [0, -1], 4: [1, 0], 8: [0, 1] };

export function project(c: Cell, tileW: number, origin: Pt): Pt {
  return { x: origin.x + ((c.gx - c.gy) * tileW) / 2, y: origin.y + ((c.gx + c.gy) * tileW) / 4 };
}

export function unproject(p: Pt, tileW: number, origin: Pt): Cell {
  const a = ((p.x - origin.x) * 2) / tileW; // gx - gy
  const b = ((p.y - origin.y) * 4) / tileW; // gx + gy
  return { gx: Math.round((a + b) / 2), gy: Math.round((b - a) / 2) };
}

/** One road out of the company's home to a group of customers. */
export interface Spoke {
  /** From the home plaza to the destination, in order (the home cell is first). */
  readonly cells: readonly Cell[];
  /** The stretch next to the destination that is painted with how much the player knows about that group. */
  readonly line: readonly Cell[];
  readonly dest: Cell;
}
/**
 * The map: one home and a road in a different direction for each customer group. The groups are choices to pick
 * between, not stages along one road.
 */
export interface Route {
  /** Every road cell of every spoke (the stretches they share are listed once). */
  readonly cells: readonly Cell[];
  readonly hub: Cell;
  readonly spokes: readonly Spoke[];
}

const k = (gx: number, gy: number): string => `${gx},${gy}`;

/** Streets run along every sixth line, so the city is blocks of 5 x 5 cells between them. */
export const STREET = 6;
export const STREET_OFFSET = 3;
export const isStreet = (gx: number, gy: number, size: number): boolean =>
  gx >= STREET_OFFSET && gy >= STREET_OFFSET && gx <= size - 4 && gy <= size - 4 && ((gx - STREET_OFFSET) % STREET === 0 || (gy - STREET_OFFSET) % STREET === 0);
const isCrossing = (gx: number, gy: number): boolean => (gx - STREET_OFFSET) % STREET === 0 && (gy - STREET_OFFSET) % STREET === 0;

const COMPASS: readonly (readonly [number, number])[] = [[-1, 0], [0, -1], [1, 0], [0, 1]]; // up-left, up-right, down-right, down-left

/**
 * The home sits at a street crossing near the middle of the city. Each customer group gets its own road: one block
 * along a street in one of the four directions (the seed picks the order). A fifth group's road leaves down-right and
 * turns down-left, so it still ends at its own crossing. Only the last block of a road carries the evidence line.
 */
export function buildRoute(n: number, seed: number, size: number): Route {
  const rng = makeRng(seed + 101);
  const h = STREET_OFFSET + STREET * Math.round((size / 2 - STREET_OFFSET) / STREET);
  const hub: Cell = { gx: h, gy: h };
  const order = [...COMPASS];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j] as readonly [number, number], order[i] as readonly [number, number]];
  }
  const walk = (from: Cell, d: readonly [number, number], steps: number): Cell[] => Array.from({ length: steps }, (_, i) => ({ gx: from.gx + d[0] * (i + 1), gy: from.gy + d[1] * (i + 1) }));
  const spokes: Spoke[] = [];
  for (let i = 0; i < Math.min(n, 4); i++) {
    const d = order[i] as readonly [number, number];
    const out = walk(hub, d, STREET);
    spokes.push({ cells: [hub, ...out], line: out, dest: out[out.length - 1] as Cell });
  }
  if (n >= 5) {
    const first = walk(hub, [1, 0], STREET);
    const turn = walk(first[first.length - 1] as Cell, [0, 1], STREET);
    spokes.push({ cells: [hub, ...first, ...turn], line: turn, dest: turn[turn.length - 1] as Cell });
  }
  const seen = new Set<string>();
  const cells: Cell[] = [];
  for (const sp of spokes) for (const c of sp.cells) if (!seen.has(k(c.gx, c.gy))) {
    seen.add(k(c.gx, c.gy));
    cells.push(c);
  }
  return { cells, hub, spokes };
}

/** Which neighbours of a road cell are roads too, as a DIR bitmask. */
export function roadMask(road: ReadonlySet<string>, c: Cell): number {
  let mask = 0;
  for (const d of [DIR.UL, DIR.UR, DIR.DR, DIR.DL]) {
    const [dx, dy] = STEP[d] as readonly [number, number];
    if (road.has(k(c.gx + dx, c.gy + dy))) mask |= d;
  }
  return mask;
}

export interface Prop {
  readonly gx: number;
  readonly gy: number;
  readonly sprite: string;
  /** Index into the paint tints (0 is the model as rendered). Buildings only; it keeps a street from looking stamped. */
  readonly tint?: number;
}
export interface Landmark extends Cell {
  readonly sprite: string;
  /** Which road (spoke) this building ends. */
  readonly beside: number;
  /** A standing sign with an abstract mark, next to the building. */
  readonly sign: Prop;
}
/** A car that drives along a straight street, in one of two lanes, forever (it wraps at the edge of the city). */
export interface Vehicle {
  /** The sprite, with its heading: the same model faces along its street. */
  readonly sprite: string;
  /** "x": the street runs along gx (up-left and down-right on screen); "y": along gy. */
  readonly axis: "x" | "y";
  /** The street's fixed coordinate: gy for axis x, gx for axis y. */
  readonly line: number;
  /** Where along the street it is at time zero, in cells. */
  readonly start: number;
  readonly dir: 1 | -1;
  /** Cells per second. Every car in a lane has the same speed, so cars in a lane never overtake. */
  readonly speed: number;
}

/**
 * How far a street's loop is, in cells. It is a whole number of blocks, so a car that wraps keeps the same place
 * within its block: that is what keeps cars on crossing streets from ever meeting (see SLOTS).
 */
export const trafficLength = (size: number): number => Math.floor((size - 7) / STREET) * STREET;

/**
 * Where in its block (cells past a crossing) a car may start. Every car drives at the same speed, so two cars meet at a
 * crossing only if their places in the block match (same heading) or add up to a whole block (opposite headings).
 * These places keep every pair at least 1.5 cells apart in either case, so cars on crossing streets never pass through
 * each other. Streets along x use the first pair, streets along y the second.
 */
const SLOTS: Record<"x" | "y", readonly number[]> = { x: [0, 3], y: [1.5, 4.5] };

/** Where a vehicle is, in cells, after `seconds`. The lane offset keeps opposite directions apart. */
export function vehicleCell(v: Vehicle, seconds: number, size: number): Cell {
  const length = trafficLength(size);
  const along = STREET_OFFSET + ((((v.start - STREET_OFFSET + v.dir * v.speed * seconds) % length) + length) % length);
  const lane = v.dir * 0.17;
  return v.axis === "x" ? { gx: along, gy: v.line + lane } : { gx: v.line + lane, gy: along };
}

/** Every car sprite the traffic can use, so a screen can fetch them all up front (they are small). */
export const CAR_SPRITES: readonly string[] = ["sedan", "suv", "taxi", "police", "truck-flat"].flatMap((m) => ["0", "90", "180", "270"].map((r) => `car-${m}-${r}`));

export interface City {
  readonly theme: Theme;
  /** Street cells: key "gx,gy" to the route index (or -1 for a cross street). */
  readonly roads: ReadonlyMap<string, number>;
  readonly props: readonly Prop[];
  /** Cars parked on the paved lots. */
  readonly cars: readonly Prop[];
  /** Cars driving along the cross streets (never on a street the route uses). */
  readonly traffic: readonly Vehicle[];
  /** Paved lots (parking, plazas) drawn flat on the ground. */
  readonly pads: readonly Cell[];
  /** Intersections built as roundabouts. */
  readonly circles: readonly Cell[];
  readonly landmarks: readonly Landmark[];
  /** The cell of the HQ roundabout at the end of the route, and the building that stands beside it. */
  readonly hq: Cell;
  readonly hqSprite: string;
}

/** What kind of place the company is built in. Each industry has one, so the setting matches the business. */
export type Theme = "rural" | "suburban" | "urban" | "downtown";
export const THEME_LABEL: Record<Theme, string> = { rural: "Rural", suburban: "Suburban", urban: "Urban", downtown: "Downtown" };
/** In the order of INDUSTRIES in the sim: local services, consumer apps, business software, health, fintech, creators, food, retail, travel, real estate, pets, entertainment, transport, beauty. */
const INDUSTRY_THEME: readonly Theme[] = ["rural", "urban", "downtown", "suburban", "downtown", "suburban", "urban", "urban", "downtown", "suburban", "suburban", "urban", "rural", "urban"];
export const themeFor = (industry: number | null | undefined): Theme => (industry === null || industry === undefined ? "urban" : (INDUSTRY_THEME[industry] ?? "urban"));
/** How many paint tints a building can take (see IsoWorld). */
export const TINT_COUNT = 10;
/** Foliage tints are 10 to 13 (see IsoWorld). */
const FOLIAGE_TINTS = 4;

const VIEWS4 = ["", "-r90", "-r180", "-r270"];
const VIEWS2 = ["", "-r90"];
const VIEWS_OPPOSITE = ["", "-r180"];
/** Models rendered in two views only (the stretched and the 2 x 2 ones); the rest have four. */
const twoViews = (base: string): boolean => /-z\d+$|^c[xs]-|^low-/.test(base);
const SIGNS = ["sign-ring", "sign-rise", "sign-hex", "sign-tri", "sign-cubes"];
const letters = (set: string, make: (l: string) => string): string[] => set.split("").map(make);
const FACTORY = [...letters("abcefhij", (l) => `ind-${l}`), ...letters("klmnopqrst", (l) => `ind-${l}`)];
// Houses have terracotta or slate roofs (recoloured in Blender); the kit's own mint roof is not used.
const HOUSES = letters("abcdefghijklmnopqrstu", (l) => l).flatMap((l) => [`sub-${l}-brick`, `sub-${l}-slate`]);
/**
 * Buildings by height. Tier 0 is a shop or small office; tier 4 is a supertall. Stretched models (-z) are the same
 * buildings with more or fewer floors, so a skyline has a rhythm and no two streets repeat.
 */
const TIERS: readonly (readonly string[])[] = [
  [...letters("abcde", (l) => `com-${l}`), "low-n", ...letters("hijkpst", (l) => `ind-${l}`)],
  [...letters("fghijk", (l) => `com-${l}`), ...letters("abcde", (l) => `com-${l}-z150`)],
  [...letters("lmn", (l) => `com-${l}`), ...letters("fghijk", (l) => `com-${l}-z140`), ...letters("abcde", (l) => `sky-${l}-z70`), "low-wide-a", "low-wide-b"],
  [...letters("abcde", (l) => `sky-${l}`), ...letters("lmn", (l) => `com-${l}-z130`), ...letters("acdeghjkl", (l) => `low-${l}`)],
  [...letters("abcde", (l) => `sky-${l}-z135`), ...letters("abcde", (l) => `sky-${l}-z175`), ...letters("bfim", (l) => `low-${l}`)],
];
/**
 * Compound buildings assembled from kit pieces (see build_compound in render_city.py): how many of each kind are
 * rendered. "cx-" fills a 3 x 3 lot, "cs-" (the first three of each kind) the same complex in 2 x 2.
 */
const COMPOUNDS: Record<string, number> = { court: 6, podium: 8, wing: 6, solar: 6, yard: 4, towers: 4, terrace: 4, ring: 4, wave: 4, garden: 5 };
const compound = (kind: string, pick: (n: number) => number, small: boolean): string => {
  const n = small ? Math.min(3, COMPOUNDS[kind] as number) : (COMPOUNDS[kind] as number);
  return `${small ? "cs" : "cx"}-${kind}-${1 + pick(n)}`;
};
const CITY_TREES = ["tree_oak", "tree_default", "tree_pineTallA", "tree_pineRoundA", "plant_bushLarge", "tree_oak", "tree_default"];
const YARD_TREES = ["sub-tree-large", "sub-tree-small", "tree_oak", "tree_default", "plant_bushLarge", "sub-planter"];
const WILD_TREES = ["tree_oak", "tree_default", "tree_pineTallA", "tree_pineRoundA", "tree_pineTallA", "plant_bushLarge"];
const CROPS = ["crops_wheatStageB", "crops_cornStageD", "crops_leafsStageB", "crops_wheatStageA"];
const MEADOW = ["flower_redA", "flower_yellowB", "flower_purpleC", "flower_yellowB", "flower_purpleC"];
const STREET_BITS = ["light-square-double", "light-square-double", "traffic-light", "dumpster", "construction-cone"];
// (never the delivery van: that is the player's)
const CARS = ["car-sedan", "car-suv", "car-taxi", "car-police", "car-truck-flat", "car-sedan", "car-suv", "car-taxi"];
/** Only these may stand within CORRIDOR cells of the route, so the road is always readable. */
const CORRIDOR = 4;
/** Beside the road (two cells) only these stand: they are flat or knee-high, so they cannot hide the line. */
const FLAT = /^(plant_|flower_|crops_|stump_|light-|traffic-|dumpster|construction-|sub-planter)/;
/** How far up the screen a building of each height tier hides things, in (gx + gy) steps (its height in pixels over 24). */
const TIER_REACH: readonly number[] = [3, 4.5, 7.5, 11, 18];
const COMPOUND_REACH = 10;
const LOW = /^(tree_|plant_|rock_|sub-tree|sub-planter|flower_|stump_|log_|stone_large|fence_|crops_|light-|traffic-|dumpster|construction-)/;
const HAS_PAINT = /^(com-|sky-|ind-|sub-|low-|c[xs]-)/;
const FOLIAGE = /^(tree_|plant_|sub-tree|crops_)/;

interface Look {
  /** Models for the customer-group landmarks: each stands out from its surroundings. */
  readonly landmarks: readonly string[];
  readonly hq: string;
  readonly carRate: number;
  /** Added to a block's built-up intensity: downtown is dense everywhere, the suburbs nowhere. */
  readonly bias: number;
}
const LOOK: Record<Theme, Look> = {
  downtown: { landmarks: ["com-n", "com-m", "com-l", "com-j", "com-k"], hq: "sky-c", carRate: 0.1, bias: 0.3 },
  urban: { landmarks: ["com-n", "com-m", "com-l", "com-j", "com-k"], hq: "sky-c", carRate: 0.07, bias: 0.08 },
  suburban: { landmarks: ["com-l", "com-m", "ind-b", "com-k", "com-n"], hq: "com-n", carRate: 0.035, bias: -0.3 },
  rural: { landmarks: ["ind-b", "ind-e", "com-k", "ind-h", "ind-c"], hq: "com-l", carRate: 0.012, bias: -0.5 },
};

interface Block {
  readonly lx: number;
  readonly ly: number;
  readonly cx: number;
  readonly cy: number;
  /** Distance from the route to the middle of the block. */
  readonly d: number;
  /** How built-up the block is, 0 to 1. */
  readonly i: number;
}

/**
 * The city. Its theme sets what the blocks between the streets hold: a core of towers fading through mid-rise to
 * low streets downtown, houses and yards in a suburb, fields, woods and farms in the country. Districts are
 * coherent (a smooth field, see zones.ts), heights and materials vary building to building, and there are big
 * blocks, paved lots with parked cars, and tree-lined streets. A landmark with its own sign stands beside the
 * road for each customer group, and the HQ roundabout ends the route.
 */
export function buildCity(seed: number, route: Route, size: number, theme: Theme = "urban"): City {
  const rng = makeRng(seed + 202);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;
  const roads = new Map<string, number>();
  for (let gx = STREET_OFFSET; gx <= size - 4; gx++) for (let gy = STREET_OFFSET; gy <= size - 4; gy++) if (isStreet(gx, gy, size)) roads.set(k(gx, gy), -1);
  route.cells.forEach((c, i) => roads.set(k(c.gx, c.gy), i)); // the spokes' own cells get their index (0 or more); other streets are -1
  const taken = new Set<string>(roads.keys());
  const look = LOOK[theme];
  const view = (base: string): string => `${base}${pick(/^sub-[a-u]-(brick|slate)$/.test(base) ? VIEWS_OPPOSITE : twoViews(base) ? VIEWS2 : VIEWS4)}`;

  // Landmarks beside the road, each with a different building and sign.
  const landmarks: Landmark[] = [];
  const offset = Math.floor(rng() * 5);
  route.spokes.forEach((spoke, i) => {
    const e = spoke.dest;
    const hubSum = route.hub.gx + route.hub.gy;
    // The building stands just beyond the end of its road, to the side (off the street), on the side away from the home
    // and so never in front of its own road.
    // A road ends at a crossing, so the building takes one of the four corner blocks next to it: the one farthest
    // from home, and on the far side of the road in the screen sense (up-screen for roads that lead up, so it never
    // stands in front of its own road).
    const sides: Cell[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dx, dy]) => ({ gx: e.gx + (dx as number), gy: e.gy + (dy as number) })).filter((c) => !taken.has(k(c.gx, c.gy)));
    const up = e.gx + e.gy <= hubSum;
    const away = (c: Cell) => Math.abs(c.gx - route.hub.gx) + Math.abs(c.gy - route.hub.gy);
    sides.sort((p, q) => away(q) - away(p) || (up ? p.gx + p.gy - (q.gx + q.gy) : q.gx + q.gy - (p.gx + p.gy)));
    const home = (sides[0] ?? e) as Cell;
    taken.add(k(home.gx, home.gy));
    const along = [[home.gx - e.gx, 0], [0, home.gy - e.gy]];
    let signCell: Cell | null = null;
    for (const [dx, dy] of along as [number, number][]) {
      const cand = { gx: home.gx + dx, gy: home.gy + dy };
      if (!taken.has(k(cand.gx, cand.gy))) {
        signCell = cand;
        break;
      }
    }
    const sc = signCell ?? { gx: home.gx + 1, gy: home.gy + 1 };
    taken.add(k(sc.gx, sc.gy));
    landmarks.push({
      gx: home.gx,
      gy: home.gy,
      sprite: view(look.landmarks[(i + offset) % look.landmarks.length] as string),
      beside: i,
      sign: { gx: sc.gx, gy: sc.gy, sprite: SIGNS[(i + offset) % SIGNS.length] as string },
    });
  });

  const props: Prop[] = [];
  const cars: Prop[] = [];
  const pads: Cell[] = [];
  const routeDist = (gx: number, gy: number): number => {
    let d = 99;
    for (const c of route.cells) d = Math.min(d, Math.abs(c.gx - gx) + Math.abs(c.gy - gy));
    return d;
  };
  // Each block takes a few of the building materials, so a block has its own look and neighbours differ.
  let blockTints: number[] = [0];
  const tintFor = (sprite: string): number => {
    if (FOLIAGE.test(sprite)) return TINT_COUNT + Math.floor(rng() * FOLIAGE_TINTS);
    if (!HAS_PAINT.test(sprite) || rng() < 0.18) return 0;
    return pick(blockTints);
  };
  const add = (gx: number, gy: number, sprite: string): void => {
    const tint = tintFor(sprite);
    props.push(tint ? { gx, gy, sprite, tint } : { gx, gy, sprite });
  };
  const place = (gx: number, gy: number, sprite: string): void => {
    if (!sprite || taken.has(k(gx, gy))) return;
    const d = routeDist(gx, gy);
    if (d <= 2 && !FLAT.test(sprite)) return; // beside the road: only things that cannot hide the line
    if (d <= CORRIDOR && !LOW.test(sprite)) return;
    taken.add(k(gx, gy));
    add(gx, gy, sprite);
  };
  /** A building that fills n x n cells, centred between them. */
  /**
   * Would a sprite this tall, standing at this cell, hide part of the route? A sprite rises up the screen from its
   * base: `reach` is how many (gx + gy) steps up it covers. It hides a route cell that lies up-screen of it, in about
   * the same screen column.
   */
  const hidesRoute = (gx: number, gy: number, reach: number): boolean =>
    route.cells.some((c) => Math.abs(c.gx - c.gy - (gx - gy)) <= 1.6 && gx + gy - (c.gx + c.gy) > 0 && gx + gy - (c.gx + c.gy) <= reach + 1);
  const placeLot = (gx: number, gy: number, n: number, sprite: string): boolean => {
    const spots: [number, number][] = [];
    for (let dx = 0; dx < n; dx++) for (let dy = 0; dy < n; dy++) spots.push([gx + dx, gy + dy]);
    if (spots.some(([x, y]) => taken.has(k(x, y)) || routeDist(x, y) <= 7)) return false;
    if (hidesRoute(gx + (n - 1) / 2, gy + (n - 1) / 2, COMPOUND_REACH)) return false;
    for (const [x, y] of spots) taken.add(k(x, y));
    add(gx + (n - 1) / 2, gy + (n - 1) / 2, sprite);
    return true;
  };
  const rollN = (n: number): number => Math.floor(rng() * n);
  /** The kind of complex a district of this density holds. */
  const complexKind = (i: number): string => pick(i > 0.62 ? ["towers", "podium", "terrace", "wave", "court", "ring", "wave"] : i > 0.4 ? ["court", "wing", "podium", "terrace", "garden", "ring", "court"] : i > 0.25 ? ["solar", "court", "wing", "yard", "garden", "solar"] : ["solar", "yard", "yard", "solar", "garden"]);
  // Pick a model and a view of it, never the same building as one of the last several placed.
  const recent: string[] = [];
  const baseAt = new Map<string, string>();
  let cursor: [number, number] = [0, 0];
  /** The cells around a lot: a building never shares its model with one it touches. */
  const touching = (gx: number, gy: number): string[] => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => baseAt.get(k(gx + (dx as number), gy + (dy as number))) ?? "");
  const model = (pool: readonly string[]): string => {
    const window = Math.max(1, Math.min(8, pool.length - 2));
    const near = touching(cursor[0], cursor[1]);
    let base = "";
    for (let tries = 0; tries < 24; tries++) {
      base = pick(pool);
      if (!recent.slice(-window).includes(base) && !near.includes(base)) break;
    }
    recent.push(base);
    if (recent.length > 10) recent.shift();
    baseAt.set(k(cursor[0], cursor[1]), base);
    return view(base);
  };
  /** A building of about this height tier (a little either way), no taller than the route allows. */
  const tiered = (centre: number, spread: number, max: number): string => {
    let t = Math.max(0, Math.min(max, centre + Math.floor(rng() * (2 * spread + 1)) - spread));
    const [cx, cy] = cursor;
    // never so tall that it hides a stretch of the route: take a shorter one, or leave the cell empty
    while (t > 0 && hidesRoute(cx, cy, TIER_REACH[t] as number)) t--;
    if (hidesRoute(cx, cy, TIER_REACH[0] as number)) return "";
    return model(TIERS[t] as readonly string[]);
  };
  /** A crop tile only turns a quarter, so rows can run either way. */
  const crop = (base: string, quarter: boolean): string => (quarter ? `${base}-r90` : base);

  const cells = (b: Block, fn: (gx: number, gy: number, ring: boolean, r: number) => void): void => {
    for (let gx = b.lx + 1; gx <= b.lx + 5; gx++) for (let gy = b.ly + 1; gy <= b.ly + 5; gy++) { cursor = [gx, gy]; fn(gx, gy, gx === b.lx + 1 || gx === b.lx + 5 || gy === b.ly + 1 || gy === b.ly + 5, rng()); }
  };
  const grove = (b: Block, pool: readonly string[], density: number): void => cells(b, (gx, gy, _ring, r) => r < density && place(gx, gy, pick(pool)));
  /** A paved lot with a few cars parked on it. */
  const lot = (gx: number, gy: number): void => {
    if (taken.has(k(gx, gy)) || routeDist(gx, gy) <= 2) return;
    taken.add(k(gx, gy));
    pads.push({ gx, gy });
    if (rng() < 0.85) cars.push({ gx, gy, sprite: `${pick(CARS)}-${pick(["0", "90", "180", "270"])}` });
  };
  /** The tallest building the distance to the route allows: the road and the landmarks stay readable. */
  const maxTier = (d: number): number => (d <= CORRIDOR ? -1 : d <= 7 ? 0 : d <= 10 ? 1 : d <= 13 ? 2 : 4);

  /** A city block: tower core, mid-rise, low streets or a lot, by how built-up it is. */
  const cityBlock = (b: Block, roll: number): void => {
    if (roll < (theme === "downtown" ? 0.08 : 0.13) && b.d > 3) return grove(b, [...CITY_TREES, ...CITY_TREES, ...MEADOW.slice(0, 3)], 0.78); // park
    if (b.i < 0.3 && rng() < 0.3) {
      // factories and sheds on the quiet edge
      return cells(b, (gx, gy, ring, r) => {
        if (ring && r < 0.6) place(gx, gy, model(FACTORY));
        else if (gx === b.cx && gy === b.cy && r < 0.5) place(gx, gy, pick(["solar-group", "water-tower", "solar-group"]));
        else if (r < 0.25) place(gx, gy, pick(CITY_TREES));
      });
    }
    // a complex in the middle of the block: a courtyard campus, a podium with towers, a solar hall, a factory yard
    if (b.d > 9 && rng() < (b.i > 0.3 ? 0.62 : 0.4)) placeLot(b.cx - 1, b.cy - 1, 3, compound(complexKind(b.i), rollN, false));
    const centre = b.i > 0.7 ? 3.6 : b.i > 0.5 ? 2.6 : b.i > 0.3 ? 1.5 : 0.6;
    cells(b, (gx, gy, ring, r) => {
      const fill = ring ? 0.88 : b.i > 0.55 ? 0.8 : b.i > 0.3 ? 0.45 : 0.2;
      if (r < fill) return place(gx, gy, tiered(Math.round(centre + (ring ? -0.4 : 0.6)), 1, maxTier(routeDist(gx, gy))));
      const e = rng();
      if (ring && b.i < 0.55 && e < 0.12) lot(gx, gy);
      else if (e < 0.42) place(gx, gy, pick(CITY_TREES));
      else if (ring && e < 0.5) place(gx, gy, pick(STREET_BITS));
    });
  };

  const paint: Record<Theme, (b: Block, roll: number) => void> = {
    urban: cityBlock,
    downtown: cityBlock,
    suburban: (b, roll) => {
      const kind = roll < 0.12 ? "park" : roll < 0.24 && b.d > 5 ? "strip" : roll < 0.32 && b.d > 8 ? "woods" : roll < 0.4 && b.d > 6 ? "flats" : "houses";
      if (kind === "park") return grove(b, [...YARD_TREES, ...MEADOW.slice(0, 3)], 0.5);
      if (kind === "woods") return grove(b, WILD_TREES, 0.75);
      cells(b, (gx, gy, ring, r) => {
        if (kind === "strip") return void (ring ? r < 0.65 ? place(gx, gy, tiered(0, 1, 1)) : r < 0.78 && lot(gx, gy) : r < 0.3 && place(gx, gy, pick(YARD_TREES)));
        if (kind === "flats") return void (ring ? r < 0.7 && place(gx, gy, tiered(1, 1, 2)) : r < 0.35 && place(gx, gy, pick(YARD_TREES)));
        if (ring) return void (r < 0.78 && place(gx, gy, model(HOUSES)));
        if (r < 0.36) place(gx, gy, pick(YARD_TREES));
      });
    },
    rural: (b, roll) => {
      const kind = roll < 0.4 ? "field" : roll < 0.58 ? "woods" : roll < 0.72 ? "meadow" : roll < 0.9 ? "farm" : "hamlet";
      const quarter = rng() < 0.5;
      const field = pick(CROPS);
      if (kind === "woods") return grove(b, WILD_TREES, 0.8);
      if (kind === "meadow") return grove(b, [...MEADOW, ...WILD_TREES.slice(0, 2)], 0.45);
      cells(b, (gx, gy, ring, r) => {
        if (kind === "field") return void (r < 0.94 && place(gx, gy, crop(field, quarter)));
        if (kind === "farm") {
          if (gx === b.cx && gy === b.cy) return place(gx, gy, model(HOUSES));
          if (gx === b.cx + 1 && gy === b.cy) return place(gx, gy, "silo");
          if (gx === b.cx && gy === b.cy - 1) return place(gx, gy, "windmill");
          if (gx === b.cx - 1 && gy === b.cy) return place(gx, gy, pick(["car-tractor-0", "car-tractor-90", "car-tractor-180", "car-tractor-270"]));
          if (ring) return void (r < 0.7 && place(gx, gy, crop(field, quarter)));
          return void (r < 0.5 && place(gx, gy, pick(WILD_TREES)));
        }
        // hamlet: a few houses and a shop around a green
        if (ring) return void (r < 0.4 && place(gx, gy, r < 0.1 ? tiered(0, 0, 0) : model(HOUSES)));
        if (r < 0.4) place(gx, gy, pick(YARD_TREES));
      });
    },
  };

  // Districts: a core of density placed a few blocks from the middle of the route, so the road crosses several.
  const midCell = route.hub;
  const midBx = (midCell.gx - STREET_OFFSET) / STREET;
  const midBy = (midCell.gy - STREET_OFFSET) / STREET;
  const angle = rng() * Math.PI * 2;
  const coreX = midBx + Math.cos(angle) * 5;
  const coreY = midBy + Math.sin(angle) * 5;
  const blockPaint = paint[theme];
  for (let lx = STREET_OFFSET; lx + STREET <= size - 4; lx += STREET) {
    for (let ly = STREET_OFFSET; ly + STREET <= size - 4; ly += STREET) {
      const cx = lx + 3;
      const cy = ly + 3;
      const bx = (lx - STREET_OFFSET) / STREET;
      const by = (ly - STREET_OFFSET) / STREET;
      const i = Math.max(0, Math.min(1, intensity(seed, bx, by, coreX, coreY) + look.bias));
      // three or four of the building materials for this block (index 0 is the model as rendered)
      blockTints = [0, ...Array.from({ length: 3 }, () => 1 + Math.floor(rng() * (TINT_COUNT - 1)))];
      blockPaint({ lx, ly, cx, cy, d: routeDist(cx, cy), i }, rng());
    }
  }

  // Roundabouts: a few intersections away from the route. A street through one is left empty (cars would drive over the island).
  const circles: Cell[] = [];
  for (const [rk, idx] of roads) {
    const [gx, gy] = rk.split(",").map(Number) as [number, number];
    if (idx === -1 && isCrossing(gx, gy) && routeDist(gx, gy) > 3 && rng() < 0.03) circles.push({ gx, gy });
  }

  // Traffic: in each of the two lanes of every cross street, cars with gaps between them, all at one speed and
  // in the places SLOTS allow, so no two cars on crossing streets ever meet.
  // A street the route runs along is left empty, so the delivery van has its road to itself.
  const routeLines = new Set<string>();
  for (const c of route.cells) {
    if ((c.gy - STREET_OFFSET) % STREET === 0) routeLines.add(`x:${c.gy}`);
    if ((c.gx - STREET_OFFSET) % STREET === 0) routeLines.add(`y:${c.gx}`);
  }
  for (const c of circles) {
    routeLines.add(`x:${c.gy}`);
    routeLines.add(`y:${c.gx}`);
  }
  const traffic: Vehicle[] = [];
  const speed = Math.round((0.8 + rng() * 0.3) * 100) / 100;
  const blocks = Math.floor((size - 7) / STREET);
  const density = Math.min(0.9, 0.2 + look.carRate * 4);
  for (const axis of ["x", "y"] as const) {
    for (let line = STREET_OFFSET; line <= size - 4; line += STREET) {
      if (routeLines.has(`${axis}:${line}`)) continue;
      for (const dir of [-1, 1] as const) {
        const heading = axis === "x" ? (dir === -1 ? "270" : "90") : dir === -1 ? "180" : "0";
        for (let k = 0; k < blocks; k++) {
          for (const slot of SLOTS[axis]) {
            if (rng() > density) continue;
            traffic.push({ sprite: `${pick(CARS)}-${heading}`, axis, line, start: STREET_OFFSET + k * STREET + slot, dir, speed });
          }
        }
      }
    }
  }

  const hq = route.hub;
  return { theme, roads, props, cars, traffic, pads, circles, landmarks, hq, hqSprite: look.hq };
}

export interface Plate {
  readonly key: string;
  readonly index: number | null;
  readonly hq: boolean;
  readonly name: string;
  readonly x: number;
  readonly top: number;
  /** The plate's measured width in px, when known (otherwise it is estimated from the text length). */
  readonly width?: number;
  /** A plate that hangs below its anchor (pointing up at it) instead of standing above it. It never moves. */
  readonly below?: boolean;
}
/**
 * Lay out the name plates so none covers another plate or another plate's pointer, and none rides up under the HUD.
 * `top` is the anchor: the tip of the plate's pointer, on its building. The plate stands above it (the CSS draws the
 * pointer, then any stem, then the plate, upward from the anchor). A plate prefers to stay put, then slide a little
 * sideways (its pointer stays on its building), then rise on a stem (`dy`); the cheapest free spot wins.
 * `minTop` is the highest a plate may reach (just below the HUD).
 */
export function spreadPlates(items: readonly Plate[], screenW: number, minTop = 0, compact = false, maxBottom = Infinity): (Plate & { dx: number; dy: number; flip: boolean })[] {
  // measured: bold 16 px type with 24 px of side padding (16 in the compact screen, whose badges are smaller)
  const widthOf = (p: Plate): number => p.width ?? Math.max(compact ? 32 : 40, p.name.length * 8.8 + (compact ? 22 : 30));
  const height = compact ? 26 : 30; // 20 px of line plus the padding and the outline above and below
  const pin = 7;
  // A building so near the HUD that its plate would rise under it: the pointer lands lower, on the roof.
  const plates = items.map((item) => (item.below ? item : { ...item, top: Math.max(item.top, minTop + height + pin) }));
  const pos = plates.map(() => ({ dx: 0, dy: 0, flip: false }));
  const box = (i: number, dx: number, dy: number, flip: boolean) => {
    const p = plates[i] as Plate;
    const half = widthOf(p) / 2;
    if (p.below) return { l: p.x - half, r: p.x + half, t: p.top + pin, b: p.top + pin + height, px: p.x, anchor: p.top };
    // flipped: the plate hangs below its building and points up at it, like the company's
    if (flip) return { l: p.x + dx - half, r: p.x + dx + half, t: p.top + pin + dy, b: p.top + pin + dy + height, px: p.x, anchor: p.top };
    const bottom = p.top - pin - dy;
    return { l: p.x + dx - half, r: p.x + dx + half, t: bottom - height, b: bottom, px: p.x, anchor: p.top };
  };
  // How many plates and pointers a spot collides with, plus how far it moves: cheapest wins, zero collisions is free.
  const costAt = (i: number, dx: number, dy: number, flip: boolean): number => {
    const me = box(i, dx, dy, flip);
    if (me.l < 8 || me.r > screenW - 8) return Infinity;
    if (me.t < minTop) return Infinity; // never under the HUD
    if (flip && me.b > maxBottom) return Infinity; // nor, hanging below its building, under the panel
    let hits = 0;
    plates.forEach((_, j) => {
      if (j === i) return;
      const o = pos[j] as { dx: number; dy: number; flip: boolean };
      const q = box(j, o.dx, o.dy, o.flip);
      const plateHitsPlate = me.r + 4 > q.l && me.l - 4 < q.r && me.t - 2 < q.b && me.b + 2 > q.t;
      const plateHitsLine = q.px > me.l - 4 && q.px < me.r + 4 && q.anchor > me.t - 2 && q.b < me.b + 2;
      const lineHitsPlate = me.px > q.l - 4 && me.px < q.r + 4 && me.anchor > q.t - 2 && me.b < q.b + 2;
      // two plates on top of each other is the worst; a pointer crossing a plate is bad but readable
      if (plateHitsPlate) hits += 20;
      else if (plateHitsLine || lineHitsPlate) hits++;
    });
    return hits * 10000 + Math.abs(dx) + dy * 1.4 + (flip ? 30 : 0);
  };
  // Re-place each plate against all the others, a few passes, until nothing moves: an early choice can be undone.
  // A crowded map can trap one order in a bad corner, so a few orders are tried and the best layout is kept.
  const solve = (order: number[]): number => {
    for (let pass = 0; pass < 6; pass++) {
      let moved = false;
      for (const i of order) {
        if ((plates[i] as Plate).below) continue; // fixed in place
        const cur0 = pos[i] as { dx: number; dy: number; flip: boolean };
        let best = { dx: cur0.dx, dy: cur0.dy, flip: cur0.flip, cost: costAt(i, cur0.dx, cur0.dy, cur0.flip) };
        for (const flip of [false, true]) {
          // a plate can rise (or hang lower) in small steps: a 34 px step can miss the one free gap by a hair
          for (let lift = 0; lift < 40; lift++) {
            const dy = lift * 6;
            for (let step = 0; step < 48; step++) {
              for (const sign of step === 0 ? [1] : [1, -1]) {
                const dx = sign * step * 8;
                const c = costAt(i, dx, dy, flip);
                if (c < best.cost - 0.001) best = { dx, dy, flip, cost: c };
              }
            }
          }
        }
        if (best.dx !== cur0.dx || best.dy !== cur0.dy || best.flip !== cur0.flip) {
          pos[i] = { dx: best.dx, dy: best.dy, flip: best.flip };
          moved = true;
        }
      }
      if (!moved) break;
    }
    return plates.reduce((sum, _p, i) => sum + Math.floor(costAt(i, (pos[i] as { dx: number }).dx, (pos[i] as { dy: number }).dy, (pos[i] as { flip: boolean }).flip) / 10000), 0);
  };
  const idx = plates.map((_, i) => i);
  const orders = [idx.slice().sort((x, y) => (plates[x] as Plate).top - (plates[y] as Plate).top), idx.slice().sort((x, y) => (plates[y] as Plate).top - (plates[x] as Plate).top), idx.slice().sort((x, y) => (plates[x] as Plate).x - (plates[y] as Plate).x), idx.slice().sort((x, y) => widthOf(plates[y] as Plate) - widthOf(plates[x] as Plate))];
  let bestLayout = pos.map((q) => ({ ...q }));
  let bestHits = Infinity;
  for (const order of orders) {
    pos.forEach((_q, i) => (pos[i] = { dx: 0, dy: 0, flip: false }));
    const hits = solve(order);
    if (hits < bestHits) {
      bestHits = hits;
      bestLayout = pos.map((q) => ({ ...q }));
    }
    if (hits === 0) break;
  }
  bestLayout.forEach((q, i) => (pos[i] = q));
  return plates.map((p, i) => ({ ...p, dx: (pos[i] as { dx: number }).dx, dy: (pos[i] as { dy: number }).dy, flip: (pos[i] as { flip: boolean }).flip }));
}

/**
 * The size of the city grid: big enough that the streets run past every edge of the screen, whatever the shape of
 * the window (a phone, a desktop, an ultrawide). Cells on screen scale with the window over the tile width.
 */
export function gridFor(w: number, h: number, tw: number): number {
  const halfX = w / tw; // half the screen width in (gx - gy) units
  const halfY = (h * 2) / tw; // half the screen height in (gx + gy) units
  const reach = (halfX + halfY) / 2 + 16; // cells from the middle of the city to the farthest corner, plus the route's offset
  return Math.min(240, Math.max(108, 2 * Math.ceil(reach)));
}

/** Which rendered road sprite fits a neighbour mask. The rotation numbers match the renders in render_city.py. */
export function roadSprite(mask: number): string {
  const has = (d: number) => (mask & d) !== 0;
  const n = [DIR.UL, DIR.UR, DIR.DR, DIR.DL].filter(has).length;
  if (n === 4) return "road-crossroad";
  if (n === 3) {
    // a T: the missing side decides the rotation
    if (!has(DIR.UL)) return ROAD_T.UL_MISSING;
    if (!has(DIR.UR)) return ROAD_T.UR_MISSING;
    if (!has(DIR.DR)) return ROAD_T.DR_MISSING;
    return ROAD_T.DL_MISSING;
  }
  if (n === 2) {
    if (has(DIR.UL) && has(DIR.DR)) return ROAD_STRAIGHT.ulDr;
    if (has(DIR.UR) && has(DIR.DL)) return ROAD_STRAIGHT.urDl;
    if (has(DIR.UL) && has(DIR.UR)) return ROAD_BEND.ulUr;
    if (has(DIR.UR) && has(DIR.DR)) return ROAD_BEND.urDr;
    if (has(DIR.DR) && has(DIR.DL)) return ROAD_BEND.drDl;
    return ROAD_BEND.dlUl;
  }
  if (n === 1) return has(DIR.UL) || has(DIR.DR) ? ROAD_STRAIGHT.ulDr : ROAD_STRAIGHT.urDl; // dead ends use a straight tile
  return ROAD_STRAIGHT.ulDr;
}

// Calibrated against the rendered sprites (a white curb on an edge means that side is closed).
const ROAD_STRAIGHT = { ulDr: "road-straight-0", urDl: "road-straight-90" };
const ROAD_BEND = { ulUr: "road-bend-270", urDr: "road-bend-180", drDl: "road-bend-90", dlUl: "road-bend-0" };
const ROAD_T = { UL_MISSING: "road-intersection-90", UR_MISSING: "road-intersection-0", DR_MISSING: "road-intersection-270", DL_MISSING: "road-intersection-180" };

/** Every sprite roadSprite can name. */
export const ROAD_SPRITES: readonly string[] = [
  ...Object.values(ROAD_STRAIGHT),
  ...Object.values(ROAD_BEND),
  ...Object.values(ROAD_T),
  "road-crossroad",
];
