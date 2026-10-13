# Accent tokens (per product, user-overridable)

Generated from OKLCH with contrast checked in sRGB (WCAG 2 ratio). Source: `accent-gen/palette.py` in the scratchpad. Artboards: `Accent-Picker`, `Accent-Products`, `Accent-Palette`.

## Tokens and where they go

- `--vk-accent`: UI accent (fills, rings, underlines, bars). Must hold 3:1 on bg and surface, and 4.5:1 under `--vk-accent-fg`.
- `--vk-accent-fg`: text/glyph on an accent fill (product mark). It is the vibe's own `bg`.
- `--vk-accent-wash`: tinted background for the current nav item and the selected tab or segment.
- `--vk-accent-text`: accent as text (links, current item label). Holds 4.5:1 on bg, surface and wash.
- Studio only: `--vk-stage-1..7` regenerated from the accent hue, `--vk-color-stage-text` = accent-text, `--vk-color-success` = stage 6, `--vk-color-success-text` = accent-text, `--vk-color-success-wash` = accent-wash (done stays in the one colour family).
- Accent on: product mark, current nav item, selected tab or segmented item, links, focus ring, Studio stages. Never on: the signal, body text, ink primary buttons.
- Set `data-vibe`, `data-theme` and `data-accent` on the same element (class `acc`); mockups use `.acc[data-vibe][data-theme][data-accent]`.

## Accents and product defaults

