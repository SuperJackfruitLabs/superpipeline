#!/bin/sh
# The release's build (`build_command` in .github/release-config.json), run at the tag: supi for
# darwin and linux, arm64 and x64 (matching `assetName()` in packages/cli/src/update.ts: a target
# added here and not there gives a binary nothing fetches), with the tag stamped in, and the
# skill asset. The tag is the version, so the binaries cannot come from main's CI. Bun is the
# .bun-version the workflow set up; bun cross-compiles, so one runner builds all four.
set -eu
: "${TAG:?TAG is the release tag}"
. deploy/release/pnpm.sh
mkdir -p dist
for target in darwin-arm64 darwin-x64 linux-x64 linux-arm64; do
  bun build --compile --minify --define SUPI_VERSION="\"$TAG\"" --target="bun-$target" \
    packages/cli/src/index.ts --outfile "dist/supi-$target"
done
# A binary whose --define silently failed would ship reporting `dev` and never update again.
got=$(./dist/supi-linux-x64 version)
case "$got" in
  "supi $TAG "*) echo "build: $got" ;;
  *) echo "the linux-x64 binary reports '$got', not version $TAG" >&2; exit 1 ;;
esac
# The skill asset is printed by the binary it documents. Older installers fetch it by name.
./dist/supi-linux-x64 skill > dist/SKILL.md
