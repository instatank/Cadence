#!/bin/bash
# Cadence pre-push gate (playbook SOP-ship.md step 3).
# Adapted from time-tracker/scripts/check.sh — lives in the repo so it can't vanish.
#
# 1. Extracts the inline <script type="module"> from index.html -> node --check
# 2. Runs scripts/smoke-test.js (engine regression harness) if present
#
# Remember the 3-file engine-sync rule: engine logic is hand-duplicated across
# index.html, scripts/generate-sample-plans.js and scripts/smoke-test.js —
# a recipe/fallback/selection change must land in all three or this safety
# net silently checks stale logic.
set -e
cd "$(dirname "$0")/.."

node -e '
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!m) { console.error("FAIL: no inline <script type=\"module\"> found in index.html"); process.exit(1); }
fs.writeFileSync(require("os").tmpdir() + "/cadence-inline-module.mjs", m[1]);
'
node --check "$(node -e 'process.stdout.write(require("os").tmpdir())')/cadence-inline-module.mjs"
echo "OK  inline module syntax"

if [ -f scripts/smoke-test.js ]; then
  echo "SIM scripts/smoke-test.js"
  if ! node scripts/smoke-test.js; then
    echo "FAIL: smoke test is RED — the engine produced an invalid plan." >&2
    echo "      Do NOT ship. Fix the engine (and keep index.html," >&2
    echo "      generate-sample-plans.js and smoke-test.js in sync)." >&2
    exit 1
  fi
else
  echo "NOTE: scripts/smoke-test.js missing — engine regression gate skipped."
fi

echo "ALL GATES GREEN"
