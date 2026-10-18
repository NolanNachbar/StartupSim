import { describe, expect, it } from "vitest";
import { buildCity, buildRoute, DIR, project, roadMask, roadSprite, unproject, type Cell } from "./iso";

const key = (c: Cell) => `${c.gx},${c.gy}`;

describe("isometric projection", () => {
  it("round-trips a cell through screen space", () => {
    for (const c of [{ gx: 0, gy: 0 }, { gx: 5, gy: 2 }, { gx: 3, gy: 9 }]) {
      const p = project(c, 64, { x: 100, y: 50 });
      expect(unproject(p, 64, { x: 100, y: 50 })).toEqual(c);
    }
  });

  it("puts the next cell down-right in x and down in y, a 2:1 diamond", () => {
    const a = project({ gx: 0, gy: 0 }, 64, { x: 0, y: 0 });
    const b = project({ gx: 1, gy: 0 }, 64, { x: 0, y: 0 });
    expect(b.x - a.x).toBe(32);
    expect(b.y - a.y).toBe(16);
    const c = project({ gx: 0, gy: 1 }, 64, { x: 0, y: 0 });
    expect(c.x - a.x).toBe(-32);
    expect(c.y - a.y).toBe(16);
  });
});

const onStreet = (c: Cell) => (c.gx - 3) % 6 === 0 || (c.gy - 3) % 6 === 0;

describe("the route", () => {
  const route = buildRoute(3, 11, 40);
  it("is a connected road that climbs the screen", () => {
    for (let i = 1; i < route.cells.length; i++) {
      const a = route.cells[i - 1]!;
      const b = route.cells[i]!;
      expect(Math.abs(a.gx - b.gx) + Math.abs(a.gy - b.gy)).toBe(1);
      expect(b.gx + b.gy).toBeLessThan(a.gx + a.gy);
    }
  });

  it("follows the street grid and turns only at intersections", () => {
    for (const c of route.cells) expect(onStreet(c)).toBe(true);
    for (let i = 1; i < route.cells.length - 1; i++) {
      const a = route.cells[i - 1]!;
      const b = route.cells[i]!;
      const c = route.cells[i + 1]!;
      const turns = b.gx - a.gx !== c.gx - b.gx || b.gy - a.gy !== c.gy - b.gy;
      if (turns) expect((b.gx - 3) % 6 === 0 && (b.gy - 3) % 6 === 0).toBe(true);
    }
  });

  it("makes three straight runs, so it reads as a plan and not a wander", () => {
    let turns = 0;
    for (let i = 1; i < route.cells.length - 1; i++) {
      const a = route.cells[i - 1]!;
      const b = route.cells[i]!;
      const c = route.cells[i + 1]!;
      if (b.gx - a.gx !== c.gx - b.gx || b.gy - a.gy !== c.gy - b.gy) turns += 1;
    }
    expect(turns).toBe(2);
  });

  it("stays inside the grid and never doubles back", () => {
    const seen = new Set<string>();
    for (const c of route.cells) {
      expect(c.gx).toBeGreaterThanOrEqual(3);
      expect(c.gy).toBeGreaterThanOrEqual(3);
      expect(c.gx).toBeLessThan(37);
      expect(c.gy).toBeLessThan(37);
      expect(seen.has(key(c))).toBe(false);
      seen.add(key(c));
    }
  });

  it("has one waypoint per hypothesis, in order along the road, away from both ends", () => {
    for (const n of [3, 4, 5]) {
      const r = buildRoute(n, 11, 40);
      expect(r.waypoints.length).toBe(n);
      const idx = r.waypoints.map((w) => w.at);
      expect([...idx].sort((x, y) => x - y)).toEqual(idx);
      expect(idx[0]).toBeGreaterThan(1);
      expect(idx[n - 1]).toBeLessThan(r.cells.length - 2);
      expect(new Set(idx).size).toBe(n);
    }
  });

  it("is the same for the same seed and can differ for another", () => {
    expect(buildRoute(3, 11, 40)).toEqual(buildRoute(3, 11, 40));
    const starts = new Set([1, 2, 3, 4, 5, 6].map((sd) => buildRoute(3, sd, 40).cells[1]!.gx - buildRoute(3, sd, 40).cells[0]!.gx));
    expect(starts.size).toBe(2);
  });
});

describe("roads", () => {
  it("reads which neighbours a road cell connects to", () => {
    const cells = new Set(["5,5", "6,5", "5,4"]);
    expect(roadMask(cells, { gx: 5, gy: 5 })).toBe(DIR.DR | DIR.UR);
    expect(roadMask(cells, { gx: 6, gy: 5 })).toBe(DIR.UL);
  });
});

describe("a larger city", () => {
  it("builds the same kind of route and city at the size the game uses", () => {
    const route = buildRoute(4, 5, 60);
    const city = buildCity(5, route, 60);
    for (const c of route.cells) expect(city.roads.has(`${c.gx},${c.gy}`)).toBe(true);
    expect(city.landmarks.length).toBe(4);
    expect(city.props.length).toBeGreaterThan(300);
  });
});

