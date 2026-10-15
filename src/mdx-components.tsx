import type { MDXComponents } from "mdx/types";
import { FuzzyWidget } from "@/components/lessons/FuzzyWidget";
import { FramesWidget, SemanticNetWidget } from "@/components/lessons/KnowledgeNetWidgets";
import { PredictNextRule } from "@/components/lessons/PredictNextRule";
import { Callout, PlaygroundLink } from "@/components/lessons/Prose";
import { Quiz } from "@/components/lessons/Quiz";

/** Styles for markdown elements in lessons, plus the components lessons may use. */
const components: MDXComponents = {
  h1: (p) => <h1 className="mb-6 text-3xl font-bold tracking-tight" {...p} />,
  h2: (p) => <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight" {...p} />,
  h3: (p) => <h3 className="mt-8 mb-3 text-lg font-semibold" {...p} />,
  p: (p) => <p className="my-4 leading-relaxed" {...p} />,
  ul: (p) => <ul className="my-4 list-disc space-y-1.5 pl-6" {...p} />,
  ol: (p) => <ol className="my-4 list-decimal space-y-1.5 pl-6" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  a: (p) => <a className="text-accent underline underline-offset-2" {...p} />,
  strong: (p) => <strong className="font-semibold" {...p} />,
  blockquote: (p) => <blockquote className="my-6 border-l-4 border-line pl-4 text-muted" {...p} />,
  hr: () => <hr className="my-10 border-line" />,
  code: (p) => <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[0.9em]" {...p} />,
  pre: (p) => (
    <pre
      className="my-5 overflow-x-auto rounded-lg border border-line bg-panel p-4 font-mono text-sm leading-relaxed [&>code]:bg-transparent [&>code]:p-0"
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b-2 border-line px-3 py-2 text-left font-semibold" {...p} />,
  td: (p) => <td className="border-b border-line px-3 py-2 align-top" {...p} />,
  Quiz,
  PredictNextRule,
  FuzzyWidget,
  SemanticNetWidget,
  FramesWidget,
  Callout,
  PlaygroundLink,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
