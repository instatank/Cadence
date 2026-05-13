# Cadence Changelog

One human-readable line per meaningful change. Reverse chronological. See `git log` for the details.

## 2026-05-13

- **Week strip now scrolls.** Added ‹ / › arrows on either side of the bottom week strip's "This week" label. Tap left to step backward through past weeks (shows your logged completions), tap right to step forward through future weeks (shows engine predictions). Off-current-week strips display the date range "11 May – 17 May" and a small "← Today" link to snap back. The day-preview sheet works on any week — past days show what you did, future days show what's planned.
- **Schedule shift is now scoped to the current calendar week.** Previously a Rest Today tap shifted *every future day forever* via a global `daySkew` counter — so resting on Wednesday rotated next Monday into an off-day. Now the engine derives the shift from rest days in *this week only* (`effectiveSkewFor(date)`). Crossing into next Monday auto-resets the schedule to its natural Mon–Sun mapping. The "spills into next week" cascade is dead.
- **Settings: status line + Realign action** updated to match. Mesocycle status reads "this week shifted by N days" (was "schedule shifted"). Advanced → Realign with weekdays now clears *this week's* rest days only, leaving past weeks as history. Snaps the schedule back to natural alignment from today without touching anything else.
- **Bugfix:** `dayCardType()` had `daySkew` going the wrong direction. The formula was `(dow + skew) % 7` — that made tomorrow's lookup pull from the day *after* tomorrow, so tapping Rest Today on Wed (Posterior + Scap) made Thursday show Friday's plan (Light Lower + Push) and cascaded the off-days onto Fri/Sat. Fixed to `((dow - skew) % 7 + 7) % 7` — tomorrow now correctly reads the slot that was scheduled today, so today's plan carries forward as designed.
- **Bugfix:** day-preview sheet now shows what you actually did on past completed days, not a regenerated plan. The engine's rotation filter excludes recently-used exercises, so calling `generateSession(Monday)` on Wednesday (with Tuesday's exercises now "recent") would produce a *different* workout than the one you ran. Fix: `openDayPreview()` reads the saved session from `STATE.sessions["s_<iso>"]` whenever it exists with `completedAt` set, falling back to a fresh `generateSession()` only for future days.
- **Day-preview sheet enriched for historical days:** a "Logged" pill next to the date, header subtitle shows total sets logged + duration, each exercise row shows the actual logged kg×reps (e.g. `10@50kg · 10@50kg · 8@50kg`), and skipped exercises render as "Skipped." Recovery-block rows get a ✓ for completed blocks plus a count footer. Primary action becomes "Close" on past days (no "Do this today" since rotation would pick different exercises anyway).

## 2026-05-10

- **Settings: full contraindication labels.** `prettyContra` map now reads `"Right anterior shoulder (subacromial impingement / rotator cuff)"` and `"Right ankle (insertional Achilles tendinosis + plantar fasciitis)"` — the chips inside the Pool → Contraindications sheet show the diagnosis-specific label, not the short tag.
- **Settings: new "Clinical context" group (read-only).** Sits between Pool and Mesocycle. Surfaces `_meta.last_clinical_update` (formatted as "10 May 2026"), plus per-diagnosis blocks (condition, findings, status, source) for shoulder + ankle from `_meta.diagnoses_basis`. Schema-tolerant — renders any additional diagnosis keys (e.g. knee) automatically. Helper text: "Read-only — what the engine is using to filter your exercise pool."
- **Stale-data nudge relocated** into the Clinical context group as its first row when triggered (>90 days since last update). Was previously orphaned at the very top of Settings; now lives next to the data it's about. Session-scoped Dismiss button preserved.
- **Seed v2.4 — clinical update.** Renamed `right_medial_ankle` → `right_ankle_insertional_loading` to match the actual orthopedic diagnosis (insertional Achilles tendinosis + plantar fasciitis, Fortis Institute). Settings label now reads "Right ankle (Achilles + plantar fascia)".
- **Deprecated 2 physio entries** (`physio_eccentric_tib_post`, `physio_neural_floss_tibial`) — based on superseded tarsal-tunnel hypothesis. Records stay in the seed for history; engine filters them at generation.
- **Added 5 ankle entries** (insertional Achilles + plantar fasciitis protocol): flat-surface eccentric heel raise, gastroc + soleus stretches, plantar fascia ball release, seated plantar stretch.
- **Added 5 shoulder active-loading entries** (Kuhn 2009 subacromial protocol): full-can scaption, doorway pec stretch (progressive), sleeper stretch, side-lying external rotation, prone horizontal abduction. Phase 0 eligible. Don't override the existing right-anterior-shoulder contraindication on bench/OHP/dips/loaded-pulls — those stay suppressed.
- **Engine: `deprecated:true` filter.** Exercises flagged deprecated never enter the selection pool. One-line predicate added to `filterPool()` in `index.html` + the two dev scripts. `audit-seed.js` skips deprecated entries during schema validation.
- **Settings: stale-clinical-data nudge.** When `_meta.last_clinical_update` is more than 90 days old, Settings shows a quiet inline note near the top: "Consider a clinical re-evaluation to update contraindications. Last update: DD Mon YYYY." Session-scoped Dismiss button. Never blocks anything.
- Schema bumped to v2.4. Firestore seeder gate bumped 2.3 → 2.4 so existing devices re-seed. SW cache v21 → v22.

## 2026-05-08

- **Settings reorganized into 4 groups + Advanced disclosure.** Replaces the prior 10-section monolith. Groups: **Training** (phase, goal, frequency, session length, doing-cardio summary), **Pool** (equipment, contraindications, exercise types), **Mesocycle** (status only), **Data** (sync, backup, video picks). Each Training/Pool row is a tappable label/value/chevron that opens a bottom sheet.
- **Save / Cancel safety net for chip-multi-select sheets.** Equipment, Contraindications, and Exercise types now stage changes in the sheet — toggling a chip flips its visual state but doesn't persist. A Save / Cancel footer appears the moment you change anything; ×/backdrop dismissal triggers a "Discard your changes?" confirm. Single-value sheets (Phase, Goal, Frequency, Session length) keep one-tap commit since the chosen value is immediately visible and re-tappable. Replaces the prior auto-save-on-every-toggle behavior so a mis-tap on a chip doesn't silently shift tomorrow's plan.
- **Doing cardio is derived, read-only.** TRAINING row reflects `disabledTypes.includes("cardio")`. Edit happens via the Exercise types row in Pool.
- **Mesocycle is status-only on Settings.** Two lines: `Week N of 5` + `Started DD Mon · X rest days`. Day-skew folds in as `schedule shifted by N days` when non-zero. Mesocycle action buttons moved to Advanced.
- **Advanced disclosure (collapsed by default).** Holds Realign-with-weekdays, Reset-to-Week-1, Force-deload, and Reset-all-data. Destructive rows render in danger color and require a confirm bottom sheet (Cancel / Action) before firing.
- **No more UID exposure.** Sync row shows `Connected ✓` or `Local only`. The `uid xxxxxx…` text is gone.
- **Video Picks helper rewritten.** Drops "developer / seed JSON" language. New copy: "Override which video plays for each exercise. Export to back up your picks."
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
