// Isometric placement for the campus: projection, the route as a road, road-tile selection and a seeded city.
// Presentation only: it never touches the sim and never affects a run. A cell is (gx, gy). Moving +gx goes down and
// to the right on screen, +gy goes down and to the left (a 2:1 diamond grid).
import { makeRng } from "./geometry";

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

export interface Waypoint {
  /** Index into the route's cells. */
  readonly at: number;
}
export interface Route {
  readonly cells: readonly Cell[];
  readonly waypoints: readonly Waypoint[];
}

const k = (gx: number, gy: number): string => `${gx},${gy}`;

/** Streets run along every sixth line, so the city is blocks of 5 x 5 cells between them. */
export const STREET = 6;
export const STREET_OFFSET = 3;
export const isStreet = (gx: number, gy: number, size: number): boolean =>
  gx >= STREET_OFFSET && gy >= STREET_OFFSET && gx <= size - 4 && gy <= size - 4 && ((gx - STREET_OFFSET) % STREET === 0 || (gy - STREET_OFFSET) % STREET === 0);

/**
 * The route follows the street grid in three straight runs, turning only at intersections, and climbs the screen
 * to the HQ at the last intersection. The seed picks which way the first run goes.
 */
export function buildRoute(n: number, seed: number, size: number): Route {
  const rng = makeRng(seed + 101);
  // Start two blocks in from the edge of the grid, so the city continues in every direction around the route.
  const start = STREET_OFFSET + STREET * (Math.floor((size - 4 - STREET_OFFSET) / STREET) - 2);
  const firstAlongX = rng() < 0.5;
  const cells: Cell[] = [{ gx: start, gy: start }];
  let gx = start;
  let gy = start;
  for (let run = 0; run < 3; run++) {
    const alongX = (run % 2 === 0) === firstAlongX;
    for (let i = 0; i < STREET; i++) {
      if (alongX) gx -= 1;
      else gy -= 1;
      cells.push({ gx, gy });
    }
  }
  const last = cells.length - 1;
  const waypoints: Waypoint[] = [];
  for (let i = 0; i < n; i++) {
    let at = Math.round(((i + 1) * last) / (n + 1));
    if (at % STREET === 0) at += 1; // not on a turn
    waypoints.push({ at });
  }
  return { cells, waypoints };
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
}
export interface Landmark extends Cell {
  readonly sprite: string;
  /** The route cell this building sits beside. */
  readonly beside: number;
  /** A standing sign with an abstract mark, next to the building. */
  readonly sign: Prop;
}
export interface City {
  /** Street cells: key "gx,gy" to the route index (or -1 for a cross street). */
  readonly roads: ReadonlyMap<string, number>;
  readonly props: readonly Prop[];
  readonly landmarks: readonly Landmark[];
  /** The cell of the HQ roundabout at the end of the route. */
  readonly hq: Cell;
}

const ROTATIONS = ["", "-r90", "-r180", "-r270"];
const TOWERS = ["sky-a", "sky-b", "sky-c", "sky-d", "sky-e"];
/** Customer-group landmarks: tall enough to stand out, low enough that their name plate stays on screen. */
const LANDMARK_MODELS = ["com-n", "com-m", "com-l", "com-j", "com-k"];
const SIGNS = ["sign-ring", "sign-rise", "sign-hex", "sign-tri", "sign-cubes"];
const LOWRISE = "abcdefg".split("").map((l) => `com-${l}`);
const MIDRISE = "hijklmn".split("").map((l) => `com-${l}`);
const FACTORY = "abcefhij".split("").map((l) => `ind-${l}`);
const TREES = ["tree_oak", "tree_default", "tree_pineTallA", "tree_pineRoundA", "plant_bushLarge"];

/**
 * The campus. Blocks between the streets have a character: low-rise and parks beside the route, mid-rise and
 * factories farther out, towers at the edge of town. A landmark with its own sign stands beside the road for each
 * customer group, and the HQ roundabout ends the route.
 */
