# Page Composition Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every SuperPipeline surface becomes one composition that follows the contract, with the four vibes applied as tokens plus a bounded signature slot, and live changes animated instead of repainted.

**Architecture:** Part A extends two vibekit components (Masthead's live toggle, StageTrack's per-stage counts) and releases 0.0.20. Part B rebuilds the web app page by page: a shared shell, then Inbox, Board, Card, Crew, Settings and the secondary surfaces, each replacing its per-vibe forks in `src/lib/layouts.ts` with one view component, and finishes with composition guards that fail when a rule is broken. Live data moves from "refetch the snapshot on every event" to "apply a diff", with one socket per board in scope and a pause toggle.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, vitest + @testing-library/svelte, Playwright, vibekit-ui (tokens, components, motion), pragmatic-drag-and-drop, Cloudflare Workers API (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-18-page-composition-contract-design.md` (mockups in `docs/superpowers/specs/2026-11-18-page-composition-contract/`).

## Global Constraints

- Delivery: one draft PR in superpipeline (forge #114, branch `design/composition-contract`), one commit per task; one PR in vibekit for Part A. Forge-primary: never push to or open PRs on the GitHub mirror. Check `pr-state` before each push.
- Before each push run what CI runs (superpipeline: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm ci:test`, `pnpm lint`, the build, smoke and e2e projects per `.github/workflows/ci.yml`; vibekit: `pnpm verify`, `pnpm test:stories`, `pnpm test:pixels`, `pnpm test:phone`). Snapshots under `env -i PATH="$PATH" HOME="$HOME" CI=true pnpm test`.
- No skipped tests. Characterization test before any restructure; prove it can fail by reverting.
- Product words only in shipped code and copy: "workspace", never a local agent or host name. Fixture names are fine.
- Vibe parity: the same DOM order and text in all four vibes outside a region marked `data-signature`; the signature region may hold only the headline block, section-header ordinals and the scope control's form.
- Motion: every animation comes from vibekit's motion suite (`.vk-enter`, `.vk-exit`, `.vk-flash`, `.vk-bump`, `countUp`, `flashOnChange`, `bumpOnChange`, `flip`, `rise`, `fade`); under `data-motion="reduce"` a refresh produces zero running animations.
- Breakpoints stay `PHONE_QUERY = '(max-width: 899.98px)'` for the shell and board, `NARROW_QUERY = '(max-width: 639.98px)'` for the card. Phone is a breakpoint of the one layout, never a second file.
- Every retired `e2e/pixel/` reference is removed in the same commit as the surface it guarded, with a `Reference-Change: composition contract, <surface>` trailer; every visible change carries a `Visual-Change: composition contract, <surface>` trailer.
- Loading states: skeleton after 150 ms, `SLOW_COPY` with Retry after `SLOW_MS` (8000 ms), never a skeleton as the resting state.
- Versions continue the tag series: vibekit v0.0.20; superpipeline changes go under `## Unreleased` in `CHANGELOG.md`.

## Review Focus

1. A card deep-linked in board B while board A is remembered in `localStorage` must load its comments, estimate and history from board B, never from A. (Task B1 test `loads nothing until the route's board is the open board`.)
2. A refresh that arrives while the Inbox is paused must not be lost: resuming applies every queued diff in order and the counts end equal to a fresh load. (Task B8 test `queued diffs replay in order and match a fresh snapshot`.)
3. An Inbox with 548 notifications and 18 needs must stay under three screens at 1440×900 and never render more than 20 activity items without a "Show more". (Task B3 and Task B16 e2e `inbox height budget`.)
4. A seven-stage board at 1008 px wide, with names like "Messaging approval", must show every stage name in full in every vibe, with no ellipsis. (Task A2 test `names every stage in full in every vibe` and Task B16 `track never truncates`.)
5. A card whose stage requires a decision must open the gate panel in place of the state sentence and still show the brief and artifacts below it. (Task B12 test `review opens the decision panel in place of the state sentence`.)

---

# Part A: vibekit 0.0.20

Repo `/Users/rakeshgangwar/SuperJackfruit/vibekit`, branch `feat/live-toggle-and-track-counts` from `main`, one PR on the forge. Releasing to npm needs the operator's tag; until then Part B consumes `pnpm pack` output (Task B4).

### Task A1: Masthead live toggle

**Files:**
- Modify: `src/lib/components/LiveDot.svelte`, `src/lib/components/masthead/types.ts`, `src/lib/components/masthead/MastheadBody.svelte`, `src/lib/styles/components/masthead.css`
- Modify: `src/stories/cases/masthead.ts`, `references/src/Masthead/{daylight,paper,studio,quiet}.html` and `.css`, `references/components/references.lock`
- Modify: `docs/usage.md` (§Masthead, §LiveDot), `static/llms.txt`, `CHANGELOG.md` (`## Unreleased`)
- Test: `src/lib/components/masthead/masthead.test.ts`

**Interfaces:**
- Produces, in `masthead/types.ts`:
  ```ts
  export interface LiveToggle {
    /** true: updates apply as they arrive. false: they queue. */
    live: boolean;
    /** Diffs held while paused; shown as a count with an Apply action. */
    queued: number;
    ontoggle: () => void;
    onapply: () => void;
    /** Defaults: "Pause live updates" / "Resume live updates" / "Apply". */
    words?: { pause?: string; resume?: string; apply?: string; paused?: string };
  }
  export interface MastheadLive { state: LiveState; label?: string; detail?: string; attrs?: …; toggle?: LiveToggle }
  ```
- Produces, in `LiveDot.svelte`: `LiveState` gains `'paused'`; `LIVE_LABELS.paused = 'Paused'`; new prop `toggle?: LiveToggle`. With `toggle`, the root is `<span class="vk-live-group">` holding `<button type="button" class="vk-live vk-live--{state} vk-live--toggle" aria-label="{visible word}, {toggle.live ? words.pause : words.resume}">` (dot + visible word; no `aria-pressed`: a toggle button keeps a fixed name, and WCAG 2.5.3 wants the visible word in the name, so the name is "Live, pause live updates" / "Paused, resume live updates"), then, when `!toggle.live && toggle.queued > 0`, `<span class="vk-badge" data-needs>{queued}</span><button class="vk-button vk-button--quiet vk-button--sm vk-live__apply">{words.apply}</button>`, and always a `<span class="vk-visually-hidden" role="status">` that reads `"{label}"` or `"Paused, {queued} waiting"`. Without `toggle`, markup is unchanged.
- The `state` shown while `toggle.live === false` is `'paused'` regardless of the connection.

