---
ticket: WTC-3
epic: WTC-10
pages: [CKB-9]
thin: false
---

# WTC-3: Toolchain (TypeScript, Vitest, ESLint)

## Decisions (user, 2026-09-25)

- **Built by the orchestrating session**, not a developer agent, because no agent owns shared
  config: ingest-developer, model-developer and review-developer are each scoped to their own part
  of `src/`. `tester` and `reviewer` still run afterwards.
- **Module resolution: `NodeNext`.** The pipeline runs on plain Node, so relative imports carry
  the `.js` extension. Recorded in the Stack section of docs/engineering-standards.md.
- **ESLint: typescript-eslint `recommended` only**, no `@eslint/js`. The config also ignores
  `node_modules/` and build output (`dist/`).
- **Empty `src/`: option (b).** The lint script is `eslint .`, with the config's rules scoped to
  `src/**` and `tests/**`.
- **`@types/node@22` is added now.**
- **Build order:** the user has updated WTC-10 so WTC-3 comes first (confirmed in the tracker).

## Sources fetched

| Source | How reached | Notes |
| --- | --- | --- |
| WTC-3 (task) | `getIssue` | Five acceptance criteria. No comments. remoteLinks: CKB-9. Parent: WTC-10 |
| WTC-10 (epic) | `getIssue` on parent | Definition of done, build order, out-of-scope list. No comments, no remoteLinks. **WTC-3 is not in the epic's build order** (see Open question 1) |
| CKB-9 "Engineering standards and privacy" | remoteLinks of WTC-3 | Stack, boundaries, rule layout, privacy. relatedPages: **none**, so there was nothing to follow one hop further |

The planner also ran `searchIssues parent=WTC-10`, which returned 11 children including WTC-3, and `searchIssues text=toolchain`, which returned only WTC-3. These returned summaries only and were not used as sources for criteria.

