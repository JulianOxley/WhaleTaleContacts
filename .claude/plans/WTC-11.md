---
ticket: WTC-11
epic: WTC-10
pages: [CKB-1, CKB-9, CKB-2, CKB-4]
---

# WTC-11: Canonical contact model and provenance

## Decisions (user, 2026-09-25)

- **Depends on WTC-3.** The toolchain (TypeScript, Vitest, ESLint, Node 22.12 or later, `npm run build`) is built
  there, not here. Build WTC-11 on a branch cut from `main` after WTC-3 has merged. Section B below is withdrawn.
- **Imports use `NodeNext`**, so relative imports carry `.js`: `import { SOURCE_KINDS } from "./source-kind.js"`.
  Type-only imports use `import type` (`verbatimModuleSyntax`). `@types/node` is available for the purity test.
- **All proposed criteria are approved**: 4, 6, 10 (`actionFor`), 11 (`explain`) and 13.
- **Outcome spellings:** `'merged' | 'excluded' | 'flagged-for-review' | 'inferred'`.
- **Source record ids:** type `` `${SourceKind}:${string}` `` (`<source>:<key>`). How the key is derived stays with the
  adapters (WTC-12/13/14).
- **Normalised fields:** given name, family name, full name, emails[], phones[], company, title, **plus `linkedinUrl`**.
  CKB-4 rule M3 ("same LinkedIn profile URL: high, merge") needs it.
- **Raw field type:** `Readonly<Record<string, string | readonly string[]>>`.
- **Deferred to WTC-16:** contact identity (Open question 7) and confidence/outcome consistency (Open question 8).
- **Lint:** ESLint, set up in WTC-3.

## Sources fetched

| Source | How reached | Notes |
| --- | --- | --- |
| WTC-11 (story) | getIssue | Carries 4 acceptance criteria. No comments. remoteLinks: CKB-1 |
| WTC-10 (epic) | getIssue on parent | Definition of done, build order (WTC-11 is **first**), out-of-scope list. No comments, no remoteLinks |
| CKB-1 "Data model and provenance" | remoteLinks of WTC-11 | The three record types and what the confidence levels mean. relatedPages: CKB-9 |
| CKB-9 "Engineering standards and privacy" | relatedPages of CKB-1 (one hop) | Stack, boundaries between src/ingest, src/model and src/review, rule layout, privacy. relatedPages: none |
| CKB-4 "Matching rules" | Checked by the session when recording the user's decisions | Rule M3 matches on LinkedIn profile URL, which is why `linkedinUrl` is a normalised field |
| CKB-2 "Source formats" | **Not** linked from WTC-11. Reached through sibling WTC-20 (found with searchIssues parent=WTC-10) | Fetched only to understand the four source kinds (for example, why `google` and `google-other` are separate). Used as context, not as a source of criteria |

Also read: WTC-20 (summary and criteria, for fixture context); the sibling list for WTC-10; repo files AGENTS.md, docs/README.md, docs/engineering-standards.md, docs/state.md, package.json, .nvmrc, .gitignore, .github/workflows/ci.yml, scripts/check-plan.mjs, .claude/agents/model-developer.md, .claude/agents/tester.md.

The ticket is **not thin**: it states its own acceptance criteria and links a page.

## Summary of the requirement

This ticket defines the data shapes that the rest of the MVP uses. Adapters produce these records and rules consume them (WTC-11 description). It has no I/O and no rules. There are three record types (CKB-1):

- **Source record**: one row or card from one export, exactly as it was read, plus normalised fields. It is never modified after ingest (CKB-1). Its source is one of `linkedin`, `google`, `google-other` or `phone` (WTC-11). CKB-2 explains that `google-other` is Google's separately exported "Other contacts", which Gmail fills automatically from mail traffic.
- **Contact** (the "golden" record): merged fields. Every field value carries the source record id(s) it came from. A contact may keep several emails and phones, and one of each is marked primary (WTC-11, CKB-1).
- **Decision**: one entry per rule outcome. It holds the rule id, the source record ids involved, the outcome (merged / excluded / flagged for review / inferred), a confidence (high / medium / low) and a plain-English reason (WTC-11, CKB-1). The decision log is how any output row is explained back to its inputs (CKB-1).
- **Confidence semantics**: high means act automatically. Medium means ask the user through the review queue. Low means record the observation but do not act on it (CKB-1).
- **Purity**: the model has no file or network access (WTC-11, CKB-9). src/review may import model types (CKB-9), so these types are the contract for WTC-18 as well.

