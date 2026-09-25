# Git and releases

## Branches and commits

- Nothing is committed directly to `main`.
- Every branch name carries the issue key: `feat/WTC-14-rules-engine`.
- Every commit message carries the issue key, first: `WTC-14: add the capacity rule`.
- `.githooks/commit-msg` and `.githooks/pre-push` enforce the last two. `npm ci` installs
  them by pointing `core.hooksPath` at `.githooks/`.

## Integration branches

Branches matching `demo-*` (e.g. `demo-sr-WTC-17`) are for
combining several finished ticket branches before they land on `main`. CI runs on them too — see
`.github/workflows/ci.yml` — specifically because a merged commit is one no individual branch
tested on its own.

## Releases

(Fill in per this project: what triggers a version bump, whether it's automated on merge to
`main`, and what — if anything — gets published or deployed as part of that.)
