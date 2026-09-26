---
ticket: WTC-11
epic: WTC-10
pages: [CKB-1, CKB-9, CKB-2, CKB-4, CKB-3, CKB-5, CKB-7, CKB-8]
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

## Addendum (after review, 2026-09-26)

This addendum overrides the earlier sections of this plan wherever they conflict. The earlier Decisions section still applies except where this addendum changes it. On 2026-09-26 the user decided two things: fix the review findings inside WTC-11, and widen the contact types now instead of leaving that to WTC-16 and WTC-17.

Numbering note: the new criteria start at 15. There is no criterion 14.

### Decisions on the addendum (user, 2026-09-26)

- **A. Accepted.** Criterion 20 stands: `validateContact` reports two entries in one field with the same exact `value`.
- **B. Allow `createHash` only.** The purity allowlist is exactly `import { createHash } from "node:crypto"`: the named import `createHash`, and nothing else from that module. Every other external specifier is a violation, and so is any other import from `node:crypto` (namespace, default, `randomUUID`, `randomBytes`, `randomInt`, `webcrypto`, `getRandomValues`).
- **C. Deferred to WTC-16.** `Contact` gets no id in WTC-11. WTC-16 edits contact.ts once to add identity.
- **F. Add `kept-separate` now.** `OUTCOMES` becomes `["merged","excluded","flagged-for-review","inferred","kept-separate"]`, for CKB-8's "keep separate" review choice. This **replaces criterion 8** (four outcomes) with criterion 24 below. The ticket listed four outcomes; the fifth is the user's decision, sourced from CKB-8.

24. [CKB-8, user decision F] The `Outcome` type accepts exactly `merged`, `excluded`, `flagged-for-review`, `inferred` and `kept-separate`, and `OUTCOMES` exposes exactly these five, in that order.

File plan additions: model-developer changes `src/model/outcome.ts` (24); tester updates the `OUTCOMES` tests in `tests/model/decision.test.ts` (24).

### Sources fetched for this addendum

| Source | How reached | Notes |
| --- | --- | --- |
| WTC-16 "Identity matching and merge" | getIssue | Parent WTC-10. remoteLinks: CKB-4. No comments. The key line: "Conflicting field values are resolved by the source precedence on CKB-4, and all values are kept with their provenance." |
| WTC-17 "Company inference" | getIssue | Parent WTC-10. remoteLinks: CKB-5. No comments. The key line: "Inferred values are marked as inferred, with the rule id." |
| WTC-15 "Noise filter rules" | getIssue | Parent WTC-10. remoteLinks: CKB-3. No comments. "Excluded records appear in an exclusion report with the rule id." |
| WTC-18 "Review queue UI" | getIssue | Parent WTC-10. remoteLinks: CKB-8. No comments |
| WTC-10 (epic) | getIssue, fetched again | Definition of done unchanged |
| CKB-4 "Matching rules" | remoteLinks of WTC-16 | Precedence: name, company and title go LinkedIn, then phone, then Google. Email and phone: "keep all values; the primary comes from Google, then phone, then LinkedIn" |
| CKB-5 "Company inference" | remoteLinks of WTC-17 | Three steps: LinkedIn company, then the company of another contact on the same domain (high), then a name derived from the domain (low, "shown for review"). relatedPages: CKB-7 |
| CKB-7 "Free-mail domains" | relatedPages of CKB-5 | A data list, context only |
| CKB-3 "Noise rules" | remoteLinks of WTC-15 | N1 to N6, each with an exclude or flag outcome and a confidence |
| CKB-8 "Review workflow" | remoteLinks of WTC-18 | Medium decisions are queued. Records are shown side by side with the reason. The user chooses merge, keep separate or exclude. Decisions are reapplied on re-run |
| CKB-1, CKB-9 | read again | Unchanged |

None of these tickets has comments. No fetch failed.

### What 16 and 17 need from the model, and nothing more

- **WTC-16 and CKB-4**: every field can hold several conflicting values, each with its own provenance. One of them is the winner by precedence. For emails and phones the winner is the "primary", with its own precedence, and every value is still kept and exported. The two needs are the same: a list of sourced values with exactly one marked as chosen. The difference between single-value and multi-value fields only shows up in the *export*, where a single-value field outputs only its primary. That is WTC-19 or ingest's concern, not the model's.
- **WTC-17 and CKB-5**: a value must be able to say "I was inferred, by rule X". The inferred value still cites source records, meaning the records whose data the inference was drawn from. The confidence and reason belong in the `Decision` the rule emits, not on the value.
- **Contract gap only**: the rules themselves, the precedence tables and the ordering of values are not designed here.

