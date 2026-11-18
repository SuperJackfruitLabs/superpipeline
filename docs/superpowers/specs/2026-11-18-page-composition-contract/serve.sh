#!/usr/bin/env sh
# Serves the composition mockups. They load vibekit's bundled stylesheet from ./vk, which is not committed:
# link it from the installed package (after SuperPipeline moves to @superjackfruitlabs/vibekit-ui from npm) or from a sibling vibekit checkout.
set -e
cd "$(dirname "$0")"
if [ ! -e vk ]; then
  for p in ../../../../node_modules/@superjackfruitlabs/vibekit-ui/dist ../../../../apps/web/node_modules/@superjackfruitlabs/vibekit-ui/dist ../../../../../vibekit/dist; do
    if [ -f "$p/styles/vibekit.bundle.css" ]; then mkdir -p vk && ln -s "../$p/styles/vibekit.bundle.css" vk/vibekit.bundle.css && ln -s "../$p/fonts" vk/fonts && break; fi
  done
fi
[ -e vk/vibekit.bundle.css ] || { echo "no vibekit dist found; see the comment at the top of this file" >&2; exit 1; }
echo "http://localhost:8765/all-pages-four-vibes.html"
python3 -m http.server 8765
