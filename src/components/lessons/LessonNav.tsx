"use client";

import Link from "next/link";
import type { Lang } from "@/i18n/config";
import { fmt, type Dictionary } from "@/i18n/dictionaries";
import { useProgress } from "@/lessons/progress";
import { LESSONS } from "@/lessons/registry";

function useLessonProgress() {
  const done = useProgress();
  return (quizzes: string[]) => quizzes.filter((q) => done.has(q)).length;
}

/** Sidebar on lesson pages: every lesson with a progress tick. */
export function LessonSidebar({ lang, current, dict }: { lang: Lang; current: string; dict: Dictionary["lessons"] }) {
  const count = useLessonProgress();
  return (
    <nav className="sticky top-20 space-y-1 text-sm">
      <Link href={`/${lang}/lessons`} className="mb-3 block font-semibold text-muted hover:text-fg">
        {dict.title}
      </Link>
      {LESSONS.map((l, i) => {
        const complete = count(l.quizzes) === l.quizzes.length;
        return (
          <Link
            key={l.slug}
            href={`/${lang}/lessons/${l.slug}`}
            aria-current={l.slug === current ? "page" : undefined}
            className={`flex items-start gap-2 rounded-md px-2 py-1.5 ${
              l.slug === current ? "bg-accent-soft font-semibold text-accent" : "hover:bg-subtle"
            }`}
          >
            <span className={`w-4 shrink-0 ${complete ? "text-ok" : "text-muted"}`}>{complete ? "✓" : i + 1}</span>
            <span>{l.title[lang]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Lesson cards on the lessons index page. */
export function LessonList({ lang, dict }: { lang: Lang; dict: Dictionary["lessons"] }) {
  const count = useLessonProgress();
  return (
    <ol className="space-y-3">
      {LESSONS.map((l, i) => {
        const n = count(l.quizzes);
        const complete = n === l.quizzes.length;
        return (
          <li key={l.slug}>
            <Link
              href={`/${lang}/lessons/${l.slug}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4 hover:border-accent"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold ${
                  complete ? "bg-ok-soft text-ok" : "bg-subtle text-muted"
                }`}
              >
                {complete ? "✓" : i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{l.title[lang]}</span>
                <span className="block text-sm text-muted">{l.summary[lang]}</span>
              </span>
              <span className="text-sm tabular-nums text-muted">
                {fmt(dict.progress, { done: n, total: l.quizzes.length })}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