- [ ] **Step 1: Write the failing tests** in `masthead.test.ts`, describe `'LiveDot toggle'`:
  - `'without a toggle the markup is the 0.0.19 status'` (snapshot of the existing structure: `span.vk-live[role=status]`).
  - `'with a toggle the pill is a button named with the visible word and its action, and the status is a separate live region'`: render `Masthead` with `live: { state: 'live', toggle: { live: true, queued: 0, ontoggle, onapply } }` in each vibe; assert `button.vk-live` with accessible name `Live, pause live updates`, no `.vk-live__apply`, `[role=status]` text `Live`.
  - `'paused shows the queued count and Apply, and clicking them calls the handlers'`: `toggle: { live: false, queued: 3 }`; assert `.vk-badge` text `3`, `.vk-live__apply` text `Apply`, class `vk-live--paused`; click → `ontoggle`/`onapply` called once each; `[role=status]` text `Paused, 3 waiting`.
  - `'every vibe draws the toggle'`: `.vk-live--toggle` present under each `vk-masthead--{vibe}`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/components/masthead` → FAIL (toggle prop unknown).
- [ ] **Step 3: Implement** the types, LiveDot and MastheadBody pass-through (`toggle={live.toggle}`); CSS: `button.vk-live` resets border/background/font and keeps each vibe's pill rules; `.vk-live--paused .vk-live__dot { background: var(--vk-color-muted) }`; `.vk-live-group { display: inline-flex; align-items: center; gap: 8px }`; Studio keeps radius 0; Quiet keeps `display: none` on the dot.
- [ ] **Step 4: Run** the masthead tests → PASS; `pnpm test` (unit) → PASS, including `tests/styles.test.ts` `'targets are at least 44px…'` (the button keeps `min-height: var(--vk-target-min)` via `.vk-hit` or its own rule).
- [ ] **Step 5: Reference sheets.** Add cases `toggle-default` (variant `toggle`, live true) and `paused-default` (variant `paused`, queued 3) to `MASTHEAD_CASES`; add `<template data-variant="toggle">` and `paused` to the four reference HTML files, drawn from the mockup `pass-four-live-toggle.html` (`button.live`, `.queued`), in each vibe's reference class vocabulary; run `pnpm references && pnpm references:lock --allow Masthead && pnpm test:pixels -g "Masthead "` → PASS for 4 vibes × 2 themes.
- [ ] **Step 6: Docs.** Add the `toggle` row to the Masthead and LiveDot props tables in `docs/usage.md`; mention `LiveToggle` in `static/llms.txt`; CHANGELOG `### Added` bullet. Run `pnpm vitest run tests/docs.test.ts` → PASS.
- [ ] **Step 7: Commit** `feat(masthead): live pill is a pause/resume toggle with a queued count`.

### Task A2: StageTrack board form with counts and workers

**Files:**
- Modify: `src/lib/components/stagetrack/types.ts`, `steps.ts`, `StageTrack.{Daylight,Paper,Studio,Quiet}.svelte`, `src/lib/styles/components/stages.css`
- Modify: `src/stories/cases/stagetrack.ts`, `references/src/StageTrack/*.html|css`, `references.lock`, `docs/usage.md` §StageTrack, `static/llms.txt`, `CHANGELOG.md`
- Test: `src/lib/components/stagetrack/stagetrack.test.ts`, `src/lib/components/card-surfaces.test.ts`

**Interfaces:**
- Produces, in `types.ts`:
  ```ts
  export type StageTrackForm = 'auto' | 'card' | 'cell' | 'page' | 'board';
  export interface StageDetail { count?: number; /** "a person", "3 agents", "gate · a person" */ who?: string; /** draws count and name in the signal */ needs?: boolean; }
  export interface StageTrackProps { …existing…; /** One per stage; read by form="board". */ details?: StageDetail[]; }
  ```
- Produces: `steps()` returns `Step & { count?: number; who?: string; needs: boolean }`.
- Board form, every vibe: `ol.vk-stages.vk-stages--{vibe}.vk-stages--board` with `--n`; each `li` carries `data-state`, `data-needs="1|0"`, a bar, `.vk-stages__name` (full name, `white-space: normal`, two-line clamp, never `text-overflow: ellipsis`), and `.vk-stages__detail` ("3 · a person"). Daylight board form names every stage (unlike its card form). Studio keeps `--_band` and padded ordinals; Paper keeps Roman numerals and rules; Quiet renders the numbered inline list with "(3 · a person)".

- [ ] **Step 1: Write the failing tests** in `stagetrack.test.ts`, describe `'StageTrack form="board"'`:
  - `'names every stage in full in every vibe'`: seven stages incl. `'Messaging approval'`, `details` with counts; for each vibe assert seven `.vk-stages__name` with full text and no `aria-hidden` names.
  - `'writes each stage's count and who works it, and marks needs'`: `details[0] = { count: 3, who: 'a person', needs: true }` → `li:first-child[data-needs="1"] .vk-stages__detail` text `3 · a person`.
  - `'keeps the accessible step names the same across vibes'` (reuse the a11y-tree helper).
  - In `tests/styles.test.ts` add `'the board form never truncates a name'`: regex `\.vk-stages--board[^{]*\.vk-stages__name\s*{[^}]*white-space:\s*normal` present and no `text-overflow: ellipsis` inside a `--board` rule.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/components/stagetrack tests/styles.test.ts` → FAIL.
- [ ] **Step 3: Implement** `details` in `steps()` and the four forms; CSS for `.vk-stages--board` per vibe from the mockup `.track` rules in `composition.css` (Daylight pill bars, Studio ramp + ordinals + `vk-stages__detail` in mono, Paper ruled columns + numerals, Quiet inline numbered words).
- [ ] **Step 4: Run** tests → PASS; `pnpm test` → PASS (contrast and styles included).
- [ ] **Step 5: Reference sheets.** Add case `board-seven-counts` (variant `board`, `SEVEN`, `form: 'board'`, details with counts: 3/a person needs, 0/3 agents ×4, 0/gate · a person, 13/a person) and `board-eight-long` (`EIGHT`, `data: { w: '960px' }`); add templates to the four reference files; `pnpm references && pnpm references:lock --allow StageTrack && pnpm test:pixels -g "StageTrack "` → PASS. Add the story `"Board form, eight long names"` and extend `tests/phone/stagetrack-phone.spec.ts` with `` `stage track ${vibe}: board form names eight long stages at 438px` `` → PASS under `pnpm test:phone`.
- [ ] **Step 6: Docs** rows (`details`, `form: board`), llms.txt, CHANGELOG `### Added`. `pnpm vitest run tests/docs.test.ts` → PASS.
- [ ] **Step 7: Commit** `feat(stagetrack): board form names every stage with its count and worker`.

### Task A3: Release prep 0.0.20

- [ ] **Step 1:** `pnpm verify && pnpm test:stories && pnpm test:pixels && pnpm test:phone` → all PASS.
- [ ] **Step 2:** `sh .github/release/prep-release.sh v0.0.20`; set `package.json` version `0.0.20`; write the release paragraph in `CHANGELOG.md` (`## v0.0.20 — <date>`: Masthead live toggle, StageTrack board form; `### Compatibility`: additive, no migration).
- [ ] **Step 3:** `pnpm vitest run tests/docs.test.ts` → PASS (`'the changelog has an entry for the package version'`).
- [ ] **Step 4: Commit** `vibekit 0.0.20: release prep`; `pr-state` check; push `feat/live-toggle-and-track-counts`; `tea pr create -l forge --repo SuperJackfruitLabs/vibekit --base main --title "vibekit 0.0.20: Masthead live toggle, StageTrack board form"` with the body naming superpipeline #114 as the consumer and the merge order (vibekit first). The operator tags `v0.0.20` after merge; npm publishes.
- [ ] **Step 5:** `pnpm package && pnpm pack` → `superjackfruitlabs-vibekit-ui-0.0.20.tgz` for Task B4's interim install.

