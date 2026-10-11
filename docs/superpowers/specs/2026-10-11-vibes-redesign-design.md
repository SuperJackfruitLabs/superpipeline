# Superpipeline on vibekit: four vibes, one board

> **Status: draft for the operator, 2026-10-11.** Written against `origin/main` f3c3844. Builds on
> vibekit's accepted spec (`vibekit` repo, `docs/specs/2026-10-11-vibes-design.md`) and its
> foundations plan (branch `feat/foundations`). Implementation plan:
> `docs/superpowers/plans/2026-10-11-vibes-redesign.md`.

## 1. Goal

Move the web app (`apps/web`) onto vibekit. A person picks one of four vibes (Daylight, Paper,
Studio, Quiet), each in light and dark, following the sun. The three key screens get a layout of
their own in every vibe:

1. **The board** (Plan > Board view).
2. **The card drawer**, which now opens with the agent's own sentence about what it needs.
3. **The gate and question panels** inside the drawer, with the decision note.

Every other screen (Plan > List and Projects, Operate, Telemetry, board settings, the six
Workspace tabs, the landing page, onboarding, the command palette, the compose sheet and the
dialogs) gets **one adaptive layout** that each vibe styles through tokens and fonts.

Nothing visible today disappears in any vibe. §7 maps every item.

### Not in scope

- Supermessage, the docs site (`docs-site/`) and the marketing site (`landing/`).
- API changes. **None are needed.** Every screen is built from the data the SPA already loads.
  The one candidate (a return path after Reconnect) is solved in the browser (§3.7).
- Cross-product appearance sync through the Accounts profile (a later plan). The cookie lives on
  `app.superpipeline.dev` only.
- New vibes, custom colours, a new logo.

## 2. Decisions taken while planning

These are new here. The operator should know about them.

1. **Phase 1 ships all four vibes as skins.** The picker offers all four from the first deploy.
   Until a vibe's own layouts land (Phases 2 to 4), its key screens use the Daylight layout in that
   vibe's colours, fonts and words. This keeps every phase shippable and lets the operator try a
   vibe a day early.
2. **vibekit's `tailwind.css` is not imported in Phase 1.** Its utility names collide with
   Superpipeline's (`bg-muted` is a background here and a text colour there; `text-muted` would
   flip meaning across 250 uses). Instead `app.css` keeps Superpipeline's Tailwind names and points
   every one of them at a `--vk-*` variable, and adds vibekit's names that do not collide
   (`signal`, `signal-wash`, `signal-text`, `success*`, `raised`, `line`, `faint`, `product`).
   One file changes and the whole app is in vibekit colours at once.
3. **The old `--ink`, `--marigold`, `--coral`… variables stay as aliases** of `--vk-*` variables
   in Phase 1, so inline styles keep working. A guard test forbids new raw colours.
4. **Colour meaning.** `coral` (needs you) becomes the vibe's **signal**. Marigold (the old accent)
   becomes the vibe's **primary** (ink in Daylight). Teal (`live`) becomes **success-text**. The
   signal is used only for "a person is needed" and for errors that need a person; P2 priority and
   hover states stop using it.
5. **The decision panels drive the same API calls in every vibe.** One model per panel
   (`GateDecisionModel`, `QuestionAnswer`); the vibe only changes the controls (buttons in Daylight
   and Studio, a choice plus "Send reply" in Paper, radio buttons plus "Submit decision" in Quiet).
   Request changes still needs a note in all four.
6. **Button and field wording stays the same in every vibe** (Approve, Request changes, Reject,
   Send answer, Add a note (optional), Archive card…). Only the lead sentence's frame, the section
   headings and the empty-sentence fallbacks change tone (§6). This keeps the meaning identical,
   keeps e2e selectors stable, and keeps screen-reader names predictable.
7. **First visit follows the sun, not the OS dark mode.** This is vibekit's default. A person who
   chose light or dark with today's toggle keeps that choice: a one-line migration in `app.html`
   turns `localStorage['superpipeline.theme']` into the cookie before the first paint.
8. **The quick theme toggle stays** (rail button, phone "You" menu, palette) next to a new
   "Appearance…" entry. It sets Light or Dark explicitly, the opposite of what is showing.
9. **Pixel screenshots are captured, not compared, in CI for now.** Baselines need Linux font
   rendering and the implementer works on macOS. The blocking checks are axe (WCAG 2.2 AA) and a
   reachability test that every inventory action is reachable by role and name in every vibe. The
   screenshots are attached to the Playwright report for the operator to look at. Committing Linux
   baselines is a follow-up task.
10. **Reconnect keeps you on the card.** Reconnect stores the current path in `sessionStorage` and
    goes to `/auth/login`. After sign-in the Worker sends the person to `/`, and the app reopens the
    stored path once. No Worker change.
11. **Agent pictures.** Superpipeline has `AgentSummary.iconUrl` (set in Workspace > Agents >
    Edit > avatar URL). It is the chosen picture; otherwise the face comes from `faceSvg(agent.id)`.
12. **The location never leaves the device.** "Use my location" stores the place rounded to one
    decimal (about 11 km) in `localStorage['superpipeline.place']`, never sends it anywhere, and
    drops it when the switch is turned off.

## 3. Architecture

### 3.1 Getting vibekit

- `apps/web/vendor/vibekit-0.0.1.tgz` (made by `pnpm pack` in vibekit after its foundations plan
  is merged), committed.
- `apps/web/package.json`: `"@superjackfruit/vibekit": "file:./vendor/vibekit-0.0.1.tgz"`.
  `pnpm-lock.yaml` is regenerated by `pnpm install` in the task that adds it; CI's
  `--frozen-lockfile` then passes. The tarball's own dependencies (Fontsource, bits-ui, suncalc)
  come from the public registry.
- Upgrading means replacing the tarball and the version in both places, in one commit.

### 3.2 First paint

`app.html`, in `<head>`, before anything else that paints:

1. **Migration** (inline, 1 line): when there is no `vk_appearance` cookie and
   `localStorage['superpipeline.theme']` is `light` or `dark`, write
   `vk_appearance=daylight.<theme>.strong.0` for this host.
2. **`HEAD_SCRIPT` from vibekit**, copied verbatim. A unit test reads `app.html` and fails if the
   copy differs from the installed vibekit's `HEAD_SCRIPT` (so an upgrade cannot leave a stale
   copy). It sets `data-vibe`, `data-theme`, `data-phase` and `data-time` on `<html>` from the
   cookie and the device clock.
3. The Google Fonts `<link>`s are removed. Fonts come from vibekit's `fonts.css` (Fontsource,
   self-hosted, bundled by Vite); a browser downloads only the faces the active vibe uses.

After mount, `appearance.init()` (§3.3) refines the phase with `phaseAt()` (time zone, or the
rough place if the person allowed it) and re-checks it every minute.

### 3.3 The appearance store

`apps/web/src/lib/appearance.svelte.ts` exports `appearance`, a single rune store:

- `value: Appearance` (`{ vibe, theme: 'sun'|'light'|'dark', timeStrength, useLocation }`),
  `phase`, `place`, the resolved `theme` (`light`|`dark`), and `pickerOpen`.
- `init()`, `dispose()`, `set(partial)`, `toggleTheme()`, `useLocation()`, `stopUsingLocation()`.
- `set` writes the cookie with vibekit's `appearanceCookie` (no `Domain`, `Secure` on https),
  writes the `<html>` attributes with `htmlAttributes`, and updates both `theme-color` metas to the
  live `--vk-color-bg`. A vibe or theme change runs inside `document.startViewTransition` unless
  reduced motion is on.
- Changing vibe when the time strength is still that vibe's default moves it to the new vibe's
  default (Quiet starts with time of day off).

The app store loses `theme`, `initTheme`, `setTheme`, `toggleTheme`. Everything that read them
reads `appearance`.

### 3.4 CSS

`app.css` becomes, in order:

```css
@layer theme, base, vk.tokens, vk.base, vk.components, components, utilities;
@import 'tailwindcss';
@import '@superjackfruit/vibekit/fonts.css';
@import '@superjackfruit/vibekit/vibekit.css';
@theme inline { /* Superpipeline names → --vk-* (decision 2) */ }
:root { /* legacy aliases (decision 3) */ }
/* existing utilities and component classes, re-pointed at tokens */
```

The first line fixes the cascade: Tailwind utilities still beat vibekit's base and component
classes, and vibekit's tokens sit below everything. The unlayered `:focus-visible` rule stays
unlayered (it must beat `outline-none`), now `outline: 2px solid var(--vk-color-text)`.

Removed: the dark `:root` palette, the `[data-theme='light']` block, the marigold body gradient,
the IBM Plex / Space Grotesk font stacks, and the unused `.triage-*` classes.

Per-vibe touches that are not layout (for example Studio's uppercase mono eyebrows, Quiet's
removal of decorative glyph animation, Paper's serif for the agent's voice) are written as
`[data-vibe="studio"] .eyebrow { … }` rules in `app.css`, in one block per vibe. They are styling,
never content: no rule may `display: none` anything that carries information (a test greps for it).

### 3.5 One view model per screen, four layouts, chosen in one place

`apps/web/src/lib/layouts.ts` is the only file that maps a vibe to a layout:

```ts
BOARD_LAYOUTS: Record<Vibe, Component<BoardLayoutProps>>
CARD_LAYOUTS:  Record<Vibe, { component: Component<CardLayoutProps>; panel: string }>
```

Phase 1 points all four vibes at the Daylight components. Each later phase swaps its vibe's
entries. No component outside the layout folders checks the vibe.

**Board view model** (`board/card-summary.ts`, pure): `summarize(board, cards, ctx)` turns the
snapshot into `CardSummary[]`, one per filtered card, carrying every fact a tile or list row shows
today plus the lead sentence, the face's mood, `attemptCount`, `stateSince` and the attention item.
`groupByUrgency()` buckets them: needs you, working, queued, done, closed. `stageSummaries()` gives
each stage's name, count, WIP limit, over-limit flag, blocked count, gate, manager routing, owner
line and empty flag. Paper, Studio and Quiet render from these; Daylight keeps `BoardKanban` and
`CardTile`, which already render the same facts.

**Card view model**: the drawer (`CardDrawer.svelte`) keeps its data loading, live refresh,
editing and actions. Its markup is cut into **23 named snippets** (`CardSections`: error, status,
facts, editButton, editForm, description, delivery, resume, plan, criteria, details, project,
links, subtasks, activity, decisions, comments, handoff, cost, attempts, related, references,
cardActions). The drawer shell (scrim, dialog, focus trap, focus return, close button, Escape)
stays in `CardDrawer.svelte`; it passes the snippets, the `CardLead`, the agent, the stages and
the counts to the vibe's card layout. A layout decides order, grouping, containers and disclosure,
never content. A static test fails if any layout does not render every snippet exactly once.

**The lead** (`card/card-lead.ts`, pure): `cardLead()` picks the agent's own sentence:

| Card | Sentence, in this order | Kind |
|---|---|---|
| A pending question | the question | `question` |
| A pending gate | `gate.summary`, else the latest `response` activity | `review` |
| `failed` | the latest run's failure reason, else the latest `response` | `failed` |
| `input-required` | `needsHuman.detail`, else the latest `response` | `stopped` |
| over budget | the latest `response` | `budget` |
| `working` | the latest `response` | `working` |
| `completed` | the latest `response` | `done` |
| anything else | the latest `response` | `idle` |

When there is no sentence the layout shows the kind's fallback in the vibe's words (§6). The
first five kinds mean "needs you". `moodFor(kind)` maps them to the face's mood (`needs`,
`working`, `done`, `resting`, or `thinking` for a claimed card that has not started).
`gate.summary` was never shown before; it now is.

**Decision panels**: `card/gate/gate-decision.svelte.ts` (`GateDecisionModel`: note, needNote,
needPick, busy, selected, `decide(option)`, `submit()`) replaces the logic in `GateActions.svelte`;
`card/question/question-answer.svelte.ts` (`QuestionAnswer`: text, selected, answering, error,
`send(option?)`, `submit()`) replaces `onAnswer` in the drawer. Each vibe has a `Gate<Vibe>` and a
`Question<Vibe>` component over the same model. The API calls are unchanged (`resolveGate` with
`comment`; `answerElicitation`).

### 3.6 Faces

`components/AgentFace.svelte` wraps vibekit's `Face`:

- props `agentId`, `name`, `iconUrl`, `mood`, `size`, `variant`;
- `variant`: `mood` (Daylight: face or picture with mood ring), `portrait` (Paper: small round
  picture, or the initial in a round portrait), `light` (Studio: small square face plus a status
  light), `name` (Quiet: the name only; the picture is not drawn);
- adaptive screens pass `variant={FACE_VARIANT[appearance.vibe]}`, a map that lives in
  `layouts.ts` with the other per-vibe choices;
- the accessible name is the agent's name; the mood is announced as text next to it where the
  layout shows a mood word, never through colour alone.

It replaces the coloured-initial avatars in `CardTile`, the drawer's status row, Operate's
Running list and Telemetry's By agent panel. `agentColor.ts` is removed with its test once nothing
imports it.

### 3.7 The Superlibrary preview error

Today, `no_token` reads "Previews need you signed in through your workspace account." In every
vibe it now reads vibekit's `say('error.previewReconnect', vibe)`:

| Daylight | Paper | Studio | Quiet |
|---|---|---|---|
| The file's safe! I just couldn't confirm it's you. Reconnect? | The file is safe. I couldn't confirm it's you, so the preview is hidden. | PREVIEW LOCKED. Session check failed. Reconnect. | Preview hidden: your sign-in could not be confirmed. Reconnect to view it. |

