import { CF_THRESHOLD, cfAnd, cfCombine, cfRule } from "./cf";
import type { KnowledgeBase, Rule } from "./types";

/** How the engine picks one rule when several can fire. Ties always fall back to rule order. */
export type Strategy = "order" | "specificity" | "recency" | "priority";

export interface WorkingFact {
  name: string;
  cf: number;
  /** When the fact entered working memory: 1, 2, 3… Used by the recency strategy. */
  time: number;
}

/** One recognise–act cycle of the engine. */
export interface ForwardStep {
  /** 1-based cycle number. */
  cycle: number;
  /** Rules that could fire this cycle, ranked by the strategy. The first one fired. */
  conflictSet: string[];
  fired: string;
  conclusion: string;
  /** CF of the rule's IF side: the minimum of its premises. */
  premiseCf: number;
  /** Evidence this firing added: premiseCf × rule CF. */
  contribution: number;
  /** The conclusion's CF before this firing, or null if it was not in working memory. */
  cfBefore: number | null;
  cfAfter: number;
}

export interface ForwardResult {
  steps: ForwardStep[];
  /** Final working memory, in the order facts entered it. */
  facts: WorkingFact[];
}

/**
 * Forward chaining to quiescence.
 *
 * Each cycle: find every rule whose premises all hold (CF above the 0.2 threshold) and
 * that has not fired yet — the conflict set — rank it by the strategy, fire the first.
 * Firing adds the conclusion, or combines the new evidence into its existing CF.
 *
 * Refraction: a rule fires at most once, using its premises' CFs at that moment. Without
 * this, circular rules would keep raising each other's CF forever. With it, there are at
 * most `rules.length` cycles.
 */
export function forwardChain(
  kb: KnowledgeBase,
  { strategy = "order" }: { strategy?: Strategy } = {},
): ForwardResult {
  const memory = new Map<string, WorkingFact>();
  const add = (name: string, cf: number) => memory.set(name, { name, cf, time: memory.size + 1 });
  for (const fact of kb.facts) {
    if (!memory.has(fact.name)) add(fact.name, fact.cf);
  }

  const holds = (name: string) => (memory.get(name)?.cf ?? 0) > CF_THRESHOLD;
  const fired = new Set<string>();
  const steps: ForwardStep[] = [];

  for (;;) {
    const candidates = kb.rules.filter(
      (r) => !fired.has(r.name) && r.premises.every((p) => holds(p.name)),
    );
    if (candidates.length === 0) break;

    // toSorted is a stable sort (as sort has been since ES2019), so ties keep rule order.
    const ranked = candidates.toSorted(compareBy(strategy, memory));
    const rule = ranked[0];
    fired.add(rule.name);

    const premiseCf = cfAnd(rule.premises.map((p) => memory.get(p.name)!.cf));
    const contribution = cfRule(premiseCf, rule.cf);
    const name = rule.conclusion.name;
    const existing = memory.get(name);
    const cfBefore = existing ? existing.cf : null;
    if (existing) {
      existing.cf = cfCombine(existing.cf, contribution);
    } else {
      add(name, contribution);
    }

    steps.push({
      cycle: steps.length + 1,
      conflictSet: ranked.map((r) => r.name),
      fired: rule.name,
      conclusion: name,
      premiseCf,
      contribution,
      cfBefore,
      cfAfter: memory.get(name)!.cf,
    });
  }

  return { steps, facts: [...memory.values()] };
}

/** Negative result means `a` should fire before `b`. */
function compareBy(strategy: Strategy, memory: Map<string, WorkingFact>) {
  return (a: Rule, b: Rule): number => {
    switch (strategy) {
      case "order":
        return 0;
      case "specificity":
        return b.premises.length - a.premises.length;
      case "priority":
        return b.priority - a.priority;
      case "recency": {
        // OPS5-style: compare premise timestamps newest-first, lexicographically.
        const times = (r: Rule) => r.premises.map((p) => memory.get(p.name)!.time).sort((x, y) => y - x);
        const ta = times(a);
        const tb = times(b);
        for (let i = 0; i < Math.min(ta.length, tb.length); i++) {
          if (ta[i] !== tb[i]) return tb[i] - ta[i];
        }
        return tb.length - ta.length;
      }
    }
  };
}
