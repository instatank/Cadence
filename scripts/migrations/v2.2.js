// Migrate exercise seed v2.1 → v2.2
// - Adds `exercise_types: string[]` (multi-tag, controlled vocab)
// - Adds 5 cardio entries (filtered out by default until user enables cardio)
// - Updates _meta.version to 2.2 with type_legend
//
// Idempotent: respects existing exercise_types if already populated.
//
// Run: node scripts/migrate-seed-v2.2.js

const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "../data/v1-exercise-seed.json");
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

// ---- controlled vocabulary ----

const TYPE_LEGEND = {
  strength:    "Primary strength / hypertrophy work — main lifts and accessories.",
  mobility:    "Active range-of-motion work — joint articulation, movement quality.",
  cardio:      "Cardiovascular conditioning — sustained elevated heart rate.",
  flexibility: "Passive lengthening — held stretches, yoga asanas.",
  stability:   "Balance, proprioception, anti-rotation, single-leg control.",
  power:       "Explosive / plyometric — fast intent, jumping, throwing.",
  rehab:       "Physio-specific — corrective work or pain-driven exercises.",
  warmup:      "Useful as a warmup or activation drill before main work."
};

// ---- type assignment by category (default) ----
const CATEGORY_TYPES = {
  quad_dominant:     ["strength"],
  hinge_posterior:   ["strength"],
  horizontal_push:   ["strength"],
  vertical_push:     ["strength"],
  horizontal_pull:   ["strength"],
  vertical_pull:     ["strength"],
  arms_isolation:    ["strength"],
  calf_lower_leg:    ["strength"],
  core:              ["strength"],
  scap_postural:     ["mobility", "rehab"],
  recovery_mobility: ["mobility", "flexibility"],
  mobility_movement: ["mobility"],
  yoga_asana:        ["flexibility", "mobility"],
  physio_specific:   ["rehab"]
};

// ---- per-id overrides (additive — these are added to category defaults) ----
const TYPE_OVERRIDES = {
  // Stability/balance work
  "single_leg_balance":              ["stability", "rehab"],
  "side_plank":                      ["stability"],
  "bw_hollow_hold":                  ["stability"],
  "core_pallof_press":               ["stability"],
  "pallof_press":                    ["stability"],
  "bird_dog":                        ["stability"],
  "dead_bug":                        ["stability"],
  "db_single_leg_rdl":               ["stability"],

  // Warmup-typical
  "cat_cow":                         ["warmup"],
  "hip_cars":                        ["warmup"],
  "shoulder_cars":                   ["warmup"],
  "worlds_greatest_stretch":         ["warmup"],
  "wall_slide":                      ["warmup"],
  "band_pull_apart":                 ["warmup"],
  "bw_glute_bridge":                 ["warmup"],
  "deep_squat_hold":                 ["warmup"],

  // Cardio-tagged movements that aren't in cardio category
  "bw_mountain_climber":             ["cardio"],
  "bw_flutter_kick":                 [],

  // Calf work — also stability for single-leg variants
  "single_leg_calf_eccentric":       ["stability", "rehab"],
  "tibialis_anterior_raise":         ["rehab"],
  "isometric_tibialis_posterior":    ["rehab"],

  // Held isometrics
  "band_spanish_squat":              ["rehab"],

  // Dead hang doubles as decompression
  "bw_dead_hang":                    ["rehab"],

  // Scap work — drop "rehab" tag for non-rehab-specific entries
  "rear_delt_fly":                   [], // keep mobility only (default already mobility,rehab — we'll handle below)
  "reverse_cable_fly":               []
};

// Special: some scap_postural items are actually pure strength accessories.
// We'll trim "rehab" from these and add "strength":
const SCAP_AS_STRENGTH = new Set([
  "rear_delt_fly", "reverse_cable_fly", "face_pull", "face_pull_band", "band_pull_apart"
]);

function inferTypes(ex) {
  if (Array.isArray(ex.exercise_types) && ex.exercise_types.length) return ex.exercise_types;
  let types = new Set(CATEGORY_TYPES[ex.category] || []);
  if (SCAP_AS_STRENGTH.has(ex.id)) {
    types.delete("rehab");
    types.add("strength");
  }
  const adds = TYPE_OVERRIDES[ex.id];
  if (adds) adds.forEach(t => types.add(t));
  return [...types];
}

// ---- pass 1: tag every existing exercise ----
let touched = 0;
seed.exercises.forEach(ex => {
  const before = JSON.stringify(ex.exercise_types);
  ex.exercise_types = inferTypes(ex);
  if (JSON.stringify(ex.exercise_types) !== before) touched++;
});

