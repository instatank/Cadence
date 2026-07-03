# LEARNINGS — Cadence friction ledger

Concept cards appended by `/wrap`. One card per genuine friction — a smooth
session adds nothing. Format + method: the shared playbook's
`LEARNING_METHOD.md` (in `instatank/time-tracker`, `playbook/`).

---

### 2026-05-08 — "Today" rolled to tomorrow after ~6:30pm IST (UTC date bug)
- What happened: after ~6:30pm IST, session IDs and the week strip's "today" used `toISOString()` (which speaks UTC), so Saturday evening displayed as Sunday — broke rest-day matching and ID-collision-blocked legitimate workout completions. Fixed with a `localISO()` helper for every "today" derivation.
- Concept: UTC is the storage language, local is the display language — mixing them fails only at certain hours, which is why every daytime test passes. (PLAYBOOK L4.)
- In my words: (pending — answer at next wrap)
- Where else: (pending — answer at next wrap)
- Quiz question: "A date bug only reproduces in the evening — what's your first suspect?"
- Internalized: no
