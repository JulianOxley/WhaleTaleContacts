# Contacts Data Cleaner

Contacts data cleanser
Everything is local: no network requests, no CRM sync. Real contact data never enters the repository.

## The requirements are not in this repo

They are in **Tracker Stub**, reached over MCP. This repo holds *how* we build.
Tracker Stub holds *what* we are building and why.

An agent reads the repo whether you ask it to or not. It never finds Tracker Stub unless it
goes looking. So the half of the truth that matters most — the rules, the data meaning, the
protocol, the screens — is the half you will miss by default.

**Do not infer a requirement you could have fetched.** If you have not read the ticket, its epic
and the pages they point at, you are guessing. This is not a style preference: `scripts/check-plan.mjs`
will refuse a plan file that does not name what it read (see "The plan is a file, and it proves
its work" below). A plan that can't show its sources doesn't get to become code.

## Connecting to Tracker Stub

`.mcp.json` is committed and reads `${REQUIREMENTS_MCP_URL:-http://localhost:3000/mcp}`. The default
is the deployed host, because that is where Tracker Stub runs. A fresh clone reaches the
requirements with nothing to install, nothing to start and no override to set.

MCP has no failover. The client expands that variable once, at config load, and connects once, at
session start. Nothing retries onto a second URL when the first is unreachable, so the default is
not a fallback — it is simply the choice made when you have not made one.

### Pointing it somewhere else

To aim at a Tracker Stub you are changing, running on your own machine: set the variable in
`.claude/settings.local.json` (gitignored, yours alone), or `export` it in your shell for a
terminal session.

```json
{
  "env": {
    "REQUIREMENTS_MCP_URL": "http://localhost:3000/mcp"
  }
}
```

```
cd ../tracker-stub && npm run dev
```

**Then restart the session.** MCP servers connect once, at startup. Changing the variable mid-session
does nothing until you restart.

### Knowing whether it worked

Call `getIssue` on `WTC-2`; it should return "Connection test ticket".

Read the failure rather than working around it:

| Error                                       | Meaning                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ECONNREFUSED` on the local port             | An override points at a local Tracker Stub, and it is not running                    |
| A 4xx or 5xx from the deployed host          | The deployed host is up but unhappy. Not something this repo can fix; say so                |
| Tools absent entirely                        | The server failed at startup, or the project's MCP servers are unapproved                   |

**A failure here is not a missing capability, and it is not a reason to proceed.** If the tools are
absent, stop and fix it. Building from the repo alone is the guessing this file exists to prevent,
and it is worse than not starting, because the result looks finished.

## Getting a ticket's requirements

Four steps, in this order. Do all of them before writing code.

1. **The ticket.** `getIssue` with the key, for example `WTC-14`.
2. **Its epic.** `getIssue` on the ticket's `parent`. The epic carries the definition of
   done for the whole group; the ticket does not repeat it. This step is skipped more often than
   any other.
3. **Its pages.** `getPage` on every entry in `remoteLinks`. These come back as an id and
   a title only — never content — so you have to ask.
4. **One hop further.** Those pages have `relatedPages`, also references only. Follow them.

**Read the comments.** Some tickets carry their only route onward in a comment rather than a link.

`searchIssues` finds work by JQL. It returns summaries only — read a hit properly with
`getIssue`.

## Ground rules

- **A thin ticket is thin on purpose.** Propose the criteria rather than assuming them: draft
  them, say the ticket did not carry them, and get the user's approval before anything is built.
- **Adding a capability must not require editing a shared file**, where the domain allows it.
  Several people (or agents) work at once.
- **Follow the design-system references named per agent below for anything visual.**

## Agents

| Agent | Model | Responsible for |
| --- | --- | --- |
| `planner`         | opus | Reads the ticket and the pages it points at, produces acceptance criteria and a file plan. Writes no code |
| `ingest-developer` | sonnet | Source adapters, the clean export and the CLI. The only code that touches files. Works to CKB-2, CKB-9 |
| `model-developer` | sonnet | Normalisation, noise, matching, merge and company inference. Pure, one file per rule. Works to CKB-1, CKB-9 |
| `review-developer` | sonnet | Local UI for medium-confidence decisions. Imports model types only. Works to CKB-8, CKB-9 |
| `tester`         | sonnet | Writes tests from the acceptance criteria. **Never reads the implementation** |
| `reviewer`        | opus   | Reads the diff cold and reports. **No Write, no Edit** |

Plan on opus, build on the model set per agent above. If a build agent cannot
implement from the plan, tighten the plan rather than raising the model.

### "Build WTC-7" means the pipeline

**A build instruction naming an issue key starts with `planner`, always.** "Build WTC-7",
"do WTC-12" — the key is the whole instruction. It means `planner`, then the developer
the plan names, then `tester`, then `reviewer`.

No one should have to add "start with the planner agent." If that sentence is load-bearing, this
rule is not doing its job.

Do not plan it yourself instead. `planner` has no Write or Edit in its tool allowlist, and that is
the only reason its output is a plan rather than a first draft of the code.

## The plan is a file, and it proves its work

`planner` returns a report; the session that runs it saves that report to
`.claude/plans/<KEY>.md`. The planner does not write it itself — Write and Edit being absent from
its tools is the only thing keeping its output a plan.

**After saving a plan, run `npm run check:plans` before handing it to a developer.**
If it fails, the plan goes back to the planner; it does not go forward.

Every plan file opens with frontmatter naming what was actually fetched:

```
---
ticket: WTC-14
epic: WTC-1
pages: [KB-2, KB-4]
---
```

`scripts/check-plan.mjs` (also run in CI) rejects a plan with an empty `pages` list unless the
ticket is explicitly flagged `thin: true` in the same frontmatter — a thin ticket is allowed to
have nothing to cite, but it has to say so, not just fail to cite anything. This is what makes
"do not infer a requirement you could have fetched" a checked property of the artifact rather than
a request the model can silently skip.

The developers and `tester` read that file rather than re-deriving the plan from
Tracker Stub. So does `reviewer` — as the author's account of what was intended, alongside
the ticket it still reads cold.

It is **committed**, not gitignored — see `docs/plan-policy.md` for why this repo keeps an audit trail.

## Branches and commits

- Nothing is committed directly to `main`
- Every branch name carries the issue key: `feat/WTC-14-rules-engine`
- Every commit message carries the issue key, first: `WTC-14: add the capacity rule`
- Work that belongs to no ticket does not get committed

Two hooks in `.githooks/` refuse the first three; `npm ci` installs them by pointing
`core.hooksPath` at that folder.

## Working through several tickets

Build them one at a time and stop in between. Each ticket gets its own branch, cut from `main`:

```
npm run verify
git switch -c feat/WTC-17-conflicts
git commit -m "WTC-17: keep conflicting guests apart"
```

At the end, put them together on an integration branch of your own — your initials and a key,
matching `demo-*`:

```
git switch -c demo-sr-WTC-17 main
git merge --no-ff feat/WTC-17-conflicts
git merge --no-ff feat/WTC-19-households
npm run verify
```

**CI also runs on branches matching `demo-*`.** The merged commit is one
no individual branch tested on its own — CI catches it here too, not only on `main`, so it does
not depend on someone remembering to re-run `npm run verify` by hand after merging.

## Done

```
npm run verify
```

All of it, not the tests you just wrote. CI runs the same steps on the pull request, again on
merge, and on integration branches — from one reusable workflow rather than copies that drift.

**A failing check blocks the merge only if the check is required.** That is a branch protection
setting on the repository, not something this repo can enforce.

## The detail is in docs/

This file is the entry point and stays short enough to be read. Standards live in `docs/`.
Nothing in `docs/` restates a requirement. Requirements live in Tracker Stub, and a copy is
a copy that goes stale.
