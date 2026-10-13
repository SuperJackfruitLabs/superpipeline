# Superpipeline mockup corrections (one fixture world)

Status: correction list for the Design-canvas sources `…/scratchpad/vibes-mockups/project/SP-*.dc.html`. No mockup has been edited yet. After each file is corrected, re-export it (`F §B.7`) and delete the masks its conflict ids covered.

Totals:
- **569 correction rows** in 44 artboard files. By Grp: board 76, phone-board 42, list-operate 94, card 89, cardpage 75, states 47, phone-card 22, shared 70, dialogs 54.
- Shell replacement on 12 shared artboards (Part 2).
- Those 12 split into 48 per-vibe files (Part 3).
- **44 fixture-world addition rows**, of which some values recur across groups, plus 7 world changes (Part 4).

## Source ids used in the tables

| Prefix | Source |
|---|---|
| `F` | `screens/fixtures-and-harness.md`: §A.x, D-n, C-nn, G-0n. This spec wins over every other spec. |
| `SB` | `screens/shell-and-board.md` (G1–G17, §n) |
| `card` | `screens/card.md` (§n, §8.2-n, G-n, and the vibe gaps D-n, P-n, S-n, Q-n) |
| `OL` | `screens/operate-list-pages.md` |
| `DLG` | `screens/dialogs.md` (D-n, §n) |
| `VK` | `vibekit-components.md`: §3.5 count badge, §3.3 no danger colour, ink-outline destructive. |
| `ONE-WORLD R1a–e` | The rulings below. |
| `MAJ` | A value taken from the majority of artboards. Each one is listed under World additions. |

## Rulings applied

0. **Design intent beats live data** (operator ruling, binding). Where the fixture world contradicts what a screen is designed to show, the **fixture changes**, not the screen. A mockup row exists only for one of these reasons:
   - (a) two screens disagree, and the row applies the resolution;
   - (b) a spec rules a behaviour or accessibility change: VK badges and destructive buttons, `card §8.2`, `SB` G1/G4/G6, `F C-07`;
   - (c) one-world consistency forces it.
1. **One world.** Nothing is seeded per artboard or per vibe.
   - **Clock.** Every artboard reads **2026-10-11 13:51 IST (08:21Z), Sunday 11 October, noon / "midday"**. The Studio values 13:19, 13:20, 13:27 and 13:31 all become 13:51, and `F D2` is void. Activity times shown in UTC stay UTC.
   - **Card 4605 has one content everywhere:** the base/phone-literal record.
     - 5 criteria and no plan;
     - 5 GitHub references; no links, no related prior work, no handoff;
     - project `Marketing & Community — Melissa and Anna onboarding`;
     - runs on Thu 8 Oct.
   - **Overlays void.** `F §A.7.2` and `card §7.1` are void. The (c) rows they had downgraded return where the screens disagree: D-25, P-7, P-13, P-17, S-4, S-8, S-10, S-19, Q-4, Q-14, Q-15, Q-18, Q-27.
2. **Card 4605 is LIVE and stopped:** waiting on you, attempt 2 by error-eric, in Reproduce, "2 days". This is a fixture change (WC-1).
   - The archived state appears only in the Card-States archived example (panel C, its own card).
   - Consequence: the Developer Experience board has **7 live cards**, so these rows are added (rule 0c):
     - 4605 sits in the Reproduce lane; the board shows "Showing all 7 cards" and 4 need you;
     - Operate count is 4 and lists a third stopped card;
     - the Daylight crew reads "4 agents / 3 wait on you" (tester-tim, coder-kai, error-eric);
     - Studio tabs read "List 7";
     - the Switcher Developer Experience row reads 7 cards / 4 need you;
     - Palette, Move and NewCard gain `#4605`;
     - Workspace needs-you lists 4.
3. **Other one-state choices.**
   - The R&I card `card_42269e99036f42ae` is live with its pending approval gate, and its gate shows **three** buttons (fixture: `DEFAULT_GATE_OPTIONS`).
   - The agent-question panel B moves to Guild Operations & Automation card 1, because 1dfc stays blocked.
   - Panel D uses base Thursday 8 Oct 19:26: Board-Quiet's "done 2 days ago" and panel D's "Fri" disagree, and the base wins.
4. **Specs disagree.** `F` wins over the other specs, overruling:
   - `SB §0.2/§7` (tenant, ids, 15 agents);
   - `card §5` (`brd_devx`, `failing-test`, `usr_rakesh`);
   - `DLG D-7`.
   - Desktop shows the stored lower-case agent text; the phone capitalises it at render (`F C-06`).
5. **Shell.** Each vibe uses its own shell (`dy` / `mh` / `ar` / `qn`), described in Part 2. The crew pill "2 at work · research-ray and tester-tim" is replaced everywhere (`F C-07`).
6. **vibekit.**
   - Every count badge uses `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` (`VK §3.5`).
   - Destructive buttons use the ink outline `inset 0 0 0 2px var(--vk-color-text)` on surface. Studio uses `inset 0 0 0 2.5px var(--rule)` on transparent. The label is a verb plus an object.
   - No raw danger or outcome hex was found in any SP file.

## Former open decisions: final choices (design intent wins, fixture adapts)

| # | Question | Final choice |
|---|---|---|
| O-1 | R&I gate options: the fixture gives 4 buttons, the panels show 3. | Panels unchanged. The fixture uses `DEFAULT_GATE_OPTIONS` (WC-2). |
| O-2 | Face moods: `SB G5` says resting; the mockups draw super-chotu working on desktop and resting on phones. | Mockups as drawn, with no face-mood rows. `SB G5` adapts: the asked-by face and the Daylight rail draw the queuer working. |
| O-3 | 4605 activity verbs "Started" and "Sent back". | Phone wording stays. The fixture stores those `action` values (additions). |
| O-4 | Snapshot `spec_json` vs the phone's detail rows. | The fixture stores the phone keys and wording. Mockup paraphrases such as "Accounts issues", "Routing rule" and the Card-States C description stay. |
| O-5 | Studio "In Reproduce": "3 days" vs the drawn "2 days". | "2 days" as drawn, aged from `state_since`. |
| O-6 | R&I `updated_at`. | `2026-10-11T07:18:00Z`, so the Switcher shows "Today" and it sorts 2nd under "Needs you". |
| O-7 | Studio Operate clock. | 13:51 local in the sub-bar and sync; activity times stay UTC. |
| O-8 | Revoke label. | Visible "Revoke" as drawn; the aria-label names the token. |
| O-9 | Operate "Still unclaimed after two days in Reported". | Mockup stays. The OL rule derives "unclaimed" from stage ownership, not from the notification body. |
| O-10 | Projects `rollups=loaded` and Spend `data=with spend`. | Kept as drawn. The harness fulfils the placeholder figures (`F §A.4.5`, `§A.5.7`). |
| O-11 | Palette Agents group: the drawn rows are error-eric, tester-tim, devops-dave and vulnerability-victor; the API order (`created_at`) gives research-ray first. | Mockup as drawn. The palette ranks agents with a D-7 tie-break, not by `created_at`, so the Workspace-Agents order stays. |
| O-12 | Daylight rail crew has 4 agents, but `crew.slice(0,3)` shows only 3 faces. | Cap 3 as drawn: tester-tim, coder-kai, error-eric. super-chotu is counted in "4 agents" but has no face. |
| O-13 | Daylight greeting band on the empty board. | None, as drawn. |
| O-14 | List "wait on you" count with 4605 live. | `4`: the List spec's own formula, with the Fix-highest card treated as Waiting on you (OL cross-screen ruling). It replaces the addendum's provisional 3. |
| O-15 | 4605 notifications. | Canonical set, all unread: blocked `2026-10-08T14:11:46Z`; stale `Stuck 24h in Reproduce: … Next: resume it` at `2026-10-09T14:11:50Z` and `2026-10-10T14:11:50Z`, keeping the "24h" wording of the 1dfc/58f8 repeats. Unread becomes **19**, and `stale_notified_at` is `2026-10-10T14:11:50Z`. |
| O-16 | 4605 stop summary: Paper/Studio print "No fresh DM event to trace; needs one per agent.", Daylight prints a full stop instead (2–2). | `No fresh DM event to trace; needs one per agent.` (CardPage Paper/Studio). The Daylight rows keep their own literal. Recheck the card group if one string is wanted. |
| O-17 | Resume placeholder (`card §8.2-6`) is defined only for Daylight. | The same sentence is used on Paper and Studio. |

## Row key

Every correction row starts with `Grp`, one of: `board`, `phone-board`, `list-operate`, `card`, `cardpage`, `states`, `phone-card`, `shared`, `dialogs`. Each key owns a disjoint set of files, so editors can split the work without overlapping:

| Grp | Files |
|---|---|
| board | SP-Board-Daylight/Paper/Studio/Quiet, SP-Board-Empty (→ 4 per-vibe files) |
| phone-board | SP-Phone-Board-* |
| list-operate | SP-List-*, SP-Operate-* |
| card | SP-Card-Daylight/Paper/Studio/Quiet |
| cardpage | SP-CardPage-* |
| states | SP-Card-States-* |
| phone-card | SP-Phone-Card-* |
| shared | SP-Projects, SP-Workspace-Agents, SP-Workspace-Other, SP-Settings, SP-Spend (→ per-vibe files) |
| dialogs | SP-Dlg-* (→ per-vibe files) |

Each editor owns Part 2 (shell) and Part 3 (split) for the files of its own key.

---

# Part 1 — Corrections per artboard file

Rows are grouped as the specs group the screens. Each group may start with literal blocks that its rows refer to by name.

## Group `boards`

Artboards: SP-Board-Daylight, SP-Board-Paper, SP-Board-Studio, SP-Board-Quiet, SP-Board-Empty (shared, `vibe` prop).

Basis for this revision: ADDENDUM.md, which supersedes BRIEF where they differ.
- Card 4605 is live and stopped. It is the 7th Developer Experience (DX) card, in Reproduce, and it needs you.
- DX now has 7 live cards. 4 need you: 63ac (unowned), plus 58f8, 1dfc and 4605 (stopped).
- Workspace attention is 4, so the Operate count is 4 everywhere.
- Daylight crew: `4 agents` / `3 wait on you`.
- All face-mood (G5) rows are deleted. The mockups' `working` super-chotu faces stay as drawn.

Values used for card 4605:
- Needs-you order: needs-first stable sort over the §A.5.2 order gives 63ac, 58f8, 1dfc, 4605. So 4605 is needs item 4, and the Studio table row is 04.
- Age: stopped since 2026-10-08T14:11:45Z, so `2d` short and `2 days` long.
- Priority 3, attempts 2, last agent error-eric, queued by super-chotu.
- First reference (oldest `created_at` in the snapshot): `AgentPod v0.1.91 Matrix inbound bridge contract`.

Abbreviations in the Source column:
- `ADD1` = ADDENDUM item 1.
- `SB` = shell-and-board.
- `F` = fixtures-and-harness.
- `VK` = vibekit-components.
- `ONE-WORLD R1` = the BRIEF's one-clock ruling (13:51 IST).

Rows that stay under the addendum's keep-rules:
- C-01, C-05, C-06, C-10 and C-13: two screens disagree.
- 9ed9 Tries 15: the attempt count other screens use.
- G4, G6, G7 and VK §3.5: spec-ruled behaviour.
- C-07: roster.

---

### SP-Board-Daylight.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| board | 1 | CSS line 89 `.dy-count` | `background: var(--vk-color-signal); color: var(--vk-color-primary-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| board | 2 | Rail Operate `.dy-count` + sr | `3` / `, 3 need you` | `4` / `, 4 need you` | ADD1, SB G4 |
| board | 3 | Rail `.dy-crew` text | `<b>3 agents</b>2 wait on you` | `<b>4 agents</b>3 wait on you` | ADD1, SB §1.3.3 |
| board | 4 | Rail `.dy-crew` title | `tester-tim and coder-kai wait on you; super-chotu queues the work` | `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` | ADD1 |
| board | 5 | Rail `.dy-faces`, 3rd face (`crew.slice(0,3)`) | super-chotu face (`data-mood="working"`) | error-eric's generated face, `data-mood="needs"` (same features as the Reproduce strip face, fill `var(--vk-mood-needs)`). Super-chotu's face drops out at the 3-face cap | ADD1, SB §1.3.1/§1.3.3 |
| board | 6 | `.dy-note` | `Showing all 6 cards` | `Showing all 7 cards` | ADD1, SB §1.2 |
| board | 7 | `.dl-greet` | `Good afternoon, Rakesh. 3 cards want you.` | `Good afternoon, Rakesh. 4 cards want you.` | ADD1, SB §3.3 |
| board | 8 | `.dl-crew ul` ("Holding cards") | 2 `li`: tester-tim, coder-kai | 3 `li`: tester-tim, coder-kai, then a new `<li>` with error-eric's face 28 (`data-mood="needs"`) + `error-eric` | ADD1, SB §3.3 |
| board | 9 | `button.dl-strip` Reproduce, the strip with `aria-label="Reproduce, no cards. diagnostics · error-eric. Expand stage"` | collapsed strip `0` / resting error-eric face / `Reproduce` | Replace the strip with a lane: `<section class="dl-lane" aria-label="Reproduce"><div class="dl-lanehead"><h2>Reproduce <span class="dl-count" aria-label="1 cards">1</span></h2><span class="dl-owner">diagnostics · error-eric</span></div>` + the tile from row 10 + `</section>`. The `dl-board` column for stage 2 becomes a lane column like Reported's | ADD1, SB §3.1/§3.3 |
| board | 10 | New tile in the Reproduce lane | — | `<article class="dl-tile needs">`, containing:<br>• h3 `.dl-title`: `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`, with aria-label `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop, in Reproduce. Enter to open, M to move, Alt with left or right arrow to move between stages.`<br>• `.dl-move` `Move`, with aria-label `Move Diagnose Melissa and Anna Supermessage silence — trace actual failing hop to another stage`.<br>• `<div class="dl-chips"><span class="vk-visually-hidden">Priority 3</span></div>` (priority 3 gets no p1/p2 stripe class).<br>• `.dl-ref`: link icon + `AgentPod v0.1.91 Matrix inbound bridge contract`.<br>• `.dl-meta`: `.dl-who` = error-eric face 24 (needs) + `error-eric <span class="dl-mood needs">· needs you</span>`, then `.dl-asked` (title `Queued by super-chotu, not by you`) = super-chotu face 18 as drawn on the other chips + `asked by super-chotu`.<br>• `.dl-act`: `vk-button--signal` `Resume`. | ADD1, SB §3.3 tile rules |
| board | 11 | Fix lane, card 1dfc `article` class | `dl-tile p2 needs` | `dl-tile needs` | F C-01, SB G9 |
| board | 12 | Fix lane, card 1dfc `.dl-chips` | `<div class="dl-chips"><span class="vk-visually-hidden">Priority 2</span></div>` | (remove the element) | F C-01 |
| board | 13 | Peek `.dl-clamp` (58f8 detail) | `grant Tester Tim’s station write access` | `grant Tester Tim's station write access` | F C-05, SB G10 |

### SP-Board-Paper.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| board | 1 | `.mh-sec` Operate `.n` + sr | `(3)` / ` need you` | `(4)` / ` need you` | ADD1, SB G4 |
| board | 2 | `.mh-showing` | `Showing all 6 cards · 3 wait on you · 1 shipped` | `Showing all 7 cards · 4 wait on you · 1 shipped` | ADD1 |
| board | 3 | Col 1 `.pp-kicker.live` | `Waiting on you · 3 letters` | `Waiting on you · 4 letters` | ADD1, SB §4.1 |
| board | 4 | Col 1, new 4th `article.pp-story.pp-lead` after the 1dfc story | — | Contents:<br>• h3 link `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`, with aria-label `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop, in Reproduce. Enter to open, M to move, Alt with left or right arrow to move between stages.`<br>• `<blockquote class="pp-quote pp-clamp">`, in its own collapsed/expanded state like 58f8: `“not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.”`<br>• `.pp-more` `Read the rest`.<br>• `.pp-by`: error-eric face 24 (needs) + `<em>error-eric</em> · Reproduce · 2d · 2 attempts`.<br>• `.pp-facts`: `<span>P3</span><span class="ref">AgentPod v0.1.91 Matrix inbound bridge contract</span><span>asked by super-chotu</span>`.<br>• `.pp-acts`: `.pp-btn.reply` `Resume`; `a.pp-btn` `Open` + arrow (aria `Open Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`); `.pp-btn.ghost` `Move` (aria `Move Diagnose Melissa and Anna Supermessage silence — trace actual failing hop to another stage`). | ADD1, F §A.5.2 detail verbatim, SB §4.1 |
| board | 5 | `.pp-pipe` Reproduce `li .n` | `empty` | `1 card` | ADD1, SB §4.1 |
| board | 6 | 58f8 `.pp-quote` (prop state expanded=true) | `Tester Tim’s` | `Tester Tim's` | F C-05 |
| board | 7 | 58f8 `.pp-quote.pp-clamp` (default collapsed) | `Tester Tim’s` | `Tester Tim's` | F C-05 |
| board | 8 | 1dfc `.pp-quote` | `“This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.”` | `“this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit”` | F C-06, SB G10 |
| board | 9 | 1dfc `.pp-facts` | `<span>P2</span><span class="ref">test(api): pin manual delivery reminder</span>` | `<span class="ref">test(api): pin manual delivery reminder</span>` | F C-01 |

### SP-Board-Studio.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| board | 1 | CSS line 71 `.ar-nav .ct` | `background: var(--sig); color: var(--sig-fg);` | `background: var(--sig-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| board | 2 | Rail Operate `a.ar-nav`: aria-label / `.ct` / `.tip` | `Operate, 3 need you` / `3` / `Operate · 3 need you` | `Operate, 4 need you` / `4` / `Operate · 4 need you` | ADD1, SB G4 |
| board | 3 | `.ar-tab` List count | `List <span class="mono">6</span>` | `List <span class="mono">7</span>` (Projects stays `3`) | ADD1 |
| board | 4 | `.ar-hint` | `Showing all 6 cards` | `Showing all 7 cards` | ADD1 |
| board | 5 | `.ar-sub .r` | `The board at 13:19 · midday · Sunday 11 October` | `The board at 13:51 · midday · Sunday 11 October` | ONE-WORLD R1, SB G6 |
| board | 6 | `.bd-qf` All / Need you | `All <b>6</b>` / `Need you <b>3</b>` | `All <b>7</b>` / `Need you <b>4</b>` | ADD1 |
| board | 7 | `.ar-hero .big` | `3` | `4` | ADD1 |
| board | 8 | `.ar-hero h1` | `<span class="sr">3 </span>of 6 cards are waiting on a person` | `<span class="sr">4 </span>of 7 cards are waiting on a person` | ADD1 |
| board | 9 | `.ar-hero p` | `One sits in a stage nobody works and is five days overdue;¹ one stopped in Failing test for want of a writable Forge URL;² one stopped in Fix after five tries.³ Two more are queued behind a blocker,⁴ and one has shipped.⁵` | `One sits in a stage nobody works and is five days overdue;¹ one stopped in Failing test on its first try;² one stopped in Fix after five tries;³ one stopped in Reproduce after two tries.⁴ Two more are queued behind a blocker,⁵ and one has shipped.⁶` (each number is `<sup class="fn">n</sup>`) | ADD1, SB G7, SB §4.2 heroSentence |
| board | 10 | `.ar-figs` Cards / Need you | `<b>6</b>` / `<b>3</b>` | `<b>7</b>` / `<b>4</b>` | ADD1 |
| board | 11 | `.ar-figs` "Spend this week" footnote | `<sup class="fn">6</sup>` | `<sup class="fn">7</sup>` | ADD1 (footnote renumbering) |
| board | 12 | `.ar-mul` stage 2 Reproduce | `class="ar-mul z"`, aria `Stage 2, Reproduce: 0 cards. Worked by error-eric`, `.n` `0`, empty `.units`, `.note` `Empty` | `class="ar-mul"`, aria `Stage 2, Reproduce: 1 card, waiting on you. Worked by error-eric`, `.n` `1`, `.units` `<span class="u needs"></span>`, `.note` `Stopped after 2 tries<sup class="fn">4</sup>` | ADD1, SB §4.2 multiple notes |
| board | 13 | `.ar-mul` stage 7 Shipped `.note` | `Done<sup class="fn">5</sup>` | `Done<sup class="fn">6</sup>` | ADD1 |
| board | 14 | `.ar-sec` 03 `.hd .r` | `share of 6 cards` | `share of 7 cards` | ADD1 |
| board | 15 | `.ar-share` | aria `3 waiting on you, 2 queued and blocked, 1 done`; `<b>3</b>waiting on you`; columns `3fr 2fr 1fr` | aria `4 waiting on you, 2 queued and blocked, 1 done`; `<b>4</b>waiting on you`; inline `style="grid-template-columns: 4fr 2fr 1fr"` | ADD1, SB §4.2 ShareBar |
| board | 16 | Table caption | `6 cards, people needed first` | `7 cards, people needed first` | ADD1 |
| board | 17 | Table, new row after row 03 | — | `<tr>` with these cells:<br>• `ix` `04`.<br>• Card: `.ttl` `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` (aria `…, in Reproduce. Enter to open, M to move, Alt with left or right arrow to move between stages.`) + `<sup class="fn">4</sup>` + `.ar-facts` `<span class="p">P3</span><span>AgentPod v0.1.91 Matrix inbound bridge contract</span><span>[super-chotu face 14 as drawn]asked by super-chotu</span>`.<br>• Stage: `<span class="chip c2"></span>Reproduce` + ramp aria `Stage 2 of 7: Reproduce, stopped. Stages: Reported, Reproduce, Failing test, Fix, Integrate, Signed off, Shipped` (`c1 on`, `c2 on`).<br>• Agent: error-eric face 20 (needs) + `error-eric`.<br>• Tries: `<span class="m"><span class="m sig">2</span></span>`.<br>• Age: `<span class="m">2d</span>`.<br>• Due: `—`.<br>• State: `<span class="ar-st needs"><span class="u needs"></span>Waiting on you</span>`.<br>• Move: `.bd-move` `Move` (aria `Move Diagnose Melissa and Anna Supermessage silence — trace actual failing hop to another stage`). | ADD1, SB §4.2 table |
| board | 18 | Table rows f83f / 481f / 9ed9: `ix` and `fn` | `04` fn 4 / `05` fn 4 / `06` fn 5 | `05` fn 5 / `06` fn 5 / `07` fn 6 | ADD1 |
| board | 19 | Row 1dfc (row 03) `.ar-facts` | `<span class="p">P2</span><span>test(api): pin manual delivery reminder</span>` | `<span>test(api): pin manual delivery reminder</span>` | F C-01 |
| board | 20 | Row 481f, Age | `<span class="m">—</span>` | `<span class="m">33h</span>` | F C-10, SB G9 |
| board | 21 | Row 9ed9, Tries | `<span class="m">0</span>` | `<span class="m">15</span>` | F §A.5.2, SB G9 |
| board | 22 | `.ar-notes` note 3 | `Card 03 stopped in Fix after five tries; coder-kai’s handoff was missing a commit, twice.` | `Card 03 stopped in Fix after five tries: missing commit ×2.` | SB G7 |
| board | 23 | `.ar-notes`, new note 4 after note 3 | — | `<li><span class="k">4</span><span>Card 04 stopped in Reproduce after two tries: no fresh DM event to trace; needs one per agent.</span></li>` | ADD1, SB §4.2 notes (blocked, attempts>1) |
| board | 24 | `.ar-notes`, old notes 4–6 | `4` `Cards 04 and 05 are queued in Failing test behind another card. …` / `5` `Shipped, nothing to do: …` / `6` `No card has spent anything yet: …` | `5` `Cards 05 and 06 are queued in Failing test behind another card. Nobody has claimed them; each starts on its own when unblocked.` / `6` (same text) / `7` (same text) | ADD1 |
| board | 25 | `.bd-panel` header | `Needs you now · 3` / `Three cards are waiting for a decision` | `Needs you now · 4` / `Four cards are waiting for a decision` | ADD1 |
| board | 26 | `.bd-panel`, new `article.bd-need` after nd-03 (before `.bd-keys`) | — | Contents:<br>• `.row`: `04`, kick `Waiting on you`, `.age` `2d`.<br>• h3 `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`.<br>• `.by`: error-eric face 20 (needs) `<b>error-eric</b>`, chip `c2` `Reproduce`, `2/7`.<br>• serif p `Stopped. No fresh DM event to trace; needs one per agent.`<br>• `.acts`: `.ar-btn` `Read why and resume`. | ADD1, SB §4.2 panel |
| board | 27 | `footer.ar-status` | `6 cards` · `3 need you` · `2 blocked` · `1 shipped` · `synced 13:19` | `7 cards` · `4 need you` (`.sig`) · `2 blocked` · `1 shipped` · `synced 13:51` | ADD1, ONE-WORLD R1, SB G6 |

### SP-Board-Quiet.dc.html (Agent Onboarding; only the shell count derives from DX)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| board | 1 | `.qn-links` Operate | `<a href="#operate">Operate</a>` | `<a href="#operate">Operate <span class="qn-need">(4 need you)</span></a>` | ADD1, SB G4 |
| board | 2 | Stages table, Credentialed "Who works it" | `a person · approval` | `a person` | SB §4.3 stages-table rule |
| board | 3 | Stages table, Resident Gate | `—` | `Approval gate` | F C-13, SB G9 |

### SP-Board-Empty.dc.html (shared; `vibe` prop daylight / paper / studio / quiet)

