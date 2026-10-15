# ADR 0006: Fully static UI that replays engine traces

- Status: Accepted
- Date: 2026-10-15

## Context

The project must cost nothing to host (Vercel Hobby). It has no accounts and no backend (Q13), and it supports two languages with separate URLs (Q14). The playground has to show inference step by step, with Back and Reset as well as Step and Run.

## Decision

- **Static pages only.**
  - `app/[lang]` is the root layout, and `generateStaticParams` prerenders `th` and `en`.
  - `/` is redirected with `next.config.ts` `redirects()`: a `lang=en` cookie (set by the language switch) sends visitors to `/en`, and everything else goes to `/th`.
  - There is no `proxy` (middleware). A proxy would run a server function on every request.
- **Theme** is set by an inline `<head>` script, from localStorage or the OS preference, before first paint. Both toggle icons are rendered, and CSS hides one, so server and client markup always match.
- **Desktop only.**
  - `html { min-width: 1024px }` lets narrow desktop windows scroll horizontally.
  - `@media (pointer: coarse)` replaces the app with a notice on touch devices.
- **Replay, not re-run.**
  - The engines already return complete traces: forward steps, and the backward AND/OR tree plus its open/close log.
  - The UI only stores a position `k`. Step, Back, Run and Reset change `k`, and every view is a pure function of `(trace, k)`: `memoryAt`, `treeStateAt`, `howForward`, `whyPath` and `layoutTree` in `src/playground/`. All of them are unit-tested without a browser.
- **Persistence.** The editor text, example, mode, strategy, goal and ticked symptoms are saved to localStorage. The workbench renders only after mount (`useSyncExternalStore`), so it can initialise from storage without a hydration mismatch.

## Consequences

- Every page is a static file, so there are no function invocations to pay for or rate-limit.
- Back and Reset are free and exact, because nothing is recomputed or undone.
- A first visit to `/` always lands on Thai unless the cookie says otherwise. We do not read Accept-Language, because that would need a server function.
- Saved work is per browser. Accounts would be a v2 change.