## Acceptance criteria

Items marked [ticket] are stated in WTC-11. Items marked [CKB-1] / [CKB-9] / [WTC-10 DoD] come from those sources. Items marked **[proposed]** are the planner's own additions to make the criteria testable. The ticket did not carry them. **The user approved all of them on 2026-09-25.**

1. [ticket] The `SourceKind` type accepts exactly `linkedin`, `google`, `google-other` and `phone`. A runtime list `SOURCE_KINDS` exposes these four values and no others, so adapters and tests can enumerate them.
2. [ticket] A `SourceRecord` carries `source: SourceKind`, a stable `id`, the `raw` fields exactly as read, and `normalised` fields.
3. [CKB-1] A source record cannot be modified after it is created. The factory `createSourceRecord(...)` returns a deeply frozen object, so an attempt to change `raw`, `normalised` or `id` throws in strict mode or has no effect. The `readonly` types also make such changes fail typecheck.
4. [CKB-1, **proposed** mechanism] `createSourceRecord` does not change the raw input it receives. It keeps its own copy, so a later change to the caller's input object does not reach the record.
5. [ticket] A `Contact` holds merged fields. Every field value is a `{ value, sources }` pair, and `sources` is a non-empty list of source record ids.
6. [CKB-1] A `Contact` may hold several emails and several phones. When there is at least one email, exactly one is marked primary. The same holds for phones. **[proposed]** A pure validator `validateContact(contact)` reports a problem when this is broken: none primary, more than one primary, or a field value with an empty `sources` list.
7. [ticket] A `Decision` records `ruleId`, `sourceRecordIds` (non-empty), `outcome`, `confidence` and `reason` (a non-empty string).
8. [ticket] The `Outcome` type accepts exactly four values, one each for merged, excluded, flagged for review and inferred. `OUTCOMES` exposes them at runtime. The exact spellings are listed in Open questions.
9. [ticket] The `Confidence` type accepts exactly `high`, `medium` and `low`. `CONFIDENCES` exposes them at runtime.
10. [CKB-1, **proposed** as code] A pure function `actionFor(confidence)` maps `high` to `'act'`, `medium` to `'review'` and `low` to `'record-only'`. This puts the CKB-1 meanings in one place so later rules do not each re-implement them.
11. [WTC-10 DoD "explainable"; **proposed** helper] A pure function `explain(contact, decisions)` returns the decisions whose `sourceRecordIds` overlap any source id cited by the contact. This lets an output row be traced back to its inputs, as CKB-1 requires.
12. [ticket, CKB-9] The model is pure. No file under `src/model/` imports `fs`, `node:fs`, `fs/promises`, `path`, `http`, `https`, `net`, `dgram`, `child_process`, `node:*` I/O modules, or anything from `src/ingest` or `src/review`, and none calls `fetch`. This is checked by a static test that scans the source.
13. [WTC-10 DoD "identical output", **proposed**] Model code does not use `Date.now`, `new Date()`, `Math.random` or `crypto.randomUUID`. Calling any factory or helper twice with equal inputs gives deep-equal results. The same static scan checks this.

## Epic definition of done, as it applies here

- **No real personal data committed**: all test data in this ticket is fabricated and written inline (see Fixture guidance). WTC-20's fixture set does not exist yet, because it is second in the build order.
- **Every merge/exclusion is explainable (rule, source records, confidence)**: this ticket supplies the `Decision` shape and the provenance on `Contact` that make it possible (criteria 5, 7, 11). No rules fire yet.
- **Re-runs give identical output**: covered by criterion 13 (no clocks or randomness in the model) and by requiring stable ids (criterion 2). How ids are derived is covered in Open questions.
- **A new rule can be added without editing a shared file**: nothing in this ticket should force later rules to edit these files. In particular, `ruleId` is a plain `string`, not a closed union listing every rule. Otherwise every new rule would have to edit `decision.ts`. Rule discovery under `src/model/rules/<kind>/` (CKB-9) is **not** built here.

