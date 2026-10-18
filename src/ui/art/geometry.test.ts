import { describe, expect, it } from "vitest";
import { houseSpot, pointAlong, routeBox, routePoints } from "./geometry";
import { digitTile, SHEETS } from "./sprites";

describe("route placement", () => {
  const box = routeBox(390);
  it("puts the start low and left and the destination high and right, inside the box", () => {
    const pts = routePoints(3, 5, 130, 281, box);
    expect(pts.length).toBe(5);
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    expect(first[1]).toBeGreaterThan(last[1]);
    expect(first[0]).toBeLessThan(last[0]);
    for (const [x, y] of pts) {
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(130);
    }
  });

  it("is the same for the same seed and different for another", () => {
    expect(routePoints(3, 5, 130, 281, box)).toEqual(routePoints(3, 5, 130, 281, box));
    expect(routePoints(3, 5, 130, 281, box)).not.toEqual(routePoints(3, 6, 130, 281, box));
  });

  it("finds points along the route from start to destination", () => {
    const pts = routePoints(3, 5, 130, 281, box);
    expect(pointAlong(pts, 0)).toEqual(pts[0]);
    expect(pointAlong(pts, 1)).toEqual(pts[pts.length - 1]);
    const mid = pointAlong(pts, 0.5);
    expect(mid[1]).toBeLessThan(pts[0]![1]);
    expect(mid[1]).toBeGreaterThan(pts[pts.length - 1]![1]);
  });

  it("alternates house sides so neighbouring houses never overlap", () => {
    const pts = routePoints(3, 5, 130, 281, box);
    for (let i = 0; i < 2; i++) {
      const a = houseSpot(i, pts[i + 1]!);
      const b = houseSpot(i + 1, pts[i + 2]!);
      const apart = Math.abs(a[0] - b[0]) >= 32 || Math.abs(a[1] - b[1]) >= 32;
      expect(apart).toBe(true);
    }
  });
});

describe("sprites", () => {
  it("maps every pixel digit to its own tile on the Pixel Shmup sheet", () => {
    const tiles = Array.from({ length: 10 }, (_, d) => digitTile(d));
    expect(new Set(tiles).size).toBe(10);
    const rows = SHEETS.shmup.h / SHEETS.shmup.cell;
    for (const t of tiles) expect(t).toBeLessThan(SHEETS.shmup.cols * rows);
  });

  it("describes sheets whose size is a whole number of cells", () => {
    for (const s of Object.values(SHEETS)) {
      expect(s.w % s.cell).toBe(0);
      expect(s.h % s.cell).toBe(0);
      expect(s.w / s.cell).toBe(s.cols);
    }
  });
});
