# Digest: shell-and-board (app shell per vibe + 8 board artboards + 4 empty-board artboards)

Sources: `screens/shell-and-board.md` (SB), `mockup-corrections.md` (MC) groups `boards`, `phone-boards`, Part 2, Part 4 and Appendix, `screens/fixtures-and-harness.md` (F) §A. **MC overrides SB.** Rows below marked **corrected:** are SB values that MC overrules. References `apps/web/e2e/reference/mockups/<Artboard>.html` are already corrected and are the source of truth for markup, CSS and text. I checked every count string below against them.

**One-world facts used throughout.**
- Clock: 2026-10-11T08:21:00Z, tz Asia/Kolkata, so 13:51 on Sunday 11 October, phase `noon` / "midday", locale en-GB. This holds on every screen, Studio included. **corrected:** SB G6/F D2 per-screen clocks 13:19/13:31 are void, and so are the registry `clock` fields.
- Tenant `tnt_vibes`, user `usr_b19776fac3c94df4` "Rakesh Gangwar". **corrected:** SB §0.2 `tnt_e080…`.
- Agent ids are `agt_fx_<slug>`, except super-chotu `agt_bb586732b807460c` (22 agents, F §A.4.2). **corrected:** SB §7 `agt_<name>`, 15 agents.
- Card ids (F D13):

| Short | Id | Title |
|---|---|---|
| 63ac | `card_ace250c9c25363ac` | Fix-highest |
| 58f8 | `card_9ac2116a050858f8` | AgentPod |
| 1dfc | `card_e10fb4fe39a91dfc` | manual-delivery |
| f83f | `card_691a65ff9894f83f` | Integrate editorial |
| 481f | `card_482b4aa0bdd6481f` | X connector |
| 9ed9 | `card_8f2c1a5e58299ed9` | Build immutable, shipped |
| 4605 | `card_05823a57e8224605` | Diagnose Melissa and Anna Supermessage silence — trace actual failing hop |

  **corrected:** SB's production ids (`…40df` and so on).
- Card 4605 is LIVE (WC-1): `archived_at=NULL`, input-required in `reproduce`, stateSince 2026-10-08T14:11:45Z, p3, attempts 2 (both runs by error-eric), queued by super-chotu, project `prj_42ab5ec961104f65`, first ref "AgentPod v0.1.91 Matrix inbound bridge contract".
- Developer Experience (DX) therefore has **7 live cards and 4 need you** (63ac no-owner; 58f8, 1dfc, 4605 blocked). Workspace attention is 4, so the Operate count is **4** everywhere. **corrected:** every SB "6 cards" becomes 7, and every "3 need you" becomes 4.
- Stage key for Failing test is `test`. Stages in order: reported (human), reproduce (cap diagnostics), test (testing), fix (code), integrate (integration, requires any [integration, api, testing]), signed-off (human, gate approval), shipped (human).
- Stage occupancy: Reported 1, Reproduce 1, Failing test 3 (2 blocked), Fix 1, Integrate 0, Signed off 0, Shipped 1. That leaves 2 empty stages.

---

## 1. Screens covered

Viewport: 1440 wide for desktop and 390 wide for phone. Height comes from the reference export. Light and dark, reduced motion, fonts awaited, `setAppearance(vibe, theme)`. Cookie strength is `strong`, and Quiet is `off`.

| Artboard (reference file) | Route | Vibe | Notes / steps |
|---|---|---|---|
| SP-Board-Daylight | `/b/brd_134a0ddb6d434478` (view board) | daylight | Peek is open on 58f8. SB step: focus the title button of `card_9ac2116a050858f8` and wait 400 ms (peek debounce 300 ms). F registry step: `getByRole('button', { name: /^AgentPod: connector interface/ }).first().hover()`. Either works; the peek must render at ≥1440. |
| SP-Board-Paper | DX | paper | — |
| SP-Board-Studio | DX | studio | Drop the registry `clock: 13:19`. |
| SP-Board-Quiet | `/b/brd_f47143722126442c` (Agent Onboarding, 20 done cards) | quiet | strength `off` |
| SP-Board-Empty-Daylight / -Paper / -Studio / -Quiet | `/b/brd_2441b5578f704b93` (Production Releases, 0 cards) | each fixed | **corrected:** MC Part 3 splits the old prop-vibe `SP-Board-Empty` into 4 fixed-vibe registry entries (`vibes: [v]`), so there is no `missing-reference` any more. |
| SP-Phone-Board-Daylight / Paper / Studio / Quiet | DX at 390 wide | each | Drop the Studio `clock: 13:31`. |
| App shell | n/a (inside every screen) | all | — |

Masks:
- Only the dynamic "Live" dot (`[data-live]` / the live-dot element) is masked, per F §B.5.
- The conflict masks C-01, C-10, C-13 and C-17 (1dfc priority chip, 481f age cell, Resident gate cell, phone 1dfc "asked by" line) are **not needed**: the references are already corrected. F §B.2 says masks must cite a conflict id.
- No `data-pixel` hooks are needed for these screens (full mode).

Harness accessible names come from the shell and board markup below. For example:
- "Search cards, agents and actions" (Daylight, Paper and Quiet desktop) or "Search cards, agents and actions (⌘K)" (phones);
- Studio search is the readonly input "Search or run a command";
- tiles: "{title}, in {stage}. Enter to open, M to move, Alt with left or right arrow to move between stages." on desktop, and "{title}. In {stage}. Enter opens, M moves." on phones;
- move buttons: "Move {title} to another stage" on desktop, and "Move card to another stage" on the phone Daylight tile.

---

## 2. API / contract rulings

| Id | Field / endpoint | TS type | Server computation | Used by | Fixture values |
|---|---|---|---|---|---|
| **API-1 (SB G2, b)** | `CardView.lastAgentId` on board snapshot cards, plus `/v1/stale` rows (`StaleCard`). Also `api.ts Card.lastAgentId` and the contract package. | `lastAgentId: string \| null` | `agent_id` of the card's most recent run, any status: `SELECT agent_id FROM runs WHERE card_id=? ORDER BY started_at DESC LIMIT 1` (board-do runs table; `delegateAgentId` is null on stopped cards). | Crew (rail + greeting + phone crew), every "agent" slot on needs cards, Quiet "Ran by {agent}", Studio Agent cell, peek face | 58f8 `agt_fx_tester_tim`; 1dfc `agt_fx_coder_kai`; 4605 `agt_fx_error_eric`; 9ed9 `agt_fx_coder_kai` (run 15; SB §7 says null, but by the rule it is coder-kai, and done cards render the stage name anyway); 63ac, f83f, 481f `null`; all 20 Agent Onboarding cards `agt_fx_onboarding_olivia`. |
| **API-2 (SB G3, b)** | `needsHuman.summary` (DO `CardNeedsHuman` board-do.ts:518, web `NeedsHuman` api.ts:185, contract). The writer is the MCP `superpipeline_block` tool (apps/api/src/mcp/tools.ts:418) with a new optional arg `summary`, plus the REST run action `block` (index.ts:3374 passes `p.summary`) → `stub.block({...,summary})` → stored inside `needs_human_json`. | `summary?: string` (≤ 120 chars, agent-written, rendered verbatim) | Stored with the stop. Absent means the client falls back to the first sentence of `detail`. | Studio desktop panel ("Stopped. {summary}"), Studio notes 2–4, Studio phone `.nx p` | 58f8 `Needs a writable Forge URL for agentpod.`<br>1dfc `Missing commit ×2.`<br>4605 `No fresh DM event to trace; needs one per agent.` (MC Part 4 `boards`; but see Gap X-2: the phone-boards group says 4605 has no summary). Fixture only: F §A.5.2 has no summaries, and MC adds them. |
| **API-3 (SB G11, b)** | `BoardSnapshot.intro` and `Stage.summary` (web `api.ts` Stage + BoardSnapshot, contract, DO meta). `setStages`/`patchStage` accept `summary`. Board settings gets a field "One line about this stage". The fixture importer must accept both. | `intro?: { lede: string; composeHint: string }`; `Stage.summary?: string` | `intro` is stored in DO meta (board template field). `summary` lives inside the stages JSON (DO `meta.stages` and D1 `boards.stages_json`). | SP-Board-Empty-* | Production Releases:<br>`intro.lede` = `It takes a release from **proposal to production** in five stages. **devops-dave** stages it, **vulnerability-victor** checks it, and **you** give the go or no-go before it is released.`<br>`intro.composeHint` = `Say what you want released in a sentence; an agent drafts the brief.`<br>Stage summaries: proposed `Someone writes up the release: what ships and why.` · staged `Stages the release. Picks up cards that need the release skill.` · checks `Runs the security review before anyone decides.` · go-no-go `An approval gate. One release at a time waits here for your yes or no.` · released `A person marks it live. The card is done.` |
| API-4 (SB G4, client) | Operate count = workspace attention. Uses the **existing** `GET /v1/stale?attention=1` (`listAttention()` api.ts:864). | — | No server change, as long as the endpoint returns the 4 DX cards. | Every shell | `cards.length = 4` (63ac, 58f8, 1dfc, 4605), `boardsUnanswered 0`. **corrected:** SB/F "3". |
| API-5 (existing) | `getUsage(boardId,'7d').totalCostUsd` → `model.spend7d` | number | Existing | Studio figures | `0` → `$0.00` |
| Dep (SB G17) | vibekit release with the Annual-report Studio tokens: `--vk-color-rule`, `--vk-stage-1..7`, `--vk-color-stage-text`, `--vk-font-serif`, Archivo / Azeret Mono / Newsreader, and `--vk-sky-*-text`. Count badge `--vk-color-signal-text`. | — | Bump `apps/web/vendor/vibekit-*.tgz` | **Blocker for Studio** | — |
| Harness (F G-01) | DEV_AUTH `resolveUser` returns `users.name` so the shell reads "Rakesh Gangwar"/"RG" | — | apps/api/src/auth/resolve.ts | All | — |

