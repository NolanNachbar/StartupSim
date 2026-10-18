// The world: an isometric tech campus built from Kenney's CC0 3D kits (rendered to sprites by Blender, see
// scripts/blender/render_city.py). The route is a road that climbs the screen between a building for each customer
// group and the destination tower. Evidence lines are painted on the road (dotted untested, dashed weak, solid
// verified). A delivery van drives the route as weeks pass.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { drawSprite, loadSprites, RENDER_TILE_W, spriteUrl, type Loaded } from "./city";
import { buildCity, buildRoute, project, roadMask, roadSprite, ROAD_SPRITES, unproject, type Cell, type Pt } from "./iso";

export const GRID = 60;

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

export const tileWidth = (cssWidth: number): number => (cssWidth < 900 ? 38 : 58);

const GRASS_A = "#86c05f";
const GRASS_B = "#82bc5a";

/** A flat ground tile: the park lawns between the roads. */
function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - half / 2);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx, cy + half / 2);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
  ctx.fill();
}

const hazeCache = new WeakMap<Loaded, Loaded>();
/** The same sprites with a light cool haze over them: distance, so the foreground reads first. */
function hazy(l: Loaded): Loaded {
  const cached = hazeCache.get(l);
  if (cached) return cached;
  const img = new Map<string, HTMLImageElement | HTMLCanvasElement>();
  for (const [name, im] of l.img) {
    const c = document.createElement("canvas");
    c.width = im.width;
    c.height = im.height;
    const x = c.getContext("2d");
    if (!x) continue;
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = "rgba(214, 226, 250, 0.3)";
    x.fillRect(0, 0, c.width, c.height);
    img.set(name, c as unknown as HTMLImageElement);
  }
  const out = { meta: l.meta, img } as unknown as Loaded;
  hazeCache.set(l, out);
  return out;
}

const LINE: Record<HypothesisState, { dash: number[]; width: number; color: string }> = {
  untested: { dash: [1, 12], width: 6, color: "#ffffff" },
  weak: { dash: [14, 10], width: 5, color: "#ffffff" },
  verified: { dash: [], width: 6, color: "#3ddc84" },
};

export function useLayout(w: number, h: number, seed: number, n: number) {
  return useMemo(() => {
    const tw = tileWidth(w);
    const route = buildRoute(n, seed, GRID);
    const city = buildCity(seed, route, GRID);
    // Centre the route in the open band between the HUD and the plate.
    const mid = route.cells[Math.floor(route.cells.length / 2)] as Cell;
    const wide = w >= 600;
    const target: Pt = { x: wide ? (w - 336) * 0.46 : w / 2, y: h * (wide ? 0.44 : 0.37) };
    const p0 = project(mid, tw, { x: 0, y: 0 });
    const origin: Pt = { x: target.x - p0.x, y: target.y - p0.y };
    return { tw, route, city, origin };
  }, [w, h, seed, n]);
}

