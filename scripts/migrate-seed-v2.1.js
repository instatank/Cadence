// Migrate exercise seed v2.0 → v2.1
// - Adds `modality` to every exercise: "reps" | "time" | "rounds"
// - Fixes rep_ranges that are [1,1] placeholders for yoga/holds (uses cue text where possible)
// - Adds 9 new core/ab + cardio/warmup drills
// - Updates _meta.version to 2.1 and changelog
//
// Idempotent: safe to re-run; uses existing modality if already set.
//
// Run: node scripts/migrate-seed-v2.1.js

const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "../data/v1-exercise-seed.json");
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

// ---- modality assignment rules ----

function inferModality(ex) {
  if (ex.modality) return ex.modality; // respect existing
  const name = ex.name.toLowerCase();
  const cat = ex.category;

  // Explicit time-based names regardless of category
  if (/\bplank\b|\bhold\b|\bhang\b|dead hang|deep squat hold/.test(name)) return "time";

  // CARs / rotations are rounds-based
  if (/\bcars\b|controlled articular/.test(name)) return "rounds";

  // Categories that lean time-based
  if (cat === "yoga_asana") return "time";

  if (cat === "recovery_mobility") {
    if (/^foam roll/i.test(ex.name)) return "time";
    if (/pose|stretch|fold|hang/i.test(name)) return "time";
    return "reps";
  }

  if (cat === "mobility_movement") {
    if (/cars|rotation/.test(name)) return "rounds";
    if (/hold/.test(name)) return "time";
    return "reps";
  }

  if (cat === "physio_specific") {
    if (/contrast bath/.test(name)) return "rounds";
    return "reps";
  }

  // Default
  return "reps";
}

// Infer time ranges (in seconds) from cue text when current rep_ranges are [1,1].
function inferTimeRangeFromCue(cue, fallback = [30, 45]) {
  if (!cue) return fallback;
  // Patterns like "60 sec/side", "30-45 sec", "Hold 60 sec per side"
  const range = cue.match(/(\d{1,3})\s*-\s*(\d{1,3})\s*sec/i);
  if (range) return [parseInt(range[1]), parseInt(range[2])];
  const single = cue.match(/(\d{1,3})\s*sec/i);
  if (single) {
    const n = parseInt(single[1]);
    return [Math.max(15, n - 15), n];
  }
  return fallback;
}

// ---- per-exercise overrides ----
// When a heuristic isn't enough, hard-code the right answer.
const TIME_RANGE_OVERRIDES = {
  // (id) -> { phase_0:[s,s], phase_1:[s,s], phase_2:[s,s] }
  "side_plank":         { phase_0: [20, 30], phase_1: [30, 45], phase_2: [45, 60] },
  "bw_hollow_hold":     { phase_0: [20, 30], phase_1: [30, 40], phase_2: [40, 60] },
  "bw_dead_hang":       { phase_0: [20, 30], phase_1: [20, 30], phase_2: [30, 60] },
  "band_spanish_squat_hold": { phase_0: [20, 30], phase_1: [30, 45], phase_2: [45, 60] },
  "bw_deep_squat_hold": { phase_0: [30, 60], phase_1: [30, 60], phase_2: [45, 90] }
};

// Foam roll gets a uniform time prescription
const FOAM_ROLL_RANGE = { phase_0: [60, 90], phase_1: [60, 90], phase_2: [45, 90] };

// ---- pass 1: tag every existing exercise ----

let touched = 0, fixed = 0;
seed.exercises.forEach(ex => {
  const before = JSON.stringify(ex);
  ex.modality = inferModality(ex);

  if (ex.modality === "time") {
    // Replace [1,1] placeholders with sensible seconds
    const isPlaceholder = ex.rep_ranges &&
      Object.values(ex.rep_ranges).every(r => Array.isArray(r) && r[0] === 1 && r[1] === 1);
    if (isPlaceholder) {
      if (TIME_RANGE_OVERRIDES[ex.id]) {
        ex.rep_ranges = TIME_RANGE_OVERRIDES[ex.id];
      } else if (/^foam roll/i.test(ex.name)) {
        ex.rep_ranges = FOAM_ROLL_RANGE;
      } else {
        const r = inferTimeRangeFromCue(ex.cue);
        ex.rep_ranges = { phase_0: r, phase_1: r, phase_2: [r[0] + 15, r[1] + 15] };
      }
      fixed++;
    }
  }

  if (JSON.stringify(ex) !== before) touched++;
});

// ---- pass 2: insert new exercises if not already present ----

