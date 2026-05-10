// Migrate seed v2.3 → v2.4 — clinical update post Fortis ortho consult
// + manual-therapy clinic findings.
//
// Idempotent. Safe to re-run.
//
// Steps (in order):
//   1A. Rename right_medial_ankle → right_ankle_insertional_loading (already shipped)
//   1B. Mark physio_eccentric_tib_post + physio_neural_floss_tibial deprecated
//   1C. Add 5 ankle physio entries (insertional Achilles + plantar fasciitis)
//   1D. Add 5 shoulder active-loading entries (Kuhn 2009 protocol)
//   1E. Update _meta: version 2.4, changelog, diagnoses_basis, last_clinical_update
//
// Run: node scripts/migrations/v2.4.js

const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "../../data/v1-exercise-seed.json");
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

const OLD_TAG = "right_medial_ankle";
const NEW_TAG = "right_ankle_insertional_loading";
const NEW_DESC = "Right insertional Achilles tendinosis + plantar fasciitis: avoid loaded dorsiflexion past neutral, no high-impact running/jumping, no stair/incline walking under load. Eccentric calf work flat surface only (NOT off step — compresses the inflamed insertion).";

// ─── 1A: Rename (idempotent) ────────────────────────────────────────────
let renamed = 0;
for (const ex of seed.exercises) {
  if (Array.isArray(ex.contraindication_tags) && ex.contraindication_tags.includes(OLD_TAG)) {
    ex.contraindication_tags = ex.contraindication_tags.map(t => t === OLD_TAG ? NEW_TAG : t);
    renamed++;
  }
}
if (seed._meta && seed._meta.contraindication_tag_legend) {
  const legend = seed._meta.contraindication_tag_legend;
  if (OLD_TAG in legend) delete legend[OLD_TAG];
  legend[NEW_TAG] = NEW_DESC;
}

// ─── 1B: Deprecate two physio entries ────────────────────────────────────
const DEPRECATIONS = {
  physio_eccentric_tib_post:    "Based on tarsal tunnel hypothesis; superseded by orthopedic diagnosis of insertional Achilles tendinosis",
  physio_neural_floss_tibial:   "Same as above; not clinically indicated for current diagnosis"
};
let deprecated = 0;
for (const [id, reason] of Object.entries(DEPRECATIONS)) {
  const ex = seed.exercises.find(e => e.id === id);
  if (ex) {
    if (!ex.deprecated) deprecated++;
    ex.deprecated = true;
    ex.deprecated_reason = reason;
  }
}

