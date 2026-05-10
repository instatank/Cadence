// Generate 2 weeks each of Phase 0 and Phase 1 sample routines using the same
// engine logic as index.html. Output CSV to docs/sample-plans-phase0-phase1.csv
// and a markdown summary to docs/sample-plans-phase0-phase1.md.
//
// Run: node scripts/generate-sample-plans.js

const fs = require("fs");
const path = require("path");

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/v1-exercise-seed.json"), "utf8"));
const EXERCISES = seed.exercises;

// ---- Mirror of engine constants from index.html ----

const DAY_TABLE = {
  0: { 1: "light_lower", 2: "recovery", 3: "posterior_scap", 4: "recovery", 5: "light_lower_push", 6: "off", 0: "off" },
  1: { 1: "lower", 2: "push_modified", 3: "recovery", 4: "pull_modified", 5: "full_body", 6: "off", 0: "off" },
  2: { 1: "push", 2: "pull", 3: "legs", 4: "upper", 5: "lower", 6: "off", 0: "off" }
};

const CARD_META = {
  light_lower:       { title: "Light Lower",        duration: 35, kind: "resistance" },
  posterior_scap:    { title: "Posterior + Scap",   duration: 40, kind: "resistance" },
  light_lower_push:  { title: "Light Lower + Push", duration: 40, kind: "resistance" },
  recovery:          { title: "Recovery",           duration: 25, kind: "recovery" },
  lower:             { title: "Lower",              duration: 50, kind: "resistance" },
  push_modified:     { title: "Push (modified)",    duration: 50, kind: "resistance" },
  pull_modified:     { title: "Pull (modified)",    duration: 50, kind: "resistance" },
  full_body:         { title: "Full Body",          duration: 55, kind: "resistance" },
  push:              { title: "Push",               duration: 60, kind: "resistance" },
  pull:              { title: "Pull",               duration: 60, kind: "resistance" },
  legs:              { title: "Legs",               duration: 60, kind: "resistance" },
  upper:             { title: "Upper",              duration: 55, kind: "resistance" },
  off:               { title: "Off Day",            duration: 0,  kind: "off" }
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

const RECOVERY_BLOCK = [
  { name: "Foam roll: thoracic, lats, glutes", durationMin: 8 },
  { name: "Ice / contrast: shoulder + ankle", durationMin: 10 }
];

const RELATED_CATEGORIES = {
  horizontal_push: ["scap_postural", "core"],
  vertical_push:   ["scap_postural"],
  horizontal_pull: ["scap_postural"],
  vertical_pull:   ["scap_postural"],
  quad_dominant:   ["hinge_posterior", "calf_lower_leg"],
  hinge_posterior: ["quad_dominant"],
  arms_isolation:  ["scap_postural", "core"],
  core:            ["physio_specific"],
  recovery_mobility: ["mobility_movement", "yoga_asana"],
  mobility_movement: ["recovery_mobility", "yoga_asana"],
  yoga_asana:      ["recovery_mobility"],
  scap_postural:   ["physio_specific"],
  physio_specific: ["recovery_mobility"]
};

const DEFAULT_CONTRA = ["right_anterior_shoulder", "right_ankle_insertional_loading"];
const DEFAULT_DISABLED_TYPES = ["cardio"];
const DEFAULT_EQUIPMENT = new Set([
  "adjustable_dumbbells","barbell_plates","adjustable_bench","pull_up_bar",
  "resistance_bands","cable_machine","foam_roller","yoga_mat","bodyweight"
]);

const fatigueRank = (ex) => ({ high: 3, medium: 2, low: 1 })[ex.fatigue_cost] || 1;

// Track recently-used per (cardType) across the sim
const usedHistory = {}; // cardType → [[exId,...], [exId,...]] last two sessions

function recentSet(cardType, n) {
  const arr = (usedHistory[cardType] || []).slice(-n);
  const s = new Set();
  arr.forEach(list => list.forEach(id => s.add(id)));
  return s;
}

function filterPool(phase, cardType, allowRecent = false) {
  const recent = allowRecent ? new Set() : recentSet(cardType, 2);
  return EXERCISES.filter(ex => {
    if (!ex.phase_eligibility?.includes(phase)) return false;
    if (!ex.equipment_required?.every(e => DEFAULT_EQUIPMENT.has(e))) return false;
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
  } else {
    cands = pool.filter(ex => ex.category === category);
  }
  if (opts.filter === "tricep") cands = cands.filter(ex => /tricep|pushdown|skull|overhead/i.test(ex.name) || ex.primary_movers?.includes("triceps"));
  if (opts.filter === "bicep")  cands = cands.filter(ex => /curl/i.test(ex.name) || ex.primary_movers?.includes("biceps"));
  if (opts.isolation) cands = cands.filter(ex => ex.fatigue_cost === "low" || /fly|extension|curl|raise|pushdown/i.test(ex.name));
  if (opts.warmup) cands.sort((a, b) => fatigueRank(a) - fatigueRank(b));
  else cands.sort((a, b) => fatigueRank(b) - fatigueRank(a));
  const seen = new Set();
  const out = [];
  for (const ex of cands) { if (out.length >= count) break; if (seen.has(ex.id)) continue; out.push(ex); seen.add(ex.id); }
  return out;
}

function setsForExercise(ex, cardType, week, slotOpts = {}) {
  const meta = CARD_META[cardType];
  if (slotOpts.warmup) return 1;
  if (meta.kind !== "resistance") return 1;
  const isCore = ex.category === "core" || ex.category === "physio_specific";
  let base = 3;
  if (isCore) base = 2;
  if (ex.fatigue_cost === "low" && !isCore) base = Math.max(2, base - 1);
  if (week === 5) base = Math.max(2, Math.round(base * 0.6));
  return base;
}

function generateSession(phase, date, week) {
  const dow = date.getDay();
  const cardType = DAY_TABLE[phase][dow] || "off";
  const meta = CARD_META[cardType];
  if (meta.kind === "off") return { date, dow, cardType, meta, planned: [], recovery: [] };

  const recipe = CARD_RECIPES[cardType] || [];
  const pool = filterPool(phase, cardType);
  const noRecentPool = filterPool(phase, cardType, true);
  const planned = [];
  const used = new Set();
  function pushPick(ex, slotOpts = {}) {
    used.add(ex.id);
    const sets = setsForExercise(ex, cardType, week, slotOpts);
    const repRange = ex.rep_ranges?.[`phase_${phase}`] || [8,12];
    const isUnilateral = (ex.position_tags || []).includes("unilateral");
    planned.push({
      id: ex.id, name: ex.name, category: ex.category, sets, repRange,
      rest_seconds: slotOpts.warmup ? 30 : ex.rest_seconds, cue: ex.cue || "", isPhysio: ex.is_physio,
      isWarmup: !!slotOpts.warmup,
      modality: ex.modality || "reps", unilateral: isUnilateral
    });
  }
  for (const [cat, count, opts] of recipe) {
    const remaining = pool.filter(ex => !used.has(ex.id));
    let picks = selectFromCategory(remaining, cat, count, opts);
    if (picks.length < count && !opts.byTypes) {
      for (const fb of (RELATED_CATEGORIES[cat] || [])) {
        if (picks.length >= count) break;
        const fbRemaining = pool.filter(ex => !used.has(ex.id) && !picks.find(p => p.id === ex.id));
        picks = picks.concat(selectFromCategory(fbRemaining, fb, count - picks.length, opts));
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
    for (const ex of picks) pushPick(ex, opts);
  }
  // Track for rotation
  usedHistory[cardType] = (usedHistory[cardType] || []).concat([planned.map(p => p.id)]);
  if (usedHistory[cardType].length > 2) usedHistory[cardType] = usedHistory[cardType].slice(-2);

  // Recovery card already IS recovery — only resistance days get the appended block.
  const recovery = (phase < 2 && meta.kind === "resistance") ? RECOVERY_BLOCK : [];
  return { date, dow, cardType, meta, planned, recovery };
}

// ---- Run sim ----
const csvRows = [];
csvRows.push(["Phase","Week","Day","Date","Card","Exercise #","Exercise","Category","Sets","Rep range","Rest sec","Cue"]);
const md = [];

const dayName = (dow) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow];

function runPhase(phase, label, weeksToShow) {
  // Reset rotation history per phase so weeks 1-2 are independent
  for (const k of Object.keys(usedHistory)) delete usedHistory[k];

  md.push(`\n## ${label}\n`);
  // Start sim from a Monday
  const start = new Date("2026-05-04T00:00:00"); // Monday
  for (let week = 1; week <= weeksToShow; week++) {
    md.push(`\n### Week ${week}\n`);
    md.push(`| Day | Card | Block | Sets × Reps | Rest |`);
    md.push(`|---|---|---|---|---|`);
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + (week - 1) * 7 + d);
      const session = generateSession(phase, date, week);
      const dateISO = date.toISOString().slice(0,10);

      if (session.meta.kind === "off") {
        md.push(`| ${dayName(date.getDay())} | Off | — | — | — |`);
        csvRows.push([phase, week, dayName(date.getDay()), dateISO, "Off", "", "", "", "", "", "", ""]);
        continue;
      }
      // Title row spanning the day
      md.push(`| **${dayName(date.getDay())}** | **${session.meta.title}** *(~${session.meta.duration}m)* | | | |`);
      session.planned.forEach((p, i) => {
        const unit = p.modality === "time" ? "sec" : p.modality === "rounds" ? "rounds" : "reps";
        const side = p.unilateral ? " /side" : "";
        const prescription = `${p.sets} × ${p.repRange[0]}–${p.repRange[1]} ${unit}${side}`;
        const tag = p.isWarmup ? " *(warmup)*" : p.isPhysio ? " *(physio)*" : "";
        md.push(`| | | ${i+1}. ${p.name}${tag} | ${prescription} | ${p.rest_seconds}s |`);
        csvRows.push([phase, week, dayName(date.getDay()), dateISO, session.meta.title, i+1, p.name, p.category, p.sets, `${p.repRange[0]}-${p.repRange[1]} ${unit}${side}`, p.rest_seconds, (p.cue || "").replace(/[\r\n]+/g," ")]);
      });
      session.recovery.forEach(r => {
        md.push(`| | | _${r.name}_ | ${r.durationMin} min | — |`);
        csvRows.push([phase, week, dayName(date.getDay()), dateISO, session.meta.title, "recovery", r.name, "recovery_block", `${r.durationMin}min`, "", "", ""]);
      });
    }
  }
}

runPhase(0, "Phase 0 — Preserve & Rehab (2 weeks)", 2);
runPhase(1, "Phase 1 — Rebuild (2 weeks)", 2);

// Write outputs
const outCsv = csvRows.map(row => row.map(v => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}).join(",")).join("\n");

fs.mkdirSync(path.join(__dirname, "../docs"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "../docs/sample-plans-phase0-phase1.csv"), outCsv);
fs.writeFileSync(path.join(__dirname, "../docs/sample-plans-phase0-phase1.md"),
  "# Cadence — Sample Routines (Phase 0 & Phase 1)\n\nGenerated by `scripts/generate-sample-plans.js` against the live engine logic and `data/v1-exercise-seed.json`. Equipment: full home setup. Contraindications: right anterior shoulder + right medial ankle (defaults).\n" + md.join("\n") + "\n");

console.log("Wrote docs/sample-plans-phase0-phase1.csv (" + (csvRows.length-1) + " rows)");
console.log("Wrote docs/sample-plans-phase0-phase1.md");
