# Vibes sweep — fixture world and pixel-diff harness

Group: `fixtures-and-harness`. Covers (A) the one data world every Superpipeline artboard renders, how it is seeded and how the clock is frozen, and (B) the pixel-diff harness under `apps/web/e2e/pixel/` that compares the running app against the 44 reference artboards in every vibe and theme.

Everything here is binding on the other screen specs. Where another screen spec needs a record, it takes it from §A. If it needs a record §A lacks, it adds a row to §A.10 (Gaps). It never invents a second value for the same field.

---

## 0. Decisions in one page

| # | Decision |
|---|---|
| D1 | **Frozen clock: `2026-10-11T13:51:00+05:30` (= `2026-10-11T08:21:00Z`), browser time zone `Asia/Kolkata`.** The evidence is in §A.2. **Correction for the List writer:** `13:51Z` is wrong. At 13:51 UTC the AgentPod card would read "39h", not the "33h" every artboard shows, and the stopped time of card 4605 would not fall at 19:41 local. All specs use the IST instant. The UTC clock times that Operate and Spend show ("22:50 UTC") come from the same instant, rendered in UTC on purpose. |
| D2 | Some Studio artboards print a different wall-clock time (13:19 on desktop board, list and operate; 13:27 on the card; 13:31 on the phone board). The harness therefore freezes the clock per screen (registry field `clock`, §B.2). Every relative value in §A comes out the same at 13:19, 13:27, 13:31 and 13:51, as checked in §A.2. |
| D3 | The world is the real production capture of 10–11 Oct 2026 (board snapshots `after_brd_*.json`, copied into the repo at `apps/web/e2e/pixel/fixture/source/`, §A.1). Where an artboard shows a literal value, that literal wins and §A records it. |
| D4 | Some artboards show the same record in a different state (the stopped card 4605 un-archived, the six Card-States panels, the typed resume note). These are **screen variants**, overlays applied after the base world (§A.7). A variant may change any field, but only for the screen that names it. |
| D5 | Some artboards contradict each other, or contradict themselves, in ways no single world can satisfy (for example, the Workspace header says tester-tim is working while the same page lists 15 agents without him). For these, the base world follows product truth, the losing artboard gets a **reference correction** (§A.8) to be fixed on the canvas and re-exported (§B.7), and until then the harness **masks** the contradicting region, citing the conflict ID (§B.5). |
| D6 | Seeding uses a dev-only import route, `POST /v1/dev/fixture`. It writes the D1 catalog and every board Durable Object (DO) from one `World` JSON. A `.sql` file cannot do this: cards, runs, gates and the rest live in per-board DO SQLite, which D1 SQL cannot reach, and the public API stamps `Date.now()` on everything (§A.9). |
| D7 | Isolation: the fixture lives in its own tenant, `tnt_vibes`, as user `usr_b19776fac3c94df4` (Rakesh Gangwar). The web client gets a dev-only tenant and user override (§A.9.4), so the pixel suite never touches `tnt_dev`, which the other 19 e2e specs use. |
| D8 | References come from the canvas export in **light, Daylight-vibe default props only**. The harness derives dark references by attribute swap plus a small per-artboard patch list (§B.3.3). Two artboards need a real dark export (Appearance; plus the Daylight sun/moon icon, which is patched). Artboards whose vibe is a prop (shared screens, dialogs, Empty board) have **no reference for Paper/Studio/Quiet** until those are exported (§B.7). The harness reports them as `missing-reference`, not as passes. |
| D9 | Both sides use **byte-identical font files**: the reference page's Google Fonts requests are blocked, and `@font-face` rules generated from the app's own Fontsource packages are injected, under the family names the mockups use (§B.3.2). |
| D10 | Thresholds: per-pixel YIQ threshold `0.1`, anti-aliasing excluded. A screen passes when the diff ratio is ≤ `0.5%` **and** no 8×8 block has more than 40% of its pixels differing (structural check). Size mismatch fails outright (§B.5). |
| D11 | Baselines are references rendered in the same CI Chromium as the app at the same moment. No platform baselines are stored. **Confirmed (§B.8).** |
| D12 | Faces are seeded from **agent names**, as the mockups did. The fixture's agent IDs carry no visual meaning. The `name` column must be the exact slug the mockup prints (`tester-tim`, not `Tester Tim`). |
| D13 | **Canonical values (coordinator reconciliation, binding on every screen spec):**<br>• Clock `2026-10-11T08:21:00Z`, time zone `Asia/Kolkata` (13:51 local). The List spec's `13:51Z` is overruled. Its `stateSince` values are replaced by §A.5.2's, which make the ages read "33h" (58f8, 1dfc, 481f), "2d" (63ac, f83f), "2 days" (4605) and "1d" (9ed9).<br>• Faces are seeded from agent names (D12).<br>• Card ids end in the 4 hex chars the mockups print: `…4605`, `…58f8`, `…1dfc`, `…63ac`, `…f83f`, `…481f`, `…9ed9`.<br>• The Failing-test stage key is `test`. |

---

# Part A — The fixture world

## A.1 Sources

1. The 44 reference artboards (`apps/web/e2e/reference/mockups/*.html`) and their editable sources (`…/vibes-mockups/project/SP-*.dc.html`). The visible text was extracted from each and read end to end. The data embedded in the dialog scripts (Board switcher list `B`, Move dialog stages `S`, Palette `data()`) was read from the `<script type="text/x-dc">` blocks.
2. Real board snapshots, `GET /v1/boards/:id` for all 12 boards, captured 2026-10-10 05:54Z (`after_brd_<id>.json`). Already copied (untracked) to `apps/web/e2e/pixel/fixture/source/after_brd_<id>.json` in the plan worktree; commit them with the harness.
   Only these fields are read from them: stage arrays (key, name, order, ownerKind, owner, gate, wipLimit, requires, completion, returnStage), card `id`, `title`, `createdAt`, `contextId`, `queuedBy`, `queuedByAgentId`, `queuedGrant`, `spec`, and reference rows. Everything else comes from §A.4–A.7, which override the snapshot.
3. Schema: D1 migrations `apps/api/migrations/0001…0017` and the Board DO's `CREATE TABLE` and `ALTER TABLE` statements in `apps/api/src/board/board-do.ts`, lines 1606–2253 at `origin/main` 1a4dc22.

## A.2 Clock, time zone and sun phase

**Instant.** `NOW = 2026-10-11T08:21:00.000Z`, displayed in `Asia/Kolkata` as Sunday 11 October, 13:51.

Proof that it is IST and not UTC (each age is computed by the app as now minus `stateSince`):

| Record | stateSince (UTC) | Age at 08:21Z | Mockup shows | Age if NOW were 13:51Z |
|---|---|---|---|---|
| AgentPod card `…58f8` | 2026-10-09T22:24:49Z | 1d 9h56m → **33h** | "33h", "33 hours ago" | 39h ✗ |
| Manual-delivery `…1dfc` | 2026-10-09T22:45:45Z | 1d 9h35m → **33h** | "33h" | 39h ✗ |
| Fix-highest `…63ac` | 2026-10-08T09:51:01Z | 2d 22h → **2d** | "2d", "2 days" | 3d ✗ |
| Card 4605 `…4605` | 2026-10-08T14:11:45Z | 2d 18h → **2 days** | "Waiting on you · 2 days" | 3d ✗ |
| Build immutable `…9ed9` | 2026-10-09T22:19:24Z | 1d 10h → **1d / yesterday** | "Done · 1d ago", "Done yesterday" | 1d |
| 4605's stop, local | 14:11:45Z = **19:41 IST** Thu 8 Oct | — | "Thursday 8 October, 19:41" (phone) | 14:11 ✗ |

**Rendering rule.** Relative ages floor to the largest unit: under 48h they show as hours ("33h"), otherwise as days ("2d"). The board, list and operate specs own that formula. This table only fixes the inputs.

**Per-screen wall clock (D2).** The registry gives each screen a `clock`. Ages were re-checked at each override and are unchanged:

| Screens | `clock` (IST) | UTC |
|---|---|---|
| SP-Board-Studio, SP-List-Studio, SP-Operate-Studio ("13:19", "synced 13:19") | 13:19:00 | 07:49:00Z |
| SP-Card-Studio ("13:27 · midday") | 13:27:00 | 07:57:00Z |
| SP-Phone-Board-Studio ("13:31 · midday") | 13:31:00 | 08:01:00Z |
| SP-Projects in its *loaded* variant ("as of 13:19"). Not the captured default. | 13:19:00 | 07:49:00Z |
| All other screens ("synced 13:51") | 13:51:00 | 08:21:00Z |

**Sun phase.** HEAD_SCRIPT computes `x = h*60+m = 831` (or 799, 807, 811 for the overrides). That lands in `648 ≤ x < 990`, so `data-phase="noon"` on every screen. Each vibe prints it as follows:
- Daylight: `data-phase="noon"`, sky = noon tokens. The title reads "Appearance · noon" or "the sky follows the time of day", and the greeting says "Good afternoon".
- Paper: "Sunday 11 October · in full daylight".
- Studio: "midday".
- Quiet: no phase (`data-time="off"` by vibe default).

**Appearance cookie per screen** (`vk_appearance=<vibe>.<theme>.<strength>.<loc>`):
- Light: `<vibe>.light.<strength>.0`.
- Dark: `<vibe>.dark.<strength>.0`.
- `strength`: Daylight board, card, list, operate and phone artboards carry no `data-time` (vibekit default `strong`), so `strong`. Shared artboards (Projects, Workspace, Settings, Spend) carry `data-time="subtle"`, so `subtle`. Quiet uses `off`. Paper and Studio use `strong`, but sky strength has no visual effect in those vibes.
- `theme` is `light`, not `sun`, so that dark screens can be forced. At noon `sun` would resolve to light anyway.

## A.3 Identity

| Table | Row |
|---|---|
| `tenants` | `id='tnt_vibes'`, `slug='vibes-fixture'`, `name='SuperJackfruit Labs'`, `forge_host='forge.superjackfruit.com'`, `external_id='fleet_vibes'`, `external_source='agentpod'`. The Connections tab shows "AgentPod fleet · Linked" and the Forge host. |
| `users` | `id='usr_b19776fac3c94df4'`, `email='rakesh@vibes-fixture.invalid'`, `name='Rakesh Gangwar'`, `external_id=NULL`, `external_source=NULL`. The real email address is never written into the fixture. |
| `memberships` | `id='mbr_vibes_rakesh'`, `tenant_id='tnt_vibes'`, `user_id='usr_b19776fac3c94df4'`, `role='owner'` (People tab: "Owner", 1 person). |

Initials "RG" and "You" are derived by the client from `users.name` and from matching the signed-in user.

## A.4 Catalog (D1)

### A.4.1 Boards (`boards`)