describe("road tiles", () => {
  it("lays straights along the screen axes and never names an unrendered tile", () => {
    expect(roadSprite(DIR.UL | DIR.DR)).toBe("road-straight-0");
    expect(roadSprite(DIR.UR | DIR.DL)).toBe("road-straight-90");
    expect(roadSprite(DIR.UL)).toBe("road-straight-0");
    expect(roadSprite(DIR.DL)).toBe("road-straight-90");
    expect(roadSprite(15)).toBe("road-crossroad");
  });

  it("picks the bend that joins the two connected edges", () => {
    expect(roadSprite(DIR.UL | DIR.UR)).toBe("road-bend-270");
    expect(roadSprite(DIR.UR | DIR.DR)).toBe("road-bend-180");
    expect(roadSprite(DIR.DR | DIR.DL)).toBe("road-bend-90");
    expect(roadSprite(DIR.DL | DIR.UL)).toBe("road-bend-0");
  });

  it("picks the T whose closed side is the missing neighbour", () => {
    expect(roadSprite(15 & ~DIR.UR)).toBe("road-intersection-0");
    expect(roadSprite(15 & ~DIR.UL)).toBe("road-intersection-90");
    expect(roadSprite(15 & ~DIR.DL)).toBe("road-intersection-180");
    expect(roadSprite(15 & ~DIR.DR)).toBe("road-intersection-270");
  });
});

describe("the route stays readable", () => {
  it("keeps tall buildings out of the corridor beside the route", () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      const route = buildRoute(4, seed, 40);
      const city = buildCity(seed, route, 40);
      const landmarks = new Set(city.landmarks.flatMap((l) => [key(l), key(l.sign)]));
      for (const p of city.props) {
        if (landmarks.has(key(p))) continue;
        const d = Math.min(...route.cells.map((c) => Math.abs(c.gx - p.gx) + Math.abs(c.gy - p.gy)));
        if (d <= 2) expect(p.sprite).toMatch(/^(tree_|plant_|rock_)/);
      }
    }
  });

  it("puts every landmark on the far side of the road", () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      const route = buildRoute(5, seed, 40);
      const city = buildCity(seed, route, 40);
      for (const l of city.landmarks) {
        const c = route.cells[l.beside]!;
        expect(l.gx + l.gy).toBeLessThan(c.gx + c.gy);
      }
    }
  });
});

describe("the city", () => {
  const route = buildRoute(4, 7, 40);
  const city = buildCity(7, route, 40);
  const road = new Set(city.roads.keys());

  it("lays the full street grid, with the route among it", () => {
    for (const c of route.cells) expect(road.has(key(c))).toBe(true);
    expect(road.size).toBeGreaterThan(route.cells.length * 3);
    for (const rk of road) {
      const [gx, gy] = rk.split(",").map(Number) as [number, number];
      expect(onStreet({ gx, gy })).toBe(true);
    }
  });

  it("never puts a building on a road", () => {
    for (const p of city.props) expect(road.has(`${p.gx},${p.gy}`)).toBe(false);
    for (const l of city.landmarks) expect(road.has(`${l.gx},${l.gy}`)).toBe(false);
  });

  it("puts a landmark with its own sign beside the road for every waypoint", () => {
    expect(city.landmarks.length).toBe(4);
    const signs = new Set(city.landmarks.map((l) => l.sign.sprite));
    expect(signs.size).toBe(4);
    for (const l of city.landmarks) {
      const near = [DIR_STEP.UL, DIR_STEP.UR, DIR_STEP.DR, DIR_STEP.DL].some(([dx, dy]) => road.has(`${l.gx + dx},${l.gy + dy}`));
      expect(near).toBe(true);
      expect(road.has(`${l.sign.gx},${l.sign.gy}`)).toBe(false);
    }
  });

  it("keeps buildings low next to the route and taller farther away", () => {
    const heightOf = (s: string) => (s.startsWith("sky") ? 3 : s.startsWith("com-n") || s.startsWith("com-m") || s.startsWith("com-l") ? 2 : 1);
    const dist = (p: { gx: number; gy: number }) => Math.min(...route.cells.map((c) => Math.abs(c.gx - p.gx) + Math.abs(c.gy - p.gy)));
    const landmarkCells = new Set(city.landmarks.map((l) => key(l)));
    const near = city.props.filter((p) => p.sprite.match(/^(com|sky|ind)/) && !landmarkCells.has(key(p)) && dist(p) <= 3);
    for (const p of near) expect(heightOf(p.sprite)).toBeLessThan(3);
  });

  it("varies the buildings: no model repeats more than a few times in a row", () => {
    const names = [...city.props].filter((p) => p.sprite.match(/^(com|sky|ind)/)).sort((a, b) => a.gx - b.gx || a.gy - b.gy).map((p) => p.sprite);
    let worst = 1;
    let run = 1;
    for (let i = 1; i < names.length; i++) {
      run = names[i] === names[i - 1] ? run + 1 : 1;
      worst = Math.max(worst, run);
    }
    expect(worst).toBeLessThanOrEqual(2);
    expect(new Set(names).size).toBeGreaterThan(18);
  });

  it("is deterministic", () => {
    expect(buildCity(7, route, 40)).toEqual(city);
  });

  it("only names sprites that the build step renders", () => {
    const rot = "(-r(90|180|270))?";
    const allowed = new RegExp(`^((com-[a-n]|sky-[a-e]|ind-[abcefhij])${rot}|water-tower|solar-group|tree_oak|tree_default|tree_pineTallA|tree_pineRoundA|plant_bushLarge|rock_largeA|sign-(ring|rise|hex|tri|cubes))$`);
    for (const p of city.props) expect(p.sprite).toMatch(allowed);
    for (const l of city.landmarks) {
      expect(l.sprite).toMatch(allowed);
      expect(l.sign.sprite).toMatch(allowed);
    }
  });
});

const DIR_STEP = { UL: [-1, 0], UR: [0, -1], DR: [1, 0], DL: [0, 1] } as const;
