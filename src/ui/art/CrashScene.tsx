// The one authored moment: a short crash scene above the accident report. The delivery van has stopped on the road,
// debris is scattered around it, smoke rises and flames flicker. The van, road, buildings and debris are the real
// Kenney renders; the smoke and flame shapes are Kenney's particle sprites, tinted with a CSS mask.
import { useEffect, useRef, useState } from "preact/hooks";
import { makeRng } from "./geometry";
import { drawSprite, loadSprites, type Loaded } from "./city";
import { project } from "./iso";

interface Props {
  readonly landed: boolean;
  readonly seed: number;
}

const BASE = import.meta.env.BASE_URL;
const W = 560;
const H = 260;
const TW = 128;

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
      ctx.fillStyle = "#86c05f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const origin = { x: W / 2, y: 70 };
      const scale = dpr;
      const at = (gx: number, gy: number) => {
        const p = project({ gx, gy }, TW, origin);
        return { x: p.x * dpr, y: p.y * dpr };
      };
      const rng = makeRng(seed + 9);
      // lawns, then the road along the screen axis, then scenery back to front
      for (let gx = -1; gx <= 5; gx++) {
        for (let gy = 0; gy <= 4; gy++) {
          const c = at(gx, gy);
          ctx.fillStyle = (gx + gy) % 2 === 0 ? "#86c05f" : "#82bc5a";
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
      const scenery: [string, number, number][] = [["com-b", 0, 0], ["sky-c", 2, 0], ["com-d", 4, 0], ["tree_oak", 5, 1], ["tree_pineTallA", -1, 1], ["tree_oak", 1, 4], ["tree_pineTallA", 4, 4]];
      for (const [name, gx, gy] of scenery) {
        const c = at(gx, gy);
        drawSprite(ctx, l, name, c.x, c.y, scale);
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
          <span class="crash__fx crash__flame" style={{ left: `${fx.x - 4}%`, top: `${fx.y - 6}%`, width: "9%", height: "18%", maskImage: `url(${BASE}art/fx/flame_03.webp)`, WebkitMaskImage: `url(${BASE}art/fx/flame_03.webp)` }} />
          <span class="crash__fx crash__smoke" style={{ left: `${fx.x - 6}%`, top: `${fx.y - 24}%`, width: "14%", height: "26%", maskImage: `url(${BASE}art/fx/smoke_04.webp)`, WebkitMaskImage: `url(${BASE}art/fx/smoke_04.webp)` }} />
          <span class="crash__fx crash__smoke" style={{ left: `${fx.x + 2}%`, top: `${fx.y - 30}%`, width: "11%", height: "22%", animationDelay: "700ms", maskImage: `url(${BASE}art/fx/smoke_07.webp)`, WebkitMaskImage: `url(${BASE}art/fx/smoke_07.webp)` }} />
        </>
      ) : null}
    </div>
  );
}

