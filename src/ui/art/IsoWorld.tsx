// The world: an isometric tech campus built from Kenney's CC0 3D kits (rendered to sprites by Blender, see
// scripts/blender/render_city.py). The route is a road that climbs the screen between a building for each customer
// group and the destination tower. Evidence lines are painted on the road (dotted untested, dashed weak, solid
// verified). A delivery van drives the route as weeks pass.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { drawSprite, drawStyled, loadSprites, RENDER_TILE_W, spriteUrl, type Loaded } from "./city";
import { buildCity, buildRoute, gridFor, project, roadMask, roadSprite, ROAD_SPRITES, spreadPlates, unproject, type Cell, type Pt, type Theme } from "./iso";


interface Props {
  readonly hypotheses: readonly Hypothesis[];
  readonly names: readonly string[];
  readonly focus: number;
  readonly seed: number;
  readonly theme: Theme;
  /** How far along the flight, 0 to 1. */
  readonly progress: number;
  readonly selected: number | null;
  readonly w: number;
  readonly h: number;
  readonly labels: boolean;
  readonly onSelect?: (i: number) => void;
}

export const tileWidth = (cssWidth: number): number => (cssWidth < 900 ? 38 : 58);

const GRASS_A = "#7f9f5c";
const GRASS_B = "#7a9a58";

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

const LINE: Record<HypothesisState, { dash: number[]; width: number; color: string }> = {
  untested: { dash: [1, 12], width: 7, color: "#ffffff" },
  weak: { dash: [14, 10], width: 6, color: "#ffffff" },
  verified: { dash: [], width: 7, color: "#3ddc84" },
};

/** The cells that can be on screen (with a margin), from the screen corners. */
export function visibleCells(w: number, h: number, tw: number, origin: Pt): { gx0: number; gx1: number; gy0: number; gy1: number } {
  const corners = [unproject({ x: 0, y: 0 }, tw, origin), unproject({ x: w, y: 0 }, tw, origin), unproject({ x: 0, y: h }, tw, origin), unproject({ x: w, y: h }, tw, origin)];
  return {
    gx0: Math.min(...corners.map((c) => c.gx)) - 3,
    gx1: Math.max(...corners.map((c) => c.gx)) + 3,
    gy0: Math.min(...corners.map((c) => c.gy)) - 3,
    gy1: Math.max(...corners.map((c) => c.gy)) + 6,
  };
}