Repo files read: AGENTS.md, docs/README.md, docs/engineering-standards.md, docs/state.md, docs/git-and-releases.md, docs/plan-policy.md, package.json, package-lock.json, .nvmrc, .gitignore, .mcp.json, .github/workflows/ci.yml, .githooks/commit-msg, .githooks/pre-push, scripts/check-plan.mjs, .claude/agents/*.md (all six) and .claude/plans/WTC-11.md. `src/` and `tests/` do not exist.

No fetch failed. The ticket is **not thin**: it states its own criteria and links a page.

## What the ticket asks for

- The `typecheck`, `lint` and `test` scripts in package.json are currently `echo` stubs. Replace them with real ones "so that npm run verify checks something" (WTC-3).
- TypeScript in strict mode, ESM, covering `src` and `tests`. `typecheck` is `tsc --noEmit` (WTC-3). The stack is TypeScript on Node 22 (CKB-9).
- Vitest. `test` is `vitest run`, with one trivial test that proves the setup works (WTC-3, CKB-9).
- ESLint with the typescript-eslint recommended rules and minimal settings. `lint` runs it on `src` and `tests` (WTC-3). CKB-9 does not name a linter, so ESLint comes from the ticket.
- `.nvmrc` is `22` (WTC-3, CKB-9). It is currently `20`.
- Fill in the Stack section of docs/engineering-standards.md from CKB-9 (WTC-3). CKB-9 Stack says: TypeScript on Node 22, tests with Vitest, a command-line tool runs the pipeline, and the review queue is a local web page served by Vite.

This settles Open questions 2 (Node version) and 10 (lint) in `.claude/plans/WTC-11.md`, and replaces section B of that plan.

## Acceptance criteria

Tags: [WTC-3] means stated in the ticket. [CKB-9] and [WTC-10 DoD] mean from those sources. **[proposed]** means the planner added it to make a criterion testable or to fit the repo. The ticket did not carry these, so the user should confirm them.

1. [WTC-3] `tsconfig.json` has `strict: true`, uses ESM module settings, and its `include` covers `src` and `tests`.
2. [WTC-3, **proposed** mechanism] The project is ESM: package.json has `"type": "module"`.
3. [WTC-3] `npm run typecheck` runs `tsc --noEmit` and exits 0 on the committed tree.
4. [WTC-3] `npm run test` runs `vitest run`. It finds exactly one test file, which contains one trivial test, and exits 0.
5. [**proposed**] The trivial test imports nothing from `src/`. It proves only that the toolchain runs, so it does not depend on WTC-11 code.
6. [WTC-3] `npm run lint` runs ESLint over `src` and `tests`. The config applies typescript-eslint's `recommended` config and little else, and the command exits 0 on the committed tree.
7. [WTC-3, **proposed** check] Lint is real and not a stub. If you temporarily add a file under `tests/` (or `src/`) containing an explicit `any` or an unused variable, `npm run lint` exits non-zero. If you temporarily add a strict-mode violation, such as a parameter with an implicit `any`, `npm run typecheck` exits non-zero. Neither probe file is committed.
8. [**proposed**] `npm run verify` (typecheck, then lint, then test) exits 0, and none of the three scripts is an `echo` any more.
9. [**proposed**] `npm ci` succeeds from a clean clone. `package-lock.json` is regenerated and committed, and it matches package.json. `typescript`, `vitest`, `eslint` and `typescript-eslint` are `devDependencies` (plus `@eslint/js` / `@types/node` only if used; see Open questions 4 and 5).
10. [WTC-3, CKB-9] `.nvmrc` contains `22`.
11. [WTC-3] The Stack section of docs/engineering-standards.md states: TypeScript (strict, ESM) on Node 22, Vitest for tests, ESLint with typescript-eslint, npm as package manager, a CLI that runs the pipeline, and a review queue served locally by Vite. **[proposed]** No other section of that file changes in this ticket. The Stack section records *how* the repo is built and does not copy requirement text beyond what CKB-9's Stack section says (AGENTS.md: "Nothing in docs/ restates a requirement").
12. [**proposed**] The `dev`, `prepare` and `check:plans` scripts are unchanged. Vite is **not** installed here, because it belongs to the review queue ticket (WTC-18).

## Epic definition of done, as it applies here

- **No real personal data committed**: the trivial test contains no names, emails or phone numbers.
- **Explainable merges and exclusions**: does not apply, because this ticket has no product code.
- **Identical output on re-run**: does not apply directly. The committed lockfile makes installs reproducible, which supports it.
- **A new rule can be added without editing a shared file**: the tooling config must not need editing when a rule is added. So the `include` and lint globs cover all of `src` and `tests` by directory and do not list files. Do not create an index or barrel file.

## Owner

No developer agent obviously owns this. ingest-developer, model-developer and review-developer are each scoped to their own part of `src/`, and each is told to stop rather than reach outside it. package.json, tsconfig.json, eslint.config, .nvmrc and docs/ are shared, repo-wide files.

**Recommendation: the orchestrating session builds WTC-3 itself, with the user's explicit approval, and still runs `tester` (verification) and `reviewer` afterwards.** Reasons:
- Giving it to a domain agent would ask that agent to break its own "stay inside your domain" rule. Picking model-developer only because WTC-11 comes next would set a precedent that the model domain owns shared config.
- The work is small, mechanical and fully specified by the ticket. It does not need a domain specialist.

The fallback is model-developer with an explicit written waiver in the hand-off. Either way, AGENTS.md's pipeline names "the developer the plan names", and none fits, so this needs the user's approval before building (Open question 2).

## File plan

| File | Create or modify | What and why |
| --- | --- | --- |
| `package.json` | modify | Add `"type": "module"` (AC 2). Add devDependencies (AC 9). Set `typecheck` to `tsc --noEmit`, `lint` to ESLint over `src` and `tests`, and `test` to `vitest run` (AC 3, 4, 6). Leave `verify`, `dev`, `prepare` and `check:plans` alone. |
| `package-lock.json` | modify (regenerated by npm) | Must be committed, because CI runs `npm ci` (AC 9). |
| `tsconfig.json` | create | Strict, ESM, `noEmit`, includes `src` and `tests`, Node 22 target (AC 1). The developer picks the exact `module`/`moduleResolution` pair (see Open question 3). |
| `eslint.config.js` | create | Flat config with typescript-eslint `recommended`, minimal (AC 6). Ignore `node_modules` and `dist`. |
| `tests/toolchain.test.ts` | create | The one trivial Vitest test (AC 4, 5). The name is proposed; any name under `tests/` works. |
| `.nvmrc` | modify | Change `20` to `22` (AC 10). |
| `docs/engineering-standards.md` | modify | Stack section only (AC 11). |
| `src/` | see Open question 6 | ESLint errors on a path argument that does not exist. |

Not touched: `.github/workflows/ci.yml`, `.githooks/*`, `scripts/check-plan.mjs`, AGENTS.md, `.claude/agents/*`, and the other docs.

## How the tester or verifier should check it

The tester writes no extra tests. The ticket asks for exactly *one* trivial test (AC 4), and the tester must not read the implementation. They check by running commands against the criteria:

1. Start from a clean state: `rm -rf node_modules && npm ci`. It succeeds, and `git config core.hooksPath` prints `.githooks` (the `prepare` script still works).
2. `npm run typecheck`, `npm run lint` and `npm run test` each exit 0. Vitest reports 1 file and 1 test passed.
3. `npm run verify` exits 0.
4. `cat .nvmrc` prints `22`. package.json has `"type": "module"` and no `echo` in typecheck, lint or test.
5. Negative probes, which are deleted afterwards and never committed:
   - Add `tests/lint-probe.ts` containing `export const x: any = 1; const unused = 2;`. `npm run lint` exits non-zero.
   - Add `tests/tsc-probe.ts` containing `export function f(a) { return a; }`. `npm run typecheck` exits non-zero, because of implicit `any` under strict mode.
   - Remove both, and `git status` is clean again.
6. Read the docs diff: only the Stack section of docs/engineering-standards.md changed, and its content matches CKB-9 plus ESLint.
7. `npm run check:plans` passes with `.claude/plans/WTC-3.md` saved.

## CI implications

- `actions/setup-node` reads `node-version-file: .nvmrc`, so after this change CI runs on Node 22 with no workflow edit.
- CI runs `npm ci`, which fails if the lockfile is missing or out of date. The regenerated `package-lock.json` must be committed in the same change.
- CI's `npm run verify` now does real work. From this ticket on, every PR and `demo-*` branch is typechecked, linted and tested.
- The plan-check step will validate `.claude/plans/WTC-3.md` (and `WTC-11.md`, if it is committed on this branch) because they appear in the diff. Both need valid frontmatter.
- Branch `chore/WTC-3-toolchain` carries the key, so it satisfies pre-push. Commits must start with `WTC-3: `.

## Open questions (not decided here)

1. **Build order.** WTC-10 lists the build order as WTC-11, WTC-20, … and does not mention WTC-3. The user has placed WTC-3 before WTC-11, and in practice WTC-11 cannot be tested without it. Consider updating the epic's build order so the tracker matches reality.
2. **Owner.** See the Owner section. The session is recommended, and this needs user approval.
3. **Module resolution.** `NodeNext` requires `.js` extensions in relative imports. `Bundler` (with `module: ESNext`) does not, and it suits the later Vite review queue, but it lets Node-incompatible import paths through for the CLI. This choice affects every later ticket's import style, so the user or developer should decide it deliberately and write the decision into the Stack section.
4. **"Minimal" ESLint config.** Should it be typescript-eslint `recommended` only, or also `@eslint/js` recommended, which the typescript-eslint docs pair with it? The ticket names only typescript-eslint. The planner leans towards typescript-eslint only, to match the ticket's wording.
5. **`@types/node`.** It is not needed for the trivial test. The WTC-11 purity test reads files, and CKB-9 has the CLI on Node 22, so adding `@types/node@22` now avoids a package.json edit later. It is optional, and it is not required by WTC-3.
6. **Empty `src/`.** `eslint src tests` errors when `src` does not exist, and there is no `src/` until WTC-11. Options:
   - (a) `--no-error-on-unmatched-pattern` on the lint script;
   - (b) run `eslint .` with the config's `files` scoped to `src/**` and `tests/**`;
   - (c) commit a placeholder such as `src/.gitkeep`. ESLint may still error with only a dotfile present.

   `tsc` is fine as long as `tests/` has a `.ts` file. The developer should choose one and say which. A dummy `.ts` file in `src/` is not recommended.
7. **Keeping the trivial test.** Should `tests/toolchain.test.ts` be kept after WTC-11 adds real tests, or deleted then? Not decided here.
8. **`engines` field.** Should package.json also get `"engines": { "node": ">=22" }` so local installs warn on older Node? The ticket does not ask for it. Optional.
9. **Other placeholders in docs/engineering-standards.md.** Layout, "The domain / UI split" and Testing are still "(Fill in …)". The WTC-11 plan suggested filling the domain/UI split from CKB-9, but WTC-3 asks only for Stack. Left out of scope.
10. **Dev server line.** The Stack section already says `npm run dev` serves http://localhost:5173, but `dev` is still an echo and Vite is not installed. Keep the line as the intended future state, or mark it "from WTC-18"? The developer should not silently rewrite it.
