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

/** `fact NAME [CF n]` */
export interface Fact extends Atom {
  /** Certainty factor in [-1, 1]. 1 when the source gives none. */
  cf: number;
}

/** `rule NAME: IF a AND b THEN c [CF n] [PRIORITY n]` */
export interface Rule {
  name: string;
  premises: Atom[];
  conclusion: Atom;
  /** Certainty factor in [-1, 1]. 1 when the source gives none. */
  cf: number;
  /** Integer used by the "priority" conflict-resolution strategy; higher fires first. Default 0. */
  priority: number;
  span: Span;
}

export interface KnowledgeBase {
  /** Initial facts, in source order. The engine uses the first declaration of each name. */
  facts: Fact[];
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
  | "EXPECTED_NUMBER"
  | "CF_OUT_OF_RANGE"
  | "EXPECTED_INTEGER"
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
