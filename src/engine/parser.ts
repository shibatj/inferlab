import { tokenize, type Keyword, type Token } from "./lexer";
import type { Atom, KnowledgeBase, ParseError, ParseErrorCode, ParseResult, Rule } from "./types";

/**
 * Grammar (one statement per line):
 *
 *   program := line*
 *   line    := statement? NEWLINE
 *   statement := "fact" IDENT
 *              | "rule" IDENT ":" "IF" IDENT ("AND" IDENT)* "THEN" IDENT
 *
 * A syntax error abandons the rest of its line (panic-mode recovery), so one mistake
 * produces one error and the following lines are still checked.
 */
export function parse(source: string): ParseResult {
  const { tokens, errors } = tokenize(source);
  const kb: KnowledgeBase = { facts: [], rules: [] };
  let pos = 0;

  const peek = (): Token => tokens[pos];
  // Never step past EOF, so reading after an error at end of input stays on the EOF token.
  const next = (): Token => (tokens[pos].kind === "eof" ? tokens[pos] : tokens[pos++]);
  const atLineEnd = () => peek().kind === "newline" || peek().kind === "eof";

  class LineError extends Error {
    constructor(readonly error: ParseError) {
      super(error.message);
    }
  }

  const fail = (code: ParseErrorCode, message: string, token: Token): never => {
    const span = token.span;
    // Point at something visible: an error at end of line/file underlines one column.
    const length = Math.max(span.length, 1);
    throw new LineError({ code, message, line: span.line, col: span.col, length });
  };

  const describe = (t: Token) =>
    t.kind === "newline" ? "end of line" : t.kind === "eof" ? "end of input" : `'${t.text}'`;

  const expectIdent = (what: string): Atom => {
    const t = next();
    if (t.kind === "ident") return { name: t.text, span: t.span };
    if (t.kind === "keyword") {
      return fail("EXPECTED_IDENT", `Expected ${what}, but '${t.text}' is a keyword`, t);
    }
    return fail("EXPECTED_IDENT", `Expected ${what}, found ${describe(t)}`, t);
  };

  const isKeyword = (t: Token, k: Keyword) => t.kind === "keyword" && t.keyword === k;

  const parseRule = (ruleToken: Token): Rule => {
    const name = expectIdent("a rule name");
    const colon = next();
    if (colon.kind !== "colon") {
      fail("EXPECTED_COLON", `Expected ':' after rule name, found ${describe(colon)}`, colon);
    }
    const ifToken = next();
    if (!isKeyword(ifToken, "IF")) {
      fail("EXPECTED_IF", `Expected 'IF', found ${describe(ifToken)}`, ifToken);
    }
    const premises = [expectIdent("a condition")];
    for (;;) {
      const t = next();
      if (isKeyword(t, "AND")) {
        premises.push(expectIdent("a condition after 'AND'"));
      } else if (isKeyword(t, "THEN")) {
        break;
      } else {
        fail("EXPECTED_AND_OR_THEN", `Expected 'AND' or 'THEN', found ${describe(t)}`, t);
      }
    }
    const conclusion = expectIdent("a conclusion after 'THEN'");
    const end = conclusion.span;
    const start = ruleToken.span;
    return {
      name: name.name,
      premises,
      conclusion,
      // Rules sit on one line, so the span runs from `rule` to the end of the conclusion.
      span: { line: start.line, col: start.col, length: end.col + end.length - start.col },
    };
  };

  const parseStatement = () => {
    const t = next();
    if (isKeyword(t, "FACT")) {
      kb.facts.push(expectIdent("a fact name"));
    } else if (isKeyword(t, "RULE")) {
      kb.rules.push(parseRule(t));
    } else {
      fail("EXPECTED_STATEMENT", `Expected 'fact' or 'rule', found ${describe(t)}`, t);
    }
    if (!atLineEnd()) {
      const extra = peek();
      fail("EXPECTED_END_OF_LINE", `Unexpected ${describe(extra)} after statement`, extra);
    }
  };

  while (peek().kind !== "eof") {
    if (peek().kind === "newline") {
      next();
      continue;
    }
    try {
      parseStatement();
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      errors.push(e.error);
      while (!atLineEnd()) next();
    }
  }

  const seen = new Map<string, Rule>();
  for (const rule of kb.rules) {
    const first = seen.get(rule.name);
    if (first) {
      errors.push({
        code: "DUPLICATE_RULE",
        message: `Rule '${rule.name}' is already defined on line ${first.span.line}`,
        ...rule.span,
      });
    } else {
      seen.set(rule.name, rule);
    }
  }

  errors.sort((a, b) => a.line - b.line || a.col - b.col);
  return { kb, errors };
}
