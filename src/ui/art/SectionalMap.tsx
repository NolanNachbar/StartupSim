// The world: a hand-drawn sectional map that fills the screen behind the game. Terrain, rivers, lakes,
// an airfield for each customer group and a plane that flies the route as weeks pass. Line style still
// carries the evidence language (dotted untested, dashed weak, solid blue verified). All drawn in code.
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Hypothesis, HypothesisState } from "../../sim";
import { countStates } from "../format";
import { legPaths, routeBox, routePoints, terrain } from "./geometry";

const STYLE: Record<HypothesisState, { dash: string | undefined; stroke: string; width: number }> = {
  untested: { dash: "1 11", stroke: "var(--ink)", width: 5 },
  weak: { dash: "14 9", stroke: "var(--ink)", width: 4 },
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
        <radialGradient id="bg" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" style="stop-color:var(--world-a)" />
          <stop offset="1" style="stop-color:var(--world-b)" />
        </radialGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--line)" stroke-width="1" opacity="0.4" />
        </pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <rect width={w} height={h} fill="url(#bg)" />
      <rect width={w} height={h} fill="url(#grid)" />
      {land.lakes.map((d, i) => (
        <path key={i} d={d} fill="color-mix(in srgb, var(--blue) 12%, transparent)" stroke="var(--blue)" stroke-width="1.5" opacity="0.4" />
      ))}
      {land.rivers.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--blue)" stroke-width="3" opacity="0.22" />
      ))}
      {land.contours.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="color-mix(in srgb, var(--blue) 30%, var(--line))" stroke-width="1.4" opacity="0.8" />
      ))}
      {land.trees.map((t, i) => (
        <path key={i} d={`M ${t[0]} ${t[1] - 6} l 5 10 h -10 z`} fill="none" stroke="var(--ok)" stroke-width="1.3" opacity="0.3" />
      ))}
      <g aria-hidden="true">
        <path d={full} ref={pathRef} fill="none" stroke="none" />
        {legs.map((d, i) => {
          const isLast = i === legs.length - 1 && hypotheses.length > 0;
          const st = isLast ? STYLE.untested : STYLE[hypotheses[i]?.state ?? "untested"];
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={st.stroke} stroke-width={st.width * 2.4} opacity="0.22" filter="url(#glow)" />
              <path d={d} fill="none" stroke={st.stroke} stroke-width={st.width} stroke-dasharray={st.dash} stroke-linecap="round" />
            </g>
          );
        })}
        {pts.slice(1, -1).map((p, i) => {
          const name = names[i] ?? `Group ${i + 1}`;
          const left = p[0] > w * 0.5;
          const above = i % 2 === 1;
          const lit = i === focus;
          return (
            <g key={i} transform={`translate(${p[0]} ${p[1]})`} onClick={() => onSelect?.(i)} style={{ pointerEvents: "auto", cursor: "pointer" }}>
              <circle r={26 * u} fill="var(--airspace)" opacity={lit ? 0.4 : 0.22} filter="url(#glow)" />
              <circle r={(selected === i ? 13 : 10) * u} fill="var(--paper-raised)" stroke="var(--airspace)" stroke-width="3.5" />
              <circle r={3.5 * u} fill={lit ? "var(--airspace)" : "var(--ink-soft)"} />
              <text x={left ? -22 : 22} y={above ? -14 : 26} text-anchor={left ? "end" : "start"} font-family="Fraunces, Georgia, serif" font-style="italic" font-size="18" fill="var(--ink)" stroke="var(--paper)" stroke-width="5" paint-order="stroke">{name}</text>
            </g>
          );
        })}
        <g transform={`translate(${dest[0]} ${dest[1]})`}>
          <circle r={22 * u} fill="var(--blue)" opacity="0.28" filter="url(#glow)" />
          <path d={`M 0 0 V ${-34 * u} L ${24 * u} ${-25 * u} L 0 ${-16 * u}`} fill="var(--blue)" stroke="var(--blue)" stroke-width="2.5" stroke-linejoin="round" />
          <circle r={5 * u} fill="var(--paper-raised)" stroke="var(--blue)" stroke-width="3" />
        </g>
        <g class="plane" style={{ transform: `translate(${plane.x}px, ${plane.y}px) rotate(${plane.a}deg) scale(${1.5 * u})` }}>
          <circle r="22" fill="var(--airspace)" opacity="0.3" filter="url(#glow)" />
          <path d="M 13 0 L -9 -9 L -5 0 L -9 9 Z" fill="var(--ink)" stroke="var(--paper)" stroke-width="1.5" stroke-linejoin="round" />
        </g>
      </g>
    </svg>
  );
}
