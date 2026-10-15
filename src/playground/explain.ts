import type { ForwardStep, GoalNode, KnowledgeBase, TreeNode } from "@/engine";

/** HOW for forward chaining: the rule firings that established a fact, recursively. */
export interface Derivation {
  fact: string;
  /** CF of the initial fact, or null if the fact was only derived. */
  initialCf: number | null;
  firings: {
    cycle: number;
    rule: string;
    contribution: number;
    premises: Derivation[];
  }[];
}

/**
 * Explains how `fact` got its value within the first `before` steps.
 *
 * A firing's premises were all established by earlier steps, so each recursive call only looks
 * at steps before that firing. The step index strictly decreases, so this always terminates,
 * even with circular rules.
 */
export function howForward(
  kb: KnowledgeBase,
  steps: ForwardStep[],
  fact: string,
  before = steps.length,
): Derivation {
  const rules = new Map(kb.rules.map((r) => [r.name, r]));

  const explain = (name: string, limit: number): Derivation => {
    const own = kb.facts.find((f) => f.name === name);
    const firings = [];
    for (let i = 0; i < limit; i++) {
      const step = steps[i];
      if (step.conclusion !== name) continue;
      const rule = rules.get(step.fired)!;
      firings.push({
        cycle: step.cycle,
        rule: step.fired,
        contribution: step.contribution,
        premises: rule.premises.map((p) => explain(p.name, i)),
      });
    }
    return { fact: name, initialCf: own ? own.cf : null, firings };
  };

  return explain(fact, before);
}

/** WHY for backward chaining: the chain from the top goal down to `id`, both ends included. */
export function whyPath(root: GoalNode, id: number): TreeNode[] {
  const path: TreeNode[] = [];
  const visit = (node: TreeNode): boolean => {
    path.push(node);
    if (node.id === id) return true;
    const children: TreeNode[] = node.kind === "goal" ? node.rules : node.premises;
    for (const child of children) if (visit(child)) return true;
    path.pop();
    return false;
  };
  return visit(root) ? path : [];
}
