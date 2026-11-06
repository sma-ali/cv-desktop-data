#!/usr/bin/env bash
# Met à jour signes-de-vie.json et le publie s'il a changé. Lancé une fois
# par jour ; STATS_FILE et CONFIG_FILE viennent de l'environnement.
set -euo pipefail
cd "$(dirname "$0")"
git pull --quiet --ff-only
node export.mjs
git add signes-de-vie.json
git diff --cached --quiet && exit 0
git commit --quiet -m "chore: signes de vie du $(date -u +%F)"
git push --quiet
