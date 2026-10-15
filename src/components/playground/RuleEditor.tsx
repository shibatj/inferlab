"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import { parse, type ParseError } from "@/engine";

const KEYWORDS = /^(fact|rule|if|and|then|cf|priority)\b/i;

/** Highlighting only; the real parser in src/engine reports errors through the linter. */
const ruleLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }
    if (stream.match(KEYWORDS)) return "keyword";
    if (stream.match(/^-?\d+(\.\d+)?/)) return "number";
    if (stream.match(/^[\p{L}_][\p{L}\p{M}\p{N}_]*/u)) return "variableName";
    if (stream.eat(":")) return "punctuation";
    stream.next();
    return null;
  },
});

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "var(--muted)", fontStyle: "italic" },
  { tag: tags.keyword, color: "var(--accent)", fontWeight: "600" },
  { tag: tags.number, color: "var(--warn)" },
  { tag: tags.variableName, color: "var(--fg)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", backgroundColor: "var(--panel)", color: "var(--fg)" },
  ".cm-scroller": { fontFamily: "var(--font-geist-mono), ui-monospace, monospace", lineHeight: "1.6" },
  ".cm-gutters": { backgroundColor: "var(--panel)", color: "var(--muted)", borderRight: "1px solid var(--line)" },
  ".cm-activeLine": { backgroundColor: "var(--subtle)" },
  ".cm-cursor": { borderLeftColor: "var(--fg)" },
  "&.cm-focused": { outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--panel)", color: "var(--fg)", border: "1px solid var(--line)" },
});

/** Converts the parser's 1-based line/column (UTF-16) to document offsets, clamped to the line. */
function toDiagnostic(view: EditorView, e: ParseError, message: string): Diagnostic {
  const line = view.state.doc.line(Math.min(e.line, view.state.doc.lines));
  const from = Math.min(line.from + e.col - 1, line.to);
  const to = Math.min(from + e.length, line.to);
  return { from, to: Math.max(to, from), severity: "error", message };
}

export function RuleEditor({
  value,
  onChange,
  describe,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Localised message for a parse error. */
  describe: (e: ParseError) => string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Read through a ref so the editor, created once, always sees the latest props.
  const latest = useRef({ onChange, describe });
  useEffect(() => {
    latest.current = { onChange, describe };
  });

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          ruleLanguage,
          syntaxHighlighting(highlight),
          lintGutter(),
          // Parse the editor's own text so diagnostics always match what is on screen.
          linter(
            (v) => parse(v.state.doc.toString()).errors.map((e) => toDiagnostic(v, e, latest.current.describe(e))),
            { delay: 250 },
          ),
          theme,
          EditorView.lineWrapping,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) latest.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => editor.destroy();
    // The editor is created once; later `value` changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the document when `value` changes from outside (loading an example).
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full overflow-hidden" />;
}
