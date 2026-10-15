import { describe, expect, it } from "vitest";
import { parse } from "./parser";

const names = (atoms: { name: string }[]) => atoms.map((a) => a.name);

describe("parse: valid programs", () => {
  it("parses facts and rules in source order", () => {
    const { kb, errors } = parse(
      ["fact has_hair", "fact eats_meat", "rule R1: IF has_hair THEN mammal"].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(names(kb.facts)).toEqual(["has_hair", "eats_meat"]);
    expect(kb.rules).toHaveLength(1);
    expect(kb.rules[0].name).toBe("R1");
    expect(names(kb.rules[0].premises)).toEqual(["has_hair"]);
    expect(kb.rules[0].conclusion.name).toBe("mammal");
  });

  it("parses several premises joined by AND", () => {
    const { kb, errors } = parse("rule R: IF a AND b AND c THEN d");
    expect(errors).toEqual([]);
    expect(names(kb.rules[0].premises)).toEqual(["a", "b", "c"]);
  });

  it("treats keywords case-insensitively and identifiers case-sensitively", () => {
    const { kb, errors } = parse("FACT A\nRule r1: if A and b then C");
    expect(errors).toEqual([]);
    expect(names(kb.facts)).toEqual(["A"]);
    expect(names(kb.rules[0].premises)).toEqual(["A", "b"]);
  });

  it("ignores comments, blank lines and CRLF line endings", () => {
    const { kb, errors } = parse("# animals\r\n\r\nfact x  # trailing\r\nrule R: IF x THEN y\r\n");
    expect(errors).toEqual([]);
    expect(names(kb.facts)).toEqual(["x"]);
    expect(kb.rules).toHaveLength(1);
  });

  it("accepts Thai identifiers, including combining vowel and tone marks", () => {
    const { kb, errors } = parse("fact มีขน\nrule ร1: IF มีขน THEN เป็นสัตว์เลี้ยงลูกด้วยนม");
    expect(errors).toEqual([]);
    expect(names(kb.facts)).toEqual(["มีขน"]);
    expect(kb.rules[0].conclusion.name).toBe("เป็นสัตว์เลี้ยงลูกด้วยนม");
  });

  it("records 1-based spans for atoms and whole rules", () => {
    const { kb } = parse("fact a\n  rule R: IF bb THEN c");
    expect(kb.facts[0].span).toEqual({ line: 1, col: 6, length: 1 });
    const rule = kb.rules[0];
    expect(rule.premises[0].span).toEqual({ line: 2, col: 14, length: 2 });
    expect(rule.span).toEqual({ line: 2, col: 3, length: "rule R: IF bb THEN c".length });
  });

  it("defaults CF to 1 and priority to 0", () => {
    const { kb } = parse("fact a\nrule R: IF a THEN b");
    expect(kb.facts[0].cf).toBe(1);
    expect(kb.rules[0]).toMatchObject({ cf: 1, priority: 0 });
  });

  it("parses CF on facts and CF and PRIORITY on rules", () => {
    const { kb, errors } = parse("fact a cf 0.8\nrule R: IF a THEN b CF -0.5 PRIORITY 10");
    expect(errors).toEqual([]);
    expect(kb.facts[0].cf).toBe(0.8);
    expect(kb.rules[0]).toMatchObject({ cf: -0.5, priority: 10 });
    expect(kb.rules[0].span.length).toBe("rule R: IF a THEN b CF -0.5 PRIORITY 10".length);
  });

  it("accepts PRIORITY without CF and negative priorities", () => {
    const { kb, errors } = parse("rule R: IF a THEN b PRIORITY -3");
    expect(errors).toEqual([]);
    expect(kb.rules[0]).toMatchObject({ cf: 1, priority: -3 });
  });

  it("measures columns in UTF-16 code units", () => {
    // The emoji is two UTF-16 units, so `x` starts at column 8, not 7.
    const { kb, errors } = parse("fact 😀x");
    expect(errors[0]).toMatchObject({ code: "UNEXPECTED_CHAR", col: 6, length: 2 });
    expect(kb.facts[0].span.col).toBe(8);
  });
});

describe("parse: errors", () => {
  const firstError = (src: string) => parse(src).errors[0];

  it.each([
    ["rule R IF a THEN b", "EXPECTED_COLON", 8],
    ["rule R: a THEN b", "EXPECTED_IF", 9],
    ["rule R: IF a b", "EXPECTED_AND_OR_THEN", 14],
    ["rule R: IF a THEN", "EXPECTED_IDENT", 18],
    ["rule R: IF a AND THEN b", "EXPECTED_IDENT", 18],
    ["rule: IF a THEN b", "EXPECTED_IDENT", 5],
    ["fact", "EXPECTED_IDENT", 5],
    ["fact a b", "EXPECTED_END_OF_LINE", 8],
    ["a", "EXPECTED_STATEMENT", 1],
    ["fact a-b", "UNEXPECTED_CHAR", 7],
    ["fact a CF", "EXPECTED_NUMBER", 10],
    ["fact a CF high", "EXPECTED_NUMBER", 11],
    ["fact a CF 1.5", "CF_OUT_OF_RANGE", 11],
    ["rule R: IF a THEN b CF -2", "CF_OUT_OF_RANGE", 24],
    ["rule R: IF a THEN b PRIORITY 1.5", "EXPECTED_INTEGER", 30],
    ["rule R: IF a THEN b PRIORITY 1 CF 0.5", "EXPECTED_END_OF_LINE", 32],
    ["fact cf", "EXPECTED_IDENT", 6],
  ] as const)("%s → %s at column %i", (src, code, col) => {
    expect(firstError(src)).toMatchObject({ code, line: 1, col });
  });

  it("explains when a keyword is used as a name", () => {
    expect(firstError("fact then").message).toBe("Expected a fact name, but 'then' is a keyword");
  });

  it("underlines one column when the error is at end of line", () => {
    expect(firstError("rule R: IF a THEN")).toMatchObject({ length: 1 });
  });

  it("recovers at the next line and reports every broken line", () => {
    const { kb, errors } = parse(["rule R1 IF a THEN b", "fact ok", "rule R2: IF THEN c"].join("\n"));
    expect(errors.map((e) => [e.line, e.code])).toEqual([
      [1, "EXPECTED_COLON"],
      [3, "EXPECTED_IDENT"],
    ]);
    expect(names(kb.facts)).toEqual(["ok"]);
    expect(kb.rules).toEqual([]);
  });

  it("rejects a second rule with the same name", () => {
    const { errors } = parse("rule R: IF a THEN b\nrule R: IF b THEN c");
    expect(errors).toEqual([
      expect.objectContaining({
        code: "DUPLICATE_RULE",
        line: 2,
        message: "Rule 'R' is already defined on line 1",
      }),
    ]);
  });
});