---

# Part B: superpipeline

Repo `/Users/rakeshgangwar/SuperJackfruit/superpipeline`, branch `design/composition-contract`, draft PR #114. Paths below are relative to `apps/web` unless they start with `/`.

## Phase 0: the live bugs

### Task B1: The card drawer takes its board from the route

**Files:**
- Modify: `src/lib/components/CardDrawer.svelte`, `src/lib/components/card/card-model.svelte.ts`, `src/lib/components/card/comments-model.svelte.ts`, `src/routes/b/[boardId]/+layout.svelte`, `src/routes/b/[boardId]/c/[cardId]/+page.svelte`, `src/lib/components/inbox/InboxView.svelte`
- Test: `src/lib/components/card/card-model.svelte.test.ts` (new), `e2e/drawer.spec.ts`

**Interfaces:**
- Produces: `CardDrawer` prop `boardId: string | null` (the route's board; InboxView passes the item's `boardId`). `CardModel` gains derived `ready: boolean` = `ctx.boardId !== null && app.boardId === ctx.boardId && app.board?.boardId === ctx.boardId`; every detail load (`comments.load`, estimate via `getEstimate`, history, related, gate refresh) is gated on `ready`, and re-runs once `ready` flips true.
- The card route page sets `app.openCardId` from `page.params.cardId` once `app.boardId === page.params.boardId`, not from the previous board's snapshot.

- [ ] **Step 1: Write the failing test** `card-model.svelte.test.ts`: `'loads nothing until the route's board is the open board'`: stub `fetch`; `app.boardId = 'brd_A'`; `new CardModel(() => ({ boardId: 'brd_B', cardId: 'card_1', surface: 'drawer' }))`; flush; assert no request URL contains `/boards/brd_A/`; set `app.boardId = 'brd_B'` and `app.board = snapshotWith('brd_B','card_1')`; flush; assert requests for `/boards/brd_B/cards/card_1/comments` and `/estimate`.
- [ ] **Step 2: Run** `pnpm --filter @superpipeline/web vitest run src/lib/components/card/card-model.svelte.test.ts` → FAIL (requests to brd_A observed).
- [ ] **Step 3: Implement** `ready` and the gating; pass `boardId={page.params.boardId}` from the board layout and `boardId={item.boardId}` from InboxView; fix the route page's effect.
- [ ] **Step 4: Run** the test → PASS; `pnpm --filter @superpipeline/web test` → PASS.
- [ ] **Step 5: e2e** in `e2e/drawer.spec.ts`: `'a deep link into another board loads that board's card'`: seed two boards via `seedBoard`, open board A, navigate to `/b/<B>/c/<card>`; assert no 404 responses (listen on `response`), drawer title correct, comments region not stuck on "Loading…" after 5 s. Run `pnpm --filter @superpipeline/web e2e -- -g "deep link"` → PASS.
- [ ] **Step 6: Commit** `fix(card): the drawer takes its board from the route, not the remembered board`.

### Task B2: Crew and Settings say when a load is slow or failed

**Files:**
- Modify: `src/lib/components/workspace/agents-model.svelte.ts`, `connections-model.svelte.ts`, `people-model.svelte.ts`, `capabilities-model.svelte.ts`, `labels-model.svelte.ts`, `src/lib/components/workspace/agents/AgentsPage.svelte`, `AgentsStudio.svelte`, `ConnectionsTab.svelte`, `workspace/studio/ConnectionsStudio.svelte`, `src/lib/loading.svelte.ts`
- Test: `src/lib/components/workspace/agents-model.svelte.test.ts`, `e2e/loading.spec.ts`

**Interfaces:**
- Produces, in `loading.svelte.ts`: `export function loadState(get: () => { value: unknown | null; failed: boolean }): { phase: 'idle' | 'skeleton' | 'slow' | 'failed' | 'ready' }` using `SKELETON_DELAY_MS`, `SLOW_MS`. Every workspace model exposes `readonly load = loadState(...)` and `retry()`.
- Root cause step: the list reads must start without waiting for the board socket. `crewLists.readAgents()` etc. are called from the model constructor under `app.markBusy`, and must not be awaited behind `app.init`'s board open.

- [ ] **Step 1: Write the failing test** `'shows slow copy after SLOW_MS and failed copy on rejection'`: fake timers; `readAgents` never resolves → after 8000 ms `model.load.phase === 'slow'`; a second model whose read rejects → `'failed'`; `retry()` calls the read again.
- [ ] **Step 2: Run** → FAIL (no `load`).
- [ ] **Step 3: Diagnose on staging** (read-only): open `/crew/agents` in Playwright against `https://staging-app.superpipeline.dev` with the real profile; record whether `GET /v1/agents` is sent at all. If not sent, the gate is `app.init` (fix: start reads before `openBoard`); if sent and pending, note the API latency in the PR body and keep the slow state. Write the finding into the commit message.
- [ ] **Step 4: Implement** `loadState`, wire the five models and the tabs' `{#if}` branches: skeleton → `SkeletonRows`; slow → `SkeletonRows slow` + `SLOW_COPY` + Retry; failed → `LoadFailed`.
- [ ] **Step 5: Run** the test → PASS; `e2e/loading.spec.ts` add `'crew shows a retry when the agents read hangs'` with `page.route('**/v1/agents', () => new Promise(() => {}))` and a clock advance → PASS.
- [ ] **Step 6: Commit** `fix(crew,settings): slow and failed loads say so and offer retry`.

### Task B3: Activity is paged

**Files:**
- Modify: `src/lib/components/operate/operate-data.ts`, `src/lib/components/inbox/inbox-model.svelte.ts`, the four `operate/layouts/Operate*.svelte` (Activity panel only; retired in Task B10)
- Test: `src/lib/components/operate/operate-data.test.ts`

**Interfaces:**
- Produces: `export const ACTIVITY_PAGE = 20`; `InboxStore.activityShown: number` (starts at `ACTIVITY_PAGE`), `showMoreActivity(): void` (+20), `activityPage: ActivityGroup[]` (first `activityShown` of `groups`), `activityRemaining: number`.

- [ ] **Step 1: Test** `'the inbox shows 20 activity groups and says how many remain'`: 129 groups → `activityPage.length === 20`, `activityRemaining === 109`; after `showMoreActivity()` → 40.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; the layouts render `activityPage` and a vibekit `LoadMore` with `label="Show 20 more"` when remaining > 0. **Step 4: Run** → PASS; `e2e/inbox-all-boards.spec.ts` add `'activity renders at most 20 groups until Show more'` → PASS.
- [ ] **Step 5: Commit** `fix(inbox): activity is paged, 20 at a time`.

## Phase 1: prerequisites

### Task B4: vibekit-ui 0.0.20 from npm

**Files:**
- Modify: `package.json` (drop `@superjackfruit/vibekit: file:./vendor/…`, add `@superjackfruitlabs/vibekit-ui`), delete `vendor/vibekit-0.0.12.tgz`, `src/app.css` imports, every `from '@superjackfruit/vibekit'` and `'/motion'` specifier (179 + 8 sites), `src/lib/vibekit-version.test.ts`, `e2e/pixel/vk-guard.mjs` (package name), `/pnpm-lock.yaml`
- Test: `src/lib/vibekit-version.test.ts`

