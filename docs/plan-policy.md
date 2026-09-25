# Plan policy: archived

Plans land in `.claude/plans/<KEY>.md` and are **committed**, not gitignored, in this repo.

That is a deliberate departure from treating a plan as a purely disposable working file. It costs
a small amount of repo noise, and it buys an audit trail: for each ticket, what the planner
actually read (per its frontmatter — see `scripts/check-plan.mjs`) and proposed, sitting next to
the code that resulted. For engagements where a client, auditor, or regulator may later ask "what
was this change based on," that trail is worth the noise.

Do not treat a committed plan as a second source of truth, though — it is one agent's reading of
Tracker Stub at a point in time, not a substitute for it. If a plan and the ticket disagree
later, the ticket wins; update or superseded-flag the plan rather than editing it to match.

If this repo later needs to move fast without the audit overhead, switch to `plan-policy-ephemeral.md`
and gitignore `.claude/plans/`.