The whole `vs-*` shell is replaced (BRIEF R4). These rows record the data errors in the current branches. The `em-*` content matches the world in all four branches.

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| board | 1 | (prop vibe=daylight) `.vs-atwork` | two faces + `2 at work`, title `research-ray and tester-tim are working now` | (remove: no `.dy-crew` on Production Releases) | F C-07, SB §1.3.3 |
| board | 2 | (prop vibe=daylight) Operate `.vs-bubble` + `.vs-sr` | `3` / `, 3 need you` | `.dy-count` `4` / sr `, 4 need you` | ADD1, SB G4 |
| board | 3 | (prop vibe=daylight) CSS line 59 `.vs-bubble` | `background: var(--vk-color-signal); color: var(--vk-color-surface);` | `.dy-count`: `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| board | 4 | (prop vibe=daylight) Appearance title | `Appearance · noon` | `Appearance · the sky follows the time of day` | SB §1.3.1, G1 |
| board | 5 | (prop vibe=daylight) separate rail button `Dark theme` | rail icon button | (remove; `Dark theme` moves into the account menu as a `menuitemcheckbox`) | SB §1.2, G1 |
| board | 6 | (prop vibe=daylight) account menu `<p>` | `Rakesh Gangwar` | `<b>Rakesh Gangwar</b>Signed in` | SB §1.3.1 |
| board | 7 | (prop vibe=daylight) switcher aria-label | `Board: Production Releases. Switch board` | (no aria-label; `.dy-switch` text `Production Releases` + chev) | SB §1.3.1 |
| board | 8 | (prop vibe=paper) Operate | `(3)` + sr `, 3 need you` | `<span class="n">(4)</span>` + sr ` need you` | ADD1, SB §1.4 |
| board | 9 | (prop vibe=paper) Live placement | `.vs-mlive` `Live`, in the edition row | `.mh-live` `Live · changes appear as they happen`, in the sections row | SB §1.4, G1 |
| board | 10 | (prop vibe=paper) title | `<h2>Production Releases</h2>` | `<h1 class="mh-title">Production Releases</h1>` | SB §1.4 |
| board | 11 | (prop vibe=paper) account menu | `Sign out` only | `<p>Signed in as Rakesh Gangwar</p>` + `Sign out` | SB §1.4 |
| board | 12 | (prop vibe=studio) Operate aria-label / count / tip | `Operate, 3 need you` / `3` / `Operate` | `Operate, 4 need you` / `.ct` `4` / `Operate · 4 need you` | ADD1, SB §1.5.2 |
| board | 13 | (prop vibe=studio) CSS line 181 `.vs-scount` | `background: var(--vk-color-signal); color: var(--vk-face-ink);` | `.ar-nav .ct`: `background: var(--sig-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| board | 14 | (prop vibe=studio) crumb | `Superpipeline / Production Releases` | kick `Superpipeline · board` + `.ar-sw` `Production Releases` | SB §1.5.2, G1 |
| board | 15 | (prop vibe=studio) tabs | `List <span class="n">0</span>` · `Projects <span class="n">5</span>` | `List <span class="mono">0</span>` · `Projects <span class="mono">0</span>` | SB §6, G1, G12 |
| board | 16 | (prop vibe=studio) Live | `● LIVE` | `.ar-live` square + `Live` | SB §1.2 |
| board | 17 | (prop vibe=studio) account | `span.vs-sme` `RG` | `button.ar-acct` `RG`, tip `Rakesh Gangwar` | SB §1.5.2 |
| board | 18 | (prop vibe=studio) status footer | `Production Releases` · `0 cards` · `<b>3 need you</b>` · `synced 13:51` | `.ar-status`: `Production Releases` · `0 cards` · `4 need you` (`.sig`) · `synced 13:51`; right side empty | ADD1, SB §6 |
| board | 19 | (prop vibe=quiet) Operate | `Operate (3 need you)` | `Operate <span class="qn-need">(4 need you)</span>` | ADD1, SB G4 |
| board | 20 | (prop vibe=quiet) live | `Live: changes appear as they happen` | `<b>Live.</b> Changes appear as they happen.` | SB §1.6 |
| board | 21 | (prop vibe=quiet) New card | `.vs-qbtn.primary` (filled) | `.qn-btn` `New card` (outline) | SB §1.6, G1 |
| board | 22 | (prop vibe=quiet) Search | `Search` | `Search ⌘K` | SB §1.6 |
| board | 23 | (prop vibe=quiet) note | `No cards on this board` on its own line | `.qn-note` inside the second `.qn-row` | SB §1.6, G1 |
| board | 24 | (prop vibe=quiet) board label | `Board: Production Releases — Change board` | `Board: <b>Production Releases</b> — Change board` | SB §1.6 |

#### Per-vibe shell values (SP-Board-Empty)

| vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|
| Daylight | plan | board | Production Releases | board | `No cards on this board` | Operate `.dy-count` `4` (sr `, 4 need you`); crew hidden; `Filter cards` `none on`; segmented Board / List / Projects with Board pressed; `Live`; `Search` `⌘K`; `New card` |
| Paper | plan | board | Production Releases | board | paperShowing `No cards on this board` | dateline `Sunday 11 October · in full daylight`; Operate `(4)`; `Appearance` · `Dark theme` · `Rakesh Gangwar ⌄`; `Change board`; `Filter cards · none on`; `Search ⌘K`; `Write a new card` |
| Studio | plan | board | Production Releases | board | `No cards on this board` | kick `Superpipeline · board`; tabs `Board` · `List 0` · `Projects 0`; `Filter cards none on`; sub-right `The board at 13:51 · midday · Sunday 11 October` (§1.5 formula); status `Production Releases` · `0 cards` · `4 need you` (sig) · `synced 13:51`, right side `[]`; `.ct` `4`, tip `Operate · 4 need you` |
| Quiet | plan | board | Production Releases | board | `No cards on this board` | `Operate (4 need you)`; `Board: Production Releases — Change board`; `Live. Changes appear as they happen.`; `Search ⌘K`; `New card`; `View: Board · List · Projects`; `Filter cards (none on)` |

---

## Group `phone-boards`

Revised per ADDENDUM.md. Card 4605 is now **live and stopped**: a 7th Developer Experience card in Reproduce that needs you. The board now has 7 cards, 4 need you, Reproduce holds 1 card, there are 2 empty stages, and the Operate count is 4. The face-mood rows are gone (there were none in this group). The Quiet 481f "No priority" row from the first pass is dropped, because no spec rules it and no other screen disagrees.

Checked: the visible text of the EXPORT files and the `.dc.html` sources, against fixtures-and-harness Part A, shell-and-board §1.7, §2, §5, §8, and the ADDENDUM. The only prop is `theme`, and there are no `sc-if` branches.

Already right, so no rows: ages (33h / 2d / 1d), titles, attempts (58f8 = 1, 1dfc = 5, 9ed9 = 15) and the absence of a priority on 1dfc (C-01 is already fixed). The straight apostrophe in "Tim's" with curly quote marks, the +1 label overflow and the owner short forms are also right. No raw hex, danger or outcome colours appear, and there are no destructive buttons. The face `rgb()` fills are generator features.

**4605 values used in the rows below** (F§A.5.2 / §A.5.4 / §A.5.6 with ADDENDUM 1). The phone renders the detail with sentenceCase (F C-06):
- Title T4 = `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`
- Stage: Reproduce (stage 2 of 7). Age from `state_since` 2026-10-08T14:11:45Z (66h): `2d` / `2 days` / `2 days ago`.
- Priority 3. Queued by super-chotu. Last agent error-eric. Attempt 2. Cost $0.00. No labels, no due date, no blockers.
- First reference (oldest `created_at`, snapshot) R4 = `AgentPod v0.1.91 Matrix inbound bridge contract`
- D4 (the full detail, sentence-cased) = `Not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.`
- S4 (the first sentence of D4, cut at the first ". " at index ≥ 40) = `Not reproduced end-to-end: … for those event IDs.`, i.e. D4 up to and including `for those event IDs.`
- Rem4 (the remainder) = `No Accounts defect established; no issue filed.`
- Face F4 = the vibekit face for `error-eric` at the size the vibe uses for the other needs faces, `data-mood="needs"`, `aria-label="error-eric, needs you"`. It is the same generator output as the error-eric face already on the Daylight crew, drawn in the needs mood.
- Ordering: the wants/needs order is stopped cards first, oldest first, then the no-owner card (SB §5.1, §5.4). So the order is 4605 (66h), 58f8, 1dfc, 63ac. Every 4605 insertion goes **before** the 58f8 item.

### SP-Phone-Board-Daylight.dc.html
| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| phone-board | 1 | 1dfc tile `.meta` (line 182) | `<span class="chip"><svg … aria-label="super-chotu, resting" …/> asked by super-chotu</span><span>$0.00</span><span>attempt 5</span>` | `<span>$0.00</span><span>attempt 5</span>` | `F C-17`, `SB G9` (desktop boards and the phones disagree; the existing resolution is kept) |
| phone-board | 2 | `.nav .cnt` CSS (line 48) | `background:var(--vk-color-signal);color:var(--vk-color-primary-fg)` | `background:var(--vk-color-signal-text);color:var(--vk-color-primary-fg)` | `VK §3.5` |
| phone-board | 3 | `.nav` Operate count | `<span class="cnt" aria-hidden="true">3</span><span class="sr">, 3 need you</span>` | `<span class="cnt" aria-hidden="true">4</span><span class="sr">, 4 need you</span>` | `ADD 1` (workspace attention 4) |
| phone-board | 4 | `.pd-hello p` | `<strong>3 cards want you.</strong> Two agents stopped and one card waits in a person's stage.` | `<strong>4 cards want you.</strong> Three agents stopped and one card waits in a person's stage.` | `ADD 1`, `SB §5.1` |
| phone-board | 5 | `.crew` 3rd face (`aria-label="error-eric, resting"`, `data-mood="resting"`, fill `var(--vk-mood-resting)`, closed eyes) | error-eric resting | error-eric face `aria-label="error-eric, needs you"`, `data-mood="needs"`, fill `var(--vk-mood-needs)`, needs eyes (generator) | `ADD 1` (error-eric is 4605's last agent, so `needs` by data, not a G5 mood rule) |
| phone-board | 6 | `.crew small` | `tester-tim and coder-kai need you` | `tester-tim, coder-kai and error-eric need you` | `ADD 1`, `SB §5.1` |
| phone-board | 7 | `nav.step` first chip | `Needs you <b>3</b>` | `Needs you <b>4</b>` | `ADD 1` |
| phone-board | 8 | `nav.step` Reproduce chip (line 143) | `<a href="#empty" class="empty">Reproduce <b>0</b></a>` | `<a href="#stage-reproduce">Reproduce <b>1</b></a>` | `ADD 1`, `SB §5.1` |
| phone-board | 9 | `nav.step` hrefs and lane `id`s | `#reported` / `#failing` / `#fix` / `#shipped`; `id="reported"` / `id="failing"` / `id="fix"` / `id="shipped"` | `#stage-reported` / `#stage-test` / `#stage-fix` / `#stage-shipped`; ids `stage-reported` / `stage-test` / `stage-fix` / `stage-shipped` | `SB §5.1` (`#stage-{key}`), `F D13` |
| phone-board | 10 | wants `h2#h-wants` + p | `Needs you <span class="n">3</span>` / `From three stages, most urgent first.` | `Needs you <span class="n">4</span>` / `From four stages, most urgent first.` | `ADD 1`, `SB §5.1` |
| phone-board | 11 | wants lane, insert a new tile **before** the 58f8 tile | — | `<article class="tile"><span class="sr">Priority 3</span><div class="trow"><span class="stg">Reproduce · stage 2 of 7 · 2d</span><button class="mv" type="button" aria-haspopup="menu" aria-label="Move card to another stage">[move icon]Move</button></div><h3><button class="tt" type="button" aria-label="T4. In Reproduce. Enter opens, M moves.">T4</button></h3><div class="bub">F4 (24px)<div class="say"><span class="who">error-eric · needs you</span><p>D4</p><button type="button" aria-expanded="false">Read the rest</button></div></div><div class="chips"><a class="chip ref" href="#ref">[doc icon]R4</a></div><div class="meta"><span class="chip">[super-chotu face 16, resting] asked by super-chotu</span><span>$0.00</span><span>attempt 2</span></div><div class="act"><button class="btn go" type="button">Resume</button></div></article>` (no `.p1`/`.p2` stripe for P3) | `ADD 1` (pattern = the 58f8 tile) |
| phone-board | 12 | After the Reported lane + `.sep`, insert a Reproduce lane | — | `<section class="lane" id="stage-reproduce" aria-labelledby="h-repro"><div class="lh"><h2 id="h-repro">Reproduce <span class="n">1</span></h2><p>diagnostics · error-eric</p></div><p class="note">1 card, waiting on you above.</p></section><div class="sep"></div>` | `ADD 1`, `SB §5.1` (`.note` n=1) |
| phone-board | 13 | `.empties` h2 + list | `Empty stages · 3`; `<li><b>Reproduce</b> · diagnostics · error-eric</li>` | `Empty stages · 2`; delete the Reproduce `<li>` (Integrate and Signed off remain) | `ADD 1` |

Keep: the 1dfc bubble "This stage was not finished twice — … commit." (`F C-06`).

### SP-Phone-Board-Paper.dc.html
| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-board | 1 | 1dfc `.facts` (line 122) | `<span>asked by super-chotu</span><span>$0.00</span><span class="ref">test(api): pin manual delivery reminder</span>` | `<span>$0.00</span><span class="ref">test(api): pin manual delivery reminder</span>` | `F C-17`, `SB G9` |
| phone-board | 2 | `.pm-date` (line 97) | `Sunday 11 October · in full daylight · 6 cards` | `Sunday 11 October · in full daylight · 7 cards` | `ADD 1` (editionCount) |
| phone-board | 3 | `h2#h-wait` (line 107) | `Waiting on you · 3 letters` | `Waiting on you · 4 letters` | `ADD 1` |
| phone-board | 4 | Insert a new letter **before** the 58f8 letter (line 109) | — | `<article class="letter"><h3><button class="lt" type="button" aria-label="T4. In Reproduce. Enter opens, M moves.">T4</button></h3><p class="q">“D4”</p><button class="rest" type="button" aria-expanded="false">Read the rest</button><p class="sig-line"><span class="portrait">F4 (24px)</span><em>error-eric</em> · Reproduce · 2 days ago · attempt 2</p><p class="facts"><span>P3</span><span>asked by super-chotu</span><span>$0.00</span><span class="ref">R4</span></p><div class="acts"><button class="pb pri" type="button">Resume</button><button class="mvb" type="button" aria-haspopup="menu">[move icon]Move</button></div></article>` | `ADD 1`, `SB §5.2` |
| phone-board | 5 | The pipeline, Reproduce `li` (line 171) | `<b>Reproduce</b> · empty · diagnostics · error-eric` | `<b>Reproduce</b> · 1 · diagnostics · error-eric` | `ADD 1` |
| phone-board | 6 | Nav Operate count | `Operate <span class="n">(3)</span>` | `Operate <span class="n">(4)</span>` | `ADD 1` |

Keep: the 1dfc `.q` sentence-cased (`F C-06`), and the "(n)" signal-text words (VK §3.5 exemption).

### SP-Phone-Board-Studio.dc.html
| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-board | 1 | `.pb-hero .kick` (line 291) | `13:31 · midday` | `13:51 · midday` | `ONE-WORLD R1`, `SB G6` |
| phone-board | 2 | `.pb-hero .big` + h1 (line 291) | `3` / `<span class="sr">3 </span>of 6 cards are waiting on a person` | `4` / `<span class="sr">4 </span>of 7 cards are waiting on a person` | `ADD 1` |
| phone-board | 3 | `.pb-lede` (line 292) | `Two stopped and need resuming; one sits in your own stage and is five days overdue. Two are queued behind a blocker; one has shipped.` | `Three stopped and need resuming; one sits in your own stage and is five days overdue. Two are queued behind a blocker; one has shipped.` | `ADD 1`, `SB §5.3` phoneLede |
| phone-board | 4 | `.pb-qf` (line 294) | `All <b>6</b>` … `Needs <b>3</b>` | `All <b>7</b>` … `Needs <b>4</b>` (Working 0, Idle 2, Done 1 unchanged) | `ADD 1` |
| phone-board | 5 | `.pb-sub` view tabs | `List <span class="mono">6</span>` | `List <span class="mono">7</span>` (Projects 3 unchanged) | `ADD 1` |
| phone-board | 6 | 01 multiples, stage 2 (line 307) | `<a class="z" href="#stage-2" aria-label="Stage 2, Reproduce: 0 cards">…<span class="n" aria-hidden="true">0</span><span class="units" aria-hidden="true"></span></a>` | `<a class="" href="#stage-2" aria-label="Stage 2, Reproduce: 1 card">…<span class="n" aria-hidden="true">1</span><span class="units" aria-hidden="true"><span class="u needs"></span></span></a>` | `ADD 1` |
| phone-board | 7 | 02 header `.r` (line 312) | `6 rows` | `7 rows` | `ADD 1` |
| phone-board | 8 | 02 list, insert a new `article.pb-card` **before** the 58f8 card (line 315) | — | `<article class="pb-card"><div class="rl needs"><span class="ix">01</span><span class="u needs" aria-hidden="true"></span><span>Needs you · stopped</span><span class="age">2d</span></div><h3><button class="ttl" type="button" aria-label="T4. In Reproduce. Enter opens, M moves.">T4</button></h3><p class="ar-facts"><span class="p">P3</span><span>R4</span><span>asked by super-chotu</span></p><div class="stg"><span class="chip c2"></span><span>Reproduce</span><span class="ar-ramp" aria-hidden="true"><i class="c1 on"></i><i class="c2 on"></i><i class="c3"></i><i class="c4"></i><i class="c5"></i><i class="c6"></i><i class="c7"></i></span><span class="mono muted" style="font-size: 12px">2/7</span></div><dl><div><dt>Agent</dt><dd>F4 (18px)error-eric</dd></div><div><dt>Tries</dt><dd><span class="sigt">2</span></dd></div><div><dt>Cost</dt><dd>$0.00</dd></div><div><dt>Due</dt><dd>—</dd></div></dl><div class="nx"><p class="">S4</p><button class="ar-btn" type="button">Resume</button><button class="ph-ib b" type="button" aria-haspopup="menu" aria-label="Move card">[move 16]</button></div></article>` | `ADD 1`, `SB §5.3`, `SB G3` (no 4605 summary, so the fallback is the first sentence) |
| phone-board | 9 | `.ix` of the existing rows | `01` `02` `03` `04` `05` `06` | `02` `03` `04` `05` `06` `07` | `ADD 1` |
| phone-board | 10 | 1dfc row `.ar-facts` | `<span>test(api): pin manual delivery reminder</span><span>asked by super-chotu</span>` | `<span>test(api): pin manual delivery reminder</span>` | `F C-17`, `SB G9` |
| phone-board | 11 | 58f8 row `.nx p` (line 321) | `Forge mirror is read-only; push refused. Needs a writable repository URL and station write access.` | `Needs a writable Forge URL for agentpod.` | `SB G3` (the Board-Studio desktop and the phone disagree; the desktop string is canonical), W1 |
| phone-board | 12 | 1dfc row `.nx p` (line 329) | `Handoff missing a commit, twice (after one automatic rework).` | `Missing commit ×2.` | `SB G3`, W2 |
| phone-board | 13 | 03 stages, Reproduce `li` (line 370) | `<b>2 Reproduce</b><span class="c">0</span><span class="o">diagnostics · error-eric · empty</span>` | `<b>2 Reproduce</b><span class="c">1</span><span class="o">diagnostics · error-eric</span>` | `ADD 1` |
| phone-board | 14 | Phone tab bar count | `<span class="cnt" aria-hidden="true">3</span>` … `<span class="sr">, 3 need you</span>` | `<span class="cnt" aria-hidden="true">4</span>` … `<span class="sr">, 4 need you</span>` | `ADD 1` |
| phone-board | 15 | `.ph-nav .cnt` CSS (line 215) | `background: var(--sig); color: var(--sig-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | `VK §3.5` |
| phone-board | 16 | `.ar-nav .ct` CSS (line 71, shared, not drawn) | `background: var(--sig); color: var(--sig-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | `VK §3.5` |

Unchanged: "Overdue 1", "7 stages · 2 blocked", "Stages · 7, who works each / 2 blocked · show", the large figures and `.u` squares on `--sig`, and the kick "Superpipeline · board".

### SP-Phone-Board-Quiet.dc.html
| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-board | 1 | Header `.muted` (line 86) | `Superpipeline · 6 cards · 3 need your decision` | `Superpipeline · 7 cards · 4 need your decision` | `ADD 1` |
| phone-board | 2 | `h2#g1` (line 91) | `Needs your decision (3)` | `Needs your decision (4)` | `ADD 1` |
| phone-board | 3 | Insert a new item **before** the 58f8 item (line 93) | — | `<article class="it nd"><div class="tr"><h3 style="flex: 1; min-width: 0; display: flex"><button class="tt" type="button" aria-label="T4. In Reproduce. Enter opens, M moves.">T4</button></h3><button class="mvb" type="button" aria-haspopup="menu">Move</button></div><p class="mt"><span class="face">F4 (20px)</span>error-eric · Reproduce · 2 days · attempt 2</p><p class="rs">Stopped. S4</p><details class="full"><summary>Show the full reason</summary><p>Rem4</p></details><p class="fs">Priority 3 · asked by super-chotu · $0.00 · R4</p><a class="ac" href="#card">Decide</a></article>` | `ADD 1`, `SB §5.4` |
| phone-board | 4 | 1dfc `.rs` | `Stopped after two refused handoffs: this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.` | `Stopped. This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.` | `SB G10` / §5.4, `F C-06` |
| phone-board | 5 | 1dfc `.fs` | `No priority · asked by super-chotu · $0.00 · test(api): pin manual delivery reminder` | `No priority · $0.00 · test(api): pin manual delivery reminder` | `F C-17`, `SB G9` |
| phone-board | 6 | Stages table, row 2 (line 161) | `<th scope="row">2. Reproduce</th><td class="n">empty</td><td>diagnostics: error-eric</td>` | `<th scope="row">2. Reproduce</th><td class="n">1</td><td>diagnostics: error-eric</td>` | `ADD 1` |
| phone-board | 7 | Nav Operate count | `Operate&#160;<span class="need">(3)</span>` | `Operate&#160;<span class="need">(4)</span>` | `ADD 1` |

### Shell values (per-vibe artboards; check only)
| vibe | here | section | boardName | view | showing / edition | other per-vibe shell text |
|---|---|---|---|---|---|---|
| Daylight | plan | board | Developer Experience | board | — | Live pill; tab count 4 + sr ", 4 need you"; You "RG" + sr ", Rakesh Gangwar" |
| Paper | plan | board | Developer Experience | board | `Sunday 11 October · in full daylight · 7 cards` | "Operate (4)" + sr " need you" |
| Studio | plan | board | Developer Experience | board | — | kick "Superpipeline · board"; tabs "List 7", "Projects 3"; tab count 4 |
| Quiet | plan | board | Developer Experience | board | page header "Superpipeline · 7 cards · 4 need your decision" | "Board: Developer Experience — Change board"; "Operate (4)" + sr " need you" |

## Group `list-operate`

Artboards: SP-List-Daylight, SP-List-Paper, SP-List-Studio, SP-List-Quiet, SP-Operate-Daylight, SP-Operate-Paper, SP-Operate-Studio, SP-Operate-Quiet.

The only prop on these eight artboards is `theme`, so there are no "(prop x=y)" rows.
- Colour grep: 0 hex literals, 0 `danger`, 0 destructive buttons. The only `rgb()` values are inside the face SVGs.
- Badges: only `.dy-count` and the Studio `.ar-nav .ct` are count badges on signal. The rest are text counts and stay as drawn.
- Face-mood rows (G5) are deleted, per ADDENDUM 3. Faces stay as drawn.

### Shorthand used in the rows (exact values)
- **T5** = `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`. This is the 4605 title, verbatim.
- **D5** = the 4605 detail, verbatim from F §A.5.2, lower-case start, with the curly `’` in "Melissa’s":
  `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.`
  It is 505 characters, so it gets the Show-all toggle and the Studio clamp.
- **C5** = the first 140 characters of D5, trimmed, plus `…`:
  `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…`
- **4605 derived values:**
  - stage Reproduce (`c2`, owner `diagnostics · error-eric`);
  - P3, asked by super-chotu, no labels, not blocked, no due date, cost —;
  - agent error-eric (needs you), attempts 2;
  - age `2d` / `2 days`, from state_since Thu 8 Oct 14:11:45Z.
- **Counts:**
  - live cards 7;
  - attention items 4 (63ac no owner; 4605, 58f8 and 1dfc stopped), so the Operate count is 4 everywhere;
  - List needs count 4 (the OL formula, see conflicts);
  - Studio quick filter All 7 · Needs 4 · Working 0 · Idle 2 · Done 1;
  - unread 19 (16 + the three 4605 notifications in World additions).
- **Daylight crew:** `4 agents` / `3 wait on you`.
  - Faces (`crew.slice(0,3)`): tester-tim, coder-kai, error-eric (needs). super-chotu is counted but not drawn.
  - Title: `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work`.

---

### SP-List-Daylight.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | CSS `.dy-count` | `background: var(--vk-color-signal); color: var(--vk-color-primary-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| list-operate | 2 | Rail Operate count | `<span class="dy-count" aria-hidden="true">3</span><span class="vk-visually-hidden">, 3 need you</span>` | `<span class="dy-count" aria-hidden="true">4</span><span class="vk-visually-hidden">, 4 need you</span>` | ADDENDUM 1, SB G4 |
| list-operate | 3 | `.dy-crew` title | `tester-tim and coder-kai wait on you; super-chotu queues the work` | `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` | ADDENDUM 1, SB §1.3.3 |
| list-operate | 4 | `.dy-crew` text | `<b>3 agents</b>2 wait on you` | `<b>4 agents</b>3 wait on you` | ADDENDUM 1 |
| list-operate | 5 | `.dy-faces` third face (super-chotu, working) | super-chotu working face | error-eric face, `data-mood="needs"`, 20px. The first two faces are unchanged. | ADDENDUM 1, SB §1.3.3 |
| list-operate | 6 | `.dy-switch` | `aria-haspopup="listbox"` | `aria-haspopup="menu"` | SB §1.3.1, G1 |
| list-operate | 7 | `.dy-live` title | `title="Live updates are on"` | `title="Live: changes arrive as they happen"` | SB §1.3.1 |
| list-operate | 8 | `.dy-live` sr text | `, updates are on` | ` · changes appear as they happen` | SB §1.3.1 |
| list-operate | 9 | `.dy-search` aria-label | `Search, Command K` | `Search cards, agents and actions` | SB §1.3.1 |
| list-operate | 10 | `.dy-filter` | `Filter<span class="vk-visually-hidden">, no filters on</span>` | `Filter cards <span class="cnt">none on</span>` | SB §1.2 |
| list-operate | 11 | `.dy-sub` note (missing) | (none) | add `<span class="dy-note">Showing all 7 cards</span>` after `.sum` | SB §1.2, §2, ADDENDUM 1 |
| list-operate | 12 | `.sum` | `6 cards · 2 wait on you · sorted by priority` | `7 cards · 4 wait on you · sorted by priority` | OL LI-G1, ADDENDUM 1 |
| list-operate | 13 | Blocker row State cell | `<span class="vk-pill vk-pill--resting">Queued</span>` | `<span class="vk-pill vk-pill--needs">Waiting on you</span>` | OL LI-G1 |
| list-operate | 14 | New `<tbody>` between Reported and Failing test | (none) | `<tbody><tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">Reproduce</span><span class="g__n">1</span><span class="g__own">diagnostics · error-eric</span></th></tr>` plus one `tr.r`. Cells: `<span class="pri pri--3">P3</span>`; `<a class="ttl" href="#card">`T5`</a><div class="facts"><span class="asked">`[16px super-chotu face, as drawn on the other rows]`asked by super-chotu</span></div>`; `<span class="vk-pill vk-pill--needs">Waiting on you</span>`; `<div class="who">`[error-eric face 24, needs]`<span><b>error-eric</b><small>needs you</small></span></div>`; `<span class="muted">—</span>`; `<span class="muted" aria-label="No cost yet">—</span>`; acts `Open` / `Move` (menu closed). | ADDENDUM 1 |

### SP-List-Paper.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | `.mh-sec` Operate count | `<span class="n">(3)</span>` | `<span class="n">(4)</span>` | ADDENDUM 1 |
| list-operate | 2 | `.mh-showing` | `Showing all 6 cards` | `Showing all 7 cards · 4 wait on you · 1 shipped` | SB §1.2 paperShowing, ADDENDUM 1 |
| list-operate | 3 | `.mast__line` | `Developer Experience, six cards. Two wait on you.` | `Developer Experience, seven cards. Four wait on you.` | OL LI-G1, ADDENDUM 1 |
| list-operate | 4 | Blocker row State cell | `<span class="state">Queued</span>` | `<span class="state state--needs">Waiting on you</span>` | OL LI-G1 |
| list-operate | 5 | New `<tbody>` after Reported | (none) | `<tr class="g"><th colspan="7" scope="colgroup"><span class="g__name">Reproduce</span><span class="g__n">— one card</span><span class="g__own">diagnostics · error-eric</span></th></tr>` plus a row: `<span class="pri pri--3">P3</span>`; `<a class="ttl">`T5`</a><div class="facts">`[asked span as on the AgentPod row]`</div>`; `<span class="state state--needs">Waiting on you</span>`; `<div class="who">`[face 24 needs]`error-eric</div>`; `<span class="muted">—</span>`; `—` cost; `Open` / `Move…` | ADDENDUM 1 |
| list-operate | 6 | Editorial row `.facts` | `Blocked by another card · ` | `Blocked by three other cards · ` | F §A.5.3. Board artboards print "Blocked by 3 cards", so the screens disagree. |
| list-operate | 7 | `p.foot` | `Sorted by priority, highest first. Stages with no cards are left out: Reproduce, Integrate and Signed off.` | `Sorted by priority, highest first. Stages with no cards are left out: Integrate and Signed off.` | ADDENDUM 1 |
| list-operate | 8 | Every Move button (×7) | `aria-haspopup="menu" aria-expanded="false"` | `aria-haspopup="dialog"` | OL LI-G7 |

### SP-List-Studio.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | CSS `.ar-nav .ct` | `background: var(--sig); color: var(--sig-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| list-operate | 2 | Rail Operate | `aria-label="Operate, 3 need you"`, `.ct` `3`, tip `Operate · 3 need you` | `aria-label="Operate, 4 need you"`, `.ct` `4`, tip `Operate · 4 need you` | ADDENDUM 1 |
| list-operate | 3 | `.ar-tab` List count | `List <span class="mono">6</span>` | `List <span class="mono">7</span>` (Projects stays `3`) | ADDENDUM 1 |
| list-operate | 4 | `.ar-sub .ar-hint` | `Showing all 6 cards` | `Showing all 7 cards` | ADDENDUM 1 |
| list-operate | 5 | `.ar-sub > .r` | `13:19 · midday · Sunday 11 October` | `The board at 13:51 · midday · Sunday 11 October` | SB G6, §1.5.3 |
| list-operate | 6 | `footer.ar-status` | `<span>6 cards</span><span class="sig">3 need you</span><span>synced 13:19</span>` | `<span>7 cards</span><span class="sig">4 need you</span><span>2 blocked</span><span>1 shipped</span><span>synced 13:51</span>` | SB G6, §4.2/§2, ADDENDUM 1 |
| list-operate | 7 | Quick filter | `All <span class="n">6</span>` … `Needs <span class="n">3</span>` | `All <span class="n">7</span>` … `Needs <span class="n">4</span>` (Working 0, Idle 2, Done 1 unchanged) | ADDENDUM 1, OL quickCounts |
| list-operate | 8 | Hero `.big` | `6` | `7` | ADDENDUM 1 |
| list-operate | 9 | Hero h1 | `<span class="sr">6 </span>cards sit in 4 of the board’s 7 stages` | `<span class="sr">7 </span>cards sit in 5 of the board’s 7 stages` | ADDENDUM 1 |
| list-operate | 10 | Hero p | `Sorted by priority, highest first. The three empty stages, Reproduce, Integrate and Signed off, are left out of the list.` | `Sorted by priority, highest first. The two empty stages, Integrate and Signed off, are left out of the list.` | ADDENDUM 1 |
| list-operate | 11 | Blocker row State cell | `<span class="ar-st"><span class="u queued"></span>Queued</span>` | `<span class="ar-st needs"><span class="u needs"></span>Waiting on you</span>` | OL LI-G1 |
| list-operate | 12 | New `<tbody>` after Reported | (none) | `<tr class="g"><th colspan="9" scope="colgroup"><span class="in"><span class="no">02</span><span class="band c2"></span><span class="nm">Reproduce</span><span class="ct">1</span><span class="own">diagnostics · error-eric</span></span></th></tr>` plus `<tr class="sel" aria-current="true">`. Cells: `<span class="ls-pri">P3</span>`; ttl T5 + `<div class="ar-facts"><span>`[14px face]`asked by super-chotu</span></div>`; `<span class="ar-st needs"><span class="u needs"></span>Waiting on you</span>`; `<span class="ag">`[face 20 needs]`error-eric</span>`; `<span class="m"><span class="sigt">2</span></span>`; `<span class="m">2d</span>`; `<span class="m">—</span>`; `<span class="m">—</span>`; acts `Open ↵` / `Move M` | ADDENDUM 1. Selection: the e2e presses J twice, which reaches row 2, now 4605. |
| list-operate | 13 | AgentPod row | `<tr class="sel" aria-current="true">` | `<tr>` (the selection moves to the 4605 row) | ADDENDUM 1, F §A.7.4 |
| list-operate | 14 | X connector row Age | `<span class="m">2d</span>` | `<span class="m">33h</span>` | F C-10 (Phone 33h vs List 2d) |
| list-operate | 15 | Shipped row Att | `<span class="m">0</span>` | `<span class="m">15</span>` | SB G9. The phone boards print "15 attempts", so the screens disagree. |
| list-operate | 16 | `.ls-foot` | `<span>6 cards</span><span>4 groups · 3 empty stages hidden</span>…<span>row 2 of 6</span>` | `<span>7 cards</span><span>5 groups · 2 empty stages hidden</span>…<span>row 2 of 7</span>` | ADDENDUM 1 |
| list-operate | 17 | Every Move button (×7) | `aria-haspopup="menu" aria-expanded="false"` | `aria-haspopup="dialog"` | OL LI-G7 |

### SP-List-Quiet.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | `.qn-need` | `(3 need you)` | `(4 need you)` | ADDENDUM 1 |
| list-operate | 2 | Change board | `aria-haspopup="listbox"` | `aria-haspopup="menu"` | SB §1.6 |
| list-operate | 3 | Search aria-label | `Search, Command K` | `Search cards, agents and actions` | SB §1.6 |
| list-operate | 4 | Second `.qn-row` after `.qn-view` (missing) | (none) | `<button class="qn-link" type="button" aria-haspopup="dialog">Filter cards (none on)</button><span class="qn-note">Showing all 7 cards</span>` | SB §1.2/§1.6 |
| list-operate | 5 | `p.lede` | `6 cards. 2 are waiting on you.` | `7 cards. 4 are waiting on you.` | OL LI-G1, ADDENDUM 1 |
| list-operate | 6 | Blocker row | `<tr>` … `<span>Queued</span>` | `<tr class="needs">` … `<span class="st--needs">Waiting on you, no owner</span>` | OL LI-G1 |
| list-operate | 7 | New group after the Reported table | (none) | `<h2>Reproduce (1)</h2><p class="own">Worked by diagnostics · error-eric.</p>` plus a table (caption `Reproduce`, same thead), with one `<tr class="needs">`: `P3`; `<a href="#card">`T5`</a><div class="facts">Asked for by super-chotu.</div>`; `<span class="st--needs">Waiting on you, stopped</span>`; `<div class="who">`[face 20 needs]`error-eric</div>`; `None`; `None`; `Open` / `Move` | ADDENDUM 1 |
| list-operate | 8 | Editorial row `.facts` | `Blocked by another card. Asked for by super-chotu.` | `Blocked by three other cards. Asked for by super-chotu.` | F §A.5.3 |
| list-operate | 9 | `p.empty` | `Stages with no cards are not shown: Reproduce, Integrate, Signed off.` | `Stages with no cards are not shown: Integrate, Signed off.` | ADDENDUM 1 |
| list-operate | 10 | Every Move button (×7) | `aria-haspopup="menu" aria-expanded="false"` | `aria-haspopup="dialog"` | OL LI-G7 |

### SP-Operate-Daylight.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | CSS `.dy-count` | `background: var(--vk-color-signal);` | `background: var(--vk-color-signal-text);` (color stays `--vk-color-primary-fg`) | VK §3.5 |
| list-operate | 2 | Rail count | `3` / `, 3 need you` | `4` / `, 4 need you` | ADDENDUM 1 |
| list-operate | 3 | `.dy-crew` title / text / third face | as List-Daylight #3–#5 | as List-Daylight #3–#5 | ADDENDUM 1 |
| list-operate | 4 | `.dy-switch`, `.dy-live` title and sr text, `.dy-search` | as List-Daylight #6–#9 | as List-Daylight #6–#9 | SB §1.3.1 |
| list-operate | 5 | Greeting h1 | `Good afternoon, Rakesh. 3 cards want you.` | `Good afternoon, Rakesh. 4 cards want you.` | ADDENDUM 1, OL content map |
| list-operate | 6 | Greeting p | `Two agents stopped and are waiting on you, and one card has nobody to pick it up. Nothing is running.` | `Three agents stopped and are waiting on you, and one card has nobody to pick it up. Nothing is running.` | ADDENDUM 1 |
| list-operate | 7 | `.crew[aria-label="Waiting on you"]` | `tester-tim`, `coder-kai` | `error-eric`, `tester-tim`, `coder-kai` (Face 44 needs, in row order) | ADDENDUM 1 |
| list-operate | 8 | Needs `span.count.count--needs` | `3` | `4` | ADDENDUM 1 |
| list-operate | 9 | New first `article.ask` (stage sort puts Reproduce first), copying the coder-kai article's markup | (none) | `aria-labelledby="t-error-eric"`; face 32 error-eric (needs); `<b>error-eric</b>` `<span>stopped in Reproduce · 2 days ago · attempt 2</span>` `<span class="badge badge--needs">Stopped</span>`; h3 link T5; `<div class="bubble"><p>`C5`</p><button class="bubble__more" type="button" aria-expanded="false">Show all</button></div>`; `<p class="hint">Fix what it says, then resume it with a note it will read.</p>`; acts `Resume` (play icon, `aria-expanded="false"`) / `Open card` / `Open log` | ADDENDUM 1, OL row anatomy |
| list-operate | 10 | AgentPod bubble, 58f8 detail | `"Mirror Repository SuperJackfruitLabs/agentpod is read-only"` | `“Mirror Repository SuperJackfruitLabs/agentpod is read-only”` | F C-05 (the Board artboards use curly quotes) |
| list-operate | 11 | Blocker `select#mv1` | three options | append `<option>Integrate · integration or api or testing, 3 agents</option>` | OL OP-G6 |
| list-operate | 12 | Activity count | `16 unread` | `19 unread` | ADDENDUM 1, World additions |
| list-operate | 13 | New `div.grp` between AgentPod (22:25) and the blocker (09:55), copying the AgentPod group's markup | (none) | face 24 error-eric; title T5; `.ev__t` `14:11 UTC`; body `Still stopped a day later in Reproduce.` + link `Why, in Needs you`; tick (Mark read); `Resume` (secondary, play icon) and `Earlier reminders` | ADDENDUM 1, World additions |

### SP-Operate-Paper.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | `.mh-sec .n` | `(3)` | `(4)` | ADDENDUM 1 |
| list-operate | 2 | Empty `.mh-tabs` | `<div class="mh-tabs" style="border-bottom-width: 1px; border-bottom-style: solid"></div>` | remove (`view` is null) | SB §1.4 |
| list-operate | 3 | `.mast__line` | `Sunday 11 October, in full daylight. Three letters wait for you; no one is at work.` | `Sunday 11 October, in full daylight. Four letters wait for you; no one is at work.` | ADDENDUM 1 |
| list-operate | 4 | `.mast__end` | `Developer Experience · 6 cards` | `Developer Experience · 7 cards` | ADDENDUM 1 |
| list-operate | 5 | Kick 1 count | `3 letters` | `4 letters` | ADDENDUM 1 |
| list-operate | 6 | New first `article.letter` (`l-error-eric`), copying the tester-tim letter's markup | (none) | meta `Stopped` · `Reproduce` · `2 days ago` · `attempt 2`; h3 T5; `<blockquote class="quote">“`C5`”<button class="more" type="button" style="margin-left: var(--vk-space-2)" aria-expanded="false">Show all</button></blockquote>`; sig face 28 + `— error-eric`; hint; acts `Resume` / `Open card` / `Open log` | ADDENDUM 1 |
| list-operate | 7 | Blocker `select#mvp` | three options | append `<option>Integrate · 3 agents</option>` | OL OP-G6 |
| list-operate | 8 | Kick 2 count | `16 unread` | `19 unread` | ADDENDUM 1 |
| list-operate | 9 | New `div.dig` between AgentPod and the blocker | (none) | h3 face 22 + T5 link; `<span class="dig__t">14:11</span> — still stopped a day later in Reproduce. <a class="lnk" href="#letters" style="min-height:0;display:inline">The reason is in its letter.</a>`; tick; acts `Resume` + `Earlier reminders` | ADDENDUM 1 |

### SP-Operate-Studio.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | CSS `.ar-nav .ct` | `background: var(--sig); color: var(--sig-fg);` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg);` | VK §3.5 |
| list-operate | 2 | Rail Operate | as List-Studio #2 | as List-Studio #2 | ADDENDUM 1 |
| list-operate | 3 | `.op-line .r` | `13:19 · midday · times UTC` | `13:51 · midday · times UTC` | SB G6, OL OP-G9, ADDENDUM 3 |
| list-operate | 4 | Hero `.big` | `3` | `4` | ADDENDUM 1 |
| list-operate | 5 | Hero h1 | `<span class="sr">3 </span>cards on this board need you, and nothing is running` | `<span class="sr">4 </span>cards on this board need you, and nothing is running` | ADDENDUM 1 |
| list-operate | 6 | Hero p | `Two stopped and are waiting to be resumed; one sits…` | `Three stopped and are waiting to be resumed; one sits in a stage no agent works and needs moving. No agent is working anything, and nothing has been spent this week.` | ADDENDUM 1 |
| list-operate | 7 | 01 figures | `<b>3</b><span>Needs you</span>` … `<b>16</b><span>Unread activity</span>` | `<b>4</b>` … `<b>19</b>` | ADDENDUM 1 |
| list-operate | 8 | 02 header `span.sigt` | `3` | `4` | ADDENDUM 1 |
| list-operate | 9 | New first row, `tr.sel[aria-current=true]` (the selection stays on index 0) | (none) | `01` · `<span class="op-kind"><span class="u needs"></span>Stopped</span>` · ttl T5 + `<div class="op-sub"><span class="chip c2"></span>Reproduce</div>` · `.ag` face 20 `error-eric` · `<span class="m">2d</span>` · `<span class="m">2</span>` (2 is below the OP-G13 threshold of 3) · `<p class="op-why clamp">`D5`</p><button class="ar-lk" type="button" aria-expanded="false">Show all</button>` · acts `Resume R` / `Open O` / `Log` | ADDENDUM 1 |
| list-operate | 10 | Existing rows | `tr.sel` on AgentPod; `.ix` `01`/`02`/`03` | AgentPod `<tr>` with `.ix` `02`; manual-delivery `03`; blocker `04` | ADDENDUM 1 |
| list-operate | 11 | AgentPod `p.op-why`, 58f8 detail | `"Mirror Repository SuperJackfruitLabs/agentpod is read-only"` | `“Mirror Repository SuperJackfruitLabs/agentpod is read-only”` | F C-05 |
| list-operate | 12 | Activity header `.r` | `16 unread · by card` | `19 unread · by card` | ADDENDUM 1 |
| list-operate | 13 | New `tr.op-grp` + `tr.op-ev` after the AgentPod group | (none) | group: face 20 + ttl T5 + `Resume` (`ar-btn2`, min-height 36px) + `Earlier`. Event: `<span class="m">14:11</span>` · `<span class="kick">Stale</span>` · `Still stopped 24h later in Reproduce. ` + `reason ↑` · op-tick | ADDENDUM 1 |
| list-operate | 14 | `footer.ar-status` | `<span>6 cards</span><span class="sig">3 need you</span><span>0 running</span><span>16 unread</span><span>synced 13:19</span>` | `<span>7 cards</span><span class="sig">4 need you</span><span>0 running</span><span>19 unread</span><span>synced 13:51</span>` | SB G6, ADDENDUM 1 |

### SP-Operate-Quiet.dc.html
| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| list-operate | 1 | `.qn-need` | `(3 need you)` | `(4 need you)` | ADDENDUM 1 |
| list-operate | 2 | Change board / Search | `aria-haspopup="listbox"` / `aria-label="Search, Command K"` | `aria-haspopup="menu"` / `aria-label="Search cards, agents and actions"` | SB §1.6 |
| list-operate | 3 | `p.q__lede` | `Developer Experience. 3 cards need you. No agent is working. Times are in UTC. ` | `Developer Experience. 4 cards need you. No agent is working. Times are in UTC. ` | ADDENDUM 1 |
| list-operate | 4 | h2 | `Needs your decision (3)` | `Needs your decision (4)` | ADDENDUM 1 |
| list-operate | 5 | New `article.item.item--needs` after the manual-delivery item (urgency order by attempts: 5, 2, 1, then the blocker), copying the manual-delivery item's markup | (none) | h3 link T5; meta `Stopped in Reproduce · 2 days · 2 attempts · ` + face 20 `error-eric`; `dl`: `Why it stopped` / D5 (full), `What to do` / `Fix what it says, then resume it with a note it will read.`; acts `Resume` (`aria-expanded="false"`) · `Open card` · `Open log`. Renumber `aria-labelledby` q1–q4. | ADDENDUM 1 |
| list-operate | 6 | AgentPod `dd`, 58f8 detail | `"Mirror Repository SuperJackfruitLabs/agentpod is read-only"` | `“Mirror Repository SuperJackfruitLabs/agentpod is read-only”` | F C-05 |
| list-operate | 7 | Blocker "Move to" select | three options | append `<option>Integrate (3 agents)</option>` | OL OP-G6 |
| list-operate | 8 | h2 | `Activity (16 unread)` | `Activity (19 unread)` | ADDENDUM 1 |
| list-operate | 9 | New activity item between AgentPod and the blocker | (none) | h3 face 20 + T5 link; `<li><span>14:11 UTC: still stopped a day later in Reproduce. The reason is under Needs your decision.</span><button class="textbtn">Mark read</button></li>`; acts `Resume` (secondary btn-sm) + `Show earlier reminders` | ADDENDUM 1 |

### Shell values per artboard (cross-check)
| Artboard | here | section | boardName | view | showing | other |
|---|---|---|---|---|---|---|
| List-Daylight | plan | list | Developer Experience | list | `Showing all 7 cards` | count 4; crew `4 agents`/`3 wait on you`; `Filter cards` + `none on` |
| List-Paper | plan | list | Developer Experience | list | `Showing all 7 cards · 4 wait on you · 1 shipped` | `(4)` |
| List-Studio | plan | list | Developer Experience | list | `Showing all 7 cards` | tabs `List 7 · Projects 3`; sub-right `The board at 13:51 · midday · Sunday 11 October`; status `7 cards`·`4 need you`(sig)·`2 blocked`·`1 shipped`·`synced 13:51` |
| List-Quiet | plan | list | Developer Experience | list | `Showing all 7 cards` | `Operate (4 need you)`, `Filter cards (none on)` |
| Operate-Daylight | operate | operate | Developer Experience | null | null | count 4; crew as List |
| Operate-Paper | operate | operate | Developer Experience | null | null | `(4)`; no `.mh-tabs` |
| Operate-Studio | operate | operate | Developer Experience | null | null | status `7 cards`·`4 need you`(sig)·`0 running`·`19 unread`·`synced 13:51` |
| Operate-Quiet | operate | operate | Developer Experience | null | null | `Operate (4 need you)` |

## Group `card-drawer`

All four artboards show the desktop drawer of card `card_05823a57e8224605` (4605) over the Developer Experience board.

Under ADDENDUM §1, 4605 is **live and stopped**:
- `archived_at` NULL, `input-required` in Reproduce.
- `state_since 2026-10-08T14:11:45Z`, which reads "Waiting on you · 2 days".
- Priority 3, queued by super-chotu, attempt 2 by error-eric.

What stays as drawn:
- the stopped lead, the resume form, the signal and the face moods;
- Studio's "2 days";
- the "Archive card" button.

What changes is only the content. 4605 has one base/phone-literal content everywhere (R1):
- 5 criteria, no plan;
- 10 phone detail fields in 5 groups;
- project `prj_42ab5ec961104f65`, no milestone;
- 5 GitHub references, no links, no related work, no handoff;
- runs on Thu 8 Oct.

So the desktop-only content goes: the 3 criteria, the 4-step plan, the paraphrased briefs, PR #642/#648, the 3 relates links, "Related prior work · Fixed", the "Melissa and Anna do not answer DMs" handoff, Fri 9 Oct, and run 2's "Read/Found" rows.

The backdrops show the live **7-card** board including 4605 (C-08 still holds as a correction). The board numbers that follow from that:
- 4 need you; the Operate count is 4.
- Daylight crew "4 agents / 3 wait on you".
- "Showing all 7 cards".
- Studio "List 7".

Shorthands used in the rows:

**PHONE-DESC.** `Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence.`

**PHONE-CRIT.** These 5 items, in order:
1. `Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent.`
2. `Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.`
3. `Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.`
4. `Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.`
5. `Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.`

**PHONE-SPEC.** The phone's 10 rows, verbatim, with "Show more" where the phone shows it:

| Group | Row | Value |
|---|---|---|
| What to do | Rework | `Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session.` + `Show more` |
| What to do | Required evidence | per-vibe row |
| Who it is about | Message Melissa | `@agent_message-melissa:id.agentpod.dev` + ` · ` + link `onboarding card` |
| Who it is about | Audience Anna | `@agent_audience-anna:id.agentpod.dev` + ` · ` + link `onboarding card` |
| Background | Context | `Rakesh states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants.` + `Show more` |
| Background | Latest confirmed grant | `Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.` |
| Rules | Scope | `Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages.` + `Show more` |
| Rules | Accounts issues | `If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue.` + `Show more` |
| Where work goes | Repository | `SuperJackfruitLabs/atelier · private · ` + link `policy` |
| Where work goes | Routing rule | `Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback.` + `Show more` |

There is no "Project" row in the brief (card §8.2-9).

**PHONE-REFS.** Each entry is title / description / source line:
1. `AgentPod v0.1.91 Matrix inbound bridge contract` / `DM ingress → room lookup → Accounts identity/grant → ACP dispatch` / `github · agentpod · inbound.ts lines 379–786`
2. `AgentPod v0.1.91 Matrix reply delivery contract` / `ACP chunks buffered and flushed via bridge-owned Matrix identity` / `github · agentpod · outbound.ts lines 373–486`
3. `AgentPod v0.1.91 ACP transport contract` / `acp.open/attach and bidirectional broker framing` / `github · agentpod · acp-transport.ts lines 90–248`
4. `Accounts current claims/grant contract` / `Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly` / `github · accounts · claims.ts lines 17–43`
5. `Hermes ACP adapter at the reproduced build` / `Hermes streams agent_message_chunk and returns end_turn over ACP stdio` / `github · hermes-agent · server.py lines 818–883`

The hrefs are the phone's (F§A.5.6).

Times are in IST (F§A.5.4, A.5.5):
- run 2 first row 18:50 Thu 8 Oct;
- run 2 stop 19:41 Thu 8 Oct;
- run 1 ended 12:11 Thu 8 Oct.

---

### SP-Card-Daylight.dc.html

| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| card | 1 | Backdrop `.dy-dest` Operate `.dy-count` + sr | `3` / `, 3 need you` | `4` / `, 4 need you` | ADD §1 |
| card | 2 | Backdrop CSS `.dy-count` | `background: var(--vk-color-signal); color: var(--vk-color-primary-fg)` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` | VK §3.3/§3.5 |
| card | 3 | Backdrop `.dy-crew` text | `<b>3 agents</b>2 wait on you` | `<b>4 agents</b>3 wait on you` | ADD §1, SB §1.3.3 |
| card | 4 | Backdrop `.dy-crew` `title` | `tester-tim and coder-kai wait on you; super-chotu queues the work` | `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` | ADD §1 |
| card | 5 | Backdrop `.dy-faces`, third face (`crew.slice(0,3)`) | super-chotu face, `data-mood="working"` | error-eric face, `data-mood="needs"` (the slice shows tester-tim, coder-kai, error-eric) | ADD §1, SB §1.3.1 |
| card | 6 | Backdrop `.dy-sub`, after Filter | (no note) | add `<span class="dy-note">Showing all 7 cards</span>` | SB §1.2, ADD §1 |
| card | 7 | Backdrop `p.dl-greet` | `Good afternoon. 3 cards want you.` | `Good afternoon, Rakesh. 4 cards want you.` | SB §3.3, ADD §1 |
| card | 8 | Backdrop `.dl-lanes`, Failing test lane | `Failing test · 3` with 2 tiles: AgentPod… `Blocked`, Integrate editorial… `Blocked` | `Failing test · 3` with 3 tiles: `AgentPod: connector interface and generic effects ledger, state machine and executor` `P2 · Waiting on you · 33h`; `Integrate editorial workflows and prove no-write publishing acceptance` `P2 · Blocked`; `agentpod-connectors: X connector (connector x)` `Blocked` | C-08, F§A.5.2/A.5.3 |
| card | 9 | Backdrop `.dl-lanes`, after Failing test | (absent) | add lane `Fix · 1` with tile `Superpipeline: manual-delivery completion and approval-subject hardening` `Waiting on you · 33h` (no priority, C-01). Add lane `Shipped · 1` with tile `Build immutable approval subjects and digest-bound gates` `P2 · Done`. The Reported and Reproduce lanes (4605, ringed) stay. | C-08, C-01 |
| card | 10 | `.dl-pinned summary .more` | `Description and 3 criteria · Show` | `Description and 5 criteria · Show` | D.2.4, R1 |
| card | 11 | `.dl-pinned p.dl-p` | `…exact repair proposal; do not attribute without evidence.` | PHONE-DESC | R1 |
| card | 12 | `.dl-pinned ul.dl-ul` | 3 `li` | 5 `li` = PHONE-CRIT | R1 |
| card | 13 | `.dl-time span` | `Fri 9 Oct, 19:41` | `Thu 8 Oct, 19:41` | F§A.2 |
| card | 14 | `#dl-note` `placeholder` | `For example: I sent a fresh DM to Melissa and Anna at 14:05; trace those two event IDs.` | `For example: what you checked, and what the agent should look at next.` | card §8.2-6, D-6 |
| card | 15 | "The brief" `summary .sum` | `Details · 10 fields, plan, project` | `Details · 10 fields, project` | D.2.4 (no plan) |
| card | 16 | "The brief" `.dl-groups` | 3 groups, Daylight paraphrases (Objective… Messages) | 5 groups = PHONE-SPEC in the same `.dl-group > h4 + dl.dl-dl` markup. Required evidence = `5 items, listed under Acceptance criteria.` | R1, S-18, D-21, D-22 |
| card | 17 | "The brief" plan column | `Agent plan` + `1 / 4 steps · 25%` + meter + 4 `li` | `Agent plan` + `none yet` + `<p class="dl-small">error-eric did not post a plan for this card.</p>` (no meter) | R1, Phone (MAJ) |
| card | 18 | "The brief" project column | `No project.` + `Assign to a project` | `Marketing & Community — Melissa and Anna onboarding · no milestone` + secondary `Change project` | F§A.4.5, D.2.4 |
| card | 19 | Run 2 `ul.dl-ev` | 3 rows: `Read AgentPod hub matrix-inbound log for Melissa’s station 19:22`; `Found session acps_8f86d4e4… reached Hermes; model reply produced 19:30`; `.stop` `Stopped No fresh DM event to trace. Needs one per agent. 19:41` | 2 rows: `<span class="k">Started</span> Rework run on this card session; read prior persisted evidence first.` `18:50`; then `.stop` `<span class="k">Stopped</span> Blocked. Waiting on you; the reason is shown at the top of this card.` `19:41` | F§A.5.5, Phone (MAJ) |
| card | 20 | Run 1 summary word | `stopped` | `sent back` | F§A.5.4, Phone |
| card | 21 | "What happened" final `.dl-small` | `Handoff from Reported: “Melissa and Anna do not answer DMs in Supermessage.” · Attempts: 1 · error-eric · $0.00 · stopped; 2 · error-eric · $0.00 · stopped` | `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output. · Attempts: 1 · error-eric · $0.00 · sent back; 2 · error-eric · $0.00 · stopped` | F§A.5.2 (handoff NULL), P-28/S-17 |
| card | 22 | "Links and references" `.sum` | `3 links · no sub-tasks · 2 references · 1 related` | `no links · no sub-tasks · 5 references · no related work` | F§A.5.3/A.5.6 |
| card | 23 | `Relates to` block, 3 links | present | `<p class="dl-small">Nothing blocks this card and it blocks nothing.</p>` (keep `Add link`) | F§A.5.3; C-18 superseded |
| card | 24 | References list | `agentpod PR #642 · merged`, `agentpod PR #648 · merged` | 5 `li` = PHONE-REFS: `a.dl-link` title + `<span class="dl-small">· github · agentpod · inbound.ts lines 379–786</span>` (and so on) | F§A.5.6, D-24 |
| card | 25 | Related prior work `p` | `Fixed · Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.` | `No related prior work found in Superlibrary.` | A.7.2 void, Phone |
| card | 26 | `.dl-foot` `Delete card` (`vk-button--quiet`) | quiet button | destructive ink outline: `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`. `Archive card` stays. | VK §3.5 |

### SP-Card-Paper.dc.html

| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| card | 1 | Backdrop `.mh-sec` Operate `.n` | `(3)` | `(4)` (signal-text word count stays) | ADD §1, VK |
| card | 2 | Backdrop `.mh-showing` | `Showing all 6 cards` | `Showing all 7 cards · 4 wait on you · 1 shipped` | SB §1.2, ADD §1 |
| card | 3 | Backdrop `.pp-cols` column 1 | `Waiting on you · 3 letters` + 63ac, 4605, 1dfc | `Waiting on you · 4 letters` + `Fix the highest-severity blocker found in the clean-room journey`, `AgentPod: connector interface and generic effects ledger, state machine and executor`, `Superpipeline: manual-delivery completion and approval-subject hardening`, `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` | C-08, F§A.5.2 order |
| card | 4 | Backdrop `.pp-cols` column 2 | `In progress and coming up` + 58f8, f83f | `In progress and coming up` + `Integrate editorial workflows and prove no-write publishing acceptance`, `agentpod-connectors: X connector (connector x)` | C-08 |
| card | 5 | Backdrop `.pp-cols` column 3 | `Shipped` + `agentpod-connectors: X connector (connector x)` | `Shipped` + `Build immutable approval subjects and digest-bound gates` | C-08 |
| card | 6 | Backdrop `.pp-cols` as a whole | simplified stand-in | preferred: the real Paper board body (SB §4.1) with the 7 cards; rows 3 to 5 are the minimum | card §8.2-7, P-6 |
| card | 7 | `.pp-sign .r` | `Diagnostics, attempt 2 · Friday 9 October, 19:41` | `Diagnostics, attempt 2 · Thursday 8 October, 19:41` | F§A.2 |
| card | 8 | `#pp-note` `placeholder` | `For example: I sent a fresh DM to each of them at 14:05; trace those.` | `For example: what you checked, and what the agent should look at next.` | card §8.2-6 (D-6 sentence; see conflicts) |
| card | 9 | "The brief" `.c` | `3 things to prove · 10 details · plan 1 of 4` | `5 things to prove · 10 details · project` | Phone-Paper |
| card | 10 | "The brief" description | `…do not attribute without evidence.` | PHONE-DESC | R1 |
| card | 11 | `Things to prove` `ul` | 3 `li` | 5 `li` = PHONE-CRIT | R1 |
| card | 12 | Plan column | `Plan · 1 of 4 steps · 25%` + meter + 4 `li` | `<p class="pp-sc">Plan</p><p class="pp-small">error-eric did not post a plan for this card.</p>` | R1, Phone (MAJ) |
| card | 13 | `.pp-groups` | 3 groups, Paper paraphrases (`Localise why Melissa and Anna…`, `No blame without evidence.` …) | 5 groups = PHONE-SPEC. Required evidence = `5 items, listed under Things to prove.` | R1, P-23, P-32 |
| card | 14 | brief foot left | `Project: none · Assign to a project` | `Project: Marketing & Community — Melissa and Anna onboarding · no milestone · ` + link `Change project` | F§A.4.5 |
| card | 15 | "What happened" `.c` | `2 runs, both stopped · no decisions · $0.00` | `2 runs · no decisions · $0.00` | P.2 `runsSummary` |
| card | 16 | "What happened" first `p` | `… Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”` | `Asked by super-chotu (an agent, allowed to dispatch the one working it). From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | F§A.5.2, P-28 |
| card | 17 | Attempt 2 line | `… stopped at 19:41 Fri 9 Oct` | `Attempt 2 · error-eric · 14 events · stopped at 19:41 Thu 8 Oct` | F§A.5.4 |
| card | 18 | Attempt 1 line | `Attempt 1 · error-eric · 9 events · stopped` | `Attempt 1 · error-eric · 9 events · sent back` | F§A.5.4 |
| card | 19 | "Who is waiting" `.c` | `3 related cards · no sub-tasks` | `no links · no sub-tasks` | P.2 `linkedSummary(0)` |
| card | 20 | "Who is waiting" body `ul` (3 links) | present | `<p class="pp-small">Nothing blocks this card and it blocks nothing.</p>` (keep `Add link`) | F§A.5.3; C-18 superseded |
| card | 21 | "Attached" `.c` | `2 references · 1 related piece of prior work · no delivery` | `5 references · no related prior work · no delivery` | Phone-Paper |
| card | 22 | "Attached" body `ul` | PR #642/#648 + `Prior work, fixed: Hermes agent stuck on an E2EE device; a fresh device fixed it.` | 5 `li` = PHONE-REFS (title link · description, then `<span class="pp-small">` source line), last `li` `No related prior work found in Superlibrary.` | F§A.5.6, P-29; C-03 superseded |
| card | 23 | `.pp-foot` `Delete card` (`vk-button--quiet`) | quiet | destructive ink outline (as Daylight row 26); `Edit card` and `Archive card` stay | VK §3.5 |

### SP-Card-Studio.dc.html

| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| card | 1 | Backdrop Operate `.ar-nav` | `aria-label="Operate, 3 need you"`, `.ct` `3`, tip `Operate · 3 need you` | `aria-label="Operate, 4 need you"`, `.ct` `4`, tip `Operate · 4 need you` | ADD §1 |
| card | 2 | Backdrop CSS `.ar-nav .ct` | `background: var(--sig); color: var(--sig-fg)` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` | VK §3.3/§3.5 |
| card | 3 | Backdrop `.ar-sub` List tab | `List <span class="mono">6</span>` | `List <span class="mono">7</span>` | ADD §1 |
| card | 4 | Backdrop `.ar-hint` | `Showing all 6 cards` | `Showing all 7 cards` | ADD §1 |
| card | 5 | Backdrop `.ar-sub`, after `.ar-hint` | (absent) | add `<span class="r">The board at 13:51 · midday · Sunday 11 October</span>` | SB §1.5.2, clock |
| card | 6 | Backdrop `.ar-hero` | `3` / `of 6 cards are waiting on a person` | `4` / `of 7 cards are waiting on a person` | ADD §1 |
| card | 7 | Backdrop `.ar-tbl` rows (5) | 63ac, 4605 (sel), 1dfc, 58f8 `Blocked` tester-tim, f83f `Blocked` tester-tim | 7 rows in this order: `Waiting on you` / `Fix the highest-severity blocker found in the clean-room journey` / `Unclaimed` / ramp 1; `Waiting on you` / `AgentPod: connector interface and generic effects ledger, state machine and executor` / `tester-tim` / ramp 1–3; `Waiting on you` / `Superpipeline: manual-delivery completion and approval-subject hardening` / `coder-kai` / ramp 1–4; `tr.sel` `Waiting on you` / `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` / `error-eric` / ramp 1–2; `Queued · blocked` (`u blocked`) / `Integrate editorial workflows and prove no-write publishing acceptance` / `Unclaimed` / ramp 1–3; `Queued · blocked` / `agentpod-connectors: X connector (connector x)` / `Unclaimed` / ramp 1–3; `Done` (`u done`) / `Build immutable approval subjects and digest-bound gates` / `coder-kai` / ramp 1–7 | C-08, F§A.5.2/A.5.4 |
| card | 8 | Backdrop, after `.cw-backmain` | (absent) | add `<footer class="ar-status" aria-label="Status"><span>7 cards</span><span class="sig">4 need you</span><span>2 blocked</span><span>1 shipped</span><span>synced 13:51</span><span class="r"><span>⌘K commands</span><span>N new card</span></span></footer>` | SB §4.2, ADD §1 |
| card | 9 | `.cw-bar time` | `13:27 · midday`, `aria-label="Local time 13:27, midday"` | `13:51 · midday`, `aria-label="Local time 13:51, midday"` | ONE-WORLD clock (S-1 void) |
| card | 10 | Section 01 `.ar-q h3 .mono` | `Fri 9 Oct 19:41` | `Thu 8 Oct 19:41` | F§A.2 |
| card | 11 | `#cw-note` `placeholder` | `Fresh DMs sent 14:05; trace those event IDs.` | `For example: what you checked, and what the agent should look at next.` | card §8.2-6 (see conflicts) |
| card | 12 | Spec `Description` | `…do not attribute without evidence.` | PHONE-DESC | R1 |
| card | 13 | Spec `Acceptance criteria <span class="mono">3</span>` + 3 `li` | as shown | `Acceptance criteria <span class="mono">5</span>` + PHONE-CRIT | R1 |
| card | 14 | Spec `Agent plan 1 of 4 · 25%` + meter + 4 `li` | present | `<h3 class="cd-h">Agent plan</h3><p class="cd-p">error-eric did not post a plan for this card.</p>` | R1, Phone (MAJ) |
| card | 15 | Spec `table.cd-dt` | 3 rowgroups, Studio paraphrases, agent faces | 5 rowgroups (`rowspan="2"` each) = PHONE-SPEC. Required evidence = `5 items, listed under Acceptance criteria.` Caption `Brief details, 10 fields` stays. | R1, S-16, S-18 |
| card | 16 | Spec project row | `<span class="kick">Project</span> None` + `Assign to a project` | `<span class="kick">Project</span> Marketing & Community — Melissa and Anna onboarding · no milestone` + `Change project` | F§A.4.5 |
| card | 17 | Log (tab=log) runs row 1 | `… Stopped / 2 / 14 / 0 / Oct 9 19:41` | `… Stopped / 2 / 14 / 0 / Oct 8 19:41` (`.sigt` stays) | F§A.5.4 |
| card | 18 | Log runs row 2 | `Reproduce / error-eric / Stopped / 1 / 9 / 0 / Oct 9 11:12` | `Reproduce / error-eric / Sent back / 1 / 9 / 0 / Oct 8 12:11` | F§A.5.4 |
| card | 19 | Log `Latest run` table (3 rows) | `19:22 Action Read the AgentPod hub…`, `19:30 Response Session acps_8f86d4e4…`, `19:41 Stopped No fresh DM event…` | 2 rows: `18:50` / `Started` / `Rework run on this card session; read prior persisted evidence first.`; then `19:41` / `Stopped` (`.sigt`) / `Blocked. Waiting on you; the reason is shown at the top of this card.` | F§A.5.5, Phone (MAJ); C-04 superseded |
| card | 20 | Log handoff block | `<h3>Handoff from Reported</h3><p>“Melissa and Anna do not answer DMs in Supermessage.”</p>` | `<h3 class="cd-h">Handoff</h3><p class="cd-p">From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.</p>` | F§A.5.2, S-17 |
| card | 21 | Links (tab=links) table | 3 `Relates to` rows + 2 `Reference` rows `agentpod PR #642/#648 · merged` / `Forge` | `<p class="cd-p">Nothing blocks this card and it blocks nothing.</p>` + 5 `Reference` rows: PHONE-REFS titles, Where `GitHub`, no action | F§A.5.3/A.5.6, S-5 |
| card | 22 | Links related `p` | `Related prior work · 1` + `Fixed: Hermes agent stuck on an E2EE device…` | `<span class="kick">Related prior work</span> No related prior work found in Superlibrary.` | A.7.2 void |
| card | 23 | Cost (tab=cost) attempts row 1 | `1 / error-eric / $0.00 / Stopped` | `1 / error-eric / $0.00 / Sent back` | F§A.5.4 |
| card | 24 | `.cw-foot` `Delete card` (`ar-lk quiet`) | quiet link | `background: transparent; box-shadow: inset 0 0 0 2.5px var(--rule)`. `Archive card` stays. | VK §3.5 (Studio) |

### SP-Card-Quiet.dc.html

| Grp | # | Where | Mockup shows now | Replace with (exact) | Source |
|---|---|---|---|---|---|
| card | 1 | Backdrop `.qt-board` (stand-in, no shell) | `Developer Experience` / `Superpipeline · 6 cards` / `Needs your decision (3)` 63ac, 4605, 1dfc / `Blocked (3)` 58f8 | Quiet shell `header.qn` (row 2) above the Quiet DX board. Board: `h1` `Developer Experience`; sub `Superpipeline · 7 cards · 4 need your decision`; `Needs your decision (4)` = AgentPod: connector interface…, Superpipeline: manual-delivery…, Diagnose Melissa and Anna…, Fix the highest-severity blocker…; `In progress (0)` `None.`; `Waiting to start (2)` = Integrate editorial workflows…, agentpod-connectors: X connector (connector x); `Done (1)` = Build immutable approval subjects and digest-bound gates; `Closed (0)` `None.` The scrim stays. | ONE-WORLD R4, C-08, ADD §1 |
| card | 2 | Backdrop `header.qn` values | (absent) | row 1: `Superpipeline`, `Plan` (current), `Operate <span class="qn-need">(4 need you)</span>`, `Workspace`, `Appearance`, `Dark theme`, `Rakesh Gangwar — Sign out`. Row 2: `Board: <b>Developer Experience</b> — Change board`, `<b>Live.</b> Changes appear as they happen.`, `Search ⌘K`, `New card`, `View: Board · List · Projects` (Board pressed), `Filter cards (none on)`, `.qn-note` `Showing all 7 cards` | SB §1.6, G4, ADD §1 |
| card | 3 | `fieldset.qt-form p.qt-by` | `error-eric stopped on Friday 9 October at 19:41 and wrote:` | `error-eric stopped on Thursday 8 October at 19:41 and wrote:` | F§A.2 |
| card | 4 | `fieldset.qt-form`, after `p.qt-said` | (absent) | add link-button `Copy session id` | card §7.4, Q note 6 |
| card | 5 | Description `p` | `…do not attribute without evidence.` | PHONE-DESC | R1 |
| card | 6 | `Acceptance criteria` `ul` | 3 `li` | 5 `li` = PHONE-CRIT | R1 |
| card | 7 | Plan section | `Plan (1 of 4 steps done)` + 4-item `ol` | `<h3>Plan</h3><p>None yet.</p>` | Q.1 content map |
| card | 8 | `Brief details (10)` | 3 `h4` groups, Quiet paraphrases | 5 `h4` + `dl.qt-dl` groups = PHONE-SPEC. Required evidence = `5 items, listed under Acceptance criteria.` | R1, S-18 |
| card | 9 | History first `p` | `Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”` | `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | F§A.5.2, S-17 |
| card | 10 | History `li` 1 | `Attempt 2, Reproduce, error-eric: stopped at 19:41 on 9 October. 14 events, no errors.` | `Attempt 2, Reproduce, error-eric: stopped at 19:41 on 8 October. 14 events, no errors.` (+ `Show tool calls`) | F§A.5.4 |
| card | 11 | History `li` 2 | `Attempt 1, Reproduce, error-eric: stopped at 11:12 on 9 October. 9 events, no errors.` | `Attempt 1, Reproduce, error-eric: sent back at 12:11 on 8 October. 9 events, no errors.` | F§A.5.4 |
| card | 12 | `Links (3)` section | 3 `Relates to` `li` | `Links (0)` + `<p>Nothing blocks this card and it blocks nothing.</p>` (keep `Add link`) | F§A.5.3; C-18 superseded |
| card | 13 | Project `dd` | `None. <a>Assign to a project</a>` | `Marketing & Community — Melissa and Anna onboarding · no milestone. <a>Change project</a>` | F§A.4.5 |
| card | 14 | Attempts `dd` | `1: error-eric, $0.00, stopped. 2: error-eric, $0.00, stopped.` | `1: error-eric, $0.00, sent back. 2: error-eric, $0.00, stopped.` | F§A.5.4 |
| card | 15 | `References and related prior work` `ul` | `agentpod PR #642, merged`, `agentpod PR #648, merged`, `Related, fixed: Hermes agent stuck on an E2EE device; a fresh device fixed it.` | 5 `li` = PHONE-REFS (title link, `, ` description, source line), last `li` `No related prior work found in Superlibrary.` | F§A.5.6, Q-25; C-03 superseded |
| card | 16 | `Card actions` `Delete card` (`vk-button--secondary`) | secondary | destructive ink outline (as Daylight row 26); `Archive card` stays | VK §3.5 |

---

## Group `card-page`

Scope: the standalone page of card 4605 (`/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page`, shell slot `bare`). Under the ADDENDUM (R1a revoked) the page shows the **base-world, phone-literal, LIVE and STOPPED** record of 4605:
- archived_at NULL; state input-required in Reproduce, so the stopped lead, resume form and signal stay as drawn;
- state_since 2026-10-08T14:11:45Z, so the age reads "2 days";
- runs on Thu 8 Oct (§A.5.4), activities as §A.5.5;
- 5 references from the snapshot, no links, no plan, no related prior work, no handoff;
- project `prj_42ab5ec961104f65`, no milestone;
- spec copied from the snapshot, with the visible text taken from SP-Phone-Card-*.

The variant §A.7.2 `card4605-desktop-<vibe>` is VOID, and so is card.md §5 (desktop record) / §7.1 / D.6.1 / P.4 fixture / §30.2 fixture / Q-F1. Every desktop-only datum below therefore goes.

Clock check: no page prints a wall clock except Studio ("synced 13:51"), which is already correct. Daylight "noon sky" and Paper "Sunday 11 October · in full daylight" are correct.

Shell: the four pages use the `bare` slot with their own card-window bar (card.md §2.1). None of them is a shared `vs-*` artboard, so there is no per-vibe shell table.

### Literal blocks used in the rows (verbatim from SP-Phone-Card-*, the base world)

- **DESC** = `Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence.`
- **CRIT** (5, in order):
  1. `Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent.`
  2. `Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.`
  3. `Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.`
  4. `Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.`
  5. `Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.`
- **DETAILS**: 10 rows in 5 groups (the phone's `spec.groups`). The phone's 11th row, Project inside "Where work goes", is dropped (card §8.2-9 / Q-28). Rows marked [+] are clamped and followed by a `Show more` toggle (D-21 / P-23).
  - **What to do**
    - Rework [+] = `Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session.`
    - Required evidence = `5 items, listed under Things to prove.`
  - **Who it is about**
    - Message Melissa = `@agent_message-melissa:id.agentpod.dev · onboarding card`
    - Audience Anna = `@agent_audience-anna:id.agentpod.dev · onboarding card`
  - **Background**
    - Context [+] = `Rakesh states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants.`
    - Latest confirmed grant = `Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.`
  - **Rules**
    - Scope [+] = `Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages.`
    - Accounts issues [+] = `If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue.`
  - **Where work goes**
    - Repository = `SuperJackfruitLabs/atelier · private · policy`
    - Routing rule [+] = `Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback.`
- **REFS**: 5 rows, each title / subtitle / source line. The hrefs are the phone's GitHub blob URLs.
  1. `AgentPod v0.1.91 Matrix inbound bridge contract` / `DM ingress → room lookup → Accounts identity/grant → ACP dispatch` / `github · agentpod · inbound.ts lines 379–786`
  2. `AgentPod v0.1.91 Matrix reply delivery contract` / `ACP chunks buffered and flushed via bridge-owned Matrix identity` / `github · agentpod · outbound.ts lines 373–486`
  3. `AgentPod v0.1.91 ACP transport contract` / `acp.open/attach and bidirectional broker framing` / `github · agentpod · acp-transport.ts lines 90–248`
  4. `Accounts current claims/grant contract` / `Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly` / `github · accounts · claims.ts lines 17–43`
  5. `Hermes ACP adapter at the reproduced build` / `Hermes streams agent_message_chunk and returns end_turn over ACP stdio` / `github · hermes-agent · server.py lines 818–883`
- **PROJ** = `Marketing & Community — Melissa and Anna onboarding`
- **HANDOFF** = `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` (P-28: `handoff_json` is NULL in the base world)
- **NOPLAN** = `error-eric did not post a plan for this card.`
- **NOREL** = `No related prior work found in Superlibrary.`
- **NOLINKS** = `Nothing blocks this card and it blocks nothing.`
- **Run 2** (`run_fx_4605_2`): started 13:20Z (18:50 IST), ended 14:11:43Z (19:41 IST) Thu 8 Oct, outcome blocked, 14 events (2 narrative + 12 tool calls), 0 errors.
  - Narrative 1, 18:50: `Rework run on this card session; read prior persisted evidence first.` Phone verb: `Started`.
  - Narrative 2, 19:41: `Blocked. Waiting on you; the reason is shown at the top of this card.` Phone verb: `Stopped`.
- **Run 1** (`run_fx_4605_1`): ended 06:41Z (12:11 IST) Thu 8 Oct, completion refused, so phone word `Sent back`; 9 events (1 narrative + 8 tool calls), 0 errors.

### SP-CardPage-Daylight.dc.html
| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| cardpage | 5 | `.dp-facts` Project | `Project <b>none</b>` | `Project <b>Marketing & Community — Melissa and Anna onboarding</b>` | F§A.5.2 (project_id prj_42ab5ec961104f65), F§A.4.5 |
| cardpage | 10 | `.dp-time` first span | `Fri 9 Oct, 19:41` | `Thu 8 Oct, 19:41` | F§A.2 (stop at 14:11:45Z, which is 19:41 IST Thu 8 Oct); F§A.5.4 run_fx_4605_2 |
| cardpage | 12 | `What error-eric was asked` `p.dp-p` | `…exact repair proposal; do not attribute without evidence.` | DESC | ONE-WORLD R1 (one 4605 content) (spec from snapshot = phone) |
| cardpage | 13 | `h3 Done when small` | `3 acceptance criteria` | `5 acceptance criteria` | ONE-WORLD R1 (one 4605 content) |
| cardpage | 14 | `ol.dp-crit` | 3 items: `The first failing hop is named, for each agent.` / `Each hop cites its evidence: a log line or metadata row with its time.` / `A repair proposal names the owning repository.` | 5 items `1`…`5` = CRIT 1–5 | ONE-WORLD R1 (one 4605 content) |
| cardpage | 15 | `The brief` card, all three `.dp-group`s (`What to do` Objective/Deliverable/Evidence/Out of scope; `Where it goes` Agents in scope with 2 faces/Surfaces/Fix goes to; `Rules` Attribution/Issues/Messages) | desktop-variant spec values (`Reproduce and localise why the AgentPod bridge identities…`, `An evidence-backed diagnosis and the exact repair proposal.`, `One fresh DM per agent, traced hop by hop.`, `Applying the fix.`, `message-melissa` `audience-anna`, `Supermessage, AgentPod hub, Accounts`, `Failing test, on this board`, `Do not blame a component without evidence.`, `File one only for an established defect.`, `Read metadata only, never message contents.`) | 5 `.dp-group`s with h4 `What to do` / `Who it is about` / `Background` / `Rules` / `Where work goes`, holding the DETAILS rows (dt label, dd value; [+] rows get a `Show more` quiet button after the dd). There is no Project row and no `.dp-inscope` faces. | ONE-WORLD R1 (one 4605 content); card §8.2-9 (Q-28); D-21; D-22 |
| cardpage | 17 | Agent plan block (`Agent plan`, `1 / 4 steps · 25%`, `.dp-meter` 25%, 4 `.dp-plan` items `Check Melissa’s live ACP session` … `Write the repair proposal`) | invented 4-step plan | `<div class="dp-row" style="justify-content: space-between"><b>Agent plan</b><span class="dp-small">none yet</span></div>` + `<p class="dp-p dp-small">error-eric did not post a plan for this card.</p>` (no meter, no list) | ONE-WORLD R1 (one 4605 content); Phone-Card-Daylight `Plan none yet` |
| cardpage | 18 | Project row | `<b>Project</b> <span class="dp-small">· none</span>` + button `Assign to a project` | `<b>Project</b> <span class="dp-small">· Marketing & Community — Melissa and Anna onboarding · no milestone</span>` + button `Change project` | F§A.4.5; card D.2.4 (assigned → "Change project"); Phone-Card-Daylight |
| cardpage | 19 | `Links and references small` | `3 links · 2 references · 1 related` | `5 references` (counts of 0 omitted, as D.3.4 already does for sub-tasks) | ONE-WORLD R1 (one 4605 content); F§A.5.3 (no 4605 links), F§A.5.6 (5 refs) |
| cardpage | 20 | `<b>Relates to</b>` + `ul.dp-links` (3 items: `Fix the highest-severity blocker found in the clean-room journey` `This board · Reported · Waiting on you`; `Onboard Message Melissa — marketing and messaging` `Agent Onboarding · advisory`; `Onboard Audience Anna — community and engagement` `Agent Onboarding · advisory`) | 3 relates-links | Remove the heading and list. In their place put `<p class="dp-p dp-small">Nothing blocks this card and it blocks nothing.</p>` (NOLINKS) | ONE-WORLD R1 (one 4605 content) (A.7.2 links void); makes F C-18 moot |
| cardpage | 21 | References `ul.dp-ul` | `agentpod PR #642 · merged`, `agentpod PR #648 · merged` | 5 `<li>`s, each `<a href=…>`title`</a>` + `<span class="dp-small">`subtitle`</span>` + `<small class="dp-small" style="font-family: var(--vk-font-mono)">`source line`</small>` = REFS 1–5 | F§A.5.6; card D-24 |
| cardpage | 22 | Related prior work `p` | `Fixed · Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.` | `No related prior work found in Superlibrary.` (NOREL) | ONE-WORLD R1 (one 4605 content) (A.7.2 related route void); makes F C-03 moot |
| cardpage | 24 | Run 2 `ol.dp-tl` row 1 | `<span class="k">Read</span> AgentPod hub matrix-inbound log for Melissa’s station` / `19:22` | `<span class="k">Started</span> Rework run on this card session; read prior persisted evidence first.` / `18:50` | F§A.5.5 run_fx_4605_2 seq 1 (13:20:05Z); verb MAJ (all 4 phones) |
| cardpage | 25 | Run 2 row 2 | `<span class="k">Found</span> session acps_8f86d4e4… reached Hermes; model reply produced` / `19:30` | Remove the row. Only 2 narrative rows exist; the 12 tool calls stay hidden. | F§A.5.5 |
| cardpage | 26 | Run 2 row 3 | `<span class="stop"><span class="k">Stopped</span> No fresh DM event to trace. Needs one per agent.` / `19:41 Fri 9 Oct` | `<span class="stop"><span class="k">Stopped</span> Blocked. Waiting on you; the reason is shown at the top of this card.` / `19:41 Thu 8 Oct` (keep `.stop`) | F§A.5.5 seq 14 (14:11:43Z) |
| cardpage | 27 | Run 2 tool toggle | `Show tool calls · 11 more events` | `Show tool calls · 12 more events` | F§A.5.5 (run 2 = 1 thought + 12 tool + 1 response) |
| cardpage | 28 | Run 1 summary | `<span>stopped</span>` / `9 events · 0 errors · 11:12` | `<span>sent back</span>` / `9 events · 0 errors · 12:11` | F§A.5.4 run_fx_4605_1 (ended 06:41Z = 12:11 IST, completion refused); card D.2.4 status word `sent back`; phones `Sent back` |
| cardpage | 29 | Handoff block | `<b>Handoff from Reported</b><br>“Melissa and Anna do not answer DMs in Supermessage.”` | `<b>Handoff from Reported</b><br>From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` (HANDOFF) | F§A.5.2 (`handoff_json=NULL`); card P-28 |
| cardpage | 30 | Cost `dl` Attempt 1 | `error-eric · $0.00 · stopped` | `error-eric · $0.00 · sent back` | F§A.5.4 |
| cardpage | 32 | Footer `Delete card` | `class="vk-button vk-button--quiet"` | Destructive ink outline: `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`. Keep the label `Delete card`. | ONE-WORLD R5 / VK §3.5 |
| cardpage | 33 | (prop theme=dark) | same content | same replacements; no other data change | ONE-WORLD R1 |


### SP-CardPage-Paper.dc.html
| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| cardpage | 7 | `.pg-line` last span | `No project` | `Project <b>Marketing & Community — Melissa and Anna onboarding</b>` | F§A.4.5; card P.4 content map |
| cardpage | 9 | Signature `.pg-small` | `Diagnostics, attempt 2 · Friday 9 October, 19:41` | `Diagnostics, attempt 2 · Thursday 8 October, 19:41` | F§A.2; F§A.5.4. `Diagnostics` is a world addition (see below) |
| cardpage | 11 | Enclosure I `p.pg-p.pg-serif` | `…exact repair proposal; do not attribute without evidence.` | DESC | ONE-WORLD R1 (one 4605 content) |
| cardpage | 12 | Enclosure I `.pg-group`s (3 groups: What to do `Localise why Melissa and Anna do not answer Rakesh in Supermessage.` / `A diagnosis with evidence, and the repair proposal.` / `One fresh DM per agent, traced hop by hop.` / `Applying the fix.`; Where it goes, with faces, `message-melissa, audience-anna` / `Supermessage, AgentPod hub, Accounts` / `Failing test, on this board`; Rules `No blame without evidence.` / `Only for an established defect.` / `Metadata only, never contents.`) | per-vibe paraphrased desktop spec | 5 `.pg-group`s (`What to do`, `Who it is about`, `Background`, `Rules`, `Where work goes`) holding the DETAILS rows; [+] rows end with a `Show more` link-button. No faces, no Project row. | ONE-WORLD R1 (one 4605 content); card P-7 (void through R1); §8.2-9; P-23 |
| cardpage | 13 | Enclosure I foot | `Project: none · <a>Assign to a project</a>` | `Project: Marketing & Community — Melissa and Anna onboarding · no milestone · <a>Change project</a>` | F§A.4.5; Phone-Card-Paper |
| cardpage | 14 | Enclosure II `ol.pg-ol` | the 3 desktop criteria | 5 `<li>` = CRIT 1–5 | ONE-WORLD R1 (one 4605 content) |
| cardpage | 15 | Enclosure II plan (`p.pg-sc` `Agent plan · 1 of 4 steps · 25%`, `.pg-meter` 25%, `ul.pg-ul` 4 steps, first struck) | invented plan | `<p class="pg-sc" style="border: 0; padding: 0; margin-top: var(--vk-space-2)">Agent plan</p>` + `<p class="pg-small" style="margin: 0">error-eric did not post a plan for this card.</p>` (no meter, no list) | ONE-WORLD R1 (one 4605 content); Phone-Card-Paper `Plan` |
| cardpage | 16 | Enclosure III summary `p.pg-small` | `3 related cards · no sub-tasks (0 open of 0) · 2 references · 1 related piece of prior work` | `no related cards · no sub-tasks (0 open of 0) · 5 references · no related prior work` | F§A.5.3/§A.5.6; Phone-Card-Paper `no links · no sub-tasks`, `5 references · no related prior work` |
| cardpage | 17 | Enclosure III `ul.pg-ul` items 1–3 (`Relates to Fix the highest-severity blocker found in the clean-room journey · this board`, `Relates to Onboard Message Melissa — marketing and messaging · Agent Onboarding, advisory`, `Relates to Onboard Audience Anna — community and engagement · Agent Onboarding, advisory`) | 3 relates-links | Remove them. Put `<li>Nothing blocks this card and it blocks nothing.</li>` (NOLINKS) first. | ONE-WORLD R1 (one 4605 content); F C-18 moot |
| cardpage | 18 | Enclosure III items 4–5 | `Reference: agentpod PR #642 · merged`, `Reference: agentpod PR #648 · merged` | 5 items, each `Reference: <a href=…>`title`</a> · `subtitle` · <span class="pg-mono">`source line`</span>` = REFS 1–5 | F§A.5.6; card P-29 |
| cardpage | 19 | Enclosure III item 6 | `Prior work, fixed: Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.` | `No related prior work found in Superlibrary.` | ONE-WORLD R1 (one 4605 content); F C-03 moot |
| cardpage | 20 | Enclosure III, after `Add link` | (nothing) | Two link-buttons, `Add a sub-task` and `Attach a link`, closed by default, each revealing the phone's `.addrow` field + `Add` | card §8.2-8 (P-8) |
| cardpage | 21 | Enclosure IV first `p.pg-small` | `Asked by super-chotu, an agent allowed to dispatch the one working it. Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”` | `Asked by super-chotu, an agent allowed to dispatch the one working it. From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | F§A.5.2 handoff NULL; card P-28 |
| cardpage | 22 | `ol.pg-log` row 1 | `Read the AgentPod hub matrix-inbound log for Melissa’s station` / `19:22` | `Started Rework run on this card session; read prior persisted evidence first.` / `18:50` | F§A.5.5; verb MAJ (phones) |
| cardpage | 23 | `ol.pg-log` row 2 | `Found session acps_8f86d4e4… reached Hermes; a model reply was produced` / `19:30` | Remove the row | F§A.5.5 |
| cardpage | 24 | `ol.pg-log` row 3 | `<span class="stop">Stopped. No fresh DM event to trace; needs one per agent.` / `19:41 · Fri 9 Oct` | `<span class="stop">Stopped. Blocked. Waiting on you; the reason is shown at the top of this card.` / `19:41 · Thu 8 Oct` (keep `.stop`) | F§A.5.5 |
| cardpage | 25 | Attempt 1 line | `<b>Attempt 1</b> · error-eric · 9 events, no errors · stopped at 11:12` | `<b>Attempt 1</b> · error-eric · 9 events, no errors · sent back at 12:11` | F§A.5.4 |
| cardpage | 26 | P-11 breakpoint (CSS) | none | add `@media (max-width: 1099.98px) { .pg-spread { grid-template-columns: minmax(0, 1fr); row-gap: var(--vk-space-6); } .pg-col { padding: 0; border-left: 0; } }` (1440 render unchanged) | card §8.2-8 (P-11) |
| cardpage | 28 | Colophon `Delete card` | `class="vk-button vk-button--quiet"` | ink outline `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; label `Delete card` | ONE-WORLD R5 / VK §3.5 |
| cardpage | 29 | (prop theme=dark) | same | same replacements | ONE-WORLD R1 |


### SP-CardPage-Studio.dc.html
| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| cardpage | 3 | `.ar-figs` figure 6 | `<div><b>1<small>of 4</small></b><span>Plan</span></div>` | Remove it, leaving 7 figures | card §30.2 ("hidden when no plan — then 7 figures"); ONE-WORLD R1 (one 4605 content) |
| cardpage | 7 | `dl.cp-people` Project | `<dd>none</dd>` | `<dd>Marketing & Community — Melissa and Anna onboarding</dd>` | F§A.4.5 |
| cardpage | 9 | §01 `.ar-q h3` mono date | `Fri 9 Oct 19:41` | `Thu 8 Oct 19:41` (h3 text `error-eric · Stopped · needs you` unchanged) | F§A.2 |
| cardpage | 11 | §04 `Description` `p.cd-p` | `…exact repair proposal; do not attribute without evidence.` | DESC | ONE-WORLD R1 (one 4605 content) |
| cardpage | 12 | §04 `Acceptance criteria` mono count + `ol.cd-ol` | `3` + 3 desktop criteria | `5` + 5 `<li><span>`CRIT n`</span></li>` | ONE-WORLD R1 (one 4605 content) |
| cardpage | 13 | §04 Agent plan block (`Agent plan` `1 of 4 · 25%`, `.cd-meter` 4 segments, 4-step `ol`) | invented plan | `<h3 class="cd-h">Agent plan</h3><p class="note cd-p">error-eric did not post a plan for this card.</p>` | ONE-WORLD R1 (one 4605 content); Phone-Card-Studio `Plan` |
| cardpage | 14 | §04 `table.cd-dt` tbody (3 rowgroups: What to do `Localise why Melissa and Anna do not answer Rakesh in Supermessage.` / `Diagnosis with evidence, and the exact repair proposal.` / `One fresh DM per agent, traced hop by hop.` / `Applying the fix.`; Where it goes `message-melissa · audience-anna` / `Supermessage, AgentPod hub, Accounts` / `Failing test, on this board`; Rules `No blame without evidence.` / `Only for an established defect.` / `Metadata only, never contents.`) | paraphrased desktop spec | 5 rowgroups (`What to do` rowspan 2, `Who it is about` 2, `Background` 2, `Rules` 2, `Where work goes` 2) holding the DETAILS rows; [+] cells end with an `ar-lk` `Show more`. Caption stays `Brief details, 10 fields`. | ONE-WORLD R1 (one 4605 content); card S-19 (void through R1); §8.2-9 |
| cardpage | 15 | §04 project row | `<span class="kick">Project</span> None` + `Assign to a project` | `<span class="kick">Project</span> Marketing & Community — Melissa and Anna onboarding · no milestone` + `Change project` | F§A.4.5; Phone-Card-Studio |
| cardpage | 17 | §05 table rows 1–3 (`Relates to` + `Fix the highest-severity blocker found in the clean-room journey` `This board` `Remove`; `Onboard Message Melissa — marketing and messaging` `Agent Onboarding · advisory` `Remove`; `Onboard Audience Anna — community and engagement` `Agent Onboarding · advisory` `Remove`) | 3 relates-links + 3 `Remove` buttons | Remove all three rows | ONE-WORLD R1 (one 4605 content); F C-18 moot |
| cardpage | 18 | §05 table rows 4–5 | `Reference` `agentpod PR #642 · merged` `Forge`; `Reference` `agentpod PR #648 · merged` `Forge` | 5 rows `<td>Reference</td><td><a class="ttl" href=…>`title`</a> <span class="muted mono">`source line`</span></td><td>GitHub</td><td></td>` = REFS 1–5 | F§A.5.6 (provider github); card D-24 |
| cardpage | 19 | §05 `p.cd-p` | `Sub-tasks 0 open of 0 · Related prior work 1: fixed, Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.` | `Sub-tasks 0 open of 0 · Related prior work: none. No related prior work found in Superlibrary.` | ONE-WORLD R1 (one 4605 content); F C-03 moot |
| cardpage | 20 | §06 runs table `#2` Ended | `Oct 9 19:41` | `Oct 8 19:41` (Outcome `<td class="sigt">Stopped</td>` unchanged) | F§A.5.4 |
| cardpage | 21 | §06 runs table `#1` | `<td>Stopped</td>` `9` `Oct 9 11:12` | `<td>Sent back</td>` `9` `Oct 8 12:11` | F§A.5.4 (run_fx_4605_1 ended 06:41Z) |
| cardpage | 22 | §06 Latest run rows (3: `19:22` `Read the AgentPod hub matrix-inbound log for Melissa’s station`; `19:30` `Session acps_8f86d4e4… reached Hermes; a model reply was produced`; `19:41` `<span class="sigt">Stopped.</span> No fresh DM event to trace; needs one per agent`) | desktop-variant activity text | 2 rows: `18:50` `<span>Started.</span> Rework run on this card session; read prior persisted evidence first.`, and `19:41` `<span class="sigt">Stopped.</span> Blocked. Waiting on you; the reason is shown at the top of this card.` (keep `.sigt`) | F§A.5.5; F C-04 / card S-4 (now: fixture text verbatim) |
| cardpage | 23 | §06 handoff `p.cd-p` | `<span class="kick">Handoff from Reported</span> “Melissa and Anna do not answer DMs in Supermessage.”` | `<span class="kick">Handoff</span> From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | F§A.5.2; card P-28; Phone-Card-Studio `Handoff` |
| cardpage | 24 | §07 attempts table row 1 Outcome | `Stopped` | `Sent back` | F§A.5.4 |
| cardpage | 26 | §08 `Delete card` | `<button class="ar-lk quiet">Delete card</button>` | Studio destructive: `background: transparent; color: var(--text); box-shadow: inset 0 0 0 2.5px var(--rule)`, button form, label `Delete card` | ONE-WORLD R5 / VK §3.5 |
| cardpage | 30 | CSS `.ar-nav .ct` (line 71, unused on this page) | `background: var(--sig); color: var(--sig-fg)` | If kept: `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)`; else delete the unused rule | ONE-WORLD R5 / VK §3.3 |
| cardpage | 31 | (prop theme=dark) | same | same replacements | ONE-WORLD R1 |


### SP-CardPage-Quiet.dc.html
| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| cardpage | 4 | `p.qp-by` | `error-eric stopped on Friday 9 October at 19:41 and wrote:` | `error-eric stopped on Thursday 8 October at 19:41 and wrote:` | F§A.2 |
| cardpage | 6 | `#qp-desc` p | `…exact repair proposal; do not attribute without evidence.` | DESC | ONE-WORLD R1 (one 4605 content) |
| cardpage | 7 | `#qp-ac` | `Acceptance criteria (3)` + 3 items | `Acceptance criteria (5)` + 5 `<li>` = CRIT 1–5 | ONE-WORLD R1 (one 4605 content) |
| cardpage | 8 | `#qp-brief` (3 h3 groups What to do `Find why Melissa and Anna do not answer Rakesh in Supermessage.` / `A diagnosis with evidence, and the repair proposal.` / `One fresh DM per agent, traced hop by hop.` / `Applying the fix.`; Where it goes with faces `message-melissa, audience-anna` / `Supermessage, AgentPod hub, Accounts` / `Failing test, on this board`; Rules `No blame without evidence.` / `Only for an established defect.` / `Metadata only, never contents.`) | Quiet-paraphrased desktop spec | h2 stays `Brief details (10)`. 5 `<h3>`+`dl.qp-dl` groups (`What to do`, `Who it is about`, `Background`, `Rules`, `Where work goes`) hold the DETAILS rows; [+] rows end with a `Show more` link-button. No faces, no Project row. | ONE-WORLD R1 (one 4605 content); card Q-27 / Q-F1 (void through R1); Q-28 |
| cardpage | 9 | `#qp-plan` | `Plan (1 of 4 steps done)` + 4 steps (`Done: Check Melissa’s live ACP session` …) | `<h2 id="qp-plan">Plan</h2><p>error-eric did not post a plan for this card.</p>` | ONE-WORLD R1 (one 4605 content); Phone-Card-Quiet |
| cardpage | 10 | `#qp-links` | `Links (3)` + 3 `Relates to …` items (incl. `Onboard Audience Anna — community and engagement` `(Agent Onboarding, advisory)`) | `Links (0)` + `<p>Nothing blocks this card and it blocks nothing.</p>`; keep `Add link` | ONE-WORLD R1 (one 4605 content); F C-18 moot |
| cardpage | 11 | `#qp-refs` list | `agentpod PR #642, merged`, `agentpod PR #648, merged`, `Related, fixed: Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.` | 5 `<li><a href=…>`title`</a> (`source line`)</li>` = REFS 1–5, then `<li>No related prior work found in Superlibrary.</li>` | F§A.5.6; ONE-WORLD R1 (one 4605 content); F C-03 moot |
| cardpage | 12 | `#qp-hist` first p | `Handed on from Reported: “Melissa and Anna do not answer DMs in Supermessage.”` | `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | F§A.5.2; card P-28 |
| cardpage | 13 | Attempt 2 p | `Stopped at 19:41 on 9 October. 14 events, no errors.` | `Stopped at 19:41 on 8 October. 14 events, no errors.` | F§A.5.4 |
| cardpage | 14 | Attempt 2 `ol` (3 rows: `19:22 Read the AgentPod hub matrix-inbound log for Melissa’s station.`, `19:30 Found session acps_8f86d4e4… reached Hermes; a model reply was produced.`, `19:41 Stopped: no fresh DM event to trace; needs one per agent.`) | desktop-variant activities | 2 rows: `18:50 Started Rework run on this card session; read prior persisted evidence first.` and `19:41 Stopped: Blocked. Waiting on you; the reason is shown at the top of this card.` | F§A.5.5; card Q-4 (`HH:mm verb body`, body verbatim) |
| cardpage | 15 | Attempt 1 p | `Stopped at 11:12 on 9 October. 9 events, no errors.` | `Sent back at 12:11 on 8 October. 9 events, no errors.` | F§A.5.4 |
| cardpage | 16 | `#qp-cost` dl Project | `None. <a href="#">Assign to a project</a>` | `Marketing & Community — Melissa and Anna onboarding · no milestone. <a href="#">Change project</a>` | F§A.4.5; Phone-Card-Quiet |
| cardpage | 17 | `#qp-cost` dl Attempts | `1: error-eric, $0.00, stopped. 2: error-eric, $0.00, stopped.` | `1: error-eric, $0.00, sent back. 2: error-eric, $0.00, stopped.` | F§A.5.4 |
| cardpage | 19 | `#qp-act` `Delete card` | `class="vk-button vk-button--secondary"` | ink outline `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; label `Delete card` | ONE-WORLD R5 / VK §3.5 |
| cardpage | 20 | (prop theme=dark) | same | same replacements | ONE-WORLD R1 |

## Group `states-phonecard`

Group `states-phonecard`. Artboards: SP-Card-States-{Daylight,Paper,Studio,Quiet} (panels A–F) and SP-Phone-Card-{Daylight,Paper,Studio,Quiet}.
Sources: EXPORT/*.html visible text, `.dc.html` with both `sc-if` branches resolved, card.md §3–§8 + vibe sections (D.4/D.5/D.7, P.5–P.7, 30.3–30.5, Q.3–Q.6), fixtures-and-harness §A, snapshots in `fixture/source/`, and ADDENDUM (binding).

Shell: none of these artboards draws a shell. Card-States runs in shell `bare`, and Phone-Card is a full-screen Sheet.

Panel data:
- A and E: R&I card `card_42269e99036f42ae`, live, pending gate, three buttons from DEFAULT_GATE_OPTIONS.
- B: Guild Operations & Automation card 1, with the optimizer-ollie question.
  - The Guild Ops snapshot stages are 1 Intake, 2 Shape, **3 Build**, 4 Review, 5 Done.
- C: card `card_e1eb201927f94506`, as drawn.
- D: Melissa, Thu 8 Oct 19:26.
- F: card 4605, **live**, loading. It stays as drawn.

Card 4605 is live and stopped (ADDENDUM 1). The Phone-Card default props stay `archived=false`, and the `archived` branch stays as a secondary variant. That branch needs no data fixes.

---

### SP-Card-States-Daylight.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| states | 1 | B `.ds-eyebrow` | `Developer Experience · Fix` | `Guild Operations & Automation · Build` | ADD 2, F§A.6.5 |
| states | 2 | B `h2#b-t` | `Superpipeline: manual-delivery completion and approval-subject hardening` | `Guild Operations & Automation fixture card 1` | ADD 2 |
| states | 3 | B `ol.ds-track` aria-label | `Stage 4 of 7, Fix, question pending` | `Stage 3 of 5, Build, question pending` | ADD 2, snapshot stages |
| states | 4 | B `ol.ds-track` items | 7 `li` (1–3 done, `4 · Fix` cur sig, 5, 6, 7) | `<li class="done" title="1 · Intake"><span class="bar"></span>1</li><li class="done" title="2 · Shape"><span class="bar"></span>2</li><li class="cur sig" aria-current="step"><span class="bar"></span>3 · Build</li><li title="4 · Review"><span class="bar"></span>4</li><li title="5 · Done"><span class="bar"></span>5</li>` | ADD 2 |
| states | 5 | B face (`data-mood="needs"`) | coder-kai face | regenerated vibekit Face for name `optimizer-ollie`, mood needs | ADD 2, F D12 |
| states | 6 | B `.ds-who` | `coder-kai · has a question` | `optimizer-ollie · has a question` | ADD 2 |
| states | 7 | B `.ds-say` | `The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?` | `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?` | ADD 2 |
| states | 8 | B `.ds-time` | `Today, 11:05` | `Today, 07:40` | ADD 2 (asked at state_since 02:10Z) |
| states | 9 | B textarea placeholder | `It goes straight back to coder-kai.` | `It goes straight back to optimizer-ollie.` | ADD 2, D.4.4 |
| states | 10 | D DoneBlock line | `Reached Resident on Fri 9 Oct, 19:26 · 5 attempts` | `Reached Resident on Thu 8 Oct, 19:26 · 5 attempts` | R1d |
| states | 11 | D `.ds-time` | `Fri 9 Oct, 19:26` | `Thu 8 Oct, 19:26` | R1d |
| states | 12 | E `h2` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)` | F§A.7.3 E = the A card (one card, one title), C-09 |

### SP-Card-States-Paper.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| states | 1 | A `.ps-voice` (gate summary) | `It’s ready for you to review. The exact version you would approve is enclosed.` | `All done, ready for your review.` | P-13 (vibes disagree on one gate; Daylight wins) |
| states | 2 | A subject `dl`, after Synthesis | Kind, Synthesis only | add `<div><dt>Sources</dt><dd>Organization plane cutover record, 7 Oct</dd></div>` | P-17 |
| states | 3 | B `h2#b-t` | `Re: Superpipeline: manual-delivery completion and approval-subject hardening` | `Re: Guild Operations & Automation fixture card 1` | ADD 2 |
| states | 4 | B `.ps-line` | `Developer Experience · Stage 4 of 7, Fix · A question` | `Guild Operations & Automation · Stage 3 of 5, Build · A question` | ADD 2 |
| states | 5 | B `.ps-voice` | the coder-kai question | `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?` | ADD 2 |
| states | 6 | B face svg aria-label and face | `coder-kai, needs you` | `optimizer-ollie, needs you` (Face regenerated) | ADD 2, D12 |
| states | 7 | B `.ps-sign .n` / `.ps-small` | `coder-kai` / `Today, 11:05` | `optimizer-ollie` / `Today, 07:40` | ADD 2 |
| states | 8 | B field label | `Your answer goes straight back to coder-kai` | `Your answer goes straight back to optimizer-ollie` | ADD 2 |
| states | 9 | D `role=status` line | `Friday 9 October, 19:26 · after 5 attempts` | `Thursday 8 October, 19:26 · after 5 attempts` | R1d |
| states | 10 | E `h2` | `Re: approval. P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’` | `Re: approval. P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)` | F§A.7.3 E |

### SP-Card-States-Studio.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| states | 1 | A `.ar-q blockquote` | `Ready for your review. Approve exactly the subject below.` | `All done, ready for your review.` | S-8 |
| states | 2 | A `table.ss-subj`, after the Synthesis row | no Sources row | `<tr><th>Sources</th><td>Organization plane cutover record, 7 Oct</td></tr>` (before Digest) | S-10 |
| states | 3 | B `.ss-bar` | `Developer Experience / Fix` | `Guild Operations & Automation / Build` | ADD 2 |
| states | 4 | B `h2#b-t` | `Superpipeline: manual-delivery completion and approval-subject hardening` | `Guild Operations & Automation fixture card 1` | ADD 2 |
| states | 5 | B `ol.ar-track` aria-label | `Stage 4 of 7, Fix, question pending` | `Stage 3 of 5, Build, question pending` | ADD 2 |
| states | 6 | B `ol.ar-track` items | 7 items, current `04 Fix` | `<li class="done" title="1 · Intake"><span class="b c1"></span><span>01<span class="sr"> Intake, done</span></span></li><li class="done" title="2 · Shape"><span class="b c2"></span><span>02<span class="sr"> Shape, done</span></span></li><li class="cur sig" aria-current="step" style="grid-column: span 2"><span class="b c3"></span><span>03 Build</span></li><li title="4 · Review"><span class="b c4"></span><span>04<span class="sr"> Review</span></span></li><li title="5 · Done"><span class="b c5"></span><span>05<span class="sr"> Done</span></span></li>` | ADD 2 |
| states | 7 | B quote face and aria-label | `coder-kai, needs you` | `optimizer-ollie, needs you` (Face regenerated) | ADD 2 |
| states | 8 | B quote h3 / time | `coder-kai · question pending` / `11:05` | `optimizer-ollie · question pending` / `07:40` | ADD 2 |
| states | 9 | B blockquote | the coder-kai question | `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?` | ADD 2 |
| states | 10 | B label | `Answer to coder-kai` | `Answer to optimizer-ollie` | ADD 2 |
| states | 11 | D figure | `Oct 9` / `Finished 19:26` | `Oct 8` / `Finished 19:26` | R1d |
| states | 12 | D kv Handed on | `Profile, router description, safe profile and portrait drafted. No posting, DMs or scheduling without separate operator authorisation.` | `Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation.` | S-8 (vibes disagree; Daylight wins), F§A.6.1 |
| states | 13 | E `h2#e-t` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)` | F§A.7.3 E |
| states | 14 | stylesheet `.ar-nav .ct` (no markup uses it) | `background: var(--sig); color: var(--sig-fg)` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` | VK §3.5 count badge |
| states | 15 | E `.ss-row` (after `<button class="ar-btn2" type="button">Request changes</button>`) | no Reject button (A has three) | append `<button class="ar-lk quiet" type="button">Reject</button>` (same markup as panel A) | O-1 (three buttons: Approve / Request changes / Reject), screens disagree A vs E |

### SP-Card-States-Quiet.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| states | 1 | A gate summary line | `research-ray: Waiting for your review.` | `research-ray: All done, ready for your review.` | Q-11 (summary verbatim; vibes disagree, Daylight wins) |
| states | 2 | A `dl.qs-dl`, after Synthesis | — | `<dt>Sources</dt><dd>Organization plane cutover record, 7 Oct</dd>` | Q-14 |
| states | 3 | B `h2#b-t` | `Superpipeline: manual-delivery completion and approval-subject hardening` | `Guild Operations & Automation fixture card 1` | ADD 2 |
| states | 4 | B `.qs-meta` | `Developer Experience · Stage 4 of 7: Fix · Agent: coder-kai · Asked at 11:05` | `Guild Operations & Automation · Stage 3 of 5: Build · Agent: optimizer-ollie · Asked at 07:40` | ADD 2 |
| states | 5 | B `.qs-by` (face and text) | `coder-kai asked:` | `optimizer-ollie asked:` (Face regenerated, mood needs) | ADD 2 |
| states | 6 | B question `p` | the coder-kai question | `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?` | ADD 2 |
| states | 7 | B label | `Your answer (it goes straight to coder-kai)` | `Your answer (it goes straight to optimizer-ollie)` | ADD 2 |
| states | 8 | D notice | `On Friday 9 October at 19:26, after 5 attempts.` | `On Thursday 8 October at 19:26, after 5 attempts.` | R1d |
| states | 9 | D dd Handed on | `Melissa is resident. Identity, router description, safe profile and portrait are drafted; you credentialed her at the resident gate. No posting, DMs or scheduling without separate operator authorisation.` | `Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation.` | Q-15 (vibes disagree), F§A.6.1 `handedOn` |
| states | 10 | E `h2` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’` | `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)` | F§A.7.3 E |

---

### SP-Phone-Card-Daylight.dc.html  (default props unchanged: `archived=false`)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-card | 1 | `.st` | `Unclaimed ·` + `<button class="atm">Assign to me</button>` | `Unclaimed` (button removed: the viewer owns the card) | card §8.2-1, D-18 |
| phone-card | 2 | `.dock` select `#resume-at`, options 3–7 | `<option value="test">3 · Failing test</option>` … `<option value="shipped">7 · Shipped</option>` | the same five options, each with `disabled` | card §8.2-2, §7.4, D-20 |
| phone-card | 3 | `.dock` textarea placeholder | `For example: event ids for one fresh DM to each agent are attached` | `For example: what you checked, and what the agent should look at next.` | card §8.2-6, D-6 |
| phone-card | 4 | Details › Where work goes › Project row | `<div><dt>Project</dt><dd>Marketing & Community — Melissa and Anna onboarding</dd></div>` | remove the row (the Project disclosure stays) | card §8.2-9, Q-28 |
| phone-card | 5 | `.sbtn.danger` (`Delete card…`, both branches) | `border-color: var(--vk-color-muted)` | `background: var(--vk-color-surface); color: var(--vk-color-text); border-color: transparent; box-shadow: inset 0 0 0 2px var(--vk-color-text)`. Label `Delete card…` unchanged. | VK §3.5 destructive |