/** A point partway along the route, in screen space, and the grid direction it is travelling. */
export function pointAlongRoute(cells: readonly Cell[], tw: number, origin: Pt, t: number): { p: Pt; dir: "UL" | "UR" } {
  const last = cells.length - 1;
  const f = Math.min(Math.max(t, 0), 1) * last;
  const i = Math.min(Math.floor(f), last - 1);
  const a = project(cells[i] as Cell, tw, origin);
  const b = project(cells[i + 1] as Cell, tw, origin);
  const u = f - i;
  const stepGx = (cells[i + 1] as Cell).gx - (cells[i] as Cell).gx;
  return { p: { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, dir: stepGx !== 0 ? "UL" : "UR" };
}

export function IsoWorld({ hypotheses, names, focus, seed, progress, selected, w, h, labels, onSelect }: Props) {
  const n = Math.max(hypotheses.length, 1);
  const { tw, route, city, origin } = useLayout(w, h, seed, n);
  const ref = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<Loaded | null>(null);
  const dpr = typeof devicePixelRatio === "number" ? Math.min(devicePixelRatio, 3) : 1;
  const scale = (tw * dpr) / RENDER_TILE_W;

  const needed = useMemo(() => {
    const names = new Set<string>(["car-van-180", "car-van-270", "road-roundabout", "sky-c", ...ROAD_SPRITES]);
    for (const p of city.props) names.add(p.sprite);
    for (const l of city.landmarks) {
      names.add(l.sprite);
      names.add(l.sign.sprite);
    }
    return names;
  }, [city]);

  useEffect(() => {
    let live = true;
    void loadSprites(needed).then((l) => live && setSprites(l));
    return () => {
      live = false;
    };
  }, [needed]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !sprites) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = GRASS_A;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const toCanvas = (p: Pt): Pt => ({ x: p.x * dpr, y: p.y * dpr });
    // The visible range of cells, from the screen corners.
    const corners = [unproject({ x: 0, y: 0 }, tw, origin), unproject({ x: w, y: 0 }, tw, origin), unproject({ x: 0, y: h }, tw, origin), unproject({ x: w, y: h }, tw, origin)];
    const gx0 = Math.min(...corners.map((c) => c.gx)) - 3;
    const gx1 = Math.max(...corners.map((c) => c.gx)) + 3;
    const gy0 = Math.min(...corners.map((c) => c.gy)) - 3;
    const gy1 = Math.max(...corners.map((c) => c.gy)) + 6;
    const roads = new Set(city.roads.keys());
    // Ground: grass everywhere, road tiles on the route.
    for (let sum = gx0 + gy0; sum <= gx1 + gy1; sum++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const gy = sum - gx;
        if (gy < gy0 || gy > gy1) continue;
        const c = toCanvas(project({ gx, gy }, tw, origin));
        if (c.x < -tw * dpr || c.x > canvasWidth(canvas) + tw * dpr || c.y < -tw * dpr || c.y > canvas.height + tw * dpr) continue;
        const key = `${gx},${gy}`;
        if (roads.has(key)) drawSprite(ctx, sprites, gx === city.hq.gx && gy === city.hq.gy ? "road-roundabout" : roadSprite(roadMask(roads, { gx, gy })), c.x, c.y, scale);
        else diamond(ctx, c.x, c.y, (tw * dpr) / 2, (gx + gy) % 2 === 0 ? GRASS_A : GRASS_B);
      }
    }
    // Evidence lines painted on the road, leg by leg.
    const pts = route.cells.map((c) => toCanvas(project(c, tw, origin)));
    const cuts = [0, ...route.waypoints.map((wp) => wp.at), route.cells.length - 1];
    for (let leg = 0; leg < cuts.length - 1; leg++) {
      const state: HypothesisState = leg < route.waypoints.length ? (hypotheses[leg]?.state ?? "untested") : "untested";
      const style = LINE[state];
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width * (dpr / 2) * (tw / 64);
      ctx.setLineDash(style.dash.map((d) => d * (dpr / 2) * (tw / 64)));
      ctx.globalAlpha = state === "untested" ? 0.9 : 1;
      ctx.beginPath();
      for (let i = cuts[leg] as number; i <= (cuts[leg + 1] as number); i++) {
        const p = pts[i] as Pt;
        if (i === cuts[leg]) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // Plazas under the landmarks, so the customer groups read as places before anything else does.
    for (const l of city.landmarks) {
      const c = toCanvas(project(l, tw, origin));
      diamond(ctx, c.x, c.y, (tw * dpr) / 2, "#f6f8ff");
      diamond(ctx, c.x, c.y, (tw * dpr) / 2 - 5 * dpr, "#dfe6fb");
    }
    // Props, landmarks and signs, back to front. Buildings away from the route are a little hazier, so the
    // route and the landmarks stand out.
    interface Item { gx: number; gy: number; sprite: string; near: boolean }
    const routeCells = route.cells;
    const nearRoute = (gx: number, gy: number) => routeCells.some((c) => Math.abs(c.gx - gx) + Math.abs(c.gy - gy) <= 4);
    const items: Item[] = [
      ...city.props.map((p) => ({ ...p, near: nearRoute(p.gx, p.gy) })),
      ...city.landmarks.flatMap((l) => [{ gx: l.gx, gy: l.gy, sprite: l.sprite, near: true }, { gx: l.sign.gx, gy: l.sign.gy, sprite: l.sign.sprite, near: true }]),
      { gx: city.hq.gx - 1, gy: city.hq.gy - 1, sprite: "sky-c", near: true },
    ];
    items.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
    for (const p of items) {
      if (p.gx < gx0 || p.gx > gx1 || p.gy < gy0 || p.gy > gy1) continue;
      const c = toCanvas(project(p, tw, origin));
      drawSprite(ctx, p.near ? sprites : hazy(sprites), p.sprite, c.x, c.y, scale);
    }
  }, [sprites, city, route, origin, tw, hypotheses, dpr, scale, w, h]);

  const van = pointAlongRoute(route.cells, tw, origin, progress);
  const vanName = van.dir === "UL" ? "car-van-270" : "car-van-180";
  const vm = sprites?.meta[vanName];
  return (
    <div class="world" aria-hidden="false">
      <canvas ref={ref} class="world__canvas" width={Math.round(w * dpr)} height={Math.round(h * dpr)} role="img" aria-label="Map of your route" style={{ width: `${w}px`, height: `${h}px` }} />
      {labels ? (
        <div class="world__layer" aria-hidden="true">
          {city.landmarks.map((l, i) => {
            const p = project(l, tw, origin);
            const m = sprites?.meta[l.sprite];
            const top = p.y - (m ? (m.ay * tw) / RENDER_TILE_W : tw);
            return (
              <div key={i} class={`way${selected === i ? " way--on" : ""}${focus === i ? " way--focus" : ""}`} style={{ left: `${p.x}px`, top: `${top}px` }} onClick={() => onSelect?.(i)}>
                <span class="way__name">{names[i] ?? `Group ${i + 1}`}</span>
                <span class="way__pin" />
              </div>
            );
          })}
        </div>
      ) : null}
      {labels ? (
        <div class="world__layer" aria-hidden="true">
          {(() => {
            const p = project({ gx: city.hq.gx - 1, gy: city.hq.gy - 1 }, tw, origin);
            const m = sprites?.meta["sky-c"];
            const top = p.y - (m ? (m.ay * tw) / RENDER_TILE_W : tw);
            return (
              <div class="way way--hq" style={{ left: `${p.x}px`, top: `${top}px` }}>
                <span class="way__name">Default alive</span>
                <span class="way__pin" />
              </div>
            );
          })()}
        </div>
      ) : null}
      {vm ? (
        <img
          class="van"
          alt=""
          aria-hidden="true"
          src={spriteUrl(vanName)}
          style={{ width: `${(vm.w * tw) / RENDER_TILE_W}px`, transform: `translate(${van.p.x - (vm.ax * tw) / RENDER_TILE_W}px, ${van.p.y - (vm.ay * tw) / RENDER_TILE_W}px)` }}
        />
      ) : null}
    </div>
  );
}

const canvasWidth = (c: HTMLCanvasElement): number => c.width;
