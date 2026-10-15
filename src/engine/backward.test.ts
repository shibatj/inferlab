import { describe, expect, it } from "vitest";
import { backwardChain, type GoalNode } from "./backward";
import { parse } from "./parser";

function prove(source: string, goal: string) {
  const { kb, errors } = parse(source);
  expect(errors).toEqual([]);
  return backwardChain(kb, goal);
}

const lines = (...l: string[]) => l.join("\n");

describe("backwardChain: basics", () => {
  it("proves a goal that is a fact without trying rules", () => {
    const result = prove("fact a", "a");
    expect(result).toMatchObject({ goal: "a", cf: 1, proven: true });
    expect(result.tree).toMatchObject({ atom: "a", status: "proven", factCf: 1, rules: [] });
  });

  it("marks a goal with no fact and no rule as unknown (closed world)", () => {
    const result = prove("fact a", "z");
    expect(result).toMatchObject({ cf: 0, proven: false });
    expect(result.tree.status).toBe("unknown");
  });

  it("proves a goal through a chain of rules", () => {
    const result = prove(lines("fact a", "rule R1: IF a THEN b", "rule R2: IF b THEN c"), "c");
    expect(result.proven).toBe(true);
    const r2 = result.tree.rules[0];
    expect(r2).toMatchObject({ rule: "R2", fired: true, premiseCf: 1, contribution: 1 });
    expect(r2.premises[0].rules[0]).toMatchObject({ rule: "R1", fired: true });
  });

  it("fails a rule when a premise is unknown and skips the remaining premises", () => {
    const result = prove(lines("fact c", "rule R: IF a AND b AND c THEN g"), "g");
    expect(result.tree.status).toBe("failed");
    const rule = result.tree.rules[0];
    expect(rule).toMatchObject({ fired: false, premiseCf: null, contribution: 0, skipped: ["b", "c"] });
    expect(rule.premises.map((p) => [p.atom, p.status])).toEqual([["a", "unknown"]]);
  });

  it("tries every rule for a goal, even after one succeeds", () => {
    const result = prove(lines("fact a", "fact b", "rule R1: IF a THEN g", "rule R2: IF b THEN g"), "g");
    expect(result.tree.rules.map((r) => [r.rule, r.fired])).toEqual([
      ["R1", true],
      ["R2", true],
    ]);
  });
});

describe("backwardChain: certainty factors", () => {
  it("combines evidence from every rule and the fact itself", () => {
    const result = prove(
      lines("fact a", "fact b", "fact g CF 0.5", "rule R1: IF a THEN g CF 0.6", "rule R2: IF b THEN g CF -0.5"),
      "g",
    );
    // 0.5 ⊕ 0.6 = 0.8, then 0.8 ⊕ -0.5 = 0.6
    expect(result.cf).toBeCloseTo(0.6);
  });

  it("uses the weakest premise and the rule CF", () => {
    const result = prove(lines("fact a CF 0.9", "fact b CF 0.5", "rule R: IF a AND b THEN g CF 0.8"), "g");
    expect(result.tree.rules[0].premiseCf).toBe(0.5);
    expect(result.cf).toBeCloseTo(0.4);
  });

  it("does not prove a goal whose belief is at or below 0.2", () => {
    const result = prove(lines("fact a", "rule R: IF a THEN g CF 0.2"), "g");
    expect(result).toMatchObject({ proven: false });
    expect(result.tree.status).toBe("failed");
    expect(result.cf).toBeCloseTo(0.2);
  });

  it("treats a weak premise as failing the rule", () => {
    const result = prove(lines("fact a CF 0.1", "rule R: IF a THEN g"), "g");
    expect(result.tree.rules[0].fired).toBe(false);
    expect(result.tree.rules[0].premises[0].status).toBe("failed");
  });
});

describe("backwardChain: termination and reuse", () => {
  it("cuts circular rules with a cycle node", () => {
    const result = prove(lines("rule R1: IF b THEN a", "rule R2: IF a THEN b"), "a");
    expect(result.proven).toBe(false);
    const b = result.tree.rules[0].premises[0];
    expect(b.rules[0].premises[0]).toMatchObject({ atom: "a", status: "cycle", cf: 0 });
  });

  it("ignores circular support but keeps independent support", () => {
    const result = prove(lines("fact x", "rule R1: IF x THEN a", "rule R2: IF b THEN a", "rule R3: IF a THEN b"), "a");
    expect(result.proven).toBe(true);
    expect(result.cf).toBe(1);
  });

  it("does not cache a result that was cut short by a cycle", () => {
    // While proving a, b is evaluated with a still open, so b's rule hits a cycle. That
    // partial "b failed" must not be reused: once a is proven, b holds too.
    const result = prove(
      lines("fact x", "rule G: IF a AND b THEN g", "rule A1: IF x THEN a", "rule A2: IF b THEN a", "rule B: IF a THEN b"),
      "g",
    );
    const [, b] = result.tree.rules[0].premises;
    expect(b).toMatchObject({ atom: "b", cached: false, status: "proven" });
    expect(result.proven).toBe(true);
  });

  it("evaluates each atom once and marks later occurrences as cached", () => {
    const result = prove(
      lines("fact c", "rule R1: IF c THEN a", "rule R2: IF c THEN b", "rule G: IF a AND b THEN g"),
      "g",
    );
    const [a, b] = result.tree.rules[0].premises;
    expect(a.rules[0].premises[0]).toMatchObject({ atom: "c", cached: false });
    expect(b.rules[0].premises[0]).toMatchObject({ atom: "c", cached: true, status: "proven", cf: 1, rules: [] });
  });

  it("logs balanced open/close events in visit order", () => {
    const result = prove(lines("fact a", "rule R: IF a AND b THEN g"), "g");
    const opens = result.steps.filter((s) => s.event === "open").map((s) => s.id);
    expect(opens).toEqual([0, 1, 2, 3]); // g, R, a, b
    expect(result.steps.filter((s) => s.event === "close")).toHaveLength(opens.length);
    // Each node closes after it opens, and children close before their parent.
    const closeIndex = (id: number) => result.steps.findIndex((s) => s.event === "close" && s.id === id);
    expect(closeIndex(2)).toBeLessThan(closeIndex(1));
    expect(closeIndex(1)).toBeLessThan(closeIndex(0));
  });
});

const CAR = `
# Symptoms (checkboxes in the playground)
fact lights_dim
fact clicking_sound

rule B1: IF lights_dim AND clicking_sound THEN battery_dead CF 0.9
rule B2: IF no_crank AND lights_ok THEN starter_faulty CF 0.8
rule B3: IF engine_cranks AND fuel_empty THEN out_of_fuel
`;

describe("backwardChain on the car troubleshooting knowledge base", () => {
  it("diagnoses a dead battery from the symptoms", () => {
    const result = prove(CAR, "battery_dead");
    expect(result.proven).toBe(true);
    expect(result.cf).toBeCloseTo(0.9);
  });

  it("does not diagnose a faulty starter without its symptoms", () => {
    const result = prove(CAR, "starter_faulty");
    expect(result.proven).toBe(false);
    const premises = (result.tree as GoalNode).rules[0].premises;
    expect(premises.map((p) => p.status)).toEqual(["unknown"]);
  });
});
