# Cadence — PRD

**Today's training card. Calibrated to where you are.**

---

## 1. Problem & why now

Existing apps fail at opposite ends. **Strong/Hevy** are pure loggers — you still plan everything yourself. **Fitbod** plans, but buries it under config screens, paywalls, and a discovery surface you didn't ask for. **Bro-split apps** (MadMuscles, Caliber) bolt on coaching theatre and social loops.

The owner already knows how to train. The unsolved problem is the **daily decision tax**: "what am I doing today, in what order, for how many sets?" That single answer, delivered in <2 seconds from cold open, is the entire product.

Additional constraint that most apps ignore: the owner is in a **rehab phase** (right anterior shoulder + medial right ankle). Generic apps assume you're healthy. Cadence assumes you're not, by default — and gets out of the way once you are.

Why now: DayOS proves the single-file-PWA + Firebase pattern works for daily-use personal tools. Recomp + rehab requires consistent execution over months. Habits die from 30 seconds of friction per session.

---

## 2. Target user

Single user. 45M, Delhi, 83kg, 5'10". Trains 5x/week in a home gym. Long-arc goal is recomp; current phase is rehab + preserve. Evidence-based, trusts curation, wants zero config on a normal day. Mental model is set-count-driven. Will abandon any app that asks him to choose between three exercises before his pre-workout kicks in.

---

## 3. Goals & non-goals

### Goals
- Today's workout visible in <2 seconds from app open, every day, no config required
- Phase-aware programming (Preserve/Rehab → Rebuild → Recomp); user advances phase manually
- Each card is one of four types: Light Resistance · Posterior+Scap · Recovery · Full Resistance
- Generated session hits evidence-based volume/frequency targets for the current phase
- Exercise selection rotates across the mesocycle — never the same session twice in a 4-week window
- Progressive overload prescribed automatically based on last logged session
- Optional weight logging exists but never blocks completion
- Mandatory physio/foam-roll/ice blocks render automatically on resistance days in Phase 0/1
- Contraindication tags suppress unsafe exercises silently — user never sees a banned movement to "skip"
- Auto-deload every 5th week (volume × 0.6, load × 0.7)

