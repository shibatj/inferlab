import { describe, expect, it } from "vitest";
import { cfAnd, cfCombine, cfRule } from "./cf";

describe("certainty factors", () => {
  it("takes the minimum for AND", () => {
    expect(cfAnd([0.9, 0.4, 0.7])).toBe(0.4);
  });

  it("scales premise CF by rule CF", () => {
    expect(cfRule(0.5, 0.8)).toBeCloseTo(0.4);
    expect(cfRule(0.5, -0.8)).toBeCloseTo(-0.4);
  });

  it("combines two positive CFs towards 1", () => {
    expect(cfCombine(0.6, 0.5)).toBeCloseTo(0.8); // 0.6 + 0.5 × 0.4
  });

  it("combines two negative CFs towards -1", () => {
    expect(cfCombine(-0.6, -0.5)).toBeCloseTo(-0.8);
  });

  it("combines evidence for and against", () => {
    expect(cfCombine(0.8, -0.5)).toBeCloseTo(0.6); // 0.3 / (1 - 0.5)
    expect(cfCombine(-0.5, 0.8)).toBeCloseTo(0.6);
  });

  it("is commutative and treats 0 as no evidence", () => {
    for (const [a, b] of [[0.3, 0.9], [-0.2, 0.7], [-0.4, -0.1]]) {
      expect(cfCombine(a, b)).toBeCloseTo(cfCombine(b, a));
    }
    expect(cfCombine(0, 0.7)).toBeCloseTo(0.7);
    expect(cfCombine(-0.7, 0)).toBeCloseTo(-0.7);
  });

  it("returns 0 for contradictory certainties", () => {
    expect(cfCombine(1, -1)).toBe(0);
  });
});
