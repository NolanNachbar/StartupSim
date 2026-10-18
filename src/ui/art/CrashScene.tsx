// The one authored moment: a short crash sequence above the accident report. The plane falls, an explosion plays
// (Pixel Shmup frames 4 to 7), and smoke (frame 8) is left. All sprites are the real Kenney art.
import { useEffect, useRef } from "preact/hooks";
import { drawTile, loadSheet, scaleFor, SHIP, SHMUP, Sprite, TOWN } from "./sprites";
import { makeRng } from "./geometry";

interface Props {
  readonly w: number;
  readonly landed: boolean;
  readonly seed: number;
}

const ROWS = 5;

export function CrashScene({ w, landed, seed }: Props) {
  const s = scaleFor(w);
  const bw = Math.min(Math.ceil(Math.min(w, 560) / s), 190);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void loadSheet("town").then((town) => {
      const canvas = ref.current;
      if (cancelled || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const rng = makeRng(seed + 3);
      const cols = Math.ceil(bw / 16);
      for (let ty = 0; ty < ROWS; ty++)
        for (let tx = 0; tx < cols; tx++) drawTile(ctx, town, "town", TOWN.grass[Math.floor(rng() * TOWN.grass.length)] ?? 0, tx * 16, ty * 16);
      for (let tx = 0; tx < cols; tx++) drawTile(ctx, town, "town", TOWN.dirt, tx * 16, 3 * 16);
      for (let k = 0; k < 4; k++) drawTile(ctx, town, "town", TOWN.trees[Math.floor(rng() * TOWN.trees.length)] ?? 3, Math.floor(rng() * cols) * 16, (k % 2) * 16);
    });
    return () => {
      cancelled = true;
    };
  }, [bw, seed]);
  const cx = Math.floor(bw / 2);
  return (
    <div class={landed ? "crash crash--landed" : "crash"} style={{ ["--s" as string]: `${s}px`, width: `${bw * s}px`, height: `${ROWS * 16 * s}px` }} aria-hidden="true">
      <canvas ref={ref} width={bw} height={ROWS * 16} style={{ width: `${bw * s}px`, height: `${ROWS * 16 * s}px` }} />
      {landed ? (
        <Sprite sheet="ships" idx={SHIP.player} scale={s} class="crash__plane crash__plane--landed" style={{ left: `${(cx - 16) * s}px`, top: `${(3 * 16 - 20) * s}px` }} />
      ) : (
        <>
          <Sprite sheet="ships" idx={SHIP.wreck} scale={s} class="crash__plane" style={{ left: `${(cx - 16) * s}px`, top: `${(3 * 16 - 22) * s}px` }} />
          <Sprite sheet="shmup" idx={SHMUP.boom} scale={s} class="crash__boom" style={{ left: `${(cx - 8) * s}px`, top: `${(3 * 16 - 8) * s}px` }} />
        </>
      )}
    </div>
  );
}
