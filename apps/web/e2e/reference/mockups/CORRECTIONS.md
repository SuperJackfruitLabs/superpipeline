# Reference corrections

Rows applied to the committed references (`e2e/reference/mockups/*.html`). A reference correction edits a reference where it contradicts a standing ruling (canonical vibekit components, the button ruling, one shell frame per vibe, the signal colour rule, 44px targets) or an operator brief; it is never made to pass a screen. Each row must also be applied on the canvas at the next export. Each change is relocked with a `Reference-Change:` trailer; see `e2e/pixel/README.md`.

Task 5b also links `_vibekit-0.0.1/vibekit.css`, sets `data-product="superpipeline" data-accent="product"` on `<html>` and on every `[data-vibe]` root (Gold), and removes every token vibekit defines from the prototype token rules, except `--vk-font-*` (the harness routes the mockup family names). The rule list is `scripts/pixel/resync/components.ts` (`replace: false` gives the reason for each frame).

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| * | `button.vk-button, a.vk-button` | mockup-local rendering | vibekit 0.0.1 Button (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `button.icon-btn[aria-label]` | mockup-local rendering | vibekit 0.0.1 IconButton (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-segmented` | mockup-local rendering | vibekit 0.0.1 Segmented (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-field (label + one control + hint/error only)` | mockup-local rendering | vibekit 0.0.1 Field (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-pill (form pill)` | mockup-local rendering | vibekit 0.0.1 StateLabel (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `ol.vk-stages` | mockup-local rendering | vibekit 0.0.1 StageTrack (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-face (named, drawing reproduced)` | mockup-local rendering | vibekit 0.0.1 Face (re-rendered) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-tabs` | mockup-local rendering | vibekit 0.0.1 Tabs (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `section.dlg` | mockup-local rendering | vibekit 0.0.1 Dialog (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.dw` | mockup-local rendering | vibekit 0.0.1 Drawer (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.sheet` | mockup-local rendering | vibekit 0.0.1 Sheet (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.pal` | mockup-local rendering | vibekit 0.0.1 CommandPalette (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.pal-in` | mockup-local rendering | vibekit 0.0.1 CommandField (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.vk-menu` | mockup-local rendering | vibekit 0.0.1 Menu (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `shell roots` | mockup-local rendering | vibekit 0.0.1 AppShell (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.dy-rail, .mh, .ar-rail, .qn` | mockup-local rendering | vibekit 0.0.1 AppNav (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `page heads` | mockup-local rendering | vibekit 0.0.1 Masthead (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `status rows` | mockup-local rendering | vibekit 0.0.1 StatusLine (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.ph-top` | mockup-local rendering | vibekit 0.0.1 PhoneHeader (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.ph-tabs` | mockup-local rendering | vibekit 0.0.1 PhoneTabBar (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |
| * | `.ap-body` | mockup-local rendering | vibekit 0.0.1 AppearancePicker (rules dropped, markup kept) | 5b: canonical vibekit 0.0.1 (controller ruling) |

## Fix round 1 (controller ruling)

A page may place a vibekit component, never restyle it (`e2e/pixel/vk-guard.mjs`). A rule naming a `.vk-*` component class, BEM parts included, stays only when a page class is its ancestor in the selector and every declaration is layout (display, flex*, grid*, gap, width/min-/max-width, height, margin*, overflow, text-overflow, white-space, align*, justify*, order, position offsets). Colour, radius, padding and type remain vibekit's.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| Board/Dlg backdrops (Daylight) | `.dl-act .vk-button` | dropped in 5b | max-width/overflow/text-overflow restored (padding, font-size, min-height stay out) | 5b fix 1: layout placement, vibekit 0.0.1 |
| Card-States | `.addrow .vk-button` | dropped in 5b | `flex: none` restored | 5b fix 1 |
| Dlg-NewCard-* | `.nc-prio .vk-segmented` | dropped in 5b | `width: 100%` restored | 5b fix 1 |
| Dlg-Appearance-* | `.ap .vk-segmented` | dropped in 5b | `margin-top` restored | 5b fix 1 |
| Daylight boards | `.dy-faces .vk-face + .vk-face` | dropped in 5b | `margin-left: -6px` restored | 5b fix 1 |
| * | `<page root> .vk-button` | bare `.vk-button` nowrap/flex-shrink fix-ups | scoped to the page's own root container | 5b fix 1 |
| * | `.vk-segmented__item`, other BEM parts | slipped past the 5b guard (`\b` stops at `__`) | restyles dropped, layout kept | 5b fix 1 |
| * | rendered ids | `bits-sN`, repeated per render | `vk-rN`, one sequence per reference | 5b fix 1 |

## Product icons (Task 11)

Glyphs the references draw that vibekit 0.0.1 has no icon for. The app draws them from `PRODUCT_ICONS`; names vibekit has (`search`, `plus`, `check`, `people` since 0.0.3, and the aliases `chev`, `search-phone`, `close`) render vibekit's `Icon`. Delete a row when vibekit ships the glyph.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| * | icon `mark` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `plan` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `plan-sq` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `plan-phone` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `operate` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `operate-filled` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `workspace` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `moon` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `sun` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `signout` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `signout-studio` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `filter` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `filter-paper` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `funnel` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `move` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `move-phone` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `warn` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `warn-phone` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `blocked` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `blocked-phone` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `lock` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `link` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `doc` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `arrow` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| * | icon `pen` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 11: no vibekit icon in 0.0.1 |
| SP-Dlg-* | icon `card` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Tasks 37–39: no vibekit icon in 0.0.8 |
| SP-Dlg-* | icon `coin` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Tasks 37–39: no vibekit icon in 0.0.8 |
| SP-Dlg-* | icon `swatch` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Tasks 37–39: no vibekit icon in 0.0.8 |
| SP-Dlg-* | icon `power` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Tasks 37–39: no vibekit icon in 0.0.8 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `open-window` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `edit` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `pin` | mockup-local SVG path | product glyph `pushpin` in `PRODUCT_ICONS` (renamed in 0.0.9 adoption: vibekit 0.0.9 adds a location `pin`) (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `send` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `archive` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `trash` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `flag` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `seal` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |
| SP-Card-Daylight, SP-Card-States-Daylight | icon `restore` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 20: no vibekit icon in 0.0.3 |

## Desktop shell frames vibekit 0.0.2 has no form for (Task 12)

Paper, Studio and Quiet compose vibekit's AppShell, AppNav, Masthead, Tabs and StatusLine (preflight ruling). Where a reference draws a frame piece vibekit has no form for, the app draws vibekit's nearest form. The references are unchanged.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-*-Paper (off the board) | `p.mh-title.mh-title--sm` | small board title, not a heading | Masthead's title (the h1) on every page | Task 12: Masthead has no small-title form; `title` everywhere, as Daylight |
| SP-Board-Quiet | `.qn-board` "Board:" | a text label before the name | Masthead's eyebrow, "Board:" | Task 12: Masthead's Quiet head is eyebrow, title, "Change board" |

## Phone shell pieces vibekit 0.0.2 has no form for (Task 13)

The four phone shells compose vibekit's AppShell `phone` slots, PhoneHeader and PhoneTabBar (preflight ruling). Where a phone reference draws a piece vibekit has no form for, the app draws vibekit's nearest form. The references are unchanged.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Phone-Board-* | `nav[aria-label="Main"]` | named "Main" | named "Superpipeline", as the desktop AppNav | Task 13 preflight: `PhoneTabBar label="Superpipeline"` |

Task 14: one tile rule fits every Daylight card.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Board-Daylight | `article.dl-tile.p2.needs.focused` (58f8), after `.dl-move` | no `.dl-chips` | `<div class="dl-chips"><span class="vk-visually-hidden">Priority 2</span></div>` | SB §3.3 `.dl-chips`: sr "Priority {p}" when p>0, as on 4605 and 9ed9 |

Task 30: Operate's line glyphs.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Operate-* | `svg` glyphs (play, move, dollar, tick, arrows, clock) | inline SVG per reference | `LineIcon` (`parts/line-icons.ts`), same paths at the reference's 1.8 stroke (Studio 1.75) | vibekit 0.0.3 `Icon` lacks these glyphs at these strokes; kept apart from `PRODUCT_ICONS` because Task 31's List reuses the same set |

Task 32: the pages' line glyphs.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Projects-*, SP-Workspace-* | `svg` glyphs (plus, chevrons, trash, check, calendar, person, agent, key, copy, dots, pencil, link, refresh, close…) | inline SVG per reference | `LineIcon` (`parts/line-icons.ts`), same paths at the reference's stroke (`date` is the pages' rounded calendar; `square` squares its rects for Studio) | the Task 30 ruling: one stroked glyph set for every page, apart from `PRODUCT_ICONS` |

## Board-family button reset (vibekit 0.0.4)

vibekit 0.0.4 scoped the page-level button reset in its canvas sources (vibekit 807d8b4) so a `.vk-button` draws vibekit's own type (600 17px Daylight, 700 17px Quiet). The references are re-synced to match: 40 files, 52 rules.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Board-\*, SP-Board-Empty-\*, SP-Dlg-\*, SP-Projects-\*, SP-Settings-\* | `button { font: inherit; color: inherit; }` and its `:where(.backdrop)`, `:where(.mh …)`, `:where(.ar) :where(button, …)` forms | reached `.vk-button` (drew 400 16px) | `button:where(:not(.vk-button))` (same specificity) | Operator ruling: buttons are 17px semibold everywhere (Quiet 700); vibekit 0.0.4 Reference change |

## Every reference: button reset and one shell frame per vibe (controller ruling)

The button-reset scoping above now reaches every reference that has one. Each reference's shell frame was measured against its vibe's board reference (rail, nav, masthead and sub-bar boxes, content x and width; screens.ts shell selectors). Only frame CSS changed; page content is untouched.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Card-\*, SP-CardPage-Studio, SP-List-\*, SP-Operate-\*, SP-Phone-\*, SP-Spend-\*, SP-Workspace-\* | `:where(button)`, `:where(.mh button)`, `:where(.ar) :where(button, …)`, `:where(.r button, …)` with `font: inherit` | reached `.vk-button` | `button:where(:not(.vk-button))` (same specificity) | Controller ruling: the board-family scoping, everywhere |
| SP-List-Paper, SP-Operate-Paper | `.app { --mh-gutter }` | `var(--vk-space-7)` (48px): the masthead 8px wider each side than the board's | removed: the board's 56px gutter (nameplate, sections and edition at x 56, 1328 wide) | Controller ruling: one shell frame per vibe |
| SP-Operate-Paper | `.paper` padding | `var(--vk-space-6) var(--vk-space-7) var(--vk-space-7)`: the page 48px from the edge, 8px wider each side than its own masthead and the board's page | `var(--vk-space-6) var(--mh-gutter, 56px) var(--vk-space-7)`: the page inside the 56px frame (content at x 56, 1328 wide) | Controller ruling: one shell frame per vibe (the row above fixed the masthead; the page kept the old 48px) |
| SP-CardPage-Daylight | `textarea#dp-note[placeholder]` | For example: I sent a fresh DM to Melissa and Anna at 14:05; trace those two event IDs. | For example: what you checked, and what the agent should look at next. | §8.2-6 + plan ruling: the resume placeholder never names a card's specifics; the page ships the drawer's sentence |
| SP-CardPage-Paper | `textarea#pg-note[placeholder]` | For example: I sent a fresh DM to each of them at 14:05; trace those. | For example: what you checked, and what the agent should look at next. | §8.2-6 + plan ruling (same) |
| SP-CardPage-Studio | `textarea#cp-note[placeholder]` | Fresh DMs sent 14:05; trace those event IDs. | For example: what you checked, and what the agent should look at next. | §8.2-6 + plan ruling (same) |
| SP-CardPage-Daylight | icon `mark-line` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 21: no vibekit icon in 0.0.4 |
| SP-CardPage-Daylight | icon `comment` | mockup-local SVG path | product glyph in `PRODUCT_ICONS` (`parts/icons.ts`), drawn in vibekit's 24 × 24 stroke frame | Task 21: no vibekit icon in 0.0.4 |
| SP-CardPage-Daylight | `select#dp-resume-at option[selected]` | 1 · Reported | 2 · Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-CardPage-Paper | `select#pg-resume-at option[selected]` | I · Reported | II · Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-CardPage-Studio | `select#cp-at option[value="reproduce"]` | not selected (the first option shows: 01 Reported) | `selected`: 02 Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-CardPage-Quiet | `select#qp-resume-at option[selected]` | Stage 1: Reported | Stage 2: Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-Card-Daylight | `select#dl-resume-at option[selected]` | 1 · Reported | 2 · Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-Card-Paper | `select#pp-resume-at option[selected]` | 1 · Reported | 2 · Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-Card-Studio | `select#cw-at option[value="reproduce"]` | not selected (the first option shows: 01 Reported) | `selected`: 02 Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-Card-Quiet | `select#qt-resume-at option[selected]` | Stage 1: Reported | Stage 2: Reproduce (this stage) | Ruling T20: Resume defaults to the card's current stage |
| SP-Card-Paper | `button.pp-danger` (Delete card) | `vk-button--primary` + an inset-outline override | vibekit's `vk-button--danger` (the ink outline with a verb and its object) | Fix round 1: Delete card is vibekit's danger Button on every card surface |
| SP-Card-Quiet | `button.qt-danger` (Delete card) | `vk-button--primary` + an inset-outline override | vibekit's `vk-button--danger` (the ink outline with a verb and its object) | Fix round 1: Delete card is vibekit's danger Button on every card surface |
| SP-Card-States-Quiet | manifest `h` | 2422 | 2496 | Fix round 1: the artboard clipped cell E's panel padding (the mockup's own content is 2496 tall); the screenshot is the full page |

## vibekit 0.0.5 adoption

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Card-Studio | `.cd-tabs` gap | `0 22px` | `0 24px` | vibekit 0.0.5 report concern 3: AgentPod's approved panels mockup and the Tabs sheet draw 24px; vibekit keeps 24px |

## vibekit 0.0.6 adoption

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Card-Paper | `.pp-scrim` background | `color-mix(in oklch, var(--vk-color-text) 45%, transparent)` | `var(--vk-scrim)` | adopt 0.0.6 step 6: the scrim is vibekit Drawer's (the `.dw` row above); the mockup's text-mix turns light in the derived dark (125 grey over the board where vibekit darkens it to 28), which the two extra C-08 rectangles had hidden |

## vibekit 0.0.7 adoption: the reference stylesheet

Every reference linked the frozen vibekit 0.0.1 stylesheet, so the references compared against stale canonical styles. Only the link and the stylesheet copy change; page content is untouched.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| every SP-\* reference (80 files) | `<link rel="stylesheet" data-vibekit>` | `_vibekit-0.0.1/vibekit.css` (vibekit 0.0.1, flattened) | `_vibekit-0.0.7/vibekit.css` (the vendored 0.0.7 vibekit.css, flattened by resync-references.mjs the way Task 5b did; served and locked the same way) | adopt 0.0.7 step 5 ruling: references compare against the vibekit the app ships |

## Workspace-Other: the workspace-wide needs-you list

The workspace pages count and list every board's waiting cards (the T11 ruling: board-scoped on a board, workspace-wide on workspace pages). The references drew Developer Experience's 4. Only the counts and the rows the ruling adds change; the fixture world has 7 waiting cards.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Workspace-Other-* | Needs you tab count, the list heading count, the Operate badge (Daylight, Paper, Studio, Quiet) and Studio's status line | 4 | 7 | Workspace-wide count ruling; the fixture world's 7 |
| SP-Workspace-Other-* | Needs you list rows (`.nrow` / `.wo-need`) | Developer Experience's 4 cards | the same 4, then Guild Operations & Automation fixture card 1, Client Quality fixture card 1 and the P4 exit test review (oldest first, as the app lists them) | Workspace-wide count ruling |

## Phone boards: the seeded summary

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Phone-Board-Studio | `article.pb-card:first-of-type .nx p` | Not reproduced end-to-end: Melissa’s live ACP session … for those event IDs. | No fresh DM event to trace; needs one per agent. | coordinator X-2: 4605 `needsHuman.summary` is seeded; Studio rows print the summary |
| SP-Phone-Board-Studio | manifest `h` | 3563 (the height before the row above printed the first sentence; the page ends at 2854, canvas below the tab bar) | 2855 | coordinator X-2: the artboard is the page's height |

## Burn-down 1: references against the standing rulings

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-List-Daylight/Paper/Quiet, SP-Operate-Daylight/Paper/Quiet, SP-Projects-Daylight/Paper/Quiet, SP-Settings-Daylight/Paper/Quiet, SP-Spend-Daylight/Paper/Quiet, SP-Workspace-Agents-Daylight/Paper/Quiet, SP-Workspace-Other-Daylight/Paper/Quiet | `.btn-sm` | `min-height: 44px; padding: 0 var(--vk-space-4); font-size: 0.9375rem` (or `var(--vk-text-sm)`, `1rem`) on vibekit Buttons | rule removed | Buttons are 17px semibold (Quiet 700) and canonical vibekit components are the truth: the page restyled vibekit Button's type, padding and Quiet's 48px height |
| SP-Workspace-Other-Paper, SP-Workspace-Agents-Paper | `header.mh` | ended after `.mh-sections` (no edition row) | `.mh-ed` with the Search and Write a new card actions (the page's own CSS already had its rules), as SP-Operate-Paper draws it | One shell frame per vibe: the app's Paper Masthead draws the same bar on every page, so the page sat 76px higher in the reference |
| SP-Workspace-Agents-* | the Operate count in the rail or sections, its hidden "need you" text, the Needs you tab count, Studio's tooltip and status line | 4 | 7 | The workspace-wide count on workspace pages (as the Workspace-Other rows above) |
| SP-Workspace-Agents-* | `code.tokbox` | `spt_` and 32 dots | `spa_` and 48 dots | The API's token format (`spa_` + 24 bytes in hex, apps/api/src/auth/agent-token.ts): the shorter placeholder fitted on one line where the issued token wraps to two |
| SP-Workspace-Other-Daylight/Paper/Studio/Quiet, SP-Workspace-Agents-Daylight/Paper/Quiet, SP-Operate-Quiet | manifest `h` | 3584, 3641, 3860, 3629; 2950, 3052, 2933; 3247 | 4156, 4289, 4006, 4320; 2971, 3079, 3030; 3263 | The artboard is the page's height: the workspace-wide rows, the Paper edition row, the issued token and vibekit's Quiet 48px Buttons made each page taller, and the artboard clipped it |
| SP-Settings-Daylight/Paper/Quiet | the Back to the board link | `min-height: 32px` | `min-height: 44px` | The 44px target the app keeps on this link (as on Spend's references, which already draw 44px) |
| SP-Settings-Daylight/Paper/Quiet | Remove stage | `vk-button--primary btn-destructive` (filled) | `vk-button--danger` | Delete is the danger Button |
| SP-Settings-Quiet | manifest `h` | 1990 | 2000 | The artboard is the page's height (the 44px back link) |
| SP-List-Paper | `.pp` padding | `var(--vk-space-6) var(--vk-space-7) var(--vk-space-7)` (the page's sides at 48px, inside the masthead's 56px gutter) | `var(--vk-space-6) var(--mh-gutter, 56px) var(--vk-space-7)` | One shell frame per vibe: Paper's frame is the 56px gutter the masthead (and every other Paper page) uses |
| SP-Settings-Paper, SP-Spend-Paper | `.mh-tabs` (empty, a 1px rule) | an empty ruled sub-bar under the edition row | removed | One shell frame per vibe: the other Paper pages (Operate, Workspace) have no sub-bar; the app drew vibekit's 3px tabs rule there, so these two pages sat 2px lower than their references |
| SP-Phone-Board-Daylight | `button.btn.go` (Resume ×3, Open) | a hand-drawn filled 16px/700 tile | vibekit `vk-button--signal` (the rule `.btn.go` becomes the layout-only `.act .vk-button{flex:1}`) | Canonical vibekit components are the truth: the app draws vibekit Button there |
| SP-Phone-Board-Paper | `button.pb.pri` (×4), `button.mvb` Move (×7), `button.pb` Write a new card | hand-drawn tiles | vibekit `vk-button--signal`, `vk-button--ghost` with its 16px move icon, `vk-button--secondary` | Canonical vibekit components are the truth |
| SP-Phone-Board-Paper | `.lt` | no minimum height (a one-line entry title is 23px) | `.lt{min-height:44px}` | One-line titles keep their 44px tap target |
| SP-Phone-Board-Paper | manifest `h` | 2970 | 2983 | The artboard is the page's height (the 44px title) |
| SP-Phone-Board-Studio | the quick filter's buttons, the tiles' `ar-btn` Resume/Open, the tiles' `ph-ib b` Move | hand-drawn buttons (`.pb-qf button` rules) | vibekit `vk-button--text` (`.pb-qft`, 44px minimum), `vk-button--primary`, `vk-iconbutton--raised` with its 16px move glyph; the `.pb-qf` rules become the app's layout-only set | The Task 28 ruling, standing: re-sync the Studio and Quiet phone-board references' hand-drawn buttons to vibekit Button |
| SP-Phone-Board-Studio | manifest `h` | 2855 | 2861 | The artboard is the page's height |
| SP-Phone-Board-Quiet | `.mvb` Move (×7), `.lk` Write a new card | hand-drawn underlined links | vibekit `vk-button--text` in the app's layout-only wrappers (`.mvw`, `.lkw`; `.mvt` at a 44px minimum) | Same ruling |
| SP-Board-Quiet | the Operate link's `.qn-need` "(4 need you)" | Developer Experience's 4 | removed: the Agent Onboarding board this artboard draws has no card waiting | The count is board-scoped on a board (the T11 ruling; the app's AppNav prints none for this board) |
| every Quiet SP-\* reference with the shell (not Dlg, Phone) | `button.qn-link` Dark theme | no `aria-pressed` | `aria-pressed="false"` (the dark render's audited patch turns it on, as on the other vibes) | Canonical vibekit components are the truth: the app's Dark theme toggle is a pressed-aware vibekit Button, bold when on |
| every Paper SP-\* reference with the shell (not Dlg, Phone) | `.mh .mh-q[aria-pressed="true"]` | no pressed style (the dark render's pressed toggle stayed muted) | `color: var(--vk-color-text)` | Same: vibekit's pressed text Button draws in the text colour |

## Phone boards: action buttons are vibekit Button

The Daylight and Paper phone boards hand-drew their action buttons (filled 16px/700 tiles). The app draws vibekit `Button`; the references now carry its real 0.0.4 output (SSR, Task 5b's renderer). Only the buttons change; page content, layout and frame are untouched. `_vibekit-0.0.4/button.css` is the vendored 0.0.4 Button rules (ghost and Paper's signal/ghost spacing are not in the 0.0.1 sheet), linked after vibekit.css on these two pages.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Phone-Board-Daylight | `.btn.go` (Resume, Open) with `.btn`, `.btn.go`, `.btn.sec` rules | filled 16px/700 tile | `Button variant="signal"`; `.act .vk-button { flex: 1 }` places it | Operator ruling: vibekit's canonical components are the design truth |
| SP-Phone-Board-Paper | `.pb.pri` (Resume), `.pb` (Write a new card), `.mvb` (Move) with their rules | filled 16px tiles | `Button` signal, secondary, and ghost with the 16px move icon | same |


## Phone cards: buttons are vibekit Button, Resume opens on the current stage

The four phone card references hand-drew their buttons (`.go`, `.send`, `.sbtn`, `.ar-btn`, `.ar-btn2`). The app draws vibekit `Button`; the references now carry its real output (SSR, Task 5b's renderer) with only layout rules left (`.go`/`.send` full width, `.arch .sbtn` and `.pc-arch .ar-btn` aligned start). Delete is the danger Button. The Resume select opens on the card's current stage, as the drawer references do.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Phone-Card-Daylight, -Paper, -Quiet, -Studio | `.go`, `.send`, `.sbtn`, `.ar-btn`, `.ar-btn2` | hand-drawn tiles | `Button` primary / secondary | vibekit's canonical components are the design truth (fix round 1) |
| SP-Phone-Card-Daylight, -Paper, -Quiet, -Studio | Delete card | raw "Delete card..." (`.sbtn.danger`, Studio inline outline) | `Button variant="danger"`, label "Delete card" | same; the label is the exact name the vibes e2e reads |
| SP-Phone-Card-Daylight, -Paper, -Quiet, -Studio | `#resume-at` | "1 · Reported" selected | "2 · Reproduce (where it stopped)" selected | resume defaults to the current stage |

## Dialogs: the board behind stays behind

Every SP-Dlg-* reference draws the board (`.backdrop`, absolutely placed) and then the scrim and `section.dlg`. The board's own stacked pieces (lanes, the peek at z-index 10, the drawer) took part in the artboard's stacking order and painted over the dialog, so the dialog crop was mostly board. The backdrop now makes its own stacking context, so everything in it sits under the scrim and the dialog. Nothing in the dialog changes.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Dlg-* (all 24) | `.backdrop` | `position: absolute; inset: 0; overflow: hidden;` | the same plus `z-index: 0` | Track B dialogs ruling: fix the reference capture, never widen a mask |

## Board switcher: the ink outline on the destructive control

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Dlg-BoardSwitcher-* (all 4) | `.bs-acts` Rename / Delete board… | Rename drawn `.bs-del` (ink outline), Delete board… a `.link` | Rename a `.link`, Delete board… the `.bs-del` outline | Task 38 ruling: the outline goes on the destructive control |
| SP-Dlg-BoardSwitcher-* (all 4) | `section.dlg.bs` | product popover | vibekit CommandPalette `form="switcher"` (0.0.8), placed under the trigger by class; the raised trigger copy and the footer rows stay product markup | no vibekit popover (Task 38 preflight ruling) |

## Appearance: the artboard fits its dialog

The SP-Dlg-Appearance artboards were 1200px tall and `.art` clipped the 1237–1313px dialog (top 20px), so the reference drew a dialog cut off at 1180px. Each artboard is now its dialog's height plus 20px above and below.

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Dlg-Appearance-Daylight | `.art` height, manifest `h` | 1200 | 1281 | Fix round 1: raise the artboard to its content |
| SP-Dlg-Appearance-Paper | `.art` height, manifest `h` | 1200 | 1278 | Fix round 1: raise the artboard to its content |
| SP-Dlg-Appearance-Studio | `.art` height, manifest `h` | 1200 | 1353 | Fix round 1: raise the artboard to its content |
| SP-Dlg-Appearance-Quiet | `.art` height, manifest `h` | 1200 | 1282 | Fix round 1: raise the artboard to its content |

## Merge 3: the third clamped tile

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Phone-Board-Daylight | the third tile's `.say` (coder-kai, "This stage was not finished twice…") | the quote clamped to three lines (87px of text in a 65px box) with no "Read the rest" | `<button type="button" aria-expanded="false">Read the rest</button>` after the quote, as on the first two clamped tiles | Controller ruling (merge 3): a clamped quote offers Read the rest on every tile; the app's clamp check is right |

## vibekit 0.0.9 adoption: dialog references

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Dlg-BoardSwitcher-* (all 4) | `.bs-name span` | muted every board name (the name is a `span` inside the row's `b`) | `.bs-name > span`: only the row's own meta span is muted 12px | Operator brief (2026-10-13): a selector that mutes every name is a reference defect |
| SP-Dlg-Appearance-* (all 4) | `.sw-name` of the first accent | Product colour | Product colour (default), as the app's AppearancePicker draws it | Operator brief (2026-10-13): the app's AppearancePicker is the truth |
| SP-Dlg-Appearance-* (all 4) | `.ac-other` order | Superlibrary, AgentPod, Superwitness, Supermessage | AgentPod, Superlibrary, Superwitness, Supermessage (the app's product order) | Same |
| SP-Dlg-Appearance-* (all 4) | `label.sw.acc[data-accent]`, `.ac-other[data-accent]` | every swatch and every other-product mark `data-accent="product"`, so all drew Gold | each carries its own accent (`moss`, `cobalt`, …), so the chips draw their colour from the vendored stylesheet | Same |
| every SP-\* reference (80 files) | `<link rel="stylesheet" data-vibekit>` | `_vibekit-0.0.7/vibekit.css` | `_vibekit-0.0.9/vibekit.css` (the vendored 0.0.9 vibekit.css, flattened by resync-references.mjs) | adopt 0.0.7 step 5 ruling, standing: references compare against the vibekit the app ships (the 0.0.9 Button floor, Segmented `sm`, overlay eyebrow and keycaps, accent tokens) |
| SP-Dlg-NewCard-* (Priority), SP-List-Daylight (Group by), SP-Operate-Daylight (Which activity), SP-Dlg-Appearance-* (Light or dark, Time of day) | `.vk-segmented` | the default (`md`) Segmented | `vk-segmented--sm`, as the app passes `size="sm"` (vibekit 0.0.9: the form-control Segmented the SP references drew in 0.0.1) | canonical vibekit components are the truth |
| SP-Dlg-Appearance-* (all 4) | `var(--vk-accent)`, `var(--vk-accent-fg)`, `var(--vk-accent-text)`, `var(--vk-accent-wash)` in the page rules (`.sw-chip`, `.ac-mk`, `.pva-*`) | the prototype's accent tokens, which name no `data-accent="product"`, so the Product colour chip and the preview drew blank | vibekit's `--vk-color-accent*` tokens, which resolve the product colour | Operator brief (2026-10-13): the accent chips draw from the vendored stylesheet |
| SP-Dlg-Appearance-* (all 4) | `.sw-name` | `white-space: nowrap`, so "Product colour (default)" ran out of its swatch | `overflow-wrap: anywhere`, vibekit AppearancePicker's own swatch-name rule: the name wraps as the app draws it | Same |
| SP-Dlg-Appearance-Daylight, -Paper, -Quiet | `.art` height, manifest `h` | 1281 / 1278 / 1282 | 1295 / 1313 / 1299: the dialog's new height (the wrapped "Product colour (default)") plus 20px above and below, as fix round 1 set them; Studio's 1353 still fits | Fix round 1: raise the artboard to its content |

## Fix round 1 (adopt 0.0.9): residual causes isolated

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Projects-* (all 4) | the create form's Create | drawn enabled with the name field empty | `disabled`, as the app draws it until a name is typed | Fix round 1: the reference draws the state its own fields are in |
| SP-Workspace-Agents-* (all 4) | the new-agent form's Create agent and issue token | drawn enabled with the form empty | `disabled`, as the app draws it until the form can mint | Same |
| SP-Operate-Daylight, SP-Operate-Quiet | the Resume form's stage select | open on Reported, the first option | `selected` on "Failing test (where it stopped)", the card's current stage, as the app opens it | The phone-cards ruling, standing: the Resume select opens on the card's current stage |
| SP-Dlg-Appearance-Studio | the readout line | Midday, 13:51 · the board at a glance | Midday, 13:51: the app writes only the phase and the clock (no prose a reference does not define for every phase) | Coordinator ruling, fix round 1: no invented copy |
| SP-Operate-Paper | the second letter's Show all (`button.more`) | a space between the quote's closing mark and the button, which the first letter does not have | no space, as the first letter and the app's template draw it (the button keeps its own 8px margin) | Fix round 1: one template, one spacing |
| SP-Operate-Quiet | the Resume form's Send back to work | drawn enabled with the note empty | `aria-disabled="true"`, as the app draws it until there is something to send | Fix round 1: the reference draws the state its own fields are in |

## vibekit 0.0.10 adoption

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| every SP-\* reference (80 files) | `<link rel="stylesheet" data-vibekit>` | `_vibekit-0.0.9/vibekit.css` | `_vibekit-0.0.10/vibekit.css` | adopt 0.0.7 step 5 ruling, standing: references compare against the vibekit the app ships |

## Wave 1 readability (card drawer and page, operator issues 2026-10-13)

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Card-* and SP-CardPage-* (all 8) | the brief's raw-JSON row: the Copy button after View raw JSON | Copy drawn beside the closed toggle | removed: Copy appears only while the JSON is shown, beside the one toggle | Operator issue O8 (2026-10-13): one raw-JSON toggle and one Copy, Copy only while the JSON is shown |
| SP-Card-* and SP-CardPage-* (all 8) | the card-actions Delete card button | the dark primary Button (`vk-button--primary` with a page restyle) in Daylight and the Paper and Quiet pages, `vk-button--danger` in the Paper and Quiet drawers, an inline-restyled `ar-btn2` in Studio | vibekit's quiet Button (`vk-button vk-button--quiet`), no inline style; Archive stays the secondary action; the existing confirmation is unchanged | Wave 1 audit #9 (2026-10-13): Delete is not the primary action |
| SP-Card-* and SP-CardPage-* (all 8) | the empty Plan block ("Agent plan · none yet", "error-eric did not post a plan for this card.", Quiet's "Plan: None yet.") and the empty Decisions block ("Decisions: none yet.", Quiet's Decisions section) | drawn with nothing to show and nothing to do | removed: a section with nothing to show and no action is hidden; sections that offer an action (Project, Comments, Links) stay | Operator ruling (2026-10-13, O7): empty sections stay out of the way |
| SP-Card-Daylight | `.dl-groups` and the brief's plan/project grid | two columns, so a lone "Other details" group sat in a narrow left column | one column: the brief uses the full drawer width | Operator issue O2 (2026-10-13): the Daylight brief uses the full drawer width |

### Fix round 1 (review of Track X)

| Artboard | Selector | Was | Now | Ruling |
|---|---|---|---|---|
| SP-Card-Paper, SP-CardPage-Paper | the facts line's "No due date" and "No labels" | printed | removed (nothing to show, nothing to do; Edit card sets both) | Operator ruling (2026-10-13, O7) |
| SP-Card-Paper | the brief's criteria/plan grid | two columns (1.4fr / 1fr) with the plan column empty | one column: with Plan hidden the criteria take the full width | Same |
| SP-Card-Paper | manifest `h` | 3500 | 3261: the reference's drawn height once the empty sections went (its scrim ended there; below it the reference drew ground) | Fix round 1: raise or lower the artboard to its content |
| SP-Phone-Card-Daylight, -Paper, -Quiet, -Studio | the empty Plan ("error-eric did not post a plan for this card.") and empty Decisions ("No decisions on this card yet.") blocks | drawn | removed | Operator ruling (2026-10-13, O7) |
