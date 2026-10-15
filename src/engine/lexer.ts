import type { ParseError, Span } from "./types";

export type Keyword = "FACT" | "RULE" | "IF" | "AND" | "THEN" | "CF" | "PRIORITY";

export type Token =
  | { kind: "keyword"; keyword: Keyword; text: string; span: Span }
  | { kind: "ident"; text: string; span: Span }
  | { kind: "number"; value: number; text: string; span: Span }
  | { kind: "colon"; text: ":"; span: Span }
  | { kind: "newline"; text: "\n"; span: Span }
  | { kind: "eof"; text: ""; span: Span };

const KEYWORDS = new Set<string>(["FACT", "RULE", "IF", "AND", "THEN", "CF", "PRIORITY"]);

const DIGIT = /[0-9]/;

// \p{M} is required for Thai: vowel and tone marks are combining characters, not letters.
const IDENT_START = /[\p{L}_]/u;
const IDENT_PART = /[\p{L}\p{M}\p{N}_]/u;

/**
 * Splits source into tokens. Keywords are case-insensitive; identifiers are case-sensitive.
 * `#` starts a comment that runs to the end of the line. Unknown characters are reported
 * and skipped so the parser can still report errors on later lines.
 *
 * Columns and lengths are in UTF-16 code units, matching editor offsets (CodeMirror).
 */
export function tokenize(source: string): { tokens: Token[]; errors: ParseError[] } {
  const tokens: Token[] = [];
  const errors: ParseError[] = [];
  // Iterate by code point so astral characters don't get split into surrogate halves.
  const chars = Array.from(source);
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < chars.length) {
    const ch = chars[i];

    if (ch === "\n") {
      tokens.push({ kind: "newline", text: "\n", span: { line, col, length: 1 } });
      i++;
      line++;
      col = 1;
    } else if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      col++;
    } else if (ch === "#") {
      while (i < chars.length && chars[i] !== "\n") {
        col += chars[i].length;
        i++;
      }
    } else if (ch === ":") {
      tokens.push({ kind: "colon", text: ":", span: { line, col, length: 1 } });
      i++;
      col++;
    } else if (IDENT_START.test(ch)) {
      const start = i;
      while (i < chars.length && IDENT_PART.test(chars[i])) i++;
      const text = chars.slice(start, i).join("");
      const span = { line, col, length: text.length };
      const upper = text.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({ kind: "keyword", keyword: upper as Keyword, text, span });
      } else {
        tokens.push({ kind: "ident", text, span });
      }
      col += text.length;
    } else if (DIGIT.test(ch) || (ch === "-" && DIGIT.test(chars[i + 1] ?? ""))) {
      // Number: -?digits(.digits)?
      const start = i;
      if (ch === "-") i++;
      while (i < chars.length && DIGIT.test(chars[i])) i++;
      if (chars[i] === "." && DIGIT.test(chars[i + 1] ?? "")) {
        i++;
        while (i < chars.length && DIGIT.test(chars[i])) i++;
      }
      const text = chars.slice(start, i).join("");
      tokens.push({ kind: "number", value: Number(text), text, span: { line, col, length: text.length } });
      col += text.length;
    } else {
      errors.push({
        code: "UNEXPECTED_CHAR",
        message: `Unexpected character '${ch}'`,
        line,
        col,
        length: ch.length,
      });
      i++;
      col += ch.length;
    }
  }

  tokens.push({ kind: "eof", text: "", span: { line, col, length: 0 } });
  return { tokens, errors };
}
