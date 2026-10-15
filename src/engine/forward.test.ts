import { describe, expect, it } from "vitest";
import { forwardChain, type Strategy } from "./forward";
import { parse } from "./parser";

function run(source: string, strategy?: Strategy) {
  const { kb, errors } = parse(source);
  expect(errors).toEqual([]);
  return forwardChain(kb, { strategy });
}

const lines = (...l: string[]) => l.join("\n");
const fired = (r: ReturnType<typeof run>) => r.steps.map((s) => s.fired);
const factNames = (r: ReturnType<typeof run>) => r.facts.map((f) => f.name);
const cfOf = (r: ReturnType<typeof run>, name: string) => r.facts.find((f) => f.name === name)?.cf;

describe("forwardChain: basics", () => {
  it("does nothing when no rule matches", () => {
    expect(run("fact a\nrule R: IF b THEN c")).toEqual({
      steps: [],
      facts: [{ name: "a", cf: 1, time: 1 }],
    });
  });

  it("chains conclusions into later premises", () => {
    const result = run(lines("fact a", "rule R1: IF a THEN b", "rule R2: IF b THEN c"));
    expect(fired(result)).toEqual(["R1", "R2"]);
    expect(result.facts).toEqual([
      { name: "a", cf: 1, time: 1 },
      { name: "b", cf: 1, time: 2 },
      { name: "c", cf: 1, time: 3 },
    ]);
  });

  it("requires every premise of an AND rule", () => {
    expect(run(lines("fact a", "rule R: IF a AND b THEN c")).steps).toEqual([]);
  });

  it("records the full step", () => {
    const result = run(lines("fact a", "rule R1: IF a THEN x", "rule R2: IF a THEN y"));
    expect(result.steps[0]).toEqual({
      cycle: 1,
      conflictSet: ["R1", "R2"],
      fired: "R1",
      conclusion: "x",
      premiseCf: 1,
      contribution: 1,
      cfBefore: null,
      cfAfter: 1,
    });
    expect(result.steps[1].conflictSet).toEqual(["R2"]);
  });

  it("fires a rule whose conclusion is already known", () => {
    const result = run(lines("fact a", "fact b", "rule R: IF a THEN b"));
    expect(result.steps[0]).toMatchObject({ fired: "R", cfBefore: 1, cfAfter: 1 });
    expect(factNames(result)).toEqual(["a", "b"]);
  });

  it("uses the first declaration of a duplicated fact", () => {
    expect(run("fact a CF 0.4\nfact a").facts).toEqual([{ name: "a", cf: 0.4, time: 1 }]);
  });

  it("terminates on circular rules (refraction)", () => {
    const result = run(lines("fact a", "rule R1: IF a THEN b", "rule R2: IF b THEN a"));
    expect(fired(result)).toEqual(["R1", "R2"]);
  });
});

