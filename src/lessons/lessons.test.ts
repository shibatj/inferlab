import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LANGS } from "@/i18n/config";
import { INPUT_SETS, OUTPUT_SETS, infer, membership } from "./fuzzy";
import { lookup, slots } from "./knowledge-net";
import { LESSONS } from "./registry";

describe("lesson content", () => {
  const read = (lang: string, slug: string) =>
    readFileSync(fileURLToPath(new URL(`../content/lessons/${lang}/${slug}.mdx`, import.meta.url)), "utf8");
  const quizIds = (mdx: string) => [...mdx.matchAll(/<(?:Quiz|PredictNextRule)\s+id="([^"]+)"/g)].map((m) => m[1]);

  it.each(LESSONS.flatMap((l) => LANGS.map((lang) => [lang, l.slug] as const)))(
    "%s/%s has exactly the quizzes listed in the registry, in order",
    (lang, slug) => {
      expect(quizIds(read(lang, slug))).toEqual(LESSONS.find((l) => l.slug === slug)!.quizzes);
    },
  );

  it("uses each quiz id once across all lessons", () => {
    const ids = LESSONS.flatMap((l) => l.quizzes);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fuzzy", () => {
  it("evaluates trapezoids including shoulders", () => {
    const t = { a: 0, b: 10, c: 20, d: 30 };
    expect([membership(-1, t), membership(5, t), membership(15, t), membership(25, t), membership(31, t)]).toEqual([
      0, 0.5, 1, 0.5, 0,
    ]);
    expect(membership(35, INPUT_SETS.low)).toBe(1); // left shoulder
    expect(membership(42, INPUT_SETS.high)).toBe(1); // right shoulder
  });

  it("covers the whole temperature range with at least one input set", () => {
    for (let t = 35; t <= 42; t += 0.05) {
      expect(Math.max(...Object.values(INPUT_SETS).map((s) => membership(t, s)))).toBeGreaterThan(0);
    }
  });

  it("fires only the normal rule at 36.5 °C and gives low risk", () => {
    const r = infer(36.5);
    expect(r.degrees).toEqual({ low: 1, medium: 0, high: 0 });
    expect(r.crisp!).toBeLessThan(25);
  });

  it("gives the centroid of the medium set at the middle of a fever", () => {
    // Medium output set is symmetric around 50, and only the medium rule fires at 38.2 °C.
    expect(infer(38.2).crisp!).toBeCloseTo(50, 1);
  });

  it("blends two rules between sets and rises with temperature", () => {
    const r = infer(37.4);
    expect(r.degrees.low).toBeGreaterThan(0);
    expect(r.degrees.medium).toBeGreaterThan(0);
    expect(infer(36.5).crisp!).toBeLessThan(r.crisp!);
    expect(r.crisp!).toBeLessThan(infer(40).crisp!);
  });

  it("clips each output set at its rule's degree", () => {
    const r = infer(37.4); // low 0.25, medium 0.25
    expect(r.aggregate(5)).toBeCloseTo(Math.min(r.degrees.low, membership(5, OUTPUT_SETS.low)));
  });
});

describe("knowledge net", () => {
  it("finds a property on the concept itself with zero hops", () => {
    expect(lookup("canary", "can_sing")).toMatchObject({ value: "yes", from: "canary", hops: 0 });
  });

  it("inherits along isA links", () => {
    expect(lookup("tweety", "has_skin")).toMatchObject({
      value: "yes",
      from: "animal",
      hops: 3,
      path: ["tweety", "canary", "bird", "animal"],
    });
  });

  it("lets a nearer concept override an inherited value", () => {
    expect(lookup("ostrich", "can_fly")).toMatchObject({ value: "no", from: "ostrich" });
    expect(lookup("canary", "can_fly")).toMatchObject({ value: "yes", from: "bird" });
  });

  it("reports a missing property after searching to the root", () => {
    expect(lookup("shark", "can_sing")).toMatchObject({ value: null, from: null, path: ["shark", "fish", "animal"] });
  });

  it("lists own and inherited slots and marks overrides", () => {
    const s = slots("ostrich");
    expect(s.find((x) => x.slot === "can_fly")).toEqual({ slot: "can_fly", value: "no", from: "ostrich", overrides: "bird" });
    expect(s.find((x) => x.slot === "breathes")).toMatchObject({ from: "animal", overrides: null });
    expect(s.filter((x) => x.slot === "can_fly")).toHaveLength(1);
  });
});