// ─── 1C: Add ankle physio entries (insertional Achilles + plantar fasciitis) ──
// All hold-style entries use modality:"time" with rep_ranges in seconds.
// Reps-style entries use modality:"reps" with rep counts.
// Engine assigns set count per session; daily/2x-daily cadence is informational.
const NEW_ANKLE = [
  {
    id: "physio_eccentric_heel_raise_flat", name: "Eccentric Heel Raise (flat surface)",
    category: "physio_specific",
    movement_pattern: "eccentric_calf_flat",
    primary_movers: ["gastrocnemius", "soleus", "achilles"],
    secondary_movers: ["tibialis_posterior"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [15,15], phase_1: [15,15], phase_2: [15,20] },
    rest_seconds: 60,
    position_tags: ["unilateral", "ankle_loading_neutral"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Stand flat on floor (NOT on step). Rise on both feet, lift uninvolved leg, lower involved heel slowly over 3 sec to floor only.",
    notes: "MUST be flat surface for insertional Achilles tendinosis. Going below step level compresses the insertion and aggravates symptoms. Per Wiegerinck systematic review.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["rehab"]
  },
  {
    id: "physio_calf_stretch_gastroc", name: "Calf Stretch — Gastrocnemius",
    category: "physio_specific",
    movement_pattern: "static_stretch",
    primary_movers: ["gastrocnemius"],
    secondary_movers: ["achilles"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [30,30], phase_1: [30,30], phase_2: [30,30] },
    rest_seconds: 0,
    position_tags: ["static_stretch"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Hands on wall, back leg straight, heel down, lean forward until calf stretches. Hold 30 sec.",
    notes: "Per Cleveland Clinic + Choose PT plantar fasciitis protocol. Daily.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["flexibility", "rehab"]
  },
  {
    id: "physio_calf_stretch_soleus", name: "Calf Stretch — Soleus",
    category: "physio_specific",
    movement_pattern: "static_stretch",
    primary_movers: ["soleus"],
    secondary_movers: ["achilles"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [30,30], phase_1: [30,30], phase_2: [30,30] },
    rest_seconds: 0,
    position_tags: ["static_stretch"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Same as gastroc but bend back knee slightly. Targets soleus and Achilles insertion.",
    notes: "Pair with gastroc stretch. Daily.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["flexibility", "rehab"]
  },
  {
    id: "physio_plantar_fascia_release", name: "Plantar Fascia Release (ball/bottle)",
    category: "physio_specific",
    movement_pattern: "self_myofascial_release",
    primary_movers: ["plantar_fascia"],
    secondary_movers: [],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [120,180], phase_1: [120,180], phase_2: [120,180] },
    rest_seconds: 0,
    position_tags: ["self_release"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Roll arch over frozen water bottle, lacrosse ball, or golf ball for 2-3 minutes. Slow controlled pressure, not painful.",
    notes: "Daily. Frozen water bottle adds anti-inflammatory effect.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["mobility", "rehab"]
  },
  {
    id: "physio_seated_plantar_fascia_stretch", name: "Seated Plantar Fascia Stretch",
    category: "physio_specific",
    movement_pattern: "static_stretch",
    primary_movers: ["plantar_fascia"],
    secondary_movers: ["calf"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [30,30], phase_1: [30,30], phase_2: [30,30] },
    rest_seconds: 0,
    position_tags: ["static_stretch", "unilateral"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Cross ankle over opposite knee. Pull toes back toward shin until you feel stretch under arch. Hold 30 sec.",
    notes: "Daily. Effective first thing in the morning before walking.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["flexibility", "rehab"]
  }
];

// ─── 1D: Add shoulder active-loading entries (Kuhn 2009 protocol) ─────────
// These EXPAND Phase 0+ availability — they don't override the
// right_anterior_shoulder contraindication on bench/OHP/dips/lat pulldown/
// loaded pulls. Those stay suppressed.
const NEW_SHOULDER = [
  {
    id: "physio_full_can_scaption", name: "Full-Can Scaption",
    category: "physio_specific",
    movement_pattern: "scaption_thumb_up",
    primary_movers: ["supraspinatus", "deltoid_middle"],
    secondary_movers: ["scap_stabilizers"],
    equipment_required: ["adjustable_dumbbells"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [10,12], phase_2: [10,15] },
    rest_seconds: 45,
    position_tags: ["scapular_plane", "thumb_up"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Light DB or no weight. Thumb UP (full-can position, not empty-can). Raise arm in scapular plane (~30° forward of pure side) to 90° max. Lower with control.",
    notes: "Full-can over empty-can — produces less subacromial compression. Stop at 90° if symptomatic. Per Kuhn 2009 evidence-based rotator cuff protocol.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["rehab", "strength"]
  },
  {
    id: "physio_doorway_pec_stretch", name: "Doorway Pec Stretch (Progressive)",
    category: "physio_specific",
    movement_pattern: "static_stretch",
    primary_movers: ["pec_major", "pec_minor"],
    secondary_movers: ["anterior_deltoid"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [30,30], phase_1: [30,30], phase_2: [30,30] },
    rest_seconds: 0,
    position_tags: ["static_stretch", "unilateral"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Forearm against doorframe at shoulder height. Step through until pec stretches. Hold 30 sec. Progress to higher arm position (overhead reach) when tolerated.",
    notes: "Start at shoulder-level position. Progress to 90/90 then overhead only when symptom-free at lower position. Per Kuhn 2009.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["flexibility", "rehab"]
  },
  {
    id: "physio_sleeper_stretch", name: "Sleeper Stretch",
    category: "physio_specific",
    movement_pattern: "posterior_capsule_stretch",
    primary_movers: ["posterior_capsule"],
    secondary_movers: ["infraspinatus"],
    equipment_required: ["bodyweight"],
    fatigue_cost: "low", modality: "time",
    rep_ranges: { phase_0: [30,30], phase_1: [30,30], phase_2: [30,30] },
    rest_seconds: 0,
    position_tags: ["static_stretch", "unilateral"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Lie on involved side, shoulder/elbow at 90°. Use opposite hand to gently press forearm down toward floor. Stretches posterior capsule. Stop short of pain.",
    notes: "Posterior capsule tightness contributes to anterior shoulder pain. This addresses it directly. Per Kuhn 2009.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["flexibility", "rehab"]
  },
  {
    id: "physio_sidelying_external_rotation", name: "Side-Lying External Rotation",
    category: "physio_specific",
    movement_pattern: "external_rotation",
    primary_movers: ["infraspinatus", "teres_minor"],
    secondary_movers: ["posterior_deltoid"],
    equipment_required: ["adjustable_dumbbells"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,15], phase_1: [10,15], phase_2: [12,15] },
    rest_seconds: 45,
    position_tags: ["unilateral", "external_rotation"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Lie on uninvolved side. Involved arm bent 90°, elbow tucked to ribs, light DB in hand. Rotate forearm up away from belly. Slow controlled.",
    notes: "Targets infraspinatus/teres minor — the external rotators critical for shoulder stability. Light load (1-3kg).",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["rehab", "strength"]
  },
  {
    id: "physio_prone_horizontal_abduction", name: "Prone Horizontal Abduction (thumb-up)",
    category: "physio_specific",
    movement_pattern: "horizontal_abduction",
    primary_movers: ["middle_trap", "lower_trap"],
    secondary_movers: ["posterior_deltoid", "rhomboids"],
    equipment_required: ["adjustable_dumbbells", "adjustable_bench"],
    fatigue_cost: "low", modality: "reps",
    rep_ranges: { phase_0: [10,12], phase_1: [10,12], phase_2: [10,15] },
    rest_seconds: 45,
    position_tags: ["scap_retraction", "thumb_up"],
    contraindication_tags: [],
    phase_eligibility: [0,1,2], is_physio: true,
    cue: "Prone on bench, arm hanging down. Light DB, thumb UP. Raise arm out to T-position, squeeze shoulder blade. Slow lower.",
    notes: "Middle/lower trap activation. Light load only — 1-3kg.",
    video_url: null, video_source: null, video_duration_sec: null,
    exercise_types: ["rehab", "strength"]
  }
];

let added = 0;
const existingIds = new Set(seed.exercises.map(e => e.id));
for (const ex of [...NEW_ANKLE, ...NEW_SHOULDER]) {
  if (!existingIds.has(ex.id)) { seed.exercises.push(ex); added++; }
}

// ─── 1E: Update _meta ────────────────────────────────────────────────────
seed._meta.version = "2.4";
seed._meta.schema = "cadence-exercise-v2.4";
seed._meta.total_count = seed.exercises.length;
seed._meta.last_clinical_update = "2026-05-10";
seed._meta.diagnoses_basis = {
  shoulder: {
    condition: "Right anterior shoulder — subacromial impingement / rotator cuff dysfunction",
    findings: "Passive insufficiency of pec major/minor, lats, subscapularis; active insufficiency of supraspinatus and anterior deltoid.",
    source: "Manual-therapy clinic, 10 sessions completed",
    status: "Active. ~30% improvement. Contraindication remains in effect."
  },
  ankle: {
    condition: "Right insertional Achilles tendinosis + plantar fasciitis",
    findings: "Mild and improving with arch support orthotic. No NSAID currently. No MRI follow-up at this stage.",
    source: "Fortis Institute orthopedic consult",
    status: "Active. Supersedes the prior tarsal tunnel working hypothesis."
  }
};
// Replace the prior v2.4-pre changelog stub with the full v2.4 entry.
seed._meta.changelog = (seed._meta.changelog || "")
  .replace(/ v2\.4-pre:[^v]*$/, "")
  .trim() +
  " v2.4: Clinical update post-orthopedic + manual therapy clinic findings. Renamed right_medial_ankle to right_ankle_insertional_loading. Deprecated 2 physio entries (physio_eccentric_tib_post, physio_neural_floss_tibial) based on superseded tarsal tunnel hypothesis. Added 5 ankle entries (insertional Achilles flat-surface eccentric + gastroc/soleus stretches + plantar fascia release + seated plantar stretch). Added 5 shoulder active-loading entries (full-can scaption, doorway pec, sleeper stretch, side-lying ER, prone horizontal abduction — Kuhn 2009 protocol).";

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");

console.log(`Renamed tag on ${renamed} exercises.`);
console.log(`Deprecated ${deprecated} entries.`);
console.log(`Added ${added} new entries (5 ankle + 5 shoulder).`);
console.log(`Total now: ${seed.exercises.length}.`);
console.log(`Schema → v${seed._meta.version}.`);
