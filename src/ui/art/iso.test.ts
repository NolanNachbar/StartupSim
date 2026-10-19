import { describe, expect, it } from "vitest";
import manifest from "../../../public/art/city/manifest.json";
import { buildCity, buildRoute, DIR, project, roadMask, roadSprite, gridFor, spreadPlates, themeFor, unproject, type Cell, type Theme } from "./iso";

const key = (c: Cell) => `${c.gx},${c.gy}`;

/** Every sprite family the city may name, spelled out, so a typo or a stray model fails (not only a missing file). */
const view = "(-r(90|180|270))?";
const ALLOWED = new RegExp(
  "^(" +
    `((com-[a-n]|sky-[a-e]|ind-[a-t]|sub-[a-u](-brick|-slate)?|low-([a-n]|wide-[ab])|c[xs]-(court|podium|wing|solar|yard|towers|terrace)-\\d+)(-z\\d+)?${view})` +
    "|water-tower|solar-group|silo|windmill|plant_bushLarge|tree_(oak|default|pineTallA|pineRoundA)|sub-tree-(large|small)|sub-planter" +
    "|flower_(redA|yellowB|purpleC)|crops_(wheatStageA|wheatStageB|cornStageD|leafsStageB)(-r90)?" +
    "|car-(sedan|suv|taxi|van|police|truck-flat)-(0|90|180|270)|car-tractor-(0|90|180|270)" +
    "|light-square-double|traffic-light|dumpster|construction-cone|sign-(ring|rise|hex|tri|cubes)" +
  ")$",
);

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
        if (d <= 3) expect(p.sprite).toMatch(/^(tree_|plant_|rock_|sub-tree|sub-planter|flower_|stump_|log_|stone_large|fence_|crops_|light-|traffic-|dumpster|construction-)/);
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

  it("keeps buildings low next to the route: only shops and small offices within six cells", () => {
    const dist = (p: { gx: number; gy: number }) => Math.min(...route.cells.map((c) => Math.abs(c.gx - p.gx) + Math.abs(c.gy - p.gy)));
    const landmarkCells = new Set(city.landmarks.map((l) => key(l)));
    const smallOnly = /^(com-[a-e]|low-n|ind-[a-t]|sub-[a-u](-brick|-slate)?|solar-group|water-tower)(-r\d+)?$/;
    for (const p of city.props) {
      if (!/^(com|sky|ind|low|cx|cs)-/.test(p.sprite) || landmarkCells.has(key(p))) continue;
      if (dist(p) <= 6) expect(p.sprite, `${p.sprite} at ${key(p)}`).toMatch(smallOnly);
    }
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

  it("only names sprites that have been rendered", () => {
    const rendered = new Set(Object.keys(manifest));
    for (const p of city.props) {
      expect(p.sprite).toMatch(ALLOWED);
      expect(rendered.has(p.sprite)).toBe(true);
    }
    for (const l of city.landmarks) {
      expect(l.sprite).toMatch(ALLOWED);
      expect(l.sign.sprite).toMatch(ALLOWED);
      expect(rendered.has(l.sprite)).toBe(true);
      expect(rendered.has(l.sign.sprite)).toBe(true);
    }
  });
});

