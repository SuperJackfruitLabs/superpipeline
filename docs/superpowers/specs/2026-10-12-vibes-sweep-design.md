# Vibes sweep: the web app matches the approved mockups — design

Status: approved inputs, plan written (`docs/superpowers/plans/2026-10-12-vibes-sweep.md`).
Date: 2026-10-12. Supersedes nothing; it completes `2026-10-11-vibes-redesign-design.md`.

## Goal

`apps/web` matches the approved Design-canvas mockups pixel for pixel, in all four vibes (Daylight,
Paper, Studio = the "Annual report" look, Quiet), in light and dark, at desktop 1440 and phone 390. Shared
parts come from vibekit 0.1.0 components. A pixel-diff test compares the running app with the 80
committed references and fails CI when any screen drifts.

"Pixel for pixel" has a measured meaning: per-pixel YIQ threshold 0.1 with anti-aliasing excluded, a
screen passes when at most 0.5% of its unmasked pixels differ **and** no 8×8 block has more than 40% of
its pixels differing **and** the page is exactly the artboard's size.

## Binding inputs (all in `docs/superpowers/specs/vibes-sweep/`)

| Input | What it binds |
|---|---|
| [`screens/shell-and-board.md`](vibes-sweep/screens/shell-and-board.md) | The app shell per vibe (desktop rail/masthead/status line, phone header and tab bar), the four boards, the empty board, the four phone boards. |
| [`screens/card.md`](vibes-sweep/screens/card.md) (+ [`card.parts/`](vibes-sweep/screens/card.parts/)) | The card model, the drawer per vibe, the standalone card page, the Card-States gallery, the phone card. |
| [`screens/operate-list-pages.md`](vibes-sweep/screens/operate-list-pages.md) | Operate, List, Projects, Workspace (Agents + other tabs), Board settings, Spend. |
| [`screens/dialogs.md`](vibes-sweep/screens/dialogs.md) | New card, Command palette, Appearance, Move, Board switcher, Reconnect. |
| [`screens/fixtures-and-harness.md`](vibes-sweep/screens/fixtures-and-harness.md) | The fixture world (§A) and the pixel harness (§B). |
| [`mockup-corrections.md`](vibes-sweep/mockup-corrections.md) | The corrections the mockups were brought to. **Its rulings, decisions table, "World changes" (Part 4.1) and "Fixture world additions" (Part 4.2) override every screen spec where they differ.** |
| [`vibekit-components.md`](vibes-sweep/vibekit-components.md) | vibekit 0.1.0's component names and props. Screen specs mark shared parts `vibekit:<Name>`; names are reconciled to this file. |
| `apps/web/e2e/reference/mockups/*.html` + `manifest.json` | The 80 references: one file per artboard per vibe (`SP-<Screen>-<Vibe>.html`), light theme, true artboard size in the manifest. |

vibekit 0.1.0 itself is produced by a separate vibekit plan. This sweep depends on the component spec
above, not on that plan's internal details; the tarball is vendored in Task 1.

## Architecture

1. **One fixture world, seeded through a dev-only route.** `POST /v1/dev/fixture` (only when
   `DEV_AUTH=true` **and** `FIXTURE_IMPORT=true`) replaces tenant `tnt_vibes` in D1 and every board
   Durable Object from one `World` JSON with historical timestamps. The world lives in
   `apps/web/e2e/pixel/fixture/` as typed test data. The browser clock is frozen at
   2026-10-11T08:21:00Z in `Asia/Kolkata` (Sunday 11 October, 13:51, sun phase noon) for every screen.
2. **The harness renders both sides in one Chromium.** For each of the 80 artboards × light/dark, the
   reference HTML is served from a fake origin with Google Fonts blocked and the app's own Fontsource
   files injected under the mockup family names; dark references are the light file with
   `data-theme` swapped (plus the audited patches). The app is rendered at the artboard size with the
   appearance cookie for that vibe/theme and the seeded world. pixelmatch compares; a report shows
   reference | app | diff with a slider.
3. **A ratchet, not a flag day.** The harness lands first, against today's app, with every failing
   screen listed in an allow-list (`expected-failures.ts`). An allow-listed screen that starts passing
   fails the run until it is removed from the list, so every task that builds a screen also deletes its
   entries. The last task deletes the file.
