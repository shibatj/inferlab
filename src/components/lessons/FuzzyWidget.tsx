"use client";

import { useState } from "react";
import { fmt } from "@/i18n/dictionaries";
import {
  INPUT_SETS,
  LEVELS,
  OUTPUT_SETS,
  RISK,
  TEMPERATURE,
  infer,
  membership,
  type Level,
  type Trapezoid,
} from "@/lessons/fuzzy";
import { useLesson } from "./LessonContext";

// Categorical slots 1–3 of the dataviz reference palette, validated on our surfaces
// (light #ffffff, dark #16181d). Aqua is below 3:1 on light, so every curve is direct-labelled.
const SERIES: Record<Level, string> = { low: "var(--series-1)", medium: "var(--series-2)", high: "var(--series-3)" };

const W = 560;
const H = 150;
const PAD = { left: 32, right: 12, top: 18, bottom: 26 };

function Chart({
  domain,
  sets,
  labels,
  ticks,
  marker,
  fill,
  title,
}: {
  domain: { min: number; max: number };
  sets: Record<Level, Trapezoid>;
  labels: Record<Level, string>;
  ticks: number[];
  marker: number | null;
  /** Shaded area under this curve (the aggregated output). */
  fill?: (x: number) => number;
  title: string;
}) {
  const sx = (x: number) => PAD.left + ((x - domain.min) / (domain.max - domain.min)) * (W - PAD.left - PAD.right);
  const sy = (mu: number) => PAD.top + (1 - mu) * (H - PAD.top - PAD.bottom);
  const path = (f: (x: number) => number) => {
    const n = 200;
    return Array.from({ length: n + 1 }, (_, i) => {
      const x = domain.min + (i / n) * (domain.max - domain.min);
      return `${i ? "L" : "M"}${sx(x).toFixed(1)},${sy(f(x)).toFixed(1)}`;
    }).join("");
  };
  const peak = (t: Trapezoid) => Math.min(Math.max((t.b + t.c) / 2, domain.min + 0.3), domain.max - 0.3);

  return (
    <figure className="m-0">
      <figcaption className="mb-1 text-xs font-semibold text-muted">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {[0, 0.5, 1].map((mu) => (
          <g key={mu}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(mu)} y2={sy(mu)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={sy(mu) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {mu}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={sx(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--muted)">
            {t}
          </text>
        ))}
        {fill && <path d={`${path(fill)}L${sx(domain.max)},${sy(0)}L${sx(domain.min)},${sy(0)}Z`} fill="var(--accent-soft)" />}
        {LEVELS.map((l) => (
          <g key={l}>
            <path d={path((x) => membership(x, sets[l]))} fill="none" stroke={SERIES[l]} strokeWidth={2} />
            <text x={sx(peak(sets[l]))} y={sy(1) - 5} textAnchor="middle" fontSize={11} fill="var(--fg)">
              {labels[l]}
            </text>
          </g>
        ))}
        {marker !== null && (
          <line x1={sx(marker)} x2={sx(marker)} y1={PAD.top - 4} y2={sy(0)} stroke="var(--fg)" strokeWidth={2} strokeDasharray="4 3" />
        )}
      </svg>
    </figure>
  );
}

/** Mamdani inference on one input: move the slider, watch rules fire, clip, aggregate and defuzzify. */
export function FuzzyWidget() {
  const { dict } = useLesson();
  const t = dict.fuzzy;
  const [temp, setTemp] = useState(37.6);
  const result = infer(temp);

  return (
    <section className="fuzzy-viz not-prose my-8 space-y-4 rounded-xl border border-line bg-panel p-5">
      <label className="flex items-center gap-3 text-sm">
        <span className="font-semibold">{t.temperature}</span>
        <input
          type="range"
          min={TEMPERATURE.min}
          max={TEMPERATURE.max}
          step={0.1}
          value={temp}
          onChange={(e) => setTemp(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-16 text-right font-mono tabular-nums">{temp.toFixed(1)} °C</span>
      </label>

      <Chart
        title={t.input}
        domain={TEMPERATURE}
        sets={INPUT_SETS}
        labels={t.sets}
        ticks={[35, 36, 37, 38, 39, 40, 41, 42]}
        marker={temp}
      />

      <table className="w-full text-sm">
        <tbody>
          {LEVELS.map((l) => (
            <tr key={l} className="border-t border-line">
              <td className="py-1">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: SERIES[l] }} />
                {fmt(t.rule, { in: t.sets[l], out: t.outSets[l] })}
              </td>
              <td className={`py-1 text-right tabular-nums ${result.degrees[l] > 0 ? "font-semibold" : "text-muted"}`}>
                {fmt(t.degree, { d: result.degrees[l].toFixed(2) })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Chart
        title={t.output}
        domain={RISK}
        sets={OUTPUT_SETS}
        labels={t.outSets}
        ticks={[0, 20, 40, 60, 80, 100]}
        marker={result.crisp}
        fill={result.aggregate}
      />
      <p className="text-sm font-semibold">{result.crisp === null ? t.none : fmt(t.crisp, { v: result.crisp.toFixed(1) })}</p>
    </section>
  );
}
