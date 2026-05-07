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

const CARD_RECIPES = {
  light_lower:       [["quad_dominant", 2, {}], ["hinge_posterior", 2, {}], ["calf_lower_leg", 1, {}]],
  light_lower_push:  [["quad_dominant", 2, {}], ["hinge_posterior", 1, {}], ["scap_postural", 2, {}], ["calf_lower_leg", 1, {}]],
  posterior_scap:    [["scap_postural", 4, {}], ["horizontal_pull", 1, {}], ["physio_specific", 1, {}]],
  recovery:          [["recovery_mobility", 2, {}], ["mobility_movement", 2, {}], ["yoga_asana", 1, {}], ["physio_specific", 2, {}]],
  lower:             [["quad_dominant", 2, {}], ["hinge_posterior", 2, {}], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  push_modified:     [["horizontal_push", 2, {}], ["vertical_push", 1, {}], ["arms_isolation", 2, { filter: "tricep" }]],
  pull_modified:     [["horizontal_pull", 2, {}], ["vertical_pull", 1, {}], ["arms_isolation", 2, { filter: "bicep" }]],
  full_body:         [["quad_dominant", 1, {}], ["hinge_posterior", 1, {}], ["horizontal_push", 1, {}], ["horizontal_pull", 1, {}], ["scap_postural", 1, {}], ["core", 1, {}]],
  push:              [["horizontal_push", 2, {}], ["vertical_push", 1, {}], ["horizontal_push", 1, { isolation: true }], ["arms_isolation", 2, { filter: "tricep" }]],
  pull:              [["horizontal_pull", 2, {}], ["vertical_pull", 1, {}], ["scap_postural", 1, {}], ["arms_isolation", 2, { filter: "bicep" }]],
  legs:              [["quad_dominant", 2, {}], ["hinge_posterior", 2, {}], ["quad_dominant", 1, { isolation: true }], ["calf_lower_leg", 1, {}], ["core", 1, {}]],
  upper:             [["horizontal_push", 1, {}], ["horizontal_pull", 1, {}], ["vertical_push", 1, {}], ["vertical_pull", 1, {}], ["scap_postural", 1, {}], ["arms_isolation", 1, {}]]
};

const RECOVERY_BLOCK = [
  { name: "Foam roll: thoracic, lats, glutes", durationMin: 8 },
  { name: "Ice / contrast: shoulder + ankle", durationMin: 10 }
];

const DEFAULT_CONTRA = ["right_anterior_shoulder", "right_medial_ankle"];
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

function filterPool(phase, cardType) {
  const recent = recentSet(cardType, 2);
  return EXERCISES.filter(ex => {
    if (!ex.phase_eligibility?.includes(phase)) return false;
    if (!ex.equipment_required?.every(e => DEFAULT_EQUIPMENT.has(e))) return false;
    if (ex.contraindication_tags?.some(t => DEFAULT_CONTRA.includes(t))) return false;
    if (recent.has(ex.id)) return false;
    return true;
  });
}

function selectFromCategory(pool, category, count, opts = {}) {
  let cands = pool.filter(ex => ex.category === category);
  if (opts.filter === "tricep") cands = cands.filter(ex => /tricep|pushdown|skull|overhead/i.test(ex.name) || ex.primary_movers?.includes("triceps"));
  if (opts.filter === "bicep")  cands = cands.filter(ex => /curl/i.test(ex.name) || ex.primary_movers?.includes("biceps"));
  if (opts.isolation) cands = cands.filter(ex => ex.fatigue_cost === "low" || /fly|extension|curl|raise|pushdown/i.test(ex.name));
  cands.sort((a, b) => fatigueRank(b) - fatigueRank(a));
  const seen = new Set();
  const out = [];
  for (const ex of cands) { if (out.length >= count) break; if (seen.has(ex.id)) continue; out.push(ex); seen.add(ex.id); }
  return out;
}

function setsForExercise(ex, cardType, week) {
  const meta = CARD_META[cardType];
  if (meta.kind !== "resistance") return 1;
  let base = 3; // Phase 0/1
  if (ex.fatigue_cost === "low") base = Math.max(2, base - 1);
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
  const planned = [];
  const used = new Set();
  for (const [cat, count, opts] of recipe) {
    const remaining = pool.filter(ex => !used.has(ex.id));
    const picks = selectFromCategory(remaining, cat, count, opts);
    for (const ex of picks) {
      used.add(ex.id);
      const sets = setsForExercise(ex, cardType, week);
      const repRange = ex.rep_ranges?.[`phase_${phase}`] || [8,12];
      planned.push({ id: ex.id, name: ex.name, category: ex.category, sets, repRange, rest_seconds: ex.rest_seconds, cue: ex.cue || "", isPhysio: ex.is_physio });
    }
  }
  // Track for rotation
  usedHistory[cardType] = (usedHistory[cardType] || []).concat([planned.map(p => p.id)]);
  if (usedHistory[cardType].length > 2) usedHistory[cardType] = usedHistory[cardType].slice(-2);

  const recovery = (phase < 2 && meta.kind === "resistance") ? RECOVERY_BLOCK
                  : (cardType === "recovery" ? RECOVERY_BLOCK : []);
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
        md.push(`| | | ${i+1}. ${p.name}${p.isPhysio ? " *(physio)*" : ""} | ${p.sets} × ${p.repRange[0]}–${p.repRange[1]} | ${p.rest_seconds}s |`);
        csvRows.push([phase, week, dayName(date.getDay()), dateISO, session.meta.title, i+1, p.name, p.category, p.sets, `${p.repRange[0]}-${p.repRange[1]}`, p.rest_seconds, (p.cue || "").replace(/[\r\n]+/g," ")]);
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
