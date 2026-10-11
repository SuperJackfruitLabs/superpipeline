# Digest: Operate + List (SP-Operate-*, SP-List-*)

Sources: `screens/operate-list-pages.md` lines 1–1785 (cross-screen rulings, gap index, Operate 73–951, List 952–1785); `mockup-corrections.md` group `list-operate` (Part 1 rows, O-1…O-17, Part 4 §4.2 "From list-operate", appendix `list-operate`); `fixtures-and-harness.md` (F) §A.2, A.4.2, A.5, A.7.4, B.2. The references `apps/web/e2e/reference/mockups/SP-{Operate,List}-*.html` are already corrected and are the source of truth for markup, CSS and text. Where the spec is overruled, this digest says **corrected:**.

## 0. Fixture world as these screens see it (corrected values, used throughout)

- **Clock.** `NOW = 2026-10-11T08:21:00Z`, shown as **13:51 Asia/Kolkata**, Sunday 11 October, phase `noon` / "midday". **corrected:** the spec freezes 13:51**Z** in UTC. That is wrong, and F + corrections R1 win. Studio's 13:19 (F D2) is void, so every screen uses 13:51.
- **Board** `brd_134a0ddb6d434478` "Developer Experience", `stale {enabled:true, afterHours:24}`, usage all zero, no caps.
- **Stage keys and order (0-based):** `reported`(0, human), `reproduce`(1, capability `diagnostics`), `test`(2, `testing`, name "Failing test"), `fix`(3, `code`), `integrate`(4, owner `integration`, `requires.any [integration, api, testing]`), `signed-off`(5, human, gate approval), `shipped`(6, human). **corrected:** the Operate fixture's key `failing-test` and its 1-based order are replaced by `test` and the F stage JSON.
- **Agents (F §A.4.2, 22 rows).** The ones that matter here:
  - diagnostics: error-eric (1 agent);
  - testing: tester-tim (1);
  - code: coder-kai and optimizer-ollie (2);
  - integration/api/testing: integration-ian, api-alan and tester-tim (3);
  - super-chotu `agt_bb586732b807460c` (`command`), the queuer.
  - **corrected:** the OL "second code agent devops-dave" is optimizer-ollie.
- **Live cards (7).** Ids from F §A.5.2. **corrected:** the List fixture's production ids (`…42e4`, `…40df`, `…467f`, `…4697`, `…4c02`, `…4d27`) are replaced by these canonical ids.

| short | id | title | stage | state | pri | due | attempts | last run agent | queued by | stateSince (age at NOW) | needsHuman |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 63ac | card_ace250c9c25363ac | Fix the highest-severity blocker found in the clean-room journey | reported | submitted | 1 | 2026-10-06 | 0 | — | super-chotu | 2026-10-08T09:51:01Z (70.5h → `2d`/`2 days`) | null; attention kind **no-owner** |
| 4605 | card_05823a57e8224605 | Diagnose Melissa and Anna Supermessage silence — trace actual failing hop | reproduce | input-required | 3 | — | 2 | error-eric | super-chotu | 2026-10-08T14:11:45Z (66.2h → `2d`/`2 days`) | blocked, detail D5 |
| 58f8 | card_9ac2116a050858f8 | AgentPod: connector interface and generic effects ledger, state machine and executor | test | input-required | 2 | — | 1 | tester-tim | super-chotu | 2026-10-09T22:24:49Z (33.9h → `33h`/`33 hours`) | blocked, TEXT-A |
| f83f | card_691a65ff9894f83f | Integrate editorial workflows and prove no-write publishing acceptance | test | submitted | 2 | — | 0 | — | super-chotu | 2026-10-08T17:50:23Z (62.5h → `2d`) | null; blockedBy **3** |
| 481f | card_482b4aa0bdd6481f | agentpod-connectors: X connector (connector x) | test | submitted | 0 | — | 0 | — | Rakesh (user) | 2026-10-09T23:04:43Z (33.3h → `33h`) | null; blockedBy 1 |
| 1dfc | card_e10fb4fe39a91dfc | Superpipeline: manual-delivery completion and approval-subject hardening | fix | input-required | 0 | — | 5 | coder-kai | Rakesh (user) | 2026-10-09T22:45:45Z (33.6h → `33h`) | blocked, TEXT-B, failureCount 2 |
| 9ed9 | card_8f2c1a5e58299ed9 | Build immutable approval subjects and digest-bound gates | shipped | completed | 2 | — | **15** | coder-kai | Rakesh (user) | — (done → `—`) | null |

- All `delegateAgentId` are null. The agent cell needs `lastAgentId` (LI-G3).
- 63ac has 4 labels: clean-room, evidence-required, superpipeline, and `lbl_c5ee8f164fb54eb0`, which has no catalog row and renders as "+1".
- **Texts, verbatim.**
  - **TEXT-A (58f8):** curly `“ ”` around the Mirror quote and a straight `'` in "Tim's". **corrected:** the spec says straight quotes; F C-05 makes them curly.
  - **TEXT-B (1dfc):** `this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit` (137 chars, so no toggle).
  - **D5 (4605, 505 chars):** `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.`
  - **C5** (the 140-char cut): `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…`
  - **58f8 cut:** `Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod a…`
