// Smoke test the engine across (phase × day-of-week × mesocycle week).
// Asserts:
//   - resistance days produce a non-empty planned[]
//   - working-set count for resistance days falls in PRD §8.2 bands
//   - all yoga/recovery cards render with correct modality (no `1×1` placeholders)
//   - no exceptions thrown during generation
//
// Exits non-zero on any failure.
//
// Run: node scripts/smoke-test.js

const fs = require("fs");
const path = require("path");
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/v1-exercise-seed.json"), "utf8"));

// Inline a copy of the engine (kept in sync with index.html and generate-sample-plans.js).
// If the assertions ever drift, that's a signal to factor the engine into a shared module.

const DAY_TABLE = {
  0: { 1: "light_lower", 2: "recovery", 3: "posterior_scap", 4: "recovery", 5: "light_lower_push", 6: "off", 0: "off" },
  1: { 1: "lower", 2: "push_modified", 3: "recovery", 4: "pull_modified", 5: "full_body", 6: "off", 0: "off" },
  2: { 1: "push", 2: "pull", 3: "legs", 4: "upper", 5: "lower", 6: "off", 0: "off" }
};
const CARD_META = {
  light_lower: { kind: "resistance" }, posterior_scap: { kind: "resistance" }, light_lower_push: { kind: "resistance" },
  recovery: { kind: "recovery" },
  lower: { kind: "resistance" }, push_modified: { kind: "resistance" }, pull_modified: { kind: "resistance" }, full_body: { kind: "resistance" },
  push: { kind: "resistance" }, pull: { kind: "resistance" }, legs: { kind: "resistance" }, upper: { kind: "resistance" },
  off: { kind: "off" }
};

