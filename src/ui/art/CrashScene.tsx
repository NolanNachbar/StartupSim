// The one authored moment: a short crash scene above the accident report. The delivery van has stopped on the road,
// debris is scattered around it, smoke rises and flames flicker. The van, road, buildings and debris are the real
// Kenney renders; the smoke and flame shapes are Kenney's particle sprites, tinted with a CSS mask.
import { useEffect, useRef, useState } from "preact/hooks";
import { makeRng } from "./geometry";
import { drawSprite, drawStyled, loadSprites, RENDER_TILE_W, type Loaded } from "./city";
import { project } from "./iso";

interface Props {
  readonly landed: boolean;
  readonly seed: number;
}

const BASE = import.meta.env.BASE_URL;
const W = 560;
const H = 260;
const TW = 112; // ground tile width on screen; the sprites are rendered for a 96 px tile

export function CrashScene({ landed, seed }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fx, setFx] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let live = true;
    const names = ["road-straight-0", "car-van-270", "com-b", "com-d", "sky-c", "tree_oak", "tree_pineTallA", "debris-bumper", "debris-door", "debris-tire", "debris-plate-a", "debris-spoiler-a"];
    void loadSprites(names).then((l: Loaded) => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#7f9f5c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const origin = { x: W / 2, y: 70 };
      const scale = (dpr * TW) / RENDER_TILE_W;
      const at = (gx: number, gy: number) => {
        const p = project({ gx, gy }, TW, origin);
        return { x: p.x * dpr, y: p.y * dpr };
      };
      const rng = makeRng(seed + 9);
      // lawns, then the road along the screen axis, then scenery back to front
      for (let gx = -1; gx <= 5; gx++) {
        for (let gy = 0; gy <= 4; gy++) {
          const c = at(gx, gy);
          ctx.fillStyle = (gx + gy) % 2 === 0 ? "#8fb56a" : "#7a9a58";
          ctx.beginPath();
          ctx.moveTo(c.x, c.y - (TW * dpr) / 4);
          ctx.lineTo(c.x + (TW * dpr) / 2, c.y);
          ctx.lineTo(c.x, c.y + (TW * dpr) / 4);
          ctx.lineTo(c.x - (TW * dpr) / 2, c.y);
          ctx.closePath();
          ctx.fill();
        }
      }
      for (let gx = -1; gx <= 5; gx++) {
        const c = at(gx, 2);
        drawSprite(ctx, l, "road-straight-0", c.x, c.y, scale);
      }
      const scenery: [string, number, number, number][] = [["com-b", 0, 0, 2], ["sky-c", 2, 0, 0], ["com-d", 4, 0, 6], ["tree_oak", 5, 1, 10], ["tree_pineTallA", -1, 1, 11], ["tree_oak", 1, 3, 12], ["tree_pineTallA", 4, 3, 13]];
      for (const [name, gx, gy, tint] of scenery) {
        const c = at(gx, gy);
        const m = l.meta[name];
        const img = l.img.get(name);
        if (m && img) drawStyled(ctx, img, c.x - m.ax * scale, c.y - m.ay * scale, m.w * scale, m.h * scale, tint);
      }
      const van = at(2, 2);
      if (!landed) {
        const bits = ["debris-bumper", "debris-door", "debris-tire", "debris-plate-a", "debris-spoiler-a"];
        bits.forEach((b, i) => {
          const c = at(1 + (i % 3) + rng() * 0.4, 1.7 + (i % 2) * 0.9 + rng() * 0.2);
          drawSprite(ctx, l, b, c.x, c.y, scale);
        });
      }
      drawSprite(ctx, l, "car-van-270", van.x, van.y, scale);
      setFx({ x: (van.x / canvas.width) * 100, y: ((van.y - 34 * dpr) / canvas.height) * 100 });
    });
    return () => {
      live = false;
    };
  }, [landed, seed]);
  return (
    <div class={landed ? "crash crash--landed" : "crash"} aria-hidden="true">
      <canvas ref={ref} width={W} height={H} />
      {!landed && fx ? (
        <>
          <span class="crash__fx crash__flame" style={{ left: `${fx.x - 12}%`, top: `${fx.y - 20}%`, width: "26%", height: "46%", maskImage: `url(${BASE}art/fx/fire_01.webp)`, WebkitMaskImage: `url(${BASE}art/fx/fire_01.webp)` }} />
          <span class="crash__fx crash__flame crash__flame--core" style={{ left: `${fx.x - 6}%`, top: `${fx.y - 12}%`, width: "14%", height: "28%", animationDelay: "120ms", maskImage: `url(${BASE}art/fx/fire_01.webp)`, WebkitMaskImage: `url(${BASE}art/fx/fire_01.webp)` }} />
          <span class="crash__fx crash__smoke" style={{ left: `${fx.x - 6}%`, top: `${fx.y - 24}%`, width: "14%", height: "26%", maskImage: `url(${BASE}art/fx/smoke_04.webp)`, WebkitMaskImage: `url(${BASE}art/fx/smoke_04.webp)` }} />
          <span class="crash__fx crash__smoke" style={{ left: `${fx.x + 2}%`, top: `${fx.y - 30}%`, width: "11%", height: "22%", animationDelay: "700ms", maskImage: `url(${BASE}art/fx/smoke_07.webp)`, WebkitMaskImage: `url(${BASE}art/fx/smoke_07.webp)` }} />
        </>
      ) : null}
    </div>
  );
}

