# Exact human decision correlation (M21)

Producer baseline: Superpipeline 9406fcb. Consumer: AgentPod's M21 strict-work bridge.
The decided Charter agreement `2026-08-14-approvals-cross-planes-as-events` requires
human identity and exact offered option identity to survive the return path. This
additive contract does not introduce Matrix delivery or change authentication.

REST `POST /v1/boards/:board/runs/:run/activities` and MCP `superpipeline_post_activity`
accept optional `strictDecision`:

```json
{"version":1,"request_id":"00000000-0000-4000-8000-000000000001","decision_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","expires_at":1800000000000}
```

Strict requests require a persistent `elicitation`, `signal: select`, nonempty body,
and canonical `parameter.options` containing approve then deny objects (`name`,
`title`, optional canonical option metadata). Unknown binding fields/versions fail.
The digest names the full consumer decision envelope, including task/plan revision,
operation/approval identities, question, options, run binding and expiry. It is
correlation, never a credential or a grant. Superpipeline treats it as opaque;
AgentPod/Salaam must recompute and verify it against current execution authority.

The response adds `elicitationId` and `strictDecision`. The run read returns that
same binding on the exact elicitation. Clients must never select the latest question.
An authenticated principal's request ID and full canonical request are persisted
atomically with the question, activity and immutable response. An identical retry
returns the original receipt even after expiry, supersession or release; it does
not resurrect a question, refresh a lease, or prove current authorization. A changed
request conflicts. A foreign principal cannot read the cached response.

Fresh requests and answers require the original live run and lease. Answers also
require the original stage, unexpired decision, exact offered option, and existing
human authentication/separation of duties. Heartbeat expiry is checked even before
alarm reclaim. Superseding questions cancel the old question as before.

Legacy requests/responses remain unchanged. Older producers may ignore the new
field; strict consumers must reject responses without the exact correlation fields.
Roll out producer first, then enable strict consumers. No deployment performed.

Conformance uses the actual SQLite-backed Durable Object test runtime and
synthetic authenticated REST fixtures. It proves response-loss replay, changed
payload conflict, reverse-order decisions, expiry, lease/release fences and legacy
regressions. This is not live product acceptance or a deployed fleet proof.


## Subject-bound questions (envelope step 3)

Charter decision `2026-11-07-strict-decisions-and-permissions-bind-their-subject` (decisions
1–4 and 7). Two kinds of question carry the exact thing an approving answer approves.

**Strict decisions.** The `elicitation.pending` push and the `GET …/elicitations/pending` read
carry `approvalSubject`, built from the stored offer (the same object is on the board's own
`ElicitationView`, which the web app answers from):

```json
{"id":"<strictDecision.request_id>","digest":"<strictDecision.decision_digest>",
 "schema":"salaam-operation/v1","revision":1,"expiresAt":"<expires_at as ISO 8601>",
 "preview":[{"type":"text","text":"<summary>"},
            {"type":"text","label":"Reason","text":"<reason>"},
            {"type":"field","label":"File","value":"<path> · <change> · <bytes> bytes"},
            {"type":"text","text":"<file preview>"}],
 "previewComplete":true}
```

The board does not receive Salaam's approval id or revision: the offer's `request_id` is the
approval's identity here, and a strict decision is never revised (a changed operation is a new
offer), so `revision` is 1. The digest is opaque and compared byte for byte. The Reason is a
labelled text block because a reason (up to 300 characters) is longer than a field's bound. A
file with no preview contributes only its field; `· <bytes> bytes` is left out when `bytes` is
null. `previewComplete` is false when there is no detail, the bounds cut or dropped a block (20
blocks: summary, reason and nine files fit), or any file was cut: `preview_truncated: true`, or,
for an older offer without the flag, `bytes` greater than the preview's length or a create/edit
with no preview. `preview_truncated` is an optional boolean on each detail file.

Options carry `scope` and `requires`: `approve` → `approve`/`once`, `approve-run` →
`approve`/`run`, `always` → `approve`/`always` with `requires: "workspace-admin"`, `deny` →
`reject`/`once`. A strict offer whose options carry their own `meaning` or `scope` is refused
`INVALID_STRICT_DECISION`.

**Poster-bound questions (board-dispatched harness permissions).** An ordinary `elicitation`
may give each option in `parameter.options` a `meaning` (`approve`, `reject`, `choose`, `revise`,
`defer`) and a `scope` (`once`, `run`, `always`), and attach `parameter.subject`:

```json
{"schema":"harness-permission/v1","id":"<session>:<seq>","digest":"<opaque, 1–256 chars>",
 "revision":1,"expires_at":"<ISO 8601>","preview":[<gate.v2 preview blocks>],
 "preview_complete":true}
```

Unknown keys, another schema, an id or digest outside 1–256 characters, a non-positive revision,
a non-ISO expiry, malformed blocks, more than 64 blocks or strings over 16,000 characters are
refused `INVALID_APPROVAL_SUBJECT`. A meaning or scope outside the vocabulary, or a subject on a
question with no options or with any option lacking a meaning, is refused `INVALID_ELICITATION`.
Nothing is written for a refused post. The subject is stored on the question (`elicitations.subject_json`,
added on start-up) and echoed as `approvalSubject`, its preview cut to the gate.v2 bounds;
`previewComplete` is the poster's `preview_complete` and false if anything was cut. Without these
fields a question is unchanged: options are `choose` and carry no subject.

**Answers.** `POST …/elicitations/:id/answer` takes an optional `subject: {id, digest}`. On a
question with a subject:

- the answer must pick an offered option (`INVALID_ANSWER`);
- after `expiresAt` every answer is refused `DECISION_EXPIRED`;
- a binding that is given must match the subject's `id` and `digest` exactly
  (`APPROVAL_SUBJECT_MISMATCH`, 409);
- an approving option (meaning `approve`) without a binding is refused
  `APPROVAL_SUBJECT_MISMATCH`. A rejecting answer may come without one.

The existing strict checks (live lease and heartbeat, same stage, offered option,
workspace owner or admin for `always`) still run first. The web app sends the binding from the
question it shows.

## Original-run completion recovery

Run context adds `run.handoff` and `run.completion` from that run's stored evidence;
legacy top-level `handoff` remains the card's current handoff. Completing with
explicit `outcome: pass` records `status: ended`, `outcome: completed` and
`completion: {met: true, outcome: pass}` on success. A retry after completion returns
`STALE_LEASE`; recovery must read the original run, check its IDs/lease/stage and
verdict, and compare its original handoff against the durable report intent. Later
runs can replace the card handoff but never this run evidence. `completed` alone is
insufficient (a changes-needed routing can use it); a missing/null verdict or
missing new evidence field cannot establish strict completion success.