describe("forwardChain: certainty factors", () => {
  it("propagates CF through a rule: min of premises × rule CF", () => {
    const result = run(lines("fact a CF 0.9", "fact b CF 0.5", "rule R: IF a AND b THEN c CF 0.8"));
    expect(result.steps[0].premiseCf).toBe(0.5);
    expect(cfOf(result, "c")).toBeCloseTo(0.4);
  });

  it("does not fire when a premise is at or below the 0.2 threshold", () => {
    expect(run(lines("fact a CF 0.2", "rule R: IF a THEN b")).steps).toEqual([]);
    expect(run(lines("fact a CF -0.9", "rule R: IF a THEN b")).steps).toEqual([]);
  });

  it("combines evidence from several rules for the same conclusion", () => {
    const result = run(
      lines("fact a", "fact b", "rule R1: IF a THEN c CF 0.6", "rule R2: IF b THEN c CF 0.5"),
    );
    expect(result.steps[1]).toMatchObject({ cfBefore: 0.6, contribution: 0.5 });
    expect(cfOf(result, "c")).toBeCloseTo(0.8);
  });

  it("lets negative evidence lower belief", () => {
    const result = run(
      lines("fact a", "fact b", "rule R1: IF a THEN c CF 0.8", "rule R2: IF b THEN c CF -0.5"),
    );
    expect(cfOf(result, "c")).toBeCloseTo(0.6);
  });

  it("keeps a derived fact too weak to trigger further rules", () => {
    const result = run(lines("fact a", "rule R1: IF a THEN b CF 0.1", "rule R2: IF b THEN c"));
    expect(fired(result)).toEqual(["R1"]);
    expect(cfOf(result, "b")).toBeCloseTo(0.1);
  });

  it("uses the premise CF at the moment a rule fires", () => {
    // R1 fires on b = 0.5 before R3 raises b to 0.75; R1's contribution is not revised.
    const result = run(
      lines(
        "fact a",
        "rule R2: IF a THEN b CF 0.5",
        "rule R1: IF b THEN c",
        "rule R3: IF a THEN b CF 0.5",
      ),
    );
    expect(fired(result)).toEqual(["R2", "R1", "R3"]);
    expect(cfOf(result, "b")).toBeCloseTo(0.75);
    expect(cfOf(result, "c")).toBeCloseTo(0.5);
  });
});

describe("forwardChain: conflict resolution", () => {
  const firstPick = (src: string, strategy: Strategy) => run(src, strategy).steps[0].fired;

  it("order: first rule in the source", () => {
    expect(firstPick(lines("fact a", "fact b", "rule R1: IF a THEN x", "rule R2: IF a AND b THEN y"), "order")).toBe("R1");
  });

  it("specificity: the rule with more premises", () => {
    const src = lines("fact a", "fact b", "rule R1: IF a THEN x", "rule R2: IF a AND b THEN y");
    expect(firstPick(src, "specificity")).toBe("R2");
  });

  it("priority: the highest PRIORITY", () => {
    const src = lines("fact a", "rule R1: IF a THEN x PRIORITY 1", "rule R2: IF a THEN y PRIORITY 5");
    expect(firstPick(src, "priority")).toBe("R2");
  });

  it("recency: the rule matching the most recently added fact", () => {
    const src = lines("fact old", "fact new", "rule R1: IF old THEN x", "rule R2: IF new THEN y");
    expect(firstPick(src, "recency")).toBe("R2");
  });

  it("recency: compares the next-newest premise when the newest ties", () => {
    const src = lines(
      "fact a",
      "fact b",
      "fact c",
      "rule R1: IF a AND c THEN x",
      "rule R2: IF b AND c THEN y",
    );
    expect(firstPick(src, "recency")).toBe("R2");
  });

  it("falls back to rule order on ties", () => {
    const src = lines("fact a", "rule R1: IF a THEN x", "rule R2: IF a THEN y");
    for (const s of ["order", "specificity", "priority", "recency"] as const) {
      expect(firstPick(src, s)).toBe("R1");
    }
  });

  it("ranks the whole conflict set", () => {
    const src = lines(
      "fact a",
      "rule R1: IF a THEN x PRIORITY 1",
      "rule R2: IF a THEN y PRIORITY 3",
      "rule R3: IF a THEN z PRIORITY 2",
    );
    expect(run(src, "priority").steps[0].conflictSet).toEqual(["R2", "R3", "R1"]);
  });

  it("changes the conclusion when a strategy changes which rule fires first", () => {
    // Fact order decides recency: switching strategy flips which diagnosis is reached first.
    const src = lines("fact tiger", "fact cheetah", "rule T: IF tiger THEN stripes", "rule C: IF cheetah THEN spots");
    expect(run(src, "order").steps[0].conclusion).toBe("stripes");
    expect(run(src, "recency").steps[0].conclusion).toBe("spots");
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
    expect(fired(result)).toEqual(["Z1", "Z5", "Z9", "Z10"]);
    expect(factNames(result)).toEqual(expect.arrayContaining(["mammal", "carnivore", "cheetah", "tiger"]));
    expect(factNames(result)).not.toContain("bird");
  });
});
