# Cadence Changelog

One human-readable line per meaningful change. Reverse chronological. See `git log` for the details.

## 2026-05-08

- **Bugfix:** completed sessions now show a summary on Today (was silently re-rendering the Start CTA, making the workout feel "unsaved"). Adds an isCompleted branch with finished-time, sets logged, View summary button, and Re-open workout for accidental finishes.
- **Bugfix:** SessionScreen redirects to Today when entered with a completed session — prevents the re-finalize loop where tapping Start on a completed day would either bounce immediately to Done or flicker through the recovery block.

## 2026-05-07

- Engine v2.3: warmup slot at top of every resistance day, core slot at bottom (Phase 0 light_lower / light_lower_push / posterior_scap finally have abs work)
- Engine: tier-2 "no-recent" fallback prevents Phase 1 push/pull from collapsing under shoulder contraindication
- UI: Swap-exercise picker on the active card with bottom-sheet alternates
- UI: Quick-log — single tap on a set checkbox auto-fills reps + load from history
- UI: Symptom flag is now an explicit icon button (replaces card-wide long-press)
- UI: Setup asks "Doing cardio?" upfront → `disabledTypes` set without a Settings trip
- Settings: Backup/restore full state as JSON (clipboard-based)
- Tooling: `scripts/audit-seed.js`, `scripts/smoke-test.js`, `scripts/migrations/`, `npm test`
- Schema v2.3: fixed bw_side_plank, bw_hollow_hold, band_iso_tib_post rep_ranges (modality=time but values were rep counts); filled physio_contrast_bath equipment
- Docs: `docs/working-with-claude.md` SOP for AI-assisted sessions
- Removed unused `header()` shim; all screens use `appBar()`
- SW cache v9 (auto-evicts older cached assets)

## 2026-05-06

- Schema v2.2: `exercise_types[]` multi-tag (strength, mobility, cardio, flexibility, stability, power, rehab, warmup); 5 cardio entries added (gated to Phase 2 + cardio-disabled-by-default)
- Settings: "Exercise types I'm doing" toggleable chips
- Schema v2.1: added `modality` field (reps | time | rounds); fixed [1,1] placeholders for yoga/foam-roll/holds; +9 ab/core exercises (Crunch, Bicycle Crunch, Lying Leg Raise, Reverse Crunch, Side-Lying Leg Raise, Flutter Kicks, Mountain Climbers, Toe Touches, Heel Touches)
- Engine: `RELATED_CATEGORIES` fallback when primary category pool is wiped by contraindications
- Engine: recovery cards no longer double-append the foam-roll/ice block
- UI: in-progress set rows display unit-correct labels (sec / rounds / reps); kg input hidden for time/rounds modalities
- Per-exercise video override flow ("Watch your pick") + Settings export of overrides as JSON

## 2026-05-05

- Engine: "Rest today → carry plan forward" replaces the prior "Not today — shift split"; rest days tracked in `STATE.restDays`
- UI: Persistent app bar with Home + contextual Back across all screens
- UI: Per-exercise "How to perform" disclosure with curated video or YouTube/Google Image search fallback
- UI: Sticky 7-day plan strip at the bottom of Today
- Initial v1 ship: Setup → Today → In-Progress → Done flow, 5-step engine, contraindications, recovery block, deload, Firestore sync
