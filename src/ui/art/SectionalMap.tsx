// The world: a hand-drawn sectional map that fills the screen behind the game. Terrain, rivers, lakes,
// an airfield for each customer group and a plane that flies the route as weeks pass. Line style still
// carries the evidence language (dotted untested, dashed weak, solid blue verified). All drawn in code.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { countStates } from "../format";
import { legPaths, routeBox, routePoints, terrain } from "./geometry";

const STYLE: Record<HypothesisState, { dash: string | undefined; stroke: string; width: number }> = {
  untested: { dash: "1 9", stroke: "var(--ink-soft)", width: 4 },
  weak: { dash: "12 8", stroke: "var(--ink-soft)", width: 4 },
  verified: { dash: undefined, stroke: "var(--blue)", width: 5 },
};

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
  readonly onSelect?: (i: number) => void;
}

export function SectionalMap({ hypotheses, names, focus, seed, progress, selected, w, h, onSelect }: Props) {
  const n = Math.max(hypotheses.length, 1);
  const pts = useMemo(() => routePoints(n, seed, w, h, routeBox(w)), [n, seed, w, h]);
  const legs = useMemo(() => legPaths(pts), [pts]);
  const land = useMemo(() => terrain(seed, w, h), [seed, w, h]);
  const full = legs.map((d, i) => (i === 0 ? d : d.replace(/^M [\d.]+ [\d.]+ /, ""))).join(" ");
  const pathRef = useRef<SVGPathElement>(null);
  const [plane, setPlane] = useState<{ x: number; y: number; a: number }>({ x: pts[0]![0], y: pts[0]![1], a: -45 });

  useEffect(() => {
    const path = pathRef.current;
    if (!path || typeof path.getTotalLength !== "function") return;
    const len = path.getTotalLength();
    const at = Math.min(len, Math.max(0, len * progress));
    const p = path.getPointAtLength(at);
    const q = path.getPointAtLength(Math.min(len, at + 1));
    setPlane({ x: p.x, y: p.y, a: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI });
  }, [progress, full]);

  const summary = hypotheses.length === 0 ? "No hypotheses yet." : countStates(hypotheses);
  const dest = pts[pts.length - 1]!;
  const u = Math.min(1.4, Math.max(1, Math.min(w, h) / 420));
  return (
    <svg class="world" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Route chart. ${summary}.`}>
      <defs>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--line)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="var(--paper-raised)" />
      <rect width={w} height={h} fill="url(#grid)" />
      {land.lakes.map((d, i) => (
        <path key={i} d={d} fill="color-mix(in srgb, var(--blue) 18%, transparent)" stroke="var(--blue)" stroke-width="1.5" opacity="0.7" />
      ))}
      {land.rivers.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--blue)" stroke-width="2" opacity="0.45" />
      ))}
      {land.contours.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--line)" stroke-width="1.6" />
      ))}
      {land.trees.map((t, i) => (
        <path key={i} d={`M ${t[0]} ${t[1] - 6} l 5 10 h -10 z`} fill="none" stroke="var(--ok)" stroke-width="1.4" opacity="0.55" />
      ))}
      <g aria-hidden="true">
        <path d={full} ref={pathRef} fill="none" stroke="none" />
        {legs.map((d, i) => {
          const isLast = i === legs.length - 1 && hypotheses.length > 0;
          const s = isLast ? STYLE.untested : STYLE[hypotheses[i]?.state ?? "untested"];
          return <path key={i} d={d} fill="none" stroke={s.stroke} stroke-width={s.width} stroke-dasharray={s.dash} stroke-linecap="round" />;
        })}
        {pts.slice(1, -1).map((p, i) => {
          const name = names[i] ?? `Group ${i + 1}`;
          const left = p[0] > w * 0.5;
          const above = i % 2 === 1;
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]})`} onClick={() => onSelect?.(i)} style={{ pointerEvents: "auto", cursor: "pointer" }}>
              <circle r={(selected === i ? 15 : 11) * u} fill="var(--paper-raised)" stroke={i === focus ? "var(--airspace)" : "var(--ink)"} stroke-width="3" />
              <path d={`M ${-7 * u} 0 H ${7 * u} M 0 ${-7 * u} V ${7 * u}`} stroke={i === focus ? "var(--airspace)" : "var(--ink)"} stroke-width="2" />
              <text x={left ? -20 : 20} y={above ? -14 : 24} text-anchor={left ? "end" : "start"} font-size="17" fill="var(--ink)" stroke="var(--paper-raised)" stroke-width="5" paint-order="stroke">{name}</text>
            </g>
          );
        })}
        <g transform={`translate(${dest[0]} ${dest[1]})`}>
          <path d={`M 0 0 V ${-34 * u} L ${24 * u} ${-25 * u} L 0 ${-16 * u}`} fill="var(--paper-raised)" stroke="var(--airspace)" stroke-width="3" stroke-linejoin="round" />
          <circle r={6 * u} fill="var(--paper-raised)" stroke="var(--airspace)" stroke-width="3" />
        </g>
        <g class="plane" style={{ transform: `translate(${plane.x}px, ${plane.y}px) rotate(${plane.a}deg) scale(${1.5 * u})` }}>
          <path d="M 13 0 L -9 -9 L -5 0 L -9 9 Z M -3 0 L -12 -3 M -3 0 L -12 3" fill="var(--ink)" stroke="var(--paper-raised)" stroke-width="1.5" stroke-linejoin="round" />
        </g>
      </g>
    </svg>
  );
}