- [ ] **Step 1:** Update `vibekit-version.test.ts`: version `'0.0.20'`, package `@superjackfruitlabs/vibekit-ui`, add `LiveToggle` and `StageDetail` type imports to the export list. Run → FAIL.
- [ ] **Step 2:** Install: until v0.0.20 is on npm, `"@superjackfruitlabs/vibekit-ui": "file:./vendor/superjackfruitlabs-vibekit-ui-0.0.20.tgz"` (from Task A3 step 5); once published, switch to `"^0.0.20"` in a follow-up commit `chore: vibekit-ui from npm` and delete `vendor/`.
- [ ] **Step 3:** Codemod the specifiers: `grep -rl "@superjackfruit/vibekit" src e2e | xargs sed -i '' "s#@superjackfruit/vibekit#@superjackfruitlabs/vibekit-ui#g"`; fix `app.css` (`@import '@superjackfruitlabs/vibekit-ui/fonts.css'`, `/vibekit.css`).
- [ ] **Step 4:** `pnpm install`, `pnpm typecheck` → fix breaks from 0.0.12→0.0.20 (changed props; the 0.0.12→0.0.19 CHANGELOG in vibekit lists them); `pnpm test` → PASS; `pnpm --filter @superpipeline/web e2e -- --project=critical` → PASS.
- [ ] **Step 5: Commit** `chore(web): vibekit-ui 0.0.20 replaces the vendored 0.0.12`, trailer `Visual-Change: vibekit 0.0.20 component forms`.

### Task B5: Realistic fixtures

**Files:**
- Create: `src/lib/fixtures/realistic.ts`, `e2e/support/realistic-inbox.ts`
- Modify: `e2e/support/realistic.ts`, `/apps/api` dev fixture only if `POST /v1/dev/fixture` cannot express it (check `apps/api/src/dev/fixture.ts` first)
- Test: `src/lib/fixtures/realistic.test.ts`

**Interfaces:**
- Produces: `export function realisticWorkspace(): { boards: BoardSnapshot[]; agents: AgentSummary[]; notifications: Record<string, Notification[]>; usage: Record<string, UsageSummary> }` with exactly: 3 boards (`Planning & Roadmap` 13 needs incl. 1 review + 12 unclaimed, `Developer Experience` 3 reported unclaimed + 13 shipped, `Marketing & Community` 1 stopped + 1 unclaimed), 548 notifications, titles up to 110 characters, one 7-stage board (`Reported … Shipped`), one question, one budget item, one blocked item; `export async function seedRealistic(request): Promise<{ boardIds: string[] }>` for e2e.

- [ ] **Step 1: Test** `'the realistic workspace has the counts the contract tests against'` (18 needs across 3 boards, 548 notifications, a title > 100 chars, a stage named "Failing test"). Run → FAIL. **Step 2: Implement.** **Step 3: Run** → PASS. **Step 4: Commit** `test: realistic workspace fixture for composition work`.

### Task B6: Composition guard functions

**Files:**
- Create: `src/lib/composition/guards.ts`, `src/lib/composition/guards.test.ts`, `src/lib/composition/render-vibes.ts`, `src/lib/composition/VibeFrame.svelte` (the wrapper `renderInVibes` mounts: `VibeRoot` around the component under test)
- Test: `guards.test.ts`

**Interfaces:**
- Produces, pure over a root `Element`:
  ```ts
  export function primaryActionsPerRow(root: Element): { row: string; count: number }[]   // rows = [data-row]; primary = .vk-button--primary
  export function repeatedParagraphs(root: Element, min = 40): string[]                   // text nodes repeated, outside [data-signature]
  export function rawMachineText(root: Element): string[]                                 // /^\{|^(lbl|card|usr|brd)_/ outside <details>
  export function truncatedNames(root: Element, selector = '.vk-stages__name'): string[]  // scrollWidth > clientWidth
  export function parityTree(root: Element): string                                       // a11y tree text, [data-signature] subtrees replaced by "§"
  export async function renderInVibes<P>(C: Component<P>, props: P): Promise<Record<Vibe, Element>>  // VibeRoot per vibe, data-motion="reduce"
  ```
- [ ] **Step 1: Tests**, one per function, on inline HTML fixtures: a row with two primary buttons is reported; a paragraph repeated twice is reported, but not when inside `[data-signature]`; `lbl_d937…` outside details reported, inside not; `parityTree` of two trees differing only inside `data-signature` is equal. Run → FAIL. **Step 2: Implement.** **Step 3: Run** → PASS. **Step 4: Commit** `test(composition): guard functions`.

## Phase 2a: one shell

### Task B7: `AppShell` is one composition

**Files:**
- Create: `src/lib/components/shell/ShellView.svelte`, `src/lib/components/shell/shell.css`, `src/lib/components/shell/signature/{Daylight,Paper,Studio,Quiet}Sky.svelte` (signature slot: Daylight sky + phase, Studio status line, Paper edition line; Quiet none)
- Modify: `src/lib/components/shell/types.ts`, `AppShell.svelte`, `shell-model.svelte.ts`, `src/lib/layouts.ts` (remove `SHELL_LAYOUTS`), every caller (`PlanView.svelte`, `InboxView.svelte`, `b/[boardId]/+layout.svelte`, `crew/+layout.svelte`, `settings/+page.svelte`, `b/[boardId]/settings/+page.svelte`)
- Delete: `shell/Shell{Daylight,Paper,Studio,Quiet}.svelte`, `shell/phone/PhoneShell*.svelte`, `shell/phone/PhoneFrame.svelte`, `src/lib/styles/shell/*.css`
- Test: `src/lib/components/shell/shell.svelte.test.ts` (new), `e2e/headings.spec.ts`, `tests` in `e2e/phone-fit.spec.ts`

**Interfaces:**
- Produces `ShellProps`:
  ```ts
  export interface ShellProps {
    here: ShellHere; section: ShellSection; boardName: string | null; plan?: PlanSection; title?: string;
    live: LiveToggle & { state: LiveState; label: string; detail?: string };   // from shellModel.liveToggle
    primary?: { label: string; onclick: () => void };
    bleed?: boolean; ownHeading?: boolean;
    children: Snippet;
  }
  ```
  Removed: `view`, `showing`, `paperShowing`, `editionCount`, `studioSubRight`, `status`, `subTools`, `sky`. Pages draw their own tabs, filter, showing and footer (Tasks B9, B11).
- Produces `shellModel.liveToggle: LiveToggle & { state; label; detail? }` reading `liveUpdates` (Task B8: `live: liveUpdates.live`, `queued: liveUpdates.queued.length`, `ontoggle: () => liveUpdates.live ? liveUpdates.pause() : liveUpdates.resume()`, `onapply: () => liveUpdates.apply()`) and `app.connection` (state `'paused'` when not live, else `liveView(app.connection).state`). Until B8 lands, B7 ships a `LiveUpdates` stub with the same shape so the shell compiles; B8 replaces it.
- Masthead: vibekit `Masthead` with `eyebrow`, `title`/`switcher`, `command` (search), `live` (with `toggle`), `actions` (primary). Rail: vibekit `AppNav` with Inbox/Plan/Crew and the badge. Phone: `PhoneHeader` + `PhoneTabBar` from vibekit under `PHONE_QUERY` in CSS, same component.