`id`, `name` and `stages_json` (identical to the DO's `meta.stages`) come from §A.5/§A.6. `created_by='usr_b19776fac3c94df4'`, `created_by_agent_id=NULL`, `created_at='2026-09-01T04:00:00Z'`.

`updated_at` is the input for the Board switcher's "last used" column. The switcher spec owns the label; this is the value.

| Order in switcher | id | name | live cards | need you | `updated_at` (UTC) | Switcher shows |
|---|---|---|---|---|---|---|
| 1 | `brd_134a0ddb6d434478` | Developer Experience | 6 | 3 | 2026-10-11T08:20:00Z | (here) |
| 2 | `brd_6c298ec02d6b466b` | Client Quality | 2 | 1 | 2026-10-11T03:30:00Z | Today |
| 3 | `brd_af3fde184dd84d90` | Guild Operations & Automation | 3 | 1 | 2026-10-11T02:10:00Z | Today |
| 4 | `brd_f47143722126442c` | Agent Onboarding | 20 | 0 | 2026-10-11T01:00:00Z | Today |
| 5 | `brd_6a899b0f0d054046` | Editorial & Fact-Checking | 3 | 0 | 2026-10-10T06:00:00Z | Yesterday |
| 6 | `brd_24280cb0c7614d36` | Recurring Maintenance | 4 | 0 | 2026-10-10T04:00:00Z | Yesterday |
| 7 | `brd_0435b5ea3d4d4e44` | Planning & Roadmap | 3 | 0 | 2026-10-08T06:00:00Z | 3 days ago |
| 8 | `brd_2441b5578f704b93` | Production Releases | 0 | 0 | 2026-10-07T06:00:00Z | 4 days ago |
| 9 | `brd_c13e29c2e7e940fa` | Reliability & Incident Response | 0 | 0 | 2026-10-03T06:00:00Z | Last week |
| 10 | `brd_e247f164e060443f` | Marketing & Community | 0 | 0 | 2026-10-02T06:00:00Z | Last week |
| 11 | `brd_fa33a0a0721d4d18` | Research & Intelligence | 0 | 0 | 2026-09-26T06:00:00Z | 2 weeks ago |
| 12 | `brd_511653e16d5e4689` | superwitness canary | 0 | 0 | 2026-09-19T06:00:00Z | 3 weeks ago |

"Need you" counts cards with `state='input-required'`, plus cards in a human-owned stage with no claim, on that board. The single Client Quality card and the single Guild Ops card that need you went `input-required` today, under 24h ago. They are therefore **not stale**, and the workspace-wide Needs-you tab (`/v1/stale?attention=1`, "across every board 3") correctly lists only the three Developer Experience cards. This reconciles the Switcher (5 cards need you across boards) with the Workspace tab (3). It is not a conflict.

### A.4.2 Agents (`agents`) and tokens (`agent_tokens`)

All rows: `tenant_id='tnt_vibes'`, `connection_json='["rest"]'`, `concurrency=1`, `status='offline'`, `owner_user_id='usr_b19776fac3c94df4'`, `may_queue_to_json=NULL` (super-chotu: `'["brd_134a0ddb6d434478","brd_f47143722126442c","brd_e247f164e060443f","brd_fa33a0a0721d4d18"]'`), `queue_ceiling_per_hour=20`, `board_ceiling_per_day=3`, `external_source='agentpod'`, `icon_url=NULL` (generated face, seeded by name, D12).

`created_at` gives the list order on the Agents tab. It is `2026-09-01T05:00:00Z` plus N minutes, where N is the row number below.

| N | id | name | capabilities_json | external_id | tokens | In Workspace-Agents artboard |
|---|---|---|---|---|---|---|
| 1 | `agt_fx_research_ray` | research-ray | `["research"]` | `prn_fx_research_ray` | 5 | yes |
| 2 | `agt_fx_optimizer_ollie` | optimizer-ollie | `["code"]` | `prn_fx_optimizer_ollie` | 2 | yes |
| 3 | `agt_fx_writer_quill` | writer-quill | `["writing"]` | `prn_fx_writer_quill` | 2 (the third is issued by the screen step) | yes |
| 4 | `agt_fx_strategy_sam` | strategy-sam | `["planning"]` | `prn_fx_strategy_sam` | 2 | yes |
| 5 | `agt_fx_predictor_paul` | predictor-paul | `["analysis"]` | `prn_fx_predictor_paul` | 2 | yes |
| 6 | `agt_fx_analyst_echo` | analyst-echo | `["analysis","claim-check"]` | `prn_fx_analyst_echo` | 2 | yes (shown in edit form) |
| 7 | `agt_fx_cleaner_cody` | cleaner-cody | `["maintenance"]` | `prn_fx_cleaner_cody` | 2 | yes |
| 8 | `agt_fx_coder_kai` | coder-kai | `["code"]` | `prn_fx_coder_kai` | 6 | yes |
| 9 | `agt_fx_project_manager_pete` | project-manager-pete | `["planning"]` | `prn_fx_project_manager_pete` | 2 | yes |
| 10 | `agt_fx_controller_casey` | controller-casey | `["planning"]` | `prn_fx_controller_casey` | 2 | yes |
| 11 | `agt_bb586732b807460c` | super-chotu | `["command"]` | `prn_d8178f4a05934b72892a` | 1 | yes |
| 12 | `agt_fx_threat_hunter_theo` | threat-hunter-theo | `["security"]` | `prn_fx_threat_hunter_theo` | 2 | yes |
| 13 | `agt_fx_onboarding_olivia` | onboarding-olivia | `["onboarding"]` | `prn_fx_onboarding_olivia` | 2 | yes |
| 14 | `agt_fx_artistic_lyra` | artistic-lyra | `["design"]` | `prn_fx_artistic_lyra` | 2 | yes |
| 15 | `agt_fx_chaos_charlie` | chaos-charlie | `["resilience"]` | `prn_fx_chaos_charlie` | 2 | yes |
| 16 | `agt_fx_tester_tim` | tester-tim | `["testing"]` | `prn_fx_tester_tim` | 2 | **no** (C-07) |
| 17 | `agt_fx_error_eric` | error-eric | `["diagnostics"]` | `prn_fx_error_eric` | 2 | **no** (C-07) |
| 18 | `agt_fx_integration_ian` | integration-ian | `["integration"]` | `prn_fx_integration_ian` | 2 | **no** (C-07) |
| 19 | `agt_fx_api_alan` | api-alan | `["api"]` | `prn_fx_api_alan` | 2 | **no** (C-07) |
| 20 | `agt_fx_devops_dave` | devops-dave | `["release"]` | `prn_fx_devops_dave` | 2 | **no** (C-07) |
| 21 | `agt_fx_vulnerability_victor` | vulnerability-victor | `["security-review"]` | `prn_fx_vulnerability_victor` | 2 | **no** (C-07) |
| 22 | `agt_fx_message_melissa` | message-melissa | `["marketing"]` | `prn_ce6d1efc169a75f2245f` | 1 | **no** (C-07) |

Each stage owner label the board artboards print can be derived from this table:
- "diagnostics · error-eric" and "testing · tester-tim".
- "code · 2 agents" (coder-kai, optimizer-ollie).
- "integration or api or testing · 3 agents" (integration-ian, api-alan, tester-tim).
- "release · devops-dave" and "security-review · vulnerability-victor".
- "onboarding · onboarding-olivia" and "design · artistic-lyra".
- "claim-check or analysis · 2 agents" (analyst-echo, predictor-paul).

`agent_tokens`: for each agent, k rows `id='tok_fx_<slug>_<i>'`, `tenant_id='tnt_vibes'`, `agent_id`, `token_hash='fixture-'||id` (unique), `scopes_json='["claim","run"]'`, `created_at='2026-09-02T00:00:00Z'` + i minutes, `revoked_at=NULL`.

### A.4.3 Capabilities (`capabilities`) and implications (`capability_implications`)

One row per key: `id='cap_fx_<key>'`, `tenant_id='tnt_vibes'`, `name=<key>`, `tags_json='[]'`, `examples_json='[]'`, `input_modes_json='[]'`, `output_modes_json='[]'`, `created_by='usr_b19776fac3c94df4'`.
- `origin='declared'` for the 12 keys the Capabilities tab lists: analysis, claim-check, code, command, design, maintenance, onboarding, planning, research, resilience, security, writing.
- `origin='inferred'` for testing, diagnostics, integration, api, release, security-review, marketing (C-07).
- `description` is NULL except `claim-check`, which is `'Checks that what an agent says it did is what the record shows.'`.
- `created_at` is alphabetical by key from `2026-09-01T04:30:00Z`, one minute apart.

`capability_implications`: one row, `('tnt_vibes','claim-check','analysis','2026-09-01T04:45:00Z','usr_b19776fac3c94df4')`.

### A.4.4 Labels (`labels`)

| id | name | colour | origin | created_by | created_at |
|---|---|---|---|---|---|
| `lbl_0259a14014754f69` | clean-room | `var(--vk-mood-thinking)` | inferred | NULL | 2026-10-04T10:19:08Z |
| `lbl_e9ccaacaa2f94509` | evidence-required | `var(--vk-mood-done)` | inferred | NULL | 2026-10-04T10:19:09Z |
| `lbl_8430ce51795447c3` | superpipeline | `var(--vk-mood-working)` | inferred | NULL | 2026-10-04T10:19:10Z |

The Workspace Labels tab shows 3 labels, but two cards carry a fourth label ID (`lbl_c5ee8f164fb54eb0` on Fix-highest, `lbl_8f31b566952f4d0f` on Run-and-record) that no catalog row resolves. The artboards render it as "+1" / "and 1 more". Gap G-03.

### A.4.5 Projects, milestones, rollups

| id | name | description | target_date | state | health | lead_user_id | created_at |
|---|---|---|---|---|---|---|---|
| `prj_34b48f840daa4309` | Building in public — Marketing & Community flow | NULL | NULL | active | NULL | usr_b19776fac3c94df4 | 2026-10-01T04:00:00Z |
| `prj_23b93f2d16d54b27` | Guild — Forge workspaces and checkpoint recovery | NULL | NULL | active | NULL | usr_b19776fac3c94df4 | 2026-10-02T04:00:00Z |
| `prj_42ab5ec961104f65` | Marketing & Community — Melissa and Anna onboarding | NULL | NULL | active | NULL | usr_b19776fac3c94df4 | 2026-10-08T06:00:00Z |
| `prj_fx_sjl_portfolio` | SJL Active Portfolio | NULL | 2026-10-05 | completed | on-track | usr_b19776fac3c94df4 | 2026-09-20T04:00:00Z |
| `prj_fx_sjl_baseline` | SJL Operating Baseline | NULL | 2026-10-09 | completed | on-track | usr_b19776fac3c94df4 | 2026-09-21T04:00:00Z |

- `milestones`: **none**. Every project shows "Milestones · none yet". The real Fix-highest card's `milestone_id` (`mls_84a0895ad61a4ec7`) is set to NULL in the fixture (C-11).
- `project_rollups`: none seeded. The captured default variant shows "Loading rollup…", which the harness reproduces by holding `GET /v1/projects/*/rollup` open (screen `hold` field, §B.2).
- The `loaded` variant (placeholder figures 4/9 $3.10, 2/7 $1.85 with 1 overdue, 1/5 $0.40 incomplete, 12/12 $9.70, 8/8 $4.15) is fulfilled by the harness route with those literal JSON bodies and `computedAt='2026-10-11T07:49:00Z'`. The Projects spec owns the response shape.

## A.5 Developer Experience board (`brd_134a0ddb6d434478`) — DO rows

### A.5.1 `meta`

| k | v |
|---|---|
| boardId | `brd_134a0ddb6d434478` |
| tenantId | `tnt_vibes` |
| name | `Developer Experience` |
| stages | JSON below |
| staleEnabled / staleAfterHours | as the DO stores them; snapshot `stale: {enabled: true, afterHours: 24}` |
| budgetBoardUsdCap / budgetCardUsdCap | absent ("No cap set") |
| githubIssueTrigger / githubWebhookSecret | absent (GitHub "Not set up", "Secret · not set") |

Stages. Instructions are the **mockup literal**. Settings shows a rule only on Reported and Reproduce, and "No standing rule" elsewhere (C-12).
```json
[
 {"key":"reported","name":"Reported","order":0,"ownerKind":"human",
  "instructions":"Describe one problem a developer hit. What you did, what happened, what you expected.\n\nInclude the version, commit or environment — a bug report without one costs the reproduce stage its first hour."},
 {"key":"reproduce","name":"Reproduce","order":1,"ownerKind":"capability","owner":"diagnostics",
  "instructions":"Make the problem happen on purpose. Until it can be reproduced on demand, nothing after this stage can tell a fix from a coincidence.",
  "completion":{"handoff":["repro","observed"]}},
 {"key":"test","name":"Failing test","order":2,"ownerKind":"capability","owner":"testing","completion":{"handoff":["test","fails"]}},
 {"key":"fix","name":"Fix","order":3,"ownerKind":"capability","owner":"code","completion":{"handoff":["summary","commit"],"reference":{"sourceType":"commit"}}},
 {"key":"integrate","name":"Integrate","order":4,"ownerKind":"capability","owner":"integration","requires":{"any":["integration","api","testing"]},"completion":{"handoff":["verdict","suite"]},"returnStage":"fix"},
 {"key":"signed-off","name":"Signed off","order":5,"ownerKind":"human","gate":"approval"},
 {"key":"shipped","name":"Shipped","order":6,"ownerKind":"human"}
]
```

### A.5.2 `cards` (base world)

These columns are the same on all nine cards:
- `owner_user_id='usr_b19776fac3c94df4'`.
- `current_run_id=NULL`, `claim_seq=<attempts>`, `handoff_json=NULL`.
- `pending_advance_json=NULL`, `completion_rework_json=NULL`.
- `overdue_notified_at` / `stale_notified_at` as noted.
- `active_approval_subject_id=NULL`, `auto_returns=0`.
- `queued_grant` copied from the snapshot.

Order of the board, list and phone artboards (needs-you-first sorting is client-side):

| short | id | title (verbatim) | stage | state | prio | due_at | labels | project_id | queued_by / queued_by_agent_id | archived_at | created_at | updated_at | state_since | failure_count | attempts (= runs) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 63ac | `card_ace250c9c25363ac` | Fix the highest-severity blocker found in the clean-room journey | reported | submitted | 1 | 2026-10-06 | `["lbl_0259a14014754f69","lbl_e9ccaacaa2f94509","lbl_8430ce51795447c3","lbl_c5ee8f164fb54eb0"]` | `prj_23b93f2d16d54b27` | `prn_d8178f4a05934b72892a` / `agt_bb586732b807460c` | NULL | 2026-10-04T10:19:08.402Z | 2026-10-08T09:51:01.514Z | 2026-10-08T09:51:01.514Z | 0 | 0 |
| 58f8 | `card_9ac2116a050858f8` | AgentPod: connector interface and generic effects ledger, state machine and executor | test | input-required | 2 | NULL | `[]` | `prj_34b48f840daa4309` | `prn_d8178f4a05934b72892a` / `agt_bb586732b807460c` | NULL | 2026-10-08T10:31:33.618Z | 2026-10-09T23:04:19.777Z | 2026-10-09T22:24:49.862Z | 1 | 1 |
| 1dfc | `card_e10fb4fe39a91dfc` | Superpipeline: manual-delivery completion and approval-subject hardening | fix | input-required | **0** (C-01) | NULL | `[]` | NULL | `usr_b19776fac3c94df4` / NULL | NULL | 2026-10-08T17:50:41.154Z | 2026-10-09T23:04:59.675Z | 2026-10-09T22:45:45.522Z | 2 | 5 |
| f83f | `card_691a65ff9894f83f` | Integrate editorial workflows and prove no-write publishing acceptance | test | submitted | 2 | NULL | `[]` | `prj_34b48f840daa4309` | `prn_d8178f4a05934b72892a` / `agt_bb586732b807460c` | NULL | 2026-10-08T10:31:34.691Z | 2026-10-08T17:50:23.062Z | 2026-10-08T17:50:23.062Z | 0 | 0 |
| 481f | `card_482b4aa0bdd6481f` | agentpod-connectors: X connector (connector x) | test | submitted | 0 | NULL | `[]` | NULL | `usr_b19776fac3c94df4` / NULL | NULL | 2026-10-09T23:04:35.741Z | 2026-10-09T23:04:43.288Z | 2026-10-09T23:04:43.288Z | 0 | 0 |
| 9ed9 | `card_8f2c1a5e58299ed9` | Build immutable approval subjects and digest-bound gates | shipped | completed | 2 | NULL | `[]` | `prj_34b48f840daa4309` | `usr_b19776fac3c94df4` / NULL | NULL | 2026-10-08T10:31:32.526Z | 2026-10-09T22:19:24.419Z | 2026-10-09T22:19:24.419Z | 0 | 15 |
| 4605 | `card_05823a57e8224605` | Diagnose Melissa and Anna Supermessage silence — trace actual failing hop | reproduce | input-required | 3 | NULL | `[]` | `prj_42ab5ec961104f65` | `prn_d8178f4a05934b72892a` / `agt_bb586732b807460c` | **2026-10-08T14:11:43.251Z** | 2026-10-08T06:04:57.202Z | 2026-10-08T14:11:45.119Z | 2026-10-08T14:11:45.119Z | 0 | 2 |
| 6281 | `card_47630a307f58426f` | Scratch: forge push identity check (integration-ian) | integrate | input-required | 0 | NULL | `[]` | NULL | `usr_b19776fac3c94df4` / NULL | 2026-10-09T14:21:02.650Z | 2026-10-09T14:18:14.596Z | 2026-10-09T14:21:04.165Z | 2026-10-09T14:20:11.010Z | 0 | 1 |
| 4828 | `card_54ec7bee6c7e4828` | Scratch: forge push identity check (error-eric) | reproduce | input-required | 0 | NULL | `[]` | NULL | `usr_b19776fac3c94df4` / NULL | 2026-10-09T14:21:04.552Z | 2026-10-09T14:18:17.617Z | 2026-10-09T14:21:05.989Z | 2026-10-09T14:20:06.788Z | 0 | 1 |

**Card ids (canonical, D13).** The six live cards are re-keyed from their production ids so that the last 4 hex chars equal what the mockups print. In the Palette, the meta is the canvas's title hash (`h=7; h=(h*31+charCode)%65536`), which happens to be the only short id those cards show. The first 12 hex chars stay the production prefix, so the Spend board log's 6-char form (`#e10fb4`, `#9ac211`, `#ace250`) is unchanged. `world.ts` keeps `SNAPSHOT_ID` (`new id → production id`) to read `spec`, `queuedGrant` and `references` from `fixture/source/*.json`:

| canonical id | production id (snapshot key) |
|---|---|
| `card_ace250c9c25363ac` | `card_ace250c9c25342e4` |
| `card_9ac2116a050858f8` | `card_9ac2116a050840df` |
| `card_e10fb4fe39a91dfc` | `card_e10fb4fe39a9467f` |
| `card_691a65ff9894f83f` | `card_691a65ff98944697` |
| `card_482b4aa0bdd6481f` | `card_482b4aa0bdd64c02` |
| `card_8f2c1a5e58299ed9` | `card_8f2c1a5e58294d27` |
| `card_05823a57e8224605` | same (already ends in the printed 4605) |

Snapshot reference rows are copied with `card_id` rewritten through this map. `blockedBy` titles are unaffected.

`spec_json`: copy from the snapshot for every card, except 4605 under the desktop variants (§A.7).

`context_id`: copy from the snapshot.

`needs_human_json` (verbatim; straight `'` and curly `“ ”` exactly as stored, C-05):
- 58f8: `{"reason":"blocked","detail":"Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted."}`
- 1dfc: `{"reason":"blocked","detail":"this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit","failureCount":2}`
- 4605: `{"reason":"blocked","detail":"not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed."}`
- 9ed9: NULL. The snapshot's stale `needsHuman` on a completed card is dropped, because no artboard shows it.
- 6281 / 4828: copy from the snapshot (archived, never shown).
- 63ac, f83f, 481f: NULL.

The Fix-highest sentence "No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works." is **not** stored. It is the client's derived reason for a submitted card in a human stage with no gate (owned by the board and operate specs).

The phone artboards capitalise the first letter of the 4605 detail ("Not reproduced…") and the 1dfc detail ("This stage was not finished twice…"), and end the latter with a period. That is client presentation (C-06). Agent text is stored verbatim as above.

### A.5.3 `card_links` (same board)

| from_card_id | to_card_id | kind | created_at | created_by |
|---|---|---|---|---|
| card_482b4aa0bdd6481f | card_691a65ff9894f83f | blocks | 2026-10-09T23:04:42Z | usr_b19776fac3c94df4 |
| card_9ac2116a050858f8 | card_691a65ff9894f83f | blocks | 2026-10-08T17:50:20Z | agt_bb586732b807460c |
| card_e10fb4fe39a91dfc | card_691a65ff9894f83f | blocks | 2026-10-08T17:50:41Z | usr_b19776fac3c94df4 |
| card_9ac2116a050858f8 | card_482b4aa0bdd6481f | blocks | 2026-10-09T23:04:44Z | usr_b19776fac3c94df4 |

The resulting `blockedBy` values:
- f83f has three blockers: "Blocked by 3 cards", with the title "Waits on 3 cards: agentpod-connectors X connector; AgentPod connector interface; Superpipeline manual-delivery completion".
- 481f has one blocker: "Blocked by 1 card".

Only the desktop card variants add `relates` links (§A.7.2).

### A.5.4 `runs`

Run IDs are `run_fx_<short>_<n>`. Columns:
- `lease_epoch=n`, `status='ended'`.
- `last_heartbeat_ms` = epoch ms of `ended_at`.
- `profile_key=NULL`, `queued_by` = the card's queued_by, `updated_at=ended_at`, `failure_reason=NULL`.
- `handoff_json` and `completion` as listed (NULL otherwise).

| run | card | stage_key | agent_id | started_at | ended_at | outcome | handoff_json / completion |
|---|---|---|---|---|---|---|---|
| run_fx_58f8_1 | 58f8 | test | agt_fx_tester_tim | 2026-10-09T21:30:00Z | 2026-10-09T22:24:49Z | blocked | — |
| run_fx_1dfc_1 | 1dfc | test | agt_fx_tester_tim | 2026-10-08T18:00:00Z | 2026-10-08T19:10:00Z | completed | handoff `{"test":"apps/api/test/manual-delivery-reminder.test.ts","fails":"1 failed"}` |
| run_fx_1dfc_2 | 1dfc | fix | agt_fx_coder_kai | 2026-10-09T08:00:00Z | 2026-10-09T09:30:00Z | completed | handoff `{"summary":"fix(api): schedule manual delivery reminders","commit":"7f540d29"}` |
| run_fx_1dfc_3 | 1dfc | integrate | agt_fx_integration_ian | 2026-10-09T12:00:00Z | 2026-10-09T13:00:00Z | completed | handoff `{"verdict":"unsafe","suite":"REST path fails HTTP 400"}` (returned to fix) |
| run_fx_1dfc_4 | 1dfc | fix | agt_fx_coder_kai | 2026-10-09T20:30:00Z | 2026-10-09T21:30:00Z | completed | completion `{"ok":false,"missing":["commit"]}` |
| run_fx_1dfc_5 | 1dfc | fix | agt_fx_coder_kai | 2026-10-09T21:35:00Z | 2026-10-09T22:45:45Z | blocked | completion `{"ok":false,"missing":["commit"]}` |
| run_fx_9ed9_1…15 | 9ed9 | runs 1–14 cycle `test` (tester-tim), `fix` (coder-kai), `integrate` (integration-ian, api-alan alternating) | — | run *n* starts 2026-10-08T11:00Z + (n−1)×2h | start + 90 min | completed | — |
| run_fx_9ed9_15 | 9ed9 | fix | agt_fx_coder_kai | 2026-10-09T20:00:00Z | 2026-10-09T21:40:00Z | completed | handoff `{"summary":"fix(approval): make delivery switches atomic","commit":"ba417fd0"}` |
| run_fx_4605_1 | 4605 | reproduce | agt_fx_error_eric | 2026-10-08T06:05:10Z | 2026-10-08T06:41:00Z | completed | completion `{"ok":false,"missing":["repro","observed"]}` (the phone's "Sent back") |
| run_fx_4605_2 | 4605 | reproduce | agt_fx_error_eric | 2026-10-08T13:20:00Z | 2026-10-08T14:11:43Z | blocked | — |
| run_fx_6281_1 / run_fx_4828_1 | archived scratch cards | as the snapshot stage | integration-ian / error-eric | 2026-10-09T14:18:30Z | 2026-10-09T14:20:10Z | blocked | — |

The last run of 9ed9 is by coder-kai, so List shows "coder-kai · done".

### A.5.5 `activities`

`ephemeral=0`. `detail_json` is `{"kind":"TOOL"}` for tool calls and `{"kind":"MESSAGE"}` otherwise. Base world (phone-literal) rows for 4605:

| run | seq order | type | action | body | ts |
|---|---|---|---|---|---|
| run_fx_4605_1 | 1 | response | NULL | `The board refused completion: repro and observed were missing.` | 2026-10-08T06:41:00Z |
| run_fx_4605_1 | 2–9 | action | `tool` | `read_file` / `grep` / `http_get` (8 tool calls; hidden behind "Show tool calls") | 06:06–06:40Z, 5 min apart |
| run_fx_4605_2 | 1 | thought | NULL | `Rework run on this card session; read prior persisted evidence first.` | 2026-10-08T13:20:05Z |
| run_fx_4605_2 | 2–13 | action | `tool` | 12 tool calls | 13:22Z–14:08Z, 4 min apart |
| run_fx_4605_2 | 14 | response | NULL | `Blocked. Waiting on you; the reason is shown at the top of this card.` | 2026-10-08T14:11:43Z |

Run 1 therefore has 9 events and run 2 has 14 ("14 events · 0 errors", "9 events · 0 errors").

58f8: one `response` row with the needs-human detail at 22:24:49Z, plus 6 tool rows. 1dfc: one `response` row per run.

### A.5.6 `card_references`

All columns copied from the snapshot's `references` array, keeping `id`, `url`, `title`, `subtitle`, `provider`, `source_type`, `external_id`, `metadata_json`, `sync_state`, `added_by`, `run_id` and `created_at`. These are the 26 rows: 5 on 4605, 15 on 9ed9, 1 on 58f8, 4 on 1dfc, and 1 more on the scratch cards if present.

The first reference (oldest `created_at`) of each card is the secondary line on the board tiles:
- 58f8: "Deterministic X publisher red-test evidence".
- 1dfc: "test(api): pin manual delivery reminder".
- 9ed9: "test(api): pin immutable approval subject binding".

The phone card lists 4605's 5 references with titles, subtitles and a "github · agentpod · inbound.ts lines 379–786" line, which is derived from the URL.

### A.5.7 Gates, elicitations, approval subjects, comments, usage

- `gates` (base): one resolved row for 9ed9, `id='gate_fx_9ed9'`.
  - `stage_key='signed-off'`, `return_stage_key='integrate'`, `status='resolved'`, `decision='approve'`.
  - `produced_by='agt_fx_coder_kai'`, `decided_by='usr_b19776fac3c94df4'`.
  - `options_json` = the DO's `DEFAULT_GATE_OPTIONS`, `created_at='2026-10-09T21:41:00Z'`, `resolved_at='2026-10-09T22:19:24Z'`.
  - `run_id='run_fx_9ed9_15'`.
  - Nothing else is pending (the Decisions panes read "None yet.").
- `elicitations`: none in the base world.
- `approval_subjects`: none in the base world.
- `card_comments`: none ("No comments yet").
- `usage_records`: **none**. Every cost reads $0.00 or "—", and Spend's captured default is "$0.00 · No budget cap set". The "with spend" variant is a harness route fulfilment on `/v1/boards/:id/usage` with the placeholder figures the artboard prints. That variant is not the default and not compared until it is exported.

### A.5.8 `notifications` (16 unread for the owner)

All rows: `user_id='usr_b19776fac3c94df4'`, `read=0`. The body formats are the DO's own `notify()` strings. The newest per card is what the Activity panel shows ("22:50 · still stopped a day later in Fix", "22:25 …", "09:55 …"). The others sit behind "Earlier reminders".

| card | kind | body | created_at |
|---|---|---|---|
| 1dfc | stale | `Stuck 24h in Fix: this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit. Next: resume it` | 2026-10-10T22:50:12Z |
| 1dfc | blocked | (1dfc detail) | 2026-10-09T22:45:45Z |
| 1dfc | rework | `Sent back for one automatic rework: the handoff is missing commit` | 2026-10-09T21:30:01Z |
| 1dfc | rework | `Sent back to "fix" from "integrate": REST path fails HTTP 400` | 2026-10-09T13:00:01Z |
| 1dfc | stale | `Stuck 24h in Fix: … Next: resume it` (same detail) | 2026-10-10T10:50:12Z |
| 58f8 | stale | `Stuck 24h in Failing test: Blocked on the forgeDestinationHold… (58f8 detail). Next: resume it` | 2026-10-10T22:25:12Z |
| 58f8 | blocked | (58f8 detail) | 2026-10-09T22:24:50Z |
| 58f8 | stale | same as the first 58f8 row | 2026-10-10T10:25:12Z |
| 58f8 | control-pair | `Not dispatched: waiting for a grant that covers tester-tim` | 2026-10-08T10:31:40Z |
| 58f8 | blocked | `Waiting on the Forge destination` | 2026-10-09T21:31:00Z |
| 63ac | stale | `Stuck 48h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works` | 2026-10-10T09:55:20Z |
| 63ac | stale | `Stuck 24h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works` | 2026-10-09T09:55:20Z |
| 63ac | overdue | `"Fix the highest-severity blocker found in the clean-room journey" was due 2026-10-06` | 2026-10-07T00:05:00Z |
| 63ac | stale | 72h wording, same tail | 2026-10-11T09:55:20Z is **in the future**, so instead `2026-10-08T21:55:20Z` with "Stuck 12h" |
| 63ac | control-pair | `Not dispatched: no agent works Reported` | 2026-10-04T10:19:10Z |
| 63ac | blocked | `Waiting on a person in Reported` | 2026-10-08T09:51:02Z |

That is 5 + 5 + 6 = 16 unread rows, all on the three cards that need you. Set `cards.stale_notified_at` to the newest stale timestamp per card.

### A.5.9 `events` (board log, Spend artboard)

Newest first, as the artboard lists them. `payload_json` holds the fields shown in "Show raw event names".

| ts | type | payload_json |
|---|---|---|
| 2026-10-10T22:50:12Z | cards.stale_digest | `{"cardIds":["card_e10fb4fe39a91dfc"]}` |
| 2026-10-10T22:50:12Z | notification | `{"cardId":"card_e10fb4fe39a91dfc","kind":"stale"}` |
| 2026-10-10T22:25:12Z | cards.stale_digest | `{"cardIds":["card_9ac2116a050858f8"]}` |
| 2026-10-10T22:25:12Z | notification | `{"cardId":"card_9ac2116a050858f8","kind":"stale"}` |
| 2026-10-10T09:55:20Z | cards.stale_digest | `{"cardIds":["card_ace250c9c25363ac"]}` |
| 2026-10-10T09:55:20Z | notification | `{"cardId":"card_ace250c9c25363ac","kind":"stale"}` |
| 2026-10-09T23:05:00Z | link.added | `{"from":"card_9ac2116a050858f8","to":"card_482b4aa0bdd6481f","kind":"blocks"}` |
| 2026-10-09T23:04:59Z | card.updated | `{"cardId":"card_e10fb4fe39a91dfc"}` |
| 2026-10-09T23:04:44Z | link.added | `{"from":"card_9ac2116a050858f8","to":"card_482b4aa0bdd6481f","kind":"blocks"}` |
| 2026-10-09T23:04:43Z | notification | `{"cardId":"card_482b4aa0bdd6481f","kind":"blocked"}` |
| 2026-10-09T23:04:43Z | card.moved | `{"cardId":"card_482b4aa0bdd6481f","to":"test","from":"reported"}` |
| 2026-10-09T23:04:42Z | link.added | `{"from":"card_482b4aa0bdd6481f","to":"card_691a65ff9894f83f","kind":"blocks"}` |
| 2026-10-09T23:04:35Z | card.created | `{"cardId":"card_482b4aa0bdd6481f"}` |

Then 47 older filler events (`card.updated`, payload `{"cardId":…}`, cycling the six live cards, one per 10 min backwards from 2026-10-09T22:55Z), so that the log holds "last 60 events" and "Show all 60 events".

The short ID "#e10fb4" in the log is the first six characters after `card_`, and is client-derived. The card drawer's "card 4605" is the last four. Both are formulas for the Spend and Card specs, not fixture fields.

## A.6 Other boards

### A.6.1 Agent Onboarding (`brd_f47143722126442c`) — Quiet board

Stages: copy from the snapshot (requested; drafted / provisioned = onboarding; portrait = design; credentialed = human + approval gate; proving = claim-check, requires any `[claim-check, analysis]`; resident = human + approval gate, C-13). No `instructions` (the stages table shows none).

The 20 live cards are all `completed` in `resident`, plus one archived card. `state_since` is chosen so that "newest first" gives the artboard's order (C-14):

| id | title | prio | attempts (runs by onboarding-olivia) | state_since | extras |
|---|---|---|---|---|---|
| card_9d48db2717044b69 | Run and record the clean-room SuperPipeline operator journey | 1 | 10 | 2026-10-10T12:21:00Z ("20 hours ago") | labels `["lbl_0259a14014754f69","lbl_e9ccaacaa2f94509","lbl_8430ce51795447c3","lbl_8f31b566952f4d0f"]`, due 2026-10-05, project prj_23b93f2d16d54b27, queued_by usr. Reference: title `Clean-room SuperPipeline operator journey — attempt 6 evidence`, provider superlibrary, source_type artifact, url `https://app.superlibrary.dev/a/itm_fx_cleanroom6`, created 2026-10-10T12:00Z |
| card_f180b1627c594b41 | Onboard Message Melissa — marketing and messaging | 2 | 5 | 2026-10-08T13:56:34.688Z | queued_by super-chotu. Blocked by card_e3c7940daca24158 (a `blocks` link from the archived **submitted** blocker, so it stays unresolved and reads "Blocked by another card"). Reference: snapshot "Message Melissa — pinned Sketchbook persona". Project prj_42ab5ec961104f65 |
| card_fa51f3d3e5e94ace | Onboard Audience Anna — community and feedback | 2 | 5 | 2026-10-08T13:56:33.362Z | as Melissa; reference "Audience Anna pinned Sketchbook persona" |
| card_94266a0d5c984dc8 | Onboard Artistic Lyra | 0 | 5 | 2026-10-01T22:30:00Z | — |
| card_09a6d0a769af4f53 | Onboard Chaos Charlie | 0 | 8 | 2026-10-01T22:20:56.146Z | — |
| 15 more: Ulrich (card_21deed82a8234207, 6 attempts), Error Handler Eric (card_8c0cc34928b64039, 4), API Manager Alan (card_aac5209ffeeb46fa, 4), Integration Ian (card_a9142e1c13a34b25, 4), Risk Assessment Rachel (card_9e822d4ab738445a, 5), Tester Tim (card_ca729f68efbe4c60, 4), Knowledge Keeper Karen (card_d696357097e14610, 4), Architect Alex (card_406c647efb0b402b, 4), Knowledge Synthesizer Kevin (card_d38581137b804231, 4), Data Scientist Diana (card_eb98af68aee342f0, 4), Benchmark Betty (card_1675bc0fefb74306, 4), Performance Pete (card_5cff9e9d471241af, 4), Monitor Mike (card_a1907a8e2c2c462c, 4), Vulnerability Victor (card_78c7bb41247645da, 6), DevOps Dave (card_0243d9a932e54363, 7) | "Onboard <name>" (snapshot title) | 0 | as listed | 2026-10-01T21:00:00Z minus 10 min × i (i = 1…15, in the order listed) | — |
| card_e3c7940daca24158 | Operator credentialing repair — Melissa and Anna must respond and prove work | 3 | 0 | 2026-10-08T14:11:41.633Z | `state='submitted'`, `archived_at='2026-10-08T14:11:41.633Z'`, stage requested |

The Card-States D panel shows Melissa's handoff on the last run of `card_f180b1627c594b41` as `handoff_json`:
```json
{"summary":"Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate.","handedOn":"Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation."}
```
The final run is `stage_key='resident'`, `agent_id='agt_fx_onboarding_olivia'`, `ended_at` = state_since. Card-States variant D moves it to Fri (§A.7).

### A.6.2 Research & Intelligence (`brd_fa33a0a0721d4d18`)

Stages: from the snapshot. Add `"approvalSubjectSchema":"recommendation/v1"` to `recommendation` (G-05).

Cards: the three snapshot cards, all archived. `card_42269e99036f42ae` gets its title in **mockup typography**: `P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)` (C-09). It is archived in base (0 live cards, as the Switcher says). Variants A and E un-archive it (§A.7.3).

### A.6.3 Marketing & Community (`brd_e247f164e060443f`)

Stages: from the snapshot, with `order` assigned 0…7 in array order (the snapshot omits it).

Cards: the four snapshot cards, all archived. `card_e1eb201927f94506` ("Coordinator dispatch canary — Melissa") gets `archived_at='2026-10-09T05:30:00Z'` (IST 9 Oct, "Archived 9 Oct"), stage `messaging-review`, 1 run by `agt_fx_message_melissa` (stage messaging, ended 2026-10-08T14:00:30Z). It also gets one gate row: `status='canceled'`, `stage_key='messaging-review'`, `comment='Its pending review was cancelled when the card was archived.'`, `resolved_at` = archived_at.

### A.6.4 Production Releases (`brd_2441b5578f704b93`) — Empty board

Stages: snapshot (proposed human; staged = release; checks = security-review; go-no-go = human, approval, `wipLimit: 1`; released human). No cards.

The per-stage sentences ("Someone writes up the release: what ships and why." and so on) are not in the data. That is gap G-06, owned by the Empty-board spec.

### A.6.5 Remaining boards (counts only)

Stages come from the snapshot. Cards are synthesized: titles `<Board name> fixture card <n>`, priority 0, no labels, created 2026-10-05T04:00Z + n h, queued by usr. No artboard shows them, but counts appear in the Switcher and Palette. They exist so that those counts derive.

| board | live | need you (input-required, not stale) | others |
|---|---|---|---|
| Client Quality | 2 | card 1: `input-required` in `audit`, state_since 2026-10-11T03:30:00Z, needs_human `{"reason":"blocked","detail":"Waiting on a person"}`, 1 run by threat-hunter-theo | card 2 submitted in observed |
| Guild Operations & Automation | 3 | card 1: `input-required` in `build`, state_since 2026-10-11T02:10:00Z, 1 run by optimizer-ollie | 2 submitted in intake |
| Editorial & Fact-Checking | 3 | — | completed in published |
| Recurring Maintenance | 4 | — | completed in closed |
| Planning & Roadmap | 3 | — | completed in planned |
| Reliability, superwitness canary | 0 | — | — |

## A.7 Screen variants

Variants are applied by the seeder after the base world, in order, through the same import route (`World.variants[name]` is a partial board patch).

### A.7.1 `card4605-live` (every artboard showing card 4605 un-archived)

Applies to: SP-Card-*, SP-CardPage-*, SP-Phone-Card-* (with `archived=false`, the reference default), and the "F · Loading" panels.

Changes: `cards.archived_at=NULL` for `card_05823a57e8224605`. Nothing else. The base world's phone-literal spec, runs, activities and five references stay as they are, and they are exactly what SP-Phone-Card-* show:
- "Things to prove · 5".
- Rework/Context/Latest-confirmed-grant fields.
- Project "Marketing & Community — Melissa and Anna onboarding · no milestone".
- "Plan none yet".
- Runs on Thu 8 Oct.

### A.7.2 `card4605-desktop-<vibe>` (SP-Card-<vibe> and SP-CardPage-<vibe>, desktop only)

The desktop card artboards show a hand-edited 4605: 3 criteria, an invented 4-step plan, invented references, 3 relates-links, project none, attempt-2 stop on Fri 9 Oct, and spec wording that differs per vibe (C-02). Rather than lose eight approved artboards, each gets this overlay on top of `card4605-live`.

| Field | Value |
|---|---|
| `spec_json` | `{"description": D, "acceptanceCriteria": [C1,C2,C3], "plan": {"steps":[{"title":"Check Melissa’s live ACP session","done":true},{"title":"Trace one fresh DM per agent","done":false},{"title":"Name the first failing hop","done":false},{"title":"Write the repair proposal","done":false}]}, "brief": {"whatToDo": {"objective": O, "deliverable": DL, "evidence": "One fresh DM per agent, traced hop by hop.", "outOfScope": "Applying the fix."}, "whereItGoes": {"agentsInScope": ["message-melissa","audience-anna"], "surfaces": "Supermessage, AgentPod hub, Accounts", "fixGoesTo": "Failing test, on this board"}, "rules": {"attribution": RA, "issues": RI, "messages": RM}}}` |
| D (all vibes) | `Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute without evidence.` |
| C1, C2, C3 | `The first failing hop is named, for each agent.` / `Each hop cites its evidence: a log line or metadata row with its time.` / `A repair proposal names the owning repository.` |
| O (Daylight) | `Reproduce and localise why the AgentPod bridge identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage.` |
| O (Paper, Studio) | `Localise why Melissa and Anna do not answer Rakesh in Supermessage.` |
| O (Quiet) | `Find why Melissa and Anna do not answer Rakesh in Supermessage.` |
| DL | Daylight `An evidence-backed diagnosis and the exact repair proposal.`; Paper and Quiet `A diagnosis with evidence, and the repair proposal.`; Studio `Diagnosis with evidence, and the exact repair proposal.` |
| RA / RI / RM | Daylight `Do not blame a component without evidence.` / `File one only for an established defect.` / `Read metadata only, never message contents.`; Paper, Studio and Quiet `No blame without evidence.` / `Only for an established defect.` / `Metadata only, never contents.` |
| `project_id` | NULL ("Project none") |
| `card_references` for 4605 | Replace the five with two: `ref_fx_ap642` (title `agentpod PR #642`, subtitle NULL, provider `forge`, source_type `pull_request`, url `https://forge.superjackfruit.com/SuperJackfruitLabs/agentpod/pulls/642`, metadata `{"state":"merged"}`) and `ref_fx_ap648` (the same for #648), created 2026-10-08T06:19Z |
| Related prior work | Superlibrary lookup, fulfilled by the harness: route `**/superlibrary**/related*` returns one item `{"title":"Hermes agent stuck on an E2EE device with 0 olm sessions; a fresh device fixed it.","status":"fixed"}` (the Paper and Quiet text is a shortened client rendering, C-03) |
| `card_links` | relates: 4605 → 63ac (same board, `card_links` kind `relates`). `card_links_external` rows `('tnt_vibes','brd_134a0ddb6d434478','card_05823a57e8224605','brd_f47143722126442c','card_f180b1627c594b41','relates')` and the same for `card_fa51f3d3e5e94ace`. "advisory" is the client's word for a cross-board relates link |
| runs | run 1: `ended_at='2026-10-09T05:42:00Z'` (11:12 IST 9 Oct), outcome `blocked`. Run 2: `started_at='2026-10-09T13:40:00Z'`, `ended_at='2026-10-09T14:11:00Z'` (19:41 IST **Fri** 9 Oct), outcome `blocked`. `cards.state_since` is unchanged (Thu 14:11:45Z), so "Waiting on you · 2 days" still holds |
| activities run 2 (visible, `{"kind":"MESSAGE"}`) | 13:52:00Z action `Read AgentPod hub matrix-inbound log for Melissa’s station`. 14:00:00Z response `Found session acps_8f86d4e4… reached Hermes; model reply produced`. 14:11:00Z response `Stopped No fresh DM event to trace. Needs one per agent.`. Studio Log prints its own paraphrase, C-04. Plus 11 TOOL rows → 14 events |
| activities run 1 | 9 rows (8 TOOL + 1 response `Stopped.`) |
| Handoff from Reported | `cards.handoff_json='{"summary":"Melissa and Anna do not answer DMs in Supermessage."}'` |

### A.7.3 Card-States panels (`states-<panel>`)

Each panel screen seeds base + the variant, opens the drawer for the named card, and compares the panel region (§B.2, mode `panels`).

| Panel | Card | Overlay |
|---|---|---|
| A · Approval gate | `card_42269e99036f42ae` (R&I) | Fields:<br>• `archived_at=NULL`, `current_stage_key='recommendation'`, `state='input-required'`, priority 0, `active_approval_subject_id='aps_fx_p4'`, `state_since='2026-10-11T07:18:00Z'`.<br>• 4 completed runs (question human-free: gather research-ray, measure predictor-paul, synthesise research-ray, plus 1 synthesise rework), last run `run_fx_p4_4` by `agt_fx_research_ray`, ended 07:18:00Z (12:48 IST, "Today, 12:48"), activity response `All done, ready for your review.`<br>• `approval_subjects`: `id='aps_fx_p4'`, `gate_stage_key='recommendation'`, `schema='recommendation/v1'`, `revision=2`, `canonical_bytes`=UTF-8 of `{"kind":"Recommendation, one paragraph","synthesis":"The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token.","sources":["Organization plane cutover record, 7 Oct"]}`, `digest='sha256:9f3ac2e1d07109285773f2418680752df16dbb42e26181bf657d331db98fcb84'`, status active, producer_run_id run_fx_p4_4, produced_by agt_fx_research_ray, created 07:18:00Z.<br>• `gates`: `id='gate_fx_p4'`, stage recommendation, return_stage synthesise, `status='pending'`, `options_json`=`APPROVAL_SUBJECT_GATE_OPTIONS`, `approval_subject_id='aps_fx_p4'`, `approval_subject_digest` as above, `approval_decider_ids_json='["usr_b19776fac3c94df4"]'`, run_id run_fx_p4_4, created 07:18:00Z. |
| B · Agent question | `card_e10fb4fe39a91dfc` | Fields:<br>• `needs_human_json=NULL`, `state='input-required'`, `state_since='2026-10-11T05:35:00Z'`.<br>• A 6th run `run_fx_1dfc_6` (fix, coder-kai, started 05:20Z, `status='active'`, outcome NULL, `ended_at` NULL), `current_run_id` set to it.<br>• `elicitations`: `id='elc_fx_1dfc'`, run_fx_1dfc_6, stage fix, agent agt_fx_coder_kai, question `The handoff to Failing test needs a commit, and the fix for the manual delivery reminder is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?`, signal NULL, options `[]`, status pending, created `2026-10-11T05:35:00Z` (11:05 IST). |
| C · Archived | `card_e1eb201927f94506` | none (base already has it archived 9 Oct with a canceled gate). |
| D · Done | `card_f180b1627c594b41` | `state_since` and the final run `ended_at='2026-10-09T13:56:00Z'` (Fri 9 Oct 19:26 IST, C-15). |
| E · Decision error | as A | as A, plus the harness route `POST **/gates/gate_fx_p4/resolve` → `409 {"error":"already_decided","decidedBy":"Rakesh Gangwar","decidedVia":"matrix","decidedAt":"2026-10-11T07:32:00Z"}` (13:02 IST). Screen steps: pick "Request changes", leave the note empty, press submit (the empty-note message shows); then type nothing and press Approve so the 409 renders. The panel spec owns the exact order. |
| F · Loading | `card_05823a57e8224605` | `card4605-live`; the harness holds `GET **/cards/card_05823a57e8224605/attempts` and `…/activities` open. |

### A.7.4 Interaction-state variants (no data change)

Steps live in the screen registry (§B.2):
- SP-Operate-Daylight: open the resume form on 58f8 and type `The Forge mirror is now writable and tester-tim has write access. Push the red-test commit and carry on.`
- SP-Workspace-Other: open resume on 58f8 and type `The commit is on the branch now. Pick up from the handoff step.`
- SP-Workspace-Agents: issue a token for writer-quill (the banner shows masked dots), open the analyst-echo editor.
- Dialog screens: open the dialog. Palette: type `agent`. Move: open on 58f8 with "Fix" picked.
- SP-Board-Daylight: peek on 58f8.
- SP-List-Studio: row 2 selected.
- SP-Operate-Studio: row 01 selected.

## A.8 Conflicts between artboards and rulings

"Correction" means the losing artboard must be fixed on the canvas and re-exported (§B.7). Until then the harness masks the named region (`masks` in §B.2, each tagged with the conflict ID).

| ID | Artboards | Conflict | Ruling |
|---|---|---|---|
| C-01 | Board-Daylight/Paper/Studio, Phone-Board-Daylight/Paper/Studio vs List-*, Phone-Board-Quiet ("No priority") | Manual-delivery card shown as Priority 2 vs no priority | Real data: priority 0. **Correction**: drop "Priority 2"/"P2" from the 1dfc tile on the 6 board artboards. Mask: 1dfc priority chip. |
| C-02 | Card-*/CardPage-* (desktop) vs Phone-Card-* | 4605 content differs (3 vs 5 criteria, plan, references, links, project, Fri vs Thu, per-vibe brief wording) | Both kept through screen-scoped variants (§A.7.1, A.7.2). Product truth = phone (real). No mask. |
| C-03 | Card-Daylight/Studio vs Card-Paper/Quiet | Prior-work line long vs short | One stored title (long). Paper and Quiet shorten client-side (Card spec owns the rule) or correct the canvas. Mask: prior-work line on Paper and Quiet until the Card spec rules. |
| C-04 | Card-Studio Log vs Card-Daylight/Page | Run-2 activity wording ("Read the AgentPod hub…", "a model reply was produced") | Stored text = Daylight wording (§A.7.2). **Correction**: SP-Card-Studio and SP-CardPage-Studio log lines. Mask: the 3 log rows. |
| C-05 | Board-Daylight/Paper (Tim’s, curly) and Operate-* ("Mirror…" straight) vs Phone (real) | Typography of the 58f8 detail | Stored verbatim (straight `'`, curly `“ ”`). Glyph-level difference, under threshold. **Correction** listed, no mask. |
| C-06 | Phone-* vs desktop | Detail capitalised and period added on phone | Stored verbatim lower-case. The phone capitalises at render (phone board/card specs: `sentenceCase(detail)`, which upper-cases the first letter and appends "." when the text does not end in `.!?`). |
| C-07 | Workspace-Agents/Other (15 agents, 12 capabilities, "none working") vs boards, Move, Empty, Palette (tester-tim, error-eric, integration/api 3 agents, devops-dave, vulnerability-victor) and the Workspace header itself ("research-ray and tester-tim are working now") | Roster | Catalog has 22 agents (§A.4.2). **Correction**: Workspace-Agents (7 more rows; "22 agents"), Workspace-Other (Capabilities 19 with 7 inferred; counts), and every "2 at work · research-ray and tester-tim" header (Workspace-*, Settings, Spend, Projects, Board-Empty), which must read the DX crew ("3 agents · 2 wait on you"). Masks: agent list below row 15, tab counts, header crew pill. |
| C-08 | Card-* drawer backdrops | Backdrop board lists 4605 among "6 cards" and other made-up groupings (e.g. Paper's backdrop "Shipped: agentpod-connectors") | The backdrop is the live board under the variant (7 live cards). Mask: every pixel outside the drawer panel (`backdrop` mask: the reference region left of the drawer's `left` edge). |
| C-09 | Card-States A/E title vs snapshot | `‘why…’` curly vs `'why…'` | Fixture uses the mockup's curly quotes. |
| C-10 | List-Studio/Board-Studio (agentpod-connectors age "2d" / "—") vs Phone ("33h") | Age | Derived 33h. **Correction**: List-Studio "2d", Board-Studio "—". Mask: those cells. |
| C-11 | Projects ("Milestones · none yet") vs snapshot (Fix-highest has milestone mls_84a0…) | Milestone | No milestones; card milestone NULL. |
| C-12 | Settings ("No standing rule" on 5 stages) vs snapshot instructions | Stage instructions | Mockup literal (only 2 rules, §A.5.1). |
| C-13 | Board-Quiet (Resident gate "—") vs snapshot (resident approval gate) and Card-States D ("you credentialed her at the resident gate") | Gate | Real: gate approval. **Correction**: Board-Quiet stages table Resident row. Mask: that cell. |
| C-14 | Board-Quiet "last 5, newest first" (Lyra and Charlie 4th/5th) vs real state_since (Ulrich newer) | Ordering | Fixture state_since chosen to produce the artboard order (§A.6.1). |
| C-15 | Card-States D ("Fri 9 Oct, 19:26") vs Board-Quiet ("done 2 days ago" = Thu) | Melissa's finish time | Base = Thu (real); variant D = Fri. Both pass. |
| C-16 | Studio artboards' times 13:19/13:27/13:31 vs 13:51 | Wall clock | Per-screen clock (D2). |
| C-17 | Phone-Board-* ("asked by super-chotu" on 1dfc) vs real queued_by = Rakesh, and desktop boards (no "asked by" on 1dfc) | Provenance | Real: no "asked by". **Correction**: Phone-Board-Daylight/Paper/Quiet/Studio 1dfc meta line. Mask: that line. |
| C-18 | Card-Daylight/Paper/Quiet links ("Onboard Audience Anna — community and engagement") vs Agent Onboarding title ("— community and feedback") | Linked card title | Real title (the link shows the target card's title). **Correction** on the Card/CardPage artboards. Mask: that link row. |
| C-19 | Board-Studio ("five days overdue") vs the clock (due 6 Oct, now 11 Oct) | Overdue | Five days: consistent. No conflict. |
| C-20 | List-Daylight/Paper/Quiet ("2 wait on you") vs Board ("3 cards want you"), Studio List ("Needs 3") | Count | Not data: the List counts `input-required` only. The List spec rules the formula. Fixture unchanged. |
| C-21 | Palette card meta (`#63ac`, `#58f8`, … = the canvas's title hash) vs drawer "card 4605" (last 4 hex of the id) | Short ID | **Canonical (coordinator ruling):** short id = last 4 hex of the card id everywhere, and the six live Developer Experience card ids are re-keyed so their last 4 hex equal the palette's printed meta (§A.5.2 id note). Palette, drawer and list then agree with no mask. |
| C-22 | Studio desktop "The board at 13:19" / "synced 13:19" | — | Covered by C-16. |

## A.9 Seeding

### A.9.1 Why not a `.sql` file

`apps/api/scripts/seed-dev.sql` can only reach D1. Cards, runs, activities, gates, elicitations, approval subjects, references, links, comments, notifications and events live in each board's Durable Object SQLite (`board-do.ts` constructor). Under `wrangler dev` those are miniflare SQLite files keyed by an internal hash of `idFromName("<tenant>:<board>")`, which is not stable to compute from outside. The public API cannot set `created_at`, `state_since`, `ended_at` or `archived_at`, because every write uses `this.now()` (`new Date().toISOString()`, line 8250). So seeding goes through one dev-only route that writes both stores from a `World` JSON. `seed-vibes-fixture.sql` is **not** created.

### A.9.2 API: `POST /v1/dev/fixture`

- File: `apps/api/src/dev/fixture.ts` (new), dispatched from `apps/api/src/index.ts` before auth resolution, only when `env.DEV_AUTH === 'true' && env.FIXTURE_IMPORT === 'true'`. Otherwise it is a 404, exactly like an unknown path.
- `apps/api/package.json`: add `"dev:pixel": "wrangler dev --var DEV_AUTH:true --var FIXTURE_IMPORT:true --var ENFORCE_CONTROL_PAIR:false --var ORG_PLANE_ISSUER: --var ORG_PLANE_JWKS_URL: --var ORG_PLANE_AUDIENCE: --var ORG_PLANE_URL:"`.
- `FIXTURE_IMPORT` is never in `wrangler.jsonc`, and a vitest test asserts it stays absent, mirroring the DEV_AUTH comment.
- Body: `World` (§A.9.5). Response `200 {"ok":true,"boards":12,"cards":N}`.
- Semantics: **replace**. For `world.tenant.id` it:
  1. Deletes D1 rows in FK-safe order: `agent_card_queues`, `agent_tokens`, `capability_implications`, `capabilities`, `labels`, `project_rollups`, `milestones`, `projects`, `card_links_external`, `agents`, `boards`, `memberships`, then the `tenants` row and the `users` row (by id).
  2. Inserts everything (statements below).
  3. Calls `importFixture` on each board DO.

D1 statements (all `INSERT`, values bound from `World`):
```sql
INSERT INTO tenants (id, slug, name, forge_host, external_id, external_source, created_at) VALUES (?,?,?,?,?,?,?);
INSERT INTO users (id, email, name, created_at) VALUES (?,?,?,?);
INSERT INTO memberships (id, tenant_id, user_id, role, created_at) VALUES (?,?,?,?,?);
INSERT INTO boards (id, tenant_id, name, stages_json, created_by, created_by_agent_id, created_at, updated_at) VALUES (?,?,?,?,?,NULL,?,?);
INSERT INTO agents (id, tenant_id, name, icon_url, capabilities_json, connection_json, concurrency, status, external_id, external_source,
                    owner_user_id, may_queue_to_json, queue_ceiling_per_hour, board_ceiling_per_day, created_at)
  VALUES (?,?,?,NULL,?,'["rest"]',1,'offline',?,?,?,?,20,3,?);
INSERT INTO agent_tokens (id, tenant_id, agent_id, token_hash, scopes_json, created_at) VALUES (?,?,?,?,?,?);
INSERT INTO capabilities (id, tenant_id, key, name, description, tags_json, examples_json, input_modes_json, output_modes_json, origin, created_by, created_at)
  VALUES (?,?,?,?,?,'[]','[]','[]','[]',?,?,?);
INSERT INTO capability_implications (tenant_id, implies_from, implies_to, created_at, created_by) VALUES (?,?,?,?,?);
INSERT INTO labels (id, tenant_id, name, colour, origin, created_by, created_at) VALUES (?,?,?,?,?,?,?);
INSERT INTO projects (id, tenant_id, name, description, target_date, state, health, lead_user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?);
INSERT INTO milestones (id, project_id, tenant_id, name, target_date, sort_order, created_at) VALUES (?,?,?,?,?,?,?);
INSERT INTO card_links_external (tenant_id, from_board_id, from_card_id, to_board_id, to_card_id, kind, created_at) VALUES (?,?,?,?,?,?,?);
```

### A.9.3 Durable Object: `importFixture(board: FixtureBoard)`

New RPC on `BoardDO`, `apps/api/src/board/board-do.ts`, plus its signature in `BoardStub`. The route gates it. The method itself also refuses unless `this.env.FIXTURE_IMPORT === 'true'`, so it is gated in depth. It runs in one `this.ctx.storage.transactionSync`:

1. `DELETE FROM` each of: `meta`, `cards`, `runs`, `activities`, `events`, `usage_records`, `notifications`, `gates`, `approval_subjects`, `approval_delivery_events`, `elicitations`, `card_references`, `card_links`, `card_comments`, `schedules`, `profiles`, `push_configs`, `push_deliveries`, `run_reports`, `webhook_deliveries`.
2. `meta`: `INSERT INTO meta (k, v) VALUES (?, ?)` for boardId, tenantId, name, stages (JSON) and any `board.meta` extras.
3. `cards`: `INSERT INTO cards (id, title, spec_json, owner_user_id, current_stage_key, state, priority, context_id, delegate_agent_id, current_run_id, claim_seq, failure_count, handoff_json, created_at, updated_at, queued_by, queued_by_agent_id, queued_grant, labels, due_at, overdue_notified_at, archived_at, pending_advance_json, project_id, needs_human_json, milestone_id, completion_rework_json, auto_returns, state_since, stale_notified_at, active_approval_subject_id) VALUES (…31 params…)`.
4. `runs`: `INSERT INTO runs (id, card_id, stage_key, agent_id, lease_epoch, status, outcome, last_heartbeat_ms, started_at, ended_at, profile_key, completion, handoff_json, failure_reason, queued_by, updated_at) VALUES (…)`.
5. `activities`: `INSERT INTO activities (run_id, card_id, type, ephemeral, body, action, detail_json, ts) VALUES (…)`, in array order, so `seq` follows it.
6. `events`: `INSERT INTO events (type, payload_json, ts) VALUES (…)`, inserted **oldest first**.
7. `notifications`: `INSERT INTO notifications (kind, card_id, user_id, body, read, created_at) VALUES (…)`, oldest first.
8. `gates`: `INSERT INTO gates (id, card_id, stage_key, return_stage_key, status, decision, comment, produced_by, decided_by, options_json, created_at, resolved_at, run_id, approval_subject_id, approval_subject_digest, approval_decider_ids_json) VALUES (…)`.
9. `approval_subjects`: all 14 columns. `canonical_bytes` is bound as a `Uint8Array` decoded from the World's base64 field.
10. `elicitations`: all 14 columns.
11. `card_references`: `(id, card_id, url, title, subtitle, provider, source_type, external_id, metadata_json, sync_state, last_synced_at, added_by, created_at, updated_at, run_id)`.
12. `card_links (from_card_id, to_card_id, kind, created_at, created_by)` and `card_comments` (8 columns).
13. **No `emit()`** and no alarms scheduled, so importing does not append events or start the stale sweep. The stale sweep also never fires during a pixel run, because nothing schedules an alarm and the browser clock is the only clock that moves.

### A.9.4 Web: dev-only tenant/user override

`apps/web/src/lib/api.ts` line 9:
```ts
const TENANT = (import.meta.env.DEV && globalThis.localStorage?.getItem('superpipeline.devTenant')) || 'tnt_dev';
const DEV_USER = import.meta.env.DEV ? globalThis.localStorage?.getItem('superpipeline.devUser') : null;
const headers: Record<string, string> = { 'X-Tenant-Id': TENANT, 'Content-Type': 'application/json', ...(DEV_USER ? { 'X-User-Id': DEV_USER } : {}) };
```
The live WebSocket URL gains `&user=<DEV_USER>` next to `?tenant=`. `resolveUser`'s DEV_AUTH branch reads `X-User-Id ?? searchParams.get('user') ?? 'usr_dev'`, and **also selects `users.name`** for the returned principal (`SELECT name FROM users WHERE id = ?`). Without that, `/auth/me` has no "Rakesh Gangwar" (G-01).

The harness sets both keys with `addInitScript` before navigation, along with `superpipeline.boardId`.

### A.9.5 `World` type and seeder

Files:
- `apps/web/e2e/pixel/fixture/world.ts`: the data in §A.3–A.7 as typed objects. Bulky fields (`spec`, `queuedGrant`, `references`) are read from `fixture/source/after_brd_*.json` by ID.
- `apps/web/e2e/pixel/fixture/seed.ts`.

```ts
// apps/web/e2e/pixel/fixture/types.ts
export interface World {
  tenant: { id: string; slug: string; name: string; forgeHost: string | null; externalId: string | null; externalSource: string | null; createdAt: string };
  user: { id: string; email: string; name: string; createdAt: string };
  membership: { id: string; role: 'owner' | 'admin' | 'member' | 'viewer'; createdAt: string };
  boards: Array<{ id: string; name: string; stages: unknown[]; createdAt: string; updatedAt: string; createdBy: string }>;
  agents: Array<{ id: string; name: string; capabilities: string[]; externalId: string; ownerUserId: string; mayQueueTo: string[] | null; createdAt: string; tokens: number }>;
  capabilities: Array<{ key: string; description: string | null; origin: 'declared' | 'inferred'; createdAt: string }>;
  implications: Array<{ from: string; to: string; createdAt: string }>;
  labels: Array<{ id: string; name: string; colour: string; origin: 'declared' | 'inferred'; createdAt: string }>;
  projects: Array<{ id: string; name: string; description: string | null; targetDate: string | null; state: string; health: string | null; leadUserId: string; createdAt: string }>;
  milestones: Array<{ id: string; projectId: string; name: string; targetDate: string | null; sortOrder: number; createdAt: string }>;
  externalLinks: Array<{ fromBoardId: string; fromCardId: string; toBoardId: string; toCardId: string; kind: 'blocks' | 'relates'; createdAt: string }>;
  dos: Record<string, FixtureBoard>; // keyed by board id
}
export interface FixtureBoard {
  meta: Record<string, string>;
  cards: Array<Record<string, string | number | null>>;          // column → value, names exactly as §A.9.3
  runs: Array<Record<string, string | number | null>>;
  activities: Array<Record<string, string | number | null>>;
  events: Array<{ type: string; payload: unknown; ts: string }>;
  notifications: Array<{ kind: string; card_id: string; user_id: string; body: string; read: 0 | 1; created_at: string }>;
  gates: Array<Record<string, string | null>>;
  approvalSubjects: Array<Record<string, string | number | null> & { canonical_bytes_b64: string }>;
  elicitations: Array<Record<string, string | null>>;
  references: Array<Record<string, string | null>>;
  links: Array<{ from_card_id: string; to_card_id: string; kind: string; created_at: string; created_by: string | null }>;
  comments: Array<Record<string, string | null>>;
}
export type Variant = (w: World) => World; // pure; returns a patched deep copy
```

```ts
// apps/web/e2e/pixel/fixture/seed.ts
import type { APIRequestContext } from '@playwright/test';
import { BASE_WORLD } from './world';
import { VARIANTS } from './variants';
import type { World } from './types';

export const API = 'http://localhost:8787';
export const FIXTURE_TENANT = 'tnt_vibes';
export const FIXTURE_USER = 'usr_b19776fac3c94df4';

let lastKey: string | null = null;

/** Seeds base + variants. Skips the round trip when the previous screen used the same set. */
export async function seedWorld(request: APIRequestContext, variants: string[] = []): Promise<void> {
  const key = variants.join('+');
  if (key === lastKey) return;
  let world: World = structuredClone(BASE_WORLD);
  for (const v of variants) {
    const fn = VARIANTS[v];
    if (!fn) throw new Error(`unknown fixture variant: ${v}`);
    world = fn(world);
  }
  const res = await request.post(`${API}/v1/dev/fixture`, { data: world, headers: { 'X-Tenant-Id': FIXTURE_TENANT, 'Content-Type': 'application/json' } });
  if (!res.ok()) throw new Error(`fixture import failed: ${res.status()} ${await res.text()}`);
  lastKey = key;
}
```

`VARIANTS` keys: `card4605-live`, `card4605-desktop-daylight`, `card4605-desktop-paper`, `card4605-desktop-studio`, `card4605-desktop-quiet`, `states-A`, `states-B`, `states-C`, `states-D`, `states-E`, `states-F` (§A.7).

## A.10 Gaps

| ID | Gap | Ruling |
|---|---|---|
| G-01 | Under DEV_AUTH, `resolveUser` returns no `name`, so `/auth/me` cannot say "Rakesh Gangwar" | (b) In `apps/api/src/auth/resolve.ts`, the DEV_AUTH branch reads `users.name` and returns `name`. Contract unchanged (`User.name` already optional). |
| G-02 | The web client hard-codes `tnt_dev` and sends no user | (b) Dev-only override (§A.9.4). No effect in production builds (`import.meta.env.DEV` is false). |
| G-03 | Card labels reference IDs with no catalog row (+1) | (a) Client counts unresolved label IDs in the "+N" overflow. Owned by the board and list specs. The fixture keeps the dangling IDs on purpose. |
| G-04 | No API sets historical timestamps | (b) `POST /v1/dev/fixture` + `BoardDO.importFixture` (§A.9), dev-only and double-gated. |
| G-05 | Gate A's approval subject has schema `recommendation/v1`; the renderer knows `social-publish/v1` only | (b) The Card-States gate spec adds a generic key/value subject renderer for unknown schemas (Kind, Synthesis, Sources). The fixture provides the canonical bytes. |
| G-06 | Empty-board stage sentences are not in the data | Owned by the Empty-board spec ((a) or (b)). The fixture gives the stages only. |
| G-07 | Related prior work (Superlibrary lookup) has no local source | Harness route fulfilment (§A.7.2), per screen. The Card spec owns the endpoint name. The harness intercepts `**/related*` on the Superlibrary origin the app calls. |
| G-08 | Board "last used" in the switcher | Fixture provides `boards.updated_at` (§A.4.1). The switcher spec rules whether the API returns it (`BoardSummary.updatedAt`, contract change) or the client tracks recency. |

---

# Part B — The pixel-diff harness (`apps/web/e2e/pixel/`)

## B.1 Layout

```
apps/web/e2e/pixel/
  pixel.spec.ts            # one test per (screen × vibe × theme), generated from SCREENS
  screens.ts               # registry (B.2)
  reference.ts             # reference loader + dark derivation + font injection (B.3)
  app.ts                   # app renderer (B.4)
  compare.ts               # pixelmatch comparator + structural check (B.5)
  report.ts                # HTML report writer (B.6)
  fonts.ts                 # Fontsource → @font-face CSS under the mockup family names (B.3.2)
  fixture/{types,world,variants,seed}.ts, fixture/source/after_brd_*.json
  playwright.pixel.config.ts
apps/web/e2e/reference/mockups/*.html, manifest.json      # light references (existing)
apps/web/e2e/reference/mockups/<Artboard>@<vibe>.<theme>.html  # optional explicit exports (B.7)
```

devDependencies in `apps/web/package.json`: `"pixelmatch": "^7.1.0"`, `"pngjs": "^7.0.0"`, `"@types/pngjs": "^6.0.5"`. Fonts used only by references (they are in vibekit for Studio once the Annual-report tokens land; added here so the harness never depends on that ordering): `"@fontsource-variable/archivo": "^5.3.0"`, `"@fontsource-variable/azeret-mono": "^5.3.0"`.

Scripts:
- `"test:pixel": "playwright test -c e2e/pixel/playwright.pixel.config.ts"`
- `"test:pixel:report": "open test-results/pixel/index.html"`

## B.2 Screen registry

```ts
// apps/web/e2e/pixel/screens.ts
export type Vibe = 'daylight' | 'paper' | 'studio' | 'quiet';
export type Theme = 'light' | 'dark';
export interface Mask { id: string; x: number; y: number; w: number; h: number; why: string } // artboard px
export interface Screen {
  artboard: string;                     // manifest key, e.g. 'SP-Board-Daylight'
  vibes: Vibe[];                        // vibes this artboard depicts (fixed-vibe boards: one; prop-vibe: all four)
  route: string;                        // app path
  variants?: string[];                  // fixture variants (A.7)
  clock?: string;                       // ISO with offset, default '2026-10-11T13:51:00+05:30'
  strength?: 'strong' | 'subtle' | 'off';
  steps?: (page: import('@playwright/test').Page) => Promise<void>;
  hold?: string[];                      // URL globs whose responses never resolve (loading states)
  fulfil?: Record<string, { status: number; json: unknown }>;
  mode?: { kind: 'full' } | { kind: 'panels'; ref: string; app: string; count: number };
  masks?: Mask[];
  darkNeedsExport?: boolean;            // dark derived by swap is not valid (B.3.3)
}

const DX = '/b/brd_134a0ddb6d434478';
const C4605 = `${DX}/c/card_05823a57e8224605`;

export const SCREENS: Screen[] = [
  { artboard: 'SP-Board-Daylight', vibes: ['daylight'], route: DX, steps: (p) => p.getByRole('button', { name: /^AgentPod: connector interface/ }).first().hover() },
  { artboard: 'SP-Board-Paper', vibes: ['paper'], route: DX },
  { artboard: 'SP-Board-Studio', vibes: ['studio'], route: DX, clock: '2026-10-11T13:19:00+05:30' },
  { artboard: 'SP-Board-Quiet', vibes: ['quiet'], route: '/b/brd_f47143722126442c', strength: 'off' },
  { artboard: 'SP-Board-Empty', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: '/b/brd_2441b5578f704b93' },
  { artboard: 'SP-List-Daylight', vibes: ['daylight'], route: `${DX}?view=list` },
  { artboard: 'SP-List-Paper', vibes: ['paper'], route: `${DX}?view=list` },
  { artboard: 'SP-List-Studio', vibes: ['studio'], route: `${DX}?view=list`, clock: '2026-10-11T13:19:00+05:30', steps: (p) => p.keyboard.press('j') },
  { artboard: 'SP-List-Quiet', vibes: ['quiet'], route: `${DX}?view=list`, strength: 'off' },
  { artboard: 'SP-Operate-Daylight', vibes: ['daylight'], route: `${DX}/operate`, steps: async (p) => {
      await p.getByRole('button', { name: 'Resume tester-tim' }).click();
      await p.getByRole('textbox', { name: /What changed/ }).fill('The Forge mirror is now writable and tester-tim has write access. Push the red-test commit and carry on.');
    } },
  { artboard: 'SP-Operate-Paper', vibes: ['paper'], route: `${DX}/operate` },
  { artboard: 'SP-Operate-Studio', vibes: ['studio'], route: `${DX}/operate`, clock: '2026-10-11T13:19:00+05:30' },
  { artboard: 'SP-Operate-Quiet', vibes: ['quiet'], route: `${DX}/operate`, strength: 'off', steps: (p) => p.getByRole('button', { name: 'Resume this card' }).nth(1).click() },
  { artboard: 'SP-Projects', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: `${DX}?view=projects`, strength: 'subtle', hold: ['**/v1/projects/*/rollup'] },
  { artboard: 'SP-Workspace-Agents', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: '/workspace/agents', strength: 'subtle',
    steps: async (p) => { await p.getByRole('button', { name: 'Actions for writer-quill' }).first().click(); await p.getByRole('menuitem', { name: 'Issue a token' }).click(); await p.getByRole('button', { name: 'Actions for analyst-echo' }).first().click(); await p.getByRole('menuitem', { name: 'Edit agent' }).click(); },
    masks: [{ id: 'C-07', x: 0, y: 0, w: 1440, h: 120, why: 'header crew pill' }] },
  { artboard: 'SP-Workspace-Other', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: '/workspace/needs-you', strength: 'subtle',
    mode: { kind: 'panels', ref: 'section.panel', app: '[data-pixel="workspace-tab-panel"]', count: 5 } },
  { artboard: 'SP-Settings', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: `${DX}/settings`, strength: 'subtle',
    steps: (p) => p.getByRole('button', { name: /^2\s*Reproduce/ }).click() },
  { artboard: 'SP-Spend', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: `${DX}/operate/telemetry`, strength: 'subtle' },
  { artboard: 'SP-Dlg-NewCard', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: DX, steps: (p) => p.keyboard.press('n') },
  { artboard: 'SP-Dlg-Palette', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: DX, steps: async (p) => { await p.keyboard.press('Meta+k'); await p.keyboard.type('agent'); } },
  { artboard: 'SP-Dlg-Appearance', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: DX, darkNeedsExport: true,
    steps: (p) => p.getByRole('button', { name: /^Appearance/ }).first().click() },
  { artboard: 'SP-Dlg-Move', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: DX,
    steps: async (p) => { await p.getByRole('button', { name: /^Move AgentPod: connector interface/ }).first().click(); await p.getByRole('radio', { name: /^Fix/ }).check(); } },
  { artboard: 'SP-Dlg-Reconnect', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: C4605, variants: ['card4605-live'],
    fulfil: { '**/auth/me': { status: 200, json: { user: null } }, '**/v1/boards/**': { status: 401, json: { error: 'unauthorized' } } } },
  { artboard: 'SP-Dlg-BoardSwitcher', vibes: ['daylight', 'paper', 'studio', 'quiet'], route: DX, steps: (p) => p.getByRole('button', { name: /Developer Experience/ }).first().click() },
  ...(['Daylight', 'Paper', 'Studio', 'Quiet'] as const).flatMap((V) => {
    const v = V.toLowerCase() as Vibe;
    const s = v === 'quiet' ? ('off' as const) : undefined;
    const backdrop: Mask = { id: 'C-08', x: 0, y: 0, w: { daylight: 920, paper: 380, studio: 680, quiet: 800 }[v], h: 4000, why: 'drawer backdrop' };
    const panelRef = { daylight: '.ds-card', paper: '.ps-sheet', studio: '.ss-panel', quiet: '.qs-panel' }[v];
    return [
      { artboard: `SP-Card-${V}`, vibes: [v], route: C4605, strength: s, variants: ['card4605-live', `card4605-desktop-${v}`], clock: v === 'studio' ? '2026-10-11T13:27:00+05:30' : undefined, masks: [backdrop] },
      { artboard: `SP-CardPage-${V}`, vibes: [v], route: `${C4605}/page`, strength: s, variants: ['card4605-live', `card4605-desktop-${v}`] },
      { artboard: `SP-Phone-Card-${V}`, vibes: [v], route: C4605, strength: s, variants: ['card4605-live'] },
      { artboard: `SP-Phone-Board-${V}`, vibes: [v], route: DX, strength: s, clock: v === 'studio' ? '2026-10-11T13:31:00+05:30' : undefined },
      { artboard: `SP-Card-States-${V}`, vibes: [v], route: '(per panel)', strength: s, mode: { kind: 'panels', ref: panelRef, app: '[data-pixel="card-top"]', count: 6 } },
    ] satisfies Screen[];
  }),
];

/** Card-States panel → fixture variant + route. Panel i (0-based) maps to A..F. */
export const STATE_PANELS = [
  { variant: 'states-A', route: '/b/brd_fa33a0a0721d4d18/c/card_42269e99036f42ae' },
  { variant: 'states-B', route: '/b/brd_134a0ddb6d434478/c/card_e10fb4fe39a91dfc' },
  { variant: 'states-C', route: '/b/brd_e247f164e060443f/c/card_e1eb201927f94506' },
  { variant: 'states-D', route: '/b/brd_f47143722126442c/c/card_f180b1627c594b41' },
  { variant: 'states-E', route: '/b/brd_fa33a0a0721d4d18/c/card_42269e99036f42ae', fulfil: { '**/gates/gate_fx_p4/resolve': { status: 409, json: { error: 'already_decided', decidedBy: 'Rakesh Gangwar', decidedVia: 'matrix', decidedAt: '2026-10-11T07:32:00Z' } } } },
  { variant: 'states-F', route: '/b/brd_134a0ddb6d434478/c/card_05823a57e8224605', hold: ['**/cards/card_05823a57e8224605/attempts', '**/cards/card_05823a57e8224605/activities'] },
] as const;
```

Route strings (`?view=list`, `/c/<id>/page`, `/operate/telemetry`) and accessible names in `steps` must match what the owning screen specs define. If a screen spec names a different route or label, this registry follows that spec in the same PR. Phone screens set the viewport from the manifest (390 wide), so the shell renders its phone layout.

Masks with conflict IDs C-01, C-03, C-04, C-10, C-13, C-17, C-18 are added by the implementing PR. Each mask's rectangle is taken from the reference DOM: `getBoundingClientRect()` of the named element, which `mask.ts` resolves from a selector (`maskSelectors`) rather than hand-typed numbers. Hand-typed rectangles are allowed only for the backdrop mask above.

## B.3 Reference rendering

### B.3.1 Loading

Each reference is a complete static document, with styles inlined and scripts removed, sized by `manifest.json` (`w × h` = true artboard size). The harness serves it from a fake origin, `http://pixel.local/`, through `page.route`, so that fonts and patched HTML come from the same place and no network is used:
- `page.setViewportSize({ width: w, height: h })`, `deviceScaleFactor: 1`.
- `page.goto('http://pixel.local/ref/<artboard>.html')`.
- `document.fonts.ready`.
- Screenshot clipped to `{0, 0, w, h}`.

### B.3.2 Fonts: one file set for both sides

The references link Google Fonts (`fonts.googleapis.com/css2?family=Archivo…`, `…Atkinson+Hyperlegible+Next…`, plus italic variant links). The app self-hosts Fontsource through vibekit `fonts.css`. Different files rasterise differently (hinting, subsetting, version), which would put a font noise floor on every comparison. Rule:

1. In the reference page, every `https://fonts.googleapis.com/**` and `https://fonts.gstatic.com/**` request is aborted (`route.abort()`). The `<link>` elements are also stripped from the HTML before serving, so no request is attempted.
2. The harness injects `http://pixel.local/fonts.css`, generated by `fonts.ts` from the **same npm packages the app bundles**, with each `font-family` renamed from Fontsource's name (`'Figtree Variable'`) to the mockup's (`'Figtree'`). The `url()` values point at `http://pixel.local/fontsource/<pkg>/files/<file>.woff2`, served from `apps/web/node_modules/<pkg>/files/`.
3. The app is not touched: it already loads those files. vibekit's token CSS must name the families the way it imports them. The tokens spec ensures vibekit's `--vk-font-*` resolve to the Fontsource family names (`"Figtree Variable"` etc.), and the injected reference CSS maps the mockup names onto the same files. Both sides therefore rasterise identical bytes.

Map (mockup family → package → CSS entry, which carries all axes the mockup requests):

| Mockup family | Package | Entry file |
|---|---|---|
| Archivo (wdth 62–125, wght) | `@fontsource-variable/archivo` | `wdth.css` |
| Azeret Mono (incl. italic) | `@fontsource-variable/azeret-mono` | `index.css`, `wght-italic.css` |
| Newsreader (opsz, wght, italic) | `@fontsource-variable/newsreader` | `opsz.css`, `opsz-italic.css` |
| Atkinson Hyperlegible Next 400/700 (+italic) | `@fontsource/atkinson-hyperlegible-next` | `400.css`, `700.css`, `400-italic.css`, `700-italic.css` |
| Bricolage Grotesque (opsz, wght) | `@fontsource-variable/bricolage-grotesque` | `opsz.css` |
| Figtree (incl. italic) | `@fontsource-variable/figtree` | `index.css`, `wght-italic.css` |
| Geist (incl. italic) | `@fontsource-variable/geist` | `index.css` (italic absent upstream: the browser synthesises it on both sides) |
| Instrument Sans (incl. italic) | `@fontsource-variable/instrument-sans` | `index.css`, `wght-italic.css` |
| Martian Mono | `@fontsource-variable/martian-mono` | `index.css` |

Both pages then wait `await document.fonts.ready` **and** an explicit `document.fonts.load()` for every family used on the page (collected from computed styles), so a lazily triggered face cannot land after the screenshot.

### B.3.3 Dark references

Every artboard root carries `data-theme="{{theme}}"` (light in the export). The Appearance dialog's four preview cards (`label.vc`) also carry `data-theme="{{theme}}"`. All theme CSS is attribute-driven (`[data-theme="dark"] …` in vk.css and in each artboard's own `<style>`). So swapping `data-theme="light"` → `"dark"` on every element is valid, **except** where the canvas branched in script on the theme prop (`sc-if value="{{isDark}}"`, resolved at export). The audit of all 44 `.dc.html` sources found exactly these:

| Artboards | Theme branch | Handling |
|---|---|---|
| SP-Board-Daylight, SP-Card-Daylight, SP-List-Daylight, SP-Operate-Daylight | Appearance button icon: sun (light) / moon (dark) in `.dy-round[aria-label="Appearance"]` | Patch: replace the button's `<svg>` children with `<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"></path>` |
| SP-Dlg-Appearance | Theme radio `tc` = `sun`/`dark` (the checked segment) and the derived `theme` | `darkNeedsExport: true`: dark compared only against an explicit export `SP-Dlg-Appearance@<vibe>.dark.html`; until exported → `missing-reference` |
| Paper/Studio/Quiet artboards with a static "Dark theme" button `aria-pressed="false"` | The pressed state may be styled (`.textbtn[aria-pressed="true"]`, `.toggle …`) | Patch: in dark, set `aria-pressed="true"` on every `button` whose trimmed text is `Dark theme` |

Prop-vibe artboards (Board-Empty, Projects, Workspace-*, Settings, Spend, Dlg-*) were exported only with `vibe=daylight`. For other vibes the loader looks for `<artboard>@<vibe>.<theme>.html`, then `<artboard>@<vibe>.light.html` + swap. If neither exists, the result is `missing-reference`: reported, not failed, and counted in the summary so it cannot be mistaken for a pass. (Changing `data-vibe` by swap would be wrong: those sources branch on `isPaper`/`isStudio`/`isQuiet` in markup.)

## B.4 App rendering

For each (screen, vibe, theme):
1. `seedWorld(request, screen.variants)` (§A.9.5).
2. New context: `viewport {w, h}` from the manifest, `deviceScaleFactor: 1`, `timezoneId: 'Asia/Kolkata'`, `locale: 'en-GB'`, `reducedMotion: 'reduce'`, `colorScheme: theme`.
3. `context.addCookies([{ name: 'vk_appearance', value: \`${vibe}.${theme}.${strength}.0\`, url: 'http://localhost:5173' }])`. Strength defaults to the screen's value, or `off` for Quiet and `strong` otherwise.
4. `page.addInitScript`: localStorage `superpipeline.devTenant=tnt_vibes`, `superpipeline.devUser=usr_b19776fac3c94df4`, `superpipeline.boardId=<board in route>`.
5. `await page.clock.install({ time: new Date(clock) })`, then `await page.clock.pauseAt(new Date(clock))`. The clock is frozen before any app script runs, so HEAD_SCRIPT, relative times and greetings all read the fixed instant. Timers stay paused, so the 5-minute refresh and stale polls never fire. Where the app needs a microtask timer to settle (debounces), the harness calls `page.clock.runFor(1000)` after `steps`, and that is the only time it advances.
6. Routes: `hold` globs never resolve (`route => new Promise(() => {})`). `fulfil` globs are fulfilled. The hub (`https://hub.agentpod.dev/**`) and Superlibrary origins are aborted unless fulfilled.
7. `page.goto(route)`, then wait for: `document.fonts.ready` plus the explicit loads (§B.3.2); `networkidle`; and the app's readiness hook `document.documentElement.dataset.ready === 'true'`. The app sets it when the store has the board, agents, members, labels and projects loaded and no request is in flight. This is a new attribute set in `stores/app.svelte.ts`, dev builds only.
8. `steps`, then a 2-frame `requestAnimationFrame` settle.
9. Inject the stabiliser CSS: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`. Hide the scrollbar with `::-webkit-scrollbar{display:none}`.
10. Screenshot: `fullPage: true`. The app's document height should equal the artboard height. If it differs, that is a real layout difference (§B.5).

## B.5 Comparison

- Engine: `pixelmatch(ref, app, diff, w, h, { threshold: 0.1, includeAA: false, alpha: 0.3, diffColor: [255, 0, 64], aaColor: [255, 200, 0] })`.
- Size: if the heights differ, both images are padded to the larger height (transparent). Every padded row counts as fully differing, and the result carries `sizeMismatch: {ref: h1, app: h2}`. **A size mismatch is a failure regardless of ratio**: a page 40 px too tall has misplaced everything below the cause, even if most pixels still happen to match.
- Masks: masked rectangles are painted the same flat colour (`#ff00ff`) on both images before comparing, and are drawn hatched in the report.
- Metrics:
  - `ratio = diffPixels / (w × h − maskedPixels)`.
  - **Structural check**: the image is tiled into 8×8 blocks. A block "breaks" when more than 40% of its unmasked pixels differ. `brokenBlocks` counts them. A whole-glyph or whole-icon difference breaks blocks; anti-aliasing never does.
- **Pass** iff `!sizeMismatch && ratio ≤ 0.005 && brokenBlocks === 0`.
- **Warn**, reported but not failing, iff it passes but `ratio > 0.001`. This catches drift early.
- **Dynamic regions**: with the frozen clock nothing is relative-time dynamic, so no mask is needed for times. These always get masks: the "Live" dot (`.live-dot` / `[data-live]`, which pulses in non-reduced motion; reduced motion should stop it, but the mask guards against a missed rule), the text caret, and the token banner's dots on Workspace-Agents, which are fixed text and therefore not masked. Every other mask must cite a conflict ID from §A.8, and `compare.ts` refuses a mask without `id`.

Panels mode (Card-States, Workspace-Other): the reference is screenshotted per element (`locator(ref).nth(i).screenshot()`). The app renders panel i's route and variant and screenshots `locator(app).first()`. The same rules apply per panel, and the screen passes only if every panel passes.

## B.6 Report

`test-results/pixel/index.html` is one row per (screen, vibe, theme), showing:
- status (pass / warn / fail / missing-reference);
- ratio, broken blocks and size;
- three images side by side (reference | app | diff);
- a slider overlay (CSS `clip-path` driven by a range input).

Failures sort first. PNGs are written to `test-results/pixel/<artboard>/<vibe>.<theme>.{ref,app,diff}.png`, along with `results.json`. CI uploads the folder as an artifact.

## B.7 Refreshing references when the canvas changes

1. Start the receiver: `node scripts/pixel/recv.mjs apps/web/e2e/reference/mockups` (a copy of the session `recv.mjs`, committed at `apps/web/scripts/pixel/recv.mjs`). It listens on `:8977` and writes `<name>.html` from POSTed DOM.
2. In the Design canvas, open the project. For each artboard, and each prop combination needed (`theme=dark` for Appearance; `vibe=paper|studio|quiet` for prop-vibe artboards; `rollups=loaded`, `data=with spend` when those variants become binding), set the props and run in the console:
   `fetch('http://localhost:8977/?name=' + encodeURIComponent('<Artboard>@<vibe>.<theme>'), {method:'POST', body: document.querySelector('[data-artboard="<Artboard>"] iframe').contentDocument.documentElement.outerHTML})`.
   Default-prop exports keep the plain `<Artboard>.html` name.
3. Update `manifest.json`: `w`, `h` = the artboard's true size (the export's `<!-- size WxH -->` comment line).
4. Run `pnpm --filter @superpipeline/web test:pixel -g <Artboard>`. Commit the HTML and the manifest together with the reason ("canvas: C-07 correction").
5. When a correction from §A.8 is exported, delete its mask in the same commit. `screens.ts` has a test asserting that every mask's conflict ID is still listed as open in this spec's conflicts table (it reads `fixtures-and-harness.md` and fails on an unknown ID). Closing a conflict therefore removes its mask.

## B.8 CI

- New job `pixel` in `.github/workflows/ci.yml`. It runs after `e2e`, on `ubuntu-latest` with the same pinned Playwright Chromium (`npx playwright install --with-deps chromium`). It runs `pnpm --filter @superpipeline/api dev:pixel` and the web dev server through the pixel config's `webServer`, then `pnpm --filter @superpipeline/web test:pixel`, and uploads `test-results/pixel/` always. It also runs on Forge.
- Platform: references and app screenshots are rendered **in the same browser process, on the same OS, with the same font files (§B.3.2), in the same run**. No stored screenshot baseline exists, so macOS-vs-Linux rasterisation differences cancel out, and no per-platform baselines are needed. **Confirmed.** The only residual platform effect would be fonts falling back to system faces. The harness asserts `document.fonts.check('16px "<family>"')` for every mapped family on both pages, and fails setup if any family is missing.
- Rollout: while screens are being built, the job runs with `PIXEL_ENFORCE=0`, which reports but never fails the job. Each screen spec's PR adds its artboards to `ENFORCED` in `screens.ts`. A listed screen that fails fails CI.

## B.9 Code

```ts
// apps/web/e2e/pixel/playwright.pixel.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'pixel.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: '../../test-results/pixel-artifacts',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173', deviceScaleFactor: 1 },
  webServer: [
    { command: 'pnpm --filter @superpipeline/web build && pnpm --filter @superpipeline/api dev:setup && pnpm --filter @superpipeline/api dev:pixel', url: 'http://localhost:8787/health', reuseExistingServer: !process.env.CI, timeout: 180_000 },
    { command: 'pnpm --filter @superpipeline/web dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
```

```ts
// apps/web/e2e/pixel/fonts.ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

/** mockup family → [package, css entry files…]; Fontsource family name is read from the CSS. */
export const FONT_MAP: Record<string, [string, ...string[]]> = {
  'Archivo': ['@fontsource-variable/archivo', 'wdth.css'],
  'Azeret Mono': ['@fontsource-variable/azeret-mono', 'index.css', 'wght-italic.css'],
  'Newsreader': ['@fontsource-variable/newsreader', 'opsz.css', 'opsz-italic.css'],
  'Atkinson Hyperlegible Next': ['@fontsource/atkinson-hyperlegible-next', '400.css', '700.css', '400-italic.css', '700-italic.css'],
  'Bricolage Grotesque': ['@fontsource-variable/bricolage-grotesque', 'opsz.css'],
  'Figtree': ['@fontsource-variable/figtree', 'index.css', 'wght-italic.css'],
  'Geist': ['@fontsource-variable/geist', 'index.css'],
  'Instrument Sans': ['@fontsource-variable/instrument-sans', 'index.css', 'wght-italic.css'],
  'Martian Mono': ['@fontsource-variable/martian-mono', 'index.css'],
};

export function pkgDir(pkg: string): string {
  return dirname(require.resolve(`${pkg}/package.json`));
}

/** @font-face CSS for the reference page: Fontsource files under the mockup's family names. */
export function referenceFontCss(origin = 'http://pixel.local'): string {
  const out: string[] = [];
  for (const [family, [pkg, ...entries]] of Object.entries(FONT_MAP)) {
    for (const entry of entries) {
      let css: string;
      try { css = readFileSync(join(pkgDir(pkg), entry), 'utf8'); } catch { continue; } // optional italic entries
      css = css
        .replace(/font-family:\s*'[^']+'/g, `font-family: '${family}'`)
        .replace(/url\(\.\/files\/([^)]+)\)/g, `url(${origin}/fontsource/${pkg}/files/$1)`);
      out.push(css);
    }
  }
  return out.join('\n');
}

export const FAMILIES = Object.keys(FONT_MAP);
```

```ts
// apps/web/e2e/pixel/reference.ts
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { referenceFontCss, pkgDir, FAMILIES } from './fonts';
import type { Theme, Vibe } from './screens';

export const REF_DIR = resolve(__dirname, '../reference/mockups');
export const MANIFEST: Record<string, { w: number; h: number; title: string }> = JSON.parse(readFileSync(join(REF_DIR, 'manifest.json'), 'utf8'));
const MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"></path>';

export type RefSource = { file: string; derivedDark: boolean } | null;

/** Which file renders (artboard, vibe, theme), or null when no valid reference exists. */
export function resolveReference(artboard: string, vibe: Vibe, theme: Theme, fixedVibe: boolean, darkNeedsExport = false): RefSource {
  const exact = join(REF_DIR, `${artboard}@${vibe}.${theme}.html`);
  if (existsSync(exact)) return { file: exact, derivedDark: false };
  const vibeLight = join(REF_DIR, `${artboard}@${vibe}.light.html`);
  const base = join(REF_DIR, `${artboard}.html`);
  const lightFile = existsSync(vibeLight) ? vibeLight : fixedVibe || vibe === 'daylight' ? base : null;
  if (!lightFile || !existsSync(lightFile)) return null;
  if (theme === 'light') return { file: lightFile, derivedDark: false };
  if (darkNeedsExport) return null;
  return { file: lightFile, derivedDark: true };
}

/** Light → dark by attribute swap plus the audited patches (B.3.3). */
export function deriveDark(html: string): string {
  return html.replace(/data-theme="light"/g, 'data-theme="dark"');
}

function stripGoogleFonts(html: string): string {
  return html.replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>/g, '');
}

async function applyDarkPatches(page: Page): Promise<void> {
  await page.evaluate((moon) => {
    for (const b of document.querySelectorAll<HTMLButtonElement>('.dy-round[aria-label="Appearance"]')) {
      const svg = b.querySelector('svg');
      if (svg) svg.innerHTML = moon;
    }
    for (const b of document.querySelectorAll('button')) {
      if (b.textContent?.trim() === 'Dark theme' && b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'true');
    }
  }, MOON);
}

export async function installPixelOrigin(page: Page, html: string): Promise<void> {
  const fontCss = referenceFontCss();
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('http://pixel.local/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/ref/')) return route.fulfill({ status: 200, contentType: 'text/html', body: html });
    if (url.pathname === '/fonts.css') return route.fulfill({ status: 200, contentType: 'text/css', body: fontCss });
    const m = /^\/fontsource\/(@[^/]+\/[^/]+|[^@/][^/]*)\/files\/(.+)$/.exec(url.pathname);
    if (m) return route.fulfill({ status: 200, contentType: 'font/woff2', body: readFileSync(join(pkgDir(m[1]!), 'files', m[2]!)) });
    return route.fulfill({ status: 404, body: '' });
  });
}

export async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(async (families) => {
    await document.fonts.ready;
    const used = new Set<string>();
    for (const el of document.querySelectorAll('*')) used.add(getComputedStyle(el).fontFamily.split(',')[0]!.trim().replace(/^["']|["']$/g, ''));
    await Promise.all(
      [...used].filter((f) => families.includes(f) || /Variable$/.test(f)).flatMap((f) => [
        document.fonts.load(`400 16px "${f}"`), document.fonts.load(`700 16px "${f}"`), document.fonts.load(`italic 400 16px "${f}"`),
      ]),
    );
    await document.fonts.ready;
  }, FAMILIES);
}

export async function assertFamiliesLoaded(page: Page, families: string[]): Promise<void> {
  const missing = await page.evaluate((fs) => fs.filter((f) => !document.fonts.check(`16px "${f}"`)), families);
  if (missing.length) throw new Error(`fonts not loaded: ${missing.join(', ')}`);
}

/** Renders a reference and returns the PNG (full artboard, or one buffer per panel). */
export async function renderReference(page: Page, src: NonNullable<RefSource>, artboard: string, panels?: { selector: string; count: number }): Promise<Buffer[]> {
  const { w, h } = MANIFEST[artboard]!;
  let html = stripGoogleFonts(readFileSync(src.file, 'utf8'));
  if (src.derivedDark) html = deriveDark(html);
  html = html.replace('</head>', '<link rel="stylesheet" href="http://pixel.local/fonts.css"><style>*,*::before,*::after{animation:none!important;transition:none!important}::-webkit-scrollbar{display:none}</style></head>');
  await page.setViewportSize({ width: w, height: h });
  await installPixelOrigin(page, html);
  await page.goto(`http://pixel.local/ref/${artboard}.html`);
  if (src.derivedDark) await applyDarkPatches(page);
  await waitForFonts(page);
  if (panels) {
    const out: Buffer[] = [];
    for (let i = 0; i < panels.count; i++) out.push(await page.locator(panels.selector).nth(i).screenshot({ animations: 'disabled' }));
    return out;
  }
  return [await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, animations: 'disabled' })];
}
```

```ts
// apps/web/e2e/pixel/app.ts
import type { Browser, Page } from '@playwright/test';
import { MANIFEST, waitForFonts } from './reference';
import { FIXTURE_TENANT, FIXTURE_USER } from './fixture/seed';
import type { Screen, Theme, Vibe } from './screens';

