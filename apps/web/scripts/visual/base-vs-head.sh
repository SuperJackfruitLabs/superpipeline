#!/usr/bin/env bash
# apps/web/scripts/visual/base-vs-head.sh [base] — the visual job, and `pnpm visual:local`.
# Captures the app's visual screens at the base commit and at HEAD on this machine, one after the other,
# with HEAD's capture code in both trees, then compares them (e2e/visual/diff.spec.ts).
#   base: a sha or ref; empty or all zeros falls back to the merge base with origin/main (lock-base.mjs).
#   VISUAL_SELF=1  capture HEAD twice instead (calibration: the noise floor must be zero).
#   VISUAL_TMP     where the base worktree and the captures go (default: a new temp dir).
set -euo pipefail
repo="$(git rev-parse --show-toplevel)"
web="$repo/apps/web"
tmp="${VISUAL_TMP:-$(mktemp -d)}/visual-$$"
mkdir -p "$tmp"
out="$web/test-results/visual"
rm -rf "$out"; mkdir -p "$out"

capture() { # <tree> <folder>
  echo "::group::visual capture $(git -C "$1" rev-parse --short HEAD) -> $2"
  (cd "$1/apps/web" && VISUAL_OUT="$2" pnpm exec playwright test -c e2e/visual/playwright.visual.config.ts)
  echo "::endgroup::"
}

if [ "${VISUAL_SELF:-}" = 1 ]; then
  base="$(git rev-parse HEAD)"
  capture "$repo" "$out/base"
  capture "$repo" "$out/head"
  reason=""
else
  arg="${1:-}"
  if [ -n "$arg" ] && ! [[ "$arg" =~ ^0+$ ]]; then arg="$(git rev-parse "$arg")"; fi
  base="$(node "$web/scripts/visual/trailer.mjs" base "$arg")"
  echo "visual: base $base, head $(git rev-parse HEAD)"
  if [ "$(node "$web/scripts/visual/trailer.mjs" touches "$base")" = no ]; then
    echo "visual: no file in $base...HEAD can move a pixel (prose and unit tests only); nothing to capture, pass."
    exit 0
  fi
  tree="$tmp/base"
  cleanup() { git -C "$repo" worktree remove --force "$tree" 2>/dev/null || rm -rf "$tree"; git -C "$repo" worktree prune; rm -rf "$tmp"; }
  trap cleanup EXIT
  git -C "$repo" worktree add --detach "$tree" "$base" >/dev/null
  # HEAD's capture code, so both sides are captured the same way (the base may predate it).
  rm -rf "$tree/apps/web/e2e/visual"; cp -R "$web/e2e/visual" "$tree/apps/web/e2e/visual"
  echo "::group::install base"; (cd "$tree" && pnpm install --frozen-lockfile --prefer-offline); echo "::endgroup::"
  capture "$tree" "$out/base"
  capture "$repo" "$out/head"
  reason="$(node "$web/scripts/visual/trailer.mjs" reason "$base")"
fi

cd "$web"
VISUAL_BASE="$out/base" VISUAL_HEAD="$out/head" VISUAL_DIFF="$out/diff" VISUAL_CHANGE="$reason" \
  pnpm exec playwright test -c e2e/visual/playwright.diff.config.ts
