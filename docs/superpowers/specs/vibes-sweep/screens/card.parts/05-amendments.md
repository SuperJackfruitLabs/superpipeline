
## 7. Contract amendments (binding; they supersede §1–§6 and any vibe section where they conflict)

The four vibe sections were written against §1–§6 and raised the notes below. Each is settled here once, for every vibe.

### 7.1 Fixtures are seeded per artboard (supersedes "one fixture" in §5)
The mockups do not agree on one record. Card 4605 differs between desktop and phone in every vibe (8 vs 9 Oct, 5 vs 3 criteria, a project, 5 references, no plan, different spec keys), and Paper, Studio and Quiet paraphrase Daylight's spec values, criteria, log sentences and gate summary. A single seed would force those baselines to be regenerated. Ruling: **every artboard has its own seed function** in `e2e/support/seed-card.ts`, named `seed<Artboard>` (e.g. `seedSPCardPaper`, `seedSPPhoneCardStudio`). Each one creates the records with the **literal text of that artboard**, using the same ids (`brd_devx`, `card_05823a57e8224605`, …) so URLs match. §5 is the base record that each per-artboard seed starts from and overrides. Every vibe section's fixture section lists the overrides for its artboards. This replaces the "(c) regenerate the baseline" rulings that exist only because of differing text: **D-25, P-7, P-13, P-17, S-4, S-8, S-10, S-19, Q-4, Q-14, Q-15, Q-18, Q-27**. They become "(a) per-artboard seed". The gaps that rule a *behaviour* wrong stay (c) (see §8).
- The phone seeds are the vibes' `seedCard4605Phone` / `seedPhoneCard4605` (one name: `seedSPPhoneCard<Vibe>`). The archived variant adds `archivedAt` = 2026-10-08 19:41 (+05:30) and cancels the pending gate when the variant has one.

### 7.2 Clock per artboard (supersedes the single 13:51 in §1.5)
The e2e test fakes `Date` per artboard to the time the artboard shows: Studio drawer 13:27, Studio phone 13:31, everything else 13:51, all on 2026-10-11 in `Asia/Kolkata` (S-1). Where an artboard's own numbers are wrong for its own clock (S-11 "2 days" vs 2.74 days), the derived value wins and the artboard is regenerated.

### 7.3 Drawer placement (extends §1.2 `CardLayout`)
```ts
export interface CardLayout {
  drawer: Component<CardLayoutProps>; phone: Component<CardLayoutProps>;
  width: string; align: 'end' | 'center';
  /** 'overlay': a panel over the scrimmed board. 'reserve': the board reflows into the space left of the panel (Daylight, D-1). 'sheet': a centred sheet in a scrolling overlay (Paper, P-2). */
  placement: 'overlay' | 'reserve' | 'sheet';
}
export const CARD_LAYOUTS = {
  daylight: { drawer: CardDaylight, phone: CardPhoneDaylight, width: 'min(680px, 100%)', align: 'end', placement: 'reserve' },
  paper:    { drawer: CardPaper,    phone: CardPhonePaper,    width: 'min(780px, calc(100% - 32px))', align: 'center', placement: 'sheet' },
  studio:   { drawer: CardStudio,   phone: CardPhoneStudio,   width: 'min(940px, 100%)', align: 'end', placement: 'overlay' },
  quiet:    { drawer: CardQuiet,    phone: CardPhoneQuiet,    width: 'min(1120px, 100%)', align: 'end', placement: 'overlay' },
};
```
`vibekit:Drawer` gains `placement` with the same three values. For `reserve`, the drawer shell sets `--card-drawer-reserve: <width>` on `.app-shell` while open, and the board group's layout pads its main area by that variable. That is a contract with the board group.

### 7.4 CardModel additions (extend §1.3)
`readonly surface: CardSurface`; `readonly allStages: Stage[]` (the full ordered list, for the phone resume select); `ResumeModel.targets: { key: string; n: number; name: string; current: boolean; allowed: boolean }[]`. This holds every stage. `allowed` = this stage or earlier, and later stages are rendered `disabled` where a vibe lists them (D-20, P-24, S-13, Q-19 all become this). `readonly related` (RelatedWork fetch). `copySessionId()` on every vibe's drawer and page where a session id exists (Q note 5: Quiet drawer adds it; S-12: Studio phone is exempt, so the phone layouts may omit it).

### 7.5 Helpers (extend §1.5)
`whenLabelLong(iso)` → "Thursday 8 October, 19:41" (phone). `paperLight(phase)` (P-1). Studio's compact formatters are in the Studio section. The run-row stop event is seeded as `type: 'response', signal: 'stop'`, never `type: 'error'`, so "0 errors" stays true (S note). The G-5 verb rule is therefore `a.signal === 'stop' ? 'Stopped' : …`.

### 7.6 Gallery cell E (amends §3)
The E model is constructed with `holdDetail: true`, so the snapshot's pending gate stays on screen. The seed hook `staleSnapshotGate(boardId, gateId)` decides the gate through the API with `via: 'matrix'` after the snapshot has been read, so the click gets the G-1 409. Per vibe: Daylight, Studio and Quiet click "Request changes" with an empty note and then "Approve". Paper's E cell is `GatePaper part='reply'` and the test only picks Approve and then clicks "Send reply" (P-14). `GateQuiet` and `GatePaper` take a gallery-only `compact`/`part` prop. The gallery is exempt from the 23-key parity test, because it renders lead blocks only.