// ---- pass 2: add cardio entries (filtered out by default until enabled) ----
const NEW_CARDIO = [
  {
    id: "cardio_jumping_jacks", name: "Jumping Jacks", category: "mobility_movement",
    movement_pattern: "plyometric_alternating",
    primary_movers: ["calves", "hip_abductors"], secondary_movers: ["shoulders", "core"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_2: [30, 60] }, rest_seconds: 30,
    position_tags: ["plyometric"], contraindication_tags: ["right_medial_ankle"],
    phase_eligibility: [2], is_physio: false,
    cue: "Soft landings, arms full overhead, knees stay slightly bent.",
    notes: "Standard cardio warmup. Gated until ankle cleared.",
    exercise_types: ["cardio", "warmup"],
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "cardio_high_knees", name: "High Knees", category: "mobility_movement",
    movement_pattern: "running_in_place",
    primary_movers: ["hip_flexors", "calves"], secondary_movers: ["core"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_2: [20, 45] }, rest_seconds: 30,
    position_tags: ["plyometric"], contraindication_tags: ["right_medial_ankle"],
    phase_eligibility: [2], is_physio: false,
    cue: "Drive knees to hip height, light on the balls of feet, tall posture.",
    notes: "Cardio + hip-flexor warmup. Gated until ankle cleared.",
    exercise_types: ["cardio", "warmup"],
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "cardio_butt_kicks", name: "Butt Kicks", category: "mobility_movement",
    movement_pattern: "running_in_place",
    primary_movers: ["hamstrings"], secondary_movers: ["calves"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_2: [20, 45] }, rest_seconds: 30,
    position_tags: ["plyometric"], contraindication_tags: ["right_medial_ankle"],
    phase_eligibility: [2], is_physio: false,
    cue: "Heels to glutes, fast turnover, light landings.",
    notes: "Hamstring warmup. Gated until ankle cleared.",
    exercise_types: ["cardio", "warmup"],
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "cardio_jump_rope", name: "Jump Rope", category: "mobility_movement",
    movement_pattern: "plyometric",
    primary_movers: ["calves"], secondary_movers: ["forearms", "core"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "medium", modality: "time",
    rep_ranges: { phase_2: [60, 180] }, rest_seconds: 60,
    position_tags: ["plyometric", "ankle_dorsiflexion_loaded"],
    contraindication_tags: ["right_medial_ankle"],
    phase_eligibility: [2], is_physio: false,
    cue: "Tiny hops, wrists turn the rope, elbows tucked.",
    notes: "High ankle load — strict Phase 2 only after full ankle clearance.",
    exercise_types: ["cardio"],
    video_url: null, video_source: null, video_duration_sec: null
  },
  {
    id: "cardio_burpee", name: "Burpees", category: "mobility_movement",
    movement_pattern: "full_body_plyometric",
    primary_movers: ["legs", "chest"], secondary_movers: ["core", "shoulders"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "high", modality: "reps",
    rep_ranges: { phase_2: [8, 15] }, rest_seconds: 60,
    position_tags: ["plyometric", "anterior_loaded_shoulder"],
    contraindication_tags: ["right_anterior_shoulder", "right_medial_ankle"],
    phase_eligibility: [2], is_physio: false,
    cue: "Squat, hands down, kick back to plank, push-up optional, jump up.",
    notes: "Both contraindications apply. Strict Phase 2 only.",
    exercise_types: ["cardio", "power", "strength"],
    video_url: null, video_source: null, video_duration_sec: null
  }
];

const existingIds = new Set(seed.exercises.map(e => e.id));
let added = 0;
for (const ex of NEW_CARDIO) {
  if (!existingIds.has(ex.id)) { seed.exercises.push(ex); added++; }
}

// ---- pass 3: update _meta ----
seed._meta.version = "2.2";
seed._meta.schema = "cadence-exercise-v2.2";
seed._meta.total_count = seed.exercises.length;
seed._meta.exercise_type_legend = TYPE_LEGEND;
seed._meta.changelog = (seed._meta.changelog || "") +
  " v2.2: Added exercise_types[] multi-tag (controlled vocab: " +
  Object.keys(TYPE_LEGEND).join(", ") +
  "). Tagged all 112 prior exercises by category + targeted overrides. " +
  "Added 5 cardio entries (Jumping Jacks, High Knees, Butt Kicks, Jump Rope, Burpees) — gated to Phase 2 with both relevant contraindication tags; user-disabled by default until cardio is enabled in Settings.";

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");

console.log(`Tagged exercise_types on ${touched} exercises.`);
console.log(`Added ${added} cardio entries. Total now: ${seed.exercises.length}.`);
console.log(`Schema bumped to v${seed._meta.version}.`);
