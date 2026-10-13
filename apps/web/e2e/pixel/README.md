# Pixel suite

Compares the running app with the approved Design-canvas references, one test per artboard per theme.

## Run it

Node 22 (CI and `engines`).

    pnpm --filter @superpipeline/web test:pixel                       # everything (builds, starts wrangler dev:pixel and vite)
    pnpm --filter @superpipeline/web test:pixel -g "SP-Board-Paper"   # one artboard, both themes
    pnpm --filter @superpipeline/web test:refs                        # the references alone, no app
    pnpm --filter @superpipeline/web test:pixel:report                # open test-results/pixel/index.html

Linux, like the CI pixel job (Docker; the checkout is copied into a volume, host node_modules untouched):

    apps/web/scripts/pixel/linux-container.sh                          # arm64 on Apple silicon
    SP_PIXEL_PLATFORM=linux/amd64 apps/web/scripts/pixel/linux-container.sh -g "#shell"   # CI's arch

Use amd64 for a verdict: arm64 Linux matches CI on most keys but not on the shells (SP-Board-Quiet#shell
0.13% on arm64, 1.27% on CI). The report lands in `test-results/pixel-linux/`. The image is ~4.3GB.

The report shows reference | app | diff and a slider; failures sort first. Two checkouts can run side by
side: set `SP_API_PORT` and `SP_WEB_PORT` (defaults 8787 and 5173; `scripts/ports.ts`).

## What "pass" means

Per-pixel YIQ threshold 0.1, anti-aliasing excluded; at most 0.5% of unmasked pixels differ; no 8x8
block has more than 40% of its pixels differing; the page is exactly the artboard's size. Between 0.1%
and 0.5% is a warning. A screen drawn in parts (the dialogs, the shell checks) passes or fails per part.
A render error (no `[data-ready]`, a part that does not exist) always fails, with its own message.

## The deploy bar

Operator ruling (2026-10-13): every screen is within 1% of its mockup. `deploy-bar.ts` fails any key on
the allow-list (`expected-failures.ts`) whose worst part is over 1%, and fails a listed key that now
passes. `RESIDUALS.md` documents every listed key with its ratio and cause; `deploy-bar.test.ts` keeps
it in step with the allow-list both ways (a key without a row, or a row without a key, fails). After a
full run, update the ratio on the key and in `RESIDUALS.md` together. The list only shrinks.