const THEMES: readonly Theme[] = ["rural", "suburban", "urban", "downtown"];
describe("themes", () => {
  it("gives every industry a setting, and the unknown a city", () => {
    expect([0, 1, 2, 3, 4, 5].map(themeFor)).toEqual(["rural", "urban", "downtown", "suburban", "downtown", "suburban"]);
    expect(themeFor(null)).toBe("urban");
    expect(new Set([0, 1, 2, 3, 4, 5].map(themeFor)).size).toBe(4);
  });

  for (const theme of THEMES) {
    describe(theme, () => {
      const route = buildRoute(4, 9, 108);
      const city = buildCity(9, route, 108, theme);
      const road = new Set(city.roads.keys());
      const rendered = new Set(Object.keys(manifest));

      it("is deterministic, and only names sprites that have been rendered", () => {
        expect(buildCity(9, route, 108, theme)).toEqual(city);
        for (const p of [...city.props, ...city.cars, ...city.landmarks, ...city.landmarks.map((l) => l.sign)]) {
          expect(p.sprite).toMatch(ALLOWED);
          expect(rendered.has(p.sprite)).toBe(true);
        }
        expect(city.hqSprite).toMatch(ALLOWED);
        expect(rendered.has(city.hqSprite)).toBe(true);
      });

      it("keeps buildings off the roads and only low things beside the route", () => {
        for (const p of city.props) expect(road.has(key(p))).toBe(false);
        const lowOnly = /^(tree_|plant_|rock_|sub-tree|sub-planter|flower_|stump_|log_|stone_large|fence_|crops_|light-|traffic-|dumpster|construction-)/;
        const special = new Set(city.landmarks.flatMap((l) => [key(l), key(l.sign)]));
        for (const p of city.props) {
          if (special.has(key(p))) continue;
          const d = Math.min(...route.cells.map((c) => Math.abs(c.gx - p.gx) + Math.abs(c.gy - p.gy)));
          if (d <= 3) expect(p.sprite).toMatch(lowOnly);
        }
        const lots = new Set(city.pads.map(key));
        for (const c of city.cars) expect(city.roads.get(key(c)) === -1 || lots.has(key(c))).toBe(true);
        for (const c of city.pads) expect(road.has(key(c))).toBe(false);
      });

      it("is a place of its own: its signature buildings appear, and others do not", () => {
        const count = (re: RegExp) => city.props.filter((p) => re.test(p.sprite)).length;
        const houses = count(/^sub-[a-u](-brick|-slate)?(-r\d+)?$/);
        const crops = count(/^crops_/);
        const towers = count(/^(sky|low|cx-towers|cx-podium)-?/);
        if (theme === "rural") expect(crops).toBeGreaterThan(count(/^(com|sky)-/));
        if (theme === "suburban") expect(houses).toBeGreaterThan(towers + 40);
        if (theme === "downtown") expect(towers).toBeGreaterThan(houses + 40);
        if (theme === "urban") expect(count(/^(com|ind|low|sky|c[xs])-/)).toBeGreaterThan(houses);
        if (theme === "downtown" || theme === "urban") expect(count(/^cx-/)).toBeGreaterThan(5);
      });

      it("paints buildings in several materials and foliage in greens", () => {
        const built = city.props.filter((p) => /^((com|sky|ind|low|cx|cs)-|sub-[a-u](-brick|-slate)?(-r\d+)?$)/.test(p.sprite));
        expect(new Set(built.map((p) => p.tint ?? 0)).size).toBeGreaterThanOrEqual(5);
        const trees = city.props.filter((p) => /^(tree_|plant_|sub-tree|crops_)/.test(p.sprite));
        for (const t of trees) expect(t.tint).toBeGreaterThanOrEqual(10);
      });

      it("is varied: many different models, none stamped in a row", () => {
        const names = city.props.filter((p) => /^((com|sky|ind|low|cx|cs)-|sub-[a-u](-brick|-slate)?(-r\d+)?$)/.test(p.sprite)).sort((a, b) => a.gx - b.gx || a.gy - b.gy).map((p) => p.sprite);
        expect(new Set(names.map((n) => n.replace(/-r\d+$/, ""))).size).toBeGreaterThanOrEqual(theme === "rural" ? 6 : 16);
        const bases = new Map(city.props.filter((p) => /^((com|sky|ind|low|cx|cs)-|sub-[a-u](-brick|-slate)?(-r\d+)?$)/.test(p.sprite) && Number.isInteger(p.gx) && Number.isInteger(p.gy)).map((p) => [key(p), p.sprite.replace(/-r\d+$/, "")]));
        for (const [cell, base] of bases) {
          const [gx, gy] = cell.split(",").map(Number) as [number, number];
          for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) expect(bases.get(`${gx + dx},${gy + dy}`)).not.toBe(base);
        }
      });
    });
  }

  it("runs the streets past the edges of any screen: the route sits near the middle of a big grid", () => {
    const route = buildRoute(4, 9, 108);
    const mid = route.cells[Math.floor(route.cells.length / 2)]!;
    expect(mid.gx).toBeGreaterThan(40);
    expect(mid.gx).toBeLessThan(68);
    expect(mid.gy).toBeGreaterThan(40);
    expect(mid.gy).toBeLessThan(68);
  });
});

const DIR_STEP = { UL: [-1, 0], UR: [0, -1], DR: [1, 0], DL: [0, 1] } as const;