- [ ] **Step 1: Characterization test first**: `shell.svelte.test.ts` `'the shell keeps its landmarks, nav items, badge and chord keys in every vibe'` against the current `SHELL_LAYOUTS` (banner, navigation "Superpipeline", three links, the Inbox badge text, `main#main`, skip link). Run → PASS; revert nothing yet, this pins behaviour.
- [ ] **Step 2: Add the failing parity test** `'renders the same accessibility tree in all four vibes outside the signature slot'` using `renderInVibes(AppShell, …)` and `parityTree`. Run → FAIL (four shells differ).
- [ ] **Step 3: Implement** `ShellView.svelte` and `shell.css` (tokens only; vibe differences via `[data-vibe]` selectors limited to the signature components); point `AppShell` at it; update callers, dropping the removed props (keep their values for Tasks B9/B11 to re-home); delete the forks.
- [ ] **Step 4: Run** `pnpm typecheck && pnpm test` → PASS; `e2e -- --project=critical` and `-g "phone"` → PASS; `pnpm visual:local` → diff expected, commit with `Visual-Change: composition contract, shell`.
- [ ] **Step 5: Retire** `e2e/pixel` references that are shell-only (none are; the shell is captured inside Board/Card screens, retired with those). No lock change here.
- [ ] **Step 6: Commit** `refactor(shell): one shell for every vibe; pages own their tabs and filters`.

## Phase 2b: Inbox

### Task B8: Inbox model: groups, filters, live diffs, pause

**Files:**
- Create: `src/lib/live/live-updates.svelte.ts`, `src/lib/live/diff.ts`, `src/lib/live/diff.test.ts`, `src/lib/live/live-updates.test.ts`, `src/lib/components/inbox/inbox-groups.ts`, `inbox-groups.test.ts`, `src/lib/components/inbox/inbox-filters.svelte.ts`, `inbox-filters.test.ts`
- Modify: `src/lib/stores/app.svelte.ts` (scope sockets), `src/lib/api/boards.ts` (export `closeBoardSocket`), `src/lib/components/inbox/inbox-model.svelte.ts`, `inbox-words.ts`
- Test: as created, plus `src/lib/stores/app.scope-sockets.test.ts`

**Interfaces:**
- `diff.ts`:
  ```ts
  export interface Keyed { key: string }
  export interface Diff<T extends Keyed> { enter: T[]; leave: string[]; change: { key: string; from: T; to: T }[]; order: string[] }
  export function diffKeyed<T extends Keyed>(prev: T[], next: T[], same: (a: T, b: T) => boolean): Diff<T>
  ```
- `live-updates.svelte.ts`:
  ```ts
  export class LiveUpdates { live = $state(true); queued = $state<Array<() => void>>([]); pause(): void; resume(): void; apply(): void; push(fn: () => void): void /* runs now if live, else queues */ }
  export const liveUpdates: LiveUpdates   // persisted under localStorage 'superpipeline.liveUpdates' = 'on' | 'paused'
  ```
- `inbox-groups.ts`:
  ```ts
  export type InboxGroupKey = 'review' | 'answer' | 'resume' | 'budget' | 'unclaimed';
  export const GROUP_OF: Record<AttentionKind, InboxGroupKey>  // review,sub-tasks→review; question→answer; refused,failed,repeated-failure,blocked→resume; budget→budget; no-owner→unclaimed
  export interface InboxGroup { key: InboxGroupKey; title: string; verb: string; items: AttentionItem[]; explanation?: string; groupActions: ('move-all' | 'staff')[] }
  export function inboxGroups(items: AttentionItem[]): InboxGroup[]   // fixed order, empty groups omitted
  export function inboxHeadline(groups: InboxGroup[], boards: number, running: number, firstName: string | null, vibe: Vibe): { h1: string; lede: string }
  ```
  Titles: `Review`, `Answer`, `Resume a stopped agent`, `Over budget`, `Nobody works these stages`. Verbs: `Review`, `Answer`, `Resume`, `Raise the cap`, `Move`. Unclaimed explanation: `These cards sit in {stages} on {n} boards. No agent holds those stages and no review is asked for, so they will not move on their own.`
- `inbox-filters.svelte.ts`: `export class InboxFilters { find = $state(''); group = $state<InboxGroupKey | null>(null); agent = $state<string | null>(null); label = $state<string | null>(null); priority = $state<number | null>(null); sort = $state<'oldest' | 'newest' | 'priority'>('oldest'); open = $state(false); get active(): number; apply(items: AttentionItem[], ctx: { agentOf(i): string | null; labelsOf(i): string[]; priorityOf(i): number | null }): AttentionItem[]; clear(): void }`
- `app.svelte.ts`: `#openBoard` opens the live feed (`#connect`) right after the board snapshot arrives, before awaiting the agents, members, labels and projects reads (today it awaits them first, so a slow `/v1/agents` holds the pill on "Connecting…"; found in Task B2). `openScopeSockets(ids: string[]): void` keeps `#scopeSockets: Map<string, WebSocket>` equal to `ids` minus the open board; each event calls `inboxStore.onBoardEvent(boardId, event)`; `closeScopeSockets(): void`. `InboxStore.onBoardEvent` reloads that board (`#loadBoard`) and applies the result through `liveUpdates.push(() => this.#applyBoard(id, result))`, which sets state from `diffKeyed` so that rows keep identity (`key = cardId`).

- [ ] **Step 1: Tests** (all FAIL first):
  - `diff.test.ts` `'reports enter, leave, change and order'`.
  - `live-updates.test.ts` `'push runs now when live and queues when paused; resume applies in order'`, `'the choice is remembered'` (localStorage stub), `'queued diffs replay in order and match a fresh snapshot'` (apply the same three diffs live and paused-then-applied; final state equal).
  - `inbox-groups.test.ts` `'maps the nine kinds to five groups in a fixed order'`, `'the headline names the non-empty groups and pluralises'` (18 → "Working late, Rakesh? 18 cards want you." in Daylight, "18 cards want you." elsewhere; lede "One review, one stopped agent, and 16 cards nobody is set up to work. Nothing is running.").
  - `inbox-filters.test.ts` `'active counts non-default fields'`, `'apply narrows by group, agent, label, priority and find, and sorts'`.
  - `app.scope-sockets.test.ts` `'opens one socket per board in scope and closes the ones that leave'` (stub `openBoardSocket`).
- [ ] **Step 2: Implement** each module; `InboxStore` composes them.
- [ ] **Step 3: Run** `pnpm test` → PASS. **Step 4: Commit** `feat(inbox): groups by what you must do, filters, live diffs, pause toggle`.

### Task B9a: Mockup round: Running, Spend and Activity tabs (operator gate)

- [ ] **Step 1:** Add `inbox-tabs.html` to `docs/superpowers/specs/2026-11-18-page-composition-contract/` using `helpers.js`: Running (rows: card, agent, stage, since, cost), Spend (total, cap with a vibekit `Meter`, top agents, Set a cap), Activity (paged groups with read state, "Show 20 more"), four vibes. Serve with `./serve.sh`; capture to `previews/`.
- [ ] **Step 2:** Show the operator; record the ruling in the spec's §11 as item 8. **Gate:** do not start Task B9 until approved.