- **Counts.**
  - attention items **4** (63ac no-owner; 4605, 58f8 and 1dfc blocked, all kind `blocked` because reason=`blocked`), so every "need you" count is **4**;
  - List needsCount **4** (corrected from the addendum's provisional 3, O-14);
  - Studio quick filter `All 7 · Needs 4 · Working 0 · Idle 2 · Done 1`;
  - unread **19**;
  - non-empty stage groups: Reported 1, Reproduce 1, Failing test 3, Fix 1, Shipped 1;
  - empty stages: **Integrate, Signed off**.
- **Notifications (19 unread, user `usr_b19776fac3c94df4`).** F §A.5.8 has 16 rows. The 4605 rows below are the corrections Part 4 additions. The newest per card is shown:

| card | newest (shown) createdAt | kind | body head | earlier rows |
|---|---|---|---|---|
| 1dfc | 2026-10-10T22:50:12Z | stale | `Stuck 24h in Fix: <TEXT-B>. Next: resume it` | 4 (blocked, 2×rework, stale 10:50:12Z) |
| 58f8 | 2026-10-10T22:25:12Z | stale | `Stuck 24h in Failing test: <TEXT-A>. Next: resume it` | 4 (blocked ×2, stale, control-pair) |
| 4605 | 2026-10-10T14:11:50Z | stale | `Stuck 24h in Reproduce: <D5>. Next: resume it` | 2 (blocked `2026-10-08T14:11:46Z` body=D5; stale — see gap G-T1) |
| 63ac | 2026-10-10T09:55:20Z | stale | `Stuck 48h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works` | 5 (stale 24h, overdue, stale "Stuck 12h" 2026-10-08T21:55:20Z, control-pair, blocked) |

  - `cards.stale_notified_at` (4605) is `2026-10-10T14:11:50Z`.
  - The group order (newest first) is 1dfc, 58f8, 4605, 63ac, which matches every reference.
  - **corrected:** the OL Operate fixture's 16-row table (seq 1–16, `nothing claims stage "reported"` body) is superseded by F plus these additions.

## 1. Screens covered

| Artboard | Vibe | Route | Viewport (manifest) | Harness steps (registry F §B.2, adjusted) | Masks |
|---|---|---|---|---|---|
| SP-Operate-Daylight | daylight, cookie `daylight.light.strong.0` | `/b/brd_134a0ddb6d434478/operate` | 1440×2093 | 1. `getByRole('button',{name:'Resume tester-tim'}).click()`; 2. `getByRole('textbox',{name:/What changed/}).fill('The Forge mirror is now writable and tester-tim has write access. Push the red-test commit and carry on.')`. Also the 58f8 bubble must be expanded ("Show less" is drawn; spec: click the AgentPod row's "Show all" first). | none needed after re-export; OP-G9 13:19 masks are void |
| SP-Operate-Paper | paper | same | 1440×1900 | none | — |
| SP-Operate-Studio | studio | same | 1440×1910 | none; selection is default index 0 = **4605** row `01` | **corrected:** drop the registry's `clock: '…13:19…'` |
| SP-Operate-Quiet | quiet, strength `off` | same | 1440×3247 | open the Resume fieldset on the **AgentPod** item | — |
| SP-List-Daylight | daylight | `/b/brd_134a0ddb6d434478?view=list` | 1440×1293 | click row 1's (63ac) `Move` (menu open, `aria-expanded="true"`) | — |
| SP-List-Paper | paper | same | 1440×1650 | none | — |
| SP-List-Studio | studio | same | 1440×1457 | press `j` **twice**. Selection starts null; J→row 1, J→row 2 = **4605** (`tr.sel`, foot `row 2 of 7`) | **corrected:** drop `clock 13:19`. C-10 mask void: 481f age now `33h` |
| SP-List-Quiet | quiet, `off` | same | 1440×2201 | none | — |

Harness fixes to make in the same PR (the registry text disagrees with the corrected references):

- **G-H1 (Daylight Operate).** No element is named `Resume tester-tim` except the `form.resume[aria-label="Resume tester-tim"]`. The reference's Needs-row Resume button is plain `Resume` with `aria-expanded`. Recommendation: give each stopped row's Resume button `aria-label="Resume {agentName}"` (label-in-name OK). The alternative is a step scoped to the article: `getByRole('article',{name:/^AgentPod/}).getByRole('button',{name:'Resume'})`. The registry also lacks the "Show all" click on 58f8. Add `getByRole('article',{name:/^AgentPod/}).getByRole('button',{name:'Show all'}).click()`.
- **G-H2 (Quiet Operate).** The registry has `getByRole('button',{name:'Resume this card'}).nth(1)`. But "Resume this card" is the fieldset `legend`, not a button. With 4605 inserted, urgency order is 1dfc, 4605, 58f8, 63ac, so index 1 would open 4605. Use `getByRole('article',{name:/^AgentPod/}).getByRole('button',{name:'Resume'}).click()`. The article is `aria-labelledby` its h3.
- **G-H3 (List Studio).** The registry presses `j` once. It must press it twice (spec, corrections #12).
- The route query `?view=list` must set `app.view='list'`. That param is owned by the shell/plan spec; confirm it exists.

Shell values these screens pass (the shell group owns the rendering): see corrections "Shell values per artboard". Examples: Operate count 4; Daylight crew `4 agents`/`3 wait on you`; Paper `(4)`; Quiet `Operate (4 need you)`. Studio status values:
- Operate: `7 cards`·`4 need you`(sig)·`0 running`·`19 unread`·`synced 13:51`;
- List: `7 cards`·`4 need you`(sig)·`2 blocked`·`1 shipped`·`synced 13:51`;
- List sub-bar right: `The board at 13:51 · midday · Sunday 11 October`;
- List showing: Daylight/Studio/Quiet `Showing all 7 cards`, Paper `Showing all 7 cards · 4 wait on you · 1 shipped`.

Operate has `view=null`, so no `.mh-tabs` on Paper Operate.

## 2. API / contract rulings

### Needs a server change ((b)) — for these screens

| id | Field | TS type | Server computation | Used by | Fixture values |
|---|---|---|---|---|---|
| **LI-G3** | `lastAgentId` on each card in `GET /v1/boards/:boardId` (BoardSnapshot.cards); add to `Card` in `apps/web/src/lib/api.ts` (and to `packages/contract/src/entities.ts` Card if the snapshot card is modelled there; `delegateAgentId` is at entities.ts:192) | `lastAgentId: string \| null` | `agent_id` of the card's most recent run (`runs` ordered by `started_at` DESC, LIMIT 1), null when it has no runs. DO: `rowToCard` (board-do.ts ~7967) next to `attemptCount`; precompute per card like `attemptsByCard` (~7958). Add to the DO Card interface (~600). | List agent cell (all vibes): `agentId = card.delegateAgentId ?? card.lastAgentId ?? null` | 58f8 → `agt_fx_tester_tim`; 1dfc → `agt_fx_coder_kai` (run 5); 4605 → `agt_fx_error_eric`; 9ed9 → `agt_fx_coder_kai` (run 15); 63ac/f83f/481f → null |
| Fixture (F seeding, not product API) | 3 new notifications for 4605 + `stale_notified_at` | — | `POST /v1/dev/fixture` world rows | Operate activity (all vibes), unread 19 | see §0 |

Already present, no change: `Card.stateSince` (DO `state_since`, board-do.ts:8023 / api.ts:183) feeds every age. `Notification {seq, kind, cardId, body, read, createdAt}` is enough for Operate. `attemptCount` already exists. `needsHuman.detail`/`failureCount` exist.

### Explicitly client-only ((a)): do NOT add API work

- **OP-G1:** counts = `itemsFromBoard(board, agents).length`. `app.needsYou()` is reimplemented as `itemsFromBoard(this.board, this.agents)` and returns `AttentionItem[]`. Update its callers (shell count, BottomNav).
- **OP-G3:** action sets in `attention.ts`:
  - `forNeeds` `repeated-failure` → `['resume','open','log']`;
  - default/`blocked` → `['resume','open','log']`;
  - `ownerless(board)` → `['move','open','staff']`, and the workspace variant → `['open','staff']`;
  - update `attention.test.ts`.
- **OP-G4:** stale line derived client-side (`staleLine`). Structured notification fields (`stage`, `hours`, `why`) are a possible later (b), not needed.
- **OP-G6:** `moveTargets`.
- **OP-G7:** `RESUME_HINT`.
- **OP-G8:** the Spend figure comes from `getUsage(boardId,'7d').totalCostUsd`. Cap and overBudget still come from `board.usage`.
- **OP-G11/G14:** `Open log` → `app.openCard(id)`, then on the next tick `document.getElementById('card-section-attempts')?.scrollIntoView()`. The card group provides that id.
- **OP-G13:** the attempts signal threshold.
- **LI-G4:** faces are seeded by agent **name**.
- **LI-G5:** the signal rule.
- **LI-G7:** Move dialog.
- **LI-G9, LI-G10:** formatters.
- **LI-G13:** `app.filterOpen`.
- The **No-owner headline** (file-level): `AttentionItem` gains `stageName: string`, and `ownerless()` headline becomes `` `nothing claims the ${stageName} stage` `` (today it is `Nothing claims stage ${stageKey}`). Neither screen renders it.
- **cardLead no-owner branch** (file-level ruling; LI-G2 leaves it to the Board/Card group). In `card/card-lead.ts`, before the `overBudget` check: `card.state === 'submitted' && isOwnerlessStage(stages, card.currentStageKey) && ageHours >= stale.afterHours` → `{ kind: 'stopped', needsYou: true, sentence: null, source: 'none' }`. `LeadInput` gains `stages` and `stale`. List alternative: `LeadInput.ownerless?: boolean` → `told('stopped', true, null, 'none')`.

### API changes in the gap index that belong to OTHER sections (not these 8 screens)

These are listed so the planner does not miss or misplace them:
- WA-G2: `GET /v1/agents` gains `claimedCount` and `workingCount` (Workspace-Agents).
- SE-G1: `github.webhookUrl` on the snapshot (Settings).
- SN-G1: `UsageSummary.byDay` (Spend).
- SN-G4: notification **event** `body` (Spend board log, `events`).
- `needs_human_json.summary` (58f8 `Needs a writable Forge URL for agentpod.`, 1dfc `Missing commit ×2.`, 4605 `No fresh DM event to trace; needs one per agent.`) is a boards/card-group addition. Operate and List do **not** read `summary`; they show `detail`.
- Attempt times: none needed here.

## 3. Pure derivations (vitest)

All in `apps/web/src/lib/components/operate/operate-words.ts` (Operate) or `apps/web/src/lib/components/plan/list/list-model.ts` (List). Examples use the §0 world. `NOW = Date.parse('2026-10-11T08:21:00Z')`.

### 3.1 Attention sorting (`attention.ts`, new export)

`sortAttention(items: AttentionItem[], cards: Card[], stages: Stage[], mode: 'stage' | 'urgency'): AttentionItem[]`
- The rank is `no-owner` = 1 and every other kind = 0.
- **stage** mode: rank asc → stage order asc → `ageHours` desc → title.
- **urgency** mode: rank asc → `card.attemptCount` desc → `ageHours` desc → title.
- Examples:
  - stage → `[4605 (reproduce), 58f8 (test), 1dfc (fix), 63ac]`;
  - urgency → `[1dfc (5), 4605 (2), 58f8 (1), 63ac]`.
- Daylight, Paper and Studio use stage mode; Quiet uses urgency mode.

### 3.2 Operate words (`operate-words.ts`)

| fn | rule | examples |
|---|---|---|
| `ageWords(h:number):string` | <1 → `just now`; <48 → `${floor(h)} hours` (`1 hour` at 1); else `${floor(h/24)} days` | 33.9→`33 hours`; 66.2→`2 days`; 70.5→`2 days`; 1.2→`1 hour`; 0.5→`just now` |
| `ageShort(h)` | <1 `just now`; <48 `${floor(h)}h`; else `${floor(h/24)}d` | 33.9→`33h`; 66.2→`2d` |
| `numberWord(n)` (Operate) | 0–10 → `zero`…`ten`, else digits; `Cap()` upper-cases the first letter | 3→`three`, Cap→`Three`; 4→`Four`; 12→`12` |
| `dayWords(h)` | d=floor(h/24): 1→`a day`; 2–10→`${numberWord(d)} days`; else `${d} days` (d=0 undefined, gap G-T2) | 24→`a day`; 48→`two days` |
| `kindWord(kind)` | review `Review`, question `Asked`, blocked `Stopped`, repeated-failure `Stopped`, refused `Refused`, sub-tasks `Waiting on sub-tasks`, no-owner `No owner`, failed `Failed`, budget `Over budget` | blocked→`Stopped`; no-owner→`No owner` |
| `stageOwnerText(stage, agents, form:'full'\|'agents')` | capText = `requires.any` joined ` or ` when present, else `owner`. agentText = the agent name when exactly 1 agent has any of the caps, else `${n} agents`. full → `${capText}, ${agentText}`; agents → agentText | reproduce full→`diagnostics, error-eric`; test full→`testing, tester-tim`; fix full→`code, 2 agents`; integrate full→`integration or api or testing, 3 agents`; agents: `error-eric`,`tester-tim`,`2 agents`,`3 agents` |
| `moveTargets(row)` (model) | stages sorted by order, minus the current one, `ownerKind` ∈ {capability, agent} | 63ac → Reproduce, Failing test, Fix, Integrate |
| `when(n)` | `n.createdAt.slice(11,16)` (**UTC**) | `2026-10-10T22:50:12Z`→`22:50`; 4605→`14:11` |
| `phaseWord(phase)` (OP-G15, only if vibekit `say` lacks it) | noon→`midday`, morning→`morning`, evening→`evening`, night→`night`, dawn→`dawn`, dusk→`dusk` | noon→`midday` |
| `attemptsSignalOperate(n)` (OP-G13) | `n >= 3` | 5→true; 2→false; 1→false |
| `cut140(text)` | `text.length > 140 ? text.slice(0,140).trimEnd() + '…' : text`; toggle shown only when > 140 | D5→C5; TEXT-B unchanged |
| overdue date (Operate) | `dueAt` → en-GB `{day:'numeric', month:'short'}` (Daylight/Paper) or `{month:'long'}` (Quiet), timeZone UTC | `2026-10-06`→`6 Oct` / `6 October` |

**`staleLine(n: Notification, vibe: Vibe, needKind: AttentionKind | null): string | null`**:
- It applies only when `n.kind === 'stale'` and `/^Stuck (\d+)h in (.+?): /` matches (h, stage).
- **corrected:** classification is keyed on the **attention kind**, not on the body. The line is *unclaimed* when `needKind === 'no-owner'` (the group's `need.item.kind`); otherwise it is *stopped*. F's 63ac body lacks `nothing claims stage`, so the spec's body test would misclassify it (appendix "Stale-line classification", O-9).
- Any other kind, or a failed parse: return null and the caller shows `n.body` verbatim.

| vibe | stopped | unclaimed | prefix / suffix |
|---|---|---|---|
| daylight | `Still stopped ${dayWords(h)} later in ${stage}.` | `Still unclaimed after ${dayWords(h)} in ${stage}.` | time cell `${when(n)} UTC`; link `Why, in Needs you` (→`#needs`) when group.need |
| paper | ` — still stopped ${dayWords(h)} later in ${stage}. ` | ` — still unclaimed after ${dayWords(h)} in ${stage}. ` | `span.dig__t` `${when(n)}` (no UTC); link `The reason is in its letter.` (→`#letters`) |
| studio | `Still stopped ${h}h later in ${stage}. ` | `Still unclaimed ${h}h in ${stage}. ` | time `${when(n)}`; kind cell `Cap(n.kind)` (`Stale`); link `reason ↑` (→`#needs`) |
| quiet | `${when(n)} UTC: still stopped ${dayWords(h)} later in ${stage}.` | `${when(n)} UTC: still unclaimed after ${dayWords(h)} in ${stage}.` | + ` The reason is under Needs your decision.` when group.need; other kinds `${when(n)} UTC: ${n.body}` |

Examples (exact reference text):
- 1dfc: Daylight `22:50 UTC` + `Still stopped a day later in Fix.`; Studio `Still stopped 24h later in Fix. `.
- 4605: Paper `14:11` + ` — still stopped a day later in Reproduce. `; Quiet `14:11 UTC: still stopped a day later in Reproduce. The reason is under Needs your decision.`
- 63ac: Daylight `Still unclaimed after two days in Reported.`; Studio `Still unclaimed 48h in Reported. `; Quiet `09:55 UTC: still unclaimed after two days in Reported. The reason is under Needs your decision.`
- 58f8: Studio `Still stopped 24h later in Failing test. `.

**Sentence builders** (n = needs.length, s = rows with kind blocked|repeated-failure|failed, o = no-owner, other = the rest, r = running.length):

- **`daylightGreeting(phaseGreeting, firstName, n)`.** `${greeting}, ${firstName}. ` + (n===0 ? `Nothing needs you.` : n===1 ? `1 card wants you.` : `${n} cards want you.`). The greeting is vibekit `say` for the phase (noon → `Good afternoon`). → `Good afternoon, Rakesh. 4 cards want you.`
- **`summarySentenceDaylight(s,o,other,r)`.** Parts joined with `, and `, ending `.`:
  - s → `${Cap(numberWord(s))} agent${s===1?'':'s'} stopped and ${s===1?'is':'are'} waiting on you`;
  - o → `${s?numberWord(o):Cap(numberWord(o))} card${o===1?' has':'s have'} nobody to pick ${o===1?'it':'them'} up`;
  - other → `${numberWord(other)} more need${other===1?'s':''} you`;
  - then ` Nothing is running.` or ` ${Cap(numberWord(r))} ${r===1?'agent is':'agents are'} working.`
  - → `Three agents stopped and are waiting on you, and one card has nobody to pick it up. Nothing is running.`
- **`paperMastLine(now, phrase, n, r)`.** `${weekday d Month en-GB long}, ${phrase}. ` + (n===0 ? `Nothing waits for you` : `${Cap(numberWord(n))} letter${n===1?' waits':'s wait'} for you`) + `; ` + (r===0 ? `no one is at work.` : `${numberWord(r)} ${r===1?'agent is':'agents are'} at work.`). The phrase is vibekit `say` (noon → `in full daylight`). → `Sunday 11 October, in full daylight. Four letters wait for you; no one is at work.`
- **Paper mast end:** `Developer Experience · 7 cards` `<br>` `Times in UTC`. Kick 1 count: `${n} letter${n===1?'':'s'}` → `4 letters`.
- **`studioHeroTitle(n,r)`.** n===0 → `Nothing on this board needs you`; else (n===1 ? `card on this board needs you` : `cards on this board need you`) + (r===0 ? `, and nothing is running` : `, and ${r} ${r===1?'is':'are'} running`), preceded by `<span class="sr">${n} </span>`. → `4 cards on this board need you, and nothing is running`
- **`summarySentenceStudio(s,o,r,spend7d)`.**
  - s → `${Cap(numberWord(s))} stopped and ${s===1?'is':'are'} waiting to be resumed`;
  - o → `${numberWord(o)} sit${o===1?'s':''} in a stage no agent works and need${o===1?'s':''} moving`;
  - joined `; `, ending `.`;
  - then ` No agent is working anything` / ` ${Cap(numberWord(r))} ${r===1?'agent is':'agents are'} working`, + (spend7d===0 ? `, and nothing has been spent this week.` : `, and $x.xx has been spent this week.`).
  - → `Three stopped and are waiting to be resumed; one sits in a stage no agent works and needs moving. No agent is working anything, and nothing has been spent this week.`
- **`studioOpLine(now, phase)`.** **corrected:** the time is **local** (Asia/Kolkata in the harness) `HH:MM`, not UTC: `${HH:MM local} · ${phaseWord} · times UTC` → `13:51 · midday · times UTC`. The spec's "HH:MM of now (UTC)" would print 08:21 (ADDENDUM 3 / O-7). The shell's `synced HH:MM` is also local.
- **`quietLede(boardName,n,r)`.** `${boardName}. ` + (n===0 ? `Nothing needs you.` : `${n} card${n===1?' needs':'s need'} you.`) + (r===0 ? ` No agent is working.` : ` ${r} ${r===1?'agent is':'agents are'} working.`) + ` Times are in UTC. ` + link `See all boards`. → `Developer Experience. 4 cards need you. No agent is working. Times are in UTC. `
- **Row meta strings:**
  - Daylight stopped: `stopped in ${stage.name} · ${ageWords} ago · attempt ${attemptCount}` → `stopped in Reproduce · 2 days ago · attempt 2`.
  - Daylight no-owner: `in ${stage} · ${ageWords}` + (overdue ? `, overdue since ${d Mon}` : '') → `in Reported · 2 days, overdue since 6 Oct`.
  - Paper stopped: flag `Stopped` + spans `· Reproduce` `· 2 days ago` `· attempt 2`.
  - Paper no-owner: `No owner · Reported · 2 days · due 6 Oct, overdue`.
  - Quiet stopped: `${kindWord} in ${stage} · ${ageWords} · ${n} attempt${n===1?'':'s'} · ` → `Stopped in Reproduce · 2 days · 2 attempts · ` and `Stopped in Failing test · 33 hours · 1 attempt · `.
  - Quiet no-owner: `No owner in Reported · 2 days · due 6 October, overdue · `.
  - Studio no-owner op-sub: `Reported · due 2026-10-06, overdue`.

### 3.3 List model (`list-model.ts`)

**`listStateOf(card, items): ListState`.** The item is `items.find(i => i.cardId === card.id)`.
- With an item: `{word:'Waiting on you', needsYou:true, tone:'needs', sub: SUB[item.kind]}`, where `SUB = {review:'review', question:'question asked', blocked:'stopped', 'repeated-failure':'failing', refused:'refused', 'sub-tasks':'waiting on sub-tasks', 'no-owner':'no owner', failed:'failed', budget:'over budget'}`.
- Otherwise by state:
  - `working` → `Working`/working;
  - `completed` → `Done`/done;
  - `canceled` → `Canceled`/closed;
  - `rejected` → `Rejected`/closed;
  - anything else → `Queued`/queued (sub null).
- Rule: any card with an AttentionItem needs you. Never read `card.state` alone or `cardLead().needsYou`.
- Layout call: `listStateOf(s.card, s.attention ? [s.attention] : [])`.
- Examples: 63ac → Waiting on you / sub `no owner`; 4605 → sub `stopped`; f83f → Queued; 9ed9 → Done.

**`rowAgent(s, agents)`.** `id = card.delegateAgentId ?? card.lastAgentId ?? null`.
- null → no agent.
- Otherwise `{id, name: displayAgent(id), iconUrl, mood, moodWord}`, where `mood = needsYou ? 'needs' : tone==='working' ? 'working' : tone==='done' ? 'done' : delegateAgentId ? 'thinking' : 'resting'`. `moodWord` comes from card-lead.ts ("needs you", "done", "working", "thinking", "resting").
- Examples: 58f8 → tester-tim / `needs you`; 9ed9 → coder-kai / `done`; f83f → null.

**Other row fields:**

| Field | Rule | Examples |
|---|---|---|
| `unclaimedWord` | `s.attention?.kind==='no-owner' ? 'Unclaimed' : 'Not claimed yet'` | 63ac→`Unclaimed`; f83f/481f→`Not claimed yet` |
| Signal (LI-G5) | `prioritySignal = priority===1 && needsYou`; `dueSignal = overdue && needsYou`; `costSignal = overBudget && needsYou`; `attemptsSignal = attempts >= 2 && needsYou` | 63ac P1 → signal, due signal; 4605 att 2 → signal (Studio `<span class="sigt">2</span>`); 1dfc 5 → signal; 58f8 1 → no; 9ed9 15 → no (not needs). Studio never signals priority (LI-G12). The Operate threshold differs (≥3, OP-G13). |
| `priorityText` | `p>0 ? 'P'+p : null` | 1→`P1`; 0→null |
| `dueHuman(iso)` | `new Date(iso+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})` | `2026-10-06`→`6 Oct 2026` |
| `costText` | `cost>0 ? '$'+cost.toFixed(2) : null` | 0→null; 0.42→`$0.42` |
| `ageText(s)` | null if ageHours null or tone done/closed; h=floor; `h<48 ? h+'h' : floor(h/24)+'d'` | 63ac→`2d`; 4605→`2d`; 58f8→`33h`; f83f→`2d`; 481f→`33h`; 1dfc→`33h`; 9ed9→null(`—`) |
| `askedBy` | from `s.queuedBy` (agent queuer only) | 63ac, 4605, 58f8, f83f → super-chotu; 481f/1dfc/9ed9 → null |

**`sortRows(rows, sort)`.** Compare by key, then tie-break needsYou first → ageHours desc (nulls last) → `title.localeCompare`.
- Key comparators (ascending): `priority` rank `p>0 ? p : +∞` (asc = highest first; "No priority" always last); `title` localeCompare; `state` urgency index in `URGENCY_ORDER` (needs, working, queued, done, closed); `agent` name A→Z, no agent last; `due` ISO, none last; `cost`; `attempts`; `age` (nulls last).
- Descending reverses only the key comparison. Missing values stay last; the tie-break is unchanged.
- Example, Failing test group by priority asc: 58f8 (P2, needs) → f83f (P2) → 481f (none).

**`nextSort(cur, k)`.** Same key → flip `ascending`. New key → `{key:k, ascending: !(k==='cost'||k==='attempts'||k==='age')}`. Examples: `{priority,true}`+`priority`→`{priority,false}`; +`cost`→`{cost,false}`.

**Sort words.**
- Hint: priority asc `highest first`/desc `lowest first`; title `A to Z`/`Z to A`; due `soonest first`/`latest first`; cost/attempts/age desc `highest first`/asc `lowest first`; state `most urgent first`/`least urgent first`; agent `A to Z`/`Z to A`.
- Nouns: priority `priority`, title `card title`, state `state`, agent `agent`, due `due date`, cost `cost`, attempts `attempts`, age `age`.
- `aria-sort` on the active header only: `ascending`/`descending`.

**`groupRows(rows, groupBy, sort, stageList, members)`:**
- stage: per StageSummary in board order, label stage.name, order stage.order, owner `ownerText(stage.owner)`; drop empty groups.
- state: tones needs, working, queued, done, closed, with labels `Waiting on you`,`Working`,`Queued`,`Done`,`Closed`.
- owner: by `ownerUserId`, label `displayPrincipal`, sorted by label.
- priority: `P1`,`P2`,…, then `No priority`.
- Rows in each group via `sortRows`.

**`ownerText(o)`.** For a capability: declaredBy 0 → label; 1 → `label + ' · ' + name`; n → `label + ' · ' + n + ' agents'`. Otherwise `o.label`. → `a person`, `diagnostics · error-eric`, `testing · tester-tim`, `code · 2 agents`.

**`quickCounts(rows)`.** all = rows; needs; working; idle = queued; done = done + closed → `{7,4,0,2,1}`.

**List `numberWord`** (differs from Operate): 0 `no`, 1–12 words, else digits. Also `cap(w)`.

**`joinAnd(names)`:** [] → ""; [a] → a; else `slice(0,-1).join(', ') + ' and ' + last` → `Integrate and Signed off`.

**`plural(n, one, many)`.**

**`filtersActive(f)`** = `f.states.length || f.owners.length || f.minPriority !== null || f.needsReview || f.live || f.overBudget || f.labels.length || f.showArchived || f.projectId !== null`.

**`activeFilterCount(f)`** (exported from the FilterBar module, LI-G13): the same axes counted.

**Per-vibe List strings** (formula → fixture output):
- Daylight `.sum`: `${cardCount} ${plural(cardCount,'card','cards')}` + (needs>0 ? ` · ${needs} ${needs===1?'waits':'wait'} on you` : '') + ` · sorted by ${sortNoun}` → `7 cards · 4 wait on you · sorted by priority`
- Caption (Daylight, Paper): `${boardName} cards, grouped by ${groupNoun}, sorted by ${sortNoun}` → `Developer Experience cards, grouped by stage, sorted by priority`. Studio adds ` ascending`/` descending`. Quiet: the caption is the group label.
- Paper mast line: `${boardName}, ${numberWord(cardCount)} ${plural}.` + (needs===0 ? ' Nothing waits on you.' : ` ${cap(numberWord(needs))} ${needs===1?'waits':'wait'} on you.`) → `Developer Experience, seven cards. Four wait on you.`
- Paper group count: `'— ' + numberWord(n) + (n===1?' card':' cards')` → `— one card`, `— three cards`.
- Paper foot: `Sorted by ${sortNoun}, ${hint}.` + (empty ? ` Stages with no cards are left out: ${joinAnd(empty)}.` : '') → `Sorted by priority, highest first. Stages with no cards are left out: Integrate and Signed off.`
- Paper facts, joined `" · "`:
  - first-3 labels, then `+${n} more`, then `Blocked by another card` (1) / `Blocked by ${numberWord(n)} other cards` (>1), then the asked-by span;
  - → `clean-room · evidence-required · superpipeline · +1 more · [face]asked by super-chotu`; f83f `Blocked by three other cards · [face]asked by super-chotu`; 481f `Blocked by another card`.
  - **corrected:** f83f has 3 blockers (F §A.5.3), not 1.
- Studio hero:
  - big `7`; kicker `'Every card, by ' + groupNoun`; with a quick filter ≠ all, `'${QuickWord} cards, by ' + groupNoun` (Needs→`Waiting`, `Working`, `Idle`, `Done`);
  - h1 `<span class="sr">7 </span>cards sit in 5 of the board’s 7 stages` (n===1 → `card sits in …`; non-stage grouping → `{cards} in {g} {groupNoun}s`);
  - p `Sorted by ${sortNoun}, ${hint}.` + (k ? ` The ${numberWord(k)} empty stage${k===1?'':'s'}, ${joinAnd(empty)}, ${k===1?'is':'are'} left out of the list.` : '') → `Sorted by priority, highest first. The two empty stages, Integrate and Signed off, are left out of the list.`
- Studio `.ls-foot`:
  - `7 cards`;
  - `${g} ${plural(g,'group','groups')}` + (stage grouping && k ? ` · ${k} empty ${plural(k,'stage','stages')} hidden` : '') → `5 groups · 2 empty stages hidden`;
  - `'sort ' + HEADER[key] + (asc ? ' ↑' : ' ↓')` → `sort Pri ↑` (HEADER: Pri, Card, State, Agent, Att, Age, Due, Cost);
  - `'$' + total.toFixed(2) + ' total'` → `$0.00 total`;
  - `row ${selected+1} of ${visibleRows}` (omitted when null) → `row 2 of 7`.
- Studio group header: `.no` = `String(order+1).padStart(2,'0')` → `01`, `02`, `03`, `04`, `07`; band `c${order+1}`. Non-stage groups: index+1, no band.
- Quiet:
  - h1 `${boardName}: list`;
  - lede `${n} ${plural}.` + (needs===0 ? ' No card is waiting on you.' : needs===1 ? ' 1 is waiting on you.' : ` ${needs} are waiting on you.`) → `7 cards. 4 are waiting on you.`;
  - h2 `${label} (${count})`; own line `'Worked by ' + owner + '.'`;
  - header suffix `<span class="sorted">(sorted, ${hint})</span>`;
  - foot `'Stages with no cards are not shown: ' + empty.join(', ') + '.'` → `Stages with no cards are not shown: Integrate, Signed off.`
- Quiet facts: sentences joined `" "`.
  - Labels: with more>0, `Labels: ${firstThree.join(', ')} and ${more} more.`; otherwise `Labels: ${joinAnd(firstThree)}.` → `Labels: clean-room, evidence-required, superpipeline and 1 more.`. The spec's `joinAnd(firstThree)+' and N more'` formula would double the "and"; use the literal the spec states.
  - Then `Blocked by another card.` / `Blocked by ${numberWord(n)} other cards.`, then `Asked for by ${name}.`
- Quiet state: `Waiting on you${sub ? ', '+sub : ''}` → `Waiting on you, no owner`, `Waiting on you, stopped`.
- Quiet due: `<strong>Overdue.</strong> Was due 6 Oct 2026.` / `Due ${dueHuman}.` / `None`. Priority `priorityText ?? 'None'`; cost `costText ?? 'None'`.
- Quiet Filter button label: `Filter (none on)` / `Filter (${n} on)`. **corrected:** the reference's in-page control is `Filter cards (none on)` + `span.qn-note` `Showing all 7 cards`, in the shell's second `.qn-row`. Check SB ownership: the reference text block reads `Filter cards (none on) Showing all 7 cards` above the h1, and the `.controls` row has no Filter button in the reference text. **Follow the reference.**

## 4. Component structure per vibe

### 4.1 Operate (shared files)

| Action | Path | What |
|---|---|---|
| modify | `apps/web/src/lib/layouts.ts` | `OPERATE_LAYOUTS: Record<Vibe, Component<OperateLayoutProps>>` |
| create | `operate/layouts/types.ts` | `NeedRow {item, card, stage, stageIndex (1-based, Studio chip), agent, agentName, actions, overdue}`, `ActivityGroup {cardId, card, agent, latest, earlier[], need}`, `RunningRow`, `OperateModel` (fields: boardId, boardName, cardCount (**7**), stages, agents, needs, needsUrgent, running, usage, usageError, boardCap, cardCap, overBudget, unread, showRead, groups, phase, now, firstName; methods resume/move/markRead/setCaps/open/moveTargets), `OperateLayoutProps {model}` |
| create | `operate/operate-model.svelte.ts` | `items = itemsFromBoard(app.board, app.agents, now)`. `resume(row, comment, toKey)` = `refusalOf(await resumeCard(boardId, id, comment, toKey === current ? undefined : toKey))`, then `app.refresh()`. `move` = `moveCard` + refresh. `markRead(seq)` = `markNotificationRead` + refresh. `setCaps(b,c)` = `setBudget({boardUsdCap,cardUsdCap})` + refresh + re-fetch usage: input `''`→null else `Number(v)`; NaN/negative → field error `Enter an amount in dollars, like 25 or 25.50.` and no call. `usage` = `$effect` on boardId → `getUsage(boardId,'7d')`. `groups`: shown = showRead ? all : unread; group by cardId; latest = max createdAt; earlier desc; groups by latest desc; `need` = the matching NeedRow. `firstName` = user name split on first space → `Rakesh`. |
| create | `operate/operate-words.ts` (+ test) | §3.2 |
| create | `operate/layouts/Operate{Daylight,Paper,Studio,Quiet}.svelte` | below |
| create | `operate/icons.ts` or `OpIcon.svelte {name,size}` | arrow `M5 12h14M13 6l6 6-6 6` (sw1.8); arrow-ar `M5 12h14M14 7l5 5-5 5` (1.75); play `M8 5l11 7-11 7z`; move `M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4`; clock `<circle cx=12 cy=12 r=8.5/><path d="M12 7v5l3 2"/>` (22px); dollar `M12 3v18M16 7.5c-.8-1.2-2.2-2-4-2-2.2 0-4 1.2-4 3s1.6 2.6 4 3 4 1.4 4 3.2-1.8 3-4 3c-1.9 0-3.4-.8-4.2-2.2`; tick `M5 12.5l4.5 4.5L19 7.5` (Daylight 20, Paper 18); tick-ar `M5 12l5 5 9-10` (16). All `viewBox 0 0 24 24 fill=none stroke=currentColor` round caps, `aria-hidden focusable=false` |
| modify | `operate/OperateView.svelte` | build the model; render `OPERATE_LAYOUTS[appearance.value.vibe]`; delete the 2-column grid |
| delete | `operate/NeedsYou.svelte`, `Running.svelte`, `Spend.svelte`, `Activity.svelte` | keep `attention/NeedsYouList`, `AttentionRow`, `ResumeBox` (workspace uses them) |
| modify | `attention/attention.ts` (+test) | OP-G3 actions, `sortAttention`, `stageName` |
| modify | `stores/app.svelte.ts` | `needsYou()` → `itemsFromBoard` |
| create (if the shell has not) | `apps/web/src/lib/styles/studio-ar.css` | the Studio base layer (`.ar` alias vars, resets, `.kick .mono .muted .serif .kbd .chip .c1–.c7 .u.* .ar-btn .ar-btn2 .ar-lk .ar-hero .ar-sec .ar-figs .ttl .ar-tbl* .ar-field .ar-in/.ar-sel/.ar-ta .ar-hint .h44 .sr`, plus `.ar-st .ar-facts` for List), global, imported from app.css |

- Faces: `AgentFace variant="mood"` in every Operate layout (OP-G5). Operate never reads `FACE_VARIANT`. Mood `needs` on Needs rows, `working` on Running rows.
- Unclaimed: `<span class="noface" aria-hidden="true" style="width:Npx;height:Npx">`.
- Shell slots (OP-G2): context `PAGE_CHROME` from `+layout.svelte` carries:
  - Daylight `skyContent: Snippet` (rendered inside `.dy-sky` after `.dy-top`);
  - Studio `statusItems: {text, signal?}[]` (in `.ar-status` before `.r`).
  - Use the shell spec's names if they differ.

**OperateDaylight** (root `main.grid`; CSS = reference `SP-Operate-Daylight.html` `<style>` minus `.dy-*`; `.sky` renamed `.op-greet`):
- **Sky snippet:** `section.op-greet[aria-label="Good afternoon"] > div.vk-sky__content > div(h1,p) + div.crew[aria-label="Waiting on you"]`. Inside it, `span.crew__who` × distinct agents of the needs rows in row order: **error-eric, tester-tim, coder-kai**, Face 44, mood needs.
- **Left column:** `section.panel#needs[aria-labelledby=h-needs]`:
  - `.ph` holds h2 `Needs you`, `span.count.count--needs` `4`, and `a.ph__end` `All boards` → `/workspace/needs-you`;
  - `article.ask[aria-labelledby]` × 4 in stage order (the reference ids are `t-error-eric`, `t-tester-tim`, `t-coder-kai`, `t-unowned`; the spec suggests `t-<cardId>`; ids are invisible either way).
- **Right column:** panels Running (h-run), Spend (h-spend), Activity (h-act).
- **Row anatomy:**
  - face 32 or noface 32;
  - `.ask__who` holds `<b>` name (or `Unclaimed`), the meta span, and `span.badge.badge--needs` kindWord (= vibekit **StateLabel**);
  - `h3.ask__title > a href=/b/{id}/c/{cardId}` (click → `model.open`, preventDefault);
  - agent rows: `div.bubble > p` (detail cut140) + `button.bubble__more[aria-expanded]` `Show all`/`Show less` when > 140. No-owner rows: `div.bubble.bubble--system > p` = instruction `No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.`;
  - stopped rows: `p.hint` `Fix what it says, then resume it with a note it will read.` (RESUME_HINT for blocked/repeated-failure; other kinds `item.instruction`);
  - acts: `Resume` (primary btn-sm, play icon, `aria-expanded`), `Open card` (secondary link), `Open log` (quiet link).
- **No-owner acts:** `label.vk-visually-hidden[for=mv-{cardId}]` `Move to stage`, then `select.select#mv-…`. Options are `${name} · ${stageOwnerText(full)}`: `Reproduce · diagnostics, error-eric`, `Failing test · testing, tester-tim`, `Fix · code, 2 agents`, `Integrate · integration or api or testing, 3 agents`; the first is selected. Then `Move card` (primary, move icon), `Open card`, and `Staff an agent` (quiet link → `/workspace/capabilities`).
- **Resume form** (replaces the acts row): `form.resume[aria-label="Resume {agentName}"]`:
  - `div.resume__row > label.lbl` `Resume at` + `select.select`. The options are every stage in order, and the current one is labelled `{name} (where it stopped)` and selected: `Reported`, `Reproduce`, `Failing test (where it stopped)`, `Fix`, `Integrate`, `Signed off`, `Shipped`;
  - `label.lbl` `What changed, or what should the agent do differently? It reads this.` + `textarea.textarea` (no placeholder in the reference);
  - `div.acts[style=margin-top:0]` with `Send back to work` (primary btn-sm, play) and `Cancel` (quiet btn-sm).
- **Running:** h2 `Running`, count `0`, `p.empty` with clock icon + `No agent is working anything right now.`
- **Spend:**
  - h2 `Spend`, count `last 7 days`, link `Details` + arrow → `/b/{id}/operate/telemetry`;
  - `.spend__n` `$0.00` and `.spend__cap` `No cap set` (or `of $X cap`);
  - empty `.bar`;
  - `No agent has spent anything in the last 7 days.` when `byAgent` is empty;
  - `Set a budget cap` (secondary, dollar icon), or `Change the caps` when a cap exists.
- **Activity:**
  - h2 `Activity`, count `19 unread`;
  - `vk-segmented[aria-label="Which activity"]` `Unread only` (pressed, `data-state=checked`) / `Show all`;
  - `div.grp` × 4: `.grp__head` (face 24 or noface 24, `h3.grp__title > a` title), then `div.ev` (`.ev__t` `22:50 UTC`, `.ev__body` staleLine + link `Why, in Needs you` → `#needs`, `button.tick[aria-label="Mark read"]`), then `.ev__acts`: `Resume` (secondary, play) or `Move` (secondary, move icon) and `Earlier reminders` (quiet, `aria-expanded=false`).
- **Inline styles to keep:**
  - Running `.ph` `margin-bottom:var(--vk-space-3)`;
  - Spend `.count` `font-weight:500;font-family:var(--vk-font-body);font-size:var(--vk-text-sm)`;
  - Spend empty `font-size:var(--vk-text-sm)`;
  - Activity `.ph` `flex-wrap:wrap`;
  - resume acts `margin-top:0`.
- **Responsive (OP-G10):** <1100px `.grid{grid-template-columns:minmax(0,1fr)}`; <600px `.ev{grid-template-columns:64px minmax(0,1fr) 44px;padding-left:0}` and `.ev__acts{padding-left:0}`.

**OperatePaper** (root `main.paper`; CSS from the reference minus `.app .main .kbd .mh*`):
- `header.mast` holds a div with `p.mast__eyebrow` `Superpipeline · Operate · Developer Experience`, h1 `The desk` and `p.mast__line`, then `p.mast__end`.
- `div.cols` has three columns:
  - `section.col#letters[aria-labelledby=k1]`: kick h2 `Waiting on you`, `span.kick__n.kick__n--needs` `4 letters`, `a.lnk` `All boards`, then `article.letter[aria-labelledby=l-…]` × 4 in stage order;
  - `section.col[aria-labelledby=k2]`: `Since you last looked` · `19 unread`, `div.toggle[aria-label="Which activity"]` with buttons `Unread only` (pressed) / `Show all`, then `div.dig` × 4;
  - `aside.col[aria-label="At work and the ledger"]`: section k3 `At work` `0` + `p.prose` `No agent is working anything right now.`; `section.box` k4 `The ledger` `last 7 days`, `p.figure` `$0.00`, `p.prose[style=font-style:italic]` `No cap set.` (or `Capped at $X.`), `p.small` `No agent has spent anything this week.`, `Set a budget cap` (secondary, no icon), `a.lnk` `Details` + arrow.
- **Letter:**
  - `p.letter__meta` with `span.flag` `Stopped` and the spans `· Reproduce`, `· 2 days ago`, `· attempt 2`;
  - h3 link;
  - `blockquote.quote` `“`+C5+`”` + `button.more[style=margin-left:var(--vk-space-2)][aria-expanded=false]` `Show all` (expanded: full text + `”` + `Show less`);
  - `div.sig` with Face 28 + `— error-eric`;
  - hint;
  - acts `Resume` (primary, play, aria-expanded) / `Open card` / `Open log`.
  - The no-owner letter has `blockquote.quote.quote--board` (instruction, no quote marks), sig noface 28 + `— the board · unclaimed`, and `select#mv-…` with options `${name} · ${stageOwnerText(agents)}`: `Reproduce · error-eric`, `Failing test · tester-tim`, `Fix · 2 agents`, `Integrate · 3 agents`.
- **Dig:**
  - `h3` with face 22 + title link;
  - `.dig__row` with `p` (`span.dig__t` time + line + `a.lnk[style=min-height:0;display:inline]` `The reason is in its letter.` → `#letters`) and the tick (round, 18px, `aria-label="Mark read"`);
  - acts `[style=margin-top:var(--vk-space-1)]` with `Resume` / `Move` (secondary, **no icon**) + `button.more` `Earlier reminders`.
- **Responsive:**
  - <1100px: 2 cols, and the aside gets `grid-column:1/-1;border-left:0;padding:var(--vk-space-5) 0 0;border-top:1px solid var(--vk-color-line);margin-top:var(--vk-space-5)`;
  - <700px: 1 col, every `.col{padding:var(--vk-space-5) 0 0;border-left:0}`, `.col+.col` gets a border-top, `.paper{padding:var(--vk-space-5) 16px var(--vk-space-6)}`, `.mast h1{font-size:2.5rem}`.

**OperateStudio** (root `main.op-main`; the scoped CSS block is spec lines 740–767, verbatim in the reference; the base is in `studio-ar.css`):
- `div.op-line` holds:
  - `span.kick` `Operate · Developer Experience`;
  - `span.keys[aria-label=Keyboard]`: `J` `K` select · `R` resume · `M` move · `O` open · `.` mark read (`span.kbd`);
  - `span.r` `13:51 · midday · times UTC`.
- `div.ar-hero` holds `span.big[aria-hidden]` `4` (`.big.ink` when 0) and `.txt` (kick `Operate`, h1, p) (= vibekit **Hero**).
- `section.ar-sec[aria-labelledby=op-f]` hd `01` `Operations in figures`, r `last 7 days`, then `div.ar-figs` (vibekit **FigureRow**) with 5 figures:
  - `4` `Needs you` (div.sig when > 0);
  - `0` `Running` (b.z);
  - `$0.00` `Spend · 7 days` (z);
  - `—` `Budget cap · none set` (z; with a cap: `$X` `Budget cap`);
  - `19` `Unread activity` (z when 0).
- `section.ar-sec#needs[aria-labelledby=op-n]` hd `02` `Needs you`, r `span.sigt` `4` + `a.ar-lk[style=min-height:0]` `All boards` + arrow-ar. Then `table.ar-tbl.op-tbl`:
  - th widths: No. 30px, Kind 100px, Card · stage, Agent 116px, Age 44px, Att. 40px, Why it stopped 30%, Actions 200px;
  - rows: `.ix` `01`–`04`; `span.op-kind` (`span.u.needs` + `Stopped`, or `No owner`); `a.ttl` + `div.op-sub` (`span.chip c{stageIndex}` + stage name; no-owner: `Reported · due 2026-10-06, overdue`); `.ag` face 20 + name, or `span.m` `Unclaimed`; `span.m` `2d`/`33h`; att `span.m` (with `span.sigt` iff ≥3: only 1dfc `5`; 4605 `2` plain); `p.op-why.clamp` (3-line clamp) + `button.ar-lk[aria-expanded=false]` `Show all`, shown only when `scrollHeight > clientHeight` (4605 and 58f8 yes; 1dfc no). The no-owner why has `style="font-family: var(--ff); font-size: 14px"`;
  - acts `div.op-acts`: `Resume R` (`button.ar-btn[aria-keyshortcuts=R]` + kbd), `Open O` (`a.ar-btn2[aria-keyshortcuts=O]`), `Log` (`a.ar-lk`). No-owner: `Move… M` (`button.ar-btn[aria-haspopup=menu][aria-keyshortcuts=M]`), `Open O`, `Staff an agent` (`ar-lk` → /workspace/capabilities);
  - row 01 (4605) has `tr.sel[aria-current=true]`.
- `div.op-split` (1.5fr / 1fr):
  - `section.ar-sec[op-a]` hd `03` `Activity`, r `19 unread · by card` + `span.op-seg[role=group][aria-label="Which activity"]` `Unread` (pressed) / `All`. Then a table (Time 64px, Kind 72px, What, Mark read 44px): per group `tr.op-grp > td[colspan=4] > .in` (face 20, or `span.u.off[style=width:20px;height:20px]`, + `a.ttl` + `span.end`: `Resume`/`Move…` `button.ar-btn2` + `button.ar-lk.quiet[aria-expanded=false]` `Earlier`), then `tr.op-ev` (`span.m` `22:50` · `span.kick` `Stale` · staleLine + `a.ar-lk[style=min-height:0]` `reason ↑` → #needs · `button.op-tick[aria-label="Mark read"]` tick-ar);
  - `div.op-stack`: `section[op-r]` hd `04` `Running`, r `0`, table Agent / Card · stage / Cost (64px), empty cell `No agent is working anything right now.` (`class="serif muted" style="font-size:16px"`). Then `section[op-s]` hd `05` `Spend`, r `last 7 days · ` + `Detail` (arrow-ar, min-height 0); `div.ar-figs[style=grid-auto-flow:row;border-bottom:0]` `$0.00` z + `No cap set`; `div.op-bar` (with a cap: inner `<i style="display:block;height:100%;width:{pct}%;background:var(--text)">`, signal when overBudget); table Top agents / `$` (64px), empty `No agent spend in the window.`, otherwise top-5 `displayAgent` + `usd`; then `form.op-cap[aria-label="Set a budget cap"]` (always shown) with `label[for=op-bc]` `Board cap $` + `input#op-bc.ar-in[inputmode=decimal][placeholder=none]`, `Card cap $` `#op-cc`, and row `Save caps` (`ar-btn`) + `Cancel` (`ar-lk quiet`).
- **corrected:** the group buttons' inline style is `min-height: 44px` in the corrected reference. The spec and correction row #13 say 36px. **Follow the reference (44px).**
- Responsive:
  - <1100px: `.op-split` 1 col;
  - <900px: `.op-main{padding:16px 16px 32px;gap:28px}`, `.ar-hero .big{font-size:112px}`, `.ar-hero h1{font-size:30px}`, `.ar-figs` 2-col rows with no left borders, `.op-tbl thead{display:none}`, `.op-tbl tr{display:grid;grid-template-columns:30px minmax(0,1fr)}`, and every `td` from the 3rd on gets `grid-column:2`.

**OperateQuiet** (root `main.q#content[tabindex=-1] > div.q__col`; the h2s must be direct children in this order, no wrappers):
- `h1` `Operate`, then `p.q__lede` + `a` `See all boards`.
- `h2` `Needs your decision (4)`, `p.q__note` `Most urgent first.`, then `article.item.item--needs[aria-labelledby=q1–q4]` in urgency order 1dfc, 4605, 58f8, 63ac:
  - h3 link;
  - `p.meta` (string + face 20 + name, or noface 20 + `Unclaimed`);
  - `dl.dl` (= vibekit **FactList**): `Why it stopped` / full detail (never truncated), `What to do` / RESUME_HINT. The no-owner item has `Why it waits` / instruction;
  - acts: `Resume` (primary btn-sm, `aria-expanded`, no icon), `a` `Open card`, `a` `Open log`.
  - No-owner acts: `label.lbl[style=display:flex;align-items:center;gap:12px]` `Move to` + `select.inp` with options `${name} (${stageOwnerText(agents)})`: `Reproduce (error-eric)`, `Failing test (tester-tim)`, `Fix (2 agents)`, `Integrate (3 agents)`. Then `Move card` (primary btn-sm), `a` `Open card`, `a` `Staff an agent`.
  - Open state: `fieldset.form > legend` `Resume this card`, `label.lbl` `Resume at` + `select.inp` (options as Daylight), `label.lbl` `What changed, or what should the agent do differently? It reads this.` + `textarea.inp`, acts `[style=margin-top:0]` `Send back to work` (primary btn-sm) + `button.textbtn` `Cancel`. It replaces the acts row.
- `h2` `Working now (0)` + `p.plain` `None. No agent is working anything right now.` Non-empty: `ul.ev` with an `li` per row (face 20 working + `a` title + ` in ${stage}` + ` · $x.xx`).
- `h2` `Activity (19 unread)`, then `div.toggle[aria-label="Which activity"]` with `button.textbtn[aria-pressed]` `Unread only` / `Show all`. Then `div.item[style=padding-left:0]` × 4:
  - `h3[style=display:flex;gap:10px;align-items:center]` with face 20 + `a` title;
  - `ul.ev > li` with `span` line + `button.textbtn` `Mark read`;
  - acts `[style=margin-top:var(--vk-space-2)]` with `Resume`/`Move` (secondary btn-sm) + `button.textbtn[aria-expanded]` `Show earlier reminders`.
- `h2` `Spend in the last 7 days`, `p.plain` `<span class="money">$0.00</span>. No budget cap is set. No agent has spent anything.` (cap: `. The budget cap is $X.`; spend: `. ${top} spent the most.`). Acts: `Set a budget cap` (secondary btn-sm) + `a` `Spend details`.
- Responsive <600px: `.q{padding:var(--vk-space-5) 16px var(--vk-space-6)}`, `.dl` 1 col, `.dl dd{margin-bottom:var(--vk-space-2)}`.

### 4.2 List (shared files)

- **Create** under `apps/web/src/lib/components/plan/list/`:
  - `types.ts` (`ListSortKey = 'priority'|'title'|'state'|'agent'|'due'|'cost'|'attempts'|'age'`, `ListSort {key, ascending}`, `ListState`, `ListAgent`, `ListRow`, `ListGroup`, `ListLayoutProps` per spec lines 1033–1096; the spec's numbers 6/3 are now 7/4);
  - `list-model.ts` + `list-model.test.ts`;
  - `ListDaylight.svelte`, `ListDaylightToolbar.svelte`, `ListPaper.svelte`, `ListStudio.svelte`, `ListQuiet.svelte`, `RowMoveMenu.svelte`.
- **Modify:**
  - `layouts.ts`: `LIST_LAYOUTS: Record<Vibe,{body, toolbar|null}>` (Daylight has the toolbar);
  - `plan/PlanView.svelte`: build `listProps` (spec lines 1101–1113, `buildRows`, `groupRows`, `quickCounts`, `filtersActive`) and render `L.body`; the shell sub-bar renders `L.toolbar` after Filter;
  - `stores/app.svelte.ts`: `listSort = $state<ListSort>({key:'priority', ascending:true})` next to `listGroupBy`; also `filterOpen = $state(false)` (LI-G13; FilterBar's private `open` is lifted to it).
- **Delete** `plan/ListView.svelte`.
- **Dependency:** `app.openMoveDialog(cardId)` / `app.moveCardId` from the dialogs group (LI-G7).
- **Faces:** use vibekit `Face` directly (not AgentFace) with `id={agent.name}` (LI-G4).
  - Daylight/Paper: agent 24, asked-by 16.
  - Studio: agent 20, asked-by 14.
  - Quiet: agent 20, no asked-by face.
  - The asked-by mood is always `working`.
- **Icons:**
  - sort-on asc `M12 19V5M6 11l6-6 6 6` (Daylight 16, Paper 14);
  - sort-on desc `M12 5v14M6 13l6 6 6-6`;
  - sort-off `M8 9l4-4 4 4M8 15l4 4 4-4` (Daylight inactive);
  - sort-studio `M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4` (12, sw1.75);
  - overdue `<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/>` (Daylight 14);
  - move (Daylight 16);
  - blocked `<circle cx=12 cy=12 r=8.5/><path d="M6 18L18 6"/>` (Daylight 14);
  - calendar `<rect x=3 y=5 width=18 height=16/><path d="M3 10h18M8 3v4M16 3v4"/>` (Studio 12);
  - lock `<rect x=5 y=11 width=14 height=9/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>` (Studio 12).

**ListDaylight** (root `main.wrap > div.panel > table`; CSS from spec lines 1309–1349 / the reference; toolbar `.bar__lbl`/`.sum`; menu rules in RowMoveMenu):
- **Toolbar:** `span.bar__lbl` `Group by` + `div.vk-segmented[role=group][aria-label="Group by"]` with Stage/State/Owner/Priority (`aria-pressed`, `data-state="checked"` only on the pressed one) + `span.sum`. **corrected:** add `span.dy-note` `Showing all 7 cards` after `.sum` (that note is shell-owned per SB; check the reference).
- **Header:** `<th scope=col aria-sort>` + `button.sort[data-on]` + icon; the active column adds `<span class="vk-visually-hidden">, sorted highest first</span>`. Columns: Priority, Card, State, Agent, Due, Cost, and Actions (visually hidden).
- **Group row:** `tbody > tr.g > th[colspan=7][scope=colgroup]` with `.g__name`, `.g__n` and `.g__own`.
- **Cells:**
  - priority `td[style=width:56px]`: `span.pri.pri--{n}` (pri--1 only if signal), or `span.muted[aria-label="No priority"]` `—`;
  - card: `a.ttl` + `.facts` (≤3 `span.lab`, `span.lab[title="{n} more label{s}"]` `+{n}`, `span.blk` blocked-icon + `Blocked`, `span.asked` face16 + `asked by super-chotu`; that order);
  - state `td[style=width:170px]`: `span.vk-pill.vk-pill--{needs|working|resting|done}` (queued and closed → resting);
  - agent `td[190px]`: `div.who` with Face 24 + `<span><b>name</b><small>moodWord</small></span>`, or noface 24 + `span.muted` unclaimedWord;
  - due `td[170px]`: `span.due--over` overdue-icon + `Overdue · 6 Oct 2026` (class only if dueSignal), else `<span>6 Oct 2026</span>`, else `span.muted` `—`;
  - cost `td[80px]`: `span.muted[aria-label="No cost yet"]` `—`;
  - actions `td[200px]`: `div.acts` with `a.vk-button.vk-button--secondary` `Open` + RowMoveMenu.
- **RowMoveMenu** (props `{card:{id,title,currentStageKey}, stages, onMove}`): `button.vk-button.vk-button--quiet[aria-haspopup=menu][aria-expanded]` move-icon + `Move`. Open, it shows `div.menu[role=menu][aria-label="Move to"] > p.menu__h` `Move to…`, then per stage `button[role=menuitem]` name + `<small>here</small>` on the current one (`aria-disabled="true"`). It composes vibekit **Menu**.

**ListPaper** (root `main.pp`; CSS spec lines 1432–1468):
- `header.mast`: `p.mast__eyebrow` `Superpipeline · Plan`, h1 `The index`, `p.mast__line`, and `div.tools` (`span.tlabel` `Group by` + `div.tabs[role=group][aria-label="Group by"]`).
- Table: caption; headers `Pri`(+sort-on 14 + sr hint), `Card`, `State`, `Agent`, `Due`, `Cost` (no icon when inactive), Actions (sr). Group `tr.g th[colspan=7]` `.g__name`, `.g__n` `— one card`, `.g__own` (floats right, uppercase by CSS).
- Rows are plain `<tr>`:
  - priority `td[52px]` `span.pri.pri--{n}`;
  - card `.ttl` + `.facts` (one text run + `span.asked`);
  - state `td[160px]` `span.state.state--needs` `Waiting on you` or `span.state` word;
  - agent `td[180px]` `div.who` face24+name, or `div.who.muted` noface + word;
  - due `td[150px]` `span.due--over` `Overdue, 6 Oct 2026`;
  - cost `td[70px]`;
  - actions `td[180px]` `div.acts` with `a` `Open` + `button[aria-haspopup=dialog]` `Move…` (opens the Move dialog; **corrected:** `aria-haspopup="dialog"`, no `aria-expanded`).
- Then `p.foot`.

**ListStudio** (root `main.ls-main`; CSS spec lines 1559–1629; the shell base is in studio-ar.css, plus `.ar .u.working{background:var(--st-text)}`):
- `div.ls-bar`:
  - quick filter `div.ls-seg[role=group][aria-label="Quick filter"]` with buttons `All <span class="n">7</span>`, `Needs <span class="n">4</span>` (class `sig` only when > 0), `Working 0`, `Idle 2`, `Done 1` (`aria-pressed`; vibekit **QuickFilter**);
  - `span.kick` `Group`;
  - `div.ls-seg[aria-label="Group by"]`;
  - `div.keys[aria-label=Keyboard]`: `J K row`, `↵ open`, `M move`, `S sort`, `G group`.
- `div.ls-hero`: `span.big[aria-hidden]` + div (kick, h1, p).
- `section.ar-sec[aria-label=Cards] > table.ar-tbl.ls-tbl`:
  - th widths: Pri 56, Card, State 140, Agent 132, Att 48, Age 52, Due 112, Cost 56, Actions 176 (sr); every sortable th has `button.sort.h44` + sort-studio;
  - group `tr.g th[colspan=9] > span.in` with `.no`, `span.band.c{n}`, `.nm`, `.ct`, `.own`.
- **Cells:**
  - `span.ls-pri` (never signal);
  - `a.ttl` + `div.ar-facts` (`span` labels, `span[title]` `+1`, `span` lock + `Blocked`, `span` face14 + `asked by super-chotu`);
  - state `span.ar-st.needs > span.u.needs` + `Waiting on you`, or `span.ar-st > span.u.queued|done|working|off`;
  - agent `span.ag` face20 + name, or `span.m` word;
  - att `span.m` (+`span.sigt`);
  - age `span.m`;
  - due `span.ls-over` calendar + `2026-10-06<span class="sr">, overdue</span>` (when not signal: `span.m`);
  - cost `span.m` `—`;
  - actions `div.ls-acts` with `a.ib.h44` `Open <span class="kbd" aria-hidden="true">↵</span>` + `button.ib.h44[aria-haspopup=dialog]` `Move <span class="kbd" aria-hidden="true">M</span>`.
- The selected row gets `tr.sel[aria-current=true]`.
- Then `div.ls-foot`.

**ListQuiet** (root `main.q#content[tabindex=-1] > div.q__col`, or `div.q` if the shell owns `<main>`; CSS spec lines 1716–1745 minus `.views`):
- h1, `p.lede`, and `div.controls` with `label.lbl` `Group by` + `select.inp` (Stage/State/Owner/Priority) and `label.lbl` `Sort by` + `select.inp`. Sort options: `Priority, highest first`, `Card title`, `State`, `Agent`, `Due date`, `Cost`, mapping to priority asc, title asc, state asc, agent asc, due asc, cost desc. LI-G14: when the current sort is not one of these, prepend a selected option `${sortNoun}, ${hint}`. The spec's Filter button: see §3.3 note.
- Per group: `h2` `Reported (1)`, `p.own`, then a `<table>` with `caption.vk-visually-hidden` = label and its own `thead` (repeated per group). The th `button.sort` holds the word + `span.sorted` on the active one; `Actions` is plain th text.
- `tr.needs` iff needsYou. Cell widths: 7rem, auto, 11rem, 11rem, 10rem, 5rem, 12rem. Actions: `a` `Open` + `button.textbtn[aria-haspopup=dialog]` `Move`.
- Then `p.empty`.

**Shared List responsive (≤719px, LI-G6):**
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
- Every td other than title and actions gets a `data-label` (its column header).
- Studio adds `.ls-main{padding:16px}` and `.ls-hero .big{font-size:72px}`.
- Quiet adds `.q{padding:var(--vk-space-5) var(--vk-space-4) var(--vk-space-6)}`.

### 4.3 vibekit name mapping (spec name → vibekit-components.md §2.2)

| Spec name | vibekit 0.1.0 |
|---|---|
| Button | Button |
| IconButton | IconButton |
| Tabs (segmented/toggle) | **Segmented** (#11); Paper `.tabs` → Tabs |
| Studio quick filter | **QuickFilter** (#12) |
| FigureRow / Figure | FigureRow (#25) |
| Hero, Studio List hero ("FigureRow hero variant") | **Hero** (#24) |
| Section | **SectionHeader** (#33) |
| DataTable | DataTable |
| AgentChip | **AgentName** + Face |
| StatePill | **StateLabel** (#28) |
| Quote | **AgentQuote** (#31) |
| Disclosure | Disclosure |
| Field | Field |
| Menu | Menu |
| Kbd / KeyLegend | **Kbd** (#17); no KeyLegend, so compose Kbd |
| Footnote | **Footnotes** (#32); Paper/Quiet foot lines are plain paragraphs |
| EmptyState | EmptyState |
| ProgressBar | **Meter** (#40) |
| Skeleton | **Loading** kind skeleton (#38) |
| DescriptionList | **FactList** (#22) |

- **Icon, StageChip:** no vibekit component. Product-local (`OpIcon`, chip spans).
- The vendored tarball is 0.0.1, so most of these do not exist yet. Until they ship, the quoted reference CSS is what each component must reproduce.
- **Studio tokens:** `--vk-color-rule`, `--vk-stage-1..7`, `--vk-color-stage-text` and the Annual-report fonts are missing from vendored 0.0.1 (WA-G10/SE-G9). A new tarball is needed before the Studio diffs pass.
- No `data-pixel` hooks are needed for these screens (full-page compare).

## 5. States & behaviour

### Operate (all vibes)

- **Show all / Show less:** a local `expanded` flag per row. Studio removes `.clamp`.
- **Resume:** sets local `resuming`; the form replaces the acts row and **focus moves to the `Resume at` select**.
  - `Send back to work` is disabled while the textarea is empty (after trim) or a request is busy. It calls `model.resume(row, text.trim(), select.value)`. A `toStageKey` equal to the current stage → `undefined`.
  - Success closes the form. `Cancel` closes it and clears the text.
  - Refusal per vibe:
    - Daylight `<p class="hint" role="alert" style="color:var(--vk-color-signal-text)">{msg}</p>` under the acts;
    - Paper the same pattern;
    - Studio `p.ar-hint.sigt[role=alert]`;
    - Quiet `p.plain[role=alert]` prefixed `Not done: `.
  - The harness **types into the Daylight textarea** with the text above; the Quiet textarea stays empty.
  - **Studio** resume row (not drawn): `tr.op-resume > td[colspan=8] > form(grid minmax(0,240px) minmax(0,1fr), gap 12px)` with `div.ar-field` `Resume at` + `select.ar-sel`, `div.ar-field` `What changed, or what should the agent do differently? It reads this.` + `textarea.ar-ta`, and `div.op-acts` (col 1/-1) `Send back to work` (ar-btn) + `Cancel` (ar-lk quiet).
  - **Paper** form (not drawn): `form.letter-resume` (margin-top s3; padding-left s4; border-left 1px line; grid gap s3) with `label` `Resume at` + `select.select`, `label` (same text) + `textarea.select` (min-height 88px, padding s3, width 100%), and acts `Send back to work` (primary btn-sm) + `button.more` `Cancel`.
- **Open card / title:** `model.open(id)` → `app.openCard`, pushes `/b/{id}/c/{cardId}`.
- **Open log / Log:** open + scroll to `#card-section-attempts`.
- **Move card:** `model.move(row, select.value)`; a refusal gets the same alert. Studio `Move…` opens the existing `board/CardMoveMenu.svelte` (`card`, `stages`, `open` bindable, `visible`), listing `moveTargets`. It calls `app.moveCard`, which surfaces refusals in `app.error`. The same component serves the activity `Move…`.
- **Activity:**
  - The tick (`aria-label="Mark read"`) calls `markRead(latest.seq)`.
  - The group `Resume`/`Move` opens or focuses the matching Needs row's form or select and scrolls `#needs` (Paper `#letters`) into view. It shows only when `group.need.actions` includes resume/move.
  - **"Earlier reminders"** (Daylight/Paper), `Earlier` (Studio), `Show earlier reminders` → `Hide earlier reminders` (Quiet) toggle the `group.earlier` rows. Each is an extra `div.ev` / `tr.op-ev` / `li` with its own tick, in the same line format; non-stale bodies are verbatim. Daylight/Paper/Studio keep the label and set `aria-expanded=true`. The button is not rendered when `earlier` is empty.
  - The toggles set `showRead` (`aria-pressed`, Daylight `data-state="checked"`).
- **Studio keyboard:** a window keydown handler while mounted. It ignores input/textarea/select/contenteditable targets and any modifier.
  - `J`/`K` move the selection (default index 0, `tr.sel` + `aria-current=true`);
  - `R` resumes when the actions include resume;
  - `M` opens Move when they include move;
  - `O` opens;
  - `.` marks read the selected card's latest unread notification.
- **Caps** (OP-G12):
  - Daylight: `Set a budget cap` toggles a `div.resume` box with `div.resume__row` (two `label.lbl` `Board cap $` / `Card cap $` + `input.money[inputmode=decimal][placeholder=none]`, prefilled) and acts `Save caps` (primary) / `Cancel` (quiet).
  - Paper: the same pattern.
  - Quiet: `fieldset.form > legend` `Set a budget cap`, `label.lbl` `Board cap in dollars` / `Card cap in dollars` + `input.inp[inputmode=decimal]`, `Save caps` + `button.textbtn` `Cancel`.
  - Studio: always shown. `Cancel` restores the current caps; field errors render as `span.ar-hint.sigt` under the input.
- **Empty states (not drawn):**
  - Needs 0: Daylight count `0` muted + `p.empty` `Nothing is waiting on you.`; Paper `0 letters` + `p.prose` `Nothing is waiting on you.`; Studio `p.op-empty` `Nothing on this board is waiting on you.`; Quiet `Needs your decision (0)` + `None.`.
  - Activity: `Nothing unread.` / `Nothing has happened on this board yet.`.
  - Usage error: `Couldn't load spend — {msg}`.
  - Loading: OperateView renders nothing until `app.board`.
- **Daylight Running, non-empty:** `div.grp` with face 24 (working) + title, then `.ev` with `.ev__t` stage name and body agentName (+ ` · $x.xx`).
- **Signal only for "needs you":** the count badges use `--vk-color-signal-text` bg with `--vk-color-primary-fg` text (VK §3.5, shell). Studio figures use `.sig` only when > 0; zeros use `.z`. Attempts use `.sigt` only when ≥3.
- Buttons are one line (`white-space:nowrap` in Studio). Targets are ≥44px (`.btn-sm` 44; Studio `.op-acts` buttons are 40px tall and `.op-tick` is 44). Agent text is shown verbatim, lower-case start (no capitalising on desktop, F C-06).

### List (all vibes)

| Control | Behaviour |
|---|---|
| Title / Open | `<a href=/b/{id}/c/{cardId}>`; the route opens the drawer; `app.view` stays `'list'` |
| Header sort buttons | `onSort(key)` → `app.listSort = nextSort(…)`; `aria-sort` + `data-on` on the active one |
| Group by | `onGroupBy` → `app.listGroupBy`; `aria-pressed` (Quiet: select value) |
| Quiet Sort by select | sets `app.listSort` from the 6 mappings |
| Daylight Move | toggles RowMoveMenu (`role=menu` under the button, `aria-expanded`). Items: every stage, the current one `aria-disabled` + `here`. Click → `await onMove(cardId,key)`, close, then announce `{title} moved to {stage}` in a polite live region. Escape or outside click closes and returns focus to the button. ArrowUp/Down move between items. Refusals → `app.error` (shell bar) |
| Paper `Move…` / Studio `Move` / Quiet `Move` / Studio `M` | `onOpenMoveDialog(cardId)` → `app.openMoveDialog` (SP-Dlg-Move) |
| Studio quick filter | local `$state<'all'\|'needs'\|'working'\|'idle'\|'done'>('all')`; filters rows by tone after grouping; empty groups drop; the hero big number and kicker follow |
| **Studio selection** | `selected = $state<number\|null>(null)`, an index into the flattened visible rows. `J` next / `K` previous (clamped; the first `J` from null selects index 0). Clicking a row (not a link or button) selects it. Selected `<tr class="sel" aria-current="true">`, scrolled into view `{block:'nearest'}`. `Enter` → `goto(row.href)`; `M` → Move dialog; `S` cycles sort priority→title→state→agent→attempts→age→due→cost→priority via `onSort`; `G` cycles group stage→state→owner→priority. Keys are ignored in input/select/textarea or with a modifier. Foot `row {n} of {visible}` |
| Hover | Daylight `tr.r:hover td` raised; Paper/Studio `.ttl:hover` underline; Studio `.ib:hover` inverts |

- **Empty copy:**
  - filters hide everything (`filtersOn && cardCount===0`, or the Studio quick filter yields 0): **`No cards match these filters.`**;
  - board has no cards: **`No cards on this board`**.
  - Element per vibe: Daylight `p.empty.muted` inside `.panel`; Paper `p.foot`; Studio `div.ls-foot > span` under the hero; Quiet `p.empty` after `.controls`.
- Loading: PlanView renders nothing until `app.board`. Errors: the shell bar.
- Focus rings: vk base / Studio `.ar :focus-visible { outline: 3px solid var(--text); outline-offset: 3px }`.
- 44px targets: the Studio `.ib` (36px) and `.sort` (30px) get the `.h44` invisible hit area (LI-G11).
- The signal appears only on rows that need you (LI-G5). Studio never signals priority (LI-G12).

## 6. Phone (390)

No phone artboard exists for Operate or List (OP-G10, LI-G6). No 390 pixel baseline. The vibes.spec checks still apply: no side scroll, 44px targets, axe. Use the breakpoints in §4: Operate 1100/900/700/600, List ≤719 stacked rows.

## 7. Gaps / open questions

| id | Issue | Recommendation |
|---|---|---|
| G-T1 | The 4605 *earlier* stale notification time is given twice: O-15 says `2026-10-09T14:11:50Z`; Part 4 §4.2 says `2026-10-10T02:11:50Z`. | Either works: it is hidden behind Earlier reminders and does not affect order or count. Prefer O-15 (the "final choices" table). Ask the coordinator if F needs one value. |
| G-T2 | `dayWords(h)` is undefined for h<24 (d=0). F's 63ac earlier row "Stuck 12h" shows in Daylight/Paper/Quiet when Earlier is expanded. | For d=0 use `${h} hours`, e.g. `Still unclaimed after 12 hours in Reported.` Not in any baseline. |
| G-T3 | Stale "Stuck 24h" for a notice ~48h after 4605's stop (kept on purpose, appendix). The text reads "a day later" / "24h later". | Keep. The fixture is literal and no code compensates (OP-G9). |
| G-T4 | Studio activity group button height: the reference has 44px, the spec and correction row #13 say 36px. | Reference (44px). |
| G-T5 | Harness registry steps (G-H1–G-H3) and Studio `clock` overrides contradict the corrected world. | Fix in the same PR (§1). |
| G-T6 | Quiet List filter control. The spec puts `Filter (none on)` in `.controls`; corrections #4 add the shell `.qn-row` with `button.qn-link[aria-haspopup=dialog]` `Filter cards (none on)` + `span.qn-note` `Showing all 7 cards`. The reference text shows the latter and no Filter in `.controls`. | Follow the reference. Wire it to `app.filterOpen = true` with `activeFilterCount`. |
| G-T7 | Paper/Quiet List "Blocked by three other cards" vs the Board artboards' "Blocked by 3 cards". | Accepted as drawn (appendix). |
| G-T8 | Daylight List `dy-note` placement (after `.sum`, not after Filter). | As drawn. The shell owns the note; the toolbar must not duplicate it. |
| G-T9 | Studio List status gains `2 blocked · 1 shipped` (SB §4.2) although the original mockup omitted them. | Applied. These are shell status items: the page supplies them through the shell slot like Operate. |
| G-T10 | Paper masthead title on List/Operate is `<p class="mh-title mh-title--sm">`, not SB §1.4's `<h1>`. | Follow the reference; the SB spec should note the non-board form. |
| G-T11 | `aria-labelledby` ids: the reference uses `t-error-eric`/`t-unowned` (Daylight), `l-…` (Paper), `q1–q4` (Quiet); the spec suggests `t-<cardId>`. | Any unique id is fine. Use `t-<cardId>` / `l-<cardId>` / `q{n}`; ids are not visible. |
| G-T12 | `cardLead` ownerless branch (LI-G2) is two competing proposals. | The Board/Card group decides. List/Operate do not depend on it. |
| G-T13 | `app.needsYou()` return type changes to `AttentionItem[]`; every caller (shell count, BottomNav, Workspace) must adapt. | Same PR as OP-G1. |
| G-T14 | The workspace-wide attention (`/v1/stale?attention=1`) previously gave 3. With 4605 live and stale it gives 4 (WC-1); `stale_notified_at` is set. | Fixture only; no code change for these screens. |
| Out of scope | Agent-drafted new card (D-1); Projects/Workspace/Settings/Spend sections; the shell (rail, masthead, Quiet nav, Studio rail/top/sub/status, view toggle, FilterBar); dialogs (SP-Dlg-Move internals). | — |