### Widened type design (public contract for the tester)

**`src/model/provenance.ts`**

```ts
export interface Sourced<T> {
  readonly value: T;
  readonly sources: readonly SourceRecordId[];   // non-empty on a Contact (validator)
  readonly inferredBy?: string;                  // present iff the value was inferred; the rule id
}

export interface PrimarySourced<T> extends Sourced<T> {
  readonly primary: boolean;                     // the chosen/winning value of its field
}

/** All values a contact holds for one field, each with provenance; exactly one primary when non-empty. */
export type SourcedValues<T> = readonly PrimarySourced<T>[];

/** The primary entry of a field, or undefined when the field is empty. Pure. */
export function primaryOf<T>(values: SourcedValues<T>): PrimarySourced<T> | undefined;
```

- `inferredBy?: string`, rather than `inferred: boolean` plus `ruleId`, means an "inferred with no rule id" state cannot be written. Absent means the value was read from a source. Present and non-blank means it was inferred by that rule.
- `primaryOf` is **[proposed]**. Without it, the export (WTC-19), review (WTC-18) and later rules would each re-implement "find the chosen value". It returns the first entry with `primary: true`, or `undefined`. It does not validate.

**`src/model/contact.ts`**

```ts
export const CONTACT_FIELDS = [
  "givenName", "familyName", "fullName", "emails", "phones", "company", "title", "linkedinUrl",
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export type Contact = { readonly [K in ContactField]: SourcedValues<string> };

export function validateContact(contact: Contact): string[];
```

- Every field is required and is a list. An empty list means the contact has no value for that field. The optional single `Sourced<string>` fields are removed.
- `CONTACT_FIELDS` is the **only** field list. `Contact` is a mapped type over it, and `validateContact` and `explain` iterate it. The private `singleValueFieldsOf` in contact.ts and the inline list in explain.ts are deleted.
- There is also a compile-time check that `keyof NormalisedFields` (source-record.ts) equals `ContactField`, so the normalised shape and the contact shape cannot drift apart. The developer chooses how, for example a type-level equality assertion inside contact.ts. `tsconfig.json` includes both `src` and `tests`, so either location is typechecked.
- `explain.ts` imports `CONTACT_FIELDS` from contact.ts. That import is one-way, and contact.ts does not import explain.ts.

**No changes** to `Decision`, `Outcome`, `Confidence` or `SourceRecord` shapes. The only changes are the factory validations below.

**Why this avoids later edits.** WTC-16 fills lists and sets `primary`. WTC-17 appends or sets a company entry with `inferredBy`. Neither needs a new field or type in contact.ts or provenance.ts. A rule id is a plain string, so nothing enumerates rules.

### New acceptance criteria

15. [ticket WTC-16, CKB-4] Each field listed in `CONTACT_FIELDS` is a `SourcedValues<string>` on `Contact`: a list of `{ value, sources, primary, inferredBy? }`. A contact can therefore hold several conflicting values for givenName, familyName, fullName, company, title and linkedinUrl, each with its own provenance, as well as for emails and phones.
16. [CKB-4, CKB-1] For every field, when the list is non-empty, exactly one entry is `primary`. For single-value fields "primary" means the value chosen by source precedence. For emails and phones it means the primary address or number. `validateContact` reports zero primaries or more than one, for **every** field in `CONTACT_FIELDS`.
17. [ticket WTC-17] A value that was inferred carries `inferredBy: <rule id>`. A value read from a source has no `inferredBy`. `validateContact` reports an `inferredBy` that is present but empty or whitespace-only.
18. [review, finding 2] `CONTACT_FIELDS` is exported and equals exactly `["givenName","familyName","fullName","emails","phones","company","title","linkedinUrl"]`. The keys of a `Contact` are exactly these, and `keyof NormalisedFields` equals `ContactField`. The second part is checked at typecheck.
19. [review, finding 3] **[proposed]** Each problem string returned by `validateContact` starts with the name of the field it concerns, for example `"company"` or `"phones[1]"`. A contact with exactly one defect yields exactly one problem.
20. [WTC-16 "all values are kept", **proposed**, pending Open question A] `validateContact` reports two entries in the same field with the same `value`. Provenance for one value is accumulated on one entry, not split across duplicates.
21. [review, finding 4] `createSourceRecord` throws when `id` does not start with `` `${source}:` ``. For example, source `google` with id `linkedin:x` throws, source `google` with id `google-other:x` throws, and source `google-other` with id `google:x` throws. It also throws when the key after the prefix is empty or whitespace-only, as in `phone:` or `phone:  `.
22. [review, finding 6] `createDecision` throws on an empty or whitespace-only `ruleId`.
23. [**proposed**] `primaryOf(values)` returns the entry marked primary, or `undefined` for an empty list.

