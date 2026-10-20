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
