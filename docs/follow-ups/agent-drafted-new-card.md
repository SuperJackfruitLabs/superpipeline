# Follow-up: an agent drafts the new card (dialogs D-1)

The vibes sweep shipped the new card composer without drafting. The person writes the title and the
brief. The SP-Dlg-NewCard references draw the drafted state: a "Draft again" button and the note
"**{drafter}** drafted the title and brief from your sentence. Change anything.", plus a
"Drafted · not sent yet" tag on the brief. The pixel harness deletes `.nc-draftrow` and
`.nc-brief-tag` from those references until this lands. The composer's lead copy already promises
drafting ("An agent drafts the brief…"), so this is the gap between the copy and the product.

## What it needs

**API (apps/api)**
- `POST /v1/boards/:boardId/drafts` `{ sentence }` → `202 { draft: { id, status: 'drafting', drafter: { agentId, name } } }`.
  The drafter is the board's command agent: the agent holding the `command` capability that may
  dispatch on this board. If there is none, `409 { error: { code: 'NO_DRAFTER' } }`.
- `GET /v1/drafts/:id` → `{ draft: { id, status: 'drafting' | 'ready' | 'failed', sentence, title?, brief?, drafter } }`.
- `PUT /v1/drafts/:id` (agent-authenticated) `{ title, brief }` sets `status: 'ready'`. A draft is
  never a card. It is discarded on dispatch or after 24h.
- A board socket event `draft.ready` `{ draftId }` to the person who asked, so the composer updates
  without polling.

**MCP (agents)**
- Tool `draft_card` `{ draftId, title, brief }`, the drafter's write path. The drafter learns of a
  request through its normal dispatch, as a draft task. It must not create a card.

**Web (apps/web)**
- `api.ts`: `requestDraft(boardId, sentence)`, `getDraft(id)`.
- `NewCardDialog.svelte`: the `.nc-draftrow` button ("Draft brief", then "Draft again" once
  drafted), with the sparkle icon. States:
  - "Drafting…" (disabled);
  - `{drafter} is drafting…` with a 24px face, mood `thinking`;
  - drafted: face mood `done`, and `<strong>{drafter}</strong> drafted the title and brief from your sentence. Change anything.`;
  - failed: "No draft this time. Write the title and brief yourself, or try again.".
- `.nc-brief-tag` "Drafted · not sent yet", shown while the brief still equals the draft.
- Per-field dirty flags: a draft never overwrites a field the person has typed in.
- Remove `dropDraftRegion` from the SP-Dlg-NewCard screens and its mask reason `D-1` from `MASK_IDS`.
  The references then compare as exported.

**Tests**
- API: draft lifecycle, `NO_DRAFTER`, agent-only `PUT`, a draft never creates a card.
- Web: dirty flags, the four states' copy, and `draft.ready` arriving while the composer is closed.
