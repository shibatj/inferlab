"use client";

import { useEffect, useRef, useState } from "react";
import type { ForwardResult, KnowledgeBase } from "@/engine";
import { fmt, formatCf, type Dictionary } from "@/i18n/dictionaries";
import { howForward, type Derivation } from "@/playground/explain";
import { memoryAt } from "@/playground/replay";

type Dict = Dictionary["playground"];

export function ForwardView({ kb, result, k, dict }: { kb: KnowledgeBase; result: ForwardResult; k: number; dict: Dict }) {
  const [selected, setSelected] = useState<string | null>(null);
  const shown = result.steps.slice(0, k);
  const memory = memoryAt(kb, result.steps, k);
  const latest = shown.at(-1)?.conclusion;
  const done = k === result.steps.length && (k > 0 || result.steps.length === 0);

  const end = useRef<HTMLLIElement>(null);
  // Braces matter: newer browsers return a Promise from scrollIntoView, and React would
  // treat a returned value as the effect's cleanup function.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [k]);

  return (
    <div className="grid h-full grid-cols-[1fr_340px]">
      <div className="min-h-0 overflow-y-auto p-6">
        <h2 className="mb-3 text-sm font-semibold">{dict.log.title}</h2>
        {k === 0 && !done && <p className="text-sm text-muted">{dict.log.empty}</p>}
        <ol className="space-y-3">
          {shown.map((s, i) => (
            <li
              key={s.cycle}
              ref={i === shown.length - 1 && !done ? end : undefined}
              className={`rounded-lg border bg-panel p-3 text-sm ${i === shown.length - 1 ? "border-accent" : "border-line"}`}
            >
              <div className="font-semibold">{fmt(dict.log.cycle, { n: s.cycle })}</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-muted">{dict.log.conflictSet}:</span>
                {s.conflictSet.map((name, j) => (
                  <span
                    key={name}
                    className={`rounded px-1.5 py-0.5 font-mono text-xs ${j === 0 ? "bg-accent text-white" : "bg-subtle text-muted"}`}
                  >
                    {name}
                  </span>
                ))}
              </div>
              <div className="mt-1.5">
                <span className="font-mono">{fmt(dict.log.fired, { rule: s.fired })}</span>
                {" → "}
                {s.cfBefore === null
                  ? fmt(dict.log.added, { fact: s.conclusion, cf: formatCf(s.cfAfter) })
                  : fmt(dict.log.updated, { fact: s.conclusion, before: formatCf(s.cfBefore), after: formatCf(s.cfAfter) })}
              </div>
            </li>
          ))}
          {done && (
            <li ref={end} className="rounded-lg border border-ok bg-ok-soft p-3 text-sm text-ok">
              {dict.log.done}
            </li>
          )}
        </ol>
      </div>

      <aside className="flex min-h-0 flex-col border-l border-line bg-panel">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold">{dict.memory.title}</h2>
          <p className="mb-2 text-xs text-muted">{dict.memory.hint}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 font-medium">{dict.memory.time}</th>
                <th className="py-1 font-medium">{dict.memory.fact}</th>
                <th className="py-1 text-right font-medium">{dict.memory.cf}</th>
              </tr>
            </thead>
            <tbody>
              {memory.map((f) => (
                <tr
                  key={f.name}
                  onClick={() => setSelected(f.name)}
                  className={`cursor-pointer border-t border-line ${
                    selected === f.name ? "bg-accent-soft" : f.name === latest ? "bg-ok-soft" : "hover:bg-subtle"
                  }`}
                >
                  <td className="py-1 tabular-nums text-muted">{f.time}</td>
                  <td className="py-1 font-mono">{f.name}</td>
                  <td className="py-1 text-right tabular-nums">{formatCf(f.cf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && (
          <div className="max-h-[45%] overflow-y-auto border-t border-line p-4">
            <h2 className="mb-2 text-sm font-semibold">
              {dict.how.title}: <span className="font-mono">{selected}</span>
            </h2>
            <HowTree d={howForward(kb, result.steps, selected, k)} dict={dict} />
          </div>
        )}
      </aside>
    </div>
  );
}

function HowTree({ d, dict }: { d: Derivation; dict: Dict }) {
  if (d.initialCf === null && d.firings.length === 0) return <p className="text-sm text-muted">{dict.how.none}</p>;
  return (
    <ul className="space-y-1 text-sm">
      {d.initialCf !== null && <li className="text-muted">• {fmt(dict.how.initial, { cf: formatCf(d.initialCf) })}</li>}
      {d.firings.map((f) => (
        <li key={f.cycle}>
          • {fmt(dict.how.firing, { cycle: f.cycle, rule: f.rule, cf: formatCf(f.contribution) })}
          <ul className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
            {f.premises.map((p) => (
              <li key={p.fact}>
                <span className="font-mono font-semibold">{p.fact}</span>
                <HowTree d={p} dict={dict} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