## Owner

**model-developer.** All product code goes under `src/model/` (CKB-9, AGENTS.md). ingest-developer and review-developer have no work in this ticket. They will consume these types in WTC-12/13/14 and WTC-18.

The toolchain is WTC-3, which must be merged first. model-developer touches nothing outside `src/model/`.

## File plan

### A. Product code (model-developer)

The repo has no `src/` yet. Keep one concern per file so later tickets add files rather than edit these ones.

| File | Create/Modify | What and why |
| --- | --- | --- |
| `src/model/source-kind.ts` | create | `SourceKind` union and `SOURCE_KINDS` readonly array (criterion 1). |
| `src/model/confidence.ts` | create | `Confidence` union, `CONFIDENCES`, `actionFor()` (criteria 9, 10). |
| `src/model/outcome.ts` | create | `Outcome` union and `OUTCOMES` (criterion 8). |
| `src/model/source-record.ts` | create | `SourceRecordId` type, `SourceRecord` type (readonly), `RawFields` and `NormalisedFields` types, and the `createSourceRecord(input)` factory that copies and deep-freezes (criteria 2 to 4). It defines the normalised field *shape* only. The normalisation functions belong to later tickets. |
| `src/model/provenance.ts` | create | Generic `Sourced<T> = { readonly value: T; readonly sources: readonly SourceRecordId[] }`, plus the primary-flagged variant for emails and phones (criterion 5). |
| `src/model/contact.ts` | create | `Contact` type and `validateContact()` (criteria 5, 6). |
| `src/model/decision.ts` | create | `Decision` type and, if the developer wants it, a `createDecision()` factory that rejects an empty reason or empty source ids (criterion 7). |
| `src/model/explain.ts` | create | `explain(contact, decisions)` (criterion 11). |

Do **not** add a `src/model/index.ts` barrel. Every later ticket would edit it, which makes it a shared file. Consumers import from the specific module.

The tester works without reading these files, so the export names above (`SOURCE_KINDS`, `CONFIDENCES`, `OUTCOMES`, `actionFor`, `createSourceRecord`, `validateContact`, `explain`, and optionally `createDecision`) and their module paths are the **public contract**. Keep them as named here. Internal details are the developer's choice: the deep-freeze helper, the exact shape of `validateContact`'s return value (proposed: an array of problem strings, empty when valid), and how the types are written.

### B. Toolchain: withdrawn, moved to WTC-3

Kept for the record only. Do not do this in WTC-11.

~~Original section:~~

`package.json` currently has echo stubs for `typecheck`, `lint` and `test`. There is no TypeScript, no Vitest and no tsconfig. CKB-9 requires TypeScript on Node 22 with Vitest. As the first ticket in the build order, WTC-11 cannot be tested without these:

| File | Change |
| --- | --- |
| `package.json` | Add devDependencies `typescript` and `vitest` (plus `@types/node` if needed). Set `typecheck` to `tsc --noEmit` and `test` to `vitest run`. |
| `package-lock.json` | Regenerated by npm. |
| `tsconfig.json` | create. Strict mode, ESM, `src` and `tests`. |
| `.nvmrc` | Currently `20`. CKB-9 says Node 22 (see Open question 2). |
| `docs/engineering-standards.md` | Fill in the Stack line and the domain/UI split from CKB-9. That is repo *how*, so it belongs in docs; do not restate requirements there. |

### C. Tests (tester)

| File | What |
| --- | --- |
| `tests/model/source-record.test.ts` | Criteria 1 to 4 |
| `tests/model/contact.test.ts` | Criteria 5, 6, 11 |
| `tests/model/decision.test.ts` | Criteria 7 to 10 |
| `tests/model/purity.test.ts` | Criteria 12, 13. It reads `src/model/**/*.ts` as text and checks for forbidden imports and calls. Reading files is fine in a test, but the test must stay out of `src/model`. |

The location (`tests/model/` versus tests next to the source) is proposed. Either works with Vitest's defaults. A separate directory keeps the tester away from the implementation files.

