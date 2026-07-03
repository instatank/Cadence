# CLAUDE.md — Cadence

**Cadence** is a personal adaptive-workout PWA — a single `index.html` (inline JS, no build step) with Firebase sync, a service worker (`service-worker.js`, cache key `cadence-vN`), deployed on Vercel.

## Shared playbook (cross-project — read at session start)

The single source of truth for global working rules, transferable lessons, and the ship / sync / deploy / verify SOPs lives in the **`playbook/`** directory of `instatank/time-tracker` (`PLAYBOOK.md` first). Every session: read `/home/user/time-tracker/playbook/PLAYBOOK.md` if that repo is cloned locally, otherwise fetch it via GitHub `get_file_contents` on `instatank/time-tracker`, path `playbook/PLAYBOOK.md`.

- Before ending any session that shipped commits, run the **`/wrap`** skill — a Stop hook nudges once if forgotten.
- Use the **`/ship`** skill for every push (cache bump + `bash scripts/check.sh` gate + repo-critical rules).

## Repo docs

- `docs/working-with-claude.md` — Cadence-specific working practices (tests as a gate, 3-file engine sync, schema migrations, verify-on-phone checklists).
- `docs/v1-cadence-prd.md` — product spec (volume bands, data model, design intent).
- `CHANGELOG.md` — the source of truth for "what changed"; `/wrap` prepends an entry per session.
- `LEARNINGS.md` — friction ledger (concept cards, per the playbook's `LEARNING_METHOD.md`).
