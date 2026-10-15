"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { CF_THRESHOLD, type ParseError } from "@/engine";
import { exerciseById, exerciseProgressId } from "@/exercises/exercises";
import { grade, type GradeResult, type TestCase } from "@/exercises/grader";
import type { Lang } from "@/i18n/config";
import { fmt, formatCf, type Dictionary } from "@/i18n/dictionaries";
import { markCorrect } from "@/lessons/progress";
import { RuleEditor } from "../playground/RuleEditor";

type Dict = Dictionary["exercises"];

const storageKey = (id: string) => `inferlab:exercise:${id}:v1`;
const noopSubscribe = () => () => {};

/** Like the playground, render after mount so the saved draft can seed the editor. */
export function ExerciseWorkbench(props: { id: string; lang: Lang; dict: Dict; errorText: Dictionary["errors"] }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <div className="min-h-0 flex-1" />;
  return <Workbench {...props} />;
}

function Workbench({ id, lang, dict, errorText }: { id: string; lang: Lang; dict: Dict; errorText: Dictionary["errors"] }) {
  const exercise = exerciseById(id)!;
  const [source, setSource] = useState(() => {
    try {
      return localStorage.getItem(storageKey(id)) ?? exercise.starter;
    } catch {
      return exercise.starter;
    }
  });
  const [result, setResult] = useState<GradeResult | null>(null);

  const edit = (next: string) => {
    setSource(next);
    setResult(null);
    try {
      localStorage.setItem(storageKey(id), next);
    } catch {
      // Drafts are a convenience; ignore storage failures.
    }
  };

  const run = () => {
    const r = grade(source, exercise.mode, exercise.tests, exercise.hidden);
    setResult(r);
    if (r.kind === "graded" && r.passed) markCorrect(exerciseProgressId(id));
  };

  const describe = (e: ParseError) => (lang === "th" ? `${errorText[e.code]} (${e.message})` : e.message);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(380px,40%)_1fr]">
      <section className="flex min-h-0 flex-col border-r border-line">
        <div className="min-h-0 flex-1">
          <RuleEditor value={source} onChange={edit} describe={describe} />
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={run}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {dict.run}
          </button>
          <button
            type="button"
            onClick={() => edit(exercise.starter)}
            className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm hover:bg-subtle"
          >
            {dict.reset}
          </button>
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto p-6">
        <h2 className="mb-2 text-sm font-semibold">{dict.task}</h2>
        <div className="space-y-3 text-[15px] leading-relaxed">
          {exercise.task[lang].split("\n\n").map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <h2 className="mt-8 mb-3 text-sm font-semibold">{dict.results}</h2>
        <Results result={result} exercise={exercise} dict={dict} />
      </section>
    </div>
  );
}

function Results({
  result,
  exercise,
  dict,
}: {
  result: GradeResult | null;
  exercise: { tests: TestCase[] };
  dict: Dict;
}) {
  if (!result) {
    return (
      <ol className="space-y-2">
        {exercise.tests.map((t, i) => (
          <li key={i} className="rounded-lg border border-line bg-panel p-3 text-sm">
            <TestDetail n={i + 1} test={t} dict={dict} />
          </li>
        ))}
        <li className="text-sm text-muted">{dict.notRun}</li>
      </ol>
    );
  }
  if (result.kind === "errors") {
    return <p className="rounded-lg border border-bad bg-bad-soft p-3 text-sm text-bad">{fmt(dict.errors, { n: result.errors.length })}</p>;
  }
  if (result.kind === "has-facts") {
    return <p className="rounded-lg border border-bad bg-bad-soft p-3 text-sm text-bad">{fmt(dict.hasFacts, { line: result.line })}</p>;
  }

  const passedCount = result.cases.filter((c) => c.passed).length;
  let hiddenIndex = 0;
  return (
    <div className="space-y-3">
      <p
        role="status"
        className={`rounded-lg border p-3 text-sm font-semibold ${
          result.passed ? "border-ok bg-ok-soft text-ok" : "border-line bg-panel"
        }`}
      >
        {result.passed ? dict.allPassed : fmt(dict.summary, { passed: passedCount, total: result.cases.length })}
      </p>
      <ol className="space-y-2">
        {result.cases.map((c, i) => {
          const badge = (
            <span className={`ml-auto font-semibold ${c.passed ? "text-ok" : "text-bad"}`}>
              {c.passed ? `✓ ${dict.passed}` : `✗ ${dict.failed}`}
            </span>
          );
          if (c.hidden) {
            hiddenIndex++;
            return (
              <li key={i} className="flex rounded-lg border border-line bg-panel p-3 text-sm">
                {fmt(dict.hiddenTest, { n: hiddenIndex })}
                {badge}
              </li>
            );
          }
          return (
            <li key={i} className={`rounded-lg border bg-panel p-3 text-sm ${c.passed ? "border-line" : "border-bad"}`}>
              <TestDetail n={i + 1} test={exercise.tests[i]} got={c.got} dict={dict} badge={badge} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TestDetail({
  n,
  test,
  got,
  dict,
  badge,
}: {
  n: number;
  test: TestCase;
  got?: Record<string, number>;
  dict: Dict;
  badge?: ReactNode;
}) {
  const show = (value: boolean | number) =>
    typeof value === "number" ? `CF ${formatCf(value)}` : value ? dict.concluded : dict.notConcluded;
  return (
    <>
      <div className="flex font-semibold">
        {fmt(dict.test, { n })}
        {badge}
      </div>
      <div className="mt-1 text-muted">
        {dict.facts}: <span className="font-mono">{test.facts.length ? test.facts.join(", ") : dict.none}</span>
      </div>
      <table className="mt-2 w-full">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="font-medium" />
            <th className="font-medium">{dict.expected}</th>
            {got && <th className="font-medium">{dict.got}</th>}
          </tr>
        </thead>
        <tbody>
          {Object.entries(test.expect).map(([atom, exp]) => (
            <tr key={atom} className="border-t border-line">
              <td className="py-1 font-mono">{atom}</td>
              <td className="py-1">{show(exp)}</td>
              {got && <td className="py-1">{typeof exp === "number" ? `CF ${formatCf(got[atom])}` : show(got[atom] > CF_THRESHOLD)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
