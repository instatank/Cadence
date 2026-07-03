---
name: ship
description: Cadence pre-push ship ritual - run before every push that reaches users. Bumps the service-worker.js cache key on user-facing changes, runs the check.sh gate, refuses to push red. Use when about to commit/push user-facing changes, or when the user says "ship it".
---

# /ship — Cadence

Repo-specific config for the shared playbook's `SOP-ship.md` (in `instatank/time-tracker`, `playbook/` — read it for the why and the full ordering). Never push red.

1. `git status` + `git diff` — confirm the diff contains only the asked-for change (no bundled fixes).
2. **Cache bump:** on any user-facing change → bump `const CACHE = 'cadence-vN'` in `service-worker.js` by exactly +1. Skip if only docs/scripts changed. Installed PWAs serve stale `index.html` otherwise.
3. **Gate:** `bash scripts/check.sh` (inline-module syntax + `scripts/smoke-test.js` engine regression). Must be green.
4. **CRITICAL repo rule — 3-file engine sync:** engine logic is hand-duplicated across `index.html`, `scripts/generate-sample-plans.js`, and `scripts/smoke-test.js`. Any recipe, fallback, or selection-logic change must land in **all three** in the same commit, or the safety net silently checks stale logic and the smoke test stops protecting you.
5. **Schema migrations** must bump `_meta.version` + append to `_meta.changelog` + bump the seeder version gate in `index.html` **together** — miss one and Firestore never re-seeds (or re-seeds forever).
6. **Silent-failure question** for any new write/scheduled/external path in the diff (PLAYBOOK Rule 4).
7. Commit (clear message, cache bump noted) and push to the designated branch. Never the production branch directly unless that IS the designated flow.
8. If user-facing: produce the verify-on-phone checklist (playbook `SOP-verify-on-phone.md`). State which verification rung you reached; never claim the phone rung.
