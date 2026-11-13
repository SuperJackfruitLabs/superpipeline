#!/bin/sh
# Release hook (build): builds supi at the tag (main's CI uploads no build it can ship).
# The shared release workflow runs this file, at a fixed path, when it exists.
set -eu
sh deploy/release/build.sh
