"use client";

import { useState } from "react";
import { fmt } from "@/i18n/dictionaries";
import { NET, PROPERTIES, lookup, slots } from "@/lessons/knowledge-net";
import { useLesson } from "./LessonContext";

// Fixed positions for the eight concepts: root on top, one row per level.
const POS: Record<string, { x: number; y: number }> = {
  animal: { x: 330, y: 30 },
  bird: { x: 170, y: 115 },
  fish: { x: 490, y: 115 },
  canary: { x: 90, y: 200 },
  ostrich: { x: 250, y: 200 },
  shark: { x: 410, y: 200 },
  salmon: { x: 570, y: 200 },
  tweety: { x: 90, y: 285 },
};

const select = "rounded-md border border-line bg-panel px-2 py-1 font-mono text-sm";

/** Semantic network: ask "does X have P?" and watch the lookup climb isA links. */
export function SemanticNetWidget() {
  const { dict } = useLesson();
  const [concept, setConcept] = useState("tweety");
  const [property, setProperty] = useState("has_skin");
  const result = lookup(concept, property);
  const onPath = new Set(result.path);

  return (
    <section className="not-prose my-8 rounded-xl border border-line bg-panel p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{dict.net.ask}</span>
        <select className={select} value={concept} onChange={(e) => setConcept(e.target.value)}>
          {NET.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <span className="font-mono">.</span>
        <select className={select} value={property} onChange={(e) => setProperty(e.target.value)}>
          {PROPERTIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <svg viewBox="0 0 660 320" className="w-full" role="img" aria-label="semantic network">
        {NET.filter((c) => c.isA).map((c) => {
          const from = POS[c.name];
          const to = POS[c.isA!];
          const active = onPath.has(c.name) && onPath.has(c.isA!);
          return (
            <g key={c.name}>
              <line
                x1={from.x}
                y1={from.y - 14}
                x2={to.x}
                y2={to.y + 14}
                stroke={active ? "var(--accent)" : "var(--line)"}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <text x={(from.x + to.x) / 2 + 6} y={(from.y + to.y) / 2} fontSize={10} fill="var(--muted)">
                isA
              </text>
            </g>
          );
        })}
        {NET.map((c) => {
          const p = POS[c.name];
          const found = result.from === c.name;
          return (
            <g key={c.name} onClick={() => setConcept(c.name)} className="cursor-pointer">
              <rect
                x={p.x - 52}
                y={p.y - 14}
                width={104}
                height={28}
                rx={6}
                fill={found ? "var(--ok-soft)" : onPath.has(c.name) ? "var(--accent-soft)" : "var(--panel)"}
                stroke={found ? "var(--ok)" : onPath.has(c.name) ? "var(--accent)" : "var(--line)"}
                strokeWidth={found ? 2 : 1.5}
              />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={13} fontFamily="var(--font-geist-mono)" fill="var(--fg)">
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      <p className={`mt-2 text-sm ${result.value === null ? "text-bad" : "text-ok"}`}>
        {result.value === null
          ? fmt(dict.net.notFound, { concept, property, root: result.path.at(-1)! })
          : fmt(dict.net.result, { concept, property, value: result.value, from: result.from!, hops: result.hops })}
      </p>
    </section>
  );
}

/** Frames: the same knowledge as slot tables, showing inherited and overridden values. */
export function FramesWidget() {
  const { dict } = useLesson();
  const [name, setName] = useState("ostrich");
  const frame = NET.find((c) => c.name === name)!;

  return (
    <section className="not-prose my-8 rounded-xl border border-line bg-panel p-5">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <span className="font-semibold">{dict.frames.pick}</span>
        <select className={select} value={name} onChange={(e) => setName(e.target.value)}>
          {NET.map((c) => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        {frame.isA && <span className="font-mono text-muted">isA {frame.isA}</span>}
      </label>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="py-1 font-medium">{dict.frames.slot}</th>
            <th className="py-1 font-medium">{dict.frames.value}</th>
            <th className="py-1 font-medium">{dict.frames.from}</th>
          </tr>
        </thead>
        <tbody>
          {slots(name).map((s) => (
            <tr key={s.slot} className={`border-t border-line ${s.from === name ? "font-semibold" : ""}`}>
              <td className="py-1 font-mono">{s.slot}</td>
              <td className="py-1 font-mono">{s.value}</td>
              <td className="py-1">
                {s.from === name ? dict.frames.own : <span className="font-mono text-muted">{s.from}</span>}
                {s.overrides && (
                  <span className="ml-2 rounded bg-warn-soft px-1.5 py-0.5 text-xs text-warn">
                    {fmt(dict.frames.overrides, { name: s.overrides })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
