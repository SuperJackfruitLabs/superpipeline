# Variant gates: a choice of drafts

Charter: `decisions/2026-11-09-a-gate-may-offer-a-choice-of-variants.md`. Operator ruling: at most
3 variants; no editing while choosing; a variant whose preview is incomplete is withheld on its own.
SuperPipeline freezes and judges; AgentPod carries the bytes; supermessage renders the picker.

## The handoff

A completion into a subject-bound approval stage may hand over `variants` instead of the kind's
single payload:

```json
{ "variants": [
  { "id": "short", "label": "Short version", "publicationPayload": { "...": "..." } },
  { "id": "long",  "label": "With the thread", "publicationPayload": { "...": "..." } }
] }
```

- 1 to 3 variants. `id` is 1 to 64 characters and unique in the list, `label` 1 to 80; neither may
  hold control characters.
- Each variant carries the fields its subject kind reads from a handoff (`publicationPayload` for
  `social-publish/v1`) and is validated exactly as a single payload is.
- `variants` and the kind's single payload are mutually exclusive.
- Anything wrong refuses the completion `INVALID_APPROVAL_SUBJECT`, naming the variant
  (`variants[1]: …`); nothing is frozen.

Each variant is frozen as its own approval subject, in order, with sequential revisions and its own
digest. `gate_variants(gate_id, position, variant_id, label, subject_id, digest)` lists them. The
gate's `approval_subject_id` and digest, and the card's `active_approval_subject_id`, stay NULL
until a variant is chosen. The gate's options are the usual four (`approve_manual`,
`approve_automatic`, `request_changes`, `reject`): the choice is the binding, not an option.

## The push

`gate.pending` (and `GET …/gates/pending`) carries the variants inside `approvalSubject`, with no
top-level `id` or `digest`, so a client that predates variants falls back to the v1 card:

```json
"approvalSubject": { "variants": [
  { "id": "short", "label": "Short version",
    "subject": { "id": "aps_…", "digest": "sha256:…", "schema": "social-publish/v1", "revision": 3,
                 "expiresAt": "…", "preview": [ … ], "previewComplete": true } }
] }
```

Each preview is bounded to an equal share of the carrier's whole-preview budget (16,000 UTF-8
bytes of JSON-encoded strings, agentpod's `PREVIEW_TOTAL_BYTES`): `floor(16000 / n)` per variant,
plus the usual 20 blocks and per-block bounds. A long variant is cut on its own and says
`previewComplete: false`; its siblings keep theirs. `handoffSummary` names the choice for a v1
client ("Choose one of 2 variants: …. Open the card to see them before approving.").

## Choosing

`POST /v1/boards/:boardId/gates/:gateId/resolve` with an approving decision and the chosen
variant's binding:

```json
{ "decision": "approve_automatic", "approvalSubjectId": "aps_…", "approvalSubjectDigest": "sha256:…" }
```

In one write the chosen variant becomes the gate's and the card's subject, and every other variant
is invalidated with reason `choice.not_chosen`. From there everything is the single-subject path:
delivery modes, `delivery.pending`, the publisher's verify and confirm (they find the gate by its
subject), expiry.

| Refusal | When |
|---|---|
| `APPROVAL_SUBJECT_MISMATCH` | an approval with no binding; any binding (approving or not) that names no variant of the gate; a chosen variant no longer active |
| `APPROVAL_DECIDER_NOT_ALLOWED` | an agent, or a human not among the stage's deciders |
| `SEPARATION_OF_DUTIES` | the producer |
| `GATE_DECISION_NOT_ALLOWED` | a decision not among the gate's options |
| `DECISION_EXPIRED` | the chosen variant's subject has expired; when every variant has, the gate is closed as expired too |

Request changes and reject act on the whole set, with or without a binding: every variant is
invalidated (`gate.request_changes`, `gate.reject`). Editing the card while it waits invalidates
every variant and cancels the gate, as it does a single subject: new text is "Request changes".

## Expiry and timeouts

A variant past its own `expiresAt` cannot be chosen. The sweep closes a variant gate as `expired`
once every variant has expired, retiring all of them. Decision timeouts treat a variant gate as any
gate: it waits while pending, and a manual delivery after the choice waits on the chosen subject.

## Reads

`GET …/gates/:gateId` and the board snapshot's pending gates carry `variants: [{ id, label, status,
chosen, approvalSubject }]` for a variant gate, and `approvalSubject` only once one is chosen. A
pending variant gate's `summary` names the choice. Boards without variant gates read exactly as
before.

## Not yet

- **The web app has no picker.** It sends the gate's `approvalSubject` as the binding, which a
  pending variant gate does not have, so an approval from the web is refused
  `APPROVAL_SUBJECT_MISMATCH` (fail closed); reject and request changes work. Until a picker is
  designed (mockups first), choosing on the board means the resolve route above with the binding.
- **The CLI** (`supi approve --delivery`) reads the gate's `approvalSubject` and so cannot choose a
  variant either.