Explicitly **client-only (a)**, so do not add API work for these:
- G5 moods (now O-2);
- G6 one clock (`app.syncedAt`);
- G7 Studio prose templates;
- G8 "+N" counts dangling label ids;
- G9/G10 render the data;
- G12 projectCount;
- G13 Reconnecting;
- G14 undrawn states;
- G15 You/account menus;
- G16 FilterDialog;
- `stopReason` for no-owner (the attention instruction is client-derived: "No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works." is NOT stored, F §A.5.2);
- `syncedAt`, `filterSummary`, `listCount`.

New web store state: in `stores/app.svelte.ts`:
- `attention = $state<StaleCard[]>([])`;
- `loadAttention()`, called in `init()` after boards load, after every `refresh()`, and on board feed events, coalesced to 1 s;
- `filterOpen = $state(false)`;
- `boardSwitcherOpen = $state(false)`;
- `syncedAt = $state<Date|null>(null)`, set on every successful `getBoard` and every feed event.

---

## 3. Pure derivations

New file `apps/web/src/lib/components/board/board-words.ts`, plus `board/board-model.ts`, `board/studio/studio-prose.ts`, `stage-owner.ts` (extend) and `shell/shell-model.svelte.ts`. Ages are computed at NOW = 2026-10-11T08:21Z.

### 3.1 board-words.ts (verbatim signatures from SB §0.3)
```ts
export const NUM_WORDS = ['no','one','two','three','four','five','six','seven','eight','nine','ten'];
export function numWord(n: number, cap = false): string;      // 'one'..'ten', else digits; cap upper-cases first letter
export function ageShort(hours: number | null, done: boolean): string; // open: h<48 ? `${floor(h)}h` : `${floor(h/24)}d`; done: `${max(1,floor(h/24))}d`; null → '—'
export function ageLong(hours: number | null): string;        // h<48 → `${floor(h)} hours` else `${floor(h/24)} days` (1 → '1 hour'/'1 day')
export function agoWords(hours: number | null): string;       // h<24 → `${floor(h)} hours ago`; floor(h/24)===1 → 'yesterday'; else `${d} days ago`
export function dueShort(d: string): string;                  // '2026-10-06' → '6 Oct'
export function dueLong(d: string): string;                   // → '6 October'
export function plural(n: number, one: string, many: string): string; // `${n} ${n===1?one:many}`
export const PAPER_PHASE: Record<Phase,string> = { dawn:'at first light', morning:'in the morning light', noon:'in full daylight', golden:'in the golden hour', dusk:'at dusk', night:'after dark' };
export function dateline(now: Date, phase: Phase): string;    // `${weekday} ${d} ${Month} · ${PAPER_PHASE[phase]}`
```

Add these too (MC / F rulings):
- `sentenceCase(s)`: upper-case the first letter, and append "." when the text does not end in `.!?` (F C-06). Phones apply it to agent detail; desktop shows the text verbatim.
- `firstSentence(s)`: the text up to and including the first ". " boundary at index ≥ 40; the whole text when there is none.
- `remainder(s)`: the text after `firstSentence`, or null.
- `lcFirst(s)`.

| Input | Output |
|---|---|
| 63ac 70.5h, open | ageShort `2d`, ageLong `2 days`, agoWords `2 days ago` |
| 58f8 33.9h | `33h`, `33 hours`, `33 hours ago` |
| 1dfc 33.6h / 481f 33.3h | `33h`, `33 hours` |
| f83f 62.5h | `2d`, `2 days` |
| 4605 66.2h | `2d`, `2 days`, `2 days ago` |
| 9ed9 34.0h, done | ageShort `1d`, agoWords `yesterday` |
| Agent Onboarding 9d48 20h / Melissa 66.4h / Lyra (stateSince 2026-10-01T22:30Z, F wins over SB) 225.9h | `20 hours ago` / `2 days ago` / `9 days ago` |
| dueShort / dueLong `2026-10-06` | `6 Oct` / `6 October`; 9d48 `2026-10-05` → `5 October` |
| numWord(4,true) / numWord(5) / numWord(12) | `Four` / `five` / `12` |
| dateline(now, noon) | `Sunday 11 October · in full daylight` |
| sentenceCase(1dfc detail) | `This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.` |
| firstSentence(58f8 detail) | `Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access.` (straight `'`) |
| remainder(sentenceCase(4605)) | `No Accounts defect established; no issue filed.` |
| firstSentence(1dfc) | the whole text; remainder null |

### 3.2 Shell values (`shellModel`, SB §1.1)

| Getter | Rule | DX value | Production Releases | Agent Onboarding |
|---|---|---|---|---|
| attentionCount | `app.attention.length` (workspace) | **4** | 4 | 4 |
| userName / initials / firstName | `user.name ?? login`; initials = first letter of the first two words, upper-cased | Rakesh Gangwar / RG / Rakesh | same | same |
| dateline | above | `Sunday 11 October · in full daylight` | same | same |
| listCount | non-archived filtered cards | **7** ("List 7") | 0 | 20 |
| projectCount | distinct non-null projectId; G12 says count archived cards too | 3 (prj_23b9, prj_34b4, prj_42ab; now 3 either way) | 0 | — |
| filterSummary | `'none on'` when no filter is set, else `${n} on` | `none on` | | |
| themeToggleLabel | otherThemeLabel(theme) | `Dark theme` (in light) | | |
| showing | default filters: `Showing all ${n} cards`; otherwise `Showing ${n} of ${total} cards`; 0 cards: `No cards on this board` | `Showing all 7 cards` | `No cards on this board` | `Showing all 20 cards` |
| paperShowing | `${showing} · ${needs} wait on you · ${done} shipped`, dropping parts that are 0 | `Showing all 7 cards · 4 wait on you · 1 shipped` | `No cards on this board` | (Paper not drawn) |
| editionCount (Paper phone) | `plural(nonArchived,'card','cards')` | `7 cards` → `Sunday 11 October · in full daylight · 7 cards` | | |
| studioSubRight | `The board at ${HH:MM(syncedAt)} · ${greeting(phase,'studio').toLowerCase()} · ${weekday} ${d} ${Month}` | `The board at 13:51 · midday · Sunday 11 October` | same | |
| status (Studio board) | items `[plural cards, {needs need you, signal}, n blocked, n shipped, synced HH:MM]` (0-parts dropped except cards); right `['⌘K commands','N new card']` | `7 cards` · `4 need you`(sig) · `2 blocked` · `1 shipped` · `synced 13:51`; right as given | items `['Production Releases','0 cards',{4 need you, sig},'synced 13:51']`, right `[]` | |
| Operate count render | D `.dy-count` "4" + sr ", 4 need you"; P `<span class="n">(4)</span>` + sr " need you"; S `.ct` "4", aria "Operate, 4 need you", tip "Operate · 4 need you"; Q `Operate <span class="qn-need">(4 need you)</span>`; phone D/S `.cnt` "4" + sr ", 4 need you"; phone P `(4)` + sr " need you"; phone Q `Operate&#160;<span class="need">(4)</span><span class="sr"> need you</span>` | | | |
| Count-badge colour | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)`. Studio desktop: `background: var(--sig-text); color: var(--vk-color-primary-fg)`. **corrected:** SB CSS used `--vk-color-signal` / `--sig-fg`. | | | |

### 3.3 Crew (`crewOf` rewrite, SB §1.3.3 + MC)

Rule:
- distinct agents over non-archived, not done/closed cards, in `ordered` order;
- first the `lastAgent` of needs cards → mood `needs`;
- then the `lastAgent` of working cards → `working`;
- then `queuedByAgentId` agents not already listed.

`crewLine`:
- `${m} wait on you` (m = count of `needs`);
- when m=0: `${k} at work`;
- when both are 0: `resting`.

`crewTitle` = `${names(needs)} wait on you; ${names(queuers)} queues the work`, where names are joined "a, b and c". Faces: `crew.slice(0,3)`. Hidden when crew is empty.

DX desktop rail:
- `<b>4 agents</b>3 wait on you`;
- title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work`;
- faces tester-tim, coder-kai, error-eric (all `needs`); super-chotu is counted but has no face (O-12). **corrected:** SB "3 agents / 2 wait on you".

Production Releases: crew hidden.

**Queuer mood (O-2, corrected SB G5):** asked-by faces draw super-chotu `working` on desktop (Daylight `.dl-asked` 18px, Studio `.ar-facts` 14px). On phones they draw him `resting` (aria "super-chotu, resting"). So the mood is a per-surface constant: desktop `working`, phone `resting`. G5's "working only when holding a working card" rule is **void**.

