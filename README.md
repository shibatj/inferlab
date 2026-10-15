# InferLab

[![CI](https://github.com/shibatj/inferlab/actions/workflows/ci.yml/badge.svg)](https://github.com/shibatj/inferlab/actions/workflows/ci.yml)

Interactive e-learning for **expert systems** (Thai / English). Write IF–THEN rules in a small language and watch an inference engine run forward and backward chaining step by step.

> Status: **M4 — lessons.** Six bilingual lessons (MDX) with multiple-choice and engine-graded "predict the next rule" quizzes, fuzzy-logic, semantic-network and frames widgets, and per-browser progress — plus the M3 playground. Desktop browsers only.

## Rule language

```
# Identify an animal
fact has_hair
fact eats_meat

rule Z1: IF has_hair THEN mammal
rule Z5: IF mammal AND eats_meat THEN carnivore CF 0.9 PRIORITY 1
```

CF (in [-1, 1]) and PRIORITY are optional.

## Development

```bash
npm install
npm test          # engine unit tests (Vitest)
npm run typecheck
npm run lint
npm run dev       # Next.js dev server → http://localhost:3000 (redirects to /th)
```

## Docs

- [How it works 01: parser and forward chaining](docs/how-it-works/01-parser-and-forward-chaining.md) (Thai)
- [How it works 02: certainty factors, conflict resolution, backward chaining](docs/how-it-works/02-backward-chaining-conflict-resolution-cf.md) (Thai)
- [How it works 03: playground UI](docs/how-it-works/03-playground-ui.md) (Thai)
- [How it works 04: lessons, quizzes and widgets](docs/how-it-works/04-lessons.md) (Thai)
- [Architecture decision records](docs/adr/)

## Roadmap

1. **M1** Parser and forward chaining, with tests ✅
2. **M2** Backward chaining, conflict-resolution strategies, certainty factors ✅
3. **M3** Playground UI: editor, step log, working memory, AND/OR tree, example knowledge bases ✅
4. **M4** Six bilingual lessons, quizzes, fuzzy/frames/semantic-net widgets ✅
5. **M5** Auto-graded exercises, E2E tests, production deploy

## License

[MIT](LICENSE)
