#!/bin/sh
# Release hook (deploy): the production deploy.
# The shared release workflow runs this file, at a fixed path, when it exists.
set -eu
sh deploy/release/deploy.sh
