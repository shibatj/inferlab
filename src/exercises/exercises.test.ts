import { describe, expect, it } from "vitest";
import { parse } from "@/engine";
import { EXERCISES } from "./exercises";
import { check, grade } from "./grader";

// Reference solutions. Kept here, not in exercises.ts, so they are never bundled.
const SOLUTIONS: Record<string, string> = {
  "animal-identifier": `
rule A1: IF has_hair THEN mammal
rule A2: IF gives_milk THEN mammal
rule A3: IF mammal AND eats_meat THEN carnivore
rule A4: IF mammal AND has_hoofs THEN ungulate
rule A5: IF carnivore AND tawny_color AND dark_spots THEN cheetah
rule A6: IF carnivore AND tawny_color AND black_stripes THEN tiger
rule A7: IF ungulate AND black_stripes THEN zebra`,
  "car-diagnosis": `
rule C1: IF lights_dim AND clicking_sound THEN battery_dead
rule C2: IF no_lights THEN battery_dead
rule C3: IF engine_cranks AND fuel_gauge_empty THEN out_of_fuel
rule C4: IF lights_ok AND no_crank THEN starter_faulty`,
  "combine-evidence": `
rule F1: IF fever THEN flu CF 0.6
rule F2: IF cough THEN flu CF 0.5`,
  "loan-approval": `
rule L1: IF stable_income AND good_credit_history THEN creditworthy
rule L2: IF creditworthy AND low_debt THEN approve
rule L3: IF creditworthy AND has_collateral THEN approve
rule L4: IF approve AND large_amount THEN manual_review`,
};

describe.each(EXERCISES)("exercise $id", (ex) => {
  it("has a reference solution that passes every visible and hidden test", () => {
    const result = grade(SOLUTIONS[ex.id], ex.mode, ex.tests, ex.hidden);
    expect(result.kind).toBe("graded");
    if (result.kind === "graded") expect(result.cases.map((c) => c.passed)).toEqual(result.cases.map(() => true));
  });

  it("has a starter that parses but does not pass yet", () => {
    const result = grade(ex.starter, ex.mode, ex.tests, ex.hidden);
    expect(result).toMatchObject({ kind: "graded", passed: false });
  });

  it("uses valid fact syntax in every test case", () => {
    for (const t of [...ex.tests, ...ex.hidden]) {
      expect(parse(t.facts.map((f) => `fact ${f}`).join("\n")).errors).toEqual([]);
    }
  });

  it("has at least one visible and one hidden test", () => {
    expect(ex.tests.length).toBeGreaterThan(0);
    expect(ex.hidden.length).toBeGreaterThan(0);
  });
});

describe("grade", () => {
  const tests = [{ facts: ["a"], expect: { b: true } }];
  const hidden = [{ facts: [], expect: { b: false } }];

  it("reports parse errors with editor line numbers", () => {
    const result = grade("rule R: IF a b", "forward", tests, hidden);
    expect(result).toMatchObject({ kind: "errors", errors: [{ line: 1, code: "EXPECTED_AND_OR_THEN" }] });
  });

  it("rejects solutions that declare their own facts", () => {
    expect(grade("rule R: IF a THEN b\nfact b", "forward", tests, hidden)).toEqual({ kind: "has-facts", line: 2 });
  });

  it("runs every case on a fresh knowledge base and marks hidden ones", () => {
    const result = grade("rule R: IF a THEN b", "forward", tests, hidden);
    expect(result).toEqual({
      kind: "graded",
      passed: true,
      cases: [
        { hidden: false, passed: true, got: { b: 1 } },
        { hidden: true, passed: true, got: { b: 0 } },
      ],
    });
  });

  it("fails a case when any expectation fails", () => {
    const result = grade("rule R: IF a THEN c", "forward", tests, hidden);
    expect(result).toMatchObject({ kind: "graded", passed: false, cases: [{ passed: false }, { passed: true }] });
  });

  it("grades backward-mode CFs", () => {
    const result = grade("rule R: IF a THEN b CF 0.5", "backward", [{ facts: ["a CF 0.8"], expect: { b: 0.4 } }], []);
    expect(result).toMatchObject({ kind: "graded", passed: true, cases: [{ got: { b: expect.closeTo(0.4) } }] });
  });
});

describe("check", () => {
  it("applies the 0.2 threshold to true/false", () => {
    expect([check(true, 0.21), check(true, 0.2), check(false, 0.2), check(false, 0.3)]).toEqual([true, false, true, false]);
  });

  it("allows ±0.05 on numbers", () => {
    expect([check(0.8, 0.85), check(0.8, 0.75), check(0.8, 0.86), check(0.8, 0.74)]).toEqual([true, true, false, false]);
  });
});