### Changes to existing criteria

- **Criterion 5** is replaced by 15. It becomes: "every field value on a contact is a `PrimarySourced` entry whose `sources` is non-empty." That now covers **every** field.
- **Criterion 6** is widened by 16. The "exactly one primary" rule applies to every field, and the empty-`sources` check applies to every entry of every field.
- **Criterion 7** gains a non-empty `ruleId` (22).
- **Criterion 2** gains the id/source agreement (21).
- **Criterion 4** gains two requirements.
  - `createSourceRecord` copies only the known `NormalisedFields` keys. Unknown extra properties on `normalised` (off-type input) are not carried, and the caller's objects are never frozen.
  - A raw header named `__proto__` or `constructor` is kept as an own property with its value, and the record's `raw` does not get a changed prototype. How this is done is the developer's choice.
- **Criterion 11 (`explain`)** changes in three ways.
  - It gathers source ids from every entry of every field in `CONTACT_FIELDS`.
  - It returns matching decisions **in their input order, each once**. That is needed for identical re-run output.
  - It stays contact-scoped and does **not** explain exclusions. An excluded record never reaches a contact. The exclusion report is WTC-15's, and the `Decision` shape already carries what it needs. If WTC-15 wants a helper, it adds a new file and does not edit explain.ts.
- **Criterion 12 (purity)** is rewritten as an **allowlist**. Every module specifier in `src/model/**/*.ts` must be one of two things:
  - a relative specifier that resolves inside `src/model/`, or
  - on an explicit allowlist of external specifiers.

  "Every module specifier" covers static imports, `import type`, side-effect `import "x"`, `export … from "x"`, dynamic `import("x")` (awaited or not), `require("x")` and `import x = require("x")`. A dynamic `import()` or `require()` whose argument is not a plain string literal is always a violation. The allowlist's contents depend on Open question B. The tester writes it as a single constant, so the decision is a one-line change. A blanket ban on all `node:` imports is **not** the requirement.
- **Criterion 13 (determinism and no network)** is also enforced by identifier and call scanning that ignores comments and string literals. See the pattern list below.
- **Criteria 1 to 3 and 8 to 10**: unchanged.

### Is validateContact changing?

Yes. It iterates `CONTACT_FIELDS` and checks each field for four things:
- every entry has non-empty `sources`;
- a non-empty list has exactly one primary;
- `inferredBy`, if present, is not blank;
- no duplicate `value` in a field, if the user accepts criterion 20.

The return type stays `string[]`, with the prefix contract from criterion 19.

### File plan

**model-developer (src/model only)**

| File | Change |
| --- | --- |
| `src/model/provenance.ts` | Add `inferredBy?` to `Sourced`. Add `SourcedValues<T>` and `primaryOf` (15, 17, 23) |
| `src/model/contact.ts` | Add `CONTACT_FIELDS` and `ContactField`, make `Contact` a mapped type, and add the NormalisedFields/ContactField type-level equality. Rewrite `validateContact` over `CONTACT_FIELDS` (15 to 20). Remove `singleValueFieldsOf` |
| `src/model/explain.ts` | Iterate `CONTACT_FIELDS` and remove the local list. Keep input order with no duplicates (criterion 11 as changed) |
| `src/model/source-record.ts` | Validate id prefix and key (21). Copy known normalised keys only. Keep `__proto__` and `constructor` raw headers as own properties (criterion 4 as changed) |
| `src/model/decision.ts` | Reject blank `ruleId` (22) |

