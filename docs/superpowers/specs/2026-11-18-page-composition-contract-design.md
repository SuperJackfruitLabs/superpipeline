# Page composition contract

**Status:** design, final draft for the operator's approval. Decided in conversation on 2026-11-18 from a walk of production and a set of mockups the operator reviewed and accepted; the builder-check questions are answered in §11 and §12.
**Mockups:** `2026-11-18-page-composition-contract/` beside this file (`./serve.sh` to view). They are the reference for every page below.

## 1. Intent

SuperPipeline's pages are hard for a person to read. The components (vibekit) are sound one by one; the way the pages combine them is not. On 2026-11-18 production showed:

- The Inbox at 18,657 px tall at 1440 wide: 129 Activity items rendered at once, and sixteen unclaimed cards each carrying the same paragraph, a stage select, three buttons and a badge.
- The same count in four places (hero, scope chips, group heading, rail badge), then the same cards again as Activity reminders.
- Raw JSON and raw label ids as the first thing on screen.
- The board hiding five of seven stages as 40 px strips with rotated text, while a hero and orange-framed cards shouted about three unclaimed cards.
- Pages that do not load (Crew and Settings on skeletons after 8 s), and a card drawer fetching from the previous board's URL.

The structural cause: every page is composed separately per vibe. The board has eight layouts, the card drawer eight, Operate and the shell four each, with Studio variants for Crew and Settings. A composition fix lands four to eight times, so the pages drifted into "show everything".

This document fixes the composition once, as a contract that every page follows, and makes the vibes a layer on top rather than four forks.

## 2. Goals, non-goals, anti-goals

**Goals**
- A person who has never seen SuperPipeline can read each page and know what it wants from them.
- One composition per page in code, so a composition change is one edit.
- The four vibes stay, each with its own recognisable expression.
- Live changes move on the page instead of repainting it.

**Non-goals**
- Changing the information architecture decided on 2026-10-13 (Inbox, Plan with Boards and Projects, Crew, Settings under You). Tabs and URLs stay.
- New vibekit components. Everything below composes what vibekit ships, including its motion suite, plus the two extensions to existing components in §12.
- A visual redesign of the vibes themselves.

**Anti-goals**
- A page that technically follows the rules but still shows every component the data allows. The test is a stranger reading it, not a checklist.
- Studio losing its annual-report character, or Daylight its warmth, in the name of sharing code.
- Any regression of the pixel and accessibility harnesses that guard the vibes today.

## 3. Constraints

- **Mockups before implementation** and **realistic data for audits** (workspace rules). The mockups beside this doc are the approved references; UI tests use real-shaped data (long titles, 16 unclaimed cards, 548 activity items).
- **Vibekit from npm first.** `apps/web` still depends on a vendored `vibekit-0.0.12.tgz` under the old package name. Hero, StateLabel, DataTable, SmallMultiples, QuickFilter and the live-update motion helpers this contract relies on are in `@superjackfruitlabs/vibekit-ui` 0.0.19 on npm. The card "SuperPipeline web app: vibekit from npm" already exists on Planning & Roadmap; it becomes the first step of Phase 1.
- **Product words only** in shipped code and copy: "workspace", never a local agent or host name. Sample names in tests and mockups are fine.
- **One PR per page**, with per-item commits, because CI queues behind the org-wide limit.
- **The existing harnesses keep passing**: vibekit's pixel sheets, SuperPipeline's matrix and phone e2e, axe. Composition tests are added, never swapped in for these.

## 4. Approaches considered

1. **Polish in place.** Fix the worst problems inside the existing per-vibe layouts. Cheapest first step, but every fix lands four to eight times and nothing stops the next drift.
2. **Composition contract, then one layout per page.** Write the rules once, mock each page once, rebuild each page as a single composition with the vibe applied through tokens and a small signature layer. More up front; each later page gets cheaper; the rules can be tested. **Chosen.**
3. **Rethink the information architecture.** Reopens a settled decision and does not address the duplication.

Within approach 2 the operator considered keeping distinct arrangements per vibe and chose the split in §6: the contract owns the content, the vibe owns the expression plus a few signature touches. Board layout: variant A (track plus active lanes) was chosen over B (every stage a lane).

## 5. The contract: rules every page follows

