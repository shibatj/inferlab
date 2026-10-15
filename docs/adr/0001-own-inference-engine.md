# ADR 0001: Write our own inference engine

- Status: Accepted
- Date: 2026-10-15

## Context

InferLab teaches expert systems by letting learners run rules and watch each inference step. The UI needs a full trace of every cycle: the conflict set, which rule fired and why, and what was added. Off-the-shelf JavaScript rule engines (for example `json-rules-engine`) return results, not a teachable trace, and they hide the recognise–act cycle we want to show.

## Decision

Implement the parser and the inference engine ourselves in TypeScript under `src/engine/`. Keep it free of React and Next.js so it can be unit-tested on its own.

## Consequences

- The engine returns exactly the trace the UI needs.
- We own correctness, so the engine must have thorough unit tests (Vitest, run in CI).
- Algorithms stay simple (naive matching, no Rete). That is fast enough for teaching-sized knowledge bases.