### Task B9: `InboxView` is one composition

**Files:**
- Create: `src/lib/components/inbox/InboxPage.svelte`, `inbox/InboxHeadline.svelte` (signature slot: Daylight greeting band, Studio Hero, Paper/Quiet plain), `inbox/InboxScope.svelte` (QuickFilter; Studio SmallMultiples), `inbox/InboxFilterRow.svelte`, `inbox/InboxGroup.svelte`, `inbox/InboxRow.svelte`, `inbox/tabs/{Running,Spend,Activity}Tab.svelte`, `inbox/inbox.css` (rewrite)
- Modify: `InboxView.svelte` (mounts `InboxPage`; keeps the drawer), `inbox-words.ts`, `src/lib/layouts.ts` (remove `OPERATE_LAYOUTS`)
- Delete: `operate/layouts/*`, `operate/*Studio.svelte`, `operate/spend*.css`, `operate/operate-ui.svelte.ts` (fold what survives into `inbox/`), `attention/AttentionRow.svelte`, `NeedsYouList.svelte`
- Test: `inbox/inbox-page.svelte.test.ts`, `e2e/inbox-all-boards.spec.ts`, `e2e/spend.spec.ts`, `e2e/resume.spec.ts`

**Interfaces:**
- `InboxPage` props: `{ store: InboxStore; filters: InboxFilters; live: LiveUpdates }`. DOM order (§7): masthead (shell) · `InboxHeadline[data-signature]` · `InboxScope` · tabs row (`Tabs` with Needs you / Running / Spend / Activity counts, `Filter` ghost button with `vk-badge` when `filters.active > 0`, `aria-expanded`) · `.vk-reveal[data-open]` filter row · groups (`SectionHeader n title count` · explanation · group actions · rows `[data-row]` with one `vk-button--primary` · `LoadMore`) · footer line.
- `InboxRow`: `{ item: AttentionItem; group: InboxGroup; onverb(): void }`; face via `AgentName`/`Face`, state via `StateLabel`, meta line words from `inbox-words.ts` `rowMeta(item)`.
- Motion: rows `in:rise out:fade`, `animate:flip`; counts `use:countUp` + `use:bumpOnChange`; changed rows `use:flashOnChange={item.updatedAt}`; `LiveDot` rings via Masthead `live.state`.

