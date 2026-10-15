import { describe, expect, it } from "vitest";
import { backwardChain, forwardChain, parse } from "@/engine";
import { EXAMPLES, withToggles } from "./examples";
import { howForward, whyPath } from "./explain";
import { layoutTree } from "./layout";
import { memoryAt, treeStateAt } from "./replay";

const kbOf = (source: string) => {
  const { kb, errors } = parse(source);
  expect(errors).toEqual([]);
  return kb;
};
const example = (id: string) => EXAMPLES.find((e) => e.id === id)!;
const defaultSource = (id: string) => {
  const ex = example(id);
  const checked = new Set((ex.toggles ?? []).filter((t) => t.checked).map((t) => t.fact));
  return withToggles(ex.source, ex.toggles, checked);
};

describe("examples", () => {
  it.each(EXAMPLES.map((e) => e.id))("%s parses without errors", (id) => {
    kbOf(defaultSource(id));
  });

  it("animal: forward chaining identifies a cheetah", () => {
    const result = forwardChain(kbOf(defaultSource("animal")));
    const names = result.facts.map((f) => f.name);
    expect(names).toContain("cheetah");
    expect(names).not.toContain("tiger");
  });

  it("car: the default symptoms diagnose a dead battery but not a faulty starter", () => {
    const kb = kbOf(defaultSource("car"));
    expect(backwardChain(kb, "battery_dead")).toMatchObject({ proven: true });
    expect(backwardChain(kb, "starter_faulty")).toMatchObject({ proven: false });
  });

  it("car: every toggle names a fact some rule uses", () => {
    const ex = example("car");
    const premises = new Set(kbOf(ex.source).rules.flatMap((r) => r.premises.map((p) => p.name)));
    for (const t of ex.toggles!) expect(premises).toContain(t.fact);
  });

  it("mycin: two rules combine into pseudomonas CF 0.388", () => {
    // M2: min(0.9, 0.8, 0.7) × 0.4 = 0.28; M3: min(0.5, 0.9) × 0.3 = 0.15; 0.28 ⊕ 0.15 = 0.388
    expect(backwardChain(kbOf(defaultSource("mycin")), "pseudomonas").cf).toBeCloseTo(0.388);
  });

  it("every goal offered in backward examples is concluded by some rule", () => {
    for (const ex of EXAMPLES.filter((e) => e.goals)) {
      const conclusions = new Set(kbOf(ex.source).rules.map((r) => r.conclusion.name));
      for (const g of ex.goals!) expect(conclusions).toContain(g);
    }
  });
});

describe("withToggles", () => {
  it("appends one fact line per ticked toggle", () => {
    const toggles = [
      { fact: "a", label: { th: "", en: "" }, checked: false },
      { fact: "b", label: { th: "", en: "" }, checked: false },
    ];
    expect(withToggles("rule R: IF a THEN c", toggles, new Set(["b"]))).toBe("rule R: IF a THEN c\nfact b\n");
    expect(withToggles("x", toggles, new Set())).toBe("x");
  });
});

describe("memoryAt", () => {
  const kb = kbOf("fact a\nrule R1: IF a THEN b CF 0.5\nrule R2: IF a THEN b CF 0.5");
  const { steps, facts } = forwardChain(kb);

  it("starts from the initial facts and ends at the final working memory", () => {
    expect(memoryAt(kb, steps, 0)).toEqual([{ name: "a", cf: 1, time: 1 }]);
    expect(memoryAt(kb, steps, steps.length)).toEqual(facts);
  });

  it("shows CF updates step by step", () => {
    expect(memoryAt(kb, steps, 1).find((f) => f.name === "b")?.cf).toBeCloseTo(0.5);
    expect(memoryAt(kb, steps, 2).find((f) => f.name === "b")?.cf).toBeCloseTo(0.75);
  });
});

describe("treeStateAt", () => {
  it("tracks opened, closed and current nodes", () => {
    const { steps } = backwardChain(kbOf("fact a\nrule R: IF a THEN g"), "g");
    expect(treeStateAt(steps, 0)).toEqual({ opened: new Set(), closed: new Set(), current: null });
    const mid = treeStateAt(steps, 3); // open g, open R, open a
    expect([...mid.opened]).toEqual([0, 1, 2]);
    expect(mid.closed.size).toBe(0);
    expect(mid.current).toBe(2);
    const end = treeStateAt(steps, steps.length);
    expect(end.closed.size).toBe(3);
  });
});

describe("howForward", () => {
  it("explains a derived fact down to the initial facts", () => {
    const kb = kbOf("fact a\nfact b\nrule R1: IF a THEN c\nrule R2: IF c AND b THEN d");
    const { steps } = forwardChain(kb);
    expect(howForward(kb, steps, "d")).toEqual({
      fact: "d",
      initialCf: null,
      firings: [
        {
          cycle: 2,
          rule: "R2",
          contribution: 1,
          premises: [
            {
              fact: "c",
              initialCf: null,
              firings: [{ cycle: 1, rule: "R1", contribution: 1, premises: [{ fact: "a", initialCf: 1, firings: [] }] }],
            },
            { fact: "b", initialCf: 1, firings: [] },
          ],
        },
      ],
    });
  });

  it("lists every firing that contributed to a combined CF", () => {
    const kb = kbOf("fact a\nrule R1: IF a THEN b CF 0.5\nrule R2: IF a THEN b CF 0.5");
    const { steps } = forwardChain(kb);
    expect(howForward(kb, steps, "b").firings.map((f) => f.rule)).toEqual(["R1", "R2"]);
  });

  it("only counts firings before the given step", () => {
    const kb = kbOf("fact a\nrule R1: IF a THEN b\nrule R2: IF b THEN c");
    const { steps } = forwardChain(kb);
    expect(howForward(kb, steps, "c", 1).firings).toEqual([]);
  });

  it("terminates on circular rules", () => {
    const kb = kbOf("fact a\nrule R1: IF a THEN b\nrule R2: IF b THEN a");
    const { steps } = forwardChain(kb);
    const how = howForward(kb, steps, "a");
    expect(how.initialCf).toBe(1);
    expect(how.firings[0].premises[0].firings[0].rule).toBe("R1");
  });
});

describe("whyPath", () => {
  const { tree } = backwardChain(kbOf("fact x\nrule R1: IF a THEN g\nrule R2: IF x THEN a"), "g");

  it("returns the chain from the top goal to the node", () => {
    const a = tree.rules[0].premises[0];
    const x = a.rules[0].premises[0];
    expect(whyPath(tree, x.id).map((n) => (n.kind === "goal" ? n.atom : n.rule))).toEqual(["g", "R1", "a", "R2", "x"]);
  });

  it("returns an empty path for an unknown id", () => {
    expect(whyPath(tree, 999)).toEqual([]);
  });
});

describe("layoutTree", () => {
  it("gives leaves their own columns and centres parents", () => {
    const { tree } = backwardChain(kbOf("fact a\nfact b\nrule R: IF a AND b THEN g"), "g");
    const placed = layoutTree(tree);
    const at = (id: number) => placed.find((p) => p.node.id === id)!;
    // g(0) → R(1) → a(2), b(3)
    expect([at(2).x, at(3).x]).toEqual([0, 1]);
    expect(at(1)).toMatchObject({ x: 0.5, y: 1, parent: 0 });
    expect(at(0)).toMatchObject({ x: 0.5, y: 0, parent: null });
  });

  it("never puts two nodes on the same row at the same column", () => {
    const { tree } = backwardChain(kbOf(defaultSource("mycin")), "pseudomonas");
    const keys = layoutTree(tree).map((p) => `${p.y}:${p.x}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