No new files, no barrel, and nothing outside `src/model/`. After the change, src/model must pass the new purity scan.

**tester (tests/model only)**

| File | Change |
| --- | --- |
| `tests/model/purity-scan.ts` | **new**. A scanner helper that takes source text and returns violations. Parse with the TypeScript compiler API (`typescript` is already a devDependency) so comments and string literals are never matched. It lives in tests/ and never in src/model |
| `tests/model/purity-scan.test.ts` | **new**. Self-tests for the scanner on inline sample strings. Every forbidden sample must be flagged, and every allowed or comment-only sample must not be |
| `tests/model/purity.test.ts` | Rewrite to run the scanner over `src/model/**/*.ts`. Keep the "found at least one file" guard |
| `tests/model/contact.test.ts` | Move fixtures to the new shape (every field a list). Cover 15 to 20 and 23 |
| `tests/model/explain.test.ts` | **new** (moved out of contact.test.ts). Criterion 11 as changed |
| `tests/model/source-record.test.ts` | 21, and criterion 4 as changed |
| `tests/model/decision.test.ts` | 22, and the caller-array mutation test |

### Test requirements that close the findings

**Finding 1 (purity).** The scanner must flag every one of these samples:

- Imports:
  - `import fs from "fs"`, `import "node:fs"` (side effect), `export { x } from "fs"`
  - `await import("fs")`, `import("node:fs")`, `` import(`fs`) ``, `import(name)`
  - `require("path")`, `import x = require("http")`
  - `import os from "os"`, `import { request } from "undici"`
  - each of `fs/promises`, `node:fs/promises`, `path`, `http`, `https`, `net`, `dgram`, `child_process`, `worker_threads`
  - `import { randomUUID } from "crypto"`, and `import { randomUUID } from "node:crypto"` even if `node:crypto` is allowlisted
  - `import * as c from "node:crypto"` (namespace or default import of crypto)
  - `"../ingest/csv.js"`, `"../review/queue.js"`, `"../../src/ingest/x.js"`, and any relative path that leaves `src/model`
- Identifiers, in expression position:
  - `fetch(...)`, `const f = fetch`, `globalThis.fetch`, `globalThis["fetch"]`; any reference to `globalThis`, `window`, `self`, `global`, `process`, `require`, `eval`, `Function`, `XMLHttpRequest`, `WebSocket`
  - `Date.now()`, `new Date()`, `Date()`; any reference to the `Date` identifier
  - `performance.now()`; any reference to `performance`
  - `Math.random()`; any reference to the global `crypto`, so `crypto.randomUUID()` and `crypto.getRandomValues(...)` are both caught

The scanner must **not** flag:
- any of the above when it appears only in a `//` or `/* */` comment or inside a string literal, for example `reason: "no Date() here"`;
- `import type { X } from "./x.js"` or `import { Y } from "./sub/y.js"`;
- property names such as `record.date`, or a key `fetch:` in an object literal;
- whatever the allowlist permits under Open question B.

**Finding 2 (explain).** Use a fixture in which **each field kind carries a source id that appears nowhere else on the contact**:
- `linkedin:url-only` only on `linkedinUrl`;
- `linkedin:company-only` only on `company`;
- `google:title-only` only on `title`;
- `phone:phone-only` only on a phone;
- `google-other:email-only` only on an email;
- distinct ids on `givenName`, `familyName` and `fullName`;
- a second, non-primary company entry with its own id.

Then write one test per id: a decision citing only that id is returned. A decision citing only an unrelated id is not returned. Also cover order: given `[d3, d1, d2]`, all matching, the result is `[d3, d1, d2]`. Cover no duplicates: a decision overlapping on several ids appears once. Also check that the fields `explain` scans are exactly `CONTACT_FIELDS`: iterate `CONTACT_FIELDS`, put a unique id on only that field, and assert the result.

**Finding 3 (validateContact).** For **each** field in `CONTACT_FIELDS`, loop over the list and build a valid contact with a single defect in that field. Cover these defects:
- empty `sources`;
- no primary, with two or more entries;
- two primaries;
- `inferredBy: ""` and `inferredBy: "  "`.

