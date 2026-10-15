import { CF_THRESHOLD, backwardChain, forwardChain, parse, type ParseError } from "@/engine";

/**
 * One test case: facts to add, and what must hold afterwards.
 * - `true`: the atom must be concluded (CF above the 0.2 threshold)
 * - `false`: the atom must not be concluded
 * - a number: the atom's CF must be within ±0.05 of it
 */
export interface TestCase {
  facts: string[];
  expect: Record<string, boolean | number>;
}

export const CF_TOLERANCE = 0.05;

export interface CaseResult {
  hidden: boolean;
  passed: boolean;
  /** The CF each expected atom ended with (0 when not concluded). */
  got: Record<string, number>;
}

export type GradeResult =
  | { kind: "errors"; errors: ParseError[] }
  /** The learner declared facts; tests supply their own, so this is not allowed. */
  | { kind: "has-facts"; line: number }
  | { kind: "graded"; cases: CaseResult[]; passed: boolean };

/** `fact x CF 0.5` lines are written as "x CF 0.5" in test data. */
const factLines = (facts: string[]) => facts.map((f) => `fact ${f}`).join("\n");

function runCase(source: string, mode: "forward" | "backward", test: TestCase): Record<string, number> {
  // Facts go after the learner's rules so error line numbers still match the editor.
  const { kb } = parse(`${source}\n${factLines(test.facts)}\n`);
  const atoms = Object.keys(test.expect);
  if (mode === "forward") {
    const memory = new Map(forwardChain(kb).facts.map((f) => [f.name, f.cf]));
    return Object.fromEntries(atoms.map((a) => [a, memory.get(a) ?? 0]));
  }
  return Object.fromEntries(atoms.map((a) => [a, backwardChain(kb, a).cf]));
}

export function check(expected: boolean | number, cf: number): boolean {
  if (expected === true) return cf > CF_THRESHOLD;
  if (expected === false) return cf <= CF_THRESHOLD;
  return Math.abs(cf - expected) <= CF_TOLERANCE + 1e-9;
}

export function grade(
  source: string,
  mode: "forward" | "backward",
  tests: TestCase[],
  hidden: TestCase[],
): GradeResult {
  const { kb, errors } = parse(source);
  if (errors.length) return { kind: "errors", errors };
  if (kb.facts.length) return { kind: "has-facts", line: kb.facts[0].span.line };

  const cases = [...tests.map((t) => [t, false] as const), ...hidden.map((t) => [t, true] as const)].map(
    ([test, isHidden]): CaseResult => {
      const got = runCase(source, mode, test);
      const passed = Object.entries(test.expect).every(([atom, exp]) => check(exp, got[atom]));
      return { hidden: isHidden, passed, got };
    },
  );
  return { kind: "graded", cases, passed: cases.every((c) => c.passed) };
}
