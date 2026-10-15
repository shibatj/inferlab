import type { KnowledgeBase } from "./types";

/** One recognise–act cycle of the engine. */
export interface ForwardStep {
  /** 1-based cycle number. */
  cycle: number;
  /** Names of rules whose premises all hold and that have not fired yet, in rule order. */
  conflictSet: string[];
  /** The rule chosen from the conflict set and fired this cycle. */
  fired: string;
  /** The fact this rule added, or null when its conclusion was already in working memory. */
  added: string | null;
}

export interface ForwardResult {
  steps: ForwardStep[];
  /** Final working memory, in the order facts entered it. */
  facts: string[];
}

/**
 * Forward chaining to quiescence.
 *
 * Each cycle: match every rule against working memory, build the conflict set, pick the
 * first rule in source order, fire it. Refraction: a rule fires at most once. In a
 * propositional system facts are never retracted, so a rule's single instantiation never
 * changes and "once per instantiation" is the same as "once per rule".
 *
 * Termination: every cycle fires a distinct rule, so there are at most `rules.length` cycles.
 */
export function forwardChain(kb: KnowledgeBase): ForwardResult {
  const memory = new Set<string>(kb.facts.map((f) => f.name));
  const fired = new Set<string>();
  const steps: ForwardStep[] = [];

  for (;;) {
    const conflictSet = kb.rules.filter(
      (r) => !fired.has(r.name) && r.premises.every((p) => memory.has(p.name)),
    );
    if (conflictSet.length === 0) break;

    const rule = conflictSet[0];
    fired.add(rule.name);
    const conclusion = rule.conclusion.name;
    const isNew = !memory.has(conclusion);
    memory.add(conclusion);

    steps.push({
      cycle: steps.length + 1,
      conflictSet: conflictSet.map((r) => r.name),
      fired: rule.name,
      added: isNew ? conclusion : null,
    });
  }

  return { steps, facts: [...memory] };
}