export const DEFAULT_CLOCK = '2026-10-11T13:51:00+05:30';
const STABILISE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}::-webkit-scrollbar{display:none}';

export interface AppTarget { route: string; fulfil?: Screen['fulfil']; hold?: string[]; steps?: Screen['steps'] }

export async function renderApp(browser: Browser, screen: Screen, target: AppTarget, vibe: Vibe, theme: Theme, panel?: string): Promise<Buffer> {
  const { w, h } = MANIFEST[screen.artboard]!;
  const strength = screen.strength ?? (vibe === 'quiet' ? 'off' : 'strong');
  const context = await browser.newContext({
    viewport: { width: w, height: h }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', locale: 'en-GB',
    reducedMotion: 'reduce', colorScheme: theme, baseURL: 'http://localhost:5173',
  });
  await context.addCookies([{ name: 'vk_appearance', value: `${vibe}.${theme}.${strength}.0`, url: 'http://localhost:5173' }]);
  const boardId = /\/b\/([^/?]+)/.exec(target.route)?.[1] ?? '';
  await context.addInitScript(([t, u, b]) => {
    localStorage.setItem('superpipeline.devTenant', t);
    localStorage.setItem('superpipeline.devUser', u);
    if (b) localStorage.setItem('superpipeline.boardId', b);
  }, [FIXTURE_TENANT, FIXTURE_USER, boardId] as const);
  const page: Page = await context.newPage();
  const clock = new Date(screen.clock ?? DEFAULT_CLOCK);
  await page.clock.install({ time: clock });
  await page.clock.pauseAt(clock);
  for (const glob of target.hold ?? []) await page.route(glob, () => new Promise<void>(() => {}));
  for (const [glob, r] of Object.entries(target.fulfil ?? {})) await page.route(glob, (route) => route.fulfill({ status: r.status, json: r.json }));
  await page.route('https://hub.agentpod.dev/**', (r) => r.abort());
  try {
    await page.goto(target.route);
    await page.waitForLoadState('networkidle');
    if (!target.hold?.length) await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: 15_000 });
    await waitForFonts(page);
    if (target.steps) { await target.steps(page); await page.clock.runFor(1000); }
    await page.addStyleTag({ content: STABILISE });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (panel) return await page.locator(panel).first().screenshot({ animations: 'disabled' });
    return await page.screenshot({ fullPage: true, animations: 'disabled' });
  } finally {
    await context.close();
  }
}
```

```ts
// apps/web/e2e/pixel/compare.ts
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import type { Mask } from './screens';

