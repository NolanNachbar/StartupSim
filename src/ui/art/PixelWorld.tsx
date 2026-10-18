// The world: a tile map built from Tiny Town and Pixel Shmup tiles, laid out from the seed. The route runs along a
// dirt road between a house for each customer group and a flag. Evidence lines are drawn in pixels on top of it
// (dotted untested, dashed weak, solid blue verified). A sprite plane flies the route as weeks pass.
import { useEffect, useMemo, useRef } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { houseSpot, makeRng, pointAlong, routeBox, routePoints, type Pt } from "./geometry";
import { drawTile, loadSheet, scaleFor, SHEETS, SHIP, SHMUP, Sprite, TOWN } from "./sprites";

const INK = "#3f2631";
const VERIFIED = "#1ea7e1";

interface Props {
  readonly hypotheses: readonly Hypothesis[];
  readonly names: readonly string[];
  readonly focus: number;
  readonly seed: number;
  /** How far along the flight, 0 to 1. */
  readonly progress: number;
  readonly selected: number | null;
  readonly w: number;
  readonly h: number;
  readonly labels: boolean;
  readonly onSelect?: (i: number) => void;
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, state: HypothesisState): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.round(len));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / steps);
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / steps);
    if (state === "untested") {
      if (i % 8 < 3) {
        ctx.fillStyle = INK;
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    } else if (state === "weak") {
      if (i % 12 < 7) {
        ctx.fillStyle = INK;
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    } else {
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, y - 2, 5, 5);
      ctx.fillStyle = VERIFIED;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    }
  }
}

export function PixelWorld({ hypotheses, names, focus, seed, progress, selected, w, h, labels, onSelect }: Props) {
  const scale = scaleFor(w);
  const bw = Math.ceil(w / scale);
  const bh = Math.ceil(h / scale);
  const n = Math.max(hypotheses.length, 1);
  const pts = useMemo(() => routePoints(n, seed, bw, bh, routeBox(w)), [n, seed, bw, bh, w]);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadSheet("town"), loadSheet("shmup")]).then(([town, shmup]) => {
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const rng = makeRng(seed);
      const cols = Math.ceil(bw / 16);
      const rows = Math.ceil(bh / 16);
      for (let ty = 0; ty < rows; ty++)
        for (let tx = 0; tx < cols; tx++) drawTile(ctx, town, "town", TOWN.grass[Math.floor(rng() * TOWN.grass.length)] ?? 0, tx * 16, ty * 16);
      // The road: dirt tiles along the route.
      const road = new Set<string>();
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i] as Pt;
        const b = pts[i + 1] as Pt;
        const len = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
        for (let k = 0; k <= len; k += 3) {
          const x = a[0] + ((b[0] - a[0]) * k) / len;
          const y = a[1] + ((b[1] - a[1]) * k) / len;
          road.add(`${Math.floor(x / 16)},${Math.floor(y / 16)}`);
        }
      }
      for (const key of road) {
        const [tx, ty] = key.split(",").map(Number) as [number, number];
        drawTile(ctx, town, "town", TOWN.dirt, tx * 16, ty * 16);
      }
      // Trees, kept clear of the route.
      const near = (x: number, y: number) => pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 30);
      const count = Math.floor((cols * rows) / 5);
      for (let k = 0; k < count; k++) {
        const tx = Math.floor(rng() * cols);
        const ty = Math.floor(rng() * rows);
        if (road.has(`${tx},${ty}`) || near(tx * 16 + 8, ty * 16 + 8)) continue;
        drawTile(ctx, town, "town", TOWN.trees[Math.floor(rng() * TOWN.trees.length)] ?? 3, tx * 16, ty * 16);
      }
      // Evidence lines, leg by leg.
      for (let i = 0; i < pts.length - 1; i++) {
        const state: HypothesisState = i < hypotheses.length && i < pts.length - 2 ? (hypotheses[i]?.state ?? "untested") : "untested";
        line(ctx, pts[i] as Pt, pts[i + 1] as Pt, state);
      }
      // A house for each customer group, standing beside the road.
      pts.slice(1, -1).forEach((p, i) => {
        const [hx, hy] = houseSpot(i, p);
        TOWN.roof.forEach((t, k) => drawTile(ctx, town, "town", t, hx + k * 16, hy));
        TOWN.wall.forEach((t, k) => drawTile(ctx, town, "town", t, hx + k * 16, hy + 16));
      });
      // The destination is an airfield: a patch of lime grass with a flag.
      const dest = pts[pts.length - 1] as Pt;
      for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) drawTile(ctx, shmup, "shmup", SHMUP.airfield, dest[0] - 16 + tx * 16, dest[1] - 16 + ty * 16);
      drawTile(ctx, shmup, "shmup", SHMUP.flag, dest[0] - 8, dest[1] - 22);
      const f = pts[focus + 1];
      if (f && focus >= 0) {
        const [hx, hy] = houseSpot(focus, f);
        drawTile(ctx, town, "town", TOWN.sign, hx + (focus % 2 === 0 ? 32 : -16), hy + 16);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pts, hypotheses, focus, seed, bw, bh]);

  const plane = pointAlong(pts, progress);
  const ship = SHEETS.ships.cell;
  return (
    <div class="world">
      <div class="world__stage" style={{ width: `${bw * scale}px`, height: `${bh * scale}px` }}>
      <canvas ref={ref} class="world__canvas" width={bw} height={bh} role="img" aria-label="Map of your route" style={{ width: `${bw * scale}px`, height: `${bh * scale}px` }} />
      {labels ? (
        <div class="world__layer" aria-hidden="true">
          {pts.slice(1, -1).map((p, i) => (
            <div key={i} class={`way ${i % 2 === 0 ? "way--l" : "way--r"}${selected === i ? " way--on" : ""}`} style={{ left: `${houseSpot(i, p)[0] * scale}px`, top: `${houseSpot(i, p)[1] * scale}px` }} onClick={() => onSelect?.(i)}>
              <span class="way__tap" />
              <span class="way__name">{names[i] ?? `Group ${i + 1}`}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div class="plane" aria-hidden="true" style={{ transform: `translate(${plane[0] * scale - (ship * scale) / 2}px, ${plane[1] * scale - (ship * scale) / 2 - 12 * scale}px)` }}>
        <Sprite sheet="ships" idx={SHIP.player} scale={scale} class="plane__sprite" />
      </div>
      </div>
    </div>
  );
}
