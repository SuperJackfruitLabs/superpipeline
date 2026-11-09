# Quorum gates: more than one approver

Charter: `decisions/2026-11-09-a-gate-may-need-more-than-one-approver.md`. Operator ruling: n of
the stage's deciders, or of the workspace's owners and admins; one reject or request for changes
ends the gate; delivery is manual unless every approver chose automatic; named groups wait for
Accounts to have groups. SuperPipeline counts and enforces; AgentPod carries the progress;
supermessage renders the count.

## The stage

```json
{ "key": "release", "name": "Release", "ownerKind": "human", "gate": "approval",
  "quorum": { "required": 2, "from": "admins" } }
```

- `required` is a whole number from 2 to 5. `from` is `deciders` (the default) or `admins`.
- With `deciders` and a stage that names `approvalDeciderPrincipalIds`, `required` may not exceed
  their number. Otherwise anyone who may decide the gate counts, as for a single approval.
- With `admins`, an approval counts only when the answer's verified token carries the Accounts
  workspace role owner or admin (`workspaceRoleFor`, read when the answer arrives). A chat answer
  arrives with the hub acting for the person and carries their own role. Off the Organization
  plane, the local membership role stands in, as it does for every policy check.
- On a subject-bound gate every approval must also come from a named decider and carry the
  binding, exactly as a single approval does: `admins` narrows who counts, it never widens it.
- `quorum` is decision policy (`decisionPolicyOf`): only a workspace owner or admin may set, change
  or remove it, on a live board or when creating one (`WORKSPACE_ADMIN_REQUIRED`). It is stored in
  one spelling (`from` always present), so `{required: 2}` and `{required: 2, from: "deciders"}`
  are the same policy.
- Malformed values refuse the write `INVALID_STAGES`.

## The gate

Each gate snapshots its stage's quorum in `gates.quorum_json` when it opens, so a later edit never
changes what an open gate asks for. Approvals are recorded in `gate_approvals(gate_id,
principal_id, decision, variant_id, subject_id, subject_digest, via, created_at)`, one row per
person; they stay after the gate closes, as its history.

`resolveGate` runs every check a single approval runs (separation of duties, deciders, binding,
expiry, offered options, the variant's binding), then:

| Answer | Effect |
|---|---|
| an approval short of `required` | recorded; the gate stays `pending`; `gate.approval_recorded` is pushed |
| the approval that reaches `required` | recorded and the gate resolves, in one write; from there, the ordinary path |
| the same person approving again | `QUORUM_ALREADY_APPROVED` (409); nothing is recorded |
| an agent approving | `APPROVAL_DECIDER_NOT_ALLOWED` (403) |
| `from: admins` without an owner or admin role | `APPROVAL_DECIDER_NOT_ALLOWED` (403) |
| reject or request changes | closes the gate at once, as today, whatever was recorded |

An approval cannot be withdrawn; someone who approved may still reject.

**Delivery.** The gate resolves `approve_manual` if any counted approval chose manual, and
`approve_automatic` only when every one did.

**Variants.** Approvals are counted per variant (`variant_id`). The first variant to reach
`required` is chosen and the set is settled then, as for a single approval of a choice.

**People are counted by principal.** The resolve route maps the caller to their Accounts principal
for a quorum gate, as it does for a subject-bound one, so the same person answering from the web
and from chat is one person.

## On the wire

`GET …/gates/:gateId`, `gate.pending` and the `gates/pending` sweep carry, on a quorum gate only:

```json
"quorum": { "required": 2, "from": "admins",
            "approvals": [{ "principalId": "prn_…", "at": "2026-11-09T10:00:00.000Z", "variantId": "short" }] }
```

`variantId` appears only on a variant gate. Each approval short of the quorum pushes

```json
{ "event": "gate.approval_recorded", "boardId": "brd_…", "cardId": "card_…", "gateId": "gate_…",
  "approval": { "principalId": "prn_…", "at": "…" },
  "quorum": { "required": 2, "from": "admins", "approvals": [ … ] } }
```

to push configs subscribed to it. It is a decision event: a service config needs
`approval-requests:relay` to subscribe, as for `gate.pending`. The approval that reaches the
quorum produces the usual `gate.resolved`, and no `gate.approval_recorded`.

## Timing

A quorum gate is one wait (`decision_waits`): reminders and escalation run from when it opened, not
from each approval. Admins invited by an escalation count toward `admins`; toward `deciders` only
where the stage names none.
