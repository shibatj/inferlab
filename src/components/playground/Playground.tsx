"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { backwardChain, forwardChain, parse, type ParseError, type Strategy } from "@/engine";
import type { Lang } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n/dictionaries";
import { EXAMPLES, withToggles, type Example } from "@/playground/examples";
import { BackwardView } from "./BackwardView";
import { ForwardView } from "./ForwardView";
import { RuleEditor } from "./RuleEditor";

type Dict = Dictionary["playground"];

interface State {
  exampleId: string;
  source: string;
  mode: "forward" | "backward";
  strategy: Strategy;
  goal: string;
  checked: string[];
}

const STORAGE_KEY = "inferlab:playground:v1";
const STRATEGIES: Strategy[] = ["order", "specificity", "priority", "recency"];

function fromExample(ex: Example): State {
  return {
    exampleId: ex.id,
    source: ex.source,
    mode: ex.mode,
    strategy: ex.strategy ?? "order",
    goal: ex.goals?.[0] ?? "",
    checked: (ex.toggles ?? []).filter((t) => t.checked).map((t) => t.fact),
  };
}

function load(requestedId: string | null): State {
  // A lesson link (?example=car) asks for a specific example and takes precedence.
  const requested = EXAMPLES.find((e) => e.id === requestedId);
  if (requested) return fromExample(requested);
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as State | null;
    if (saved && EXAMPLES.some((e) => e.id === saved.exampleId)) return saved;
  } catch {
    // Unreadable or unavailable storage: start from the first example.
  }
  return fromExample(EXAMPLES[0]);
}

const noopSubscribe = () => () => {};

/**
 * Saved work lives in localStorage, which the server cannot read. Render a placeholder on the
 * server and on the first client pass, then the workbench initialised from storage, so the
 * markup never mismatches during hydration.
 */
export function Playground(props: Props) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const placeholder = <main className="flex-1 bg-bg" />;
  if (!mounted) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <WithRequestedExample {...props} />
    </Suspense>
  );
}

type Props = { lang: Lang; dict: Dict; errorText: Dictionary["errors"] };

/**
 * Reads ?example= with useSearchParams, which is already updated when a client-side <Link>
 * renders this page (window.location is not yet). The key remounts the workbench when the
 * requested example changes, because Cache Components keeps visited pages mounted.
 */
function WithRequestedExample(props: Props) {
  const requested = useSearchParams().get("example");
  return <Workbench key={requested ?? ""} requested={requested} {...props} />;
}