Phone Daylight crew (faces 32, `aria-label="Agents on this board"`): tester-tim, coder-kai and error-eric ("{name}, needs you"), then super-chotu ("super-chotu, resting"). The `small` reads `tester-tim, coder-kai and error-eric need you`. (SB's "single declaring agent of empty stages" rule now adds nobody, because no empty stage has a single declarer.)

Daylight greeting chips ("Holding cards"): the distinct lastAgent of needs cards, face 28 needs: tester-tim, coder-kai, error-eric.

### 3.4 Orderings

- **Desktop `ordered`** ("people needed first"): needs, working, queued, done, closed. The corrected references require DX = **63ac, 58f8, 1dfc, 4605**, f83f, 481f, 9ed9 (Studio table 01–07, Paper col 1, Studio panel, crew name order). MC calls this a "needs-first stable sort over the §A.5.2 order". **See Gap X-1:** neither the API order nor the existing `groupByUrgency` sort produces it.
- **Phone wants order** (Daylight wants lane, Paper letters, Studio rows, Quiet needs group): stopped cards (blocked / repeated-failure) by age desc, then no-owner, then the others. DX gives **4605 (66h), 58f8, 1dfc, 63ac**. Then queued f83f, 481f, then done 9ed9. The Studio phone rows are 01 4605 … 07 9ed9.
- Quiet desktop Done group: the newest `stateSince` first. Show the first 5 when there are more than 5 (9d48, Melissa, Anna, Lyra, Charlie), then `.qt-more` "Show all 20 done cards" (`aria-expanded`).

### 3.5 Stage owner labels (extend `stage-owner.ts`)

`ownerLong(stage)`:
- human: `a person`;
- human with a gate: `a person · approval`;
- capability with one declarer: `${label} · ${agent}`;
- capability with several: `${label} · ${n} agents`.

Examples:
- reported `a person`;
- reproduce `diagnostics · error-eric`;
- test `testing · tester-tim`;
- fix `code · 2 agents`;
- integrate `integration or api or testing · 3 agents`;
- signed-off `a person · approval`;
- Agent Onboarding proving `claim-check or analysis · 2 agents`;
- drafted `onboarding · onboarding-olivia`;
- portrait `design · artistic-lyra`.

`ownerShort(stage, sep=' · ')`:
- human: `a person`;
- human gate: `gate${sep}approval by a person`;
- single capability: `${cap}${sep}${who}`;
- multi-capability: `stage.owner` only.

Examples:
- `diagnostics · error-eric`, `code · 2 agents`, `integration`, `gate · approval by a person`;
- Quiet phone `sep=': '`: `diagnostics: error-eric`, `code: 2 agents`, `gate: approval by a person`, `integration`.

Quiet desktop stages table: ownerLong without " · approval" (the gate has its own column). Credentialed and Resident read `a person` + `Approval gate` (**corrected:** the old Credentialed "a person · approval" and Resident "—").

### 3.6 Sentence builders (exact outputs for the DX fixture)

| Function (suggested) | Rule | Output |
|---|---|---|
| `greetingLine(phase, firstName, needs)` Daylight band | `${greeting(phase,'daylight').replace(/\.$/,'')}, ${firstName}. ${needs===0?'Nothing needs you.':`${needs} ${needs===1?'card wants':'cards want'} you.`}` | `Good afternoon, Rakesh. 4 cards want you.` |
| `phoneHello` h1 | `${greeting…}, ${firstName}.` | `Good afternoon, Rakesh.` |
| `phoneHelloP` | `<strong>{as above}</strong>` + clauses: stopped `${numWord(k,true)} ${k===1?'agent':'agents'} stopped`; no-owner `${numWord(m)} card waits in a person's stage` (m>1: "cards wait"); questions `${k} asked a question`; review `${k} ${k===1?'waits':'wait'} for your review`; joined with " and " / ", " and ending in "." | `<strong>4 cards want you.</strong> Three agents stopped and one card waits in a person's stage.` |
| `wantsIntro` | `From ${numWord(distinctStages)} ${'stage'\|'stages'}, most urgent first.` | `From four stages, most urgent first.` |
| `paperKicker` | `Waiting on you · ${plural(needs,'letter','letters')}`; 0: not `.live` + `.pp-none` "Nothing waits on you." | `Waiting on you · 4 letters` |
| `studioHeroH1` | `<sr>${n} </sr>of ${all} cards are waiting on a person` (needs=1 → "card is"); 0 → `None of the ${all} cards is waiting on a person` | `<span class="sr">4 </span>of 7 cards are waiting on a person` |
| `heroSentence(model)` (studio-prose) | Needs items in table order, each a clause + `<sup class="fn">`:<br>• no-owner: `one sits in a stage nobody works` + (overdue ? ` and is ${numWord(daysOverdue)} days overdue`);<br>• blocked with attempts ≤ 1: `one stopped in ${stage} on its first try`;<br>• blocked with attempts > 1: `one stopped in ${stage} after ${numWord(n)} tries`.<br>Clauses are joined with "; ", the first letter capitalised, ending in ".". Then ` ${numWord(q,true)} more ${q===1?'is':'are'} queued behind a blocker,<fn>` and ` and ${numWord(d)} has shipped.<fn>` | `One sits in a stage nobody works and is five days overdue;¹ one stopped in Failing test on its first try;² one stopped in Fix after five tries;³ one stopped in Reproduce after two tries.⁴ Two more are queued behind a blocker,⁵ and one has shipped.⁶` (**corrected:** SB/mockup clause 2 "for want of…") |
| footnote numbers (`fnNumber`) | Each needs card gets its own number in order; the queued-blocked group shares one; the done group shares one; spend comes last | 63ac 1, 58f8 2, 1dfc 3, 4605 4, f83f 5, 481f 5, 9ed9 6, "Spend this week" 7 |
| `studioNotes(model)` | 1 no-owner mine: `Card ${ix} is yours, in ${stage}.` + (due ? ` It was due on <i>${dueLong}</i>.`) + ` No agent works this stage and no review is asked for here, so it will sit until it is moved.`<br>blocked, attempts==1: `Card ${ix} stopped on ${agent}’s first try, ${ageLong} ago: it ${lcFirst(summaryLine)}`<br>blocked, attempts>1: `Card ${ix} stopped in ${stage} after ${numWord(n)} tries: ${lcFirst(summaryLine)}`<br>queued group: `Cards ${list} are queued in ${stage} behind another card. Nobody has claimed them; each starts on its own when unblocked.`<br>done: `Shipped, nothing to do: <i>${titles}.</i>`<br>spend 0: `No card has spent anything yet: every card’s cost reads <i>—</i>.` | 1 `Card 01 is yours, in Reported. It was due on <i>6 October</i>. No agent works…until it is moved.` · 2 `Card 02 stopped on tester-tim’s first try, 33 hours ago: it needs a writable Forge URL for agentpod.` · 3 `Card 03 stopped in Fix after five tries: missing commit ×2.` · 4 `Card 04 stopped in Reproduce after two tries: no fresh DM event to trace; needs one per agent.` · 5 `Cards 05 and 06 are queued in Failing test behind another card. Nobody has claimed them; each starts on its own when unblocked.` · 6 `Shipped, nothing to do: <i>Build immutable approval subjects and digest-bound gates.</i>` · 7 the spend line |
| `panelHeading` | kick `Needs you now · ${n}`; h2 `${numWord(n,true)} ${n===1?'card is':'cards are'} waiting for a decision` + fixed p `Each one says what it needs. Answer here, or open the card for the whole story.`; 0: h2 `Nothing is waiting for a decision`, no p | `Needs you now · 4` / `Four cards are waiting for a decision` |
| panel p | no-owner → the attention instruction; blocked → `Stopped. ${summaryLine ?? firstSentence(detail)}` | 63ac `No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.`; 58f8 `Stopped. Needs a writable Forge URL for agentpod.`; 1dfc `Stopped. Missing commit ×2.`; 4605 `Stopped. No fresh DM event to trace; needs one per agent.` |
| `phoneLede` (Studio phone) | `${numWord(stopped,true)} stopped and need resuming; ${numWord(noOwnerMine)} sits in your own stage` + overdue clause + `. ${numWord(qb,true)} are queued behind a blocker; ${numWord(done)} has shipped.` | `Three stopped and need resuming; one sits in your own stage and is five days overdue. Two are queued behind a blocker; one has shipped.` |
| `quietLede` | needs 0 and all done → `Nothing needs you. All ${n} cards are done.`; needs 0 otherwise → `Nothing needs you.`; else `${n} ${n===1?'card needs':'cards need'} your decision.` | Agent Onboarding: `Nothing needs you. All 20 cards are done.`; sub `Superpipeline · 20 cards` |
| `quietPhoneHeader` | `Superpipeline · ${plural(all,'card','cards')} · ${needs} need your decision` (third part omitted when 0) | `Superpipeline · 7 cards · 4 need your decision` |
| `quietFacts` (desktop item) | `Done.` + (p ? ` Priority ${p}.`) + (labels ? ` Labels: ${a, b, c}${more?` and ${more} more`:''}.`) + (blocked ? ' Blocked by another card.') + (ref ? ` Reference: ${ref}.`) + (queuer ? ` Asked by ${queuer}.`) + (due ? ` Due ${dueLong}.`) + ` ${plural(attempts,'attempt','attempts')}.` | 9d48 `Done. Priority 1. Labels: clean-room, evidence-required, superpipeline and 1 more. Reference: Clean-room SuperPipeline operator journey — attempt 6 evidence. Due 5 October. 10 attempts.`; Melissa `Done. Priority 2. Blocked by another card. Reference: Message Melissa — pinned Sketchbook persona. Asked by super-chotu. 5 attempts.`; Lyra `Done. 5 attempts.` |
| quiet meta (desktop) | done `Ran by ${lastAgent} · ${stage} · done ${agoWords}`; needs `${agent} · ${stage} · ${ageLong}`; queued `Not picked up yet · ${stage}` | `Ran by onboarding-olivia · Resident · done 20 hours ago` |
| Empty-board lede | `intro.lede`: render `**x**` → `<b>x</b>` and escape everything else; absent → `This board has ${numWord(n)} stages.`; composeHint absent → `Say what you want in a sentence; an agent drafts the brief.` | see API-3 |

### 3.7 Grid / misc formulas

- **Daylight `cols`**:
  - one entry per stage;
  - an empty, collapsed stage → `60px`;
  - the stage(s) with the highest count, when that count > 1 → `minmax(0, 1.15fr)`;
  - every other stage → `minmax(0, 1fr)`.
  - DX now gives `minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr) 60px 60px minmax(0, 1fr)`. **corrected:** Reproduce is a lane now.
  - The reference CSS also changes `.dl-board` `gap: 14px` (SB 22px) and the column arrow `right: -12px` (SB −16px). Port the reference.
  - The lane holding the open peek gets `style="z-index: 5"`.
- **Studio ShareBar**:
  - `grid-template-columns` inline `${count}fr` per present segment → `4fr 2fr 1fr`;
  - labels `4 waiting on you` (`.lab.s`) / `2 queued, blocked` / `1 done`;
  - aria `4 waiting on you, 2 queued and blocked, 1 done`;
  - the queued label is "queued, blocked" when every queued card is blocked.
- **Studio multiples note**:
  - empty → `Empty`;
  - all done → `Done`+fn;
  - single no-owner overdue → `Overdue since ${dueShort}`+fn;
  - single blocked, attempts>1 → `Stopped after ${n} tries`+fn (digit);
  - mixed → `${blocked} blocked, ${needs} stopped`+fn.
  - DX: Reported `Overdue since 6 Oct`¹, Reproduce `Stopped after 2 tries`⁴, Failing test `2 blocked, 1 stopped`², Fix `Stopped after 5 tries`³, Integrate/Signed off `Empty` (class `z`), Shipped `Done`⁶.
  - Signed off `.gate` `Gate · approval`.
  - The section sub-heading reads `1 square = 1 card · stages darken towards Shipped`.
- **Studio multiples aria (verbatim from the reference):**
  - `Stage 1, Reported: 1 card, waiting on you. Worked by a person`
  - `Stage 2, Reproduce: 1 card, waiting on you. Worked by error-eric`
  - `Stage 3, Failing test: 3 cards, 1 waiting on you, 2 blocked. Worked by tester-tim`
  - `Stage 4, Fix: 1 card, waiting on you. Code, 2 agents`
  - `Stage 5, Integrate: 0 cards. Integration or api or testing, 3 agents`
  - `Stage 6, Signed off: 0 cards. Approval gate, a person`
  - `Stage 7, Shipped: 1 card, done. A person`
  - These do not follow one regular rule; test the exact strings.
  - Phone: `Stage {i}, {name}: {plural}`.
- **Studio ramp aria**: `Stage {i} of {n}: {name}{needs&&stopped?', stopped':''}. Stages: Reported, Reproduce, Failing test, Fix, Integrate, Signed off, Shipped`. 63ac (no-owner) has no ", stopped".
- `moreLabels` = `labels.length − shown` (shown = the first 3 resolvable). Dangling ids count. 63ac → `+1`, title `1 more label`. **corrected:** `summarize` drops unknown ids today.
- `daysOverdue` = whole days from due to today: due 2026-10-06 → `five`.

---

## 4. Component structure per vibe

### 4.1 Architecture (SB §1.1)

- `lib/layouts.ts`:
  - add `SHELL_LAYOUTS: Record<Vibe,{desktop: Component<ShellProps>; phone: Component<ShellProps>}>`;
  - change `BOARD_LAYOUTS` to `{desktop, phone}` per vibe.
- `shell/types.ts`:
  - `ShellHere = 'plan'|'operate'|'workspace'`;
  - `ShellSection = 'board'|'list'|'projects'|'operate'|'card'|'workspace'|'settings'|'spend'`;
  - `ShellProps { here; section; boardName: string|null; view: 'board'|'list'|'projects'|null; showing: string|null; paperShowing?; editionCount?; studioSubRight?; status?: {items: Array<{text; signal?}>; right: string[]}|null; sky?: Snippet; children: Snippet }`;
  - `MenuItem { kind:'heading'|'item'|'checkbox'; label; sub?; icon?; checked?; onSelect? }`.
- `shell/AppShell.svelte`:
  - picks `SHELL_LAYOUTS[vibe][viewport.phone?'phone':'desktop']`;
  - mounts ComposeSheet (moved from BoardHeader), BoardSwitcher (controlled by `app.boardSwitcherOpen`) and `plan/FilterDialog.svelte` (NEW);
  - owns the `svelte:window` keydown: `G P`/`G O`/`G W` within 1 s, `N` compose, `F` filter, `⌘K` search, all ignored while an input, textarea or contenteditable has focus.
- `lib/viewport.svelte.ts`: `viewport.phone` = `matchMedia('(max-width: 899.98px)')`. (vibekit AppShell uses 640px; the SB breakpoint 900 wins for Superpipeline. Note the mismatch.)
- Delete:
  - `shell/Rail.svelte`;
  - `shell/BottomNav.svelte` (+ test; move its assertions to the 4 phone shells);
  - `shell/BoardHeader.svelte`;
  - PlanView's view toggle and FilterBar row.
- `routes/+layout.svelte`: `.app-shell` becomes `<div class="app-root">`. `b/[boardId]/+layout.svelte` drops BoardHeader and the `<main>` wrapper. Every page wraps its content in `<AppShell …>`.
- PlanView renders `<AppShell here="plan" section={view} boardName view showing paperShowing editionCount studioSubRight status sky=…>`:
  - `sky` is `DlGreeting` for Daylight desktop board view and `PdHello` for Daylight phone;
  - **no greeting band on the empty board** (O-13);
  - it renders `BoardEmpty` when the board has 0 non-archived cards (filters ignored) and view=board, and `BOARD_LAYOUTS[vibe][phone?'phone':'desktop']` otherwise.
- `board/board-model.ts` `buildBoardModel(board, filteredCards, ctx)` → `BoardModel { boardId, boardName, cards, ordered, stages (+ownerLong, ownerShort, units), needs, working, queued, done, closed, counts{all,needs,working,queued,queuedBlocked,done,closed,overdue,overBudget,blocked}, spend7d, crew }`.
- `BoardLayoutProps` = `{ model: BoardModel; vibe; phase; onCompose }`.
- `CardSummary` gains `lastAgent: AgentRef|null`, `ageShort`, `ageLong`, `agoWords`, `stopReason`, `summaryLine` (needsHuman.summary), `labelsAll`, `moreLabels`, `kind: AttentionKind|null`, `terminal`, `fnNumber`.
- Icon registry (SB §0.4) → vibekit `Icon`. Names: mark, plan, plan-sq, plan-phone, operate, operate-filled, workspace, people, moon, sun, signout, signout-studio, chev, search, search-phone, plus, filter, filter-paper, funnel, move, move-phone, warn, warn-phone, blocked, blocked-phone, lock, link, doc, close, check, arrow, pen. Stroke 1.8 on Daylight/Paper desktop, 1.75 on Studio (mark 2), 2 on phones.

### 4.2 vibekit name mapping (SB name → vibekit-components.md §2.2 name)

| SB | vibekit | SB | vibekit |
|---|---|---|---|
| NavItem / CountBadge | AppNav (`NavItem` type, `count`) and PhoneTabBar | LiveStatus | Masthead `live` (LiveDot) |
| SearchTrigger | CommandField | ViewSwitch | Segmented (D) / Tabs (P, S, Q) |
| StatusLine | StatusLine | StageRamp | StageTrack (S) |
| StageMultiples / ShareBar | SmallMultiples (incl. UnitChart, ShareBar) | StateMarker | StateLabel `form="marker"` |
| FigureRow / DataTable / QuickFilter / Disclosure / Menu / Face / Sky / EmptyState | same names | Footnote(List) | Footnotes + FootnoteRef |
| Initials | AgentName `initials` (no standalone component) | StageChip / Chip / Popover / SkipLink | no vibekit component (Popover ≈ Menu/Overlay; SkipLink is built into AppShell). Product-local until reconciled. |

Until a vibekit component lands, port the reference CSS into the app component. The DOM and class names are the contract.

### 4.3 Shells (CSS: port from the reference file of the named artboard; class prefixes below)

| Shell | File | Root / prefix | Reference CSS source |
|---|---|---|---|
| Daylight desktop | `shell/ShellDaylight.svelte` | `.dy-app` > `nav.dy-rail` (`.dy-logo .dy-dests .dy-dest .dy-count .dy-crew .dy-faces .dy-foot .dy-round .dy-acct .dy-ini .dy-menu`) + `.dy-main` > `.vk-sky.dy-sky` (`.dy-sun .dy-top .dy-switch .dy-live .dy-livedot .dy-grow .dy-search .dy-kbd .dy-new .dy-sub .dy-filter .dy-note`). `.sh-iconbtn` goes in app.css under `[data-vibe="daylight"]`. | SP-Board-Daylight, dc lines 19-20 and 80-126. `.dy-app *` → `:global`; `[data-theme=dark] .dy-sky` → `:global(...)`; `.dy-sun` `right:540px` |
| Paper desktop | `shell/ShellPaper.svelte` | `header.mh` (`.mh-top .mh-name .mh-date .mh-quiet .mh-q .mh-acct .mh-menu .mh-sections .mh-sec .n .mh-live .mh-livedot .mh-ed .mh-title(.mh-title--sm) .mh-change .mh-acts .mh-btn(.mh-btn--write) .mh-kbd .mh-tabs .mh-tab .mh-showing`). The `<h1 class="mh-title">` is the page h1, so board content starts at h2. `--mh-gutter:56px` | SP-Board-Paper dc 20-65 |
| Studio desktop | `shell/ShellStudio.svelte` + global `lib/styles/annual.css` (Annual base: every `.ar` rule — `.ar-btn .ar-btn2 .ar-lk .ar-ib .kick .u(.needs/.blocked/.queued/.done/.off + NEW .working{background:var(--s5)}) .chip .c1..c7 .fn .kbd .h44 .sr .ar-tbl .ar-facts .ar-kv .ar-field .ar-hero .ar-sec .ar-figs .ar-ramp .ar-track .ar-q .ar-pfn .ar-notes .ar-status`, imported from app.css) | `div.ar.bd[data-shell=studio]` grid `64px | 1fr` > `nav.ar-rail` (`.ar-mark .ar-nav .ct .tip .ar-acct`) + `.bd-body` > `header.ar-top` (`.ar-board .kick .ar-sw .ar-cmd .box .ar-live`) + `.ar-sub` (`.ar-tab .ar-fl .ar-hint .r`) + children + `footer.ar-status` | SP-Board-Studio dc 15-199 + 201-203 (identical in every Studio artboard) |
| Quiet desktop | `shell/ShellQuiet.svelte` | `.sh-root` > `header.qn` (`.qn-skip .qn-row .qn-name .qn-links .qn-need .qn-end .qn-dash .qn-board .qn-btn .qn-kbd .qn-view .qn-dot .qn-live .qn-note .qn-link`). Content provides `<main id="content" tabindex="-1">` | SP-Board-Quiet dc 19-43 |
| Phone base (D, P, Q) | `app.css` `.ph-root …` (rename from `.r`; `width:100%`); `.wrap .mono .muted .ico .ib .face .sr` | | SP-Phone-Board-Daylight dc 15-29 |
| Daylight phone | `shell/phone/PhoneShellDaylight.svelte` | `.ph-root[data-shell=daylight-phone]` > `.greet` (sky, plus `.sun` and the dark rules moved from board CSS; sky vars `--vk-sky-{phase}-*` in light, `dusk` in dark) > `header.pd-top` (`.sw .pd-search .nc`) + `.pd-sub` (`.vt .fb .pd-live`) + sky snippet; `nav.nav` (`.cnt .av`) | SP-Phone-Board-Daylight dc 30-49, 52-53, 106-107 |
| Paper phone | `PhoneShellPaper.svelte` | `.ph-root` > `header.pm` (`.pm-top .pm-name .pm-live .pm-tx .pm-ed h1 .pm-date .pm-links .pm-link(.w) .pm-tabs .pm-tab`) + `nav.nav` (`.n`) | SP-Phone-Board-Paper dc 30-53. Icons: search/filter 16, chevron 20 |
| Studio phone | `PhoneShellStudio.svelte` | `div.ar.ph` (`width:100%`) > `header.ph-top` (`.r1 .r2 .ph-ib.b`) + `.pb-sub` + `nav.ph-nav` (`.ic .cnt .me`) | SP-Phone-Board-Studio dc 201-219 |
| Quiet phone | `PhoneShellQuiet.svelte` | `.ph-root` > `header.pq` (`.pq-skip .pq-row .pq-board .pq-dash .pq-link .pq-btn .pq-view .pq-dot`, plus `<span class="sr" role="status">Live</span>`) + `nav.pqb` (`.need`) | SP-Phone-Board-Quiet dc 30-46 |
| You menu | `shell/YouMenu.svelte` | vibekit Menu, `placement:'top'`. Items: heading userName / sub "Signed in"; Appearance; checkbox "Dark theme"; Sign out | styled from each vibe's desktop menu |

Per-vibe shell text (exact, DX):
- **Daylight:**
  - rail: Plan / Operate (4) / Workspace;
  - crew `4 agents` `3 wait on you`;
  - appearance button `aria-label="Appearance"`, title `Appearance · the sky follows the time of day`;
  - account `<summary aria-label="Rakesh Gangwar, account menu">` RG → menu `<p><b>Rakesh Gangwar</b>Signed in</p>`, `menuitemcheckbox` "Dark theme", "Sign out";
  - `.dy-switch` "Developer Experience" + chev (no aria-label);
  - `.dy-live` "Live" + hidden " · changes appear as they happen", title "Live: changes arrive as they happen";
  - "Search" "⌘K";
  - "New card";
  - segmented Board / List / Projects;
  - "Filter cards" `none on` (hidden when view=projects);
  - `Showing all 7 cards`.
- **Paper:**
  - "Superpipeline" nameplate;
  - dateline;
  - "Appearance" · "Dark theme" (`aria-pressed`) · "Rakesh Gangwar ⌄" → `Signed in as Rakesh Gangwar` / Sign out;
  - sections Plan / Operate (4) / Workspace;
  - `<b>Live</b> · changes appear as they happen`;
  - h1 board name;
  - "Change board" (aria `Change board, now Developer Experience`);
  - "Filter cards · none on";
  - "Search⌘K";
  - "Write a new card";
  - tabs in small caps;
  - `.mh-showing` = paperShowing.
- **Studio:**
  - rail tips `Plan G P`, `Operate · 4 need you G O`, `Workspace G W`, `Dark theme`, `Appearance`, `Rakesh Gangwar` (on `.ar-acct`, aria `Rakesh Gangwar, account`), `Sign out`;
  - kick `Superpipeline · {section}` → `Superpipeline · board`;
  - `.ar-sw` aria `Board: Developer Experience. Change board`;
  - search placeholder "Search or run a command" with ⌘K;
  - "Live";
  - "New card N";
  - tabs `Board` · `List 7` · `Projects 3` (`aria-pressed`);
  - `Filter cards` `<i>none on</i>`;
  - `.ar-hint` showing;
  - `.r` studioSubRight;
  - `footer.ar-status aria-label="Status"`.
- **Quiet:**
  - "Skip to content";
  - "Superpipeline";
  - Plan · `Operate (4 need you)` · Workspace;
  - "Appearance", "Dark theme", account link `Rakesh Gangwar` (href `/workspace/people`, `aria-haspopup="menu"`), `—`, "Sign out";
  - row 2: `Board: <b>X</b> — Change board`, `<b>Live.</b> Changes appear as they happen.`, `Search ⌘K`, `New card` (outline `.qn-btn`), `View: Board · List · Projects`, `Filter cards (none on)`, `.qn-note` showing.
- **Phones:**
  - Daylight: `.sw` aria `Switch board: X`; nav labels Plan / Operate / Workspace / You (`.av` RG + sr ", Rakesh Gangwar"); `.pd-live` "Live".
  - Paper: "Superpipeline" / "Live" / "Search" / h1 / dateline · editionCount / "Change board" / "Write a new card" / tabs / "Filter"; nav "You" + chev.
  - Studio: kick `Superpipeline · board`, Live, search icon button, `.ar-sw` + "New card"; tabs Board / List 7 / Projects 3 / Filter; nav `.me` RG.
  - Quiet: "Board: **X** — Change board", sr "Live", "Search", "New card", "Filter", "View: Board · List · Projects"; nav Plan / Operate (4) / Workspace / You.

### 4.4 Board layouts (port the reference CSS by selector; SB gives the dc line ranges)

| Vibe | Files | Prefix / reference selectors |
|---|---|---|
| Daylight desktop | rewrite `board/layouts/BoardDaylight.svelte`. NEW `board/daylight/DlGreeting.svelte` (`.dl-band .dl-greet .dl-crew .dl-jump`), `DlLane.svelte` `{stage, cards, peekId, style?, onCollapse?}` (`.dl-board .dl-lane .dl-lanehead .dl-count .dl-blocked .dl-owner`), `DlStrip.svelte` `{stage, ownerFace, onExpand}` (`.dl-strip .v .n .gate .owner`, `aria-expanded`), `DlTile.svelte` `{s, stages, peekOpen, onPeek}` (`.dl-tile(.p1 .p2 .needs .focused) .dl-title .dl-move .dl-chips .dl-chip(.block) .dl-ref .dl-meta .dl-who .dl-mood(.needs) .dl-asked .dl-due .dl-act`), `DlPeek.svelte` `{s, onClose}` (`.dl-peek .eyebrow .dl-say .dl-bubble .who .dl-clamp .dl-peekfoot .dl-hint .dl-close`). Delete BoardKanban, GreetingBand, Peek (+ tests; port their assertions), and CardTile if unused. Reuse CardMoveMenu and peek.ts. | SP-Board-Daylight dc 23-77 (reference values win: gap 14px, arrow -12px). The arrow rule is split per component; `.dl-act :global(.vk-button)` |
| Paper desktop | rewrite `BoardPaper.svelte` → `<main class="pp">`; NEW `board/paper/PaperStory.svelte` `{s, size:'lead'|'small', stages}`, `PaperPipeline.svelte` `{stages}` | `.pp .pp-cols .pp-col .pp-kicker(.live) .pp-none .pp-story .pp-lead .pp-small .pp-quote .pp-clamp .pp-more .pp-by .pp-facts(.due .ref) .pp-acts .pp-btn(.reply .ghost) .pp-write .pp-pipe` (dc 67, 72-110; not `.pp-mast/.pp-date/.pp-folio`). `.pp-pipe ol` inline `repeat({stages.length}, minmax(0,1fr))` |
| Studio desktop | rewrite `BoardStudio.svelte` → `.bd-grid > main.bd-main + aside.bd-panel`; NEW `board/studio/StudioHero.svelte`, `StudioNeedsPanel.svelte`, `studio-prose.ts` | `.bd-grid .bd-main .bd-qf .ar-sm .ar-mul(.z) .band .lb .nm .n .units .note .who .gate .ar-share .lab(.s) .bd-move .ar-tbl td.mv .bd-panel .bd-need .row .age .by .stg .acts .bd-keys` (dc 204-260) |
| Quiet desktop | rewrite `BoardQuiet.svelte` → `<main class="qt" id="content" tabindex="-1">`; NEW `board/quiet/QuietItem.svelte` `{s, stages}` | `.qt .qt-sub .qt-lede .qt-newcard .qt-zero .qt-list .qt-item .qt-titlebtn .qt-meta (face grayscale) .qt-facts .qt-acts .qt-more .qt-table td.n` (dc 47-73) |
| Daylight phone | NEW `BoardDaylightPhone.svelte` (`nav.step`, `section.lane.wants`, per non-empty stage `section.lane#stage-{key}` with `.sep`, `section.empties#empty`); `board/daylight/PdHello.svelte` (sky snippet `.pd-hello`, `.crew`); `PdTile.svelte` `{s, place:'wants'|'stage', stages}` | `.step .lane(.wants) .lh .tile(.p1 .p2) .trow .stg .mv .tt .chips .chip(.ref .blk) .bub .say .meta .agent .mood .due .act .btn(.go .sec) .note .empties .sep` (dc 51-109) |
| Paper phone | NEW `BoardPaperPhone.svelte`, `board/paper/PaperLetterPhone.svelte` (`article.letter`), `PaperEntryPhone.svelte` (`article.entry`) | `.col .eh(.sig) .letter .lt .q .rest .sig-line .portrait .facts(.od .ref) .acts .pb(.pri) .entry .by .none .mvb .pipe .write details.more` (dc 55-85) |
| Studio phone | NEW `BoardStudioPhone.svelte` (`main.pb-main`), `board/studio/StudioCardPhone.svelte` (`article.pb-card`), `details.pb-stages` | `.pb-hero .big .pb-lede .pb-qf .pb-figs .pb-sm .pb-card .rl(.needs) .ix .age dl dt dd .nx p(.q) .pb-stages` (dc 220-276) |
| Quiet phone | NEW `BoardQuietPhone.svelte` (`.hd#content`, 5 `.grp`, `.tbl`), `board/quiet/QuietItemPhone.svelte` (`article.it(.nd .plain)`) | `.hd .lk .grp .it .tr .tt .mvb .mt (face saturate .4) .rs .fs .od details.full .ac .nn .tbl` (dc 48-73; `.r` → `.ph-root`) |
| Empty (all vibes) | NEW `board/BoardEmpty.svelte` (one component; composes vibekit EmptyState) inside the vibe's canonical shell | `.em .em-card .em-head .em-eyebrow .em-lede .em-cta .em-flow .em-step(.gate) .em-top .em-num .em-who .em-does .em-tags .em-tag(.g) .em-foot` (SP-Board-Empty dc 23-47; do not port dc 204-210). Phone <900 (not drawn): `.em{padding:16px 16px 32px}.em-card{padding:24px 20px;gap:24px}.em-head{grid-template-columns:minmax(0,1fr)}.em-flow{grid-template-columns:minmax(0,1fr)}.em-step:not(:last-child)::after{display:none}` |

### 4.5 Per-board content (DX, corrected)

**Daylight desktop tiles:**
- Reported 63ac (`p1 needs`):
  - label chips clean-room, evidence-required, superpipeline, `+1`;
  - who: Initials RG 24 + `With you` + `· no agent works this stage`;
  - asked chip;
  - `Overdue · due 6 Oct`;
  - action `Move to another stage` (vk-button--signal → CardMoveMenu).
- Reproduce 4605 (`needs`, no stripe):
  - sr `Priority 3`;
  - ref "AgentPod v0.1.91 Matrix inbound bridge contract";
  - error-eric face 24 `· needs you`;
  - asked chip (title `Queued by super-chotu, not by you`);
  - `Resume`.
- Failing test (lane head `3`, `2 blocked` title "Blocked cards are skipped when agents claim work", owner `testing · tester-tim`):
  - 58f8 `p2 needs` + ref "Deterministic X publisher red-test evidence" + `tester-tim · needs you` + asked chip + Resume;
  - f83f `p2` + Blocked chip (title "Blocked by another card. This card will not be claimed") + `Unclaimed · starts when unblocked` + asked chip;
  - 481f Blocked + Unclaimed.
- Fix 1dfc (`needs`, **no p2 and no Priority sr**):
  - ref "test(api): pin manual delivery reminder";
  - `coder-kai · needs you`;
  - Resume.
- Strips:
  - Integrate: `0` / `Integrate` / `3 agents`, aria `Integrate, no cards. integration or api or testing · 3 agents. Expand stage`;
  - Signed off: `0` / `Signed off` / `gate` / `a person`, aria `Signed off, no cards. a person · approval, approval gate. Expand stage`, title `a person · approval`.
- Shipped 9ed9: sr Priority 2, ref "test(api): pin immutable approval subject binding", check + `Shipped`.
- Peek:
  - `Peek · Failing test · 33h in this stage`;
  - face 36 `aria-label="tester-tim, needs you"`;
  - `.who` `tester-tim · I’ve stopped and need you`;
  - detail verbatim with a straight `'`, 4-line clamp;
  - `Resume` (primary) and `Open card to read it all` (secondary);
  - hint `Opens when you point at or focus a card · Esc closes`;
  - close is `sh-iconbtn dl-close` "Close peek".
  - `KIND_SAYS = { blocked:'I’ve stopped and need you', 'repeated-failure':'I keep failing and need you', question:'I have a question', review:'please review my work', 'no-owner':'nobody works this stage' }`.

**Paper desktop:**
- Col 1 `Waiting on you · 4 letters`, with 4 lead stories in the order 63ac, 58f8, 1dfc, 4605.
- 63ac:
  - quote `“No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.”`;
  - by `RG With you · Reported · 2d`;
  - facts `P1` · `clean-room · evidence-required · superpipeline · +1` · `asked by super-chotu` · `.due` `Overdue · due 6 Oct`;
  - acts `.pp-btn.reply` `Move to a stage someone works`, Open, Move.
- 58f8:
  - quote “detail” with `Read the rest`;
  - by `tester-tim · Failing test · 33h · attempt 1`;
  - facts `P2` · ref · asked;
  - Resume / Open / Move.
- 1dfc:
  - quote `“this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit”` (desktop verbatim, no clamp);
  - by `coder-kai · Fix · 33h · 5 attempts`;
  - facts ref only (no P2).
- 4605:
  - quote “4605 detail” + Read the rest;
  - by `error-eric · Reproduce · 2d · 2 attempts`;
  - facts `P3` · ref · `asked by super-chotu`.
- Col 2: `In progress` + `Nothing in progress.`; `Coming up · 2`:
  - f83f by `Unclaimed · Failing test · starts when unblocked`, facts P2 · Blocked · asked;
  - 481f Blocked.
- Col 3:
  - `Shipped · 1` — 9ed9 by check + `<em>Shipped</em> · Shipped`, facts P2 · ref;
  - `Closed` + `No card has been closed.`;
  - `.pp-write` `Write a new card` / `Describe it in a sentence; an agent drafts the brief.` / `New card`. (Out of scope: agent-drafted brief. This is copy only, and the button opens ComposeSheet.)
- Pipeline `The pipeline · read left to right`:
  - Reported `1 card` `a person`;
  - Reproduce `1 card` `diagnostics · error-eric`;
  - Failing test `3 cards` `2 blocked` `testing · tester-tim`;
  - Fix `1 card` `code · 2 agents`;
  - Integrate `empty` `integration or api or testing · 3 agents`;
  - Signed off `empty` `approval gate` `a person · approval`;
  - Shipped `1 card` `a person`.

**Studio desktop:**
- Quick filter `Show` All 7 · Need you 4 (`.sig`) · Working 0 · Queued 2 · Done 1 (local state that filters the table and panel only).
- Hero `.big` 4 + kick `The state of the board`.
- 01 `The board in figures` / `this week`: Cards 7, Need you 4 (sig), Working 0 (z), `$0.00` Spend this week (z, fn 7), Over budget 0 (z), Overdue 1.
- 02 multiples (§3.7).
- 03 `What state they are in` / `share of 7 cards`.
- 04 `Every card, people needed first`:
  - keys `↑ ↓ row · Enter open · M move · Alt + ← → stage`;
  - caption sr `7 cards, people needed first`;
  - columns No. 32 / Card / Stage 116 / Agent 112 / Tries 44 / Age 44 / Due 92 / State 140 / Move 84 (sr).
- Rows (No · Agent · Tries · Age · Due · State):

| No. | Card | Agent | Tries | Age | Due | State |
|---|---|---|---|---|---|---|
| 01 | 63ac | RG square + sr "Rakesh Gangwar, " + `You` | 0 | 2d | `.m.sig` `Overdue · 6 Oct` | Waiting on you |
| 02 | 58f8 | tester-tim | 1 | 33h | — | Waiting on you |
| 03 | 1dfc | coder-kai | `.sig` 5 | 33h | — | Waiting on you |
| 04 | 4605 | error-eric | `.sig` 2 | 2d | — | Waiting on you |
| 05 | f83f | `Unclaimed` | 0 | 2d | — | `Queued · blocked` |
| 06 | 481f | `Unclaimed` | 0 | **33h** | — | `Queued · blocked` |
| 07 | 9ed9 | `Shipped` | **15** | — | — | `Done` |

  - Facts: 1dfc has ref only (no P2); 4605 `P3` · ref · face 14 `asked by super-chotu`.
  - Notes 1–7 (§3.6).
  - Panel: 4 `.bd-need`:
    - row `0{ix}` / `Waiting on you` / age;
    - `.by` (RG `You` or face + agent) · StageChip + stage · `{i}/7` (1/7, 3/7, 4/7, 2/7);
    - actions: no-owner `Move it` (icon move 15) + `a.ar-btn2` `Open`; blocked `Read why and resume`.
  - `.bd-keys`: `⌘K Search or run a command · N New card · F Filter cards · M Move the selected card`.

**Quiet desktop (Agent Onboarding):**
- h1 `Agent Onboarding`;
- groups `Needs your decision (0)`, `In progress (0)`, `Waiting to start (0)` (one `ul.qt-zero aria-label="Empty groups"`, each `None.`);
- `Done (20)` `The last 5, newest first.`;
- then `Closed (0)` None (its own `ul aria-label="Closed"`);
- item actions `Open` (`/b/{id}/c/{card}`) and `Move to another stage` (aria `Move {title} to another stage`);
- stages table `Stage · Cards · Who works it · Gate`, cells `0 (empty)` / `20`.

**Phone Daylight:**
- step chips: `Needs you 4` (`.needs`, aria-current) · `Reported 1` · `Reproduce 1` · `Failing test 3` · `Fix 1` · `Integrate 0` · `Signed off 0` · `Shipped 1`;
  - hrefs `#wants`, `#stage-{key}` (`#stage-reported`, `#stage-reproduce`, `#stage-test`, `#stage-fix`, `#stage-shipped`), empty → `#empty` with `.empty`. **corrected:** `#failing` etc.
- wants h2 `Needs you 4`.
- Tile `.stg`: `Reproduce · stage 2 of 7 · 2d` / `Failing test · stage 3 of 7 · 33h` / `Fix · stage 4 of 7 · 33h` / `Reported · a person's stage · 2d`.
- `.bub`: face 24 + `{agent} · needs you`, sentenceCase(detail) 3-line clamp, plus `Read the rest` only when clamped (1dfc has none).
- Chips: `a.chip.ref` doc icon + firstRef title (href = ref.url, target _blank); label chips + `+1` for 63ac.
- 63ac text `Reported is a person's stage. Waiting for you to pick it up or move it on.`
- `.meta`:
  - 4605 asked chip (face 16 resting) + `$0.00` + `attempt 2`;
  - 58f8 asked + `$0.00` + `attempt 1`;
  - 1dfc `$0.00` `attempt 5` (**corrected:** no asked chip, C-17);
  - 63ac asked + `.due` `Due 6 Oct, overdue` (no cost or attempt).
- `.act`: blocked `Resume`, no-owner `Open`.
- Stage lanes:
  - h2 name + `.n` count; Failing test also `.chip.blk` `2 blocked` (title "2 cards wait on other cards"); p ownerShort;
  - `.note`: `1 card, waiting on you above.` (Reported, Reproduce, Fix), and `1 card is waiting on you above. 2 are queued here.` (Failing test).
- Queued tiles:
  - `Queued · 2d` + `Blocked by 3 cards` (title `Waits on {titles joined '; '}`) + `— not picked up yet` + asked;
  - `Queued · 33h` + `Blocked by 1 card`.
- Done tile: `Done · 1d ago · 15 attempts` + Done chip (bg `--vk-mood-done`, check) + `$0.00`.
- Empties: `Empty stages · 2` with `<b>Integrate</b> · integration` and `<b>Signed off</b> · gate · approval by a person`.

**Phone Paper:**
- `Waiting on you · 4 letters`, letters in the order 4605, 58f8, 1dfc, 63ac.
- `.q`: `“{sentenceCase detail}”`; 63ac `“Waiting to be picked up.” Reported is a person's stage.`
- sig-line:
  - `error-eric · Reproduce · 2 days ago · attempt 2`;
  - `tester-tim · Failing test · 33 hours ago` (attempt only when n>1);
  - `coder-kai · Fix · 33 hours ago · attempt 5`;
  - 63ac queuer face (resting) + `<em>asked by super-chotu</em> · Reported · 2 days ago`.
- facts:
  - 4605 `P3 · asked by super-chotu · $0.00 · {ref}`;
  - 58f8 `P2 · asked… · $0.00 · ref`;
  - 1dfc `$0.00 · ref`;
  - 63ac `P1 · clean-room · evidence-required · superpipeline · +1 · .od Due 6 Oct · overdue`.
- acts `.pb.pri` Resume / Open + `.mvb` Move.
- `In progress` + `Nobody is working on a card right now.`
- `Coming up · 2`:
  - `Not picked up yet · Failing test · 2 days`, facts `P2 · Blocked by 3 cards · asked by super-chotu`;
  - 481f `… · 33 hours` / `Blocked by 1 card`.
- `Shipped · 1`: `Done yesterday · after 15 attempts`, facts `P2 · $0.00`.
- `Nothing closed.`
- Pipeline:
  - `.ar` `1` for the first stage, then `→`;
  - `<b>Reported</b> · 1 · a person`, `Reproduce · 1 · diagnostics · error-eric`, `Failing test · 3 · 2 blocked · testing · tester-tim`, `Fix · 1 · code · 2 agents`, `Integrate · empty · integration`, `Signed off · empty · gate · approval by a person`, `Shipped · 1 · a person`.
- `.write` `Write a new card` / `It starts in Reported, with you.` / button `Write a new card`.

**Phone Studio:**
- hero `4`, kick `13:51 · midday`, h1 as desktop, lede (§3.6).
- qf `All 7 · Needs 4 (sig) · Working 0 · Idle 2 · Done 1`.
- figs `$0.00` `Spend · 7 days` (z) · `0` `Over budget` (z) · `1` `Overdue` (sig) · `7<small>stages</small>` `2 blocked`.
- 01 `Where the cards are` / `1 square = 1 card`.
- 02 `Cards, needs you first` / `7 rows` + sr `Each row: status, card, agent, stage, attempts, age, next step, cost, due.`
- `.rl`: `Needs you · stopped` / `Needs you · your stage` / `Queued · blocked by 3` / `Queued · blocked by 1` / `Done`; age as ageShort (done `1d`).
- `.stg`: chip, name, ramp (aria-hidden), `{i}/7`.
- dl (needs only) Agent / Tries (`.sigt` when >1) / Cost / Due (63ac Agent `a person`, Due `6 Oct, overdue`).
- `.nx p`:
  - 4605 `{firstSentence(sentenceCase(detail))}` (see X-2);
  - 58f8 `Needs a writable Forge URL for agentpod.`;
  - 1dfc `Missing commit ×2.` (**corrected:** the old phone paraphrases);
  - 63ac `Pick it up or move it on. Overdue since 6 Oct.`;
  - queued `.q` `auto · waits on 3 cards · not picked up yet · $0.00`;
  - done `.q` `15 tries · $0.00`.
- Buttons `.ar-btn` Resume / Open, plus `.ph-ib.b` move 16 aria `Move card`.
- 03 summary `Stages · 7, who works each` / `2 blocked · show` (open: `· hide`). li `.o`:
  - `diagnostics · error-eric`;
  - `2 blocked · testing · tester-tim`;
  - `integration · empty`;
  - `<span class="gate">GATE</span> approval by a person · empty`.

**Phone Quiet:**
- header `Superpipeline · 7 cards · 4 need your decision`, `.lk` `Write a new card`.
- `Needs your decision (4)`, `.it.nd` in the order 4605, 58f8, 1dfc, 63ac.
- `.mt`:
  - `error-eric · Reproduce · 2 days · attempt 2`;
  - `tester-tim · Failing test · 33 hours`;
  - `coder-kai · Fix · 33 hours · attempt 5`;
  - `asked by super-chotu · Reported · 2 days` (queuer face);
  - queued `Not picked up yet · Failing test · 2 days`;
  - done `Completed yesterday · Shipped · 15 attempts`.
- `.rs`: `Stopped. ${firstSentence(sentenceCase(detail))}` (1dfc `Stopped. This stage was not finished twice — … missing commit.` — **corrected:** "Stopped after two refused handoffs"); 63ac `Not started. Reported is a person's stage.`
- `details.full` `Show the full reason` only when there is a remainder (4605, 58f8).
- `.fs` (parts joined " · ", first letter capitalised):
  - blocked: [`Priority p` | `No priority`], `asked by q`, `$0.00`, ref → `Priority 3 · asked by super-chotu · $0.00 · AgentPod v0.1.91 Matrix inbound bridge contract`, `No priority · $0.00 · test(api): pin manual delivery reminder`;
  - no-owner: `Priority 1 · labels: clean-room, evidence-required, superpipeline, and 1 more · .od Due 6 October, overdue`;
  - queued (priority only when >0, no cost): `Priority 2 · blocked by 3 cards · asked by super-chotu`, `Blocked by 1 card`;
  - done: `Priority 2 · $0.00`.
- `.ac`: blocked `Decide`, others `Open`.
- `In progress (0)` + `.nn` None., `Waiting to start (2)`, `Done (1)`, `Closed (0)` None.
- Stages `.tbl`:
  - caption `Stages`, thead `Stage | Cards | Who works it`;
  - `1. Reported | 1 | a person`, `2. Reproduce | 1 | diagnostics: error-eric`, `3. Failing test | 3, 2 blocked | testing: tester-tim`, `4. Fix | 1 | code: 2 agents`, `5. Integrate | empty | integration`, `6. Signed off | empty | gate: approval by a person`, `7. Shipped | 1 | a person`.

**Empty board (all 4):**
- eyebrow pill `Production Releases`;
- h1 `No cards yet. Here is what this board does.`;
- lede (API-3);
- primary vk-button plus 20 `Write the first card` (onCompose);
- hint (composeHint);
- `ol.em-flow aria-label="Stages, in order"`, 5 `li.em-step`, with `.gate` on go-no-go;
- `.em-num` `01`… + `.em-num` `0 cards` (aria `0 cards`);
- h2 name;
- `.em-who`:
  - human: Initials `P` 32 (aria `A person`) + `a person`;
  - human gate: RG 32 (aria `Rakesh Gangwar`) + `you decide`;
  - single capability: face 32 resting + name (devops-dave, vulnerability-victor);
  - several: first face + `n agents`;
- `.em-does` Stage.summary;
- tags: capability → owner tag (`release`, `security-review`); gate → `.em-tag.g` `Approval gate`; wipLimit → `limit 1`; count 0 → `empty`;
- foot `Stages come from this board’s rules.` + link `Change the stages in Board settings` → `/b/{id}/settings`.
- Shell values per vibe (MC table):
  - D `Showing` → `.dy-note` `No cards on this board`, crew hidden;
  - P paperShowing `No cards on this board`;
  - S tabs `List 0` · `Projects 0`, status `Production Releases · 0 cards · 4 need you (sig) · synced 13:51`, right `[]`, sub-right `The board at 13:51 · midday · Sunday 11 October`;
  - Q `.qn-note` inside row 2.

---

## 5. States & behaviour

- **Signal only for needs you:**
  - the count renders only when >0, in the signal-text colour;
  - Daylight `.dl-tile.needs` ring, `.dl-mood.needs`, `.dl-due` signal;
  - "Due {d}" that is not overdue renders muted (not drawn);
  - Studio `.sig` only on needs counts, overdue, and tries>1 on needs;
  - Live uses success colours.
- **Live disconnected (G13):** the same element reads `Reconnecting…`, the dot or square uses `--vk-color-faint`, and `role="status"` announces it.
- Shell interactions:
  - links use `aria-current="page"` from `here`;
  - the switcher opens `BoardSwitcher` (`app.boardSwitcherOpen`), then `app.switchBoard(id)` + `goto('/b/'+id)`;
  - search: `app.toggleCmdk()` (the Studio field is a readonly trigger, opened on focus or click);
  - New card: `app.requestCompose()`;
  - view: `app.setView(v)` (`aria-pressed`);
  - Filter: `app.filterOpen=true` → `plan/FilterDialog.svelte` titled "Filter cards" (FilterBar controls in the SP-Dlg-Move frame);
  - Appearance: `appearance.pickerOpen=true`;
  - theme: `appearance.toggleTheme()`, and the label flips;
  - `<details>` account menus (D, P): Esc closes and returns focus to the summary; an outside click closes;
  - vibekit Menu (S, Q, phones);
  - Quiet skip link `#content`.
- **Daylight board:**
  - pointing at or focusing a tile (≥1440 only, `matchMedia('(min-width: 1440px)')`) opens the peek through `peek.look(id)`, debounced 300 ms; Esc or close returns focus to the title;
  - Enter/click → `app.openCard(id)`;
  - M → CardMoveMenu;
  - Alt+←/→ → `CardMoveMenu.step(±1)` → `app.moveCard`;
  - a strip click toggles `expanded[stageKey]` (`aria-expanded`); an expanded empty lane body reads `No cards in this stage.` and has a `Collapse` sh-iconbtn (chev 18 rotated 180°);
  - drag and drop is unchanged (pragmatic-dnd on `.dl-tile`);
  - `Show me the first one` `href="#first-needs"` scrolls to and focuses the first needs title (`id="first-needs"`); hidden when needs=0;
  - Resume → `app.openCard(id)` + CardDrawer focus `resume`; question → `Answer`, review → `Review`;
  - loading shows the "establishing link to the board…" line in place of `.dl-board`;
  - `app.error` shows the existing error bar.
- **Paper:** `Read the rest` / `Show less` (`aria-expanded`), rendered only when the text is clamped (`scrollHeight > clientHeight`), with local state per story; Open is a link `/b/{id}/c/{cardId}`; Move; Resume.
- **Studio:**
  - quick filter;
  - ↑/↓ moves `tr.sel` (`aria-selected`);
  - Enter open; M move; Alt+←/→;
  - multiples `href="#stage-{i}"` scroll to the first row in that stage;
  - breakpoints below 1200: `.bd-grid` one column, panel `border-top`, `.ar-sm` repeat(4).
- **Paper below 1100:** one column (rules in SB §4.1).
- **Phones:**
  - step chips scroll and set aria-current;
  - Move opens CardMoveMenu as a bottom sheet;
  - Resume/Open go to the card page `/b/{id}/c/{card}`;
  - the ref chip opens the link;
  - `.pb-stages` and `details.full` are disclosures.
- **44px targets:** `.h44`, `.ib`, `.dl-move` is 36px but sits on a tile whose title `::after` covers the tile; `.bd-move.h44`. Buttons are one line (`white-space: nowrap`).
- Agent text is verbatim on desktop. Phones apply `sentenceCase` (F C-06). **corrected:** SB G10 for phones. A straight `'` stays straight ("Tester Tim's"). Curly quotes inside the stored text stay.
- Never shown: archived cards. 9ed9's stale needsHuman is not stored.

---

## 6. Phone (390) specifics

- One breakpoint `<900px` picks the phone shell and phone board layout.
- The top header scrolls away; the bottom bar is sticky. Daylight floats it (`bottom:12px; margin:auto 12px 12px`); the other vibes sit flush.
- Ordering differs from desktop (§3.4: the wants order puts 4605 first).
- Title aria `{title}. In {stage}. Enter opens, M moves.`
- Queuer faces are `resting`.
- The Daylight sky uses `--vk-sky-noon-*` literally in the mockup; port it as `--vk-sky-{phase}-*` (light) and `dusk` (dark).
- `width:390px` roots become `width:100%`.

---

## 7. Gaps / open questions

| Id | Issue | Recommendation |
|---|---|---|
| **X-1 (blocker for the Studio/Paper/crew tests)** | Desktop needs order must be 63ac, 58f8, 1dfc, 4605 (corrected Studio table, Paper col 1, panel, crew/title/greeting name order "tester-tim, coder-kai and error-eric"). MC derives it as a "stable sort over the §A.5.2 order", but that is the spec table order, not an API order. The DO returns `ORDER BY priority DESC, (due_at IS NULL), due_at ASC, created_at ASC` (board-do.ts:7952) → 4605, 9ed9, 58f8, f83f, 63ac, 1dfc, 481f. A stable needs-first sort over that gives 4605, 58f8, 63ac, 1dfc. The existing `groupByUrgency` (priority rank, p>0 ascending then p0, then age desc, then title) gives 63ac, 58f8, 4605, 1dfc. No natural rule yields 1dfc before 4605. | Pick one deterministic rule and either re-export the affected references (Studio rows 03/04 + fn 3/4 + notes 3/4 + panel order; Paper col 1; crew/greeting order) or seed so that it holds. Simplest: keep `groupByUrgency` (priority rank). The result is 63ac, 58f8, 4605, 1dfc and crew tester-tim, error-eric, coder-kai; references must then be corrected. Escalate to the coordinator. |
| **X-2** | 4605 `needsHuman.summary`: MC Part 4 `boards` adds `No fresh DM event to trace; needs one per agent.` (Studio desktop panel 04 + note 4 show it). MC `phone-boards` says "4605 gets no summary", and the Studio-phone reference shows the first-sentence fallback. One summary rule cannot satisfy both. | Seed the summary (desktop plus the card group use it). Studio phone `.nx p` then renders `No fresh DM event to trace; needs one per agent.`, so correct that one reference row (or mask it, citing a new conflict id). |
| X-3 | Phone Daylight `.meta`: SB says "cost `$0.00`; `attempt ${n}` (needs)", but the no-owner 63ac shows neither. | Cost and attempt only for needs cards with an agent (blocked kinds). |
| X-4 | Quiet phone `.fs`: "No priority" appears only on blocked needs items (481f queued shows none; MC dropped that row). | Per-state part lists as in §4.5. |
| X-5 | Studio multiples aria strings are irregular (see §3.7). | Implement a formatter that reproduces the 7 exact strings, and unit-test them. |
| X-6 | vibekit AppShell phone breakpoint is 640px; SB uses 900px. | Superpipeline uses 900 (SB). Flag it to vibekit. |
| X-7 | Registry step for the Daylight peek (hover) vs SB (focus + 400 ms). | Either is fine. Use the canonical id `card_9ac2116a050858f8`. |
| X-8 | Reference CSS deltas from the SB-quoted CSS (Daylight `.dl-board gap:14px`, arrow `right:-12px`, all count-badge colours). | Port from the reference file, not from the SB blocks. Diff each block against the reference while porting. |
| G14 | Undrawn: expanded empty lane, filled Workspace icon (`fill=currentColor`), `.u.working`, Paper/Studio 900–1440, phone Empty board. | Rules as given in §4 and §5. |
| G15 / G16 | You menu, Studio/Quiet account menus and the FilterDialog are not drawn. | As specified (vibekit Menu; FilterDialog in the dialog frame). |
| G17 | vibekit token release. | Blocks Studio. |
| Out of scope | Agent-drafted brief (Paper `.pp-write` copy "an agent drafts the brief", Empty CTA hint). | Copy only; the button opens the existing ComposeSheet. |
