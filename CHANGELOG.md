# Cadence Changelog

One human-readable line per meaningful change. Reverse chronological. See `git log` for the details.

## 2026-05-08

- **Done screen redesign:** the post-workout summary now shows a per-exercise breakdown (sets completed, reps × kg per set, total volume in kg, finish time, pain flag), not just a checkmark and title. Recovery block completion count surfaced.
- **"Re-open workout" replaced** with two distinct actions on Today's completed-state card: **Edit logged sets** (opens an editor stack where every exercise's kg/reps can be corrected; saves auto; restamps `completedAt` on exit) and **Reset workout** (wipes all completion flags, logged values, symptom flags, and lets you redo the same workout from set 1). Previously "Re-open" cleared `completedAt` but immediately re-finalized since all sets were still done — bouncing right back to Done with no chance to edit anything.
- New `EditModeScreen` renders all exercises as a static editable stack, no auto-advance / auto-finalize / Done-routing.
- **Bugfix:** UTC date bug fixed — every "today" check now uses local date via new `localISO()` helper. Previously after ~6:30pm IST, session ID and week-strip "today" highlight rolled to the next day because they used `toISOString()`. Caused Saturday evening to display as Sunday, broke rest-day matching, and ID-collision-blocked legitimate completions.
- **Feature:** "Pick a workout" / "Change workout" — new bottom-sheet picker on Today lets you override the engine's scheduled card with any phase-eligible card type. Visible from off days, rest days, and active planned days. Stored as `STATE.todayOverride`; clearable.
- **Feature:** "Do this today →" button in the day-preview sheet for any non-today day. Pulls that day's card type to today as an override, regenerates today's plan with it.
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
