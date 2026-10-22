#!/usr/bin/env bash
# Deploy a commit of SuperPipeline to the staging plane, as root on workbench: run by
# /usr/local/sbin/staging-deploy (`superpipeline <sha>`). Idempotent. Installs and builds the web
# app for that commit (staging hub baked in) into apps/web/build, which the Worker serves as its
# assets, applies D1 migrations to the persisted state, recreates the Worker and runs the smoke.
set -euo pipefail
sha=${1:-$(git -C /opt/suite-staging/superpipeline rev-parse origin/main)}
cd /opt/suite-staging/superpipeline
git fetch -q origin
git checkout -q --detach "$sha"
sha=$(git rev-parse HEAD)

env=/opt/suite-staging/env/superpipeline
[ -f "$env/worker.env" ] || { echo "no $env/worker.env (SESSION_SECRET)"; exit 1; }

compose="docker compose -f deploy/staging/compose.yml"
docker run --rm -v "$PWD:/app" -w /app -e CI=true -e PUBLIC_HUB_URL=https://staging-hub.agentpod.dev \
  node:22.20.0-bookworm sh -c "corepack enable >/dev/null && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm install --frozen-lockfile >/dev/null && pnpm --filter @superpipeline/web build >/dev/null"
$compose stop superpipeline cron >/dev/null 2>&1 || true
$compose run --rm migrate
$compose up -d --force-recreate superpipeline cron
for _ in $(seq 1 90); do curl -sf http://127.0.0.1:8787/health >/dev/null && break; sleep 2; done
sh deploy/staging/smoke.sh http://127.0.0.1:8787
git log -1 --format='staged %h %s'
