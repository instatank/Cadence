// Audit pass: inventory data quality issues in the seed.
// Run: node scripts/audit-seed.js

const fs = require("fs");
const path = require("path");
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/v1-exercise-seed.json"), "utf8"));

const issues = [];
const VALID_TYPES = new Set(["strength","mobility","cardio","flexibility","stability","power","rehab","warmup"]);
const VALID_MODS = new Set(["reps","time","rounds"]);

for (const ex of seed.exercises) {
  // 1. Every phase the exercise is eligible for must have a rep_range entry.
  for (const phase of ex.phase_eligibility || []) {
    const k = `phase_${phase}`;
    const r = ex.rep_ranges?.[k];
    if (!Array.isArray(r) || r.length !== 2 || r[0] > r[1] || r[0] < 1) {
      issues.push(`${ex.id}: missing or invalid rep_ranges.${k} → ${JSON.stringify(r)}`);
    }
  }
  // 2. modality must be a known value
  if (!VALID_MODS.has(ex.modality)) issues.push(`${ex.id}: invalid modality '${ex.modality}'`);
  // 3. exercise_types must all be in the controlled vocab
  for (const t of ex.exercise_types || []) {
    if (!VALID_TYPES.has(t)) issues.push(`${ex.id}: unknown exercise_type '${t}'`);
  }
  // 4. exercise_types must not be empty (every exercise should be at least one thing)
  if (!ex.exercise_types?.length) issues.push(`${ex.id}: empty exercise_types`);
  // 5. cue should not be empty (UX expects it)
  if (!ex.cue) issues.push(`${ex.id}: empty cue`);
  // 6. equipment_required must be a non-empty array
  if (!ex.equipment_required?.length) issues.push(`${ex.id}: empty equipment_required`);
  // 7. modality 'time' should have rep_ranges in seconds (sanity: > 5 sec for any phase)
  if (ex.modality === "time") {
    for (const phase of ex.phase_eligibility || []) {
      const r = ex.rep_ranges?.[`phase_${phase}`];
      if (Array.isArray(r) && r[0] < 5) issues.push(`${ex.id}: modality=time but phase_${phase} range starts at ${r[0]} (looks like reps not seconds)`);
    }
  }
}

// 8. Coverage sanity: every (category, phase) should have at least one usable exercise (no contraindication, full equipment).
const cats = [...new Set(seed.exercises.map(e => e.category))];
const FULL_EQUIP = new Set(["adjustable_dumbbells","barbell_plates","adjustable_bench","pull_up_bar","resistance_bands","cable_machine","foam_roller","yoga_mat","bodyweight"]);
const DEFAULT_CONTRA = ["right_anterior_shoulder","right_medial_ankle"];
for (const cat of cats) {
  for (const phase of [0,1,2]) {
    const usable = seed.exercises.filter(e =>
      e.category === cat &&
      e.phase_eligibility?.includes(phase) &&
      e.equipment_required?.every(eq => FULL_EQUIP.has(eq)) &&
      !e.contraindication_tags?.some(t => DEFAULT_CONTRA.includes(t))
    );
    if (usable.length === 0) {
      // Distinguish "by design" (every entry in this category carries an active contraindication)
      // from "real gap" (some entries are eligible but other filters wipe the pool).
      const allInCat = seed.exercises.filter(e => e.category === cat && e.phase_eligibility?.includes(phase));
      const anyShoulderSafe = allInCat.some(e => !e.contraindication_tags?.some(t => DEFAULT_CONTRA.includes(t)));
      const tag = anyShoulderSafe ? "COVERAGE" : "INFO";
      issues.push(`${tag}: category=${cat} phase=${phase} → 0 usable exercises (default contraindications + full equipment)`);
    }
  }
}

const errors = issues.filter(i => !i.startsWith("INFO:"));
const infos = issues.filter(i => i.startsWith("INFO:"));
console.log(`Found ${errors.length} actionable issues, ${infos.length} info-only:`);
for (const i of errors) console.log("  ✗", i);
for (const i of infos) console.log("  i", i);
process.exit(errors.length ? 1 : 0);