followed by a **Reconnect** button and a reason line, `Reason: no_token (this tab has no
Superlibrary sign-in)`, in the muted colour. Reconnect calls `reconnect()` (`lib/reconnect.ts`):
store `location.pathname + location.search` in `sessionStorage['superpipeline.returnTo']`, then
`location.assign('/auth/login')`. After sign-in, `app.init()` reads and clears it once and, when it
is a same-origin path starting with `/b/` or `/workspace`, navigates there. The same message and
button appear in Related prior work when it fails with `no_token` (its "Try again" stays). The
other Superlibrary sentences are unchanged.

## 4. Shared shell and adaptive screens

### 4.1 Shell

- **Rail** (900px and up) and **BottomNav** (below 900px) keep their destinations, the needs-you
  dot and its screen-reader count. Active state: `--vk-color-raised` background and
  `--vk-color-text`, plus `aria-current`.
- The rail's bottom gains **Appearance** (opens the picker; `aria-haspopup="dialog"`), keeps
  **Toggle theme** (now explicit Light or Dark, same name) and Sign out. The avatar stays.
- The phone "You" menu: name, login, **Appearance…**, Light theme / Dark theme, Sign out.
- **BoardHeader** keeps its four-item budget (board switcher, live/offline, search, New card).
  The greeting band (§5.1) sits below the header inside the Plan page, not in the header.
- **BrandMark** and the favicon use `--vk-product-superpipeline-bg/fg` (the product chip), the
  same in every vibe.

### 4.2 The appearance picker

`components/shell/AppearanceDialog.svelte`, a modal dialog (`aria-labelledby`, focus trap, Escape,
focus returns to the opener), full-screen below 600px:

1. Heading "Appearance"; a line "Applies to Superpipeline on this device."
2. **Vibe**: a `fieldset` of four native radio cards. Each card is drawn inside
   `data-vibe="<v>" data-theme="<current>"` so its swatches and sample text use that vibe's real
   tokens and display font: name (Daylight, Paper, Studio, Quiet), a four-swatch row (bg, surface,
   primary, signal) and the description (Playful and sunlit · Calm and editorial · Precise ·
   Plain and focused).
3. **Light or dark**: vibekit `Segmented`, Follow the sun / Light / Dark.
4. **Time of day**: `Segmented`, Strong / Subtle / Off; hint "Quiet starts with this off."
5. **Use my location for the sun**: a switch (`role="switch"`, `aria-checked`). Turning it on
   asks the browser for location; refused shows "Location was not shared, so the sun follows your
   time zone." Hint: "Your rough location stays on this device. It only works out sunrise and
   sunset."
6. A readout: "Now: {phase} · {greeting(phase, vibe)}".
7. **Done** closes. Every change applies at once and is saved at once.

The palette's Account group gains "Appearance…" (sub "vibe, light or dark, time of day").

### 4.3 Adaptive screens

One layout each, styled per vibe through tokens. What changes:

- Colours, fonts, radii and lift come from the vibe. Eyebrows use the vibe's display font
  (uppercase mono in Studio). Agent avatars use `AgentFace` with the vibe's variant.
- **Landing** (signed out): the hero sits in a `Sky` band for the current phase (subtle or off as
  set); the greeting from `greeting(phase, vibe)` appears above the H1. All copy, CTAs, notices,
  the pipeline illustration, the three cells and the footer links stay.
- **Loading screen**: BrandMark, wordmark, "loading your boards…" with a working pulse.
- **Operate**: unchanged structure (NeedsYou, Running, Spend, Activity; two columns from 1200px).
  The urgent kind badges use the signal; "asked" uses `--vk-color-primary` outline.
- **Telemetry, Board settings, Workspace (all six tabs), Onboarding, ComposeSheet,
  NewBoardDialog, BoardSwitcher, CommandPalette, FilterBar, List view, Projects view**: unchanged
  structure and copy, re-tokened. Inputs are 16px on touch (already `.touch-form`) and stay so.

## 5. The key screens, per vibe

All four share: the Plan toolbar (Board / List / Projects and the FilterBar), the drawer shell,
the BoardHeader, and the decision models. "Phone" means below 600px unless stated.

### 5.1 The board (Plan > Board)

**Daylight: columns with faces, and a peek.**
- A greeting band above the lanes (`Sky` for the phase when time of day is Strong; a tinted strip
  when Subtle; a plain strip when Off): "{greeting}. {n} cards want you." where n is the board's
  attention count ("Nothing needs you." at zero), and the crew: faces of the agents holding
  cards (up to five, then "+N"), each with its name as accessible label.
- The lanes, lane headers, owner lines, empty strips, StageStepper (below 900px), drag and drop,
  flow arrows and every tile element stay exactly as today (inventory §2.5).
- Tile changes: the delegate avatar becomes `AgentFace` (24px, mood) followed by the agent's name
  and a mood word (working, thinking, needs you, done, resting); "—" stays when nobody holds it.
  The P1 stripe uses the signal, the P2 stripe uses `--vk-color-primary`.
