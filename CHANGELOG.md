# Cadence Changelog

One human-readable line per meaningful change. Reverse chronological. See `git log` for the details.

## 2026-05-08

- **Brand mark: dark tile + cyan lifeline.** Both the inline header logo (26×26, rounded square) and the PWA icon (`icon.svg`) now use #0E1218 background with a #22D3EE heartbeat path. Replaces the prior olive-on-paper glyph that didn't read as a brand mark on light backgrounds.
- **Bumped wordmark in Today header:** "Cadence" wordmark size: 17px t-body → 20px semibold with -0.02em letter-spacing for a more brand-forward feel.
- **PRD §14b "Design intent" added:** explicitly establishes Cadence as a consumer-grade app, not an instrument panel. Rejects the prior "Garmin / hospital chart" framing as canonical override for any future design contributor. Keeps the §3 non-goals (no streaks, gamification, decorative effects) intact.
- **Today header redesign:** three-anchor layout — "Cadence" wordmark left · `Wk N/5 · Day D` mesocycle indicator centered (numerics in tabular .num) · settings cog right. Replaces the previous "Today" + "Phase 0" subtitle. Phase pill stays where it was on the workout card (single source of truth).
- **Week-strip dot states (3-state):** filled accent for DONE, outlined accent for SCHEDULED (planned but not done — including past), hairline-bordered hollow for REST/OFF. Diameter bumped 6px → 8px so filled vs outlined is legible. Today's surrounding box unchanged.
- **Custom-pick pill is its own inverse:** when an override is active, the pill becomes a button with an inline ×. Tap anywhere on it to clear `STATE.todayOverride` and revert to the engine's scheduled card.
- **Tomorrow card** kept as the existing full card format for all day types (workout, off, rest). The earlier inline-collapse experiment for off/rest is reverted — it was visually fighting the week strip on phones.
- **`appBar` extended:** new `opts.leftContent` slot for arbitrary left content (used by Today's wordmark). Other screens still use the default back-button slot — API stable.
- **Completed list on In-Progress screen:** finished and skipped exercises now render as small pills above the active card, mirroring the "Up next" list below. Each pill shows the exercise number, a check (or skip arrow), name, and sets-completed count. Skipped exercises render in mute; completed in ok/green. Helps see progress visually during the session.
- **Hardened el() helper:** flattens nested array children with `.flat(Infinity)` and only appends string/number/Node values. Prevents one bad inline-conditional child from blanking the whole screen (which is what caused the empty Done summary in the previous build).
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
