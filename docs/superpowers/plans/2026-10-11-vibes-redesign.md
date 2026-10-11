# Superpipeline on vibekit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `apps/web` onto vibekit: four person-chosen vibes (Daylight, Paper, Studio, Quiet) in light and dark, following the sun, with a layout of their own for the board, the card drawer and the gate/question panels, and one adaptive layout for every other screen. Nothing visible today disappears. The Superlibrary preview error offers Reconnect. Phase 1 (Tasks 1–16) ships alone; Phases 2–4 add the Paper, Studio and Quiet layouts.

**Architecture:** vibekit is vendored as a tarball. `app.html` paints the right vibe before CSS with vibekit's `HEAD_SCRIPT`; `appearance.svelte.ts` owns the person's setting (cookie on this host) and the time-of-day phase. `app.css` keeps Superpipeline's Tailwind names but points every one at a `--vk-*` variable. Each key screen has one view model (`CardSummary[]` for the board; the drawer's 23 section snippets plus `CardLead` for the card; `GateDecisionModel` and `QuestionAnswer` for the panels) and four layout components, chosen in `src/lib/layouts.ts` and nowhere else.

**Tech Stack:** SvelteKit 2.66 / Svelte 5.56 (runes), Vite 8, Tailwind 4.3 (`@tailwindcss/vite`), TypeScript 6, vitest 4 (+ jsdom, @testing-library/svelte), Playwright 1.61 (+ `@axe-core/playwright` 4.13.0, added here), `@superjackfruit/vibekit` 0.0.1 (vendored), pnpm 11.5.2, Node 22.

**Spec:** `docs/superpowers/specs/2026-10-11-vibes-redesign-design.md` (this repo). Upstream: vibekit `docs/specs/2026-10-11-vibes-design.md` and its foundations plan.

## Global Constraints

- **Every merge to Forge `main` deploys to production** (push mirror → GitHub Actions `test` + `e2e` → `deploy`). Each task must leave the app working and every existing test green, or change the test in the same task with the reason stated.
- **No information visible today may be hidden in any vibe.** Spec §7 is the checklist. Moving, collapsing behind a labelled `<details>`/tab, or rewording is allowed; deleting is not. No CSS rule may `display: none` an element that carries information (the guard test in Task 5 enforces this for the per-vibe blocks).
- **No API changes.** Do not touch `apps/api` or `packages/contract`.
- **Vibe checks live in one place:** `src/lib/layouts.ts` (and the four-way strings in `src/lib/copy.ts`). Layout components never branch on the vibe; shared components never import `appearance` except the shell, the picker and `AgentFace`'s caller passing `FACE_VARIANT[appearance.vibe]`.
- **Keep these exact accessible names** (e2e depends on them and they are the same in every vibe): "New card", "Dispatch", "Card title", "⚑ Review", "⚑ Answer {agent}", "Approve", "Request changes", "Reject", "Add a note (optional)", "Say what needs to change", "Send answer", "Send back to work", "Resume", "Edit card", "Archive card", "Delete card", "Comment", "View raw JSON", "Toggle theme", "Sign out", "You", "Plan", "Operate", "Workspace", "Main" (nav), "Command palette". Keep the classes `.tile`, `.elicitation`, `section` lanes with `<h2>` stage names, `[data-lane]`, and the test ids `spec-details`, `spec-value-*`, `carried-handoff`, `handed-on-*`, `unstaffed-warning`.
- **WCAG 2.2 AA:** text 4.5:1, parts 3:1, 44px targets on coarse pointers and for new controls, 16px inputs on touch, visible focus, reduced motion wins, keyboard for everything.
- **Colour comes from tokens only.** No new `#hex`/`rgba(` in `.svelte` or `app.css` (Task 5 guard).
- **No local names** (agent names, host names, "guild") in code, tests or docs. Use "Sample agent", `agt_r`.
- **Test first, revert-proof every guard:** after a test passes, revert the guarded line once and watch it go red.
- Commands run from the repo root. Web unit: `pnpm --filter @superpipeline/web exec vitest run <file>`; all web unit: `pnpm --filter @superpipeline/web test`; typecheck: `pnpm --filter @superpipeline/web typecheck`; e2e: `pnpm --filter @superpipeline/web e2e` (or `exec playwright test e2e/<file>`; set `PW_CHANNEL=chrome` locally). Before every commit that ends a task: `pnpm typecheck && pnpm test`.
- One commit per task at least; message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XwhK8QQtRh5hPEfqY5Arp8
  ```
- Branch per phase from Forge `origin/main` (`feat/vibes-phase-1` …). Push to `origin` (Forge). The operator merges on Forge.

## Review Focus

1. **The first frame after deploy for an existing user who picked "light" with today's toggle** — expected: light, no flash, cookie `vk_appearance=daylight.light.strong.0` written by the migration line before `HEAD_SCRIPT`. Pinned in Task 2 (unit + e2e).
2. **Request changes with an empty note, in every vibe** — expected: nothing is sent, the field turns invalid with "Say what needs to change" and takes focus. Pinned in Task 12 (model test) and Tasks 19/22/25 (each vibe's panel test).
3. **A layout that forgets a section** — expected: `layout-parity.test.ts` fails naming the layout and the section. Pinned in Task 10; every later card layout runs under it.
4. **The cascade** — expected: a Tailwind utility on an element with a `.vk-*` class wins; vibekit tokens never beat a utility. Pinned in Task 1 (built CSS's first `@layer` statement).
5. **Reconnect** — expected: from a card URL, Reconnect goes to `/auth/login`, and after sign-in the same card is open; a `returnTo` that is not a same-origin `/b/…` or `/workspace…` path is ignored. Pinned in Task 4.
6. **A geolocation refusal** — expected: the switch reads off, the sentence explains, the phase follows the time zone, nothing throws. Pinned in Task 3.

## File structure

```
apps/web/
  vendor/vibekit-0.0.1.tgz                         NEW (Task 1)
  package.json                                     + @superjackfruit/vibekit, @axe-core/playwright
  static/manifest.webmanifest                      theme/background colour
  src/app.html                                     migration + HEAD_SCRIPT, no Google Fonts, new favicon colours
  src/app.css                                      layer order, vibekit imports, token aliases, per-vibe blocks
  src/lib/appearance.svelte.ts                     NEW the person's setting + phase
  src/lib/layouts.ts                               NEW the only vibe → layout map (+ FACE_VARIANT)
  src/lib/copy.ts                                  NEW four-way product strings, lead fallbacks
  src/lib/reconnect.ts                             NEW Reconnect + returnTo
  src/lib/age.ts                                   NEW "just now" / "5h" / "3d"
  src/lib/components/Words.svelte                  NEW text with emoji hidden from screen readers
  src/lib/components/AgentFace.svelte              NEW face per variant
  src/lib/components/shell/AppearanceDialog.svelte NEW the picker
  src/lib/components/board/card-summary.ts         NEW board view model (+ groups, stage summaries)
  src/lib/components/board/ref-chip.ts             NEW (extracted from CardTile)
  src/lib/components/board/layouts/types.ts        NEW BoardLayoutProps
  src/lib/components/board/layouts/Board{Daylight,Paper,Studio,Quiet}.svelte  NEW
  src/lib/components/board/{CardFacts,CardMoveMenu,StageList,Peek,GreetingBand}.svelte  NEW
  src/lib/components/card/card-lead.ts             NEW the agent's sentence, kind, mood
  src/lib/components/card/layouts/types.ts         NEW CardSections, CardLayoutProps
  src/lib/components/card/layouts/Card{Daylight,Paper,Studio,Quiet}.svelte  NEW
  src/lib/components/card/gate/gate-decision.svelte.ts   NEW (logic from GateActions)
  src/lib/components/card/gate/Gate{Daylight,Paper,Studio,Quiet}.svelte     NEW (GateActions removed)
  src/lib/components/card/question/question-answer.svelte.ts NEW (logic from CardDrawer onAnswer)
  src/lib/components/card/question/Question{Daylight,Paper,Studio,Quiet}.svelte NEW
  src/lib/components/CardDrawer.svelte             shell + data + 23 snippets
  e2e/appearance.spec.ts                           NEW (theme.spec.ts removed)
  e2e/vibes.spec.ts                                NEW reachability, axe, overflow, screenshots
  e2e/support/seed.ts                              NEW shared seeding helpers
```

---

# Phase 1 — vibekit everywhere, Daylight layouts (ships alone)

### Task 1: Vendor vibekit and swap tokens and fonts

**Files:**
- Create: `apps/web/vendor/vibekit-0.0.1.tgz`, `apps/web/src/lib/tokens-swap.test.ts`
- Modify: `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/app.css`, `apps/web/src/app.html`, `apps/web/src/lib/components/BrandMark.svelte`, `apps/web/static/manifest.webmanifest`, `apps/web/src/lib/installable.test.ts`

**Interfaces:**
- Consumes: vibekit's `fonts.css`, `vibekit.css`, `--vk-*` variables (`--vk-color-{bg,surface,raised,line,text,muted,faint,primary,primary-fg,signal,signal-wash,signal-text,success,success-wash,success-text,ground}`, `--vk-font-{body,display,mono}`, `--vk-radius-{sm,md,lg,pill}`, `--vk-product-superpipeline-{bg,fg}`, `--vk-target-min`, `--vk-motion-{fast,base,easing}`).
- Produces: Tailwind names `background foreground card card-foreground muted muted-foreground inset surface border input primary primary-foreground accent accent-foreground destructive destructive-foreground ring marigold live coral signal signal-wash signal-text success success-wash success-text raised line faint product product-fg`, legacy CSS variables `--ink --surface --inset --line --text --muted --marigold --marigold-ink --live --coral --coral-ink --accent-bg --tap --focus --focus-offset --sp-scrim`.

- [ ] **Step 0: Get the tarball.** In the vibekit repo, on `main` after the foundations plan merged:

```bash
cd /Users/rakeshgangwar/SuperJackfruit/vibekit && git pull && pnpm install && pnpm verify && pnpm pack
mkdir -p /path/to/superpipeline/apps/web/vendor && cp superjackfruit-vibekit-0.0.1.tgz /path/to/superpipeline/apps/web/vendor/vibekit-0.0.1.tgz
tar -tzf apps/web/vendor/vibekit-0.0.1.tgz | grep -E 'dist/(index.js|styles/(vibekit|fonts|tokens).css)'
```

Expected: the four paths are listed. If `pnpm verify` fails or the exports differ from the foundations plan (`HEAD_SCRIPT`, `appearanceCookie`, `appearanceFromCookieHeader`, `htmlAttributes`, `phaseAt`, `resolveTheme`, `defaultTimeStrength`, `DEFAULT_APPEARANCE`, `say`, `greeting`, `faceSvg`, `Face`, `StageTrack`, `Sky`, `VIBES`), stop and report; do not patch vibekit from here.

- [ ] **Step 1: Write the failing test** `apps/web/src/lib/tokens-swap.test.ts`

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

describe('vibekit is the only source of colour and type', () => {
  it('declares the cascade order before anything else', () => {
    expect(css.trimStart().startsWith('@layer theme, base, vk.tokens, vk.base, vk.components, components, utilities;')).toBe(true);
  });

  it('imports tailwind, then vibekit fonts, then vibekit styles', () => {
    const tw = css.indexOf("@import 'tailwindcss';");
    const fonts = css.indexOf("@import '@superjackfruit/vibekit/fonts.css';");
    const vk = css.indexOf("@import '@superjackfruit/vibekit/vibekit.css';");
    expect(tw).toBeGreaterThan(-1);
    expect(fonts).toBeGreaterThan(tw);
    expect(vk).toBeGreaterThan(fonts);
  });

  it('maps every Tailwind colour and font name to a vibekit variable', () => {
    const block = /@theme inline \{([\s\S]*?)\n\}/.exec(css)![1]!;
    const lines = block.split('\n').filter((l) => /--(color|font|radius)-/.test(l));
    expect(lines.length).toBeGreaterThan(30);
    for (const l of lines) expect(l, l.trim()).toMatch(/var\(--vk-/);
  });

  it('keeps no hand-written palette or retired fonts', () => {
    expect(css).not.toMatch(/--ink:\s*#/);
    expect(css).not.toContain("[data-theme='light']");
    expect(css).not.toMatch(/IBM Plex|Space Grotesk/);
  });

  it('loads no Google Fonts', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @superpipeline/web exec vitest run src/lib/tokens-swap.test.ts`
Expected: FAIL on the first assertion (`app.css` starts with `@import 'tailwindcss'`).

- [ ] **Step 3: Add the dependency.** In `apps/web/package.json` `dependencies` add `"@superjackfruit/vibekit": "file:./vendor/vibekit-0.0.1.tgz"`; in `devDependencies` add `"@axe-core/playwright": "4.13.0"`. Run `pnpm install` at the root (this rewrites `pnpm-lock.yaml`; commit it). Then `pnpm install --frozen-lockfile` must succeed.

- [ ] **Step 4: Rewrite the head of `apps/web/src/app.css`.** Replace everything from the first line down to (not including) the comment that starts `/* Deliberately OUTSIDE every layer.` with:

```css
@layer theme, base, vk.tokens, vk.base, vk.components, components, utilities;
@import 'tailwindcss';
@import '@superjackfruit/vibekit/fonts.css';
@import '@superjackfruit/vibekit/vibekit.css';

/*
 * Superpipeline on vibekit. The person's vibe and theme live on <html> (data-vibe, data-theme,
 * data-phase, data-time); every colour, font and radius below reads a --vk-* variable, so a vibe
 * change restyles the whole app without touching a class name.
 *
 * The names are Superpipeline's own (bg-inset, text-muted-foreground, border-marigold …) on
 * purpose: vibekit's tailwind.css uses some of the same names for different things (muted is a
 * TEXT colour there and a BACKGROUND here), and 250 uses would flip meaning. Colour meaning:
 * coral → the vibe's signal (a person is needed), marigold → the vibe's primary, live → success.
 */
@theme inline {
  --color-background: var(--vk-color-bg);
  --color-foreground: var(--vk-color-text);
  --color-card: var(--vk-color-surface);
  --color-card-foreground: var(--vk-color-text);
  --color-muted: var(--vk-color-raised);
  --color-muted-foreground: var(--vk-color-muted);
  --color-inset: var(--vk-color-raised);
  --color-surface: var(--vk-color-surface);
  --color-border: var(--vk-color-line);
  --color-input: var(--vk-color-line);
  --color-primary: var(--vk-color-primary);
  --color-primary-foreground: var(--vk-color-primary-fg);
  --color-accent: var(--vk-color-raised);
  --color-accent-foreground: var(--vk-color-text);
  --color-destructive: var(--vk-color-signal-text);
  --color-destructive-foreground: var(--vk-color-surface);
  --color-ring: var(--vk-color-text);

  --color-marigold: var(--vk-color-primary);
  --color-live: var(--vk-color-success-text);
  --color-coral: var(--vk-color-signal-text);

  --color-signal: var(--vk-color-signal);
  --color-signal-wash: var(--vk-color-signal-wash);
  --color-signal-text: var(--vk-color-signal-text);
  --color-success: var(--vk-color-success);
  --color-success-wash: var(--vk-color-success-wash);
  --color-success-text: var(--vk-color-success-text);
  --color-raised: var(--vk-color-raised);
  --color-line: var(--vk-color-line);
  --color-faint: var(--vk-color-faint);
  --color-product: var(--vk-product-superpipeline-bg);
  --color-product-fg: var(--vk-product-superpipeline-fg);

  --font-sans: var(--vk-font-body);
  --font-mono: var(--vk-font-mono);
  --font-display: var(--vk-font-display);

  --radius-sm: var(--vk-radius-sm);
  --radius-md: var(--vk-radius-md);
  --radius-lg: var(--vk-radius-lg);
}

/* Legacy names, kept so inline `style="color:var(--coral)"` keeps working. Task 5 removes the
   inline uses; these stay as the bridge until then. Resolved on <html>, which carries data-vibe
   and data-theme, so they follow every switch. */
:root {
  --ink: var(--vk-color-bg);
  --surface: var(--vk-color-surface);
  --inset: var(--vk-color-raised);
  --line: var(--vk-color-line);
  --text: var(--vk-color-text);
  --muted: var(--vk-color-muted);
  --marigold: var(--vk-color-primary);
  --marigold-ink: var(--vk-color-primary-fg);
  --live: var(--vk-color-success-text);
  --coral: var(--vk-color-signal-text);
  --coral-ink: var(--vk-color-surface);
  --accent-bg: var(--vk-color-raised);
  /* The one scrim, allow-listed in no-raw-colour.test.ts: a modal backdrop must darken in every
     theme, which no surface token does. */
  --sp-scrim: rgb(14 13 24 / 0.55);
  --focus: 2px solid var(--vk-color-text);
  --focus-offset: 2px;
  --tap: 24px;
}

@media (pointer: coarse) {
  :root {
    --tap: var(--vk-target-min);
  }
}
```

Then, further down the file: delete the `body` marigold radial-gradient rule and every `.triage-*` rule (grep `triage` in `src` first; it must have no other users), and replace any remaining literal font stack (`'IBM Plex …'`, `'Space Grotesk'`) with `var(--vk-font-body)`, `var(--vk-font-mono)` or `var(--vk-font-display)`. Leave the `:focus-visible` rule unlayered; it now reads `var(--focus)`.

- [ ] **Step 5: `app.html`.** Delete the two `fonts.g*` `<link rel="preconnect">` and the Google Fonts stylesheet `<link>`. Change the favicon's `fill='%230f1118'` to `fill='%23ffefa8'` and `stroke='%23f4a526'` to `stroke='%235e4a00'` (vibekit's Superpipeline product chip). Change the two `theme-color` metas to `content="#17162a"` (dark) and `content="#fff8ee"` (light) (Daylight's dark and light `--vk-color-bg`; Task 2 updates them live). Leave the old theme script for Task 2.

- [ ] **Step 6: Manifest and mark.** `static/manifest.webmanifest`: `"background_color": "#fff8ee"`, `"theme_color": "#fff8ee"`. `installable.test.ts`: change the expected `theme_color` to `'#fff8ee'` and its comment to "Daylight's light --vk-color-bg, the first-visit default". `BrandMark.svelte`: the tile/stroke colours become `var(--vk-product-superpipeline-bg)` (background tile, if any) and `var(--vk-product-superpipeline-fg)` (stroke); keep the three paths.

- [ ] **Step 7: Run the test and the build checks**

```bash
pnpm --filter @superpipeline/web exec vitest run src/lib/tokens-swap.test.ts src/lib/installable.test.ts
pnpm --filter @superpipeline/web build
head -c 400 apps/web/build/_app/immutable/assets/*.css | grep -o '@layer [^;{]*;' | head -1
ls apps/web/build/_app/immutable/assets | grep -c '\.woff2$'
grep -l -- '--vk-color-bg' apps/web/build/_app/immutable/assets/*.css
```

Expected: tests PASS; the first `@layer` statement is `@layer theme,base,vk.tokens,vk.base,vk.components,components,utilities;` (whitespace may be minified); the woff2 count is at least 7; one CSS file contains `--vk-color-bg`.
If the build cannot resolve `@fontsource-variable/*` from vibekit's `fonts.css`: add `@fontsource-variable/bricolage-grotesque`, `figtree`, `newsreader`, `geist`, `instrument-sans`, `martian-mono` at `5.3.0` and `@fontsource/atkinson-hyperlegible-next` at `5.3.0` to `apps/web` `dependencies`, `pnpm install`, rebuild.
If vitest cannot import `@superjackfruit/vibekit` later (Svelte files in `node_modules`), add `test: { server: { deps: { inline: ['@superjackfruit/vibekit'] } } }` to the web vitest config.

- [ ] **Step 8: Look at it.** `pnpm --filter @superpipeline/web e2e` (full suite) must pass. Then open the dev server and check the board, a drawer and Operate in light: text is readable, focus rings show, nothing is invisible. Note any spot where a `--coral`/`--marigold` alias reads wrong for Task 5.

- [ ] **Step 9: Commit**

```bash
git add apps/web/vendor apps/web/package.json pnpm-lock.yaml apps/web/src/app.css apps/web/src/app.html apps/web/src/lib/components/BrandMark.svelte apps/web/static/manifest.webmanifest apps/web/src/lib/installable.test.ts apps/web/src/lib/tokens-swap.test.ts
git commit -m "web: vendor vibekit 0.0.1 and take every colour, font and radius from its tokens"
```

---

### Task 2: The appearance store and the first frame

**Files:**
- Create: `apps/web/src/lib/appearance.svelte.ts`, `apps/web/src/lib/appearance.svelte.test.ts`, `apps/web/src/lib/head-script.test.ts`, `apps/web/e2e/appearance.spec.ts`
- Modify: `apps/web/src/app.html`, `apps/web/src/lib/stores/app.svelte.ts`, `apps/web/src/routes/+layout.svelte`, `apps/web/src/lib/components/shell/Rail.svelte`, `apps/web/src/lib/components/shell/BottomNav.svelte`, `apps/web/src/lib/components/CommandPalette.svelte`, `apps/web/src/lib/components/shell/BottomNav.svelte.test.ts`, `apps/web/src/lib/components/CommandPalette.svelte.test.ts`
- Delete: `apps/web/e2e/theme.spec.ts`

**Interfaces:**
- Consumes: vibekit `appearanceCookie, appearanceFromCookieHeader, defaultTimeStrength, DEFAULT_APPEARANCE, htmlAttributes, phaseAt, resolveTheme, HEAD_SCRIPT`, types `Appearance, Phase, Place, Theme`.
- Produces: `appearance` (singleton `AppearanceStore`): `value: Appearance`, `phase: Phase`, `place: Place | null`, `theme: Theme` (derived), `pickerOpen: boolean`, `init(now?)`, `dispose()`, `set(partial)`, `toggleTheme()`, `useLocation(geo?)`, plus `roughPlace(p)`. `app.theme`, `app.initTheme`, `app.setTheme`, `app.toggleTheme` are removed.

- [ ] **Step 1: Write the failing unit tests**

`apps/web/src/lib/appearance.svelte.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppearanceStore, roughPlace } from './appearance.svelte';

const html = () => document.documentElement;
const at = (h: number) => () => new Date(2026, 9, 11, h, 0, 0);
const written: string[] = [];
const writer = (c: string) => { written.push(c); document.cookie = c; };

function reset(): void {
  document.cookie = 'vk_appearance=; Max-Age=0; Path=/';
  for (const a of ['data-vibe', 'data-theme', 'data-phase', 'data-time']) html().removeAttribute(a);
  localStorage.clear();
  written.length = 0;
}

describe('AppearanceStore', () => {
  let s: AppearanceStore;
  beforeEach(() => { reset(); s = new AppearanceStore(writer); });
  afterEach(() => s.dispose());

  it('a first visit is Daylight following the sun: light at noon', () => {
    s.init(at(13));
    expect(html().getAttribute('data-vibe')).toBe('daylight');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().getAttribute('data-phase')).toBe('noon');
    expect(html().getAttribute('data-time')).toBe('strong');
  });

  it('following the sun is dark at night', () => {
    s.init(at(23));
    expect(s.theme).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });

  it('reads the cookie', () => {
    document.cookie = 'vk_appearance=paper.dark.subtle.0; Path=/';
    s.init(at(13));
    expect(s.value).toEqual({ vibe: 'paper', theme: 'dark', timeStrength: 'subtle', useLocation: false });
    expect(html().getAttribute('data-vibe')).toBe('paper');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });

  it('a malformed cookie falls back to the defaults and does not throw', () => {
    document.cookie = 'vk_appearance=neon.%3Cimg%3E; Path=/';
    expect(() => s.init(at(13))).not.toThrow();
    expect(s.value.vibe).toBe('daylight');
    expect(s.value.theme).toBe('sun');
  });

  it('set writes the cookie for this host only', () => {
    s.init(at(13));
    s.set({ vibe: 'studio' });
    const c = written.at(-1)!;
    expect(c).toMatch(/^vk_appearance=studio\.sun\.strong\.0; /);
    expect(c).not.toMatch(/Domain=/i);
    expect(html().getAttribute('data-vibe')).toBe('studio');
  });

  it('choosing Quiet turns time of day off while it was still the default', () => {
    s.init(at(13));
    s.set({ vibe: 'quiet' });
    expect(s.value.timeStrength).toBe('off');
    expect(html().getAttribute('data-time')).toBe('off');
  });

  it('a strength the person chose survives a vibe change', () => {
    s.init(at(13));
    s.set({ timeStrength: 'subtle' });
    s.set({ vibe: 'quiet' });
    expect(s.value.timeStrength).toBe('subtle');
  });

  it('toggleTheme picks the opposite of what is showing', () => {
    s.init(at(13));
    s.toggleTheme();
    expect(s.value.theme).toBe('dark');
    s.toggleTheme();
    expect(s.value.theme).toBe('light');
  });

  it('turning location off forgets the place', () => {
    localStorage.setItem('superpipeline.place', JSON.stringify({ latitude: 51.5, longitude: -0.1 }));
    document.cookie = 'vk_appearance=daylight.sun.strong.1; Path=/';
    s.init(at(13));
    expect(s.place).toEqual({ latitude: 51.5, longitude: -0.1 });
    s.set({ useLocation: false });
    expect(s.place).toBeNull();
    expect(localStorage.getItem('superpipeline.place')).toBeNull();
  });

  it('a refused location leaves the switch off and does not throw', async () => {
    s.init(at(13));
    const geo = { getCurrentPosition: (_ok: unknown, no: (e: unknown) => void) => no(new Error('denied')) } as unknown as Geolocation;
    await expect(s.useLocation(geo)).resolves.toBe('denied');
    expect(s.value.useLocation).toBe(false);
  });

  it('a granted location is stored rough, on this device', async () => {
    s.init(at(13));
    const geo = { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 51.5072, longitude: -0.1276 } }) } as unknown as Geolocation;
    await expect(s.useLocation(geo)).resolves.toBe('on');
    expect(JSON.parse(localStorage.getItem('superpipeline.place')!)).toEqual({ latitude: 51.5, longitude: -0.1 });
    expect(written.at(-1)).toMatch(/^vk_appearance=daylight\.sun\.strong\.1; /);
  });

  it('forgets the legacy theme key once read', () => {
    localStorage.setItem('superpipeline.theme', 'light');
    s.init(at(13));
    expect(localStorage.getItem('superpipeline.theme')).toBeNull();
  });

  it('rounds a place to one decimal', () => {
    expect(roughPlace({ latitude: 51.5072, longitude: -0.1276 })).toEqual({ latitude: 51.5, longitude: -0.1 });
  });
});
```

`apps/web/src/lib/head-script.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { HEAD_SCRIPT } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

describe('app.html paints the right vibe on the first frame', () => {
  it('inlines vibekit HEAD_SCRIPT verbatim, so an upgrade cannot leave a stale copy', () => {
    expect(html).toContain(HEAD_SCRIPT);
  });
  it('runs the legacy-theme migration before HEAD_SCRIPT and both before %sveltekit.head%', () => {
    const migrate = html.indexOf("localStorage.getItem('superpipeline.theme')");
    const head = html.indexOf(HEAD_SCRIPT);
    expect(migrate).toBeGreaterThan(-1);
    expect(migrate).toBeLessThan(head);
    expect(head).toBeLessThan(html.indexOf('%sveltekit.head%'));
  });
  it('no longer writes data-theme from the OS preference', () => {
    expect(html).not.toMatch(/matchMedia\('\(prefers-color-scheme/);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @superpipeline/web exec vitest run src/lib/appearance.svelte.test.ts src/lib/head-script.test.ts`
Expected: FAIL (`./appearance.svelte` cannot be resolved; `HEAD_SCRIPT` not in `app.html`).

- [ ] **Step 3: Implement** `apps/web/src/lib/appearance.svelte.ts`

```ts
/**
 * The person's appearance: vibe, light/dark/follow the sun, time-of-day strength, and whether the
 * sun follows their rough location. It belongs to the person (spec: vibekit "The person's
 * appearance setting"); until Accounts stores it, it lives in a cookie on this host.
 *
 * `app.html` already painted the first frame from the same cookie and the device clock
 * (vibekit HEAD_SCRIPT). This refines the phase with the time zone or the rough place, keeps it
 * current, and writes every change back.
 *
 * The place never leaves the device: it is rounded to one decimal (about 11 km), kept in
 * localStorage, and only ever handed to phaseAt().
 */
import {
  appearanceCookie,
  appearanceFromCookieHeader,
  defaultTimeStrength,
  DEFAULT_APPEARANCE,
  htmlAttributes,
  phaseAt,
  resolveTheme,
  type Appearance,
  type Phase,
  type Place,
  type Theme,
} from '@superjackfruit/vibekit';

const PLACE_KEY = 'superpipeline.place';
const LEGACY_THEME_KEY = 'superpipeline.theme';
const TICK_MS = 60_000;

export const roughPlace = (p: Place): Place => ({
  latitude: Math.round(p.latitude * 10) / 10,
  longitude: Math.round(p.longitude * 10) / 10,
});

function readPlace(): Place | null {
  try {
    const raw = localStorage.getItem(PLACE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Place>;
    return typeof p.latitude === 'number' && typeof p.longitude === 'number' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
      ? roughPlace({ latitude: p.latitude, longitude: p.longitude })
      : null;
  } catch {
    return null;
  }
}

function forgetPlace(): void {
  try { localStorage.removeItem(PLACE_KEY); } catch { /* storage blocked: nothing was stored either */ }
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

export class AppearanceStore {
  value = $state<Appearance>({ ...DEFAULT_APPEARANCE });
  phase = $state<Phase>('noon');
  place = $state<Place | null>(null);
  pickerOpen = $state(false);
  theme: Theme = $derived(resolveTheme(this.value.theme, this.phase));

  #timer: ReturnType<typeof setInterval> | undefined;
  #now: () => Date = () => new Date();
  #write: (cookie: string) => void;

  constructor(write: (cookie: string) => void = (c) => { document.cookie = c; }) {
    this.#write = write;
  }

  init(now: () => Date = () => new Date()): void {
    this.#now = now;
    this.value = appearanceFromCookieHeader(document.cookie);
    this.place = this.value.useLocation ? readPlace() : null;
    try { localStorage.removeItem(LEGACY_THEME_KEY); } catch { /* nothing to forget */ }
    this.#apply(false);
    this.#themeColour();
    clearInterval(this.#timer);
    this.#timer = setInterval(() => this.#apply(false), TICK_MS);
  }

  dispose(): void {
    clearInterval(this.#timer);
    this.#timer = undefined;
  }

  set(next: Partial<Appearance>): void {
    const prev = this.value;
    const merged: Appearance = { ...prev, ...next };
    if (next.vibe && next.vibe !== prev.vibe && next.timeStrength === undefined && prev.timeStrength === defaultTimeStrength(prev.vibe)) {
      merged.timeStrength = defaultTimeStrength(next.vibe);
    }
    if (!merged.useLocation) {
      this.place = null;
      forgetPlace();
    }
    this.value = merged;
    try {
      this.#write(appearanceCookie(merged, { secure: location.protocol === 'https:' }));
    } catch { /* cookies blocked: the choice still holds for this tab */ }
    this.#apply(true);
  }

  /** Light or Dark, explicitly: the opposite of what is showing now. */
  toggleTheme(): void {
    this.set({ theme: this.theme === 'dark' ? 'light' : 'dark' });
  }

  async useLocation(geo: Geolocation | undefined = globalThis.navigator?.geolocation): Promise<'on' | 'denied'> {
    if (!geo) {
      this.set({ useLocation: false });
      return 'denied';
    }
    try {
      const pos = await new Promise<GeolocationPosition>((ok, no) =>
        geo.getCurrentPosition(ok, no, { enableHighAccuracy: false, maximumAge: 86_400_000, timeout: 10_000 }),
      );
      const place = roughPlace({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      try { localStorage.setItem(PLACE_KEY, JSON.stringify(place)); } catch { /* kept for this tab only */ }
      this.place = place;
      this.set({ useLocation: true });
      return 'on';
    } catch {
      this.set({ useLocation: false });
      return 'denied';
    }
  }

  #phaseNow(): Phase {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return phaseAt(this.#now(), this.place ? { place: this.place } : { timeZone });
  }

  #apply(animate: boolean): void {
    this.phase = this.#phaseNow();
    const attrs = htmlAttributes(this.value, this.phase);
    const el = document.documentElement;
    if (Object.entries(attrs).every(([k, v]) => el.getAttribute(k) === v)) return;
    const paint = () => {
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      this.#themeColour();
    };
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const doc = document as ViewTransitionDoc;
    if (animate && !reduce && typeof doc.startViewTransition === 'function') doc.startViewTransition(paint);
    else paint();
  }

  #themeColour(): void {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--vk-color-bg').trim();
    if (!bg) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
  }
}

export const appearance = new AppearanceStore();
```

- [ ] **Step 4: `app.html`.** Replace the old theme `<script>` block (the one reading `superpipeline.theme` and `prefers-color-scheme`) with exactly this, placed right after the viewport `<meta>` and before the manifest link:

```html
    <!-- First frame: the person's vibe and theme, before any stylesheet (vibekit HEAD_SCRIPT).
         The first line carries a light/dark choice made with the old toggle into the cookie, once.
         head-script.test.ts fails if the HEAD_SCRIPT copy drifts from the installed vibekit. -->
    <script>(function(){try{if(!/(?:^|; )vk_appearance=/.test(document.cookie)){var t=localStorage.getItem('superpipeline.theme');if(t==='light'||t==='dark'){document.cookie='vk_appearance=daylight.'+t+'.strong.0; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');}}}catch(_){}})();</script>
    <script>PASTE_HEAD_SCRIPT_HERE</script>
```

Replace `PASTE_HEAD_SCRIPT_HERE` with the exact value of vibekit's `HEAD_SCRIPT`, printed by:

```bash
cd apps/web && node --input-type=module -e "import('@superjackfruit/vibekit').then(m=>process.stdout.write(m.HEAD_SCRIPT))" 2>/dev/null \
  || grep -o 'HEAD_SCRIPT = `[^`]*`' node_modules/@superjackfruit/vibekit/dist/appearance/appearance.js | sed 's/^HEAD_SCRIPT = `//; s/`$//'
```

- [ ] **Step 5: Wire it in.**
  - `stores/app.svelte.ts`: delete `THEME_KEY`, `export type Theme`, the `theme` field, `initTheme`, `setTheme`, `toggleTheme`, and the `this.initTheme()` call in `init()`.
  - `routes/+layout.svelte` `onMount`: `appearance.init(); void app.init(); return () => { app.dispose(); appearance.dispose(); };` (import `appearance` from `$lib/appearance.svelte`).
  - `Rail.svelte`: the theme button calls `appearance.toggleTheme()`, `aria-pressed={appearance.theme === 'light'}`, glyph `{appearance.theme === 'light' ? '☀' : '☾'}`; keep `aria-label="Toggle theme"`.
  - `BottomNav.svelte` and `CommandPalette.svelte`: `app.toggleTheme()` → `appearance.toggleTheme()`; `app.theme` → `appearance.theme`.
  - Tests: in `BottomNav.svelte.test.ts` and `CommandPalette.svelte.test.ts` replace `app.theme = 'dark'` with `appearance.set({ theme: 'dark' })`, `app.theme = 'light'` with `appearance.set({ theme: 'light' })`, and `expect(app.theme).toBe('light')` with `expect(appearance.theme).toBe('light')`.

- [ ] **Step 6: Replace the e2e.** Delete `e2e/theme.spec.ts`. Create `e2e/support/seed.ts`:

```ts
import type { APIRequestContext, Page } from '@playwright/test';

export const API = 'http://localhost:8787';
export const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
export const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_r' };

export const DEFAULT_STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'in-progress', name: 'In Progress', order: 2, wipLimit: 3 },
  { key: 'review', name: 'Review', order: 3, gate: 'approval' },
  { key: 'done', name: 'Done', order: 4 },
];