Signal hues (OKLCH) across all vibes and themes: 34° to 56° (Quiet dark #fb923c is the outlier at 56°). Excluded band: 4° to 86°.

| Accent | Hue | Distance to nearest signal | Default for |
|---|---|---|---|
| Gold (`gold`) | 95° | 39° | Superpipeline |
| Moss (`moss`) | 128° | 72° | — |
| Jade (`jade`) | 155° | 99° | Superwitness |
| Teal (`teal`) | 192° | 136° | — |
| Azure (`azure`) | 230° | 164° | — |
| Cobalt (`cobalt`) | 260° | 134° | AgentPod |
| Violet (`violet`) | 290° | 104° | Supermessage |
| Plum (`plum`) | 335° | 59° | Superlibrary (moved off terracotta, hue 38°, which is inside the band) |

The picker offers "Product colour (default)" first, then these eight. Choosing another product's colour is allowed, with a note that the two will look alike.

## Gold — hue 95°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#866f00` | `#fff8ee` | `#f8f1d3` | `#806b00` | 4.95 | 5.22 | 4.60 | 4.64 | 4.90 | 4.64 |
| daylight | dark | `#ac9000` | `#17162a` | `#352c09` | `#ae9319` | 5.90 | 5.14 | 4.61 | 5.69 | 4.96 | 5.69 |
| paper | light | `#83701f` | `#fbf8f2` | `#f5f0dd` | `#7c6a1f` | 5.03 | 5.25 | 4.67 | 4.60 | 4.80 | 4.60 |
| paper | dark | `#a3914c` | `#1a1916` | `#322c18` | `#a59453` | 5.83 | 5.39 | 4.61 | 5.62 | 5.20 | 5.62 |
| studio | light | `#826c00` | `#f6f3ec` | `#f7f0d9` | `#7c6700` | 4.99 | 4.60 | 4.85 | 4.63 | 4.27 | 4.63 |
| studio | dark | `#a58c26` | `#14130f` | `#332c13` | `#ab9337` | 6.16 | 5.71 | 4.61 | 5.65 | 5.24 | 5.65 |
| quiet | light | `#8a7300` | `#ffffff` | `#f8f2dc` | `#806b00` | 5.22 | 4.75 | 4.66 | 4.63 | 4.21 | 4.63 |
| quiet | dark | `#a18a31` | `#0e0e10` | `#332c15` | `#a99442` | 6.43 | 5.91 | 4.63 | 5.69 | 5.23 | 5.69 |

Studio light ramp (stage 1→7): `#dad4b9` `#c5ba90` `#af9e60` `#96812e` `#7d6800` `#625100` `#483b00`

Studio dark ramp (stage 1→7): `#473a00` `#584800` `#6c5900` `#87710a` `#9e8a3e` `#b8a86f` `#d5cba4`

## Moss — hue 128°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#557c00` | `#fff8ee` | `#e8f6d9` | `#527700` | 4.98 | 5.25 | 4.66 | 4.66 | 4.92 | 4.66 |
| daylight | dark | `#759d37` | `#17162a` | `#253114` | `#7ca243` | 6.00 | 5.23 | 4.65 | 5.60 | 4.88 | 5.60 |
| paper | light | `#5e7936` | `#fbf8f2` | `#ebf4e1` | `#5a7435` | 4.97 | 5.19 | 4.66 | 4.65 | 4.85 | 4.65 |
| paper | dark | `#809b5d` | `#1a1916` | `#28301d` | `#849e63` | 5.90 | 5.46 | 4.61 | 5.66 | 5.24 | 5.66 |
| studio | light | `#557813` | `#f6f3ec` | `#eaf5de` | `#517214` | 5.03 | 4.64 | 4.94 | 4.64 | 4.28 | 4.64 |
| studio | dark | `#769945` | `#14130f` | `#26311a` | `#7fa151` | 6.30 | 5.84 | 4.63 | 5.68 | 5.26 | 5.68 |
| quiet | light | `#5d7f29` | `#ffffff` | `#ecf6e1` | `#587726` | 5.14 | 4.68 | 4.61 | 4.63 | 4.21 | 4.63 |
| quiet | dark | `#769649` | `#0e0e10` | `#27301b` | `#81a057` | 6.52 | 5.99 | 4.66 | 5.72 | 5.26 | 5.72 |

Studio light ramp (stage 1→7): `#ccd8bf` `#afc19a` `#8fa970` `#708e47` `#557520` `#405e00` `#2d4400`

Studio dark ramp (stage 1→7): `#2f420f` `#3a5311` `#496619` `#607f32` `#7a9753` `#9ab27d` `#c0d2ad`

## Jade — hue 155°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#008249` | `#fff8ee` | `#dcf9e5` | `#007c46` | 5.01 | 5.29 | 4.71 | 4.64 | 4.90 | 4.64 |
| daylight | dark | `#33a566` | `#17162a` | `#143421` | `#42a96e` | 6.02 | 5.25 | 4.62 | 5.67 | 4.94 | 5.67 |
| paper | light | `#357e53` | `#fbf8f2` | `#e3f6e9` | `#357950` | 4.95 | 5.16 | 4.65 | 4.65 | 4.85 | 4.65 |
| paper | dark | `#5fa076` | `#1a1916` | `#1f3225` | `#66a47c` | 6.00 | 5.55 | 4.65 | 5.67 | 5.25 | 5.67 |
| studio | light | `#007e46` | `#f6f3ec` | `#e0f7e7` | `#047844` | 5.02 | 4.63 | 4.93 | 4.65 | 4.29 | 4.65 |
| studio | dark | `#439e69` | `#14130f` | `#1b3323` | `#52a773` | 6.31 | 5.85 | 4.62 | 5.61 | 5.20 | 5.61 |
| quiet | light | `#248551` | `#ffffff` | `#e3f8e9` | `#217c4b` | 5.19 | 4.72 | 4.66 | 4.62 | 4.20 | 4.62 |
| quiet | dark | `#489a69` | `#0e0e10` | `#1c3224` | `#59a576` | 6.49 | 5.96 | 4.62 | 5.60 | 5.15 | 5.60 |

Studio light ramp (stage 1→7): `#c2dbc9` `#9dc5aa` `#73ae88` `#489566` `#1b7d4a` `#006336` `#004926`

Studio dark ramp (stage 1→7): `#0c4728` `#0c5832` `#146c3f` `#318656` `#569d71` `#80b793` `#b0d5bc`

## Teal — hue 192°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#007f7c` | `#fff8ee` | `#d3f9f7` | `#007a77` | 4.92 | 5.18 | 4.61 | 4.60 | 4.85 | 4.60 |
| daylight | dark | `#00a39f` | `#17162a` | `#003433` | `#00a8a4` | 6.02 | 5.25 | 4.64 | 5.69 | 4.96 | 5.69 |
| paper | light | `#007e7b` | `#fbf8f2` | `#ddf6f5` | `#007976` | 4.96 | 5.17 | 4.65 | 4.64 | 4.84 | 4.64 |
| paper | dark | `#3ca19e` | `#1a1916` | `#163231` | `#48a4a1` | 5.94 | 5.50 | 4.63 | 5.68 | 5.25 | 5.68 |
| studio | light | `#007b79` | `#f6f3ec` | `#d9f7f6` | `#007572` | 5.00 | 4.62 | 4.91 | 4.61 | 4.25 | 4.61 |
| studio | dark | `#009f9b` | `#14130f` | `#0e3332` | `#00a8a4` | 6.32 | 5.86 | 4.64 | 5.69 | 5.28 | 5.69 |
| quiet | light | `#008380` | `#ffffff` | `#dcf9f7` | `#007b79` | 5.11 | 4.65 | 4.61 | 4.61 | 4.19 | 4.61 |
| quiet | dark | `#009c99` | `#0e0e10` | `#113332` | `#29a7a4` | 6.57 | 6.04 | 4.64 | 5.71 | 5.24 | 5.71 |

Studio light ramp (stage 1→7): `#b9dbd9` `#8ec6c3` `#58afac` `#009693` `#007976` `#005f5d` `#004644`

Studio dark ramp (stage 1→7): `#004543` `#005553` `#006966` `#008481` `#2a9e9b` `#6ab8b5` `#a3d6d3`

## Azure — hue 230°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#007aa2` | `#fff8ee` | `#dff4ff` | `#00759c` | 4.95 | 5.22 | 4.60 | 4.63 | 4.88 | 4.63 |
| daylight | dark | `#009cce` | `#17162a` | `#093141` | `#08a1d4` | 5.96 | 5.19 | 4.62 | 5.61 | 4.89 | 5.61 |
| paper | light | `#19799d` | `#fbf8f2` | `#dff4ff` | `#1c7496` | 4.97 | 5.18 | 4.64 | 4.65 | 4.85 | 4.65 |
| paper | dark | `#4e9bbe` | `#1a1916` | `#1a303a` | `#579fc0` | 5.97 | 5.52 | 4.66 | 5.66 | 5.23 | 5.66 |
| studio | light | `#00759c` | `#f6f3ec` | `#dff4ff` | `#007096` | 5.04 | 4.65 | 4.93 | 4.71 | 4.34 | 4.71 |
| studio | dark | `#2199c7` | `#14130f` | `#14303d` | `#36a0cb` | 6.24 | 5.78 | 4.64 | 5.71 | 5.29 | 5.71 |
| quiet | light | `#007ea7` | `#ffffff` | `#e2f5ff` | `#00759c` | 5.22 | 4.75 | 4.66 | 4.62 | 4.21 | 4.62 |
| quiet | dark | `#3096c0` | `#0e0e10` | `#16303c` | `#439fc7` | 6.45 | 5.92 | 4.61 | 5.74 | 5.27 | 5.74 |

Studio light ramp (stage 1→7): `#bcd8e7` `#94c1d8` `#64a8c9` `#2e8eb5` `#007399` `#005b79` `#00425a`

Studio dark ramp (stage 1→7): `#004158` `#00516d` `#006485` `#007ea7` `#4096bc` `#73b2d0` `#a8d2e7`

## Cobalt — hue 260°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#3a6fc8` | `#fff8ee` | `#e8f1ff` | `#376abd` | 5.03 | 5.30 | 4.66 | 4.64 | 4.90 | 4.64 |
| daylight | dark | `#5f92e7` | `#17162a` | `#1d2d46` | `#6595e6` | 5.90 | 5.15 | 4.61 | 5.70 | 4.97 | 5.70 |
| paper | light | `#4e71ab` | `#fbf8f2` | `#e8f1ff` | `#4b6ca3` | 4.99 | 5.20 | 4.65 | 4.64 | 4.84 | 4.64 |
| paper | dark | `#7194cb` | `#1a1916` | `#232d3e` | `#7596cb` | 5.84 | 5.41 | 4.60 | 5.69 | 5.27 | 5.69 |
| studio | light | `#3f6db9` | `#f6f3ec` | `#e8f1ff` | `#3c67af` | 5.05 | 4.66 | 4.92 | 4.62 | 4.26 | 4.62 |
| studio | dark | `#638fd8` | `#14130f` | `#202d41` | `#6c96dc` | 6.23 | 5.77 | 4.65 | 5.71 | 5.29 | 5.71 |
| quiet | light | `#4a75bb` | `#ffffff` | `#ebf2ff` | `#456daf` | 5.17 | 4.71 | 4.60 | 4.61 | 4.20 | 4.61 |
| quiet | dark | `#638cce` | `#0e0e10` | `#212d40` | `#6f96d6` | 6.44 | 5.91 | 4.63 | 5.67 | 5.21 | 5.67 |

Studio light ramp (stage 1→7): `#c6d4ec` `#a4bbdf` `#809fd3` `#5d83c1` `#3f68ac` `#295192` `#173972`

Studio dark ramp (stage 1→7): `#213a64` `#29497c` `#355a97` `#4b73b4` `#678cc7` `#8caada` `#b7ccee`

## Violet — hue 290°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#7561c5` | `#fff8ee` | `#efeeff` | `#6f5cbb` | 5.07 | 5.35 | 4.67 | 4.66 | 4.92 | 4.66 |
| daylight | dark | `#9585e4` | `#17162a` | `#2c2845` | `#9788e2` | 5.85 | 5.10 | 4.63 | 5.70 | 4.97 | 5.70 |
| paper | light | `#7368aa` | `#fbf8f2` | `#efeeff` | `#6d63a1` | 5.02 | 5.23 | 4.64 | 4.62 | 4.82 | 4.62 |
| paper | dark | `#938ac9` | `#1a1916` | `#2c2a3c` | `#958dc8` | 5.79 | 5.36 | 4.60 | 5.63 | 5.20 | 5.63 |
| studio | light | `#7161b7` | `#f6f3ec` | `#efeeff` | `#6b5cad` | 5.04 | 4.65 | 4.88 | 4.63 | 4.27 | 4.63 |
| studio | dark | `#9083d4` | `#14130f` | `#2c2940` | `#968ad8` | 6.13 | 5.68 | 4.62 | 5.65 | 5.24 | 5.65 |
| quiet | light | `#786ab9` | `#ffffff` | `#f1f0ff` | `#6e62ac` | 5.24 | 4.77 | 4.66 | 4.60 | 4.19 | 4.60 |
| quiet | dark | `#8d82cc` | `#0e0e10` | `#2c293f` | `#968cd3` | 6.42 | 5.90 | 4.67 | 5.69 | 5.23 | 5.69 |

Studio light ramp (stage 1→7): `#d2d0ea` `#b8b4dd` `#9d96d0` `#8277bd` `#695ba8` `#53448d` `#3d2f6e`

Studio dark ramp (stage 1→7): `#3b3361` `#4a3f79` `#5b4e93` `#7366af` `#8a81c3` `#a7a0d7` `#c9c5ec`

## Plum — hue 335°

| Vibe | Theme | accent | accent-fg | accent-wash | accent-text | text/bg | text/surface | text/wash | UI/bg | UI/surface | fg/accent |
|---|---|---|---|---|---|---|---|---|---|---|---|
| daylight | light | `#aa4f99` | `#fff8ee` | `#ffe8f9` | `#a04b90` | 5.10 | 5.38 | 4.65 | 4.64 | 4.90 | 4.64 |
| daylight | dark | `#ca73b8` | `#17162a` | `#3c2237` | `#c977b8` | 5.75 | 5.01 | 4.62 | 5.62 | 4.90 | 5.62 |
| paper | light | `#985d8c` | `#fbf8f2` | `#fceaf7` | `#905985` | 5.01 | 5.23 | 4.62 | 4.63 | 4.83 | 4.63 |
| paper | dark | `#b980ac` | `#1a1916` | `#372633` | `#b983ad` | 5.79 | 5.35 | 4.65 | 5.65 | 5.22 | 5.65 |
| studio | light | `#9f5190` | `#f6f3ec` | `#ffe9f9` | `#974e88` | 5.04 | 4.65 | 4.86 | 4.67 | 4.31 | 4.67 |
| studio | dark | `#bf75b0` | `#14130f` | `#3a2535` | `#c37db4` | 6.12 | 5.67 | 4.62 | 5.65 | 5.24 | 5.65 |
| quiet | light | `#a45c95` | `#ffffff` | `#ffebfa` | `#98548a` | 5.29 | 4.81 | 4.66 | 4.62 | 4.21 | 4.62 |
| quiet | dark | `#b974aa` | `#0e0e10` | `#392534` | `#c07fb2` | 6.35 | 5.84 | 4.65 | 5.64 | 5.18 | 5.64 |

Studio light ramp (stage 1→7): `#e3cbdd` `#d2acc9` `#c08bb3` `#a96a9c` `#924c84` `#78366c` `#5b2251`

Studio dark ramp (stage 1→7): `#542a4b` `#68335e` `#7f4173` `#9a588d` `#b074a3` `#c896bc` `#e1bed8`

## Signal, for comparison

| Vibe | Theme | signal | signal-text | hue | signal-text/bg |
|---|---|---|---|---|---|
| daylight | light | `#e2502e` | `#a8361a` | 34.4° | 6.21 |
| daylight | dark | `#ff8466` | `#ffb898` | 34.8° | 10.60 |
| paper | light | `#c9411b` | `#a8361a` | 35.5° | 6.18 |
| paper | dark | `#f06a43` | `#f59a7c` | 36.9° | 8.20 |
| studio | light | `#e8461c` | `#b2300c` | 34.7° | 5.71 |
| studio | dark | `#ff6a3d` | `#ff8d68` | 37.1° | 8.20 |
| quiet | light | `#c2410c` | `#c2410c` | 38.4° | 5.18 |
| quiet | dark | `#fb923c` | `#fb923c` | 55.9° | 8.52 |

## How the values are made (OKLCH)

Per accent hue `h` and vibe chroma cap `C` (Daylight 0.15, Paper 0.10, Studio 0.13, Quiet 0.12; dark themes × 0.92), gamut-mapped by reducing chroma at fixed L and h:

- `accent-wash` = `oklch(0.955, w, h)` light (Quiet light 0.96), `oklch(0.295, 1.3·w, h)` dark; `w` = 0.040 / 0.026 / 0.032 / 0.030 (Daylight / Paper / Studio / Quiet).
- `accent` (light) = `oklch(L*, C, h)`, where L* is the highest L (step 0.004 from 0.80 down) at which `cr(bg, accent) ≥ 4.6` and `cr(accent, surface) ≥ 3.1`. Dark: the lowest L (from 0.40 up) meeting the same against the dark bg, then `L* + 0.05`.
- `accent-fg` = the vibe's `bg`.
- `accent-text` = `oklch(L*, 0.95·C, h)` with the same search, needing ≥ 4.6 on bg, surface and wash.
- Every result was checked: text ≥ 4.60 on bg, surface and wash; UI ≥ 4.19 on bg and surface (3:1 needed); fg on accent ≥ 4.60.

### Studio stage ramp from the accent hue

Keep Annual report's lightness/chroma curve (measured from today's blue ramp) and swap the hue:

`stage_i = oklch(L_i, min(C_i, Cmax(L_i, h)), h)` for i = 1..7

| | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| light L | .867 | .787 | .700 | .608 | .521 | .440 | .355 |
| light C | .036 | .058 | .084 | .105 | .118 | .116 | .105 |
| dark L | .352 | .407 | .470 | .555 | .637 | .732 | .840 |
| dark C | .079 | .095 | .108 | .111 | .099 | .078 | .053 |

`Cmax(L, h)` is the largest chroma inside sRGB at that L and h (binary search). Cobalt (h 260) reproduces today's blue ramp almost exactly (today's is h ≈ 267). Hatched stage 5 = blocked, solid stage 7 = done, vermilion = needs you, unchanged.

## Open points
- Daylight/Paper/Quiet `success` is green; Jade and Moss accents sit near it. Success is only used for "Live" and "Done" words with a label, so it stays, but worth a look.
- Gold at 4.5:1 is a deep olive-gold, not the bright Superpipeline yellow; the pale `--vk-product-superpipeline-bg` can stay as a large decorative tile colour if wanted.