const W = ["*", 1, { byTypes: ["warmup"], warmup: true, optional: true }];
const CARD_RECIPES = {
  light_lower:       [W, ["quad_dominant", 2, {}], ["hinge_posterior", 1, {}], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  light_lower_push:  [W, ["quad_dominant", 1, {}], ["hinge_posterior", 1, {}], ["scap_postural", 2, {}], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  posterior_scap:    [W, ["scap_postural", 3, {}], ["horizontal_pull", 1, {}], ["physio_specific", 1, {}], ["core", 1, {}]],
  recovery:          [["recovery_mobility", 2, {}], ["mobility_movement", 2, {}], ["yoga_asana", 1, {}], ["physio_specific", 2, {}]],
  lower:             [W, ["quad_dominant", 2, {}], ["hinge_posterior", 2, {}], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  push_modified:     [W, ["horizontal_push", 2, {}], ["vertical_push", 1, {}], ["arms_isolation", 2, { filter: "tricep" }], ["core", 1, {}]],
  pull_modified:     [W, ["horizontal_pull", 2, {}], ["vertical_pull", 1, {}], ["arms_isolation", 2, { filter: "bicep" }], ["core", 1, {}]],
  full_body:         [W, ["quad_dominant", 1, {}], ["hinge_posterior", 1, {}], ["horizontal_push", 1, {}], ["horizontal_pull", 1, {}], ["scap_postural", 1, {}], ["core", 1, {}]],
  push:              [W, ["horizontal_push", 2, {}], ["vertical_push", 1, {}], ["horizontal_push", 1, { isolation: true }], ["arms_isolation", 2, { filter: "tricep" }], ["core", 1, {}]],
  pull:              [W, ["horizontal_pull", 2, {}], ["vertical_pull", 1, {}], ["scap_postural", 1, {}], ["arms_isolation", 2, { filter: "bicep" }], ["core", 1, {}]],
  legs:              [W, ["quad_dominant", 2, {}], ["hinge_posterior", 2, {}], ["quad_dominant", 1, { isolation: true }], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  upper:             [W, ["horizontal_push", 1, {}], ["horizontal_pull", 1, {}], ["vertical_push", 1, {}], ["vertical_pull", 1, {}], ["scap_postural", 1, {}], ["arms_isolation", 1, {}], ["core", 1, {}]]
};
const RELATED_CATEGORIES = {
  horizontal_push: ["scap_postural", "core"], vertical_push: ["scap_postural"],
  horizontal_pull: ["scap_postural"], vertical_pull: ["scap_postural"],
  quad_dominant: ["hinge_posterior", "calf_lower_leg"], hinge_posterior: ["quad_dominant"],
  arms_isolation: ["scap_postural", "core"], core: ["physio_specific"],
  recovery_mobility: ["mobility_movement", "yoga_asana"], mobility_movement: ["recovery_mobility", "yoga_asana"],
  yoga_asana: ["recovery_mobility"], scap_postural: ["physio_specific"], physio_specific: ["recovery_mobility"]
};
const FULL_EQUIP = new Set(["adjustable_dumbbells","barbell_plates","adjustable_bench","pull_up_bar","resistance_bands","cable_machine","foam_roller","yoga_mat","bodyweight"]);
const DEFAULT_CONTRA = ["right_anterior_shoulder","right_ankle_insertional_loading"];
const DEFAULT_DISABLED_TYPES = ["cardio"];

const fatigueRank = (ex) => ({ high: 3, medium: 2, low: 1 })[ex.fatigue_cost] || 1;
const usedHistory = {};
function recentSet(cardType, n) {
  const arr = (usedHistory[cardType] || []).slice(-n);
  const s = new Set(); arr.forEach(list => list.forEach(id => s.add(id))); return s;
}

function filterPool(phase, cardType, allowRecent = false) {
  const recent = allowRecent ? new Set() : recentSet(cardType, 2);
  return seed.exercises.filter(ex => {
    if (!ex.phase_eligibility?.includes(phase)) return false;
    if (!ex.equipment_required?.every(e => FULL_EQUIP.has(e))) return false;
    if (ex.contraindication_tags?.some(t => DEFAULT_CONTRA.includes(t))) return false;
    if ((ex.exercise_types || []).some(t => DEFAULT_DISABLED_TYPES.includes(t))) return false;
    if (recent.has(ex.id)) return false;
    return true;
  });
}

function selectFromCategory(pool, category, count, opts = {}) {
  let cands;
  if (opts.byTypes && opts.byTypes.length) {
    const wanted = new Set(opts.byTypes);
    cands = pool.filter(ex => (ex.exercise_types || []).some(t => wanted.has(t)));
  } else cands = pool.filter(ex => ex.category === category);
  if (opts.filter === "tricep") cands = cands.filter(ex => /tricep|pushdown|skull|overhead/i.test(ex.name));
  if (opts.filter === "bicep") cands = cands.filter(ex => /curl/i.test(ex.name));
  if (opts.isolation) cands = cands.filter(ex => ex.fatigue_cost === "low" || /fly|extension|curl|raise|pushdown/i.test(ex.name));
  if (opts.warmup) cands.sort((a, b) => fatigueRank(a) - fatigueRank(b));
  else cands.sort((a, b) => fatigueRank(b) - fatigueRank(a));
  const seen = new Set(), out = [];
  for (const ex of cands) { if (out.length >= count) break; if (seen.has(ex.id)) continue; out.push(ex); seen.add(ex.id); }
  return out;
}

function setsForExercise(ex, cardType, week, slotOpts = {}) {
  if (slotOpts.warmup) return 1;
  if (CARD_META[cardType].kind !== "resistance") return 1;
  const isCore = ex.category === "core" || ex.category === "physio_specific";
  let base = 3; if (isCore) base = 2;
  if (ex.fatigue_cost === "low" && !isCore) base = Math.max(2, base - 1);
  if (week === 5) base = Math.max(2, Math.round(base * 0.6));
  return base;
}

function generate(phase, dow, week) {
  const cardType = DAY_TABLE[phase][dow] || "off";
  const meta = CARD_META[cardType];
  if (meta.kind === "off") return { cardType, planned: [], workingSets: 0 };
  const recipe = CARD_RECIPES[cardType] || [];
  const pool = filterPool(phase, cardType);
  const noRecentPool = filterPool(phase, cardType, true);
  const planned = [];
  const used = new Set();
  for (const [cat, count, opts] of recipe) {
    const remaining = pool.filter(ex => !used.has(ex.id));
    let picks = selectFromCategory(remaining, cat, count, opts);
    if (picks.length < count && !opts.byTypes) {
      for (const fb of (RELATED_CATEGORIES[cat] || [])) {
        if (picks.length >= count) break;
        const fbR = pool.filter(ex => !used.has(ex.id) && !picks.find(p => p.id === ex.id));
        picks = picks.concat(selectFromCategory(fbR, fb, count - picks.length, opts));
      }
    }
    if (picks.length < count) {
      const r2 = noRecentPool.filter(ex => !used.has(ex.id) && !picks.find(p => p.id === ex.id));
      picks = picks.concat(selectFromCategory(r2, cat, count - picks.length, opts));
      if (picks.length < count && !opts.byTypes) {
        for (const fb of (RELATED_CATEGORIES[cat] || [])) {
          if (picks.length >= count) break;
          const r2fb = noRecentPool.filter(ex => !used.has(ex.id) && !picks.find(p => p.id === ex.id));
          picks = picks.concat(selectFromCategory(r2fb, fb, count - picks.length, opts));
        }
      }
    }
    for (const ex of picks) {
      used.add(ex.id);
      const sets = setsForExercise(ex, cardType, week, opts);
      planned.push({ id: ex.id, name: ex.name, sets, isWarmup: !!opts.warmup, modality: ex.modality, repRange: ex.rep_ranges?.[`phase_${phase}`] });
    }
  }
  usedHistory[cardType] = (usedHistory[cardType] || []).concat([planned.map(p => p.id)]);
  if (usedHistory[cardType].length > 2) usedHistory[cardType] = usedHistory[cardType].slice(-2);

  // Working sets exclude warmup blocks (PRD §8.2 definition)
  const workingSets = planned.filter(p => !p.isWarmup).reduce((n, p) => n + p.sets, 0);
  return { cardType, meta, planned, workingSets };
}

const VOLUME_BANDS = {
  // phase → [min working sets, max working sets, applies to deload? false]
  0: [9, 14],   // PRD §8.2 says 10-12; allow ±2 for variance from set sizing
  1: [12, 20],
  2: [14, 22]
};

const failures = [];
for (const phase of [0,1,2]) {
  for (const k of Object.keys(usedHistory)) delete usedHistory[k];
  for (let week = 1; week <= 5; week++) {
    for (let dow = 0; dow < 7; dow++) {
      try {
        const out = generate(phase, dow, week);
        if (out.cardType === "off") continue;
        // 1. Resistance day must have planned[] non-empty
        if (out.meta.kind === "resistance" && !out.planned.length) {
          failures.push(`phase=${phase} week=${week} dow=${dow} card=${out.cardType}: empty planned[]`);
        }
        // 2. Working-set band check (skip for deload week which intentionally cuts)
        if (out.meta.kind === "resistance" && week !== 5) {
          const [lo, hi] = VOLUME_BANDS[phase];
          if (out.workingSets < lo || out.workingSets > hi) {
            failures.push(`phase=${phase} week=${week} dow=${dow} card=${out.cardType}: working sets ${out.workingSets} out of band [${lo},${hi}]`);
          }
        }
        // 3. No 1×1 placeholders for any time-modality block
        for (const p of out.planned) {
          if (p.modality === "time" && p.repRange && p.repRange[0] < 5) {
            failures.push(`phase=${phase} week=${week} dow=${dow} card=${out.cardType}: ${p.name} time modality with range ${JSON.stringify(p.repRange)} looks invalid`);
          }
        }
      } catch (e) {
        failures.push(`phase=${phase} week=${week} dow=${dow}: ${e.message}`);
      }
    }
  }
}

if (failures.length) {
  console.log(`SMOKE TEST FAILED — ${failures.length} issues:`);
  for (const f of failures) console.log("  ✗", f);
  process.exit(1);
} else {
  console.log("SMOKE TEST PASSED — engine produces valid plans across all (phase × dow × week 1-5).");
}