const NEW_EXERCISES = [
  {
    id: "bw_crunch", name: "Crunch", category: "core",
    movement_pattern: "spinal_flexion",
    primary_movers: ["upper_abs"], secondary_movers: ["obliques"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,15], phase_1: [12,20], phase_2: [15,25] },
    rest_seconds: 45,
    position_tags: ["spinal_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, knees bent, lift shoulder blades off floor, exhale up. Don't pull on neck.",
    notes: "Short ROM — focus on contracting upper abs.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_bicycle_crunch", name: "Bicycle Crunch", category: "core",
    movement_pattern: "spinal_flexion_rotation",
    primary_movers: ["obliques", "upper_abs"], secondary_movers: ["hip_flexors"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [12,16], phase_2: [15,20] },
    rest_seconds: 45,
    position_tags: ["spinal_flexion", "rotation"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, alternate elbow to opposite knee, slow controlled. Each side = 1 rep.",
    notes: "Count each side as 1 rep — so 12 reps total covers 12 per side.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_lying_leg_raise", name: "Lying Leg Raise", category: "core",
    movement_pattern: "hip_flexion",
    primary_movers: ["lower_abs", "hip_flexors"], secondary_movers: ["upper_abs"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [8,12], phase_1: [10,15], phase_2: [12,18] },
    rest_seconds: 45,
    position_tags: ["hip_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, hands under glutes, legs straight, lower to just above floor and raise to vertical.",
    notes: "Press lower back into floor. If it arches, bend knees slightly.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_reverse_crunch", name: "Reverse Crunch", category: "core",
    movement_pattern: "posterior_pelvic_tilt",
    primary_movers: ["lower_abs"], secondary_movers: ["hip_flexors"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [10,15], phase_2: [12,18] },
    rest_seconds: 45,
    position_tags: ["spinal_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, knees bent 90°, curl pelvis toward ribs (not jack knees to chest).",
    notes: "Easier on lower back than leg raises for some lifters.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_side_lying_leg_raise", name: "Side-Lying Leg Raise", category: "physio_specific",
    movement_pattern: "hip_abduction",
    primary_movers: ["glute_medius"], secondary_movers: ["obliques"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,15], phase_1: [12,15], phase_2: [12,20] },
    rest_seconds: 45,
    position_tags: ["unilateral", "hip_abduction"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: true,
    cue: "Side-lying, body straight, lift top leg slowly without rotating pelvis. Foot dorsiflexed.",
    notes: "Glute medius — also stabilizes ankle/knee chain. Ankle-friendly.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_flutter_kick", name: "Flutter Kicks", category: "core",
    movement_pattern: "hip_flexion_alternating",
    primary_movers: ["lower_abs", "hip_flexors"], secondary_movers: ["upper_abs"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [20,30], phase_1: [30,45], phase_2: [30,60] },
    rest_seconds: 45,
    position_tags: ["hip_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, hands under glutes, legs ~6 inches off floor, small fast alternating kicks. Lower back pinned.",
    notes: "Stop if low back arches.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_mountain_climber", name: "Mountain Climbers", category: "mobility_movement",
    movement_pattern: "hip_flexion_dynamic",
    primary_movers: ["hip_flexors", "core"], secondary_movers: ["shoulders"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "medium", modality: "time",
    rep_ranges: { phase_0: [20,30], phase_1: [30,45], phase_2: [30,60] },
    rest_seconds: 45,
    position_tags: ["plank_position", "anterior_loaded_shoulder"],
    contraindication_tags: ["right_anterior_shoulder"],
    phase_eligibility: [1,2], is_physio: false,
    cue: "Plank position, alternate driving knees to chest. Hips low, no piking.",
    notes: "Mild anterior shoulder load in plank — gated to Phase 1+ when shoulder cleared.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_toe_touch", name: "Toe Touches (Lying V-Reach)", category: "core",
    movement_pattern: "spinal_flexion",
    primary_movers: ["upper_abs"], secondary_movers: ["hamstrings"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [12,15], phase_2: [12,20] },
    rest_seconds: 45,
    position_tags: ["spinal_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, legs vertical, reach hands toward toes — short crunch range.",
    notes: "Upper abs focus. Easier than leg raises if hip flexors are tight.",
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "bw_heel_touch", name: "Heel Touches (Lying Side Crunch)", category: "core",
    movement_pattern: "lateral_flexion",
    primary_movers: ["obliques"], secondary_movers: [],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [12,15], phase_2: [15,20] },
    rest_seconds: 30,
    position_tags: ["lateral_flexion"],
    contraindication_tags: [], phase_eligibility: [0,1,2], is_physio: false,
    cue: "On back, knees bent, alternately reach hand toward heel on same side — small lateral crunch.",
    notes: "Each side = 1 rep. Light oblique work.",
    video_url: null, video_source: null, video_duration_sec: null
  }
];

const existingIds = new Set(seed.exercises.map(e => e.id));
let added = 0;
for (const ex of NEW_EXERCISES) {
  if (!existingIds.has(ex.id)) {
    seed.exercises.push(ex);
    added++;
  }
}

// ---- pass 3: update _meta ----

seed._meta.version = "2.1";
seed._meta.schema = "cadence-exercise-v2.1";
seed._meta.total_count = seed.exercises.length;
seed._meta.modality_legend = {
  reps: "Sets × repetitions × optional load. Default for resistance work.",
  time: "Sets × duration in seconds. Holds, isometrics, foam roll, yoga asanas.",
  rounds: "Sets × rounds (often per-side, e.g. CARs)."
};
seed._meta.changelog = (seed._meta.changelog ? seed._meta.changelog + "; " : "") +
  "v2.1: Added modality field (reps|time|rounds); fixed [1,1] placeholders for yoga/holds/foam-roll with real ranges; added 9 new core/ab + warmup drills (crunch, bicycle crunch, lying leg raise, reverse crunch, side-lying leg raise, flutter kicks, mountain climbers, toe touches, heel touches).";

// ---- write back, pretty-printed ----
fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");

console.log(`Tagged modality on ${touched} exercises.`);
console.log(`Fixed [1,1] placeholders on ${fixed} exercises.`);
console.log(`Added ${added} new exercises. Total now: ${seed.exercises.length}.`);
console.log(`Schema bumped to v${seed._meta.version}.`);