export const PIXEL_THRESHOLD = 0.1;
export const MAX_RATIO = 0.005;
export const WARN_RATIO = 0.001;
export const BLOCK = 8;
export const BLOCK_BREAK = 0.4;

export interface Result {
  ratio: number; diffPixels: number; brokenBlocks: number;
  sizeMismatch: { ref: [number, number]; app: [number, number] } | null;
  status: 'pass' | 'warn' | 'fail'; diff: Buffer; ref: Buffer; app: Buffer;
}

function pad(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h }); // transparent
  PNG.bitblt(img, out, 0, 0, Math.min(img.width, w), Math.min(img.height, h), 0, 0);
  return out;
}

function paintMasks(img: PNG, masks: Mask[]): void {
  for (const m of masks) {
    for (let y = Math.max(0, m.y); y < Math.min(img.height, m.y + m.h); y++)
      for (let x = Math.max(0, m.x); x < Math.min(img.width, m.x + m.w); x++) {
        const i = (y * img.width + x) * 4;
        img.data[i] = 255; img.data[i + 1] = 0; img.data[i + 2] = 255; img.data[i + 3] = 255;
      }
  }
}

export function compare(refBuf: Buffer, appBuf: Buffer, masks: Mask[] = []): Result {
  for (const m of masks) if (!m.id) throw new Error('every mask must cite a conflict id (fixtures-and-harness.md §A.8)');
  const ref0 = PNG.sync.read(refBuf);
  const app0 = PNG.sync.read(appBuf);
  const w = Math.max(ref0.width, app0.width);
  const h = Math.max(ref0.height, app0.height);
  const sizeMismatch = ref0.width !== app0.width || ref0.height !== app0.height
    ? { ref: [ref0.width, ref0.height] as [number, number], app: [app0.width, app0.height] as [number, number] } : null;
  const ref = pad(ref0, w, h);
  const app = pad(app0, w, h);
  paintMasks(ref, masks);
  paintMasks(app, masks);
  const diff = new PNG({ width: w, height: h });
  const diffPixels = pixelmatch(ref.data, app.data, diff.data, w, h, {
    threshold: PIXEL_THRESHOLD, includeAA: false, alpha: 0.3, diffColor: [255, 0, 64], aaColor: [255, 200, 0],
  });
  let masked = 0;
  for (const m of masks) masked += Math.max(0, Math.min(w, m.x + m.w) - Math.max(0, m.x)) * Math.max(0, Math.min(h, m.y + m.h) - Math.max(0, m.y));
  const ratio = diffPixels / Math.max(1, w * h - masked);
  // Structural check: an 8×8 block "breaks" when >40% of its pixels are diff-coloured.
  let brokenBlocks = 0;
  for (let by = 0; by < h; by += BLOCK)
    for (let bx = 0; bx < w; bx += BLOCK) {
      let n = 0, d = 0;
      for (let y = by; y < Math.min(h, by + BLOCK); y++)
        for (let x = bx; x < Math.min(w, bx + BLOCK); x++) {
          const i = (y * w + x) * 4;
          if (ref.data[i] === 255 && ref.data[i + 1] === 0 && ref.data[i + 2] === 255) continue; // masked
          n++;
          if (diff.data[i] === 255 && diff.data[i + 1] === 0 && diff.data[i + 2] === 64) d++;
        }
      if (n > 0 && d / n > BLOCK_BREAK) brokenBlocks++;
    }
  const pass = !sizeMismatch && ratio <= MAX_RATIO && brokenBlocks === 0;
  return {
    ratio, diffPixels, brokenBlocks, sizeMismatch,
    status: pass ? (ratio > WARN_RATIO ? 'warn' : 'pass') : 'fail',
    diff: PNG.sync.write(diff), ref: PNG.sync.write(ref), app: PNG.sync.write(app),
  };
}
```

```ts
// apps/web/e2e/pixel/report.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Result } from './compare';

