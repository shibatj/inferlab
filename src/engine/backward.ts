import { CF_THRESHOLD, cfAnd, cfCombine, cfRule } from "./cf";
import type { Fact, KnowledgeBase, Rule } from "./types";

/**
 * - proven: belief above the 0.2 threshold
 * - failed: there was something to evaluate (a fact or rules) but belief stayed at or below it
 * - unknown: no fact and no rule concludes this atom — unprovable under the closed world
 * - cycle: the atom is already being proven higher up the tree; circular evidence is ignored
 */
export type GoalStatus = "proven" | "failed" | "unknown" | "cycle";

/** OR node: the goal holds through its fact or through any rule concluding it. */
export interface GoalNode {
  kind: "goal";
  id: number;
  atom: string;
  /** CF of the initial fact for this atom, or null if none was declared. */
  factCf: number | null;
  /** Every rule concluding this atom, in rule order. Empty for cached and cycle nodes. */
  rules: RuleNode[];
  cf: number;
  status: GoalStatus;
  /** Already evaluated elsewhere in the tree; this node reuses that result. */
  cached: boolean;
}

/** AND node: the rule fires only if every premise holds. */
export interface RuleNode {
  kind: "rule";
  id: number;
  rule: string;
  /** Premises evaluated, in order, up to and including the first that failed. */
  premises: GoalNode[];
  /** Premises not evaluated because an earlier one failed. */
  skipped: string[];
  fired: boolean;
  /** Minimum premise CF when the rule fired, else null. */
  premiseCf: number | null;
  /** premiseCf × rule CF when the rule fired, else 0. */
  contribution: number;
}

export type TreeNode = GoalNode | RuleNode;

/** Replay log for the step-by-step view: each node opens when visited and closes when resolved. */
export interface BackwardStep {
  event: "open" | "close";
  id: number;
}

export interface BackwardResult {
  goal: string;
  cf: number;
  proven: boolean;
  tree: GoalNode;
  /** Node ids are assigned in visit order, so `open` events come in increasing id order. */
  steps: BackwardStep[];
}

/**
 * Backward chaining from `goal`, depth-first, trying rules in rule order.
 *
 * Unlike Prolog, the search is exhaustive like MYCIN's: every rule concluding a goal is tried
 * and their evidence is combined, because stopping at the first success would ignore the rest
 * of the evidence and give a different CF. Within one rule, evaluation stops at the first
 * premise that fails (AND short-circuit).
 *
 * Each atom is evaluated once; later occurrences are `cached` nodes. An atom met again while
 * it is still being proven is a `cycle` node with CF 0, so the search always terminates.
 * Goals evaluated inside such a cycle saw incomplete evidence, so they are not cached and
 * are re-evaluated if they come up again.
 */
export function backwardChain(kb: KnowledgeBase, goal: string): BackwardResult {
  const facts = new Map<string, Fact>();
  for (const f of kb.facts) if (!facts.has(f.name)) facts.set(f.name, f);
  const rulesFor = new Map<string, Rule[]>();
  for (const r of kb.rules) {
    const list = rulesFor.get(r.conclusion.name) ?? [];
    list.push(r);
    rulesFor.set(r.conclusion.name, list);
  }

  const cache = new Map<string, { cf: number; status: GoalStatus }>();
  /** Atoms currently being proven, outermost first. */
  const stack: string[] = [];
  /** Atoms whose evaluation was cut short by a cycle back to an atom above them. */
  const partial = new Set<string>();
  const steps: BackwardStep[] = [];
  let nextId = 0;

  const open = <T extends TreeNode>(node: T): T => {
    steps.push({ event: "open", id: node.id });
    return node;
  };
  const close = <T extends TreeNode>(node: T): T => {
    steps.push({ event: "close", id: node.id });
    return node;
  };

  const prove = (atom: string): GoalNode => {
    const fact = facts.get(atom);
    const node = open<GoalNode>({
      kind: "goal",
      id: nextId++,
      atom,
      factCf: fact ? fact.cf : null,
      rules: [],
      cf: 0,
      status: "unknown",
      cached: false,
    });

    const ancestor = stack.indexOf(atom);
    if (ancestor !== -1) {
      // Goals between the ancestor and here were evaluated without the ancestor's final
      // value, so their results are incomplete and must not be reused from the cache.
      for (const a of stack.slice(ancestor + 1)) partial.add(a);
      node.status = "cycle";
      return close(node);
    }
    const known = cache.get(atom);
    if (known) {
      Object.assign(node, known, { cached: true });
      return close(node);
    }

    stack.push(atom);
    const rules = rulesFor.get(atom) ?? [];
    // cfCombine(0, x) === x, so starting from 0 is the same as "no evidence yet".
    let cf = fact ? fact.cf : 0;
    for (const rule of rules) {
      const tried = tryRule(rule);
      node.rules.push(tried);
      if (tried.fired) cf = cfCombine(cf, tried.contribution);
    }
    stack.pop();

    node.cf = cf;
    node.status = !fact && rules.length === 0 ? "unknown" : cf > CF_THRESHOLD ? "proven" : "failed";
    if (!partial.delete(atom)) cache.set(atom, { cf: node.cf, status: node.status });
    return close(node);
  };

  const tryRule = (rule: Rule): RuleNode => {
    const node = open<RuleNode>({
      kind: "rule",
      id: nextId++,
      rule: rule.name,
      premises: [],
      skipped: [],
      fired: false,
      premiseCf: null,
      contribution: 0,
    });
    for (const [i, premise] of rule.premises.entries()) {
      const sub = prove(premise.name);
      node.premises.push(sub);
      if (sub.cf <= CF_THRESHOLD) {
        node.skipped = rule.premises.slice(i + 1).map((p) => p.name);
        return close(node);
      }
    }
    node.fired = true;
    node.premiseCf = cfAnd(node.premises.map((p) => p.cf));
    node.contribution = cfRule(node.premiseCf, rule.cf);
    return close(node);
  };

  const tree = prove(goal);
  return { goal, cf: tree.cf, proven: tree.status === "proven", tree, steps };
}
