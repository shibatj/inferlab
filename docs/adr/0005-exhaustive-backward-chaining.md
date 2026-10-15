# ADR 0005: Exhaustive, memoised backward chaining

- Status: Accepted
- Date: 2026-10-15

## Context

Prolog-style backward chaining stops at the first rule that proves a goal. With certainty factors, that discards the remaining evidence: two supporting rules should give more belief than one.

## Decision

- **Exhaustive search.** For each goal, try every rule that concludes it, in rule order, and combine their evidence with the goal's own fact CF (if any). This is how MYCIN worked.
- **AND short-circuit.** Inside a rule, stop at the first premise whose CF is at or below 0.2. The tree records the remaining premises as `skipped`.
- **Closed world.** A goal with no fact and no rule is `unknown`, with CF 0.
- **Cycles.** A goal met again while it is still being proven becomes a `cycle` node with CF 0. Circular evidence is ignored.
- **Memoisation.** Each atom is evaluated once and later occurrences reuse the result (`cached` nodes). Exception: goals evaluated inside a cycle saw incomplete evidence, so they are not cached and are re-evaluated when they come up again.
- **Output.** The engine returns the full AND/OR tree, plus an open/close event log for step-by-step replay.

## Consequences

- Results do not depend on rule order in acyclic knowledge bases.
- The search always terminates, because stack depth is bounded by the number of distinct atoms. Re-evaluating partial goals can be exponential in pathological cyclic knowledge bases. That is acceptable at teaching size.
- The tree shows every alternative (the OR branches), which is what the AND/OR view should teach. It is larger than a Prolog trace.
