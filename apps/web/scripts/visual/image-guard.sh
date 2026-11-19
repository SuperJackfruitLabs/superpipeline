#!/usr/bin/env bash
# apps/web/scripts/visual/image-guard.sh <image-tag> — the job's Playwright container and the lockfile must
# name the same Playwright (the browsers in the image are the ones that version drives). Used by every
# job that runs in the Playwright image (`visual`, `smoke`, `browser`).
set -euo pipefail
have="$(pnpm --filter @superpipeline/web exec playwright --version | awk '{print $2}')"
want="${1#v}"; want="${want%%-*}"
echo "playwright $have, image $want"
test "$have" = "$want" || { echo "::error::bump the job's image to v$have-jammy"; exit 1; }