### SP-Phone-Card-Paper.dc.html  (default props unchanged)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-card | 1 | `.sc` | `unclaimed` + `<button class="atm">Assign to me</button>` | `unclaimed` (button removed) | §8.2-1, P-19 |
| phone-card | 2 | `.reply` select options 3–7 | `3 · Failing test` … `7 · Shipped` enabled | the same five options, each with `disabled` | §8.2-2 (overrules P-24) |
| phone-card | 3 | The brief › Details › Project row (line 228) | `<div><dt>Project</dt><dd>Marketing & Community — Melissa and Anna onboarding</dd></div>` | remove the row (the h4 `Project` section stays) | §8.2-9 |
| phone-card | 4 | `.sbtn.danger` | `border-color: var(--vk-color-muted)` | ink outline as Daylight #5 | VK §3.5 |

### SP-Phone-Card-Studio.dc.html  (default props unchanged)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-card | 1 | `.pc-bar .clk` text / aria-label | `13:31 · midday` / `13:31, midday` | `13:51 · midday` / `13:51, midday` | ADD 2 (all clocks 13:51), SB G6 |
| phone-card | 2 | `.pc-srow` | `Unclaimed ·` + `<button class="ar-lk">Assign to me</button>` | `Unclaimed` (button removed) | §8.2-1, S-14 |
| phone-card | 3 | `.pc-cmd` select options 3–7 | `3 · Failing test` … `7 · Shipped` enabled | the same five options, each with `disabled` | §8.2-2 (overrules S-13) |
| phone-card | 4 | Spec pane › Details Project row (line 441) | `<div><dt>Project</dt><dd>Marketing & Community — Melissa and Anna onboarding</dd></div>` | remove the row (the h3 `Project` block stays) | §8.2-9 |
| phone-card | 5 | `.pc-foot` `Delete card…` (both branches) | `<button class="ar-lk quiet">Delete card…</button>` | `<button class="ar-btn2" type="button" style="background: transparent; border: 0; box-shadow: inset 0 0 0 2.5px var(--rule)">Delete card…</button>` | VK §3.5 destructive (Studio form) |
| phone-card | 6 | stylesheet `.ar-nav .ct` (unused) | `background: var(--sig); color: var(--sig-fg)` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` | VK §3.5 |

### SP-Phone-Card-Quiet.dc.html  (default props unchanged)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| phone-card | 1 | Details `Agent` dd | `error-eric (last run). Unclaimed: ` + `<button class="atm">Assign to me</button>` | `error-eric (last run). Unclaimed.` | §8.2-1, Q-20 |
| phone-card | 2 | Details `Priority` dd | `3` | `P3` | §8.2-5, Q-22 |
| phone-card | 3 | Details `Card id` dd | `card_05823a57e8224605` | `card_05823a57e8224605` + link-button `Copy` | Q-23 |
| phone-card | 4 | live `fieldset.fs` border | `border:2px solid var(--vk-color-text)` | `border:2px solid var(--vk-color-signal)` (live: a decision is needed now; the archived `.fs.ar` stays muted) | §8.2-4, Q-26 |
| phone-card | 5 | live `fieldset` select options 3–7 | `3 · Failing test` … `7 · Shipped` enabled | the same five options, each with `disabled` | §8.2-2 (overrules Q-19) |
| phone-card | 6 | Brief Project row (line 208) | `<div><dt>Project</dt><dd>Marketing & Community — Melissa and Anna onboarding</dd></div>` | remove the row (the `s-prj` section stays) | §8.2-9, Q-28 |
| phone-card | 7 | `.sbtn.danger` | `border-color: var(--vk-color-muted)` | ink outline as Daylight #5 | VK §3.5 |

---

## Group `shared-pages`

Revised per ADDENDUM.md:
- 4605 is live and stopped: the Developer Experience board has 7 live cards and 4 need you, and workspace attention is 4.
- Placeholder figures are kept as drawn. That applies to Projects `rollups=loaded` and Spend `data=with spend`.
- Face moods are kept as drawn.
- The visible "Revoke" label stays.
- Every table has a `Grp` column.

Read from the five `SP-*.dc.html` sources, covering every `sc-if` branch (vibe, `loaded/loading`, `zero/full`), and from the rendered default exports. All five draw the generic `vs-*` shell, which is replaced wholesale (SB §1.1, G1). The shell rows below therefore give only the per-artboard shell values.

These match the world and need no row:
- clock and dates;
- the ages 2d and 33h;
- every card title;
- the 58f8 detail (straight `'`) and the lower-case 1dfc detail;
- the 7 stages and 2 rules (C-12);
- project names, states, health and targets;
- "Milestones · none yet";
- labels (names, `var(--vk-mood-*)` colours, inferred);
- People (Rakesh Gangwar, You, RG, Owner);
- the forge host;
- $0.00 and "No caps set";
- short ids `#e10fb4`, `#9ac211`, `#ace250`;
- agents 1–15.

