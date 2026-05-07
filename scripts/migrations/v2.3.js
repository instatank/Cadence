// Migrate seed v2.2 → v2.3
// - Fix time-modality entries with rep_ranges still in rep-count form
// - Fix physio_contrast_bath empty equipment_required
// - Idempotent
//
// Run: node scripts/migrations/v2.3.js

const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "../../data/v1-exercise-seed.json");
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

const TIME_FIXES = {
  bw_side_plank:    { phase_0: [20,30], phase_1: [30,45], phase_2: [45,60] },
  bw_hollow_hold:   { phase_0: [20,30], phase_1: [30,40], phase_2: [40,60] },
  band_iso_tib_post:{ phase_0: [10,20], phase_1: [15,25], phase_2: [20,30] }
};

let touched = 0;
for (const ex of seed.exercises) {
  if (TIME_FIXES[ex.id]) {
    ex.rep_ranges = TIME_FIXES[ex.id];
    touched++;
  }
  if (ex.id === "physio_contrast_bath" && (!ex.equipment_required || !ex.equipment_required.length)) {
    ex.equipment_required = ["bodyweight"]; // self-administered, no gym kit needed
    touched++;
  }
}

seed._meta.version = "2.3";
seed._meta.schema = "cadence-exercise-v2.3";
seed._meta.changelog = (seed._meta.changelog || "") +
  " v2.3: Fixed rep_ranges for bw_side_plank, bw_hollow_hold, band_iso_tib_post (modality=time but values were still in rep counts). Filled equipment_required for physio_contrast_bath.";

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");
console.log(`Patched ${touched} entries. Schema → v${seed._meta.version}.`);
