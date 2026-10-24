# Brand assets

Copied unchanged from the Super Jackfruit Labs product-logo pack **translucent-v2 (2026-10-14)**,
`products/superpipeline/web/`: the SuperPipeline "Channel" mark, amber `#D89600`. Only the files
the app uses are here; `favicon.ico` and `apple-touch-icon.png` from the same folder sit at the
root of `static/`, where browsers look for them unasked.

The in-app mark (`src/lib/components/BrandMark.svelte`) inlines the pack's `mark-current.svg`
geometry so CSS can colour it: the flat amber on light grounds, white on dark, as the pack's
adaptive favicon does. Do not redraw or recolour these files; take a new pack version instead.

`logo-motion.js` is the pack's approved logo animation (`motion/logo-motion.js`, translucent-v2,
2026-10-14), copied byte for byte: it is generated, never edited by hand. It carries all six
products' masters; the app only ever asks it for `superpipeline` (Channel). `LogoMotion.svelte`
loads it and plays it once on the first loading screen of a session.

The home-screen icons (`icon-*.png`, `icon-maskable-*.png` and the root `apple-touch-icon.png`)
come from the same pack's `web-dark/` folder instead, on the dark plate `#151B2B`: a web app's
home-screen icon cannot follow the phone's light/dark setting, so every product app ships the
dark one.
