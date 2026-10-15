"use client";

import Link from "next/link";
import { EXERCISES, exerciseProgressId } from "@/exercises/exercises";
import type { Lang } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { useProgress } from "@/lessons/progress";

export function ExerciseList({ lang, dict }: { lang: Lang; dict: Dictionary["exercises"] }) {
  const done = useProgress();
  return (
    <ol className="space-y-3">
      {EXERCISES.map((ex, i) => {
        const solved = done.has(exerciseProgressId(ex.id));
        return (
          <li key={ex.id}>
            <Link
              href={`/${lang}/exercises/${ex.id}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-panel p-4 hover:border-accent"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold ${
                  solved ? "bg-ok-soft text-ok" : "bg-subtle text-muted"
                }`}
              >
                {solved ? "✓" : i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{ex.title[lang]}</span>
                <span className="block text-sm text-muted">{dict.mode[ex.mode]}</span>
              </span>
              {solved && <span className="text-sm text-ok">{dict.solved}</span>}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