function Workbench({ lang, dict, errorText, requested }: Props & { requested: string | null }) {
  const [state, setState] = useState<State>(() => load(requested));
  /** Replay position: how many steps (forward) or events (backward) are shown. */
  const [k, setK] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Saving is a convenience; ignore storage failures.
    }
  }, [state]);

  const update = (patch: Partial<State>) => {
    setState((s) => ({ ...s, ...patch }));
    setK(0);
  };

  const example = EXAMPLES.find((e) => e.id === state.exampleId) ?? EXAMPLES[0];
  const checked = useMemo(() => new Set(state.checked), [state.checked]);
  const parsed = useMemo(
    () => parse(withToggles(state.source, example.toggles, checked)),
    [state.source, example.toggles, checked],
  );
  const ok = parsed.errors.length === 0;

  // Goals: the example's suggestions first, then every other conclusion in rule order.
  const goals = useMemo(() => {
    const conclusions = parsed.kb.rules.map((r) => r.conclusion.name);
    return [...new Set([...(example.goals ?? []).filter((g) => conclusions.includes(g)), ...conclusions])];
  }, [parsed.kb, example.goals]);
  const goal = goals.includes(state.goal) ? state.goal : (goals[0] ?? "");

  const forward = useMemo(
    () => (ok && state.mode === "forward" ? forwardChain(parsed.kb, { strategy: state.strategy }) : null),
    [ok, state.mode, state.strategy, parsed.kb],
  );
  const backward = useMemo(
    () => (ok && state.mode === "backward" && goal ? backwardChain(parsed.kb, goal) : null),
    [ok, state.mode, goal, parsed.kb],
  );
  const total = forward?.steps.length ?? backward?.steps.length ?? 0;

  const describe = (e: ParseError) => (lang === "th" ? `${errorText[e.code]} (${e.message})` : e.message);

  const select = "rounded-md border border-line bg-panel px-2 py-1.5 text-sm";
  // Separate strings rather than overrides: two bg-* classes on one element would conflict.
  const buttonBase = "rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40";
  const button = `${buttonBase} border-line bg-panel hover:bg-subtle`;
  const primary = `${buttonBase} border-accent bg-accent font-semibold text-white hover:opacity-90`;

  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-6 py-3">
        <label className="flex items-center gap-2 text-sm text-muted">
          {dict.example}
          <select
            className={select}
            value={state.exampleId}
            onChange={(e) => update(fromExample(EXAMPLES.find((x) => x.id === e.target.value)!))}
          >
            {EXAMPLES.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.title[lang]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label={dict.mode.label}>
          {(["forward", "backward"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={state.mode === m}
              onClick={() => update({ mode: m })}
              className={`px-3 py-1.5 ${state.mode === m ? "bg-accent text-white" : "bg-panel hover:bg-subtle"}`}
            >
              {dict.mode[m]}
            </button>
          ))}
        </div>

        {state.mode === "forward" ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            {dict.strategy.label}
            <select
              className={select}
              value={state.strategy}
              onChange={(e) => update({ strategy: e.target.value as Strategy })}
            >
              {STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {dict.strategy[s]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="flex items-center gap-2 text-sm text-muted">
            {dict.goal}
            <select className={`${select} font-mono`} value={goal} onChange={(e) => update({ goal: e.target.value })}>
              {goals.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="mr-2 text-sm tabular-nums text-muted">{fmt(dict.progress, { k, n: total })}</span>
          <button type="button" className={button} onClick={() => setK(0)} disabled={k === 0}>
            {dict.controls.reset}
          </button>
          <button type="button" className={button} onClick={() => setK(k - 1)} disabled={k === 0}>
            {dict.controls.back}
          </button>
          <button type="button" className={button} onClick={() => setK(k + 1)} disabled={k >= total}>
            {dict.controls.step}
          </button>
          <button type="button" className={primary} onClick={() => setK(total)} disabled={k >= total}>
            {dict.controls.run}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(340px,28%)_1fr]">
        <section className="flex min-h-0 flex-col border-r border-line">
          <div className="border-b border-line px-4 py-2">
            <h2 className="text-sm font-semibold">{dict.editor}</h2>
            <p className="text-xs text-muted">{example.description[lang]}</p>
          </div>
          <div className="min-h-0 flex-1">
            <RuleEditor value={state.source} onChange={(source) => update({ source })} describe={describe} />
          </div>
          {example.toggles && (
            <fieldset className="border-t border-line px-4 py-3">
              <legend className="sr-only">{dict.symptoms}</legend>
              <p className="mb-2 text-sm font-semibold">{dict.symptoms}</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {example.toggles.map((t) => (
                  <label key={t.fact} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[var(--accent)]"
                      checked={checked.has(t.fact)}
                      onChange={(e) =>
                        update({
                          checked: e.target.checked
                            ? [...state.checked, t.fact]
                            : state.checked.filter((f) => f !== t.fact),
                        })
                      }
                    />
                    <span>
                      {t.label[lang]} <code className="text-xs text-muted">{t.fact}</code>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <p className="border-t border-line px-4 py-2 text-xs text-muted">{dict.saved}</p>
        </section>

        <section className="min-h-0 bg-bg">
          {!ok ? (
            <div className="m-6 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
              <p className="font-semibold">{fmt(dict.errors, { n: parsed.errors.length })}</p>
              <ul className="mt-2 space-y-1">
                {parsed.errors.slice(0, 5).map((e) => (
                  <li key={`${e.line}:${e.col}`}>
                    <span className="font-mono">
                      {e.line}:{e.col}
                    </span>{" "}
                    {describe(e)}
                  </li>
                ))}
              </ul>
            </div>
          ) : forward ? (
            // A new key per example/goal clears the selected fact or node.
            <ForwardView key={state.exampleId} kb={parsed.kb} result={forward} k={k} dict={dict} />
          ) : backward ? (
            <BackwardView key={`${state.exampleId}:${goal}`} result={backward} k={k} dict={dict} />
          ) : null}
        </section>
      </div>
    </main>
  );
}