export const OUT = resolve(__dirname, '../../test-results/pixel');

export interface Row {
  artboard: string; vibe: string; theme: string; panel?: number;
  status: Result['status'] | 'missing-reference'; ratio?: number; brokenBlocks?: number;
  sizeMismatch?: Result['sizeMismatch']; masks?: string[];
}
const rows: Row[] = [];

function base(r: Row): string {
  return `${r.artboard}/${r.vibe}.${r.theme}${r.panel !== undefined ? `.p${r.panel}` : ''}`;
}

export function record(row: Row, result?: Result): void {
  if (result) {
    const dir = join(OUT, row.artboard);
    mkdirSync(dir, { recursive: true });
    const b = join(OUT, base(row));
    writeFileSync(`${b}.ref.png`, result.ref);
    writeFileSync(`${b}.app.png`, result.app);
    writeFileSync(`${b}.diff.png`, result.diff);
  }
  rows.push(row);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function writeReport(): void {
  mkdirSync(OUT, { recursive: true });
  const order = { fail: 0, 'missing-reference': 1, warn: 2, pass: 3 } as const;
  rows.sort((a, b) => order[a.status] - order[b.status] || a.artboard.localeCompare(b.artboard));
  writeFileSync(join(OUT, 'results.json'), JSON.stringify(rows, null, 2));
  const count = (s: Row['status']) => rows.filter((r) => r.status === s).length;
  const body = rows.map((r) => {
    const b = base(r);
    const meta = r.status === 'missing-reference' ? 'no reference exported (fixtures-and-harness.md §B.7)'
      : `ratio ${((r.ratio ?? 0) * 100).toFixed(3)}% · broken blocks ${r.brokenBlocks}${r.sizeMismatch ? ` · size ${r.sizeMismatch.ref.join('×')} vs ${r.sizeMismatch.app.join('×')}` : ''}${r.masks?.length ? ` · masks ${r.masks.join(', ')}` : ''}`;
    const imgs = r.status === 'missing-reference' ? '' : `
      <div class="trio"><figure><figcaption>Reference</figcaption><img src="${b}.ref.png"></figure>
      <figure><figcaption>App</figcaption><img src="${b}.app.png"></figure>
      <figure><figcaption>Diff</figcaption><img src="${b}.diff.png"></figure></div>
      <div class="slide"><img src="${b}.ref.png"><img class="top" src="${b}.app.png"><input type="range" min="0" max="100" value="50" aria-label="Reveal app over reference"></div>`;
    return `<section class="row ${r.status}"><h2>${esc(r.artboard)} · ${r.vibe} · ${r.theme}${r.panel !== undefined ? ` · panel ${'ABCDEF'[r.panel]}` : ''} <span class="badge">${r.status}</span></h2><p>${esc(meta)}</p>${imgs}</section>`;
  }).join('\n');
  writeFileSync(join(OUT, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pixel diff</title>
<style>
:root{--bg:#fff;--fg:#1a1a1a;--line:#ddd;--fail:#c4002b;--warn:#a86b00;--pass:#2a7a3b;--miss:#666}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--line:#333}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.4 system-ui}
.row{border-top:1px solid var(--line);padding:12px 0}.badge{font-size:12px;padding:2px 6px;border-radius:4px;color:#fff}
.fail .badge{background:var(--fail)}.warn .badge{background:var(--warn)}.pass .badge{background:var(--pass)}.missing-reference .badge{background:var(--miss)}
.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.trio img{width:100%;border:1px solid var(--line)}
.slide{position:relative;max-width:900px;margin-top:8px}.slide img{width:100%;display:block}.slide .top{position:absolute;inset:0;clip-path:inset(0 50% 0 0)}
.slide input{width:100%}figure{margin:0}figcaption{font-size:12px;opacity:.7}
</style></head><body>
<h1>Pixel diff — ${count('fail')} fail · ${count('missing-reference')} missing · ${count('warn')} warn · ${count('pass')} pass</h1>
${body}
<script>for(const s of document.querySelectorAll('.slide')){const t=s.querySelector('.top'),r=s.querySelector('input');r.addEventListener('input',()=>{t.style.clipPath='inset(0 '+(100-r.value)+'% 0 0)'})}</script>
</body></html>`);
}
```

```ts
// apps/web/e2e/pixel/pixel.spec.ts
import { test, expect, chromium } from '@playwright/test';
import { SCREENS, STATE_PANELS, type Screen, type Theme } from './screens';
import { resolveReference, renderReference, MANIFEST } from './reference';
import { renderApp } from './app';
import { compare } from './compare';
import { record, writeReport } from './report';
import { seedWorld } from './fixture/seed';

const ENFORCE = process.env.PIXEL_ENFORCE !== '0';
const THEMES: Theme[] = ['light', 'dark'];

test.afterAll(() => writeReport());

for (const screen of SCREENS) {
  if (!MANIFEST[screen.artboard]) throw new Error(`not in manifest: ${screen.artboard}`);
  for (const vibe of screen.vibes) for (const theme of THEMES) {
    test(`${screen.artboard} · ${vibe} · ${theme}`, async ({ page, request }) => {
      const src = resolveReference(screen.artboard, vibe, theme, screen.vibes.length === 1, screen.darkNeedsExport);
      if (!src) { record({ artboard: screen.artboard, vibe, theme, status: 'missing-reference' }); test.skip(true, 'no reference'); return; }
      const browser = page.context().browser() ?? (await chromium.launch());
      const panels = screen.mode?.kind === 'panels' ? screen.mode : null;
      const refs = await renderReference(page, src, screen.artboard, panels ? { selector: panels.ref, count: panels.count } : undefined);
      const failures: string[] = [];
      for (let i = 0; i < refs.length; i++) {
        const sp = screen.artboard.startsWith('SP-Card-States') ? STATE_PANELS[i]! : null;
        await seedWorld(request, sp ? [sp.variant] : screen.variants ?? []);
        const target = sp
          ? { route: sp.route, fulfil: 'fulfil' in sp ? sp.fulfil : undefined, hold: 'hold' in sp ? [...sp.hold] : undefined }
          : { route: screen.route, fulfil: screen.fulfil, hold: screen.hold, steps: screen.steps };
        const appPng = await renderApp(browser, screen as Screen, target, vibe, theme, panels ? panels.app : undefined);
        const masks = panels ? [] : screen.masks ?? [];
        const r = compare(refs[i]!, appPng, masks);
        record({ artboard: screen.artboard, vibe, theme, panel: panels ? i : undefined, status: r.status, ratio: r.ratio, brokenBlocks: r.brokenBlocks, sizeMismatch: r.sizeMismatch, masks: masks.map((m) => m.id) }, r);
        if (r.status === 'fail') failures.push(`${panels ? `panel ${'ABCDEF'[i]}: ` : ''}ratio ${(r.ratio * 100).toFixed(3)}%, ${r.brokenBlocks} broken blocks${r.sizeMismatch ? `, size ${r.sizeMismatch.ref.join('×')} vs ${r.sizeMismatch.app.join('×')}` : ''}`);
      }
      if (ENFORCE) expect(failures, failures.join('\n')).toEqual([]);
    });
  }
}
```

Tests for the harness itself (vitest, `apps/web/e2e/pixel/*.test.ts`, run in the `test` job). Each is revert-proof: it is written to fail first.
- `compare.test.ts`:
  - two identical PNGs give `pass` with ratio 0;
  - a 1-px-shifted text row gives `fail` with broken blocks > 0;
  - a size mismatch gives `fail`;
  - a mask without an `id` throws;
  - a masked region that differs gives `pass`.
- `reference.test.ts`:
  - `deriveDark` leaves no `data-theme="light"`;
  - `resolveReference` returns null for `SP-Projects` in paper when no `@paper` export exists, and null for Appearance dark.
- `fonts.test.ts`: `referenceFontCss()` contains every `FONT_MAP` family, and contains no `Variable'` family names and no `./files/` URLs.
- `screens.test.ts`: every `screen.artboard` is in the manifest, and every mask ID appears in the open-conflicts table of this file.

---

## Summary of new and changed files (for the implementing PR)

| Path | Change |
|---|---|
| `apps/api/src/dev/fixture.ts` | new: `POST /v1/dev/fixture` (DEV_AUTH + FIXTURE_IMPORT) |
| `apps/api/src/index.ts` | route the dev path before auth |
| `apps/api/src/board/board-do.ts` | `importFixture(board)` RPC (+ `BoardStub` type) |
| `apps/api/src/auth/resolve.ts` | DEV_AUTH branch: `X-User-Id` / `?user=`, returns `users.name` |
| `apps/api/package.json` | `dev:pixel` script |
| `apps/api/test/dev-fixture.test.ts` | route is 404 without both vars; replace semantics; `FIXTURE_IMPORT` absent from wrangler.jsonc |
| `apps/web/src/lib/api.ts` | dev-only tenant/user override (§A.9.4) |
| `apps/web/src/lib/stores/app.svelte.ts` | `data-ready` on `<html>` in dev builds |
| `apps/web/e2e/pixel/**` | harness + fixture (§B.1) |
| `apps/web/package.json` | devDependencies pixelmatch, pngjs, @types/pngjs, @fontsource-variable/archivo, @fontsource-variable/azeret-mono; scripts |
| `apps/web/scripts/pixel/recv.mjs` | export receiver (§B.7) |
| `.github/workflows/ci.yml` | `pixel` job (§B.8) |