The allow-list holds the darwin verdicts. `PLATFORM_OVERRIDES` (same file) flips a key per
`${process.platform}-${process.arch}` (`linux-x64` is CI's runner, and authoritative): `fails` for a key
that fails strictly only there, `passes` for a darwin-listed key that passes there. The ratchet and the
1% bar apply per platform, and `RESIDUALS.md` "Per platform" lists every override with its ratio and cause.

## The world and determinism

One fixture world (`fixture/world.ts`), seeded through `POST /v1/dev/fixture` into tenant `tnt_vibes`.
The route exists only when the API runs with `DEV_AUTH=true` and `FIXTURE_IMPORT=true`
(`pnpm --filter @superpipeline/api dev:pixel`). Bulky fields come from `fixture/source/`, scrubbed by
`scripts/pixel/scrub-snapshots.mjs`; `fixture/snapshots.test.ts` fails on anything token- or
email-shaped. Never add a per-screen fixture: change the world and say why. Fixture people are
invented (Ira Mehta, `@vibes-fixture.invalid`).

- The browser clock is pinned (2026-10-11 13:51) and the timezone is Asia/Kolkata; a screen waits for
  `[data-ready]` before it is captured.
- Screenshots are of the viewport, never `fullPage` (that resizes the emulated viewport and re-mounts
  the page). A page taller than the artboard grows the viewport first.
- References link Google Fonts; the harness blocks them and serves the app's own Fontsource files under
  the mockup family names (`fonts.ts`). No stored screenshots: both sides render in the same Chromium
  in the same run, so platforms cancel out.
- Dark: a reference with a `<artboard>.dark.html` is used as is; otherwise the light file is swapped to
  `data-theme="dark"` (`reference.ts`), and the canvas takes the vibe's dark ground.

## The references are locked

`e2e/pixel/references.lock` holds the hash of every reference, `manifest.json`, `CORRECTIONS.md` and the
vendored vibekit stylesheet, plus the thresholds, mask ids and the allow-list. `references-lock.test.ts`
fails when any of them changes without the lock; CI (`scripts/pixel/check-lock-change.mjs`) fails when
the lock changes in a range with no `Reference-Change: <why>` trailer on a commit.

## Refreshing a reference

A reference is edited only to apply a standing ruling, never to make a screen pass. The rulings so far:
canonical vibekit components (a page may place a vibekit component, never restyle it; `vk-guard.mjs`),
the button ruling (buttons are vibekit Button, no page reset reaches `.vk-button`), one shell frame per
vibe, the signal colour rule (the one primary action per surface), 44px touch targets, and the
operator briefs recorded in CORRECTIONS.md.

1. Edit the reference, or, after a canvas change, receive the export:
   `node apps/web/scripts/pixel/recv.mjs apps/web/e2e/reference/mockups`, then POST each artboard's
   DOM to `http://localhost:8977/?name=SP-<Screen>-<Vibe>` (`.dark` suffix for a real dark export).
2. Update `manifest.json` (`w`, `h`) if the size changed.
3. Add the row to `e2e/reference/mockups/CORRECTIONS.md`: artboard, selector, was, now, ruling.
4. Run `node apps/web/scripts/pixel/resync-references.mjs --check` (drift against canonical vibekit;
   without `--check` it rewrites the references), then `pnpm --filter @superpipeline/web test:refs`.
5. `node apps/web/scripts/pixel/lock-references.mjs` rewrites `references.lock`.
6. Commit with a `Reference-Change: <why>` trailer.

## Masks, patches and corrections

- A **mask** hides pixels and must cite an id in `masks.ts` `MASK_IDS` (`live-dot`, `C-08`, `D-1`,
  `dialog-backdrop`, `token-secret`). A new id changes the lock, so it needs a ruling.
- A **reference patch** (`refPatch` in `screens.ts`) edits the reference page in the browser before the
  screenshot: the New card draft row (agent drafting is out of scope, see
  `docs/follow-ups/agent-drafted-new-card.md`) and the Appearance dark theme control.
- A **reference correction** edits a committed reference file where it contradicts a ruling. Every one
  is a row in `../reference/mockups/CORRECTIONS.md` and must reach the canvas at the next export.

## vibekit

vibekit is vendored as a tarball, `apps/web/vendor/vibekit-<version>.tgz` (the version is in
`apps/web/package.json`, `@superjackfruit/vibekit`; now 0.0.9). The references link its stylesheet from
`e2e/reference/mockups/_vibekit-<version>/`, so the app and the references compare against the same
vibekit. To adopt a new version:

1. Put the new tgz in `apps/web/vendor/`, delete the old one, point `package.json` at it, `pnpm install`.
2. Set `VIBEKIT_VERSION` in `scripts/pixel/resync-references.mjs`, run it (it flattens the stylesheet
   into `_vibekit-<version>/`, re-links all references and re-renders the mapped components), and delete
   the old `_vibekit-*` directory.
3. Add a CORRECTIONS.md section for the adoption, update the product to the new API, run the full
   suite, refresh the ratios and `RESIDUALS.md`, relock, and commit with a `Reference-Change:` trailer.

## What is left

`RESIDUALS.md` is the list. The categories: vibekit forms that differ from the mockup by a pixel or a
line (Button padding, StageTrack and PhoneHeader wrapping, CommandPalette rows and keycaps, Drawer bar,
Field placeholders); the shell frame (rail icons, status line); and sub-pixel text rasterisation. The
eight Appearance dialog keys are over the bar: vibekit's AppearancePicker draws its other-product rows
taller than the reference. Post-deploy polish: fix those in vibekit or correct the reference by ruling,
then take the allow-list down from the largest ratio, removing each key as it passes.
