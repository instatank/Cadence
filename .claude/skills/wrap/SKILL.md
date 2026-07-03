---
name: wrap
description: Session-wrap ritual - run before ending any session that shipped commits (the Stop hook will nudge once if forgotten). Prepends a CHANGELOG.md entry, reconciles docs/working-with-claude.md, appends friction cards to LEARNINGS.md, asks the founder the teach-back/transfer questions, quizzes one old card. Also triggered by "wrap and teach" or "wrap up".
---

# /wrap — Cadence

The learning half lives in the shared playbook's `LEARNING_METHOD.md` (in `instatank/time-tracker`, `playbook/`); this skill is its trigger. The founder is non-technical — plain language throughout.

1. **Handoff = CHANGELOG.md:** prepend a dated entry (one human-readable line per meaningful change this session, reverse chronological — match the existing style). If `docs/working-with-claude.md` has a current-state section, reconcile it against reality too (PLAYBOOK Rule 6). Verify stated facts: current `CACHE = 'cadence-vN'` key, last commit, branch.
2. **Friction cards:** for each genuine friction this session (0 is a valid count — don't pad), append a card to `LEARNINGS.md` (create from the format in the playbook's `LEARNING_METHOD.md` if missing). Fill every field except the two founder fields.
3. **Ask the founder, and wait for answers** (use AskUserQuestion or plain questions):
   - Teach-back: "One sentence, your words — what's the concept behind today's friction?" → record verbatim in the card's *In my words*. If it misses the concept, re-explain plainly and invite one retry.
   - Transfer: "Where else in your stack could this same failure bite?" → record in *Where else*.
4. **Quiz one old card:** pick the oldest card with `Internalized: no` or `streak 1`, ask its quiz question. Correct → bump streak; streak 2 on separate dates → mark `Internalized: YES (date)`. Wrong → say the answer plainly, streak resets.
5. **Recap:** produce a brief plain-English session recap (this session only, no padding).
6. **Mark done:** `touch "${TMPDIR:-/tmp}/wrap-done-$(basename "$(git rev-parse --show-toplevel)")-$(date +%F)"` so the Stop-hook reminder stays quiet.
7. Commit the doc updates (CHANGELOG + LEARNINGS) and push.

If the founder doesn't respond to step 3 (unattended session): leave the two founder fields as `(pending — answer at next wrap)`, complete everything else, and surface the questions at the start of the next wrap.