1. **One message per screen.** The page opens with one headline that says how many and why, in words. No second summary.
2. **Every count appears once.** A number lives in one place; chips, headings and badges do not repeat it.
3. **One primary action per row**, as a verb (Review, Resume, Move). Secondary actions are quiet links. Never a select and three buttons on a row.
4. **Group by what the person must do**, not by where the data came from. Identical guidance is said once for the group, never per row.
5. **Machine detail is behind a disclosure.** JSON, ids, raw tool output, full histories. Labels show their names, never their ids.
6. **The pipeline is always visible** wherever a card or board is shown: a horizontal track, every stage named in full with its count and who works it, nothing truncated or rotated.
7. **Lists are grouped or paged.** Nothing renders more than a screenful without a "Show N more"; Activity is its own tab, paged.
8. **Filters are hidden until asked for.** One Filter control beside the tabs; the row reveals under it; a count on the control when any filter is on. The row holds: find, chips that match the page's groups, Agent, Label and Priority menus, a sort.
9. **Live updates move, never repaint.** A refresh is a diff applied to the page: new rows enter, removed rows leave and their space closes, changed rows flash once and the changed number ticks, counts bump, the Live dot rings. All from vibekit's motion suite with its per-vibe timing; all off under reduced motion.
10. **Live updates can be paused.** The Live pill in the masthead is the toggle. Paused, the page holds still, changes queue behind a count, and Apply or resuming plays them in order with the same motion. The choice is per person and remembered. Nothing is lost while paused.
11. **Real loading and empty states.** A region that waits says what it waits for; after a limit it says what to do. A skeleton is never the resting state.
12. **Jargon has an anchor.** The first use of a stage, attempt, gate or capability on a page is in a sentence that says what it is.
13. **The keyboard is within sight.** Every page's footer line ends with the page's own keys (the board's J/K, ↵, M, F; the List's R; the Inbox's), as words from the page's `*-words.ts`, the same in every vibe (muted meta in four; Console's strip). Added 2026-11-19 with the Console vibe (operator decision, option a); on a phone (no hardware keyboard) the keys line is hidden by CSS, and nothing replaces it. Corrected 2026-11-19: an earlier wording promised a `?` help that does not exist.

## 6. Who owns what: contract versus vibe

| Layer | Owns | Same across vibes? |
|---|---|---|
| Contract (this doc) | what is on the page, in what order, what is primary, what is collapsed, how counts and groups work, how live changes behave | yes |
| Vibe (vibekit tokens and component forms) | type, colour, surface, radius, motion timing | no |
| Signature touches (a small per-vibe slot per page) | Daylight: the greeting band, raised rounded rows, pill chips, mood faces. Studio: the figure, ink rules, mono ordinals, square marks, slab buttons. Paper: Newsreader display, italic ledes, ink rules, roman numerals. Quiet: larger plain type, one column, ruled rows, underlined words, no boxes | no |

The signature slot is small by design: a headline block, a list-row treatment, a track treatment. It never changes order, grouping or actions.

## 7. The pages

Each page's composition, top to bottom. The mockups show all four vibes for each.

**Inbox** (`all-pages-four-vibes.html#inbox`, filters in `pass-four-live-toggle.html`)
1. Masthead: product · Inbox, the Live toggle, search, New card.
2. Headline: Daylight greeting ("Working late, Rakesh? 18 cards want you.") or the vibe's equivalent; one sentence under it saying what kinds (one review, one stopped agent, sixteen with nobody).
3. Board scope, once: QuickFilter (Studio: SmallMultiples).
4. Tabs: Needs you, Running, Spend, Activity, each with its count; the Filter control at the end of the row; the filter row hidden under it.
5. Groups in order of what the person must do: Review, Resume a stopped agent, Nobody works these stages. Each group: a section header with its count; one explanation line if the group needs it; a group action where one applies ("Move all 16…", "Staff an agent"); rows with one verb each; "Show N more".
6. Footer line: counts and sync time.
Activity leaves the main column and becomes a paged tab. Running and Spend become tabs.

**Board** (`pass-two-inbox-filters-and-board.html`, variant A)
1. Masthead with the board switcher.
2. One row: Board | List tabs, filter summary, and one attention line ("3 cards want you here. Show the first"). No hero.
3. The track: every stage, name in full, count and who works it, the current needs in signal.
4. Lanes only for stages that hold cards. A lane header: name, count, who works it.
5. A card tile: title, priority and label chips, one state line ("With you · no agent works this stage"), a quiet Move. Unclaimed cards get a mark (Daylight edge, Studio square, Paper dot, Quiet words), not a frame and a button.
6. Footer line.

**Card** (`all-pages-four-vibes.html#card`)
1. Crumb (board · stage · card id), title, tools (Open in new window, Close).
2. The track with the current stage named.
3. One sentence: where the card is, for how long, what is wanted, who did what last; the primary action beside it (Review) and Move.
4. Facts in words: owner, priority, label names, due, attempt, asked by.
5. The brief, open.
6. What the last attempt produced: artifacts as rows with Open; acceptance criteria as a checklist.
7. Collapsed: conversation and history (with a count), raw data.

**Crew** (`#crew`)
1. Masthead, page head with a one-line lede and one "How agents pick cards" link. No legend row.
2. Tabs with counts: Agents, People, Capabilities.
3. One table: who (face, name), what they work, where they come from, last seen, actions menu. "Show N more". Tokens and links live under each agent's actions.
4. Loading and empty states per rule 11.

**Settings** (`#settings`)
1. Masthead, page head.
2. Tabs with counts: Labels, Connections, Appearance, Account.
3. Labels as a compact table (colour, name, origin, used on, remove), renamed in place on click; "Show N more"; New label.
4. Connections as rows with a state label and Manage.
5. Appearance and Account as facts with one action each.

## 8. Code shape

- One layout component per page: `InboxView`, `BoardView`, `CardView`, `CrewView`, `SettingsView`. The eight-way `layouts/*{Daylight,Paper,Studio,Quiet}{,Phone}.svelte` forks are retired page by page.
- The vibe reaches the layout through vibekit's tokens and component forms (`vk-*--{vibe}` classes, which the components already choose from the root `data-vibe`). Phone is a breakpoint of the same layout, not a second file.
- The signature slot is one Svelte snippet per page and vibe, or a CSS block scoped by `[data-vibe]`, holding only what §6 allows. A reviewer can read it in a minute.
- Words stay in the per-page `*-words.ts` files. The contract's sentences (headline, group explanations, state sentence) are added there with their pluralisation.
- Live updates: the page keeps a keyed model; the WebSocket handler applies a diff (add, remove, change) and the DOM uses vibekit's `rise`/`fade` transitions, `flip` for moves, `countUp` and `bumpOnChange` for numbers, `flashOnChange` for changed rows, `LiveDot` for the pulse. The pause toggle is one store with `localStorage`, honoured by the handler, which queues diffs while paused.
- Filters: one store per page (find, group chips, agent, label, priority, sort); the Filter control's count is the number of non-default fields.

## 9. Guards

Added in Phase 6, per page, run in CI on realistic fixtures:
- **Primary actions per row ≤ 1** (buttons with the primary form inside a row).
- **No repeated paragraph**: no identical text node longer than 40 characters appears more than once in a view.
- **No raw JSON or id outside a disclosure**: text matching `^\{` or `^(lbl|card|usr|brd)_` only inside `details`.
- **Height budget**: the Inbox with 18 needs and 548 activity items stays under 3 screens at 1440×900; the board under 2.
- **Track never truncates**: no stage name with `text-overflow` clipping; measured by comparing scrollWidth to clientWidth.
- **Motion honours reduce**: with `data-motion="reduce"` a refresh produces zero running animations; without it, at least one.
- **Vibe parity**: the same view renders the same DOM order and the same text in all four vibes (diff of the accessibility tree ignoring class names).

## 10. Phases and gates

| Phase | What | Gate |
|---|---|---|
| 0 | Fix the live bugs: card drawer fetching from the previous board's URL; Crew and Settings never finishing their load; Activity unpaged | One PR, no design needed, can start now |
| 1 | Prerequisites: vibekit 0.0.20 with the Masthead live toggle and the StageTrack counts (§12), released to npm; move `apps/web` to `@superjackfruitlabs/vibekit-ui` 0.0.20 from npm (existing card); add the composition guard scaffolding and realistic fixtures | vibekit sheets and CI green; SuperPipeline CI green on the existing harnesses |
| 2a | The shell: one `AppShell` for desktop and phone, with the masthead reduced to product, title, Live toggle, search and the page's one primary action; tabs, filter, "showing" and status lines move into the pages | Shell renders the same DOM in four vibes; existing shell e2e pass |
| 2b | Inbox per §7, with filters (rule 8) and live motion plus the pause toggle (rules 9, 10); a mockup round for the Running, Spend (with caps) and Activity tabs first | Matches the mockups in four vibes, desktop and phone; guards pass |
| 3 | Board, variant A, with drag-and-drop kept (§12) | Same |
| 4 | Card: a mockup round for the gate, question and resume states first, then the three surfaces (drawer, phone sheet, page) from one composition | Same |
| 5 | Crew and Settings | Same |
| 5b | The remaining surfaces: List, Projects, Board settings, Spend detail, Board log, the card-states gallery | Same |
| 6 | Guards per §9 wired for every page; a monthly read-only composition audit like the docs audit | Guards fail when a rule is broken (prove each by breaking it once) |

Each phase is one PR. Phases 2 to 5b each retire that surface's per-vibe forks in the same PR. The operator sees each page's implementation on staging before it goes to main.

## 11. Calls made after the builder check

A reviewer read this document as the builder would and asked nine questions. These are the author's calls; the operator can overturn any of them.

1. **Scope is every surface, shell included.** The operator asked for "all the pages". `src/lib/layouts.ts` registers per-vibe forks for the shell, List, Projects, Board settings, Spend detail, Board log, the standalone card page, the card-states gallery and the gate and question panels; all of them follow the contract. The shell goes first (Phase 2a) because today it owns the Board|List switch, the Filter control, the "Showing…" bar, the Live pill, Studio's status line and Daylight's sky, and the contract puts most of those inside the page.
2. **SuperPipeline's own pixel suite (`e2e/pixel/`, frozen artboards, `references.lock`, `expected-failures.ts`) retires surface by surface** as each one lands under the contract, in the same PR, with a `Visual-Change:` trailer. The mockups beside this doc become the reference; the composition guards in §9 and vibekit's own sheets take over the role of catching drift. The base-versus-head visual PR gate stays.
3. **The card's 23 sections map as follows.** Kept as their own blocks: the state sentence with its action, facts, the brief, what the last attempt produced (artifacts and acceptance), and a decision or question panel when one is pending. Folded into Facts: project, subtasks count, cost, links, references. Folded into "Conversation and history": attempts, handoff, delivery, related work, comments. Folded into "Raw data": subject digest and anything JSON. Dropped: nothing; everything is reachable, most of it one disclosure away. **Review, Answer and Resume open their panel in place of the state sentence**, not elsewhere. The section-key parity test is rewritten to assert this mapping. The three card surfaces share one composition; the phone sheet stacks it.
4. **The nine attention kinds become five groups**, in this order, each with a matching filter chip: Review (review, sub-tasks waiting on a review), Answer (question), Resume a stopped agent (refused, failed, repeated failure, blocked), Over budget (budget), Nobody works these stages (no owner). The headline sentence names the non-empty groups.
5. **Board variant A keeps drag-and-drop.** A lane is a drop target as today; a stage without a lane accepts drops on its cell in the track, which highlights while a card is lifted.
6. **The parity guard exempts a marked signature region.** The signature slot is wrapped in `data-signature` and may change the headline block, the section-header ordinals and the scope control's form; outside it the accessibility tree must match across vibes, text included. A signature region larger than those three things fails the guard.
7. **The Inbox's other tabs and the card's pending states get their own mockup rounds** before their phases build, per the mockups-first rule; the rules in §5 bind them.

## 12. Decided by the operator, 2026-11-18

1. **Vibekit grows when the suite needs it.** The operator: "You are free to expand vibekit whenever you want." So vibekit 0.0.20 extends two existing components ahead of Phase 2: Masthead's `live` becomes a toggle (pressed state, queued count, an Apply action, the ring on update) and StageTrack takes, per stage, a count and who works it, names every stage in every vibe and never truncates. Both ship with reference sheets and the cross-repo change follows the workspace's cross-repo skill: vibekit first, released to npm, then SuperPipeline. The mockups' hand-drawn pill and track are the references for the two components.
2. **"All boards" stays live with one socket per board in scope.** The web app opens a board socket for each board the Inbox shows (a dozen at most; hibernatable sockets cost nothing idle), applies each board's events as a diff, and the Live pill speaks for all of them. The full-snapshot refresh on every event is replaced by the diff path in Phase 2b. A workspace-level feed is a later API item, outside this document, that would collapse those sockets into one.

## 13. Left to the builder

- Exact breakpoints for phone, within the one-layout rule.
- How the filter store serialises (URL or memory); the contract only requires the count on the control and the remembered pause toggle.
- Which existing tests become the realistic fixtures, and where the fixture data lives.
- Order of the Phase 0 fixes and their root causes.
- The signature slot's exact mechanism (snippet versus scoped CSS) per page, as long as it stays within §6.