describe("name plates", () => {
  // The plate stands above its anchor: the pointer (7 px), any stem (dy), then a plate 30 px tall.
  const plate = (key: string, name: string, x: number, top: number) => ({ key, index: 0, hq: false, name, x, top });
  const box = (p: { name: string; x: number; dx: number; dy: number; top: number }) => {
    const half = Math.max(40, p.name.length * 8.4 + 16) / 2;
    const bottom = p.top - 7 - p.dy;
    return { l: p.x + p.dx - half, r: p.x + p.dx + half, t: bottom - 30, b: bottom };
  };

  it("leaves a plate alone when nothing is near it", () => {
    expect(spreadPlates([plate("a", "1", 200, 300)], 390)[0]!.dx).toBe(0);
  });

  it("slides crowded plates apart so no plate covers another, and none covers another's pointer", () => {
    const placed = spreadPlates([plate("a", "2. Small teams", 120, 300), plate("b", "3", 196, 338), plate("c", "Default alive", 272, 376), plate("d", "1", 150, 400)], 390);
    for (const p of placed) {
      for (const q of placed) {
        if (p === q) continue;
        const a = box(p);
        const b = box(q);
        expect(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t).toBe(true);
        // q's pointer is a thin line from the bottom of its plate down to its anchor
        const covered = q.x > a.l && q.x < a.r && q.top > a.t && b.b < a.b;
        expect(covered).toBe(false);
      }
    }
  });

  it("never lets a plate rise above the limit it is given", () => {
    for (const p of spreadPlates([plate("a", "Default alive", 200, 120), plate("b", "1", 210, 140), plate("c", "2", 230, 160)], 390, 100)) expect(box(p).t).toBeGreaterThanOrEqual(100);
  });

  it("copes with plates that cannot all be separated: it still answers, on screen", () => {
    const placed = spreadPlates([plate("a", "Solo operators", 200, 300), plate("b", "Small shops", 215, 310), plate("c", "Multi-site owners", 190, 290)], 390);
    expect(placed.length).toBe(3);
    for (const p of placed) {
      expect(box(p).l).toBeGreaterThanOrEqual(8);
      expect(box(p).r).toBeLessThanOrEqual(382);
    }
  });

  it("keeps plates on the screen", () => {
    for (const p of spreadPlates([plate("a", "Enterprises", 20, 200), plate("b", "Departments", 372, 205)], 390)) {
      const r = box(p);
      expect(r.l).toBeGreaterThanOrEqual(8);
      expect(r.r).toBeLessThanOrEqual(382);
    }
  });
});

describe("the city is big enough for the screen", () => {
  it("stays at the base size on a phone and grows for a big window", () => {
    expect(gridFor(390, 844, 38)).toBe(108);
    expect(gridFor(1280, 800, 58)).toBe(108);
    expect(gridFor(3440, 1440, 58)).toBeGreaterThan(130);
    expect(gridFor(7680, 4320, 58)).toBeLessThanOrEqual(240);
  });

  it("covers every corner of an ultrawide screen with streets", () => {
    const w = 3440;
    const h = 1440;
    const tw = 58;
    const size = gridFor(w, h, tw);
    const route = buildRoute(4, 3, size);
    const mid = route.cells[Math.floor(route.cells.length / 2)]!;
    const origin = { x: w / 2 - project(mid, tw, { x: 0, y: 0 }).x, y: h / 2 - project(mid, tw, { x: 0, y: 0 }).y };
    for (const corner of [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: 0, y: h }, { x: w, y: h }]) {
      const c = unproject(corner, tw, origin);
      expect(c.gx).toBeGreaterThan(3);
      expect(c.gy).toBeGreaterThan(3);
      expect(c.gx).toBeLessThan(size - 4);
      expect(c.gy).toBeLessThan(size - 4);
    }
  });
});

describe("the skyline rises away from the route", () => {
  it("has a larger share of tall buildings far from the route than near it, in every dense theme", () => {
    const tall = /^(sky-|low-[bfim]|cx-(towers|podium))/;
    const building = /^(com|sky|ind|low|cx|cs)-/;
    for (const theme of ["urban", "downtown"] as const) {
      let nearTall = 0;
      let nearAll = 0;
      let farTall = 0;
      let farAll = 0;
      for (const seed of [3, 7, 11, 19]) {
        const route = buildRoute(4, seed, 108);
        const city = buildCity(seed, route, 108, theme);
        for (const p of city.props) {
          if (!building.test(p.sprite)) continue;
          const d = Math.min(...route.cells.map((c) => Math.abs(c.gx - p.gx) + Math.abs(c.gy - p.gy)));
          if (d <= 10) {
            nearAll += 1;
            if (tall.test(p.sprite)) nearTall += 1;
          } else if (d >= 16) {
            farAll += 1;
            if (tall.test(p.sprite)) farTall += 1;
          }
        }
      }
      expect(farTall / farAll, `${theme}: far`).toBeGreaterThan(nearTall / nearAll);
      expect(nearTall / nearAll, `${theme}: nothing tall hugs the route`).toBeLessThan(0.05);
    }
  });
});
