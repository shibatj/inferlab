/** A location in the rule source. `line` and `col` are 1-based. */
export interface Span {
  line: number;
  col: number;
  length: number;
}

/** A propositional symbol such as `has_hair`, with where it was written. */
export interface Atom {
  name: string;
  span: Span;
}

/** `rule NAME: IF a AND b THEN c` */
export interface Rule {
  name: string;
  premises: Atom[];
  conclusion: Atom;
  span: Span;
}

export interface KnowledgeBase {
  /** Initial facts, in source order. Duplicates are kept here and ignored by the engine. */
  facts: Atom[];
  /** Rules in source order. Source order is the "rule order" conflict-resolution strategy. */
  rules: Rule[];
}

export type ParseErrorCode =
  | "UNEXPECTED_CHAR"
  | "EXPECTED_STATEMENT"
  | "EXPECTED_IDENT"
  | "EXPECTED_COLON"
  | "EXPECTED_IF"
  | "EXPECTED_AND_OR_THEN"
  | "EXPECTED_END_OF_LINE"
  | "DUPLICATE_RULE";

/**
 * `code` is stable so the UI can show a translated message; `message` is the English fallback.
 */
export interface ParseError extends Span {
  code: ParseErrorCode;
  message: string;
}

export interface ParseResult {
  kb: KnowledgeBase;
  errors: ParseError[];
}
