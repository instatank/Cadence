# Working with Claude on Cadence

> **Note (2026-07-03):** Global working rules now live in the shared playbook (see `CLAUDE.md` → `instatank/time-tracker` `playbook/PLAYBOOK.md`); this doc keeps the Cadence-specific practices. Where a section below states a global lesson (don't trust agent self-report, no bundled changes, the session onboarding ritual), the playbook is the source of truth.

This is the operating manual for sessions where Claude (or another LLM agent) is making changes to this repo. Pin it. Paste relevant sections at the start of new sessions.

The goal: reduce the round-trips and rework that come from implicit assumptions, and keep humans-on-the-phone-testing as a hard gate before anything is "done."

---

## 1. Define "done" before starting

Every non-trivial request should state acceptance criteria explicitly. Without them, the agent infers — sometimes wrong, often plausibly enough that nobody notices until later.

**Bad:** "Add a swap-exercise feature."
**Good:** "Add a swap-exercise feature. Done when: (a) tapping Swap on the active card opens a picker, (b) the picker only shows alternates valid under current phase + contraindications + equipment + disabled types, (c) confirms before replacing if the user has completed sets, (d) the swap survives a page reload via Firestore sync."

Two minutes of typing saves an hour of rework. If you don't have time to write criteria, the work probably isn't ready to start.

---

## 2. Smaller checkpoints, more frequent

A session should land **1–2 features at a time**, then stop and let you verify on your phone before continuing.

The temptation to bundle "while I'm in here, also fix X and Y" is real. Resist. Bundles create:
- Long context windows that compress prior decisions out of memory
- Single points of failure (one bad change blocks the whole batch)
- Unreviewable diffs

**Rule of thumb:** if the agent's plan has more than ~5 phases, push back and say "let's only do phase 1–2 now, I'll test, then we continue."

---

## 3. Tests as a hard gate

Before AND after any engine change, the agent must run:

```bash
npm test    # runs audit + smoke
```

Smoke test is `scripts/smoke-test.js` — it walks all (phase × dow × mesocycle week) and asserts working-set volume in PRD §8.2 bands, no `1×1` placeholders, no exceptions thrown.

Audit is `scripts/audit-seed.js` — schema validity check.

If a new feature changes engine behavior, **a corresponding smoke-test assertion should be added in the same commit**. No "I'll add the test later." Later doesn't come.

---

## 4. CHANGELOG.md is the source of truth for "what changed"

Don't make humans read commit messages to figure out what's new. Each meaningful change gets one line in `CHANGELOG.md` under a dated heading. If a change isn't worth logging, it isn't worth shipping.

---

## 5. Don't trust agent self-report

The agent will say "JS OK" and "smoke passed" — both can be true while a feature is broken on the phone. **The agent's confidence is a function of static checks, not user experience.**

Every handoff must end with a **"how to verify on your phone"** checklist. Example:

```
✓ Open the app
✓ Pull-to-refresh once to bust SW cache v9
✓ Settings → Reset local data → re-onboard
✓ On the In-Progress screen, tap Swap on the active card → confirm picker opens
✓ Pick an alternate → confirm card updates and progress bar reflects the new exercise
✓ Tap an empty set's checkbox → confirm reps + load auto-fill from prescription
✓ Refresh the page → confirm the swap and logged sets persisted
```

Reject work that ships without a checklist like this.

---

## 6. Feature flags or branches for risky changes

For anything touching the active-session UI, Firestore writes, or auto-mutating user state: ship it behind a flag (a `STATE.flags.feature_x = true` toggle in `Settings → Beta`) for a few days before promoting. Cheap insurance.

---

## 7. The "what would falsify this?" check

Before the agent declares any feature done, it should answer: **what's the most likely way this breaks?** And write a test for that scenario.

Example: when adding the no-recent fallback to the engine, the obvious failure mode was "Phase 1 push under shoulder contra runs out of pool by week 3." That became the smoke-test assertion that caught the volume regression. Without that explicit question, the bug would have shipped and you'd have noticed it on your phone in week 3.

---

## 8. The agent doesn't have memory across sessions

A new chat starts blank. To brief a fresh agent on this project:

1. Drop a link to this file: `docs/working-with-claude.md`
2. Drop a link to: `docs/v1-cadence-prd.md`
3. Run `git log --oneline -20` and paste the recent history
4. State the current task with acceptance criteria

That's a 60-second onboarding that lets a fresh agent be productive immediately.

---

## 9. Repo-specific conventions (Cadence)

**Engine logic lives in three files** and they must stay in sync:
- `index.html` — production engine (running in the browser)
- `scripts/generate-sample-plans.js` — generator for `docs/sample-plans-*.md/csv`
- `scripts/smoke-test.js` — regression harness

When you change a recipe, fallback rule, or selection logic in one, change it in all three. Drift breaks the safety net.

(This is a known smell. The "no build step / no npm dependencies in browser" constraint is what keeps the engine duplicated. If we ever drop that constraint, the engine factors out to a shared `engine.js` ES module.)

**Schema migrations** live in `scripts/migrations/v{X.Y}.js` and are idempotent. Every migration:
- Bumps `_meta.version`
- Appends to `_meta.changelog`
- Bumps the seeder version check in `index.html` so Firestore re-seeds

**Service worker cache key** (`service-worker.js`, `CACHE = 'cadence-vN'`) gets bumped on any user-facing change. Old caches self-purge on next visit.

**Firestore data model** is documented in PRD §13. Anything that mutates user state should be added to the `setDoc` call in `saveState()` or it won't sync.

---

## 10. How to push back on the agent

The agent will sometimes:
- Bundle scope you didn't ask for ("while I'm here, I also did X")
- Skip the verify checklist
- Commit before tests pass
- Use a heuristic instead of asking ("I assumed you meant…")
- Self-report "good" without grounding

When that happens, the right answer is a short, direct reply:
- "Stop. What was the acceptance criteria? Did you check it?"
- "I asked for X. Why is Y in this commit?"
- "Run npm test before continuing."
- "Don't assume. Ask."

Agents don't get offended. Bluntness is a feature.

---

## 11. What this file is NOT

- It's not a code-style guide. The repo's CLAUDE.md (if you add one) handles that.
- It's not a substitute for a real PR review. It's an SOP for a human-AI collaboration loop where the human can't read every line of generated code.
- It's not exhaustive. When a new failure mode emerges, add a section.

---

*Last updated when the swap-exercise / quick-log / backup features shipped (commit `36d8429`). If you're reading this in a future session, run `git log -- docs/working-with-claude.md` to see what's changed.*
