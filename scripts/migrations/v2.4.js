// Migrate seed v2.3 → v2.4 (rename pass — Part 1A only)
// - Renames contraindication tag right_medial_ankle → right_ankle_insertional_loading
// - Updates _meta.contraindication_tag_legend key + description
// - Idempotent
//
// Note: the rest of v2.4 (deprecations + new entries + last_clinical_update)
// will land in a follow-up migration step. This migration is intentionally
// scoped narrow per the user's request to pause after the rename.
//
// Run: node scripts/migrations/v2.4.js

const fs = require("fs");
const path = require("path");

const SEED_PATH = path.join(__dirname, "../../data/v1-exercise-seed.json");
const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));

const OLD_TAG = "right_medial_ankle";
const NEW_TAG = "right_ankle_insertional_loading";
const NEW_DESC = "Right insertional Achilles tendinosis + plantar fasciitis: avoid loaded dorsiflexion past neutral, no high-impact running/jumping, no stair/incline walking under load. Eccentric calf work flat surface only (NOT off step — compresses the inflamed insertion).";

let renamedEntries = 0;
for (const ex of seed.exercises) {
  if (Array.isArray(ex.contraindication_tags) && ex.contraindication_tags.includes(OLD_TAG)) {
    ex.contraindication_tags = ex.contraindication_tags.map(t => t === OLD_TAG ? NEW_TAG : t);
    renamedEntries++;
  }
}

// _meta legend: replace key, replace description.
if (seed._meta && seed._meta.contraindication_tag_legend) {
  const legend = seed._meta.contraindication_tag_legend;
  if (OLD_TAG in legend) delete legend[OLD_TAG];
  legend[NEW_TAG] = NEW_DESC;
}

// _meta.changelog appended; version bump deferred until full v2.4 (data adds) lands.
seed._meta.changelog = (seed._meta.changelog || "") +
  " v2.4-pre: Renamed right_medial_ankle → right_ankle_insertional_loading per orthopedic re-eval (insertional Achilles tendinosis + plantar fasciitis).";

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2) + "\n");
console.log(`Renamed tag on ${renamedEntries} exercises and 1 legend entry.`);
console.log(`Schema version unchanged (2.3); will bump to 2.4 after data adds land.`);