export function useLayout(w: number, h: number, seed: number, n: number, theme: Theme) {
  return useMemo(() => {
    const size = gridFor(w, h, h < 520 ? 22 : tileWidth(w)); // the smallest tile that can be chosen below
    const route = buildRoute(n, seed, size);
    // Frame the route, with headroom for the tallest plate, in the open band between the HUD and the bottom panel.
    // If the band is too short for it (a landscape phone), the tiles shrink until it fits.
    const wide = w >= 600;
    const compact = h < 520; // a landscape phone: a slim HUD and a slim plate
    const bandTop = compact ? 76 : wide ? 136 : 160;
    const bandBottom = compact ? h - 112 : wide ? h * 0.72 : h * 0.54;
    const headroom = compact ? 140 : 150;
    const base = tileWidth(w);
    const span = (tw: number) => {
      const ys = route.cells.map((c) => project(c, tw, { x: 0, y: 0 }).y);
      return { top: Math.min(...ys) - headroom * (tw / base), bottom: Math.max(...ys) + tw / 4 };
    };
    const natural = span(base);
    const fit = Math.min(1, (bandBottom - bandTop) / (natural.bottom - natural.top));
    const tw = Math.max(22, Math.floor(base * fit));
    const city = buildCity(seed, route, size, theme);
    const { top: routeTop, bottom: routeBottom } = span(tw);
    const bandH = bandBottom - bandTop;
    const top = bandTop + Math.max(0, (bandH - (routeBottom - routeTop)) / 2);
    const mid = route.cells[Math.floor(route.cells.length / 2)] as Cell;
    const p0 = project(mid, tw, { x: 0, y: 0 });
    const target: Pt = { x: wide ? (w - 336) * 0.46 : w / 2, y: 0 };
    const origin: Pt = { x: target.x - p0.x, y: top - routeTop };
    return { tw, route, city, origin };
  }, [w, h, seed, n, theme]);
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

export function IsoWorld({ hypotheses, names, focus, seed, theme, progress, selected, w, h, labels, onSelect }: Props) {
  const n = Math.max(hypotheses.length, 1);
  const { tw, route, city, origin } = useLayout(w, h, seed, n, theme);
  const ref = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<Loaded | null>(null);
  const dpr = typeof devicePixelRatio === "number" ? Math.min(devicePixelRatio, 2) : 1;
  const scale = (tw * dpr) / RENDER_TILE_W;

  const needed = useMemo(() => {
    const { gx0, gx1, gy0, gy1 } = visibleCells(w, h, tw, origin);
    const seen = (p: { gx: number; gy: number }) => p.gx >= gx0 && p.gx <= gx1 && p.gy >= gy0 && p.gy <= gy1;
    const names = new Set<string>(["car-van-180", "car-van-270", "road-roundabout", "road-square", city.hqSprite, ...ROAD_SPRITES]);
    for (const p of city.props) if (seen(p)) names.add(p.sprite);
    for (const p of city.cars) if (seen(p)) names.add(p.sprite);
    for (const l of city.landmarks) {
      names.add(l.sprite);
      names.add(l.sign.sprite);
    }
    return names;
  }, [city, w, h, tw, origin]);

  useEffect(() => {
    let live = true;
    loadSprites(needed)
      .then((l) => live && setSprites(l))
      .catch(() => undefined); // the plain lawn stays if the sprites cannot be fetched
    return () => {
      live = false;
    };
  }, [needed]);

  // The city itself never changes during a run, so it is painted once into two layers (ground, and everything
  // that stands on it); only the evidence lines on the road are redrawn when the hypotheses change.
  const [layers, setLayers] = useState<{ ground: HTMLCanvasElement; stand: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    if (!sprites) return;
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    const make = (): [HTMLCanvasElement, CanvasRenderingContext2D | null] => {
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      return [c, c.getContext("2d")];
    };
    const [ground, g] = make();
    const [stand, ctx] = make();
    if (!g || !ctx) return;
    for (const x of [g, ctx]) {
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = "high";
    }
    g.fillStyle = GRASS_A;
    g.fillRect(0, 0, cw, ch);
    const toCanvas = (p: Pt): Pt => ({ x: p.x * dpr, y: p.y * dpr });
    // The visible range of cells, from the screen corners.
    const { gx0, gx1, gy0, gy1 } = visibleCells(w, h, tw, origin);
    const roads = new Set(city.roads.keys());
    const pads = new Set(city.pads.map((c) => `${c.gx},${c.gy}`));
    const circles = new Set(city.circles.map((c) => `${c.gx},${c.gy}`));
    // Ground: grass everywhere, road tiles on the streets, paved lots where the city has them.
    for (let sum = gx0 + gy0; sum <= gx1 + gy1; sum++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const gy = sum - gx;
        if (gy < gy0 || gy > gy1) continue;
        const c = toCanvas(project({ gx, gy }, tw, origin));
        if (c.x < -tw * dpr || c.x > cw + tw * dpr || c.y < -tw * dpr || c.y > ch + tw * dpr) continue;
        const key = `${gx},${gy}`;
        if (roads.has(key)) drawSprite(g, sprites, (gx === city.hq.gx && gy === city.hq.gy) || circles.has(key) ? "road-roundabout" : roadSprite(roadMask(roads, { gx, gy })), c.x, c.y, scale);
        else if (pads.has(key)) drawSprite(g, sprites, "road-square", c.x, c.y, scale);
        else diamond(g, c.x, c.y, (tw * dpr) / 2, (gx + gy) % 2 === 0 ? GRASS_A : GRASS_B);
      }
    }
    // Plazas under the landmarks, so the customer groups read as places before anything else does.
    for (const l of city.landmarks) {
      const c = toCanvas(project(l, tw, origin));
      diamond(g, c.x, c.y, (tw * dpr) / 2, "#f6f8ff");
      diamond(g, c.x, c.y, (tw * dpr) / 2 - 5 * dpr, "#dfe6fb");
    }
    // Props, landmarks and signs, back to front.
    interface Item { gx: number; gy: number; sprite: string; tint?: number }
    const items: Item[] = [
      ...city.props,
      ...city.cars,
      ...city.landmarks.flatMap((l) => [{ gx: l.gx, gy: l.gy, sprite: l.sprite }, { gx: l.sign.gx, gy: l.sign.gy, sprite: l.sign.sprite }]),
      { gx: city.hq.gx - 1, gy: city.hq.gy - 1, sprite: city.hqSprite },
    ];
    items.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gx - b.gx);
    for (const p of items) {
      if (p.gx < gx0 || p.gx > gx1 || p.gy < gy0 || p.gy > gy1) continue;
      const c = toCanvas(project(p, tw, origin));
      const m = sprites.meta[p.sprite];
      const img = sprites.img.get(p.sprite);
      if (m && img) drawStyled(ctx, img, c.x - m.ax * scale, c.y - m.ay * scale, m.w * scale, m.h * scale, p.tint ?? 0);
    }
    setLayers({ ground, stand });
  }, [sprites, city, route, origin, tw, dpr, scale, w, h]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !layers) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layers.ground, 0, 0);
    // Evidence lines painted on the road, leg by leg.
    const pts = route.cells.map((c) => ({ x: project(c, tw, origin).x * dpr, y: project(c, tw, origin).y * dpr }));
    const cuts = [0, ...route.waypoints.map((wp) => wp.at), route.cells.length - 1];
    for (let leg = 0; leg < cuts.length - 1; leg++) {
      const state: HypothesisState = leg < route.waypoints.length ? (hypotheses[leg]?.state ?? "untested") : "untested";
      const style = LINE[state];
      // A dark casing under the line, so it reads on grey roads and against buildings.
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(38, 42, 68, 0.55)";
      ctx.lineWidth = (style.width + 4) * (dpr / 2) * (tw / 64);
      ctx.setLineDash(style.dash.map((d) => d * (dpr / 2) * (tw / 64)));
      ctx.beginPath();
      for (let i = cuts[leg] as number; i <= (cuts[leg + 1] as number); i++) {
        const p = pts[i] as Pt;
        if (i === cuts[leg]) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
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
    ctx.drawImage(layers.stand, 0, 0);
  }, [layers, route, origin, tw, hypotheses, dpr]);

  const plates = useMemo(() => {
    const topOf = (c: Cell, sprite: string): number => {
      const m = sprites?.meta[sprite];
      return project(c, tw, origin).y - (m ? (m.ay * tw) / RENDER_TILE_W : tw);
    };
    const raw = [
      ...city.landmarks.map((l, i) => ({ key: `g${i}`, index: i as number | null, hq: false, name: selected === i ? `${i + 1}. ${names[i] ?? `Group ${i + 1}`}` : String(i + 1), x: project(l, tw, origin).x, top: topOf(l, l.sprite) })),
      (() => {
        const c = { gx: city.hq.gx - 1, gy: city.hq.gy - 1 };
        return { key: "hq", index: null as number | null, hq: true, name: "Default alive", x: project(c, tw, origin).x, top: topOf(c, city.hqSprite) };
      })(),
    ];
    // a plate never rides up under the HUD
    return spreadPlates(raw, w, (h < 520 ? 72 : w >= 600 ? 150 : 154) + 6);
  }, [city, names, sprites, tw, origin, w, h, selected]);
  const van = pointAlongRoute(route.cells, tw, origin, progress);
  const vanName = van.dir === "UL" ? "car-van-270" : "car-van-180";
  const vm = sprites?.meta[vanName];
  return (
    <div class="world" aria-hidden="false">
      <canvas ref={ref} class={`world__canvas${layers ? " world__canvas--ready" : ""}`} width={Math.round(w * dpr)} height={Math.round(h * dpr)} role="img" aria-label="Map of your route" style={{ width: `${w}px`, height: `${h}px` }} />
      {!layers ? <p class="world__loading" aria-hidden="true">Building the city</p> : null}
      {labels && layers ? (
        <div class="world__layer" aria-hidden="true">
          {plates.map((pl) => (
            <div
              key={pl.key}
              class={`way${pl.hq ? " way--hq" : ""}${pl.index !== null && selected === pl.index ? " way--on" : ""}${pl.index !== null && focus === pl.index ? " way--focus" : ""}`}
              style={{ left: `${pl.x}px`, top: `${pl.top}px`, zIndex: Math.round(pl.top), "--dx": `${pl.dx}px`, "--dy": `${pl.dy}px` }}
              onClick={pl.index !== null ? () => onSelect?.(pl.index as number) : undefined}
            >
              <span class="way__name">{pl.name}</span>
              {pl.dy > 0 ? <span class="way__stem" /> : null}
              <span class="way__pin" />
            </div>
          ))}
        </div>
      ) : null}
      {vm && layers ? (
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

