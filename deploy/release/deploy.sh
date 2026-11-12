#!/bin/sh
# The release's production deploy (`deploy` in .github/release-config.json). It never rebuilds
# the app: it downloads the artifact main's CI built and verified for this commit (`app-<sha>`
# from CI run CI_RUN_ID, the run the release gate found green), verifies it again, applies the
# remote D1 migrations and runs `wrangler deploy` (`pnpm ci:deploy-app`, scripts/app-artifact.mjs).
# CLOUDFLARE_API_TOKEN is the repository's secret, exported by the workflow (`secrets`).
set -eu
: "${RELEASE_SHA:?}" "${CI_RUN_ID:?}" "${CLOUDFLARE_API_TOKEN:?the workflow exports CLOUDFLARE_API_TOKEN}"
rm -rf .ci-download .ci
if ! gh run download "$CI_RUN_ID" -R "$GITHUB_REPOSITORY" -n "app-$RELEASE_SHA" -D .ci-download; then
  echo "::error::artifact app-$RELEASE_SHA from CI run $CI_RUN_ID is missing (artifacts expire after 14 days, and a docs-only commit builds none). Re-run main's CI for $RELEASE_SHA, then re-run this release: gh workflow run release.yml -f tag=$TAG"
  exit 1
fi
. deploy/release/pnpm.sh
mkdir -p .ci
tar -xzf .ci-download/app.tgz -C .ci
pnpm ci:verify-app
pnpm ci:deploy-app
