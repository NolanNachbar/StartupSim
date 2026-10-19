// The world: an isometric tech campus built from Kenney's CC0 3D kits (rendered to sprites by Blender, see
// scripts/blender/render_city.py). The route is a road that climbs the screen between a building for each customer
// group and the destination tower. Evidence lines are painted on the road (dotted untested, dashed weak, solid
// verified). A delivery van drives the route as weeks pass.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { drawSprite, loadSprites, RENDER_TILE_W, styledImage, type Loaded } from "./city";
import { buildCity, buildRoute, CAR_SPRITES, gridFor, project, roadMask, roadSprite, ROAD_SPRITES, spreadPlates, unproject, vehicleCell, type Cell, type Pt, type Theme } from "./iso";


/** One sprite, ready to paint: its (tinted) image, where it goes, and its place in the back-to-front order. */
interface Drawn {
  readonly src: CanvasImageSource;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly key: number;
  readonly sub: number;
}

/** The grid cells (64 px) a rectangle touches: sprites are indexed by them, so a car finds what is under it quickly. */
const CELL = 64;
const MAX_CARS = 60;
function cellsOf(r: { x: number; y: number; w: number; h: number }): number[] {
  const out: number[] = [];
  const cx0 = Math.floor(r.x / CELL);
  const cx1 = Math.floor((r.x + r.w) / CELL);
  const cy0 = Math.floor(r.y / CELL);
  const cy1 = Math.floor((r.y + r.h) / CELL);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) out.push(cx * 100000 + cy);
  return out;
}

interface Props {
  readonly hypotheses: readonly Hypothesis[];
  readonly names: readonly string[];
  readonly focus: number;
  readonly seed: number;
  readonly theme: Theme;
  /** The customer group whose road the van is on, or null while it waits at home. */
  readonly vanAt: number | null;
  /** The company's name, on the home building. */
  readonly home: string;
  readonly selected: number | null;
  readonly w: number;
  readonly h: number;
  readonly labels: boolean;
  /** Let the cars drive (off for reduced motion, and while a menu covers the map). */
  readonly animate?: boolean;
  readonly onSelect?: (i: number) => void;
}

export const tileWidth = (cssWidth: number): number => (cssWidth < 900 ? 46 : 62);

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

export function useLayout(w: number, h: number, seed: number, n: number, theme: Theme, panelTop: number | null = null) {
  return useMemo(() => {
    const size = gridFor(w, h, h < 520 ? 22 : tileWidth(w)); // the smallest tile that can be chosen below
    const route = buildRoute(n, seed, size);
    // Frame the route, with headroom for the tallest plate, in the open band between the HUD and the bottom panel.
    // If the band is too short for it (a landscape phone), the tiles shrink until it fits.
    const wide = w >= 600;
    const compact = h < 520; // a landscape phone: a slim HUD and a slim plate
    const bandTop = compact ? 76 : wide ? 136 : 160;
    // the bottom of the map is the real top of the route panel when it is known, so nothing is drawn under it
    const fallbackBottom = compact ? h - 112 : wide ? h * 0.72 : h * 0.54;
    const bandBottom = panelTop === null ? fallbackBottom : Math.max(bandTop + 120, panelTop - 6);
    const headroom = compact ? 120 : 105; // room above the top road for the tallest building and its label
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
    const p0 = project(route.hub, tw, { x: 0, y: 0 });
    const target: Pt = { x: wide ? (w - 336) * 0.46 : w / 2, y: 0 };
    const origin: Pt = { x: target.x - p0.x, y: top - routeTop };
    return { tw, route, city, origin, size };
  }, [w, h, seed, n, theme, panelTop]);
}

/**
 * Where the van is a fraction `t` of the way along a road, and which way its sprite faces (the van sprite names are
 * the way they point on screen: 270 up-left, 180 up-right, 90 down-right, 0 down-left). `back` is driving home.
 */
export function vanFrame(cells: readonly Cell[], t: number, back: boolean): { cell: Cell; heading: "0" | "90" | "180" | "270" } {
  const last = cells.length - 1;
  const f = Math.min(Math.max(t, 0), 1) * last;
  const i = Math.min(Math.floor(f), last - 1);
  const a = cells[i] as Cell;
  const b = cells[i + 1] as Cell;
  const u = f - i;
  const sign = back ? -1 : 1;
  const dx = (b.gx - a.gx) * sign;
  const dy = (b.gy - a.gy) * sign;
  return { cell: { gx: a.gx + (b.gx - a.gx) * u, gy: a.gy + (b.gy - a.gy) * u }, heading: dx < 0 ? "270" : dy < 0 ? "180" : dx > 0 ? "90" : "0" };
}

