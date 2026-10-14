# Brand assets

Copied unchanged from the Super Jackfruit Labs product-logo pack **translucent-v2 (2026-10-14)**,
`products/superpipeline/web/`: the Superpipeline "Channel" mark, amber `#D89600`. Only the files
the app uses are here; `favicon.ico` and `apple-touch-icon.png` from the same folder sit at the
root of `static/`, where browsers look for them unasked.

The in-app mark (`src/lib/components/BrandMark.svelte`) inlines the pack's `mark-current.svg`
geometry so CSS can colour it: the flat amber on light grounds, white on dark, as the pack's
adaptive favicon does. Do not redraw or recolour these files; take a new pack version instead.