### 7.7 Page below 640px
`/b/…/c/…/page` renders `CARD_LAYOUTS[vibe].phone` with `surface: 'page'` when the phone media query matches (S note). The page layouts carry their own breakpoints for 640–1440 (D.3.3, P-11, Studio and Quiet sections).

### 7.8 Parity test
`card-layouts.svelte.test.ts` counts `[data-section=key]` in the DOM. For Studio it activates each tab in turn and sums the counts (S note). Quiet wraps dt/dd pairs in `div[data-section]` (Q-7). Only one instance of a repeated control carries the attribute (Q-8).

### 7.9 vibekit names added by the vibe sections (extend §1.7)
`vibekit:ChoiceList` (Paper/Quiet gate radios: `{ name: string; legend: string; options: { value: string; label: string; description?: string }[]; value (bindable) }`), `vibekit:Kbd`, `vibekit:StageSwatch`, `vibekit:Initials`, `vibekit:NumberedList`, `vibekit:CommandField`, `vibekit:StatusBar`.

Extra props:
- Button: `tone: 'destructive'`.
- AgentQuote: `size`, `density`, `salutation`, `signature`.
- StatePill: `density`.
- Figure: `size: 'lg'`.
- FactList: `variant`.
- Disclosure: `variant`, `openWord`, `closeWord`.
- StageStrip: `numerals: 'arabic' | 'roman'`.
- DefinitionGroups: `clampChars`, `faceAgents`.
- AgentFace: `calm: 'grayscale' | 'saturate' | false`.
- Banner: `icon` optional.

Each vibe section names the props it uses.

### 7.10 Signal discipline (applies to all vibes)
- An archived card never shows signal. Its current stage bar is muted (P-21) and its first fact reads "Archived" (P-30).
- A phone fieldset border is signal only while a decision is needed now (Q-26).
- "Assign to me" is hidden when the viewer already owns the card (D-18, P-19, S-14, Q-20). Those phone baselines are regenerated.

## 8. Gaps: merged index

Counts: shared G-1…G-8 (8), Daylight D-1…D-27 (27), Paper P-1…P-32 (32), Studio S-1…S-21 (21), Quiet Q-1…Q-28 (28). That is **116 rows**. Some describe the same fact in different vibes; after the merges below there are **9 API changes** and **11 behaviour rulings of type (c)**. Everything else is client-side derivation (a). The full rows stay in each vibe section, and where a ruling below differs from a vibe row, the ruling below wins.

### 8.1 API changes (b), one name each
| # | Change | Merges |
|---|---|---|
| API-1 | `resolveGate` 409 `GATE_ALREADY_DECIDED` with `decidedBy`, `decidedAt`, `via` | G-1 |
| API-2 | Archiving a card cancels its pending gates (`status: 'cancelled'`, `resolvedAt`, `decision: null`). The client derives "Its pending review was cancelled when the card was archived." from a cancelled gate with `resolvedAt` equal to `archivedAt` (±5 s) | D-13, P-16, S-9 |
| API-3 | `Card.queuedGrantOwner: string \| null` (principal whose dispatch grant authorised the queue, recorded at queue time) in the snapshot contract. Sentence: "Queued by {q} on {displayPrincipal(owner)}'s grant · {n} agents may be dispatched." where n = `queuedGrant` entries starting with `agt_` | D-19, P-25 (`queuedGrantBy` renamed), S-15 (`queuedOnGrantOf` renamed), Q-21 |
| API-4 | `GateOption.description?: string` (from the pipeline template's gate options) | P-5, Q-12 |
| API-5 | `AgentSummary.role: string \| null` on `GET /v1/agents` | P-4 |
| API-6 | `Card.stageSince: string` (set when `currentStageKey` changes; backfilled) | S-2 |
| API-7 | `Attempt.startedAt: string`, `Attempt.endedAt: string \| null` | S-3 |
| API-8 | `Card.createdAt: string` in the web `Card` type / snapshot serialisation | Q-24, and the "queued … on 8 Oct" sentence in P-28, S-17 |
| API-9 | `app.syncedAt` (client store, not API): set when a snapshot load or feed event resolves | S-6 |

### 8.2 Behaviour rulings (c) that remain (the design changes; those baselines are regenerated)
1. "Assign to me" is hidden when the viewer owns the card (D-18, P-19, S-14, Q-20).
2. Later resume stages are shown but disabled (D-20, P-24, S-13, Q-19; §7.4).
3. An archived card shows no signal (P-21, P-30).
4. A phone fieldset is signal only while a person is needed now (Q-26).
5. One priority word, "P3" (Q-22).
6. The resume placeholders do not name another card's specifics (D-6).
7. Paper's dimmed background is the real Paper board, not the simplified list (P-6).
8. The Paper page spread gets a breakpoint (P-11), and page Enclosure III gets "Add a sub-task" / "Attach a link" (P-8).
9. The phone brief does not show the project inside the spec (Q-28).
10. Gallery-only captions are copy constants (Q-13).
11. Studio's phone "2 days" is derived from its own clock (S-11).

### 8.3 Blockers
None for the spec itself. Implementation depends on: the board group honouring `--card-drawer-reserve` (§7.3), the shell group providing the `bare` slot (§2.1), and the vibekit library providing the §1.7 and §7.9 components.
