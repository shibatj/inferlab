# ADR 0002: Propositional rules with AND only

- Status: Accepted
- Date: 2026-10-15

## Context

Rule languages range from propositional symbols (`IF a AND b THEN c`), through attribute–value tests (`temperature > 38`), to first-order patterns with variables (`(parent ?x ?y)`, as in CLIPS). Each step up adds expressive power and implementation cost. Variables require unification. `NOT` makes the system non-monotonic: a later fact can invalidate an earlier conclusion.

## Decision

- Atoms are propositional symbols. There are no variables and no numeric tests.
- A rule's IF side is a conjunction (`AND`). Its THEN side is a single atom.
- There is no `OR`. Learners write one rule per alternative, which is the textbook encoding.
- There is no `NOT`.
- One statement per line. A syntax error abandons the rest of its line (panic-mode recovery).

## Consequences

- Forward chaining is monotonic. With refraction, it is guaranteed to terminate in at most one cycle per rule.
- The language cannot express fuzzy logic. Fuzzy logic, frames and semantic nets are taught with separate widgets.
- Certainty factors can still be attached to atoms and rules later (planned for M2) without changing this model.
- Variables and negation remain possible future work (v2).