- [ ] **Step 1: Tests** (FAIL first): `'renders the contract order in all four vibes with the same tree outside the signature'` (`renderInVibes(InboxPage, realistic)` + `parityTree`), `'one primary action per row'` (`primaryActionsPerRow` all ≤ 1), `'no repeated paragraph and no raw ids'`, `'counts appear once'` (the number 18 appears in exactly one text node outside `data-signature` and the tabs), `'the filter row is hidden until the Filter button is pressed and shows the active count'`, `'the first stage, attempt and gate word on the page sits in a sentence that says what it is'` (rule 12: the headline lede and each group's explanation come from `inbox-words.ts`, asserted by text), `'under data-motion=reduce a diff produces no running animations; with motion on it produces at least one'` (jsdom: assert `.vk-enter`/`vk-flash` class application paths instead; the real check is e2e in B16).
- [ ] **Step 2: Implement** per the mockups (`all-pages-four-vibes.html#inbox`, `pass-four-live-toggle.html`, `inbox-tabs.html`). Signature CSS lives in `inbox.css` under `[data-vibe="…"] [data-signature]` only.
- [ ] **Step 3: Run** `pnpm typecheck && pnpm test` → PASS; e2e `inbox-all-boards`, `spend`, `resume`, `phone-fit` → PASS (update selectors, keep assertions).
- [ ] **Step 4: Commit** `feat(inbox): one composition, vibes on top` with `Visual-Change: composition contract, inbox`.

### Task B10: Remove the Operate forks and their tests

- [ ] **Step 1:** Delete `operate/layouts/*.svelte.test.ts` and `OperateDaylightSky`; `grep -rn OPERATE_LAYOUTS src` → none. `pnpm typecheck && pnpm test` → PASS.
- [ ] **Step 2: Commit** `chore(inbox): retire the four Operate layouts`.

## Phase 3: Board

### Task B11: `BoardView` variant A

**Files:**
- Create: `src/lib/components/board/BoardView.svelte`, `board/BoardTopRow.svelte` (Board|List tabs, filter summary + Filter button, attention line), `board/BoardTrack.svelte` (vibekit `StageTrack form="board"` + drop targets), `board/Lane.svelte`, `board/Tile.svelte`, `board/board.css`, `board/board-view-model.ts`
- Modify: `board/board-model.ts` (adds `laneStages: BoardStage[]` = stages with count > 0 or terminal), `board-words.ts`, `src/lib/dnd.ts` (`trackCellDropTarget` = `columnDropTarget` with `data-over` on an `li`), `plan/PlanView.svelte`, `src/lib/layouts.ts` (remove `BOARD_LAYOUTS`, `BOARD_EMPTY_FORMS`), `board/BoardEmpty.svelte` (one form)
- Delete: `board/layouts/*`, `board/daylight/*`, `board/paper/*`, `board/studio/*`, `board/quiet/*`, `board/empty/empty-studio.css`, `board/StageList.svelte` if unused
- Test: `board/board-view.svelte.test.ts`, `e2e/board.spec.ts`, `e2e/mobile.spec.ts`; delete `e2e/lane-collapse.spec.ts`, `e2e/peek.spec.ts`; add `e2e/track-drop.spec.ts`
- Pixel: delete `e2e/pixel` references `SP-Board-*`, `SP-Phone-Board-*` and their `expected-failures.ts` keys; `Reference-Change: composition contract, board`

**Interfaces:**
- `BoardView` props: `{ model: BoardModel; filters: CardFilters; onCompose(): void }`. Order: `BoardTopRow` · `BoardTrack` (`details` from `model.stages`: `{ count, who: ownerShort(stage), needs: units.includes('needs') }`) · `.lanes` of `Lane` for `model.laneStages` (2 columns ≥ 900 px, 1 below) · footer.
- `Tile` props `{ s: CardSummary; onmove(): void }`: title, priority chip, label chips, one `.st` state line (`tile-state.ts` `stateLine(s): { text: string; needs: boolean }`), quiet `Move`; `data-needs`; draggable via `cardDraggable`. Signature marks via CSS on `[data-needs="1"]` per vibe (edge / square / dot / words).
- Drop: lanes and track cells both call `app.moveCard(cardId, stageKey)`.

- [ ] **Step 1: Characterization**: `board-view.svelte.test.ts` `'moving a card calls app.moveCard with the stage key'` against the current Daylight DnD (pins behaviour). Then the failing tests: parity across vibes, `'every stage is named in the track and only stages with cards get a lane'`, `'a tile has one state line and a quiet Move, never a primary button'`, `'unclaimed tiles carry data-needs'`.
- [ ] **Step 2: Implement.** **Step 3: Run** unit + e2e (`board`, `mobile`, `track-drop`: drag a tile onto an empty stage's track cell → moved) → PASS; `pnpm visual:local` → `Visual-Change: composition contract, board`.
- [ ] **Step 4: Commit** `feat(board): one composition, the track always visible, lanes where cards are`.

## Phase 4: Card

### Task B12a: Mockup round: card states (operator gate)

- [ ] **Step 1:** Add `card-states.html` to the spec folder: the card with a pending gate (decision panel in place of the state sentence: Approve / Request changes with note, references, subject digest), a pending question (answer form), a stopped card (resume form with note), done, archived, loading, error; three surfaces (drawer 680–1120 px, phone sheet 390 px, page); four vibes. Capture previews.
- [ ] **Step 2:** Operator review; record in spec §11 item 9. **Gate** for Task B12.

### Task B12: `CardView` is one composition on three surfaces

**Files:**
- Create: `src/lib/components/card/CardView.svelte`, `card/CardHead.svelte`, `card/CardState.svelte` (state sentence + actions; swaps to `GatePanel`/`QuestionPanel`/`ResumeForm` in place), `card/CardFacts.svelte`, `card/CardBrief.svelte`, `card/CardProduced.svelte` (artifacts + `AcceptanceList`), `card/CardHistory.svelte` (Disclosure: attempts, handoff, delivery, related, comments), `card/CardRaw.svelte` (Disclosure), `card/gate/GatePanel.svelte`, `card/question/QuestionPanel.svelte`, `card/card.css`, `card/sections.ts`
- Modify: `card/layouts/types.ts` → `card/sections.ts` with `export const CARD_BLOCKS = ['head','track','state','facts','brief','produced','history','raw'] as const` and `export const FOLDED: Record<CardSectionKey, (typeof CARD_BLOCKS)[number]>` (the §11.3 mapping), `CardDrawer.svelte`, `card/phone/CardPhoneSheet.svelte` (same `CardView`, `surface='phone'`), `src/routes/b/[boardId]/c/[cardId]/page/+page@.svelte`, `src/lib/layouts.ts` (remove `CARD_LAYOUTS`, `CARD_PAGE_LAYOUTS`, `CARD_STATES_LAYOUTS`), `card/widths.ts` (one width per vibe stays)
- Delete: `card/layouts/Card*.svelte`, `card/layouts/card-*.css`, `card/page/CardPage{Daylight,Paper,Studio,Quiet}.svelte` + css, `card/states/*`, `card/state/*`, `card/gate/Gate{Daylight,Paper,Quiet,StudioBar,StudioFrame}.svelte`, `card/question/Question*` forks, `card/phone/pc-*.css`, `card/studio/*`, `card/paper-words.ts`, `card/quiet-words.ts`, `card/phone/phone-card-words.ts` (fold needed words into `card-words.ts`)
- Test: `card/card-view.svelte.test.ts` replaces `card-layouts.svelte.test.ts`; `e2e/gates.spec.ts`, `e2e/drawer.spec.ts`, `e2e/phone-card.spec.ts`, `e2e/card-overflow.spec.ts`
- Pixel: delete `SP-Card-*`, `SP-CardPage-*`, `SP-Card-States-*` references and keys; `Reference-Change: composition contract, card`

**Interfaces:**
- `CardView` props `{ model: CardModel; surface: CardSurface | 'phone'; gate: GateBinding | null; question: QuestionBinding | null; onClose?(): void; boardHref: string; pageHref: string }`.
- `CardState` renders `stateSentence(model): { text: string; needsWord: string | null }` from `card-words.ts` (“Waiting for your review in Approved for 10 hours. keeper-karen finished attempt 5 and produced one document.”) plus the primary verb; when `gate` → `GatePanel`, when `question` → `QuestionPanel`, when stopped → `ResumeForm`, each replacing the sentence block (`data-section="state"` stays the container).
- `sections.ts` test: every key in `CARD_SECTION_KEYS` maps to a block and every block renders exactly once (`data-block`).

- [ ] **Step 1: Characterization**: keep `card-layouts.svelte.test.ts` green until the new view exists; write `card-view.svelte.test.ts` failing tests: parity across vibes and surfaces, `'review opens the decision panel in place of the state sentence'`, `'facts show label names, never ids'`, `'acceptance criteria render as a checklist, not JSON'`, `'history and raw data are closed disclosures with counts'`, `'every old section key is reachable in one block'`.
- [ ] **Step 2: Implement** per `card-states.html`; delete forks; rewrite the section test.
- [ ] **Step 3: Run** unit + e2e (`gates`, `drawer`, `phone-card`, `card-overflow`, `readable-handoff`) → PASS; `Visual-Change: composition contract, card`.
- [ ] **Step 4: Commit** `feat(card): one composition on drawer, phone and page; decision panels open in place`.

## Phase 5: Crew and Settings

### Task B13: `CrewView`

**Files:**
- Create: `src/lib/components/workspace/CrewView.svelte`, `workspace/AgentsTable.svelte` (vibekit `DataTable`), `workspace/PeopleTable.svelte`, `workspace/CapabilitiesTable.svelte`, `workspace/crew.css`
- Modify: `src/routes/crew/[tab]/+page.svelte`, `crew/+layout.svelte`, `src/lib/layouts.ts` (remove `WORKSPACE_LAYOUTS`, `WORKSPACE_TABS`, `WORKSPACE_REVIEW_LAYOUTS`), `workspace-words.ts`
- Delete: `workspace/studio/*`, `workspace/agents/AgentsStudio.svelte`, `WorkspaceFrameStudio.svelte`, `WorkspaceHeaderStudio.svelte`, `review/WorkspaceReviewStudio.svelte`, `PanelTag.svelte` (legend), `workspace-studio.css`
- Test: `workspace/crew-view.svelte.test.ts`, `e2e/pages-polish.spec.ts`

- [ ] **Step 1: Tests**: parity; `'no legend row; help is one link'`; `'the agents table has who, works, from, last seen and an actions menu'`; `'loading, slow and failed states render per rule 11'` (uses Task B2's `loadState`). **Step 2: Implement.** **Step 3: Run** → PASS. **Step 4: Commit** `feat(crew): one composition with one table per tab`.

### Task B14: `SettingsView` and `BoardSettingsView`

**Files:**
- Create: `src/lib/components/settings/SettingsView.svelte`, `settings/LabelsTable.svelte` (rename in place on click; `Remove`), `settings/ConnectionsList.svelte`, `settings/AppearanceFacts.svelte`, `settings/AccountFacts.svelte`, `settings/BoardSettingsView.svelte`, `settings/settings.css`
- Modify: `src/routes/settings/+page.svelte`, `src/routes/b/[boardId]/settings/+page.svelte`, `src/lib/layouts.ts` (remove `SETTINGS_LAYOUTS`), `settings-words.ts`
- Delete: `BoardSettings.svelte` (old), `settings/BoardSettingsStudio.svelte`, `ScheduleListStudio.svelte`, `StageRowStudio.svelte`, `board-settings-studio.css`, `workspace/LabelManager.svelte`, `ColourPicker.svelte` if replaced by vibekit `Choice`
- Test: `settings/settings-view.svelte.test.ts`, `e2e/pages-polish.spec.ts`

- [ ] **Step 1: Tests**: parity; `'labels are a table with name, origin, used-on and remove, not inputs'`; `'renaming happens in place and saves on blur'`; `'connections are rows with a state label'`. **Step 2–4** as above; commit `feat(settings): one composition; labels as a table`.

## Phase 5b: the remaining surfaces

### Task B15: List, Projects, Spend detail, Board log, card-states gallery

**Files:**
- Create: `plan/list/ListView.svelte` (vibekit `DataTable` with groups and `keys`), `plan/projects/ProjectsView.svelte`, `operate/SpendView.svelte`, `operate/BoardLogView.svelte`
- Modify: `src/lib/layouts.ts` → delete the file once `LIST_LAYOUTS`, `PROJECTS_LAYOUTS`, `SPEND_LAYOUTS`, `BOARD_LOG_LAYOUTS`, `SWITCHER_TRIGGERS` are gone (the switcher trigger becomes one `BoardPickButton` form); `src/routes/dev/workspace-review/+page.svelte` and the card-states gallery route render `CardView` cells from Task B12a's states
- Delete: `plan/list/List{Daylight,DaylightToolbar,Paper,Studio,Quiet}.svelte`, `plan/projects/ProjectsStudio.svelte`, `operate/TelemetryStudio.svelte`, `BoardLogPageStudio.svelte`, `BoardLogStudio.svelte`, `dialogs/switcher/Trigger*.svelte`, `src/lib/face-variant.ts` if only `layouts.ts` used it
- Test: parity tests per view; `e2e/list.spec.ts`, `e2e/spend.spec.ts`

- [ ] **Step 1–4** as above; final step asserts `grep -rn "LAYOUTS\[" src` → none and `src/lib/layouts.ts` is deleted; commit `feat(plan,operate): list, projects, spend and log follow the contract; layouts.ts retired`.

### Task B15b: The keys line in every page's footer (rule 13)

**Files:**
- Create: `src/lib/components/shell/KeysLine.svelte` (`{ keys: readonly { key: string; does: string }[] }` → `<span class="sh-keys" aria-label="Keyboard">J/K rows · ↵ open · M move · F filter</span>`, meta text, same DOM in every vibe); `src/lib/keys.ts` (`export const BOARD_KEYS`, `LIST_KEYS`, `INBOX_KEYS`, `CARD_KEYS` as `{ key, does }[]`, the one source the hint text and the key handlers' docs share)
- Modify: every view's footer line (`BoardView.svelte` `.bv-foot`, `ListView`, `InboxPage` footer, `CrewView`, `SettingsView`, `SpendView`, `BoardLogView`, `ProjectsView`) renders `<KeysLine>` after the counts; `plan/list/list-words.ts` `LIST_KEYS` moves to `keys.ts`; `shell.css` (`.sh-keys` meta, hidden under `PHONE_QUERY`)
- Test: `shell/keys-line.svelte.test.ts` (renders the words, `aria-label="Keyboard"`, same text in four vibes via `renderInVibes`), `e2e/composition.spec.ts` gains `'every page's footer ends with its keys'` (desk) and `'the keys line is absent on a phone'`

- [ ] **Step 1: Tests** FAIL first. **Step 2: Implement.** The keys live in `keys.ts` only; a handler's doc comment points at its entry. **Step 3: Run** unit + e2e `composition`, `nav`, `phone-fit` → PASS. **Step 4: Commit** `feat(shell): every page's footer names its keys (rule 13)` with `Visual-Change: composition contract, footer keys`.

Ruling 2026-11-19: added for the Console vibe (operator chose option a: contract-wide, every vibe); runs after B9 and B12 land so every footer exists.

## Phase 6: guards

### Task B16: Composition guards wired per page, proven by breaking them

**Files:**
- Create: `src/lib/composition/pages.test.ts` (unit: every view × 4 vibes through `renderInVibes` + the five guard functions on the realistic fixture), `e2e/composition.spec.ts` (height budget: Inbox < 2700 px and Board < 1800 px at 1440×900 on `seedRealistic`; `track never truncates` at 1008 px; `motion honours reduce`: count `document.getAnimations()` after a seeded event with and without `data-motion="reduce"`) Also `signatureSize(root: Element, allowed: string[]): string[]` in `guards.ts`: fails when a `[data-signature]` region holds any element not matching the page's allowed selectors (headline block, section-header ordinals, the scope control), per spec §11.6.
- Modify: `/.github/workflows/ci.yml` only if the e2e suite list in `scripts/e2e-suites.ts` needs `composition` in `critical` (add it there)

- [ ] **Step 1:** Write the tests → PASS on the finished pages.
- [ ] **Step 2: Prove each guard** by a temporary break per rule (a second primary button on an Inbox row; a duplicated explanation per row; a raw label id in Facts; `text-overflow: ellipsis` on the track; an inline `animation` that ignores `--vk-motion-scale`; a Studio-only extra heading outside `data-signature`): run the guard → FAIL; revert → PASS. Record each pair in the commit message.
- [ ] **Step 3: Commit** `test(composition): guards for every page, each proven by breaking it`.

### Task B17: Monthly composition audit

- [ ] **Step 1:** Add `scripts/composition-audit.mjs` that runs `e2e/composition.spec.ts` against `STAGING_URL` with the realistic seed and writes `docs/reviews/composition-audit-<date>.md` (pass/fail per rule per page); add a `schedule: '0 4 1 * *'` job `composition-audit` to `/.github/workflows/ci.yml` next to `pixel`, `continue-on-error: true`, uploading the report. Mirror the docs audit job's shape.
- [ ] **Step 2:** `node --test scripts/*.test.mjs` passes (add `composition-audit.test.mjs` that checks the report format on a fixture). Commit `ci: monthly composition audit`.

### Task B18: Retire what is left of the pixel suite

- [ ] **Step 1:** With every SP-* reference deleted in Tasks B11/B12, remove `e2e/pixel/` entirely, the `pixel` CI job, `test:pixel`/`test:refs` scripts, `check-lock-change.mjs` from the `unit` job, and `e2e/pixel/README.md`'s pointer in `docs/contributor/`. Keep `e2e/visual/` and the `visual` job; update `VISUAL_ARTBOARDS` kinds to `['Board','CardPage','Card','Phone-Board','Dlg-NewCard','Inbox','Crew','Settings']` with new `SCREENS` entries.
- [ ] **Step 2:** `pnpm test && pnpm ci:test && pnpm lint` → PASS. Commit `chore: retire the frozen pixel references; the composition guards and the visual gate remain`, trailer `Reference-Change: composition contract, suite retired`.

### Task B19: Changelog, PR body, ready for review

- [ ] **Step 1:** `CHANGELOG.md` `## Unreleased`: one bullet per phase in user words (what a person sees).
- [ ] **Step 2:** Run the full local CI per Global Constraints on workbench (`ssh workbench`, the CI toolchain container) and the Mac; paste the pass summary into the PR body; tick every box.
- [ ] **Step 3:** Confirm vibekit v0.0.20 is on npm and Task B4's follow-up commit landed; `pr-state` says #114 is open; push; `tea pr ready` (or edit the title to drop `WIP:`). Tell the operator the merge order: vibekit first (already released), then superpipeline.