4. **Vibe switching stays in one registry.** `src/lib/layouts.ts` grows from board/card layouts to every
   vibe-specific surface (shell, phone shell, board, empty board, drawer, card page, operate, list,
   projects, workspace, settings, spend, dialogs). Components below a layout never ask which vibe is on.
5. **Pure view models, tested in vitest.** Every visible string the screens derive (ages, counts, crew
   lines, stop lines, attempt lines, short ids, status lines, palette ranking …) is computed by a pure
   function with fixture-world examples as its unit tests; components only lay them out.
6. **CSS is ported, not re-invented.** Each screen's CSS is extracted from its reference by a committed
   tool (`scripts/pixel/extract-css.mjs`) into per-vibe stylesheets, so markup and styles trace back to
   the approved file.

## Rulings carried from the inputs

- **One world, one clock** (corrections ruling 1): no per-artboard or per-vibe seeds, no per-screen
  clocks; the Studio 13:19/13:27/13:31 times are 13:51. The desktop-only card 4605 overlay is void.
- **Card 4605 is live and stopped** in Reproduce (WC-1): Developer Experience has 7 live cards, 4 need
  you (63ac, 58f8, 1dfc, 4605); Operate count 4; Daylight crew "4 agents · 3 wait on you"; unread 19.
- The R&I card is live with a pending approval gate using `DEFAULT_GATE_OPTIONS` (WC-3); the agent
  question lives on Guild Operations card 1 (WC-4); Melissa finishes Thursday (WC-5).
- Stage key `test`; faces seeded from agent names; card ids end in the 4 hex chars the mockups print;
  short id = last 4 hex of the card id everywhere.
- Desktop shows stored agent text verbatim; the phone sentence-cases it at render (C-06).
- One shell per vibe on every screen, including the shared pages and dialog backdrops.
- Count badges use `--vk-color-signal-text` on `--vk-color-primary-fg`; destructive buttons use the ink
  outline; there is no danger colour.
- The accent (`data-accent`) belongs to the product: Superpipeline's default is **Gold** (vibekit 0.1.0 `data-product`/`data-accent`, cookie field 5); the Appearance dialog gains an Accent section.
- API changes go through `apps/api` + `packages/contract` with tests. The plan collects every "(b) add
  an API field" ruling into explicit API tasks.

## Patched and corrected references (approved)

| Reference | Kind | What changes | Why | Task |
|---|---|---|---|---|
| SP-Board-Daylight | correction (file + canvas) | 58f8 tile gains the `.dl-chips` row | one tile rule fits every card | 14 |
| SP-CardPage-Daylight / -Paper / -Studio | correction (file + canvas) | resume placeholder → "For example: what you checked, and what the agent should look at next." | card §8.2-6 | 21 |
| SP-Phone-Board-Studio | correction (file + canvas) | 4605 row prints its `needsHuman.summary` | one summary rule | 28 |
| SP-Dlg-BoardSwitcher-* | correction (file + canvas) | ink outline moves from "Rename" to "Delete board…" | destructive rule | 38 |
| SP-Dlg-Appearance-* (dark) | harness patch | swapped light file with "Dark" checked and its hint | no dark export | 4, 39 |
| SP-Dlg-NewCard-* | harness patch | `.nc-draftrow`, `.nc-brief-tag` removed | agent drafting out of scope | 37 |
| All, dark | harness patch | `data-theme` swap, sun→moon icon, "Dark theme" pressed | dark derived from light | 4 |
| SP-Board-Daylight#shell, SP-Phone-Board-Daylight#shell | temporary harness patch | greeting removed until the board draws it | shell lands first | 11/13, removed 14/28 |

Other accepted rulings: "Sent back" derived from completion, first-paragraph Show more, Card-States and Workspace-Other compared against dev gallery routes, card field labels carried in spec data, needs-first then `createdAt` board order (4605 `created_at` 17:55Z).

## Out of scope

- **The agent-drafted new card** (dialogs D-1: "Draft brief", drafts `drf_*`). The composer ships
  without agent drafting; the pixel test masks the draft region of `SP-Dlg-NewCard-*`; a follow-up note
  (`docs/follow-ups/agent-drafted-new-card.md`) records what remains.
- Re-exporting references from the canvas (the receiver script is committed so it can be done later).

## Acceptance

- `pnpm --filter @superpipeline/web test:pixel` passes all 80 artboards × light/dark with no allow-list.
- Existing unit, e2e and axe suites stay green.
- No secret, token or real email address in the committed fixture snapshots.
