# Screen spec: operate-list-pages

Group: `operate-list-pages`. This file covers SP-Operate-Daylight/-Paper/-Studio/-Quiet, SP-List-Daylight/-Paper/-Studio/-Quiet, SP-Projects, SP-Workspace-Agents, SP-Workspace-Other, SP-Settings and SP-Spend.

Binding inputs: `screen-spec-brief.md` (architecture decisions 1–5), the reference HTML in `apps/web/e2e/reference/mockups/<Artboard>.html` (sizes in `manifest.json`), the editable sources `vibes-mockups/project/<Artboard>.dc.html` and `vk.css`. Code references are to `origin/main` (1a4dc22) of the superpipeline repo.

Out of scope here (specified in other groups): the app shell (Rail, the Quiet text nav, Studio's keyboard rail, BottomNav, BoardHeader with board name, "Live", Search ⌘K and New card), the Board/List/Projects view toggle with FilterBar, and the dialogs. Each section below says where the shell slot sits and starts at the page's own content.

Each vibe-specific screen (Operate, List) gets one Svelte component per vibe, picked in `src/lib/layouts.ts`. Each shared screen (Projects, Workspace, Settings, Spend) is one component. Its per-vibe differences are `:global([data-vibe=x])`-scoped CSS, ported from the mockup's `[data-vibe=x]` rules, and every vibe branch is listed.

## Cross-screen ruling: the "highest-severity blocker" card is Waiting on you

**The conflict.** SP-List-* show "Fix the highest-severity blocker found in the clean-room journey" as **Queued / Unclaimed**. SP-Board-* show it as "With you · no agent works this stage" (Studio says "Waiting on you"), and SP-Operate-* list it under Needs you as **Unclaimed · No owner**.

**The facts in the API.** The card has `state = 'submitted'` in stage `reported` (Reported). That stage has `ownerKind: 'human'`, no `gate`, and is not the last stage. `stateSince` is 2026-10-09 (2 days before the snapshot at 2026-10-11T13:51Z). Its due date was 6 Oct, so it is overdue.

**What each derivation says.**
- `attention/attention.ts › itemsFromBoard()`: the card is `submitted`, staleness is on (24 h default), `ageHours ≥ 24`, and `isOwnerlessStage(stages, 'reported')` is true because a `'human'` owner is not claimable and the stage has no approval gate. So the function emits an `AttentionItem { kind: 'no-owner', headline: 'Nothing claims stage reported', instruction: 'No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.', actions: ['move','open'] }`. This is the "No owner" row in Operate.
- `card/card-lead.ts › cardLead()` does not model ownerless stages. It falls through to `kind: 'idle', needsYou: false`. That is an omission, not a decision.
- `stores/app.svelte.ts › app.needsYou()` counts only gate, elicitation, overBudget and failed cards. That leaves out both `input-required` stops and no-owner items, so for this board it returns 0, not 3. It is the wrong source for any count.

**Ruling.** The attention item is what decides "a person is needed now". It feeds Operate's Needs you list and the "3 need you" counts that every artboard shows. So the card is **Waiting on you**, and the board has **3** cards waiting on a person: this one plus the two stopped cards, "AgentPod: connector interface…" and "Superpipeline: manual-delivery completion…".

**What List must do.** List must match Board and Operate.
- The State cell reads "Waiting on you" in the signal style, exactly like the other two rows that need you. The sub-reason reads "No owner".
- The Agent cell stays "Unclaimed". That cell describes who holds the work, and nobody does.
- List-Quiet's summary must read "6 cards. 3 are waiting on you." The mockup's "2" is wrong.
- The rule is implemented once, in the shared helper `listStateOf(card, items)` (see the List section). The helper never consults `card.state` alone.

**Follow-ups this ruling creates.**
- Every "N need you" count is `itemsFromBoard(board, agents).length`. `app.needsYou()` is deleted, or reimplemented as that call.
- `cardLead()` gains a no-owner branch, so the card drawer agrees with these screens. The branch goes before the `overBudget` check. It applies when `card.state === 'submitted' && isOwnerlessStage(stages, card.currentStageKey) && ageHours ≥ stale.afterHours`, and returns `{ kind: 'stopped', needsYou: true, sentence: null, source: 'none' }`. Adding it changes `LeadInput`: it needs `stages` and `stale`.

## Cross-section decisions (apply everywhere in this file)

- **vibekit components.** Reusable patterns are `vibekit:<Name>` components: buttons, tabs, figure rows, tables, faces with names, pills, chips, footnotes, disclosures, fields, filters, and empty or loading states. Each section opens with a "vibekit components used" table. Mockup CSS quoted under "reference for vibekit:<Name>, not app CSS" belongs to the library, not to the app. vibekit components must render the mockup's DOM (`details`/`summary`, `.field`, `.skel`, …) so that the screens' scoped layout selectors still match (PR-G*, WA-G*). The names are reconciled with the separate vibekit inventory. `ChipGroup` (Workspace-Agents) is an addition beyond the suggested list.
- **Shared screen stylesheet.** `apps/web/src/lib/styles/screen.css`, scoped under `.screen`, holds only the type scale `.t-*`, `.page`, `.panel*` and `.sr` (defined in the Workspace-Agents section). Projects, Workspace-Other, Settings and Spend reuse it and list their own additions.
- **Faces are seeded by agent name**, not by id (WA-G7, LI-G4). `brief/faces.md` was generated from names. The rule applies to every screen in this file.
- **Studio tokens.** `--vk-color-rule` and the Annual-report fonts are missing from vendored vibekit 0.0.1 (WA-G10, SE-G9). They need a new vibekit tarball before the Studio pixel diffs can pass.
- **No-owner headline.** `AttentionItem` gains `stageName`. `ownerless()` reads `` `nothing claims the ${stageName} stage` `` (WO, Component tree). Operate and List draw that row with their own per-vibe words, so neither depends on the old headline. Operate's `staleLine` parses the server's *notification* body (`nothing claims stage`), which this change does not touch.
- **One canonical Developer Experience seed.** The sections drafted their fixtures separately. Where they differ, these values win, and the seed (`apps/api/scripts/seed-dev.sql` / `e2e/support/seed.ts`) uses them for every screen:
  - **Board and stages:** the Board settings §7 table. Board `brd_134a0ddb6d434478`, `stale { enabled: true, afterHours: 24 }`. The seven stage keys are `reported, reproduce, test, fix, integrate, signed-off, shipped`. The failing-test stage's key is **`test`**, not `failing-test` as the Operate fixture writes it.
  - **Cards:** the List section's fixture table, for ids (`card_ace250c9c25342e4` and the others), owners, labels, `queuedBy` and `stateSince`. The two stopped cards have `stateSince 2026-10-10T04:51:00Z`, 33 h before the clock. The no-owner card has `2026-10-09T09:51:00Z`, 52 h before, which displays as "2 days". Read the Operate card table with those `stateSince` values. Its "33.35 h" becomes 33.0 h, and every displayed age is unchanged.
  - **Notifications:** the Operate fixture's 16 rows, with Spend's to-the-second `createdAt` for the three shown: 2026-10-10T22:50:12Z (B), 22:25:12Z (A) and 09:55:20Z (C). Displayed times are minute-precision, so the mockups are unaffected.
  - **Usage and activity:** the Spend section's fixture. Agents: the Workspace-Agents fixture (17 agents, WA-G1).
  - **Clock:** frozen at 2026-10-11T13:51:00Z, timezone UTC. Settings' reference script installs 13:49 and lets the two real PATCHes run before the capture. That is the only exception.
- **Counts of "need you"** everywhere = `itemsFromBoard(board, agents).length` (OP-G1, LI-G1). For the fixture, that is 3.
- **Reference re-exports.** Several rulings change what the mockup draws: OP-G9, LI-G1, WA-G1/G6, WO-G2/G3/G10/G11, SE-G3/G10 and SN-G3. Until the artboards are re-exported, the pixel test masks those regions. Each gap names the region to mask.

## Contents and gap index

| Section | Artboards | Gaps |
|---|---|---|
| Operate | SP-Operate-Daylight, -Paper, -Studio, -Quiet | OP-G1 to OP-G15 (15) |
| List | SP-List-Daylight, -Paper, -Studio, -Quiet | LI-G1 to LI-G14 (14) |
| Projects | SP-Projects | PR-G1 to PR-G10 (10) |
| Workspace · Agents | SP-Workspace-Agents | WA-G1 to WA-G14 (14) |
| Workspace · other tabs | SP-Workspace-Other | WO-G1 to WO-G15 (15) |
| Board settings | SP-Settings | SE-G1 to SE-G18 (18) |
| Spend | SP-Spend | SN-G1 to SN-G10 (10) |

Total: 96 gaps, each with a ruling. API contract changes requested:
- OP-G*: see the Operate gaps table.
- WA-G2: `GET /v1/agents` gains `claimedCount` and `workingCount`.
- SE-G1: `github.webhookUrl` on the board snapshot.
- SN-G1: `UsageSummary.byDay`.
- SN-G4: notification event `body`.



---

## Operate (SP-Operate-*)

Route: `/b/[boardId]/operate`, file `apps/web/src/routes/b/[boardId]/operate/+page.svelte`. State in every artboard: board **Developer Experience**, signed in as Rakesh Gangwar, clock frozen at **2026-10-11T13:51:00Z** (sky phase `noon`), light theme (dark = flip `data-theme`; no Operate rule is theme-specific). Every artboard shows the same data; only the layout differs.

### Shared for Operate

#### vibekit components used (coordinator directive: reusable patterns come from the vibekit Svelte 5 library)

The CSS quoted in each artboard section for these patterns is the **reference for the vibekit component, not app CSS**. The app does not re-declare it. The screen-specific composition (`.grid`, `.panel`, `.ask`, `.cols`, `.letter`, `.dig`, `.op-main`, `.op-line`, `.op-split`, `.q__col`, `.item`, and so on) stays in the layout's scoped `<style>`.

| Component | Props (TypeScript) | Used in Operate (reference CSS) |
|---|---|---|
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet' \| 'text'; size?: 'sm' \| 'md'; href?: string; icon?: IconName; kbd?: string; ariaExpanded?: boolean; ariaHaspopup?: 'menu'; ariaKeyshortcuts?: string; disabled?: boolean; onclick?: () => void; children: Snippet }` | Resume, Send back to work, Open card, Open log, Move card, Staff an agent, Set a budget cap, Save caps, Cancel, Mark read text button. Daylight/Paper/Quiet: `vk-button*` + `.btn-sm`; Studio: `.ar-btn`, `.ar-btn2`, `.ar-lk` (`text`), `.op-acts .ar-btn` (size sm); Quiet `.textbtn` (`text`); Paper `.more` (`text`). |
| `vibekit:IconButton` | `{ icon: IconName; label: string; size?: number; shape?: 'square' \| 'round'; onclick: () => void }` | Mark read ticks: Daylight `.tick`, Paper `.tick` (round), Studio `.op-tick`. |
| `vibekit:Icon` | `{ name: 'arrow' \| 'play' \| 'move' \| 'clock' \| 'dollar' \| 'tick'; size?: number }` | The icon table under Shared. Per-vibe stroke width/path variants (`arrow-ar`, `tick-ar`) are the component's Studio branch. |
| `vibekit:Tabs` (segmented / toggle form) | `{ items: { id: string; label: string }[]; value: string; label: string; onchange: (id: string) => void; size?: 'sm' }` | Unread only / Show all. Daylight `.vk-segmented` + `.seg`; Paper `.toggle`; Studio `.op-seg`; Quiet `.toggle` + `.textbtn[aria-pressed]`. |
| `vibekit:FigureRow` | `{ figures: { value: string; label: string; signal?: boolean; zero?: boolean }[]; layout?: 'row' \| 'column' }` | Studio `.ar-figs` (01 figures, the 05 Spend figure). |
| `vibekit:Figure` | `{ value: string; caption?: string }` | Daylight `.spend`/`.spend__n`/`.spend__cap`; Paper `.figure`; Quiet `.money`. |
| `vibekit:Hero` | `{ number: number; signal: boolean; eyebrow: string; title: string; srPrefix?: string; lede: string }` | Studio `.ar-hero` (`.big`, `.big.ink`, `.txt`). |
| `vibekit:Section` | `{ no?: string; title: string; id?: string; end?: Snippet; children: Snippet }` | Studio `.ar-sec > .hd`; Paper `.kick`; Daylight `.panel` + `.ph`. |
| `vibekit:DataTable` | `{ columns: { key: string; label: string; width?: string; srOnly?: boolean }[]; rows: T[]; row: Snippet<[T, number]>; selected?: number; empty?: string }` | Studio `.ar-tbl`, `.op-tbl`, `tr.sel`, `.ix`, `.m`, `.op-grp`, `.op-ev` (Needs you, Activity, Running, Top agents). |
| `vibekit:AgentChip` | `{ agentId: string \| null; name: string \| null; mood: Mood; size: 20 \| 22 \| 24 \| 28 \| 32 \| 44; nameShown?: boolean; unclaimedLabel?: string }`. `agentId` null → dashed `.noface` + `unclaimedLabel`. | Daylight `.crew__who` (44), `.ask` (32), `.grp__head` (24); Paper `.sig` (28), `.dig h3` (22); Studio `.ag` (20); Quiet `.meta` (20). Reference CSS: `.noface`, `.crew__who`, `.ar-tbl .ag`, `.sig`. |
| `vibekit:StatePill` | `{ label: string; tone: 'needs' \| 'neutral'; form: 'badge' \| 'flag' \| 'square' }` | Daylight `.badge.badge--needs`; Paper `.flag`; Studio `.op-kind` + `.u.needs` / `.u.off`. |
| `vibekit:StageChip` | `{ index: 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7; name: string; extra?: string }` | Studio `.op-sub` + `.chip.cN`. |
| `vibekit:Quote` (agent words) | `{ text: string; tone: 'agent' \| 'system'; cut?: number; expanded?: boolean; ontoggle?: () => void; clampLines?: number; quoteMarks?: boolean }` | Daylight `.bubble`, `.bubble--system`, `.bubble__more`; Paper `.quote`, `.quote--board`, `.more`; Studio `.op-why`, `.op-why.clamp`. |
| `vibekit:Disclosure` | `{ label: string; openLabel?: string; open: boolean; ontoggle: () => void; children: Snippet }` | Earlier reminders / Show earlier reminders / Earlier. |
| `vibekit:Field` | `{ label: string; id: string; kind: 'select' \| 'textarea' \| 'text'; value: string; options?: { value: string; label: string }[]; inputmode?: 'decimal'; placeholder?: string; error?: string \| null; hiddenLabel?: boolean }` | Resume at / What changed… / Move to stage / Board cap $ / Card cap $. Daylight `.lbl`, `.select`, `.textarea`, `.money`; Paper `.select`; Studio `.ar-field`, `.ar-in`, `.ar-sel`, `.ar-ta`, `.ar-hint`; Quiet `.lbl`, `.inp`, `textarea.inp`, `.form` + `legend`. |
| `vibekit:DescriptionList` | `{ items: { term: string; detail: string }[] }` | Quiet `.dl`. |
| `vibekit:EmptyState` | `{ text: string; icon?: IconName }` | Daylight `.empty`; Paper `.prose`; Studio `.op-empty` and the `serif muted` empty cells; Quiet `.plain`. |
| `vibekit:ProgressBar` | `{ value: number \| null; signal?: boolean }` (null = empty track) | Daylight `.bar`; Studio `.op-bar`. |
| `vibekit:Kbd` | `{ keys: string }` | Studio `.kbd` (op-line keys, button hints). |
| `vibekit:Skeleton` | `{ lines: number }` | Not drawn. Used while `usage` loads: one line in place of the figure. |

Mapping: each layout composes these components and keeps only the composition CSS. Where this section quotes a pattern's CSS (`.badge`, `.bubble`, `.ar-btn`, `.ar-tbl`, `.ar-figs`, `.select`, `.tick`, `.noface`, …), read it as the vibekit component's per-vibe reference. The vibekit sheets are the authority if they differ.

#### Files

| Action | Path | What |
|---|---|---|
| modify | `apps/web/src/lib/layouts.ts` | Add `OPERATE_LAYOUTS` (below). |
| create | `apps/web/src/lib/components/operate/layouts/types.ts` | `OperateLayoutProps` and the model types. |
| create | `apps/web/src/lib/components/operate/operate-model.svelte.ts` | `OperateModel`: one data/actions object every layout reads. It replaces the logic now spread across `NeedsYou.svelte`, `Running.svelte`, `Spend.svelte` and `Activity.svelte`. |
| create | `apps/web/src/lib/components/operate/operate-words.ts` | Pure word functions: `ageWords`, `ageShort`, `dayWords`, `numberWord`, `kindWord`, `stageOwnerText`, `staleLine`, `greeting`, `summarySentence*`. Unit-tested. |
| create | `apps/web/src/lib/components/operate/layouts/OperateDaylight.svelte` | SP-Operate-Daylight |
| create | `apps/web/src/lib/components/operate/layouts/OperatePaper.svelte` | SP-Operate-Paper |
| create | `apps/web/src/lib/components/operate/layouts/OperateStudio.svelte` | SP-Operate-Studio |
| create | `apps/web/src/lib/components/operate/layouts/OperateQuiet.svelte` | SP-Operate-Quiet |
| modify | `apps/web/src/lib/components/operate/OperateView.svelte` | Builds the model and renders `OPERATE_LAYOUTS[appearance.value.vibe]` with `{ model }`. Delete the current 2-column grid markup. |
| delete | `operate/NeedsYou.svelte`, `operate/Running.svelte`, `operate/Spend.svelte`, `operate/Activity.svelte` | Superseded by the layouts and the model. `attention/NeedsYouList.svelte`, `AttentionRow.svelte` and `ResumeBox.svelte` stay, because `/workspace/needs-you` uses them, but Operate no longer renders them. |
| modify | `apps/web/src/lib/components/attention/attention.ts` | Action sets (gap OP-G3) and the new export `sortAttention` (below). |
| modify | `apps/web/src/lib/stores/app.svelte.ts` | `needsYou()` returns `itemsFromBoard(this.board, this.agents)` (gap OP-G1). |
| unchanged | `routes/b/[boardId]/operate/+page.svelte` | Still `<OperateView />`. |
| create | `apps/web/src/lib/styles/studio-ar.css` (only if the shell spec has not already created it under another name) | The Studio "Annual report" base layer quoted in the SP-Operate-Studio section. Imported once from `app.css`. |

```ts
// layouts.ts (addition)
import OperateDaylight from '$lib/components/operate/layouts/OperateDaylight.svelte';
import OperatePaper from '$lib/components/operate/layouts/OperatePaper.svelte';
import OperateStudio from '$lib/components/operate/layouts/OperateStudio.svelte';
import OperateQuiet from '$lib/components/operate/layouts/OperateQuiet.svelte';
import type { OperateLayoutProps } from '$lib/components/operate/layouts/types';
export const OPERATE_LAYOUTS: Readonly<Record<Vibe, Component<OperateLayoutProps>>> = {
  daylight: OperateDaylight, paper: OperatePaper, studio: OperateStudio, quiet: OperateQuiet,
};
```

```ts
// operate/layouts/types.ts
import type { Card, Stage, Notification, UsageSummary, AgentSummary } from '$lib/api';
import type { AttentionItem, AttentionAction } from '$lib/components/attention/attention';
import type { Phase } from '@superjackfruit/vibekit';

export interface NeedRow {
  item: AttentionItem;            // from itemsFromBoard
  card: Card;                     // app.cardById(item.cardId)
  stage: Stage;                   // the card's current stage
  stageIndex: number;             // 1-based position in stages sorted by order (Studio chip c1..c7)
  agent: AgentSummary | null;     // card.delegateAgentId resolved; null = "Unclaimed"
  agentName: string | null;       // displayAgent(...)
  actions: AttentionAction[];     // item.actions after OP-G3
  overdue: boolean;               // overdue(card.dueAt, card.state, today) from board/card-due
}
export interface ActivityGroup {
  cardId: string;
  card: Card | null;
  agent: AgentSummary | null;
  latest: Notification;           // newest by createdAt among the shown set
  earlier: Notification[];        // the rest for this card, newest first (shown behind "Earlier reminders")
  need: NeedRow | null;           // the card's Needs-you row, when it has one (drives Resume / Move)
}
export interface RunningRow { card: Card; stage: Stage; agent: AgentSummary | null; agentName: string }
export interface OperateModel {
  boardId: string;
  boardName: string;
  cardCount: number;              // board.cards.filter(c => !c.archivedAt).length → 6
  stages: Stage[];                // sorted by order
  agents: AgentSummary[];
  needs: NeedRow[];               // sortAttention(items, 'stage') (Daylight/Paper/Studio)
  needsUrgent: NeedRow[];         // sortAttention(items, 'urgency') (Quiet)
  running: RunningRow[];          // cards with state === 'working'
  usage: UsageSummary | null;     // getUsage(boardId, '7d')
  usageError: string | null;
  boardCap: number | null;        // board.usage.budgetUsd
  cardCap: number | null;         // board.usage.cardUsdCap
  overBudget: boolean;            // board.usage.overBudget
  unread: number;                 // app.unreadCount()
  showRead: boolean;              // $state, default false ("Unread only")
  groups: ActivityGroup[];        // from the shown notifications, newest group first
  phase: Phase;                   // appearance.value.phase
  now: Date;                      // the clock (frozen in the e2e)
  firstName: string;              // app.user.name split on the first space → "Rakesh"
  // actions (each returns the refusal sentence or null; refreshes on success)
  resume(row: NeedRow, comment: string, toStageKey: string): Promise<string | null>;
  move(row: NeedRow, toStageKey: string): Promise<string | null>;
  markRead(seq: number): Promise<void>;
  setCaps(boardUsdCap: number | null, cardUsdCap: number | null): Promise<string | null>;
  open(cardId: string): void;     // app.openCard(cardId)
  moveTargets(row: NeedRow): Stage[]; // OP-G6
}
export interface OperateLayoutProps { model: OperateModel }
```

#### Model behaviour (operate-model.svelte.ts)

- `items = itemsFromBoard(app.board, app.agents, model.now.getTime())`.
- `sortAttention(items, cards, stages, mode)` is a new export of `attention.ts`.
  - Rank: `no-owner` is 1 and every other kind is 0.
  - In `mode 'stage'`, sort by rank ascending, then stage order ascending, then `ageHours` descending, then title.
  - In `mode 'urgency'`, sort by rank ascending, then `card.attemptCount` descending, then `ageHours` descending, then title.
  - With the fixture this gives: stage mode = AgentPod (Failing test, order 3), manual-delivery (Fix, order 4), blocker. Urgency mode = manual-delivery (5 attempts), AgentPod (1), blocker. These are exactly the orders the mockups show.
- `resume(row, comment, toStageKey)` calls `refusalOf(await resumeCard(boardId, row.card.id, comment, toStageKey === row.card.currentStageKey ? undefined : toStageKey))`, then `app.refresh()` when it is not refused.
- `move(row, key)` calls `refusalOf(await moveCard(boardId, row.card.id, key))` then `app.refresh()`. These are the existing api.ts functions.
- `markRead(seq)` calls `markNotificationRead(boardId, seq)` then `app.refresh()`.
- `setCaps(b, c)` calls `refusalOf(await setBudget(boardId, { boardUsdCap: b, cardUsdCap: c }))` then `app.refresh()` and a re-fetch of `getUsage(boardId,'7d')`. Each input parses `''` → `null`, otherwise `Number(v)`. NaN or a negative value shows the field error "Enter an amount in dollars, like 25 or 25.50." and does not call the API.
- `usage` uses `$effect` on `app.boardId`, the same as `Spend.svelte` today. The Spend figure is `usage.totalCostUsd` (the 7-day window), **not** `board.usage.totalCostUsd`, which is all-time (gap OP-G8).
- `groups`:
  - Take `shown = showRead ? app.notifications : app.notifications.filter(n => !n.read)`.
  - Group by `cardId`. The `latest` is the max `createdAt` and `earlier` is the rest, sorted descending.
  - Groups are ordered by `latest.createdAt` descending.
  - `need` = the NeedRow with the same cardId, or null.

#### Shared word functions (operate-words.ts), with their exact outputs

- `ageWords(h)`: under 1 h → `just now`; under 48 h → `${floor(h)} hours` (`1 hour` when it is 1); otherwise `${floor(h/24)} days`. Fixture: 33.35 h → `33 hours`; 52 h → `2 days`.
- `ageShort(h)` is the same rule as `AttentionRow`: under 1 h → `just now`; under 48 h → `${floor(h)}h`; otherwise `${floor(h/24)}d`. Fixture → `33h`, `2d`.
- `numberWord(n)`: 0–10 → `zero one two three four five six seven eight nine ten`, otherwise digits. `Cap(numberWord)` capitalises the first letter.
- `dayWords(h)`: let d = floor(h/24). 1 → `a day`; 2–10 → `${numberWord(d)} days`; otherwise `${d} days`.
- `kindWord(kind)`: review `Review`, question `Asked`, blocked `Stopped`, repeated-failure `Stopped`, refused `Refused`, sub-tasks `Waiting on sub-tasks`, no-owner `No owner`, failed `Failed`, budget `Over budget`. The mockups show only `Stopped` and `No owner`.
- `stageOwnerText(stage, agents, form)` gives the agents that can claim the stage. A stage `owner` is a capability, or `requires.any`/`all` is a list of capabilities.
  - `capText` = the owner, or the `any` list joined with ` or `.
  - `agentText` = the single agent's name when exactly one agent has the capability, otherwise `${n} agents`.
  - `form 'full'` → `${capText}, ${agentText}`, for example `diagnostics, error-eric` or `code, 2 agents`.
  - `form 'agents'` → `agentText`.
- `staleLine(n, vibe)` applies when `n.kind === 'stale'`.
  - Parse the body with `/^Stuck (\d+)h in (.+?): /` to get `h` and `stage`.
  - The line is unclaimed when the body contains `nothing claims stage`; otherwise it is a stopped line.
  - The per-vibe strings are given in each artboard section.
  - For any other `kind`, or when the parse fails, show `n.body` verbatim.
  - The rewrite is gap OP-G4.
- `when(n)` = `n.createdAt.slice(11,16)` (UTC), for example `22:50`.

#### Face rendering (all four vibes)

Agents render as the vibekit mood face (`<Face id label mood size>` through `AgentFace` with `variant="mood"`), with `mood = 'needs'` for any agent on a Needs-you row and `'working'` on a Running row. Sizes are given per vibe. An unclaimed card renders the dashed placeholder `<span class="noface" aria-hidden="true" style="width:Npx;height:Npx">`. Gap OP-G5 covers why Operate passes `variant="mood"` rather than `FACE_VARIANT[vibe]`.

#### Icons (inline stroke SVG, `aria-hidden="true" focusable="false"`, `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`)

| Name | Path | Used for |
|---|---|---|
| `arrow` (Daylight/Paper, stroke-width 1.8) | `<path d="M5 12h14M13 6l6 6-6 6"/>` | All boards, Details |
| `arrow-ar` (Studio, stroke-width 1.75) | `<path d="M5 12h14M14 7l5 5-5 5"/>` | All boards, Detail |
| `play` (1.8) | `<path d="M8 5l11 7-11 7z"/>` | Resume, Send back to work |
| `move` (1.8) | `<path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/>` | Move card, Move |
| `clock` (1.8, 22px) | `<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>` | Daylight Running empty |
| `dollar` (1.8) | `<path d="M12 3v18M16 7.5c-.8-1.2-2.2-2-4-2-2.2 0-4 1.2-4 3s1.6 2.6 4 3 4 1.4 4 3.2-1.8 3-4 3c-1.9 0-3.4-.8-4.2-2.2"/>` | Set a budget cap (Daylight) |
| `tick` (1.8) | `<path d="M5 12.5l4.5 4.5L19 7.5"/>` | Mark read (Daylight 20px, Paper 18px) |
| `tick-ar` (1.75, 16px) | `<path d="M5 12l5 5 9-10"/>` | Mark read (Studio) |

Put them in `apps/web/src/lib/components/operate/icons.ts` as strings, or as one `OpIcon.svelte` with props `{ name, size }`.

#### Fixture (Developer Experience board, shared by all four artboards)

Clock: `2026-10-11T13:51:00Z`. User: `Rakesh Gangwar` (getMe `name`). Ids are illustrative. If the shared seed (Board/List sections) already names these records, use its ids. Every literal value below must match.

Stages, sorted by `order`:

| order | key | name | ownerKind | owner / requires | gate |
|---|---|---|---|---|---|
| 1 | `reported` | Reported | `human` | — | none |
| 2 | `reproduce` | Reproduce | `capability` | `diagnostics` | none |
| 3 | `failing-test` | Failing test | `capability` | `testing` | none |
| 4 | `fix` | Fix | `capability` | `code` | none |
| 5 | `integrate` | Integrate | `capability` | `requires: { any: ['integration','api','testing'] }` | none |
| 6 | `signed-off` | Signed off | `human` | — | `approval` |
| 7 | `shipped` | Shipped | `human` | — | none |

Board stale settings: `{ enabled: true, afterHours: 24 }`.

Agents (workspace):
- `error-eric` with `['diagnostics']`.
- `tester-tim` with `['testing']`.
- `coder-kai` with `['code']`.
- One more agent with `code`, so Fix reads "2 agents".
- Integrate must count 3 agents across integration/api/testing (tester-tim plus two).
- `super-chotu` (the queuer).

No Operate artboard prints the names of the extra agents. Take them from the Board fixture.

Cards (6, none archived):

| # | title (verbatim) | stage | state | priority | delegate | attemptCount | dueAt | stateSince | needsHuman | costUsd |
|---|---|---|---|---|---|---|---|---|---|---|
| A | AgentPod: connector interface and generic effects ledger, state machine and executor | failing-test | `input-required` | 2 | tester-tim | 1 | null | 2026-10-10T04:30:00Z | `{ reason:'blocked', detail: <TEXT-A> }` | 0 |
| B | Superpipeline: manual-delivery completion and approval-subject hardening | fix | `input-required` | 0 | coder-kai | 5 | null | 2026-10-10T04:30:00Z | `{ reason:'blocked', detail: <TEXT-B> }` | 0 |
| C | Fix the highest-severity blocker found in the clean-room journey | reported | `submitted` | 1 | null | 0 | 2026-10-06 | 2026-10-09T09:55:00Z | — | 0 |
| D | Integrate editorial workflows and prove no-write publishing acceptance | failing-test | `submitted` (blocked) | 2 | null | 0 | null | (Board fixture) | — | 0 |
| E | agentpod-connectors: X connector (connector x) | failing-test | `submitted` (blocked) | 0 | null | 0 | null | (Board fixture) | — | 0 |
| F | Build immutable approval subjects and digest-bound gates | shipped | `completed` | 2 | (Board fixture) | — | null | — | — | 0 |

- **TEXT-A** (verbatim, straight apostrophe and straight double quotes, 565 chars): `Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with "Mirror Repository SuperJackfruitLabs/agentpod is read-only". Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.`
- **TEXT-B**: `this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit`

There are no gates, no elicitations and no working cards. `itemsFromBoard` yields 3 items:
- A: `blocked`, age 33.35 h.
- B: `blocked`, age 33.35 h.
- C: `no-owner`, age 52 h. This is the coordinator's ruling: Reported is human-owned, has no gate and is not the last stage, and the card is past `afterHours`.

D and E are queued and blocked, and F is done. They produce no items and appear only in counts (6 cards).

Usage:
- `board.usage = { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false }`.
- `GET /v1/boards/:id/usage?window=7d` returns `{ totalCostUsd: 0, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent: [], byCard: [] }`.

Notifications: 16, all `read: false`, `seq` ascending with `createdAt`. The ones the artboards show are the latest per card, marked ★.

| seq | cardId | kind | createdAt | body |
|---|---|---|---|---|
| 1 | B | failed | 2026-10-09T09:30:00Z | `Run failed` |
| 2 | B | failed | 2026-10-09T12:05:00Z | `Run failed` |
| 3 | B | rework | 2026-10-09T15:30:00Z | `Sent back for one automatic rework: the handoff is missing commit` |
| 4 | B | reclaimed | 2026-10-09T16:15:00Z | `Agent went dark — run reclaimed` |
| 5 | B | failed | 2026-10-09T18:40:00Z | `Run failed` |
| 6 | B | failed | 2026-10-09T21:02:00Z | `Run failed` |
| 7 | C | overdue | 2026-10-07T00:00:00Z | `"Fix the highest-severity blocker found in the clean-room journey" was due 2026-10-06` |
| 8 | C | overdue | 2026-10-08T00:00:00Z | (same body as 7) |
| 9 | C | overdue | 2026-10-09T00:00:00Z | (same body as 7) |
| 10 | C | overdue | 2026-10-10T00:00:00Z | (same body as 7) |
| 11 | B | rework | 2026-10-10T04:12:00Z | `Sent back for one automatic rework: the handoff is missing commit` |
| 12 | A | blocked | 2026-10-10T04:30:00Z | TEXT-A |
| 13 | B | blocked | 2026-10-10T04:30:00Z | TEXT-B |
| 14 ★ | C | stale | 2026-10-10T09:55:00Z | `Stuck 48h in Reported: nothing claims stage "reported". Next: nothing claims stage "reported" — move it to a stage someone works (supi move <boardId> <C> <stage>), or give the stage an owner` |
| 15 ★ | A | stale | 2026-10-10T22:25:00Z | `Stuck 24h in Failing test: <TEXT-A>. Next: read why it stopped, fix that, then resume it: supi resume <boardId> <A> --comment "what changed"` |
| 16 ★ | B | stale | 2026-10-10T22:50:00Z | `Stuck 24h in Fix: <TEXT-B>. Next: read why it stopped, fix that, then resume it: supi resume <boardId> <B> --comment "what changed"` |

The resulting groups, newest first, are B (22:50), A (22:25), C (09:55). Gap OP-G9 covers the mockup times not being mutually consistent.

#### Shared e2e states for the pixel diff

- Daylight: click the AgentPod row's "Show all". Click its "Resume". Type `The Forge mirror is now writable and tester-tim has write access. Push the red-test commit and carry on.` into the textarea.
- Quiet: click the AgentPod item's "Resume" (the textarea stays empty).
- Paper and Studio: no interaction.
- Every artboard: Activity is on "Unread only".

---

### SP-Operate-Daylight

- Size 1440×1664, vibe `daylight`, route `/b/<devx>/operate`.
- Shell slots, specified by the shell group:
  - The floating rail `.dy-rail` (Operate current, count 3).
  - The sky `.dy-sky` with the top bar `.dy-top`: board switcher "Developer Experience", Live, Search ⌘K, New card.
  - The page puts **its greeting section inside the shell's sky, below `.dy-top`**. This needs a sky-content slot from the Daylight shell (gap OP-G2).
  - The page's `<main class="grid">` follows the sky inside `.dy-main`.

**Component tree** (`OperateDaylight.svelte`, props `OperateLayoutProps`):
```
{#snippet sky()}  → handed to the shell's sky slot (OP-G2)
  section.op-greet[aria-label="Good afternoon"] > div.vk-sky__content
    div > h1 , p
    div.crew[aria-label="Waiting on you"] > span.crew__who × (distinct agents on needs rows, in row order)  (Face 44 + name)
main.grid
  div
    section.panel#needs[aria-labelledby=h-needs]
      div.ph > h2#h-needs "Needs you" , span.count.count--needs , a.ph__end "All boards"+arrow
      article.ask × needs   (see row anatomy)
  div
    section.panel[aria-labelledby=h-run]   Running
    section.panel[aria-labelledby=h-spend] Spend
    section.panel[aria-labelledby=h-act]   Activity
```
The shell owns the rail, `.dy-app`, `.dy-main` and the sky container.

**CSS to port** (the pattern rules `.noface .btn-sm .badge* .bubble* .select .textarea .money .lbl .empty .spend* .bar .seg .tick` are the reference for the vibekit components in the table above, not app CSS. The rest is composition CSS for the scoped `<style>`.) Verbatim from SP-Operate-Daylight.dc.html; `.dy-*` shell rules removed). Rename: `.sky` → `.op-greet` (the section the page owns). Drop `.sky { margin: 0; border-radius: var(--vk-radius-lg); }`, because the shell's `.dy-sky` already has it.

```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.wrap-any { overflow-wrap: anywhere; }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: var(--vk-text-sm); }
.dl-display { font-family: var(--vk-font-display); }
.op-greet .vk-sky__content { padding: var(--vk-space-3) var(--vk-space-5) var(--vk-space-5) var(--vk-space-5); border-top: 1px solid color-mix(in oklch, var(--vk-color-surface) 50%, transparent); margin: 0 16px; padding-left: 4px; padding-right: 4px; display: flex; align-items: center; gap: var(--vk-space-6); flex-wrap: wrap; }
.op-greet h1 { margin: 0; font: 700 var(--vk-text-xl) / 1.1 var(--vk-font-display); letter-spacing: -0.01em; }
.op-greet p { margin: var(--vk-space-2) 0 0; font-size: var(--vk-text-md); }
.crew { display: flex; align-items: center; gap: var(--vk-space-3); margin-left: auto; }
.crew__who { display: flex; align-items: center; gap: var(--vk-space-2); font-weight: 600; font-size: var(--vk-text-sm); }
.grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: var(--vk-space-5); padding: var(--vk-space-5) 0 var(--vk-space-3); align-items: start; }
.panel { background: var(--vk-color-surface); border-radius: var(--vk-radius-lg); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); padding: var(--vk-space-5); }
.panel + .panel { margin-top: var(--vk-space-5); }
.ph { display: flex; align-items: baseline; gap: var(--vk-space-3); margin: 0 0 var(--vk-space-4); }
.ph h2 { margin: 0; font: 700 var(--vk-text-lg) / 1.2 var(--vk-font-display); }
.count { font: 700 var(--vk-text-md) / 1 var(--vk-font-display); color: var(--vk-color-muted); }
.count--needs { color: var(--vk-color-signal-text); }
.ph__end { margin-left: auto; display: inline-flex; align-items: center; gap: var(--vk-space-1); color: var(--vk-color-text); font-weight: 600; font-size: var(--vk-text-sm); min-height: 44px; text-underline-offset: 4px; }
.ask { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: var(--vk-space-3) var(--vk-space-4); padding: var(--vk-space-5) 0; border-top: 1px solid var(--vk-color-line); }
.ask:first-of-type { border-top: 0; padding-top: var(--vk-space-2); }
.ask__who { display: flex; align-items: center; gap: var(--vk-space-2); flex-wrap: wrap; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.ask__who b { color: var(--vk-color-text); font-size: var(--vk-text-md); }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 10px; border-radius: var(--vk-radius-pill); font-size: 0.8125rem; font-weight: 700; }
.badge--needs { background: var(--vk-color-signal-wash); color: var(--vk-color-signal-text); box-shadow: inset 0 0 0 1.5px var(--vk-color-signal); }
.ask__title { margin: var(--vk-space-1) 0 0; font: 700 1.1875rem / 1.3 var(--vk-font-display); }
.ask__title a { color: var(--vk-color-text); text-decoration: none; }
.ask__title a:hover { text-decoration: underline; }
.bubble { position: relative; margin-top: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); background: var(--vk-mood-needs); color: var(--vk-face-ink); border-radius: 4px var(--vk-radius-lg) var(--vk-radius-lg) var(--vk-radius-lg); line-height: 1.55; overflow-wrap: anywhere; }
.bubble--system { background: var(--vk-color-raised); color: var(--vk-color-text); }
.bubble p { margin: 0; }
.bubble__more { margin-top: var(--vk-space-2); min-height: 44px; padding: 0; border: 0; background: transparent; color: inherit; font: 600 var(--vk-text-sm) / 1 var(--vk-font-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.hint { margin: var(--vk-space-3) 0 0; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.acts { display: flex; flex-wrap: wrap; gap: var(--vk-space-2); margin-top: var(--vk-space-3); align-items: center; }
.resume { margin-top: var(--vk-space-4); padding: var(--vk-space-4); border-radius: var(--vk-radius-md); background: var(--vk-color-raised); display: grid; gap: var(--vk-space-4); }
.resume__row { display: flex; gap: var(--vk-space-4); flex-wrap: wrap; align-items: end; }
.select, .textarea, .money { font: inherit; font-size: 1rem; color: var(--vk-color-text); background: var(--vk-color-surface); border: 2px solid var(--vk-color-line); border-radius: var(--vk-radius-md); min-height: 44px; padding: 0 var(--vk-space-3); }
.textarea { width: 100%; min-height: 88px; padding: var(--vk-space-3); resize: vertical; }
.lbl { display: grid; gap: var(--vk-space-2); font-size: var(--vk-text-sm); font-weight: 600; }
.empty { display: flex; align-items: center; gap: var(--vk-space-3); margin: 0; color: var(--vk-color-muted); }
.spend { display: flex; align-items: baseline; gap: var(--vk-space-3); flex-wrap: wrap; }
.spend__n { font: 700 2.5rem / 1 var(--vk-font-display); }
.spend__cap { color: var(--vk-color-muted); }
.bar { height: 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); margin: var(--vk-space-4) 0; }
.seg { margin-left: auto; }
.seg .vk-segmented__item { min-height: 36px; }
.grp { padding: var(--vk-space-4) 0; border-top: 1px solid var(--vk-color-line); }
.grp:first-of-type { border-top: 0; padding-top: 0; }
.grp__head { display: flex; gap: var(--vk-space-3); align-items: flex-start; }
.grp__title { margin: 0; font-weight: 700; font-size: var(--vk-text-md); line-height: 1.35; }
.grp__title a { color: var(--vk-color-text); text-decoration: none; }
.grp__title a:hover { text-decoration: underline; }
.ev { display: grid; grid-template-columns: 88px minmax(0, 1fr) 44px; gap: var(--vk-space-3); align-items: start; margin-top: var(--vk-space-2); padding-left: 36px; }
.ev__t { white-space: nowrap; font: 500 0.8125rem / 1.6 var(--vk-font-mono); color: var(--vk-color-muted); }
.ev__body { font-size: var(--vk-text-sm); line-height: 1.5; }
.ev__body a { color: var(--vk-color-text); text-underline-offset: 3px; }
.tick { width: 44px; height: 44px; display: grid; place-items: center; border: 0; border-radius: var(--vk-radius-md); background: transparent; color: var(--vk-color-muted); cursor: pointer; margin-top: -10px; }
.ev__acts { display: flex; flex-wrap: wrap; gap: var(--vk-space-2); padding-left: 36px; margin-top: var(--vk-space-2); }
.foot { display: flex; justify-content: center; margin-top: var(--vk-space-3); }
```

Inline styles to keep exactly:
- The Running `.ph` has `style="margin-bottom:var(--vk-space-3)"`.
- The Spend `.count` has `style="font-weight:500;font-family:var(--vk-font-body);font-size:var(--vk-text-sm)"`.
- The Spend empty line has `style="font-size:var(--vk-text-sm)"`.
- The Activity `.ph` has `style="flex-wrap:wrap"`.
- The acts inside the resume form have `style="margin-top:0"`.

Classes that come from vibekit.css (already imported): `vk-button vk-button--primary|--secondary|--quiet`, `vk-segmented`, `vk-segmented__item`, `vk-face`, `vk-visually-hidden`, `vk-sky__content`.

Responsive. The mockup has no media rules. Below 1100px, `.grid { grid-template-columns: minmax(0,1fr); }` (one column, Needs you first). Below 600px, `.ev { grid-template-columns: 64px minmax(0,1fr) 44px; padding-left: 0 }` and `.ev__acts { padding-left: 0 }`. This is ruling OP-G10.

**Row anatomy** (`article.ask`, `aria-labelledby="t-<cardId>"`):
- First column: Face 32 (`<span class="vk-face" style="--vk-face-size:32px">`), or `span.noface` 32×32 when unclaimed.
- `div.ask__who`:
  - `<b>` agentName, or `Unclaimed`.
  - `<span>` meta. A stopped row reads `stopped in {stage.name} · {ageWords} ago · attempt {attemptCount}`. A no-owner row reads `in {stage.name} · {ageWords}`, followed by `, overdue since {d Mon}` when overdue (`6 Oct`, from `dueAt` with `en-GB { day:'numeric', month:'short' }`).
  - `span.badge.badge--needs` = `kindWord(kind)`.
- `h3.ask__title#t-…` > `a href="/b/{boardId}/c/{cardId}"` (click → `model.open`, preventDefault) = card.title.
- Bubble:
  - Agent rows use `div.bubble` > `p` = `item.detail` (full when expanded; otherwise the first 140 chars `trimEnd()` + `…`, the same cut as AttentionRow). When the detail is longer than 140 chars, add `button.bubble__more[aria-expanded]` with `Show all` / `Show less`.
  - A no-owner row uses `div.bubble.bubble--system` > `p` = `item.instruction`, verbatim: `No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.`
- Stopped rows only: `p.hint` = `Fix what it says, then resume it with a note it will read.`. This is the Operate copy constant `RESUME_HINT`; it is not AttentionItem.instruction (gap OP-G7).
- Actions for a stopped row, while the resume form is closed: `div.acts` with
  - `button.vk-button.vk-button--primary.btn-sm[aria-expanded=false]` = play icon + `Resume`;
  - `a.vk-button.vk-button--secondary.btn-sm` `Open card`;
  - `a.vk-button.vk-button--quiet.btn-sm` `Open log`.
- When the form is open, it replaces the acts row (as in the mockup):
  ```
  form.resume[aria-label="Resume {agentName}"]
    div.resume__row > label.lbl "Resume at" + select.select (every stage in order; current one labelled "{name} (where it stopped)" and selected)
    label.lbl "What changed, or what should the agent do differently? It reads this." + textarea.textarea
    div.acts[style=margin-top:0] > button.vk-button--primary.btn-sm (play) "Send back to work" + button.vk-button--quiet.btn-sm "Cancel"
  ```
- No-owner row actions: `div.acts` with
  - `label.vk-visually-hidden[for=mv-{cardId}]` "Move to stage";
  - `select.select#mv-{cardId}` (options from `model.moveTargets(row)`, label `${stage.name} · ${stageOwnerText(stage, agents,'full')}`, the first one selected);
  - `button.vk-button--primary.btn-sm` (move icon) `Move card`;
  - `a.vk-button--secondary.btn-sm` `Open card`;
  - `a.vk-button--quiet.btn-sm href="/workspace/capabilities"` `Staff an agent`.

**Content map**

| Element | Value | Source |
|---|---|---|
| Greeting h1 | `Good afternoon, Rakesh. 3 cards want you.` | `greeting(phase)` + `, ${firstName}. ` + (n === 0 ? `Nothing needs you.` : n === 1 ? `1 card wants you.` : `${n} cards want you.`). `greeting`: the existing vibekit `say` greeting for the phase (noon/afternoon → `Good afternoon`). n = needs.length. |
| Greeting p | `Two agents stopped and are waiting on you, and one card has nobody to pick it up. Nothing is running.` | `summarySentenceDaylight`. Let s = rows with kind blocked\|repeated-failure\|failed, o = no-owner, other = the rest. Join the parts with `, and ` and end with `.`: s → `${Cap(numberWord(s))} agent${s===1?'':'s'} stopped and ${s===1?'is':'are'} waiting on you`; o → `${s?numberWord(o):Cap(numberWord(o))} card${o===1?' has':'s have'} nobody to pick ${o===1?'it':'them'} up`; other → `${numberWord(other)} more need${other===1?'s':''} you`. Then append ` Nothing is running.` when running is 0, otherwise ` ${Cap(numberWord(r))} ${r===1?'agent is':'agents are'} working.` |
| Crew | tester-tim, coder-kai (Face 44, mood needs) | Distinct `agent` of the needs rows, in row order |
| Needs count | `3` (`.count--needs` when > 0, otherwise `.count`) | `needs.length` |
| All boards | → `/workspace/needs-you` | constant |
| Row 1 | tester-tim · `stopped in Failing test · 33 hours ago · attempt 1` · Stopped · AgentPod title · TEXT-A expanded · hint · resume form open | Card A |
| Row 2 | coder-kai · `stopped in Fix · 33 hours ago · attempt 5` · Stopped · title B · TEXT-B (≤140 chars, so no toggle) · hint · Resume / Open card / Open log | Card B |
| Row 3 | Unclaimed · `in Reported · 2 days, overdue since 6 Oct` · No owner · title C · system bubble · select (first option `Reproduce · diagnostics, error-eric`) · Move card / Open card / Staff an agent | Card C |
| Resume at options | `Reported`, `Reproduce`, `Failing test (where it stopped)` (selected), `Fix`, `Integrate`, `Signed off`, `Shipped` | stages |
| Running | h2 `Running`, count `0`, `p.empty` = clock icon + `No agent is working anything right now.` | `running.length` |
| Spend | h2 `Spend`; count `last 7 days`; `Details` + arrow → `/b/{id}/operate/telemetry`; `$0.00` (`usd(usage.totalCostUsd)`); `No cap set` (or `of $X cap`); empty `.bar`; `No agent has spent anything in the last 7 days.` (shown when `usage.byAgent.length === 0`); button (dollar) `Set a budget cap` (or `Change the caps` when a cap exists) | usage / board.usage |
| Activity | h2 `Activity`; count `16 unread` (`${unread} unread`); segmented `Unread only` (pressed) / `Show all` | `app.unreadCount()`, `showRead` |
| Group 1 | Face 24 coder-kai · title B · `22:50 UTC` · `Still stopped a day later in Fix.` + link `Why, in Needs you` (→ `#needs`) · tick · `Resume` (secondary, play icon) · `Earlier reminders` (quiet, `aria-expanded=false`) | Notification 16 |
| Group 2 | tester-tim · title A · `22:25 UTC` · `Still stopped a day later in Failing test.` … `Resume` | Notification 15 |
| Group 3 | noface 24 · title C · `09:55 UTC` · `Still unclaimed after two days in Reported.` … `Move` (secondary, move icon) | Notification 14 |

Daylight `staleLine`: stopped → `Still stopped ${dayWords(h)} later in ${stage}.`; unclaimed → `Still unclaimed after ${dayWords(h)} in ${stage}.`. The link `Why, in Needs you` appears only when `group.need` is set. The time is `${when(n)} UTC`.

**Interactions & states**

- `Show all` / `Show less` toggles a local `expanded` flag per row.
- `Resume` sets local `resuming = true`. The form replaces the acts row and focus moves to the select.
  - `Send back to work` is disabled while the textarea is empty or a request is busy. It calls `model.resume(row, text.trim(), selectValue)`.
  - A refusal renders `<p class="hint" role="alert" style="color:var(--vk-color-signal-text)">{msg}</p>` under the acts row. Success closes the form.
  - `Cancel` closes the form and clears the text.
- `Open card` / title → `model.open(cardId)`, which opens the card drawer and pushes `/b/{id}/c/{cardId}`.
- `Open log` → `model.open(cardId)` and then scrolls the drawer's attempts section into view. The anchor id is `card-section-attempts`, provided by the card spec (OP-G11).
- `Move card` → `model.move(row, select.value)`. A refusal shows the same alert line.
- Activity:
  - `Mark read` (tick, `aria-label="Mark read"`) → `model.markRead(latest.seq)`.
  - `Resume` / `Move` in a group open the matching Needs-you row's form or focus its move select, and scroll `#needs` into view. The button is shown only when `group.need` has `resume` / `move` in its actions.
  - `Earlier reminders` toggles a list of `group.earlier`, each one an extra `div.ev` row with its own tick. While it is open the label stays the same and `aria-expanded=true`.
  - With no earlier notifications, the button is not rendered.
- Segmented control: `Unread only` → `showRead=false`; `Show all` → `true`. `aria-pressed` and `data-state="checked"` go on the active item.
- Empty states (not drawn):
  - Needs 0: count `0` (muted) and `p.empty` = `Nothing is waiting on you.`
  - Activity empty: `p.empty` = `Nothing unread.` / `Nothing has happened on this board yet.`
  - Usage error: `p.empty` = `Couldn't load spend — {msg}`.
- Running non-empty (not drawn): one `div.grp` per row, holding `div.grp__head` = Face 24 (mood working) + `h3.grp__title > a` card title, then `div.ev` with `.ev__t` `{stage.name}` and `.ev__body` `{agentName}` + (cost > 0 ? ` · $x.xx` : '').
- Cap editor (not drawn, OP-G12): `Set a budget cap` toggles `div.resume` (the same box style) holding:
  - `div.resume__row` with two `label.lbl` — `Board cap $` and `Card cap $` — each with `input.money[inputmode=decimal][placeholder=none]`, prefilled from the caps;
  - `div.acts[style=margin-top:0]` with `Save caps` (primary btn-sm) and `Cancel` (quiet btn-sm).
- Loading: before `app.board` exists, OperateView renders nothing; the shell shows its splash.

---

### SP-Operate-Paper

- Size 1440×1520, vibe `paper`.
- Shell slot: the masthead `.mh`, from the shell group, comes first: the name, the date, the sections with Operate current and `(3) need you`, Live, the board title "Developer Experience", Change board, Search ⌘K, Write a new card.
- The page is `<main class="paper">` inside `.main`.

**Component tree** (`OperatePaper.svelte`):
```
main.paper
  header.mast > div(p.mast__eyebrow, h1, p.mast__line) , p.mast__end
  div.cols
    section.col#letters[aria-labelledby=k1]  kick(h2 "Waiting on you", span.kick__n.kick__n--needs, a.lnk "All boards"+arrow14) + article.letter × needs
    section.col[aria-labelledby=k2]          kick(h2 "Since you last looked", span.kick__n) + div.toggle + div.dig × groups
    aside.col[aria-label="At work and the ledger"] > section(k3 At work) + section.box(k4 The ledger)
```

**CSS to port** (`.noface .btn-sm .flag .quote* .more .sig .select .tick .toggle .figure .prose` are the vibekit reference, not app CSS) (verbatim; `.app`, `.main`, `.kbd` and all `.mh*` rules are shell, so omit them):
```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.wrap-any { overflow-wrap: anywhere; }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: var(--vk-text-sm); }
.paper { padding: var(--vk-space-6) var(--vk-space-7) var(--vk-space-7); }
.mast { border-bottom: 3px double var(--vk-color-text); padding-bottom: var(--vk-space-4); display: flex; align-items: flex-end; gap: var(--vk-space-6); flex-wrap: wrap; }
.mast__eyebrow { margin: 0 0 var(--vk-space-2); font-size: 0.8125rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-muted); }
.mast h1 { margin: 0; font: 500 3.25rem / 1 var(--vk-font-display); letter-spacing: -0.01em; }
.mast__line { margin: var(--vk-space-2) 0 0; font: italic 400 1.25rem / 1.4 var(--vk-font-display); color: var(--vk-color-muted); }
.mast__end { margin-left: auto; text-align: right; font-size: var(--vk-text-sm); color: var(--vk-color-muted); line-height: 1.6; }
.cols { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr) minmax(0, 0.8fr); margin-top: var(--vk-space-5); }
.col { padding: 0 var(--vk-space-5); border-left: 1px solid var(--vk-color-line); }
.col:first-child { padding-left: 0; border-left: 0; }
.col:last-child { padding-right: 0; }
.kick { display: flex; align-items: baseline; gap: var(--vk-space-3); border-bottom: 1px solid var(--vk-color-text); padding-bottom: var(--vk-space-2); margin: 0 0 var(--vk-space-4); }
.kick h2 { margin: 0; font: 600 1.375rem / 1.2 var(--vk-font-display); }
.kick__n { font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.kick__n--needs { color: var(--vk-color-signal-text); font-weight: 600; }
.kick a, .kick button { margin-left: auto; }
.lnk { color: var(--vk-color-text); text-underline-offset: 4px; display: inline-flex; align-items: center; gap: 4px; min-height: 44px; font-size: var(--vk-text-sm); }
.letter { padding: var(--vk-space-4) 0 var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
.letter:last-of-type { border-bottom: 0; }
.letter__meta { margin: 0; font-size: 0.8125rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--vk-color-muted); display: flex; gap: var(--vk-space-2); flex-wrap: wrap; align-items: center; }
.flag { color: var(--vk-color-signal-text); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
.flag::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-signal); }
.letter h3 { margin: var(--vk-space-2) 0 0; font: 600 1.625rem / 1.2 var(--vk-font-display); }
.letter h3 a { color: var(--vk-color-text); text-decoration: none; }
.letter h3 a:hover { text-decoration: underline; text-underline-offset: 4px; }
.quote { margin: var(--vk-space-3) 0 0; padding-left: var(--vk-space-4); border-left: 2px solid var(--vk-color-signal); font: italic 400 1.1875rem / 1.55 var(--vk-font-display); overflow-wrap: anywhere; }
.quote--board { border-left-color: var(--vk-color-line); }
.more { min-height: 44px; padding: 0; border: 0; background: transparent; color: var(--vk-color-text); font: 600 var(--vk-text-sm) / 1 var(--vk-font-body); text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.sig { display: flex; align-items: center; gap: var(--vk-space-2); margin-top: var(--vk-space-3); font: italic 400 1.0625rem / 1 var(--vk-font-display); }
.hint { margin: var(--vk-space-3) 0 0; font-size: var(--vk-text-sm); color: var(--vk-color-muted); }
.acts { display: flex; flex-wrap: wrap; gap: var(--vk-space-2); margin-top: var(--vk-space-3); align-items: center; }
.select { font: inherit; font-size: 1rem; color: var(--vk-color-text); background: var(--vk-color-surface); border: 1px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); min-height: 44px; padding: 0 var(--vk-space-3); }
.dig { padding: var(--vk-space-3) 0 var(--vk-space-4); border-bottom: 1px solid var(--vk-color-line); }
.dig h3 { margin: 0; font: 600 1.125rem / 1.3 var(--vk-font-display); display: flex; gap: var(--vk-space-2); align-items: flex-start; }
.dig h3 a { color: var(--vk-color-text); text-decoration: none; }
.dig h3 a:hover { text-decoration: underline; }
.dig__row { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: var(--vk-space-2); margin-top: var(--vk-space-2); align-items: start; }
.dig__row p { margin: 0; font-size: var(--vk-text-sm); line-height: 1.55; }
.dig__t { font-variant-numeric: tabular-nums; color: var(--vk-color-muted); }
.tick { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--vk-color-line); border-radius: 50%; background: transparent; color: var(--vk-color-text); cursor: pointer; }
.toggle { display: flex; gap: var(--vk-space-3); margin: -8px 0 var(--vk-space-2); font-size: var(--vk-text-sm); }
.toggle button { min-height: 44px; border: 0; background: transparent; padding: 0; font: inherit; color: var(--vk-color-muted); cursor: pointer; }
.toggle button[aria-pressed="true"] { color: var(--vk-color-text); font-weight: 600; text-decoration: underline; text-underline-offset: 4px; }
.prose { margin: 0; font: 400 1.125rem / 1.55 var(--vk-font-display); }
.figure { font: 500 2.75rem / 1 var(--vk-font-display); margin: var(--vk-space-2) 0; }
.small { font-size: var(--vk-text-sm); color: var(--vk-color-muted); margin: var(--vk-space-2) 0 0; }
.box { margin-top: var(--vk-space-6); }
```

Inline styles to keep exactly:
- `.more` inside a quote has `style="margin-left: var(--vk-space-2)"`.
- The dig link `a.lnk` has `style="min-height:0;display:inline"`.
- The dig acts have `style="margin-top:var(--vk-space-1)"`.
- The ledger cap line is `p.prose` with `style="font-style:italic"`.

Responsive (OP-G10):
- Below 1100px: `.cols { grid-template-columns: minmax(0,1fr) minmax(0,1fr) }`. The aside spans both columns: `grid-column: 1 / -1; border-left: 0; padding: var(--vk-space-5) 0 0; border-top: 1px solid var(--vk-color-line); margin-top: var(--vk-space-5)`.
- Below 700px: `.cols { grid-template-columns: minmax(0,1fr) }` and every `.col { padding: var(--vk-space-5) 0 0; border-left: 0 }`. `.col + .col` gets `border-top: 1px solid var(--vk-color-line); margin-top: var(--vk-space-5)`. `.paper` gets `padding: var(--vk-space-5) 16px var(--vk-space-6)`. `.mast h1` gets `font-size: 2.5rem`.

**Content map**

| Element | Value | Source |
|---|---|---|
| Eyebrow | `Superpipeline · Operate · Developer Experience` | constant + boardName |
| h1 | `The desk` | constant |
| Mast line | `Sunday 11 October, in full daylight. Three letters wait for you; no one is at work.` | `${weekday d Month}` (en-GB long, from `now`) + `, ` + vibekit `say` phase phrase (noon → `in full daylight`, the same phrase the shell masthead date uses) + `. ` + n === 0 ? `Nothing waits for you` : `${Cap(numberWord(n))} letter${n===1?' waits':'s wait'} for you` + `; ` + (running 0 ? `no one is at work.` : `${numberWord(r)} ${r===1?'agent is':'agents are'} at work.`) |
| Mast end | `Developer Experience · 6 cards` `<br>` `Times in UTC` | boardName, cardCount |
| Kick 1 | `Waiting on you` · `3 letters` (`${n} letter${n===1?'':'s'}`, `--needs` when > 0) · `All boards` | needs |
| Letter A | meta: `span.flag` `Stopped`, then `· Failing test`, `· 33 hours ago`, `· attempt 1` as separate spans · h3 link title A · `blockquote.quote` `“` + first 140 chars trimEnd + `…”` + button.more `Show all` (expanded: full text + `”` + `Show less`) · `div.sig` Face 28 + `— tester-tim` · hint · acts `Resume` (primary, play, aria-expanded) / `Open card` / `Open log` | Card A |
| Letter B | `Stopped · Fix · 33 hours ago · attempt 5` · title B · `“TEXT-B”` · `— coder-kai` · hint · same acts | Card B |
| Letter C | `No owner · Reported · 2 days · due 6 Oct, overdue` · title C · `blockquote.quote.quote--board` instruction (no quote marks) · sig noface 28 + `— the board · unclaimed` · acts: hidden label `Move to stage`, `select.select#mv-{id}` (options `${name} · ${stageOwnerText(s,agents,'agents')}`, for example `Reproduce · error-eric`), `Move card` (primary, move icon), `Open card`, `Staff an agent` | Card C |
| Kick 2 | `Since you last looked` · `16 unread` | unread |
| Toggle | `Unread only` (pressed) / `Show all` | showRead |
| Dig ×3 | h3 = Face 22 (or noface 22) + title link · `p` = `span.dig__t` `22:50` + ` — still stopped a day later in Fix. ` + `a.lnk` `The reason is in its letter.` (→ `#letters`, only when `group.need` is set) · tick (18px, aria-label Mark read) · acts `Resume` (secondary, no icon) or `Move` + `button.more` `Earlier reminders` | groups |
| At work | `At work` · `0` · `p.prose` `No agent is working anything right now.` | running |
| Ledger | `The ledger` · `last 7 days` · `p.figure` `$0.00` · `p.prose` italic `No cap set.` (or `Capped at $X.`) · `p.small` `No agent has spent anything this week.` · `Set a budget cap` (secondary, no icon) · `a.lnk` `Details` + arrow → telemetry | usage |

Paper `staleLine`: stopped → ` — still stopped ${dayWords(h)} later in ${stage}. `; unclaimed → ` — still unclaimed after ${dayWords(h)} in ${stage}. `. The time is `when(n)` with no "UTC", because the masthead says "Times in UTC".

**Interactions.** These are the same model calls as Daylight.
- `Show all` expands the quote.
- `Resume` toggles an inline form under the letter's acts (not drawn, OP-G12):
  ```
  form.letter-resume (style: margin-top: var(--vk-space-3); padding-left: var(--vk-space-4); border-left: 1px solid var(--vk-color-line); display: grid; gap: var(--vk-space-3))
    label (font-size: var(--vk-text-sm); display:grid; gap: var(--vk-space-2)) "Resume at" + select.select
    label "What changed, or what should the agent do differently? It reads this." + textarea.select (min-height 88px; padding var(--vk-space-3); width 100%)
    div.acts > "Send back to work" (primary btn-sm) + button.more "Cancel"
  ```
- The ledger cap editor uses the same pattern with two inputs `Board cap $` / `Card cap $` and `Save caps` / `Cancel`.
- The toggle buttons set `showRead`.
- Empty states: kick 1 `0 letters` (muted) and `p.prose` `Nothing is waiting on you.`; digest `p.prose` `Nothing unread.` / `Nothing has happened on this board yet.`.

---

### SP-Operate-Studio

- Size 1440×1724, vibe `studio` (Annual report).
- Shell slots:
  - The page root `div.ar.op` (grid `64px minmax(0,1fr)`).
  - The ink rail `.ar-rail`.
  - `div.op-body` holding the masthead `.ar-top` and the sub bar `.ar-sub`.
  - The **status footer `footer.ar-status`**, whose values the page supplies through the shell's status slot (OP-G2): `6 cards`, `3 need you` (`.sig`), `0 running`, `16 unread`, `synced {HH:MM of last app.refresh}`, and on the right `⌘K commands`, `N new card`.
- The page renders `<main class="op-main">` between the sub bar and the footer.

**Component tree** (`OperateStudio.svelte`):
```
main.op-main
  div.op-line > span.kick , span.keys[aria-label=Keyboard] , span.r
  div.ar-hero > span.big[aria-hidden] , div.txt(span.kick "Operate", h1(span.sr "3 " + text), p)
  section.ar-sec[aria-labelledby=op-f]  hd(01 "Operations in figures", r "last 7 days") + div.ar-figs ×5
  section.ar-sec#needs[aria-labelledby=op-n] hd(02 "Needs you", r(span.sigt n, a.ar-lk All boards)) + table.ar-tbl.op-tbl
  div.op-split
    section.ar-sec[op-a] hd(03 Activity, r "16 unread · by card" + span.op-seg) + table.ar-tbl (Time/Kind/What/Mark read)
    div.op-stack
      section.ar-sec[op-r] hd(04 Running, r "0") + table.ar-tbl (Agent / Card · stage / Cost)
      section.ar-sec[op-s] hd(05 Spend, r "last 7 days · " a.ar-lk Detail) + div.ar-figs(row) + div.op-bar + table Top agents + form.op-cap
```

**CSS: the Studio base layer.** Note: the button, link, table, figure, field, kbd, chip and state-square rules below are the *reference for vibekit:Button / DataTable / FigureRow / Field / Kbd / StageChip / StatePill, not app CSS*. Only the `.ar` alias block, the resets and `.ar-hero`/`.ar-sec` (unless vibekit ships Hero/Section) are app/shell base. This goes in `src/lib/styles/studio-ar.css`, global and shared by every Studio screen; if the shell spec already ships it, do not duplicate it. It is verbatim from the .dc.html. The rail/masthead/sub bar/status rules (`.ar-rail … .ar-live`, `.ar-sub …`, `.ar-tab`, `.ar-fl`, `.ar-status`) are the shell's.
```css
:where(.ar) *, :where(.ar) *::before, :where(.ar) *::after { box-sizing: border-box; }
:where(.ar) :where(h1, h2, h3, h4, p, ul, ol, dl, dd, dt, table, form, blockquote, figure, fieldset) { margin: 0; padding: 0; }
:where(.ar) :where(ul, ol) { list-style: none; }
:where(.ar) :where(fieldset) { border: 0; min-width: 0; }
:where(.ar) :where(button, input, select, textarea) { font: inherit; color: inherit; }
:where(.ar) :where(a) { color: inherit; }
.ar {
  --bg: var(--vk-color-bg); --paper: var(--vk-color-surface); --text: var(--vk-color-text); --muted: var(--vk-color-muted);
  --rule: var(--vk-color-rule); --hair: var(--vk-color-line); --field: var(--vk-color-raised);
  --soft: color-mix(in srgb, var(--vk-color-text) 6%, var(--vk-color-bg));
  --s1: var(--vk-stage-1); --s2: var(--vk-stage-2); --s3: var(--vk-stage-3); --s4: var(--vk-stage-4); --s5: var(--vk-stage-5); --s6: var(--vk-stage-6); --s7: var(--vk-stage-7);
  --st-text: var(--vk-color-stage-text);
  --sig: var(--vk-color-signal); --sig-text: var(--vk-color-signal-text); --sig-wash: var(--vk-color-signal-wash); --sig-fg: var(--vk-face-ink);
  --ff: var(--vk-font-body); --fm: var(--vk-font-mono); --fs: var(--vk-font-serif);
  background: var(--bg); color: var(--text); font: 400 14px/1.45 var(--ff); font-variant-numeric: tabular-nums lining-nums;
}
.ar :focus-visible { outline: 3px solid var(--text); outline-offset: 3px; box-shadow: none; }
.ar .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.ar .h44 { position: relative; }
.ar .h44::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: max(44px, 100%); transform: translateY(-50%); }
.ar .kick { font: 700 12px/1.2 var(--ff); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.ar .mono { font-family: var(--fm); }
.ar .muted { color: var(--muted); }
.ar .serif { font-family: var(--fs); }
.ar .kbd { display: inline-block; padding: 2px 5px; border: 1px solid currentColor; border-radius: 2px; font: 500 11px/1 var(--fm); white-space: nowrap; }
.ar .chip { display: inline-block; flex: none; width: 10px; height: 10px; }
.ar .c1 { background: var(--s1); } .ar .c2 { background: var(--s2); } .ar .c3 { background: var(--s3); } .ar .c4 { background: var(--s4); } .ar .c5 { background: var(--s5); } .ar .c6 { background: var(--s6); } .ar .c7 { background: var(--s7); }
.ar .u { display: inline-block; flex: none; width: 18px; height: 18px; }
.ar .u.needs { background: var(--sig); }
.ar .u.blocked { background: repeating-linear-gradient(135deg, var(--s5) 0 1.5px, transparent 1.5px 4px); box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.queued { box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.done { background: var(--s7); }
.ar .u.off { box-shadow: inset 0 0 0 1.5px var(--muted); }
.ar svg[data-mood] { flex: none; }
.ar .ar-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border: 0; border-radius: 2px; background: var(--text); color: var(--bg); font: 800 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn .kbd { border-color: currentColor; }
.ar .ar-btn2 { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 14px var(--ff); white-space: nowrap; text-decoration: none; cursor: pointer; }
.ar .ar-btn2:hover { background: var(--text); color: var(--bg); }
.ar .ar-lk { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 8px 0 0; border: 0; background: transparent; color: var(--text); font: 700 13.5px var(--ff); text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px; white-space: nowrap; cursor: pointer; }
.ar .ar-lk.quiet { color: var(--muted); }
.ar-hero { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 28px; align-items: end; }
.ar-hero .big { font: 900 184px/.78 var(--ff); font-stretch: 72%; letter-spacing: -.04em; color: var(--sig); }
.ar-hero .big.ink { color: var(--text); }
.ar-hero .txt { display: flex; flex-direction: column; gap: 12px; padding-bottom: 4px; }
.ar-hero h1 { font: 800 44px/1.02 var(--ff); font-stretch: 82%; letter-spacing: -.02em; }
.ar-hero p { max-width: 640px; font: 400 18px/1.45 var(--fs); }
.ar-sec { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ar-sec > .hd { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; padding-top: 10px; border-top: 1.5px solid var(--rule); }
.ar-sec > .hd .no { font: 500 12px var(--fm); color: var(--muted); }
.ar-sec > .hd h2 { font: 800 16px/1.2 var(--ff); }
.ar-sec > .hd .r { margin-left: auto; display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; font: 500 12px var(--fm); color: var(--muted); }
.ar-figs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); border-top: 1.5px solid var(--rule); border-bottom: 1px solid var(--hair); }
.ar-figs > div { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 12px 12px 14px 0; }
.ar-figs > div + div { padding-left: 14px; border-left: 1px solid var(--hair); }
.ar-figs b { font: 900 52px/.86 var(--ff); font-stretch: 72%; letter-spacing: -.03em; white-space: nowrap; }
.ar-figs b small { font-size: 17px; font-weight: 700; margin-left: 3px; letter-spacing: 0; }
.ar-figs b.z { font-weight: 300; color: var(--muted); }
.ar-figs .sig b { color: var(--sig); }
.ar-figs .sig span { color: var(--sig-text); }
.ar-figs span { font-size: 12.5px; font-weight: 600; color: var(--muted); }
.ar .ttl { position: relative; padding: 0; border: 0; background: transparent; color: var(--text); font: 700 14px/1.3 var(--ff); text-align: left; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
.ar .ttl::after { content: ""; position: absolute; left: -4px; right: -4px; top: 50%; height: max(44px, calc(100% + 8px)); transform: translateY(-50%); }
.ar .ttl:hover { text-decoration: underline; text-underline-offset: 3px; }
.ar-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ar-tbl th { height: 30px; padding: 0 10px 0 0; text-align: left; font: 700 12px var(--ff); color: var(--muted); border-bottom: 1px solid var(--rule); vertical-align: bottom; }
.ar-tbl td { overflow-wrap: break-word; padding: 10px 10px 10px 0; border-bottom: 1px solid var(--hair); vertical-align: top; }
.ar-tbl tr.sel td { background: var(--soft); }
.ar-tbl tr.sel td:first-child { box-shadow: inset 3px 0 0 var(--text); padding-left: 8px; }
.ar-tbl .ix { font: 500 12.5px var(--fm); color: var(--muted); }
.ar-tbl .ag { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }
.ar-tbl .m { font: 500 12.5px var(--fm); color: var(--muted); }
.ar-tbl .m.sig, .ar .sigt { color: var(--sig-text); font-weight: 600; }
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-field > label, .ar .lab { font-weight: 700; font-size: 14px; }
.ar-in, .ar-sel, .ar-ta { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 0; background: var(--field); color: var(--text); font: 400 16px/1.45 var(--ff); }
.ar-ta { min-height: 88px; padding: 10px 12px; resize: vertical; }
.ar-in::placeholder, .ar-ta::placeholder { color: var(--muted); }
.ar-hint { font: 500 12px/1.4 var(--fm); color: var(--muted); }
```
The mockup's Studio stylesheet also defines other base classes Operate does not use: `.fn`, `.ar-ini`, `.ar-ib`, `.ar-ramp`, `.ar-track`, `.ar-q`, `.ar-pfn`, `.ar-notes`, `.ar-kv`, `.ar-tbl .stg`, `.ar-st`, `.ar-facts`. They belong to the same base file for the other Studio screens; copy them from the .dc.html verbatim.

**CSS: OperateStudio.svelte scoped `<style>`** (verbatim):
```css
.op-main { flex: 1; display: flex; flex-direction: column; gap: 36px; padding: 24px 40px 40px; }
.op-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; min-height: 44px; padding-bottom: 8px; border-bottom: 1px solid var(--hair); }
.op-line .keys { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 13px; color: var(--muted); }
.op-line .keys > span { display: inline-flex; align-items: center; gap: 4px; }
.op-line .r { margin-left: auto; font: 500 12px var(--fm); color: var(--muted); white-space: nowrap; }
.op-tbl td { padding-top: 14px; padding-bottom: 14px; }
.op-kind { display: inline-flex; align-items: center; gap: 7px; font-weight: 800; font-size: 13px; color: var(--sig-text); white-space: nowrap; }
.op-kind .u { width: 11px; height: 11px; }
.op-sub { margin-top: 4px; display: flex; align-items: center; gap: 6px; font: 500 12px var(--fm); color: var(--muted); }
.op-why { font: 400 15.5px/1.45 var(--fs); overflow-wrap: anywhere; }
.op-why.clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.op-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.op-acts .ar-btn, .op-acts .ar-btn2 { min-height: 40px; padding: 0 12px; font-size: 13.5px; }
.op-split { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 40px; align-items: start; }
.op-stack { display: flex; flex-direction: column; gap: 36px; min-width: 0; }
.op-seg { display: inline-flex; border: 1px solid var(--rule); }
.op-seg button { min-height: 32px; padding: 0 12px; border: 0; background: transparent; color: var(--text); font: 700 12px var(--ff); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
.op-seg button[aria-pressed="true"] { background: var(--text); color: var(--bg); }
.op-grp td { padding: 14px 0 8px; border-bottom: 1px solid var(--hair); }
.op-grp .in { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
.op-grp .in .end { margin-left: auto; display: flex; gap: 6px; }
.op-ev td { font-size: 14px; }
.op-tick { display: grid; place-items: center; width: 44px; height: 44px; margin: -12px 0; border: 0; background: transparent; color: var(--muted); cursor: pointer; }
.op-tick:hover { color: var(--text); }
.op-empty { padding: 14px 0; border-top: 1px solid var(--hair); font: 400 16px/1.45 var(--fs); color: var(--muted); }
.op-cap { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.op-cap .row { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
.op-bar { height: 10px; box-shadow: inset 0 0 0 1px var(--hair); }
```
`.ar.op { display:grid; grid-template-columns:64px minmax(0,1fr) }` and `.op-body` are the shell's. The classes this component uses from the base layer must not be redeclared here. Since the base is global, `.op-*` rules may stay scoped. Use `:global()` on base classes only where a scoped selector combines them, for example `.op-acts :global(.ar-btn)`.

Inline styles to keep exactly:
- The All boards link `style="min-height: 0"`.
- Th widths: `No.` 30px, `Kind` 100px, `Agent` 116px, `Age` 44px, `Att.` 40px, `Why it stopped` 30%, `Actions` 200px. Activity: `Time` 64px, `Kind` 72px, mark-read 44px. Running: `Cost` 64px. Top agents: `$` 64px.
- The no-owner `.op-why` `style="font-family: var(--ff); font-size: 14px"`.
- Group buttons `style="min-height: 36px"`.
- The unclaimed group marker `span.u.off` `style="width: 20px; height: 20px"`.
- The Spend figs `style="grid-auto-flow: row; border-bottom: 0"`.
- The empty cells `class="serif muted" style="font-size: 16px"`.
- The `reason ↑` and `Detail` links `style="min-height: 0"`.

Responsive (OP-G10):
- Below 1100px: `.op-split { grid-template-columns: minmax(0,1fr) }`.
- Below 900px:
  - `.op-main { padding: 16px 16px 32px; gap: 28px }`;
  - `.ar-hero .big { font-size: 112px }` and `.ar-hero h1 { font-size: 30px }`;
  - `.ar-figs { grid-auto-flow: row; grid-template-columns: repeat(2, minmax(0,1fr)) }` with `.ar-figs > div + div { padding-left: 0; border-left: 0 }`;
  - `.op-tbl thead { display: none }`, `.op-tbl tr { display: grid; grid-template-columns: 30px minmax(0,1fr); }`, and every `td` from the 3rd column on gets `grid-column: 2`.

**Content map**

| Element | Value | Source |
|---|---|---|
| op-line | `span.kick` `Operate · Developer Experience`; keys `J` `K` select · `R` resume · `M` move · `O` open · `.` mark read (each `span.kbd`); right `13:51 · midday · times UTC` | boardName; constant keys; `HH:MM` of `now` (UTC) + ` · ` + phase word (noon → `midday`, from vibekit `say`) + ` · times UTC`. The mockup shows 13:19 (OP-G9). |
| Hero big | `3`; `.big` when n > 0, otherwise `.big.ink` | needs.length |
| Hero h1 | `<span class="sr">3 </span>cards on this board need you, and nothing is running` | n === 1 ? `card on this board needs you` : `cards on this board need you`; + (running 0 ? `, and nothing is running` : `, and ${r} ${r===1?'is':'are'} running`). n === 0 → `Nothing on this board needs you`. |
| Hero p | `Two stopped and are waiting to be resumed; one sits in a stage no agent works and needs moving. No agent is working anything, and nothing has been spent this week.` | `summarySentenceStudio`: s → `${Cap(numberWord(s))} stopped and ${s===1?'is':'are'} waiting to be resumed`; o → `${numberWord(o)} sit${o===1?'s':''} in a stage no agent works and need${o===1?'s':''} moving`; joined with `; ` and ending `.`. Then ` No agent is working anything` / ` ${Cap(numberWord(r))} ${r===1?'agent is':'agents are'} working`, + (spend7d === 0 ? `, and nothing has been spent this week.` : `, and $x.xx has been spent this week.`) |
| 01 figures | `3` Needs you (`div.sig`, only when > 0) · `0` Running (`b.z` when 0) · `$0.00` `Spend · 7 days` (`z` when 0) · `—` `Budget cap · none set` (`z`; with a cap: `$X` and `Budget cap`) · `16` `Unread activity` (`z` when 0) | model |
| 02 header | `Needs you`, r: `span.sigt` `3` + `All boards` (arrow-ar) | |
| Row 01 (`tr.sel[aria-current=true]`) | `01` · op-kind `u.needs` + `Stopped` · `a.ttl` title A + `op-sub` `chip c3` `Failing test` · `.ag` Face 20 + `tester-tim` · `33h` · `1` · `p.op-why.clamp` TEXT-A + `button.ar-lk[aria-expanded=false]` `Show all` · acts `Resume` + kbd R (`ar-btn`, aria-keyshortcuts R), `Open` + kbd O (`ar-btn2` link), `Log` (`ar-lk` link) | Card A |
| Row 02 | `02` · Stopped · title B · `chip c4` `Fix` · coder-kai · `33h` · `span.sigt` `5` (OP-G13) · `p.op-why` TEXT-B (no clamp toggle, because it fits in 3 lines: measure with `scrollHeight > clientHeight` and show the toggle only then) · same acts | Card B |
| Row 03 | `03` · `No owner` · title C · `chip c1` `Reported · due 2026-10-06, overdue` · `.ag > span.m` `Unclaimed` · `2d` · `—` · instruction in `p.op-why` (body font) · acts `Move…` + kbd M (`ar-btn`, aria-haspopup menu), `Open` + O, `Staff an agent` (`ar-lk` → /workspace/capabilities) | Card C |
| 03 Activity header | `Activity`, r: `16 unread · by card` + `span.op-seg[role=group][aria-label="Which activity"]` `Unread` (pressed) / `All` | |
| Activity rows | per group: `tr.op-grp` (colspan 4: Face 20 or `span.u.off` 20 + `a.ttl` title + `span.end`: `Resume` / `Move…` (`ar-btn2`, min-height 36) + `ar-lk quiet` `Earlier`), then `tr.op-ev`: `span.m` `22:50` · `span.kick` `Stale` (kind, capitalised) · `Still stopped 24h later in Fix. ` + `a.ar-lk` `reason ↑` (→ #needs) · `button.op-tick` (tick-ar, aria-label Mark read) | groups |
| 04 Running | r `0`; table head Agent / Card · stage / Cost; empty row `No agent is working anything right now.` | running |
| 05 Spend | r `last 7 days · ` + `Detail` (arrow-ar → telemetry); figs `$0.00` `.z` + `No cap set`; `div.op-bar` (with a cap: inner `<i style="display:block;height:100%;width:{pct}%;background:var(--text)">`, signal when overBudget); table `Top agents` / `$`, empty `No agent spend in the window.`; rows otherwise `displayAgent` + `usd(cost)` (top 5) | usage |
| Cap form (always shown in Studio) | `form.op-cap[aria-label="Set a budget cap"]`: `Board cap $` `input#op-bc.ar-in[inputmode=decimal][placeholder=none]`, `Card cap $` `#op-cc`, row `Save caps` (`ar-btn`) + `Cancel` (`ar-lk quiet`) | caps |

Studio `staleLine`: stopped → `Still stopped ${h}h later in ${stage}. `; unclaimed → `Still unclaimed ${h}h in ${stage}. `. The kind cell uses `Cap(n.kind)` for every kind.

**Interactions & keyboard**

- Selection: `selected` index into `needs`, default 0. The row gets `class="sel"` and `aria-current="true"`.
- A window keydown handler runs while Operate is mounted. It ignores events whose target is an input, textarea, select or contenteditable, and events with a modifier.
  - `J` → next row; `K` → previous.
  - `R` → Resume on the selected row, when its actions include resume.
  - `M` → opens Move on the selected row, when they include move.
  - `O` → `model.open`.
  - `.` → `markRead` on the selected card's latest unread notification.
- `Resume` opens a resume row directly under the card's row (not drawn, OP-G12):
  ```
  tr.op-resume > td[colspan=8] > form (display:grid; grid-template-columns: minmax(0,240px) minmax(0,1fr); gap: 12px)
    div.ar-field: label "Resume at" + select.ar-sel
    div.ar-field: label "What changed, or what should the agent do differently? It reads this." + textarea.ar-ta
    div.op-acts (grid-column 1/-1): ar-btn "Send back to work" + ar-lk.quiet "Cancel"
  ```
  A refusal renders `p.ar-hint.sigt[role=alert]`.
- `Move…` opens the existing `board/CardMoveMenu.svelte` (props `card`, `stages`, `open` bindable, `visible`). The menu lists `model.moveTargets(row)`.
  - CardMoveMenu calls `app.moveCard` itself. That store method moves, refreshes and surfaces refusals in `app.error`.
  - The same component serves the activity group's `Move…`.
- `Show all` removes `.clamp` and becomes `Show less`.
- `op-seg` sets `showRead`.
- `Earlier` toggles extra `tr.op-ev` rows for `group.earlier`.
- `Save caps` → `model.setCaps`. `Cancel` restores the inputs to the current caps.
- Field errors render `span.ar-hint.sigt` under the input.
- Empty Needs you: the table is replaced by `p.op-empty` `Nothing on this board is waiting on you.`.

---

### SP-Operate-Quiet

- Size 1440×2651, vibe `quiet`.
- Shell slots: the text nav `.qn` (Skip to content, Superpipeline, Plan, Operate `(3 need you)`, Workspace, Appearance, Dark theme, Rakesh Gangwar — Sign out) and the board line `.qh` (`Board: Developer Experience — Change board`, `Live. Changes appear as they happen.`, Search ⌘K, New card).
- The page is `<main class="q" id="content" tabindex="-1">`.

**Component tree** (`OperateQuiet.svelte`):
```
main.q#content[tabindex=-1] > div.q__col
  h1 "Operate" , p.q__lede
  h2 "Needs your decision (3)" , p.q__note "Most urgent first." , article.item.item--needs × needsUrgent
  h2 "Working now (0)" , p.plain
  h2 "Activity (16 unread)" , div.toggle , div.item[style=padding-left:0] × groups
  h2 "Spend in the last 7 days" , p.plain , div.acts
```

**CSS to port** (`.noface .btn-sm .dl .lbl .inp .form .textbtn .toggle .plain .money` are the vibekit reference, not app CSS) (verbatim; `.app`, `.main` and the `.qn*`/`.qh*` shell rules omitted):
```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.wrap-any { overflow-wrap: anywhere; }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: 1rem; }
.q { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); }
.q__col { max-width: 54rem; }
.q h1 { margin: 0; font: 700 2rem / 1.2 var(--vk-font-display); }
.q__lede { margin: var(--vk-space-3) 0 0; font-size: 1.1875rem; line-height: 1.5; }
.q a { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 4px; }
.q h2 { margin: var(--vk-space-7) 0 var(--vk-space-3); font: 700 1.5rem / 1.25 var(--vk-font-display); padding-bottom: var(--vk-space-2); border-bottom: 2px solid var(--vk-color-text); }
.q h2:first-of-type { margin-top: var(--vk-space-6); }
.q__note { margin: 0 0 var(--vk-space-3); color: var(--vk-color-muted); font-size: 1rem; }
.item { padding: var(--vk-space-4) 0 var(--vk-space-5) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); position: relative; }
.item--needs::before { content: ""; position: absolute; left: 0; top: var(--vk-space-4); bottom: var(--vk-space-5); width: 5px; background: var(--vk-color-signal); }
.item h3 { margin: 0; font: 700 1.25rem / 1.35 var(--vk-font-body); }
.meta { margin: var(--vk-space-2) 0 0; display: flex; align-items: center; gap: var(--vk-space-2); flex-wrap: wrap; font-size: 1.0625rem; }
.dl { margin: var(--vk-space-3) 0 0; display: grid; grid-template-columns: 9rem minmax(0, 1fr); gap: var(--vk-space-2) var(--vk-space-4); font-size: 1.0625rem; line-height: 1.55; }
.dl dt { font-weight: 700; }
.dl dd { margin: 0; overflow-wrap: anywhere; }
.acts { display: flex; flex-wrap: wrap; gap: var(--vk-space-3); margin-top: var(--vk-space-4); align-items: center; }
.form { margin-top: var(--vk-space-4); padding: var(--vk-space-4); border: 2px solid var(--vk-color-line); display: grid; gap: var(--vk-space-4); }
.form legend { font-weight: 700; padding: 0 var(--vk-space-2); }
.lbl { display: grid; gap: var(--vk-space-2); font-weight: 700; font-size: 1.0625rem; }
.inp { font: inherit; font-weight: 400; font-size: 1.0625rem; color: var(--vk-color-text); background: var(--vk-color-surface); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); min-height: 48px; padding: 0 var(--vk-space-3); max-width: 24rem; }
textarea.inp { max-width: none; min-height: 96px; padding: var(--vk-space-3); }
.plain { margin: 0; font-size: 1.0625rem; line-height: 1.55; }
.ev { list-style: none; margin: var(--vk-space-2) 0 0; padding: 0; }
.ev li { display: flex; gap: var(--vk-space-3); align-items: center; flex-wrap: wrap; font-size: 1.0625rem; padding: var(--vk-space-2) 0; }
.toggle { display: flex; gap: var(--vk-space-4); align-items: center; font-size: 1.0625rem; margin-bottom: var(--vk-space-2); }
.textbtn { min-height: 44px; padding: 0 var(--vk-space-2); border: 0; background: transparent; color: var(--vk-color-text); font: inherit; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.textbtn[aria-pressed="true"] { font-weight: 700; text-decoration: none; }
.money { font-size: 1.5rem; font-weight: 700; }
```
Note on `.q h2:first-of-type`: inside `.q__col` the first h2 follows h1 and p, so it gets `margin-top: var(--vk-space-6)`. Keep the element order exactly as in the tree; Svelte must not wrap the h2s in extra elements.

Inline styles to keep exactly:
- The acts inside the fieldset `style="margin-top:0"`.
- The move label `style="display:flex;align-items:center;gap:12px"`.
- Activity items `style="padding-left:0"`, and their h3 `style="display:flex;gap:10px;align-items:center"`.
- The activity acts `style="margin-top:var(--vk-space-2)"`.

Responsive (OP-G10): below 600px, `.q { padding: var(--vk-space-5) 16px var(--vk-space-6) }`, `.dl { grid-template-columns: minmax(0,1fr) }` and `.dl dd { margin-bottom: var(--vk-space-2) }`.

**Content map** (order = `needsUrgent`)

| Element | Value | Source |
|---|---|---|
| h1 | `Operate` | constant |
| Lede | `Developer Experience. 3 cards need you. No agent is working. Times are in UTC. ` + `a` `See all boards` (→ /workspace/needs-you) | `${boardName}. ` + (n === 0 ? `Nothing needs you.` : `${n} card${n===1?' needs':'s need'} you.`) + (r === 0 ? ` No agent is working.` : ` ${r} ${r===1?'agent is':'agents are'} working.`) + ` Times are in UTC. ` |
| h2 | `Needs your decision (3)` | needs.length |
| Note | `Most urgent first.` | constant |
| Item 1 (`article.item.item--needs`) | h3 link title B · meta `Stopped in Fix · 33 hours · 5 attempts · ` + Face 20 + `coder-kai` · `dl`: `Why it stopped` / TEXT-B; `What to do` / `Fix what it says, then resume it with a note it will read.` · acts `Resume` (primary btn-sm, aria-expanded, no icon) · `a` `Open card` · `a` `Open log` | Card B |
| Item 2 | title A · `Stopped in Failing test · 33 hours · 1 attempt · ` Face 20 `tester-tim` · dl with TEXT-A in full (Quiet never truncates) · form open: `fieldset.form` > `legend` `Resume this card` · `label.lbl` `Resume at` + `select.inp` (options as in Daylight) · `label.lbl` `What changed, or what should the agent do differently? It reads this.` + `textarea.inp` · acts `Send back to work` (primary btn-sm) + `button.textbtn` `Cancel`. The open fieldset replaces the acts row. | Card A |
| Item 3 | title C · `No owner in Reported · 2 days · due 6 October, overdue · ` + noface 20 + `Unclaimed` · dl `Why it waits` / instruction · acts: `label.lbl` `Move to` + `select.inp` (options `${name} (${stageOwnerText(s,agents,'agents')})`, for example `Reproduce (error-eric)`) · `Move card` (primary btn-sm) · `a` `Open card` · `a` `Staff an agent` | Card C |
| Meta format | stopped: `${kindWord} in ${stage} · ${ageWords} · ${n} attempt${n===1?'':'s'} · `; no-owner: `No owner in ${stage} · ${ageWords}` + (overdue ? ` · due ${d Month}, overdue` : '') + ` · ` (`6 October`, en-GB long) | |
| h2 | `Working now (0)` + `p.plain` `None. No agent is working anything right now.` (non-empty: `ul.ev` with one `li` per row: Face 20 working + `a` title + ` in ${stage}` + ` · $x.xx` when cost > 0) | running |
| h2 | `Activity (16 unread)` | unread |
| Toggle | `button.textbtn` `Unread only` (pressed) / `Show all` | showRead |
| Activity item ×3 | h3: Face 20 (noface 20) + `a` title · `ul.ev > li`: `span` `22:50 UTC: still stopped a day later in Fix. The reason is under Needs your decision.` + `button.textbtn` `Mark read` · acts `Resume`/`Move` (secondary btn-sm, no icon) + `button.textbtn[aria-expanded]` `Show earlier reminders` | groups |
| h2 | `Spend in the last 7 days` · `p.plain` `<span class="money">$0.00</span>. No budget cap is set. No agent has spent anything.` (with a cap: `. The budget cap is $X.`; with spend: `. ${top agent} spent the most.`) · acts `Set a budget cap` (secondary btn-sm) · `a` `Spend details` (→ telemetry) | usage |

Quiet `staleLine`: `${when(n)} UTC: ` + stopped → `still stopped ${dayWords(h)} later in ${stage}.`, unclaimed → `still unclaimed after ${dayWords(h)} in ${stage}.`. Then ` The reason is under Needs your decision.` when `group.need` is set. Other kinds: `${when(n)} UTC: ${n.body}`.

**Interactions.**
- `Resume` toggles the fieldset; focus moves to the `Resume at` select.
- `Mark read` → `markRead(seq)`.
- `Show earlier reminders` appends `li` rows (same format) to the `ul.ev` and switches to `Hide earlier reminders`.
- `Set a budget cap` toggles `fieldset.form` > `legend` `Set a budget cap`. It holds `label.lbl` `Board cap in dollars` + `input.inp[inputmode=decimal]`, `label.lbl` `Card cap in dollars` + `input.inp`, and acts `Save caps` (primary btn-sm) + `button.textbtn` `Cancel` (OP-G12).
- Refusals render `p.plain[role=alert]` prefixed `Not done: `.
- Empty: `Needs your decision (0)` + `p.plain` `None.`; Activity `p.plain` `Nothing unread.`.

---

### Gaps (Operate)

| Id | Gap | Ruling |
|---|---|---|
| OP-G1 | `app.needsYou()` counts only gate, elicitation, overBudget and failed cards. For this board it returns 0, but every artboard says 3. | **(a)** Every count is `itemsFromBoard(board, agents).length`. Reimplement `app.needsYou()` as `itemsFromBoard(this.board, this.agents)` (returning `AttentionItem[]`) and update its callers (shell count, BottomNav). This follows the coordinator's ruling: the no-owner blocker card is one of the 3. |
| OP-G2 | The Daylight greeting sits inside the shell's sky. Studio's status footer shows page values. | **(a)** The shell exposes slots: Daylight `skyContent` (a Snippet rendered inside `.dy-sky` after `.dy-top`) and Studio `statusItems` (an array of `{ text, signal?: boolean }` rendered in `.ar-status` before `.r`). The page sets them through a context `PAGE_CHROME` that `+layout.svelte` provides. If the shell spec names these differently, use its names. Operate supplies the values in the content maps. |
| OP-G3 | The mockups show more actions than `attention.ts` emits: `blocked` rows show Open log, `repeated-failure` rows show Open card, `no-owner` rows show Staff an agent. | **(a)** Change `forNeeds`: `repeated-failure` → `['resume','open','log']`; default/`blocked` → `['resume','open','log']`; `ownerless(board)` → `['move','open','staff']` (workspace → `['open','staff']`). Update `attention.test.ts`. |
| OP-G4 | The `stale` notification body (`Stuck 24h in Fix: <reason>. Next: … supi resume …`) repeats the stop reason and gives a CLI command. The mockups show a short per-vibe sentence instead. | **(a)** Derive it client-side with `staleLine` (regex `/^Stuck (\d+)h in (.+?): /`, unclaimed when the body contains `nothing claims stage`). The reason itself is shown once, in Needs you. Every other kind shows `body` verbatim. No API change. A later improvement would be (b) structured fields on `Notification` (`stage`, `hours`, `why`), but it is not needed for parity. |
| OP-G5 | The mockups draw the mood face in all four vibes. `FACE_VARIANT` gives Paper `portrait` (initials), Studio `light` (adds a status LED) and Quiet `name`. | **(c)/(a)** For Operate the mockups win: pass `variant="mood"` in every Operate layout. Raise this with the Board/Card groups. If they rule `FACE_VARIANT` must change globally, Operate follows them; Operate never reads `FACE_VARIANT`. |
| OP-G6 | The Move options show only claimable stages (Reproduce, Failing test, Fix) and leave out Integrate. | **(a)** `moveTargets(row)` = the stages, sorted by order, other than the current one, with `ownerKind` `capability` or `agent`. That list includes Integrate (`Integrate · integration or api or testing, 3 agents`). The closed select shows only the first option, so the pixels are unchanged. Human and gate stages are left out because a move there leaves the card ownerless again or skips a review. |
| OP-G7 | The stopped-row hint `Fix what it says, then resume it with a note it will read.` differs from `AttentionItem.instruction` (`Read why it stopped, fix that, then resume it with a note the agent will read.`). | **(a)** Operate shows the copy constant `RESUME_HINT` (verbatim above) for kinds blocked and repeated-failure, and `item.instruction` for every other kind. Workspace keeps `instruction`. |
| OP-G8 | Spend says "last 7 days", but the current `Spend.svelte` shows `board.usage.totalCostUsd`, which is all-time. | **(a)** The figure is `getUsage(boardId,'7d').totalCostUsd`. The cap and overBudget still come from `board.usage`. |
| OP-G9 | The mockup's times are not mutually consistent. Studio says 13:19 where the snapshot is 13:51. A "Stuck 24h" reminder at 22:50 does not fit a card that has been stopped for 33 h. The blocker's "Stuck 48h" reminder on 10 Oct does not fit stateSince 9 Oct. | **(c)** The clock is frozen at 13:51Z. Studio renders `13:51 · midday · times UTC`; the reference artboard's `13:19` (op-line, and `synced 13:19` in the shell status bar) must be updated to 13:51, or masked in the diff. The notification records are seeded literally as tabled; no code compensates. Activity groups are ordered newest first, which gives the mockup's order with these seeds. |
| OP-G10 | No Operate artboard has responsive rules, and there is no phone artboard. | **(a)** Use the minimal breakpoints given per vibe (1100/900/700/600 px). They only collapse columns and reuse existing tokens. A 390px pixel baseline waits for a phone mockup; until then the vibes.spec checks (no side scroll, 44px targets, axe) apply. |
| OP-G11 | `Open log` needs a target inside the card. | **(a)** The card drawer gives its attempts section `id="card-section-attempts"` (card group). Operate calls `app.openCard(id)` and then, on the next tick, `document.getElementById('card-section-attempts')?.scrollIntoView()`. |
| OP-G12 | Open states that are not drawn: Paper and Studio resume forms, the Daylight/Paper/Quiet cap editor, Running rows in Daylight/Paper/Quiet. | **(a)** Build them from the vibe's own drawn classes, as specified in each section. No new tokens or sizes. They are not part of the pixel baselines. |
| OP-G13 | Studio shows coder-kai's `5` attempts in signal text and tester-tim's `1` plain. Nothing in the data says which count is alarming. | **(a)** Show `.sigt` when `attemptCount >= 3` (the card was retried past one automatic rework and still needs a person). Otherwise show plain `.m`. Unit-test the threshold. |
| OP-G14 | The Studio Needs-you row `Log` and the activity `reason ↑` / `Why, in Needs you` / `The reason is in its letter.` links. | **(a)** `Log` behaves like Open log (OP-G11). The reason links are same-page anchors to `#needs` (Daylight, Studio) or `#letters` (Paper). They render only when the card has a Needs-you row. |
| OP-G15 | The Daylight greeting word and the Paper/Studio phase phrases (`Good afternoon`, `in full daylight`, `midday`). | **(a)** Take them from vibekit's `say` for `appearance.value.phase`, the same source the shell date line uses. For the frozen clock the phase is `noon`. If `say` has no `midday` key, add `phaseWord(phase)` to `operate-words.ts`: noon → `midday`, morning → `morning`, evening → `evening`, night → `night`, dawn → `dawn`, dusk → `dusk`. |


---

## List (SP-List-*)

The List view of a board (`/b/[boardId]` with `app.view === 'list'`), one layout per vibe. Every artboard shows board **Developer Experience** (`brd_134a0ddb6d434478`), grouped by stage, sorted by priority (highest first), no filters on, light theme; dark theme is the same markup with `data-theme="dark"` (all colours are tokens, so no per-theme CSS is needed in these components). Shell (rail / masthead / Quiet nav / Studio `ar-top`, `ar-sub`, `ar-status`), the Board · List · Projects toggle and the Filter button are specified in the shell group and are NOT repeated here, except for the list-only controls that sit inside the shell's sub-bar in Daylight (see ListDaylight toolbar).

### vibekit components used

Per the coordinator's binding update, reusable UI comes from the vibekit Svelte 5 library. The list layouts compose these; app code holds only the composition and the data mapping. Where this section quotes mockup CSS for one of these pieces, **that CSS is reference for the named vibekit component, not app CSS** (marked inline as `/* reference for vibekit:<Name> */`). Everything else quoted per artboard (`.wrap`/`.panel`, `.pp`/`.mast`, `.ls-main`/`.ls-hero`/`.ls-bar`, `.q`/`.controls`, group-header layout, column widths) stays app CSS in the layout component.

| Component | Props (TypeScript) | Where used |
|---|---|---|
| `vibekit:DataTable` | `{ caption: string; columns: Array<{ key: string; label: string; width?: string; sortable?: boolean; srLabel?: string }>; sort?: { key: string; ascending: boolean; hint: string }; onSort?: (key: string) => void; groups: Array<{ key: string; header: Snippet; rows: Array<{ id: string; selected?: boolean; tone?: 'needs' \| null; cells: Record<string, Snippet> }> }>; repeatHeaderPerGroup?: boolean; stackBelow?: number /* 720 */ }` | every List artboard (the `<table>`, sticky `thead`, sort buttons with `aria-sort` + `data-on`, `tr.g` group rows, `tr.r` hover, Studio `tr.sel`, Quiet `tr.needs` bar + one table per group via `repeatHeaderPerGroup`, the ≤719px stacked rows). Reference CSS: Daylight `table…menu small` block, Paper `table…acts a` block, Studio `.ar-tbl*`/`.ls-tbl*` block, Quiet `table…tr.needs td:first-child` block |
| `vibekit:StatePill` | `{ tone: 'needs' \| 'working' \| 'queued' \| 'done' \| 'closed'; label: string }` | State cell, all vibes (Daylight `.vk-pill--*`; Paper `.state`/`.state--needs`; Studio `.ar-st` + `.u.*`; Quiet plain / `.st--needs`). Reference CSS: those rules |
| `vibekit:AgentChip` | `{ seed: string /* agent name, LI-G4 */; name: string; mood: Mood; size: 14 \| 16 \| 20 \| 24; iconUrl?: string \| null; sub?: string /* Daylight "needs you" */; prefix?: string /* "asked by " */; unclaimed?: 'Unclaimed' \| 'Not claimed yet' }` | Agent cell and the "asked by" fact. Reference CSS: `.who`, `.who b`, `.who small`, `.asked`, `.ag`, `.noface` |
| `vibekit:Tabs` (segmented / underline / select presentations by vibe) | `{ label: string; items: Array<{ id: string; label: string; count?: number; signal?: boolean }>; value: string; onChange: (id: string) => void; as?: 'segmented' \| 'tabs' \| 'select' }` | Group-by control (Daylight `.vk-segmented` in the toolbar, Paper `.tabs`, Studio `.ls-seg`, Quiet `<select class="inp">` via `as: 'select'`), Studio quick filter, Quiet sort-by select. Reference CSS: `.tabs*`, `.ls-seg*`, `.lbl`/`.inp` |
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet' \| 'text'; href?: string; size?: 'sm' \| 'md'; kbd?: string; icon?: Snippet; haspopup?: 'menu' \| 'dialog'; expanded?: boolean; onclick?: () => void }` | Open / Move in the actions cell (Daylight `.vk-button`, Paper `.acts a/button`, Studio `.ls-acts .ib` + `kbd`, Quiet link + `.textbtn`), Quiet "Filter (none on)". Reference CSS: `.acts*`, `.ls-acts*`, `.textbtn`, `.btn-sm` |
| `vibekit:Menu` | `{ label: string; heading?: string; items: Array<{ id: string; label: string; note?: string; disabled?: boolean }>; onSelect: (id: string) => void; open: boolean; onClose: () => void }` | Daylight Move menu (`RowMoveMenu` composes it). Reference CSS: `.menu`, `.menu__h`, `.menu button*`, `.menu small` |
| `vibekit:Footnote` | `{ text: string }` | Paper `.foot`, Quiet `.empty` "Stages with no cards…", Studio `.ls-foot` (as a row of spans: `parts: string[]`). Reference CSS: those rules |
| `vibekit:EmptyState` | `{ title: string; body?: string; action?: { label: string; onclick: () => void } }` | "No cards match these filters." / "No cards on this board". Reference CSS: Quiet `.empty` |
| `vibekit:FigureRow` (hero figure variant) | `{ figure: number \| string; kicker: string; title: string; srPrefix?: string; body?: string }` | Studio `.ls-hero` (big 6 + kicker + h1 + p). Reference CSS: `.ls-hero*` |
| `vibekit:KeyLegend` | `{ keys: Array<{ keys: string[]; label: string }> }` | Studio `.ls-bar .keys`. Reference CSS: `.ls-bar .keys*`, `.ar .kbd` |
| `vibekit:Skeleton` | `{ rows: number }` | not drawn; PlanView keeps rendering nothing while `app.board` is null (no change) |

Composition rule: the `ListDaylight/Paper/Studio/Quiet.svelte` files below still own their element hierarchy and per-vibe copy; where the markup below shows a table/pill/face/button, implement it with the component above, passing the classes/strings shown. If vibekit has not shipped a component yet when this screen is implemented, the quoted reference CSS is what that component must reproduce.

### Shared for List

#### Ruling: blocker card state

The mockups SP-List-Daylight/-Paper/-Studio/-Quiet draw **"Fix the highest-severity blocker found in the clean-room journey"** as *Queued* (Daylight `vk-pill--resting`, Paper plain `.state`, Studio `.u.queued`, Quiet plain `<span>`) and the Quiet lede says "6 cards. 2 are waiting on you." Board and Operate draw the same card as *Waiting on you* / "No owner". **The mockups are wrong; List must show this card as Waiting on you.**

Why, from the API semantics:
- The card is `state: 'submitted'` in stage `reported`, and stage `reported` is `ownerKind: 'human'`, `gate: null`, and is not the last stage (`shipped` is). `isOwnerlessStage(stages, 'reported')` (attention.ts) is therefore `true`: a human-kind stage is not claimable and has no approval gate.
- Its `stateSince` is two days before the fixture clock (2026-10-11T13:51Z), ≥ `board.stale.afterHours` (24), and `board.stale.enabled` is true, so `itemsFromBoard()` emits an `AttentionItem { kind: 'no-owner', headline: 'Nothing claims stage reported', … }` for it.
- `itemsFromBoard()` is the single authority for "a person is needed now": it feeds Operate's Needs-you list and every "3 need you" count (rail badge, Paper masthead "(3)", Quiet "(3 need you)", Studio status bar "3 need you", Studio quick filter "Needs 3" — the Studio mockup's own quick filter already counts it: All 6 = Needs 3 + Working 0 + Idle 2 + Done 1).
- `card-lead.ts` `cardLead()` returns `kind: 'idle', needsYou: false` for it only because `cardLead` does not model ownerless stages; `CardSummary.urgency` (card-summary.ts `urgencyOf`) already returns `'needs'` for it because it reads the attention item. The List must read the attention item (via `CardSummary.attention` / `.urgency`), never `cardLead().needsYou`.

Consequences (binding):
- The blocker row renders in the needs-you style in every vibe (same element/classes as the two stopped rows): Daylight `<span class="vk-pill vk-pill--needs">Waiting on you</span>`; Paper `<span class="state state--needs">Waiting on you</span>`; Studio `<span class="ar-st needs"><span class="u needs"></span>Waiting on you</span>`; Quiet `<tr class="needs">` + `<span class="st--needs">Waiting on you, no owner</span>`.
- Its agent cell stays "Unclaimed" (dashed `.noface` in Daylight/Paper/Quiet; `.m` text in Studio).
- Counts read 3: Daylight sum "6 cards · 3 wait on you · sorted by priority"; Paper `.mast__line` "Developer Experience, six cards. Three wait on you."; Quiet lede "6 cards. 3 are waiting on you."; Studio is already 3.
- The reference mockups must be corrected for these cells before the pixel-diff runs (see LI-G1).
- Proposed follow-up (not part of this spec's code; recorded in LI-G2): `cardLead()` gains an ownerless case so the drawer agrees — add an optional `ownerless?: boolean` to `LeadInput`, and before the `working` branch: `if (i.ownerless && card.state === 'submitted') return told('stopped', true, null, 'none');` with callers passing `ownerless: attention?.kind === 'no-owner'`. (A new `LeadKind` `'unowned'` with copy "No agent works this stage" is the alternative; the Board/Card group decides.)

#### Files

Create:
- `apps/web/src/lib/components/plan/list/types.ts` — `ListLayoutProps`, `ListRow`, `ListGroup`, `ListSortKey`, `ListSort`.
- `apps/web/src/lib/components/plan/list/list-model.ts` — pure helpers (below), with `list-model.test.ts` beside it.
- `apps/web/src/lib/components/plan/list/ListDaylight.svelte`, `ListDaylightToolbar.svelte`, `ListPaper.svelte`, `ListStudio.svelte`, `ListQuiet.svelte`.
- `apps/web/src/lib/components/plan/list/RowMoveMenu.svelte` (Daylight's inline menu; see Interactions).

Modify:
- `apps/web/src/lib/layouts.ts` — add
  ```ts
  import type { ListLayoutProps } from '$lib/components/plan/list/types';
  export interface ListLayout {
    /** The list itself, rendered in PlanView's scroll area. */
    body: Component<ListLayoutProps>;
    /** List-only controls rendered inside the shell sub-bar after the Filter button, or null. */
    toolbar: Component<ListLayoutProps> | null;
  }
  export const LIST_LAYOUTS: Readonly<Record<Vibe, ListLayout>> = {
    daylight: { body: ListDaylight, toolbar: ListDaylightToolbar },
    paper: { body: ListPaper, toolbar: null },
    studio: { body: ListStudio, toolbar: null },
    quiet: { body: ListQuiet, toolbar: null },
  };
  ```
- `apps/web/src/lib/components/plan/PlanView.svelte` — remove `import ListView`; when `app.view === 'list'` build `listProps` once (below) and render `{@const L = LIST_LAYOUTS[appearance.value.vibe]}<L.body {...listProps} />`; the shell sub-bar (owned by the shell group) renders `{#if app.view === 'list' && L.toolbar}<L.toolbar {...listProps} />{/if}` after the Filter button.
- `apps/web/src/lib/stores/app.svelte.ts` — add `listSort = $state<ListSort>({ key: 'priority', ascending: true })` next to `listGroupBy` (so the Daylight toolbar, which lives outside the body, and the body share it). `ListGroupBy` is unchanged.

Delete: `apps/web/src/lib/components/plan/ListView.svelte` (all of it; nothing else imports it).

#### Types (`plan/list/types.ts`)

```ts
import type { Mood } from '@superjackfruit/vibekit';
import type { ListGroupBy } from '$lib/stores/app.svelte';
import type { CardSummary } from '$lib/components/board/card-summary';
import type { AttentionKind } from '$lib/components/attention/attention';

export type ListSortKey = 'priority' | 'title' | 'state' | 'agent' | 'due' | 'cost' | 'attempts' | 'age';
export interface ListSort { key: ListSortKey; ascending: boolean }

export interface ListState {
  /** "Waiting on you" | "Working" | "Queued" | "Done" | "Closed" */
  word: string;
  needsYou: boolean;
  /** Quiet's qualifier after the comma: "stopped", "no owner", … ; null when none. */
  sub: string | null;
  /** Daylight pill / Studio square class suffix. */
  tone: 'needs' | 'working' | 'queued' | 'done' | 'closed';
}

export interface ListAgent { id: string; name: string; iconUrl: string | null; mood: Mood; moodWord: string }

export interface ListRow {
  s: CardSummary;
  href: string;                 // `/b/${boardId}/c/${card.id}`
  state: ListState;
  agent: ListAgent | null;      // null → the unclaimed cell
  unclaimedWord: 'Unclaimed' | 'Not claimed yet';
  priorityText: string | null;  // "P1" | null (null renders the vibe's "no priority")
  prioritySignal: boolean;      // see Signal rule
  dueIso: string | null;        // "2026-10-06"
  dueHuman: string | null;      // "6 Oct 2026"
  overdue: boolean;
  dueSignal: boolean;
  costText: string | null;      // "$0.42" | null when costUsd === 0
  costSignal: boolean;          // overBudget && needsYou
  attempts: number;
  attemptsSignal: boolean;
  ageText: string | null;       // "33h" | "2d" | null
  askedBy: { name: string; agentId: string | null; iconUrl: string | null } | null;
  blockedCount: number;         // card.blockedBy.length
}

export interface ListGroup {
  key: string;
  label: string;          // stage name / state word / owner name / "P1"…"No priority"
  order: number;          // stage.order for stage groups, else index
  owner: string | null;   // stage groups only: "a person" | "testing · tester-tim" | "code · 2 agents"
  rows: ListRow[];
}

export interface ListLayoutProps {
  boardId: string;
  boardName: string;
  stageCount: number;             // board.stages.length (7)
  groups: ListGroup[];            // non-empty groups only, in order
  emptyStages: string[];          // stage names with 0 cards, board order; [] unless groupBy === 'stage'
  cardCount: number;              // rows across groups (6)
  needsCount: number;             // rows with state.needsYou (3)
  quickCounts: { all: number; needs: number; working: number; idle: number; done: number }; // Studio
  totalCostUsd: number;           // Σ card.costUsd over rows
  groupBy: ListGroupBy;
  sort: ListSort;
  filtersOn: boolean;             // any app.filters axis active
  hasCards: boolean;              // board has ≥1 non-archived card at all
  stages: Array<{ key: string; name: string }>; // move targets, board order
  onGroupBy: (g: ListGroupBy) => void;   // app.listGroupBy = g
  onSort: (k: ListSortKey) => void;      // list-model.nextSort(app.listSort, k) → app.listSort
  onMove: (cardId: string, stageKey: string) => Promise<void>; // app.moveCard
  onOpenMoveDialog: (cardId: string) => void; // shared Move dialog (dialogs group); see LI-G7
}
```

`PlanView` builds it:
```ts
const rows = buildRows(summaries, { boardId, agents: app.agents, nowMs: Date.now() });
const listProps: ListLayoutProps = {
  boardId, boardName: app.board.name, stageCount: app.board.stages.length,
  groups: groupRows(rows, app.listGroupBy, app.listSort, stageList, app.members),
  emptyStages: app.listGroupBy === 'stage' ? stageList.filter((s) => s.count === 0).map((s) => s.name) : [],
  cardCount: rows.length, needsCount: rows.filter((r) => r.state.needsYou).length,
  quickCounts: quickCounts(rows), totalCostUsd: rows.reduce((a, r) => a + r.s.cost, 0),
  groupBy: app.listGroupBy, sort: app.listSort, filtersOn: filtersActive(app.filters),
  hasCards: app.board.cards.some((c) => !c.archivedAt),
  stages: [...app.board.stages].sort((a, b) => a.order - b.order).map((s) => ({ key: s.key, name: s.name })),
  onGroupBy: (g) => (app.listGroupBy = g), onSort: (k) => (app.listSort = nextSort(app.listSort, k)),
  onMove: (id, key) => app.moveCard(id, key), onOpenMoveDialog: (id) => app.openMoveDialog(id),
};
```
(`summaries` and `stageList` are PlanView's existing `$derived`s; `filtersActive(f)` = `f.states.length || f.owners.length || f.minPriority !== null || f.needsReview || f.live || f.overBudget || f.labels.length || f.showArchived || f.projectId !== null`.)

#### Pure helpers (`plan/list/list-model.ts`) — exact behaviour

- `listStateOf(card: Card, items: AttentionItem[]): ListState` — `const item = items.find((i) => i.cardId === card.id)`. If `item` → `{ word: 'Waiting on you', needsYou: true, tone: 'needs', sub: SUB[item.kind] }` with `SUB = { review: 'review', question: 'question asked', blocked: 'stopped', 'repeated-failure': 'failing', refused: 'refused', 'sub-tasks': 'waiting on sub-tasks', 'no-owner': 'no owner', failed: 'failed', budget: 'over budget' }`. Else by `card.state`: `working` → `{ 'Working', false, 'working', null }`; `completed` → `{ 'Done', false, 'done', null }`; `canceled` → `{ 'Canceled', false, 'closed', null }`; `rejected` → `{ 'Rejected', false, 'closed', null }`; anything else (`submitted`, `input-required` with no item, unknown) → `{ 'Queued', false, 'queued', null }`. Rule: **any card with an AttentionItem has `needsYou: true`.** (In layouts, `items` is `CardSummary.attention`, so call it as `listStateOf(s.card, s.attention ? [s.attention] : [])`.)
- `rowAgent(s, agents)`: `id = s.card.delegateAgentId ?? s.card.lastAgentId ?? null` (lastAgentId: LI-G3). null → `agent: null`. Else `{ id, name: displayAgent(id, agents), iconUrl, mood, moodWord: moodWord(mood) }` where `mood = s.state.needsYou ? 'needs' : s.state.tone === 'working' ? 'working' : s.state.tone === 'done' ? 'done' : s.card.delegateAgentId ? 'thinking' : 'resting'`. `moodWord` from card-lead.ts ("needs you", "done", "working", "thinking", "resting").
- `unclaimedWord`: `s.attention?.kind === 'no-owner' ? 'Unclaimed' : 'Not claimed yet'`.
- Signal rule (product rule 4 — the signal means only "a person is needed now"): `prioritySignal = priority === 1 && state.needsYou`; `dueSignal = overdue && state.needsYou`; `costSignal = overBudget && state.needsYou`; `attemptsSignal = attempts >= 2 && state.needsYou`. (Fixture: P1 blocker and its overdue date are signal because the row needs you; coder-kai's 5 attempts are signal; tester-tim's 1 is not.) See LI-G5.
- `priorityText = priority > 0 ? 'P' + priority : null`.
- `dueHuman(iso)` = `new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })` → "6 Oct 2026". `overdue` = `CardSummary.overdue`.
- `costText = cost > 0 ? '$' + cost.toFixed(2) : null`.
- `ageText(s)`: `null` if `s.ageHours === null` or `state.tone` is `done`/`closed`; else `h = Math.floor(ageHours)`; `h < 48 ? h + 'h' : Math.floor(h / 24) + 'd'`. (33h → "33h"; 48–71h → "2d".)
- `askedBy = s.queuedBy` (only set when an agent queued the card): `{ name: s.queuedBy.name, agentId: s.queuedBy.agent?.id ?? null, iconUrl: s.queuedBy.agent?.iconUrl ?? null }`.
- Sorting `sortRows(rows, sort)`: compare by key, then tie-break `needsYou` first, then `ageHours` desc (nulls last), then `title.localeCompare`. Key comparators (ascending): `priority` → rank (`p > 0 ? p : +∞`, so ascending = **highest first**, "No priority" always last regardless of direction); `title` → `localeCompare` A→Z; `state` → urgency index in `URGENCY_ORDER` (needs, working, queued, done, closed); `agent` → agent name A→Z, rows with no agent last; `due` → ISO date, no date last; `cost` → costUsd; `attempts` → attemptCount; `age` → ageHours (nulls last). Descending reverses the key comparison only (missing values stay last; tie-break unchanged).
- `nextSort(cur, k)`: same key → flip `ascending`; new key → `{ key: k, ascending: k === 'cost' || k === 'attempts' || k === 'age' ? false : true }` (priority asc = highest first; title A→Z; due soonest first; cost/attempts/age biggest first).
- Sort hint words: `priority` asc "highest first" / desc "lowest first"; `title` asc "A to Z" / desc "Z to A"; `due` asc "soonest first" / desc "latest first"; `cost`, `attempts`, `age` desc "highest first" / asc "lowest first"; `state` asc "most urgent first" / desc "least urgent first"; `agent` asc "A to Z" / desc "Z to A". Sort-by nouns (Daylight sum "sorted by …", Paper/Studio sentences): priority "priority", title "card title", state "state", agent "agent", due "due date", cost "cost", attempts "attempts", age "age".
- `aria-sort` on the active column header: `sort.ascending ? 'ascending' : 'descending'`; omitted on the others.
- `groupRows(rows, groupBy, sort, stageList, members)`:
  - `stage`: one group per `StageSummary` in board order, `label = stage.name`, `order = stage.order`, `owner = ownerText(stage.owner)`; drop empty groups.
  - `state`: one group per `ListState.tone` in order needs, working, queued, done, closed; label = the tone's word ("Waiting on you", "Working", "Queued", "Done", "Closed"); owner null.
  - `owner`: group by `card.ownerUserId`, label `displayPrincipal(ownerUserId, members, agents)`, sorted by label; owner null.
  - `priority`: "P1", "P2", "P3", … ascending, then "No priority" (priority 0); owner null.
  - rows inside each group via `sortRows`.
- `ownerText(o: StageOwnerLabel)`: `o.kind === 'capability'` → `o.declaredBy.length === 0 ? o.label : o.declaredBy.length === 1 ? o.label + ' · ' + o.declaredBy[0] : o.label + ' · ' + o.declaredBy.length + ' agents'` ("testing · tester-tim", "code · 2 agents"); otherwise `o.label` ("a person", "a person · approval", or the agent's name).
- `quickCounts(rows)`: `all = rows.length`; `needs` = tone needs; `working` = tone working; `idle` = tone queued; `done` = tone done + closed.
- `numberWord(n)`: 0 "no", 1 "one", 2 "two", 3 "three", 4 "four", 5 "five", 6 "six", 7 "seven", 8 "eight", 9 "nine", 10 "ten", 11 "eleven", 12 "twelve", else `String(n)`. `cap(w)` capitalises the first letter.
- `joinAnd(names)`: `[]` → ""; `[a]` → a; else `names.slice(0, -1).join(', ') + ' and ' + last` ("Reproduce, Integrate and Signed off").
- `plural(n, one, many)`.

#### Faces (all vibes)

Faces are vibekit's `Face` (`import { Face } from '@superjackfruit/vibekit'`), rendered directly (not `AgentFace`, whose Studio `light` variant adds a status LED the mockup does not draw, and whose Quiet `name` variant draws no face while the Quiet mockup does). Sizes: Daylight/Paper agent 24px, asked-by 16px; Studio agent 20px, asked-by 14px; Quiet agent 20px, no asked-by face. Mood per `rowAgent`; asked-by face mood is always `working` (as drawn). The face seed must be the agent's name — see LI-G4. Unclaimed: `<span class="noface" aria-hidden="true" style="width:{24|20}px;height:{24|20}px"></span>` with CSS `.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }` (Daylight, Paper, Quiet; Studio prints text only).

#### Icons (inline stroke SVG, `aria-hidden="true" focusable="false"`, `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`)

| name | path | used |
|---|---|---|
| sort-on (asc) | `<path d="M12 19V5M6 11l6-6 6 6"/>` | Daylight 16px sw 1.8 active column; Paper 14px sw 1.8 active column |
| sort-on (desc) | `<path d="M12 5v14M6 13l6 6 6-6"/>` (mirror of sort-on; not drawn — LI-G8) | Daylight/Paper active column when descending |
| sort-off | `<path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>` | Daylight 16px sw 1.8 inactive columns |
| sort-studio | `<path d="M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4"/>` | Studio 12px sw 1.75, every sortable column |
| overdue | `<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>` | Daylight 14px sw 1.8 |
| move | `<path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/>` | Daylight 16px sw 1.8, Move button |
| blocked | `<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>` | Daylight 14px sw 1.8 |
| calendar | `<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>` | Studio 12px sw 1.75, overdue due |
| lock | `<rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>` | Studio 12px sw 1.75, Blocked fact |

#### Interactions (all vibes)

| Control | Behaviour | Store/API |
|---|---|---|
| Card title link `.ttl` and "Open" | `<a href={row.href}>` → `/b/{boardId}/c/{cardId}`, the existing route that opens PlanView with the card drawer; `app.view` stays `'list'` so the list stays behind the drawer | SvelteKit navigation; route calls `app.openCard(id)` |
| Column header sort buttons | `onSort(key)`; sets `aria-sort` / `data-on` | `app.listSort` via `nextSort` |
| Group by (segmented / tabs / select) | `onGroupBy(g)`; `aria-pressed` on the active one (Quiet: `<select>` value) | `app.listGroupBy` |
| Quiet "Sort by" `<select>` | options map to `{priority asc, title asc, state asc, agent asc, due asc, cost desc}`; selecting sets `app.listSort` directly | `app.listSort` |
| Move (Daylight) | toggles `RowMoveMenu` (inline `role="menu"` under the button, `aria-expanded`); items = every stage, current one `aria-disabled="true"` with `<small>here</small>`; click → `await onMove(cardId, key)`, close, announce "{title} moved to {stage}" in a polite live region; Escape / outside click closes and returns focus to the button; ArrowUp/ArrowDown move focus among items | `app.moveCard(cardId, stageKey)` (refusals land in `app.error`, shown by the shell error bar) |
| Move… (Paper), Move (Studio, Quiet), key `M` (Studio) | opens the shared Move dialog (SP-Dlg-Move, dialogs group) for that card | `onOpenMoveDialog(cardId)` → `app.openMoveDialog(id)` (LI-G7) |
| Studio quick filter (All/Needs/Working/Idle/Done) | list-local `$state<'all'|'needs'|'working'|'idle'|'done'>('all')`; filters rows by tone (idle = queued; done = done+closed) after grouping; empty groups then drop | none (local) |
| Studio row selection | `selected = $state<number | null>(null)` index into the flattened visible rows; `J` next, `K` previous (clamped), click on a row (not on a link/button) selects it; selected `<tr class="sel" aria-current="true">`; `Enter` → `goto(row.href)`; `M` → `onOpenMoveDialog`; `S` → cycle sort key priority→title→state→agent→attempts→age→due→cost→priority (`onSort`); `G` → cycle group stage→state→owner→priority→stage. Keys ignored when focus is in an input/select/textarea or a modifier is held. Selected row is scrolled into view (`block: 'nearest'`) | local; `app.listSort`, `app.listGroupBy` |
| Row hover | Daylight `tr.r:hover td` raised background; Paper/Studio `.ttl:hover` underline; Studio `.ib:hover` inverts | CSS |

States:
- Loading: PlanView renders nothing until `app.board` (unchanged).
- Empty because filters hide everything (`filtersOn && cardCount === 0`): the vibe's empty paragraph (below) with copy **"No cards match these filters."**
- Empty board (`!hasCards`): copy **"No cards on this board"** (same words as SP-Board-Empty) in the same paragraph.
- Studio quick filter yielding no rows: same paragraph, copy "No cards match these filters."
- Error: none in-list; `app.error` is the shell's error bar.
- Focus: every button/link shows the vibe's focus ring (vk.css base / Studio `.ar :focus-visible`).

#### Responsive (all vibes; no List phone artboard exists — LI-G6)

Add to each layout's `<style>` (scoped to its root class):
```css
@media (max-width: 719px) {
  table, thead, tbody, tr, th, td { display: block; }
  thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  td { width: auto !important; border-bottom: 0; padding-top: 2px; padding-bottom: 2px; }
  td[data-label]::before { content: attr(data-label) ": "; color: var(--vk-color-muted); }
  tr:not(.g) { padding: var(--vk-space-3) 0; border-bottom: 1px solid var(--vk-color-line); }
  .acts, .ls-acts { justify-content: flex-start; }
}
```
Each `<td>` other than title and actions carries `data-label` = its column header ("Priority"/"Pri", "State", "Agent", "Att", "Age", "Due", "Cost"). Studio's `ar-tbl` `table-layout: fixed` is overridden by `display: block`. A sort control remains reachable on phones through the group/sort controls (Quiet's select is always present; for Daylight/Paper/Studio the header buttons are visually hidden but still focusable — LI-G6).

#### Fixture (Developer Experience at 2026-10-11T13:51:00Z — shared by all four List artboards)

Clock: e2e freezes `Date.now()` to `2026-10-11T13:51:00Z` (`page.clock.setFixedTime`).

Board `brd_134a0ddb6d434478` "Developer Experience"; `stale: { enabled: true, afterHours: 24 }`; `usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false }`; `gates: []`, `elicitations: []`, `references: []`.

Stages (board order):
| key | name | order | ownerKind | owner | requires | gate |
|---|---|---|---|---|---|---|
| reported | Reported | 0 | human | null | null | null |
| reproduce | Reproduce | 1 | capability | diagnostics | null | null |
| test | Failing test | 2 | capability | testing | null | null |
| fix | Fix | 3 | capability | code | null | null |
| integrate | Integrate | 4 | capability | integration | `{ any: ['integration','api','testing'] }` | null |
| signed-off | Signed off | 5 | human | null | null | approval |
| shipped | Shipped | 6 | human | null | null | null |

Agents (`GET /v1/agents`; ids other than super-chotu's are fixture ids):
| id | name | capabilities |
|---|---|---|
| agt_bb586732b807460c | super-chotu | [] |
| agt_fx_tester_tim | tester-tim | ['testing'] |
| agt_fx_coder_kai | coder-kai | ['code'] |
| agt_fx_code_two | (a second code agent, e.g. devops-dave; name not shown in List) | ['code'] |
| agt_fx_error_eric | error-eric | ['diagnostics'] |

Members: `usr_b19776fac3c94df4` "Rakesh Gangwar".
Labels: `lbl_0259a14014754f69` clean-room, `lbl_e9ccaacaa2f94509` evidence-required, `lbl_8430ce51795447c3` superpipeline, `lbl_c5ee8f164fb54eb0` (fourth label; its name is never shown — "+1" — fixture name "journey").

Cards (all `ownerUserId: 'usr_b19776fac3c94df4'`, `costUsd: 0`, `costUsdRollup: 0`, `overBudget: false`, `archivedAt: null`, `openChildCount: 0`, `parentCardId: null`, `projectId: null`, `milestoneId: null`, `queuedGrant: null`, `delegateAgentId: null`):
| id | title | stage | state | pri | attempts | lastAgentId (LI-G3) | queuedBy / queuedByAgentId | labels | dueAt | stateSince | blockedBy | needsHuman |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| card_ace250c9c25342e4 | Fix the highest-severity blocker found in the clean-room journey | reported | submitted | 1 | 0 | null | prn_d8178f4a05934b72892a / agt_bb586732b807460c | the 4 above, in that order | 2026-10-06 | 2026-10-09T09:51:00Z (52h → "2d") | [] | null |
| card_9ac2116a050840df | AgentPod: connector interface and generic effects ledger, state machine and executor | test | input-required | 2 | 1 | agt_fx_tester_tim | prn_d8178f4a05934b72892a / agt_bb586732b807460c | [] | null | 2026-10-10T04:51:00Z (33h) | [] | `{ reason: 'blocked', detail: 'Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. …' }` (full text per Operate/Card groups) |
| card_691a65ff98944697 | Integrate editorial workflows and prove no-write publishing acceptance | test | submitted | 2 | 0 | null | prn_d8178f4a05934b72892a / agt_bb586732b807460c | [] | null | 2026-10-09T13:51:00Z (48h → "2d") | `[{ cardId: 'card_482b4aa0bdd64c02', title: 'agentpod-connectors: X connector (connector x)' }]` | null |
| card_482b4aa0bdd64c02 | agentpod-connectors: X connector (connector x) | test | submitted | 0 | 0 | null | usr_b19776fac3c94df4 / null | [] | null | 2026-10-09T13:51:00Z ("2d") | `[{ cardId: 'card_9ac2116a050840df', title: 'AgentPod: connector interface and generic effects ledger, state machine and executor' }]` | null |
| card_e10fb4fe39a9467f | Superpipeline: manual-delivery completion and approval-subject hardening | fix | input-required | 0 | 5 | agt_fx_coder_kai | usr_b19776fac3c94df4 / null | [] | null | 2026-10-10T04:51:00Z (33h) | [] | `{ reason: 'blocked', detail: 'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit' }` |
| card_8f2c1a5e58294d27 | Build immutable approval subjects and digest-bound gates | shipped | completed | 2 | 0 | agt_fx_coder_kai | usr_b19776fac3c94df4 / null | [] | null | 2026-10-09T22:19:24Z | [] | null |

Derived (what the List must compute from the above): attention items = blocker (`no-owner`), AgentPod (`blocked`), Superpipeline manual-delivery (`blocked`) → needsCount 3; quick counts All 6 / Needs 3 / Working 0 / Idle 2 / Done 1; non-empty groups Reported 1, Failing test 3, Fix 1, Shipped 1; empty stages Reproduce, Integrate, Signed off; total cost $0.00. Seed via `e2e/support/seed.ts` (new `seedListBoard()` posting these records; `lastAgentId` comes from seeded attempt rows once LI-G3 lands).

#### Gaps (shared)

| id | Gap | Ruling |
|---|---|---|
| LI-G1 | All four mockups show the blocker card as Queued (and List-Quiet/Daylight/Paper count 2 waiting), contradicting `itemsFromBoard` and the Board/Operate artboards. | (c) mockup wrong (see Ruling above): render Waiting on you; counts 3. Regenerate the four reference HTMLs with these cells corrected before baselining: Daylight state pill + sum; Paper state + mast line; Studio state cell; Quiet `tr.needs`, state "Waiting on you, no owner", lede. |
| LI-G2 | `cardLead()` has no ownerless case, so the drawer would say idle for a card the list says needs you. | Proposed (not in this group's code): `LeadInput.ownerless?: boolean`; return `told('stopped', true, null, 'none')` for `ownerless && state === 'submitted'` before the working branch (or a new `'unowned'` kind). Board/Card group decides. |
| LI-G3 | The agent column shows tester-tim / coder-kai on cards whose `delegateAgentId` is null (the API clears the delegate when a run stops or completes). No snapshot field names the last agent. | (b) Add `lastAgentId: string \| null` to each card in `GET /v1/boards/:boardId` (BoardSnapshot.cards) = `agent_id` of the card's most recent attempt (runs ordered by `started_at` desc), null when none; add to `Card` in api.ts. Agent cell = `delegateAgentId ?? lastAgentId`. |
| LI-G4 | Mockup faces were generated with `faceSvg(name)`; the app's `Face` is seeded by `agentId`, so faces would differ. | (a) List layouts pass `id={agent.name}` to `Face` (stable per agent). Shared concern — the shell/Board groups must use the same seed so one agent has one face everywhere. |
| LI-G5 | Daylight/Paper colour every P1 and every overdue date with the signal, which would put the signal on rows no person is needed for. | (a) Signal only when the row needs you (`prioritySignal`, `dueSignal`, `costSignal`, `attemptsSignal` above); otherwise the same element without the signal class (`.pri` text colour; due in `.muted`-free text). Fixture renders identically to the mockup. |
| LI-G6 | No List artboard at phone width; desktop tables would scroll sideways at 390px. | (a) The stacked-row media query above; header sort buttons stay in the DOM (visually hidden inside the clipped `thead`, still focusable). |
| LI-G7 | Only Daylight draws an inline Move menu; Paper ("Move…"), Studio, Quiet draw just a button. | (a) Daylight: inline `RowMoveMenu` as drawn. Paper/Studio/Quiet: open the shared Move dialog (SP-Dlg-Move). Requires the dialogs group's `app.openMoveDialog(cardId: string): void` (sets `app.moveCardId`); if the dialogs group names it differently, use that name. |
| LI-G8 | Descending-sort icon, non-overdue due dates, non-zero costs, Working/Closed states and groupings other than stage are not drawn. | (a) Defined in this spec: descending icon path above; due not overdue → Daylight `<span>6 Oct 2026</span>`, Paper `<span>6 Oct 2026</span>`, Studio `<span class="m">2026-10-06</span>`, Quiet "6 Oct 2026"; cost → `$0.42` in the cost cell's existing class; Working → Daylight `vk-pill--working`, Paper `.state`, Studio `.u.working` (below), Quiet "Working"; Closed → Daylight `vk-pill--resting`, Paper `.state`, Studio `.u.off`, Quiet plain. |
| LI-G9 | Owner line "code · 2 agents" counts agents that *declare* the stage capability; stageOwner only returns names. | (a) `ownerText()` formula above from `StageOwnerLabel.declaredBy`. |
| LI-G10 | Age column ("33h", "2d") and Studio Att column have no formatter today. | (a) `ageText()` above from `CardSummary.ageHours`; attempts = `card.attemptCount`. |

---

### SP-List-Daylight

- Size 1440 × 1121 (manifest; `$preview` 1440×1050). Vibe daylight, theme light (dark via tweak). Route `/b/brd_134a0ddb6d434478` with `app.view = 'list'`, group by stage, sort priority ascending, Move menu open on the first row (the e2e clicks row 1's Move before capture).

#### Component tree

- `PlanView.svelte` → `LIST_LAYOUTS.daylight.toolbar` = `ListDaylightToolbar.svelte` (inside the shell's `.dy-sub`, after the Filter button) and `LIST_LAYOUTS.daylight.body` = `ListDaylight.svelte` (in PlanView's scroll area, i.e. inside `.dy-main`).
- `ListDaylightToolbar.svelte` props `ListLayoutProps` (uses `groupBy`, `onGroupBy`, `cardCount`, `needsCount`, `sort`). Markup:
  ```html
  <span class="bar__lbl">Group by</span>
  <div class="vk-segmented" role="group" aria-label="Group by">
    <button class="vk-segmented__item" type="button" aria-pressed="true" data-state="checked">Stage</button>
    <button class="vk-segmented__item" type="button" aria-pressed="false">State</button>
    <button class="vk-segmented__item" type="button" aria-pressed="false">Owner</button>
    <button class="vk-segmented__item" type="button" aria-pressed="false">Priority</button>
  </div>
  <span class="sum">6 cards · 3 wait on you · sorted by priority</span>
  ```
  (`data-state="checked"` only on the pressed item.) The `.dy-sub .vk-segmented…` rules are the shell's.
- `ListDaylight.svelte` props `ListLayoutProps`; uses `RowMoveMenu.svelte` (props `{ card: { id: string; title: string; currentStageKey: string }; stages: Array<{ key: string; name: string }>; onMove: (cardId: string, stageKey: string) => Promise<void> }`, renders the Move button + `.menu`). Markup:
  ```html
  <main class="wrap"><div class="panel">
  <table>
    <caption class="vk-visually-hidden">Developer Experience cards, grouped by stage, sorted by priority</caption>
    <thead><tr>
      <th scope="col" aria-sort="ascending"><button class="sort" type="button" data-on="true">Priority[sort-on]<span class="vk-visually-hidden">, sorted highest first</span></button></th>
      <th scope="col"><button class="sort" type="button" data-on="false">Card[sort-off]</button></th>
      … State, Agent, Due, Cost (same) …
      <th scope="col"><span class="vk-visually-hidden">Actions</span></th>
    </tr></thead>
    {#each groups}
    <tbody><tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">Reported</span><span class="g__n">1</span><span class="g__own">a person</span></th></tr>
      {#each rows}<tr class="r"> … cells below … </tr>{/each}
    </tbody>
    {/each}
  </table>
  </div></main>
  ```
  Caption = `${boardName} cards, grouped by ${groupNoun}, sorted by ${sortNoun}` (groupNoun stage/state/owner/priority). `.g__own` omitted when `owner` is null.
  Cells:
  1. `<td style="width:56px">` → `<span class="pri pri--1">P1</span>` (`pri--1` iff `prioritySignal`; otherwise `<span class="pri pri--{n}">P{n}</span>`); no priority → `<span class="muted" aria-label="No priority">—</span>`.
  2. `<td>` → `<a class="ttl" href>{title}</a>` then, if any fact, `<div class="facts">`: up to 3 `<span class="lab">{label}</span>`, `<span class="lab" title="{n} more label{s}">+{n}</span>` when `moreLabels > 0`, `<span class="blk">[blocked 14px]Blocked</span>` when `blockedCount > 0`, `<span class="asked"><Face 16 working/>asked by {name}</span>` when `askedBy`. Order: labels, more, blocked, asked.
  3. `<td style="width:170px">` → `<span class="vk-pill vk-pill--{needs|working|resting|done}">{state.word}</span>` (queued and closed → `resting`).
  4. `<td style="width:190px">` → agent: `<div class="who"><Face 24 mood/><span><b>{name}</b><small>{moodWord}</small></span></div>`; none: `<div class="who"><span class="noface" aria-hidden="true" style="width:24px;height:24px"></span><span class="muted">{unclaimedWord}</span></div>`.
  5. `<td style="width:170px">` → overdue: `<span class="due--over">[overdue 14px]Overdue · 6 Oct 2026</span>` (`due--over` iff `dueSignal`; overdue without signal: `<span>Overdue · 6 Oct 2026</span>`); not overdue: `<span>{dueHuman}</span>`; none: `<span class="muted">—</span>`.
  6. `<td style="width:80px">` → none: `<span class="muted" aria-label="No cost yet">—</span>`; else `<span>{costText}</span>` (with `class="due--over"` iff `costSignal`).
  7. `<td style="width:200px">` → `<div class="acts"><a class="vk-button vk-button--secondary" href>Open</a><RowMoveMenu …/></div>`; RowMoveMenu = `<button class="vk-button vk-button--quiet" type="button" aria-haspopup="menu" aria-expanded={open}>[move 16px]Move</button>` + when open `<div class="menu" role="menu" aria-label="Move to"><p class="menu__h">Move to…</p>{#each stages}<button type="button" role="menuitem" aria-disabled={here ? 'true' : undefined}>{name}<small>{here ? 'here' : ''}</small></button>{/each}</div>`.
- Empty: inside `.panel`, in place of the table: `<p class="empty muted">{copy}</p>`.

#### Layout & CSS (verbatim from SP-List-Daylight.dc.html; shell `.dy-*` rules excluded)

```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.wrap-any { overflow-wrap: anywhere; }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: var(--vk-text-sm); }

.bar__lbl { font-size: var(--vk-text-sm); color: var(--vk-sky-text); font-weight: 600; margin-left: var(--vk-space-3); }
.sum { margin-left: auto; font-size: var(--vk-text-sm); color: var(--vk-sky-text); }
.wrap { padding: var(--vk-space-4) 0 var(--vk-space-5); }
.panel { background: var(--vk-color-surface); border-radius: var(--vk-radius-lg); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); padding: var(--vk-space-2) var(--vk-space-4) var(--vk-space-4); }
table { width: 100%; border-collapse: separate; border-spacing: 0; }
thead th { position: sticky; top: 0; background: var(--vk-color-surface); text-align: left; padding: 0 var(--vk-space-2); border-bottom: 2px solid var(--vk-color-line); font-size: var(--vk-text-sm); font-weight: 700; color: var(--vk-color-muted); }
.sort { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 var(--vk-space-2); border: 0; border-radius: var(--vk-radius-md); background: transparent; color: inherit; font: inherit; cursor: pointer; }
.sort[data-on="true"] { color: var(--vk-color-text); background: var(--vk-color-raised); }
.g th { text-align: left; padding: var(--vk-space-5) var(--vk-space-2) var(--vk-space-2); font-weight: 400; }
.g__name { font: 700 1.25rem / 1.2 var(--vk-font-display); }
.g__n { display: inline-grid; place-items: center; min-width: 28px; height: 28px; margin-left: var(--vk-space-2); padding: 0 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); font: 700 0.875rem / 1 var(--vk-font-display); }
.g__own { margin-left: var(--vk-space-3); color: var(--vk-color-muted); font-size: var(--vk-text-sm); }
td { padding: var(--vk-space-3) var(--vk-space-2); border-bottom: 1px solid var(--vk-color-line); vertical-align: middle; }
tr.r:hover td { background: var(--vk-color-raised); }
.pri { font: 800 0.9375rem / 1 var(--vk-font-display); }
.pri--1 { color: var(--vk-color-signal-text); }
.ttl { font-weight: 700; font-size: 1.0625rem; color: var(--vk-color-text); text-decoration: none; line-height: 1.35; overflow-wrap: anywhere; }
.ttl:hover { text-decoration: underline; }
.facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; align-items: center; font-size: 0.8125rem; color: var(--vk-color-muted); }
.lab { padding: 1px 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-text); }
.asked { display: inline-flex; align-items: center; gap: 4px; }
.blk { display: inline-flex; align-items: center; gap: 4px; color: var(--vk-color-text); font-weight: 600; }
.who { display: flex; align-items: center; gap: var(--vk-space-2); }
.who b { font-size: 0.9375rem; }
.who small { display: block; color: var(--vk-color-muted); font-size: 0.8125rem; }
.due--over { color: var(--vk-color-signal-text); font-weight: 700; display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }
.muted { color: var(--vk-color-muted); }
.acts { display: flex; gap: var(--vk-space-2); justify-content: flex-end; position: relative; }
.acts .vk-button { min-height: 44px; padding: 0 var(--vk-space-4); font-size: var(--vk-text-sm); }
.menu { position: absolute; right: 0; top: 52px; z-index: 2; width: 260px; padding: var(--vk-space-2); background: var(--vk-color-surface); border-radius: var(--vk-radius-md); box-shadow: 0 0 0 1px var(--vk-color-line), 0 12px 32px color-mix(in oklch, var(--vk-color-text) 18%, transparent); }
.menu__h { margin: 4px 8px 6px; font-size: 0.8125rem; color: var(--vk-color-muted); font-weight: 600; }
.menu button { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: space-between; padding: 0 var(--vk-space-3); border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font: inherit; font-size: 0.9375rem; text-align: left; cursor: pointer; }
.menu button:hover, .menu button:focus-visible { background: var(--vk-color-raised); }
.menu button[aria-disabled="true"] { color: var(--vk-color-muted); cursor: default; }
.menu small { color: var(--vk-color-muted); font-size: 0.75rem; }
/* empty state (LI-G8; values from SP-List-Quiet .empty) */
.empty { margin: var(--vk-space-6) 0 0; font-size: 1.0625rem; }
```
Placement: `.bar__lbl`, `.sum` live in `ListDaylightToolbar.svelte`; the menu rules in `RowMoveMenu.svelte` (scoped under a wrapper or `:global(.menu)` within `.acts`); the rest in `ListDaylight.svelte` scoped under its root `.wrap`. Element selectors (`table`, `td`, `thead th`) stay scoped by Svelte. Responsive: the shared media query (Shared for List).

#### Content map

| Visible | Source |
|---|---|
| "Group by", "Stage", "State", "Owner", "Priority" | copy constants; pressed = `groupBy` |
| "6 cards · 3 wait on you · sorted by priority" | `${cardCount} ${plural(cardCount,'card','cards')}` + (needsCount > 0 ? ` · ${needsCount} ${needsCount === 1 ? 'waits' : 'wait'} on you` : '') + ` · sorted by ${sortNoun}` |
| Header "Priority", "Card", "State", "Agent", "Due", "Cost" | copy; ", sorted highest first" = `, sorted ${hint}` on the active column |
| "Reported" / "Failing test" / "Fix" / "Shipped" | `group.label` (stage.name) |
| "1", "3" | `group.rows.length` |
| "a person", "testing · tester-tim", "code · 2 agents" | `group.owner` (`ownerText`) |
| "P1", "P2", "—" | `priorityText` |
| titles | `card.title` verbatim |
| "clean-room", "evidence-required", "superpipeline", "+1" | `s.labels[].name`, `s.moreLabels` |
| "Blocked" | `blockedCount > 0` (enforcedBadge label) |
| "asked by super-chotu" + face | `askedBy.name` |
| "Waiting on you" / "Queued" / "Done" | `state.word` |
| "tester-tim" / "coder-kai" + "needs you" / "done" | `agent.name`, `agent.moodWord` |
| "Unclaimed" / "Not claimed yet" | `unclaimedWord` |
| "Overdue · 6 Oct 2026" | `'Overdue · ' + dueHuman` |
| "—" cost | `costText === null` |
| "Open", "Move", "Move to…", "here" | copy |
| menu items "Reported … Shipped" | `stages[].name` |

#### Fixture needs

Shared fixture. Row order in Failing test: AgentPod (P2, needs you) → Integrate editorial (P2) → X connector (no priority).

#### Gaps

Shared LI-G1, G3, G4, G5, G7 (inline menu as drawn), G8, G9. No Daylight-only gap.

---

### SP-List-Paper

- Size 1440 × 1530 (`$preview` 1440×1530). Vibe paper, theme light. Same route/state; no menu open.

#### Component tree

- `ListPaper.svelte` (body only; toolbar null). Props `ListLayoutProps`. The masthead (`.mh` … `.mh-tabs` incl. "Showing all 6 cards") is the shell's. Markup:
  ```html
  <main class="pp">
    <header class="mast">
      <div>
        <p class="mast__eyebrow">Superpipeline · Plan</p>
        <h1>The index</h1>
        <p class="mast__line">Developer Experience, six cards. Three wait on you.</p>
      </div>
      <div class="tools">
        <span class="tlabel">Group by</span><div class="tabs" role="group" aria-label="Group by"><button type="button" aria-pressed="true">Stage</button><button type="button" aria-pressed="false">State</button><button type="button" aria-pressed="false">Owner</button><button type="button" aria-pressed="false">Priority</button></div>
      </div>
    </header>
    <table>
      <caption class="vk-visually-hidden">Developer Experience cards, grouped by stage, sorted by priority</caption>
      <thead><tr>
        <th scope="col" aria-sort="ascending"><button class="sort" type="button" data-on="true">Pri[sort-on 14px]<span class="vk-visually-hidden">, sorted highest first</span></button></th>
        <th scope="col"><button class="sort" type="button" data-on="false">Card</button></th>
        … State, Agent, Due, Cost (no icon when inactive) …
        <th scope="col"><span class="vk-visually-hidden">Actions</span></th>
      </tr></thead>
      <tbody><tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">Reported</span><span class="g__n">— one card</span><span class="g__own">a person</span></th></tr><tr> … </tr></tbody>
      …
    </table>
    <p class="foot">Sorted by priority, highest first. Stages with no cards are left out: Reproduce, Integrate and Signed off.</p>
  </main>
  ```
  Cells (rows are plain `<tr>`, no class):
  1. `<td style="width:52px">` → `<span class="pri pri--1">P1</span>` (signal rule) / `<span class="pri pri--2">P2</span>` / `<span class="muted" aria-label="No priority">—</span>`.
  2. `<td>` → `<a class="ttl" href>{title}</a>` + `<div class="facts">` when any fact: text parts joined by `" · "`: each of the first 3 label names, `+{n} more` when moreLabels, `Blocked by another card` (blockedCount 1) / `Blocked by {numberWord(n)} other cards` (n > 1), and last the asked-by span `<span style="display:inline-flex;gap:4px;align-items:center"><Face 16 working/>asked by super-chotu</span>`. Literal output: `clean-room · evidence-required · superpipeline · +1 more · [face]asked by super-chotu`; `Blocked by another card · [face]asked by super-chotu`; `Blocked by another card`. (Move the inline style into a class `.asked { display: inline-flex; gap: 4px; align-items: center; }`.)
  3. `<td style="width:160px">` → `<span class="state state--needs">Waiting on you</span>` when needsYou, else `<span class="state">{word}</span>`.
  4. `<td style="width:180px">` → agent `<div class="who"><Face 24 mood/>{name}</div>`; none `<div class="who muted"><span class="noface" aria-hidden="true" style="width:24px;height:24px"></span>{unclaimedWord}</div>`.
  5. `<td style="width:150px">` → overdue `<span class="due--over">Overdue, 6 Oct 2026</span>` (class iff dueSignal); due `<span>{dueHuman}</span>`; none `<span class="muted">—</span>`.
  6. `<td style="width:70px">` → `<span class="muted" aria-label="No cost yet">—</span>` / `<span>{costText}</span>`.
  7. `<td style="width:180px">` → `<div class="acts"><a href>Open</a><button type="button" aria-haspopup="dialog">Move…</button></div>` (opens the Move dialog; `aria-haspopup="dialog"` replaces the mockup's `menu` because it opens a dialog — LI-G7).
- Empty: `<p class="foot">{copy}</p>` in place of the table.

#### Layout & CSS (verbatim; shell `.mh*`, `.app`, `.main`, `.kbd` excluded)

```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.wrap-any { overflow-wrap: anywhere; }
.pp { padding: var(--vk-space-6) var(--vk-space-7) var(--vk-space-7); }
.mast { display: flex; align-items: flex-end; gap: var(--vk-space-5); flex-wrap: wrap; border-bottom: 3px double var(--vk-color-text); padding-bottom: var(--vk-space-4); }
.mast__eyebrow { margin: 0 0 var(--vk-space-2); font-size: 0.8125rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--vk-color-muted); }
.mast h1 { margin: 0; font: 500 3rem / 1 var(--vk-font-display); }
.mast__line { margin: var(--vk-space-2) 0 0; font: italic 400 1.1875rem / 1.4 var(--vk-font-display); color: var(--vk-color-muted); }
.tools { margin-left: auto; display: flex; gap: var(--vk-space-4); align-items: center; flex-wrap: wrap; }
.tabs { display: flex; gap: var(--vk-space-1); }
.tabs button { min-height: 44px; padding: 0 var(--vk-space-3); border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--vk-color-muted); font: 500 var(--vk-text-sm) / 1 var(--vk-font-body); cursor: pointer; }
.tabs button[aria-pressed="true"] { color: var(--vk-color-text); border-bottom-color: var(--vk-color-text); }
.tlabel { font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--vk-color-muted); }
table { width: 100%; border-collapse: collapse; margin-top: var(--vk-space-3); }
thead th { text-align: left; padding: 0; border-bottom: 1px solid var(--vk-color-text); font-weight: 500; }
.sort { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 var(--vk-space-2) 0 0; border: 0; background: transparent; color: var(--vk-color-muted); font: 500 0.75rem / 1 var(--vk-font-body); letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
.sort[data-on="true"] { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 4px; }
.g th { text-align: left; padding: var(--vk-space-6) 0 var(--vk-space-2); border-bottom: 1px solid var(--vk-color-line); font-weight: 400; }
.g__name { font: 600 1.625rem / 1.2 var(--vk-font-display); }
.g__n { font: italic 400 1.125rem / 1 var(--vk-font-display); color: var(--vk-color-muted); margin-left: var(--vk-space-2); }
.g__own { float: right; margin-top: 10px; font-size: 0.8125rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--vk-color-muted); }
td { padding: var(--vk-space-4) var(--vk-space-3) var(--vk-space-4) 0; border-bottom: 1px solid var(--vk-color-line); vertical-align: top; }
.pri { font: 600 1.0625rem / 1.5 var(--vk-font-display); font-variant-numeric: oldstyle-nums; }
.pri--1 { color: var(--vk-color-signal-text); }
.ttl { font: 500 1.25rem / 1.35 var(--vk-font-display); color: var(--vk-color-text); text-decoration: none; overflow-wrap: anywhere; }
.ttl:hover { text-decoration: underline; text-underline-offset: 4px; }
.facts { margin-top: 6px; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--vk-color-muted); display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; }
.state { font-size: 0.8125rem; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.6; }
.state--needs { color: var(--vk-color-signal-text); font-weight: 700; display: inline-flex; gap: 6px; align-items: center; }
.state--needs::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--vk-color-signal); }
.who { display: flex; align-items: center; gap: var(--vk-space-2); font: italic 400 1.0625rem / 1.3 var(--vk-font-display); }
.muted { color: var(--vk-color-muted); }
.due--over { color: var(--vk-color-signal-text); font-weight: 600; font-size: 0.9375rem; }
.acts { display: flex; gap: var(--vk-space-2); justify-content: flex-end; }
.acts a, .acts button { min-height: 44px; display: inline-flex; align-items: center; gap: 4px; padding: 0 var(--vk-space-3); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font: 500 var(--vk-text-sm) / 1 var(--vk-font-body); text-decoration: none; cursor: pointer; }
.acts a { border-color: var(--vk-color-text); }
.foot { margin-top: var(--vk-space-5); font: italic 400 1.0625rem / 1.5 var(--vk-font-display); color: var(--vk-color-muted); }
.asked { display: inline-flex; gap: 4px; align-items: center; } /* was an inline style */
```
Note: the `.facts` flex gap separates the " · " text nodes; render the facts as one text run with the asked-by span appended, exactly as the mockup (text nodes + one span), so flex gap applies only between the text run and the span. Responsive: shared media query; additionally at ≤719px `.tools { margin-left: 0; }` is not needed (it wraps) — no other rule.

#### Content map

| Visible | Source |
|---|---|
| "Superpipeline · Plan", "The index" | copy |
| "Developer Experience, six cards. Three wait on you." | `${boardName}, ${numberWord(cardCount)} ${plural(cardCount,'card','cards')}.` + (needsCount === 0 ? ' Nothing waits on you.' : ` ${cap(numberWord(needsCount))} ${needsCount === 1 ? 'waits' : 'wait'} on you.`) |
| "Group by", tab words | copy |
| "Pri", "Card", "State", "Agent", "Due", "Cost" | copy |
| "— one card", "— three cards" | `'— ' + numberWord(n) + (n === 1 ? ' card' : ' cards')` |
| owner (right, uppercase by CSS) | `group.owner` |
| facts | as cell 2 |
| "Waiting on you", "Queued", "Done" | `state.word` (uppercase via CSS) |
| "Unclaimed", "Not claimed yet", agent names | as Daylight |
| "Overdue, 6 Oct 2026" | `'Overdue, ' + dueHuman` |
| "Open", "Move…" | copy |
| foot | `Sorted by ${sortNoun}, ${hint}.` + (emptyStages.length ? ` Stages with no cards are left out: ${joinAnd(emptyStages)}.` : '') |

#### Fixture needs

Shared fixture (Integrate editorial's `blockedBy` has exactly one entry → "Blocked by another card").

#### Gaps

Shared LI-G1, G3, G4, G5, G7 (Move… opens the dialog), G8. Paper-only: none.

---

### SP-List-Studio

- Size 1440 × 1325 (`$preview` 1440×1100). Vibe studio (Annual report tokens), theme light. Same route/state; row 2 (AgentPod) selected — the e2e presses `J` twice before capture (selection starts null).

#### Component tree

- `ListStudio.svelte` (body; toolbar null). Props `ListLayoutProps`. Rendered inside the Studio shell's `.ls-body` after `.ar-sub` (shell owns `.ar.ls` grid, rail, `ar-top`, `ar-sub` incl. "Showing all 6 cards" / time, and `ar-status`). Markup:
  ```html
  <main class="ls-main">
    <div class="ls-bar">
      <div class="ls-seg" role="group" aria-label="Quick filter"><button type="button" aria-pressed="true">All <span class="n">6</span></button><button type="button" aria-pressed="false" class="sig">Needs <span class="n">3</span></button><button type="button" aria-pressed="false">Working <span class="n">0</span></button><button type="button" aria-pressed="false">Idle <span class="n">2</span></button><button type="button" aria-pressed="false">Done <span class="n">1</span></button></div>
      <span class="kick">Group</span>
      <div class="ls-seg" role="group" aria-label="Group by"><button type="button" aria-pressed="true">Stage</button><button type="button" aria-pressed="false">State</button><button type="button" aria-pressed="false">Owner</button><button type="button" aria-pressed="false">Priority</button></div>
      <div class="keys" aria-label="Keyboard"><span><span class="kbd">J</span><span class="kbd">K</span> row</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">M</span> move</span><span><span class="kbd">S</span> sort</span><span><span class="kbd">G</span> group</span></div>
    </div>
    <div class="ls-hero">
      <span class="big" aria-hidden="true">6</span>
      <div><span class="kick">Every card, by stage</span><h1><span class="sr">6 </span>cards sit in 4 of the board’s 7 stages</h1><p>Sorted by priority, highest first. The three empty stages, Reproduce, Integrate and Signed off, are left out of the list.</p></div>
    </div>
    <section class="ar-sec" aria-label="Cards">
      <table class="ar-tbl ls-tbl">
        <caption class="sr">Developer Experience cards, grouped by stage, sorted by priority ascending</caption>
        <thead><tr>
          <th scope="col" style="width: 56px" aria-sort="ascending"><button class="sort" type="button" data-on="true">Pri[sort-studio]<span class="sr">, sorted highest first</span></button></th>
          <th scope="col"><button class="sort" type="button" data-on="false">Card[sort-studio]</button></th>
          <th scope="col" style="width: 140px">…State…</th>
          <th scope="col" style="width: 132px">…Agent…</th>
          <th scope="col" style="width: 48px">…Att…</th>
          <th scope="col" style="width: 52px">…Age…</th>
          <th scope="col" style="width: 112px">…Due…</th>
          <th scope="col" style="width: 56px">…Cost…</th>
          <th scope="col" style="width: 176px"><span class="sr">Actions</span></th>
        </tr></thead>
        <tbody><tr class="g"><th colspan="9" scope="colgroup"><span class="in"><span class="no">01</span><span class="band c1"></span><span class="nm">Reported</span><span class="ct">1</span><span class="own">a person</span></span></th></tr>
          <tr> … </tr>
        </tbody>
        …
      </table>
      <div class="ls-foot"><span>6 cards</span><span>4 groups · 3 empty stages hidden</span><span>sort Pri ↑</span><span>$0.00 total</span><span>row 2 of 6</span></div>
    </section>
  </main>
  ```
  Caption = `${boardName} cards, grouped by ${groupNoun}, sorted by ${sortNoun} ${ascending ? 'ascending' : 'descending'}`.
  Group header: `.no` = `String(order + 1).padStart(2, '0')`, `.band c{order + 1}` (stage groups; non-stage groups: `.no` = index+1 padded, band omitted), `.nm` label, `.ct` count, `.own` owner (omitted when null).
  Cells (`<tr>`; selected → `class="sel" aria-current="true"`):
  1. `<span class="ls-pri">P1</span>` (Studio does not colour P1; `prioritySignal` adds `sigt` class → `<span class="ls-pri sigt">` — LI-G5 keeps the mockup: the blocker is P1 and needs you, so it would turn signal. **Exception for pixel fidelity: Studio never applies the signal to the priority cell** (the mockup draws P1 in ink; Studio's primary is ink).) None → `<span class="m" aria-label="No priority">—</span>`.
  2. `<a class="ttl" href>{title}</a>` + `<div class="ar-facts">` when any fact: `<span>{label}</span>` ×≤3, `<span title="{n} more label{s}">+{n}</span>`, `<span>[lock]Blocked</span>`, `<span><Face 14 working/>asked by super-chotu</span>`.
  3. `<span class="ar-st needs"><span class="u needs"></span>Waiting on you</span>` / `<span class="ar-st"><span class="u queued"></span>Queued</span>` / `<span class="ar-st"><span class="u done"></span>Done</span>` / working `<span class="ar-st"><span class="u working"></span>Working</span>` / closed `<span class="ar-st"><span class="u off"></span>{word}</span>`.
  4. agent `<span class="ag"><Face 20 mood/>{name}</span>`; none `<span class="m">{unclaimedWord}</span>`.
  5. Att `<span class="m">{attempts}</span>`; when `attemptsSignal`: `<span class="m"><span class="sigt">5</span></span>`.
  6. Age `<span class="m">{ageText ?? '—'}</span>`.
  7. Due overdue `<span class="ls-over">[calendar]2026-10-06<span class="sr">, overdue</span></span>` (signal iff dueSignal; overdue without signal → `<span class="m">2026-10-06<span class="sr">, overdue</span></span>`); due `<span class="m">{dueIso}</span>`; none `<span class="m">—</span>`.
  8. Cost `<span class="m">{costText ?? '—'}</span>` (`m sig` iff costSignal).
  9. `<div class="ls-acts"><a class="ib" href>Open <span class="kbd" aria-hidden="true">↵</span></a><button class="ib" type="button" aria-haspopup="dialog">Move <span class="kbd" aria-hidden="true">M</span></button></div>`.
- Empty: in place of the table `<p class="ls-hero"><span class="kick">{copy}</span></p>`? No — use `<div class="ls-foot"><span>{copy}</span></div>` under the hero (existing class; LI-G8).

#### Layout & CSS (verbatim from SP-List-Studio.dc.html; shell `.ar-rail`, `.ar-mark`, `.ar-nav`, `.ar-acct`, `.ar-top`, `.ar-board`, `.ar-sw`, `.ar-cmd`, `.ar-live`, `.ar-sub`, `.ar-tab`, `.ar-fl`, `.ar-status`, `.ar.ls`, `.ls-body`, buttons `.ar-btn*` excluded; the `.ar` alias layer and base rules are the Studio shell's — repeated here because the list depends on them and must not drift)

```css
/* from the Studio shell base (must exist on the .ar root) */
.ar { --bg: var(--vk-color-bg); --paper: var(--vk-color-surface); --text: var(--vk-color-text); --muted: var(--vk-color-muted);
  --rule: var(--vk-color-rule); --hair: var(--vk-color-line); --field: var(--vk-color-raised);
  --soft: color-mix(in srgb, var(--vk-color-text) 6%, var(--vk-color-bg));
  --s1: var(--vk-stage-1); --s2: var(--vk-stage-2); --s3: var(--vk-stage-3); --s4: var(--vk-stage-4); --s5: var(--vk-stage-5); --s6: var(--vk-stage-6); --s7: var(--vk-stage-7);
  --st-text: var(--vk-color-stage-text);
  --sig: var(--vk-color-signal); --sig-text: var(--vk-color-signal-text); --sig-wash: var(--vk-color-signal-wash); --sig-fg: var(--vk-face-ink);
  --ff: var(--vk-font-body); --fm: var(--vk-font-mono); --fs: var(--vk-font-serif);
  background: var(--bg); color: var(--text); font: 400 14px/1.45 var(--ff); font-variant-numeric: tabular-nums lining-nums; }
.ar :focus-visible { outline: 3px solid var(--text); outline-offset: 3px; box-shadow: none; }
.ar .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.ar .kick { font: 700 12px/1.2 var(--ff); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
.ar .kbd { display: inline-block; padding: 2px 5px; border: 1px solid currentColor; border-radius: 2px; font: 500 11px/1 var(--fm); white-space: nowrap; }
.ar .c1 { background: var(--s1); } .ar .c2 { background: var(--s2); } .ar .c3 { background: var(--s3); } .ar .c4 { background: var(--s4); } .ar .c5 { background: var(--s5); } .ar .c6 { background: var(--s6); } .ar .c7 { background: var(--s7); }
.ar .u { display: inline-block; flex: none; width: 18px; height: 18px; }
.ar .u.needs { background: var(--sig); }
.ar .u.blocked { background: repeating-linear-gradient(135deg, var(--s5) 0 1.5px, transparent 1.5px 4px); box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.queued { box-shadow: inset 0 0 0 1.5px var(--s5); }
.ar .u.done { background: var(--s7); }
.ar .u.off { box-shadow: inset 0 0 0 1.5px var(--muted); }
.ar .u.working { background: var(--st-text); } /* LI-G8: value from .ar-live i */
.ar svg[data-mood] { flex: none; }
.ar-sec { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.ar .ttl { position: relative; padding: 0; border: 0; background: transparent; color: var(--text); font: 700 14px/1.3 var(--ff); text-align: left; text-decoration: none; overflow-wrap: anywhere; cursor: pointer; }
.ar .ttl::after { content: ""; position: absolute; left: -4px; right: -4px; top: 50%; height: max(44px, calc(100% + 8px)); transform: translateY(-50%); }
.ar .ttl:hover { text-decoration: underline; text-underline-offset: 3px; }
.ar-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ar-tbl th { height: 30px; padding: 0 10px 0 0; text-align: left; font: 700 12px var(--ff); color: var(--muted); border-bottom: 1px solid var(--rule); vertical-align: bottom; }
.ar-tbl td { overflow-wrap: break-word; padding: 10px 10px 10px 0; border-bottom: 1px solid var(--hair); vertical-align: top; }
.ar-tbl tr.sel td { background: var(--soft); }
.ar-tbl tr.sel td:first-child { box-shadow: inset 3px 0 0 var(--text); padding-left: 8px; }
.ar-tbl .ag { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; white-space: nowrap; }
.ar-tbl .m { font: 500 12.5px var(--fm); color: var(--muted); }
.ar-tbl .m.sig, .ar .sigt { color: var(--sig-text); font-weight: 600; }
.ar-st { display: inline-flex; align-items: center; gap: 7px; font-weight: 700; font-size: 13px; white-space: nowrap; }
.ar-st .u { width: 11px; height: 11px; }
.ar-st.needs { color: var(--sig-text); }
.ar-facts { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 4px; font: 500 12px/1.35 var(--fm); color: var(--muted); }
.ar-facts > span { display: inline-flex; align-items: center; gap: 5px; overflow-wrap: anywhere; }
.ar-facts .p { color: var(--text); font-weight: 600; }

/* list-specific */
.ls-main { flex: 1; display: flex; flex-direction: column; gap: 28px; padding: 24px 40px 40px; }
.ls-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; }
.ls-seg { display: inline-flex; flex-wrap: wrap; align-items: center; }
.ls-seg button { position: relative; display: inline-flex; align-items: baseline; gap: 6px; min-height: 44px; padding: 0 12px; border: 0; border-left: 1px solid var(--hair); background: transparent; color: var(--muted); font: 700 14px var(--ff); white-space: nowrap; cursor: pointer; }
.ls-seg button:first-child { border-left: 0; padding-left: 0; }
.ls-seg button .n { font: 500 12.5px var(--fm); }
.ls-seg button[aria-pressed="true"] { color: var(--text); text-decoration: underline; text-decoration-thickness: 3px; text-underline-offset: 8px; }
.ls-seg button.sig .n { color: var(--sig-text); font-weight: 600; }
.ls-bar .keys { margin-left: auto; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 13px; color: var(--muted); }
.ls-bar .keys > span { display: inline-flex; align-items: center; gap: 4px; }
.ls-hero { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; column-gap: 24px; padding-bottom: 4px; }
.ls-hero .big { font: 900 120px/.8 var(--ff); font-stretch: 72%; letter-spacing: -.04em; }
.ls-hero h1 { font: 800 36px/1.05 var(--ff); font-stretch: 82%; letter-spacing: -.015em; }
.ls-hero p { margin-top: 8px; max-width: 720px; font: 400 17px/1.45 var(--fs); }
.ls-tbl th .sort { display: inline-flex; align-items: center; gap: 4px; min-height: 30px; padding: 0; border: 0; background: transparent; color: var(--muted); font: 700 12px var(--ff); cursor: pointer; white-space: nowrap; }
.ls-tbl th .sort[data-on="true"] { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.ls-tbl tr.g th { padding: 18px 0 8px; border-bottom: 1.5px solid var(--rule); text-align: left; color: var(--text); }
.ls-tbl tbody:first-of-type tr.g th { padding-top: 10px; }
.ls-tbl .g .in { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; }
.ls-tbl .g .no { font: 500 12px var(--fm); color: var(--muted); }
.ls-tbl .g .band { width: 28px; height: 8px; }
.ls-tbl .g .nm { font: 800 16px var(--ff); }
.ls-tbl .g .ct { font: 900 28px/.9 var(--ff); font-stretch: 72%; }
.ls-tbl .g .own { margin-left: auto; font: 500 12px var(--fm); color: var(--muted); }
.ls-pri { font: 600 12.5px var(--fm); }
.ls-acts { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.ls-acts .ib { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 10px; border: 1px solid var(--rule); border-radius: 2px; background: transparent; color: var(--text); font: 700 13px var(--ff); text-decoration: none; white-space: nowrap; cursor: pointer; }
.ls-acts .ib:hover { background: var(--text); color: var(--bg); }
.ls-over { display: inline-flex; align-items: center; gap: 4px; color: var(--sig-text); font: 600 12.5px var(--fm); white-space: nowrap; }
.ls-foot { display: flex; flex-wrap: wrap; gap: 6px 20px; padding-top: 10px; border-top: 1px solid var(--rule); font: 500 12px var(--fm); color: var(--muted); }
```
Notes: `.ls-acts .ib` is 36px tall in the mockup (below the 44px target rule); keep 36px for pixel fidelity and add the shell's `.h44` hit-area helper (`.ar .h44 { position: relative; } .ar .h44::after { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: max(44px, 100%); transform: translateY(-50%); }`) as class `h44` on each `.ib` — invisible, keeps the 44px target. Same for `.ls-tbl th .sort` (30px) → add `h44`. Responsive: shared media query plus `.ls-main { padding: 16px; }` and `.ls-hero .big { font-size: 72px; }` at ≤719px (values: 16px = vk-space gutter rule in the brief; 72px — LI-G6).

#### Content map

| Visible | Source |
|---|---|
| Quick filter "All 6", "Needs 3", "Working 0", "Idle 2", "Done 1" | `quickCounts`; `.sig` class on Needs only when `needs > 0` (no signal for zero) |
| "Group", group words | copy |
| keys legend | copy |
| big "6" | `cardCount` (after quick filter: visible row count) |
| "Every card, by stage" | `'Every card, by ' + groupNoun` (quick filter ≠ all: `'${QuickWord} cards, by ' + groupNoun`, QuickWord = Needs→"Waiting", Working, Idle, Done) |
| h1 "6 cards sit in 4 of the board’s 7 stages" | stage grouping: `<span class="sr">{n} </span>{plural(n,'card','cards')} sit in {groups.length} of the board’s {stageCount} stages` (n === 1: "card sits in 1 of …"); other groupings: `{cards} in {groups.length} {plural(groups.length, groupNoun, groupNoun + 's')}` (LI-G8) |
| hero p | `Sorted by ${sortNoun}, ${hint}.` + (emptyStages.length ? ` The ${numberWord(k)} empty stage${k===1?'':'s'}, ${joinAnd(emptyStages)}, ${k===1?'is':'are'} left out of the list.` : '') |
| headers "Pri", "Card", "State", "Agent", "Att", "Age", "Due", "Cost" | copy |
| group "01" band "Reported" "1" "a person" | `order+1`, `c{order+1}`, label, count, owner |
| cells | see Component tree |
| "2026-10-06" | `dueIso` |
| "0", "1", "5" | `attemptCount` |
| "2d", "33h", "—" | `ageText` |
| foot "6 cards" | `${cardCount} ${plural}` |
| "4 groups · 3 empty stages hidden" | `${groups.length} ${plural(groups.length,'group','groups')}` + (stage grouping && k > 0 ? ` · ${k} empty ${plural(k,'stage','stages')} hidden` : '') |
| "sort Pri ↑" | `'sort ' + HEADER[sort.key] + (sort.ascending ? ' ↑' : ' ↓')` (HEADER: Pri, Card, State, Agent, Att, Age, Due, Cost) |
| "$0.00 total" | `'$' + totalCostUsd.toFixed(2) + ' total'` |
| "row 2 of 6" | `selected !== null` → `row ${selected + 1} of ${visibleRows}`; omitted when null |

#### Fixture needs

Shared fixture. Selection: e2e presses `J`, `J` (row 1 → row 2). The Studio ages: blocker "2d", AgentPod "33h", Integrate "2d", X connector "2d", Fix card "33h", Shipped "—".

#### Gaps

Shared LI-G1, G3, G4, G7 (Move opens the dialog), G8 (`.u.working`, empty state, non-stage hero copy), G10. Studio-only:

| id | Gap | Ruling |
|---|---|---|
| LI-G11 | Studio's 36px `.ib` buttons and 30px sort buttons are under the 44px target rule. | (a) Keep drawn size; add the `.h44` invisible hit area (CSS above). |
| LI-G12 | Studio draws P1 without the signal while Daylight/Paper signal it. | (a) Keep per-vibe: Studio never signals the priority cell (ink primary per studio-annual brief). |

---

### SP-List-Quiet

- Size 1440 × 1897 (`$preview` 1440×1400). Vibe quiet, theme light. Same route/state.

#### Component tree

- `ListQuiet.svelte` (body; toolbar null). Props `ListLayoutProps`. Rendered inside the Quiet shell's `.main` (the shell owns `.qn` nav incl. "View: Board · List · Projects" and the `<main id="content" tabindex="-1">` element — if the shell gives PlanView the `<main>`, ListQuiet renders `<div class="q"><div class="q__col">…` instead of `<main class="q">`; the class names and CSS are unchanged). Markup:
  ```html
  <main class="q" id="content" tabindex="-1"><div class="q__col">
    <h1>Developer Experience: list</h1>
    <p class="lede">6 cards. 3 are waiting on you.</p>
    <div class="controls">
      <label class="lbl">Group by<select class="inp"><option selected>Stage</option><option>State</option><option>Owner</option><option>Priority</option></select></label>
      <label class="lbl">Sort by<select class="inp"><option selected>Priority, highest first</option><option>Card title</option><option>State</option><option>Agent</option><option>Due date</option><option>Cost</option></select></label>
      <button class="vk-button vk-button--secondary btn-sm" type="button" aria-haspopup="dialog">Filter (none on)</button>
    </div>
    {#each groups}
    <h2>Reported (1)</h2><p class="own">Worked by a person.</p>
    <table><caption class="vk-visually-hidden">Reported</caption>
      <thead><tr>
        <th scope="col" aria-sort="ascending"><button class="sort" type="button" data-on="true">Priority <span class="sorted">(sorted, highest first)</span></button></th>
        <th scope="col"><button class="sort" type="button" data-on="false">Card</button></th>
        … State, Agent, Due, Cost …
        <th scope="col">Actions</th>
      </tr></thead>
      <tbody><tr class="needs"> … </tr></tbody>
    </table>
    {/each}
    <p class="empty">Stages with no cards are not shown: Reproduce, Integrate, Signed off.</p>
  </div></main>
  ```
  The Filter button is Quiet's in-page filter entry (it opens the same filter popover/dialog as the shell Filter button: calls the FilterBar's open function — the shell group exposes it as `app.filterOpen = true`; LI-G13). Label: `Filter (none on)` / `Filter (${n} on)` where n = number of active filter chips (FilterBar's `active.length`).
  Rows: `<tr class="needs">` iff needsYou. Cells:
  1. `<td style="width:7rem">` `P1` / `None`.
  2. `<td>` `<a href>{title}</a>` + `<div class="facts">` when any: sentences joined by " ": `Labels: ${joinAnd(firstThree)}${more ? ' and ' + more + ' more' : ''}.` (with more: "Labels: clean-room, evidence-required, superpipeline and 1 more." — i.e. first three joined with ", " then " and 1 more"); `Blocked by another card.` / `Blocked by ${numberWord(n)} other cards.`; `Asked for by ${askedBy.name}.`
  3. `<td style="width:11rem">` needs → `<span class="st--needs">Waiting on you{sub ? ', ' + sub : ''}</span>` ("Waiting on you, stopped", "Waiting on you, no owner"); else `<span>{word}</span>`.
  4. `<td style="width:11rem">` `<div class="who"><Face 20 mood/>{name}</div>` / `<div class="who"><span class="noface" aria-hidden="true" style="width:20px;height:20px"></span>{unclaimedWord}</div>`.
  5. `<td style="width:10rem">` overdue → `<strong>Overdue.</strong> Was due 6 Oct 2026.`; due → `Due ${dueHuman}.`; none → `None`.
  6. `<td style="width:5rem">` `None` / `$0.42`.
  7. `<td style="width:12rem">` `<div class="acts"><a href>Open</a><button class="textbtn" type="button" aria-haspopup="dialog">Move</button></div>`.
- Empty (no rows): after `.controls`, `<p class="empty">{copy}</p>`.

#### Layout & CSS (verbatim; shell `.qn*`, `.app`, `.main` excluded)

```css
.noface { flex: none; display: inline-block; border-radius: 50%; border: 2px dashed var(--vk-color-faint); }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: var(--vk-text-sm); }
.q { padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); }
.q__col { max-width: 72rem; }
.q a { color: var(--vk-color-text); text-decoration: underline; text-underline-offset: 4px; }
.q h1 { margin: 0; font: 700 2rem / 1.2 var(--vk-font-display); }
.lede { margin: var(--vk-space-2) 0 0; font-size: 1.1875rem; }
.controls { display: flex; flex-wrap: wrap; gap: var(--vk-space-5); align-items: end; margin-top: var(--vk-space-5); padding-bottom: var(--vk-space-4); border-bottom: 2px solid var(--vk-color-text); }
.lbl { display: grid; gap: var(--vk-space-2); font-weight: 700; font-size: 1.0625rem; }
.inp { font: inherit; font-weight: 400; font-size: 1.0625rem; color: var(--vk-color-text); background: var(--vk-color-surface); border: 2px solid var(--vk-color-text); border-radius: var(--vk-radius-sm); min-height: 48px; padding: 0 var(--vk-space-3); }
.textbtn { min-height: 48px; padding: 0 var(--vk-space-2); border: 0; background: transparent; color: var(--vk-color-text); font: inherit; font-size: 1.0625rem; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; }
.textbtn[aria-pressed="true"] { font-weight: 700; text-decoration: none; }
.views { display: flex; gap: var(--vk-space-2); align-items: center; font-size: 1.0625rem; }
.q h2 { margin: var(--vk-space-6) 0 0; font: 700 1.375rem / 1.3 var(--vk-font-display); }
.own { margin: 4px 0 0; color: var(--vk-color-muted); font-size: 1rem; }
table { width: 100%; border-collapse: collapse; margin-top: var(--vk-space-3); font-size: 1.0625rem; }
th { text-align: left; font-weight: 700; padding: 0 var(--vk-space-3) 0 0; border-bottom: 2px solid var(--vk-color-line); }
.sort { min-height: 48px; padding: 0; border: 0; background: transparent; color: var(--vk-color-text); font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.sort[data-on="true"] { text-decoration: none; }
.sorted { font-weight: 400; color: var(--vk-color-muted); font-size: 0.875rem; white-space: nowrap; text-decoration: none; }
th > .sort:has(.sorted) { flex-direction: column; align-items: flex-start; gap: 0; line-height: 1.3; padding: 4px 0; }
td { padding: var(--vk-space-3) var(--vk-space-3) var(--vk-space-3) 0; border-bottom: 1px solid var(--vk-color-line); vertical-align: top; line-height: 1.5; overflow-wrap: anywhere; }
tr.needs td:first-child { box-shadow: inset 5px 0 0 var(--vk-color-signal); padding-left: var(--vk-space-4); }
td:first-child { padding-left: var(--vk-space-4); }
.facts { margin-top: 2px; color: var(--vk-color-muted); font-size: 1rem; }
.who { display: flex; align-items: center; gap: 8px; }
.st--needs { font-weight: 700; color: var(--vk-color-signal-text); }
.acts { display: flex; gap: var(--vk-space-3); align-items: center; }
.empty { margin: var(--vk-space-6) 0 0; font-size: 1.0625rem; }
```
(`.views` is unused by the List markup; drop it.) Responsive: shared media query; `.q { padding: var(--vk-space-5) var(--vk-space-4) var(--vk-space-6); }` at ≤719px (16px gutter per brief).

#### Content map

| Visible | Source |
|---|---|
| "Developer Experience: list" | `${boardName}: list` |
| "6 cards. 3 are waiting on you." | `${cardCount} ${plural(cardCount,'card','cards')}.` + (needsCount === 0 ? ' No card is waiting on you.' : needsCount === 1 ? ' 1 is waiting on you.' : ` ${needsCount} are waiting on you.`) — mockup's "2" is wrong (LI-G1) |
| Group by options | copy; selected = groupBy |
| Sort by options | copy, mapped as in Interactions; selected option = current sort if it equals one of the six mappings, else an extra first option `${sortNoun}, ${hint}` is rendered selected |
| "Filter (none on)" | as above |
| h2 "Reported (1)" | `${label} (${count})` |
| "Worked by a person." / "Worked by testing · tester-tim." / "Worked by code · 2 agents." | `'Worked by ' + owner + '.'` (omitted when owner null) |
| caption | group label |
| "Priority (sorted, highest first)" | header word + `<span class="sorted">(sorted, ${hint})</span>` on the active column; header words Priority, Card, State, Agent, Due, Cost, Actions |
| "P1", "P2", "None" | `priorityText ?? 'None'` |
| facts sentences | as cell 2 |
| "Waiting on you, stopped" / "Waiting on you, no owner" / "Queued" / "Done" | `state.word` + sub |
| agent / unclaimed | as above |
| "Overdue. Was due 6 Oct 2026." / "None" | as cell 5 |
| cost "None" | `costText ?? 'None'` |
| "Open", "Move" | copy |
| "Stages with no cards are not shown: Reproduce, Integrate, Signed off." | `'Stages with no cards are not shown: ' + emptyStages.join(', ') + '.'` (omitted when none) |

#### Fixture needs

Shared fixture.

#### Gaps

Shared LI-G1 (lede and blocker row), G3, G4, G7 (Move opens the dialog), G8. Quiet-only:

| id | Gap | Ruling |
|---|---|---|
| LI-G13 | The Quiet page has its own "Filter (none on)" button; the filter popover lives in `FilterBar.svelte` with private `open` state. | (a) Lift FilterBar's `open` to `app.filterOpen = $state(false)` (shell group owns FilterBar); ListQuiet's button sets `app.filterOpen = true`; the count = active chip count, computed by a new exported `activeFilterCount(f: CardFilters): number` in FilterBar's module (same axes as its `active` list). |
| LI-G14 | Quiet's sort `<select>` lists six orders, but the column buttons can produce others (e.g. title Z→A). | (a) Render an extra selected first option naming the current order when it is not one of the six (formula in Content map). |


---

## Projects (SP-Projects)

**Artboard:** `SP-Projects` · 1440 × 1232 (manifest) · shared screen, vibe tweak `daylight | paper | studio | quiet` (default daylight), theme tweak `light | dark`, plus a canvas-only tweak `rollups: "loading (as captured)" | "loaded (placeholder figures)"` (default **loading**). The reference render (`e2e/reference/mockups/SP-Projects.html`) is the **loading** variant: every project card shows the skeleton bar and "Loading rollup…"; no figures.

**Route / state:** `/b/[boardId]` with `app.view === 'projects'` (Plan → Projects toggle), board = *Developer Experience* (`brd_…` whichever id the seed gives it), 6 cards on the board, 3 attention items, synced 13:51. Projects are workspace-wide (`GET /v1/projects`); the board only provides the eyebrow and the shell.

**Coordinator ruling that touches this screen:** the clean-room card "Fix the highest-severity blocker found in the clean-room journey" is **Waiting on you** (a `no-owner` attention item: `state: 'submitted'` in stage `Reported`, `ownerKind: 'human'`, no gate, not the last stage, `stateSince` 2 days old ≥ `stale.afterHours` 24). It is one of the "3 need you" this screen's shell shows (Studio status bar `3 need you`, Daylight rail bubble, Paper/Quiet "Operate (3 need you)"). That count is `itemsFromBoard(app.board, app.agents).length`, never `app.needsYou().length` (which omits `input-required` and `no-owner` and would read 0). The card itself does not appear on this screen.

### vibekit components used

Binding coordinator update: reusable UI comes from the vibekit Svelte 5 component library (`/Users/rakeshgangwar/SuperJackfruit/vibekit`, imported as `@superjackfruit/vibekit`), each component styling itself per vibe from its reference sheet. `ProjectView.svelte` composes them; it owns only the screen layout (`.page` header, `.pgrid`, `.pcard`, `.pfoot`, `.msform`, `.createform`, `.group-h`, `.mslist`) and the data mapping. The mockup CSS for each component is quoted under Layout & CSS as **reference for vibekit:<Name>, not app CSS**.

| Component | Props (TypeScript) | Used where on SP-Projects |
|---|---|---|
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet' \| 'signal' \| 'icon'; size?: 'sm' \| 'md'; type?: 'button' \| 'submit'; as?: 'button' \| 'span'; disabled?: boolean; label?: string /* aria-label; required when variant='icon' */; onclick?: (e: MouseEvent) => void; icon?: Snippet; children?: Snippet }` | "+ Project" inside the create summary (`variant:'primary' size:'sm' as:'span'`, it is the `<summary>`'s face, not a second control); Create (`primary sm submit`); Cancel (`quiet sm`); milestone Add (`secondary sm submit`); milestone Remove (`quiet sm`); delete project (`icon`, `label="Delete project {name}"`, `icon={IconTrash}`) |
| `vibekit:StatePill` | `{ tone: 'neutral' \| 'line' \| 'ok' \| 'signal'; kind?: 'pill' \| 'count'; icon?: Snippet; label?: string /* sr text for counts */; children: Snippet }` | project state ("Active" `neutral`, any other state `line`); health ("On track" `ok` + `IconCheck`; "At risk"/"Off track" `line`); group counts "3"/"2" (`kind:'count' tone:'neutral'`). `signal` is never used on this screen. |
| `vibekit:Field` | `{ id: string; label: string; type?: 'text' \| 'date'; placeholder?: string; value: string /* $bindable */; hint?: string; error?: string \| null; readonly?: boolean; oninput?: (v: string) => void }` | Project name, Target date (optional), Milestone, Date |
| `vibekit:Disclosure` | `{ open?: boolean /* $bindable, default false */; chevron?: boolean /* default true; rotates 180° open */; class?: string; summaryClass?: string; summaryStyle?: string; summary: Snippet; children: Snippet }` | create panel (`class="panel" summaryClass="panel-head" summaryStyle="border-bottom: 1px solid var(--vk-color-line)" chevron={false}` bound to `creatingProject`); each card's "Milestones · none yet" (chevron on) |
| `vibekit:ProgressBar` | `{ value: number /* 0–100 */; label: string /* aria-label, role=img */; tone?: 'success' }` | rollup bar (`value={progressPct(rollup)}`, `label="{done} of {total} cards done"`) |
| `vibekit:Skeleton` | `{ variant: 'bar'; caption?: string /* rendered as t-meta under the bar */ }` — wrapper carries `aria-busy="true"` | rollup loading: `<Skeleton variant="bar" caption="Loading rollup…" />` (the as-captured reference state) |
| `vibekit:EmptyState` | `{ kind: 'loading' \| 'empty' \| 'error'; message: string; action?: Snippet }` — `error` renders `role="alert"`, `loading` `role="status"` | list loading "Loading projects…", empty "No projects yet. Use “Project” above to add the first.", list error `loadError`; per-card "Rollup unavailable — {reason}" (`kind:'error'`, but muted, see PR-G10 — the component's error kind must not use the signal colour) |
| `vibekit:Footnote` | `{ children: Snippet }` — renders `<p class="t-meta">` | "If a rollup fails, the card says “Rollup unavailable” with the reason instead of showing a number. Deleting a project asks first." |

Not used here (listed so nobody adds app markup for them): `vibekit:Tabs` (the Board/List/Projects toggle is the shell spec's), `vibekit:FilterBar` (hidden on Projects), `vibekit:FigureRow`, `vibekit:DataTable`, `vibekit:AgentChip` (no agents on this screen).

### Component tree

| File | Action |
|---|---|
| `apps/web/src/lib/components/plan/ProjectView.svelte` | **Rewrite markup (composing the vibekit components above) + add a `<style>` for the screen layout only** (keep all script logic: `refresh`, `loadProjectDetail`, `addProject`, `removeProject`, `addMilestone`, `removeMilestone`, the `rollups`/`rollupErrors`/`milestonesByProject` maps). One component for every vibe; per-vibe differences of the screen layout are `:global([data-vibe=x])` selectors below; per-vibe differences of the components live in vibekit. Delete the `Button` import (`$lib/components/ui/button`) and `healthColor()`; delete `fmtDate()` (replaced by `fmtTarget()` below). |
| `apps/web/src/lib/components/plan/project-rollup.ts` | **Keep**; add `export function groupProjects(ps: Project[]): ProjectGroup[]`, `export function projectsSummary(ps: Project[]): string`, `export function fmtTarget(iso: string \| null): string` (signatures and behaviour below), with vitest cases in `project-rollup.test.ts` for every literal in this section. |
| `apps/web/src/lib/components/plan/PlanView.svelte` | Unchanged by this section (the view toggle + "Projects group cards across boards. Filters don’t apply here." note belong to the shell spec: `vs-dseg`/`vs-mtabs`/`vs-stabs`/`vs-qview` + `.vs-note`). Keep `{#if app.view !== 'projects'}<FilterBar />{/if}`. |

`ProjectView` takes **no props** (reads `app` + the project API calls, as today).

```ts
// project-rollup.ts additions
import type { Project, ProjectState } from '$lib/api';
export interface ProjectGroup { state: ProjectState; label: string; id: string; projects: Project[] }
/** Group order and headings. Only non-empty groups render. Within a group: the server's order (name ASC). */
export const GROUP_ORDER: ReadonlyArray<{ state: ProjectState; label: string; id: string }> = [
  { state: 'active', label: 'Active', id: 'g-act' },
  { state: 'planned', label: 'Planned', id: 'g-plan' },
  { state: 'paused', label: 'Paused', id: 'g-pause' },
  { state: 'completed', label: 'Completed', id: 'g-done' },
  { state: 'canceled', label: 'Canceled', id: 'g-cancel' },
];
export function groupProjects(ps: Project[]): ProjectGroup[];
/** "5 projects · 3 active, 2 completed." — `${n} project${n===1?'':'s'} · ` + non-zero groups in GROUP_ORDER as
 *  `${count} ${label.toLowerCase()}` joined by ", " + "." ; zero projects → "No projects yet." */
export function projectsSummary(ps: Project[]): string;
/** "Target 5 Oct 2026": `'Target ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })`;
 *  null → "No target date". Input is the API's `YYYY-MM-DD` (or ISO) string. */
export function fmtTarget(iso: string | null): string;
```

Markup (port exactly; `{…}` = Svelte expressions; icons are the inline stroke SVGs quoted at the end of this section):

```svelte
<script lang="ts">
  import { Button, StatePill, Field, Disclosure, ProgressBar, Skeleton, EmptyState, Footnote } from '@superjackfruit/vibekit';
  // …existing script logic…
</script>

<main class="page" id="main">
  <div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--vk-space-3)">
    <div style="display: flex; flex-direction: column; gap: 4px; flex: 1 1 300px">
      <p class="t-eyebrow">{app.board?.name ?? ''} · Plan</p>
      <h1 class="t-h1">Projects</h1>
      <p class="t-body" style="color: var(--vk-color-muted)">{projectsSummary(projects)} Each shows how many of its cards are done and what they cost.</p>
    </div>
  </div>

  <Disclosure bind:open={creatingProject} class="panel" summaryClass="panel-head" summaryStyle="border-bottom: 1px solid var(--vk-color-line)" chevron={false}>
    {#snippet summary()}<Button variant="primary" size="sm" as="span" icon={IconPlus}>Project</Button><span class="t-meta">Name it and, if you like, give it a target date.</span>{/snippet}
    <form class="createform" aria-label="New project" onsubmit={(e) => { e.preventDefault(); void addProject(); }}>
      <Field id="np-name" label="Project name" placeholder="e.g. Clean-room journey fixes" bind:value={newProjectName} />
      <Field id="np-date" label="Target date (optional)" type="date" bind:value={newProjectTarget} />
      <div style="display: flex; gap: var(--vk-space-2)">
        <Button variant="primary" size="sm" type="submit" disabled={newProjectName.trim() === '' || creatingProjectBusy}>{creatingProjectBusy ? 'Creating…' : 'Create'}</Button>
        <Button variant="quiet" size="sm" onclick={cancelCreate}>Cancel</Button>
      </div>
    </form>
    {#if creatingError}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5) var(--vk-space-4)">{creatingError}</p>{/if}
  </Disclosure>

  {#if loadError}<EmptyState kind="error" message={loadError} />
  {:else if loading && projects.length === 0}<EmptyState kind="loading" message="Loading projects…" />
  {:else if projects.length === 0}<EmptyState kind="empty" message="No projects yet. Use “Project” above to add the first." />{/if}

  {#each groupProjects(projects) as g (g.state)}
    <section aria-labelledby={g.id} style="display: flex; flex-direction: column; gap: var(--vk-space-3)">
      <div class="group-h"><h2 class="t-h2" id={g.id}>{g.label}</h2><StatePill kind="count" tone="neutral" label="{g.projects.length} projects">{g.projects.length}</StatePill></div>
      <div class="pgrid">
        {#each g.projects as p (p.id)}  <!-- article below -->  {/each}
      </div>
    </section>
  {/each}
  {#if projects.length > 0}
    <Footnote>If a rollup fails, the card says “Rollup unavailable” with the reason instead of showing a number. Deleting a project asks first.</Footnote>
  {/if}
</main>
```

Project card (`{@const rollup = rollups.get(p.id)}`, `{@const err = rollupErrors.get(p.id)}`, `{@const ms = milestonesByProject.get(p.id) ?? []}`):

```svelte
<article class="panel pcard" aria-labelledby="pj-{p.id}">
  <div style="display: flex; gap: var(--vk-space-2); align-items: flex-start">
    <h3 class="ptitle" id="pj-{p.id}" style="flex: 1">{p.name}</h3>
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center">
    <StatePill tone={p.state === 'active' ? 'neutral' : 'line'}>{STATE_LABEL[p.state]}</StatePill>
    {#if p.health}<StatePill tone={p.health === 'on-track' ? 'ok' : 'line'} icon={p.health === 'on-track' ? IconCheck : undefined}>{HEALTH_LABEL[p.health]}</StatePill>{/if}
    {#if p.targetDate}<span class="t-meta" style="display: inline-flex; align-items: center; gap: 4px">{@render IconCalendar()}{fmtTarget(p.targetDate)}</span>
    {:else}<span class="t-meta">No target date</span>{/if}
  </div>
  {#if err}
    <EmptyState kind="error" message="Rollup unavailable — {err}" />
  {:else if rollup}
    {@const seg = rollupSegments(rollup)}
    <div style="display: flex; flex-direction: column; gap: 6px">
      <ProgressBar value={progressPct(rollup)} label="{rollup.cardsDone} of {rollup.cardsTotal} cards done" tone="success" />
      <p class="t-body t-num" style="display: flex; justify-content: space-between; gap: 8px"><span><strong>{rollup.cardsDone}/{rollup.cardsTotal}</strong> cards done</span><span>{seg[1].text}</span></p>
      <p class="t-meta">{seg[2].text}</p>
    </div>
  {:else}
    <Skeleton variant="bar" caption="Loading rollup…" />
  {/if}
  <div class="pfoot">
    <Disclosure>
      {#snippet summary()}Milestones <span class="t-meta" style="font-weight: 400">· {ms.length === 0 ? 'none yet' : ms.length}</span>{/snippet}
      {#if ms.length > 0}
        <ul class="mslist">
          {#each ms as m (m.id)}
            <li><span class="t-body" style="flex: 1; min-width: 0; overflow-wrap: anywhere">{m.name}</span>{#if m.targetDate}<span class="t-meta">{fmtTarget(m.targetDate).replace('Target ', '')}</span>{/if}<Button variant="quiet" size="sm" disabled={removingMilestone === m.id} label="Remove milestone {m.name}" onclick={() => void removeMilestone(p.id, m.id)}>{removingMilestone === m.id ? 'Removing…' : 'Remove'}</Button></li>
          {/each}
        </ul>
      {/if}
      <form class="msform" aria-label="Add a milestone to {p.name}" onsubmit={(e) => { e.preventDefault(); void addMilestone(p.id); }}>
        <Field id="ms-{p.id}" label="Milestone" placeholder="Name" value={newMilestoneName[p.id] ?? ''} oninput={(v) => (newMilestoneName = { ...newMilestoneName, [p.id]: v })} />
        <Field id="md-{p.id}" label="Date" type="date" value={newMilestoneTarget[p.id] ?? ''} oninput={(v) => (newMilestoneTarget = { ...newMilestoneTarget, [p.id]: v })} />
        <Button variant="secondary" size="sm" type="submit" disabled={(newMilestoneName[p.id] ?? '').trim() === '' || addingMilestoneFor === p.id}>{addingMilestoneFor === p.id ? 'Adding…' : 'Add'}</Button>
      </form>
      {#if milestoneError[p.id]}<p class="hint" role="alert">{milestoneError[p.id]}</p>{/if}
    </Disclosure>
    <Button variant="icon" label="Delete project {p.name}" disabled={deletingProject === p.id} onclick={() => void removeProject(p)} icon={IconTrash} />
  </div>
</article>
```
Each vibekit component must render the same DOM the mockup has, so the layout rules that select into it keep matching: `Disclosure` → `<details class={class}><summary class={summaryClass} style={summaryStyle}>{#if chevron}<span class="disc-ico">…</span>{/if}{summary}</summary>{children}</details>`; `Field` → `<div class="field"><label for={id}>…</label><input id={id} class="input" …></div>`; `Skeleton` → `<div style="display:flex;flex-direction:column;gap:6px" aria-busy="true"><div class="skel"></div><p class="t-meta">{caption}</p></div>`. The `.pfoot details`, `.pfoot summary` and `.msform > .field:first-child` selectors therefore need `:global(details)`, `:global(summary)`, `:global(.field)` in the scoped style.

Note on `.msform`: `.msform > .field:first-child { grid-column: 1 / -1; }` puts *Milestone* on its own row and *Date* + *Add* on the second. The QA PNG (`.playwright-mcp/review/qa/SP-Projects.png`) shows all three on one row, but the reference HTML (`e2e/reference/mockups/SP-Projects.html`) carries the same rule and is the pixel authority: port the CSS and DOM order verbatim, do not "fix" either way.

Constants (in `ProjectView.svelte`):
```ts
const STATE_LABEL: Record<ProjectState, string> = { planned: 'Planned', active: 'Active', paused: 'Paused', completed: 'Completed', canceled: 'Canceled' };
const HEALTH_LABEL: Record<ProjectHealth, string> = { 'on-track': 'On track', 'at-risk': 'At risk', 'off-track': 'Off track' };
function cancelCreate() { newProjectName = ''; newProjectTarget = ''; creatingError = null; creatingProject = false; }
```

### Layout & CSS

Port into `ProjectView.svelte`'s `<style>`. Rules are verbatim from `SP-Projects.dc.html` minus the canvas rule `body { margin: 0; }` and the shell rules (`.vs-*`, `.main`, the "per-vibe app shell" and "Studio = Annual report" shell blocks — those are the shell spec's). Renames: every bare selector is wrapped for scoping — page-owned classes stay scoped as written; **every `[data-vibe="x"] …` prefix becomes `:global([data-vibe="x"]) …`**, and the `.app` root rules become `:global(.app) …` only if the shell spec does not already own them (the shell spec owns `.app`; drop lines prefixed `.app` here if it ships them — they are listed for completeness). `.vk-button`, `.vk-button--primary/--secondary/--quiet` come from vibekit (`@superjackfruit/vibekit/vibekit.css`, already imported by `app.css`); `vibekit:Button` owns them and the mockup's additions (`.btn-sm`, `.vk-button--quiet` padding, `.iconbtn`) — see its reference block.

Type system + base (app CSS; `.app` lines owned by the shell; if the shell spec moves `t-*` into `app.css`, delete them from this component):
```css
.app { display: flex; flex-wrap: wrap; align-items: stretch; min-height: 900px; background: var(--vk-color-bg); color: var(--vk-color-text); font-family: var(--vk-font-body); font-size: 1rem; line-height: 1.5; }
.app *, .app *::before, .app *::after { box-sizing: border-box; }
.app a { color: var(--vk-color-text); text-underline-offset: 3px; }
.app button { font-family: var(--vk-font-body); }
.app input, .app select, .app textarea { font-family: var(--vk-font-body); font-size: 16px; color: var(--vk-color-text); }

/* ---- type system: one scale, every screen ---- */
.t-h1 { margin: 0; font: 700 2rem/1.15 var(--vk-font-display); letter-spacing: -0.01em; }
.t-h2 { margin: 0; font: 700 1.25rem/1.3 var(--vk-font-display); }
.t-h3 { margin: 0; font: 700 1rem/1.35 var(--vk-font-body); }
.t-eyebrow { margin: 0; font: 600 0.8125rem/1.3 var(--vk-font-display); letter-spacing: 0.04em; color: var(--vk-color-muted); }
.t-body { margin: 0; font-size: 1rem; line-height: 1.55; }
.t-meta { margin: 0; font-size: 0.875rem; line-height: 1.45; color: var(--vk-color-muted); }
.t-num { font-variant-numeric: tabular-nums; }
.t-key { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); overflow-wrap: anywhere; }
[data-vibe="studio"] .t-eyebrow { font-family: var(--vk-font-body); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
[data-vibe="studio"] .t-num { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em; }
[data-vibe="paper"] .t-h1, [data-vibe="paper"] .t-h2 { font-weight: 500; }
[data-vibe="paper"] .t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400; }
[data-vibe="quiet"] .t-h1 { font-size: 1.875rem; }
[data-vibe="quiet"] .app a, [data-vibe="quiet"] a { text-decoration: underline; }

```
Page container (app CSS — the scrolling column inside `.main`):
```css
.page { width: 100%; max-width: 1280px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }
```
Screen layout (app CSS, `ProjectView.svelte` `<style>`; `[data-vibe]` → `:global([data-vibe])`, `.pfoot details/summary` and `.msform > .field` → `:global(...)` as noted above):
```css
.panel { background: var(--vk-color-surface); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); }
.panel-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
[data-vibe="quiet"] .panel { border-width: 1px; }
[data-vibe="paper"] .panel { border-radius: var(--vk-radius-sm); }
.pgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--vk-space-4); align-items: start; }
.pcard { display: flex; flex-direction: column; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-3); }
.ptitle { margin: 0; font: 700 1.125rem/1.3 var(--vk-font-display); overflow-wrap: anywhere; }
[data-vibe="paper"] .ptitle { font-weight: 500; font-size: 1.25rem; }
.pfoot { display: flex; align-items: flex-start; gap: var(--vk-space-2); border-top: 1px solid var(--vk-color-line); padding-top: var(--vk-space-2); }
.pfoot details { flex: 1; min-width: 0; }
.pfoot summary { min-height: 44px; display: flex; align-items: center; gap: 6px; font-size: 0.9375rem; font-weight: 600; }
.msform { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--vk-space-2); align-items: end; padding-bottom: var(--vk-space-2); }
.msform > .field:first-child { grid-column: 1 / -1; }
.group-h { display: flex; align-items: baseline; gap: var(--vk-space-2); }
.createform { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; gap: var(--vk-space-3); align-items: end; padding: var(--vk-space-4) var(--vk-space-5); }
[data-vibe="studio"] .t-h2 { font-family: var(--vk-font-body); font-weight: 800; font-stretch: 85%; }
[data-vibe="studio"] .panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule); }
```

**Reference for vibekit:Button, not app CSS** (vibekit's `.vk-button*` base is in vk.css lines 815–837; the mockup adds):
```css
.iconbtn { width: 44px; height: 44px; display: inline-grid; place-items: center; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); cursor: pointer; }
.iconbtn:hover { background: var(--vk-color-raised); }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: 0.9375rem; }
.vk-button--quiet { padding: 0 var(--vk-space-3); }
```
**Reference for vibekit:StatePill, not app CSS** (`tone` neutral = `.chip`, line = `.chip-line`, ok = `.chip-ok`, signal = `.chip-signal`; `kind:'count'` = `.count` / `.count-signal`):
```css
.chip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 2px 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-text); font-size: 0.8125rem; font-weight: 600; line-height: 1.2; overflow-wrap: anywhere; }
.chip-line { background: transparent; box-shadow: inset 0 0 0 1px var(--vk-color-line); color: var(--vk-color-muted); }
.chip-ok { background: var(--vk-color-success-wash); color: var(--vk-color-success-text); }
.chip-signal { background: var(--vk-color-signal-wash); color: var(--vk-color-signal-text); box-shadow: inset 0 0 0 1px var(--vk-color-signal); }
.count-signal { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal); color: var(--vk-color-primary-fg); font-size: 0.75rem; font-weight: 700; }
.count { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-size: 0.75rem; font-weight: 700; }
[data-vibe="studio"] .chip, [data-vibe="studio"] .count, [data-vibe="studio"] .count-signal { border-radius: 0; }
[data-vibe="studio"] .count, [data-vibe="studio"] .count-signal { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .count-signal { color: var(--vk-face-ink); }
```
**Reference for vibekit:Field, not app CSS:**
```css
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field label, .field .lbl { font-size: 0.875rem; font-weight: 600; }
.input { width: 100%; min-height: 44px; padding: 0 var(--vk-space-3); border: 1.5px solid var(--vk-color-faint); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font-size: 16px; }
textarea.input { padding: var(--vk-space-3); min-height: 96px; line-height: 1.5; resize: vertical; }
.input[readonly] { background: var(--vk-color-raised); border-color: var(--vk-color-line); }
.hint { margin: 0; font-size: 0.8125rem; color: var(--vk-color-muted); }
[data-vibe="studio"] .input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised); }
```
**Reference for vibekit:Disclosure, not app CSS:**
```css
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
.disc-ico { transition: transform var(--vk-motion-fast) var(--vk-motion-easing); display: inline-grid; }
details[open] > summary .disc-ico { transform: rotate(180deg); }
```
**Reference for vibekit:ProgressBar, not app CSS:**
```css
.bar { height: 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--vk-color-success); border-radius: inherit; }
```
**Reference for vibekit:Skeleton, not app CSS** (static gradient in the mockup; vibekit may animate it only under `prefers-reduced-motion: no-preference`, and the pixel test runs with reduced motion):
```css
.skel { height: 8px; border-radius: var(--vk-radius-pill); background: linear-gradient(90deg, var(--vk-color-raised), var(--vk-color-line), var(--vk-color-raised)); }
```
**Reference for vibekit:Footnote / vibekit:EmptyState, not app CSS:** they render with the `.t-meta` rule from the type system above.

Unused shared rules in the mockup (`.panel-body`, `.face`, `.saved`, `.unsaved`, `.tabs`, `.tab`, `.check`, `.sr`, `.note`, `.seg`) are not ported; `.ph-note` is canvas-only (PR-G1).

Added (gap PR-G6, milestone list — not drawn in the mockup; built only from existing tokens/sizes):
```css
.mslist { margin: 0 0 var(--vk-space-2); padding: 0; list-style: none; display: flex; flex-direction: column; }
.mslist li { display: flex; align-items: center; gap: var(--vk-space-2); min-height: 44px; border-top: 1px solid var(--vk-color-line); }
```
Responsive (gap PR-G5 — the mockup defines no media query; the 3-column grid cannot hold at 390):
```css
@media (max-width: 1099px) { .pgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 699px) {
  .pgrid { grid-template-columns: minmax(0, 1fr); }
  .createform { grid-template-columns: minmax(0, 1fr); }
  .page { padding: var(--vk-space-4) var(--vk-space-4) var(--vk-space-6); }
}
```
(16px phone gutter = `--vk-space-4`.)

**Per-vibe branches covered** (all in the CSS above): Studio — `.t-eyebrow` uppercase body 0.75rem 700 0.1em; `.t-num` mono; `.t-h1` 800 2.5rem/1.04 stretch 82%; `.t-h2` body 800 stretch 85%; `.face` radius-sm; `.panel` radius 0 + 1.5px `--vk-color-rule` top; `.chip/.count/.count-signal` radius 0; `.count` mono; `.input` radius 0, rule border 1px, raised bg. Paper — `.t-h1,.t-h2` 500; `.t-eyebrow` italic 0.9375rem 400; `.panel` radius-sm; `.ptitle` 500 1.25rem. Quiet — `.t-h1` 1.875rem; links underlined; `.panel` 1px. Daylight — the unprefixed defaults. Fonts/colours switch via tokens only (`--vk-font-display/body/mono`, `--vk-color-*`), so dark theme needs no extra rule.

Page geometry at 1440 (Daylight; shell owns everything left of/above `.page`): `.page` max-width 1280 centred in `.main`, padding 32/32/48 (space-6/6/7), column gap 24 (space-5). Header block → create panel → Active section (3 cards in a row) → Completed section (2 cards + empty third column) → footnote.

### Content map

| Visible | Source |
|---|---|
| "Developer Experience · Plan" | `${app.board.name} · Plan` |
| "Projects" | copy |
| "5 projects · 3 active, 2 completed." | `projectsSummary(projects)` (`listProjects()` → `Project.state`) |
| " Each shows how many of its cards are done and what they cost." | copy (preceded by one space) |
| "+" icon + "Project" (summary button) | copy; `IconPlus` |
| "Name it and, if you like, give it a target date." | copy |
| "Project name", placeholder "e.g. Clean-room journey fixes" | copy |
| "Target date (optional)" | copy; `<input type="date">` (empty → shows the browser's `dd/mm/yyyy` placeholder; the pixel test runs Chromium with locale `en-GB` — PR-G7) |
| "Create" / "Creating…", "Cancel" | copy |
| "Active" / "Completed" (h2) + count chip "3" / "2" | `GROUP_ORDER[].label`, `group.projects.length` |
| Project title | `Project.name` verbatim (wraps, `overflow-wrap: anywhere`) |
| State chip "Active" (filled `.chip`) / "Completed" (`.chip-line`) | `STATE_LABEL[Project.state]`; filled only for `active` |
| Health chip "✓ On track" (`.chip-ok` + `IconCheck`) | `Project.health === 'on-track'`; `at-risk`/`off-track` → `.chip-line` "At risk"/"Off track", no icon (PR-G3) |
| "No target date" / calendar icon + "Target 5 Oct 2026" | `fmtTarget(Project.targetDate)` |
| Loading: skeleton bar + "Loading rollup…" | rollup map has no entry and no error (the as-captured reference state) |
| Loaded: bar `aria-label="4 of 9 cards done"`, fill width 44% | `progressPct(rollup)` (round, capped 100) |
| "**4/9** cards done" | `rollup.cardsDone`/`rollup.cardsTotal` (strong wraps only the fraction) |
| "$3.10" | `rollupSegments(rollup)[1].text` (`$${costUsd.toFixed(2)}`) |
| "as of 13:19", "as of 13:19 · 1 overdue", "as of 13:19 · incomplete (1 board did not answer)" | `rollupSegments(rollup)[2].text` (`formatAsOf` + overdue suffix); time is local — test runs with `timezoneId: 'UTC'` |
| "Rollup unavailable — {reason}" | `rollupErrors.get(id)` |
| "Milestones · none yet" / "Milestones · 2" | `getProject(id).milestones.length` |
| "Milestone", placeholder "Name", "Date", "Add" / "Adding…" | copy |
| Milestone row: name, date "12 Oct 2026", "Remove" | `Milestone.name`, `fmtTarget(targetDate)` minus "Target ", copy |
| Trash icon button | `IconTrash`, `aria-label="Delete project {name}"` |
| Footnote "If a rollup fails, the card says “Rollup unavailable” with the reason instead of showing a number. Deleting a project asks first." | copy, verbatim (curly quotes) |
| Studio status bar "5 projects · 6 cards on this board · 3 need you · synced 13:51" | shell spec; on this view the first segment is `${projects.length} projects`; "3 need you" = `itemsFromBoard(...).length` (includes the clean-room `no-owner` card) |
| Studio tabs "List 6", "Projects 5" | shell spec; `app.filteredCards().length`, `app.projects.length` |

Icons (inline, `aria-hidden="true" focusable="false"`, `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`):
- `IconPlus` 18px: `<path d="M12 5v14M5 12h14"/>`
- `IconCheck` 14px: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`
- `IconCalendar` 14px: `<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>`
- `IconChevron` 16px: `<path d="M6 9l6 6 6-6"/>` (rotates 180° when the `<details>` is open)
- `IconTrash` 18px: `<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>`
- (`.ph-note` info icon 16px `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>` — canvas-only, not ported; PR-G1)

### Interactions & states

| Control | Behaviour | Store/API |
|---|---|---|
| Summary "Project" (`<details class="panel">`) | toggles the create form; `bind:open={creatingProject}`; default **closed** (PR-G2) | local state |
| Create (submit; Enter in either field submits) | disabled when name empty or busy; label "Creating…" while busy; on success clears fields, closes the panel, `refresh()`; on refusal shows server `error` text in `.hint role=alert` | `createProject({ name, targetDate })` |
| Cancel | clears fields + error, closes the panel | local |
| Milestones disclosure (per card) | native `<details>`, default closed; chevron rotates (`.disc-ico` transition `--vk-motion-fast`) | local |
| Add milestone (submit) | disabled when name empty / busy; "Adding…"; success clears both inputs, `loadProjectDetail(p.id)` | `createMilestone(projectId, { name, targetDate })` |
| Remove milestone | "Removing…" while busy; success `loadProjectDetail` | `deleteMilestone(milestoneId)` |
| Delete project (trash) | `confirm()` first, copy (PR-G4): `Delete “{name}”? Its cards stay on their boards but will no longer show this project.`; disabled while deleting; success `refresh()`; failure sets `loadError` "Couldn't delete “{name}” ({status})" | `deleteProject(id)` |
| Hover | `.iconbtn:hover` raised bg; vk-button hovers from vibekit | — |
| Focus | vibekit `--vk-focus` ring on `.vk-button`; `.input:focus-visible` per the shell spec's input focus rule (the mockup's `.input` declaration lines in `.field`/`.input` above already include it — keep verbatim) | — |
| States | list loading ("Loading projects…"), list error (`loadError`, `role=alert`), empty ("No projects yet. Use “Project” above to add the first." — replaces today's CLI instruction `supi project add`), per-card rollup loading / loaded / partial / error | — |

`app.projects = projects` after each `refresh()` stays (FilterBar and the drawer read it).

### Fixture needs

Workspace `tnt_dev`, person Rakesh Gangwar (`usr_dev` renamed or a seeded user `Rakesh Gangwar`). Board **Developer Experience** with its 6 cards / 3 attention items as specified by the Board/List groups (incl. the clean-room card, state `submitted`, stage `Reported`, `stateSince` = 2026-10-09T13:51Z or earlier, `dueAt` 2026-10-06). Projects (insert into `projects`; `GET /v1/projects` orders by name ASC, which yields exactly the mockup's order within each group):

| id (suggested) | name | state | health | target_date | milestones |
|---|---|---|---|---|---|
| `prj_bip` | Building in public — Marketing & Community flow | active | null | null | none |
| `prj_guild` | Guild — Forge workspaces and checkpoint recovery | active | null | null | none |
| `prj_mc` | Marketing & Community — Melissa and Anna onboarding | active | null | null | none |
| `prj_portfolio` | SJL Active Portfolio | completed | on-track | 2026-10-05 | none |
| `prj_baseline` | SJL Operating Baseline | completed | on-track | 2026-10-09 | none |

Rollups — the reference is the **loading** state, so the pixel test for `SP-Projects` must hold every `GET /v1/projects/*/rollup` request unresolved (`page.route('**/v1/projects/*/rollup', () => {})` — never fulfilled) before navigating (PR-G1). For the "loaded" variant test, fulfil (or seed `project_rollups` with `computed_at` within 60s of the request so the cache is "fresh") with these placeholder figures (the mockup labels them placeholders; they are not production data):

| project | cardsTotal | cardsDone | cardsOverdue | costUsd | computedAt | partial | boardsUnanswered |
|---|---|---|---|---|---|---|---|
| prj_bip | 9 | 4 | 0 | 3.10 | 2026-10-11T13:19:00Z | false | 0 |
| prj_guild | 7 | 2 | 1 | 1.85 | 2026-10-11T13:19:00Z | false | 0 |
| prj_mc | 5 | 1 | 0 | 0.40 | 2026-10-11T13:19:00Z | true | 1 |
| prj_portfolio | 12 | 12 | 0 | 9.70 | 2026-10-11T13:19:00Z | false | 0 |
| prj_baseline | 8 | 8 | 0 | 4.15 | 2026-10-11T13:19:00Z | false | 0 |

Test steps before capture: none (both disclosures default closed — but see PR-G2: the reference shows the create panel and the first card's Milestones **open**; the test clicks the "Project" summary and the first card's "Milestones" summary before the screenshot). Clock frozen at 2026-10-11T13:51:00Z, `timezoneId: 'UTC'`, `locale: 'en-GB'`.

### Gaps

| # | Mockup shows | API / code today | Ruling |
|---|---|---|---|
| PR-G1 | Reference = rollups loading; `.ph-note` "Placeholder rollup figures: in the capture every rollup was still loading…" in the loaded variant | Rollups resolve (60s D1 cache or fan-out) | (c) `.ph-note` is a canvas annotation — **never render it**. Pixel test holds the rollup route to reproduce "Loading rollup…"; loaded variant uses the placeholder table above (diff against the loaded variant with the ph-note region excluded, or render the mockup with `rollups=loaded` minus the note). |
| PR-G2 | Create panel open and project 0's Milestones open in the capture | `creatingProject` defaults false | (a) Both default **closed** in the app (an always-open form on a read view is not intended); the pixel test opens both via click before capture. |
| PR-G3 | Only "On track" health and "Active"/"Completed" states drawn | `ProjectHealth` has at-risk/off-track; `ProjectState` has planned/paused/canceled | (a) `STATE_LABEL`/`HEALTH_LABEL` above; at-risk/off-track use `.chip-line` with no icon (never the signal — not "a person is needed now"); extra states get their own groups in `GROUP_ORDER`. |
| PR-G4 | "Deleting a project asks first." | `confirm()` text contains "projectId" (system word) | (a) Keep `confirm()`, new copy: `Delete “{name}”? Its cards stay on their boards but will no longer show this project.` |
| PR-G5 | No responsive rules; `.pgrid` fixed 3 columns, `.createform` 3 columns | — | (a) Media queries above (2 columns < 1100px, 1 column + stacked create form < 700px, 16px gutter). |
| PR-G6 | Milestones only ever "none yet" | `getProject()` returns milestones; today's view lists and removes them | (a) `.mslist` rows (name, date, "Remove") above the add form; summary count `· {n}`. Parity: removing a milestone stays reachable. |
| PR-G7 | Empty date inputs show `dd/mm/yyyy` (QA PNG) | browser-locale dependent | (a) Pixel test runs Chromium with `locale: 'en-GB'`; no code change. |
| PR-G8 | "as of 13:19" | `formatAsOf` formats in local time | (a) Test sets `timezoneId: 'UTC'`; no code change. |
| PR-G9 | Empty/list-error states not drawn | today: "No projects yet — `supi project add` or “+ Project” above." (CLI instruction) | (a) Copy "No projects yet. Use “Project” above to add the first." in `.t-meta`; errors in `.t-meta role=alert`. |
| PR-G10 | "Rollup unavailable" styling not drawn | today coral text | (a) `.t-meta` (muted) — a failed rollup does not need a person now, so no signal/coral. |


---

## Workspace · Agents (SP-Workspace-Agents)

- **Artboard:** `SP-Workspace-Agents` · 1440 × 2423 (manifest; the `$preview` hint says 2185, the manifest wins) · **shared**: one layout, vibe tweak `daylight | paper | studio | quiet` (+ `theme light | dark`). Reference: `apps/web/e2e/reference/mockups/SP-Workspace-Agents.html`; source `vibes-mockups/project/SP-Workspace-Agents.dc.html` (page markup = `<main class="page">`, lines 363–717; CSS lines 16–106 + 262–268).
- **Route/state:** `/workspace/agents`, opened from the Developer Experience board (`app.boardId` set, `app.board.name === 'Developer Experience'`). The state drawn is a composite of three moments, and the pixel test reproduces all three in one run:
  1. writer-quill's token was just issued (the banner is showing),
  2. analyst-echo's row is in edit mode,
  3. super-chotu's **Actions** menu is open.
- **Out of scope (shell, specified elsewhere):** everything in `.vs-*` (rail, masthead, top bar, Quiet bar, the Studio status bar `vs-sstatus`). The page hands the shell one value: the Studio status-bar page label **`Workspace · Agents`** (the shell's own spec defines the prop; the rest of that bar, `3 need you` and `synced 13:51`, is shell data).
- **In scope here, reused by SP-Workspace-Other:** the workspace page header (back link, eyebrow, H1, description) and the **tab bar**. SP-Workspace-Other reuses both unchanged and only adds its own per-tab description strings.

### vibekit components used

Coordinator ruling: reusable UI comes from the vibekit Svelte 5 component library (`/Users/rakeshgangwar/SuperJackfruit/vibekit`, per-vibe reference sheets), imported from `@superjackfruit/vibekit`. The app keeps only screen composition and data mapping. Every component reads the vibe from `[data-vibe]` on `<html>` and carries the per-vibe rules quoted under "Layout & CSS" as *reference for vibekit:…*. Props below are what this screen needs. Where vibekit's final signature is wider, it must still accept these.

| Component | Props this screen needs (TypeScript) | Where used |
|---|---|---|
| `vibekit:Tabs` | `{ label: string; items: Array<{ id: string; label: string; href: string; count?: number \| null; countTone?: 'plain' \| 'signal'; countSrLabel?: string }>; current: string; as?: 'links' }`. With `as: 'links'` it renders `div[role=tablist]` > `a[role=tab][aria-selected]`. A count of `null`/`undefined` renders nothing. `countTone: 'signal'` renders the `.count-signal` pill, used only when count > 0. `countSrLabel` is the `span.sr` text (" waiting on you"). | Workspace tab bar (`WorkspaceTabs.svelte`). The same instance is used on every SP-Workspace-Other tab. |
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet'; size?: 'sm'; href?: string; type?: 'button' \| 'submit'; disabled?: boolean; busy?: boolean; icon?: Snippet; ariaLabel?: string; title?: string; onclick?: (e: MouseEvent) => void; children: Snippet }`. `size: 'sm'` is `.btn-sm` (44px). With `href` it renders `<a>`. | "New agent" (primary, href `#new-agent`); "Copy token" (secondary, copy icon); "Done", "Revoke", "Cancel" (quiet); "Save", "Create agent and issue token" (primary); "Try again" (secondary). |
| `vibekit:Disclosure` | `{ summary: Snippet; summaryClass?: 'button-secondary'; summaryAriaLabel?: string; open?: boolean (bindable); minSummaryWidth?: number; ontoggle?: (open: boolean) => void; children: Snippet }`. Renders `<details>` + `<summary>` with the rotating `.disc-ico` chevron. `summaryClass: 'button-secondary'` styles the summary as `vk-button vk-button--secondary btn-sm`. Closes on Escape and returns focus to the summary. | Each row's **Actions** trigger (`minSummaryWidth: 116`). The pop-over contents (`.menu-pop`, `.mi`) are app composition (`AgentRow.svelte`). |
| `vibekit:DataTable` | `{ columns: Array<{ key: string; label: string; width: string; headerHidden?: boolean; minWidth?: number }>; rows: T[]; rowKey: (r: T) => string; cell: Snippet<[T, string]>; expandedKey?: string \| null; expanded?: Snippet<[T]>; headAriaHidden?: boolean; as?: 'list' }`. `as: 'list'` renders `ul.alist > li.arow` + `div.colhead` (the mockup's list-shaped table). `expandedKey` swaps that row for `li.arow.arow-edit` (columns `32px minmax(0,1fr)`, raised background) rendering `expanded(row)`. Below 900px it applies the WA-G9 reflow itself. | Agent list. Columns `face 32px` · `Agent minmax(180px,1.2fr)` · `Capabilities minmax(0,2fr)` · `AgentPod auto` · `Tokens 92px` · `actions auto (minWidth 116, headerHidden)`. |
| `vibekit:AgentChip` | `{ seed: string; name: string; mood: Mood; size: 20 \| 24 \| 32; src?: string \| null; sub?: string; showName?: boolean; nameAs?: 'h3' \| 'span' }`. Renders the face (`span.face`, generated by `Face` from `seed`) and, with `showName`, the name (`p.t-h3`, `overflow-wrap: anywhere`) and `sub` (`p.t-meta`). | Row cells 1–2 (`size 32`, `seed = agent.name` per WA-G7, `sub = status.line`, `showName`). In the edit row: face only (`showName: false`). |
| `vibekit:Chip` | `{ tone?: 'plain' \| 'line' \| 'ok' \| 'signal'; pressed?: boolean; onToggle?: () => void; unused?: boolean; icon?: Snippet; title?: string; children: Snippet }`. With `onToggle` it renders `button.chip.pick[aria-pressed]` (a pressed chip gets a check icon, 14px). Otherwise it renders `span.chip`. `unused` sets the WA-G13 faint colour. **`vibekit:ChipGroup`** `{ label?: string; labelledBy?: string; children: Snippet }` renders `div.caps[role=group]`. | Read-only capability chips (`tone: 'line'`). The capability picker in the edit row and in New agent (toggle chips). |
| `vibekit:Field` | `{ id: string; label: string; labelHidden?: boolean; hint?: string; type?: 'text' \| 'number' \| 'url'; value: string \| number (bindable); placeholder?: string; min?: number; width?: string; compact?: boolean; error?: string \| null; onkeydown?: (e: KeyboardEvent) => void }`. Renders `div.field` > `label` + `input.input` + `p.hint`. `compact` is the 36px inline input. `labelHidden` uses `.sr`. | Edit row: Name, Cards at once (number, hint), Picture (url). New agent: Name. "Add a capability" inputs (`labelHidden`, label "New capability", `compact`, `width: '200px'`). |
| `vibekit:StatePill` | `{ tone: 'success' \| 'muted' \| 'signal'; icon?: 'check'; label: string; as?: 'p' \| 'span' }`. Renders `.linked` (success text, check 16, nowrap). | AgentPod cell: "Linked to AgentPod" (`tone: 'success'`, check), or "Not linked" (`tone: 'muted'`, no icon; WA-G12). |
| `vibekit:Footnote` | `{ icon?: Snippet; term: string; children: Snippet }`. Renders `div` (flex, gap space-3) > icon + `p.t-meta` with `<strong>` term (text colour) + " — " + body. | The three legend items. The 3-column `.legend` grid that holds them is app composition. |
| `vibekit:EmptyState` | `{ title?: string; body: string; action?: Snippet }` | Agents panel with no agents: body "No agents yet. Create one below — you'll get a token to point an AI agent at this workspace." |
| `vibekit:Skeleton` | `{ rows: number; height?: number }` | Agents panel while `agents === null`: `rows: 3, height: 64` (the `.arow` min-height), plus the `sr` text "Loading agents…". This replaces the plain "Loading agents…" line. |

**Moved out of the proposed `screen.css` into vibekit:** `.btn-sm`, `.vk-button--quiet` (Button), `.tabs`, `.tab`, `.count`, `.count-signal` (Tabs), `.chip*`, `.pick`, `.caps` (Chip/ChipGroup), `.field`, `.input`, `.hint`, textarea (Field), `.face` (AgentChip), `details > summary`, `.disc-ico` (Disclosure), `.linked` (StatePill), the legend item (Footnote), `.alist`, `.arow`, `.arow-edit`, `.colhead` (DataTable), and the per-vibe overrides of all of these. The rules this screen does not use (`.saved`, `.unsaved`, `.check`, `.note`) are left to the screens that use them. **What stays in `screen.css`:** the type scale `.t-*` (Block A), `.page`, `.panel`, `.panel-head`, `.panel-body`, `.sr`, and their `[data-vibe]` overrides. **What stays component-scoped:** `.banner`, `.tokbox` (AgentsTab), `.menu`, `.menu-pop`, `.mi*`, `.tokrow` (AgentRow), `.editgrid` (AgentEditRow), and the `.legend` grid.

### Component tree

| File (under `apps/web/src`) | Change |
|---|---|
| `lib/styles/screen.css` | **New, screen composition only.** The type scale `.t-*` (Block A), `.page`, `.panel`, `.panel-head`, `.panel-body`, `.sr` and their `[data-vibe]` overrides, which all shared screens (Projects, Workspace, Settings, Spend) use. Everything else in the mockup's shared CSS moved to vibekit (see above). Imported once from `app.css` after vibekit. Every selector is scoped under the root class `.screen` (`.screen .t-h1`, `[data-vibe="studio"] .screen .t-h1`). `data-vibe` stays on `<html>`, so `[data-vibe="x"] .screen …` matches as the mockup's `[data-vibe="x"] …` does. *Merge with any other group's `screen.css`; the declarations are identical across the shared artboards.* |
| `routes/workspace/+layout.svelte` | **Rewrite.** Renders `<div class="screen"><main class="page" id="main">` → header block → `WorkspaceTabs` → `{@render children()}`. Delete the old `<header>` (← Board) and the old tab strip, and the `touch-form max-w-5xl` wrapper. `id="main"` is the skip-link target the Quiet shell points at. |
| `lib/components/workspace/WorkspaceHeader.svelte` | **New.** Props `{ description: string }`. Back link, eyebrow, H1, description (markup below). |
| `lib/components/workspace/WorkspaceTabs.svelte` | **New, thin.** Props `{ current: WorkspaceTab; counts: WorkspaceCounts }`. Maps them to `vibekit:Tabs` items (Needs you → `countTone: 'signal'`, `countSrLabel: ' waiting on you'`; Connections → no count). No markup or CSS of its own. |
| `lib/components/workspace/workspace-counts.svelte.ts` | **New.** `export type WorkspaceTab = 'needs-you' \| 'agents' \| 'capabilities' \| 'labels' \| 'people' \| 'connections'`; `export interface WorkspaceCounts { needsYou: number \| null; agents: number \| null; capabilities: number \| null; labels: number \| null; people: number \| null }`; `class WorkspaceCountsStore { value = $state<WorkspaceCounts>({needsYou:null,agents:null,capabilities:null,labels:null,people:null}); async refresh(): Promise<void> }`; `export const workspaceCounts`. `refresh()` runs `Promise.allSettled([listAttention(), getAgents(), getCapabilities(), listLabels(), getMembers()])` and sets `needsYou = res.cards.length`, `agents = agents.length`, `capabilities = capabilities.length`, `labels = labels.length`, `people = members.length`; a rejected call leaves its count `null` (the count pill is then omitted, never shown as 0). |
| `lib/components/workspace/workspace-copy.ts` | **New.** `export const WORKSPACE_DESCRIPTION: Record<WorkspaceTab, string>` (the Agents entry is quoted below; SP-Workspace-Other fills the other five). |
| `lib/components/workspace/AgentsTab.svelte` | **Rewrite** to the mockup markup (below). Keeps its existing data functions and handlers (`refresh`, `startEdit`, `saveEdit`, `onDelete`, `onIssue`, `onRevoke`, `onUnlink`, `mint`) and calls `workspaceCounts.refresh()` after each successful mutation. Component-scoped `<style>` holds block C (the agents-only CSS). |
| `lib/components/workspace/AgentRow.svelte` | **New.** Props `{ agent: AgentSummary; status: AgentStatus; onEdit(): void; onIssue(scopes?: AgentScope[]): void; onUnlink(): void; onRevoke(tokenId: string): void; onDelete(): void }`. Renders the `cell(agent, key)` snippet for one DataTable row: `vibekit:AgentChip`, `vibekit:ChipGroup`/`vibekit:Chip`, `vibekit:StatePill`, the token count, and `vibekit:Disclosure` wrapping the app-local action menu (`.menu-pop`). |
| `lib/components/workspace/AgentEditRow.svelte` | **New.** Props `{ agent: AgentSummary; registry: CapabilityRecord[]; saving: boolean; error: string \| null; onSave(patch: { name: string; capabilities: string[]; concurrency: number; iconUrl: string \| null }): void; onCancel(): void }`. The DataTable `expanded(agent)` snippet: `form.editgrid` built from `vibekit:Field`, `CapabilityChips` and `vibekit:Button`. |
| `lib/components/workspace/CapabilityChips.svelte` | **New, composition.** It is `vibekit:ChipGroup` + toggle `vibekit:Chip` per capability + a `vibekit:Field` (compact, label hidden) for "Add a capability". Props `{ selected: string[] (bindable); registry: CapabilityRecord[]; id: string; labelledBy: string }`. Replaces `CapabilityPicker.svelte` **on this screen**; `CapabilityPicker` stays for any other caller (the stage editor) until those screens are ported, then is deleted. |
| `lib/components/workspace/agent-status.ts` | **New.** `AgentStatus` + `agentStatus()` + `agentsPanelMeta()` (formulas in Gaps WA-G2). |
| `routes/workspace/[tab]/+page.svelte` | Unchanged (dispatch by tab). |
| `lib/components/AgentFace.svelte` | **Not used on this screen.** `vibekit:AgentChip` draws the face (`seed = agent.name`, mood face in every vibe; WA-G7). |

Unchanged and reused: `getAgents`, `getCapabilities`, `createAgent`, `updateAgent`, `deleteAgent`, `issueAgentToken`, `revokeAgentToken`, `setAgentPrincipal`, `listAttention`, `listLabels`, `getMembers` (all `lib/api.ts`), `capabilityTag` (`@superpipeline/contract`), `app.boardId`, `app.board`.

### Layout & CSS

Root: `<div class="screen">` inside the shell's `.main` column (the shell spec owns `.app` and `.main`; `.main` is `flex: 999 1 560px; min-width: 0; display: flex; flex-direction: column;`). All CSS below is verbatim from the `.dc.html`; the only rename is the `.screen` scope prefix (written `.screen` before each selector in `screen.css`; omitted here for legibility, and **not** applied to the component-scoped block C, where Svelte scoping does the same job). Canvas-only rules dropped: `body { margin: 0; }`, `.app …` root rules (the shell's), every `.vs-*` rule.

**Block A — type scale and base (app: `screen.css`)**

The mockup's `.app a / button / input` base rules become `.screen a`, `.screen button`, `.screen input, .screen select, .screen textarea`:

```css
.app a { color: var(--vk-color-text); text-underline-offset: 3px; }
.app button { font-family: var(--vk-font-body); }
.app input, .app select, .app textarea { font-family: var(--vk-font-body); font-size: 16px; color: var(--vk-color-text); }

/* ---- type system: one scale, every screen ---- */
.t-h1 { margin: 0; font: 700 2rem/1.15 var(--vk-font-display); letter-spacing: -0.01em; }
.t-h2 { margin: 0; font: 700 1.25rem/1.3 var(--vk-font-display); }
.t-h3 { margin: 0; font: 700 1rem/1.35 var(--vk-font-body); }
.t-eyebrow { margin: 0; font: 600 0.8125rem/1.3 var(--vk-font-display); letter-spacing: 0.04em; color: var(--vk-color-muted); }
.t-body { margin: 0; font-size: 1rem; line-height: 1.55; }
.t-meta { margin: 0; font-size: 0.875rem; line-height: 1.45; color: var(--vk-color-muted); }
.t-num { font-variant-numeric: tabular-nums; }
.t-key { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); overflow-wrap: anywhere; }
[data-vibe="studio"] .t-eyebrow { font-family: var(--vk-font-body); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
[data-vibe="studio"] .t-num { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em; }
[data-vibe="paper"] .t-h1, [data-vibe="paper"] .t-h2 { font-weight: 500; }
[data-vibe="paper"] .t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400; }
[data-vibe="quiet"] .t-h1 { font-size: 1.875rem; }
[data-vibe="quiet"] .app a, [data-vibe="quiet"] a { text-decoration: underline; }

```

(`[data-vibe="quiet"] .app a, [data-vibe="quiet"] a` becomes `[data-vibe="quiet"] .screen a`.)

**Block B — page and shared pieces.** Only the `app:` part goes into `screen.css`; every `vibekit:` part is the mockup CSS the vibekit component must reproduce (reference for that component, **not app CSS** — the app ships none of it).

*app: screen.css (screen composition)*

```css
.page { width: 100%; max-width: 1280px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }
/* ---- shared pieces ---- */
.panel { background: var(--vk-color-surface); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); }
.panel-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
.panel-body { padding: var(--vk-space-4) var(--vk-space-5); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
[data-vibe="quiet"] .panel { border-width: 1px; }
[data-vibe="paper"] .panel { border-radius: var(--vk-radius-sm); }
/* page content, Studio only: ink rules, square corners, big Archivo figures */
[data-vibe="studio"] .t-h2 { font-family: var(--vk-font-body); font-weight: 800; font-stretch: 85%; }
[data-vibe="studio"] .panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule); }
```

*reference for vibekit:Button, not app CSS*

```css
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: 0.9375rem; }
.vk-button--quiet { padding: 0 var(--vk-space-3); }
```

*reference for vibekit:Tabs, not app CSS*

```css
.count-signal { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal); color: var(--vk-color-primary-fg); font-size: 0.75rem; font-weight: 700; }
.count { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-size: 0.75rem; font-weight: 700; }
.tabs { display: flex; flex-wrap: wrap; gap: var(--vk-space-1); border-bottom: 1px solid var(--vk-color-line); }
.tab { display: inline-flex; align-items: center; gap: var(--vk-space-2); min-height: 48px; padding: 0 var(--vk-space-4); color: var(--vk-color-muted) !important; text-decoration: none !important; font-weight: 600; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.tab[aria-selected="true"] { color: var(--vk-color-text) !important; border-bottom-color: var(--vk-color-primary); }
[data-vibe="studio"] .chip, [data-vibe="studio"] .count, [data-vibe="studio"] .count-signal { border-radius: 0; }
[data-vibe="studio"] .count, [data-vibe="studio"] .count-signal { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .count-signal { color: var(--vk-face-ink); }
```

*reference for vibekit:Chip, not app CSS*

```css
.chip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 2px 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-text); font-size: 0.8125rem; font-weight: 600; line-height: 1.2; overflow-wrap: anywhere; }
.chip-line { background: transparent; box-shadow: inset 0 0 0 1px var(--vk-color-line); color: var(--vk-color-muted); }
.chip-ok { background: var(--vk-color-success-wash); color: var(--vk-color-success-text); }
.chip-signal { background: var(--vk-color-signal-wash); color: var(--vk-color-signal-text); box-shadow: inset 0 0 0 1px var(--vk-color-signal); }
```

*reference for vibekit:Field, not app CSS*

```css
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field label, .field .lbl { font-size: 0.875rem; font-weight: 600; }
.input { width: 100%; min-height: 44px; padding: 0 var(--vk-space-3); border: 1.5px solid var(--vk-color-faint); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font-size: 16px; }
textarea.input { padding: var(--vk-space-3); min-height: 96px; line-height: 1.5; resize: vertical; }
.input[readonly] { background: var(--vk-color-raised); border-color: var(--vk-color-line); }
.hint { margin: 0; font-size: 0.8125rem; color: var(--vk-color-muted); }
[data-vibe="studio"] .input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised); }
```

*reference for vibekit:AgentChip, not app CSS*

```css
.face { display: inline-block; flex: none; line-height: 0; }
.face svg { display: block; width: 100%; height: 100%; }
[data-vibe="studio"] .face { border-radius: var(--vk-radius-sm); }
```

*reference for vibekit:Disclosure, not app CSS*

```css
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
.disc-ico { transition: transform var(--vk-motion-fast) var(--vk-motion-easing); display: inline-grid; }
details[open] > summary .disc-ico { transform: rotate(180deg); }
```

*unused on this screen (reference for vibekit, owned by other screens)*

```css
.saved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-success-text); }
.unsaved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-muted); }
.check { display: inline-flex; align-items: flex-start; gap: var(--vk-space-2); min-height: 44px; padding-top: 10px; cursor: pointer; }
.check input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--vk-color-primary); }
.note { display: flex; gap: var(--vk-space-3); align-items: flex-start; padding: var(--vk-space-3) var(--vk-space-4); border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); font-size: 0.9375rem; }
```

**Block C — agents list.** Same split: the `app:` part is component-scoped `<style>` in `AgentsTab.svelte` (`.banner`, `.tokbox`) and `AgentRow.svelte` (`.menu`, `.menu-pop`, `.mi*`, `.tokrow`); `.arow-edit` / `.editgrid` are the DataTable expanded-row content and live in `AgentEditRow.svelte`.

*app: AgentsTab.svelte / AgentRow.svelte scoped (screen composition)*

```css
.editgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--vk-space-4); }
.menu { position: relative; }
.menu > summary { gap: 6px; }
.menu-pop { position: absolute; right: 0; top: calc(100% + 6px); z-index: 5; width: 430px; display: flex; flex-direction: column; padding: var(--vk-space-2); background: var(--vk-color-surface); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); box-shadow: 0 12px 32px color-mix(in oklch, var(--vk-color-text) 18%, transparent); }
.mi svg { flex: none; }
.mi { white-space: nowrap; }
.mi { display: flex; align-items: center; gap: var(--vk-space-3); min-height: 44px; padding: 0 var(--vk-space-3); border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); font-size: 0.9375rem; text-align: left; cursor: pointer; }
.mi:hover { background: var(--vk-color-raised); }
.mi-danger { color: var(--vk-color-text); }
.mi-group { display: flex; flex-direction: column; gap: 2px; margin: var(--vk-space-2) 0; padding: var(--vk-space-2) 0; border-top: 1px solid var(--vk-color-line); border-bottom: 1px solid var(--vk-color-line); }
.tokrow { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: var(--vk-space-2); padding-left: var(--vk-space-3); }
.banner { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-radius: var(--vk-radius-md); background: var(--vk-color-success-wash); color: var(--vk-color-text); }
.tokbox { flex: 1 1 320px; min-width: 0; padding: 10px var(--vk-space-3); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); font-family: var(--vk-font-mono); font-size: 0.875rem; overflow-wrap: anywhere; }
```

*reference for vibekit:DataTable, not app CSS*

```css
.alist { list-style: none; margin: 0; padding: 0; }
.arow { display: grid; grid-template-columns: 32px minmax(180px, 1.2fr) minmax(0, 2fr) auto 92px auto; align-items: center; gap: var(--vk-space-4); padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line); min-height: 64px; }
.arow:first-child { border-top: 0; }
.arow-edit { grid-template-columns: 32px minmax(0, 1fr); align-items: start; background: var(--vk-color-raised); }
.colhead { display: grid; grid-template-columns: 32px minmax(180px, 1.2fr) minmax(0, 2fr) auto 92px auto; gap: var(--vk-space-4); padding: var(--vk-space-3) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
```

*reference for vibekit:Chip, not app CSS*

```css
.caps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-width: 0; }
.pick { border: 0; cursor: pointer; min-height: 36px; padding: 0 12px; }
.pick[aria-pressed="true"] { background: var(--vk-color-primary); color: var(--vk-color-primary-fg); }
.pick[aria-pressed="false"] { background: var(--vk-color-surface); box-shadow: inset 0 0 0 1px var(--vk-color-line); color: var(--vk-color-muted); }
```

*reference for vibekit:StatePill, not app CSS*

```css
.linked { display: inline-flex; align-items: center; gap: 6px; color: var(--vk-color-success-text); white-space: nowrap; }
```

*reference for vibekit:Footnote, not app CSS*

```css
.legend { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--vk-space-4); }
.legend > div { display: flex; gap: var(--vk-space-3); align-items: flex-start; }
```

**Per-vibe branches** (all already inside the blocks above; listed so none is missed). The `.chip`, `.count`, `.face` and `.input` rules are implemented inside the vibekit components; the `.t-*` and `.panel` rules are in `screen.css`.

| Vibe | Rules that apply |
|---|---|
| daylight | Base rules only. |
| paper | `.t-h1, .t-h2 { font-weight: 500 }`; `.t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400 }`; `.panel { border-radius: var(--vk-radius-sm) }`. |
| studio (Annual report) | `.t-eyebrow` uppercase 0.75rem/700/0.1em in body font; `.t-num` mono; `.t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em }`; `.t-h2` body font 800 stretch 85%; `.face { border-radius: var(--vk-radius-sm) }`; `.panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule) }`; `.chip, .count, .count-signal { border-radius: 0 }`; `.count, .count-signal` mono; `.count-signal { color: var(--vk-face-ink) }`; `.input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised) }`. Needs `--vk-color-rule` (absent from the vendored `vibekit-0.0.1.tgz`; WA-G10). |
| quiet | `.t-h1 { font-size: 1.875rem }`; `.screen a { text-decoration: underline }` (so the `.tab` links keep `text-decoration: none !important` and stay un-underlined, as drawn); `.panel { border-width: 1px }`. |

**Responsive rules.** The mockup has no `@media` rule for this page and no phone artboard of it. Rulings (WA-G9) for `< 900px` (the BottomNav breakpoint). The `.arow`/`.colhead` lines belong to `vibekit:DataTable` (reference). `.editgrid`, `.legend`, `.new-agent-form`, `.menu-pop` and `.tokbox` are app-scoped. `.page` is in `screen.css`.

```css
@media (max-width: 899px) {
  .screen .page { padding: var(--vk-space-4) var(--vk-space-4) var(--vk-space-7); }   /* 16px gutter, the suite rule */
  .colhead { display: none; }
  .screen .arow { grid-template-columns: 32px minmax(0, 1fr) auto; }
  .screen .arow > .caps, .screen .arow > .linked, .screen .arow > .t-num { grid-column: 2 / -1; }
  .arow-edit { grid-template-columns: 32px minmax(0, 1fr); }
  .editgrid { grid-template-columns: minmax(0, 1fr); }
  .legend { grid-template-columns: minmax(0, 1fr); }
  .new-agent-form { grid-template-columns: minmax(0, 1fr) !important; }
  .menu-pop { width: min(430px, calc(100vw - 32px)); }
  .tokbox { flex-basis: 100%; }
}
```

(`.new-agent-form` is a class added to the New agent `<form>` so the rule can override its inline grid; it carries no other style.)

### Markup (port this hierarchy exactly)

Where a node below is a vibekit component, the class names show what that component must render; the app writes the component, not the markup: `div.tabs`/`a.tab` = `vibekit:Tabs`; `vk-button…` = `vibekit:Button`; `ul.alist`/`li.arow`/`div.colhead` = `vibekit:DataTable`; `span.face` + name/meta = `vibekit:AgentChip`; `div.caps`/`.chip` = `vibekit:ChipGroup`/`vibekit:Chip`; `p.linked` = `vibekit:StatePill`; `details.menu > summary` = `vibekit:Disclosure`; `div.field` = `vibekit:Field`; legend items = `vibekit:Footnote`.

```
main.page#main
├─ div (flex column, gap space-3)                         ← WorkspaceHeader + WorkspaceTabs
│  ├─ a.t-meta  [chevron-left 16] "Back to Developer Experience"   (inline: inline-flex; gap 4px; min-height 32px; width fit-content; color muted)
│  ├─ div (flex wrap, align-items flex-end, gap space-4, space-between)
│  │  └─ div (flex column, gap 6px, min-width 0)
│  │     ├─ p.t-eyebrow "Workspace · shared by every board"
│  │     ├─ h1.t-h1 "Workspace"
│  │     └─ p.t-body (color muted; max-width 70ch) {WORKSPACE_DESCRIPTION[tab]}
│  └─ div.tabs[role=tablist][aria-label=Workspace]
│     └─ a.tab[role=tab][aria-selected] × 6 (label + count pill)
├─ div.banner[role=status]          (only while a token is shown)
│  ├─ svg key 22
│  ├─ p.t-body (flex 1 1 280px) <strong>{name}'s token.</strong> Copy it now — it won't be shown again.
│  ├─ code.tokbox[aria-label="New token for {name}"] {token}
│  ├─ button.vk-button.vk-button--secondary.btn-sm [copy 18] "Copy token"
│  └─ button.vk-button.vk-button--quiet.btn-sm "Done"
├─ section.panel[aria-labelledby=agents-h]
│  ├─ div.panel-head
│  │  ├─ h2.t-h2#agents-h "{n} agents"
│  │  ├─ span.t-meta {panel meta}
│  │  └─ a.vk-button.vk-button--primary.btn-sm[href="#new-agent"] (margin-left auto; text-decoration none) [plus 18] "New agent"
│  ├─ div.panel-body.legend (border-bottom 1px line) × 3 legend items
│  ├─ div.colhead.t-eyebrow[aria-hidden=true]: "" · "Agent" · "Capabilities" · "AgentPod" · "Tokens" · span(min-width 116px)
│  └─ ul.alist > li.arow | li.arow.arow-edit  (one per agent, API order)
└─ section.panel#new-agent[aria-labelledby=new-h]
   ├─ div.panel-head: h2.t-h2#new-h "New agent" + span.t-meta "Creates the agent and issues its first token, shown once."
   └─ form.panel-body.new-agent-form (inline: display grid; grid-template-columns minmax(0,1fr) minmax(0,2fr); gap space-4; align-items start)
      ├─ div.field: label[for=na-name] "Name" + input#na-name.input placeholder "e.g. tester-tim"
      ├─ div.field: span.lbl#na-caps "Capabilities" + CapabilityChips (group aria-labelledby na-caps; trailing label.sr[for=na-new] "New capability" + input#na-new.input style "width: 200px; min-height: 36px" placeholder "Add a capability")
      └─ div (grid-column 1 / -1): button.vk-button.vk-button--primary.btn-sm "Create agent and issue token"
```

**`li.arow` (AgentRow)** — six grid cells in this order:
1. `span.face` (inline `width: 32px; height: 32px`) → `AgentFace` size 32, variant `mood`, mood `status.mood`.
2. `div` (min-width 0): `p.t-h3` (`overflow-wrap: anywhere`) `{agent.name}` + `p.t-meta` `{status.line}`.
3. `div.caps`: one `span.chip.chip-line` per `agent.capabilities` entry, in stored order.
4. `p.t-meta.linked`: `[check 16]` + `<span>Linked to AgentPod</span>` (when `externalId`).
5. `p.t-meta.t-num` (inline `color: var(--vk-color-text)`) `{n} token(s)`.
6. `details.menu` → `summary.vk-button.vk-button--secondary.btn-sm` (`aria-label="Actions for {name}"`, inline `min-width: 116px`) "Actions " + `span.disc-ico` [chevron-down 16]; `div.menu-pop[role=menu][aria-label="Actions for {name}"]`:
   - `button.mi[role=menuitem]` [pencil 18] "Edit agent"
   - `button.mi` [key 18] "Issue a token"
   - `button.mi` [key 18] "Issue a run-only token" + `span.t-meta` (margin-left auto) "can run cards, not change them"
   - `button.mi` [link 18] "Unlink from AgentPod" (only when `externalId`)
   - `div.mi-group`: `p.t-eyebrow` (padding `0 var(--vk-space-3)`) "{n} token(s) in use"; then `div.tokrow` × min(2, n) (or × n when expanded): `span.t-body` "Token {i}" · `span.t-meta` "issued to {name}" · `button.vk-button.vk-button--quiet.btn-sm[aria-label="Revoke token {i} of {name}"]` "Revoke"; then, when n > 2 and collapsed, `p.t-meta` (padding `0 var(--vk-space-3)`) "and {n−2} more · " + `a[href="#"]` "show all {n}". With n = 0 the group renders only the eyebrow "No tokens in use" (WA-G5).
   - `button.mi.mi-danger` [trash 18] "Delete agent…"

**`li.arow.arow-edit` (AgentEditRow)**: `span.face` 32 + `form.editgrid[aria-label="Edit {name}"]`:
- `p.t-h3` (grid-column 1/-1) "Editing {name}"
- `div.field`: `label[for=ed-name]` "Name" + `input#ed-name.input` value = name
- `div.field`: `label[for=ed-conc]` "Cards at once" + `input#ed-conc.input[type=number][min=1]` + `p.hint` "How many cards it may hold at the same time."
- `div.field` (grid-column 1/-1): `span.lbl#ed-caps` "Capabilities" + CapabilityChips (`aria-labelledby=ed-caps`; trailing `span` (inline-flex, gap 6px) → `label.sr[for=ed-newcap]` "New capability" + `input#ed-newcap.input` (`width: 200px; min-height: 36px`) placeholder "Add a capability") + `p.hint` "Faint chips: no board stage asks for this yet, so an agent holding only it can claim nothing."
- `div.field` (grid-column 1/-1): `label[for=ed-av]` "Picture (optional)" + `input#ed-av.input[type=url]` placeholder "https://… leave empty to keep the generated face"
- `div` (grid-column 1/-1; flex; gap space-2): `button.vk-button.vk-button--primary.btn-sm` "Save" + `button.vk-button.vk-button--quiet.btn-sm` "Cancel"

Ids `ed-*` are suffixed with the agent id in code (`ed-name-{id}`) so they stay unique.

**CapabilityChips**: `div.caps[role=group]` → per capability `button.chip.pick[type=button][aria-pressed]`; pressed chips start with `[check 14]` then the key. Order = registry order as returned by `getCapabilities()` (WA-G6), then any selected key not in the registry, appended in the order added.

**Icons** (inline stroke SVG, `aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`; copy the exact `<path>`s from the `.dc.html`): chevron-left `M15 6l-6 6 6 6` (16), key `M11 12l9-9M17 6l3 3M15 8l2 2` + its circle (22 banner / 18 legend+menu), copy `M16 8V6a2 2 0 0 0-2-2H6…` (18), plus `M12 5v14M5 12h14` (18), check `M5 12.5l4.5 4.5L19 7.5` (18 legend, 16 row, 14 chip), three dots (legend, 18), chevron-down `M6 9l6 6 6-6` (16), pencil `M4 20h4L19 9l-4-4L4 16z` (18), link `M10 14a4 4 0 0 0 5.7 0l3-3…` (18), trash `M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13` (18). Put them in `lib/components/workspace/icons.ts` as path strings rendered by one `<Icon>` snippet, or inline; no icon font.

### Content map

| Visible | Source |
|---|---|
| "Back to Developer Experience" | `` `Back to ${app.board?.name}` `` → `href="/b/{app.boardId}"`. With no board open: "Back to your boards" → `href="/"` (WA-G11). |
| "Workspace · shared by every board" | copy constant. |
| "Workspace" (H1) | copy constant. |
| "The agents that can claim cards on your boards. A card in a stage goes to an agent holding that stage's capability." | `WORKSPACE_DESCRIPTION.agents` (verbatim). |
| Tab labels "Needs you", "Agents", "Capabilities", "Labels", "People", "Connections" | copy constants, in that order; `href="/workspace/{id}"`; `aria-selected = (id === page.params.tab ?? 'agents')`. |
| Needs you count "3" (`span.count-signal`) + `span.sr` " waiting on you" | `workspaceCounts.value.needsYou` (= `listAttention().cards.length`). Rendered as `.count-signal` only when > 0; when 0 render nothing (the signal colour never shows a zero). |
| "15" (Agents), "12" (Capabilities), "3" (Labels), "1" (People) — `span.count` | `workspaceCounts.value.agents / capabilities / labels / people`. Connections has no count. Capabilities: see WA-G6 (the fixture yields 14). Agents: see WA-G1 (the fixture yields 17). |
| Banner "writer-quill's token." | `` `${minted.agent.name}'s token.` ``; for a run-only mint: `` `${name}'s run-only token.` `` (scopes present and not including `claim`). |
| "Copy it now — it won't be shown again." | copy constant. |
| `spt_••••…` (tokbox) | `minted.token`, verbatim and in full (WA-G4). |
| "15 agents" | `` `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'}` ``. |
| "All linked to AgentPod · none working right now" | `agentsPanelMeta(agents, statuses)` (WA-G2, WA-G3). |
| Legend 1: **Linked to AgentPod** — "this agent has an AgentPod identity, so it signs in as itself and its work shows under its own name." | copy constant (verbatim; `strong` inline `color: var(--vk-color-text)`). |
| Legend 2: **Tokens** — "access keys it uses to reach this workspace. Revoke one from *Actions* if a station is retired." | copy constant (`<em>Actions</em>`). |
| Legend 3: **Actions** — "edit, issue or revoke tokens, unlink, delete." | copy constant. The mockup's trailing "(This used to be an unlabelled dash at the end of the row.)" is designer commentary and is **not** shipped (WA-G8). |
| Column heads "Agent", "Capabilities", "AgentPod", "Tokens" | copy constants. |
| Row name | `agent.name`. |
| "Resting · nothing claimed" | `agentStatus(agent).line` (WA-G2). |
| Capability chips "research" etc. | `agent.capabilities[]`, verbatim keys. Empty list: `p.t-meta` "No capabilities — this agent can claim nothing" in the `.caps` cell (not signal). |
| "Linked to AgentPod" | shown when `agent.externalId !== null`; otherwise `p.t-meta` "Not linked" (WA-G12). |
| "5 tokens" / "1 token" | `` `${agent.tokenIds.length} ${n === 1 ? 'token' : 'tokens'}` ``. |
| "5 tokens in use" / "1 token in use" | same count; n = 0 → "No tokens in use". |
| "Token 1", "Token 2" | ordinal `i + 1` over `agent.tokenIds` in API order (WA-G5). |
| "issued to research-ray" | `` `issued to ${agent.name}` `` (WA-G5). |
| "and 3 more · show all 5" | n > 2: `` `and ${n - 2} more · ` `` + link `` `show all ${n}` ``. |
| "Editing analyst-echo" | `` `Editing ${agent.name}` ``. |
| Edit inputs | `editName` ← `agent.name`; `editConcurrency` ← `agent.concurrency` ("1"); `editCaps` ← `agent.capabilities`; `editIcon` ← `agent.iconUrl ?? ''` (empty → placeholder shows). |
| "Creates the agent and issues its first token, shown once." | copy constant. |
| Face | `vibekit:AgentChip` `{ seed: agent.name, name: agent.name, mood: status.mood, size: 32, src: agent.iconUrl, sub: status.line, showName: true }`; mood is `resting` for every agent in the fixture. WA-G7. |

### Interactions & states

| Control | Behaviour | Call |
|---|---|---|
| Back link | navigates | `href` (`/b/{app.boardId}`) |
| Tab | navigates; `aria-selected` follows the route | `href="/workspace/{id}"`; layout runs `workspaceCounts.refresh()` on mount |
| "New agent" (panel head) | in-page jump; then focus `#na-name` | `href="#new-agent"` + `onclick` focusing the name input |
| Actions (`details.menu`) | opens/closes the menu. Only one menu open at a time (opening one closes the others: `ontoggle` handler). Closes on Escape (focus returns to the `summary`), on a click outside, and after any item runs. Chevron rotates 180° via `details[open] > summary .disc-ico`. | local `$state openMenuId` |
| Edit agent | closes the menu, swaps that row for `AgentEditRow` (only one edit row at a time) and focuses `#ed-name-{id}` | existing `startEdit(a)` |
| Issue a token | mints, shows the banner, menu closes, row count +1 | existing `onIssue(a)` → `issueAgentToken(a.id)`, then `refresh()` + `workspaceCounts.refresh()` |
| Issue a run-only token | same, run scope | `onIssue(a, ['run'])` |
| Unlink from AgentPod | clears the link | `onUnlink(a)` → `setAgentPrincipal(a.id, null)` |
| Revoke (token row) | `confirm('Revoke this token? The agent loses access immediately, and this cannot be undone.')` then revokes | `onRevoke(a, tokenId)` → `revokeAgentToken` |
| show all {n} | expands that agent's token list inside the open menu (all rows), link disappears | local `$state expandedTokens: Set<string>` |
| Delete agent… | existing confirm text (`Delete ${name}? This also deletes … This cannot be undone.`), then deletes | `onDelete(a)` → `deleteAgent` |
| Chip (pick) | toggles `aria-pressed`, adds/removes from the bound list | `CapabilityChips` local |
| "Add a capability" input | Enter: `capabilityTag(value)`; non-empty and not present → appended as a pressed chip; input clears. | `capabilityTag` |
| Save (edit) | disabled while `saving` or name blank; label stays "Save" (no "saving…" text in the mockup; set `aria-busy="true"` while saving). Server error → `p.hint` with `role="alert"` under the buttons, text = server `error` or `Saving failed ({status})`. | `saveEdit()` → `updateAgent(id, { name, capabilities, concurrency, iconUrl })` |
| Cancel (edit) | restores the row | `editingId = null` |
| Create agent and issue token | disabled until name non-blank and ≥1 capability; creates, shows the banner, clears the form, scrolls the banner into view | `mint()` → `createAgent(name, caps)` |
| Copy token | `navigator.clipboard.writeText(minted.token)`; afterwards the button reads "Copied" for 2 s (same width: `min-width` set to the button's measured width) | — |
| Done | dismisses the banner (`minted = null`) | — |

States:
- **Loading** (`agents === null`, a change from today's `[]` initial): the panel renders with heading "Agents" and `vibekit:Skeleton` `{ rows: 3, height: 64 }` in place of the list, with sr text "Loading agents…".
- **Load failed**: `p.t-meta[role=alert]` in `.panel-body`: "Could not load the agents: {message}" + `button.vk-button.vk-button--secondary.btn-sm` "Try again" → `refresh()`. (Today `getAgents().catch(() => [])` hides the failure behind the empty state; that is replaced.)
- **Empty** (`agents.length === 0`): heading "0 agents"; no legend, no column heads; `vibekit:EmptyState` `{ body: "No agents yet. Create one below — you'll get a token to point an AI agent at this workspace." }` (today's sentence, kept).
- **Mutation error** (issue/create): `p.hint[role=alert]` directly under the banner position (above the agents panel).
- **Focus**: vibekit components bring their own `--vk-focus` ring (Tabs, Button, Chip, Disclosure summary, Field). The app-local `.mi` menu items add `.mi:focus-visible { outline: none; box-shadow: var(--vk-focus); }`, using the vibekit focus token, not a new value.
- **Hover**: `.mi:hover` raised background (in CSS). No other hover is drawn.
- Dark theme: all colours are tokens; nothing to add.

### Fixture needs

Workspace `tnt_dev` (the seed's tenant), signed-in person **Rakesh Gangwar** (owner) — the only member (People = 1). One board open: **Developer Experience** (`app.boardId` = its id; the board's own records belong to the Board/List specs).

Agents, in this `created_at` order (the API sorts `ORDER BY created_at ASC`), every one `concurrency: 1`, `iconUrl: null`, `externalSource: 'agentpod'`, `externalId: 'prn_' + 20 hex` (any fixed value per agent), no card claimed, no run in flight:

| # | name | capabilities | active tokens |
|---|---|---|---|
| 1 | research-ray | research | 5 |
| 2 | optimizer-ollie | code | 2 |
| 3 | writer-quill | writing | **2** in the seed; the test clicks *Issue a token* on it, which makes 3 and raises the banner |
| 4 | strategy-sam | planning | 2 |
| 5 | predictor-paul | analysis | 2 |
| 6 | analyst-echo | analysis, claim-check | 2 (not visible: the row is in edit mode) |
| 7 | cleaner-cody | maintenance | 2 |
| 8 | coder-kai | code | 6 |
| 9 | project-manager-pete | planning | 2 |
| 10 | controller-casey | planning | 2 |
| 11 | super-chotu | command | 1 |
| 12 | threat-hunter-theo | security | 2 |
| 13 | onboarding-olivia | onboarding | 2 |
| 14 | artistic-lyra | design | 2 |
| 15 | chaos-charlie | resilience | 2 |
| 16 | tester-tim | testing | 2 (WA-G1) |
| 17 | error-eric | diagnostics | 2 (WA-G1) |

Capability registry (`GET /v1/capabilities`), in this `created_at` order, all `origin: 'declared'`, every one with `boardCount ≥ 1` (so no chip is faint): research, code, writing, planning, analysis, claim-check, maintenance, command, security, onboarding, design, resilience, diagnostics, testing (14).

Labels: 3 (the names belong to SP-Workspace-Other's spec). Attention: exactly the 3 Developer Experience items the Operate spec seeds (two stopped cards and the unclaimed Reported card), so `listAttention().cards.length === 3`.

Pixel-test script for the composite state: open `/workspace/agents` → *Actions for writer-quill* → *Issue a token* (banner appears; mask `.tokbox` text, which is random) → *Actions for analyst-echo* → *Edit agent* → *Actions for super-chotu* (leave open) → screenshot.

### Gaps

| Id | Mockup shows | Problem | Ruling |
|---|---|---|---|
| WA-G1 | "15 agents", 15 rows, tab "Agents 15" | The same workspace's Developer Experience board, in the Board/List/Operate artboards, is worked by **tester-tim** (Failing test, `testing`) and **error-eric** (Reproduce, `diagnostics`), and this artboard's own picker offers `testing` and `diagnostics`, which no listed agent holds. A stage owner the list omits cannot exist. | **(c) the mockup is wrong.** The list is `getAgents()` verbatim; the seed has 17 agents (table above), the heading reads "17 agents" and the tab "17". The reference artboard must be re-exported with the two rows appended after chaos-charlie (same row markup, `Resting · nothing claimed`, `Linked to AgentPod`, `2 tokens`, chips `testing` / `diagnostics`). Until it is, the pixel test compares the region above the chaos-charlie row's bottom edge and the New agent panel separately. |
| WA-G2 | Row line "Resting · nothing claimed"; resting face; panel "none working right now" | `AgentSummary` has no per-agent activity; the client only holds one board's cards. | **(b) add API fields.** `GET /v1/agents` adds to each agent `claimedCount: number` (cards across the tenant's boards whose `delegateAgentId` = this agent and state ∉ {completed, rejected}, not archived) and `workingCount: number` (of those, state = `working`). `AgentSummary` gains both (contract + `apps/web/src/lib/api.ts`). Client `agentStatus(a)`: `workingCount > 0` → `{ mood: 'working', line: \`Working · ${claimedCount} claimed\` }`; else `claimedCount > 0` → `{ mood: 'thinking', line: \`Holding ${claimedCount} ${claimedCount === 1 ? 'card' : 'cards'}\` }`; else `{ mood: 'resting', line: 'Resting · nothing claimed' }`. Panel half 2: total working agents w = count with `workingCount > 0`; `w === 0` → "none working right now", else `` `${w} working right now` ``. (The Daylight rail's "2 at work · research-ray and tester-tim" contradicts this and the Operate artboard's "Nothing is running"; that is the shell spec's to correct to the same field.) |
| WA-G3 | "All linked to AgentPod" | Needs only existing data. | **(a) derive.** k = agents with `externalId !== null`; `k === n` → "All linked to AgentPod"; `k === 0` → "None linked to AgentPod"; else `` `${k} of ${n} linked to AgentPod` ``. Joined to WA-G2's half with " · ". |
| WA-G4 | Banner token `spt_` + 32 dots | The real token is `spa_…` and must be visible and copyable once; a masked value would make the banner useless. | **(c)** render `minted.token` in full. The pixel test masks the `.tokbox` text box (the value is random per run anyway). |
| WA-G5 | Token rows "Token 1 · issued to research-ray · Revoke"; "and 3 more · show all 5" | API gives only `tokenIds` (no issue date, scope or label). Showing raw `tok_…` ids is the thing the redesign removed. | **(a) derive** the ordinal from `tokenIds` order and "issued to {agent.name}"; the id goes in the Revoke button's `title` (`title="tok_…"`) so it stays reachable. n = 0 → eyebrow "No tokens in use", no rows. |
| WA-G6 | Tab "Capabilities 12"; the pickers list 14 capabilities, in a non-alphabetical order | `CapabilityPicker` sorts A–Z; 14 ≠ 12. | Order: **(a)** registry order from `getCapabilities()` (no `.sort()`); the seed's `created_at` order produces the mockup's order. Count: **(c)** the count is `capabilities.length`, so 14 with this seed; the mockup's "12" is wrong (it cannot be 12 while 14 chips are offered with nothing selected). Re-export with "14"; SP-Workspace-Other's tab bar shows the same number. |
| WA-G7 | The same generated mood face in all four vibes, seeded by the agent's **name** (faces.md was generated from names) | `FACE_VARIANT` would draw a portrait initial in Paper, a light in Studio and nothing in Quiet; `Face` is seeded with `agentId`, so faces would not match the reference. | Variant: **(a)** `vibekit:AgentChip` draws the mood face in every vibe (32px agent rows are the "system feature" size). Seed: **(a)** `AgentChip` is given `seed = agent.name`, so the fixture's agent ids do not matter (cross-screen: every artboard's faces come from faces.md by name, so all groups need this; flag to the shell/board specs). |
| WA-G8 | Legend 3 ends "(This used to be an unlabelled dash at the end of the row.)" | Designer commentary about the old UI, meaningless to a user. | **(c)** drop the sentence. The legend cell is then one line shorter; the row height is set by the taller first legend item, so the page height is unchanged. |
| WA-G9 | No phone layout | The 6-column `.arow` grid overflows at 390px. | **(a)** the `@media (max-width: 899px)` block above (only re-flows existing rules; uses the suite's 16px gutter). |
| WA-G10 | Studio uses `--vk-color-rule` (panel top rule, inputs) and Archivo/Azeret Mono via the Annual-report fonts | Not in vendored `vibekit-0.0.1.tgz`. | **(b)** vibekit token change (Annual-report Studio: `rule` colour in `LookColors`, fonts) shipped in the next vibekit tarball; owned by the vibekit/shell spec, consumed here unchanged. |
| WA-G11 | Back link always names a board | `/workspace/*` can be opened with no board loaded. | **(a)** no board → "Back to your boards", `href="/"`. |
| WA-G12 | Every agent linked | Unlinked state not drawn. | **(a)** `.linked` cell becomes `p.t-meta` "Not linked" (muted, no icon); the menu omits *Unlink from AgentPod*. Linking stays in Connections (SP-Workspace-Other). |
| WA-G13 | "Faint chips: no board stage asks for this yet…" hint | No faint chip style is drawn (the seed has none). | **(a)** a chip whose registry record has `boardCount === 0`, or that is not in the registry, gets `data-unused` and `[data-unused] { color: var(--vk-color-faint); }` on unpressed chips (the existing `--vk-color-faint` token; pressed chips keep the primary fill); its `title` keeps CapabilityPicker's hint text. |
| WA-G14 | Queueing policy (`mayQueueTo`, `queueCeilingPerHour`) | Returned by `GET /v1/agents`, not shown today and not in the mockup. | No change: parity covers only what is visible today. |


---

## Workspace · other tabs (SP-Workspace-Other)

- **Artboard:** `SP-Workspace-Other` · 1440 × 2912 (manifest; the `$preview` hint says 2285, the manifest wins) · **shared**. One layout with a vibe tweak `daylight | paper | studio | quiet` and a theme tweak `light | dark`. Reference: `apps/web/e2e/reference/mockups/SP-Workspace-Other.html`. Source: `vibes-mockups/project/SP-Workspace-Other.dc.html`. The page markup is `<main class="page">` (from line 259). The CSS is lines 16–124 plus 281–287.
- **What the artboard is:** a **review composite**. It shows five workspace tabs on one page: Needs you, Labels, People and Connections in a two-column `.grid2`, with Capabilities spanning both columns below. The tab bar has *Needs you* selected. No single product route looks like this, so the screen has two kinds of route:
  1. **Product routes** (one tab each): `/workspace/needs-you`, `/workspace/capabilities`, `/workspace/labels`, `/workspace/people`, `/workspace/connections`. Each renders its tab's single `<section class="panel">` at the full `.page` width.
  2. **Review route** `/workspace/review`. This exists only for the pixel test and is compiled only when `import.meta.env.DEV || import.meta.env.PUBLIC_E2E === '1'`; in a production build the `+page.ts` `load` throws a 404. It renders the composite exactly as drawn, using the same five panel components with their `review*` props set (below). The pixel test diffs this route against the reference.
- **State drawn on the review route:** opened from the Developer Experience board (`app.boardId` set). The Needs-you list holds 3 rows. On row 3 ("Superpipeline: manual-delivery…") the Resume form is **open**, with the note typed in. The AgentPod row's long detail is **collapsed** ("Show all"). Every board answered. The hub is configured, the principals are loaded, and every principal is already an agent.
- **Out of scope:** the shell (`.vs-*`: Daylight rail, Paper masthead, Studio rail/top bar/status bar `vs-sstatus`, Quiet bar). That is specified elsewhere. The page hands the Studio status bar its label **`Workspace`** (drawn: `Workspace · 3 need you · synced 13:51`). The workspace **header and tab bar** (`WorkspaceHeader`, `WorkspaceTabs`, `workspace-counts.svelte.ts`, `workspace-copy.ts`) and the shared stylesheet `lib/styles/screen.css` are specified in **SP-Workspace-Agents**. They are reused here unchanged, and this section adds only the five per-tab descriptions and the review route's description.

### vibekit components used

Coordinator ruling: reusable patterns come from the vibekit Svelte 5 library. Where this section quotes mockup CSS for one of these patterns, that CSS is **reference for the vibekit component, not app CSS**. The app keeps only the composition and data mapping.

| Component | Props (TypeScript) | Where used here | Reference CSS in this section |
|---|---|---|---|
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet'; size?: 'sm'; href?: string; type?: 'button' \| 'submit'; disabled?: boolean; ariaExpanded?: boolean; ariaPressed?: boolean; ariaLabel?: string; icon?: Snippet; children: Snippet; onclick?: (e: MouseEvent) => void }`. With `href` it renders an `<a>`. | Refresh, Resume, Open/Review/Answer/Open log/Staff an agent, Send back to work, Cancel, Show all, Add (labels, capabilities), Invite, Change/Set/Link/Save, Connect to AgentPod, Add N, Implies… | `.btn-sm`, `.vk-button--quiet` (screen.css); the inline `min-height`/`padding`/`font-size` overrides on Show all and Implies… become `size="xs"` (32px) and `size="sm-text"` (44px, 0.875rem) variants |
| `vibekit:IconButton` | `{ ariaLabel: string; icon: Snippet; size?: 44 \| 28; disabled?: boolean; title?: string; onclick: () => void }` | Remove label, Remove member, Remove capability (44); remove an "implies" chip (28) | `.iconbtn`, `.iconbtn:hover` |
| `vibekit:Tabs` | as SP-Workspace-Agents (`WorkspaceTabs` composes it) | tab bar | `.tabs`, `.tab` |
| `vibekit:StatePill` | `{ tone: 'signal' \| 'line' \| 'ok' \| 'plain'; children: Snippet }` | "Blocked"/"Unowned" kind chips; "inferred"; "no board asks"; "implies {to}" (with an IconButton child); principal chips (as a pressed toggle: `tone` `plain` when pressed, `line` when not) | `.chip`, `.chip-line`, `.chip-signal`, `.chip-ok` |
| `vibekit:Count` | `{ value: number; signal?: boolean }`. The signal tone is ignored when `value === 0`. | Needs-you H2 count | `.count`, `.count-signal` |
| `vibekit:Panel` | `{ labelledBy: string; class?: string; head: Snippet; children: Snippet }` | all five tab panels | `.panel`, `.panel-head`, `.panel-body` |
| `vibekit:Field` | `{ id: string; label: string; srLabel?: boolean; hint?: string; error?: string \| null; children: Snippet }` (wraps an `.input` control) | Note for the agent, label name, New label, Role selects, Invite by email, forge/fleet editors, capability description, Add a capability, implies input | `.field`, `.input`, `textarea.input`, `.hint` |
| `vibekit:Disclosure` (inline text variant) | `{ expanded: boolean; moreLabel: string; lessLabel: string; ontoggle: () => void }` | Show all / Show less on a clipped detail | — (Button quiet xs) |
| `vibekit:Note` | `{ icon?: Snippet; children: Snippet }` | the capability orphan/unstaffed notes | `.note` |
| `vibekit:AgentFaceStack` | `{ agents: Array<{ name: string; iconUrl: string \| null }>; size: 24; mood: Mood }` | Capabilities row holders | `.stack`, `.stack .face`, `.stack .face:first-child`, `.face` |
| `vibekit:Avatar` (person initials) | `{ name: string; size: 36 }` | People row "RG" | `.me` |
| `vibekit:Swatch` | `{ colour: string; ariaLabel: string; onchange: (hex: string) => void }` (round button over a native colour input) | label colours, new-label colour | `.swatch` |
| `vibekit:EmptyState` | `{ text: string }` | empty Needs-you list, empty labels | — |
| `vibekit:Skeleton` / loading line | `{ text: string }` | the five "Loading…" lines | — |
| `vibekit:Footnote` | `{ children: Snippet }` | Needs-you "did not answer" line, review notes | the inline `padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line)` `.t-meta` |

App-local (screen composition, the CSS stays in the components): `.nrow`/`.nacts`/`.resume` (WorkspaceNeedsRow), `.crow` (CapabilitiesTab), `.lrow` (LabelManager, PeopleTab), `.kv` (ConnectionsTab), `.grid2`/`.span2`/`.tabtag` (review route). The screen.css merge note below applies only to `.mono`; `.iconbtn` moves to `vibekit:IconButton`.

### Component tree

| File (under `apps/web/src`) | Change |
|---|---|
| `lib/styles/screen.css` | Defined in SP-Workspace-Agents (blocks A + B: `.t-*`, `.page`, `.panel*`, `.chip*`, `.count*`, `.btn-sm`, `.vk-button--quiet`, `.face`, `.field`, `.input`, `.hint`, `.tabs`, `.tab`, `.sr`, `.note`, `.caps`, and their `[data-vibe]` overrides). This artboard's copies of those rules are byte-identical, so nothing is redefined. **Merge into `screen.css`** the rules marked "→ screen.css" below (`.iconbtn`, `.iconbtn:hover`, `.mono`), because more than one of this screen's components uses them. |
| `lib/components/workspace/workspace-copy.ts` | Fill the five `WORKSPACE_DESCRIPTION` entries and add `REVIEW_DESCRIPTION` (Content map). |
| `routes/workspace/+layout.svelte` | As in SP-Workspace-Agents. One addition: `current` is `page.route.id === '/workspace/review' ? 'needs-you' : (page.params.tab as WorkspaceTab)`, and the description is `REVIEW_DESCRIPTION` on the review route. |
| `routes/workspace/review/+page.svelte` | **New** (dev/e2e only). Markup in "Review composite" below. |
| `routes/workspace/review/+page.ts` | **New.** `export const load = () => { if (!(import.meta.env.DEV \|\| import.meta.env.PUBLIC_E2E === '1')) error(404, 'Not found'); };` (`error` from `@sveltejs/kit`). The static route takes precedence over `[tab]`, so `[tab]`'s unknown-tab redirect never sees `review`. |
| `lib/components/workspace/NeedsYouTab.svelte` | **Rewrite** to the mockup's markup. Keeps `load()` (`listAttention`) and `resume()` (`resumeCard` + `refusalOf`). It no longer uses `NeedsYouList`/`AttentionRow`/`ResumeBox`: Operate keeps those, and the Operate section owns their restyle. Props: `{ reviewTag?: string; reviewNote?: string; initial?: { expandedResume?: string; resumeText?: string } }`. `initial` is used only by the review route, which passes `{ expandedResume: 'blocked:<boardId>:<cardId of manual-delivery>', resumeText: 'The commit is on the branch now. Pick up from the handoff step.' }` so the drawn state renders without scripted clicks. The pixel test also clicks it once to prove the real path works (Interactions). |
| `lib/components/workspace/WorkspaceNeedsRow.svelte` | **New.** Props: `{ item: AttentionItem; open: boolean; draft?: string; onToggleResume(): void; onResume(comment: string): Promise<string \| null> }`. One `<li class="nrow">`. Scoped `<style>`: `.nrow`, `.nrow:first-child`, `.nacts`, `.resume`. |
| `lib/components/workspace/needs-row.ts` | **New**, pure and unit-tested. Exports `WS_KIND_LABEL`, `chipClass(kind)`, `metaLine(item)`, `clip(detail)`, `sortOldestFirst(items)` (formulas in Content map and Gaps). |
| `lib/components/attention/attention.ts` | Modify. `AttentionItem` gains `stageName: string`. `itemsFromStale` fills it from `StaleCard.stageName`; `itemsFromBoard` fills it from `board.stages.find(s => s.key === c.currentStageKey)?.name ?? c.currentStageKey`. `ownerless()` headline becomes `` `nothing claims the ${base.stageName} stage` `` (it was `` `Nothing claims stage ${stageKey}` ``). The **Operate section must use the new headline as well**: the Operate artboards draw the no-owner row with their own words, not this headline, so this is safe; check it against that section. |
| `lib/components/workspace/CapabilitiesTab.svelte` | **Rewrite** to the mockup markup. It keeps `refresh`, `add`, `imply`, `unimply`, `describe` and `remove`, and adds `getAgents()` to `refresh()` (for the face stacks and the note's holder names). Props: `{ reviewTag?: string; reviewNote?: string }`. Scoped `<style>`: `.crow`, `.crow:first-of-type`, `.stack`, `.stack .face`, `.stack .face:first-child`. |
| `lib/components/workspace/capability-notes.ts` | **New**, pure. `orphanNote(c, holders)` and `unstaffedNote(c)` return `{ key: string; text: string; link: { href: string; label: string } }` (copy in Content map). |
| `lib/components/workspace/LabelManager.svelte` | **Rewrite** to the mockup markup. It keeps `refresh`, `onRename`, `onRecolour`, `onRemove`, `add` and `label-manager.ts`. Props: `{ reviewTag?: string }`. Scoped `<style>`: `.swatch`, `.lrow`. |
| `lib/components/workspace/PeopleTab.svelte` | **Rewrite.** It keeps `refresh`, `invite`, `change` and `remove`. `HELP` becomes `ROLE_HELP` (Content map). Props: `{ reviewTag?: string }`. Scoped `<style>`: `.me` (used only here) and `.lrow` (a duplicate of LabelManager's; Svelte scoping keeps the two apart). |
| `lib/components/workspace/ConnectionsTab.svelte` | **Rewrite.** It keeps `refresh`, `saveFleet`, `connect`, `addPicked`, `saveForge` and every piece of state. Props: `{ reviewTag?: string; reviewNote?: string }`. Scoped `<style>`: `.kv`, `.kv:first-of-type`. The `CapabilityPicker` import is replaced by `CapabilityChips` (from SP-Workspace-Agents) in the "Add from AgentPod" picker. |
| `lib/components/workspace/PanelTag.svelte` | **New.** Props `{ text: string }`. Renders `<p class="t-eyebrow tabtag"><svg …chevron…/>{text}</p>`. Used only when a `reviewTag` is passed. Scoped `.tabtag`. |
| `lib/components/AgentFace.svelte` | Reused with `variant="mood"`, `mood="resting"`, `size={24}`. Face seed = agent **name** (WA-G7). |

Deleted when this lands: nothing. `NeedsYouList`, `AttentionRow` and `ResumeBox` stay for Operate, and `CapabilityPicker` stays for the stage editor.

### Layout & CSS

**Root.** As in SP-Workspace-Agents: `<div class="screen"><main class="page" id="main">` → `WorkspaceHeader` → `WorkspaceTabs` → tab content. The rules below are verbatim from the `.dc.html`. The only change is the scope: `.screen …` for rules merged into `screen.css`, and bare selectors inside component `<style>` blocks, where Svelte scoping does the same job. Per-vibe rules in a component block are written `:global([data-vibe="x"]) .sel`.

Canvas-only rules dropped: `body { margin: 0; }`, the `.app …` rules (the shell owns them), every `.vs-*` rule, and `.main` (the shell's).

**→ `screen.css` (merge; shared by LabelManager, PeopleTab, CapabilitiesTab, ConnectionsTab):**

```css
.screen .iconbtn { width: 44px; height: 44px; display: inline-grid; place-items: center; border: 0; border-radius: var(--vk-radius-sm); background: transparent; color: var(--vk-color-text); cursor: pointer; }
.screen .iconbtn:hover { background: var(--vk-color-raised); }
.screen .mono { font-family: var(--vk-font-mono); font-size: 0.875rem; overflow-wrap: anywhere; }
```

**Review route only** (`routes/workspace/review/+page.svelte` `<style>`, unscoped by Svelte only where noted):

```css
.screen .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--vk-space-5); align-items: start; }
.screen .span2 { grid-column: 1 / -1; }
```
(Written as `.grid2` / `.span2` in the route's scoped style. The panels sit inside these elements, so scoping is fine.)

**`PanelTag.svelte`:**
```css
.tabtag { display: inline-flex; align-items: center; gap: 6px; }
```

**`WorkspaceNeedsRow.svelte`:**
```css
.nrow { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: var(--vk-space-4); padding: var(--vk-space-4) var(--vk-space-5); border-top: 1px solid var(--vk-color-line); align-items: start; }
.nrow:first-child { border-top: 0; }
.nacts { grid-column: 2; display: flex; gap: var(--vk-space-2); flex-wrap: wrap; }
.resume { grid-column: 2 / -1; display: flex; flex-direction: column; gap: var(--vk-space-2); padding: var(--vk-space-4); border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); }
```

**`CapabilitiesTab.svelte`:**
```css
.crow { display: grid; grid-template-columns: minmax(120px, 0.9fr) minmax(0, 1.3fr) minmax(0, 1fr) 44px; gap: var(--vk-space-3); align-items: center; padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line); }
.crow:first-of-type { border-top: 0; }
.stack { display: inline-flex; }
.stack .face { margin-left: -6px; box-shadow: 0 0 0 2px var(--vk-color-surface); border-radius: 50%; }
.stack .face:first-child { margin-left: 0; }
```
`.stack .face` targets the `<span class="face">` wrapper this component renders around each `AgentFace`. Because `.face` is styled in `screen.css`, write the wrapper selector as `.stack :global(.face)` only if the wrapper is rendered inside a child component. Here it is rendered in this component, so the plain selector works.

**`LabelManager.svelte`** (and `.lrow` again in `PeopleTab.svelte`):
```css
.swatch { width: 32px; height: 32px; border-radius: 50%; border: 0; box-shadow: inset 0 0 0 1px var(--vk-color-line); cursor: pointer; flex: none; }
.lrow { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto 44px; gap: var(--vk-space-3); align-items: center; padding: var(--vk-space-2) var(--vk-space-5); border-top: 1px solid var(--vk-color-line); }
```

**`PeopleTab.svelte`:**
```css
.me { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--vk-color-raised); color: var(--vk-color-text); font-size: 0.8125rem; font-weight: 700; margin: var(--vk-space-2) 0; }
```

**`ConnectionsTab.svelte`:**
```css
.kv { display: grid; grid-template-columns: 150px minmax(0, 1fr) auto; gap: var(--vk-space-4); align-items: center; padding: var(--vk-space-4) var(--vk-space-5); border-top: 1px solid var(--vk-color-line); }
.kv:first-of-type { border-top: 0; }
```

**Inline styles.** Keep every inline `style="…"` in the markup below as an inline style attribute, with the same declarations. Several of them (`text-decoration: none` on the title links and `Open` buttons) must beat `[data-vibe="quiet"] .screen a { text-decoration: underline }`. As inline styles they win in every vibe, as drawn. A class would lose in Quiet.

**Every vibe branch that touches this page.** All of them live in `screen.css` (SP-Workspace-Agents); none is unique to this artboard. Listed so the implementer can check each one:

| Vibe | Rules that apply here |
|---|---|
| daylight | None beyond the base. The display font (Bricolage) comes from `--vk-font-display` in `.t-h1/.t-h2/.t-eyebrow`. |
| paper | `.t-h1, .t-h2 { font-weight: 500 }`; `.t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400 }` (the "› Needs you tab" tags, review route only); `.panel { border-radius: var(--vk-radius-sm) }`. |
| studio (Annual report) | `.t-eyebrow` is uppercase, 0.75rem/700/0.1em in the body font; `.t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em }`; `.t-h2 { font-family: var(--vk-font-body); font-weight: 800; font-stretch: 85% }`; `.face { border-radius: var(--vk-radius-sm) }`, which the 24px stack faces inherit, while `.stack .face` keeps `border-radius: 50%` because its specificity is higher (as drawn); `.panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule) }`; `.chip, .count, .count-signal { border-radius: 0 }`; `.count, .count-signal` mono; `.count-signal { color: var(--vk-face-ink) }` (the "3" in the Needs-you H2); `.input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised) }`, which applies to every text input, select and textarea here, including the label name inputs and the Resume textarea. Needs `--vk-color-rule` (WA-G10). |
| quiet | `.t-h1 { font-size: 1.875rem }`; `.screen a { text-decoration: underline }`, which underlines only the capability note's "Add a stage that asks for it" link and the back link (title links and `Open` keep their inline `text-decoration: none`); `.panel { border-width: 1px }`. |

**Responsive rules.** The mockup has no `@media` rule and no phone artboard (WO-G12). These rules re-flow existing declarations only, at the shell's breakpoint and at phone width. Put them in each component's scoped block:

```css
/* review route */
@media (max-width: 1099px) { .grid2 { grid-template-columns: minmax(0, 1fr); } }
/* WorkspaceNeedsRow */
@media (max-width: 639px) {
  .nrow { grid-template-columns: minmax(0, 1fr); }
  .nacts, .resume { grid-column: 1 / -1; }
}
/* CapabilitiesTab */
@media (max-width: 899px) {
  .crow { grid-template-columns: minmax(0, 1fr) 44px; }
  .crow > :nth-child(2), .crow > .caps { grid-column: 1 / 2; }
  .crow > .iconbtn { grid-row: 1; grid-column: 2; }
}
/* PeopleTab: the member row and the invite form */
@media (max-width: 639px) {
  .lrow.member { grid-template-columns: 36px minmax(0, 1fr) 44px !important; }
  .lrow.member > .field { grid-column: 2 / 3; }
  .invite { grid-template-columns: minmax(0, 1fr) !important; }
}
/* ConnectionsTab */
@media (max-width: 639px) {
  .kv { grid-template-columns: minmax(0, 1fr) auto; }
  .kv > :nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
}
```
(`.member` and `.invite` are hook classes added to the People row `div.lrow` and the invite `form`, so the rules can override their inline `grid-template-columns`. They carry no other style. The `.page` 16px phone gutter is in `screen.css`, WA-G9.)

### Markup (port this hierarchy exactly)

Icons are the mockup's inline stroke SVGs, copied verbatim from the `.dc.html`, all `aria-hidden="true" focusable="false"`, stroke `currentColor`, stroke-width 1.8. `chevron-right` 14px `<path d="M9 6l6 6-6 6"/>`; `refresh` 18px `<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20v-4h-4"/>`; `trash` 18px (copy from the source, `d="M4 7h16M9 7V4h6v3M6 7l1 1…"`); `x` 14px `<path d="M6 6l12 12M18 6L6 18"/>`; `plus` 16px `<path d="M12 5v14M5 12h14"/>`; `info` 20px (copy, `M12 11v5M12 8v.5` + circle); `check` 18px `<path d="M5 12.5l4.5 4.5L19 7.5"/>`.

**Review composite** (`/workspace/review`, inside the layout's tab bar):
```html
<div class="grid2">
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0">
    <NeedsYouTab reviewTag="Needs you tab" reviewNote={NEEDS_REVIEW_NOTE} initial={…} />
  </div>
  <div style="display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0">
    <LabelManager reviewTag="Labels tab" />
    <PeopleTab reviewTag="People tab" />
    <ConnectionsTab reviewTag="Connections tab" reviewNote={CONNECTIONS_REVIEW_NOTE} />
  </div>
  <CapabilitiesTab reviewTag="Capabilities tab" reviewNote={CAPS_REVIEW_NOTE} class="span2" />
</div>
```
`CapabilitiesTab` puts `class="span2"` on its root `<section>` through a `class?: string` prop.

**NeedsYouTab** (`<section class="panel" aria-labelledby="nt-h">`):
```html
<div class="panel-head">
  {#if reviewTag}<PanelTag text={reviewTag} />{/if}
  <h2 class="t-h2" id="nt-h" style="flex-basis: 100%">Waiting on you, across every board <span class="count-signal" style="vertical-align: middle">{n}</span></h2>
  <p class="t-meta" style="flex: 1">{headMeta}</p>
  <button type="button" class="vk-button vk-button--secondary btn-sm" onclick={load}>{refresh icon}Refresh</button>
</div>
<ol style="list-style: none; margin: 0; padding: 0">{#each sorted as it (it.id)}<WorkspaceNeedsRow …/>{/each}</ol>
{#if unanswered > 0}<p class="t-meta" style="padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line)">{unansweredLine}</p>
{:else if reviewNote}<p class="t-meta" style="(same)">{reviewNote}</p>{/if}
```
When `n === 0` the count is `<span class="count" style="vertical-align: middle">0</span>`, never `count-signal` (the signal never marks zero), and the `<ol>` is replaced by `<p class="t-meta" style="padding: var(--vk-space-4) var(--vk-space-5)">Nothing on any board is waiting on you.</p>`.

**WorkspaceNeedsRow** (`<li class="nrow">`):
```html
<span class="chip {chipClass(item.kind)}" style="justify-self: start">{WS_KIND_LABEL[item.kind]}</span>
<div style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
  <a href="/b/{item.boardId}/c/{item.cardId}" class="t-h3" style="text-decoration: none; overflow-wrap: anywhere">{item.title}</a>
  <p class="t-meta">{metaLine(item)}</p>
  {#if detail}
    <p class="t-body" style="overflow-wrap: anywhere">{shown}{#if long} <button type="button" class="vk-button vk-button--quiet" style="min-height: 32px; padding: 0 4px; font-size: 0.875rem" aria-expanded={expanded} onclick={toggle}>{expanded ? 'Show less' : 'Show all'}</button>{/if}</p>
    <p class="t-meta">{item.instruction}</p>
  {:else}
    <p class="t-meta">{item.instruction}</p>
  {/if}
</div>
<div class="nacts">{actions}</div>
{#if open}<form class="resume" aria-label="Resume this card" onsubmit={submit}>
  <div class="field"><label for="rs-{item.id}">Note for the agent</label><textarea id="rs-{item.id}" class="input" style="min-height: 72px" bind:value={draft} maxlength="8000"></textarea></div>
  {#if error}<p class="hint" role="alert" style="color: var(--vk-color-signal-text)">{error}</p>{/if}
  <div style="display: flex; gap: var(--vk-space-2)"><button type="submit" class="vk-button vk-button--primary btn-sm" disabled={draft.trim() === '' || busy}>Send back to work</button><button type="button" class="vk-button vk-button--quiet btn-sm" onclick={onToggleResume}>Cancel</button></div>
</form>{/if}
```
The drawn no-owner row has no detail paragraph, and its instruction is `.t-meta`, so the `{:else}` branch is the one taken. The first `.t-h3` link carries `overflow-wrap: anywhere` only on rows with a detail (as drawn). Keep the attribute on every row: it has no visual effect on titles that fit.

Actions (`.nacts`), in `item.actions` order:
- `resume` → `<button type="button" class="vk-button vk-button--primary btn-sm" aria-expanded={open} onclick={onToggleResume}>Resume</button>`
- `open` → `<a class="vk-button vk-button--secondary btn-sm" href="/b/{boardId}/c/{cardId}" style="text-decoration: none">Open</a>`
- `review` → the same `<a>` as Open, with the primary class and the label **Review**
- `answer` → the same, with the label **Answer**
- `log` → `<a … secondary …>Open log</a>`, with the same href plus `?tab=attempts`
- `staff` → `<a class="vk-button vk-button--secondary btn-sm" href="/workspace/capabilities" style="text-decoration: none">Staff an agent</a>`

`move` never occurs, because `itemsFromStale` never emits it.

**LabelManager** (`<section class="panel" aria-labelledby="lt-h">`):
```html
<div class="panel-head" style="flex-direction: column; align-items: flex-start">{tag}<h2 class="t-h2" id="lt-h">{labelsHeading}</h2><p class="t-meta">Renames save when you leave the field. “Inferred” means a card created it.</p></div>
<ul style="list-style: none; margin: 0; padding: 0">{#each labels as l}<li class="lrow">
  <button type="button" class="swatch" style="background: {l.colour}" aria-label="Colour of {l.name}" onclick={() => pickers[l.id].showPicker()}></button>
  <input type="color" class="sr" tabindex="-1" aria-hidden="true" bind:this={pickers[l.id]} value={l.colour} onchange={…onRecolour…}>
  <span><label class="sr" for="lb-{l.id}">Name</label><input id="lb-{l.id}" class="input" style="min-height: 40px" value={l.name} onblur={…onRename…} onkeydown={Enter→blur}></span>
  {#if showsInferredBadge(l.origin)}<span class="chip chip-line">inferred</span>{:else}<span></span>{/if}
  <button type="button" class="iconbtn" aria-label="Remove label {l.name}" disabled={removing === l.id} onclick={…onRemove…}>{trash}</button>
</li>{/each}</ul>
<form class="panel-body" style="border-top: 1px solid var(--vk-color-line); display: flex; gap: var(--vk-space-2); align-items: flex-end" onsubmit={add}>
  <button type="button" class="swatch" style="background: {newColour}; margin-bottom: 6px" aria-label="Colour of the new label" onclick={…showPicker…}></button><input type="color" class="sr" tabindex="-1" aria-hidden="true" bind:value={newColour}>
  <div class="field" style="flex: 1"><label for="lb-new">New label</label><input id="lb-new" class="input" placeholder="Name" bind:value={newName}></div>
  <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={newName.trim() === '' || creating}>{creating ? 'Adding…' : 'Add'}</button>
</form>
{#if error}<p class="hint" role="alert" style="padding: 0 var(--vk-space-5) var(--vk-space-4); color: var(--vk-color-signal-text)">{error}</p>{/if}
```
The hidden `input[type=color]` is an extra grid child: give it `position: absolute` (`.sr` already does) so it takes no grid cell. The empty `<span></span>` keeps the `auto` column when a label has no badge.

**PeopleTab** (`<section class="panel" aria-labelledby="pt-h">`):
```html
<div class="panel-head" style="flex-direction: column; align-items: flex-start">{tag}<h2 class="t-h2" id="pt-h">{peopleHeading}</h2></div>
{#each members as m, i}<div class="lrow member" style="grid-template-columns: 36px minmax(0, 1fr) 150px 44px;{i === 0 ? ' border-top: 0' : ''}">
  <span class="me" style="margin: 0" aria-hidden="true">{initials(m)}</span>
  <div><p class="t-h3">{m.name ?? m.email}</p><p class="t-meta">{m.userId === app.user?.userId ? 'You' : m.email}</p></div>
  <div class="field"><label class="sr" for="pr-{m.userId}">Role</label><select id="pr-{m.userId}" class="input" title={ROLE_HELP_TITLE[m.role]} value={m.role} onchange={…change…}><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select></div>
  <button type="button" class="iconbtn" aria-label="Remove {m.name ?? m.email}" disabled={lastOwner(m)} title={lastOwner(m) ? 'A workspace needs at least one owner' : undefined} onclick={…remove…}>{trash}</button>
</div>{/each}
<form class="panel-body invite" style="border-top: 1px solid var(--vk-color-line); display: grid; grid-template-columns: minmax(0, 1fr) 150px auto; gap: var(--vk-space-2); align-items: end" onsubmit={invite}>
  <div class="field"><label for="inv-e">Invite by email</label><input id="inv-e" class="input" type="email" placeholder="name@example.com" bind:value={email}></div>
  <div class="field"><label for="inv-r">Role</label><select id="inv-r" class="input" bind:value={role}><option value="member">Member</option><option value="viewer">Viewer</option><option value="admin">Admin</option><option value="owner">Owner</option></select></div>
  <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={busy || email.trim() === ''}>Invite</button>
  <p class="hint" style="grid-column: 1 / -1">{ROLE_HINT[role]} No email is sent — they sign in and find this workspace waiting.</p>
  {#if error}<p class="hint" role="alert" style="grid-column: 1 / -1; color: var(--vk-color-signal-text)">{error}</p>{/if}
</form>
```
The role options are ordered differently in the two selects (row: Owner, Admin, Member, Viewer; invite: Member, Viewer, Admin, Owner). That is as drawn: the invite select starts at the default.

**ConnectionsTab** (`<section class="panel" aria-labelledby="cn-h">`):
```html
<div class="panel-head" style="flex-direction: column; align-items: flex-start">{tag}<h2 class="t-h2" id="cn-h">Connections</h2><p class="t-meta">Where agents push code and where they come from.</p></div>
<div class="kv"><div><p class="t-h3">Forge host</p><p class="t-meta">Where agents push branches</p></div>{forge value cell}{forge button}</div>
<div class="kv"><div><p class="t-h3">AgentPod fleet</p><p class="t-meta">Where your agents run</p></div>{fleet value cell}{fleet button}</div>
{#if hubConfigured}<div class="kv"><div><p class="t-h3">Add from AgentPod</p><p class="t-meta">Bring fleet agents in as workspace agents</p></div>{picker cell}<button type="button" class="vk-button vk-button--secondary btn-sm" onclick={connect} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect to AgentPod'}</button></div>{/if}
{#if error || forgeError || importResult}<p class="hint" role="alert" style="padding: var(--vk-space-3) var(--vk-space-5); color: var(--vk-color-signal-text)">{…}</p>{/if}
{#if reviewNote}<p class="t-meta" style="padding: var(--vk-space-3) var(--vk-space-5); border-top: 1px solid var(--vk-color-line)">{reviewNote}</p>{/if}
```
Value cells:
- Forge set, not editing → `<p class="mono">{forgeHost}</p>` + `<button … secondary btn-sm>Change</button>`.
- Forge unset → `<p class="t-meta">No forge set — links to your own repositories are stored as plain URLs.</p>` + button **Set**.
- Forge editing → the value cell is `<div class="field"><label class="sr" for="forge-host">Forge host</label><input id="forge-host" class="input" placeholder="forge.example.com" bind:value={forgeInput}><p class="hint">A host, not a URL: forge.example.com. Leave it empty to clear.</p></div>`, and the button cell becomes `<div style="display: flex; gap: var(--vk-space-2)"><button … primary btn-sm>Save</button><button … quiet btn-sm>Cancel</button></div>`.
- Fleet linked → `<p class="t-body" style="display: flex; align-items: center; gap: 6px; color: var(--vk-color-success-text)" title={workspace.externalId}>{check}Linked</p>` + **Change**.
- Fleet unlinked → `<p class="t-meta">Not linked — link a fleet so the tokens its hub issues are accepted here.</p>` + **Link**.
- Fleet editing → same shape as forge editing: input id `fleet-id`, sr label "AgentPod fleet id", placeholder `fleet_…`, hint "Leave it empty to unlink." The input is prefilled with `workspace.externalId`.
- Add from AgentPod: `principals === null` → `<p class="t-meta">Connect to see the fleet's agents.</p>`; `linkable.length === 0` → `<p class="t-body">Every agent in the fleet already has one here.</p>` (drawn); otherwise → `<div style="display: flex; flex-direction: column; gap: var(--vk-space-2); min-width: 0">` holding the principal chips (`<button type="button" class="chip chip-line" aria-pressed={picked} …>{p.handle}</button>`, pressed = `chip` with no `chip-line`) + `<CapabilityChips bind:selected={importCaps} registry={capabilities} id="import" label="Capabilities they can claim" />` + `<button … primary btn-sm disabled={…}>{importing ? 'Adding…' : `Add ${picked.length}`}</button>`.

**CapabilitiesTab** (`<section class="panel {className}" aria-labelledby="ct-h">`):
```html
<div class="panel-head" style="flex-direction: column; align-items: flex-start">{tag}<h2 class="t-h2" id="ct-h">{capsHeading}</h2><p class="t-meta">What agents can do. A board stage asks for one; an agent holding it claims the card.</p></div>
{#if notes.length > 0 || reviewNote}<div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-2); border-bottom: 1px solid var(--vk-color-line)">
  {#each notes as n}<div class="note">{info icon}<p class="t-body" style="font-size: 0.9375rem"><strong>{n.key}</strong> {n.text} <a href={n.link.href}>{n.link.label}</a>{n.tail}</p></div>{/each}
  {#if reviewNote}<p class="t-meta">{reviewNote}</p>{/if}
</div>{/if}
<ul style="list-style: none; margin: 0; padding: 0">{#each sortedCaps as c}<li class="crow">
  <div style="min-width: 0"><p class="t-h3">{c.key}</p><p class="t-meta" style="display: flex; gap: 8px; align-items: center" title="{c.agentCount} {agents} hold this · {c.boardCount} {boards} ask for it"><span class="stack">{#each holders(c) as a}<span class="face" style="width: 24px; height: 24px"><AgentFace agentId={a.id} name={a.name} iconUrl={a.iconUrl} mood="resting" size={24} variant="mood" /></span>{/each}</span>{agentCountText(c)}</p></div>
  <div style="min-width: 0"><label class="sr" for="cd-{c.key}">Description of {c.key}</label><input id="cd-{c.key}" class="input" style="min-height: 44px" placeholder="Add a description" value={c.description ?? ''} onblur={…describe…}></div>
  <div class="caps">
    {#each c.implies ?? [] as to}<span class="chip chip-line">implies {to} <button type="button" class="iconbtn" style="width: 28px; height: 28px" aria-label="Remove implies {to}" onclick={() => unimply(c.key, to)}>{x 14}</button></span>{/each}
    {#if c.boardCount === 0 && c.agentCount > 0}<span class="chip chip-line">no board asks</span>{/if}
    {#if c.origin === 'inferred'}<span class="chip chip-line" title="Nobody defined this — it turned up in use">inferred</span>{/if}
    {#if implyingFor === c.key}
      <label class="sr" for="imp-{c.key}">{c.key} implies</label><input id="imp-{c.key}" class="input" style="min-height: 44px; width: 160px" placeholder="capability" list="cap-keys" bind:value={implyTo} onkeydown={Enter→imply, Escape→close}>
      <button type="button" class="vk-button vk-button--secondary btn-sm" onclick={() => imply(c.key)} disabled={implyTo.trim() === ''}>Add</button>
    {:else}
      <button type="button" class="vk-button vk-button--quiet" style="min-height: 44px; font-size: 0.875rem" aria-label="Add an implied capability to {c.key}" onclick={() => { implyingFor = c.key; implyTo = ''; }}>{plus 16}Implies…</button>
    {/if}
  </div>
  <button type="button" class="iconbtn" aria-label="Remove {c.key}" onclick={() => remove(c)}>{trash}</button>
</li>{/each}</ul>
<datalist id="cap-keys">{#each sortedCaps as c}<option value={c.key}></option>{/each}</datalist>
<form class="panel-body" style="border-top: 1px solid var(--vk-color-line); display: flex; flex-wrap: wrap; gap: var(--vk-space-2); align-items: flex-end" onsubmit={add}>
  <div class="field" style="flex: 1 1 220px"><label for="cap-new">Add a capability</label><input id="cap-new" class="input" placeholder="e.g. diagnostics" bind:value={newKey}></div>
  <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={newKey.trim() === ''}>Add</button>
  <p class="hint" style="flex-basis: 100%">{similar.length > 0 ? similarText : 'If the name is close to one you have, a “similar to …” hint appears after you add it.'}</p>
  {#if error}<p class="hint" role="alert" style="flex-basis: 100%; color: var(--vk-color-signal-text)">{error}</p>{/if}
</form>
```

### Content map

| Element | Source |
|---|---|
| Header back link, eyebrow "Workspace · shared by every board", H1 "Workspace" | `WorkspaceHeader` (SP-Workspace-Agents). |
| Header description, review route | `REVIEW_DESCRIPTION` = "Every workspace tab, shown together for review: Needs you, Capabilities, Labels, People and Connections. (Agents has its own artboard.)" (verbatim). |
| Header description, product routes | `WORKSPACE_DESCRIPTION` (WO-G1): `needs-you` "Every card, on any board, that is waiting on a person."; `capabilities` "What agents can do, and which board stages ask for it."; `labels` "The labels cards carry, shared by every board."; `people` "Who can see and change this workspace."; `connections` "The forge and the AgentPod fleet this workspace uses." |
| Tab bar: Needs you `3` (count-signal), Agents, Capabilities, Labels `3`, People `1`, Connections | `WorkspaceTabs` + `workspaceCounts` (SP-Workspace-Agents). Agents and Capabilities show **17** and **14** with this seed (WA-G1, WA-G6), not the drawn 15 and 12. |
| Panel tags "Needs you tab", "Labels tab", "People tab", "Connections tab", "Capabilities tab" | Review route only, the `reviewTag` prop. |
| **Needs you** H2 "Waiting on you, across every board" | Copy. Count `n = items.length`. |
| "Oldest first. Every board answered." | `headMeta` = `'Oldest first. ' + (unanswered === 0 ? 'Every board answered.' : \`${unanswered} ${unanswered === 1 ? 'board' : 'boards'} did not answer.\`)`. |
| Footer "If a board does not answer, this line says so: “1 board did not answer; this list may be incomplete.”" | Review route: `reviewNote` (NEEDS_REVIEW_NOTE, verbatim). Product: shown only when `unanswered > 0`, as `` `${unanswered} ${unanswered === 1 ? 'board' : 'boards'} did not answer; this list may be incomplete.` `` (WO-G2). |
| Row order | `sortOldestFirst(items)`: by `ageHours` descending, nulls last, ties by title A–Z (WO-G3). |
| Chip "Blocked" / "Unowned" | `WS_KIND_LABEL`: review "Review", question "Asked", blocked "Blocked", repeated-failure "Failing", refused "Refused", sub-tasks "Waiting", no-owner "Unowned", failed "Failed", budget "Budget". `chipClass`: `chip-signal` for review, failed, repeated-failure, blocked, refused, budget; `chip-line` for question, sub-tasks, no-owner (WO-G4). |
| Title link | `item.title`, verbatim. |
| Meta "Developer Experience · Failing test · stopped and is waiting on you · 33h" | `metaLine(item)` = `[item.boardName, item.kind === 'no-owner' ? null : item.stageName, item.headline, age(item.ageHours)].filter(Boolean).join(' · ')`. `age(h)`: `null` → omitted; `< 1` → "just now"; `< 48` → `` `${Math.floor(h)}h` ``; otherwise `` `${Math.floor(h / 24)}d` `` (AttentionRow's formula). |
| No-owner meta "Developer Experience · nothing claims the Reported stage · 2d" | Same formula with the new `ownerless()` headline `` `nothing claims the ${stageName} stage` ``. |
| Detail (agent's words) | `item.detail`, verbatim, as text. `clip(detail)` (WO-G5): `detail.length <= 140` → shown whole, no button. Otherwise, collapsed = the first sentence (up to the first `.` that is followed by whitespace or the end, `.` removed) + "…" when that sentence is 40–240 characters long; else `detail.slice(0, 140).trimEnd() + '…'`. Expanded = the whole detail, and the button reads "Show less". Drawn collapsed: "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access…" |
| Instruction lines | `item.instruction` (attention.ts, unchanged): blocked "Read why it stopped, fix that, then resume it with a note the agent will read."; no-owner "No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works." |
| Resume form label "Note for the agent", buttons "Send back to work", "Cancel" | Copy. The textarea text is the person's draft; the review route seeds "The commit is on the branch now. Pick up from the handoff step." |
| **Labels** H2 "3 labels" | `labelsHeading` = `` `${n} ${n === 1 ? 'label' : 'labels'}` ``; with 0 labels, "No labels yet". |
| "Renames save when you leave the field. “Inferred” means a card created it." | Copy (verbatim, with curly quotes). |
| Swatch colour | `l.colour` (stored hex, WO-G6). |
| Name input value | `l.name`. |
| "inferred" chip | `showsInferredBadge(l.origin)`. |
| New label: "New label", placeholder "Name", "Add" | Copy. The default `newColour` is `'#ffd9c2'` (WO-G6). |
| Empty labels | `<li class="lrow" style="grid-template-columns: 1fr"><p class="t-meta">Nothing yet. A card's Labels field creates one, or name one below.</p></li>` |
| **People** H2 "1 person" | `` `${n} ${n === 1 ? 'person' : 'people'}` ``. |
| Avatar "RG" | `initials(m)`: `(m.name ?? m.email)` split on whitespace; first letter of the first word + first letter of the last word, upper-cased; a single word gives its first two letters. |
| "Rakesh Gangwar", "You" | `m.name ?? m.email`; the second line is "You" when `m.userId === app.user?.userId`, otherwise `m.email`. |
| Role select title "Owner: everything, including people and deleting boards" | `ROLE_HELP_TITLE[role]` = `` `${Label}: ${ROLE_HELP[role]}` ``. `ROLE_HELP`: owner "everything, including people and deleting boards" (drawn); admin "also manages boards, agents and connections"; member "creates, moves and decides cards" (drawn); viewer "reads boards and cards, changes nothing" (WO-G7). |
| Remove disabled + title "A workspace needs at least one owner" | `lastOwner(m)` = `m.role === 'owner' && members.filter(x => x.role === 'owner').length === 1`. |
| Invite labels "Invite by email", placeholder "name@example.com", "Role", "Invite" | Copy. |
| Invite hint "Member: creates, moves and decides cards. No email is sent — they sign in and find this workspace waiting." | `ROLE_HINT[role]` = `` `${Label}: ${ROLE_HELP[role]}.` `` + " No email is sent — they sign in and find this workspace waiting." |
| **Connections** H2, meta, row titles and sublines | Copy (verbatim): "Connections"; "Where agents push code and where they come from."; "Forge host" / "Where agents push branches"; "AgentPod fleet" / "Where your agents run"; "Add from AgentPod" / "Bring fleet agents in as workspace agents". |
| "forge.superjackfruit.com" | `getForgeHost()`. |
| "Linked" (success text + check icon) | `workspace.externalId !== null` (`getWorkspace()`); the id is in `title` and in the Change editor (WO-G8). |
| "Every agent in the fleet already has one here." | `hubConfigured && principals !== null && linkable.length === 0`. |
| "Connect to AgentPod" | Button, shown whenever `hubConfigured` (WO-G9). |
| Connections footer "Changing the forge host takes a host, not a URL: forge.example.com. When new fleet agents appear, they show here as pickable chips with a capability picker and “Add N”." | Review route only: `reviewNote` (CONNECTIONS_REVIEW_NOTE, verbatim). The product shows the hint inside the editor instead (WO-G2). |
| **Capabilities** H2 "12 capabilities" | `capsHeading` = `` `${n} ${n === 1 ? 'capability' : 'capabilities'}` ``. With the seed it is **14** (WA-G6). |
| "What agents can do. A board stage asks for one; an agent holding it claims the card." | Copy. |
| Note "**command** is held by super-chotu but no board stage asks for it, so it lets him claim nothing. Add a stage that asks for it or remove it." | `orphanNote` for each `c` with `boardCount === 0 && agentCount > 0`: text `` `is held by ${listNames(holders)} but no board stage asks for it, so it lets ${holders.length === 1 ? 'that agent' : 'them'} claim nothing.` ``; link "Add a stage that asks for it" → `app.boardId ? \`/b/${app.boardId}/settings\` : '/'`; tail " or remove it." `listNames`: "a", "a and b", "a, b and c" (WO-G10). |
| Unstaffed note (not drawn) | `unstaffedNote` for each `c` with `agentCount === 0 && boardCount > 0`: text `` `is asked for by ${c.boardCount} ${c.boardCount === 1 ? 'board' : 'boards'} but no agent holds it, so cards there wait for ever.` ``; link "Give it to an agent" → `/workspace/agents`; tail ".". |
| "When a stage asks for a capability no agent holds, it shows here too, with a link to staff it." | Review route only: `reviewNote` (CAPS_REVIEW_NOTE, verbatim). |
| Row name | `c.key`. |
| Face stack + "2 agents" / "1 agent" | `holders(c)` = `agents.filter(a => a.capabilities.includes(c.key))` in `getAgents()` order; `agentCountText` = `` `${c.agentCount} ${c.agentCount === 1 ? 'agent' : 'agents'}` ``; a count of 0 gives "No agent" and an empty stack. Faces are 24px, resting (WO-G11). |
| Description input, placeholder "Add a description" | `c.description ?? ''`. |
| "implies analysis" chip | `c.implies[]`. |
| "no board asks" chip | `c.boardCount === 0 && c.agentCount > 0`. |
| "Implies…" | Copy. aria-label "Add an implied capability to {key}". |
| Add form: "Add a capability", placeholder "e.g. diagnostics", "Add", hint | Copy. The hint reads "…appears **after** you add it" (WO-G2). `similarText` = `` `Similar to ${similar.join(', ')}. Routing matches names exactly, so two spellings are two capabilities; remove the new one if you meant an existing one.` `` |
| Capability row order | Sorted by `key`, A–Z (`localeCompare`). |

### Interactions & states

| Control | Behaviour | Call |
|---|---|---|
| Tab links | Navigate (SP-Workspace-Agents). | — |
| Refresh | Reloads the list. While loading, the button is `disabled` with the label "Refreshing…". | `listAttention()` |
| Title link / Open / Review / Answer | Navigate to `/b/{boardId}/c/{cardId}` (the card route opens the drawer). Open log adds `?tab=attempts`. | — |
| Resume | Toggles the row's `.resume` form (`aria-expanded`). Only one row's form is open at a time (`NeedsYouTab` holds `openId`). Focus moves to the textarea on open. | — |
| Send back to work | Disabled when the draft is blank. On submit: `busy`, then `refusalOf(await resumeCard(boardId, cardId, draft))`. On a refusal, the refusal text shows in the `role="alert"` hint. On success, the form closes, the draft clears and the list reloads, along with `workspaceCounts.refresh()`. | `resumeCard`, `refusalOf`, `listAttention` |
| Cancel | Closes the form and keeps the draft. | — |
| Show all / Show less | Toggles the clipped detail (`aria-expanded`). | — |
| Staff an agent | Link to `/workspace/capabilities`. | — |
| Label swatch | Opens the native colour picker (`HTMLInputElement.showPicker()`). On change, recolours the label. | `recolourLabel` → `updateLabel` |
| Label name | Saves on blur when changed and not blank; Enter blurs. On failure, the `role="alert"` hint. | `renameLabel` → `updateLabel` |
| Remove label | `confirm('Delete the label "{name}"? Cards carrying it will drop it on their next edit.')`, then remove. The button is disabled while it runs. | `removeLabel` → `deleteLabel` |
| New label Add / Enter | Disabled when the name is blank or a request is running; the label reads "Adding…" meanwhile. | `createLabel` |
| Member role select | Changes the role. The server refusal (last owner) shows in the alert hint. | `setMemberRole` |
| Remove member | Disabled for the last owner, with that title. Otherwise `confirm('Remove {name ?? email} from this workspace? They lose access on their next request.')`. | `removeMember` |
| Invite / Enter | Disabled when the email is blank or a request is running. | `addMember` |
| Invite role select | Updates the hint (`ROLE_HINT`). | — |
| Forge Change / Set | Opens the editor (Markup); Save / Cancel. A bad host shows "That is a host, not a URL — forge.example.com." | `setForgeHost`, `getForgeHost` |
| Fleet Change / Link | Opens the editor; Save / Cancel. | `setWorkspaceFleet`, `getWorkspace` |
| Connect to AgentPod | `beginHubAuthorization()`; the label reads "Connecting…" while it runs. | `hub-token.ts` |
| Principal chip | Toggles `picked` (`aria-pressed`). | — |
| Add N | Creates one agent per picked principal with the chosen capabilities, then calls `workspaceCounts.refresh()`. | `createAgent` |
| Capability description | Saves on blur when changed. | `updateCapability` |
| Implies… | Swaps in an input (datalist of keys) + Add. Enter adds; Escape or a blur with a blank value closes it. | `addImplication` |
| × on "implies {to}" | Removes the implication. | `removeImplication` |
| Remove capability | Removes it; a refusal shows in the alert hint. | `deleteCapability` |
| Add capability / Enter | Adds it and shows `similar` in the hint. | `createCapability` |

**States.** All five tabs have a loading state, a single `.t-meta` line inside the panel body: "Loading…" (Needs you), "Loading labels…", "Loading people…", "Loading connections…", "Loading capabilities…". The H2 count is omitted until the data loads. A load error in Needs you shows `<p class="t-meta" role="alert" style="padding: var(--vk-space-4) var(--vk-space-5); color: var(--vk-color-signal-text)">Could not load what is waiting: {message}</p>`. Every write refusal uses the `role="alert"` hint in `--vk-color-signal-text` (WO-G13). Hover and focus come from `vk-button`, `.iconbtn:hover` and `.input` focus; the focus ring is vibekit's base `:focus-visible`. Disabled `vk-button`s use vibekit's disabled style.

**Pixel test** (`e2e/vibes.spec.ts` or the visual spec, for each vibe × theme at 1440): `goto('/workspace/review')` and wait for 3 `.nrow`. Diff the page region below the shell against the reference. Masks: `.swatch` except in daylight-light (WO-G6); the tab-bar counts for Agents and Capabilities, and the capabilities H2 and list, until the reference is re-exported (WO-G11). Separately, on `/workspace/needs-you`, click row 3's Resume, type the note and assert the form renders identically to the review route's `.resume` (an element screenshot).

### Fixture needs

Snapshot time **2026-10-11T13:51:00Z** (freeze `Date` in the e2e page with `page.clock`).

**Needs you** (`GET /v1/stale?attention=1` → `boardsUnanswered: 0`). The seed's Developer Experience board must produce exactly these 3 attention cards, identical to the Board/Operate fixtures:

| # (after the oldest-first sort) | title | stageKey / stageName | state | why | since | detail |
|---|---|---|---|---|---|---|
| 1 | Fix the highest-severity blocker found in the clean-room journey | `reported` / Reported (`ownerKind: 'human'`, no gate, not last) | `submitted` | `{ kind: 'no-owner' }` | 2026-10-09 (≥ 48 h and < 72 h old; use the Operate fixture's exact timestamp, e.g. 2026-10-09T09:55:00Z) | — |
| 2 | AgentPod: connector interface and generic effects ledger, state machine and executor | `failing-test` / Failing test | `input-required` | `{ kind: 'needs-human', reason: 'blocked', detail }` | 33 h ≤ age < 34 h (e.g. 2026-10-10T04:51:00Z) | "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with "Mirror Repository SuperJackfruitLabs/agentpod is read-only". Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted." (straight quotes, as in SP-Operate-*) |
| 3 | Superpipeline: manual-delivery completion and approval-subject hardening | `fix` / Fix | `input-required` | `{ kind: 'needs-human', reason: 'blocked', detail }` | 33 h ≤ age < 34 h, and later than #2 (so the title tie-break keeps AgentPod first; e.g. 2026-10-10T04:55:00Z) | "this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit" |

All three have `boardName: 'Developer Experience'`.

**Labels** (`GET /v1/labels`, in this order): `{ name: 'clean-room', colour: '#dcebff', origin: 'inferred' }`, `{ name: 'evidence-required', colour: '#ffefa8', origin: 'inferred' }`, `{ name: 'superpipeline', colour: '#cdefd9', origin: 'inferred' }`. These are the daylight-light values of `--vk-mood-thinking/done/working`.

**People** (`GET /v1/members`): `{ userId: <the dev user, usr_dev>, email: 'rakesh@superjackfruit.test', name: 'Rakesh Gangwar', role: 'owner' }` (a placeholder address; never seed a real one). The signed-in `app.user.userId` is the same id.

**Connections:** `GET /v1/tenant/forge` → `{ forgeHost: 'forge.superjackfruit.com' }`. `GET /v1/tenant` → `externalId: 'fleet_superjackfruit'` (any non-null value; it is shown only in the title). `hubStatus()` → `{ configured: true }`. `getHubPrincipals()` → one principal per seeded agent whose `externalId` equals that agent's, so `linkable` is empty. The e2e stubs `/hub/token` and the principals call with `page.route`, because no hub runs in CI.

**Capabilities** (`GET /v1/capabilities`; the client sorts A–Z). `origin: 'declared'`; `description: null` except claim-check:

| key | agentCount | boardCount | implies | description | holders (from the 17 seeded agents, WA-G1) |
|---|---|---|---|---|---|
| analysis | 2 | ≥1 | — | — | predictor-paul, analyst-echo |
| claim-check | 1 | ≥1 | analysis | "Checks that what an agent says it did is what the record shows." | analyst-echo |
| code | 2 | ≥1 | — | — | optimizer-ollie, coder-kai |
| command | 1 | **0** | — | — | super-chotu |
| design | 1 | ≥1 | — | — | artistic-lyra |
| diagnostics | 1 | ≥1 | — | — | error-eric |
| maintenance | 1 | ≥1 | — | — | cleaner-cody |
| onboarding | 1 | ≥1 | — | — | onboarding-olivia |
| planning | 3 | ≥1 | — | — | strategy-sam, project-manager-pete, controller-casey |
| research | 1 | ≥1 | — | — | research-ray |
| resilience | 1 | ≥1 | — | — | chaos-charlie |
| security | 1 | ≥1 | — | — | threat-hunter-theo |
| testing | 1 | ≥1 | — | — | tester-tim |
| writing | 1 | ≥1 | — | — | writer-quill |

`boardCount ≥ 1` means some seeded board stage has `requires`/owner capability = that key. Developer Experience covers diagnostics, testing and code. The other boards in the seed cover the rest, and **no** stage may name `command`. The agents' `capabilities` arrays are as in SP-Workspace-Agents' fixture. All agents are resting (nothing claimed).

### Gaps

| Id | Mockup shows | Problem | Ruling |
|---|---|---|---|
| WO-G1 | One description for the composite | Product routes show one tab each and need their own line. | **(a)** `WORKSPACE_DESCRIPTION` copy (Content map). The review route keeps the drawn sentence. |
| WO-G2 | Annotation sentences: Needs-you footer "If a board does not answer…", Connections footer, Capabilities "When a stage asks…", and the Add hint "…appears before you add it" | These are reviewer notes about states, not product copy. The add hint is also false: `createCapability` returns `similar` **after** the add. | **(c)** On the review route they render through `reviewNote` (verbatim) so the pixel diff matches. Product routes render the real state lines instead (Content map). The Add hint becomes a permanent hint with "before" → "after"; the reference must be re-exported with that one word changed (until then, mask that `.hint`). |
| WO-G3 | "Oldest first", but the rows drawn are 33h, 2d, 33h | That order is not oldest first. `listAttention` returns server order. | **(c)** The client sorts with `sortOldestFirst`, so the clean-room card (2d) comes first. Re-export the reference with rows in the order 2d, AgentPod 33h, Superpipeline 33h. Until then, the pixel test diffs each `.nrow` as an element screenshot against the matching reference row (located by title). |
| WO-G4 | "Unowned" in a neutral `chip-line`, "Blocked" in `chip-signal` | Is a no-owner card a "person needed now"? By the coordinator ruling it is Waiting on you. | **(a)** It is in the list and counted in the signal count "3", but its chip stays `chip-line` as drawn: the row needs a move, not an answer. The signal marks only the kinds where the agent itself is stopped on a person (`chipClass`). Question/sub-tasks are `chip-line` (not drawn; same reasoning). |
| WO-G5 | The collapsed detail ends at the first sentence + "…" (183 chars) | `AttentionRow` cuts at a fixed 140 characters, which would cut mid-word. | **(a)** `clip()` formula (Content map), in `needs-row.ts` with unit tests: the drawn string, a ≤ 140-char detail, a long detail with no sentence break. |
| WO-G6 | Swatches drawn as `var(--vk-mood-*)`, so they change with vibe and theme | `Label.colour` is a stored hex chosen by a person. It cannot follow the theme. | **(c)** The app renders `l.colour`. The seed stores the daylight-light token values, so daylight-light matches exactly; other vibe/theme references mask `.swatch`. The new-label default becomes `#ffd9c2` (was `#f5a623`). The native picker is kept behind the round swatch button, so recolouring still works. |
| WO-G7 | Role help text only for Owner (title) and Member (hint) | Admin and Viewer need text; today's `HELP` words differ ("works the board — cards, gates, questions"). | **(a)** The `ROLE_HELP` constant (Content map); Owner and Member are verbatim from the mockup. |
| WO-G8 | The fleet shows only "Linked"; today the fleet id is printed | Parity: the id must stay reachable. | **(a)** The id is in the "Linked" `title` and prefilled in the Change editor. That counts as reachable behind a labelled control. |
| WO-G9 | "Every agent in the fleet already has one here." beside a "Connect to AgentPod" button | Today the button exists only while `principals === null`, and the text only after. | **(a)** The button shows whenever `hubConfigured` (it re-authorises and reloads the principals); the value cell follows the three-way rule in Markup. When `!hubConfigured`, the whole row is omitted, as today. |
| WO-G10 | "…so it lets **him** claim nothing" | An agent's pronoun is not in the API and cannot be derived. | **(c)** "so it lets that agent claim nothing" (one holder) / "them" (several). Re-export the reference with that wording; until then, mask the `.note` text box. |
| WO-G11 | 12 capabilities, 15 agents; faces drawn are generator collisions (e.g. the "design" face is tester-tim's, the "planning" stack repeats controller-casey) | The same workspace's boards are worked by tester-tim (testing) and error-eric (diagnostics) (WA-G1, WA-G6). The faces must come from the real holders. | **(c)** Follow WA-G1/WA-G6: 14 capabilities (diagnostics, testing inserted alphabetically), heading "14 capabilities", tab "Capabilities 14", "Agents 17". Faces are `AgentFace` seeded by the holder's **name** (WA-G7), so the stacks show predictor-paul+analyst-echo, optimizer-ollie+coder-kai, strategy-sam+project-manager-pete+controller-casey, and so on. Re-export the reference; until then, mask the Capabilities `<ul>`, its H2 and the two tab counts. |
| WO-G12 | No phone or narrow layout | The `.grid2`, `.crow`, `.kv`, People grid and `.nrow` overflow or crowd at 390px. | **(a)** The `@media` block in Layout & CSS, which only re-flows existing declarations. |
| WO-G13 | No error or refusal state drawn | Every write can be refused, and today's red `text-coral` is the old palette. | **(a)** The `role="alert"` `.hint` in `--vk-color-signal-text` (a refusal is a person-needed-now message). The text is the server's `error`/`error.message`, verbatim. |
| WO-G14 | "Back to Developer Experience" | No board may be loaded. | **(a)** As WA-G11: "Back to your boards" → `/`. |
| WO-G15 | Composite page | No product route can match a five-tab composite. | **(a)** The dev/e2e-only `/workspace/review` route (Component tree), built from the same panel components. Product routes render one panel each at full `.page` width. |


---

## Board settings (SP-Settings)

| | |
|---|---|
| Artboard | `SP-Settings` — "Board settings · shared" |
| Size | 1440 × 1999 (manifest; `$preview` height in the source says 1855, the manifest's 1999 is the truth) |
| Vibe | shared, one component; `vibe` tweak = daylight (default) / paper / studio / quiet, `theme` tweak = light / dark. Every `[data-vibe=…]` branch below must work. |
| Route / state | `/b/brd_134a0ddb6d434478/settings` — board "Developer Experience", stage 2 "Reproduce" disclosed (open), all other stages closed, Name pristine ("Saved"), Pipeline dirty ("1 unsaved change", see SE-G3), Reproduce's rule saved 2 minutes ago (SE-G2), no schedules, GitHub not set up, no agent profiles. |
| Sources | `vibes-mockups/project/SP-Settings.dc.html` lines 16–111 + 266–273 (page CSS), 367–497 (page markup). Shell (lines 112–265 CSS, 276–366 + 498–500 markup) is specified in the shell group — not here. |


### 0. vibekit components used

Reusable patterns come from the vibekit Svelte 5 library (coordinator ruling, supersedes screen.css for these). The mockup CSS quoted in §2 for them is **reference for vibekit:<Name>, not app CSS**. App-local stays: page composition, `.cols`/`.colstack`, `.sec-head` layout, `.stage*` summary/body grid, `.sumline`/`.sumrule`, `.steps`, `.formgrid`, `.row-form`, `.copyfield` layout, and all data mapping.

| Component | Props (TypeScript) | Where used | CSS reference (§2) |
|---|---|---|---|
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet'; size?: 'sm'; type?: 'button' \| 'submit'; disabled?: boolean; icon?: Snippet; ariaLabel?: string; onclick?: (e: MouseEvent) => void; children: Snippet }` | Rename, Save pipeline, Add (stage/profile), Move earlier/later, Remove stage, Add schedule, Copy ×2, Generate, Save GitHub settings, Pause/Resume/Remove (SE-G6) | `.vk-button*`, `.btn-sm`, `.vk-button--quiet` padding |
| `vibekit:Panel` | `{ labelledby: string; children: Snippet }` | the five sections | `.panel` + its paper/quiet/studio overrides |
| `vibekit:SaveState` | `{ state: 'saved' \| 'unsaved' \| 'neutral'; children: Snippet }` (check icon for saved, info icon for unsaved, none for neutral) | Name "Saved", Pipeline "1 unsaved change", GitHub "Not set up", "Rule saved · 2 min ago" | `.saved`, `.unsaved` |
| `vibekit:StatePill` | `{ tone: 'line' \| 'filled' \| 'ok' \| 'signal'; icon?: Snippet; children: Snippet }` | owner chips ("A person", "Agent with …"), "Approval gate", "Paused" (SE-G6) | `.chip`, `.chip-line`, `.chip-ok`, `.chip-signal` + studio radius 0 |
| `vibekit:Field` | `{ id: string; label: string; hint?: string; full?: boolean; children: Snippet /* the control */ }` | every labelled input/select/textarea | `.field`, `.field label/.lbl`, `.hint` |
| `vibekit:Input` | `HTMLInputAttributes & { value?: string \| number \| null; mono?: boolean }`; `vibekit:Select` `HTMLSelectAttributes & { options: { value: string; label: string }[] }`; `vibekit:Textarea` `HTMLTextareaAttributes` | all form controls (`mono` = `.copyfield .input`) | `.input`, `textarea.input`, `.input[readonly]`, studio `.input` |
| `vibekit:Checkbox` | `{ checked: boolean; label: string; onchange: (v: boolean) => void }` | Approval gate, Open a card for each new GitHub issue | `.check`, `.check input` |
| `vibekit:SegmentedControl` | `{ labelledby: string; options: { value: string; label: string; icon?: Snippet }[]; value: string; onchange: (v: string) => void }` | Who works this stage; Needs all / Any one | `.seg`, `.seg button`, `[aria-pressed]` |
| `vibekit:Disclosure` | `{ open?: boolean; summary: Snippet; children: Snippet; class?: string }` (native `<details>`, rotating chevron) | each stage row (summary content composed app-side), "How to write a cadence" | `details > summary`, `.disc-ico`, `details[open] .disc-ico` |
| `vibekit:Note` | `{ role?: 'alert'; children: Snippet }` (info icon 20) | GitHub grant note, every error | `.note` |
| `vibekit:EmptyState` | `{ children: Snippet }` (dashed box) | "No recurring cards…", "No profiles yet." | `.empty` |
| `vibekit:Skeleton` | `{ label: string }` (renders the one-line `t-meta role=status`) | "Loading board settings…", "Loading profiles…" | `.t-meta` |
| `vibekit:CopyField` | `{ id: string; value: string; readonly?: boolean; placeholder?: string; actions?: Snippet; onCopy?: () => void }` (input + Copy button, "Copied" 1600 ms) | Payload URL, Secret (Secret passes Generate as an extra action) | `.copyfield`, `.copyfield .input` |
| `vibekit:Code` | `{ children: Snippet }` | stage key `reproduce`, `application/json`, profile key | `.code` |
| `vibekit:Type` classes | `.t-h1/.t-h2/.t-h3/.t-eyebrow/.t-body/.t-meta/.t-num` from vibekit's stylesheet | headings, meta lines | type-scale block + per-vibe overrides |
| `vibekit:Icon` | `{ name: 'chevronLeft' \| 'check' \| 'info' \| 'person' \| 'agent' \| 'gate' \| 'chevronDown' \| 'arrowUp' \| 'arrowDown' \| 'trash' \| 'plus' \| 'github' \| 'copy'; size: 14 \| 16 \| 20 \| 22 }` | all icons (§3 icon table = reference paths) | — |

Until the library ships, the app may not inline its own copies: the components are the dependency (track in the coordinator's inventory). The `lib/components/settings/icons.ts` file in §1 is replaced by `vibekit:Icon`; `screen.css` keeps only what is not covered above (layout primitives).

### 1. Component tree

All paths under `apps/web/src`.

| File | Action | Contents |
|---|---|---|
| `routes/b/[boardId]/settings/+page.svelte` | modify | Delete the `<div class="p-3">` wrapper and the `← Board` link (the back link moves into BoardSettings, see §3). Body becomes: `{#if app.board}<BoardSettings board={app.board} onChanged={() => void app.refresh()} />{:else}<BoardSettingsLoading />{/if}` — the loading state is inline markup in the same file (see §4.6), no new component. Keep the file's doc comment. |
| `lib/components/BoardSettings.svelte` | rewrite (keep path, keep `{ board, onChanged }` props) | Page root `<div class="screen"><div class="page">`, head block (back link, eyebrow, h1, lede), `.cols` grid, left `.colstack` = `<NameSection>` + `<PipelineEditor>`, right `.colstack` = `<ScheduleList>` + `<GithubSettings>` + `<AgentProfiles>`. Imports `./settings/board-settings.css`. Holds no section state any more. |
| `lib/styles/screen.css` | shared (defined in the Workspace-Agents section, `4-workspace-agents.md`, blocks A + B) | §2 part 1 below is byte-identical to that file's blocks A + B (type scale, `.page`, `.panel*`, `.chip*`, `.count*`, `.btn-sm`, `.face`, `.field`, `.input`, `.hint`, `.saved`, `.unsaved`, `.check`, `.sr`, `details > summary`, `.disc-ico`, `.note`, per-vibe overrides). Reuse it; do not redefine. **Merge into screen.css:** the six Studio page-content rules at the end of §2 part 1 (`[data-vibe="studio"] .screen .t-h2/.panel/.chip…/.count…/.count-signal/.input`) if blocks A + B do not already carry them, and `.screen .sec-head`, `.screen .sec-head .state`, `.screen .empty`, `.screen .code`, `.screen .row-form` (also drawn on Projects/Spend-style panels; harmless if unused). |
| `lib/components/settings/board-settings.css` | create | §2 part 2 (this screen's own rules: `.cols`, `.colstack`, `.stage*`, `.sumline`, `.sumrule`, `.seg*`, `.copyfield`, `.steps`, `.formgrid`) + the responsive block, scoped `.screen …`, vibe branches `[data-vibe="x"] .screen …` (attribute on `<html>`, set by HEAD_SCRIPT). Plain global CSS imported once by BoardSettings.svelte so the five section components share it without per-component `<style>`. |
| `lib/components/settings/NameSection.svelte` | create | `let { board, onChanged }: { board: BoardSnapshot; onChanged: () => void } = $props();` Owns `nameInput`, `busy`, `error`; `saveName()` moved verbatim from today's BoardSettings. |
| `lib/components/settings/PipelineEditor.svelte` | create | `let { board, onChanged }: { board: BoardSnapshot; onChanged: () => void } = $props();` Owns `draft: Stage[]`, `seeded`, `stagesError`, `newStageName`, `busy`, `ruleSavedAt: Record<string, number>`, `now` (ticks every 30 s), `openKey: string \| null` (not required — native `<details>` own their open state; see §4.2). Moves verbatim from today: `ownerParts`, `ownerText`, `setOwner`, `setMatch`, `addStage`, `removeStage`, `move`, `saveRule` (changed: records `ruleSavedAt[stage.key] = Date.now()` instead of the 1.6 s flag), `saveStages`. New: `cardsPerStage` (excludes archived, §5), `unsavedCount` (§5), `ownerLabel(stage)` (§5). Renders `{#each draft as stage, i (stage.key)}<StageRow …/>{/each}`. |
| `lib/components/settings/StageRow.svelte` | create | Props: `{ stage: Stage; index: number; total: number; cards: number; savedAt: number \| null; now: number; agents: AgentSummary[]; onMove: (by: -1 \| 1) => void; onRemove: () => void; onOwner: (raw: string) => void; onMatch: (m: 'all' \| 'any') => void; onRule: (text: string) => void }`. `stage` is the draft object (mutated in place via `bind`-free handlers exactly as today: `stage.name`, `stage.ownerKind`, `stage.gate`, `stage.wipLimit`). One `<details class="stage">`. |
| `lib/components/board/ScheduleList.svelte` | restyle (keep path, props `{ boardId, stages }`, all logic) | Becomes the Schedules `<section class="panel">` of §3.4; logic (`load`, `add`, `toggle`, `remove`, the `$effect` on boardId) unchanged. Its Tailwind markup is replaced; uses the shared `.screen` primitives (it renders only inside `.screen`). |
| `lib/components/settings/GithubSettings.svelte` | create | Props `{ board: BoardSnapshot; onChanged: () => void }`. Owns `githubSecret`, `issueTrigger` (seeded once from `board.github.issueTrigger`), `busy`, `copied: 'url' \| 'secret' \| null`, `error`. `genSecret`, `saveGithub` moved verbatim. `webhookUrl` = `board.github.webhookUrl` (SE-G1). |
| `lib/components/settings/AgentProfiles.svelte` | create | Props `{ boardId: string }`. Owns `profiles: Profile[] \| null` (null = loading), `pKey`, `pModel`, `busy`, `error`. `addProfile` moved verbatim; load via `getProfiles(boardId)` in an `$effect` keyed on `boardId` (same pattern as ScheduleList). |
| `lib/components/ui/button` | stop importing here | All buttons on this page are `<button class="vk-button vk-button--primary\|--secondary\|--quiet btn-sm">` (vibekit classes, styled per vibe by vibekit.css). |

Nothing else is deleted. `lib/layouts.ts` is untouched (shared screen).

Svelte notes: the five components carry no `<style>` block; all page CSS lives in `screen.css` + `board-settings.css` so it ports 1:1 from the mockup. Class names are the mockup's, unprefixed, under the `.screen` root (root `<div class="screen">`, `.page` its only child).

### 2. Layout & CSS (port verbatim into `board-settings.css`)

Part 1 = shared pieces: reference for the vibekit components in §0 (not app CSS), except the page/root/type rules not covered there, which stay in `lib/styles/screen.css`; part 2 starts at `/* ---- this screen ---- */` (→ `board-settings.css`). Renames applied mechanically: every selector gets the `.screen` root (`.panel` → `.screen .panel`; `.page` → `.screen .page`); `[data-vibe="x"] .foo` → `[data-vibe="x"] .screen .foo`; `.app a` → `.screen a`; `.app button` → `.screen button`; `.app input, .app select, .app textarea` → `.screen input, .screen select, .screen textarea`; `.app *` box-sizing → `.screen, .screen *, .screen *::before, .screen *::after`. The `.app` flex shell rule and `.main` belong to the shell spec and are NOT ported. Everything else verbatim:

```css
/* root (was .app — only the inheritable parts; layout belongs to the shell) */
.screen { color: var(--vk-color-text); font-family: var(--vk-font-body); font-size: 1rem; line-height: 1.5; }
.screen, .screen *, .screen *::before, .screen *::after { box-sizing: border-box; }
.screen a { color: var(--vk-color-text); text-underline-offset: 3px; }
.screen button { font-family: var(--vk-font-body); }
.screen input, .screen select, .screen textarea { font-family: var(--vk-font-body); font-size: 16px; color: var(--vk-color-text); }

/* ---- type system: one scale, every screen ---- */
.screen .t-h1 { margin: 0; font: 700 2rem/1.15 var(--vk-font-display); letter-spacing: -0.01em; }
.screen .t-h2 { margin: 0; font: 700 1.25rem/1.3 var(--vk-font-display); }
.screen .t-h3 { margin: 0; font: 700 1rem/1.35 var(--vk-font-body); }
.screen .t-eyebrow { margin: 0; font: 600 0.8125rem/1.3 var(--vk-font-display); letter-spacing: 0.04em; color: var(--vk-color-muted); }
.screen .t-body { margin: 0; font-size: 1rem; line-height: 1.55; }
.screen .t-meta { margin: 0; font-size: 0.875rem; line-height: 1.45; color: var(--vk-color-muted); }
.screen .t-num { font-variant-numeric: tabular-nums; }
.screen .t-key { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); overflow-wrap: anywhere; }
[data-vibe="studio"] .screen .t-eyebrow { font-family: var(--vk-font-body); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
[data-vibe="studio"] .screen .t-num { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .screen .t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em; }
[data-vibe="paper"] .screen .t-h1, [data-vibe="paper"] .screen .t-h2 { font-weight: 500; }
[data-vibe="paper"] .screen .t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400; }
[data-vibe="quiet"] .screen .t-h1 { font-size: 1.875rem; }
[data-vibe="quiet"] .screen a { text-decoration: underline; }

/* ---- page ---- */
.screen .page { width: 100%; max-width: 1280px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }

/* ---- shared pieces ---- */
.screen .panel { background: var(--vk-color-surface); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); }
.screen .panel-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
.screen .panel-body { padding: var(--vk-space-4) var(--vk-space-5); }
.screen .chip { display: inline-flex; align-items: center; gap: 4px; min-height: 26px; padding: 2px 10px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-text); font-size: 0.8125rem; font-weight: 600; line-height: 1.2; overflow-wrap: anywhere; }
.screen .chip-line { background: transparent; box-shadow: inset 0 0 0 1px var(--vk-color-line); color: var(--vk-color-muted); }
.screen .chip-ok { background: var(--vk-color-success-wash); color: var(--vk-color-success-text); }
.screen .chip-signal { background: var(--vk-color-signal-wash); color: var(--vk-color-signal-text); box-shadow: inset 0 0 0 1px var(--vk-color-signal); }
.screen .count-signal { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-signal); color: var(--vk-color-primary-fg); font-size: 0.75rem; font-weight: 700; }
.screen .count { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); color: var(--vk-color-muted); font-size: 0.75rem; font-weight: 700; }
.screen .btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: 0.9375rem; }
.screen .vk-button--quiet { padding: 0 var(--vk-space-3); }
.screen .face { display: inline-block; flex: none; line-height: 0; }
.screen .face svg { display: block; width: 100%; height: 100%; }
[data-vibe="studio"] .screen .face { border-radius: var(--vk-radius-sm); }
.screen .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.screen .field label, .screen .field .lbl { font-size: 0.875rem; font-weight: 600; }
.screen .input { width: 100%; min-height: 44px; padding: 0 var(--vk-space-3); border: 1.5px solid var(--vk-color-faint); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font-size: 16px; }
.screen textarea.input { padding: var(--vk-space-3); min-height: 96px; line-height: 1.5; resize: vertical; }
.screen .input[readonly] { background: var(--vk-color-raised); border-color: var(--vk-color-line); }
.screen .hint { margin: 0; font-size: 0.8125rem; color: var(--vk-color-muted); }
.screen .saved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-success-text); }
.screen .unsaved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-muted); }
.screen .check { display: inline-flex; align-items: flex-start; gap: var(--vk-space-2); min-height: 44px; padding-top: 10px; cursor: pointer; }
.screen .check input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--vk-color-primary); }
.screen .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.screen details > summary { list-style: none; cursor: pointer; }
.screen details > summary::-webkit-details-marker { display: none; }
.screen .disc-ico { transition: transform var(--vk-motion-fast) var(--vk-motion-easing); display: inline-grid; }
.screen details[open] > summary .disc-ico { transform: rotate(180deg); }
.screen .note { display: flex; gap: var(--vk-space-3); align-items: flex-start; padding: var(--vk-space-3) var(--vk-space-4); border-radius: var(--vk-radius-sm); background: var(--vk-color-raised); font-size: 0.9375rem; }
[data-vibe="quiet"] .screen .panel { border-width: 1px; }
[data-vibe="paper"] .screen .panel { border-radius: var(--vk-radius-sm); }

/* ---- this screen ---- */
.screen .cols { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: var(--vk-space-5); align-items: start; }
.screen .colstack { display: flex; flex-direction: column; gap: var(--vk-space-5); min-width: 0; }
.screen .sec-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
.screen .sec-head .state { margin-left: auto; }
.screen .stage { border-top: 1px solid var(--vk-color-line); }
.screen .stage:first-child { border-top: 0; }
.screen .stage > summary { display: grid; grid-template-columns: 28px minmax(0, 1fr) auto 28px; gap: var(--vk-space-3); align-items: center; min-height: 64px; padding: var(--vk-space-2) var(--vk-space-5); }
.screen .stage > summary:hover { background: var(--vk-color-raised); }
.screen .stage[open] > summary { background: var(--vk-color-raised); }
.screen .stage .num { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: var(--vk-color-raised); font-size: 0.8125rem; font-weight: 700; }
.screen .stage[open] .num { background: var(--vk-color-primary); color: var(--vk-color-primary-fg); }
.screen .sumline { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-width: 0; }
.screen .sumline .t-h3 { margin-right: 2px; }
.screen .sumrule { flex-basis: 100%; color: var(--vk-color-muted); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.screen .stage-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--vk-space-4); padding: var(--vk-space-4) var(--vk-space-5) var(--vk-space-5) calc(var(--vk-space-5) + 40px); background: var(--vk-color-raised); border-top: 1px solid var(--vk-color-line); }
.screen .stage-body .full { grid-column: 1 / -1; }
.screen .stage-body .input { background: var(--vk-color-surface); }
.screen .seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: var(--vk-radius-sm); background: var(--vk-color-bg); box-shadow: inset 0 0 0 1px var(--vk-color-line); width: fit-content; }
.screen .seg button { min-height: 40px; padding: 0 var(--vk-space-4); border: 0; border-radius: calc(var(--vk-radius-sm) - 2px); background: transparent; color: var(--vk-color-muted); font-size: 0.9375rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.screen .seg button[aria-pressed="true"] { background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: 0 1px 0 var(--vk-color-ground), inset 0 0 0 1px var(--vk-color-line); }
.screen .stage-foot { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: var(--vk-space-2); align-items: center; padding-top: var(--vk-space-2); border-top: 1px solid var(--vk-color-line); }
.screen .row-form { display: flex; flex-wrap: wrap; gap: var(--vk-space-3); align-items: flex-end; }
.screen .copyfield { display: flex; gap: var(--vk-space-2); align-items: stretch; }
.screen .copyfield .input { font-family: var(--vk-font-mono); font-size: 0.875rem; }
.screen .steps { margin: 0; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 4px; font-size: 0.9375rem; }
.screen .formgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--vk-space-3); }
.screen .formgrid .full { grid-column: 1 / -1; }
.screen .empty { padding: var(--vk-space-4); border-radius: var(--vk-radius-sm); border: 1.5px dashed var(--vk-color-line); color: var(--vk-color-muted); font-size: 0.9375rem; }
.screen .code { font-family: var(--vk-font-mono); font-size: 0.8125rem; background: var(--vk-color-raised); padding: 1px 6px; border-radius: 4px; overflow-wrap: anywhere; }

/* page content, Studio only: ink rules, square corners, big Archivo figures */
[data-vibe="studio"] .screen .t-h2 { font-family: var(--vk-font-body); font-weight: 800; font-stretch: 85%; }
[data-vibe="studio"] .screen .panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule); }
[data-vibe="studio"] .screen .chip, [data-vibe="studio"] .screen .count, [data-vibe="studio"] .screen .count-signal { border-radius: 0; }
[data-vibe="studio"] .screen .count, [data-vibe="studio"] .screen .count-signal { font-family: var(--vk-font-mono); }
[data-vibe="studio"] .screen .count-signal { color: var(--vk-face-ink); }
[data-vibe="studio"] .screen .input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised); }
```

Not ported (unused on this artboard, present in the source only because the file shares a preamble): `.tabs`, `.tab`. `.chip-ok`, `.chip-signal`, `.count*`, `.face`, `.panel-head`, `.t-key` stay in screen.css because §4 states use them (SE-G5/G6/G7); if a lint flags unused rules, they may be dropped only together with those states.

Per-vibe summary (all branches above; nothing else varies — fonts, colours, radii, `.vk-button` look and focus rings come from the vibe tokens in vibekit.css):
- **daylight**: base rules only. (Figtree/Bricolage via tokens, radius md 18px, sm 12px.)
- **paper**: `.t-h1`/`.t-h2` weight 500; `.t-eyebrow` italic 15px 400; `.panel` radius `--vk-radius-sm`.
- **studio**: `.t-eyebrow` uppercase 12px 700 tracking 0.1em in body font; `.t-num` mono; `.t-h1` 800 2.5rem/1.04 stretch 82%; `.t-h2` body font 800 stretch 85%; `.panel` radius 0 + 1.5px `--vk-color-rule` top border; `.chip`/`.count` radius 0, counts mono, `.count-signal` ink `--vk-face-ink`; `.input` radius 0, 1px `--vk-color-rule` border, raised background; `.face` radius sm.
- **quiet**: `.t-h1` 1.875rem; every `a` underlined; `.panel` border 1px.

Responsive (the mockup has no media queries; these are the rules for widths below the 1440 design — SE-G8):
```css
@media (max-width: 1099px) { .screen .cols { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 599px) {
  .screen .page { padding: var(--vk-space-5) var(--vk-space-4) var(--vk-space-7); }
  .screen .stage-body { grid-template-columns: minmax(0, 1fr); padding: var(--vk-space-4); }
  .screen .formgrid { grid-template-columns: minmax(0, 1fr); }
  .screen .stage > summary { padding: var(--vk-space-2) var(--vk-space-4); }
  .screen .sec-head, .screen .panel-body { padding-left: var(--vk-space-4); padding-right: var(--vk-space-4); }
  .screen .copyfield { flex-wrap: wrap; }
  .screen .copyfield .input { flex: 1 1 100%; }
}
```
Phone side gutter = 16px (`--vk-space-4`), no horizontal scroll (`.sumrule` ellipsis, `.code` and `.chip` wrap anywhere).

### 3. Markup (port verbatim; Svelte holes shown as `{…}`)

Icons — inline, exactly these (all `aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`):

| Name | Size | Inner markup | Used at |
|---|---|---|---|
| chevron-left | 16 | `<path d="M15 6l-6 6 6 6"/>` | Back to the board |
| check | 16 | `<path d="M5 12.5l4.5 4.5L19 7.5"/>` | Saved, Rule saved |
| info | 16 (20 in `.note`) | `<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.5"/>` | unsaved change, How to write a cadence, GitHub note, error notes |
| person | 14 (16 in `.seg`) | `<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/>` | "A person" chip / seg |
| agent | 14 (16 in `.seg`) | `<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4"/><circle cx="9.5" cy="13.5" r="1"/><circle cx="14.5" cy="13.5" r="1"/>` | "Agent with …" chip / "An agent" seg |
| gate | 14 | `<path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/>` | Approval gate chip |
| chevron-down | 20 | `<path d="M6 9l6 6 6-6"/>` | `.disc-ico` in every stage summary |
| arrow-up | 16 | `<path d="M12 19V5M6 11l6-6 6 6"/>` | Move earlier |
| arrow-down | 16 | `<path d="M12 5v14M6 13l6 6 6-6"/>` | Move later |
| trash | 16 | `<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>` | Remove stage, Remove (schedule) |
| plus | 16 | `<path d="M12 5v14M5 12h14"/>` | Add (stage), Add schedule, Add (profile) |
| github | 22 | `<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>` | GitHub heading |
| copy | 16 | `<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>` | Copy buttons |

(Superseded by `vibekit:Icon`, §0; the paths above are its reference.) Formerly: put them in `lib/components/settings/icons.ts` as `export const ICON: Record<'chevronLeft'|'check'|'info'|'person'|'agent'|'gate'|'chevronDown'|'arrowUp'|'arrowDown'|'trash'|'plus'|'github'|'copy', string>` (inner markup) and render `<svg … width={n} height={n}>{@html ICON.x}</svg>` — constants only, never data.

#### 3.1 Head (BoardSettings.svelte)
```html
<div class="screen"><div class="page">
<div style="display: flex; flex-direction: column; gap: var(--vk-space-2)">
  <a href="/b/{board.boardId}" class="t-meta" style="display: inline-flex; align-items: center; gap: 4px; min-height: 32px; width: fit-content; color: var(--vk-color-muted)">[chevron-left 16]Back to the board</a>
  <p class="t-eyebrow">Board settings</p>
  <h1 class="t-h1">{board.name}</h1>
  <p class="t-body" style="color: var(--vk-color-muted)">Each section saves on its own. Budget caps live in <a href="/b/{board.boardId}/operate/telemetry">Operate → Spend</a>.</p>
</div>
<div class="cols">
  <div class="colstack"><NameSection/><PipelineEditor/></div>
  <div class="colstack"><ScheduleList/><GithubSettings/><AgentProfiles/></div>
</div>
</div></div>
```
Inline `style` attributes are part of the mockup and are ported as-is (they are layout, not colour literals). The back link's min-height 32px is the mockup's value (it is a text link inside a column, accepted as in the mockup; the 44px audit in `vibes.spec.ts` must allow it — note for that spec owner). The Spend link target: the route the SP-Spend spec defines; today that is `/b/{boardId}/operate/telemetry`.

#### 3.2 Name (NameSection.svelte)
```html
<section class="panel" aria-labelledby="nm-h">
  <div class="sec-head"><h2 class="t-h2" id="nm-h">Name</h2>{state}</div>
  <form class="panel-body row-form" onsubmit={(e) => { e.preventDefault(); void saveName(); }}>
    <div class="field" style="flex: 1 1 260px"><label for="bd-name">Board name</label><input id="bd-name" class="input" bind:value={nameInput}></div>
    <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={busy || dirty === false || nameInput.trim() === ''}>{busy ? 'Renaming…' : 'Rename'}</button>
  </form>
  {#if error}<div class="panel-body" style="padding-top: 0"><p class="note" role="alert">[info 20]<span>{error}</span></p></div>{/if}
</section>
```
`dirty = nameInput.trim() !== (board.name ?? '')`. `{state}`: not dirty → `<span class="saved state">[check]Saved</span>`; dirty → `<span class="unsaved state">[info]Unsaved change</span>`.

#### 3.3 Pipeline (PipelineEditor.svelte + StageRow.svelte)
```html
<section class="panel" aria-labelledby="pl-h">
  <div class="sec-head">
    <div style="display: flex; flex-direction: column; gap: 2px"><h2 class="t-h2" id="pl-h">Pipeline</h2><p class="t-meta">{draft.length} {draft.length === 1 ? 'stage' : 'stages'} a card moves through, in order. Open a stage to edit it.</p></div>
    {#if unsavedCount > 0}<span class="unsaved state">[info]{unsavedCount} unsaved {unsavedCount === 1 ? 'change' : 'changes'}</span>{:else}<span class="saved state">[check]Saved</span>{/if}
    <button type="button" class="vk-button vk-button--primary btn-sm" onclick={saveStages} disabled={busy || unsavedCount === 0}>{busy ? 'Saving…' : 'Save pipeline'}</button>
  </div>
  <div>{#each draft as stage, i (stage.key)}<StageRow …/>{/each}</div>
  <form class="panel-body row-form" style="border-top: 1px solid var(--vk-color-line)" onsubmit={(e) => { e.preventDefault(); addStage(); }}>
    <div class="field" style="flex: 1 1 240px"><label for="st-add">Add a stage</label><input id="st-add" class="input" placeholder="Stage name" bind:value={newStageName}></div>
    <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={newStageName.trim() === ''}>[plus]Add</button>
    <p class="hint" style="flex-basis: 100%">A stage's key is made from its name and can't change later. To rename a key, add a stage and remove the old one.</p>
  </form>
  {#if stagesError}<div class="panel-body" style="padding-top: 0"><p class="note" role="alert">[info 20]<span>{stagesError}</span></p></div>{/if}
</section>
```
Note: in the mockup the Add button is `disabled`-less (enabled look) with an empty input. To match pixels the Add button is NOT disabled when empty; `addStage()` already returns on an empty name. Same for "Add schedule" and profile "Add" (mockup shows them enabled with empty fields) — they stay enabled and validate on click (§4.4/4.5). Only Rename is disabled in the mockup, and Save pipeline is enabled because the pipeline is dirty.

StageRow, closed and open (ids must be unique per stage: suffix `-{stage.key}`; the mockup's `st-name`, `st-own`, `st-cap`, `st-wip`, `st-rule` become `st-name-{key}` etc.):
```html
<details class="stage">
  <summary>
    <span class="num t-num">{index + 1}</span>
    <span class="sumline"><span class="t-h3">{stage.name}</span>{ownerChip}{#if stage.gate === 'approval'}<span class="chip">[gate 14]Approval gate</span>{/if}<span class="sumrule">{ruleLine}</span></span>
    <span class="t-meta t-num" style="text-align: right; white-space: nowrap">{cards} {cards === 1 ? 'card' : 'cards'}<br>{stage.wipLimit ? `WIP limit ${stage.wipLimit}` : 'no WIP limit'}</span>
    <span class="disc-ico" aria-hidden="true">[chevron-down 20]</span>
  </summary>
  <div class="stage-body">
    <div class="field"><label for="st-name-{k}">Stage name</label><input id="st-name-{k}" class="input" value={stage.name} oninput={(e) => (stage.name = e.currentTarget.value)}></div>
    <div class="field"><span class="lbl">Key</span><p class="t-body" style="min-height: 44px; display: flex; align-items: center; gap: 8px"><span class="code" style="flex: none; white-space: nowrap">{stage.key}</span><span class="t-meta">fixed — cards, runs and gates refer to it</span></p></div>
    <div class="field full"><span class="lbl" id="st-own-{k}">Who works this stage</span>
      <div class="seg" role="group" aria-labelledby="st-own-{k}"><button type="button" aria-pressed={stage.ownerKind === 'human' || !stage.ownerKind}>[person 16]A person</button><button type="button" aria-pressed={stage.ownerKind === 'capability' || stage.ownerKind === 'agent'}>[agent 16]An agent</button></div></div>
    {#if agentish}
      <div class="field"><label for="st-cap-{k}">Capability</label><input id="st-cap-{k}" class="input" value={ownerText(stage)} onblur={(e) => onOwner(e.currentTarget.value)}><p class="hint">Comma-separated. Agents holding it claim cards here. Saves when you leave the field.</p></div>
      {#if parts.length > 1}
        <div class="field"><span class="lbl" id="st-match-{k}">Agents need</span><div class="seg" role="group" aria-labelledby="st-match-{k}"><button type="button" aria-pressed={!stage.requires?.any} onclick={() => onMatch('all')}>Needs all</button><button type="button" aria-pressed={!!stage.requires?.any} onclick={() => onMatch('any')}>Any one</button></div></div>
      {:else}
        <p class="hint" style="align-self: end">With two or more capabilities, choose “needs all” or “any one” here.</p>
      {/if}
    {/if}
    <div class="field"><label for="st-wip-{k}">WIP limit</label><input id="st-wip-{k}" class="input" type="number" min="0" placeholder="No limit" value={stage.wipLimit ?? ''} onchange={…}></div>
    <div class="field"><span class="lbl">Approval</span><label class="check"><input type="checkbox" checked={stage.gate === 'approval'} onchange={…}><span>Approval gate — a person approves before a card leaves this stage</span></label></div>
    <div class="field full"><label for="st-rule-{k}">Standing rule for this stage</label><textarea id="st-rule-{k}" class="input" placeholder="What every agent that claims a card here should know — pushed to its prompt." onblur={(e) => onRule(e.currentTarget.value)}>{stage.instructions ?? ''}</textarea>
      {#if savedAt !== null}<p class="saved">[check]Rule saved · {ago(savedAt, now)}</p>{/if}</div>
    <div class="stage-foot">
      <button type="button" class="vk-button vk-button--secondary btn-sm" disabled={index === 0} aria-label="Move {stage.name} earlier" onclick={() => onMove(-1)}>[arrow-up]Move earlier</button>
      <button type="button" class="vk-button vk-button--secondary btn-sm" disabled={index === total - 1} aria-label="Move {stage.name} later" onclick={() => onMove(1)}>[arrow-down]Move later</button>
      <span class="t-meta t-num" style="margin-left: auto">{cards} {cards === 1 ? 'card' : 'cards'} here</span>
      <button type="button" class="vk-button vk-button--quiet btn-sm" disabled={cards > 0 || total === 1} aria-label="Remove stage {stage.name}" onclick={onRemove}>[trash]Remove stage</button>
    </div>
    <p class="hint full">A stage holding cards cannot be removed until they are moved; the last stage cannot be removed.</p>
  </div>
</details>
```
`aria-label` on the move/remove buttons repeats the visible label plus the stage name (screen readers get context; pixels unchanged). The textarea uses `value=` (not a child text node) in Svelte: `<textarea … value={stage.instructions ?? ''}>`. The "agent" placeholder text on the textarea is not visible in the mockup (every textarea shown has text) and is today's copy.

`agentish = stage.ownerKind === 'capability' || stage.ownerKind === 'agent'`; `parts = ownerParts(ownerText(stage))`. When `stage.ownerKind === 'agent'` the Capability field is replaced by SE-G11's field.

#### 3.4 Schedules (ScheduleList.svelte)
```html
<section class="panel" aria-labelledby="sc-h">
  <div class="sec-head"><div style="display: flex; flex-direction: column; gap: 2px"><h2 class="t-h2" id="sc-h">Schedules</h2><p class="t-meta">Cards that open themselves on a cadence.</p></div></div>
  <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-4)">
    {#if schedules.length === 0}
      <p class="empty">No recurring cards on this board yet. Each one you add lists its cadence, time zone, target stage, next and last run, and who set it up, with Pause and Remove.</p>
    {:else}
      <ul …SE-G6 rows…></ul>
    {/if}
    <form class="formgrid" aria-label="Add a recurring card" onsubmit={(e) => { e.preventDefault(); void add(); }}>
      <div class="field full"><label for="sc-t">Card title</label><input id="sc-t" class="input" placeholder="e.g. Weekly dependency check" bind:value={title}></div>
      <div class="field"><label for="sc-r">Cadence</label><input id="sc-r" class="input" placeholder="daily at 09:00" bind:value={rule}></div>
      <div class="field"><label for="sc-z">Time zone</label><input id="sc-z" class="input" placeholder="e.g. Asia/Kolkata" bind:value={timezone}></div>
      <div class="field"><label for="sc-s">Opens in stage</label><select id="sc-s" class="input" bind:value={stageKey}><option value="">First stage ({stages[0]?.name})</option>{#each stages.slice(1) as st (st.key)}<option value={st.key}>{st.name}</option>{/each}</select></div>
      <div class="field"><label for="sc-p">Priority</label><input id="sc-p" class="input" type="number" min="1" placeholder="e.g. 2" bind:value={priority}></div>
      <div class="field full"><label for="sc-o">If the previous card is still open</label><select id="sc-o" class="input" bind:value={overlap}><option value="skip">Skip this one</option><option value="allow">Open another anyway</option></select></div>
      <details class="full"><summary class="t-meta" style="min-height: 44px; display: flex; align-items: center; gap: 6px; text-decoration: underline">[info]How to write a cadence</summary>
        <p class="t-meta">every 30 minutes · every 2 hours · every 3 days · daily at 09:00 · weekly on mon at 09:00 · monthly on 1 at 09:00 (day 1–28). Schedules are checked every five minutes, so a card may open up to five minutes late.</p></details>
      {#if formError}<p class="note full" role="alert">[info 20]<span>{formError}</span></p>{/if}
      <div class="full"><button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={busy === 'add'}>[plus]{busy === 'add' ? 'Adding…' : 'Add schedule'}</button></div>
    </form>
  </div>
</section>
```
`bind:value={priority}` on a number input yields a number or null in Svelte 5 — change the `priority` state to `number | null` and the create call to `...(priority !== null ? { priority } : {})`. Empty title / cadence / time zone on submit: set `formError` to `Give the card a title, a cadence and a time zone.` and do not call the API (today it silently returns; the button now stays enabled per the mockup, so it must say why nothing happened).

#### 3.5 GitHub (GithubSettings.svelte)
```html
<section class="panel" aria-labelledby="gh-h">
  <div class="sec-head">[github 22]<h2 class="t-h2" id="gh-h">GitHub</h2><span class="{ghStateClass} state">{ghState}</span></div>
  <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-4)">
    <ol class="steps"><li>In your repository open Settings → Webhooks → Add webhook.</li><li>Paste the payload URL and the secret below. Content type: <span class="code">application/json</span>.</li><li>Turn on “Open a card for each new GitHub issue” and save.</li></ol>
    <div class="field"><label for="gh-url">Payload URL</label><div class="copyfield"><input id="gh-url" class="input" readonly value={webhookUrl}><button type="button" class="vk-button vk-button--secondary btn-sm" onclick={() => copy('url', webhookUrl)}>[copy]{copied === 'url' ? 'Copied' : 'Copy'}</button></div></div>
    <div class="field"><label for="gh-sec">Secret <span class="t-meta" style="font-weight: 400">· {board.github.webhookConfigured ? 'set' : 'not set'}</span></label><div class="copyfield"><input id="gh-sec" class="input" placeholder={board.github.webhookConfigured ? 'Generate or paste a new secret to replace it' : 'Generate or paste a secret'} bind:value={githubSecret}><button type="button" class="vk-button vk-button--secondary btn-sm" onclick={genSecret}>Generate</button><button type="button" class="vk-button vk-button--quiet btn-sm" disabled={githubSecret === ''} aria-label="Copy secret" onclick={() => copy('secret', githubSecret)}>[copy]{copied === 'secret' ? 'Copied' : 'Copy'}</button></div></div>
    <label class="check"><input type="checkbox" bind:checked={issueTrigger}><span>Open a card for each new GitHub issue</span></label>
    <p class="note">[info 20]<span>{grantNote}</span></p>
    {#if error}<p class="note" role="alert">[info 20]<span>{error}</span></p>{/if}
    <div><button type="button" class="vk-button vk-button--primary btn-sm" onclick={saveGithub} disabled={busy}>{busy ? 'Saving…' : 'Save GitHub settings'}</button></div>
  </div>
</section>
```
The secret input is `.copyfield .input` → mono 0.875rem (the mockup's mono placeholder is this rule, not a bug).

#### 3.6 Agent profiles (AgentProfiles.svelte)
```html
<section class="panel" aria-labelledby="ap-h">
  <div class="sec-head"><div style="display: flex; flex-direction: column; gap: 2px"><h2 class="t-h2" id="ap-h">Agent profiles</h2><p class="t-meta">Named run settings (model and so on) an agent can claim with.</p></div></div>
  <div class="panel-body" style="display: flex; flex-direction: column; gap: var(--vk-space-3)">
    {#if profiles === null}<p class="t-meta">Loading profiles…</p>
    {:else if profiles.length === 0}<p class="empty">No profiles yet.</p>
    {:else}<ul …SE-G7 rows…></ul>{/if}
    <form class="row-form" onsubmit={(e) => { e.preventDefault(); void addProfile(); }}>
      <div class="field" style="flex: 1 1 140px"><label for="ap-k">Key</label><input id="ap-k" class="input" placeholder="e.g. opus-careful" bind:value={pKey}></div>
      <div class="field" style="flex: 1 1 140px"><label for="ap-m">Model</label><input id="ap-m" class="input" placeholder="Model name" bind:value={pModel}></div>
      <button type="submit" class="vk-button vk-button--secondary btn-sm" disabled={busy}>[plus]Add</button>
    </form>
    {#if error}<p class="note" role="alert">[info 20]<span>{error}</span></p>{/if}
  </div>
</section>
```

### 4. Content map

| Visible | Source |
|---|---|
| "Back to the board" | copy; href `/b/{board.boardId}` |
| "Board settings" (eyebrow) | copy |
| "Developer Experience" (h1) | `board.name` |
| "Each section saves on its own. Budget caps live in " + link "Operate → Spend" + "." | copy |
| "Name", "Board name", "Rename" | copy |
| "✓ Saved" (Name) | derived: `nameInput.trim() === board.name` |
| Board name input value "Developer Experience" | `nameInput`, seeded once from `board.name` |
| "Pipeline" | copy |
| "7 stages a card moves through, in order. Open a stage to edit it." | `draft.length` + plural rule + copy |
| "ⓘ 1 unsaved change" | `unsavedCount` (§5); SE-G3 |
| "Save pipeline" | copy |
| Stage number 1…7 | `index + 1` in draft order |
| Stage names Reported … Shipped | `stage.name` |
| Owner chip "A person" | `ownerKind` `human` or absent → person icon + "A person", class `chip chip-line` |
| Owner chip "Agent with diagnostics" / "Agent with testing" / "Agent with code" / "Agent with integration or api or testing" | `ownerLabel(stage)` §5, agent icon, class `chip chip-line` |
| "Approval gate" chip (Signed off) | `stage.gate === 'approval'`, class `chip` (filled, not line) |
| "Rule: Describe one problem…" / "Rule: Make the problem happen…" / "No standing rule" | `ruleLine` = `stage.instructions?.trim() ? 'Rule: ' + stage.instructions.trim().replace(/\s+/g, ' ') : 'No standing rule'` (whitespace collapsed; CSS ellipsis clips) |
| "1 card" / "0 cards" / "3 cards" | `cardsPerStage[stage.key] ?? 0` (non-archived only) |
| "no WIP limit" | `stage.wipLimit` absent → "no WIP limit"; else `WIP limit {n}` |
| Open stage fields: "Stage name" value "Reproduce" | `stage.name` (draft) |
| "Key" + `reproduce` + "fixed — cards, runs and gates refer to it" | `stage.key` + copy |
| "Who works this stage", "A person", "An agent" (pressed) | copy; pressed from `ownerKind` |
| "Capability" value "diagnostics" + hint | `ownerText(stage)` + copy |
| "With two or more capabilities, choose “needs all” or “any one” here." | copy (shown when parts ≤ 1) |
| "WIP limit" placeholder "No limit" | copy; value `stage.wipLimit` |
| "Approval" + "Approval gate — a person approves before a card leaves this stage" (unchecked) | copy; checked = `stage.gate === 'approval'` |
| "Standing rule for this stage" + textarea text | copy + `stage.instructions` |
| "✓ Rule saved · 2 min ago" | `ruleSavedAt[key]` + `ago()` §5; SE-G2 |
| "Move earlier", "Move later", "Remove stage" | copy |
| "0 cards here" | `cardsPerStage` + plural |
| "A stage holding cards cannot be removed until they are moved; the last stage cannot be removed." | copy |
| "Add a stage", placeholder "Stage name", "Add", key hint | copy |
| "Schedules", "Cards that open themselves on a cadence." | copy |
| Empty schedules paragraph | copy, when `getSchedules()` returns `[]` |
| Schedule form labels/placeholders/options | copy; "First stage (Reported)" = `First stage (${stages[0].name})`; other options = `stages.slice(1).map(s => s.name)` |
| "How to write a cadence" + body | copy |
| "Add schedule" | copy |
| GitHub icon, "GitHub" | copy |
| "Not set up" | `ghState` §5 |
| Steps 1–3 | copy |
| Payload URL value "https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=…" | `board.github.webhookUrl` (SE-G1); the input clips after ~37 characters at 1440, so the tenant id is never visible in the reference |
| "Secret · not set" | `board.github.webhookConfigured` false → "not set", true → "set" |
| Secret placeholder "Generate or paste a secret" | copy (variant when configured, §3.5) |
| "Generate", "Copy" (disabled, secret) | copy |
| "Open a card for each new GitHub issue" (unchecked) | copy; checked = `issueTrigger` seeded from `board.github.issueTrigger` |
| Note "Saving carries your dispatch authority onto every card this trigger opens. Without it, no agent can claim those cards." | `grantNote`: when `board.github.triggerGrantCount === null` this copy; else `Cards from this trigger may be dispatched to {n} {n === 1 ? 'agent' : 'agents'}. Save again to refresh that.` |
| "Save GitHub settings" | copy |
| "Agent profiles", "Named run settings (model and so on) an agent can claim with." | copy |
| "No profiles yet." | `profiles.length === 0` |
| "Key"/"e.g. opus-careful", "Model"/"Model name", "Add" | copy |
| Studio status footer "Board settings · Developer Experience · 6 cards · 3 need you · synced 13:51" | shell (SE-G13): page label `Board settings · ${board.name}`; card count = non-archived cards; need-you = `itemsFromBoard(board, app.agents).length`; synced = last snapshot time HH:MM UTC |

### 5. Derivations (exact)

```ts
// PipelineEditor.svelte
const cardsPerStage = $derived(board.cards.filter((c) => !c.archivedAt)
  .reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.currentStageKey]: (acc[c.currentStageKey] ?? 0) + 1 }), {}));
// today's code counts archived cards too: on the fixture that reads Reproduce 2, Integrate 1 — wrong.

/** One per stage whose editable fields differ from the saved stage, + 1 if the order differs, + one per added or removed stage. */
const FIELDS = ['name', 'ownerKind', 'owner', 'requires', 'gate', 'wipLimit'] as const;
const norm = (s: Stage) => JSON.stringify(FIELDS.map((f) => s[f] ?? null));
const unsavedCount = $derived.by(() => {
  const saved = new Map(board.stages.map((s) => [s.key, s]));
  const keys = new Set(draft.map((s) => s.key));
  let n = 0;
  for (const s of draft) { const o = saved.get(s.key); if (!o || norm(o) !== norm(s)) n++; }
  for (const k of saved.keys()) if (!keys.has(k)) n++;
  const sameKeys = draft.filter((s) => saved.has(s.key)).map((s) => s.key);
  const savedOrder = board.stages.filter((s) => keys.has(s.key)).map((s) => s.key);
  if (sameKeys.join() !== savedOrder.join()) n++;
  return n;
});
// `instructions` is excluded: rules save on their own (patchStage on blur).

function ownerLabel(stage: Stage): string {           // chip text, agent stages
  if (stage.ownerKind === 'agent') return `Agent ${displayAgent(stage.owner ?? '', app.agents)}`;
  const parts = stage.requires?.any ?? stage.requires?.all ?? (stage.owner ? [stage.owner] : []);
  if (parts.length === 0) return 'Agent with no capability set';
  return `Agent with ${parts.join(stage.requires?.any ? ' or ' : ' and ')}`;
}

// relative time for "Rule saved · …"; `now` updates every 30 s via setInterval in PipelineEditor ($effect with cleanup)
function ago(at: number, now: number): string {
  const m = Math.floor((now - at) / 60_000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}

// GithubSettings.svelte
const ghState = $derived(!board.github.webhookConfigured ? 'Not set up' : board.github.issueTrigger ? 'Opening cards from issues' : 'Connected · trigger off');
const ghStateClass = $derived(board.github.webhookConfigured && board.github.issueTrigger ? 'saved' : 'unsaved');
```
`displayAgent` from `$lib/names`.

### 6. Interactions & states

| Control | Behaviour / call |
|---|---|
| Back to the board | `<a href="/b/{boardId}">` (SvelteKit navigation) |
| Operate → Spend | `<a href>` to the Spend route |
| Board name + Rename (Enter submits) | `renameBoard(boardId, name)` → on `!res.ok` error `Could not rename the board (${res.status}).`; on ok `onChanged()` (→ `app.refresh()`). Disabled while not dirty / empty / busy. |
| Stage `<summary>` | native `<details>` toggle; several may be open at once; none open on first load. Keyboard: summary is focusable, Enter/Space toggle (native). |
| Stage name input | mutates `draft[i].name` (dirty, saved with Save pipeline) |
| A person / An agent seg | A person → `stage.ownerKind = 'human'; delete stage.owner; delete stage.requires`; An agent → `stage.ownerKind = 'capability'` (keeps `owner` if present). `aria-pressed` reflects state. |
| Capability input (blur) | `onOwner(raw)` = today's `setOwner(stage, raw)` (draft only — the hint "Saves when you leave the field" means the value is committed to the draft; Save pipeline persists it) |
| Needs all / Any one seg | today's `setMatch(stage, m)` |
| WIP limit (change) | `stage.wipLimit = v === '' \|\| Number(v) === 0 ? undefined : Number(v)` |
| Approval checkbox | `stage.gate = checked ? 'approval' : 'none'` |
| Standing rule textarea (blur) | `saveRule(stage, text)` → `patchStage(boardId, key, { instructions })`; success sets `ruleSavedAt[key] = Date.now()` and calls `onChanged()`; failure sets `stagesError = 'Could not save the rule for {name} ({status}).'`. Unchanged text: no call. |
| Move earlier / later | today's `move(i, ±1)`; disabled at the ends |
| Remove stage | today's `removeStage(key)`; disabled when the stage holds cards or is the only stage |
| Add stage (Enter / Add) | today's `addStage()`; empty name no-op |
| Save pipeline | `setStages(boardId, draft)`; server message on failure into `stagesError`; success → `onChanged()`, then re-seed `draft` from the refreshed `board.stages` (watch `board.stages` identity after a save; today's `seeded` flag never re-seeds, which would leave `unsavedCount` > 0 after a successful save) |
| Schedules: Add schedule / Enter | `createSchedule(boardId, {...})` (today's `add()`); server message into `formError` |
| Schedule row Pause/Resume, Remove | `updateSchedule(boardId, id, { enabled: !enabled })`, `deleteSchedule(boardId, id)` (SE-G6) |
| How to write a cadence | native `<details>` |
| Copy (URL) | `navigator.clipboard.writeText(webhookUrl)`; label "Copied" for 1600 ms |
| Generate | today's `genSecret()` (24 random bytes hex) |
| Copy (secret) | disabled while `githubSecret === ''`; else writes it, "Copied" 1600 ms |
| Issue checkbox | `issueTrigger` local |
| Save GitHub settings | `setGithubConfig(boardId, { issueTrigger, secret? })`; failure → `Could not save the GitHub settings (${status}).`; success clears secret, `onChanged()` |
| Profiles Add / Enter | `createProfile(boardId, { key, model })`; empty key → error `Give the profile a key.`; failure → `Could not add the profile (${status}).`; success reloads `getProfiles` |

States: hover on `.stage > summary` (raised bg, ported); open stage (raised bg, number circle primary); focus — vibekit `:focus-visible` ring (vk.css base rules) on every control, no local override; disabled buttons — vibekit `.vk-button:disabled` look (Rename and Copy-secret in the reference); busy labels "Renaming…", "Saving…", "Adding…"; loading (no `app.board`) — the route renders `<div class="page"><p class="t-meta" role="status">Loading board settings…</p></div>` (importing the css); profiles loading "Loading profiles…"; errors as `.note` with `role="alert"` (neutral raised box, info icon — not the signal colour; a save error is not "a person is needed now" in the signal's sense).

### 7. Fixture needs (seed, literal values)

Board `brd_134a0ddb6d434478`, name `Developer Experience`, `stale: { enabled: true, afterHours: 24 }`, `github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: 'https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=<seed tenant id>' }`.

Stages (order 0–6; no `wipLimit` on any; `gate` only on signed-off):

| order | key | name | ownerKind | owner / requires | gate | instructions (exact) |
|---|---|---|---|---|---|---|
| 0 | reported | Reported | human | — | — | `Describe one problem a developer hit. What you did, what happened, what you expected. Include the version, commit or environment — a bug report without one costs the reproduce stage its first hour.` |
| 1 | reproduce | Reproduce | capability | owner `diagnostics` | — | `Make the problem happen on purpose. Until it can be reproduced on demand, nothing after this stage can tell a fix from a coincidence.` |
| 2 | test | Failing test | capability | owner `testing` | — | none |
| 3 | fix | Fix | capability | owner `code` | — | none |
| 4 | integrate | Integrate | capability | owner `integration`, requires `{ any: ['integration', 'api', 'testing'] }` | — | none |
| 5 | signed-off | Signed off | human | — | approval | none |
| 6 | shipped | Shipped | human | — | — | none |

(SE-G4: production carries long rules on all seven; the fixture uses the mockup's.)

Cards (non-archived; titles/state as the shared Developer Experience seed — only the stage counts are visible here): reported ×1 `card_ace250c9c25342e4` "Fix the highest-severity blocker found in the clean-room journey" (submitted); test ×3 `card_9ac2116a050840df` "AgentPod: connector interface and generic effects ledger, state machine and executor" (input-required), `card_691a65ff98944697` "Integrate editorial workflows and prove no-write publishing acceptance" (submitted), `card_482b4aa0bdd64c02` "agentpod-connectors: X connector (connector x)" (submitted); fix ×1 `card_e10fb4fe39a9467f` "Superpipeline: manual-delivery completion and approval-subject hardening" (input-required); shipped ×1 `card_8f2c1a5e58294d27` "Build immutable approval subjects and digest-bound gates" (completed). Archived cards may exist (production has 3: two in reproduce, one in integrate) and must NOT be counted — seed at least one archived card in `reproduce` so the archived-exclusion is exercised (expected "0 cards").

Schedules: none (`GET /v1/boards/brd_134a0ddb6d434478/schedules` → `[]`). Profiles: none (`GET …/profiles` → `{ profiles: [] }`). Studio footer additionally needs the shared seed's 3 need-you items and snapshot time 13:51 UTC.

Reference state script (e2e, after `openBoard`): `page.clock.install({ time: '2026-10-11T13:49:00Z' })`; go to `/b/brd_134a0ddb6d434478/settings`; click summary "Reproduce"; in its rule textarea append " x", blur, remove " x", blur (two real PATCHes; ends with the seeded text and `ruleSavedAt` set); `page.clock.fastForward('02:00')`; wait for "Rule saved · 2 min ago"; then the SE-G3 step. Theme/vibe via `setAppearance`.

### 8. Gaps

| Id | Gap | Ruling |
|---|---|---|
| SE-G1 | Payload URL: the client builds it from `location.origin`, so under e2e it reads `http://localhost:…`, not `https://app.superpipeline.dev/…`. | (b) Add `github.webhookUrl: string` to `BoardSnapshot.github` (API `GET /v1/boards/:id` snapshot builder; contract type in `@superpipeline/contract` + `api.ts`): `${env.PUBLIC_APP_ORIGIN}/v1/boards/${boardId}/webhooks/github?tenant=${tenantId}`. `PUBLIC_APP_ORIGIN` is a wrangler var; dev/e2e set it to `https://app.superpipeline.dev`. Client falls back to today's `location.origin` formula when the field is absent (older server). |
| SE-G2 | "Rule saved · 2 min ago" needs a save time; the API stores none and today's UI shows "saved" for 1.6 s only. | (a) Client-side `ruleSavedAt[key] = Date.now()` on a successful `patchStage`, kept for the life of the page, rendered with `ago()`; `now` ticks every 30 s. Reference reached with Playwright clock (§7). No API field. |
| SE-G3 | The reference shows "1 unsaved change" while every visible value equals the saved pipeline — no reachable state renders it. | (c) The mockup combines two states. The app shows `✓ Saved` + disabled Save pipeline when pristine and `ⓘ N unsaved change(s)` + enabled button when dirty (formula §5). For the pixel test, the reference state is made dirty by a change outside the viewport-relevant fields is impossible, so the test masks the Pipeline `.sec-head .state` and its button (one rect) and asserts the dirty variant separately in a DOM test (change Fix's WIP to 2 → "1 unsaved change", summary "WIP limit 2"). Design: re-export the artboard pristine ("✓ Saved", Save pipeline disabled) to drop the mask. |
| SE-G4 | Production stages 2–6 carry long standing rules (and Reported/Reproduce rules are longer, multi-paragraph); the mockup shows "No standing rule" for stages 3–7 and one-paragraph rules. | (a) No code change; `ruleLine` handles both (whitespace collapsed, ellipsis). Fixture uses the mockup's literal values (§7). |
| SE-G5 | GitHub state for a configured board is not in the mockup. | Copy fixed here: `Not set up` (`.unsaved`), `Connected · trigger off` (`.unsaved`), `Opening cards from issues` (`.saved`, with no icon — the mockup's "Not set up" has none). |
| SE-G6 | Filled schedule rows are not drawn (only the empty text that promises: cadence, time zone, target stage, next and last run, who set it up, Pause, Remove). | Rows replace the `.empty` paragraph: `<ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:var(--vk-space-2)">`, each `<li class="note" style="flex-direction:column;gap:4px;background:var(--vk-color-raised)">`: line 1 `<span class="sumline"><span class="t-h3">{title}</span>{!enabled ? <span class="chip chip-line">Paused</span>}</span>`; line 2 `<p class="t-meta">{rule} · {timezone} · opens in {stageName ?? 'the first stage'} · {overlap === 'skip' ? 'skips while the previous card is open' : 'opens another even if the previous is open'}</p>`; line 3 `<p class="t-meta t-num">Next {formatFireTime(nextFireAt, tz)} · last {lastFiredAt ? formatFireTime(lastFiredAt, tz) : 'never'}</p>`; line 4 when `createdBy`: `<p class="t-meta">Set up by {memberName(createdBy)}</p>` (name from `app.members`, never an email/id); line 5 when `skipCount > 0`: `<p class="t-meta">Skipped {n} {n === 1 ? 'time' : 'times'} — the previous card was still open when it came due.</p>`; actions `<div class="row-form"><button class="vk-button vk-button--secondary btn-sm">{enabled ? 'Pause' : 'Resume'}</button><button class="vk-button vk-button--quiet btn-sm" aria-label="Remove schedule {title}">[trash]Remove</button></div>`. |
| SE-G7 | Filled profile list not drawn. | `<ul>` as SE-G6, each `<li class="note" style="justify-content:space-between">` `<span class="code">{key}</span><span class="t-meta">{model ?? 'Default model'}</span>`. Profiles have no delete route in `api.ts`; none is added. |
| SE-G8 | No responsive rules in the mockup; phone 390 must have no side scroll and a 16px gutter. | Rules in §2 (1099px → one column; 599px → single-column forms, 16px gutters). |
| SE-G9 | `--vk-color-rule` (Studio = Annual report) is used by the Studio branch but absent from vendored `vibekit-0.0.1.tgz`. | (b-vibekit) Ship the Annual-report Studio tokens (incl. `--vk-color-rule`, `--vk-face-ink`) in the next vibekit tarball (cross-cutting; the shell/tokens spec owns it). Until then the Studio panel top border renders nothing — do not add a fallback literal. |
| SE-G10 | The reference wraps the key `reproduce` mid-word ("reprodu/ce"): `.code`'s `overflow-wrap: anywhere` inside a 1fr grid cell — violates "no mid-word breaks". | Port verbatim for pixel parity now; design fix requested: inline `white-space: nowrap` is already there but loses to the column width — give the Key field `grid-column: auto` with the stage-name column `minmax(0,1fr)` and the key column `auto`, or drop `overflow-wrap:anywhere` on `.stage-body .code`. Apply only together with a re-exported reference. |
| SE-G11 | `ownerKind: 'agent'` (stage pinned to one agent) is not drawn. | Seg shows "An agent" pressed; the Capability field is replaced by `<div class="field"><label for="st-agent-{k}">Agent</label><select id="st-agent-{k}" class="input">{#each app.agents}<option value={a.id}>{displayAgent(a.id, app.agents)}</option>{/each}</select></div>`; chip `Agent {name}` (§5). Clicking "An agent" on a human stage always yields `capability`. |
| SE-G12 | Loading and error states not drawn. | §6: `.note role="alert"` with the server's message or the fixed sentences given; loading lines "Loading board settings…", "Loading profiles…". |
| SE-G18 | Agent faces: none appear on this artboard (owners are capabilities). | If SE-G11's agent select later shows faces, follow WA-G7 (AgentFace seeded by agent NAME). |
| SE-G13 | Studio status footer text is page-specific but rendered by the shell. | Shell spec's status slot takes `label = 'Board settings · ' + board.name`; counts as in §4. |
| SE-G14 | WIP limit `min="0"` in the mockup vs `min="1"` today; meaning of 0. | Keep `min="0"`; 0 or empty = no limit (`wipLimit` omitted). |
| SE-G15 | Remove-stage hint says "the last stage cannot be removed"; code disables only when it is the only stage. | Keep code semantics (`total === 1`) and the copy verbatim; "last" reads as "last remaining". |
| SE-G16 | Add stage / Add schedule / profile Add look enabled with empty fields in the reference (today they are disabled). | Keep them enabled (pixel parity) and validate on submit with the messages in §3.4/§6; Add stage stays a silent no-op on empty (focus moves to the input). |
| SE-G17 | Today's `seeded` flag never re-seeds the draft after a save, so `unsavedCount` would stay > 0. | Re-seed `draft` from `board.stages` after a successful `setStages` + refresh (§6). |


---

## Spend (SP-Spend)

- **Artboard:** `SP-Spend`, 1440 × 1996 (manifest; the `$preview` hint says 2285, the manifest is the truth), title "Spend · shared".
- **Vibe:** shared. One component; the vibe tweak `vibe ∈ {daylight, paper, studio, quiet}` changes only the `[data-vibe=…]`-scoped rules below. The reference HTML is the Daylight branch (shell = Daylight floating rail + sky top bar, specified elsewhere). Paper, Studio and Quiet use the same markup with their own shell and the per-vibe rules in §Layout.
- **Second tweak `data`:** `as captured ($0.00)` (default, the `zero` branch) and `with spend (placeholder figures)` (the `full` branch). **The pixel test compares the `zero` branch**: production on 11 Oct 2026 13:51 had no usage records on Developer Experience. The `full` branch is the populated layout. Its figures are invented, as the mockup's own `.ph-note` says. The app must render it from real data, so it gets a second, non-pixel fixture (§Fixture B) used only by a structural test. The `.ph-note` banner is **never rendered by the app**; it is mockup copy.
- **Route/state:** `/b/[boardId]/operate/telemetry` with board Developer Experience open and the window set to "Last 7 days". The Board log disclosure is closed and the log is collapsed to 8 rows.

### vibekit components used

This supersedes the screen.css note for reusable patterns. The mockup CSS quoted in §Layout for these pieces is **reference for vibekit:<Name>, not app CSS**; the app ports only the screen-specific composition: `.tiles`, `.grid2`, `.chart/.col/.days`, `.rrow/.money`, `.log/.lrow/.time/.raw`, `.capform`.

| Component | Props (TypeScript) | Where used | CSS reference |
|---|---|---|---|
| `vibekit:Button` | `{ variant: 'primary' \| 'secondary' \| 'quiet'; size?: 'sm'; href?: string; type?: 'button' \| 'submit'; disabled?: boolean; onclick?: () => void; children: Snippet; iconEnd?: Snippet }` | Save caps (primary sm submit), Open the full board log (secondary sm href, chevron-right), Show all N events / Try again (quiet sm) | `.vk-button*`, `.btn-sm`, `.vk-button--quiet` |
| `vibekit:Segmented` | `{ label: string; options: Array<{ value: string; label: string }>; value: string; onchange: (v: string) => void }` (renders `role="group"` + `aria-pressed` buttons) | Time window: `label="Time window"`, options 7d "Last 7 days" / 5h "Last 5 hours" | `.seg`, `.seg button`, `[aria-pressed="true"]` |
| `vibekit:Panel` | `{ heading: string; headingId?: string; level?: 2; ariaLabel?: string; meta?: Snippet /* after heading */; aside?: Snippet /* margin-left:auto */; children: Snippet; bodyPadded?: boolean }` | Spend by day, By agent, By board, By model, Top spenders, Budget caps, Coming next, Board log | `.panel`, `.panel-head`, `.panel-body`, `.t-h2` + Paper/Quiet/Studio `.panel` overrides |
| `vibekit:FigureTile` | `{ label: string; value: string; meter?: { pct: number; label: string; signal?: boolean }; note?: Snippet }` | The 4 tiles (Spend vs budget with meter, Average cost per card, Tokens, Unpriced records) | `.tile`, `.big` (+ studio/paper `.big`), `.t-eyebrow`, `.bar`, `.bar > i` |
| `vibekit:Meter` | `{ pct: number; label?: string /* role=img aria-label when set, else aria-hidden */; signal?: boolean }` | Tile 1 bar; bars in every `.rrow` | `.bar`, `.bar > i` |
| `vibekit:AgentChip` | `{ name: string; agentId: string; iconUrl?: string \| null; mood?: Mood; size?: 20 \| 24 \| 32; variant?: FaceVariant /* here always 'mood' */ }` (face + name; seed = name, WA-G7) | By agent rows (size 24, mood resting) | `.face`, `.face svg`, studio `.face` |
| `vibekit:EmptyState` | `{ title: string; detail?: string }` | Empty By agent / board / model / card panels, no events, events error, "Loading spend…" | `.emptyp` |
| `vibekit:Field` | `{ id: string; label: string; prefix?: string; inputmode?: 'decimal'; placeholder?: string; value: string; invalid?: boolean; describedBy?: string }` | Board cap, Card cap (prefix "$", placeholder "none") | `.field`, `.field label`, `.input`, `.money-in*`, studio `.input` |
| `vibekit:SaveStatus` | `{ state: 'unsaved' \| 'saved'; children: Snippet }` | Budget caps head status ("No caps set" / "Caps saved") | `.saved`, `.unsaved` |
| `vibekit:Disclosure` | `{ summary: string; open?: boolean; children: Snippet }` (chevron rotates) | Show raw event names | `details > summary`, `.disc-ico`, `details[open] …` |
| `vibekit:CopyChip` | `{ text: string /* shown, e.g. "#e10fb4" */; value: string /* copied */; label: string /* aria-label */ }` | Board log card id chips | `.idchip` |
| `vibekit:Footnote` | `{ children: Snippet; tone?: 'muted' \| 'signal' }` | Budget caps hint, validation/save error hint | `.hint` |
| `vibekit:Skeleton` | not used; loading uses "—" and EmptyState text (see §Interactions) | — | — |

The type scale (`.t-h1`, `.t-eyebrow`, `.t-body`, `.t-meta`, `.t-num`) is taken to be vibekit base typography (or `screen.css` until vibekit ships it). The screen uses the class names as-is.

### Component tree

| File (under `apps/web/src`) | Action |
|---|---|
| `routes/b/[boardId]/operate/telemetry/+page.svelte` | **Modify.** Delete the `<div class="p-3">` wrapper and the `← Operate` link (the back link moves into the screen). Body becomes `<Telemetry />` only. |
| `lib/components/Telemetry.svelte` | **Rewrite** (keep the file path and the default export). It renders the whole screen below the shell: header, tiles, by-day chart, the six-panel grid, the board log. All Tailwind classes and the `tele-*` classes are deleted. The `<style>` block is ported from the mockup (§Layout). |
| `lib/components/operate/spend-format.ts` | **New.** Pure helpers, unit-tested: `usd`, `compactCount`, `pctOf`, `dayRange`, `dayLabel`, `barHeight`, `shortTitle`, `shortId`, `eventLabel`, `pluralCards`. Signatures are in §Content map. |
| `lib/components/operate/BudgetCaps.svelte` | **New.** The "Budget caps" panel, shared by Telemetry and Operate's Spend. Props: `{ id?: string }` (default `'caps'`; the section's DOM id, the target of "Set a cap"). It reads `app.board.usage` and `app.boardId` and calls `setBudget` (§Interactions). It has its own copy of the `.panel/.panel-head/.panel-body/.field/.input/.money-in/.capform/.hint/.unsaved/.saved/.btn-sm` CSS from §Layout. |
| `lib/components/operate/BoardLog.svelte` | **New.** The "Board log" panel. Props: `{ events: BoardEvent[]; error: string | null; collapsedRows?: number /*default 8*/; fullLogHref: string | null }`. `fullLogHref` is null on the full-log route itself, which hides that button. |
| `routes/b/[boardId]/operate/log/+page.svelte` | **New** (gap SN-G6). Renders `<BoardLog events={…limit 500} collapsedRows={Infinity} fullLogHref={null} />` under a `Back to Operate · spend` link, with the same `.page` wrapper. |
| `lib/components/operate/Spend.svelte` | **Modify.** Replace its inline editor (`editing`, `boardCap`, `cardCap`, `save`, `startEdit`) with `<BoardCaps id="op-caps" />` so both surfaces share one form. Operate's own look is specified in the Operate section. Only the caps form is shared. The `detail` link keeps `href="/b/{app.boardId}/operate/telemetry"`. |
| `lib/api.ts` | **Modify:** `UsageSummary.byDay` (SN-G1). Add `getWorkspaceUsage` only if SN-G2 is later upgraded; it is not needed now. |
| `lib/components/AgentFace.svelte` | Reused: `variant="mood"`, `size={24}`, `mood="resting"`, `nameShown`. The face seed is the agent **name** (Workspace-Agents ruling WA-G7, which modifies AgentFace once for every screen). |

Svelte 5 runes. Telemetry state:

```ts
let window_ = $state<'7d' | '5h'>('7d');
let usage = $state<UsageSummary | null>(null);          // getUsage(boardId, window_)
let week = $state<UsageSummary | null>(null);           // getUsage(boardId, '7d'), for byDay (the chart is always 7 days)
let boardTotals = $state<Array<{ boardId: string; name: string; costUsd: number }> | null>(null); // SN-G2
let loading = $state(false);
let usageError = $state<string | null>(null);
let events = $state<BoardEvent[]>([]);                  // getBoardEvents(boardId, 60)
let eventsError = $state<string | null>(null);
```

Keep the `$effect` re-fetch on `[app.boardId, window_]`. When `window_ === '7d'`, `week = usage`, so there is no second fetch. Fetch the board totals in parallel (SN-G2). Keep the existing `getUsage` semantics: it throws on failure, and a failure is never shown as $0.00.

### Layout & CSS

Root markup (the shell supplies `<main id="main">`; if the shell spec does not, use `<main class="page" id="main">` here instead of the `<div>`):

```svelte
<div class="page sn">
  <div class="sn-head"> back link · eyebrow · title row with .seg </div>
  <div class="tiles"> 4 × .panel.tile </div>
  <section class="panel" aria-labelledby="day-h"> Spend by day </section>
  <div class="grid2"> By agent · By board · By model · Top spenders · <BudgetCaps/> · Coming next </div>
  <BoardLog …/>
</div>
```

`.sn-head` replaces the mockup's inline `style="display: flex; flex-direction: column; gap: var(--vk-space-2)"`. **Every mockup inline style is kept as written, as an inline `style` or as a named rule with identical declarations**: the back link, the title row, the `flex: 1 1 320px` title block, the `margin-left: auto` metas, the `.rrow` card-row column override, the log's link cell. They are listed in §Content map next to the element.

**Shared stylesheet (coordination with the Workspace-Agents section, `lib/styles/screen.css`).** Every rule below under "type system", "page", "shared pieces" and the Studio `.t-h2/.panel/.input` overrides is byte-identical to the rules in that file. Checked by diffing SP-Spend against SP-Workspace-Agents: the only Spend-only rules are those under "/* ---- spend ---- */", plus the `.log/.lrow/.time/.idchip/.raw` and `.capform/.money-in` blocks. So:

- Telemetry, BudgetCaps and BoardLog **do not re-declare** the shared rules. They reference them by class name, from `screen.css` (`.screen`-scoped). The Telemetry root is `<div class="screen sn"><div class="page">…</div></div>`, and the route `operate/log` uses the same root.
- The shared rules are quoted below only so the reader can check them; the implementer ports **only** the Spend-only blocks into component `<style>`.
- Spend's additions to merge into `screen.css`: none. Every Spend-only rule stays component-scoped. If the Settings section also needs `.seg`, `.money-in` or `.emptyp`, move them into `screen.css` then.
- Root-level rules: `.sn a`, `.sn button`, `.sn input…` and `.sn { font-size: 1rem; line-height: 1.5 }` replace the mockup's `.app` rules. If `screen.css` already carries equivalents under `.screen`, drop them here.

Port this CSS (reusable-pattern rules = reference for the vibekit components above, not app CSS) verbatim into `Telemetry.svelte` `<style>` (and the subsets into BudgetCaps and BoardLog). Renames:

- `.app` becomes `.sn` (the root). The mockup's `.app` rules are page-level. `.app *` box-sizing is already global in app.css, so drop it.
- `.page` is kept.
- Every `[data-vibe="x"] .foo` becomes `:global([data-vibe="x"]) .foo`.
- `.face svg` becomes `.face :global(svg)`.
- `.vk-button--quiet` becomes `.sn :global(.vk-button--quiet)`.
- `details > summary…` becomes scoped `details > summary`.

Shell rules (`.vs-*`, lines 103–257 of the mockup's style block, including every `[data-vibe="studio"] .vs-*`) are **not** ported here; they belong to the shell spec.

```css
.sn { font-size: 1rem; line-height: 1.5; }
.sn a { color: var(--vk-color-text); text-underline-offset: 3px; }
.sn button { font-family: var(--vk-font-body); }
.sn input, .sn select, .sn textarea { font-family: var(--vk-font-body); font-size: 16px; color: var(--vk-color-text); }

/* ---- type system: one scale, every screen ---- */
.t-h1 { margin: 0; font: 700 2rem/1.15 var(--vk-font-display); letter-spacing: -0.01em; }
.t-h2 { margin: 0; font: 700 1.25rem/1.3 var(--vk-font-display); }
.t-h3 { margin: 0; font: 700 1rem/1.35 var(--vk-font-body); }
.t-eyebrow { margin: 0; font: 600 0.8125rem/1.3 var(--vk-font-display); letter-spacing: 0.04em; color: var(--vk-color-muted); }
.t-body { margin: 0; font-size: 1rem; line-height: 1.55; }
.t-meta { margin: 0; font-size: 0.875rem; line-height: 1.45; color: var(--vk-color-muted); }
.t-num { font-variant-numeric: tabular-nums; }
.t-key { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); overflow-wrap: anywhere; }
:global([data-vibe="studio"]) .t-eyebrow { font-family: var(--vk-font-body); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
:global([data-vibe="studio"]) .t-num { font-family: var(--vk-font-mono); }
:global([data-vibe="studio"]) .t-h1 { font: 800 2.5rem/1.04 var(--vk-font-body); font-stretch: 82%; letter-spacing: -0.02em; }
:global([data-vibe="paper"]) .t-h1, :global([data-vibe="paper"]) .t-h2 { font-weight: 500; }
:global([data-vibe="paper"]) .t-eyebrow { font-style: italic; letter-spacing: 0.01em; font-size: 0.9375rem; font-weight: 400; }
:global([data-vibe="quiet"]) .t-h1 { font-size: 1.875rem; }
:global([data-vibe="quiet"]) .sn a { text-decoration: underline; }

/* ---- page ---- */
.page { width: 100%; max-width: 1280px; margin: 0 auto; padding: var(--vk-space-6) var(--vk-space-6) var(--vk-space-7); display: flex; flex-direction: column; gap: var(--vk-space-5); }

/* ---- shared pieces ---- */
.panel { background: var(--vk-color-surface); border: 1px solid var(--vk-color-line); border-radius: var(--vk-radius-md); }
.panel-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--vk-space-3); padding: var(--vk-space-4) var(--vk-space-5); border-bottom: 1px solid var(--vk-color-line); }
.panel-body { padding: var(--vk-space-4) var(--vk-space-5); }
.btn-sm { min-height: 44px; padding: 0 var(--vk-space-4); font-size: 0.9375rem; }
.sn :global(.vk-button--quiet) { padding: 0 var(--vk-space-3); }
.face { display: inline-block; flex: none; line-height: 0; }
.face :global(svg) { display: block; width: 100%; height: 100%; }
:global([data-vibe="studio"]) .face { border-radius: var(--vk-radius-sm); }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field label, .field .lbl { font-size: 0.875rem; font-weight: 600; }
.input { width: 100%; min-height: 44px; padding: 0 var(--vk-space-3); border: 1.5px solid var(--vk-color-faint); border-radius: var(--vk-radius-sm); background: var(--vk-color-surface); color: var(--vk-color-text); font-size: 16px; }
.hint { margin: 0; font-size: 0.8125rem; color: var(--vk-color-muted); }
.saved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-success-text); }
.unsaved { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--vk-color-muted); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
.disc-ico { transition: transform var(--vk-motion-fast) var(--vk-motion-easing); display: inline-grid; }
details[open] > summary .disc-ico { transform: rotate(180deg); }
:global([data-vibe="quiet"]) .panel { border-width: 1px; }
:global([data-vibe="paper"]) .panel { border-radius: var(--vk-radius-sm); }

/* ---- spend ---- */
.tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--vk-space-4); }
.tile { padding: var(--vk-space-4) var(--vk-space-5); display: flex; flex-direction: column; gap: 6px; }
.big { margin: 0; font: 700 2rem/1.1 var(--vk-font-display); font-variant-numeric: tabular-nums; }
:global([data-vibe="studio"]) .big { font: 900 3rem/.9 var(--vk-font-body); font-stretch: 72%; letter-spacing: -0.03em; }
:global([data-vibe="paper"]) .big { font-weight: 500; }
.bar { height: 8px; border-radius: var(--vk-radius-pill); background: var(--vk-color-raised); overflow: hidden; }
.bar > i { display: block; height: 100%; background: var(--vk-color-primary); border-radius: inherit; }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--vk-space-4); align-items: start; }
.chart { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--vk-space-3); align-items: end; height: 220px; padding: var(--vk-space-4) var(--vk-space-5) 0; border-bottom: 1px solid var(--vk-color-line); }
.col { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; height: 100%; }
.col .b { width: min(56px, 70%); border-radius: var(--vk-radius-sm) var(--vk-radius-sm) 2px 2px; background: var(--vk-color-primary); min-height: 2px; }
.col .b.zero { background: var(--vk-color-line); }
.days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--vk-space-3); padding: var(--vk-space-2) var(--vk-space-5) var(--vk-space-4); text-align: center; }
.rrow { display: grid; grid-template-columns: 24px minmax(0, 1.1fr) minmax(0, 1fr) 64px; gap: var(--vk-space-3); align-items: center; min-height: 48px; padding: 0 var(--vk-space-5); border-top: 1px solid var(--vk-color-line); }
.rrow:first-child { border-top: 0; }
.rrow.here { background: var(--vk-color-raised); }
.money { text-align: right; font-variant-numeric: tabular-nums; }
:global([data-vibe="studio"]) .money { font-family: var(--vk-font-mono); font-size: 0.875rem; }
.emptyp { padding: var(--vk-space-4) var(--vk-space-5); display: flex; flex-direction: column; gap: 4px; }
.seg { display: inline-flex; gap: 4px; padding: 4px; border-radius: var(--vk-radius-md); background: var(--vk-color-raised); }
.seg button { min-height: 40px; padding: 0 var(--vk-space-4); border: 0; border-radius: calc(var(--vk-radius-md) - 4px); background: transparent; color: var(--vk-color-muted); font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
.seg button[aria-pressed="true"] { background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: 0 var(--vk-lift) 0 var(--vk-color-ground); }

/* Studio = Annual report, page content only */
:global([data-vibe="studio"]) .t-h2 { font-family: var(--vk-font-body); font-weight: 800; font-stretch: 85%; }
:global([data-vibe="studio"]) .panel { border-radius: 0; border-top: 1.5px solid var(--vk-color-rule); }
:global([data-vibe="studio"]) .input { border-radius: 0; border-color: var(--vk-color-rule); border-width: 1px; background: var(--vk-color-raised); }
```

`BoardLog.svelte` additionally carries:

```css
.log { list-style: none; margin: 0; padding: 0; }
.lrow { display: grid; grid-template-columns: 86px minmax(0, 1fr) auto; gap: var(--vk-space-3); align-items: center; min-height: 44px; padding: 4px var(--vk-space-5); border-top: 1px solid var(--vk-color-line); }
.lrow:first-child { border-top: 0; }
.time { font-family: var(--vk-font-mono); font-size: 0.8125rem; color: var(--vk-color-muted); }
.idchip { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); background: var(--vk-color-raised); border: 0; border-radius: 4px; padding: 2px 6px; min-height: 28px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.raw { font-family: var(--vk-font-mono); font-size: 0.75rem; color: var(--vk-color-muted); overflow-wrap: anywhere; grid-column: 2 / -1; }
```

`BudgetCaps.svelte` additionally carries:

```css
.capform { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto; gap: var(--vk-space-3); align-items: end; }
.money-in { position: relative; }
.money-in span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--vk-color-muted); }
.money-in .input { padding-left: 26px; }
```

Rules in the mockup's shared block that this screen does not use (`.chip*`, `.count*`, `.tabs/.tab`, `.check`, `.note`, `textarea.input`, `.input[readonly]`, `.ph-note`, and the Studio `.chip/.count` overrides) are **not** ported.

**Per-vibe branches, all covered by the rules above.** The page has no other per-vibe differences:

- **daylight:** base rules.
- **paper:**
  - h1 and h2 at weight 500.
  - Italic 15px eyebrow.
  - Panels at `radius-sm`.
  - `.big` at weight 500.
- **studio:**
  - Uppercase 12px body-font eyebrow.
  - Mono `.t-num` and `.money`.
  - 40px/800 condensed h1.
  - h2 at 800 condensed.
  - Square panels with a 1.5px `--vk-color-rule` top rule.
  - `.big` at 48px/900 condensed.
  - Square inputs on `raised`.
  - Faces at `radius-sm`.
- **quiet:**
  - h1 at 30px.
  - Every link in `.sn` underlined.
  - Panel border 1px.

Fonts and colours come from the vibe's tokens.

**Responsive.** The mockup has no phone artboard and no `@media` rules. These rules are added to meet the brief's 390 / 16px-gutter / no-side-scroll requirement, using only existing tokens and track definitions (gap SN-G7):

```css
@media (max-width: 1099px) { .tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid2 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 599px)  { .page { padding: var(--vk-space-4) var(--vk-space-4) var(--vk-space-7); }
                             .capform { grid-template-columns: minmax(0, 1fr); }
                             .chart { gap: var(--vk-space-1); padding: var(--vk-space-4) var(--vk-space-3) 0; }
                             .days { gap: var(--vk-space-1); padding: var(--vk-space-2) var(--vk-space-3) var(--vk-space-4); }
                             .chart .col > .t-meta { font-size: 0.75rem; }
                             .lrow { grid-template-columns: 72px minmax(0, 1fr); } .lrow > :nth-child(3) { grid-column: 2 / -1; } }
```

### Content map

**Header**

| Element | Value | Source |
|---|---|---|
| Back link | `<a href="/b/{app.boardId}/operate" class="t-meta" style="display: inline-flex; align-items: center; gap: 4px; min-height: 32px; width: fit-content; color: var(--vk-color-muted)">` + chevron-left svg `<path d="M15 6l-6 6 6 6"/>` (16px, stroke 1.8) + **"Back to Operate"** | copy |
| Eyebrow `p.t-eyebrow` | **"Operate · spend, in detail"** | copy |
| Title row | `div style="display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--vk-space-4)"`; inner `div style="flex: 1 1 320px; display: flex; flex-direction: column; gap: 4px"` | — |
| `h1.t-h1` | **"Agent spend"** | copy |
| Subline `p.t-body style="color: var(--vk-color-muted)"` | `{board.name} · what agents cost, by day, agent, board, model and card.` → "Developer Experience · what agents cost, by day, agent, board, model and card." | `app.board.name` + copy |
| `.seg role="group" aria-label="Time window"` | buttons **"Last 7 days"** (`aria-pressed={window_==='7d'}`), **"Last 5 hours"** (`aria-pressed={window_==='5h'}`) | `window_` |

**Tiles** (each `.panel.tile`, eyebrow `p.t-eyebrow`, figure `p.big`, note `p.t-meta`). Let `U = usage` (the window) and `B = app.board.usage`.

| Tile | Eyebrow | Figure | Below |
|---|---|---|---|
| 1 | **"Spend vs budget"** | `usd(B.totalCostUsd)` → "$0.00". This is lifetime spend, what the cap gates (SN-G3). | `.bar role="img" aria-label="{p}% of budget used"` with `<i style="width: {p}%">` where `p = B.budgetUsd ? pctOf(B.totalCostUsd, B.budgetUsd, clamp 100) : 0`. Then `p.t-meta`. Cap null: **"No budget cap set · "** + `<a href="#caps">Set a cap</a>` (click focuses `#cap-b`). Cap set: `of a {usd(cap)} board cap · {p}% used` (placeholder: "of a $25.00 board cap · 57% used"). When `B.overBudget`, append **" · over the cap"** and give the `.bar > i` `background: var(--vk-color-signal)` (a person is needed now). |
| 2 | **"Average cost per card"** | `n = U.byCard.filter(c => c.costUsd > 0).length`; `n === 0 ? '—' : usd(U.totalCostUsd / n)`. Placeholder: "$3.55". | `{n} {pluralCards(n)} with spend in this window` → "0 cards with spend in this window" (placeholder "4 cards …"). `pluralCards(1) = 'card'`. |
| 3 | **"Tokens"** | `compactCount(U.totalInputTokens + U.totalOutputTokens)` → "0" (placeholder "1.9M"). | `{compactCount(in)} in · {compactCount(out)} out` → "0 in · 0 out" (placeholder "1.6M in · 0.3M out"). |
| 4 | **"Unpriced records"** | `String(U.unpricedRecords)` → "0" | **"Usage records without cost data"** |

`compactCount(n)`:
- `n < 1000` → `String(n)`
- `n < 1e6` → `(n/1e3).toFixed(1)+'k'`
- else `(n/1e6).toFixed(1)+'M'`
- 0 → "0"

The placeholder "0.3M" follows the M branch because the summed total decides the unit. Rule: `compactCount(x, unit?)`. The "in · out" pair uses the unit chosen for the total, so 300 000 renders "0.3M". `usd(n) = '$' + n.toFixed(2)`. `pctOf(a, max) = Math.round(a / max * 100)`.

**Spend by day** (`section.panel aria-labelledby="day-h"`)

- `.panel-head`:
  - `h2.t-h2#day-h` **"Spend by day"**.
  - `span.t-meta` `dayRange(days)` → **"Monday 5 to Sunday 11 October"**. Weekday long, day number, month once when both days share it; else `"Monday 28 September to Sunday 4 October"`. UTC.
  - `span.t-meta.t-num style="margin-left: auto"`: when every day is 0, **"No spend recorded in these 7 days."**; else `Busiest: {dayLabel(max)} · {usd(max.costUsd)}` (placeholder "Busiest: Fri 9 · $4.10"). Ties go to the latest day.
- `days` = the 7 UTC dates ending today (today = `new Date()` UTC; the fixture clock is 2026-10-11T13:51Z), each `costUsd` from `week.byDay` (SN-G1), 0 when absent. The chart **always shows 7 days, whatever the window** (the heading names its range).
- `.chart role="img" aria-label="Spend per day, Mon 5 $0.00, Tue 6 $0.00, Wed 7 $0.00, Thu 8 $0.00, Fri 9 $0.00, Sat 10 $0.00, Sun 11 $0.00"` (join `` `${dayLabel} ${usd}` `` with ", ").
- Per day: `div.col` > `span.t-meta.t-num` `usd(cost)` + `span.b` (class `zero` when cost is 0) with `style="height: {barHeight}px"`. `barHeight = cost === 0 ? 2 : Math.max(2, Math.round(cost / maxCost * 170))`. This matches the placeholder: 1.20→50, 3.40→141, 0.80→33, 2.90→120, 4.10→170, 1.00→41.
- `.days aria-hidden="true"`: 7 × `span.t-meta` `dayLabel` → "Mon 5" … "Sun 11" (`Intl` en-GB weekday short + UTC day).

**grid2 panels** (each `section.panel` with `.panel-head` > `h2.t-h2`):

| Panel | aria-label / heading | Head extra | Empty (zero branch: shown verbatim) | Populated |
|---|---|---|---|---|
| By agent | `aria-label="Spend by agent"`, **"By agent"** | — | `.emptyp`: `p.t-body` **"No agent cost data yet."** + `p.t-meta` **"Agents on this board have not reported cost in this window. When they do, each shows with its face, a bar and its total."** | `ul style="list-style: none; margin: 0; padding: 0"` of `li.rrow`: `span.face style="width: 24px; height: 24px"` > `AgentFace agentId name size=24 mood="resting" variant="mood" nameShown` (SN-G5); `span.t-body style="overflow-wrap: anywhere; font-size: 0.9375rem"` `displayAgent(agentId, app.agents)`; `span.bar aria-hidden="true"` > `i style="width: {pctOf(cost, max)}%"`; `span.money.t-num` `usd(cost)`. Rows with `costUsd > 0` only, API order (desc). Empty when there are none. |
| By board | `aria-label="Spend by board"`, **"By board"** | `span.t-meta` **"all your boards"** | `p.t-body` **"No board recorded spend."** + `p.t-meta` **"Your boards side by side, this one highlighted, once any of them records cost."** | Rows from `boardTotals` (SN-G2), desc, **every board including $0.00 ones**. Empty only when all are 0. `li.rrow` (+ `.here` when `boardId === app.boardId`): `<span></span>`; name `span.t-body` (same inline style) + for `.here` `<span class="t-meta">· this board</span>`; bar; money. |
| By model | `aria-label="Spend by model"`, **"By model"** | — | `p.t-body` **"No model cost data yet."** + `p.t-meta` **"Each model the agents used, with its total."** | `U.byModel` with `costUsd > 0`; `<span></span>`, `model` verbatim (`(unknown)` → **"Model not reported"**), bar, money. |
| Top spenders | `aria-label="Top spenders by card"`, **"Top spenders · by card"** | — | `p.t-body` **"No card cost data yet."** + `p.t-meta` **"The eight cards that cost the most, linked to the card."** | `ol style="list-style: none; margin: 0; padding: 0"`, first 8 of `U.byCard` with `costUsd > 0`. `li.rrow style="grid-template-columns: 24px minmax(0, 1fr) 64px"`: `span.t-meta.t-num` rank (1…); `<a href="/b/{boardId}/c/{cardId}" class="t-body" style="font-size: 0.9375rem; overflow-wrap: anywhere">` = `app.cardById(cardId)?.title ?? 'Card ' + shortId(cardId)`; `span.money.t-num`. |
| Budget caps | `<BudgetCaps id="caps" />` | see below | | |
| Coming next | `aria-label="Coming next"`, **"Coming next"** | — | `.panel-body` > `p.t-body style="color: var(--vk-color-muted)"` **"Success rate, time in stage, throughput and gate rejections arrive with telemetry aggregation (tier 2)."** | same |

**BudgetCaps**: `section.panel id={id} aria-labelledby="{id}-h"`.

- `.panel-head`:
  - `h2.t-h2` **"Budget caps"**.
  - Status `span style="margin-left: auto"`:
    - Both caps null: `.unsaved` **"No caps set"**.
    - Else: `.unsaved` `Board {usd|none} · card {usd|none}`, e.g. "Board $25.00 · card none".
    - For 4 s after a successful save: `.saved` with check svg (`<path d="M5 12l5 5 9-10"/>`, 16px, stroke 1.8) **"Caps saved"**.
- `.panel-body style="display: flex; flex-direction: column; gap: var(--vk-space-3)"`.
- `form.capform aria-label="Budget caps"`:
  - `.field`: `label for="{id}-b"` **"Board cap"** (SN-G3; the mockup's "Board cap, per 7 days"), `div.money-in` > `<span>$</span>` + `input#{id}-b.input.t-num inputmode="decimal" placeholder="none"`.
  - `.field`: **"Card cap"**, `input#{id}-c`.
  - `button type="submit" class="vk-button vk-button--primary btn-sm"` **"Save caps"**.
- `p.hint` **"The card cap draws the cost bar on each card. A card over its cap shows in Needs you. The same caps are editable from Operate → Spend."** On Operate (`id === 'op-caps'`) the last sentence reads **"The same caps are editable from Spend, in detail."**
- The tile's "Set a cap" targets `#caps` and focuses `#caps-b` (the default id is `caps`, so the board input id is `caps-b`).

**BoardLog**: `section.panel aria-labelledby="log-h"`.

- `.panel-head`:
  - `h2.t-h2#log-h` **"Board log"**.
  - `span.t-meta` `last {events.length} events, newest first · times in UTC` (fixture: 60 → "last 60 events, newest first · times in UTC"; `1 event` singular).
  - `<a href={fullLogHref} class="vk-button vk-button--secondary btn-sm" style="margin-left: auto; text-decoration: none">` **"Open the full board log"** + chevron-right svg `<path d="M9 6l6 6-6 6"/>`.
- `ol.log`: events reversed (newest first), first `collapsedRows` (8) unless expanded. Each `li.lrow`:
  - `span.time` = `ts.slice(11,19)`.
  - `span.t-body style="font-size: 0.9375rem"` = `eventLabel(e, notificationsBySeq)`.
  - Third cell: `<span></span>` when the event has no `payload.cardId`; else `span style="display: inline-flex; gap: 8px; align-items: center; min-width: 0"` > `<a href="/b/{boardId}/c/{cardId}" class="t-meta" style="overflow-wrap: anywhere">{shortTitle(title)}</a>` + `<button type="button" class="idchip" aria-label="Copy card id {shortId}">#{shortId}</button>`.
- `.panel-body style="border-top: 1px solid var(--vk-color-line); display: flex; flex-direction: column; gap: var(--vk-space-2)"`:
  - When `events.length > collapsedRows`: `button.vk-button.vk-button--quiet.btn-sm style="align-self: flex-start"`, label **`Show all {events.length} events`** → "Show all 60 events"; once expanded **`Show the latest 8`**.
  - `details` > `summary.t-meta style="min-height: 44px; display: flex; align-items: center; gap: 6px"` > `span.disc-ico` (chevron-down `<path d="M6 9l6 6 6-6"/>`) + `span style="text-decoration: underline"` **"Show raw event names"**. Body: `ol.log` of every loaded event (not only the visible 8): `li.lrow` > `span.time` + `span.raw` = `` `${e.type}${summary ? ' ' + summary : ''}` `` where `summary` = the existing `eventSummary(e)` (keys `cardId, agentId, to, from, name, reason, decision`, joined `' · '`). Output: "cards.stale_digest", "notification cardId=card_e10fb4fe39a9467f", "card.moved cardId=card_482b4aa0bdd64c02 · to=test · from=reported".

`eventLabel(e)` copy table:

| `type` | Label |
|---|---|
| `cards.stale_digest` | **"Stale-card digest sent"** |
| `notification` | `"Notification: " + lcFirst(head(payload.body))`, where `head` = text before the first `:`. "Stuck 24h in Fix: …" → **"Notification: stuck 24h in Fix"**. Without `body` (old events): `"Notification: " + KIND[payload.kind]` (`stale`→"stuck", `overdue`→"overdue", `failed`→"failed", `blocked`→"stopped", `gate`→"review needed", `input`→"question asked", `rework`→"sent back", `reclaimed`→"run reclaimed", `control-pair`→"not dispatched"; else the kind). |
| `link.added` | **"Link added"** |
| `card.updated` | **"Card updated"** |
| `card.created` | **"Card created"** |
| `card.moved` | `` `Moved to ${stageName(payload.to)}` `` |
| any other | sentence case of `type` with `.`/`_` → space ("gate.decided" → "Gate decided") |

- `shortId(cardId)` = `cardId.replace(/^card_/, '').slice(0, 6)` → "e10fb4", "9ac211", "ace250".
- `shortTitle(t)`: `w = t.split(' ')`; `n = w.slice(0,3).join(' ').length < 25 ? 4 : 3`; return `w.slice(0,n).join(' ') + (w.length > n ? '…' : '')`. Results: "Superpipeline: manual-delivery completion…", "AgentPod: connector interface…", "Fix the highest-severity blocker…".
- The full title is the link's `title` attribute.

### Interactions & states

| Control | Behaviour |
|---|---|
| Back to Operate | `<a href="/b/{app.boardId}/operate">` (SvelteKit navigation). |
| Time window `.seg` | Sets `window_`; the `$effect` calls `getUsage(boardId, window_)` and the board-total fetch (SN-G2) with the same window. The chart keeps 7 days. Tiles 2–4 and all four breakdowns follow the window; tile 1 is lifetime (SN-G3). Keyboard: buttons in tab order, `aria-pressed`. |
| Set a cap | `href="#caps"` with click handler `preventDefault(); document.getElementById('caps-b')?.focus()`. |
| Budget caps form | On mount and on `app.board.usage` change while the form is not dirty, fill the inputs from `B.budgetUsd` and `B.cardUsdCap` (`toString()`, '' for null). Submit: validate each non-empty value with `/^\d+(\.\d{1,2})?$/` and > 0. Invalid → `aria-invalid="true"` on the input and a `p.hint` below the form with `color: var(--vk-color-signal-text)`: **"Enter an amount in dollars, like 25 or 12.50, or leave it empty for no cap."**. Valid → `res = await setBudget(app.boardId, { boardUsdCap: v ? Number(v) : null, cardUsdCap: … })`. If `!res.ok`, the hint shows **"Could not save the caps ({res.status}). Nothing changed."**; else `await app.refresh()` and show the `.saved` "Caps saved". While saving: the button is `disabled` and labelled **"Saving…"**. |
| Top-spender / log card links | `<a href="/b/{boardId}/c/{cardId}">` → opens the card route (PlanView + drawer). |
| `#id` chip | `navigator.clipboard.writeText(cardId)` (the full id). For 2 s the chip text becomes **"Copied"** and an `aria-live="polite"` `.sr` region says "Card id copied". |
| Show all N events / Show the latest 8 | Toggles a local `expanded` boolean. |
| Show raw event names | Native `<details>`; the chevron rotates via `.disc-ico`. |
| Open the full board log | `<a href="/b/{boardId}/operate/log">` (SN-G6). |
| Loading | While the first `getUsage` is pending: tiles show `.big` "—" and the metas are empty; the chart and breakdown panels render their skeleton-free empty frame with `p.t-meta` **"Loading spend…"** in place of the `.emptyp` text. No "$0.00" until the data arrives. |
| Usage error | `usageError` set: tiles 2–4 show "—", and above the tiles a `p.t-meta role="alert"` reads **`Couldn't load spend — {usageError}. `** + `button.vk-button.vk-button--quiet.btn-sm` **"Try again"** (re-runs `load`). Tile 1 still renders from `app.board.usage`. |
| Events error | The `ol.log` is replaced by `.emptyp > p.t-body` **"Couldn't load the board log"** + `p.t-meta` `{eventsError}`. |
| No events | `.emptyp > p.t-body` **"Nothing has happened on this board yet."**; the show-all button and disclosure are hidden. |
| Zero spend | Exactly the mockup's `zero` branch (above). |
| Over budget | Tile-1 bar in signal + " · over the cap". |
| Focus | Default vibekit focus ring on every link, button and input; no `outline: none` anywhere. |

### Fixture needs

**Fixture A (pixel test, = mockup `zero`, production 2026-10-11 13:51Z).** Board `Developer Experience` (the real board id from the shared seed; other sections define its cards and stages).

- Usage: **no `usage_records` rows** for the board. So `getUsage` returns totals 0, `unpricedRecords: 0`, empty `byModel/byAgent/byCard`, and `byDay: []`.
- Budget: `budgetBoardUsdCap` and `budgetCardUsdCap` unset (`B.budgetUsd = null`, `B.cardUsdCap = null`, `overBudget: false`).
- Workspace boards (for By board): Developer Experience, Editorial & Fact-Checking, Agent Onboarding, Recurring Maintenance, Production Releases, and every other seeded board, all with no usage → empty state.
- Board events: exactly **60** events (`getBoardEvents(id, 60)`), newest first after reversal. The newest 8 are literal:

| seq order (newest first) | ts (UTC) | type | payload |
|---|---|---|---|
| 1 | 2026-10-10T22:50:12Z | `cards.stale_digest` | `{count:1, cardIds:['card_e10fb4fe39a9467f']}` |
| 2 | 2026-10-10T22:50:12Z | `notification` | `{kind:'stale', cardId:'card_e10fb4fe39a9467f', userId:<Rakesh>, body:'Stuck 24h in Fix: <why>. Next: <next>'}` |
| 3 | 2026-10-10T22:25:12Z | `cards.stale_digest` | `{count:1, cardIds:['card_9ac2116a050840df']}` |
| 4 | 2026-10-10T22:25:12Z | `notification` | `{kind:'stale', cardId:'card_9ac2116a050840df', …, body:'Stuck 24h in Failing test: …'}` |
| 5 | 2026-10-10T09:55:20Z | `cards.stale_digest` | `{count:1, cardIds:['card_ace250c9c25342e4']}` |
| 6 | 2026-10-10T09:55:20Z | `notification` | `{kind:'stale', cardId:'card_ace250c9c25342e4', …, body:'Stuck 48h in Reported: nothing claims stage "reported". Next: …'}` |
| 7 | 2026-10-09T23:05:00Z | `link.added` | `{}` (no cardId) |
| 8 | 2026-10-09T23:04:59Z | `card.updated` | `{}` (no cardId) |
| 9–13 | 23:04:44 `link.added`; 23:04:43 `notification {cardId:'card_482b4aa0bdd64c02'}`; 23:04:43 `card.moved {cardId:'card_482b4aa0bdd64c02', to:'test', from:'reported'}`; 23:04:42 `link.added`; 23:04:35 `card.created` | | |
| 14–60 | any 47 older events (dates ≤ 2026-10-09T23:04:35Z) | | |

Note: the dates in the table above are a choice; only the times show. Card titles come from the board fixture: `card_e10fb4fe39a9467f` "Superpipeline: manual-delivery completion and approval-subject hardening" (stage Fix); `card_9ac2116a050840df` "AgentPod: connector interface and generic effects ledger, state machine and executor" (Failing test); `card_ace250c9c25342e4` "Fix the highest-severity blocker found in the clean-room journey" (Reported). Rows 7 and 8 carry no `cardId`, so their third cell is empty, as in the mockup. The seed must write the events with these `ts` values (direct `events` insert in `seed.ts`, not through live actions).

**Fixture B (structural test only, = mockup `full`; not pixel-compared, because the figures are placeholders).**

- `usage_records` within the 7 days, per day (UTC, `ts` at 12:00): Mon 5 $1.20, Tue 6 $3.40, Wed 7 $0.80, Thu 8 $2.90, Fri 9 $4.10, Sat 10 $1.00, Sun 11 $0.80 (= $14.20).
- Split by agent: coder-kai $6.10, tester-tim $4.05, optimizer-ollie $2.40, error-eric $1.65.
- By model: gpt-5-codex $10.90, kimi-k2 $3.30.
- By card: card_9ac2116a050840df $6.35, card_e10fb4fe39a9467f $4.90, "Integrate editorial workflows and prove no-write publishing acceptance" $1.80, card_ace250c9c25342e4 $1.15.
- Tokens: 1 600 000 in, 300 000 out.
- 2 records `estimated=1, cost_usd=0`.
- Board cap `25`.
- Other boards: Editorial & Fact-Checking $9.80, Agent Onboarding $3.15, Recurring Maintenance $1.30, Production Releases $0.00.

Expected text: "$14.20", "of a $25.00 board cap · 57% used", "$3.55", "4 cards with spend in this window", "1.9M", "1.6M in · 0.3M out", "2", "Busiest: Fri 9 · $4.10", the bar heights and widths listed above. The Budget caps status reads "Board $25.00 · card none" (the mockup's "No caps set" in the full branch contradicts its own $25.00 cap; the app follows the data).

### Gaps

| Id | Mockup shows | API today | Ruling |
|---|---|---|---|
| SN-G1 | "Spend by day", 7 daily columns | `UsageSummary` has no per-day series | **(b)** Add `byDay: Array<{ day: string /* YYYY-MM-DD UTC */; costUsd: number }>` to `UsageSummary` (`apps/api` `computeUsage` and the web `UsageSummary` type). Query: `SELECT substr(ts,1,10) AS day, SUM(cost_usd) AS cost FROM usage_records WHERE ts >= ? GROUP BY day ORDER BY day`, with `?` = midnight UTC six days before today, **always 7 days, independent of `?window`**. The client zero-fills missing days. Contract test: a record at 2026-10-09T12:00Z appears under "2026-10-09". |
| SN-G2 | "By board · all your boards", this board highlighted | Usage is per board only (`GET /v1/boards/:id/usage`); no workspace rollup | **(a)** Derive client-side: `Promise.allSettled(app.boards.map(b => getUsage(b.id, window_)))` → `{ boardId, name, costUsd: totalCostUsd }`, sorted by cost desc then name. Boards whose fetch rejects are left out, and the head gets a `span.t-meta` "· {n} boards could not be read". With ≤ 15 boards this is acceptable; if boards exceed 15, add `GET /v1/usage?window=` later (out of scope). |
| SN-G3 | Field label "Board cap, per 7 days"; tile "Spend vs budget" | The board cap is **lifetime**: `boardUsage().overBudget = computeUsage() /*no window*/ .totalCostUsd >= boardCap`, the same rule the claim gate uses | **(c)** The label "per 7 days" states a rule the system does not enforce. The label becomes **"Board cap"**; this is the only text change to the pixel reference, which must be re-rendered with it. Tile 1 shows lifetime `board.usage.totalCostUsd`, so the cap and its fraction agree. Changing the billing gate to a rolling window is a product decision, not a UI change. |
| SN-G4 | Log text "Notification: stuck 24h in Fix" | The `notification` event payload is `{kind, cardId, userId}`; the body exists only in the `notifications` table | **(b)** `BoardDO.notify` emits `this.emit('notification', { kind, cardId, userId, body })`. The client derives the label from `payload.body` (formula in §Content map); old events without `body` fall back to the `kind` word. Contract: `BoardEvent.payload.body?: string` for type `notification`. |
| SN-G5 | 24px mood faces in By agent in every vibe (one shared markup) | `FACE_VARIANT[vibe]` would draw a portrait, a light or the name only | **(a)** The spend rows always pass `variant="mood"` with `nameShown` (the name is printed beside the face). This is the shared-screen rule; faces never drop (common brief). The seed is the agent name, per WA-G7 (no separate change here). |
| SN-G6 | "Open the full board log" button | No full-log route; `GET /v1/boards/:id/events?limit=` caps at 500 | **(a)** New client route `/b/[boardId]/operate/log` showing `BoardLog` with `getBoardEvents(id, 500)`, all rows, no API change. |
| SN-G7 | Desktop only, no responsive rules | — | **(a)** The responsive rules in §Layout (2-column tiles and 1-column grid under 1100px; 16px gutters, 1-column cap form, tight chart under 600px), using only existing tokens. They are not pixel-tested at 390 (no phone artboard); `vibes.spec.ts` checks no side scroll and 44px targets. |
| SN-G8 | Truncated log titles ("Superpipeline: manual-delivery completion…") | Full titles only | **(a)** `shortTitle` formula in §Content map; the full title goes in `title=`. |
| SN-G9 | `#e10fb4` id chips | Full ids | **(a)** `shortId` = id without `card_`, first 6 chars; copying writes the full id. |
| SN-G10 | Mockup's `full` branch says "No caps set" beside a $25.00 cap | — | **(c)** The mockup contradicts itself. The status derives from the caps ("Board $25.00 · card none"). The pixel-tested `zero` branch is unaffected. |
