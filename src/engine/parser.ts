import { tokenize, type Keyword, type Token } from "./lexer";
import type {
  Atom,
  Fact,
  KnowledgeBase,
  ParseError,
  ParseErrorCode,
  ParseResult,
  Rule,
  Span,
} from "./types";

/**
 * Grammar (one statement per line):
 *
 *   program   := line*
 *   line      := statement? NEWLINE
 *   statement := "fact" IDENT cf?
 *              | "rule" IDENT ":" "IF" IDENT ("AND" IDENT)* "THEN" IDENT cf? priority?
 *   cf        := "CF" NUMBER          (in [-1, 1])
 *   priority  := "PRIORITY" NUMBER    (an integer)
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

  // Each optional clause returns the span it covered so the statement span can include it.
  const optionalCf = (): { cf: number; end?: Span } => {
    if (!isKeyword(peek(), "CF")) return { cf: 1 };
    next();
    const t = next();
    if (t.kind !== "number") return fail("EXPECTED_NUMBER", `Expected a number after 'CF', found ${describe(t)}`, t);
    if (t.value < -1 || t.value > 1) {
      return fail("CF_OUT_OF_RANGE", `CF must be between -1 and 1, got ${t.text}`, t);
    }
    return { cf: t.value, end: t.span };
  };

  const optionalPriority = (): { priority: number; end?: Span } => {
    if (!isKeyword(peek(), "PRIORITY")) return { priority: 0 };
    next();
    const t = next();
    if (t.kind !== "number") {
      return fail("EXPECTED_NUMBER", `Expected a number after 'PRIORITY', found ${describe(t)}`, t);
    }
    if (!Number.isInteger(t.value)) {
      return fail("EXPECTED_INTEGER", `PRIORITY must be a whole number, got ${t.text}`, t);
    }
    return { priority: t.value, end: t.span };
  };

  const parseFact = (): Fact => {
    const atom = expectIdent("a fact name");
    return { ...atom, cf: optionalCf().cf };
  };

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
    const cf = optionalCf();
    const priority = optionalPriority();
    const end = priority.end ?? cf.end ?? conclusion.span;
    const start = ruleToken.span;
    return {
      name: name.name,
      premises,
      conclusion,
      cf: cf.cf,
      priority: priority.priority,
      // Rules sit on one line, so the span runs from `rule` to the end of the last clause.
      span: { line: start.line, col: start.col, length: end.col + end.length - start.col },
    };
  };

  const parseStatement = () => {
    const t = next();
    if (isKeyword(t, "FACT")) {
      kb.facts.push(parseFact());
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
