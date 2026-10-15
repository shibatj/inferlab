# ADR 0004: Certainty factor semantics

- Status: Accepted
- Date: 2026-10-15

## Context

Learners attach certainty factors (CFs) to facts and rules, as in MYCIN. The MYCIN model leaves several details open, and each one changes the numbers learners see.

## Decision

- **Range.** CFs are in [-1, 1]. A missing CF means 1.
- **AND.** The CF of a conjunction is the minimum of its premise CFs.
- **Rule firing.** A rule contributes premise CF × rule CF.
- **Threshold.** A premise holds only when its CF is above 0.2, as in MYCIN. A conclusion at or below 0.2 stays in working memory but does not trigger other rules.
- **Combining.** Evidence for the same conclusion is combined with the MYCIN formula. Combining exact 1 with exact -1 is undefined (0/0), and we define it as 0.
- **Forward chaining with refraction.** Each rule fires once, using its premises' CFs at the moment it fires. If a premise's CF later rises, earlier firings are not revised. Re-firing would let circular rules raise each other's CF towards 1 forever.

## Consequences

- Forward chaining always terminates. In some knowledge bases, its CFs depend on firing order, so they also depend on the conflict-resolution strategy. A test pins this behaviour, and the lessons teach it as a known limitation of naive forward chaining with CFs.
- Backward chaining (ADR 0005) evaluates every rule for a goal before using its CF, so it gives order-independent results in acyclic knowledge bases. This is why the Mini-MYCIN example uses backward chaining, as MYCIN itself did.