### Non-goals (defended)
- ❌ Social, sharing, leaderboards, friend graph
- ❌ Exercise discovery / browsing library / "explore" tab
- ❌ Manual workout creation by the user
- ❌ Video demos, form-check AI, pose estimation
- ❌ Nutrition, calorie tracking, meal planning
- ❌ Wearable integration (v1)
- ❌ Walk/cardio/NEAT logging (v1)
- ❌ Notifications beyond one optional "today's workout ready" ping
- ❌ Streaks, badges, gamification
- ❌ Onboarding longer than 60 seconds
- ❌ Automated phase advancement (manual only — uncleared injuries shouldn't be algorithmically pressured)

---

## 4. Phase model

User-controlled setting. Three phases, manually advanced via Settings.

| Phase | Mode | Weekly mix | When to advance |
|---|---|---|---|
| **0 — Preserve & Rehab** | Hold muscle, heal injuries, build calf/posterior chain | 3 light resistance + 2 recovery | Doctor/physio clearance only |
| **1 — Rebuild** | Reload tissue tolerance, expand movement pool | 3 modified resistance + 2 recovery | When Phase 1 sessions are clean for 3+ weeks |
| **2 — Recomp** | Original goal: lean muscle + lose fat in deficit | 5 resistance, mobility folded into warmups | Ongoing |

The phase is the single most important user setting. Everything downstream — exercise pool, volume, rest periods, rep ranges, recovery blocks — is derived from it.

---

## 5. Day-type table

Phase × day-of-week → card type:

| Phase | Mon | Tue | Wed | Thu | Fri | Sat/Sun |
|---|---|---|---|---|---|---|
| 0 | Light Lower | Recovery | Posterior+Scap | Recovery | Light Lower+Push | Off |
| 1 | Lower | Push (modified) | Recovery | Pull (modified) | Full Body | Off |
| 2 | Push | Pull | Legs | Upper | Lower | Off |

---

## 6. Contraindications (current user)

Hard-coded for v1. Editable in Settings.

**Anterior shoulder (right):** suppresses bench (any angle), overhead press, dips, front raises, upright rows, lat pulldown, bent-over row, pull-ups (loaded), single-arm rows under load, anything cuing front-rounded shoulder posture.

**Medial ankle (right, loaded):** suppresses heavy bilateral barbell squat, conventional deadlift, jumping/plyometric, weighted standing calf raises until cleared. Reduced ROM on lunges; no aggressive ankle dorsiflexion under load.

**Mandatory inclusions per resistance session (Phase 0/1):** foam roll block (post), ice/contrast bath block (post), calf strengthening progression (terminal slot on lower days).

---

## 7. Core user flows

### Flow A — Daily training (95% flow)
1. Open app → **Today** screen renders: card type ("Wed · Posterior + Scap · ~40 min"), exercise count, single Start CTA
2. Tap Start → **In-Progress** view, exercise 1 visible with sets as checkable rows
3. Per set: tap checkbox to mark done. Optional: tap row to expand a 2-field load input (kg, reps). Long-press a row to flag a symptom on that exercise.
4. All sets checked → auto-advance to next exercise (no transition screen)
5. Last exercise complete → **Done** screen with single end-of-session prompt: "Any pain today?" (single tap yes/no)
6. Tap Finish → return to Today, now previewing tomorrow

### Flow B — First-time setup (≤60 sec)
1. Goal · frequency · session length (one screen)
2. Equipment access (multi-select chips, one screen)
3. Contraindications (optional, skip-able)
4. First workout generated → land on Today

### Flow C — History (occasional)
- Calendar grid, color-coded by completion. Tap any day → read-only session log.

### Flow D — Skip / reschedule (edge case)
- Today screen has a single overflow action: "Not today" → shifts split sequence by one day, regenerates tomorrow.

---

## 8. The Engine

### Inputs
```
phase: 0 | 1 | 2
day_of_week: 0–6
last_sessions: { exercise_id → { load, reps, rpe?, symptom_flag? } }
mesocycle_week: 1–5    // week 5 = auto-deload
contraindication_flags: string[]
```

### Generation pipeline (5 steps)

**1. Day-type lookup** → §5 table.

**2. Volume target** — Phase × card type → set count band:
- Phase 0 resistance: 10–12 working sets
- Phase 1 resistance: 14–18 working sets
- Phase 2 resistance: 16–20 working sets (1 major + 1 minor pairing)
- Recovery cards: 6–8 timed blocks, 20–25 min total

**3. Exercise pool filter** — pull from DB where:
- `phase_eligibility` includes current phase
- `equipment_required` ⊆ user's equipment
- `contraindication_tags` ∩ `contraindication_flags` = ∅
- not used in last 2 sessions of same card type (rotation)

**4. Selection & ordering** — compound first, isolation after, injured area last. Within compounds, prioritize highest stimulus-to-fatigue exercises not used recently. Calf rehab block is a fixed terminal slot on every lower day until ankle cleared.

**5. Load prescription** — for each selected exercise:
- If logged previously and last session hit top of rep range with no symptom flag → +2.5 kg (compound) / +1 kg (isolation) or +1 rep
- If symptom flag last session → hold load
- If symptom flag two consecutive sessions → substitute exercise
- If no history → return rep range only, no load suggestion

### Auto-deload
Every 5th week: volume × 0.6, load × 0.7, no progression. Renders with subtle "Deload week" tag on Today screen.

---

## 9. Worked examples

### Phase 0, Wed, Week 2 — Posterior + Scap (~40 min)

```
1. Band pull-aparts          3 × 15        scap activation
2. Prone Y-raise (DB light)  3 × 12        rest 60s
3. Rear delt fly (DB)        3 × 12        rest 60s
4. Face pull (band)          3 × 15        rest 60s
5. Wall push-up, wide        3 × 12        physio
6. Breaststroke prone (BW)   2 × 20        physio

Recovery block (unskippable):
- Foam roll: thoracic, lats, glutes — 8 min
- Ice / contrast bath: shoulder + ankle — 10 min
```

11 working sets + physio + recovery. All anterior-shoulder + loaded-pull movements suppressed silently.

### Phase 2, Mon, Week 3 — Push (~60 min)

```
1. BB bench press            4 × 6–8       compound, +2.5kg vs last
2. Incline DB press          3 × 8–10
3. Cable chest fly           3 × 12–15
4. Tricep pushdown           3 × 10–12
5. Overhead tricep ext (DB)  3 × 12–15

Warmup: 5 min foam roll thoracic + lats + 2×10 band pull-aparts
```

16 working sets, 1 major (chest) + 1 minor (triceps), compound-first ordering. Recovery block is optional in Phase 2.

---

## 10. Exercise database schema

```javascript
{
  id: "db_rear_delt_fly",
  name: "Rear Delt Fly",
  category: "isolation",
  movement_pattern: "horizontal_pull_isolated",
  primary_movers: ["rear_delts"],
  secondary_movers: ["rhomboids", "mid_traps"],
  equipment_required: ["adjustable_dumbbells"],
  fatigue_cost: "low",                        // low | medium | high
  rep_ranges: { phase_0: [10,15], phase_1: [10,15], phase_2: [12,15] },
  rest_seconds: 60,
  position_tags: ["scap_retraction"],
  contraindication_tags: [],                  // empty = always safe
  phase_eligibility: [0, 1, 2],
  is_physio: false,
  notes: ""
}
```

**Seed:** 85 exercises across 12 categories. See `exercise-seed.json`.

| Category | Count | Phase 0 eligible |
|---|---|---|
| Quad-dominant | 8 | partial (single-leg only) |
| Hinge / posterior | 8 | partial (light only) |
| Horizontal push | 7 | none |
| Vertical push | 5 | none |
| Horizontal pull | 7 | none |
| Vertical pull | 5 | none |
| Scap / postural | 10 | all |
| Calf / lower leg | 6 | partial (rehab progression) |
| Core | 6 | partial |
| Arms isolation | 6 | partial |
| Recovery / mobility | 10 | all |
| Physio-specific | 5 | all |

---

## 11. Screen inventory (P0)

| # | Screen | Purpose | Frequency |
|---|---|---|---|
| 1 | **Today** | Card type, duration, exercise count, Start CTA | Daily |
| 2 | **In-Progress** | Active session. Sets as checkable rows, tap-to-log, long-press for symptom flag | Daily |
| 3 | **History** | Calendar grid, completion-colored. Tap day → read-only log. Trends panel: adherence + time-to-first-set | Weekly |
| 4 | **Settings** | Phase toggle, equipment, contraindications, notification time, deload override | Rare |
| 5 | **Setup** | One-time onboarding | Once |

No tab bar in P0. **Today** is root. History and Settings reachable via a single header icon. Anything that doesn't fit on these five screens isn't in v1.

---

## 12. Feature breakdown

### P0 (MVP — ship first)
- Setup flow + 3 phases + day-type table
- Engine: 5-step pipeline with phase-aware filtering
- Exercise DB seed (83 entries)
- Today / In-Progress / Done flow
- Contraindication enforcement (anterior_shoulder, medial_ankle_loaded)
- Recovery block (unskippable Phase 0/1)
- Symptom flag (per-exercise long-press + end-of-session prompt)
- Manual phase advancement
- Last-write-wins multi-device sync
- Skip / reschedule action
- Auto-deload every 5th week

### P1 (after 4 weeks of P0 use)
- History tab + calendar
- Trends panel (adherence %, time-to-first-set)
- Notification (single optional ping)
- Editable contraindications

### P2 (future)
- Walk/NEAT logging (Phase 2 only)
- Mesocycle visualization
- Export session data
- Optional Phase 2 program variants (PPL vs. Upper/Lower)

---

## 13. Data model (Firestore)

```
users/{uid}
  ├─ profile: { goal, phase, frequency, sessionLength, equipment[], contraindications[] }
  ├─ mesocycleState: { startDate, currentWeek, deloadDue }
  └─ notificationTime

sessions/{uid}/{sessionId}
  ├─ date, cardType, planned: [exercise blocks]
  ├─ logged: [{ exerciseId, sets: [{reps, load, completed}], symptomFlag }]
  └─ completedAt, durationActual, sessionSymptomFlag

exercises/{exerciseId}                    // read-only, seeded once
  └─ schema per §10

userExerciseHistory/{uid}/{exerciseId}    // denormalized for fast load lookup
  └─ lastSession, lastLoad, lastReps, symptomFlagCount
```

Denormalized history collection is the one architecture call worth defending — it lets the engine do load prescription with a single read instead of scanning sessions.

---

## 14. Tech stack

Mirrors DayOS — no new pattern to learn.

- Single `index.html` — vanilla JS, Tailwind via CDN
- Firebase Firestore (sync) + Firebase Auth (anonymous)
- Vercel hosting
- PWA manifest (installable to home screen)
- Chart.js for History trends
- Service worker (offline-first read; queue writes)

**No build step. No npm. No framework.** Ship the whole thing in one file. If complexity ever justifies a build step, you're already past v1.

---

## 14b. Design intent

This is a **consumer-grade app**, not an instrument panel. Even though it's a single-user tool, it should look and feel polished, branded, and inviting — closer to a well-designed consumer fitness app than to a clinical chart or pure utility UI.

Concretely:
- A logo + wordmark in the header is part of the identity. Don't strip it for "minimalism."
- Type can be expressive at hierarchy moments (the workout title, the Done summary). Not every label needs to be t-meta uppercase.
- The accent color is allowed to carry visual weight, not just signal state.
- Spacing, hierarchy, and small moments of polish (a logo glyph, a soft background card) are good — they don't violate the <2-second-to-action promise as long as the primary CTA is unambiguous.

What this **doesn't** mean:
- Still no streaks, badges, gamification, leaderboards, or social — those are out per §3 non-goals.
- Still no decorative gradients, glassmorphism, or layered effects without information value.
- Still no animations beyond functional feedback (set-check pulse, card-advance).

The previous "Garmin watch face / hospital chart" direction was rejected. If a future contributor brings that framing in, this section is the canonical override.

---

## 15. Success metrics

| Metric | Target | Why |
|---|---|---|
| % planned sessions completed (weekly) | ≥80% | Adherence is the program |
| Time from app open → first set logged | <15 sec | Friction kills consistency |
| Weekly volume vs. prescribed (per muscle) | ±15% band | Confirms engine isn't drifting |
| Symptom-flag rate per session | <10% trending down | Validates phase progression |
| Phase 0 → Phase 1 latency | Informational only | No artificial pressure to advance |

First two surface in History → Trends. Rest are diagnostic.

---

## 16. Resolved decisions

- **Symptom flag UX:** end-of-session single-tap default; per-exercise via long-press during session
- **Walk/NEAT logging:** out of v1
- **Phase advancement:** manual only
- **Multi-device conflict:** last-write-wins (phone-primary use)
- **Pull-up bar Phase 0/1:** dead hangs (decompression) + scap pull-ups (postural) only; loaded pulls gated to Phase 2

---

## 17. Open questions for build

These are implementation calls, not product calls — flag during development:

1. Firestore offline persistence vs. custom IndexedDB queue — pick whichever Claude Code's pattern handles cleaner
2. Initial DB seeding — embed JSON in app and write to Firestore on first launch, vs. one-time seed script
3. Service worker cache strategy for the exercise DB — cache-first is fine since DB is read-only
4. Contraindication editing UI — checkbox list vs. tag chips. Defer to whatever ships in <30 min.

---

## Appendix: Cited programming sources

- Renaissance Periodization (Mike Israetel) — MV/MEV/MAV/MRV volume landmarks, mesocycle structure
- Jeff Nippard — exercise selection, hypertrophy hierarchy, stimulus-to-fatigue ratio
- Stronger by Science (Greg Nuckols) — frequency, intensity, recovery research
- Eric Helms / 3DMJ — periodization, RPE-based autoregulation, cutting protocols
- Brad Schoenfeld — hypertrophy mechanisms
- Menno Henselmans / MASS — applied programming reviews
