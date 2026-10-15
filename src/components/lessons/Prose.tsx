"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLesson } from "./LessonContext";

/** A highlighted aside. `tone="key"` for key ideas, `"warn"` for common mistakes. */
export function Callout({ tone = "key", children }: { tone?: "key" | "warn"; children: ReactNode }) {
  const style = tone === "warn" ? "border-warn bg-warn-soft" : "border-accent bg-accent-soft";
  return <aside className={`my-6 rounded-lg border-l-4 px-4 py-3 text-[15px] [&>p]:my-1 ${style}`}>{children}</aside>;
}

/** Opens the playground with one of the example knowledge bases loaded. */
export function PlaygroundLink({ example }: { example: string }) {
  const { lang, dict } = useLesson();
  return (
    <Link
      href={`/${lang}/playground?example=${example}`}
      className="not-prose my-4 inline-block rounded-lg border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft"
    >
      {dict.tryInPlayground} →
    </Link>
  );
}
