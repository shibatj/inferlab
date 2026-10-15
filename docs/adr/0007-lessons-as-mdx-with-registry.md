# ADR 0007: Lessons as MDX files with a typed registry

- Status: Accepted
- Date: 2026-10-15

## Context

There are six lessons, each in Thai and English (Q14). Lessons mix prose with interactive components: quizzes, predict-the-next-rule questions and three widgets. Progress must be shown per lesson without a backend (Q13, Q25).

## Decision

- **Content.** Each lesson is one MDX file per language: `src/content/lessons/{th,en}/<slug>.mdx`. It is compiled at build time by `@next/mdx`, using `remark-gfm` for tables (named as a string, as Turbopack requires).
- **Registry.** `src/lessons/registry.ts` lists the slugs in the suggested order, with bilingual titles and summaries and the ids of every quiz in the lesson.
  - A test reads every MDX file and checks that its `<Quiz>` and `<PredictNextRule>` ids equal the registry list, in order, in both languages. That keeps the two translations structurally identical and the progress counts correct.
- **Context, not props.** MDX components receive only the props written in the file. `LessonProvider` gives them the page language and its strings through React context, so lesson authors never pass `lang`.
- **Engine-graded questions.** `<PredictNextRule>` takes only a rule source, a strategy and a cycle. The real engine builds the question and marks the answer, so a question can never disagree with the playground.
- **Progress.** The ids of correctly answered quizzes are kept in localStorage and read with `useSyncExternalStore`. A custom event updates every component in the same tab, and the `storage` event updates other tabs.

## Consequences

- Adding a lesson means one registry entry and two MDX files; the test fails until all three agree.
- Quiz answers are visible in the page source. That is acceptable for self-study: nothing is graded for credit.
- Translations can still drift in prose. The parity test only checks quiz structure, so the author must review both texts (Q14).
