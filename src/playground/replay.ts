import type { BackwardStep, ForwardStep, KnowledgeBase, WorkingFact } from "@/engine";

/** Working memory after the first `k` forward steps (k = 0 is the initial facts). */
export function memoryAt(kb: KnowledgeBase, steps: ForwardStep[], k: number): WorkingFact[] {
  const memory = new Map<string, WorkingFact>();
  for (const f of kb.facts) {
    if (!memory.has(f.name)) memory.set(f.name, { name: f.name, cf: f.cf, time: memory.size + 1 });
  }
  for (const step of steps.slice(0, k)) {
    const existing = memory.get(step.conclusion);
    if (existing) existing.cf = step.cfAfter;
    else memory.set(step.conclusion, { name: step.conclusion, cf: step.cfAfter, time: memory.size + 1 });
  }
  return [...memory.values()];
}

export interface TreeState {
  /** Nodes visible so far. */
  opened: Set<number>;
  /** Nodes whose result is known. */
  closed: Set<number>;
  /** The node the last replayed event touched, or null before the first event. */
  current: number | null;
}

/** Which tree nodes are visible and resolved after the first `k` backward events. */
export function treeStateAt(steps: BackwardStep[], k: number): TreeState {
  const opened = new Set<number>();
  const closed = new Set<number>();
  let current: number | null = null;
  for (const step of steps.slice(0, k)) {
    (step.event === "open" ? opened : closed).add(step.id);
    current = step.id;
  }
  return { opened, closed, current };
}
