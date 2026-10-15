"use client";

import { useId, useState, type ReactNode } from "react";
import { markCorrect, useProgress } from "@/lessons/progress";
import { useLesson } from "./LessonContext";

/** Shared frame for both quiz kinds: options, a check button and feedback. */
export function QuizShell({
  id,
  label,
  question,
  options,
  answer,
  explanation,
  children,
}: {
  id: string;
  label: string;
  question: ReactNode;
  options: ReactNode[];
  answer: number;
  explanation?: ReactNode;
  children?: ReactNode;
}) {
  const { dict } = useLesson();
  const done = useProgress().has(id);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const name = useId();
  const correct = checked && choice === answer;

  return (
    <section className="not-prose my-8 rounded-xl border border-line bg-panel p-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-accent">
        {label}
        {done && <span className="rounded bg-ok-soft px-1.5 py-0.5 text-ok">✓ {dict.complete}</span>}
      </div>
      {children}
      <p className="font-medium">{question}</p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">{question}</legend>
        {options.map((option, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              checked && i === answer && correct
                ? "border-ok bg-ok-soft"
                : checked && i === choice && !correct
                  ? "border-bad bg-bad-soft"
                  : "border-line hover:bg-subtle"
            }`}
          >
            <input
              type="radio"
              name={name}
              className="mt-1 accent-[var(--accent)]"
              checked={choice === i}
              disabled={correct}
              onChange={() => {
                setChoice(i);
                setChecked(false);
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-3 flex items-center gap-3">
        {!correct && (
          <button
            type="button"
            disabled={choice === null}
            onClick={() => {
              setChecked(true);
              if (choice === answer) markCorrect(id);
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {dict.quiz.check}
          </button>
        )}
        {checked && (
          <span role="status" className={`text-sm font-semibold ${correct ? "text-ok" : "text-bad"}`}>
            {correct ? dict.quiz.correct : dict.quiz.incorrect}
          </span>
        )}
      </div>
      {checked && explanation && <div className="mt-3 border-t border-line pt-3 text-sm text-muted">{explanation}</div>}
    </section>
  );
}

/** Multiple-choice question. `answer` is the index of the correct option. */
export function Quiz(props: {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}) {
  const { dict } = useLesson();
  return <QuizShell {...props} label={dict.quiz.label} />;
}