- **Peek** (1440px and up, rendered only at that width): a right column, `<aside aria-label="Peek">`, 320px. It shows one card:
  the first card that needs you, or the tile last focused or hovered (debounced 150ms). Contents:
  "Peek" eyebrow, title, a 36px face with the lead sentence (snapshot only: question, gate summary,
  needs-human detail, or the kind's fallback), and one button: Answer, Review, Resume or Open.
  Below 1440px there is no peek; the tiles carry the same buttons.

**Paper: a front page.**
- Masthead: board name (display serif), "{weekday, day month}, in {light}" (first light, morning
  light, full daylight, golden light, evening light, lamplight from the phase), "Superpipeline ·
  {n} cards".
- Three columns at 1024px and up (one column below):
  1. **"Waiting on you · {n} letters"**: one letter per needs-you card: card title, the lead
     sentence in quotes (serif italic), a portrait with agent name and age, and the tile's
     action button (Answer {agent} / Review / Open) labelled "Reply" visually only if it is a
     question or review (accessible name unchanged: "⚑ Answer {agent}", "⚑ Review").
  2. **"In progress"** (working) then **"Coming up"** (queued): title, "*{agent}* · {stage}".
  3. **"Shipped"** (done, newest first, five shown, then "Show all {n} shipped" disclosure) and
     **"Closed"** (canceled and rejected, behind "Show {n} closed").
- Every entry carries `CardFacts` (priority, live, blocked, sub-tasks, labels, first reference,
  asked by, cost and cost bar, due) as a small-caps line under the title, and `CardMoveMenu`.
- **"The pipeline"** at the foot: one line per stage from `stageSummaries()` (name, count/WIP in
  signal when at the limit, blocked count, gate, manager routing, owner line, "empty").
- "Write a new card" box at the end of column 3 runs the same compose action as "New card".
- No drag and drop (the move menu, M and Alt+arrows remain).

**Studio: a dense table.**
- Top bar: board name, `SUPERPIPELINE` product chip, filter chips All / Needs / Working / Idle /
  Done with counts (a quick filter on top of the FilterBar), and a readout "HH:MM PHASE".
- Metric tiles: cards, needs you, working, spend this week (from `board.usage`), over budget,
  overdue.
- Stage strip: one cell per stage with name, count/WIP, blocked, gate, mgr, owner line.
- Table (`role="table"` semantics via real `<table>`), one row per card: status light (needs =
  signal, blinking unless reduced; working = success; queued = faint; done = primary), title with
  `CardFacts` under it, agent (square face + name), a 6-step `StageTrack` mini (stopped in
  signal), attempts (`attemptCount`, signal when two or more failures), age (from `stateSince`),
  next (the attention instruction, or "auto · {state}"), cost, due, and the move control. The
  title cell is the button that opens the card (same aria-label as the tile, M and Alt+arrows).
- Phone: the table becomes stacked rows (title, then a facts grid); the header row is hidden
  visually but kept for screen readers via `<caption>` and per-cell `data-label`.

**Quiet: one list grouped by urgency.**
- H1 board name; "Superpipeline · {n} cards"; a "New card" link-styled button.
- Sections with H2: "Needs your decision ({n})", "In progress ({n})", "Waiting to start ({n})",
  "Done ({n})", "Closed ({n})". Empty groups show "None." (not hidden).
- Each item: a 5px signal rule on the left for needs-you items; title; meta line "{agent} ·
  {stage} · {age}"; `CardFacts` as plain text; the action link (Decide / Answer / Open);
  `CardMoveMenu`.
- "Stages" section at the end: a plain table of `stageSummaries()`.

### 5.2 The card drawer

Container per vibe (all full-screen below 600px; right-hand dialog otherwise):
Daylight 520px, Paper centred 680px sheet, Studio 760px, Quiet 640px.

**Daylight: a conversation.**
1. Sticky header: stage eyebrow and close ✕; title (H2, `id="drawer-title"`) and "Edit card";
   a `StageTrack` of the board's stages (current; stopped when the lead needs you); the status
   row snippet; the facts snippet (priority, due, labels, "in {stage} for {age}", "attempt N"
   when N > 1, all new in read mode).
2. **Pinned brief**: a button "📌 What {agent} was asked" (`aria-expanded`) over the description
   and acceptance criteria. Collapsed when the lead needs you, open otherwise.
3. **The agent's message**: a 36px face (mood) and a bubble: label "{agent} · needs you"
   (`say('agent.needsYou')`) or the agent's name, the lead sentence (or fallback), and the time.
4. **The reply**: the question panel (`QuestionDaylight`: quick-reply buttons for the options,
   the first primary; the note/answer composer; "Send answer"), or the gate panel
   (`GateDaylight`, §5.3), or the resume snippet.
5. Then, as titled sections in this order: error banner (moved to the very top, above 1),
   delivery, plan, details, project, links, sub-tasks, session activity, decisions, comments,
   handoff, cost, attempts, related prior work, references, card actions.
- Phone: the reply area sticks to the bottom of the sheet (safe-area padded) when it is a gate
  or question; the rest scrolls.

**Paper: a letter with enclosures.**
1. Header: "‹ {board}" back (closes), the light line ("in golden light"), a small "● A letter
   that needs a reply" eyebrow when the lead needs you, then "Re: {title}" as the H2.
2. **The letter**: "Dear {person's name}," then the lead sentence as a paragraph in the serif
   voice, then the signature: portrait, agent name, role ("delegate"), time. The status row and
   facts follow as a small-caps line.
3. **"Your reply"**: `QuestionPaper` (options as a choice list, the note "Note", "Send reply"),
   or `GatePaper` (§5.3), or the resume snippet.
4. **"Enclosed"**: `<details>` enclosures with a summary line naming what is inside and how much:
   - "The brief · {n} things to prove" → description, acceptance criteria, plan, details, project.
   - "What happened · {runs} runs" → session activity, decisions, handoff, attempts, cost.
   - "Who is waiting · {links + children}" → links, sub-tasks.
   - "Attached · {refs}" → references, related prior work, delivery (open by default when an
     approved delivery is in progress).
   - "Correspondence" → comments (open by default).
   The first enclosure is open when nothing needs you.
5. Footer: edit button, card actions. Error banner sits above the letter.

**Studio: a dashboard.**
1. Header bar: "‹ {board} / {short id}", a readout "HH:MM PHASE", close.
2. Title (H2) and stat tiles: stage "{i}/{n}", attempts, "stopped/working for {age}", cost
   "/ estimate", blocks (links count), sub-tasks "{open}/{total}"; the `StageTrack`.
3. **Readout**: a status light and "{AGENT} · NEEDS DECISION" (or the state), then the lead
   sentence in mono.
4. Tabs (`role="tablist"`, arrow keys, each tab labelled with a count): **Spec** (description,
   criteria, plan, details, project, facts), **Log** (session activity, decisions, handoff,
   attempts), **Links** (links, sub-tasks, references, related), **Talk** (comments),
   **Cost** (cost, delivery). The status row and edit button sit above the tabs; card actions at
   the foot of every tab.
5. **Command bar** (sticky bottom): `QuestionStudio` (a "Note to {agent}" input, then one button
   per option) or `GateStudio` (§5.3) or the resume snippet.

**Quiet: a form, then the facts on one page.**
1. "← {board} board" (closes); H2 title; one meta line "Stage {i} of {n}: {stage} · Agent:
   {name} · {state} {age} ago".
2. **"Your decision is needed"** `fieldset` when the lead needs you: the lead sentence as a
   paragraph, then `QuestionQuiet` (radio options with their titles, "Note for {agent}
   (optional)", "Submit decision"; or a textarea and "Send answer"), or `GateQuiet` (§5.3), or the
   resume snippet.
3. Then H3 sections in reading order, no disclosure: Details (status row, facts), Description,
   Acceptance criteria, Plan, History (session activity), Decisions, Comments, Links, Sub-tasks,
   Project, Handoff, Cost, Attempts, Delivery, References, Related prior work, Card actions.
- No glyph decoration, no motion, names only.

### 5.3 The gate and question panels

All four gate panels show: "⚑ awaiting your review"; the gate error banner (`role="alert"`, next
to the decision); the immutable approval subject (revision, id, digest, canonical JSON, scrolling
at 16rem); a seal line "Approving exactly this version · sealed {digest 0-4}·{digest 4-8}"; the
decision note (label "Add a note (optional)", "Say what needs to change" when invalid,
`id="gate-note-{gateId}"`, 8192 limit, "{n} / 8192" counter, `aria-invalid`); one control per
gate option (approve variants, request_changes, reject); busy disables them.

| | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|
| Frame | Face + headline, subject as a post-preview card | "Re: approval" letter, subject as an enclosure | Readout + subject as a mono block | Fieldset "Your decision is needed" |
| Controls | Buttons: Request changes (outline), Reject (quiet), approve options (primary) | A choice list of the options, then "Send reply" | Note input on the command bar, then buttons | Radio buttons with each option's title, then "Submit decision" |
| No choice made | n/a | "Pick a decision first." | n/a | "Pick a decision first." |
| Phone | Buttons sticky at the bottom | Reply box in flow | Command bar sticky | In flow |

Question panels mirror them (option buttons, or a choice plus "Send reply", or note plus buttons,
or radios plus "Submit decision"; the free-text answer with "Send answer" when there are no
options; "⚑ awaiting your sign-in" when `signal=auth`; "Pick one of the options." / "Type an answer
first."). The answer's error now shows inside the panel (`role="alert"`), not in the drawer's top
banner.

## 6. Words

- Button, field, link and badge wording is the same in every vibe (decision 6).
- Per vibe: the lead's frame (`say('agent.needsYou')`), the greeting (`greeting()`), the
  Superlibrary reconnect message (`say('error.previewReconnect')`), and these product strings in
  `lib/copy.ts`, each written four ways and tested for completeness and for no local names:
  - lead fallbacks for the eight kinds;
  - "{n} cards want you." / "Nothing needs you." and their equivalents;
  - the light words Paper prints (first light … lamplight).
- Headings that exist in only one vibe's layout (Paper's enclosure names, Studio's tab names,
  Quiet's group names) are written in that layout, once, in that vibe's tone.
- Fallbacks (shown only when the agent said nothing):

| Kind | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|
| question | I've got a question for you 🙋 | I have a question before I go on. | QUESTION PENDING. | The agent asked a question. |
| review | All done, ready for your review ✨ | It's ready for you to review. | AWAITING REVIEW. | Waiting for your review. |
| stopped | I've stopped and need you 😕 | I stopped, and I'd rather ask than guess. | STOPPED. Needs operator. | Stopped. Waiting for you. |
| failed | That run failed 😬 | The last run failed. | FAILED. | The run failed. |
| budget | I've hit the budget cap 💸 | I've reached the budget cap. | OVER BUDGET. | Over its budget cap. |
| working | On it! | I'm working on it. | WORKING. | Working. |
| done | Done! 🎉 | This is done. | DONE. | Completed. |
| idle | Waiting to be picked up. | Waiting to be picked up. | QUEUED. | Not started. |

Emoji are decorative and wrapped in `aria-hidden` spans by `lib/copy.ts`'s `speak()` helper so
screen readers read the words only.

## 7. Parity table

Legend: **A** = adaptive screen: the item is in the same place, with the same words, in every
vibe. "Tile" = Daylight's `CardTile`; "Facts" = `CardFacts`; "Move" = `CardMoveMenu`;
"Stages" = the stage summary (Paper's "The pipeline", Studio's stage strip, Quiet's "Stages").
Section names refer to §5.2.

### 7.1 Frame, shell, landing, onboarding

| # | Item | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|---|
| F1 | Loading: mark, wordmark, "loading your boards…" | A | A | A | A |
| F2 | Board loading / `app.error` line | A | A | A | A |
| F3 | Landing: mark, wordmark, H1, lede | A (+ greeting) | A | A | A |
| F4 | Sign-in notice (plane / github copy) | A | A | A | A |
| F5 | Sign in / Sign in with GitHub CTA | A | A | A | A |
| F6 | Continue with AgentPod, its busy and failure text | A | A | A | A |
| F7 | Read the docs link | A | A | A | A |
| F8 | Pipeline illustration: name, eyebrow, stages, owner chip, gate tag, wip, footer text | A | A | A | A |
| F9 | Three cells | A | A | A | A |
| F10 | Footer links (Docs, GitHub, AgentPod, supermessage) | A | A | A | A |
| F11 | Onboarding: welcome, eyebrow, H1, text, template chips, Create my first board / Creating…, Connect an agent, sign out, error | A | A | A | A |
| F12 | Rail: logo link, Plan / Operate / Workspace, aria-current, needs-you dot | A | A | A | A |
| F13 | Rail: theme toggle, avatar or initial, Sign out | A (+ Appearance) | A | A | A |
| F14 | BottomNav: four columns, dot + sr-only count | A | A | A | A |
| F15 | You menu: name, login, theme switch, Sign out, Esc/outside close | A (+ Appearance…) | A | A | A |
| F16 | BoardHeader: switcher, live/offline dot + tooltip (hidden < 420px), search ⌘K, + New card (label hidden < 360px) | A | A | A | A |
| F17 | BoardSwitcher: name + chevron, Find a board (> 8), list with "here", no-match text, Rename (Enter/Esc/save), Board settings, Delete… (confirm with card count), + New board | A | A | A | A |
| F18 | ComposeSheet: eyebrow, board name, title, priority, due + clear, description, Cancel, Dispatch / Dispatching…, autofocus | A | A | A | A |
| F19 | NewBoardDialog: eyebrow, H2, name, templates + Blank, stage editor (reorder, name, agent/human, remove, capabilities, all/any, gate, WIP), Add stage, unstaffed warning, Cancel, Create board / Creating… | A | A | A | A |
| F20 | CommandPalette: input, esc chip, groups Cards / Agents / Actions / Account with icons, subs, No matches, footer, keys | A (+ Appearance…) | A | A | A |
| F21 | Global Escape closes the card | A | A | A | A |

### 7.2 Plan toolbar, List, Projects

| # | Item | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|---|
| P1 | Board / List / Projects toggle, aria-pressed | A | A | A | A |
| P2 | FilterBar: filter button + count, chips (state, owner, P{n}+, needs review, working, over budget, labels, archived, project) with ×, clear all | A | A | A | A |
| P3 | Filter popover sections (state, owner, labels, project, min priority, four checkboxes) | A | A | A | A |
| P4 | List view: group by, sortable header, group header + count, row fields, empty text | A | A | A | A |
| P5 | Projects view: header, + Project / Cancel, create form, loading, error, empty, per-project name, state chip, health chip, target, delete, rollup bar + provenance line, rollup error/loading, milestones (rows, remove, empty, add form, errors) | A | A | A | A |
| P6 | Studio quick filter chips All / Needs / Working / Idle / Done | — | — | top bar (new) | — |

### 7.3 Board view: lanes and stages

| # | Item | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|---|
| B1 | Stage name | lane `<h2>` | Stages line | stage strip cell | Stages table row |
| B2 | Count and /wip, signal at limit | lane header | Stages line | stage strip | Stages table |
| B3 | "⛔ N blocked" with tooltip | lane header | Stages line | stage strip | Stages table |
| B4 | "gate" eyebrow | lane header | Stages line | stage strip | Stages table |
| B5 | "mgr" | lane header | Stages line | stage strip | Stages table |
| B6 | Owner line (capability + agents, nobody-declares warning + tooltip, a person, approval, agent name, no capability set) | lane-owner | Stages line | stage strip | Stages table |
| B7 | Empty stage "empty" | dashed strip | Stages line "empty" | stage strip "empty" | Stages table "empty" |
| B8 | StageStepper (< 900px): "{stage} {count}/{wip}" tabs, smooth scroll | below 900px | n/a: covered by B1–B2 in Stages | n/a: B1–B2 | n/a: B1–B2 |
| B9 | Flow arrows between lanes | 900px+ | Stages lines joined by → | stage strip → | Stages table order |
| B10 | Drag and drop between lanes, drop highlight | yes | Move menu | Move menu | Move menu |
| B11 | Card's stage (which lane) | lane | "{agent} · {stage}" line | StageTrack + stage column | meta line |
| B12 | Greeting band, attention count, crew faces (new) | above lanes | masthead | readout + metric tiles | heading line |
| B13 | Peek (new) | ≥ 1440px aside | — (letters are the peek) | — | — |

### 7.4 Board view: every card

| # | Item | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|---|
| C1 | Priority (P1/P2 stripe + sr-only "Priority N") | stripe | Facts "P{n}" | Facts | Facts |
| C2 | Title, opens the drawer; aria-label with stage and keys | tile button | entry title button | title cell button | item title button |
| C3 | Live dot "Agent working" | tile | Facts | status light + Facts | Facts "working" |
| C4 | Move control ⇄, stage menu, "· here", Esc, sr-only announcement | tile | Move | Move | Move |
| C5 | Keyboard: Enter opens, M toggles move, Alt+←/→ moves | tile | entry button | title cell | item button |
| C6 | "⛔ Blocked" pill + tooltip | tile | Facts | Facts | Facts |
| C7 | Sub-task pill "{open}/{total}" + tooltip | tile | Facts | Facts | Facts |
| C8 | Labels (3) + "+N" tooltip | tile | Facts | Facts | Facts |
| C9 | First reference chip, sub-state badge, link when http(s) | tile | Facts | Facts | Facts |
| C10 | Delegate avatar / initial / "—", tooltip name | face 24 + name + mood | portrait + name | square face + name | name |
| C11 | "asked by {name}" chip, tooltip, icon | tile | Facts | Facts | Facts |
| C12 | Cost $ (signal over budget), tooltip | tile | Facts | cost column | Facts |
| C13 | Due date, ⚠ overdue | tile | Facts | due column | Facts |
| C14 | Cost bar against card cap + tooltip | tile | Facts | Facts | Facts (text "{pct}% of cap") |
| C15 | "⚑ Answer {agent}" button | tile | letter action | next column button | item action |
| C16 | Gate style + "⚑ Review" button | tile | letter action ("Waiting on you") | row highlight + button | "Needs your decision" + action |
| C17 | Archived cards hidden unless the filter shows them | filter | filter | filter | filter |
| C18 | Lead sentence, mood word, attempts, age (new) | peek / mood word | quote + age | readout cols | meta line |

### 7.5 Card drawer

| # | Item (inventory §2.6) | Daylight | Paper | Studio | Quiet |
|---|---|---|---|---|---|
| D1 | Dialog, aria-modal, labelled by title, scrim close, Tab trap, focus to panel, focus return to tile | shell | shell | shell | shell |
| D2 | Stage eyebrow, close ✕ "close (esc)" | header | "‹ board" + ✕ | header bar | "← board" + ✕ |
| D3 | Title H2, Edit card | header | "Re: title" H2, footer Edit | title + edit | H2, Details Edit |
| D4 | State pill | status row | small-caps line | above tabs | Details |
| D5 | Delegate "{name} · delegate", tooltip id | status row | signature + line | above tabs | Details |
| D6 | "owner · {name}" | status row | line | above tabs | Details |
| D7 | Provenance chip (agent icon, grant tooltip / person) | status row | line | above tabs | Details |
| D8 | "assign to me" / "assigning…" | status row | line | above tabs | Details |
| D9 | Live dot while working | status row | line | readout light | Details |
| D10 | Edit form: title, priority, due + clear, description, labels (+ blind notice), acceptance criteria, Save / Saving…, Cancel | replaces header | replaces letter head | replaces title block | replaces H2 block |
| D11 | Priority, due, labels in read mode (new) | facts | small-caps line | Spec tab | Details |
| D12 | Local error banner | top | top | top | top |
| D13 | Description | pinned brief | Enclosed: The brief | Spec | Description |
| D14 | Question: heading (answer / sign-in), "{agent} is waiting", question text | lead bubble + QuestionDaylight | letter + Your reply | readout + command bar | fieldset |
| D15 | Question: option buttons (first primary), note textarea, or answer textarea + Send answer, validation messages | QuestionDaylight | QuestionPaper | QuestionStudio | QuestionQuiet |
| D16 | Gate: "⚑ awaiting your review", error banner | GateDaylight | GatePaper | GateStudio | GateQuiet |
| D17 | Gate: immutable subject (revision, id, digest, canonical JSON) | Gate* | Gate* | Gate* | Gate* |
| D18 | Gate: note (label, invalid label, id, placeholder, maxlength, counter, aria-invalid) | Gate* | Gate* | Gate* | Gate* |
| D19 | Gate: option controls (approve variants, request changes needs note, reject), busy | buttons | choice + Send reply | buttons | radios + Submit decision |
| D20 | Gate: approve_manual stays open, others close | model | model | model | model |
| D21 | Approved delivery: title, mode, manual items (Post N, Copy exact text / Copied, text, downloads / unavailable), Live post URL, Record URL, recorded URL + read-back, Switch to automatic; automatic texts; Switch to manual; clipboard refusal | section | Enclosed: Attached | Cost tab | Delivery |
| D22 | Resume panel: heading by reason, failed attempts, detail, Resume at select, ResumeBox label, textarea, Send back to work, error | reply area | Your reply | command bar | fieldset |
| D23 | Agent plan: %, steps, struck done, bar, "{done} / {n} steps · {pct}%" | section | The brief | Spec | Plan |
| D24 | Acceptance criteria list | pinned brief | The brief | Spec | Acceptance criteria |
| D25 | Details: "{n} fields", StructuredValue (prose, nested, Show more, Show all / fewer, —), View raw JSON / Hide, Copy / Copied | section | The brief | Spec | Details |
| D26 | Project / milestone: No project or names, assign / change, form (selects, Save / Saving…, Cancel, error) | section | The brief | Spec | Project |
| D27 | Links: blocked by, resolved, blocks, relates, replaces / replaced by, advisory with suffix, remove / …, empty, errors | section | Who is waiting | Links | Links |
| D28 | Add link form: note, board select, cross-board notice, card select, kind select, Add / Adding… / Cancel, refusals | section | Who is waiting | Links | Links |
| D29 | Sub-tasks: "{open}/{total} open", rows (title, state pill, cost, open child), input, Add / Adding…, error | section | Who is waiting | Links | Sub-tasks |
| D30 | Activity: provenance line with grant summary | section | What happened | Log | History |
| D31 | Activity: empty text; show / hide tool calls; run count | section | What happened | Log | History |
| D32 | Activity: one details per run (summary: stage/run, agent, outcome, attempt N, events · errors); latest open | section | What happened | Log | History |
| D33 | Activity rows: glyph, type, action, body (signal for error/elicitation), time, parameter / result | section | What happened | Log | History (no glyph animation; glyphs kept as text) |
| D34 | Run notes, failed reason, handed on, attached here | section | What happened | Log | History |
| D35 | "streaming live…" with dot | section | What happened | Log | History |
| D36 | Decisions: decision/status, at stage, by name, comment (the decision note) | section | What happened | Log | Decisions |
| D37 | Comments: author, agent badge, timestamp, Delete (own), "Comment deleted", plain text, empty text, composer, ⌘/Ctrl+Enter, Comment / Posting…, errors | section | Correspondence | Talk | Comments |
| D38 | Handoff from prior stage | section | What happened | Log | Handoff |
| D39 | Cost: $, / estimate, over budget, N× sample + tooltip, meter | section | What happened | stat tile + Cost tab | Cost |
| D40 | Attempts (≥ 2): rows with agent, profile/model, $, outcome | section | What happened | Log | Attempts |
| D41 | Related prior work: loading, unavailable + Try again (+ Reconnect on no_token), nothing, rows | section | Attached | Links | Related prior work |
| D42 | References: library previews (Show / Hide preview, title link, viewer, first open), other ref chips, attach input + Add | section | Attached | Links | References |
| D43 | Preview error: vibe reconnect message + Reconnect + reason | references | Attached | Links | References |
| D44 | Footer: Archive card / Archived — un-archive, Delete card (confirm) | section | footer | each tab foot | Card actions |
| D45 | Lead sentence + face (new) | bubble | letter | readout | fieldset paragraph / meta |
| D46 | Stage track (new) | header | — (stage named in line) | header | meta "Stage i of n" |

### 7.6 Operate, telemetry, settings, workspace

All **A** in every vibe.

| # | Item |
|---|---|
| O1 | Operate layout: one column, two from 1200px; NeedsYou + Running left, Spend + Activity right |
| O2 | NeedsYou: header, count (signal / muted), All boards →, empty text |
| O3 | NeedsYou rows: kind badge (nine kinds; urgent in signal, asked in primary), title opens card, "[board · ]headline[ · age]", detail (140 + Show all / Show less), instruction |
| O4 | NeedsYou actions: Resume (ResumeBox, Send back to work / Cancel), Review, Answer, Open log, Staff an agent, Move (select + Move card + error), Open |
| O5 | Running: header + count, rows (face, name, title · stage, cost > 0), empty text, opens card |
| O6 | Spend: header, last 7 days, detail link, total with cap or "no cap set" (signal over), cap bar, top 5 agents, budget editor (Set a budget cap / Change the caps, board cap $, card cap $, save, cancel), error |
| O7 | Activity: header, "{n} unread", show all / unread only, rows (UTC time, kind, body opens card, ✓ Mark read), read rows dimmed, both empty texts |
| T1 | Telemetry: eyebrow, H1, "{board} · last 7 days / 5 hours" toggle, loading, error, ← Operate |
| T2 | Four metric tiles with their sub-lines |
| T3 | By agent (face, name, bar, $), By model, Top spenders · by card, empty states |
| T4 | Board log (60 events, "HH:MM:SS type k=v"), empty, error |
| T5 | Footer teaser line |
| S1 | Settings: eyebrow, H1, ← Board, name + Rename |
| S2 | Pipeline editor per stage (earlier/later, name, key, remove + disabled tooltip, owner kind, capability + all/any, gate, standing rule + saved flash, WIP, card count), add a stage + Add, error, Save pipeline / Saving… |
| S3 | Schedules: explanation, rows (title, paused, pause/resume, remove, rule, tz, overlap, into stage, next, last, owner, skipped N warning), add form |
| S4 | GitHub: payload URL + copy, secret + configured + Generate + copy, issue checkbox, trigger-grant text, Save GitHub settings |
| S5 | Agent profiles: list, add form |
| W1 | Workspace chrome: ← Board, H1, tablist, active tab |
| W2 | Needs you tab: rows with board name, open / resume, Refresh, empty, "{n} board(s) did not answer…", loading, error |
| W3 | Agents tab: new-token banner + copy + Done, unlinked note, per agent (face, name, capability chips or warning, linked, tokens, ⋯ menu items, revoke ×), edit mode (name, CapabilityPicker, cards at once, avatar URL, save / cancel), empty, new agent form |
| W4 | Capabilities tab: unasked / unheld warnings, per capability (key, counts, inferred, remove, description, implies chips + ×, +), add + similar hint, errors, empty |
| W5 | Labels tab: colour, name (rename on blur), inferred, remove; add row; loading; empty |
| W6 | People tab: member, role select + tooltip, remove; invite email, role, Invite; help text |
| W7 | Connections tab: forge host (change / set / save / cancel / error), fleet link, Connect to AgentPod, all-linked text, add from agentpod (chips, picker, Add N / Adding…, failures) |
| K1 | Keyboard shortcuts in inventory §2.11 (all retained; Studio tabs add arrow keys) |

## 8. Accessibility and performance

**Accessibility (WCAG 2.2 AA, checked by axe per vibe × theme on the key screens):**
- Text 4.5:1, interface parts 3:1. vibekit checks its tokens; Superpipeline adds no colour of its
  own except label colours (user data), which keep their existing text-contrast fallback.
- Targets 44px on coarse pointers and for every new control (`--vk-target-min`); 24px floor
  elsewhere stays.
- Inputs at least 16px on touch; the gate note and question composers are 16px everywhere.
- Every disclosure is a real `<details>`/`<summary>` or a button with `aria-expanded` and
  `aria-controls`. Studio's tabs follow the APG tabs pattern (roving tabindex, arrows, Home/End).
  Quiet's decisions are a `fieldset` with a `legend`.
- The signal never carries meaning alone: every signal colour sits next to a word or glyph.
- Reduced motion, increased contrast and forced colours: vibekit's reduce tier wins. No view
  transition, no blink, no pulse. Focus is always visible (unlayered rule).
- No layout shift: the greeting band, the peek and the lead reserve their height before data
  (fixed min-heights); faces have fixed sizes; fonts use `font-display: swap` from Fontsource with
  metric-compatible fallbacks (`system-ui`).
- Focus order follows reading order in every layout; the sticky reply areas are after the lead in
  DOM order.

**Performance:**
- No new network requests. Faces are inline SVG strings.
- Only the active vibe's fonts download. Measure: on a cold load of a board in Daylight, the
  network panel shows Figtree and Bricolage (and Martian Mono only if mono text renders), nothing
  else.
- Layout components are statically imported (they are small); the JS for `/b/[boardId]` must not
  grow by more than 25% over today's build (checked in the ship task by comparing
  `du -sk apps/web/build/_app/immutable`).
- The peek and the Studio table read `CardSummary[]` built once per snapshot (`$derived`), never
  per row.

## 9. Test strategy

**Unit (vitest, `pnpm --filter @superpipeline/web exec vitest run <file>`):**
- `appearance.svelte.test.ts` (jsdom): cookie read, defaults, malformed cookie, set writes cookie
  without Domain, vibe change moves the default time strength, html attributes, theme-color.
- `head-script.test.ts`: `app.html` contains vibekit's `HEAD_SCRIPT` verbatim, the migration
  precedes it, no Google Fonts.
- `no-raw-colour.test.ts`: no `#hex` or `rgba(` in `.svelte` or `app.css` outside an allow-list
  (label colour defaults, the vendored embed); no `display:\s*none` in the per-vibe blocks.
- `copy.test.ts`: every product string has four wordings, the placeholders match, no local names.
- `card-lead.test.ts`, `card-summary.test.ts`, `ref-chip.test.ts`, `gate-decision.test.ts`,
  `question-answer.test.ts`, `reconnect.test.ts`.
- `layouts.test.ts`: every vibe has a board and a card layout; after each phase, that vibe's
  entries are its own components.
- `layout-parity.test.ts`: every card layout renders each of the 23 sections exactly once, a
  `Gate*` and a `Question*`, and uses `lead`; every non-Daylight board layout renders `CardFacts`,
  `CardMoveMenu` and `StageList`.
- Changed: `superlibrary.test.ts` (no_token sentence), `LibraryArtifact.svelte.test.ts`
  (Reconnect), `CommandPalette.svelte.test.ts` and `BottomNav.svelte.test.ts` (`app.theme` →
  `appearance`, new Appearance item), `installable.test.ts` (theme-color values),
  `GateActions.svelte.test.ts` → `GateDaylight.svelte.test.ts` (same assertions).

**End to end (Playwright, `pnpm --filter @superpipeline/web e2e`):**
- Removed: `theme.spec.ts`. Added: `appearance.spec.ts` (first visit Daylight + sun at a fixed
  noon and at 23:00; picker changes vibe and theme, cookie written, reload keeps the vibe with the
  attribute already set at `DOMContentLoaded`; legacy `superpipeline.theme` migrates).
- Changed: `responsive.spec.ts` (the "theme is reachable" case still finds `/theme/i`; add
  Appearance), `mobile.spec.ts` unchanged names.
- Unchanged and must stay green: board, gates (label "Add a note (optional)", buttons Approve /
  Request changes / Reject, 44px at 390px), elicitation (`.elicitation`), drawer, resume,
  readable-handoff, addressable, nav, cmdk, stage-tabs, viewport, mobile-overflow, installable,
  reachable. They run in the default vibe (Daylight).
- Added: `vibes.spec.ts`, for each vibe (cookie set before navigation) × light and dark (fixed
  clock 12:00 and the theme set explicitly):
  - the board, a card with a pending gate, and a card with a pending question, at 1280×820 and
    390×844;
  - **reachability**: after opening every `<details>` and visiting every tab, each inventory
    action for that screen is found by role and name (list in the plan, Task 15);
  - **axe**: `@axe-core/playwright` with tags `wcag2a, wcag2aa, wcag21aa, wcag22aa`, zero
    violations;
  - **no horizontal overflow** at 390px;
  - **screenshots** attached to the report (`testInfo.attach`), not compared (decision 9).
- Each phase adds its vibe to the `LAYOUT_VIBES` list in `vibes.spec.ts`; skins-only vibes run
  the same checks against the Daylight layout from Phase 1.

## 10. Rollout

Each phase merges to Forge `main` and deploys on its own (§10.1). CI must be green (`test`,
`e2e`); `deploy` follows.

| Phase | Ships | Shippable because |
|---|---|---|
| 0 | vibekit 0.0.1 tarball exists (vibekit foundations merged, `pnpm pack`) | prerequisite only |
| 1 | vibekit vendored; tokens and fonts swapped; appearance store, head script and picker; Superlibrary Reconnect; faces; card lead; Daylight board (greeting, crew, faces, peek); drawer cut into sections with the Daylight conversation layout; Daylight gate and question; adaptive screens re-tokened; all four vibes selectable as skins | every screen renders in every vibe via the Daylight layouts; full parity is tested |
| 2 | Paper board, card, gate, question; Paper registered | registry swap is one line; tests cover the new layouts |
| 3 | Studio board, card (tabs), gate, question; registered | same |
| 4 | Quiet board, card, gate, question; registered | same |
| 5 (follow-up) | Linux screenshot baselines committed and compared | optional |

### 10.1 Deploy and verify

- Merge on Forge (the operator merges). Forge runs `test` and `e2e`; the push mirror reaches
  GitHub `main`; GitHub Actions runs `test`, `e2e`, then `deploy` (D1 migrate, `wrangler deploy` of
  `superpipeline-api`, which serves the SPA).
- Verify: `curl -s https://app.superpipeline.dev/health` → `{"ok":true,…}`;
  `curl -s https://app.superpipeline.dev/_app/version.json` shows a different version from the one
  before the merge; `gh run list --repo SuperJackfruitLabs/superpipeline --limit 3` shows the deploy job green
  on the merge commit; `curl -s https://app.superpipeline.dev/ | grep -c vk_appearance` is 2 or
  more (the migration and HEAD_SCRIPT are in the shipped HTML) and
  `grep -c fonts.googleapis` is 0.
- Rollback: revert the merge on Forge; the next deploy restores the previous SPA. No data or API
  change is involved, and the `vk_appearance` cookie is harmless to the old app.

## 11. Risks

1. **The tarball does not exist yet.** vibekit's foundations are mid-implementation. Phase 1
   cannot start until it is packed. If its exports differ from the foundations plan (names,
   component props), Task 1 records the difference and the plan's imports are adjusted, not
   vibekit.
2. **CSS import resolution.** `fonts.css` imports Fontsource packages that are vibekit's
   dependencies, not the app's. With pnpm they may not resolve from `apps/web`. Fallback written
   into Task 1: add the seven Fontsource packages as direct dependencies at the same versions.
3. **Cascade order.** If Tailwind's generated layer statement wins over ours, vibekit's component
   classes could beat utilities. Task 1 checks the built CSS's first `@layer` statement.
4. **CardDrawer is 1944 lines.** Cutting it into snippets is mechanical but large. It is its own
   task with no visual change, and the e2e drawer specs gate it.
5. **"Follow the sun" ignores OS dark mode.** A person who never touched the old toggle and uses
   OS dark mode will see light during the day. That is vibekit's decision; the picker offers Dark.
6. **Svelte top-level snippet referencing.** The drawer passes snippets in an object literal in
   markup, which Svelte 5 supports; if `svelte-check` objects to a snippet reading a possibly
   undefined `card`, each snippet guards with `{#if card}`.
7. **Overnight timing.** Phase 1 is about 15 tasks. If time runs short, Phase 1 can ship after
   Task 7 (tokens, picker, faces, reconnect: every screen in vibekit, no new layouts) and again
   after Task 13; both points leave the app consistent.