R5 sweep of all five files:
- The `rgb(…)` literals are only the generated face fills.
- There are no `#hex` colour literals and no danger token. `.mi-danger` is already ink.
- `.vs-bubble` and `.vs-scount` belong to the replaced shell.
- The page `.count-signal` rules are listed below.

---

### SP-Projects.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| shared | 1 | Daylight rail `.vs-atwork` (label, title, faces) | `2 at work`, title `research-ray and tester-tim are working now`, 2 faces | DX crew: faces tester-tim, coder-kai, error-eric (needs) + super-chotu (mood as drawn); `<b>4 agents</b>3 wait on you`; title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` (rail itself replaced by `dy-*`) | F C-07, SB §1.3.3, ADD §1 |
| shared | 2 | Daylight `.vs-bubble`, sr text | `3`, `, 3 need you` | `4`, `, 4 need you` | ADD §1 (attention 4), SB G4 |
| shared | 3 | Paper `.vs-msig` / sr | `(3)` / `, 3 need you` | `(4)` / ` need you` | ADD §1 |
| shared | 4 | Studio `.vs-scount` / aria-label | `3` / `Operate, 3 need you` | `4` / `Operate, 4 need you` | ADD §1 |
| shared | 5 | Quiet nav | `Operate (3 need you)` | `Operate (4 need you)` | ADD §1 |
| shared | 6 | Studio `.vs-stabs` counts | `List <span class="n">6</span>`, `Projects <span class="n">5</span>` | `List <span class="mono">7</span>`, `Projects <span class="mono">3</span>` | ADD §1, SB G12 |
| shared | 7 | CSS line 53 `.count-signal` (defined, unused here) | `background: var(--vk-color-signal); color: var(--vk-color-primary-fg)` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` | VK §3.5 |
| shared | 8 | CSS line 262 `[data-vibe="studio"] .count-signal` | `color: var(--vk-face-ink);` | `color: var(--vk-color-primary-fg);` | VK §3.5 |
| shared | 9 | Trash `.iconbtn` aria-label ×5 | `aria-label="Delete this project"` | `aria-label="Delete project {name}"` with each project's name (e.g. `Delete project SJL Active Portfolio`) | OL Projects markup, ONE-WORLD R5 (verb + object) |
| shared | 10 | Milestone form aria-label ×5 | `Add a milestone to project 0` … `project 4` | `Add a milestone to {project name}` | OL Projects markup |
| shared | 11 | (prop rollups=loaded) every `.t-meta` "as of" line ×5 | `as of 13:19`, `as of 13:19 · 1 overdue`, `as of 13:19 · incomplete (1 board did not answer)` | `as of 13:51`, `as of 13:51 · 1 overdue`, `as of 13:51 · incomplete (1 board did not answer)` (figures kept as drawn) | ADD §2 (all clocks 13:51), SB G6 |
| shared | 12 | Studio footer `.vs-sstatus` | `<span>5 projects</span><span>6 cards on this board</span><b>3 need you</b><span>synced 13:51</span>` | `5 projects` · `7 cards on this board` · `4 need you` (signal) · `synced 13:51`, right `⌘K commands` · `N new card` | ADD §1, SB §1.5.2, MAJ |

Per-vibe shell values (SP-Projects)

| Grp | vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|---|
| shared | daylight | `plan` | `projects` | `Developer Experience` | `projects` | `Projects group cards across boards. Filters don’t apply here.` | Operate count `4` (sr `, 4 need you`); crew `4 agents` / `3 wait on you` (tester-tim, coder-kai, error-eric + super-chotu); no Filter button |
| shared | paper | `plan` | `projects` | `Developer Experience` | `projects` | paperShowing `Projects group cards across boards. Filters don’t apply here.` | dateline `Sunday 11 October · in full daylight`; `Operate (4)`; `Change board`; `Search ⌘K`; `Write a new card`; no Filter |
| shared | studio | `plan` | `projects` | `Developer Experience` | `projects` | `Projects group cards across boards. Filters don’t apply here.` | kick `Superpipeline · projects`; tabs `Board` · `List 7` · `Projects 3`; `.ct` `4`; studioSubRight `null` (not drawn); status `5 projects`, `7 cards on this board`, `4 need you`, `synced 13:51` / right `⌘K commands`, `N new card` |
| shared | quiet | `plan` | `projects` | `Developer Experience` | `projects` | `Projects group cards across boards. Filters don’t apply here.` | `Operate (4 need you)`; `Board: Developer Experience — Change board`; `Live. Changes appear as they happen.`; `View: Board · List · Projects` |

---

### SP-Workspace-Agents.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| shared | 1 | Daylight rail `.vs-atwork` | `2 at work`, title `research-ray and tester-tim are working now` | `4 agents` / `3 wait on you`, faces tester-tim, coder-kai, error-eric + super-chotu, title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` | F C-07, ADD §1 |
| shared | 2 | Shell Operate count (all vibes: bubble / `(3)` / `.vs-scount` / Quiet) | `3`, `(3)`, `Operate, 3 need you`, `Operate (3 need you)` | `4`, `(4)`, `Operate, 4 need you`, `Operate (4 need you)` | ADD §1 |
| shared | 3 | Tab `Needs you` `.count-signal` | `3` | `4` | ADD §1 (attention 63ac, 4605, 58f8, 1dfc) |
| shared | 4 | CSS line 51 `.count-signal` | `background: var(--vk-color-signal)` | `background: var(--vk-color-signal-text)` (colour stays `var(--vk-color-primary-fg)`) | VK §3.5 |
| shared | 5 | CSS line 267 `[data-vibe="studio"] .count-signal` | `color: var(--vk-face-ink);` | `color: var(--vk-color-primary-fg);` | VK §3.5 |
| shared | 6 | Tab `Agents` count | `15` | `22` | F C-07 |
| shared | 7 | Tab `Capabilities` count | `12` | `19` | F C-07 |
| shared | 8 | `h2#agents-h` | `15 agents` | `22 agents` | F C-07 |
| shared | 9 | Legend item 3 | `edit, issue or revoke tokens, unlink, delete. (This used to be an unlabelled dash at the end of the row.)` | `edit, issue or revoke tokens, unlink, delete.` | OL WA-G8 |
| shared | 10 | `ul.alist`, after the chaos-charlie row | (ends at row 15) | append 7 rows, chaos-charlie markup, in order: `tester-tim` `testing` `2 tokens`; `error-eric` `diagnostics` `2 tokens`; `integration-ian` `integration` `2 tokens`; `api-alan` `api` `2 tokens`; `devops-dave` `release` `2 tokens`; `vulnerability-victor` `security-review` `2 tokens`; `message-melissa` `marketing` `1 token`. Each row: `Resting · nothing claimed`, `Linked to AgentPod`, menu `Actions for {name}`, `{n} token(s) in use`, `Token i · issued to {name} · Revoke`, `Unlink from AgentPod`, `Delete agent…` | F §A.4.2 N16–22, C-07 |
| shared | 11 | super-chotu `details.menu` (line 606) | `<details class="menu" open>` | `<details class="menu">` | F §A.7.4 / §B.2 steps (see conflicts) |
| shared | 12 | Edit-row picker `div.caps[aria-labelledby=ed-caps]` | 14 chips `research code writing planning analysis claim-check maintenance command security onboarding design resilience diagnostics testing` | 19 chips A–Z: `analysis`(pressed) `api` `claim-check`(pressed) `code` `command` `design` `diagnostics` `integration` `maintenance` `marketing` `onboarding` `planning` `release` `research` `resilience` `security` `security-review` `testing` `writing` | F §A.4.3, OL WA-G6 (registry order) |
| shared | 13 | New-agent picker `div.caps[aria-labelledby=na-caps]` | same 14 chips | same 19 chips, none pressed | F §A.4.3 |
| shared | 14 | Chip `command` in both pickers | normal chip | `data-unused` → `color: var(--vk-color-faint)` | OL WA-G13, world (no stage asks for `command`) |
| shared | 15 | Token-row `Revoke` buttons | `class="vk-button vk-button--quiet btn-sm"` | ink outline: `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; Studio `background: transparent; box-shadow: inset 0 0 0 2.5px var(--rule)`. The visible label `Revoke` stays | ONE-WORLD R5, VK §2.4/8, ADD §3 |
| shared | 16 | Studio footer `.vs-sstatus` | `<span>Workspace · Agents</span><b>3 need you</b><span>synced 13:51</span>` | `Workspace · Agents` · `4 need you` (signal) · `synced 13:51`, right `⌘K commands` · `N new card` | ADD §1, SB §1.5.2, MAJ |

Per-vibe shell values (SP-Workspace-Agents)

| Grp | vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|---|
| shared | daylight | `workspace` | `workspace` | `null` (no switcher) | `null` | `null` | Operate `4`; crew `4 agents` / `3 wait on you`; Live, Search ⌘K, New card |
| shared | paper | `workspace` | `workspace` | `null` → no `.mh-ed` row | `null` | `null` | dateline `Sunday 11 October · in full daylight`; `Operate (4)`; `Live · changes appear as they happen` |
| shared | studio | `workspace` | `workspace` | `null` (kick only) | `null` | `null` | kick `Superpipeline · workspace`; `.ct` `4`; status `Workspace · Agents`, `4 need you`, `synced 13:51` / right `⌘K commands`, `N new card` |
| shared | quiet | `workspace` | `workspace` | `null` → second `.qn-row` omitted | `null` | `null` | `Operate (4 need you)`; `Appearance`, `Dark theme`, `Rakesh Gangwar — Sign out` |

---

### SP-Workspace-Other.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| shared | 1 | Daylight rail `.vs-atwork` | `2 at work` | `4 agents` / `3 wait on you` (tester-tim, coder-kai, error-eric + super-chotu) | F C-07, ADD §1 |
| shared | 2 | Shell Operate count (all vibes) | `3` / `(3)` / `Operate, 3 need you` / `Operate (3 need you)` | `4` / `(4)` / `Operate, 4 need you` / `Operate (4 need you)` | ADD §1 |
| shared | 3 | CSS line 54 `.count-signal` | `background: var(--vk-color-signal)` | `background: var(--vk-color-signal-text)` | VK §3.5 |
| shared | 4 | CSS line 286 studio `.count-signal` | `color: var(--vk-face-ink);` | `color: var(--vk-color-primary-fg);` | VK §3.5 |
| shared | 5 | Tab counts | `Needs you 3`, `Agents 15`, `Capabilities 12` | `Needs you 4`, `Agents 22`, `Capabilities 19` | ADD §1, F C-07 |
| shared | 6 | Needs-you `h2#nt-h` count | `<span class="count-signal" …>3</span>` | `<span class="count-signal" …>4</span>` | ADD §1 |
| shared | 7 | Needs-you `<ol>` rows: order + new row | 1 AgentPod (33h), 2 Fix-highest (2d), 3 Superpipeline (33h) | oldest first: 1 `Fix the highest-severity blocker found in the clean-room journey` (Unowned, 2d); 2 **new** 4605 row; 3 `AgentPod: connector interface and generic effects ledger, state machine and executor` (33h); 4 `Superpipeline: manual-delivery completion and approval-subject hardening` (33h, resume form open) | OL WO-G3, F §A.5.2, ADD §1 |
| shared | 8 | New 4605 `li.nrow` (same markup as the AgentPod row) | — | chip `<span class="chip chip-signal">Blocked</span>`; title link `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop`; meta `Developer Experience · Reproduce · stopped and is waiting on you · 2d`; detail (clip(), collapsed) `not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, w…` + `Show all`; instruction `Read why it stopped, fix that, then resume it with a note the agent will read.`; actions `Resume` (primary, `aria-expanded="false"`) `Open` | ADD §1, OL WO content map (`metaLine`, `clip`), F §A.5.2 detail |
| shared | 9 | Connections `AgentPod fleet` `Linked` `<p>` | no `title` | `title="fleet_vibes"` | OL WO-G8, F §A.3 |
| shared | 10 | `h2#ct-h` | `12 capabilities` | `19 capabilities` | F C-07 |
| shared | 11 | Orphan note | `… so it lets him claim nothing.` | `… so it lets that agent claim nothing.` | OL WO-G10 |
| shared | 12 | Capabilities `<ul>`: insert 7 `.crow` rows (markup as `research`, `1 agent`, empty description, `<span class="chip chip-line" title="Nobody defined this — it turned up in use">inferred</span>` before `Implies…`) | 12 rows | 19 rows A–Z: analysis · **api** (api-alan) · claim-check · code · command · design · **diagnostics** (error-eric) · **integration** (integration-ian) · maintenance · **marketing** (message-melissa) · onboarding · planning · **release** (devops-dave) · research · resilience · security · **security-review** (vulnerability-victor) · **testing** (tester-tim) · writing | F §A.4.3, C-07, OL WO-G11 |
| shared | 13 | Face stacks (`.crow .stack`) | generator collisions (design shows another agent's face, planning repeats one) | each stack = faces generated from the holders' names: analysis predictor-paul + analyst-echo; claim-check analyst-echo; code optimizer-ollie + coder-kai; command super-chotu; design artistic-lyra; maintenance cleaner-cody; onboarding onboarding-olivia; planning strategy-sam + project-manager-pete + controller-casey; research research-ray; resilience chaos-charlie; security threat-hunter-theo; writing writer-quill; plus the 7 new rows' holders (moods as drawn) | OL WO-G11, F D12 |
| shared | 14 | Add-capability hint | `… a “similar to …” hint appears before you add it.` | `… a “similar to …” hint appears after you add it.` | OL WO-G2 |
| shared | 15 | Studio footer `.vs-sstatus` | `<span>Workspace</span><b>3 need you</b><span>synced 13:51</span>` | `Workspace` · `4 need you` · `synced 13:51`, right `⌘K commands` · `N new card` | ADD §1, SB §1.5.2, MAJ |

Per-vibe shell values (SP-Workspace-Other)

| Grp | vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|---|
| shared | daylight | `workspace` | `workspace` | `null` | `null` | `null` | Operate `4`; crew `4 agents` / `3 wait on you` |
| shared | paper | `workspace` | `workspace` | `null` (no `.mh-ed`) | `null` | `null` | dateline `Sunday 11 October · in full daylight`; `Operate (4)` |
| shared | studio | `workspace` | `workspace` | `null` | `null` | `null` | kick `Superpipeline · workspace`; `.ct` `4`; status `Workspace`, `4 need you`, `synced 13:51` / right `⌘K commands`, `N new card` |
| shared | quiet | `workspace` | `workspace` | `null` (second row omitted) | `null` | `null` | `Operate (4 need you)` |

---

### SP-Settings.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| shared | 1 | Daylight rail `.vs-atwork` | `2 at work` | `4 agents` / `3 wait on you` | F C-07, ADD §1 |
| shared | 2 | Shell Operate count (all vibes) | `3` / `(3)` / `Operate, 3 need you` / `Operate (3 need you)` | `4` / `(4)` / `Operate, 4 need you` / `Operate (4 need you)` | ADD §1 |
| shared | 3 | CSS line 51 / 271 `.count-signal` (unused here) | `background: var(--vk-color-signal)` / studio `color: var(--vk-face-ink)` | `background: var(--vk-color-signal-text)` / `color: var(--vk-color-primary-fg)` | VK §3.5 |
| shared | 4 | Pipeline `.sec-head` state | `<span class="unsaved state">[info]1 unsaved change</span>` | `<span class="saved state">[check]Saved</span>` | OL SE-G3 |
| shared | 5 | `Save pipeline` button | enabled | `disabled` | OL SE-G3 |
| shared | 6 | Stage 2 Reproduce summary count | `0 cards` | `1 card` (4605 live in reproduce; archived 4828 still excluded) | ADD §1, OL §5 `cardsPerStage` |
| shared | 7 | Open Reproduce body `.t-meta` | `0 cards here` | `1 card here` | ADD §1 |
| shared | 8 | `Remove stage` button (line 416) | `class="vk-button vk-button--quiet btn-sm"`, enabled | ink outline `background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)` (Studio `transparent` + `inset 0 0 0 2.5px var(--rule)`), `disabled` (the stage now holds a card); label `Remove stage` | ONE-WORLD R5, VK §2.4/8, OL §6 (disabled while the stage holds cards) |
| shared | 9 | Key `.code` `reproduce` wraps "reprodu/ce" | `.code { … overflow-wrap: anywhere; }` | add `.stage-body .code { overflow-wrap: normal; }` | OL SE-G10 |
| shared | 10 | `#gh-url` value | `…/webhooks/github?tenant=…` | `https://app.superpipeline.dev/v1/boards/brd_134a0ddb6d434478/webhooks/github?tenant=tnt_vibes` | F §A.3, OL SE-G1 |
| shared | 11 | Studio footer `.vs-sstatus` | `<span>Board settings · Developer Experience</span><span>6 cards</span><b>3 need you</b><span>synced 13:51</span>` | `Board settings · Developer Experience` · `7 cards` · `4 need you` · `synced 13:51`, right `⌘K commands` · `N new card` | ADD §1, OL SE-G13, MAJ |

Per-vibe shell values (SP-Settings)

| Grp | vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|---|
| shared | daylight | `plan` | `settings` | `Developer Experience` | `null` | `null` | Operate `4`; crew `4 agents` / `3 wait on you`; switcher `Developer Experience` |
| shared | paper | `plan` | `settings` | `Developer Experience` | `null` | `null` | dateline; `.mh-ed` title + `Change board`; `Search ⌘K`; `Write a new card`; `Operate (4)` |
| shared | studio | `plan` | `settings` | `Developer Experience` | `null` | `null` | kick `Superpipeline · settings`; `.ar-sw`; status `Board settings · Developer Experience`, `7 cards`, `4 need you`, `synced 13:51` / right `⌘K commands`, `N new card` |
| shared | quiet | `plan` | `settings` | `Developer Experience` | `null` | `null` | `Operate (4 need you)`; board row with `Change board`, Live, Search, New card |

---

### SP-Spend.dc.html

| Grp | # | Where (element / selector / nearby text) | Mockup shows now (exact string or value) | Replace with (exact) | Source |
|---|---|---|---|---|---|
| shared | 1 | Daylight rail `.vs-atwork` | `2 at work` | `4 agents` / `3 wait on you` | F C-07, ADD §1 |
| shared | 2 | Shell Operate count (all vibes) | `3` / `(3)` / `Operate, 3 need you` / `Operate (3 need you)` | `4` / `(4)` / `Operate, 4 need you` / `Operate (4 need you)` | ADD §1 |
| shared | 3 | CSS line 51 / 275 `.count-signal` (unused) | `background: var(--vk-color-signal)` / studio `color: var(--vk-face-ink)` | `background: var(--vk-color-signal-text)` / `color: var(--vk-color-primary-fg)` | VK §3.5 |
| shared | 4 | Budget caps label (both branches) | `Board cap, per 7 days` | `Board cap` | OL SN-G3 |
| shared | 5 | Board log (zero branch, and the full branch if it repeats the log): visible 8 rows | 22:50:12 digest · 22:50:12 `Notification: stuck 24h in Fix` · 22:25:12 digest · 22:25:12 `Notification: stuck 24h in Failing test` · 09:55:20 digest · 09:55:20 `Notification: stuck 48h in Reported` · 23:05:00 `Link added` · 23:04:59 `Card updated` | 22:50:12 digest · 22:50:12 Fix notification · 22:25:12 digest · 22:25:12 Failing-test notification · **`14:11:50` `Stale-card digest sent`** · **`14:11:50` `Notification: stuck 24h in Reproduce` + `<a class="t-meta">Diagnose Melissa and Anna…</a><button class="idchip" aria-label="Copy card id 05823a">#05823a</button>`** · 09:55:20 digest · 09:55:20 `Notification: stuck 48h in Reported` (Link added and Card updated drop below the fold) | ADD §1 (4605 stale notification 2026-10-10T14:11:50Z), SN-G4, SN-G8/G9 formulas |
| shared | 6 | Raw names, rows 2/4/6 | `notification cardId=card_e10fb4fe39a9467f` / `…card_9ac2116a050840df` / `…card_ace250c9c25342e4` | `notification cardId=card_e10fb4fe39a91dfc` / `notification cardId=card_9ac2116a050858f8` / `notification cardId=card_ace250c9c25363ac` | F D13 |
| shared | 7 | Raw names, insert after the 22:25:12 notification | — | `14:11:50 cards.stale_digest` and `14:11:50 notification cardId=card_05823a57e8224605` | ADD §1 |
| shared | 8 | Raw names, row `23:05:00` | `link.added` | `link.added to=card_482b4aa0bdd6481f · from=card_9ac2116a050858f8` | F §A.5.9 + `eventSummary` |
| shared | 9 | Raw names, row `23:04:59` | `card.updated` | `card.updated cardId=card_e10fb4fe39a91dfc` | F §A.5.9 |
| shared | 10 | Raw names, row `23:04:44` | `link.added` | `link.added to=card_482b4aa0bdd6481f · from=card_9ac2116a050858f8` | F §A.5.9 |
| shared | 11 | Raw names, row `23:04:43` notification | `notification cardId=card_482b4aa0bdd64c02` | `notification cardId=card_482b4aa0bdd6481f` | F D13 |
| shared | 12 | Raw names, row `23:04:43` card.moved | `card.moved cardId=card_482b4aa0bdd64c02 · to=test · from=reported` | `card.moved cardId=card_482b4aa0bdd6481f · to=test · from=reported` | F D13 |
| shared | 13 | Raw names, row `23:04:42` | `link.added` | `link.added to=card_691a65ff9894f83f · from=card_482b4aa0bdd6481f` | F §A.5.9 |
| shared | 14 | Raw names, row `23:04:35` | `card.created` | `card.created cardId=card_482b4aa0bdd6481f` | F §A.5.9 |
| shared | 15 | Raw list length (closed `details`) | 13 rows | 60 rows: append 45 `card.updated cardId=<id>` fillers, one every 10 min back from 2026-10-09 22:55:00, cycling the seven live DX ids (63ac, 58f8, 1dfc, f83f, 481f, 9ed9, 4605). This keeps "last 60 events" and "Show all 60 events" | F §A.5.9, ADD §1 |
| shared | 16 | Studio footer `.vs-sstatus` | `<span>Spend</span><b>3 need you</b><span>synced 13:51</span>` | `Spend` · `4 need you` · `synced 13:51`, right `⌘K commands` · `N new card` | ADD §1, SB §1.5.2, MAJ |

Per-vibe shell values (SP-Spend)

| Grp | vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|---|
| shared | daylight | `operate` | `spend` | `Developer Experience` | `null` | `null` | Operate pill current, count `4`; crew `4 agents` / `3 wait on you` |
| shared | paper | `operate` | `spend` | `Developer Experience` | `null` | `null` | dateline; `Operate (4)` current; `.mh-ed` title + `Change board`, `Search ⌘K`, `Write a new card` |
| shared | studio | `operate` | `spend` | `Developer Experience` | `null` | `null` | kick `Superpipeline · spend`; `.ct` `4`; status `Spend`, `4 need you`, `synced 13:51` / right `⌘K commands`, `N new card` |
| shared | quiet | `operate` | `spend` | `Developer Experience` | `null` | `null` | `Operate (4 need you)` current; board row |

---

## Group `dialogs`

Scope: SP-Dlg-NewCard, -Palette, -Appearance, -Move, -BoardSwitcher, -Reconnect. Checked: the export text, every `sc-if` prop branch (vibe ×4, theme ×2, Reconnect `state` ×2), and the embedded `<script type="text/x-dc">` data (Palette `data()`, Switcher `B`, Move `S`, leads/greet/hints).

The addendum makes card 4605 **live and stopped** (Reproduce, input-required, error-eric, P3, asked by super-chotu, "2 days"). The Developer Experience board therefore has 7 live cards and 4 that need you, and the Operate count is 4.

The dialogs draw their own third shell family (`dl-`/`pp-`/`st-`/`qt-` + `sh-b`, identical in all six files). The coordinator replaces it with the canonical `dy/mh/ar/qn` shell (SB G1). The rows below record its data and badge defects, and the per-artboard shell values.

### Common to all six files (backdrop `.bd`; Reconnect has it twice, in `silent` and in `expired`)

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | C1 | `.dl-rail .dl-work` (Daylight crew) | `2 at work` | shell `.dy-crew`: `<b>4 agents</b>3 wait on you`; faces tester-tim, coder-kai, error-eric (needs) + super-chotu (as drawn); title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work` | ADD §1, SB §1.3.3, F C-07 |
| dialogs | C2 | `.dl-bubble` (CSS l.36) + text | `background: var(--vk-color-signal); color: var(--vk-color-bg)`; `3`; aria `Operate, 3 need you` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` (as `.dy-count`); `4`; aria `Operate, 4 need you` | VK §3.5, ADD §1 |
| dialogs | C3 | Studio `[data-vibe="studio"] .bd .st-rail .st-count` (NewCard l.221, Palette l.218, Appearance l.270, Move l.220, Switcher l.222, Reconnect l.227) + text | `background: var(--vk-color-signal); … color: var(--vk-face-ink)`; `3`; aria `Operate, 3 need you` | `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` (as `.ar-nav .ct`); `4`; aria `Operate, 4 need you`; tip `Operate · 4 need you` | VK §3.5, ADD §1 |
| dialogs | C4 | base `.st-count` (CSS l.96) | signal-outline square | deleted with the shell (C3 is the Studio count) | VK §3.5, SB G1 |
| dialogs | C5 | Paper `.pp-count` / Quiet nav | `(3)` / `Operate (3 need you)` | `(4)` / `Operate (4 need you)` (the signal-text words stay) | ADD §1 |
| dialogs | C6 | Studio `footer.st-status` | `6 cards · 3 need you · synced 13:51` | `.ar-status` items `7 cards` · `4 need you` (signal) · `2 blocked` · `1 shipped` · `synced 13:51`; right `⌘K commands` · `N new card` | SB §4.2, ADD §1 |
| dialogs | C7 | Studio `.st-tabs` | `List 6` `Projects 3` | `List 7` `Projects 3` | ADD §1 |
| dialogs | C8 | greeting `.dl-greet` / `.pp-deck` / `.st-greet` / `.qt-greet` | `Good afternoon, Rakesh. 3 cards want you.` | `Good afternoon, Rakesh. 4 cards want you.` (Daylight: as the board's `sky` snippet; the other vibes use whatever their board layout draws) | ADD §1, SB §1.1 |
| dialogs | C9 | stand-in board, Reproduce lane `<div class="bd-lane bd-lane--slim"><div class="bd-slim"><span>Reproduce</span><small class="mono">0</small></div></div>` | a slim empty lane, `0` | a full lane: `<h3>Reproduce <small>1</small></h3><div class="bd-owner">diagnostics · error-eric</div>` + tile `data-needs="true"`: `<b>Diagnose Melissa and Anna Supermessage silence — trace actual failing hop</b>`, chips `Waiting on you` (`chip--needs`) `P3`, `.bd-who` = 24px error-eric face (mood `needs`) + `error-eric · stopped 2d · asked by super-chotu` | ADD §1 (4605 live), F§A.2 (2d), F§A.5.2 |
| dialogs | C10 | stand-in 63ac `.chips` | `P1` `clean-room` `evidence-required` `+2` | `P1` `clean-room` `evidence-required` `superpipeline` `+1` | MAJ (7/7 board/list/phone artboards), SB G8 |
| dialogs | C11 | stand-in 63ac `.bd-who` | `Unclaimed` `· due 2026-10-06` | `Unclaimed` `· due 2026-10-06` `· asked by super-chotu` | MAJ (board/list/phone artboards print it), F§A.5.2 |
| dialogs | C12 | stand-in 58f8 `.bd-who` | `tester-tim · stopped 33h` | `tester-tim · stopped 33h · asked by super-chotu` | MAJ (Board-Daylight etc.), F§A.5.2 |
| dialogs | C13 | `.bd-lanes` as a whole | a generic stand-in | if the coordinator swaps it for the vibe's real board body, then C9–C12 are absorbed into that | DLG §0.5 / D-10 |

No raw hex, `danger` token or red/green colour appears in any of the six files (checked by grep).

**Per-vibe shell values (NewCard, Palette, Appearance, Move and BoardSwitcher; route `/b/brd_134a0ddb6d434478`)**

| vibe | here | section | boardName | view | showing | other per-vibe shell text |
|---|---|---|---|---|---|---|
| daylight | plan | board | Developer Experience | board | `Showing all 7 cards` | `.dy-count` `4`; crew per C1; `Live`; `Search ⌘K`; `New card`; `Filter cards` `none on` |
| paper | plan | board | Developer Experience | board | paperShowing `Showing all 7 cards · 4 wait on you · 1 shipped` | dateline `Sunday 11 October · in full daylight`; `Operate (4)`; `Live · changes appear as they happen`; `Dark theme`; `Rakesh Gangwar ⌄`; `Write a new card`; `Filter cards · none on` |
| studio | plan | board | Developer Experience | board | `Showing all 7 cards` | kick `Superpipeline · board`; tabs `Board · List 7 · Projects 3`; `Filter cards none on`; subRight `The board at 13:51 · midday · Sunday 11 October`; status per C6; `.ct` `4` |
| quiet | plan | board | Developer Experience | board | `Showing all 7 cards` | `Operate (4 need you)`; `Board: **Developer Experience** — Change board`; `**Live.** Changes appear as they happen.`; `Filter cards (none on)`; `Dark theme`; `Rakesh Gangwar — Sign out` |

---

### SP-Dlg-NewCard.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | N1 | C1–C13 | — | apply | — |
| dialogs | N2 | `#nc-p` select options | `<option>No project</option>` only | `<option selected>No project</option>` followed by `Building in public — Marketing & Community flow`, `Guild — Forge workspaces and checkpoint recovery`, `Marketing & Community — Melissa and Anna onboarding`, `SJL Active Portfolio`, `SJL Operating Baseline` (closed select, so nothing visible changes) | F§A.4.5, DLG §1 |

### SP-Dlg-Palette.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | P1 | C1–C13 | — | apply | — |
| dialogs | P2 | `data()` Cards, after the 1dfc row | — | `card('Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', 'Reproduce · stopped 2d', true),` (meta from the title hash must come out as `#4605`, i.e. last 4 of `card_05823a57e8224605`. If the hash does not give it, set `meta: '#4605'` explicitly). Not visible with q=`agent`: the title and sub do not contain "agent", so the count stays `8 matches for “agent”` | ADD §1, F C-21, F§A.2 (2d) |
| dialogs | P3 | `data()` Boards (order, DX and R&I) | `board('Developer Experience', 6, 3, true), board('Client Quality', 2, 1), board('Guild Operations & Automation', 3, 1), board('Agent Onboarding', 20, 0), board('Editorial & Fact-Checking', 3, 0), board('Recurring Maintenance', 4, 0), board('Planning & Roadmap', 3, 0), board('Marketing & Community', 0, 0), board('Research & Intelligence', 0, 0), board('Production Releases', 0, 0), board('Reliability & Incident Response', 0, 0), board('superwitness canary', 0, 0)` | `board('Developer Experience', 7, 4, true), board('Research & Intelligence', 1, 1), board('Client Quality', 2, 1), board('Guild Operations & Automation', 3, 1), board('Agent Onboarding', 20, 0), board('Editorial & Fact-Checking', 3, 0), board('Recurring Maintenance', 4, 0), board('Planning & Roadmap', 3, 0), board('Production Releases', 0, 0), board('Reliability & Incident Response', 0, 0), board('Marketing & Community', 0, 0), board('superwitness canary', 0, 0)` | ADD §1–2, F§A.4.1, DLG D-18 |
| dialogs | P4 | `.pal-label` `<mark>{{it.hit}}</mark>` | an empty mark sliver after the agent names | render `<mark>` only when `hit` is non-empty | DLG D-9 |
| dialogs | P5 | (prop theme=dark) Account row | `act('Account', 'Dark theme', 'theme', 'moon', 'Switch')` | when `theme==='dark'`: `act('Account', 'Light theme', 'theme', 'sun', 'Switch')` | DLG §2 `otherThemeLabel` |
| dialogs | P6 | `.pal-ran` banner | `In the app this would now: …` | delete | DLG D-8 |

### SP-Dlg-Appearance.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | A1 | C1–C13 | — | apply | — |
| dialogs | A2 | (prop vibe=studio) `greet.studio` | `Midday, 13:20 · the board at a glance` | `Midday, 13:51 · the board at a glance` | DLG D-11, SB G6 |
| dialogs | A3 | Studio preview `.pv-ar-hero b` | `3` | `4` (`board.needs`) | ADD §1 |
| dialogs | A4 | Studio preview `.pv-ar-sm`, the stage-2 span `<u></u>` | an empty stage 2 | `<u><em data-k="n"></em></u>` | ADD §1 (4605 in Reproduce) |
| dialogs | A5 | Quiet preview `.pv-qt-g` | `Needs your decision (3)` | `Needs your decision (4)` | ADD §1 |

### SP-Dlg-Move.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | M1 | C1–C13 | — | apply | — |
| dialogs | M2 | script `S[1]` (Reproduce) count | `'Empty'` → row text `Empty` | `'1 card'` → `1 card` | ADD §1 |
| dialogs | M3 | script `S[1]` `then` (shown when Reproduce is picked) | `error-eric picks it up to reproduce it.` | `error-eric picks it up.` | DLG D-13 |

### SP-Dlg-BoardSwitcher.dc.html

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | S1 | C1–C13 | — | apply | — |
| dialogs | S2 | script `B` | `['Developer Experience', 6, 3, ''], ['Client Quality', 2, 1, 'Today'], ['Guild Operations & Automation', 3, 1, 'Today'], ['Agent Onboarding', 20, 0, 'Today'], ['Editorial & Fact-Checking', 3, 0, 'Yesterday'], ['Recurring Maintenance', 4, 0, 'Yesterday'], ['Planning & Roadmap', 3, 0, '3 days ago'], ['Production Releases', 0, 0, '4 days ago'], ['Reliability & Incident Response', 0, 0, 'Last week'], ['Marketing & Community', 0, 0, 'Last week'], ['Research & Intelligence', 0, 0, '2 weeks ago'], ['superwitness canary', 0, 0, '3 weeks ago']` | `['Developer Experience', 7, 4, ''], ['Research & Intelligence', 1, 1, 'Today'], ['Client Quality', 2, 1, 'Today'], ['Guild Operations & Automation', 3, 1, 'Today'], ['Agent Onboarding', 20, 0, 'Today'], ['Editorial & Fact-Checking', 3, 0, 'Yesterday'], ['Recurring Maintenance', 4, 0, 'Yesterday'], ['Planning & Roadmap', 3, 0, '3 days ago'], ['Production Releases', 0, 0, '4 days ago'], ['Reliability & Incident Response', 0, 0, 'Last week'], ['Marketing & Community', 0, 0, 'Last week'], ['superwitness canary', 0, 0, '3 weeks ago']` | ADD §1–2, F§A.4.1 |
| dialogs | S3 | DX row | `6 cards` / `3 need you` | `7 cards` / `4 need you` | ADD §1 |
| dialogs | S4 | `Needs you` header right | `5 cards` | `8 cards` (4+1+1+1+1) | ADD §1–2 |
| dialogs | S5 | new 2nd row in Needs you | — | `Research & Intelligence` / `1 card` / `1 needs you` / `Today` | ADD §2 |
| dialogs | S6 | `Everything else, last used first` header right; R&I row there | `9 boards`; `Research & Intelligence` / `No cards yet` / `2 weeks ago` | `8 boards`; that row removed | ADD §2 |
| dialogs | S7 | `.bs-acts` `Delete…` | a bare `Delete…` `.link` | `Delete board…`, ink outline (`background: var(--vk-color-surface); color: var(--vk-color-text); box-shadow: inset 0 0 0 2px var(--vk-color-text)`; Studio `transparent` + `inset 0 0 0 2.5px var(--vk-color-rule)`) | VK §0.5 / §2.4-8 |
| dialogs | S8 | `.bs-anchor` trigger copies | old `.dl-board` / `.pp-title`+`.pp-change` / `.st-crumb` "Superpipeline / …" / `.qt-board` (name not bold) | canonical raised `.bs-trigger`: `.dy-switch`; `h1.mh-title` + `.mh-change` `Change board`; `.ar-board` kick `Superpipeline · board` + `.ar-sw`; `.qn-board` `Board: <b>Developer Experience</b> — Change board` | SB §1.2–§1.6, G1 |
| dialogs | S9 | `.bs` left/top per vibe (124/84, 40/206, 104/74, 32/122) | measured on the old shell | re-measure on the canonical shell: `left = trigger.left`, `top = trigger.bottom + 8`; update DLG §6's ±1px e2e values to match | DLG §6, SB G1 |

### SP-Dlg-Reconnect.dc.html

The backdrop is the stopped, live 4605 drawer in the drawn stopped layout. Rows apply to both the `silent` and `expired` branches unless one is named.

| Grp | # | Where | Mockup shows now | Replace with | Source |
|---|---|---|---|---|---|
| dialogs | R1 | C1–C13 (both branches) | — | apply | — |
| dialogs | R2 | `.dr-head .eyebrow` | `Developer Experience · Failing test` | `Developer Experience · Reproduce` | F§A.5.2, BRIEF (backdrop 4605) |
| dialogs | R3 | `h2.dr-title` | `AgentPod: connector interface and generic effects ledger, state machine and executor` | `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` | F§A.5.2 |
| dialogs | R4 | `ol.vk-stages` | Reported `done`, Reproduce `done`, Failing test `stopped` | Reported `done`, Reproduce `stopped`, Failing test … Shipped plain | F§A.5.2 (stage reproduce) |
| dialogs | R5 | `.dr-lead` face | 32px tester-tim, aria `tester-tim, needs you` | 32px error-eric (mood `needs`), aria `error-eric, needs you` | F§A.5.4 (agent identity) |
| dialogs | R6 | `.dr-lead p` | `The Forge mirror of SuperJackfruitLabs/agentpod is read-only, so my push was refused. I need the writable repository URL and write access for tester-tim.` | `Not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs.` (first sentence of the stored detail, desktop lower-case per C-06 → `not reproduced…`; the `Read the full reason` link stays) | F§A.5.2 detail, SB G3 fallback, F C-06 |
| dialogs | R7 | `.dr-panel` label | `Note for tester-tim` | `Note for error-eric` | F§A.5.4 |
| dialogs | R8 | `.dr-note` value | `Writable URL is ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git; write access granted.` | empty, with placeholder `What changed, or what should error-eric do differently? It reads this.` (the Phone-Card-Daylight wording; this text is 58f8's, not 4605's) | card §8.2-6, F§A.7.4 (the typed note is 58f8's) |
| dialogs | R9 | `.dr-tl` History | `tester-tim stopped · 33h ago` / `tester-tim committed the red test 7a444f3a · 33h ago` (tester-tim faces) | `error-eric stopped · 2 days ago` / `error-eric was sent back: repro and observed missing · 2 days ago` (error-eric 24px faces, moods as drawn) | F§A.5.4 run_fx_4605_2 / _1, MAJ phone "Sent back: repro and observed missing" |
| dialogs | R10 | (state=expired) `.rc-back b` | the AgentPod title | `Diagnose Melissa and Anna Supermessage silence — trace actual failing hop` | BRIEF, DLG §5 |
| dialogs | R11 | (state=expired) `.rc-back` small | `Developer Experience · Failing test` | `Developer Experience · Reproduce` | F§A.5.2 |
| dialogs | R12 | (state=expired) `details` paragraph 1 | `… Nothing on the board changed while you were away.` | `Your sign-in with accounts.superjackfruit.com ended, so it could not be renewed in the background. Your place is saved: after you sign in, you come back here.` | DLG D-14 |
| dialogs | R13 | Studio `footer.st-status` | `6 cards · 3 need you · reconnecting…` | `.ar-status` items `7 cards` · `4 need you` (signal) · `2 blocked` · `1 shipped` · `synced 13:51`; right `⌘K commands` · `N new card` | SB §4.2, G13, ADD §1 |
| dialogs | R14 | Live element per vibe | `.dl-live[data-off]` / `.pp-live[data-off]` `Reconnecting…`; `.st-live` `● RECONNECTING…`; `.qt-live` `Reconnecting…` | canonical `.dy-live` / `.mh-live` (`<b>Reconnecting…</b>`) / `.ar-live` / `.qn-live`, text `Reconnecting…`, dot/square `--vk-color-faint` | SB G13 |
| dialogs | R15 | `.toast-wrap` per-vibe `top` (104/226/134/132) | measured on the old shell | re-measure to sit under each canonical top bar | DLG §5, SB G1 |
| dialogs | R16 | harness registry for this screen | `variants: ['card4605-live']` | no variant (the base world has 4605 live) | ADD §1 |

The Reconnect shell values are the same as the shared table above, plus Live `Reconnecting…` (R14).

---

---

# Part 2 — Shell replacement per shared artboard

Ruling: one shell per vibe (`SB G1` (c), operator ruling). Shared artboards and dialogs drop the generic shells they draw now and take the donor shell of their vibe, copied from the per-vibe artboards. Nothing in the content area moves because of this, except the top offset the donor shell gives it.

### Donor shells (copy from these, verbatim)

| Vibe | Donor markup | Donor CSS | Root / content wrapper |
|---|---|---|---|
| Daylight | `SP-Board-Daylight.dc.html` `nav.dy-rail` + `div.dy-main > div.vk-sky.dy-sky > header.dy-top` (+ `div.dy-sub` only when `view` ≠ null) | `dc:SP-Board-Daylight:19-20, 80-126` (`SB §1.3.2`) | `div.dy-app` → content after the sky |
| Paper | `SP-Board-Paper.dc.html` `header.mh` (`.mh-top`, `.mh-sections`, and `.mh-ed` only when `boardName` ≠ null) | `dc:SP-Board-Paper:20-65` (`SB §1.4`) | `.app > .main` |
| Studio | `SP-Board-Studio.dc.html` `div.ar.bd` grid: `nav.ar-rail` + `div.bd-body > header.ar-top` (+ `div.ar-sub` only when `view` ≠ null) + `footer.ar-status` | Annual base `dc:SP-Board-Studio:15-199` + grid `201-203` (`SB §1.5.1`, `§1.5.3`) | `.bd-body` |
| Quiet | `SP-Board-Quiet.dc.html` `div.sh-root > header.qn` (row 1; row 2 only when `boardName` ≠ null) | `dc:SP-Board-Quiet:19-43` (`SB §1.6`) | `main#content` |

### Delete from every shared artboard

- Page shells (SP-Board-Empty, SP-Projects, SP-Workspace-Agents, SP-Workspace-Other, SP-Settings, SP-Spend): every `vs-*` element and rule. That means `vs-drail`, `vs-dtop`, `vs-mast`, `vs-srail`, `vs-stop`, `vs-qbar` and the 42–51 other `vs-*` classes per file. The `.vs-srail` "workstation" rail is dead (`VK §0.4`).
  - These are the deltas that disappear (`SB G1`):
    - Daylight: 76px pills, a gradient top bar instead of `.vk-sky`, a separate Dark-theme rail button, and the "2 at work" crew.
    - Paper: masthead max-width 1280, Live in the edition row, a triple rule under sections.
    - Studio: crumb "Superpipeline" instead of "Superpipeline · <section>", a 32px status bar with padding 6px 40px, "Projects 5".
    - Quiet: bar max-width 1280, Filter/Search/New card right-aligned, a filled primary New card, the note on its own line, and mark icon `M4 7h10…`.
- Dialogs (all six SP-Dlg-*): the backdrop shells `sh-*`/`dl-*` (Daylight), `pp-*` (Paper), `st-*` (Studio) and `qt-*` (Quiet), plus the generic lane board `.bd-lanes`. The backdrop becomes the donor shell plus the real screen the dialog opens over, in the same vibe (`DLG §0.5`):
  - NewCard, Palette, Appearance, Move, BoardSwitcher: the corrected Developer Experience board body of `SP-Board-<Vibe>.dc.html`, with 7 cards including 4605 in Reproduce. It is still scrimmed and `inert`, and the pixel diff still masks outside `.dlg`.
  - Reconnect: the card drawer of 4605 (live, stopped) over the board, from the corrected `SP-Card-<Vibe>`.
- Studio content in every shared artboard: these files draw Studio as "square-cornered Daylight", not as Annual report (`VK §0.4`). The Studio file must restyle its content with the `.ar` base: `.ar-btn`, `.kick`, `.chip`, `.ar-tbl`, `.ar-facts`, Archivo/Azeret Mono/Newsreader, 2/2/4 radii, ink rules. Use the closest per-vibe Studio artboard as the pattern:
  - lists and tables: SP-List-Studio;
  - forms and stops: SP-Operate-Studio.

### Shell values every shared artboard passes (`SB §1.1`/`§1.2`)

Common to all of them:
- Operate count `4`, rendered per vibe:
  - Daylight `.dy-count` "4", with sr ", 4 need you";
  - Paper "(4)", with sr " need you";
  - Studio `.ct` "4", with aria-label "Operate, 4 need you" and tip "Operate · 4 need you";
  - Quiet "Operate (4 need you)".
- Account "Rakesh Gangwar" / "RG". Live connected. Theme toggle "Dark theme".
- Daylight crew `4 agents` / `3 wait on you`:
  - faces tester-tim, coder-kai and error-eric (needs), plus super-chotu, drawn as the mockups draw him (working on desktop);
  - title `tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work`.
  - This replaces every "2 at work · research-ray and tester-tim" (`F C-07`).
- Count badges: `background: var(--vk-color-signal-text); color: var(--vk-color-primary-fg)` (`VK §3.5`).

| Artboard | here | section (Studio kick "Superpipeline · …") | boardName | view | showing | Daylight crew | Studio status / sub-right |
|---|---|---|---|---|---|---|---|
| SP-Board-Empty | plan | board | `Production Releases` | board | `No cards on this board` | **hidden** (empty board, `SB §1.3.3`) | status `Production Releases` · `0 cards` · `4 need you` (signal) · `synced 13:51`; tabs `List 0` · `Projects 0` (`SB §6`) |
| SP-Projects | plan | projects | `Developer Experience` | projects (no Filter button) | per group fragment | DX crew | tabs `List 7` · `Projects 3` (`SB G12`) |
| SP-Workspace-Agents | workspace | workspace | null (no switcher, no second row in Paper/Quiet) | null | null | DX crew (`F C-07`) | per group fragment |
| SP-Workspace-Other | workspace | workspace | null | null | null | DX crew | per group fragment |
| SP-Settings | plan | settings | `Developer Experience` | null | null | DX crew | per group fragment |
| SP-Spend | operate | spend | `Developer Experience` | null | null | DX crew | per group fragment |
| SP-Dlg-* (backdrop) | plan | board | `Developer Experience` | board | `Showing all 7 cards` | DX crew | status as in SP-Board-Studio, corrected to `synced 13:51`; tabs `List 7` · `Projects 3` |

Each group section below gives any per-artboard shell values that differ from this table (the "Per-vibe shell values" sub-tables).

---

# Part 3 — Per-vibe split list

Every shared/prop-vibe artboard becomes one file per vibe, Daylight included. Rules for the split:
- Each file has no `vibe` prop. `data-vibe` is fixed, and every `sc-if isDaylight|isPaper|isStudio|isQuiet` branch is resolved: keep the file's own vibe and delete the other three.
- The `theme` prop stays. Other props stay only where listed below.
- `$preview` width is 1440. Height is re-measured after the shell swap; manifest `w×h` comes from the export's `<!-- size WxH -->` line (`F §B.7`).
- Each file is exported to `apps/web/e2e/reference/mockups/<File>.html`. The harness registry entry changes accordingly:
  - from one prop-vibe screen with `vibes: [all four]`
  - to four fixed-vibe screens, one per file.
  - This replaces the `<artboard>@<vibe>.<theme>.html` export scheme of `F §B.3.3`/`§B.7` and clears every `missing-reference` (`F D8`).
- The original prop-vibe file is deleted after its four children are exported, so no reference keeps the `vs-*` shell.

| Source (delete after split) | New files | Props kept |
|---|---|---|
| SP-Board-Empty.dc.html | SP-Board-Empty-Daylight, SP-Board-Empty-Paper, SP-Board-Empty-Studio, SP-Board-Empty-Quiet (`.dc.html`) | theme |
| SP-Projects.dc.html | SP-Projects-Daylight, SP-Projects-Paper, SP-Projects-Studio, SP-Projects-Quiet | theme, rollups (loaded figures corrected to world values, see SP-Projects table) |
| SP-Workspace-Agents.dc.html | SP-Workspace-Agents-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Workspace-Other.dc.html | SP-Workspace-Other-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Settings.dc.html | SP-Settings-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Spend.dc.html | SP-Spend-Daylight, -Paper, -Studio, -Quiet | theme (prop `data` removed with its "with spend" branch, R1e) |
| SP-Dlg-NewCard.dc.html | SP-Dlg-NewCard-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Dlg-Palette.dc.html | SP-Dlg-Palette-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Dlg-Appearance.dc.html | SP-Dlg-Appearance-Daylight, -Paper, -Studio, -Quiet | theme. Dark is a real export per file (`F §B.3.3`, `darkNeedsExport`). |
| SP-Dlg-Move.dc.html | SP-Dlg-Move-Daylight, -Paper, -Studio, -Quiet | theme |
| SP-Dlg-Reconnect.dc.html | SP-Dlg-Reconnect-Daylight, -Paper, -Studio, -Quiet | theme, state (silent / expired) |
| SP-Dlg-BoardSwitcher.dc.html | SP-Dlg-BoardSwitcher-Daylight, -Paper, -Studio, -Quiet | theme |

Total: 12 sources → 48 files. The reference set grows from 44 to 80 artboards (44 − 12 + 48).

---

# Part 4 — Fixture world additions

Add these to `fixtures-and-harness.md` §A, and to §A.10 where an API field is needed. Rule: design intent wins, so the fixture adapts to what the screens show.

## 4.1 World changes

| # | Change in `F` | Why |
|---|---|---|
| WC-1 | **Card 4605 is live and stopped.** `card_05823a57e8224605`: `archived_at=NULL`, `input-required` in `reproduce`, `state_since 2026-10-08T14:11:45Z` ("2 days"), needs_human = the 4605 detail, priority 3, queued by super-chotu, 2 runs by error-eric on Thu 8 Oct. Delete §A.7.1 `card4605-live`. Re-derive the Developer Experience counts: 7 live cards; 4 need you on the board and in workspace attention (63ac, 58f8, 1dfc, 4605); Operate count 4; crew "4 agents / 3 wait on you"; Studio "List 7"; Switcher DX "7 cards · 4 need you"; unread 19 (O-15). Fix §A.4.1, D13, C-08, C-20 and the `SB §7` counts. The archived state is shown only by Card-States panel C (`card_e1eb201927f94506`). | ruling 0, 2 |
| WC-2 | Delete §A.7.2 `card4605-desktop-*` and the D2 per-screen clocks. 4605's `spec_json` stores the phone keys and wording (O-4). Its references are the 5 snapshot rows, its project `prj_42ab5ec961104f65`, no links, no handoff. The registry drops `clock` and the 4605 `variants`. | ruling 1 |
| WC-3 | R&I `card_42269e99036f42ae` takes the panel-A fields of §A.7.3 into the base world: live, `recommendation`, input-required, `aps_fx_p4`, gate pending, `updated_at 2026-10-11T07:18:00Z`. The gate's `options_json` is **`DEFAULT_GATE_OPTIONS`** (3 buttons, O-1). §A.4.1 R&I becomes 1 live / 1 needs you / "Today". | ruling 3, O-1, O-6 |
| WC-4 | Delete the panel-B variant. Guild Ops card 1 gets the pending elicitation `elc_fx_guild1` from optimizer-ollie (stage `build`, created `2026-10-11T02:10:00Z`, question `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?`), with its run active and `needs_human_json` NULL. 1dfc keeps its base state. | ruling 3 |
| WC-5 | Delete the panel-D variant. Melissa finishes on Thu `2026-10-08T13:56:34.688Z`. | ruling 3 |
| WC-6 | Keep the Projects `loaded` placeholder rollups and the Spend `with spend` fulfilment as harness routes. The Projects `computedAt` is `2026-10-11T08:21:00Z` (13:51). | O-10 |
| WC-7 | §B.2: the 12 prop-vibe screens become 48 fixed-vibe screens (Part 3). §B.3.3's `@<vibe>` lookup and `missing-reference` handling for them go away. | split ruling |

## 4.2 Additions per group (values the world lacks; majority value of the artboards that show it)

### From `boards`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| `card_05823a57e8224605` live (ADD1 world change) | `archived_at=NULL`, `input-required` in `reproduce`; DX = 7 live cards / 4 need you; workspace attention 4 | SP-Board-Daylight / Paper / Studio (after revision); Operate count 4 on all five | — |
| `card_9ac2116a050858f8.needs_human_json.summary` (SB G3) | `Needs a writable Forge URL for agentpod.` | SP-Board-Studio, panel 02 + note 2 | SP-Phone-Board-Studio `Forge mirror is read-only; push refused. Needs a writable repository URL and station write access.` (G3: the desktop string is canonical) |
| `card_e10fb4fe39a91dfc.needs_human_json.summary` | `Missing commit ×2.` | SP-Board-Studio, panel 03 + note 3 | SP-Phone-Board-Studio `Handoff missing a commit, twice (after one automatic rework).`; SP-Phone-Board-Quiet `Stopped after two refused handoffs: …` |
| `card_05823a57e8224605.needs_human_json.summary` | `No fresh DM event to trace; needs one per agent.` | SP-Board-Studio, new panel 04 + note 4. The literal is on SP-CardPage-Paper (`Stopped. No fresh DM event to trace; needs one per agent.`) and SP-CardPage-Studio | SP-Card-Daylight / SP-CardPage-Daylight `No fresh DM event to trace. Needs one per agent.` (a tie of 2 vs 2; I chose the `;` form because it reads as one clause after "…tries:") |
| Production Releases `intro.lede` (G-06 / G11) | `It takes a release from **proposal to production** in five stages. **devops-dave** stages it, **vulnerability-victor** checks it, and **you** give the go or no-go before it is released.` | SP-Board-Empty (all 4 branches) | none |
| Production Releases `intro.composeHint` | `Say what you want released in a sentence; an agent drafts the brief.` | SP-Board-Empty | none |
| Production Releases `Stage.summary` ×5 | proposed `Someone writes up the release: what ships and why.` · staged `Stages the release. Picks up cards that need the release skill.` · checks `Runs the security review before anyone decides.` · go-no-go `An approval gate. One release at a time waits here for your yes or no.` · released `A person marks it live. The card is done.` | SP-Board-Empty | none |

### From `phone-boards`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| W0 · card 4605 live (ADDENDUM 1, `archived_at=NULL`) | 7th live DX card in `reproduce`, `input-required`, needs you | all four Phone-Boards after the rows above | all four Phone-Boards now (they omit it) |
| W1 · 58f8 `needs_human_json.summary` (SB G3 optional field; F§A.5.2 has none) | `Needs a writable Forge URL for agentpod.` | SP-Board-Studio; SP-Phone-Board-Studio once corrected | SP-Phone-Board-Studio now: `Forge mirror is read-only; push refused. Needs a writable repository URL and station write access.` (1:1 tie, settled by SB G3, desktop canonical) |
| W2 · 1dfc `needs_human_json.summary` | `Missing commit ×2.` | SP-Board-Studio; SP-Phone-Board-Studio once corrected | SP-Phone-Board-Studio now: `Handoff missing a commit, twice (after one automatic rework).` |

4605 gets no summary, because no board artboard shows one. The Studio phone row therefore uses the G3 fallback S4. If W1/W2 are rejected, Studio rows 11/12 also fall back to the first sentence: `Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access.` and `This stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit.`

### From `list-operate`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| `notifications` for card 4605, all `read=0`, user `usr_b19776fac3c94df4` | (1) `blocked`, body = the 4605 detail, `2026-10-08T14:11:46Z`. (2) `stale`, `Stuck 24h in Reproduce: not reproduced end-to-end: … (4605 detail). Next: resume it`, `2026-10-10T02:11:50Z`. (3) `stale`, same body, `2026-10-10T14:11:50Z` (newest, shown as "14:11"). This follows F's pattern for stopped cards: repeated "Stuck 24h" notices 12h apart (1dfc, 58f8). Unread total becomes 16 + 3 = **19**. Rows (1) and (2) are what make "Earlier reminders" real. | Operate-Daylight/Paper/Studio/Quiet (activity group, unread count) | none. All eight drew 16 before 4605 went live. |
| `cards.stale_notified_at` (4605) | `2026-10-10T14:11:50Z` | — | — |

### From `card-drawer`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| `cards.archived_at` for 4605 | NULL (live, stopped; ADDENDUM §1). DX now has 7 live cards and 4 need you. | all SP-Card-* backdrops after correction | §A.5.2 base (archived) |
| `cards.spec_json` for 4605 | The phone's keys and wording: description = PHONE-DESC, acceptanceCriteria = PHONE-CRIT, the 10 PHONE-SPEC fields (rework, requiredEvidence = the criteria array, messageMelissa, audienceAnna, context, latestConfirmedGrant, scope, accountsIssues, repository, routingRule), no plan. Not the snapshot's keys. | SP-Phone-Card-* (all 4); SP-Card-* after correction | snapshot `after_brd_134a…` (keys objective/targets/artifactRouting/accountsIssueInstruction) |
| `activities` run_fx_4605_2 seq 1 `action` | `'Started'` | SP-Phone-Card-* (4); SP-Card-Daylight/Studio after correction | none |
| `activities` run_fx_4605_1 seq 1 `action` | `'Sent back'` | SP-Phone-Card-* (4) | none |
| `activities` run_fx_4605_2 seq 14 | `type='response'`, `signal='stop'` (verb "Stopped", "0 errors" holds) | SP-Phone-Card-* (4); SP-Card-Daylight/Studio | none |
| run_fx_4605_1 attempt outcome | the word "sent back" (attempts list `Sent back: repro and observed missing`). The world has `outcome='completed'` + completion ok:false, so either derive the word or seed outcome `sent_back`. | SP-Phone-Card-* (4); all SP-Card-* after correction | none |
| `agents` error-eric `role` | `Diagnostics` (desktop) / `diagnostics` (phone) | SP-Card-Paper, SP-Phone-Card-Paper | none |
| `cards.handoff_json` for 4605 | NULL. The derived sentence `From Reported: queued by super-chotu on 8 Oct with the brief above. No earlier stage output.` | SP-Phone-Card-* (4); all SP-Card-* after correction | none |

### From `card-page`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| 4605 `archived_at` | NULL. The card is live, `input-required` in Reproduce (ADDENDUM 1) | all 4 CardPage (drawn live and stopped) | none |
| `agents.role` (API-5) for `agt_fx_error_eric` | `Diagnostics` | SP-Card-Paper and SP-CardPage-Paper (`Diagnostics, attempt 2`); SP-Phone-Card-Paper prints lower-case `diagnostics` | none |
| `activities.action` for the 4605 narrative rows (§A.5.5 has NULL) | run_fx_4605_2 seq 1: `Started`; run_fx_4605_1 seq 1: `Sent back`; run_fx_4605_2 seq 14: signal `stop`, which renders `Stopped` | the 4 Phone-Card artboards; now the 4 CardPage too | none |
| Attempt outcome word for run_fx_4605_1 (completed, `completion.ok=false`) | `sent back` | the 4 Phone-Card artboards; the CardPage run and cost rows | none |
| 4605 `spec_json` | phone keys and wording (DESC, 5 CRIT, `spec.groups` with the 10 DETAILS rows, plus `project`), stored as drawn on SP-Phone-Card-* | the 4 Phone-Card artboards; now the 4 CardPage | none |

### From `states-phonecard`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| Card 4605 live | `archived_at=NULL` (state input-required, reproduce, state_since 2026-10-08T14:11:45Z), per ADDENDUM 1 | Phone-Card ×4 (live default), Card-States F ×4 | none |
| Guild Ops card 1 elicitation | id `elc_fx_guild1`, agent `agt_fx_optimizer_ollie`, stage `build`, run = the card's single run (active), question `The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?`, options `[]`, status pending, `created_at='2026-10-11T02:10:00Z'` (07:40 IST) | Card-States B ×4 | none |
| 4605 activity verbs | `run_fx_4605_2` seq 1 `action='Started'`; seq 14 `signal='stop'` ("Stopped"); `run_fx_4605_1` seq 1 `action='Sent back'` | Phone-Card ×4 | none |
| 4605 attempt lines | run 1 outcome word "Sent back", `failure_reason='repro and observed missing'`; run 2 "Stopped", reason copy "waiting on you" | Phone-Card ×4 | none |
| 4605 grant owner | `cards.queued_grant_owner='usr_b19776fac3c94df4'` ("on Rakesh Gangwar's grant · 32 agents may be dispatched") | Phone-Card ×4 | none |
| 4605 `spec_json` | The phone keys and wording as drawn: `description`, `acceptanceCriteria` (5), no plan, `groups`, `rework`, `requiredEvidence` (= the criteria array), `messageMelissa`/`audienceAnna` (`matrixId` + onboarding card `card_f180b1627c594b41` / `card_fa51f3d3e5e94ace`), `context`, `latestConfirmedGrant`, `scope`, `accountsIssues`, `repository` (`SuperJackfruitLabs/atelier`, `private`, policy URL), `routingRule`. The values are the mockup text, each with its continuation behind "Show more". This replaces the snapshot spec. | Phone-Card ×4 | none (all four phones identical) |
| Card C `spec.description` | `Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent.` (mockup text; replaces the longer snapshot text) | Card-States C Daylight, Paper, Quiet | none (Studio C shows no description) |
| Agent role | `error-eric` role `diagnostics` (API-5) | Phone-Card-Paper | none |
| Gate option description | `gate_fx_p4` approve `description='File the recommendation as it is.'` (options = DEFAULT_GATE_OPTIONS) | Card-States Paper A, Quiet A | Paper shows "Needs a note; it threads into the next attempt." / "Stop here." where Quiet shows "Needs a note. The agent reads it on its next attempt." / "Stop the card here.". Only approve agrees and is added; the others are per-vibe role copy. |
| Gate summary | `gate_fx_p4` summary `All done, ready for your review.` (the producing run's response) | Card-States-Daylight A (all four after the fixes) | Paper, Studio and Quiet A before correction |

### From `shared-pages`
| Grp | Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|---|
| shared | DX `notifications` + `events` for 4605 | notification `kind='stale'`, card 4605, body `Stuck 24h in Reproduce: not reproduced end-to-end: … (4605 detail). Next: resume it`, created `2026-10-10T14:11:50Z`, `read=0`. Matching events at the same ts: `cards.stale_digest {"cardIds":["card_05823a57e8224605"]}` and `notification {"cardId":"card_05823a57e8224605","kind":"stale","body":…}`. The fillers drop from 47 to 45 so the log still holds 60 | SP-Spend (log) | none (no artboard draws a 4605 log row yet) |
| shared | `events.payload_json` of every `notification` event | add `"body"` = the matching §A.5.8 body (22:50:12Z 1dfc `Stuck 24h in Fix: …`, 22:25:12Z 58f8 `Stuck 24h in Failing test: …`, 09:55:20Z 63ac `Stuck 48h in Reported: …`, plus the 4605 row above), so the labels read `Notification: stuck 24h in Fix` etc. | SP-Spend | none |
| shared | Projects loaded-variant harness bodies (F §A.4.5 placeholder figures kept) | `computedAt='2026-10-11T08:21:00Z'` (13:51 IST), not 07:49Z | SP-Projects (rollups=loaded) | F §A.2 / §A.4.5 (13:19) |
| shared | Capability `command` board demand | `boardCount = 0` (no stage names it), so the chip is faint, the orphan note shows and "no board asks" applies | SP-Workspace-Agents, SP-Workspace-Other | OL WA fixture ("no chip is faint") |
| shared | Studio status right items | `⌘K commands`, `N new card` | SP-Board-Studio, SP-List-Studio, SP-Operate-Studio | the 5 shared artboards (no right side drawn) |

### From `dialogs`
| Field / record | Value added | Shown on (artboards) | Disagreeing artboards |
|---|---|---|---|
| Card 4605 live (ADD §1): DX = 7 live / 4 need you; Operate attention 4 | the derived values in C1–C9, P2–P3, A3–A5, M2 and S3–S4 | all six SP-Dlg-* | none |
| R&I `boards.updated_at` | `2026-10-11T07:18:00Z` (ADD §2) → `Today`, 2nd in Needs you | SP-Dlg-BoardSwitcher, SP-Dlg-Palette | none |
| Draft `drf_dx_01` (not in §A) | drafter super-chotu `agt_bb586732b807460c`, status ready, title `Fix the highest-severity blocker found in the clean-room journey`, stageKey `reported`, priority 1, labelIds `["lbl_0259a14014754f69","lbl_e9ccaacaa2f94509","lbl_8430ce51795447c3"]`, projectId null, brief = DLG §1 text. It is created by the screen steps, so the registry `SP-Dlg-NewCard` steps must run the DLG §1 recipe (type sentence, Draft brief, fulfil, due 2026-10-18), not just `press('n')` | SP-Dlg-NewCard | none |
| Palette Agents order (design intent beats data) | the palette must show `error-eric`, `tester-tim`, `devops-dave`, `vulnerability-victor` as drawn. The world's `GET /v1/agents` is `ORDER BY created_at ASC` (apps/api/src/db/catalog.ts:732), which starts research-ray, optimizer-ollie, writer-quill, strategy-sam. The fixture has to change: give these four the earliest `created_at`, or add a D-7 tie-break that yields them. Reordering created_at also changes the Workspace-Agents list order, so the coordinator must choose | SP-Dlg-Palette | SP-Workspace-Agents (list order follows created_at) |

---

# Appendix — spec conflicts noticed per group (resolution applied)

### `boards`
- **4605 archived (ADD1 applied: 4605 is live):**
  - F §A.4.1 (DX 6 cards / 3 need you), F §A.5.2 and SB §7 have 4605 archived.
  - SB §0.3, §1.2, §3.3, §4.1 and §4.2 fixture outputs ("Showing all 6 cards", "3 cards want you", "3 letters", "6 cards") all assume the archived 4605.
  - Every 6→7 and 3→4 derived value in these rows follows from the live card.
- **Face moods:** SB G5 and §3.3 `.dl-asked` rule super-chotu `resting`. The addendum keeps the drawn `working` faces, so G5 adapts and no mood rows are listed.
- **Daylight crew cap:**
  - Under SB §1.3.1 `crew.slice(0,3)`, the rail now shows tester-tim, coder-kai and error-eric only. Super-chotu stays in the count ("4 agents") and in the title, but not as a face.
  - If the coordinator wants super-chotu visible, the cap must become 4.
- **Tenant:** SB §0.2/§7 give `tnt_e080b7a2cc39469e`. F gives `tnt_vibes`. Fixture applied.
- **Card ids:**
  - SB §0.2 and §7 use the production ids (`card_9ac2116a050840df`, etc.).
  - F D13 re-keys them to `…58f8`, etc.
  - Fixture applied: the peek is on `card_9ac2116a050858f8`.
- **Agents:** SB §7 lists 15 agents with ids `agt_<name>`. F §A.4.2 has 22 agents with ids `agt_fx_<slug>`. Fixture applied (C-07).
- **Milestone:** SB §7 sets Fix-highest's milestone to `mls_84a0895ad61a4ec7`. F C-11 makes it NULL. Fixture applied.
- **Agent Onboarding `state_since`:**
  - SB §7 and F §A.6.1 give different values for Melissa, Anna, Lyra and Charlie.
  - Fixture applied. The visible ages are the same either way.
- **Stop summaries:** SB §7 stars the stop summaries as stored, but F §A.5.2 stores no `summary`. I listed them as additions; otherwise the G3 fallback (the first sentence of the detail) would rewrite the Studio panel.
- **Clock:** F D2 freezes Studio at 13:19. That rule is void; every Studio time reads 13:51.
- **Values the specs leave open:**
  - Quiet Credentialed `a person` comes from applying the SB §4.3 rule to both gate stages. G9 names only Resident.
  - The Empty Studio sub-right comes from the §1.5 formula; §6 is silent.
- **Unresolved: the Daylight greeting band on the empty board.** SB §2 passes `dlGreeting` for every Daylight board view. §6 and the mockup draw no band there. I recommend no band on an empty board.

### `phone-boards`
- shell-and-board §0.2/§7 use tenant `tnt_e080b7a2cc39469e` and the production card ids (`card_9ac2116a050840df` …, and §0.2 focuses that id). The fixture uses `tnt_vibes` and the re-keyed ids (F§A.5.2 / D13). The fixture is applied.
- shell-and-board §7 and §5 (counts 6/3, Reproduce empty, "Empty stages · 3", error-eric resting) assume 4605 is archived. ADDENDUM 1 makes it live: counts 7/4, Reproduce 1, 2 empty stages, error-eric needs. The ADDENDUM is applied. The §1.2 `showing`/`paperShowing` examples change the same way.
- shell-and-board §7 has `needsHuman.summary` (★) that F§A.5.2 lacks, so it is listed as W1/W2.
- shell-and-board §7 lists 15 agents and its Agent Onboarding `state_since` values differ. The fixture (22 agents, F§A.6.1) wins. This does not affect these artboards.
- §5.3 / F D2 give the Studio phone a 13:31 clock. That is void (R1), so the clock is 13:51.
- SB G10 ("verbatim … 'this stage …' as written") contradicts F C-06 (the phone applies sentenceCase). C-06 is applied (R2).
- F C-01 says the phones show "Priority 2" on 1dfc, but the current canvases already show none, so there is no row. SB G9 names only the Daylight/Quiet phones for the 1dfc "asked by", while F C-17 names all four, and all four show it, so it is corrected on all four.

### `list-operate`
- **List "wait on you" count.** ADDENDUM 1 says "List counts input-required only → 3 (OL C-20 formula)", and then "apply each spec's own formula". The OL List spec's own formula (LI-G1) is `needsCount = rows with an attention item`, and LI-G1 also turns the blocker row into "Waiting on you". I used OL: **4** (63ac, 4605, 58f8, 1dfc). Then the count, the four needs-styled rows and Studio "Needs 4" agree. If the coordinator wants 3, it must also drop the LI-G1 blocker-row rows (List-Daylight #13, Paper #4, Studio #11, Quiet #6) and set Studio Needs to 3. A count of 3 next to four rows marked "Waiting on you" would contradict itself.
- **4605 stale-notification wording.** ADDENDUM gives "Stuck 24h" for a notice at 2026-10-10T14:11:50Z, which is 48h after the stop. I kept "Stuck 24h" (F's 1dfc and 58f8 repeat 24h notices too). So Daylight, Paper and Quiet read "a day later" and Studio "24h later".
- **Studio selection.** F §A.7.4: List "row 2 selected" (J twice) and Operate "row 01 selected" (default index 0). With 4605 inserted, both selections land on 4605, so the mockup's highlight moves from AgentPod to 4605. The harness steps are unchanged.
- **58f8 detail quotes.** The OL TEXT-A note says "straight double quotes". F C-05 says curly. F applied; the Board artboards draw curly quotes.
- **Editorial blockers.** OL List fixture: one blocker. F §A.5.3 (from the Board artboards' "Blocked by 3 cards"): three. F applied.
- **Clock.** The OL Studio op-line formula is "HH:MM of now (UTC)", which would print 08:21. ADDENDUM 3 rules 13:51 local, so the implementation formats local time there. Activity times stay UTC.
- **Stale-line classification.** F's 63ac body lacks the phrase `nothing claims stage` that OL's `staleLine` looks for. Per ADDENDUM 3 the mockup ("Still unclaimed…") stays, and the OL rule adapts (key on the attention kind).
- **Daylight list sub-bar.** SB §1.3.1 puts `dy-note` right after Filter. OL puts the list toolbar right after Filter. I placed the note after `.sum`.
- **Studio List status.** SB §4.2 adds "2 blocked · 1 shipped" (one status per plan view, §2). The List mockup omits both. I applied SB.
- **Paper title.** On List and Operate the masthead title is `<p class="mh-title mh-title--sm">`, not SB §1.4's `<h1>`. No row; SB should state the non-board form.
- **Not visible, F applied:** SB §0.2 tenant `tnt_e080…` versus F `tnt_vibes`; OL's second code agent "devops-dave" versus F optimizer-ollie.

### `card-drawer`
- **Desktop record.** card.md §5, §7.1, D.6.1, P-7/P-31, S-19, Q-F1/Q-27 and fixtures §A.7.2 keep a desktop-only 4605. R1 voids them, so the base/phone-literal content is applied.
- **Ids and stage keys.** card.md §5 uses `brd_devx`, `usr_rakesh`, `agt_error_eric`, `failing-test` and `stateSince 2026-10-09T19:41+05:30`. The fixture overrules them: `brd_134a0ddb6d434478`, `usr_b19776fac3c94df4`, `agt_fx_error_eric`, `test`, `2026-10-08T14:11:45Z`.
- **Studio clock.** card.md §7.2 / S-1 puts the Studio drawer at 13:27. ONE-WORLD sets it to 13:51.
- **Required evidence wording.** D-26/P-32 fix the text `… listed under Things to prove.`, while S-18 makes the heading a parameter. Desktop Daylight, Studio and Quiet title the list "Acceptance criteria", so S-18 is applied there. Paper keeps "Things to prove".
- **Show more on desktop.** Q-17 truncates long values on phone only. The fixture now stores the phone text, so "Show more" on the Quiet desktop is kept as the phone draws it (D-21 and P-23 already clamp on desktop). Q-17 needs amending.
- **Resume placeholder.** card §8.2-6 / D-6 gives a shipped placeholder only for Daylight. The same sentence is applied to the Paper and Studio placeholders, which also name 4605's specifics (`14:05`). Each vibe may want its own copy.
- **Superseded rulings.** C-02, C-03, C-04 and C-18 are superseded: 4605 has no links, no related work, and no run-2 Read/Found rows. C-08 stays a correction: the backdrops show the live 7-card board.

### `card-page`
- card.md §5, §7.1, D.6.1, P.4 fixture, §30.2 fixture and Q-F1 describe a different desktop 4605: 3 criteria, a plan, 2 PR refs, 3 relates-links, project none, Fri 9 Oct runs, per-vibe brief wording, a handoff and related prior work. They conflict with one-world R1 (§A.7.2 void). The base-world content was applied, which settles D-25, P-7, S-19, Q-27 and C-02. C-03, C-04 and C-18 become moot because those rows are removed.
- card.md §5 uses ids `brd_devx`, `usr_rakesh`, `agt_error_eric`, stage `failing-test` and stateSince `2026-10-09T19:41+05:30`. The fixture ids and `2026-10-08T14:11:45Z` were applied.
- fixtures §A.5.5 sets `action=NULL`, but the phones print `Started` / `Sent back`. The phone wording stays, and the fixture adds the actions (ADDENDUM 3).
- card D.2.4, §30.2 and Q.2 expect an attempt outcome `sent_back`. The fixture has run 1 as `completed` with `completion.ok=false`, so the word has to be derived from that.
- Studio's `In Reproduce` figure stays `2 days` as drawn: the age comes from state_since (ADDENDUM 3). card S-2 / API-6 stageSince would give 3 days, so S-2 needs to adapt.
- The page has no zero-links form. The Daylight summary line becomes `5 references` (zero counts omitted, my extension of D.3.4's sub-task rule). Paper follows its phone: `no related cards … no related prior work`.

### `states-phonecard`
- S-11 rules "3 days" (`Math.round`). Per ADDENDUM and F D13 it stays "2 days", the age from state_since. No row.
- Q-18 rules a lower-case "not" on the phone. C-06 wins: the phone capitalises at render. No row.
- P-24, S-13 and Q-19 rule this stage and earlier only. Card §8.2-2 wins: all 7 stages are listed and stages 3–7 are disabled (rows above).
- D-6 says the pixel test injects the mockup placeholder. Card §8.2-6 makes this a design change, so the Daylight phone placeholder row is applied. Quiet, Paper and Studio phones have no example placeholder.
- §8.2-9 (drop the Project row) assumed the project is not a spec field. Under the addendum the fixture stores the phone keys, and Project is the card's own project, so dropping it is consistent.
- Studio 30.3 E draws only Approve and Request changes. The addendum forbids rows that add buttons, so Studio E is left as drawn even though it is the same gate as A. The card group should decide whether the E cell crops the options.
- S-15 counts `queuedGrant` entries prefixed `agt_`. The snapshot's 32 entries are all `prn_…`. Count principals instead (Quiet's rule) to get "32 agents".
- Melissa D: the card specs take the message from the last run's response activity and Handed on from `handoff.summary`. The world stores `handoff_json = {summary: "Melissa is resident…", handedOn: "Profile, … drafted through this pipeline. …"}` and no activity rows. So the message comes from `summary` and Handed on comes from `handedOn`.
- Card C gate status is spelled `canceled` in F§A.6.3 but `cancelled` in API-2/D-13/P-16. Use one spelling.
- Card-spec gallery ids (`card_states_*`, `brd_research`, `gat_states_*`, `usr_rakesh`, `agt_super_chotu`) and per-spec instants are overruled by the §A ids. The displayed day labels are unchanged.
- §8.2-3 (no signal on an archived card) inside the Phone-Card `archived` secondary variant is not corrected here. Per ADDENDUM only data fixes are kept in that branch; the card group decides whether to apply it.

### `shared-pages`
- OL WA-G1, WA-G6 and WO-G11 give 17 agents and 14 capabilities, all declared. F C-07 / §A.4.2–3 give 22 agents and 19 capabilities (7 inferred). Fixture applied.
- OL WA-G6 orders the picker by the seed's created_at, which is not alphabetical. F §A.4.3 makes created_at alphabetical. Fixture applied: the pickers are A–Z.
- OL WA's fixture has no faint chip, while WO says `command` has boardCount 0. Applied: `command` is faint, per WA-G13.
- OL WA's composite has super-chotu's menu open, but F §A.7.4 / §B.2 never open it. Fixture applied: the menu is closed. If the menu should stay open, add a third registry step instead.
- OL WA-G4 shows the token in full; F §A.7.4 keeps the masked dots. Fixture applied: no row.
- OL WO-G6 stores label colours as hex; F §A.4.4 stores `var(--vk-mood-*)`, as drawn. Fixture applied: no change.
- The OL WO, Projects, Settings and Spend fixture blocks (tenant `tnt_dev`, `usr_dev`, email, fleet id, `failing-test`, production card ids, the clock in UTC) are overruled by F §A.
- OL Projects (Studio tab "Projects 5", `app.projects.length`) conflicts with SB G12 ("Projects 3"). Shell value 3 applied.
- OL Settings §7 expects "Reproduce 0 cards". With 4605 live (ADD §1) it reads "1 card", and Remove stage is disabled. The archived 4828 still exercises the exclusion.
- OL WO's fixture lists exactly 3 needs-you rows (and the shell spec's attention count is 3). ADD §1 makes 4605 the fourth attention item. Its row text is derived from the WO formulas (`metaLine`, `clip`).
- `clip()` cuts the 4605 detail mid-word ("…model reply, w…"), because its first sentence is 456 characters, over the 240 limit. That is what the WO-G5 formula gives; the formula, not this row, should change if a word-boundary cut is wanted.
- F §A.5.9 notification payloads lack `body`, which OL SN-G4 needs. Listed as a world addition.
- OL Spend's fixture gives events 7 and 8 the payload `{}`. F §A.5.9 gives `{from,to,kind}` and `{cardId}`. Fixture applied to the raw rows. Row 8 now sits below the visible 8, so it needs no visible card cell.
- No artboard draws the Studio sub-right on the Projects view. I left it `null`; this is unresolved.

### `dialogs`
- DLG §0.6/§7 `tnt_dev`/`usr_rakesh` vs F§A.3 `tnt_vibes`/`usr_b19776fac3c94df4`. The fixture applies.
- DLG §7 stage key `failing-test` vs F `test`. The fixture applies.
- DLG §4/§7 stateSince 58f8/1dfc `2026-10-09T23:21:00Z` vs F `22:24:49.862Z`/`22:45:45.522Z`. The fixture applies; both give 33h.
- DLG §4 58f8 detail paraphrase vs F verbatim text. The fixture applies. It no longer shows: the Reconnect drawer is now 4605.
- DLG §7 1dfc "delegate coder-kai" vs F (agent from runs, SB G2). The fixture applies.
- DLG §7 63ac "+3 more (5 total)" vs F 4 label ids ("+1"). The fixture applies (C10).
- DLG §7 / D-7 agent API order vs F§A.4.2 created_at order. Design intent kept; this needs a fixture change (see additions).
- DLG §7 board `lastActivityAt` values vs F§A.4.1 `updated_at`. The fixture applies; the labels are unchanged except R&I.
- DLG §3/§7 counts: needs 3, 6 cards, 4605 archived; DLG §6 "5 cards" vs ADD §1–2 (DX 7 / 4, Needs you 8 cards). The addendum applies.
- DLG §2 card sub formula `stopped ${floor(ageHours)}h` would print `stopped 66h` for 4605 vs F§A.2's rendering rule ("2d" over 48h). The F§A.2 rule is used (`stopped 2d`).
- DLG §5 Reconnect route and fixture needs (58f8 drawer, typed note) vs F registry C4605 + BRIEF. 4605 (live, stopped) applies (R2–R11).
- DLG §6 anchor values and §5 toast tops were measured on the dialogs' own dl/pp/st/qt shell, which SB G1 replaces. They must be re-measured (S9, R15).
- SB G1 says the dialogs use `vs-*`. They actually use a third family (`dl-`/`pp-`/`st-`/`qt-`). The G1 ruling applies all the same.
- DLG D-11 Studio "13:20" vs clock 13:51. 13:51 applies (A2).
