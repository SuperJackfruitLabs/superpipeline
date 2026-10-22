#!/bin/sh
# Smoke a SuperPipeline staging copy: `sh deploy/staging/smoke.sh <base-url>`.
set -eu
base=${1:-https://staging-app.superpipeline.dev}
fail() { echo "smoke: $*" >&2; exit 1; }
curl -fsS "$base/health" | grep -q '"ok":true' || fail "/health"
code=$(curl -s -o /dev/null -w '%{http_code}' "$base/v1/boards")
[ "$code" = 401 ] || fail "/v1/boards unauthenticated answered $code, not 401"
curl -fsS "$base/" | grep -qi '<html' || fail "/ serves no web app"
loc=$(curl -s -o /dev/null -w '%{redirect_url}' "$base/auth/login")
case "$loc" in
  https://staging-accounts.superjackfruit.com/*client_id=superpipeline-web*) ;;
  *) fail "/auth/login redirects to '$loc', not staging-accounts" ;;
esac
echo "smoke: ok ($base)"
