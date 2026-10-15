# ADR 0003: Closed-world sandbox, no user questions

- Status: Accepted
- Date: 2026-10-15

## Context

Classic consultation systems such as MYCIN ask the user for missing facts during backward chaining, and they answer "WHY are you asking?". This makes the engine resumable and the UI stateful.

## Decision

The playground is a pure sandbox. All facts are entered before a run. A goal that no rule can conclude and that is not in working memory is treated as unprovable (closed-world assumption). "WHY" becomes: click any subgoal to see which rule needed it, up to the top goal. "HOW" shows the chain of rules behind a conclusion.

## Consequences

- Engines are plain functions from a knowledge base to a trace. They are easy to test and to replay step by step.
- The car-troubleshooting example uses symptom checkboxes instead of a question dialog.
- We do not build hooks for asking the user now. Adding them would be a deliberate v2 change.