Assert `problems` has length **exactly 1** and `problems[0].startsWith(field)`. Add positive cases:
- a contact with conflicting company values, one primary and each with distinct sources, is valid;
- an inferred company `{ value, sources:[id], primary:true, inferredBy:"C2" }` is valid;
- an all-empty contact is valid.

For duplicate values (criterion 20), do the same exact-one-problem check, if the user accepts it.

**Finding 4 (createSourceRecord).**
- Throws for:
  - `{source:"google", id:"linkedin:x"}`
  - `{source:"google", id:"google-other:x"}`
  - `{source:"google-other", id:"google:x"}`
  - `id:"phone:"`
  - `id:"phone:   "`
- Accepts a matching id for every `SOURCE_KINDS` entry.

**Finding 6.**
- **Off-type extra property.** Pass `normalised` with an extra nested object, cast through `unknown`. Afterwards `Object.isFrozen(extra)` is `false`, `Object.isFrozen(callerNormalised)` is `false`, and the record's `normalised` has no own key for the extra property.
- **`__proto__` header.** Build raw with `JSON.parse('{"__proto__":"x","constructor":"y"}')`. Assert `Object.hasOwn(record.raw, "__proto__")` and that its value is `"x"`, the same for `constructor`, and `Object.getPrototypeOf(record.raw)` is either `Object.prototype` or `null`.
- **Blank ruleId.** `createDecision` with `ruleId: ""` and `"  "` throws.
- **Caller-array mutation.** Mutate the caller's `sourceRecordIds` array after `createDecision` (push and assign index 0). The decision's `sourceRecordIds` is unchanged.

All data stays fabricated and inline: example.com/.org/.net, +44 7700 900xxx or 555-01xx, "Ada Example", "Example Widgets Ltd". Mark criteria 19, 20 and 23 as [proposed] in the test output.

### Open questions

A. **Duplicate values in a field (criterion 20).** The planner proposes reporting them, so that "all values kept with provenance" means one entry per distinct value with its sources merged. Alternatives: WTC-16 allows the same value per source as separate entries, or the check compares normalised values rather than exact values. If rejected, drop 20 and its tests.

B. **`node:crypto` in the model.** The planner proposes allowing `import { createHash } from "node:crypto"` and nothing else from it, because a content hash is deterministic and WTC-16 may want it for a stable contact id. The other option is to allow nothing external now: source-id key derivation belongs to the adapters in src/ingest. Either way, `randomUUID`, `randomBytes`, `randomInt`, `getRandomValues` and `webcrypto` stay banned.

C. **Contact identity.** Adding an `id` to `Contact` later is an edit to contact.ts, which is the exact edit this addendum is trying to avoid. Decide whether to add `readonly id?: string` (or a required one) now, or accept that WTC-16 edits contact.ts once for identity.

D. **Which source ids an inferred value cites (WTC-17).** The planner suggests the value's `sources` cites this contact's own records the inference used, and the foreign record appears only on the inference `Decision`. This is WTC-17's call. The model allows either.

E. **CKB-5 against CKB-1 on low confidence.** CKB-5 step 3 says "low confidence, shown for review", but CKB-1 says low means record only, and CKB-8 queues medium items only. The model does not block either reading. The conflict needs resolving in WTC-17 and WTC-18.

F. **Review decisions (WTC-18).** CKB-8's human choices (merge, keep separate, exclude) are saved and reapplied. "Keep separate" has no `Outcome` value, and adding one later would edit outcome.ts. Decide whether to add it now.

G. **Typecheck over tests.** Resolved: `tsconfig.json` includes `tests`.

H. **Order of values within a field.** Belongs to WTC-16. The model does not enforce an order.

## Second review round (2026-09-26)

A second cold review found the model code correct and every first-review fix closed, except that the new purity scanner can still be bypassed. The user asked the session to proceed as it saw fit. Decisions and criteria below override earlier text where they conflict.

### Decisions (session, on the user's delegation)

- **Finding 6 (low-confidence inferred value awaiting review).** CKB-5 step 3 derives a company "at low confidence, shown for review", and CKB-1 says low means record, do not act. Making such a value `primary` would export it. So criterion 16 is relaxed, with no type change: a non-empty field needs exactly one primary **unless every entry in it has `inferredBy`**, in which case zero primaries is also valid. More than one primary is always a problem. A field with at least one non-inferred entry still needs exactly one primary.
- **Finding 4 (scanner scope).** Ban by identifier reference: `Intl`, `console`, `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`, `WeakRef`, `FinalizationRegistry`, and the `import.meta` meta-property; and the method calls `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString`, `localeCompare` (property access or element access with that string name). The `.constructor("…")` route to the Function constructor is **not** chased; after this round, obscure bypasses are left to code review rather than further scanner hardening.
- **Findings 1 to 3, 5, 7 and 8** are fixed as listed below.

