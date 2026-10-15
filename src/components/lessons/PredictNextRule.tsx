"use client";

import { useMemo } from "react";
import { forwardChain, parse, type Strategy } from "@/engine";
import { fmt, formatCf } from "@/i18n/dictionaries";
import { memoryAt } from "@/playground/replay";
import { useLesson } from "./LessonContext";
import { QuizShell } from "./Quiz";

/**
 * "Which rule fires next?" — the real engine both sets up the question and marks it.
 * Shows working memory and the conflict set (in source order) before cycle `cycle`.
 */
export function PredictNextRule({
  id,
  source,
  strategy,
  cycle = 1,
}: {
  id: string;
  source: string;
  strategy: Strategy;
  /** 1-based cycle to ask about. */
  cycle?: number;
}) {
  const { dict, strategies } = useLesson();
  const { kb, step, memory } = useMemo(() => {
    const { kb, errors } = parse(source);
    if (errors.length) throw new Error(`PredictNextRule ${id}: ${errors[0].message} (line ${errors[0].line})`);
    const { steps } = forwardChain(kb, { strategy });
    const step = steps[cycle - 1];
    if (!step) throw new Error(`PredictNextRule ${id}: there is no cycle ${cycle}`);
    return { kb, step, memory: memoryAt(kb, steps, cycle - 1) };
  }, [id, source, strategy, cycle]);

  // Offer the conflict set in source order so the order itself gives nothing away.
  const options = kb.rules.filter((r) => step.conflictSet.includes(r.name));
  const answer = options.findIndex((r) => r.name === step.fired);
  const ruleText = (name: string) => {
    const r = kb.rules.find((x) => x.name === name)!;
    const extra = [r.cf !== 1 && `CF ${r.cf}`, r.priority !== 0 && `PRIORITY ${r.priority}`].filter(Boolean).join(" ");
    return `${r.name}: IF ${r.premises.map((p) => p.name).join(" AND ")} THEN ${r.conclusion.name}${extra ? ` ${extra}` : ""}`;
  };

  return (
    <QuizShell
      id={id}
      label={dict.predict.label}
      question={fmt(dict.predict.question, { strategy: strategies[strategy] })}
      options={options.map((r) => (
        <code key={r.name} className="font-mono text-[13px]">
          {ruleText(r.name)}
        </code>
      ))}
      answer={answer}
      explanation={fmt(dict.predict.ranking, { list: step.conflictSet.join(" > ") })}
    >
      <div className="mb-3">
        <p className="mb-1 text-xs text-muted">{dict.predict.memory}</p>
        <div className="flex flex-wrap gap-1.5">
          {memory.map((f) => (
            <span key={f.name} className="rounded bg-subtle px-2 py-0.5 font-mono text-xs">
              {f.time}. {f.name}
              {f.cf !== 1 && ` (${formatCf(f.cf)})`}
            </span>
          ))}
        </div>
      </div>
    </QuizShell>
  );
}