## Fixture and test guidance for the tester

- WTC-20's fixture files do not exist yet (it comes next in the build order). Write the fabricated records **inline** in the tests. Do not create `fixtures/`, which belongs to WTC-20.
- Use obviously fabricated data only (WTC-10 DoD, CKB-9): names like "Ada Example" or "Test Person"; emails on the reserved domains `example.com`, `example.org` or `example.net`; phones from fictional ranges such as UK `+44 7700 900xxx` or US `555-01xx`; companies like "Example Widgets Ltd".
- Cover each source kind at least once, including `google-other`.
- For provenance, build one contact from two source records, for example `linkedin:…` and `phone:…`. Give it two emails from different sources and check that each email's `sources` lists the right id and that exactly one is primary.
- Negative cases for `validateContact`: zero primary emails, two primary emails, and an empty `sources` list.
- Immutability: run in strict mode (ES modules are strict by default) and expect a `TypeError` when assigning to a frozen field. Also check that changing the caller's input after creation does not change the record.
- Where a criterion is marked [proposed] above, note in your output that it came from the plan and not from the ticket.

## Open questions

All resolved or deferred by the user on 2026-09-25 (see Decisions).

1. **[Resolved: WTC-3]** **Toolchain ownership.** No agent owns `package.json`, `tsconfig.json` or `.nvmrc`. Options: (a) model-developer does it as the first commit under WTC-11 (`WTC-11: add TypeScript and Vitest toolchain`); (b) the user or session does it as a separate chore before WTC-11. The commit hook requires a ticket key, and no tooling ticket exists. The planner recommends (a), but this needs the user's approval.
2. **[Resolved: Node 22, in WTC-3]** **Node version.** `.nvmrc` says 20 and CKB-9 says 22. CI reads `.nvmrc`. Either bump `.nvmrc` to 22, or correct CKB-9.
3. **[Resolved: accepted]** **Outcome spellings.** The ticket says "merged, excluded, flagged for review, inferred". Proposed identifiers: `'merged' | 'excluded' | 'flagged-for-review' | 'inferred'`. Confirm before WTC-15/16/18 depend on them.
4. **[Resolved: `<source>:<key>`, key derivation left to the adapters]** **Stable source id format and derivation.** The ticket requires a "stable source id" but does not define it. Proposed type: a string prefixed with the source kind (for example `linkedin:<key>`). *How* the key is derived deterministically (row content hash, LinkedIn URL, vCard UID, row index) is an adapter concern for WTC-12/13/14. WTC-11 should only fix the type and the prefix convention, if any.
5. **[Resolved: accepted, plus `linkedinUrl`]** **Normalised field set.** CKB-1 says "plus normalised fields" without listing them. Proposed minimum: given name, family name, full name, emails[], phones[], company, title. These are the fields CKB-2 names across all three formats. Normalisation *rules* (email lower-casing, phone E.164, and so on) are out of scope here and belong to later model tickets. Confirm that the field list is enough.
6. **[Resolved: accepted]** **Raw field shape.** CSV rows are one value per header, but vCard can repeat EMAIL and TEL lines (CKB-2). Proposed type: `Readonly<Record<string, string | readonly string[]>>`. Alternative: always `string[]`.
7. **[Deferred: WTC-16]** **Contact identity.** A contact needs an id for the review queue and for re-runs to give identical output. Deriving it from the sorted source record ids is stable but changes when a merge changes. Not decided here; it may belong to WTC-16.
8. **[Deferred: WTC-16]** **Confidence/outcome consistency.** CKB-1 implies that `medium` goes to the review queue, but it does not say that a medium decision *must* have outcome `flagged-for-review`, or that `low` cannot be `merged`. No validator is added for this. Decide in WTC-16 or WTC-18, or add it here if the user wants it.
9. **[Kept, as context only]** **CKB-2 citation.** Listed in `pages` because it was fetched, but it is not linked from WTC-11 or its one-hop pages. It was used only to understand the source kinds.
10. **[Resolved: ESLint, in WTC-3]** **Lint.** CKB-9 names no linter. The `lint` script stays a stub unless the user picks one.