### Criteria added or changed

16 (changed). For every field in `CONTACT_FIELDS`: more than one primary is always reported; zero primaries in a non-empty field is reported unless every entry in that field has `inferredBy` present (blank or not). A blank `inferredBy` is reported once, as `inferredBy is blank`, so a single defect still yields exactly one problem.

25. [review 2, finding 1] The purity scan reports any absolute module specifier (starting with `/`, or a Windows drive or UNC path, or a `file:` URL) as a violation, never as inside src/model.
26. [review 2, finding 2] A shorthand property assignment (`{ fetch }`, `{ Date }`, `{ crypto }`) counts as a reference to that identifier and is flagged. Property *names* in `obj.fetch`, `{ fetch: 1 }`, method names and declared names are still not flagged.
27. [review 2, finding 3] Any use of `Math.random` is flagged: property access `Math.random` in any position (call or not), element access `Math["random"]`, and destructuring `random` from `Math` (`const { random } = Math`). Other `Math` members (`Math.max`, `Math.floor`) are allowed.
28. [review 2, finding 4] The identifiers, meta-property and method names in the finding-4 decision above are flagged.
29. [review 2, finding 5] The `node:crypto` allowlist accepts only the exact clause `import { createHash } from "node:crypto"`. It rejects an alias (`{ createHash as h }`), extra bindings (`{ createHash, randomBytes }`), a default or namespace import alongside it, and `import type`/`export … from` forms of anything else from `node:crypto`. Relative paths resolve against the file's own directory, including subdirectories such as `src/model/rules/m1/rule.ts`.
30. [review 2, finding 7] `createSourceRecord` does not create own keys for optional normalised fields that were absent in the input: `"company" in record.normalised` is `false` when no company was given, and `Object.keys(record.normalised)` lists only the keys present (always including `emails` and `phones`). `raw` values that are not strings or string arrays (off-type input) are not frozen in the caller's object.
31. [review 2, finding 8] The purity test scans every `*.ts`, `*.mts`, `*.cts`, `*.js`, `*.mjs` and `*.cjs` file under src/model. The scanner does not flag `Date` in type-only positions (for example `let d: Date`). The self-built "Contact keys" runtime test is removed (the guarantee is the mapped type at typecheck).

### File plan

- **model-developer**: `src/model/contact.ts` (16 as changed), `src/model/source-record.ts` (30).
- **tester**: `tests/model/purity-scan.ts`, `tests/model/purity-scan.test.ts`, `tests/model/purity.test.ts` (25 to 29, 31), `tests/model/contact.test.ts` (16 as changed, 31), `tests/model/source-record.test.ts` (30).

### Final review pass (2026-09-26)

Verdict: ready for a PR. Two small fixes are made before it opens:

28 (extended). `toLocaleLowerCase` and `toLocaleUpperCase` join the banned member names. They depend on the machine's locale (for example, Turkish `"I"` lowercases to `"ı"`), and a normalisation rule author is likely to reach for them. Also pin `import { randomBytes as createHash } from "node:crypto"` as rejected (criterion 29).

32. [final review] Doc comments in `src/model/contact.ts` and `src/model/provenance.ts` state criterion 16 as changed. In particular, `primaryOf` can return `undefined` for a non-empty field when every entry is inferred.

**Note for WTC-17 and whoever writes the export (not a WTC-11 change).** The zero-primary exemption depends on `inferredBy` being present, not on confidence, and it applies to every field, including emails and phones. A high-confidence inferred value (CKB-5 step 2) must therefore be set `primary: true` explicitly, or `validateContact` will accept it and the export will leave it out. The model cannot see confidence on a value; that stays on the `Decision`.

Accepted nits, not fixed: off-type `raw` values are protected one level deep only; the scanner flags some type-only uses such as `typeof Date` and `Intl.Collator` (fails safe); the wider purity file globs have no fixture test.