export function buildCity(seed: number, route: Route, size: number): City {
  const rng = makeRng(seed + 202);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;
  const roads = new Map<string, number>();
  for (let gx = STREET_OFFSET; gx <= size - 4; gx++) for (let gy = STREET_OFFSET; gy <= size - 4; gy++) if (isStreet(gx, gy, size)) roads.set(k(gx, gy), -1);
  route.cells.forEach((c, i) => roads.set(k(c.gx, c.gy), i));
  const taken = new Set<string>(roads.keys());

  // Landmarks beside the road, each with a different tower and sign.
  const landmarks: Landmark[] = [];
  const offset = Math.floor(rng() * 5);
  route.waypoints.forEach((wp, i) => {
    const c = route.cells[wp.at] as Cell;
    const prev = route.cells[wp.at - 1] as Cell;
    const alongX = prev.gx !== c.gx;
    // Landmarks stand on the far side of the road (up the screen), so they never hide the road behind them.
    const sideSign = -1;
    const side: Cell = alongX ? { gx: c.gx, gy: c.gy + sideSign } : { gx: c.gx + sideSign, gy: c.gy };
    const other: Cell = alongX ? { gx: c.gx, gy: c.gy - sideSign } : { gx: c.gx - sideSign, gy: c.gy };
    const home = taken.has(k(side.gx, side.gy)) ? other : side;
    taken.add(k(home.gx, home.gy));
    const along = alongX ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
    let signCell: Cell | null = null;
    for (const [dx, dy] of along as [number, number][]) {
      const cand = { gx: home.gx + dx, gy: home.gy + dy };
      if (!taken.has(k(cand.gx, cand.gy))) {
        signCell = cand;
        break;
      }
    }
    const sc = signCell ?? { gx: home.gx + (alongX ? 0 : 1), gy: home.gy + (alongX ? 1 : 0) };
    taken.add(k(sc.gx, sc.gy));
    landmarks.push({
      gx: home.gx,
      gy: home.gy,
      sprite: `${LANDMARK_MODELS[(i + offset) % LANDMARK_MODELS.length]}${pick(ROTATIONS)}`,
      beside: wp.at,
      sign: { gx: sc.gx, gy: sc.gy, sprite: SIGNS[(i + offset) % SIGNS.length] as string },
    });
  });

  const props: Prop[] = [];
  const place = (gx: number, gy: number, sprite: string) => {
    if (taken.has(k(gx, gy))) return;
    taken.add(k(gx, gy));
    props.push({ gx, gy, sprite });
  };
  const routeDist = (gx: number, gy: number): number => {
    let d = 99;
    for (const c of route.cells) d = Math.min(d, Math.abs(c.gx - gx) + Math.abs(c.gy - gy));
    return d;
  };
  let last = "";
  const model = (pool: readonly string[]): string => {
    let name = "";
    for (let tries = 0; tries < 6; tries++) {
      name = `${pick(pool)}${pick(ROTATIONS)}`;
      if (name !== last) break;
    }
    last = name;
    return name;
  };

  for (let lx = STREET_OFFSET; lx + STREET <= size - 4; lx += STREET) {
    for (let ly = STREET_OFFSET; ly + STREET <= size - 4; ly += STREET) {
      const cx = lx + 3;
      const cy = ly + 3;
      const d = routeDist(cx, cy);
      const roll = rng();
      const kind = d <= 4 ? (roll < 0.35 ? "park" : "lowrise") : d <= 11 ? (roll < 0.2 ? "park" : roll < 0.38 ? "factory" : "midrise") : roll < 0.2 ? "factory" : "towers";
      for (let gx = lx + 1; gx <= lx + 5; gx++) {
        for (let gy = ly + 1; gy <= ly + 5; gy++) {
          const ring = gx === lx + 1 || gx === lx + 5 || gy === ly + 1 || gy === ly + 5;
          const r = rng();
          if (routeDist(gx, gy) <= 2) {
            // The route corridor: lawn and a few trees, so the road is always readable.
            if (r < 0.3) place(gx, gy, pick(TREES));
          } else if (kind === "park") {
            if (r < 0.4) place(gx, gy, pick(TREES));
          } else if (ring) {
            if (r < 0.72) place(gx, gy, kind === "lowrise" ? model(LOWRISE) : kind === "midrise" ? model(MIDRISE) : kind === "factory" ? model(FACTORY) : model([...MIDRISE, ...TOWERS]));
          } else if (kind === "factory" && gx === cx && gy === cy) {
            place(gx, gy, "solar-group");
          } else if (kind === "towers" && gx === cx && gy === cy) {
            place(gx, gy, model(TOWERS));
          } else if (r < 0.4) place(gx, gy, pick(TREES));
        }
      }
    }
  }
  const hq = route.cells[route.cells.length - 1] as Cell;
  return { roads, props, landmarks, hq };
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
