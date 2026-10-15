# InferLab

[![CI](https://github.com/shibatj/inferlab/actions/workflows/ci.yml/badge.svg)](https://github.com/shibatj/inferlab/actions/workflows/ci.yml)

Interactive e-learning for **expert systems** (Thai / English). Write IF–THEN rules in a small language and watch an inference engine run forward and backward chaining step by step.

> Status: **M1 — engine core.** The rule parser and forward chaining work and are tested. The UI comes in M3.

## Rule language

```
# Identify an animal
fact has_hair
fact eats_meat

rule Z1: IF has_hair THEN mammal
rule Z5: IF mammal AND eats_meat THEN carnivore
```

## Development

```bash
npm install
npm test          # engine unit tests (Vitest)
npm run typecheck
npm run lint
npm run dev       # Next.js dev server
```

## Docs

- [How it works: parser and forward chaining](docs/how-it-works/01-parser-and-forward-chaining.md) (Thai)
- [Architecture decision records](docs/adr/)

## Roadmap

1. **M1** Parser and forward chaining, with tests ✅
2. **M2** Backward chaining, conflict-resolution strategies, certainty factors
3. **M3** Playground UI: editor, step log, working memory, AND/OR tree, example knowledge bases
4. **M4** Six bilingual lessons, quizzes, fuzzy/frames/semantic-net widgets
5. **M5** Auto-graded exercises, E2E tests, production deploy

## License

[MIT](LICENSE)