export function IsoWorld({ hypotheses, names, focus, seed, theme, vanAt, home, selected, w, h, labels, animate = false, onSelect }: Props) {
  const n = Math.max(hypotheses.length, 1);
  // Where the route panel really starts, measured from the page: it changes with long names, a first-run note, text size.
  const [panelTop, setPanelTop] = useState<number | null>(null);
  useEffect(() => {
    const shell = document.querySelector(".shell");
    if (!shell) return;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(".plate");
      const top = el ? Math.round(el.getBoundingClientRect().top / 4) * 4 : null;
      setPanelTop((p) => (p === top ? p : top));
    };
    let watched: Element | null = null;
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    const attach = () => {
      const el = document.querySelector(".plate");
      if (el !== watched) {
        if (watched) resize?.unobserve(watched);
        if (el) resize?.observe(el);
        watched = el;
      }
      measure();
    };
    const mutations = new MutationObserver(attach);
    mutations.observe(shell, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    attach();
    return () => {
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const { tw, route, city, origin, size } = useLayout(w, h, seed, n, theme, panelTop);
  const ref = useRef<HTMLCanvasElement>(null);
  const [sprites, setSprites] = useState<Loaded | null>(null);
  const dpr = typeof devicePixelRatio === "number" ? Math.min(devicePixelRatio, 2) : 1;
  const scale = (tw * dpr) / RENDER_TILE_W;

  const needed = useMemo(() => {
    const { gx0, gx1, gy0, gy1 } = visibleCells(w, h, tw, origin);
    const seen = (p: { gx: number; gy: number }) => p.gx >= gx0 && p.gx <= gx1 && p.gy >= gy0 && p.gy <= gy1;
    const names = new Set<string>(["car-van-0", "car-van-90", "car-van-180", "car-van-270", "road-roundabout", "road-square", city.hqSprite, ...ROAD_SPRITES, ...CAR_SPRITES]);
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
  const [layers, setLayers] = useState<{ ground: HTMLCanvasElement; stand: HTMLCanvasElement; items: Drawn[]; grid: Map<number, number[]> } | null>(null);
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
    const [stand, st] = make();
    if (!g || !st) return;
    for (const x of [g, st]) {
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
    const drawn: Drawn[] = [];
    const grid = new Map<number, number[]>();
    for (const p of items) {
      if (p.gx < gx0 || p.gx > gx1 || p.gy < gy0 || p.gy > gy1) continue;
      const c = toCanvas(project(p, tw, origin));
      const m = sprites.meta[p.sprite];
      const img = sprites.img.get(p.sprite);
      if (!m || !img) continue;
      const d: Drawn = { src: styledImage(img, p.tint ?? 0), x: c.x - m.ax * scale, y: c.y - m.ay * scale, w: m.w * scale, h: m.h * scale, key: p.gx + p.gy, sub: p.gx };
      st.drawImage(d.src, d.x, d.y, d.w, d.h);
      const index = drawn.push(d) - 1;
      for (const cell of cellsOf(d)) (grid.get(cell) ?? grid.set(cell, []).get(cell))?.push(index);
    }
    setLayers({ ground, stand, items: drawn, grid });
  }, [sprites, city, route, origin, tw, dpr, scale, w, h]);

  // What is painted each frame: the base (ground and the evidence lines), the cars driving, then everything that
  // stands on the ground (so a building in front of a street hides the cars behind it).
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const paintRef = useRef<(seconds: number) => void>(() => undefined);
  const vanState = useRef<{ seg: number | null; t: number; back: boolean }>({ seg: vanAt, t: vanAt === null ? 0 : 1, back: false });
  const clock = useRef(typeof performance === "undefined" ? 0 : performance.now());
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !layers || !sprites) return;
    const ctx = canvas.getContext("2d");
    const base = document.createElement("canvas");
    base.width = canvas.width;
    base.height = canvas.height;
    const b = base.getContext("2d");
    if (!ctx || !b) return;
    b.drawImage(layers.ground, 0, 0);
    // Evidence lines painted on the road, leg by leg, each with a dark casing so it reads on grey roads.
    for (let leg = 0; leg < route.spokes.length; leg++) {
      const spoke = route.spokes[leg] as (typeof route.spokes)[number];
      // the painted stretch starts from the cell before it, so it joins the road it leaves
      const run = [spoke.cells[spoke.cells.length - spoke.line.length - 1] as Cell, ...spoke.line];
      const pts = run.map((c) => ({ x: project(c, tw, origin).x * dpr, y: project(c, tw, origin).y * dpr }));
      const state: HypothesisState = hypotheses[leg]?.state ?? "untested";
      const style = LINE[state];
      const stroke = (color: string, width: number, alpha: number) => {
        b.save();
        b.lineCap = "round";
        b.lineJoin = "round";
        b.strokeStyle = color;
        b.lineWidth = width * (dpr / 2) * (tw / 64);
        b.setLineDash(style.dash.map((d) => d * (dpr / 2) * (tw / 64)));
        b.globalAlpha = alpha;
        b.beginPath();
        pts.forEach((p, i) => (i === 0 ? b.moveTo(p.x, p.y) : b.lineTo(p.x, p.y)));
        b.stroke();
        b.restore();
      };
      stroke("rgba(38, 42, 68, 0.55)", style.width + 4, 1);
      stroke(style.color, style.width, state === "untested" ? 0.9 : 1);
    }
    baseRef.current = base;
    const { gx0, gx1, gy0, gy1 } = visibleCells(w, h, tw, origin);
    paintRef.current = (seconds: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      ctx.drawImage(layers.stand, 0, 0);
      let cars: Drawn[] = [];
      for (const v of city.traffic) {
        const c = vehicleCell(v, seconds, size);
        if (c.gx < gx0 || c.gx > gx1 || c.gy < gy0 || c.gy > gy1) continue;
        const m = sprites.meta[v.sprite];
        const img = sprites.img.get(v.sprite);
        if (!m || !img) continue;
        const at = project(c, tw, origin);
        cars.push({ src: img, x: at.x * dpr - m.ax * scale, y: at.y * dpr - m.ay * scale, w: m.w * scale, h: m.h * scale, key: c.gx + c.gy, sub: c.gx });
      }
      // The delivery van is painted here too, in the same order as everything else, so it goes behind the buildings in
      // front of it like any car.
      const spoke = vanState.current.seg === null ? null : route.spokes[vanState.current.seg];
      const along = spoke ? vanFrame(spoke.cells, vanState.current.t, vanState.current.back) : { cell: route.hub, heading: "0" as const };
      const vanSprite = `car-van-${along.heading}`;
      const vm = sprites.meta[vanSprite];
      const vimg = sprites.img.get(vanSprite);
      const vat = project(along.cell, tw, origin);
      const van: Drawn | null = vm && vimg ? { src: vimg, x: vat.x * dpr - vm.ax * scale, y: vat.y * dpr - vm.ay * scale, w: vm.w * scale, h: vm.h * scale, key: along.cell.gx + along.cell.gy, sub: along.cell.gx } : null;
      // At most so many cars at once, the ones nearest the middle of the screen: the cost stays small and steady.
      if (cars.length > MAX_CARS) {
        const mx = canvas.width / 2;
        const my = canvas.height / 2;
        cars = cars.sort((p, q) => Math.hypot(p.x - mx, p.y - my) - Math.hypot(q.x - mx, q.y - my)).slice(0, MAX_CARS);
      }
      if (van) cars.push(van);
      cars.sort((p, q) => p.key - q.key || p.sub - q.sub);
      // Each car repaints only its own patch of the picture: the background, then every sprite that touches the patch
      // (and any neighbouring car), back to front. A car drives between the buildings: one behind it is painted
      // before it, one in front after it, so it passes behind whatever stands in front of the road.
      for (const car of cars) {
        const x0 = Math.floor(car.x) - 1;
        const y0 = Math.floor(car.y) - 1;
        const x1 = Math.ceil(car.x + car.w) + 1;
        const y1 = Math.ceil(car.y + car.h) + 1;
        const touching = new Set<number>();
        for (const cell of cellsOf({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 })) for (const i of layers.grid.get(cell) ?? []) touching.add(i);
        const parts: Drawn[] = [];
        for (const i of touching) {
          const d = layers.items[i] as Drawn;
          if (d.x < x1 && d.x + d.w > x0 && d.y < y1 && d.y + d.h > y0) parts.push(d);
        }
        for (const other of cars) if (other.x < x1 && other.x + other.w > x0 && other.y < y1 && other.y + other.h > y0) parts.push(other);
        parts.sort((p, q) => p.key - q.key || p.sub - q.sub);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
        ctx.drawImage(base, 0, 0);
        for (const d of parts) ctx.drawImage(d.src, d.x, d.y, d.w, d.h);
        ctx.restore();
      }
    };
    paintRef.current(animate ? (performance.now() - clock.current) / 1000 : 0);
  }, [layers, sprites, route, origin, tw, hypotheses, dpr, scale, city, size, w, h, animate]);

  // The van goes where the player points it: from home out along the chosen road, or back home first and then out
  // along another road. Under reduced motion it is simply there.
  useEffect(() => {
    if (!layers) return;
    const v = vanState.current;
    const settle = () => paintRef.current((performance.now() - clock.current) / 1000);
    if (v.seg === vanAt) return;
    if (!animate) {
      vanState.current = { seg: vanAt, t: vanAt === null ? 0 : 1, back: false };
      settle();
      return;
    }
    let raf = 0;
    const leg = (seg: number | null, from: number, to: number, back: boolean, ms: number, done: () => void) => {
      const started = performance.now();
      const step = (now: number) => {
        const u = Math.min(1, (now - started) / ms);
        vanState.current = { seg, t: from + (to - from) * (u * (2 - u)), back };
        if (u < 1) raf = requestAnimationFrame(step);
        else done();
      };
      raf = requestAnimationFrame(step);
    };
    const out = () => (vanAt === null ? undefined : leg(vanAt, 0, 1, false, 900, () => undefined));
    if (v.seg !== null && v.t > 0) leg(v.seg, v.t, 0, true, 700, () => {
      vanState.current = { seg: vanAt, t: 0, back: false };
      out();
    });
    else {
      vanState.current = { seg: vanAt, t: 0, back: false };
      out();
    }
    return () => cancelAnimationFrame(raf);
  }, [vanAt, layers, animate]);

  // The cars drive: about thirty frames a second, only while the screen shows the map and motion is welcome.
  useEffect(() => {
    if (!animate || !layers) return;
    let raf = 0;
    let last = 0;
    let slow = 0;
    const loop = (now: number) => {
      if (now - last < 33) {
        raf = requestAnimationFrame(loop);
        return;
      }
      last = now;
      const began = performance.now();
      paintRef.current((now - clock.current) / 1000);
      // A device that cannot paint the city in time leaves the cars parked rather than stuttering the whole page.
      slow = performance.now() - began > 24 ? slow + 1 : Math.max(0, slow - 1);
      if (slow < 30) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animate, layers]);

  // Real plate widths: the text is measured in the loaded font, so the layout matches what the page draws.
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => {
    void document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);
  const plates = useMemo(() => {
    const probe = document.createElement("canvas").getContext("2d");
    const small = w < 600; // phone labels have 8 px of side padding (see screens.css)
    if (probe) probe.font = '700 16px "Plus Jakarta Sans", system-ui, sans-serif';
    const widthOf = (name: string): number | undefined => (probe ? Math.ceil(probe.measureText(name).width) + (small ? 16 : 24) : undefined);
    const topOf = (c: Cell, sprite: string): number => {
      const m = sprites?.meta[sprite];
      return project(c, tw, origin).y - (m ? (m.ay * tw) / RENDER_TILE_W : tw);
    };
    const raw = [
      ...city.landmarks.map((l, i) => ({ key: `g${i}`, index: i as number | null, hq: false, name: names[i] ?? `Group ${i + 1}`, x: project(l, tw, origin).x, top: topOf(l, l.sprite), width: widthOf(names[i] ?? `Group ${i + 1}`) })),
      // The company's label hangs just below the home plaza and points up at it, away from the crowd of group labels.
      { key: "hq", index: null as number | null, hq: true, below: true, name: home || "Your company", x: project(city.hq, tw, origin).x, top: project(city.hq, tw, origin).y + tw / 8, width: widthOf(home || "Your company") },
    ];
    // a plate never rides up under the HUD
    return spreadPlates(raw, w, (h < 520 ? 72 : w >= 600 ? 150 : 154) + 6, h < 520);
  }, [city, names, home, sprites, tw, origin, w, h, fontTick]);
  return (
    <div class="world" aria-hidden="false">
      <canvas ref={ref} class={`world__canvas${layers ? " world__canvas--ready" : ""}`} width={Math.round(w * dpr)} height={Math.round(h * dpr)} role="img" aria-label="Map of your route" style={{ width: `${w}px`, height: `${h}px` }} />
      {!layers ? <p class="world__loading" aria-hidden="true">Building the city</p> : null}
      {labels && layers ? (
        <div class="world__layer" aria-hidden="true">
          {plates.map((pl) => (
            <div
              key={pl.key}
              class={`way${pl.hq ? " way--hq way--below" : ""}${pl.index !== null && selected === pl.index ? " way--on" : ""}${pl.index !== null && focus === pl.index ? " way--focus" : ""}`}
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
    </div>
  );
}

