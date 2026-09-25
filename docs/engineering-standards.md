# Engineering standards

## Stack

- Language: TypeScript, strict mode, ESM (`"type": "module"`), on Node 22 (`.nvmrc`)
- Module resolution: `NodeNext`, so relative imports carry the `.js` extension:
  `import { x } from "./source-kind.js"`
- Tests: Vitest (`npm run test` runs `vitest run`)
- Lint: ESLint with typescript-eslint's `recommended` rules, over `src/` and `tests/`
- Typecheck: `tsc --noEmit`
- Package manager: npm
- Pipeline: a command-line tool runs it
- Review queue: a local web page served by Vite
- Dev server: `npm run dev` — http://localhost:5173

## Layout

```
src/
  (fill in your source layout)
  ingest/       Source adapters, the clean export and the CLI. The only code that touches files.
  model/       Normalisation, noise, matching, merge and company inference. Pure, one file per rule.
  review/       Local UI for medium-confidence decisions. Imports model types only.
docs/         Engineering standards
.claude/
  agents/     planner, ingest-developer, model-developer, review-developer, tester, reviewer
  plans/      The planner's output, one file per ticket. Committed for audit
```

## The domain / UI split

(Fill in per this project: which directory is pure business logic, what it may not import, how a
new capability gets added without touching a shared file.)

## Testing

- `npm run verify` is the gate. CI runs it on every PR and on `main` and integration branches
  (see `.github/workflows/ci.yml`).
- (Fill in: what the test suite covers, and — as important — what it deliberately does not, so
  reviewers know where to look by hand.)

## What "done" does not mean

A change that passes `npm run verify` locally is not done until CI passes on the PR, because local
and CI environments can drift. It is also not done just because the tests you personally wrote
pass — run the full gate, not a subset.