export const REVIEW_PIPELINE = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

export async function seedBoard(request: APIRequestContext, name: string, stages: unknown[] = DEFAULT_STAGES): Promise<string> {
  const res = await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name, stages } });
  return ((await res.json()) as { boardId: string }).boardId;
}

/** A card that reaches the approval gate (the research agent completes with a handoff). */
export async function seedGatedCard(request: APIRequestContext, boardId: string, title: string): Promise<void> {
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/complete`, { headers: TENANT, data: { leaseEpoch: claim.leaseEpoch, handoff: { summary: 'drafted' } } });
}

/** A card whose agent stopped on a question with two options. */
export async function seedQuestionCard(request: APIRequestContext, boardId: string, title: string): Promise<void> {
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/activities`, {
    headers: AGENT,
    data: { leaseEpoch: claim.leaseEpoch, type: 'elicitation', body: 'May I run the test suite?', signal: 'select', parameter: { options: [{ name: 'run_them', title: 'Run the tests' }, { name: 'skip', title: 'Skip them' }] } },
  });
}

export async function openBoard(page: Page, boardId: string): Promise<void> {
  await page.addInitScript((id) => window.localStorage.setItem('superpipeline.boardId', id), boardId);
  await page.goto('/');
}

/** Sets the person's appearance before any page script runs. */
export async function setAppearance(page: Page, value: string): Promise<void> {
  await page.context().addCookies([{ name: 'vk_appearance', value, url: 'http://localhost:5173' }]);
}
```

Create `e2e/appearance.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openBoard, seedBoard, setAppearance } from './support/seed';

// A fixed London clock: 12:00 is midday, 23:00 is night.
test.use({ timezoneId: 'Europe/London' });
const NOON = new Date('2026-10-11T12:00:00+01:00');
const NIGHT = new Date('2026-10-11T23:00:00+01:00');

test('a first visit is Daylight following the sun: light at noon', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await openBoard(page, await seedBoard(request, 'Appearance noon'));
  await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-vibe', 'daylight');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(html).toHaveAttribute('data-phase', 'noon');
});

test('following the sun is dark at night, whatever the OS says', async ({ page, request }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.clock.setFixedTime(NIGHT);
  await openBoard(page, await seedBoard(request, 'Appearance night'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the theme toggle persists in the cookie and survives a reload before any app script', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __firstTheme: string | null }).__firstTheme = document.documentElement.getAttribute('data-theme');
    });
  });
  await openBoard(page, await seedBoard(request, 'Appearance toggle'));
  await page.getByRole('button', { name: /toggle theme/i }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'vk_appearance')?.value).toBe('daylight.dark.strong.0');
  await page.reload();
  expect(await page.evaluate(() => (window as unknown as { __firstTheme: string | null }).__firstTheme)).toBe('dark');
});

test('a light/dark choice made with the old toggle carries over', async ({ page, request }) => {
  await page.clock.setFixedTime(NIGHT);
  await page.addInitScript(() => { if (!document.cookie.includes('vk_appearance')) localStorage.setItem('superpipeline.theme', 'light'); });
  await openBoard(page, await seedBoard(request, 'Appearance legacy'));
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === 'vk_appearance')?.value).toBe('daylight.light.strong.0');
});

test('a cookie set elsewhere wins on the first frame', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await setAppearance(page, 'paper.dark.subtle.0');
  await openBoard(page, await seedBoard(request, 'Appearance cookie'));
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-vibe', 'paper');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-time', 'subtle');
});
```

In `e2e/responsive.spec.ts` the "sign-out and the theme are reachable" case keeps working unchanged (names kept).

- [ ] **Step 7: Run**

```bash
pnpm --filter @superpipeline/web exec vitest run src/lib/appearance.svelte.test.ts src/lib/head-script.test.ts src/lib/components/shell/BottomNav.svelte.test.ts src/lib/components/CommandPalette.svelte.test.ts
pnpm --filter @superpipeline/web typecheck
pnpm --filter @superpipeline/web exec playwright test e2e/appearance.spec.ts e2e/responsive.spec.ts e2e/mobile.spec.ts
```

Expected: all PASS. Revert-proof: remove the migration `<script>` line and watch "a light/dark choice made with the old toggle carries over" fail; restore.

- [ ] **Step 8: Commit** — `git commit -m "web: the person's appearance (vibe, theme, time of day) paints the first frame and follows the sun"`

---

### Task 3: The appearance picker

**Files:**
- Create: `apps/web/src/lib/components/shell/AppearanceDialog.svelte`, `apps/web/src/lib/components/shell/AppearanceDialog.svelte.test.ts`
- Modify: `apps/web/src/routes/+layout.svelte`, `Rail.svelte`, `BottomNav.svelte`, `CommandPalette.svelte`, `apps/web/e2e/appearance.spec.ts`

**Interfaces:**
- Consumes: `appearance` (Task 2); vibekit `VIBES`, `greeting`.
- Produces: `<AppearanceDialog />` (mounted once, opens when `appearance.pickerOpen`), entry points "Appearance" (rail button, `aria-haspopup="dialog"`), "Appearance…" (phone You menu `menuitem`; palette Account action, sub "vibe, light or dark, time of day").

- [ ] **Step 1: Write the failing test** `AppearanceDialog.svelte.test.ts`

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import AppearanceDialog from './AppearanceDialog.svelte';
import { appearance } from '$lib/appearance.svelte';

describe('AppearanceDialog', () => {
  beforeEach(() => {
    document.cookie = 'vk_appearance=; Max-Age=0; Path=/';
    appearance.init(() => new Date(2026, 9, 11, 13, 0));
    appearance.pickerOpen = true;
  });
  afterEach(() => { cleanup(); appearance.dispose(); appearance.pickerOpen = false; });

  it('is a labelled modal dialog', () => {
    render(AppearanceDialog);
    const d = screen.getByRole('dialog', { name: 'Appearance' });
    expect(d.getAttribute('aria-modal')).toBe('true');
  });

  it('offers the four vibes as radios and applies a choice at once', async () => {
    render(AppearanceDialog);
    for (const n of ['Daylight', 'Paper', 'Studio', 'Quiet']) expect(screen.getByRole('radio', { name: new RegExp(`^${n}`) })).toBeTruthy();
    await fireEvent.click(screen.getByRole('radio', { name: /^Paper/ }));
    expect(appearance.value.vibe).toBe('paper');
    expect(document.documentElement.getAttribute('data-vibe')).toBe('paper');
  });

  it('sets light, dark or follow the sun', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(appearance.value.theme).toBe('dark');
    await fireEvent.click(screen.getByRole('radio', { name: 'Follow the sun' }));
    expect(appearance.value.theme).toBe('sun');
  });

  it('sets the time-of-day strength', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('radio', { name: 'Off' }));
    expect(appearance.value.timeStrength).toBe('off');
  });

  it('the location switch says why it is off when refused', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_: unknown, no: (e: unknown) => void) => no(new Error('no')) } });
    render(AppearanceDialog);
    const sw = screen.getByRole('switch', { name: 'Use my location for the sun' });
    await fireEvent.click(sw);
    expect(await screen.findByText('Location was not shared, so the sun follows your time zone.')).toBeTruthy();
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });

  it('Done and Escape close it', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(appearance.pickerOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `pnpm --filter @superpipeline/web exec vitest run src/lib/components/shell/AppearanceDialog.svelte.test.ts` → FAIL (no component).

- [ ] **Step 3: Implement** `AppearanceDialog.svelte`

```svelte
<script lang="ts">
  /**
   * The person's appearance. Every change applies and is saved at once (appearance.set); Done
   * only closes. Native radios throughout: arrow keys, labels and screen readers for free.
   * Each vibe's card is drawn inside its own data-vibe/data-theme so its swatches and sample are
   * that vibe's real tokens and display font, not a picture of them.
   */
  import { tick } from 'svelte';
  import { greeting, type Vibe } from '@superjackfruit/vibekit';
  import { appearance } from '$lib/appearance.svelte';

  const VIBE_CARDS: Array<{ id: Vibe; name: string; about: string }> = [
    { id: 'daylight', name: 'Daylight', about: 'Playful and sunlit' },
    { id: 'paper', name: 'Paper', about: 'Calm and editorial' },
    { id: 'studio', name: 'Studio', about: 'Precise' },
    { id: 'quiet', name: 'Quiet', about: 'Plain and focused' },
  ];
  const THEMES = [
    { id: 'sun', name: 'Follow the sun' },
    { id: 'light', name: 'Light' },
    { id: 'dark', name: 'Dark' },
  ] as const;
  const STRENGTHS = [
    { id: 'strong', name: 'Strong' },
    { id: 'subtle', name: 'Subtle' },
    { id: 'off', name: 'Off' },
  ] as const;
  const PHASE_NAMES = { dawn: 'Dawn', morning: 'Morning', noon: 'Midday', golden: 'Golden hour', dusk: 'Dusk', night: 'Night' } as const;

  let panel = $state<HTMLElement | null>(null);
  let opener: HTMLElement | null = null;
  let locNote = $state<string | null>(null);
  let locBusy = $state(false);

  $effect(() => {
    if (appearance.pickerOpen) {
      opener = document.activeElement as HTMLElement | null;
      void tick().then(() => panel?.focus());
    }
  });

  function close(): void {
    appearance.pickerOpen = false;
    opener?.focus?.();
  }

  async function flipLocation(): Promise<void> {
    if (locBusy) return;
    if (appearance.value.useLocation) {
      appearance.set({ useLocation: false });
      locNote = null;
      return;
    }
    locBusy = true;
    const r = await appearance.useLocation();
    locBusy = false;
    locNote = r === 'denied' ? 'Location was not shared, so the sun follows your time zone.' : null;
  }

  const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !panel) return;
    const f = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (f.length === 0) return;
    const first = f[0]!, last = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
</script>

