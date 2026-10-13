#!/usr/bin/env bash
# Runs the pixel suite in Linux, like the CI pixel job (ubuntu, Node 22, Playwright's Chromium).
# The checkout is mounted read-only and copied into a Docker volume, so the host's node_modules
# (built for the host OS) are never touched. The report lands in apps/web/test-results/pixel-linux/.
#
#   apps/web/scripts/pixel/linux-container.sh                 # full suite
#   apps/web/scripts/pixel/linux-container.sh -g SP-Board-Quiet
#
# SP_PIXEL_PLATFORM=linux/amd64 matches CI's ubuntu-latest (x86_64; emulated on Apple silicon, slower).
# Use it: text rasterises differently on arm64 Linux, so an arm64 run is not CI's verdict.
# PIXEL_PARTS=1 also prints per-part ratios and writes every part's ref/app/diff PNG to pixel-linux/parts/.
set -euo pipefail
root="$(cd "$(dirname "$0")/../../../.." && pwd)"
pw="$(grep -m1 -oE "'?@playwright/test@[0-9.]+" "$root/pnpm-lock.yaml" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
image="mcr.microsoft.com/playwright:v${pw}-jammy"
platform="${SP_PIXEL_PLATFORM:-}"
vol="sp-pixel-work${platform:+-${platform//\//-}}"
out="$root/apps/web/test-results/pixel-linux"
mkdir -p "$out"
args=""; [ $# -gt 0 ] && args="$(printf '%q ' "$@")"
docker run --rm ${platform:+--platform "$platform"} --ipc=host \
  -v "$root:/src:ro" -v "$vol:/work" -v "$out:/out" -e CI=1 -e PIXEL_PARTS -e PIXEL_PARTS_DIR="${PIXEL_PARTS:+/out/parts}" "$image" bash -c "
set -euo pipefail
apt-get -qq update >/dev/null && apt-get -qq install -y rsync >/dev/null
rsync -a --delete --exclude node_modules --exclude test-results --exclude .wrangler --exclude .svelte-kit \
  --exclude build --exclude .git /src/ /work/repo/ --filter='protect node_modules/' --filter='protect */node_modules/' --filter='protect */*/node_modules/'
cd /work/repo
corepack enable >/dev/null 2>&1 || npm i -g pnpm@\$(node -p \"require('./package.json').packageManager.split('@')[1]\") >/dev/null
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
pnpm install --frozen-lockfile >/dev/null
status=0
[ -n "${PIXEL_PARTS:-}" ] && rm -rf /out/parts && mkdir -p /out/parts
pnpm --filter @superpipeline/web test:pixel $args 2>&1 | tee /out/run.log || status=\$?
rm -rf /out/pixel && cp -r apps/web/test-results/pixel /out/pixel 2>/dev/null || true
exit \$status
"
