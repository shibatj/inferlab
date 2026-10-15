import { describe, expect, it } from "vitest";
import { forwardChain } from "./forward";
import { parse } from "./parser";

function run(source: string) {
  const { kb, errors } = parse(source);
  expect(errors).toEqual([]);
  return forwardChain(kb);
}

describe("forwardChain", () => {
  it("does nothing when no rule matches", () => {
    expect(run("fact a\nrule R: IF b THEN c")).toEqual({ steps: [], facts: ["a"] });
  });

  it("chains conclusions into later premises", () => {
    const result = run(["fact a", "rule R1: IF a THEN b", "rule R2: IF b THEN c"].join("\n"));
    expect(result.steps.map((s) => [s.fired, s.added])).toEqual([
      ["R1", "b"],
      ["R2", "c"],
    ]);
    expect(result.facts).toEqual(["a", "b", "c"]);
  });

  it("requires every premise of an AND rule", () => {
    const result = run(["fact a", "rule R: IF a AND b THEN c"].join("\n"));
    expect(result.steps).toEqual([]);
  });

  it("resolves conflicts by rule order and records the conflict set", () => {
    const result = run(["fact a", "rule R1: IF a THEN x", "rule R2: IF a THEN y"].join("\n"));
    expect(result.steps).toEqual([
      { cycle: 1, conflictSet: ["R1", "R2"], fired: "R1", added: "x" },
      { cycle: 2, conflictSet: ["R2"], fired: "R2", added: "y" },
    ]);
  });

  it("fires a rule whose conclusion is already known, adding nothing", () => {
    const result = run(["fact a", "fact b", "rule R: IF a THEN b"].join("\n"));
    expect(result.steps).toEqual([{ cycle: 1, conflictSet: ["R"], fired: "R", added: null }]);
    expect(result.facts).toEqual(["a", "b"]);
  });

  it("ignores duplicate initial facts", () => {
    expect(run("fact a\nfact a").facts).toEqual(["a"]);
  });

  it("terminates on circular rules (refraction)", () => {
    const result = run(["fact a", "rule R1: IF a THEN b", "rule R2: IF b THEN a"].join("\n"));
    expect(result.steps.map((s) => [s.fired, s.added])).toEqual([
      ["R1", "b"],
      ["R2", null],
    ]);
  });
});

// Simplified from Winston's animal-identification system (Artificial Intelligence, 1992).
const ZOO = `
fact has_hair
fact eats_meat
fact tawny_color
fact dark_spots
fact black_stripes

rule Z1: IF has_hair THEN mammal
rule Z2: IF gives_milk THEN mammal
rule Z3: IF has_feathers THEN bird
rule Z5: IF mammal AND eats_meat THEN carnivore
rule Z9: IF carnivore AND tawny_color AND dark_spots THEN cheetah
rule Z10: IF carnivore AND tawny_color AND black_stripes THEN tiger
`;

describe("forwardChain on the zoo knowledge base", () => {
  it("identifies the animal and never fires unsupported rules", () => {
    const result = run(ZOO);
    expect(result.steps.map((s) => s.fired)).toEqual(["Z1", "Z5", "Z9", "Z10"]);
    expect(result.facts).toEqual(expect.arrayContaining(["mammal", "carnivore", "cheetah", "tiger"]));
    expect(result.facts).not.toContain("bird");
  });
});