{#if appearance.pickerOpen}
  <div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
    <button class="absolute inset-0" style="background:var(--sp-scrim)" aria-label="Close appearance" tabindex="-1" onclick={close}></button>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="appearance-title"
      tabindex="-1"
      onkeydown={onKeydown}
      class="bg-surface border-border safe-bottom relative max-h-[100dvh] w-full overflow-y-auto border p-5 sm:max-w-[560px] sm:rounded-[var(--vk-radius-lg)]"
    >
      <h2 id="appearance-title" class="font-display text-xl">Appearance</h2>
      <p class="text-muted-foreground mt-1 text-sm">Applies to Superpipeline on this device.</p>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Vibe</legend>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each VIBE_CARDS as v (v.id)}
            <label
              class="vibe-card flex min-h-[var(--vk-target-min)] cursor-pointer items-start gap-3 rounded-[var(--vk-radius-md)] border-2 p-3"
              data-vibe={v.id}
              data-theme={appearance.theme}
              style="background:var(--vk-color-bg);color:var(--vk-color-text);border-color:{appearance.value.vibe === v.id ? 'var(--vk-color-text)' : 'var(--vk-color-line)'}"
            >
              <input type="radio" name="vibe" value={v.id} checked={appearance.value.vibe === v.id} onchange={() => appearance.set({ vibe: v.id })} class="mt-1 size-5" />
              <span class="flex min-w-0 flex-col gap-1">
                <span style="font-family:var(--vk-font-display)" class="text-lg leading-tight">{v.name}</span>
                <span class="flex gap-1" aria-hidden="true">
                  {#each ['--vk-color-bg', '--vk-color-surface', '--vk-color-primary', '--vk-color-signal'] as sw (sw)}
                    <span class="size-4 rounded-full" style="background:var({sw});box-shadow:inset 0 0 0 1px var(--vk-color-line)"></span>
                  {/each}
                </span>
                <span class="text-sm" style="color:var(--vk-color-muted)">{v.about}</span>
              </span>
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Light or dark</legend>
        <div class="vk-segmented">
          {#each THEMES as t (t.id)}
            <label class="vk-segmented__item" data-state={appearance.value.theme === t.id ? 'checked' : 'unchecked'}>
              <input type="radio" name="theme" class="sr-only" value={t.id} checked={appearance.value.theme === t.id} onchange={() => appearance.set({ theme: t.id })} />{t.name}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="mt-5">
        <legend class="mb-2 text-sm font-semibold">Time of day</legend>
        <div class="vk-segmented">
          {#each STRENGTHS as s (s.id)}
            <label class="vk-segmented__item" data-state={appearance.value.timeStrength === s.id ? 'checked' : 'unchecked'}>
              <input type="radio" name="strength" class="sr-only" value={s.id} checked={appearance.value.timeStrength === s.id} onchange={() => appearance.set({ timeStrength: s.id })} />{s.name}
            </label>
          {/each}
        </div>
        <p class="text-muted-foreground mt-1 text-sm">Quiet starts with this off.</p>
      </fieldset>

      <div class="mt-5 flex items-start justify-between gap-4">
        <div>
          <div id="loc-label" class="text-sm font-semibold">Use my location for the sun</div>
          <p id="loc-hint" class="text-muted-foreground text-sm">Your rough location stays on this device. It only works out sunrise and sunset.</p>
          {#if locNote}<p class="text-sm" role="status">{locNote}</p>{/if}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={appearance.value.useLocation}
          aria-labelledby="loc-label"
          aria-describedby="loc-hint"
          disabled={locBusy}
          onclick={() => void flipLocation()}
          class="border-border relative h-[var(--vk-target-min)] w-[72px] shrink-0 rounded-full border-2"
          style="background:{appearance.value.useLocation ? 'var(--vk-color-primary)' : 'var(--vk-color-raised)'}"
        >
          <span class="absolute top-1/2 size-7 -translate-y-1/2 rounded-full transition-[left] duration-[var(--vk-motion-fast)]" style="left:{appearance.value.useLocation ? '36px' : '4px'};background:var(--vk-color-surface);box-shadow:0 0 0 1px var(--vk-color-line)"></span>
        </button>
      </div>

      <p class="text-muted-foreground mt-5 text-sm">Now: {PHASE_NAMES[appearance.phase]} · {greeting(appearance.phase, appearance.value.vibe)}</p>

      <div class="mt-5 flex justify-end">
        <button type="button" class="vk-button vk-button--primary" onclick={close}>Done</button>
      </div>
    </div>
  </div>
{/if}
```

Note: the switch's accessible name comes from `aria-labelledby` ("Use my location for the sun"), which the test queries.

- [ ] **Step 4: Entry points.**
  - `routes/+layout.svelte`: render `<AppearanceDialog />` next to `<CommandPalette />` in the ready branch.
  - `Rail.svelte`: above the theme button add `<button onclick={() => (appearance.pickerOpen = true)} aria-label="Appearance" aria-haspopup="dialog" title="Appearance" class="text-muted-foreground hover:text-foreground tap rounded-[8px]">◐</button>`.
  - `BottomNav.svelte` menu: add, before the theme item, a `menuitem` button "Appearance…" (glyph ◐ `aria-hidden`) that closes the menu and sets `appearance.pickerOpen = true`.
  - `CommandPalette.svelte` Account group: add `{ icon: '◐', label: 'Appearance…', sub: 'vibe, light or dark, time of day', run: () => { appearance.pickerOpen = true; } }` (match the existing item shape; the palette closes itself after `run`).
  - Add to `BottomNav.svelte.test.ts`: opening the menu shows a `menuitem` named `Appearance…`; clicking it sets `appearance.pickerOpen` true.

- [ ] **Step 5: e2e.** Append to `e2e/appearance.spec.ts`:

```ts
test('the picker changes the vibe for good', async ({ page, request }) => {
  await page.clock.setFixedTime(NOON);
  await openBoard(page, await seedBoard(request, 'Appearance picker'));
  await page.getByRole('button', { name: 'Appearance' }).click();
  const dialog = page.getByRole('dialog', { name: 'Appearance' });
  await dialog.getByRole('radio', { name: /^Studio/ }).check();
  await dialog.getByRole('radio', { name: 'Dark' }).check();
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-vibe', 'studio');
  expect((await page.context().cookies()).find((c) => c.name === 'vk_appearance')?.value).toBe('studio.dark.strong.0');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-vibe', 'studio');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('Appearance is in the You menu', async ({ page, request }) => {
    await page.clock.setFixedTime(NOON);
    await openBoard(page, await seedBoard(request, 'Appearance phone'));
    await page.getByRole('button', { name: 'You' }).click();
    await page.getByRole('menuitem', { name: /appearance/i }).click();
    await expect(page.getByRole('dialog', { name: 'Appearance' })).toBeVisible();
  });
});
```

- [ ] **Step 6: Run** — the unit file, `BottomNav.svelte.test.ts`, `CommandPalette.svelte.test.ts`, `typecheck`, `playwright test e2e/appearance.spec.ts e2e/cmdk.spec.ts e2e/responsive.spec.ts`. All PASS.
- [ ] **Step 7: Commit** — `git commit -m "web: an Appearance picker for vibe, light or dark, time of day and location"`

---

### Task 4: Superlibrary previews offer Reconnect

**Files:**
- Create: `apps/web/src/lib/reconnect.ts`, `apps/web/src/lib/reconnect.test.ts`
- Modify: `apps/web/src/lib/superlibrary.ts`, `superlibrary.test.ts`, `components/card/LibraryArtifact.svelte`, `LibraryArtifact.svelte.test.ts`, `components/card/RelatedWork.svelte`, `RelatedWork.svelte.test.ts`, `routes/+layout.svelte`

**Interfaces:**
- Consumes: vibekit `say('error.previewReconnect', vibe)`; `appearance.value.vibe`.
- Produces: `reconnect(nav?)`, `takeReturnTo(storage?)` from `reconnect.ts`; `needsReconnect(e): boolean` and `reasonFor(e): string` from `superlibrary.ts`; `sentenceFor(e, vibe = 'daylight')`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/lib/reconnect.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reconnect, takeReturnTo, RETURN_KEY } from './reconnect';

describe('Reconnect', () => {
  beforeEach(() => sessionStorage.clear());

  it('remembers where you were and goes to sign in', () => {
    const go = vi.fn();
    reconnect(go, '/b/brd_1/c/crd_2?x=1');
    expect(sessionStorage.getItem(RETURN_KEY)).toBe('/b/brd_1/c/crd_2?x=1');
    expect(go).toHaveBeenCalledWith('/auth/login');
  });

  it('gives the place back once', () => {
    sessionStorage.setItem(RETURN_KEY, '/b/brd_1/c/crd_2');
    expect(takeReturnTo()).toBe('/b/brd_1/c/crd_2');
    expect(takeReturnTo()).toBeNull();
  });

  it.each(['https://evil.example/b/1', '//evil.example/b/1', '/auth/login', 'javascript:alert(1)', '/b/../auth', ''])('ignores %s', (bad) => {
    sessionStorage.setItem(RETURN_KEY, bad);
    expect(takeReturnTo()).toBeNull();
  });

  it('accepts a workspace path', () => {
    sessionStorage.setItem(RETURN_KEY, '/workspace/agents');
    expect(takeReturnTo()).toBe('/workspace/agents');
  });
});
```

In `superlibrary.test.ts`, replace the `no_token` sentence expectation (line 34) with:

```ts
    expect(sentenceFor(new LibraryError(0, 'no_token'))).toBe("The file's safe! I just couldn't confirm it's you. Reconnect?");
    expect(sentenceFor(new LibraryError(0, 'no_token'), 'quiet')).toBe('Preview hidden: your sign-in could not be confirmed. Reconnect to view it.');
    expect(needsReconnect(new LibraryError(0, 'no_token'))).toBe(true);
    expect(needsReconnect(new LibraryError(404, 'not_found'))).toBe(false);
    expect(reasonFor(new LibraryError(0, 'no_token'))).toBe('Reason: no_token (this tab has no Superlibrary sign-in)');
```

(import `needsReconnect, reasonFor` alongside the existing imports). Add to `LibraryArtifact.svelte.test.ts`:

```ts
  it('a missing sign-in offers Reconnect and keeps the reason visible', async () => {
    mount.mockRejectedValue(new LibraryError(0, 'no_token'));
    render(LibraryArtifact, { itemId: 'itm_0123456789abcdef', title: 'Plan', open: true });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain("I just couldn't confirm it's you");
    expect(alert.textContent).toContain('Reason: no_token');
    expect(alert.textContent).not.toContain('Previews need you signed in');
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeTruthy();
  });
```

and a similar case to `RelatedWork.svelte.test.ts` (its first rejection is `no_token`: expect the reconnect sentence, a "Reconnect" button and the existing "Try again" button).

- [ ] **Step 2: Run to see them fail** — `pnpm --filter @superpipeline/web exec vitest run src/lib/reconnect.test.ts src/lib/superlibrary.test.ts src/lib/components/card/LibraryArtifact.svelte.test.ts src/lib/components/card/RelatedWork.svelte.test.ts` → FAIL.

- [ ] **Step 3: Implement** `apps/web/src/lib/reconnect.ts`

```ts
/**
 * Reconnect: sign in again without losing your place.
 *
 * The Worker's /auth/callback always lands on "/", and changing that is an API change this
 * redesign does not make. So the page remembers where it was, in this tab only, and goes back
 * there once after sign-in. Only same-origin app paths are honoured: anything else in the slot
 * is ignored rather than followed.
 */
export const RETURN_KEY = 'superpipeline.returnTo';
const SAFE = /^\/(b\/[A-Za-z0-9_-]+(\/(c\/[A-Za-z0-9_-]+|operate(\/telemetry)?|settings))?|workspace(\/[a-z-]+)?)\/?(\?[^#]*)?$/;

export function reconnect(
  navigate: (url: string) => void = (url) => globalThis.location.assign(url),
  here: string = globalThis.location ? location.pathname + location.search : '/',
): void {
  try { sessionStorage.setItem(RETURN_KEY, here); } catch { /* no storage: you land on your board instead */ }
  navigate('/auth/login');
}

export function takeReturnTo(storage: Storage | undefined = globalThis.sessionStorage): string | null {
  if (!storage) return null;
  let v: string | null = null;
  try {
    v = storage.getItem(RETURN_KEY);
    storage.removeItem(RETURN_KEY);
  } catch {
    return null;
  }
  return v && SAFE.test(v) ? v : null;
}
```

`superlibrary.ts`: import `say, type Vibe` from `@superjackfruit/vibekit`; delete the `no_token` line from `SENTENCES`; replace `sentenceFor` with:

```ts
export function sentenceFor(e: unknown, vibe: Vibe = 'daylight'): string {
  if (needsReconnect(e)) return say('error.previewReconnect', vibe);
  return (e instanceof LibraryError && SENTENCES[e.code]) || 'The preview could not be loaded. Try again in a moment.';
}
/** The preview is hidden only because this tab has no Superlibrary sign-in: one click fixes it. */
export const needsReconnect = (e: unknown): boolean => e instanceof LibraryError && e.code === 'no_token';
const REASONS: Record<string, string> = { no_token: 'this tab has no Superlibrary sign-in' };
/** The code behind the sentence, kept on screen so a person can report it. */
export function reasonFor(e: unknown): string {
  if (!(e instanceof LibraryError)) return 'Reason: unknown';
  return `Reason: ${e.code}${REASONS[e.code] ? ` (${REASONS[e.code]})` : ''}`;
}
```

`LibraryArtifact.svelte`: keep the error object (`let failure = $state<unknown>(null)`), and render:

```svelte
  {#if failure}
    <div role="alert" class="mt-2 text-xs">
      <p class="text-signal-text">{sentenceFor(failure, appearance.value.vibe)}</p>
      {#if needsReconnect(failure)}
        <p class="text-muted-foreground mt-1 mono">{reasonFor(failure)}</p>
        <button type="button" class="vk-button vk-button--secondary mt-2" onclick={() => reconnect()}>Reconnect</button>
      {/if}
    </div>
  {/if}
```

(`failure = e` in the catch; `failure = null` where it is cleared today). `RelatedWork.svelte`: keep `why` as the error object the same way; in the `unavailable` branch show the sentence, the reason line and Reconnect when `needsReconnect(why)`, then the existing Try again.

`routes/+layout.svelte` `onMount`: `appearance.init(); void app.init().then(() => { const back = takeReturnTo(); if (back && app.authState === 'ready') void goto(back, { replaceState: true }); });` (import `goto` from `$app/navigation`). If `app.init()` is not async today, make it return its promise (it already awaits `/auth/me`).

- [ ] **Step 4: Run** — the four unit files PASS; `typecheck` passes.
- [ ] **Step 5: Commit** — `git commit -m "web: a preview hidden for want of a sign-in says so in the vibe's words and offers Reconnect"`

---

### Task 5: Colours from tokens only, and the per-vibe touches

**Files:**
- Create: `apps/web/src/lib/no-raw-colour.test.ts`
- Modify: `app.css`, `CardDrawer.svelte`, `board/CardTile.svelte`, `card/CardResume.svelte`, `card/GateActions.svelte`, `CommandPalette.svelte`, `operate/Running.svelte`, `Telemetry.svelte`, `Landing.svelte`, `Onboarding.svelte`, `ui/button/button.svelte`, and any other file the test names

**Interfaces:**
- Produces: a guard: no `#rgb[a]`/`#rrggbb[aa]`, `rgb(`/`rgba(`/`hsl(` literal in `src/**/*.svelte` or `src/app.css`, except `--sp-scrim` in `app.css` and the label colour defaults in `workspace/LabelManager.svelte`/`label-manager.ts`. Per-vibe blocks in `app.css` under `/* vibe: <name> */` comments.

- [ ] **Step 1: Write the failing test** `apps/web/src/lib/no-raw-colour.test.ts`

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = new URL('..', import.meta.url).pathname;
// Not global: a /g regex keeps lastIndex between .test() calls and skips lines.
const RAW = /(?<![\w{&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])|\b(?:rgba?|hsla?)\(/;
const ALLOW: Record<string, RegExp> = {
  'app.css': /--sp-scrim:/,
  'lib/components/workspace/LabelManager.svelte': /colour|color/i,
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === 'vendor' || f === 'node_modules') return [];
    return statSync(p).isDirectory() ? files(p) : /\.svelte$|^app\.css$/.test(f) ? [p] : [];
  });
}

describe('colour comes from vibekit tokens', () => {
  const all = files(SRC);
  it('scans the app', () => expect(all.length).toBeGreaterThan(40));
  for (const f of all) {
    const rel = relative(SRC, f);
    it(`${rel} has no raw colour`, () => {
      const bad = readFileSync(f, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !line.trim().startsWith('//') && RAW.test(line) && !(ALLOW[rel]?.test(line)))
        .map(({ line, n }) => `${n}: ${line.trim()}`);
      expect(bad).toEqual([]);
    });
  }
  it('per-vibe blocks style, never hide', () => {
    const css = readFileSync(join(SRC, 'app.css'), 'utf8');
    const blocks = css.split('/* vibe:').slice(1).map((b) => b.split('/* end vibe */')[0]!);
    expect(blocks.length).toBe(4);
    for (const b of blocks) expect(b).not.toMatch(/display:\s*none|visibility:\s*hidden/);
  });
});
```

- [ ] **Step 2: Run to see it fail** — `pnpm --filter @superpipeline/web exec vitest run src/lib/no-raw-colour.test.ts` → FAIL, listing about 30 lines.

- [ ] **Step 3: Replace each raw colour** using this table, then re-run until green:

| Found | Replace with |
|---|---|
| `rgba(255,107,87,.35)`, `rgba(255,107,87,.4)` borders | `var(--vk-color-signal)` |
| `rgba(255,107,87,.06)` … `.12` backgrounds | `var(--vk-color-signal-wash)` |
| `rgba(244,165,38,…)` (marigold tints, rings, drop highlight) | `color-mix(in oklch, var(--vk-color-primary) 20%, transparent)` (keep the alpha as the percentage) |
| `rgba(52,211,182,…)` | `var(--vk-color-success-wash)` |
| `rgba(0,0,0,…)` shadows | `color-mix(in oklch, var(--vk-color-text) 18%, transparent)` |
| `rgba(8,9,13,…)`, `bg-black/55` scrims | `var(--sp-scrim)` |
| `#hex` in `CardTile`/`Running`/`Telemetry`/`CardDrawer` avatars | `var(--vk-color-raised)` background, `var(--vk-color-text)` text (Task 7 replaces these avatars with faces) |
| `#hex` in `CommandPalette` | the matching token |
| A match that is not a colour (a literal `#123` issue number, an `href="#abc"`) | rewrite it so it is not a bare hex-like token, or add the file and a line regex to `ALLOW` with a comment saying why |

P1 stripe: `var(--vk-color-signal)`; P2 stripe: `var(--vk-color-primary)`. Ghost button hover (`hover:text-coral` in `ui/button/button.svelte` ghost variant and the rail's Sign out): `hover:text-foreground` (the signal means a person is needed, not "destructive hover").

- [ ] **Step 4: Per-vibe blocks.** Append to `app.css`:

```css
/* vibe: daylight */
[data-vibe='daylight'] .eyebrow { font-family: var(--vk-font-display); letter-spacing: 0.02em; }
/* end vibe */
/* vibe: paper */
[data-vibe='paper'] .eyebrow { font-family: var(--vk-font-body); font-variant: small-caps; letter-spacing: 0.04em; }
[data-vibe='paper'] .agent-voice { font-family: var(--vk-font-display); font-style: italic; }
/* end vibe */
/* vibe: studio */
[data-vibe='studio'] .eyebrow, [data-vibe='studio'] .sec-h { font-family: var(--vk-font-mono); text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.6875rem; }
[data-vibe='studio'] .status-led[data-blink='true'] { animation: sp-blink 1.6s ease-in-out infinite; }
@keyframes sp-blink { 50% { opacity: 0.4; } }
/* end vibe */
/* vibe: quiet */
[data-vibe='quiet'] .live-dot { animation: none; }
[data-vibe='quiet'] .eyebrow { font-family: var(--vk-font-body); font-weight: 700; letter-spacing: 0; text-transform: none; }
/* end vibe */
```

- [ ] **Step 5: Run** — the guard test, `pnpm --filter @superpipeline/web test`, `typecheck`, and the full e2e. All PASS. Revert-proof: put `#ff0000` back in one file and watch its row fail.
- [ ] **Step 6: Commit** — `git commit -m "web: every colour is a vibekit token; a guard keeps it that way"`

---

### Task 6: Four-way words and the agent's lead sentence

**Files:**
- Create: `apps/web/src/lib/copy.ts`, `apps/web/src/lib/copy.test.ts`, `apps/web/src/lib/components/Words.svelte`, `apps/web/src/lib/components/card/card-lead.ts`, `apps/web/src/lib/components/card/card-lead.test.ts`

**Interfaces:**
- Consumes: vibekit `Vibe`, `VIBES`, `Mood`; `Card`, `Gate`, `Elicitation` from `$lib/api`.
- Produces:
  - `type LeadKind = 'question'|'review'|'stopped'|'failed'|'budget'|'working'|'done'|'idle'`
  - `interface CardLead { kind: LeadKind; needsYou: boolean; agentId: string | null; sentence: string | null; source: 'question'|'gate'|'needs-human'|'failure'|'narrative'|'none'; at: string | null }`
  - `cardLead(input: LeadInput): CardLead`, `moodFor(kind: LeadKind, claimed: boolean): Mood`, `moodWord(mood: Mood): string`
  - `LEAD_FALLBACK`, `COPY`, `words(id, vibe, vars?)`, `wantYou(n, vibe)`, `leadText(lead, vibe)`, `splitEmoji(text)`; `<Words text>`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/lib/components/card/card-lead.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cardLead, moodFor, moodWord } from './card-lead';

const card = (over: Record<string, unknown> = {}) =>
  ({ state: 'submitted', delegateAgentId: null, needsHuman: undefined, overBudget: false, stateSince: '2026-10-11T10:00:00Z', ...over }) as never;
const said = (body: string, ts: string) => ({ type: 'response', body, ts });

describe('cardLead: the agent speaks first', () => {
  it('a pending question is the lead, in the agent’s own words', () => {
    const l = cardLead({ card: card({ state: 'input-required' }), elicitation: { question: ' May I run the tests? ', agentId: 'agt_r', createdAt: '2026-10-11T11:00:00Z' } as never });
    expect(l).toEqual({ kind: 'question', needsYou: true, agentId: 'agt_r', sentence: 'May I run the tests?', source: 'question', at: '2026-10-11T11:00:00Z' });
  });

  it('a question wins over a gate', () => {
    const l = cardLead({ card: card(), gate: { summary: 'Ready' } as never, elicitation: { question: 'Q?', agentId: 'agt_r', createdAt: 'x' } as never });
    expect(l.kind).toBe('question');
  });

  it('a gate leads with its summary, else the latest thing the agent said', () => {
    expect(cardLead({ card: card({ delegateAgentId: 'agt_r' }), gate: { summary: 'Draft ready for review.' } as never }).sentence).toBe('Draft ready for review.');
    const l = cardLead({ card: card(), gate: { summary: null } as never, activities: [said('old', '2026-10-11T09:00:00Z'), said('newest', '2026-10-11T12:00:00Z'), { type: 'action', body: 'tool', ts: '2026-10-11T13:00:00Z' }] });
    expect(l).toMatchObject({ kind: 'review', needsYou: true, sentence: 'newest', source: 'narrative' });
  });

  it('a stopped card leads with needsHuman.detail', () => {
    const l = cardLead({ card: card({ state: 'input-required', needsHuman: { reason: 'repeated-failure', detail: 'Handoff refused twice: no commit.' } }) });
    expect(l).toMatchObject({ kind: 'stopped', needsYou: true, sentence: 'Handoff refused twice: no commit.', source: 'needs-human' });
  });

  it('a failed card leads with the failure reason', () => {
    expect(cardLead({ card: card({ state: 'failed' }), failureReason: 'Tests did not pass.' })).toMatchObject({ kind: 'failed', needsYou: true, sentence: 'Tests did not pass.', source: 'failure' });
  });

  it('over budget needs you; working, done and idle do not', () => {
    expect(cardLead({ card: card({ overBudget: true }) })).toMatchObject({ kind: 'budget', needsYou: true });
    expect(cardLead({ card: card({ state: 'working' }) })).toMatchObject({ kind: 'working', needsYou: false });
    expect(cardLead({ card: card({ state: 'completed' }) })).toMatchObject({ kind: 'done', needsYou: false });
    expect(cardLead({ card: card() })).toMatchObject({ kind: 'idle', needsYou: false, sentence: null, source: 'none' });
  });

  it('blank words are no words', () => {
    expect(cardLead({ card: card({ state: 'working' }), activities: [said('   ', '2026-10-11T12:00:00Z')] }).sentence).toBeNull();
  });

  it('moods follow the kind', () => {
    expect(moodFor('review', true)).toBe('needs');
    expect(moodFor('working', true)).toBe('working');
    expect(moodFor('done', false)).toBe('done');
    expect(moodFor('idle', true)).toBe('thinking');
    expect(moodFor('idle', false)).toBe('resting');
    expect(moodWord('needs')).toBe('needs you');
  });
});
```

`apps/web/src/lib/copy.test.ts`:

```ts
import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { COPY, LEAD_FALLBACK, leadText, splitEmoji, wantYou, words } from './copy';

const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('four-way words', () => {
  it('every string is written for all four vibes with the same placeholders', () => {
    for (const [id, four] of Object.entries({ ...COPY, ...Object.fromEntries(Object.entries(LEAD_FALLBACK).map(([k, v]) => [`lead.${k}`, v])) })) {
      const base = holes(four.daylight);
      for (const v of VIBES) {
        expect(four[v].trim().length, `${id} ${v}`).toBeGreaterThan(0);
        expect(holes(four[v]), `${id} ${v}`).toEqual(base);
      }
    }
  });
  it('covers every lead kind', () => {
    expect(Object.keys(LEAD_FALLBACK).sort()).toEqual(['budget', 'done', 'failed', 'idle', 'question', 'review', 'stopped', 'working']);
  });
  it('names no real agent or host', () => {
    const all = JSON.stringify({ COPY, LEAD_FALLBACK }).toLowerCase();
    for (const n of ['guild', 'ashram', 'foundry', 'chotu', 'buddhimaan']) expect(all).not.toContain(n);
  });
  it('counts read naturally', () => {
    expect(wantYou(0, 'daylight')).toBe('Nothing needs you.');
    expect(wantYou(1, 'daylight')).toBe('1 card wants you.');
    expect(wantYou(3, 'quiet')).toBe('3 cards need your decision.');
  });
  it('refuses a missing variable', () => {
    expect(() => words('board.wantYou', 'paper')).toThrow(/n/);
  });
  it('the lead says the agent’s words, or the kind’s fallback', () => {
    expect(leadText({ kind: 'review', sentence: 'Ready.' } as never, 'studio')).toBe('Ready.');
    expect(leadText({ kind: 'review', sentence: null } as never, 'studio')).toBe('AWAITING REVIEW.');
  });
  it('splits emoji out so screen readers skip them', () => {
    expect(splitEmoji("I'm stuck 😕 ok")).toEqual([
      { text: "I'm stuck ", emoji: false },
      { text: '😕', emoji: true },
      { text: ' ok', emoji: false },
    ]);
  });
});
```

- [ ] **Step 2: Run to see them fail** — `pnpm --filter @superpipeline/web exec vitest run src/lib/copy.test.ts src/lib/components/card/card-lead.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement** `apps/web/src/lib/components/card/card-lead.ts`

```ts
/**
 * What the agent needs, in its own words, first (vibekit spec: "The agent speaks first").
 *
 * Pure, and fed only what the caller has: the board snapshot gives the question, the gate and
 * needsHuman; the drawer adds the activities and the latest failure reason. The sentence is the
 * agent's text, trimmed, never rewritten. When there is none, layouts show the kind's fallback
 * from copy.ts in the vibe's words.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { Card, Elicitation, Gate } from '$lib/api';

export type LeadKind = 'question' | 'review' | 'stopped' | 'failed' | 'budget' | 'working' | 'done' | 'idle';
export interface CardLead {
  kind: LeadKind;
  needsYou: boolean;
  agentId: string | null;
  sentence: string | null;
  source: 'question' | 'gate' | 'needs-human' | 'failure' | 'narrative' | 'none';
  at: string | null;
}
export interface LeadInput {
  card: Pick<Card, 'state' | 'delegateAgentId' | 'needsHuman' | 'overBudget' | 'stateSince'>;
  gate?: Pick<Gate, 'summary'> | null;
  elicitation?: Pick<Elicitation, 'question' | 'agentId' | 'createdAt'> | null;
  activities?: ReadonlyArray<{ type: string; body?: string | null; ts: string }>;
  failureReason?: string | null;
}

const clean = (s: string | null | undefined): string | null => {
  const t = s?.trim();
  return t ? t : null;
};

function latestSaid(acts: LeadInput['activities']): { body: string; ts: string } | null {
  let best: { body: string; ts: string } | null = null;
  for (const a of acts ?? []) {
    const body = a.type === 'response' ? clean(a.body) : null;
    if (body && (!best || a.ts > best.ts)) best = { body, ts: a.ts };
  }
  return best;
}

export function cardLead(i: LeadInput): CardLead {
  const { card } = i;
  const agentId = card.delegateAgentId ?? null;
  const said = latestSaid(i.activities);
  const told = (kind: LeadKind, needsYou: boolean, own: string | null, ownSource: CardLead['source']): CardLead =>
    own
      ? { kind, needsYou, agentId, sentence: own, source: ownSource, at: card.stateSince ?? null }
      : { kind, needsYou, agentId, sentence: said?.body ?? null, source: said ? 'narrative' : 'none', at: said?.ts ?? card.stateSince ?? null };

  if (i.elicitation) {
    return { kind: 'question', needsYou: true, agentId: i.elicitation.agentId, sentence: clean(i.elicitation.question), source: 'question', at: i.elicitation.createdAt };
  }
  if (i.gate) return told('review', true, clean(i.gate.summary), 'gate');
  if (card.state === 'failed') return told('failed', true, clean(i.failureReason), 'failure');
  if (card.state === 'input-required') return told('stopped', true, clean(card.needsHuman?.detail), 'needs-human');
  if (card.overBudget) return told('budget', true, null, 'none');
  if (card.state === 'working') return told('working', false, null, 'none');
  if (card.state === 'completed') return told('done', false, null, 'none');
  return told('idle', false, null, 'none');
}

export function moodFor(kind: LeadKind, claimed: boolean): Mood {
  if (kind === 'working') return 'working';
  if (kind === 'done') return 'done';
  if (kind === 'idle') return claimed ? 'thinking' : 'resting';
  return 'needs';
}

export const moodWord = (m: Mood): string => (m === 'needs' ? 'needs you' : m);
```

`apps/web/src/lib/copy.ts`

```ts
/**
 * Product strings that change tone by vibe. Each is written four ways with the same meaning and
 * the same placeholders (copy.test.ts). Buttons, fields and badges are NOT here: they read the
 * same in every vibe (spec decision 6). vibekit's own catalogue (say, greeting) covers the suite
 * strings; these are Superpipeline's.
 */
import type { Vibe } from '@superjackfruit/vibekit';
import type { CardLead, LeadKind } from '$lib/components/card/card-lead';

export type Four = Readonly<Record<Vibe, string>>;
const four = (daylight: string, paper: string, studio: string, quiet: string): Four => ({ daylight, paper, studio, quiet });

export const LEAD_FALLBACK: Readonly<Record<LeadKind, Four>> = {
  question: four("I've got a question for you 🙋", 'I have a question before I go on.', 'QUESTION PENDING.', 'The agent asked a question.'),
  review: four('All done, ready for your review ✨', "It's ready for you to review.", 'AWAITING REVIEW.', 'Waiting for your review.'),
  stopped: four("I've stopped and need you 😕", "I stopped, and I'd rather ask than guess.", 'STOPPED. Needs operator.', 'Stopped. Waiting for you.'),
  failed: four('That run failed 😬', 'The last run failed.', 'FAILED.', 'The run failed.'),
  budget: four("I've hit the budget cap 💸", "I've reached the budget cap.", 'OVER BUDGET.', 'Over its budget cap.'),
  working: four('On it!', "I'm working on it.", 'WORKING.', 'Working.'),
  done: four('Done! 🎉', 'This is done.', 'DONE.', 'Completed.'),
  idle: four('Waiting to be picked up.', 'Waiting to be picked up.', 'QUEUED.', 'Not started.'),
};

export const COPY = {
  'board.wantYou': four('{n} cards want you.', '{n} letters wait on you.', '{n} NEED YOU.', '{n} cards need your decision.'),
  'board.wantYouOne': four('1 card wants you.', 'One letter waits on you.', '1 NEEDS YOU.', '1 card needs your decision.'),
  'board.nothing': four('Nothing needs you.', 'Nothing waits on you.', '0 NEED YOU.', 'No cards need your decision.'),
  'lead.from': four('{agent}', '{agent} wrote', '{agent}', '{agent}'),
} as const satisfies Record<string, Four>;
export type CopyId = keyof typeof COPY;

export function words(id: CopyId, vibe: Vibe, vars: Record<string, string | number> = {}): string {
  return COPY[id][vibe].replace(/\{(\w+)\}/g, (_, k: string) => {
    if (!(k in vars)) throw new Error(`${id} needs {${k}}`);
    return String(vars[k]);
  });
}

export function wantYou(n: number, vibe: Vibe): string {
  if (n <= 0) return words('board.nothing', vibe);
  if (n === 1) return words('board.wantYouOne', vibe);
  return words('board.wantYou', vibe, { n });
}

export const leadText = (lead: Pick<CardLead, 'kind' | 'sentence'>, vibe: Vibe): string => lead.sentence ?? LEAD_FALLBACK[lead.kind][vibe];

const EMOJI = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/u;
export function splitEmoji(text: string): Array<{ text: string; emoji: boolean }> {
  return text.split(EMOJI).filter((p) => p !== '').map((p) => ({ text: p, emoji: EMOJI.test(p) }));
}
```

`apps/web/src/lib/components/Words.svelte`

```svelte
<script lang="ts">
  /** Text with its emoji hidden from screen readers: the words carry the meaning. */
  import { splitEmoji } from '$lib/copy';
  let { text }: { text: string } = $props();
  const parts = $derived(splitEmoji(text));
</script>

{#each parts as p, i (i)}{#if p.emoji}<span aria-hidden="true">{p.text}</span>{:else}{p.text}{/if}{/each}
```

- [ ] **Step 4: Run** — both test files PASS. Revert-proof: swap the question/gate order in `cardLead` and watch "a question wins over a gate" fail.
- [ ] **Step 5: Commit** — `git commit -m "web: the agent's own sentence leads, and product words come in four tones"`

---

### Task 7: Agent faces everywhere

**Files:**
- Create: `apps/web/src/lib/layouts.ts`, `apps/web/src/lib/components/AgentFace.svelte`, `apps/web/src/lib/components/AgentFace.svelte.test.ts`
- Modify: `apps/web/src/lib/names.ts` (+ `names.test.ts`), `board/CardTile.svelte`, `CardDrawer.svelte` (status row delegate avatar + provenance icon), `operate/Running.svelte`, `Telemetry.svelte` (By agent), `workspace/AgentsTab.svelte` (agent icon), `CommandPalette.svelte` (if it draws an avatar), `app.css` (`.status-led`)
- Delete: `apps/web/src/lib/components/agentColor.ts` (and its test, if any) once `grep -rn agentColor apps/web/src` is empty

**Interfaces:**
- Consumes: vibekit `Face`, `Mood`, `Vibe`; `cardLead`, `moodFor`, `moodWord` (Task 6).
- Produces: `layouts.ts` with `type FaceVariant = 'mood'|'portrait'|'light'|'name'` and `FACE_VARIANT: Record<Vibe, FaceVariant>` (`daylight: mood, paper: portrait, studio: light, quiet: name`); `<AgentFace agentId name iconUrl? mood? size? variant? withName?>`; `initialOf` moves to `names.ts`.

- [ ] **Step 1: Write the failing test** `AgentFace.svelte.test.ts`

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import AgentFace from './AgentFace.svelte';

afterEach(cleanup);

describe('AgentFace', () => {
  it('mood: a generated face named for the agent', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', mood: 'needs', variant: 'mood' });
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Sample agent');
  });
  it('mood: a chosen picture overrides the generated face', () => {
    render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', iconUrl: 'https://example.com/a.png', variant: 'mood' });
    expect(screen.getByRole('img', { name: 'Sample agent' }).getAttribute('src')).toBe('https://example.com/a.png');
  });
  it('portrait: an initial when there is no picture', () => {
    render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', variant: 'portrait' });
    expect(screen.getByRole('img', { name: 'Sample agent' }).textContent).toBe('S');
  });
  it('light: a face plus a status light that blinks only when the agent needs you', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', mood: 'needs', variant: 'light' });
    expect(container.querySelector('.status-led')?.getAttribute('data-blink')).toBe('true');
  });
  it('name: the name only', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: 'Sample agent', variant: 'name' });
    expect(container.textContent?.trim()).toBe('Sample agent');
    expect(container.querySelector('svg, img')).toBeNull();
  });
  it('an HTML name is text, never markup', () => {
    const { container } = render(AgentFace, { agentId: 'agt_r', name: '<img src=x onerror=alert(1)>', variant: 'portrait' });
    expect(container.querySelector('img')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see it fail** — FAIL (no component).

- [ ] **Step 3: Implement.** `apps/web/src/lib/layouts.ts` (this file grows in Tasks 8 and 12):

```ts
/**
 * The ONE place a vibe picks a layout or a presentation (spec §3.5). Components below the layout
 * folders never ask which vibe is on; they are handed what this file chose.
 */
import type { Vibe } from '@superjackfruit/vibekit';

export type FaceVariant = 'mood' | 'portrait' | 'light' | 'name';
export const FACE_VARIANT: Readonly<Record<Vibe, FaceVariant>> = { daylight: 'mood', paper: 'portrait', studio: 'light', quiet: 'name' };
```

`apps/web/src/lib/components/AgentFace.svelte`:

```svelte
<script lang="ts">
  /**
   * An agent, as the vibe draws it (vibekit spec "Agent faces"): a face with its mood, a round
   * portrait, a square with a status light, or the name only. The face is generated from the id
   * unless the agent has a chosen picture (iconUrl). The name is always the accessible name.
   */
  import { Face, type Mood } from '@superjackfruit/vibekit';
  import type { FaceVariant } from '$lib/layouts';
  import { initialOf } from '$lib/names';

  let {
    agentId,
    name,
    iconUrl = null,
    mood = 'resting',
    size = 24,
    variant = 'mood',
    withName = false,
  }: { agentId: string; name: string; iconUrl?: string | null; mood?: Mood; size?: number; variant?: FaceVariant; withName?: boolean } = $props();
</script>

<span class="agent-face inline-flex min-w-0 items-center gap-1.5" data-variant={variant}>
  {#if variant === 'mood'}
    <Face id={agentId} label={name} {mood} {size} src={iconUrl ?? undefined} />
  {:else if variant === 'portrait'}
    {#if iconUrl}
      <img src={iconUrl} alt={name} width={size} height={size} class="shrink-0 rounded-full object-cover" style="width:{size}px;height:{size}px" />
    {:else}
      <span role="img" aria-label={name} class="font-display grid shrink-0 place-items-center rounded-full" style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.45)}px;background:var(--vk-color-raised);color:var(--vk-color-text)">{initialOf(name)}</span>
    {/if}
  {:else if variant === 'light'}
    <span class="relative inline-block shrink-0" style="width:{size}px;height:{size}px">
      <Face id={agentId} label={name} {mood} {size} src={iconUrl ?? undefined} />
      <span class="status-led absolute -right-0.5 -bottom-0.5 size-2 rounded-full" data-mood={mood} data-blink={mood === 'needs'} aria-hidden="true"></span>
    </span>
  {/if}
  {#if withName || variant === 'name'}<span class="agent-name truncate">{name}</span>{/if}
</span>
```

`app.css` (outside the vibe blocks):

```css
.status-led { background: var(--vk-color-faint); box-shadow: 0 0 0 2px var(--vk-color-surface); }
.status-led[data-mood='needs'] { background: var(--vk-color-signal); }
.status-led[data-mood='working'] { background: var(--vk-color-success); }
.status-led[data-mood='done'] { background: var(--vk-color-primary); }
```

Move `initialOf` from `agentColor.ts` to `names.ts` (same body; add a `names.test.ts` case: `initialOf('sample agent')` is `'S'`, `initialOf(null)` is `'·'` or whatever the current body returns; copy the existing behaviour exactly).

- [ ] **Step 4: Use it.** Everywhere an agent is drawn as a coloured initial or `iconUrl` image, use `<AgentFace>` with `variant={FACE_VARIANT[appearance.value.vibe]}`:
  - `CardTile.svelte` meta row: replace the delegate avatar with
    ```svelte
    {#if card.delegateAgentId}
      <AgentFace agentId={card.delegateAgentId} name={delegateName} iconUrl={delegate?.iconUrl ?? null} mood={mood} size={24} variant={FACE_VARIANT[appearance.value.vibe]} withName />
      <span class="text-muted-foreground text-[11px]">{moodWord(mood)}</span>
    {:else}<span class="text-muted-foreground" title="nobody holds this card">—</span>{/if}
    ```
    with `const lead = $derived(cardLead({ card, gate, elicitation: question }))` and `const mood = $derived(moodFor(lead.kind, !!card.delegateAgentId))`. The "asked by" chip's icon/initial becomes `<AgentFace … size={16} variant="portrait" />` keeping the chip text and tooltip.
  - `CardDrawer.svelte` status row delegate: `<AgentFace … size={28} withName />` followed by `· delegate` text (keep `title={delegateId}` on the wrapper); provenance chip icon: `size={16}`.
  - `Running.svelte`, `Telemetry.svelte` By agent, `AgentsTab.svelte`: `size={24}`/`{20}`, mood `working` in Running, `resting` elsewhere.
  - Delete `agentColor.ts` when nothing imports it.

- [ ] **Step 5: Run** — `AgentFace` test, `names.test.ts`, `CardTile.test.ts`, the whole web unit suite, `typecheck`, and `playwright test e2e/board.spec.ts e2e/elicitation.spec.ts e2e/gates.spec.ts e2e/drawer.spec.ts`. All PASS.
- [ ] **Step 6: Commit** — `git commit -m "web: every agent has a face, drawn the vibe's way, or its chosen picture"`

> **Ship point A.** After Task 7 the app is fully on vibekit (tokens, fonts, picker, faces, Reconnect) with today's layouts. It can be merged and deployed now if time runs short (run Task 16's verification).

---

### Task 8: The board view model, the layout registry and the Daylight board

**Files:**
- Create: `apps/web/src/lib/age.ts`, `apps/web/src/lib/age.test.ts`, `apps/web/src/lib/components/board/card-summary.ts`, `card-summary.test.ts`, `board/ref-chip.ts`, `board/ref-chip.test.ts`, `board/layouts/types.ts`, `board/layouts/BoardDaylight.svelte`, `board/GreetingBand.svelte`, `apps/web/src/lib/layouts.test.ts`
- Modify: `apps/web/src/lib/layouts.ts`, `plan/PlanView.svelte`, `board/CardTile.svelte` (use `ref-chip.ts`)

**Interfaces:**
- Consumes: `itemsFromBoard`, `enforcedBadge`, `childCountsByParent`, `childCounter`, `overdue`, `cardProvenance`, `blockedCountInStage`, `stageOwner`, `displayAgent`, `cardLead`, `moodFor`.
- Produces:
  - `ageLabel(hours: number | null): string | null` ("just now", "14m", "5h", "3d")
  - `type Urgency`, `URGENCY_ORDER`, `interface CardSummary`, `interface StageSummary`, `summarize(board, cards, ctx)`, `urgencyOf(card, attention)`, `groupByUrgency(list)`, `stageSummaries(board, cards, agents)`
  - `refLabel(ref)`, `subStateLabel(ref)`, `subStateClass(sub)`, `safeHref(url)`
  - `interface BoardLayoutProps { summaries; stages: StageSummary[]; attention: AttentionItem[]; phase: Phase; vibe: Vibe; boardName: string; cardCount: number; onCompose: () => void }`
  - `BOARD_LAYOUTS: Record<Vibe, Component<BoardLayoutProps>>` in `layouts.ts`

- [ ] **Step 1: Write the failing tests.**

`apps/web/src/lib/age.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ageLabel } from './age';

describe('ageLabel', () => {
  it.each([[null, null], [0, 'just now'], [0.004, 'just now'], [0.25, '15m'], [5.9, '5h'], [47.9, '47h'], [72, '3d']] as const)('%s → %s', (h, want) => {
    expect(ageLabel(h)).toBe(want);
  });
});
```

`apps/web/src/lib/components/board/card-summary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BoardSnapshot, Card } from '$lib/api';
import { groupByUrgency, stageSummaries, summarize } from './card-summary';

const NOW = Date.parse('2026-10-11T12:00:00Z');
const stages = [
  { key: 'b', name: 'Build', order: 1, wipLimit: 1 },
  { key: 'a', name: 'Plan', order: 0 },
  { key: 'r', name: 'Review', order: 2, gate: 'approval' as const, routing: 'manager' as const },
];
let n = 0;
const card = (over: Partial<Card> = {}): Card => ({
  id: `crd_${++n}`, title: `Card ${n}`, spec: null, ownerUserId: 'usr_a', currentStageKey: 'a', state: 'submitted', priority: 0,
  costUsd: 0, overBudget: false, attemptCount: 0, delegateAgentId: null, queuedBy: null, queuedByAgentId: null, queuedGrant: null,
  labels: [], dueAt: null, archivedAt: null, parentCardId: null, openChildCount: 0, costUsdRollup: 0, blockedBy: [],
  projectId: null, milestoneId: null, stateSince: '2026-10-11T09:00:00Z', ...over,
});
const board = (cards: Card[], extra: Partial<BoardSnapshot> = {}): BoardSnapshot =>
  ({ boardId: 'brd_1', tenantId: 'tnt', name: 'Board', stages, cards, gates: [], elicitations: [], references: [], usage: { cardUsdCap: 2 }, stale: { enabled: true, afterHours: 24 }, ...extra }) as unknown as BoardSnapshot;
const ctx = { agents: [{ id: 'agt_r', name: 'Sample agent', iconUrl: null }] as never, members: [], labels: new Map([['lbl_1', { name: 'ux', colour: 'teal' }]]), nowMs: NOW };

describe('summarize', () => {
  it('a gated card needs you, with the gate summary as its lead', () => {
    const c = card({ currentStageKey: 'r', delegateAgentId: 'agt_r' });
    const [s] = summarize(board([c], { gates: [{ id: 'g', cardId: c.id, stageKey: 'r', status: 'pending', options: [], producedBy: 'agt_r', summary: 'Ready to ship.' }] as never }), [c], ctx);
    expect(s).toMatchObject({ urgency: 'needs', gatePending: true, mood: 'needs', stageName: 'Review', stageIndex: 2, stageCount: 3 });
    expect(s!.lead).toMatchObject({ kind: 'review', sentence: 'Ready to ship.' });
    expect(s!.attention?.kind).toBe('review');
    expect(s!.delegate).toEqual({ id: 'agt_r', name: 'Sample agent', iconUrl: null });
  });

  it('buckets by state', () => {
    const cs = [card({ state: 'working' }), card({ state: 'completed' }), card({ state: 'canceled' }), card({ delegateAgentId: 'agt_r' })];
    const out = summarize(board(cs), cs, ctx);
    expect(out.map((s) => s.urgency)).toEqual(['working', 'done', 'closed', 'queued']);
    expect(out[0]!.live).toBe(true);
    expect(out[3]!.mood).toBe('thinking');
  });

  it('shows three labels and counts the rest, falling back to the id for an unknown label', () => {
    const c = card({ labels: ['lbl_1', 'x2', 'x3', 'x4', 'x5'] });
    const [s] = summarize(board([c]), [c], ctx);
    expect(s!.labels.map((l) => l.name)).toEqual(['ux', 'x2', 'x3']);
    expect(s!.moreLabels).toBe(2);
  });

  it('cost against the card cap', () => {
    const a = card({ costUsd: 1 }), b = card({ costUsd: 0 });
    const [sa, sb] = summarize(board([a, b]), [a, b], ctx);
    expect(sa!.costPct).toBe(50);
    expect(sb!.costPct).toBeNull();
    const [sc] = summarize(board([a], { usage: {} as never }), [a], ctx);
    expect(sc!.costPct).toBeNull();
  });

  it('overdue and age', () => {
    const c = card({ dueAt: '2026-10-10' });
    const [s] = summarize(board([c]), [c], ctx);
    expect(s!.overdue).toBe(true);
    expect(s!.ageHours).toBe(3);
  });
});

describe('groupByUrgency', () => {
  it('keeps every group, in urgency order, P1 before P2 before no priority', () => {
    const cs = [card({ state: 'working', priority: 0 }), card({ state: 'working', priority: 2 }), card({ state: 'working', priority: 1 })];
    const groups = groupByUrgency(summarize(board(cs), cs, ctx));
    expect(groups.map((g) => g.urgency)).toEqual(['needs', 'working', 'queued', 'done', 'closed']);
    expect(groups[1]!.cards.map((s) => s.priority)).toEqual([1, 2, 0]);
    expect(groups[0]!.cards).toEqual([]);
  });
});

describe('stageSummaries', () => {
  it('orders stages and carries count, WIP, gate, manager and empty', () => {
    const cs = [card({ currentStageKey: 'b' }), card({ currentStageKey: 'b', blockedBy: [{ cardId: 'x', title: 'X' }] })];
    const out = stageSummaries(board(cs), cs, []);
    expect(out.map((s) => s.name)).toEqual(['Plan', 'Build', 'Review']);
    expect(out[1]).toMatchObject({ count: 2, wipLimit: 1, atLimit: true, blocked: 1, empty: false });
    expect(out[2]).toMatchObject({ gate: true, manager: true, empty: true });
  });
});
```

`apps/web/src/lib/components/board/ref-chip.test.ts`: move the expectations that `CardTile.test.ts` makes about reference labels here if any, and add:

```ts
import { describe, expect, it } from 'vitest';
import { refLabel, safeHref, subStateLabel } from './ref-chip';
const ref = (o: Record<string, unknown>) => ({ id: 'r', cardId: 'c', url: 'https://x', provider: 'github', sourceType: 'link', addedBy: 'agent', ...o }) as never;
describe('ref chip', () => {
  it('labels PRs, issues and repos', () => {
    expect(refLabel(ref({ sourceType: 'pull_request', externalId: 'o/r#12' }))).toBe('PR #12');
    expect(refLabel(ref({ sourceType: 'issue', externalId: 'o/r#3' }))).toBe('Issue #3');
    expect(refLabel(ref({ sourceType: 'repo', externalId: 'o/r' }))).toBe('o/r');
    expect(refLabel(ref({ title: 'Doc' }))).toBe('Doc');
  });
  it('sub-states read as words', () => expect(subStateLabel(ref({ metadata: { subState: 'pr_open' } }))).toBe('open'));
  it('only http(s) is a link', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('https://example.com')).toBe('https://example.com');
  });
});
```

`apps/web/src/lib/layouts.test.ts`:

```ts
import { VIBES } from '@superjackfruit/vibekit';
import { describe, expect, it } from 'vitest';
import { BOARD_LAYOUTS, FACE_VARIANT } from './layouts';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';

describe('the layout registry', () => {
  it('has a board layout and a face for every vibe', () => {
    for (const v of VIBES) {
      expect(BOARD_LAYOUTS[v], v).toBeTruthy();
      expect(FACE_VARIANT[v], v).toBeTruthy();
    }
  });
  it('Phase 1: Daylight is the board layout every vibe falls back to', () => {
    expect(BOARD_LAYOUTS.daylight).toBe(BoardDaylight);
  });
});
```

- [ ] **Step 2: Run to see them fail** — FAIL (modules missing).

- [ ] **Step 3: Implement.**

`apps/web/src/lib/age.ts`:

```ts
/** How long something has sat, the way the needs-you rows already say it, plus minutes. */
export function ageLabel(hours: number | null): string | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours < 1 / 60) return 'just now';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}
```

`board/ref-chip.ts`: move `SUB_STATE_LABELS`, `subStateLabel`, `refLabel`, `subStateClass`, `safeHref` out of `CardTile.svelte` verbatim, `export` each, and import them back into `CardTile.svelte`.

`board/card-summary.ts`:

```ts
/**
 * The board, as one list every board layout reads (spec §3.5). Built once per snapshot.
 * Everything a tile or a list row shows today is here, so a layout cannot drop a fact by not
 * knowing about it: Paper, Studio and Quiet render CardFacts from this, Daylight's CardTile reads
 * the same helpers directly.
 */
import type { Mood } from '@superjackfruit/vibekit';
import type { AgentSummary, BoardSnapshot, Card, Member, Reference } from '$lib/api';
import { itemsFromBoard, type AttentionItem } from '$lib/components/attention/attention';
import { cardLead, moodFor, type CardLead } from '$lib/components/card/card-lead';
import { displayAgent } from '$lib/names';
import { blockedCountInStage } from './board-counts';
import { enforcedBadge, type BlockedBadge } from './card-blocked';
import { childCountsByParent, childCounter, type ChildCounter } from './card-children';
import { overdue } from './card-due';
import { cardProvenance } from './card-provenance';
import { stageOwner, type StageOwnerLabel } from './stage-owner';

export type Urgency = 'needs' | 'working' | 'queued' | 'done' | 'closed';
export const URGENCY_ORDER: readonly Urgency[] = ['needs', 'working', 'queued', 'done', 'closed'];

export interface AgentRef { id: string; name: string; iconUrl: string | null }

export interface CardSummary {
  card: Card;
  id: string;
  title: string;
  stageKey: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
  state: string;
  priority: number;
  live: boolean;
  archived: boolean;
  blocked: BlockedBadge | null;
  children: ChildCounter | null;
  labels: Array<{ id: string; name: string; colour: string }>;
  moreLabels: number;
  firstRef: Reference | null;
  delegate: AgentRef | null;
  queuedBy: AgentRef | null;
  cost: number;
  overBudget: boolean;
  cardCap: number | null;
  costPct: number | null;
  dueAt: string | null;
  overdue: boolean;
  gatePending: boolean;
  questionFrom: string | null;
  attention: AttentionItem | null;
  urgency: Urgency;
  lead: CardLead;
  mood: Mood;
  attemptCount: number;
  stateSince: string | null;
  ageHours: number | null;
}

export interface StageSummary {
  key: string;
  name: string;
  order: number;
  count: number;
  wipLimit: number | null;
  atLimit: boolean;
  blocked: number;
  gate: boolean;
  manager: boolean;
  owner: StageOwnerLabel;
  empty: boolean;
}

export interface SummaryContext {
  agents: AgentSummary[];
  members: Member[];
  labels: Map<string, { name: string; colour: string }>;
  nowMs: number;
}

export function urgencyOf(card: Card, attention: AttentionItem | null): Urgency {
  if (attention) return 'needs';
  if (card.state === 'working') return 'working';
  if (card.state === 'completed') return 'done';
  if (card.state === 'canceled' || card.state === 'rejected') return 'closed';
  return 'queued';
}

export function summarize(board: BoardSnapshot, cards: Card[], ctx: SummaryContext): CardSummary[] {
  const stages = [...board.stages].sort((a, b) => a.order - b.order);
  const childCounts = childCountsByParent(board.cards);
  const attention = new Map(itemsFromBoard(board, ctx.agents, ctx.nowMs).map((a) => [a.cardId, a]));
  const today = new Date(ctx.nowMs).toISOString().slice(0, 10);
  const agentById = new Map(ctx.agents.map((a) => [a.id, a]));
  const cap = board.usage?.cardUsdCap ?? null;
  const cardCap = cap && cap > 0 ? cap : null;

  return cards.map((c) => {
    const gate = board.gates.find((g) => g.cardId === c.id && g.status === 'pending') ?? null;
    const ask = board.elicitations.find((e) => e.cardId === c.id && e.status === 'pending') ?? null;
    const idx = stages.findIndex((s) => s.key === c.currentStageKey);
    const att = attention.get(c.id) ?? null;
    const lead = cardLead({ card: c, gate, elicitation: ask });
    const held = c.delegateAgentId ? agentById.get(c.delegateAgentId) : undefined;
    const prov = cardProvenance(c, ctx.members, ctx.agents);
    const labels = c.labels.map((id) => ({ id, ...(ctx.labels.get(id) ?? { name: id, colour: '' }) }));
    const since = c.stateSince ? Date.parse(c.stateSince) : Number.NaN;
    return {
      card: c,
      id: c.id,
      title: c.title,
      stageKey: c.currentStageKey,
      stageName: stages[idx]?.name ?? c.currentStageKey,
      stageIndex: Math.max(0, idx),
      stageCount: stages.length,
      state: c.state,
      priority: c.priority,
      live: c.state === 'working',
      archived: c.archivedAt !== null,
      blocked: enforcedBadge(c.blockedBy),
      children: childCounter(c.openChildCount, childCounts.get(c.id) ?? 0),
      labels: labels.slice(0, 3),
      moreLabels: Math.max(0, labels.length - 3),
      firstRef: board.references.find((r) => r.cardId === c.id) ?? null,
      delegate: c.delegateAgentId ? { id: c.delegateAgentId, name: displayAgent(c.delegateAgentId, ctx.agents), iconUrl: held?.iconUrl ?? null } : null,
      queuedBy: prov.known && prov.byAgent && prov.agent ? { id: prov.agent.id, name: prov.queuedByName, iconUrl: prov.agent.iconUrl } : null,
      cost: c.costUsd,
      overBudget: c.overBudget,
      cardCap,
      costPct: cardCap && c.costUsd > 0 ? Math.min(100, Math.round((c.costUsd / cardCap) * 100)) : null,
      dueAt: c.dueAt,
      overdue: overdue(c.dueAt, c.state, today),
      gatePending: gate !== null,
      questionFrom: ask ? displayAgent(ask.agentId, ctx.agents) : null,
      attention: att,
      urgency: urgencyOf(c, att),
      lead,
      mood: moodFor(lead.kind, !!c.delegateAgentId),
      attemptCount: c.attemptCount,
      stateSince: c.stateSince ?? null,
      ageHours: Number.isNaN(since) ? null : Math.max(0, (ctx.nowMs - since) / 3_600_000),
    };
  });
}

const rank = (p: number) => (p > 0 ? p : Number.MAX_SAFE_INTEGER);

/** Every group, even an empty one: a layout says "None." rather than silently skipping it. */
export function groupByUrgency(list: CardSummary[]): Array<{ urgency: Urgency; cards: CardSummary[] }> {
  return URGENCY_ORDER.map((urgency) => ({
    urgency,
    cards: list
      .filter((s) => s.urgency === urgency)
      .sort((a, b) => rank(a.priority) - rank(b.priority) || (b.ageHours ?? -1) - (a.ageHours ?? -1) || a.title.localeCompare(b.title)),
  }));
}

export function stageSummaries(board: BoardSnapshot, cards: Card[], agents: AgentSummary[]): StageSummary[] {
  return [...board.stages]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const here = cards.filter((c) => c.currentStageKey === s.key);
      const wip = s.wipLimit ?? null;
      return {
        key: s.key,
        name: s.name,
        order: s.order,
        count: here.length,
        wipLimit: wip,
        atLimit: wip !== null && here.length >= wip,
        blocked: blockedCountInStage(here),
        gate: s.gate === 'approval',
        manager: s.routing === 'manager',
        owner: stageOwner(s, agents),
        empty: here.length === 0,
      };
    });
}
```

`board/layouts/types.ts`:

```ts
import type { Phase, Vibe } from '@superjackfruit/vibekit';
import type { AttentionItem } from '$lib/components/attention/attention';
import type { CardSummary, StageSummary } from '../card-summary';

export interface BoardLayoutProps {
  summaries: CardSummary[];
  stages: StageSummary[];
  attention: AttentionItem[];
  phase: Phase;
  vibe: Vibe;
  boardName: string;
  cardCount: number;
  onCompose: () => void;
}
```

`board/GreetingBand.svelte`:

```svelte
<script lang="ts">
  /** Daylight's sky over the board: the greeting, how many cards want you, and who is working. */
  import { greeting, Sky, type Mood, type Phase, type Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import { wantYou } from '$lib/copy';

  let { phase, vibe, needCount, crew }: { phase: Phase; vibe: Vibe; needCount: number; crew: Array<{ id: string; name: string; iconUrl: string | null; mood: Mood }> } = $props();
  const shown = $derived(crew.slice(0, 5));
</script>

<Sky {phase}>
  <div class="flex min-h-[56px] flex-wrap items-center gap-3">
    <p class="font-display text-lg leading-tight">{greeting(phase, vibe)} {wantYou(needCount, vibe)}</p>
    {#if crew.length > 0}
      <ul class="ml-auto flex items-center gap-1" aria-label="Agents holding cards">
        {#each shown as a (a.id)}<li><AgentFace agentId={a.id} name={a.name} iconUrl={a.iconUrl} mood={a.mood} size={32} variant="mood" /></li>{/each}
        {#if crew.length > shown.length}<li class="text-sm">+{crew.length - shown.length}</li>{/if}
      </ul>
    {/if}
  </div>
</Sky>
```

`board/layouts/BoardDaylight.svelte`:

```svelte
<script lang="ts">
  /** Daylight: the columns, with faces, under the sky (spec §5.1). The lanes are BoardKanban, unchanged. */
  import BoardKanban from '../BoardKanban.svelte';
  import GreetingBand from '../GreetingBand.svelte';
  import type { BoardLayoutProps } from './types';

  let { summaries, attention, phase, vibe }: BoardLayoutProps = $props();

  const crew = $derived.by(() => {
    const seen = new Map<string, { id: string; name: string; iconUrl: string | null; mood: (typeof summaries)[number]['mood'] }>();
    for (const s of summaries) if (s.delegate && !s.archived && s.urgency !== 'done' && s.urgency !== 'closed' && !seen.has(s.delegate.id)) seen.set(s.delegate.id, { ...s.delegate, mood: s.mood });
    return [...seen.values()];
  });
</script>

<div class="flex h-full min-h-0 flex-col">
  <GreetingBand {phase} {vibe} needCount={attention.length} {crew} />
  <div class="flex min-h-0 flex-1">
    <div class="min-w-0 flex-1 overflow-auto"><BoardKanban /></div>
  </div>
</div>
```

`layouts.ts` — add:

```ts
import type { Component } from 'svelte';
import BoardDaylight from '$lib/components/board/layouts/BoardDaylight.svelte';
import type { BoardLayoutProps } from '$lib/components/board/layouts/types';

/** Phase 1: every vibe uses the Daylight board, in its own tokens and words. Phases 2–4 swap one line each. */
export const BOARD_LAYOUTS: Readonly<Record<Vibe, Component<BoardLayoutProps>>> = {
  daylight: BoardDaylight,
  paper: BoardDaylight,
  studio: BoardDaylight,
  quiet: BoardDaylight,
};
```

`copy.ts`: add the light words Paper prints (Tasks 18 and 20 use them):

```ts
import type { Phase } from '@superjackfruit/vibekit';
export const LIGHT_WORDS: Readonly<Record<Phase, string>> = { dawn: 'first light', morning: 'morning light', noon: 'full daylight', golden: 'golden light', dusk: 'evening light', night: 'lamplight' };
```

`plan/PlanView.svelte`: replace `<BoardKanban />` with

```svelte
{@const Board = BOARD_LAYOUTS[appearance.value.vibe]}
<Board {summaries} stages={stageList} {attention} phase={appearance.phase} vibe={appearance.value.vibe} boardName={app.board?.name ?? ''} cardCount={app.filteredCards().length} onCompose={() => app.requestCompose()} />
```

with, in the script:

```ts
const summaries = $derived(app.board ? summarize(app.board, app.filteredCards(), { agents: app.agents, members: app.members, labels: app.labelById(), nowMs: Date.now() }) : []);
const stageList = $derived(app.board ? stageSummaries(app.board, app.filteredCards(), app.agents) : []);
const attention = $derived(app.board ? itemsFromBoard(app.board, app.agents) : []);
```

- [ ] **Step 4: Run** — the four new test files, `CardTile.test.ts`, `typecheck`, and `playwright test e2e/board.spec.ts e2e/stage-tabs.spec.ts e2e/mobile-overflow.spec.ts e2e/responsive.spec.ts`. All PASS. If `board.spec.ts` counts headings or regions, the band adds none (it uses a `<p>` and a labelled `<ul>`).
- [ ] **Step 5: Commit** — `git commit -m "web: one board view model, a layout registry, and Daylight's sky over the lanes"`

---

### Task 9: The Daylight peek

**Files:**
- Create: `apps/web/src/lib/components/board/Peek.svelte`, `board/peek.ts`, `board/Peek.svelte.test.ts`
- Modify: `board/layouts/BoardDaylight.svelte`, `board/CardTile.svelte`

**Interfaces:**
- Produces: `PEEK_KEY` (a `Symbol`) and `notifyPeek(id)` from `peek.ts` (reads the context, does nothing outside a peek-enabled board); `<Peek summary vibe onOpen>`.

- [ ] **Step 1: Write the failing test** `Peek.svelte.test.ts`

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import Peek from './Peek.svelte';

afterEach(cleanup);
const s = (over: Record<string, unknown> = {}) => ({
  id: 'crd_1', title: 'Launch post', delegate: { id: 'agt_r', name: 'Sample agent', iconUrl: null }, mood: 'needs',
  lead: { kind: 'review', needsYou: true, sentence: 'Ready to ship.' }, gatePending: true, questionFrom: null, attention: { actions: ['review'] }, ...over,
}) as never;

describe('Peek', () => {
  it('is a labelled region with the agent’s sentence and one action', async () => {
    const onOpen = vi.fn();
    render(Peek, { summary: s(), vibe: 'daylight', onOpen });
    expect(screen.getByRole('complementary', { name: 'Peek' })).toBeTruthy();
    expect(screen.getByText('Ready to ship.')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(onOpen).toHaveBeenCalledWith('crd_1');
  });
  it('falls back to the kind’s words when the agent said nothing', () => {
    render(Peek, { summary: s({ lead: { kind: 'stopped', needsYou: true, sentence: null }, gatePending: false }), vibe: 'quiet', onOpen: vi.fn() });
    expect(screen.getByText('Stopped. Waiting for you.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
  });
  it('says so when there is nothing to peek at', () => {
    render(Peek, { summary: null, vibe: 'daylight', onOpen: vi.fn() });
    expect(screen.getByText('Point at a card to see what its agent says.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Implement.** `board/peek.ts`:

```ts
import { getContext } from 'svelte';
export const PEEK_KEY = Symbol('peek');
/** A tile tells the board it is being looked at. Outside a board with a peek this is a no-op. */
export function peekNotifier(): (id: string) => void {
  return getContext<((id: string) => void) | undefined>(PEEK_KEY) ?? (() => {});
}
```

`board/Peek.svelte`:

```svelte
<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardSummary } from './card-summary';

  let { summary, vibe, onOpen }: { summary: CardSummary | null; vibe: Vibe; onOpen: (id: string) => void } = $props();
  const action = $derived(
    !summary ? null : summary.questionFrom ? 'Answer' : summary.gatePending ? 'Review' : summary.lead.kind === 'stopped' || summary.lead.kind === 'failed' ? 'Resume' : 'Open',
  );
</script>

<aside aria-label="Peek" class="border-border bg-surface flex w-[320px] shrink-0 flex-col gap-3 overflow-y-auto border-l p-4">
  <div class="eyebrow">Peek</div>
  {#if summary}
    <p class="font-display text-lg leading-snug">{summary.title}</p>
    <div class="flex items-start gap-2">
      {#if summary.delegate}<AgentFace agentId={summary.delegate.id} name={summary.delegate.name} iconUrl={summary.delegate.iconUrl} mood={summary.mood} size={36} variant="mood" />{/if}
      <p class="agent-voice bg-raised min-h-[3rem] flex-1 rounded-[var(--vk-radius-md)] p-3 text-sm"><Words text={leadText(summary.lead, vibe)} /></p>
    </div>
    <button type="button" class="vk-button {summary.lead.needsYou ? 'vk-button--signal' : 'vk-button--secondary'}" onclick={() => onOpen(summary.id)}>{action}</button>
  {:else}
    <p class="text-muted-foreground text-sm">Point at a card to see what its agent says.</p>
  {/if}
</aside>
```

`BoardDaylight.svelte`: add

```ts
import { setContext } from 'svelte';
import { MediaQuery } from 'svelte/reactivity';
import { app } from '$lib/stores/app.svelte';
import Peek from '../Peek.svelte';
import { PEEK_KEY } from '../peek';
const wide = new MediaQuery('min-width: 1440px');
let looked = $state<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
setContext(PEEK_KEY, (id: string) => { clearTimeout(timer); timer = setTimeout(() => (looked = id), 150); });
const peeked = $derived(summaries.find((s) => s.id === looked) ?? summaries.find((s) => s.urgency === 'needs') ?? null);
```

and after the lanes column: `{#if wide.current}<Peek summary={peeked} {vibe} onOpen={(id) => app.openCard(id)} />{/if}`. The peek is not rendered below 1440px (so the default 1280px e2e viewport never sees a second copy of a title). Update spec §5.1 wording if needed: the peek starts at 1440px.

`CardTile.svelte`: `const peek = peekNotifier();` and on the tile root `onfocusin={() => peek(card.id)} onpointerenter={() => peek(card.id)}`.

- [ ] **Step 4: Run** — the Peek test, `CardTile.test.ts`, `typecheck`; then `playwright test e2e/board.spec.ts` and, by hand at 1440px, check that hovering tiles changes the peek and the button opens the card.
- [ ] **Step 5: Commit** — `git commit -m "web: Daylight's peek: what a card's agent says, beside the board on wide screens"`

---

### Task 10: The question model and the Daylight question panel

**Files:**
- Create: `apps/web/src/lib/components/card/question/question-answer.svelte.ts`, `question-answer.test.ts`, `QuestionDaylight.svelte`, `QuestionDaylight.svelte.test.ts`
- Modify: `CardDrawer.svelte`

**Interfaces:**
- Consumes: `answerElicitation`, `Elicitation`; `AgentFace`, `Words`.
- Produces: `class QuestionAnswer { text; selected; answering; error; follow(id); send(option?): Promise<boolean>; submit(): Promise<boolean> }`; `<QuestionDaylight model elicitation agent lead vibe>`; the drawer's `answerText`, `answering` and `onAnswer` are removed.

- [ ] **Step 1: Write the failing tests**

`question-answer.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
const answerElicitation = vi.fn();
vi.mock('$lib/api', () => ({ answerElicitation: (...a: unknown[]) => answerElicitation(...a) }));
import { QuestionAnswer } from './question-answer.svelte';

const ask = (options: Array<{ name: string; title: string }> = []) => ({ id: 'eli_1', options }) as never;

describe('QuestionAnswer', () => {
  let after: ReturnType<typeof vi.fn>;
  let q: QuestionAnswer;
  let elicitation = ask([{ name: 'yes', title: 'Yes' }]);
  beforeEach(() => {
    answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) });
    after = vi.fn(async () => {});
    q = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation, after }));
  });

  it('an option goes back with the note', async () => {
    q.text = '  fine ';
    expect(await q.send('yes')).toBe(true);
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'yes', text: 'fine' });
    expect(q.text).toBe('');
    expect(after).toHaveBeenCalled();
  });

  it('nothing picked and nothing typed is refused with the right sentence', async () => {
    expect(await q.send()).toBe(false);
    expect(q.error).toBe('Pick one of the options.');
    elicitation = ask([]);
    expect(await q.send()).toBe(false);
    expect(q.error).toBe('Type an answer first.');
    expect(answerElicitation).not.toHaveBeenCalled();
  });

  it('submit sends the selected option (the radio forms)', async () => {
    elicitation = ask([{ name: 'yes', title: 'Yes' }]);
    q.selected = 'yes';
    await q.submit();
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'yes', text: undefined });
  });

  it('a refusal says what the server said', async () => {
    answerElicitation.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { message: 'Already answered' } }) });
    expect(await q.send('yes')).toBe(false);
    expect(q.error).toBe('Already answered');
  });

  it('a new question starts clean', () => {
    q.follow('eli_1');
    q.text = 'half';
    q.follow('eli_2');
    expect(q.text).toBe('');
  });
});
```

`QuestionDaylight.svelte.test.ts` (render with a real `QuestionAnswer` whose context points at a mocked `answerElicitation`): assert the container has class `elicitation`, contains "awaiting your answer" (and "awaiting your sign-in" when `signal: 'auth'`), "{agent} is waiting", the question text, one button per option with the first using the primary variant, the textbox named "Add a note for the agent (optional)" (or "Your answer" plus "Send answer" when there are no options), and that clicking "Run the tests" calls `answerElicitation` with `option: 'run_them'`.

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement** `question-answer.svelte.ts`

```ts
/**
 * Answering an agent's question (docs/04 §4), the same in every vibe. The agent is blocked and
 * still holds its lease; a failure says so beside the question rather than parking the card.
 */
import { answerElicitation, type Elicitation } from '$lib/api';

export interface QuestionContext {
  boardId: string | null;
  elicitation: Elicitation | undefined;
  after: () => Promise<void>;
}

export class QuestionAnswer {
  text = $state('');
  selected = $state<string | null>(null);
  answering = $state(false);
  error = $state<string | null>(null);
  #ctx: () => QuestionContext;
  #last: string | null = null;

  constructor(ctx: () => QuestionContext) {
    this.#ctx = ctx;
  }

  follow(id: string | null): void {
    if (id === this.#last) return;
    this.#last = id;
    this.text = '';
    this.selected = null;
    this.error = null;
  }

  async send(option?: string): Promise<boolean> {
    const { boardId, elicitation, after } = this.#ctx();
    if (!boardId || !elicitation || this.answering) return false;
    const text = this.text.trim();
    if (!option && text === '') {
      this.error = elicitation.options.length > 0 ? 'Pick one of the options.' : 'Type an answer first.';
      return false;
    }
    this.answering = true;
    try {
      const res = await answerElicitation(boardId, elicitation.id, { option, text: text || undefined });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.error = body?.error?.message ?? `Couldn't send that answer (${res.status})`;
      } else {
        this.error = null;
        this.text = '';
        this.selected = null;
      }
      await after();
      return res.ok;
    } finally {
      this.answering = false;
    }
  }

  submit(): Promise<boolean> {
    return this.send(this.selected ?? undefined);
  }
}
```

`QuestionDaylight.svelte` — the bubble and the replies in one `.elicitation` container (the e2e reads both from it):

```svelte
<script lang="ts">
  import type { Mood, Vibe } from '@superjackfruit/vibekit';
  import type { Elicitation } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import type { QuestionAnswer } from './question-answer.svelte';

  let { model, elicitation, agent }: { model: QuestionAnswer; elicitation: Elicitation; agent: { id: string | null; name: string; iconUrl: string | null; mood: Mood }; vibe: Vibe } = $props();
</script>

<section class="sec" aria-labelledby="q-{elicitation.id}">
  <div class="elicitation rounded-[var(--vk-radius-lg)] border-2 p-3.5" style="border-color:var(--vk-color-signal);background:var(--vk-color-signal-wash)">
    <div class="mb-2 flex flex-wrap items-center gap-2">
      <h3 id="q-{elicitation.id}" class="wordmark text-signal-text text-sm font-semibold">⚑ {elicitation.signal === 'auth' ? 'awaiting your sign-in' : 'awaiting your answer'}</h3>
      <span class="eyebrow ml-auto" title={elicitation.agentId}>{agent.name} is waiting</span>
    </div>
    <div class="mb-3 flex items-start gap-2">
      <AgentFace agentId={elicitation.agentId} name={agent.name} iconUrl={agent.iconUrl} mood="needs" size={36} variant="mood" />
      <p class="agent-voice bg-surface flex-1 rounded-[var(--vk-radius-md)] p-3 text-base leading-relaxed whitespace-pre-wrap">{elicitation.question}</p>
    </div>
    {#if model.error}<p role="alert" class="text-signal-text mb-2 text-sm">{model.error}</p>{/if}
    {#if elicitation.options.length > 0}
      <div class="flex flex-wrap gap-2">
        {#each elicitation.options as opt, i (opt.name)}
          <Button size="sm" variant={i === 0 ? 'default' : 'outline'} disabled={model.answering} onclick={() => model.send(opt.name)} style="min-height:var(--tap)">{opt.title}</Button>
        {/each}
      </div>
      <textarea bind:value={model.text} rows="2" aria-label="Add a note for the agent (optional)" placeholder="Add a note for the agent (optional)…" class="bg-surface border-border mt-2.5 w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-signal)"></textarea>
    {:else}
      <textarea bind:value={model.text} rows="3" aria-label="Your answer" placeholder="Your answer — this goes straight back to the waiting agent…" class="bg-surface border-border w-full resize-none rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none" style="border-color:var(--vk-color-signal)"></textarea>
      <div class="mt-2 flex justify-end"><Button size="sm" disabled={model.answering} onclick={() => model.send()} style="min-height:var(--tap)">Send answer</Button></div>
    {/if}
  </div>
</section>
```

`CardDrawer.svelte`: delete `answerText`, `answering`, `onAnswer`; add

```ts
import { QuestionAnswer } from '$lib/components/card/question/question-answer.svelte';
import QuestionDaylight from '$lib/components/card/question/QuestionDaylight.svelte';
const question = new QuestionAnswer(() => ({
  boardId,
  elicitation,
  after: async () => { await app.refresh(); if (cardId && boardId) void refreshDrawer(cardId, boardId); },
}));
$effect(() => question.follow(elicitation?.id ?? null));
```

and replace the whole `{#if elicitation} <section …> … </section> {/if}` block with `{#if elicitation}<QuestionDaylight model={question} {elicitation} agent={{ id: elicitation.agentId, name: displayAgent(elicitation.agentId, app.agents), iconUrl: app.agents.find((a) => a.id === elicitation.agentId)?.iconUrl ?? null, mood: 'needs' }} vibe={appearance.value.vibe} />{/if}`.

- [ ] **Step 4: Run** — both unit files, `typecheck`, `playwright test e2e/elicitation.spec.ts e2e/drawer.spec.ts`. PASS.
- [ ] **Step 5: Commit** — `git commit -m "web: answering an agent is one model; Daylight shows its question as a message"`

---

### Task 11: The gate decision model and the Daylight gate panel

**Files:**
- Create: `apps/web/src/lib/components/card/gate/gate-decision.svelte.ts`, `gate-decision.test.ts`, `GateDaylight.svelte`
- Move: `card/GateActions.svelte.test.ts` → `card/gate/GateDaylight.svelte.test.ts`
- Delete: `card/GateActions.svelte`
- Modify: `CardDrawer.svelte`

**Interfaces:**
- Consumes: `resolveGate`, `Gate`, `GateDecision`, `GateOption`; `gateDecisionForOption`; `noteToComment`, `GATE_NOTE_MAX`.
- Produces: `DEFAULT_GATE_OPTIONS`, `roleOf(name): 'approve'|'changes'|'reject'|null`, `decisionFor(name): GateDecision`, `sealOf(digest): string`, `class GateDecisionModel { note; needNote; needPick; busy; selected; noteEl; options; follow(id); decide(name); submit() }`; `<GateDaylight boardId gate error onResponse agent lead vibe>`.

- [ ] **Step 1: Write the failing test** `gate-decision.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
const resolveGate = vi.fn();
vi.mock('$lib/api', () => ({ resolveGate: (...a: unknown[]) => resolveGate(...a) }));
import { decisionFor, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

const subject = { id: 'sub_1', digest: '3f9ac21e77', schema: 's', revision: 2, canonical: {} };
const gate = (options: Array<{ name: string; title: string }> = []) => ({ id: 'gat_1', options, approvalSubject: subject }) as never;

describe('GateDecisionModel', () => {
  let onResponse: ReturnType<typeof vi.fn>;
  let m: GateDecisionModel;
  let g = gate();
  beforeEach(() => {
    resolveGate.mockReset().mockResolvedValue({ ok: true });
    onResponse = vi.fn(async () => true);
    g = gate();
    m = new GateDecisionModel(() => ({ boardId: 'brd_1', gate: g, onResponse }));
  });

  it('falls back to Approve, Request changes, Reject', () => {
    expect(m.options.map((o) => o.title)).toEqual(['Approve', 'Request changes', 'Reject']);
  });

  it('Request changes with no note is refused and asks for one', async () => {
    m.note = '   ';
    await m.decide('request_changes');
    expect(resolveGate).not.toHaveBeenCalled();
    expect(m.needNote).toBe(true);
  });

  it('a decision carries the note as the comment, with the frozen subject', async () => {
    m.note = 'checked the diff';
    await m.decide('approve');
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked the diff', subject);
    expect(m.note).toBe('');
  });

  it('approve variants map to their decisions', () => {
    expect(decisionFor('approve_manual')).toBe('approve_manual');
    expect(decisionFor('approve_automatic')).toBe('approve_automatic');
    expect(decisionFor('reject')).toBe('reject');
    expect(roleOf('approve_manual')).toBe('approve');
    expect(roleOf('something_else')).toBeNull();
  });

  it('submit needs a choice (the radio forms)', async () => {
    await m.submit();
    expect(m.needPick).toBe(true);
    expect(resolveGate).not.toHaveBeenCalled();
    m.selected = 'reject';
    await m.submit();
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'reject', undefined, subject);
  });

  it('one decision at a time', async () => {
    let release!: () => void;
    resolveGate.mockReturnValue(new Promise((r) => (release = () => r({ ok: true }))));
    const first = m.decide('approve');
    await m.decide('reject');
    release();
    await first;
    expect(resolveGate).toHaveBeenCalledTimes(1);
  });

  it('a refused decision keeps the note', async () => {
    onResponse.mockResolvedValue(false);
    m.note = 'keep me';
    await m.decide('approve');
    expect(m.note).toBe('keep me');
  });

  it('a different gate starts clean', () => {
    m.follow('gat_1');
    m.note = 'half';
    m.follow('gat_2');
    expect(m.note).toBe('');
  });

  it('the seal is the first eight hex of the digest', () => {
    expect(sealOf('3f9ac21e77')).toBe('3f9a·c21e');
  });
});
```

Move `GateActions.svelte.test.ts` to `gate/GateDaylight.svelte.test.ts`; change the import to `./GateDaylight.svelte` and every `render(GateActions, { boardId, gate, onResponse })` to `render(GateDaylight, { boardId, gate, error: null, onResponse, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' }, lead: { kind: 'review', needsYou: true, agentId: 'agt_r', sentence: null, source: 'none', at: null }, vibe: 'daylight' })`. Every assertion stays. Add: "shows ⚑ awaiting your review, the subject's revision and the seal line"; "shows the gate error passed in, as an alert".

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement** `gate-decision.svelte.ts`

```ts
/**
 * One decision on an approval gate, the same in every vibe (spec §5.3). The note is always on
 * screen while the gate is pending and travels with whichever decision is taken; Request changes
 * needs one, because it is the rework instruction the next run reads.
 */
import { resolveGate, type Gate, type GateDecision, type GateOption } from '$lib/api';
import { gateDecisionForOption } from '$lib/gate-delivery';
import { GATE_NOTE_MAX, noteToComment } from '$lib/gate-note';

export const DEFAULT_GATE_OPTIONS: readonly GateOption[] = [
  { name: 'approve', title: 'Approve', interactive: false },
  { name: 'request_changes', title: 'Request changes', interactive: true },
  { name: 'reject', title: 'Reject', interactive: false },
];
export { GATE_NOTE_MAX };

export type OptionRole = 'approve' | 'changes' | 'reject';
export function roleOf(name: string): OptionRole | null {
  if (name === 'approve' || name === 'approve_manual' || name === 'approve_automatic') return 'approve';
  if (name === 'request_changes') return 'changes';
  if (name === 'reject') return 'reject';
  return null;
}
export function decisionFor(name: string): GateDecision {
  const role = roleOf(name);
  if (role === 'changes') return 'request_changes';
  if (role === 'reject') return 'reject';
  return gateDecisionForOption(name);
}
export const sealOf = (digest: string): string => `${digest.slice(0, 4)}·${digest.slice(4, 8)}`;

export interface GateContext {
  boardId: string;
  gate: Gate;
  onResponse: (decision: GateDecision, res: Response) => Promise<boolean>;
}

export class GateDecisionModel {
  note = $state('');
  needNote = $state(false);
  needPick = $state(false);
  busy = $state(false);
  selected = $state<string | null>(null);
  noteEl = $state<HTMLTextAreaElement | undefined>();
  #ctx: () => GateContext;
  #last: string | null = null;

  constructor(ctx: () => GateContext) {
    this.#ctx = ctx;
  }

  get options(): GateOption[] {
    const g = this.#ctx().gate;
    return (g.options.length > 0 ? g.options : DEFAULT_GATE_OPTIONS).filter((o) => roleOf(o.name) !== null);
  }

  follow(id: string): void {
    if (id === this.#last) return;
    this.#last = id;
    this.note = '';
    this.needNote = false;
    this.needPick = false;
    this.selected = null;
  }

  async decide(name: string): Promise<void> {
    if (this.busy) return;
    const decision = decisionFor(name);
    const comment = noteToComment(this.note);
    if (decision === 'request_changes' && comment === undefined) {
      this.needNote = true;
      this.noteEl?.focus();
      return;
    }
    this.needNote = false;
    this.needPick = false;
    this.busy = true;
    try {
      const { boardId, gate, onResponse } = this.#ctx();
      const res = await resolveGate(boardId, gate.id, decision, comment, gate.approvalSubject);
      if (await onResponse(decision, res)) {
        this.note = '';
        this.selected = null;
      }
    } finally {
      this.busy = false;
    }
  }

  async submit(): Promise<void> {
    if (!this.selected) {
      this.needPick = true;
      return;
    }
    await this.decide(this.selected);
  }
}
```

`GateDaylight.svelte`:

```svelte
<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import type { Gate, GateDecision } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from '../card-lead';
  import { GATE_NOTE_MAX, GateDecisionModel, roleOf, sealOf } from './gate-decision.svelte';

  let { boardId, gate, error, onResponse, agent, lead, vibe }: {
    boardId: string; gate: Gate; error: string | null;
    onResponse: (d: GateDecision, r: Response) => Promise<boolean>;
    agent: { id: string | null; name: string; iconUrl: string | null; mood: import('@superjackfruit/vibekit').Mood };
    lead: CardLead; vibe: Vibe;
  } = $props();

  const model = new GateDecisionModel(() => ({ boardId, gate, onResponse }));
  $effect(() => model.follow(gate.id));
  const ordered = $derived([...model.options].sort((a, b) => ['changes', 'reject', 'approve'].indexOf(roleOf(a.name)!) - ['changes', 'reject', 'approve'].indexOf(roleOf(b.name)!)));
</script>

<section class="sec" aria-labelledby="gate-h-{gate.id}">
  <div class="gate rounded-[var(--vk-radius-lg)] border-2 p-3.5" style="border-color:var(--vk-color-signal);background:var(--vk-color-signal-wash)">
    <h3 id="gate-h-{gate.id}" class="wordmark text-signal-text mb-2.5 text-sm font-semibold">⚑ awaiting your review</h3>
    <div class="mb-3 flex items-start gap-2">
      {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood="needs" size={40} variant="mood" />{/if}
      <p class="agent-voice bg-surface flex-1 rounded-[var(--vk-radius-md)] p-3 text-base"><Words text={leadText(lead, vibe)} /></p>
    </div>
    {#if error}<p role="alert" class="text-signal-text bg-surface mono mb-2.5 rounded-[var(--vk-radius-md)] border-2 px-3 py-2 text-xs" style="border-color:var(--vk-color-signal)">{error}</p>{/if}
    {#if gate.approvalSubject}
      <div class="bg-surface border-border mono mb-3 rounded-[var(--vk-radius-md)] border p-2.5 text-[11px]">
        <div class="mb-1 font-semibold">Immutable approval subject · revision {gate.approvalSubject.revision}</div>
        <div class="text-muted-foreground break-all">{gate.approvalSubject.id}</div>
        <div class="text-muted-foreground break-all">{gate.approvalSubject.digest}</div>
        <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{JSON.stringify(gate.approvalSubject.canonical, null, 2)}</pre>
        <div class="mt-2 text-xs">Approving exactly this version · sealed {sealOf(gate.approvalSubject.digest)}</div>
      </div>
    {/if}
    <div class="gate-note mb-3">
      <label for="gate-note-{gate.id}" class="text-muted-foreground mb-1 block text-xs">{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
      <textarea id="gate-note-{gate.id}" bind:this={model.noteEl} bind:value={model.note} maxlength={GATE_NOTE_MAX} rows="3" aria-invalid={model.needNote}
        placeholder="Recorded with your decision. Request changes needs one: it threads into the agent's next attempt."
        class="bg-surface w-full resize-y rounded-[var(--vk-radius-md)] border-2 px-2.5 py-2 text-base outline-none"
        style="border-color:{model.needNote ? 'var(--vk-color-signal)' : 'var(--vk-color-line)'}"></textarea>
      <div class="text-muted-foreground mono mt-1 text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    </div>
    <div class="triad gate-actions flex flex-wrap gap-2">
      {#each ordered as opt (opt.name)}
        {@const role = roleOf(opt.name)}
        <Button size="sm" variant={role === 'approve' ? 'default' : role === 'changes' ? 'outline' : 'ghost'} disabled={model.busy} onclick={() => model.decide(opt.name)} class="flex-1" style="min-height:var(--tap)">{opt.title}</Button>
      {/each}
    </div>
  </div>
</section>
```

`app.css` (outside vibe blocks): on phones the decision buttons stick to the bottom of the drawer body:

```css
@media (max-width: 599px) {
  .gate-actions { position: sticky; bottom: 0; padding-block: var(--vk-space-2); padding-bottom: calc(var(--vk-space-2) + env(safe-area-inset-bottom, 0px)); background: var(--vk-color-signal-wash); }
}
```

`CardDrawer.svelte`: replace the `{#if gate} <section …> … </section> {/if}` block with `{#if gate && boardId}<GateDaylight {boardId} {gate} error={gateError} onResponse={onGateResponse} agent={drawerAgent} lead={lead} vibe={appearance.value.vibe} />{/if}`, where

```ts
const lead = $derived(card ? cardLead({ card, gate, elicitation, activities: cardDetail?.activities ?? [], failureReason: stageEntries.at(-1)?.failureReason ?? null }) : null);
const drawerAgent = $derived({ id: delegateId, name: delegateName, iconUrl: app.agents.find((a) => a.id === delegateId)?.iconUrl ?? null, mood: lead ? moodFor(lead.kind, !!delegateId) : 'resting' });
```

Delete `GateActions.svelte`.

- [ ] **Step 4: Run** — `gate-decision.test.ts`, `GateDaylight.svelte.test.ts`, `typecheck`, `playwright test e2e/gates.spec.ts` (both cases, including the 390px one: buttons ≥ 44px, note font ≥ 16px, note inside 390px). PASS. Revert-proof: delete the `comment === undefined` check and watch "Request changes with no note is refused" fail.
- [ ] **Step 5: Commit** — `git commit -m "web: a gate decision is one model; Daylight shows the agent, the sealed subject and the note"`

---

### Task 12: The drawer becomes a shell plus 23 sections, chosen by vibe

**Files:**
- Create: `apps/web/src/lib/components/card/layouts/types.ts`, `card/layouts/CardDaylight.svelte`, `apps/web/src/lib/layout-parity.test.ts`
- Modify: `CardDrawer.svelte`, `layouts.ts`, `layouts.test.ts`

**Interfaces:**
- Produces:

```ts
// card/layouts/types.ts
import type { Snippet } from 'svelte';
import type { Mood, Phase, Vibe } from '@superjackfruit/vibekit';
import type { Card, Elicitation, Gate, GateDecision, Stage } from '$lib/api';
import type { CardLead } from '../card-lead';
import type { QuestionAnswer } from '../question/question-answer.svelte';

export const CARD_SECTION_KEYS = [
  'error', 'status', 'facts', 'editButton', 'editForm', 'description', 'delivery', 'resume', 'plan', 'criteria',
  'details', 'project', 'links', 'subtasks', 'activity', 'decisions', 'comments', 'handoff', 'cost', 'attempts',
  'related', 'references', 'cardActions',
] as const;
export type CardSectionKey = (typeof CARD_SECTION_KEYS)[number];
export type CardSections = Readonly<Record<CardSectionKey, Snippet>>;

export interface CardCounts { criteria: number; planSteps: number; specFields: number; runs: number; links: number; children: number; openChildren: number; decisions: number; refs: number; attempts: number; deliveryActive: boolean }
export interface CardAgent { id: string | null; name: string; iconUrl: string | null; mood: Mood }
export interface GateBinding { boardId: string; gate: Gate; error: string | null; onResponse: (d: GateDecision, r: Response) => Promise<boolean> }
export interface QuestionBinding { model: QuestionAnswer; elicitation: Elicitation; agent: CardAgent }

export interface CardLayoutProps {
  card: Card;
  vibe: Vibe;
  phase: Phase;
  boardName: string;
  personName: string;
  stages: Stage[];
  stageIndex: number;
  stageName: string;
  ageHours: number | null;
  lead: CardLead;
  agent: CardAgent;
  sections: CardSections;
  counts: CardCounts;
  editing: boolean;
  gate: GateBinding | null;
  question: QuestionBinding | null;
}
```

  and in `layouts.ts`: `CARD_LAYOUTS: Readonly<Record<Vibe, { component: Component<CardLayoutProps>; panel: string; align: 'end' | 'center' }>>`, Phase 1 all `{ component: CardDaylight, panel: 'sm:max-w-[520px]', align: 'end' }`. The shell's outer container uses `justify-end` or `justify-center` from `align`.

- [ ] **Step 1: Write the failing parity test** `apps/web/src/lib/layout-parity.test.ts`

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARD_SECTION_KEYS } from '$lib/components/card/layouts/types';

const read = (dir: URL, f: string) => readFileSync(new URL(f, dir), 'utf8');
const count = (src: string, needle: string) => src.split(needle).length - 1;

const CARD_DIR = new URL('./components/card/layouts/', import.meta.url);
const cardLayouts = readdirSync(CARD_DIR).filter((f) => /^Card[A-Z]\w*\.svelte$/.test(f));

describe('every card layout shows everything (spec §7.5)', () => {
  it('finds the layouts', () => expect(cardLayouts.length).toBeGreaterThanOrEqual(1));
  for (const f of cardLayouts) {
    const src = read(CARD_DIR, f);
    for (const k of CARD_SECTION_KEYS) {
      it(`${f} renders sections.${k} exactly once`, () => expect(count(src, `{@render sections.${k}()}`)).toBe(1));
    }
    it(`${f} labels the dialog with the title`, () => expect(count(src, 'id="drawer-title"')).toBe(1));
    it(`${f} renders a gate panel and a question panel`, () => {
      expect(src).toMatch(/<Gate[A-Z]\w*\b/);
      expect(src).toMatch(/<Question[A-Z]\w*\b/);
    });
    it(`${f} leads with the agent`, () => expect(src).toMatch(/\blead\b/));
  }
});

const BOARD_DIR = new URL('./components/board/layouts/', import.meta.url);
const boardLayouts = readdirSync(BOARD_DIR).filter((f) => /^Board(?!Daylight)[A-Z]\w*\.svelte$/.test(f));

describe('every non-Daylight board layout shows every card fact and every stage (spec §7.3–7.4)', () => {
  for (const f of boardLayouts) {
    const src = read(BOARD_DIR, f);
    it(`${f} renders CardFacts, CardMoveMenu and StageList`, () => {
      expect(src).toContain('<CardFacts');
      expect(src).toContain('<CardMoveMenu');
      expect(src).toContain('<StageList');
    });
    it(`${f} opens cards with the tile's accessible name`, () => expect(src).toContain('openLabel('));
  }
  it('Daylight keeps the kanban', () => expect(read(BOARD_DIR, 'BoardDaylight.svelte')).toContain('<BoardKanban'));
});
```

- [ ] **Step 2: Run to see it fail** — FAIL (`types` missing).

- [ ] **Step 3: Cut the drawer into snippets.** In `CardDrawer.svelte` create `card/layouts/types.ts` (above), then move markup into top-level snippets **outside** `{#if card}`. Each snippet body is the existing markup, unchanged, wrapped in `{#if card}…{/if}` so it type-checks. Names and sources:

| Snippet | Today's markup (top to bottom in the file) |
|---|---|
| `s_editForm` | the contents of `{#if editing}` in `dw-head` (the edit form) |
| `s_editButton` | the "Edit card" pencil button beside the H2 |
| `s_status` | the `<!-- status row -->` div (state pill, delegate, owner, provenance, assign to me, live dot) |
| `s_facts` | **new**, below |
| `s_error` | the `{#if localError}` banner |
| `s_description` | the description `<section>` |
| `s_delivery` | the `{#if deliveryGate?.approvalSubject}` approved-delivery section |
| `s_resume` | the `{#if boardId}<CardResume …/>{/if}` |
| `s_plan` | `<PlanChecklist plan={card.spec?.plan} />` |
| `s_criteria` | the acceptance-criteria `<section>` |
| `s_details` | the `<SpecDetails … />` element |
| `s_project` | the project `<section>` |
| `s_links` | the links `<section>`, including the add-link form |
| `s_subtasks` | the sub-tasks `<section>` |
| `s_activity` | the session-activity `<section>` |
| `s_decisions` | the `{#if decidedGates.length > 0}` decisions section |
| `s_comments` | the comments `<section aria-label="Comments">` |
| `s_handoff` | the handoff `{#if cardDetail?.handoff …}` section |
| `s_cost` | the cost block |
| `s_attempts` | the attempts block |
| `s_related` | `{#if cardId}<RelatedWork {cardId} />{/if}` |
| `s_references` | the references `<section>` |
| `s_cardActions` | the archive / un-archive / delete footer |

The question and gate panels are not snippets: they are the `question`/`gate` bindings.

`s_facts` (new; priority, due and labels were only visible in edit mode):

```svelte
{#snippet s_facts()}
  {#if card}
    <dl class="dw-facts mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <div class="flex gap-1"><dt class="text-muted-foreground">priority</dt><dd>{card.priority > 0 ? `P${card.priority}` : 'none'}</dd></div>
      <div class="flex gap-1"><dt class="text-muted-foreground">due</dt><dd class={cardOverdue ? 'text-signal-text' : ''}>{card.dueAt ? `${cardOverdue ? '⚠ ' : ''}${card.dueAt.slice(0, 10)}` : 'none'}</dd></div>
      <div class="flex flex-wrap items-center gap-1"><dt class="text-muted-foreground">labels</dt>
        {#if cardLabels.length === 0}<dd>none</dd>{:else}{#each cardLabels as l (l.id)}<dd class="lbl-pill" style="--lbl:{l.colour || 'var(--vk-color-line)'}">{l.name}</dd>{/each}{/if}
      </div>
      {#if ageLabel(cardAgeHours)}<div class="flex gap-1"><dt class="text-muted-foreground">in {stageName} for</dt><dd>{ageLabel(cardAgeHours)}</dd></div>{/if}
      {#if card.attemptCount > 1}<div class="flex gap-1"><dt class="text-muted-foreground">attempt</dt><dd>{card.attemptCount}</dd></div>{/if}
    </dl>
  {/if}
{/snippet}
```

with script additions: `const cardOverdue = $derived(card ? overdue(card.dueAt, card.state, new Date().toISOString().slice(0, 10)) : false)`, `const cardLabels = $derived(card ? card.labels.map((id) => ({ id, ...(app.labelById().get(id) ?? { name: id, colour: '' }) })) : [])`, `const cardAgeHours = $derived(card?.stateSince ? Math.max(0, (Date.now() - Date.parse(card.stateSince)) / 3_600_000) : null)`. (Reuse the existing `.lbl-pill` class the tile uses.)

Counts (script):

```ts
const counts = $derived<CardCounts>({
  criteria: acceptanceCriteria?.length ?? 0,
  planSteps: Array.isArray((card?.spec as { plan?: unknown } | undefined)?.plan) ? ((card!.spec as { plan: unknown[] }).plan.length) : 0,
  specFields: Object.keys(card?.spec ?? {}).filter((k) => !['description', 'acceptanceCriteria', 'labels', 'due'].includes(k)).length,
  runs: activityGroups.length,
  links: linkGroups.blockedBy.length + linkGroups.resolvedBlockedBy.length + linkGroups.blocks.length + linkGroups.relates.length + linkGroups.supersedes.length + linkGroups.advisory.length,
  children: totalChildren,
  openChildren: card?.openChildCount ?? 0,
  decisions: decidedGates.length,
  refs: refs.length,
  attempts: drawerAttempts.length,
  deliveryActive: !!deliveryGate?.approvalSubject,
});
```

(If `plan.ts` exports a parser that `PlanChecklist` uses, count its steps instead.)

The shell — replace the panel's children (`dw-head` and `dw-body`) with the layout:

```svelte
{@const L = CARD_LAYOUTS[appearance.value.vibe]}
<div bind:this={panelEl} role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1" onkeydown={trapTab}
  class="bg-surface border-border drawer-in safe-top safe-bottom safe-x relative flex h-full w-full flex-col border-l shadow-2xl {L.panel}">
  <button onclick={close} class="tap absolute top-2 right-2 z-20 rounded-[8px]" aria-label="Close" title="close (esc)">✕</button>
  <L.component
    {card}
    vibe={appearance.value.vibe}
    phase={appearance.phase}
    boardName={app.board?.name ?? ''}
    personName={app.user?.name ?? app.user?.login ?? 'there'}
    stages={orderedStages}
    stageIndex={Math.max(0, orderedStages.findIndex((s) => s.key === card.currentStageKey))}
    {stageName}
    ageHours={cardAgeHours}
    lead={lead!}
    agent={drawerAgent}
    sections={{ error: s_error, status: s_status, facts: s_facts, editButton: s_editButton, editForm: s_editForm, description: s_description, delivery: s_delivery, resume: s_resume, plan: s_plan, criteria: s_criteria, details: s_details, project: s_project, links: s_links, subtasks: s_subtasks, activity: s_activity, decisions: s_decisions, comments: s_comments, handoff: s_handoff, cost: s_cost, attempts: s_attempts, related: s_related, references: s_references, cardActions: s_cardActions }}
    {counts}
    {editing}
    gate={gate && boardId ? { boardId, gate, error: gateError, onResponse: onGateResponse } : null}
    question={elicitation ? { model: question, elicitation, agent: { id: elicitation.agentId, name: displayAgent(elicitation.agentId, app.agents), iconUrl: app.agents.find((a) => a.id === elicitation.agentId)?.iconUrl ?? null, mood: 'needs' } } : null}
  />
</div>
```

(`orderedStages = [...(app.board?.stages ?? [])].sort((a, b) => a.order - b.order)`.) The old close ✕ in the crumbs row moves to this shell button; keep its accessible name and `title`. If the old one's accessible name differed from "Close", keep the old name.

Tab trap: make `trapTab` ignore elements that are not rendered (a hidden tab panel in Studio): filter the focusables with `.filter((el) => el.getClientRects().length > 0)`.

- [ ] **Step 4: `CardDaylight.svelte` — today's order, so nothing moves yet** (Task 13 makes it a conversation):

```svelte
<script lang="ts">
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import type { CardLayoutProps } from './types';
  let { card, vibe, stageName, lead, agent, sections, editing, gate, question }: CardLayoutProps = $props();
</script>

<div class="dw-head border-border flex-none border-b p-4 pb-3.5 pr-12">
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <div class="eyebrow text-marigold">{stageName}</div>
    <div class="mt-1 flex items-start gap-2">
      <h2 id="drawer-title" class="font-display min-w-0 flex-1 text-xl leading-tight">{card.title}</h2>
      {@render sections.editButton()}
    </div>
    {@render sections.status()}
    {@render sections.facts()}
  {/if}
</div>
<div class="dw-body min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}
  {@render sections.description()}
  {#if question}<QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />{/if}
  {#if gate}<GateDaylight boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} />{/if}
  {@render sections.delivery()}
  {@render sections.resume()}
  {@render sections.plan()}
  {@render sections.criteria()}
  {@render sections.details()}
  {@render sections.project()}
  {@render sections.links()}
  {@render sections.subtasks()}
  {@render sections.activity()}
  {@render sections.decisions()}
  {@render sections.comments()}
  {@render sections.handoff()}
  {@render sections.cost()}
  {@render sections.attempts()}
  {@render sections.related()}
  {@render sections.references()}
  {@render sections.cardActions()}
</div>
```

Match the H2's existing classes from today's `<!-- dw-title -->` markup rather than the ones above if they differ.

`layouts.ts`: add the `CARD_LAYOUTS` map; `layouts.test.ts`: assert every vibe has a card layout with a non-empty `panel`, and `CARD_LAYOUTS.daylight.component === CardDaylight`.

- [ ] **Step 5: Run** — `layout-parity.test.ts`, `layouts.test.ts`, the whole web unit suite, `typecheck`, and the **full** e2e suite (`drawer`, `addressable`, `readable-handoff`, `resume`, `gates`, `elicitation`, `mobile*`, `reachable` especially). All PASS; the drawer looks as before plus the facts line. Revert-proof: delete `{@render sections.links()}` from `CardDaylight.svelte` and watch the parity test name it.
- [ ] **Step 6: Commit** — `git commit -m "web: the card drawer is a shell, 23 sections and a layout chosen by vibe"`

---

### Task 13: Daylight's card is a conversation

**Files:**
- Create: `apps/web/src/lib/components/card/LeadBubble.svelte`, `card/layouts/CardDaylight.svelte.test.ts`
- Modify: `card/layouts/CardDaylight.svelte`, `app.css`

**Interfaces:**
- Consumes: vibekit `StageTrack`, `say`; `LEAD_FALLBACK`/`leadText`, `Words`, `AgentFace`.
- Produces: `<LeadBubble lead agent vibe label>`.

- [ ] **Step 1: Write the failing test** `CardDaylight.svelte.test.ts` — render `CardDaylight` with fake snippets (`createRawSnippet(() => ({ render: () => '<p>SECTION-<key></p>' }))` for each key in `CARD_SECTION_KEYS`) and assert:
  - the header has the H2 `#drawer-title`, a `StageTrack` list labelled "Stages", and the status and facts sections;
  - with `lead = { kind: 'stopped', needsYou: true, sentence: 'Handoff refused twice.' }` and no gate/question: the text "Sample agent · needs you" and "Handoff refused twice." appear **before** `SECTION-resume` in document order, and the "📌 What Sample agent was asked" button has `aria-expanded="false"` (the description and criteria are inside its region and not rendered until expanded);
  - with `lead.kind = 'working'`: the brief button has `aria-expanded="true"`, and the label is just the agent's name;
  - `SECTION-error` comes before the header's following content (first in the body);
  - every `SECTION-<key>` is present once (after expanding the brief).

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Implement.** `card/LeadBubble.svelte`:

```svelte
<script lang="ts">
  import type { Vibe } from '@superjackfruit/vibekit';
  import AgentFace from '$lib/components/AgentFace.svelte';
  import Words from '$lib/components/Words.svelte';
  import { leadText } from '$lib/copy';
  import type { CardLead } from './card-lead';
  import type { CardAgent } from './layouts/types';
  let { lead, agent, vibe, label }: { lead: CardLead; agent: CardAgent; vibe: Vibe; label: string } = $props();
</script>

<div class="lead flex items-start gap-2" data-needs={lead.needsYou}>
  {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood={agent.mood} size={36} variant="mood" />{/if}
  <div class="min-w-0 flex-1">
    <div class="eyebrow {lead.needsYou ? 'text-signal-text' : 'text-muted-foreground'}">{label}</div>
    <p class="agent-voice mt-1 rounded-[var(--vk-radius-lg)] rounded-tl-[var(--vk-radius-sm)] p-3 text-base leading-relaxed whitespace-pre-wrap" style="background:{lead.needsYou ? 'var(--vk-color-signal-wash)' : 'var(--vk-color-raised)'}"><Words text={leadText(lead, vibe)} /></p>
    {#if lead.at}<time class="text-muted-foreground mt-1 block text-[11px]" datetime={lead.at}>{new Date(lead.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{/if}
  </div>
</div>
```

`CardDaylight.svelte` (final for Phase 1):

```svelte
<script lang="ts">
  import { say, StageTrack } from '@superjackfruit/vibekit';
  import GateDaylight from '../gate/GateDaylight.svelte';
  import QuestionDaylight from '../question/QuestionDaylight.svelte';
  import LeadBubble from '../LeadBubble.svelte';
  import type { CardLayoutProps } from './types';

  let { card, vibe, stages, stageIndex, stageName, lead, agent, sections, editing, gate, question }: CardLayoutProps = $props();
  let briefOpen = $state(false);
  // Re-decide only when the card or its needs-you state changes, never on a live refresh: a
  // person who opened the brief keeps it open while the agent works.
  let briefFor = '';
  $effect(() => {
    const k = `${card.id}:${lead.needsYou}`;
    if (k !== briefFor) { briefFor = k; briefOpen = !lead.needsYou; }
  });
  const label = $derived(lead.needsYou ? say('agent.needsYou', vibe, { agent: agent.name }) : agent.name);
  const replying = $derived(!!question || !!gate);
</script>

<div class="dw-head border-border flex-none border-b p-4 pb-3.5 pr-12">
  {#if editing}
    {@render sections.editForm()}
  {:else}
    <div class="eyebrow text-marigold">{stageName}</div>
    <div class="mt-1 flex items-start gap-2">
      <h2 id="drawer-title" class="font-display min-w-0 flex-1 text-xl leading-tight">{card.title}</h2>
      {@render sections.editButton()}
    </div>
    <div class="mt-3"><StageTrack stages={stages.map((s) => s.name)} current={stageIndex} stopped={lead.needsYou} label="Stages" /></div>
    {@render sections.status()}
    {@render sections.facts()}
  {/if}
</div>

<div class="dw-body min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-4 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}

  <section aria-label="The brief">
    <button type="button" class="pinned-brief bg-raised flex w-full items-center gap-2 rounded-[var(--vk-radius-md)] px-3 text-left text-sm" style="min-height:var(--vk-target-min)" aria-expanded={briefOpen} aria-controls="brief-{card.id}" onclick={() => (briefOpen = !briefOpen)}>
      <span aria-hidden="true">📌</span> What {agent.name} was asked <span class="text-muted-foreground ml-auto">{briefOpen ? 'hide' : 'show'}</span>
    </button>
    <div id="brief-{card.id}" hidden={!briefOpen} class="mt-3 space-y-4">
      {@render sections.description()}
      {@render sections.criteria()}
    </div>
  </section>

  <div class="conversation space-y-3">
    {#if question}
      <QuestionDaylight model={question.model} elicitation={question.elicitation} agent={question.agent} {vibe} />
    {:else if gate}
      <GateDaylight boardId={gate.boardId} gate={gate.gate} error={gate.error} onResponse={gate.onResponse} {agent} {lead} {vibe} />
    {:else}
      <LeadBubble {lead} {agent} {vibe} {label} />
    {/if}
    {@render sections.resume()}
  </div>

  {@render sections.delivery()}
  {@render sections.plan()}
  {@render sections.details()}
  {@render sections.project()}
  {@render sections.links()}
  {@render sections.subtasks()}
  {@render sections.activity()}
  {@render sections.decisions()}
  {@render sections.comments()}
  {@render sections.handoff()}
  {@render sections.cost()}
  {@render sections.attempts()}
  {@render sections.related()}
  {@render sections.references()}
  {@render sections.cardActions()}
</div>
```

Notes: the brief region uses `hidden`, so its content stays in the DOM and in the parity count; the button is the labelled disclosure. When a question is pending, `QuestionDaylight` carries the agent's message (the question) itself, so the bubble is not drawn twice. `replying` is unused unless you add a sticky class for the question composer on phones: add `class:sticky-reply={replying}` on `.conversation` and in `app.css` `@media (max-width: 599px) { .sticky-reply .elicitation { position: sticky; bottom: 0; } }`.

- [ ] **Step 4: Run** — the new test, the parity test, `typecheck`, full e2e. Check `e2e/drawer.spec.ts` and `readable-handoff.spec.ts`: if one asserts the description is visible on open for a card that needs you, open the brief in the test first (`page.getByRole('button', { name: /What .* was asked/ }).click()`) and say why in a comment (the brief is a labelled disclosure in Daylight; spec §5.2).
- [ ] **Step 5: Commit** — `git commit -m "web: Daylight's card opens with what the agent needs, then the reply, then everything else"`

> **Ship point B.** After Task 13 every key screen has its Daylight layout. Tasks 14–16 finish Phase 1.

---

### Task 14: The adaptive screens, styled per vibe

**Files:**
- Modify: `components/Landing.svelte`, `routes/+layout.svelte` (loading screen), `components/Onboarding.svelte`, `attention/AttentionRow.svelte`, `operate/*.svelte`, `Telemetry.svelte`, `BoardSettings.svelte`, `workspace/*.svelte`, `plan/ListView.svelte`, `plan/ProjectView.svelte`, `plan/FilterBar.svelte`, `shell/*.svelte`, `CommandPalette.svelte`, `NewBoardDialog.svelte`, `ui/button/button.svelte`
- Test: `apps/web/src/lib/components/Landing.svelte.test.ts` (new)

**Interfaces:**
- Consumes: `appearance`, vibekit `Sky`, `greeting`.
- Produces: no new interfaces. Every screen keeps its structure and copy (spec §4.3, §7.1, §7.2, §7.6).

- [ ] **Step 1: Write the failing test** `Landing.svelte.test.ts` (jsdom; mock `$lib/hub-token` `hubStatus` to `{ configured: false, token: null, signIn: 'org-plane' }`): the H1 text, the lede, "Sign in" link to `/auth/login`, "Read the docs" link, the six stage names of the `software` template, the three cell headings and the four footer links are present; a `.vk-sky` element wraps the hero with `data-phase` equal to `appearance.phase`; the greeting for that phase in the current vibe is shown above the H1.

- [ ] **Step 2: Run to see it fail** (no sky, no greeting).

- [ ] **Step 3: Implement.**
  - **Landing:** wrap the hero (mark, wordmark, greeting, H1, lede, notice, CTAs) in `<Sky phase={appearance.phase}>`; add `<p class="font-display">{greeting(appearance.phase, appearance.value.vibe)}</p>` above the H1. Replace the scoped CSS's colours with `--vk-*` variables and its fonts with `var(--vk-font-display)`/`var(--vk-font-body)`. Keep every word and link. Below 880px one column (unchanged).
  - **Loading screen** (`+layout.svelte`): unchanged words; the `.live-dot` pulse uses `--vk-motion-base` and stops under the reduce tier (already via vibekit base).
  - **Badges** (`AttentionRow.svelte`): urgent kinds (review, failed, repeated-failure, blocked) `bg-signal-wash text-signal-text` with a 2px `--vk-color-signal` inset ring; `asked` uses `border-primary text-foreground`; the rest `bg-raised text-muted-foreground`. The words are unchanged.
  - **Buttons** (`ui/button/button.svelte`): `default` → the classes of `.vk-button--primary` (`bg-primary text-primary-foreground`, `--vk-lift` shadow); `outline` → `.vk-button--secondary`; `ghost` → `.vk-button--quiet` but without the underline unless it is text-only. Heights: `default` `min-h-[var(--tap)]`, `sm` `min-h-[var(--tap)]` (was h-7; 28px fails 44px on touch). Radii `rounded-[var(--vk-radius-md)]`, fonts inherit.
  - **List view:** the P1 "P1" text uses `text-signal-text`, P2 `text-foreground font-semibold` (no colour meaning beyond the word).
  - Everywhere: replace `font-['Space_Grotesk']`-style arbitrary values or `wordmark` font overrides with `font-display`; leave layout and copy alone.

- [ ] **Step 4: Walk every screen.** `pnpm --filter @superpipeline/web dev` against `pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev`. For each vibe × light/dark (use the picker), at 390px and 1280px, open: landing (sign out first, or `curl -X POST /auth/logout`), onboarding (a fresh tenant), board, List, Projects, a drawer, Operate, Telemetry, board settings, each Workspace tab, the palette, the compose sheet, the new-board dialog, the board switcher. Fix any text that is unreadable, any control under 44px on touch, any horizontal scroll. Write down anything you could not fix in the PR description.

- [ ] **Step 5: Run** — `Landing.svelte.test.ts`, the whole web unit suite, `typecheck`, full e2e.
- [ ] **Step 6: Commit** — `git commit -m "web: every other screen takes the vibe's colours, type and sky, with its words unchanged"`

---

### Task 15: The vibes e2e: reachability, accessibility, overflow, screenshots

**Files:**
- Create: `apps/web/e2e/vibes.spec.ts`
- Modify: `apps/web/playwright.config.ts` (report keeps attachments: `reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list'`), `.github/workflows/ci.yml` (upload `apps/web/playwright-report` as an artifact on the e2e job, `if: always()`)

**Interfaces:**
- Consumes: `e2e/support/seed.ts` (Task 2), `@axe-core/playwright` (Task 1).
- Produces: `LAYOUT_VIBES` and `RADIO_DECISIONS` lists that each later phase extends.

- [ ] **Step 1: Write the spec** `apps/web/e2e/vibes.spec.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openBoard, REVIEW_PIPELINE, seedBoard, seedGatedCard, seedQuestionCard, setAppearance } from './support/seed';

// Every vibe × theme runs against whatever layout the registry gives it. LAYOUT_VIBES lists the
// vibes whose own layouts have shipped (Phase 1: daylight; the others run as skins over Daylight).
// RADIO_DECISIONS lists the vibes where a decision is a radio choice plus a submit button.
const ALL_VIBES = ['daylight', 'paper', 'studio', 'quiet'] as const;
const LAYOUT_VIBES: readonly string[] = ['daylight']; // documents progress; every vibe runs regardless
const RADIO_DECISIONS = new Set<string>([]);
const SUBMIT: Record<string, string> = { paper: 'Send reply', quiet: 'Submit decision' };

test.use({ timezoneId: 'Europe/London' });
const NOON = new Date('2026-10-11T12:00:00+01:00');

async function revealAll(scope: Locator): Promise<void> {
  for (const s of await scope.locator('details:not([open]) > summary').all()) if (await s.isVisible()) await s.click();
  for (const b of await scope.locator('button[aria-expanded="false"][aria-controls]').all()) if (await b.isVisible()) await b.click();
}

/** Visible now, or after opening every disclosure, or on some tab. */
async function reachable(scope: Locator, role: Parameters<Locator['getByRole']>[0], name: string | RegExp): Promise<boolean> {
  const seen = async () => scope.getByRole(role, { name, exact: typeof name === 'string' }).first().isVisible().catch(() => false);
  if (await seen()) return true;
  await revealAll(scope);
  if (await seen()) return true;
  const tabs = scope.getByRole('tab');
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    await revealAll(scope);
    if (await seen()) return true;
  }
  return false;
}

async function noA11yViolations(page: Page, include?: string): Promise<void> {
  let b = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('iframe');
  if (include) b = b.include(include);
  const r = await b.analyze();
  expect(r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
}

async function noSideScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

const SIZES = [{ name: 'desktop', width: 1280, height: 820 }, { name: 'phone', width: 390, height: 844 }] as const;

for (const vibe of ALL_VIBES) {
  for (const theme of ['light', 'dark'] as const) {
    for (const size of SIZES) {
      test(`${vibe} ${theme} ${size.name}: board, gate and question keep every action`, async ({ page, request }, info) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.clock.setFixedTime(NOON);
        await setAppearance(page, `${vibe}.${theme}.strong.0`);
        const boardId = await seedBoard(request, `Vibes ${vibe} ${theme} ${size.name}`, REVIEW_PIPELINE);
        await seedGatedCard(request, boardId, 'Launch post');
        await seedQuestionCard(request, boardId, 'Add the OAuth flow');
        await openBoard(page, boardId);
        await expect(page.locator('html')).toHaveAttribute('data-vibe', vibe);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

        // Board
        const body = page.locator('body');
        await expect(page.getByRole('button', { name: /^Launch post, in / })).toBeVisible();
        for (const [role, name] of [
          ['button', 'Board'], ['button', 'List'], ['button', 'Projects'], ['button', '⚑ Review'],
          ['button', /^⚑ Answer agt_r/], ['button', 'Move Launch post to another stage'], ['button', /filter/i],
        ] as const) {
          expect(await reachable(body, role, name), `board: ${String(name)}`).toBe(true);
        }
        await noSideScroll(page);
        await noA11yViolations(page, 'main');
        await info.attach(`${vibe}-${theme}-${size.name}-board.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

        // Gate
        await page.getByRole('button', { name: '⚑ Review' }).first().click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const decision = RADIO_DECISIONS.has(vibe) ? 'radio' : 'button';
        for (const [role, name] of [
          [decision, 'Approve'], [decision, 'Request changes'], [decision, 'Reject'], ['textbox', 'Add a note (optional)'],
          ['button', 'Edit card'], ['button', 'Archive card'], ['button', 'Delete card'], ['button', 'Comment'],
          ['button', 'Add link'], ['textbox', /New sub-task title/], ['button', /Close/],
        ] as const) {
          expect(await reachable(dialog, role, name), `gate: ${String(name)}`).toBe(true);
        }
        if (SUBMIT[vibe] && RADIO_DECISIONS.has(vibe)) expect(await reachable(dialog, 'button', SUBMIT[vibe]!)).toBe(true);
        await expect(dialog.getByText(/Immutable approval subject · revision/)).toBeVisible();
        await noSideScroll(page);
        await noA11yViolations(page, '[role="dialog"]');
        await info.attach(`${vibe}-${theme}-${size.name}-gate.png`, { body: await page.screenshot(), contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();

        // Question
        await page.getByRole('button', { name: /^⚑ Answer agt_r/ }).first().click();
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('May I run the test suite?').first()).toBeVisible();
        for (const [role, name] of [[decision, 'Run the tests'], [decision, 'Skip them'], ['textbox', /Add a note for the agent|Note for/]] as const) {
          expect(await reachable(dialog, role, name), `question: ${String(name)}`).toBe(true);
        }
        await noA11yViolations(page, '[role="dialog"]');
        await info.attach(`${vibe}-${theme}-${size.name}-question.png`, { body: await page.screenshot(), contentType: 'image/png' });
      });
    }
  }
}
```

The textbox names come from `aria-label`s (Tasks 10–11) and the comment composer's placeholder; if `Comment`'s composer has no accessible name today, add `aria-label="Add a comment"` to it in `CardComments.svelte` (this is an accessibility fix, not a rename).

- [ ] **Step 2: Run** — `pnpm --filter @superpipeline/web exec playwright test e2e/vibes.spec.ts`. Expected: 16 tests PASS. Fix real findings in the components (contrast, names, overflow), not in the test. Look at the attached screenshots in `playwright-report` (`pnpm --filter @superpipeline/web exec playwright show-report`).
- [ ] **Step 3: CI artifact.** In `.github/workflows/ci.yml` `e2e` job, after the e2e step:

```yaml
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/web/playwright-report
          retention-days: 14
```

- [ ] **Step 4: Run** the full e2e suite once more; note the new duration (budget: the `e2e` job under 6 minutes).
- [ ] **Step 5: Commit** — `git commit -m "web: every vibe and theme keeps every action, passes axe and fits a phone; screenshots go to the report"`

---

### Task 16: Ship Phase 1

**Files:** none new. `CHANGELOG.md` (one entry).

- [ ] **Step 1: Everything green locally.** From the repo root: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm --filter @superpipeline/web e2e`. All PASS.
- [ ] **Step 2: Bundle budget.** `git stash -u; git checkout origin/main -- apps/web; pnpm --filter @superpipeline/web build; du -sk apps/web/build/_app/immutable > /tmp/before.txt; git checkout HEAD -- apps/web; git stash pop; pnpm --filter @superpipeline/web build; du -sk apps/web/build/_app/immutable`. JS growth must be under 25% excluding `.woff2` (`find apps/web/build/_app/immutable -name '*.js' -exec du -ck {} + | tail -1` before and after). If over, lazy-load `AppearanceDialog` and the non-active card layouts with `import()` behind the registry.
- [ ] **Step 3: Fonts on a cold load.** `pnpm --filter @superpipeline/web preview`, open a board in Daylight with the network panel filtered to `font`: only Figtree, Bricolage Grotesque (and Martian Mono if mono text is on screen) load.
- [ ] **Step 4: CHANGELOG.** Add under the next 0.0.x heading: "Superpipeline moves onto vibekit: pick Daylight, Paper, Studio or Quiet in Appearance; light, dark or follow the sun. The card opens with what its agent needs. Superlibrary previews hidden for want of a sign-in offer Reconnect." (Do not change `package.json` versions.)
- [ ] **Step 5: Push and open the PR on Forge.** `git push -u origin feat/vibes-phase-1`; open the PR on `forge.superjackfruit.com/SuperJackfruitLabs/superpipeline` with the summary, the parity table link (spec §7), and the screenshots from the Playwright report. Body ends with the attribution lines from the Global Constraints. The operator merges.
- [ ] **Step 6: After the merge, verify the deploy.**

```bash
before=$(curl -s https://app.superpipeline.dev/_app/version.json)   # take this BEFORE the merge
gh run list --repo SuperJackfruitLabs/superpipeline --limit 3        # the push run: test, e2e, deploy all ✓
gh run watch --repo SuperJackfruitLabs/superpipeline $(gh run list --repo SuperJackfruitLabs/superpipeline --limit 1 --json databaseId -q '.[0].databaseId')
curl -s https://app.superpipeline.dev/health                         # {"ok":true,"service":"superpipeline-api",...}
curl -s https://app.superpipeline.dev/_app/version.json              # differs from $before
curl -s https://app.superpipeline.dev/ | grep -c 'vk_appearance'     # ≥ 2 (migration + HEAD_SCRIPT)
curl -s https://app.superpipeline.dev/ | grep -c 'fonts.googleapis'  # 0
```

Then in a browser, signed in: the board in Daylight; Appearance → Paper → the board and a drawer in Paper's type and colours; back to Daylight. Rollback, if needed: revert the merge commit on Forge; the next deploy restores the previous SPA (no data or API change).

---

# Phase 2 — Paper

### Task 17: Shared board parts for the non-Daylight layouts

**Files:**
- Create: `board/CardFacts.svelte`, `board/CardMoveMenu.svelte`, `board/StageList.svelte`, `board/open-label.ts`, `board/open-label.test.ts`, `board/CardFacts.svelte.test.ts`, `board/StageList.svelte.test.ts`, `board/CardMoveMenu.svelte.test.ts`
- Modify: `board/CardTile.svelte` (uses `CardMoveMenu` and `openLabel`, so there is one move implementation)

**Interfaces:**
- Produces:
  - `openLabel(s: { title: string; stageName: string }): string` → `"{title}, in {stage}. Enter to open, M to move, Alt with left or right arrow to move between stages."`
  - `cardKeys(e: KeyboardEvent, h: { open(): void; toggleMove(): void; step(delta: -1 | 1): void }): void` (Enter opens, `m`/`M` toggles, Alt+Arrow steps; ignores other keys)
  - `<CardMoveMenu card stages bind:open>` (the ⇄ button named "Move {title} to another stage", title "Move to…", the menu with "· here" on the current stage disabled, Escape closes, the sr-only `aria-live` announcement "{title} moved to {stage}"; exports `step(delta)` via `bind:this`)
  - `<CardFacts s tone="chips"|"text">`
  - `<StageList stages variant="lines"|"strip"|"table">`

- [ ] **Step 1: Write the failing tests.**
  - `open-label.test.ts`: the label string exactly as above; `cardKeys` calls `open` on Enter, `toggleMove` on `m` and `M`, `step(-1)` on Alt+ArrowLeft, `step(1)` on Alt+ArrowRight, nothing on a bare ArrowLeft.
  - `CardFacts.svelte.test.ts` with a summary that has every fact set (priority 1, live, blocked with 2 blockers, children 1/3, five labels, a PR reference with `subState: 'pr_open'` and an https URL, queued by an agent, cost 1.5 over budget with cap 2, due yesterday): assert, in this order, "P1" with sr-only "Priority 1"; "Agent working"; "⛔ Blocked" with the tooltip from `enforcedBadge`; "1/3" with title "1 of 3 sub-tasks still open"; three label names and "+2" with title "2 more labels"; "PR #12" as a link with "open"; "asked by Sample agent" with title "Queued by Sample agent, not by you"; "$1.50" in the signal colour with title "Agent cost on this card"; a meter (`role="meter"`, `aria-valuenow="75"`) titled "$1.50 of the $2.00 card cap"; "⚠ 2026-10-10". With `tone="text"` the same words appear without chips, and the meter becomes the text "75% of cap".
  - `StageList.svelte.test.ts`: for each variant, every stage's name, "count/wip" (signal when at limit), "⛔ N blocked" with the lane tooltip, "gate", "mgr", the owner label (with the "⚠ … nobody declares it" form and its caveat tooltip when undeclared), and "empty".
  - `CardMoveMenu.svelte.test.ts`: the button name, menu items for each stage, the current one disabled with "· here", choosing one calls `app.moveCard(id, key)` (mock the store) and announces "{title} moved to {stage}".

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Implement.**

`board/open-label.ts`:

```ts
export const openLabel = (s: { title: string; stageName: string }): string =>
  `${s.title}, in ${s.stageName}. Enter to open, M to move, Alt with left or right arrow to move between stages.`;

export function cardKeys(e: KeyboardEvent, h: { open(): void; toggleMove(): void; step(delta: -1 | 1): void }): void {
  if (e.key === 'Enter') { e.preventDefault(); h.open(); return; }
  if (!e.altKey && !e.metaKey && !e.ctrlKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); h.toggleMove(); return; }
  if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); h.step(e.key === 'ArrowLeft' ? -1 : 1); }
}
```

`board/CardMoveMenu.svelte`: move the move-control markup, `moveMenuOpen` (now the bindable `open` prop), `moveAnnouncement`, `moveTo` and the stage-step logic out of `CardTile.svelte` verbatim; add `export function step(delta: -1 | 1)` that moves to the neighbouring stage (the old Alt+arrow body). Props: `{ card: Card; stages: Stage[]; open?: boolean ($bindable) }`. `CardTile.svelte` then renders `<CardMoveMenu {card} stages={orderedStages} bind:open={moveMenuOpen} bind:this={mover} />` and its title button uses `onkeydown={(e) => cardKeys(e, { open: () => app.openCard(card.id), toggleMove: () => (moveMenuOpen = !moveMenuOpen), step: (d) => mover.step(d) })}` and `aria-label={openLabel({ title: card.title, stageName })}`. The tile's look and the e2e must not change.

`board/CardFacts.svelte` — the facts, always in this order, each only when it applies (exactly the tile's conditions):

```svelte
<script lang="ts">
  import type { CardSummary } from './card-summary';
  import { refLabel, safeHref, subStateClass, subStateLabel } from './ref-chip';
  import AgentFace from '$lib/components/AgentFace.svelte';
  let { s, tone = 'chips' }: { s: CardSummary; tone?: 'chips' | 'text' } = $props();
  const usd = (n: number) => `$${n.toFixed(2)}`;
  const sub = $derived(s.firstRef ? subStateLabel(s.firstRef) : null);
  const href = $derived(s.firstRef ? safeHref(s.firstRef.url) : null);
</script>

<ul class="card-facts flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" data-tone={tone} aria-label="Card facts">
  {#if s.priority > 0}<li class={s.priority === 1 ? 'text-signal-text font-semibold' : 'font-semibold'}><span aria-hidden="true">P{s.priority}</span><span class="sr-only">Priority {s.priority}</span></li>{/if}
  {#if s.live}<li class="text-success-text"><span class="live-dot" aria-hidden="true"></span> Agent working</li>{/if}
  {#if s.blocked}<li class={tone === 'chips' ? 'blk-pill' : 'text-signal-text'} title={s.blocked.tooltip}>{s.blocked.glyph} {s.blocked.label}</li>{/if}
  {#if s.children}<li class={tone === 'chips' ? 'child-pill' : ''} title="{s.children.open} of {s.children.total} sub-tasks still open">{s.children.open}/{s.children.total}</li>{/if}
  {#each s.labels as l (l.id)}<li class={tone === 'chips' ? 'lbl-pill' : ''} style={tone === 'chips' ? `--lbl:${l.colour || 'var(--vk-color-line)'}` : ''}>{l.name}</li>{/each}
  {#if s.moreLabels > 0}<li title="{s.moreLabels} more labels">+{s.moreLabels}</li>{/if}
  {#if s.firstRef}
    <li class={tone === 'chips' ? 'refchip' : ''}>
      {#if href}<a {href} target="_blank" rel="noopener noreferrer" class="underline-offset-2 hover:underline">{refLabel(s.firstRef)}</a>{:else}{refLabel(s.firstRef)}{/if}
      {#if sub}<span class={tone === 'chips' ? subStateClass(sub) : 'text-muted-foreground'}>{sub}</span>{/if}
    </li>
  {/if}
  {#if s.queuedBy}<li class={tone === 'chips' ? 'queuedchip inline-flex items-center gap-1' : ''} title="Queued by {s.queuedBy.name}, not by you"><AgentFace agentId={s.queuedBy.id} name={s.queuedBy.name} iconUrl={s.queuedBy.iconUrl} size={14} variant="portrait" /> asked by {s.queuedBy.name}</li>{/if}
  {#if s.cost > 0}<li class={s.overBudget ? 'text-signal-text' : 'text-muted-foreground'} title="Agent cost on this card">{usd(s.cost)}</li>{/if}
  {#if s.costPct !== null && s.cardCap !== null}
    {#if tone === 'chips'}
      <li class="costbar min-w-16" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={s.costPct} aria-label="Cost against the card cap" title="{usd(s.cost)} of the {usd(s.cardCap)} card cap"><span style="width:{s.costPct}%;background:{s.overBudget ? 'var(--vk-color-signal)' : 'var(--vk-color-success)'}"></span></li>
    {:else}
      <li title="{usd(s.cost)} of the {usd(s.cardCap)} card cap">{s.costPct}% of cap</li>
    {/if}
  {/if}
  {#if s.dueAt}<li class={s.overdue ? 'text-signal-text' : 'text-muted-foreground'}>{s.overdue ? '⚠ ' : '· '}{s.dueAt.slice(0, 10)}</li>{/if}
</ul>
```

(Reuse `.blk-pill`, `.child-pill`, `.lbl-pill`, `.refchip*`, `.queuedchip`, `.costbar` from `app.css`; if `.costbar`'s inner element is not a `span`, match it.)

`board/StageList.svelte`:

```svelte
<script lang="ts">
  import type { StageSummary } from './card-summary';
  let { stages, variant }: { stages: StageSummary[]; variant: 'lines' | 'strip' | 'table' } = $props();
  const blockedTip = (s: StageSummary) => `${s.blocked} of ${s.count} card${s.count === 1 ? '' : 's'} here ${s.blocked === 1 ? 'is' : 'are'} blocked — held back by an unresolved same-board blocker, excluded from claim`;
</script>

{#snippet facts(s: StageSummary)}
  <span class={s.atLimit ? 'text-signal-text' : 'text-muted-foreground'}>{s.count}{#if s.wipLimit !== null}/{s.wipLimit}{/if}</span>
  {#if s.blocked > 0}<span class="text-signal-text" title={blockedTip(s)}>⛔ {s.blocked} blocked</span>{/if}
  {#if s.gate}<span class="eyebrow text-signal-text">gate</span>{/if}
  {#if s.manager}<span class="eyebrow">mgr</span>{/if}
  {#if s.owner.undeclared}<span class="text-signal-text" title={s.owner.caveat}>⚠ {s.owner.label}</span>{:else}<span class="text-muted-foreground">{s.owner.label}</span>{/if}
  {#if s.empty}<span class="text-muted-foreground">empty</span>{/if}
{/snippet}

{#if variant === 'table'}
  <table class="w-full text-left text-sm">
    <caption class="sr-only">Stages</caption>
    <thead><tr><th scope="col">Stage</th><th scope="col">Cards and stage facts</th></tr></thead>
    <tbody>{#each stages as s (s.key)}<tr><th scope="row" class="py-1 pr-3 font-semibold">{s.name}</th><td class="flex flex-wrap gap-x-2 py-1">{@render facts(s)}</td></tr>{/each}</tbody>
  </table>
{:else}
  <ol class={variant === 'strip' ? 'flex gap-1 overflow-x-auto' : 'space-y-1'} aria-label="Stages">
    {#each stages as s, i (s.key)}
      <li class={variant === 'strip' ? 'bg-surface border-border min-w-[9rem] shrink-0 rounded-[var(--vk-radius-sm)] border p-2 text-xs' : 'flex flex-wrap items-baseline gap-x-2 text-sm'}>
        {#if variant === 'lines' && i > 0}<span aria-hidden="true">→</span>{/if}
        <span class="font-semibold">{s.name}</span>
        <span class="flex flex-wrap gap-x-2">{@render facts(s)}</span>
      </li>
    {/each}
  </ol>
{/if}
```

The words "gate", "mgr", the owner label forms and the blocked tooltip must equal `BoardKanban`'s (copy them from there if they differ from the above).

- [ ] **Step 4: Run** — the four new test files, `CardTile.test.ts`, `typecheck`, `playwright test e2e/board.spec.ts e2e/reachable.spec.ts e2e/mobile.spec.ts` (the tile still moves by menu, M and Alt+arrows).
- [ ] **Step 5: Commit** — `git commit -m "web: card facts, the move menu and the stage list, shared by every board layout"`

---

### Task 18: Paper's board, a front page

**Files:**
- Create: `board/layouts/BoardPaper.svelte`, `board/layouts/BoardPaper.svelte.test.ts`

**Interfaces:**
- Consumes: `BoardLayoutProps`, `groupByUrgency`, `CardFacts`, `CardMoveMenu`, `StageList`, `openLabel`, `cardKeys`, `AgentFace`, `Words`, `leadText`, `ageLabel`, `app.openCard`, `app.board.stages`.

- [ ] **Step 1: Write the failing test** — render with summaries in every urgency (2 needs: a gate and a question; 1 working; 1 queued; 6 done; 1 canceled) and stages; assert:
  - masthead: board name as H1; a line containing "in full daylight" for `phase: 'noon'` (the light words: dawn "first light", morning "morning light", noon "full daylight", golden "golden light", dusk "evening light", night "lamplight"); "Superpipeline · 11 cards";
  - "Waiting on you · 2 letters" (H2); each letter has the card title, the lead sentence in quotes, the agent's name, the age, the tile action button ("⚑ Review" / "⚑ Answer {agent}") and the open button whose name equals `openLabel(s)`;
  - "In progress" and "Coming up" H2 sections with their cards, each with `CardFacts` and the move button;
  - "Shipped" shows 5 and a "Show all 6 shipped" disclosure that reveals the sixth; "Show 1 closed" reveals the canceled card;
  - "The pipeline" H2 with `StageList` lines;
  - "Write a new card" button calls `onCompose`.

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Implement** with this structure (all classes are Tailwind on vibekit tokens; Paper's serif is `font-display`, its voice `.agent-voice`):

```
<div class="paper-board mx-auto max-w-[1200px] px-4 py-6">
  <header class="border-b-2 border-[var(--vk-color-text)] pb-3">
    <h1 class="font-display text-3xl">{boardName}</h1>
    <p class="text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}, in {LIGHT_WORDS[phase]}</p>
    <p class="eyebrow">Superpipeline · {cardCount} cards</p>
  </header>
  <div class="mt-6 grid gap-8 lg:grid-cols-3">
    <section aria-labelledby="pp-wait">                      // column 1
      <h2 id="pp-wait" class="eyebrow text-signal-text">● Waiting on you · {needs.length} letter(s)</h2>
      {#if needs.length === 0}<p>Nothing waits on you.</p>{/if}
      {#each needs as s (s.id)}
        <article class="letter border-b border-border py-4">
          <h3 class="font-display text-lg"><button class="text-left hover:underline" aria-label={openLabel(s)} onclick={() => app.openCard(s.id)} onkeydown={(e) => cardKeys(e, …)}>{s.title}</button></h3>
          <p class="agent-voice mt-1">“<Words text={leadText(s.lead, vibe)} />”</p>
          <p class="mt-2 flex items-center gap-2 text-sm">
            {#if s.delegate}<AgentFace … size={24} variant="portrait" withName />{/if}
            <span class="text-muted-foreground">{ageLabel(s.ageHours)}</span>
          </p>
          <CardFacts {s} tone="chips" />
          <div class="mt-2 flex flex-wrap items-center gap-2">
            {#if s.questionFrom}<button class="vk-button vk-button--signal" onclick={() => app.openCard(s.id)}>⚑ Answer {s.questionFrom}</button>
            {:else if s.gatePending}<button class="vk-button vk-button--signal" onclick={() => app.openCard(s.id)}>⚑ Review</button>
            {:else}<button class="vk-button vk-button--secondary" onclick={() => app.openCard(s.id)}>Open</button>{/if}
            <CardMoveMenu card={s.card} {stages} bind:open={menus[s.id]} bind:this={movers[s.id]} />
          </div>
        </article>
      {/each}
    </section>
    <section aria-labelledby="pp-progress">                  // column 2
      <h2 id="pp-progress" class="eyebrow">In progress</h2>   {#each working …} entry(s) {/each}  (empty: "Nothing in progress.")
      <h2 class="eyebrow mt-6">Coming up</h2>                 {#each queued …} entry(s) {/each}   (empty: "Nothing coming up.")
    </section>
    <section aria-labelledby="pp-shipped">                   // column 3
      <h2 id="pp-shipped" class="eyebrow">Shipped</h2>        first 5 of done (newest first by stateSince) as entry(s)
      {#if done.length > 5}<details><summary>Show all {done.length} shipped</summary> rest as entry(s) </details>{/if}
      {#if closed.length}<details><summary>Show {closed.length} closed</summary> closed as entry(s) </details>{/if}
      <div class="bg-raised mt-6 rounded-[var(--vk-radius-md)] p-4">
        <button class="font-display text-lg" onclick={onCompose}>Write a new card</button>
        <p class="text-muted-foreground text-sm">Describe it in a sentence; an agent drafts the brief.</p>
      </div>
    </section>
  </div>
  <section aria-labelledby="pp-pipeline" class="mt-10 border-t border-border pt-4">
    <h2 id="pp-pipeline" class="eyebrow">The pipeline</h2>
    <StageList stages={stageSummaries} variant="lines" />
  </section>
</div>
```

`entry(s)` is a snippet: title button (same `aria-label={openLabel(s)}` and `cardKeys`), a line "*{agent}* · {stageName}" (italic agent name; "nobody" when no delegate), `<CardFacts {s} tone="chips" />`, the tile's action button when `s.questionFrom`/`s.gatePending`, and `<CardMoveMenu>`. `stages` (for the move menu) is `[...app.board!.stages].sort((a,b)=>a.order-b.order)`; the summaries' stage facts come from the `stages` prop (rename the prop locally to `stageSummaries` to avoid the clash). `menus`/`movers` are `$state<Record<string, …>>({})`. Archived cards appear only when the filter shows them (they arrive in `summaries`; put them in their urgency group with an "archived" chip).

Responsive: one column below 1024px, in the order waiting → in progress → coming up → shipped → pipeline.

- [ ] **Step 4: Run** — the test, the parity test (`BoardPaper` must render `<CardFacts`, `<CardMoveMenu`, `<StageList`, `openLabel(`), `typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "web: Paper's board is a front page: letters that wait on you, then in progress and shipped"`

---

### Task 19: Paper's gate and question, and the panel contracts

**Files:**
- Create: `card/gate/gate-panel.contract.ts`, `card/question/question-panel.contract.ts`, `card/gate/GatePaper.svelte`, `card/gate/GatePaper.svelte.test.ts`, `card/question/QuestionPaper.svelte`, `card/question/QuestionPaper.svelte.test.ts`
- Modify: `card/gate/GateDaylight.svelte.test.ts`, `card/question/QuestionDaylight.svelte.test.ts` (run the contracts too)

**Interfaces:**
- Produces: `gatePanelContract(Component, { decision: 'button' | 'radio'; submit?: string })` and `questionPanelContract(Component, { decision: 'button' | 'radio'; submit?: string })` — `describe` blocks any panel test calls.

- [ ] **Step 1: Write the contracts** (they are the parity spec for every panel, spec §5.3):

`gate-panel.contract.ts`:

```ts
// @vitest-environment jsdom
import type { Component } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';

export const resolveGate = vi.fn();
vi.mock('$lib/api', () => ({ resolveGate: (...a: unknown[]) => resolveGate(...a) }));

const subject = { id: 'sub_1', digest: '3f9ac21e77aa', schema: 's', revision: 4, canonical: { post: 'Hello' } };
const props = (over: Record<string, unknown> = {}) => ({
  boardId: 'brd_1',
  gate: { id: 'gat_1', options: [], approvalSubject: subject, stageKey: 'review' },
  error: null,
  onResponse: vi.fn(async () => true),
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' },
  lead: { kind: 'review', needsYou: true, agentId: 'agt_r', sentence: 'Draft ready.', source: 'gate', at: null },
  vibe: 'daylight',
  ...over,
});

export function gatePanelContract(C: Component<any>, o: { decision: 'button' | 'radio'; submit?: string }): void {
  const choose = async (name: string) => {
    await fireEvent.click(screen.getByRole(o.decision, { name }));
    if (o.decision === 'radio') await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
  };
  describe('gate panel contract', () => {
    it('shows the heading, the lead, the subject, the seal and the note', () => {
      render(C, props());
      expect(screen.getByText(/awaiting your review/)).toBeTruthy();
      expect(screen.getByText('Draft ready.')).toBeTruthy();
      expect(screen.getByText(/Immutable approval subject · revision 4/)).toBeTruthy();
      expect(screen.getByText('sub_1')).toBeTruthy();
      expect(screen.getByText('3f9ac21e77aa')).toBeTruthy();
      expect(screen.getByText(/"post": "Hello"/)).toBeTruthy();
      expect(screen.getByText(/sealed 3f9a·c21e/)).toBeTruthy();
      const note = screen.getByLabelText('Add a note (optional)');
      expect(note.getAttribute('id')).toBe('gate-note-gat_1');
      expect(note.getAttribute('maxlength')).toBe('8192');
      expect(screen.getByText('0 / 8192')).toBeTruthy();
    });
    it('offers every option', () => {
      render(C, props());
      for (const n of ['Approve', 'Request changes', 'Reject']) expect(screen.getByRole(o.decision, { name: n })).toBeTruthy();
    });
    it('Request changes needs a note', async () => {
      resolveGate.mockReset();
      render(C, props());
      await choose('Request changes');
      expect(resolveGate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Say what needs to change').getAttribute('aria-invalid')).toBe('true');
    });
    it('the note travels with the decision', async () => {
      resolveGate.mockReset().mockResolvedValue({ ok: true });
      render(C, props());
      await fireEvent.input(screen.getByLabelText('Add a note (optional)'), { target: { value: 'checked' } });
      await choose('Approve');
      expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked', subject);
    });
    it('shows the gate error as an alert', () => {
      render(C, props({ error: 'Gate already decided (409)' }));
      expect(screen.getByRole('alert').textContent).toContain('Gate already decided (409)');
    });
    if (o.decision === 'radio') {
      it('asks for a choice before sending', async () => {
        resolveGate.mockReset();
        render(C, props());
        await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
        expect(screen.getByText('Pick a decision first.')).toBeTruthy();
        expect(resolveGate).not.toHaveBeenCalled();
      });
    }
  });
}
```

`question-panel.contract.ts` follows the same pattern for a question with options `[{run_them, 'Run the tests'}, {skip, 'Skip them'}]` and one without options: heading "awaiting your answer" ("awaiting your sign-in" for `signal: 'auth'`), "{agent} is waiting", the question text, every option by `o.decision`, the note textbox named "Add a note for the agent (optional)" (Quiet: "Note for Sample agent (optional)" — the contract takes `noteLabel` as an option, default the Daylight one), choosing "Run the tests" sends `option: 'run_them'`; without options, a textbox "Your answer" and "Send answer"; an empty send shows "Type an answer first." / "Pick one of the options.".

Call `gatePanelContract(GateDaylight, { decision: 'button' })` and `questionPanelContract(QuestionDaylight, { decision: 'button' })` from the Daylight tests; they must pass before you write Paper's.

- [ ] **Step 2: Write Paper's tests** — `GatePaper.svelte.test.ts`: `gatePanelContract(GatePaper, { decision: 'radio', submit: 'Send reply' })` plus: the frame reads "Re: approval" and the subject sits in a block labelled "The version you are approving". `QuestionPaper.svelte.test.ts`: `questionPanelContract(QuestionPaper, { decision: 'radio', submit: 'Send reply' })` plus "Your reply" heading.

- [ ] **Step 3: Run to see Paper's fail.**

- [ ] **Step 4: Implement** `GatePaper.svelte` over `GateDecisionModel` (same `follow`, `noteEl`, counter, `aria-invalid`), structure:

```
<section class="sec paper-gate" aria-labelledby="gate-h-{gate.id}">
  <h3 id="gate-h-{gate.id}" class="eyebrow text-signal-text">⚑ awaiting your review</h3>
  <p class="font-display mt-1 text-lg">Re: approval</p>
  <p class="agent-voice mt-2"><Words text={leadText(lead, vibe)} /></p>
  {#if error}<p role="alert" …>{error}</p>{/if}
  {#if gate.approvalSubject}
    <figure class="mt-3 border-l-2 border-[var(--vk-color-line)] pl-3" aria-label="The version you are approving">
      <figcaption class="text-sm">Immutable approval subject · revision {rev}</figcaption>
      <div class="mono text-xs break-all">{id}</div><div class="mono text-xs break-all">{digest}</div>
      <pre class="mono mt-2 max-h-64 overflow-auto text-xs whitespace-pre-wrap">{canonical JSON}</pre>
      <p class="mt-1 text-xs">Approving exactly this version · sealed {sealOf(digest)}</p>
    </figure>
  {/if}
  <fieldset class="mt-4">
    <legend class="font-display">Your reply</legend>
    {#each model.options as opt (opt.name)}
      <label class="flex min-h-[var(--vk-target-min)] items-center gap-3"><input type="radio" name="gate-{gate.id}" value={opt.name} bind:group={model.selected} class="size-5" /> {opt.title}</label>
    {/each}
    {#if model.needPick}<p class="text-signal-text text-sm" role="status">Pick a decision first.</p>{/if}
    <label for="gate-note-{gate.id}" …>{model.needNote ? 'Say what needs to change' : 'Add a note (optional)'}</label>
    <textarea id="gate-note-{gate.id}" … (same attributes as Daylight) …></textarea>
    <div class="mono text-right text-[11px]">{model.note.length} / {GATE_NOTE_MAX}</div>
    <button type="button" class="vk-button vk-button--primary mt-2" disabled={model.busy} onclick={() => model.submit()}>Send reply</button>
  </fieldset>
</section>
```

`QuestionPaper.svelte` mirrors it over `QuestionAnswer`: wrapper keeps the class `elicitation`; heading "⚑ awaiting your answer|sign-in", "{agent} is waiting", the question as `.agent-voice` paragraph, then a `fieldset` "Your reply" with one radio per option (`bind:group={model.selected}`), the note textarea (`aria-label="Add a note for the agent (optional)"`), and "Send reply" calling `model.submit()`; with no options, the textarea `aria-label="Your answer"` and "Send answer" calling `model.send()`. `model.error` as `role="alert"`.

- [ ] **Step 5: Run** — the four panel tests PASS.
- [ ] **Step 6: Commit** — `git commit -m "web: one contract for every gate and question panel; Paper answers as a reply"`

---

### Task 20: Paper's card, a letter with enclosures, and ship Phase 2

**Files:**
- Create: `card/layouts/CardPaper.svelte`, `card/layouts/CardPaper.svelte.test.ts`
- Modify: `layouts.ts`, `layouts.test.ts`, `e2e/vibes.spec.ts`

- [ ] **Step 1: Write the failing test** — fake section snippets as in Task 13; assert the order: error, the "● A letter that needs a reply" eyebrow (only when `lead.needsYou`), H2 `#drawer-title` "Re: {title}", "Dear {personName},", the lead paragraph, the signature (agent name, "delegate", time), status and facts, then "Your reply" (the gate/question/resume), then the five enclosures as `<details>` whose summaries read "The brief · {counts.criteria} things to prove", "What happened · {counts.runs} runs", "Who is waiting · {counts.links + counts.children}", "Attached · {counts.refs}", "Correspondence"; "Correspondence" is open by default; "The brief" is open when nothing needs you; every `SECTION-<key>` appears once (parity test covers it too); edit button and card actions in the footer.

- [ ] **Step 2: Run to see it fail.**

- [ ] **Step 3: Implement** `CardPaper.svelte`:

```
<div class="flex-none px-6 pt-5 pr-12">                                   // header
  <p class="text-muted-foreground text-sm">‹ {boardName} · in {LIGHT_WORDS[phase]}</p>
  {#if lead.needsYou}<p class="eyebrow text-signal-text mt-2">● A letter that needs a reply</p>{/if}
  {#if editing}{@render sections.editForm()}{:else}<h2 id="drawer-title" class="font-display mt-1 text-2xl">Re: {card.title}</h2>{/if}
</div>
<div class="min-h-0 flex-1 overflow-y-auto px-6 py-4" style="overflow-wrap:anywhere">
  {@render sections.error()}
  <article class="letter agent-voice text-[17px] leading-relaxed">
    <p>Dear {personName},</p>
    <p class="mt-3"><Words text={leadText(lead, vibe)} /></p>
    <footer class="mt-4 flex items-center gap-2 not-italic">
      {#if agent.id}<AgentFace agentId={agent.id} name={agent.name} iconUrl={agent.iconUrl} mood={agent.mood} size={32} variant="portrait" />{/if}
      <span class="font-body text-sm"><b>{agent.name}</b> · delegate{#if lead.at} · <time datetime={lead.at}>{time}</time>{/if}</span>
    </footer>
  </article>
  <div class="mt-3 text-sm">{@render sections.status()}{@render sections.facts()}</div>
  <section class="mt-6" aria-label="Your reply">
    {#if question}<QuestionPaper … />{:else if gate}<GatePaper … />{/if}
    {@render sections.resume()}
  </section>
  <h3 class="eyebrow mt-8">Enclosed</h3>
  <details open={!lead.needsYou}><summary>The brief · {counts.criteria} things to prove</summary>
    {@render sections.description()} {@render sections.criteria()} {@render sections.plan()} {@render sections.details()} {@render sections.project()}</details>
  <details><summary>What happened · {counts.runs} runs</summary>
    {@render sections.activity()} {@render sections.decisions()} {@render sections.handoff()} {@render sections.attempts()} {@render sections.cost()}</details>
  <details><summary>Who is waiting · {counts.links + counts.children}</summary>
    {@render sections.links()} {@render sections.subtasks()}</details>
  <details open={counts.deliveryActive}><summary>Attached · {counts.refs}</summary>
    {@render sections.references()} {@render sections.related()} {@render sections.delivery()}</details>
  <details open><summary>Correspondence</summary>{@render sections.comments()}</details>
  <footer class="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-4">{@render sections.editButton()}{@render sections.cardActions()}</footer>
</div>
```

`phase` and `counts.deliveryActive` come from `CardLayoutProps` (Task 12); `LIGHT_WORDS` from `copy.ts` (Task 8). Each `<summary>` is `min-h-[var(--vk-target-min)]` with a visible focus ring.

- [ ] **Step 4: Register and extend the e2e.** `layouts.ts`: `paper: BoardPaper` and `paper: { component: CardPaper, panel: 'sm:max-w-[680px] sm:mx-auto sm:border-r' }` with `align: 'center'` (the shell centres the sheet; Task 12 added `align`). `layouts.test.ts`: `expect(BOARD_LAYOUTS.paper).toBe(BoardPaper)`, `expect(CARD_LAYOUTS.paper.component).toBe(CardPaper)`. `e2e/vibes.spec.ts`: `LAYOUT_VIBES = ['daylight', 'paper']`, `RADIO_DECISIONS = new Set(['paper'])`.

- [ ] **Step 5: Run** — the card test, the parity test, `layouts.test.ts`, full web unit, `typecheck`, full e2e (vibes.spec now exercises Paper's own layouts).
- [ ] **Step 6: Commit and ship** — `git commit -m "web: Paper's card is a letter from the agent, with the brief and the history as enclosures"`; then run Task 16 Steps 1, 5 and 6 for branch `feat/vibes-phase-2`.

---

# Phase 3 — Studio

### Task 21: Studio's board, a dense table

**Files:**
- Create: `board/layouts/BoardStudio.svelte`, `board/layouts/BoardStudio.svelte.test.ts`

- [ ] **Step 1: Write the failing test** — with the same fixture as Task 18, assert: a top bar with the board name, the product chip text "SUPERPIPELINE", filter buttons "All 11", "Needs 2", "Working 1", "Idle 1", "Done 6" (`aria-pressed`; "Idle" = queued; "Done" = done + closed), clicking "Needs" leaves 2 rows; a readout "12:00 MIDDAY" for a fixed clock (`greeting(phase, 'studio')` gives the phase word); metric tiles "cards", "needs you", "working", "spend 7d" (from `app.board.usage` — if the summary does not carry it, pass `usage` through `BoardLayoutProps`, adding the field), "over budget", "overdue"; a `StageList variant="strip"`; a `<table>` with a `<caption>` "Cards" and column headers Status, Card, Agent, Stage, Attempts, Age, Next, Cost, Due, Move; each row: a status light (`.status-led` with `data-mood`), the title button named `openLabel(s)`, `CardFacts tone="chips"`, the agent (`AgentFace variant="light" withName`), a `StageTrack` for that card (`stages` names, `current = s.stageIndex`, `stopped = s.urgency === 'needs'`), `attemptCount`, `ageLabel(s.ageHours)`, the next cell (the attention instruction, or `auto · {state}`, plus the tile's ⚑ button when it applies), cost, due, and `CardMoveMenu`.

- [ ] **Step 2: Run to see it fail.**
- [ ] **Step 3: Implement** the structure above. Light colours: needs → signal (blinks via `data-blink`, stopped by the reduce tier), working → success, queued → faint, done/closed → primary. Row highlight for needs: `bg-signal-wash`. Phone (below 768px): the table switches to stacked rows with CSS (`display:block` on `tr`, each `td` shows `attr(data-label)` as a small label via `::before`); the header row is visually hidden but kept (`sr-only`), so nothing is lost. Numbers and the readout use `font-mono`.
- [ ] **Step 4: Run** — test, parity, `typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "web: Studio's board is a table with a light, a stage track and the next step per card"`

---

### Task 22: Studio's gate and question

**Files:**
- Create: `card/gate/GateStudio.svelte` (+ test), `card/question/QuestionStudio.svelte` (+ test)

- [ ] **Step 1: Tests** — `gatePanelContract(GateStudio, { decision: 'button' })` plus: a readout line "{AGENT} · NEEDS DECISION" (uppercase via CSS only: the DOM text is "Sample agent · needs decision"; assert the text and the class `uppercase`); the note is a single-line-looking textarea (`rows="1"`, auto-grows) on a `.command-bar`. `questionPanelContract(QuestionStudio, { decision: 'button', noteLabel: 'Note to Sample agent' })` plus the `.elicitation` class on the wrapper.
- [ ] **Step 2: Run to see them fail.**
- [ ] **Step 3: Implement.** `GateStudio`: `<section>` with the readout (`.status-led data-mood="needs"` + `<span class="uppercase font-mono">{agent.name} · needs decision</span>`), the lead in `font-mono`, the error alert, the subject in a mono block with the seal line, then a `.command-bar` (`position: sticky; bottom: 0` on all sizes; `bg-surface`, top border) holding the note (`<label for="gate-note-{id}">` with the same two label texts; `<textarea rows="1" class="font-mono">` that grows to 6 rows), the counter, and one `vk-button` per option ordered Request changes, Reject, approve options (primary). `QuestionStudio`: the same frame; options as buttons on the command bar after a note input labelled "Note to {agent}"; no options → the answer textarea + "Send answer".
- [ ] **Step 4: Run** — both PASS.
- [ ] **Step 5: Commit** — `git commit -m "web: Studio decides from a command bar"`

---

### Task 23: Studio's card, a dashboard with tabs, and ship Phase 3

**Files:**
- Create: `card/layouts/CardStudio.svelte`, `card/layouts/CardStudio.svelte.test.ts`, `components/Tabs.svelte`, `components/Tabs.svelte.test.ts`
- Modify: `layouts.ts`, `layouts.test.ts`, `e2e/vibes.spec.ts`

**Interfaces:**
- Produces: `<Tabs label tabs={[{ id, label }]} bind:active>{#snippet panel(id)}…{/snippet}</Tabs>` implementing the APG tabs pattern: `role="tablist"` with `aria-label`, each `role="tab"` with `aria-selected`, `aria-controls`, roving `tabindex`, Left/Right/Home/End; panels `role="tabpanel"` with `aria-labelledby`, inactive ones `hidden`.

- [ ] **Step 1: Write the failing tests.** `Tabs.svelte.test.ts`: arrows move focus and selection, Home/End, only the active panel is visible, every panel stays in the DOM (`hidden`). `CardStudio.svelte.test.ts`: header bar "‹ {boardName} / {card.id.slice(-4)}" and a readout; H2 `#drawer-title`; stat tiles "stage {i+1}/{n}", "attempts {card.attemptCount}", "{state} for {age}", "cost $x" (and "/ $est" when the cost section knows it — the tile shows only `card.costUsd`; the estimate stays in the Cost tab), "blocks {counts.links}", "sub-tasks {openChildren}/{children}"; a `StageTrack`; the readout lead; the status row and edit button above the tabs; tabs "Spec", "Log {counts.runs}", "Links {counts.links + counts.children + counts.refs}", "Talk", "Cost"; Spec holds description, criteria, plan, details, project, facts; Log holds activity, decisions, handoff, attempts; Links holds links, subtasks, references, related; Talk holds comments; Cost holds cost and delivery; card actions after the tabs (once — the parity test counts it); the command bar (`GateStudio`/`QuestionStudio`/resume) is last in the DOM.
- [ ] **Step 2: Run to see them fail.**
- [ ] **Step 3: Implement** `Tabs.svelte` and `CardStudio.svelte` per the test. The tablist sits in the scrolling body; the command bar is `sticky bottom-0` at the end of the body. Panel width from `CARD_LAYOUTS.studio.panel = 'sm:max-w-[760px]'`. `facts` goes in Spec (so it renders once).
- [ ] **Step 4: Register and extend the e2e.** `layouts.ts`: `studio: BoardStudio`, `studio: { component: CardStudio, panel: 'sm:max-w-[760px]', align: 'end' }`; `layouts.test.ts` likewise; `e2e/vibes.spec.ts`: `LAYOUT_VIBES` adds `'studio'` (decisions stay buttons). The reachability helper already walks tabs.
- [ ] **Step 5: Run** — unit, parity, `typecheck`, full e2e.
- [ ] **Step 6: Commit and ship** — `git commit -m "web: Studio's card is a dashboard: stats, a readout, Spec/Log/Links/Talk/Cost and a command bar"`; Task 16 Steps 1, 5, 6 for `feat/vibes-phase-3`.

---

# Phase 4 — Quiet

### Task 24: Quiet's board, one list by urgency

**Files:**
- Create: `board/layouts/BoardQuiet.svelte`, `board/layouts/BoardQuiet.svelte.test.ts`

- [ ] **Step 1: Test** — H1 board name; "Superpipeline · 11 cards"; a "New card" button (calls `onCompose`; it is a second entry point beside the header's, same name is fine because both do the same thing — if `getByRole` strictness in e2e complains, name this one "Write a new card"); H2 sections "Needs your decision (2)", "In progress (1)", "Waiting to start (1)", "Done (6)", "Closed (1)", in that order, from `groupByUrgency` (`needs, working, queued, done, closed`); an empty group shows "None."; each item: the title button (`openLabel`), a meta line "{agent or 'nobody'} · {stageName} · {ageLabel}", `CardFacts tone="text"`, the action ("Decide" for a gate → opens the card and has accessible name "⚑ Review"; "Answer" → name "⚑ Answer {agent}"; otherwise "Open" with name "Open {title}"), and `CardMoveMenu`; needs-you items carry a 5px signal rule on the left (`border-l-[5px] border-signal pl-3.5`); a "Stages" H2 with `StageList variant="table"` at the end. No glyph animation; no faces (names only).
- [ ] **Step 2–4:** fail, implement (visible text "Decide"/"Answer"/"Open" with `aria-label` carrying the shared names so e2e and screen readers agree), pass with parity and `typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "web: Quiet's board is one plain list, grouped by what needs a decision"`

---

### Task 25: Quiet's gate and question

**Files:**
- Create: `card/gate/GateQuiet.svelte` (+ test), `card/question/QuestionQuiet.svelte` (+ test)

- [ ] **Step 1: Tests** — `gatePanelContract(GateQuiet, { decision: 'radio', submit: 'Submit decision' })` plus: a `fieldset` whose `legend` is "Your decision is needed", each radio's description (Approve: "The card moves on to the next stage."; Request changes: "The agent tries again with your note."; Reject: "The card stops here."; approve_manual: "You post the approved text yourself."; approve_automatic: "The board posts the approved text for you."). `questionPanelContract(QuestionQuiet, { decision: 'radio', submit: 'Submit decision', noteLabel: 'Note for Sample agent (optional)' })` plus the `elicitation` class and the legend "Your decision is needed".
- [ ] **Step 2: Run to see them fail.**
- [ ] **Step 3: Implement.** `GateQuiet`: no colour fills; a `fieldset` (`border-2 border-[var(--vk-color-text)] p-4`) with `legend` "Your decision is needed", "⚑ awaiting your review" as a plain line, the lead paragraph, the error alert, the subject block (plain mono, same fields, seal line), then each option as `<label class="flex min-h-[var(--vk-target-min)] gap-3"><input type="radio" …><span><b>{title}</b><br><span class="text-muted-foreground">{description}</span></span></label>`, the note (same id/labels/counter), "Pick a decision first." when `needPick`, and `<button class="vk-button vk-button--primary">Submit decision</button>`. `QuestionQuiet` mirrors it over `QuestionAnswer` (radios bound to `model.selected`; no options → textarea "Your answer" + "Send answer").
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -m "web: Quiet decides with a plain form: radio options, a note, one submit"`

---

### Task 26: Quiet's card, one page, and ship Phase 4

**Files:**
- Create: `card/layouts/CardQuiet.svelte`, `card/layouts/CardQuiet.svelte.test.ts`
- Modify: `layouts.ts`, `layouts.test.ts`, `e2e/vibes.spec.ts`

- [ ] **Step 1: Test** — "← {boardName} board" (a button that closes the drawer); H2 `#drawer-title` title; the meta line "Stage {i+1} of {n}: {stageName} · Agent: {agent.name} · {state} {age} ago" (omit "· {age} ago" when unknown); when `lead.needsYou`: the decision panel (`GateQuiet`/`QuestionQuiet`) or, for stopped/failed/budget, a `fieldset` "Your decision is needed" around the lead paragraph and `sections.resume`; then H3 sections in this order, each containing its snippet: Details (status, facts, edit button), Description, Acceptance criteria, Plan, History (activity), Decisions, Comments, Links, Sub-tasks, Project, Handoff, Cost, Attempts, Delivery, References, Related prior work, Card actions; no `<details>` added by the layout; the error banner first. When nothing needs you, the resume snippet still renders (it decides its own visibility) inside Details.
- [ ] **Step 2: Run to see it fail.**
- [ ] **Step 3: Implement** with plain `<section aria-labelledby>` + `<h3>` per item, `max-w-[640px]`, Atkinson body type from the vibe, no motion.
- [ ] **Step 4: Register and extend the e2e.** `layouts.ts`: `quiet: BoardQuiet`, `quiet: { component: CardQuiet, panel: 'sm:max-w-[640px]', align: 'end' }`; `layouts.test.ts`; `e2e/vibes.spec.ts`: `LAYOUT_VIBES` adds `'quiet'`, `RADIO_DECISIONS = new Set(['paper', 'quiet'])`.
- [ ] **Step 5: Run** — unit, parity, `typecheck`, full e2e.
- [ ] **Step 6: Commit and ship** — `git commit -m "web: Quiet's card is one plain page: the decision first, then every fact under a heading"`; Task 16 Steps 1, 5, 6 for `feat/vibes-phase-4`.

---

## CI and deploy notes

- **What must be green:** `test` (`pnpm typecheck && pnpm test` for the whole workspace) and `e2e` (`pnpm --filter @superpipeline/web e2e`, now including `appearance.spec.ts` and `vibes.spec.ts`). `deploy` needs both. On Forge only `test` and `e2e` run.
- **Lockfile:** Task 1 changes `pnpm-lock.yaml` (the tarball and `@axe-core/playwright`). CI installs with `--frozen-lockfile`, so the lockfile must be committed with `package.json`.
- **Deploy path:** merge on Forge `main` → push mirror → GitHub Actions `deploy` (D1 migrate, `wrangler deploy --var DEV_AUTH:false` of `superpipeline-api`, which serves `apps/web/build`). Never deploy by hand.
- **Verify live:** Task 16 Step 6 (health, `_app/version.json` changed, the deploy job green on the merge commit, `vk_appearance` in the shipped HTML, no Google Fonts).
- **Screenshots:** in the `playwright-report` artifact of the `e2e` job (Task 15).
- **vibekit upgrades:** a new tarball, the dependency path, `pnpm install`, and `head-script.test.ts` tells you if `app.html`'s `HEAD_SCRIPT` copy must be re-pasted.

## Self-review (done while writing)

- **Spec coverage:** §3.1 Task 1; §3.2 Task 2; §3.3 Tasks 2–3; §3.4 Tasks 1, 5; §3.5 Tasks 8, 12; §3.6 Task 7; §3.7 Task 4; §4.1–4.2 Tasks 2–3; §4.3 Task 14; §5.1 Tasks 8–9, 18, 21, 24; §5.2 Tasks 12–13, 20, 23, 26; §5.3 Tasks 10–11, 19, 22, 25; §6 Task 6; §7 enforced by `layout-parity.test.ts` (Task 12), the panel contracts (Task 19), `CardFacts`/`StageList` tests (Task 17) and `vibes.spec.ts` (Task 15); §8 Tasks 5, 15, 16; §9 throughout; §10 Tasks 16, 20, 23, 26.
- **No API change:** nothing touches `apps/api` or `packages/contract`. Reconnect uses the existing `/auth/login`.
- **Names that must not move** are listed in the Global Constraints, and every panel contract asserts them.
- **Known judgment calls for the implementer:** exact class lists may follow today's markup where this plan's differ (the plan says so at each spot); `plan.ts`'s parser for the step count; `CardComments`' composer gets an `aria-label` if it has none.
