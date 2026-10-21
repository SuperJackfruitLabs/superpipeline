# Run evidence extension

`GET /v1/boards/:board/runs/:run/evidence-v1` explicitly selects
`superpipeline-run-evidence/v1`. It uses the existing tenant-mapped service token
and `evidence:read` scope. Legacy `/evidence` remains strict C4.

`pipeline` retains C4 including its historical principal lookup behavior. The
extension adds the saved run lease epoch and queuer, a completion verdict summary,
a handoff-presence flag, and at most 256 references attributed to this exact run.
Card-wide legacy references cannot become run evidence. Arbitrary reference
metadata, handoff bodies and completion reasons are not exported. The reference
URL is a locator, never permission to fetch it or proof of its contents.

Usage separates recorded agent-reported cost from estimates. Unknown-model
estimates persisted by older metering code as zero become unknown. Missing usage
is unreported with null amounts; an explicitly recorded zero remains known.
Mixed estimates and recorded amounts or incomplete pricing are partial. None of
these amounts is provider billing evidence. C4's historical aggregates remain
available only in the nested legacy view.

`executor_evidence` names the original run's authenticated AgentPod execution
read path. It is discovery metadata, not an assertion that an export exists.
Consumers must authenticate to AgentPod, validate its returned original binding,
and obtain actual executor task/check/artifact/export receipts there. Pipeline
completion, gate approval and worker self-report cannot mint a Witness verdict
or establish executor integration. A reference may carry a strict nullable `execution_export` locator with schema
version, export id, manifest digest, and `verification: unverified`. No raw export
receipt is treated as proof by Pipeline.

`POST /v1/boards/:board/runs/:run/evidence-reference` accepts only
`{leaseEpoch, cardId, stageKey, export_id, manifest_sha256}` under the existing
agent authentication. The original agent, active run epoch, original card and
stage must match. The bridge attaches before completing its run. Ended or stale
runs cannot attach. Repeated matching locators are idempotent; conflicting hashes
or ownership fail. The export URL comes from existing `HUB_ISSUER`, never the
request. Missing/invalid configuration yields `EVIDENCE_LINK_UNAVAILABLE`.
No new credential or grant is introduced. Witness authenticates its own
`evidence:read` request to AgentPod's committed export endpoint and cross-checks
all original bindings and Library content digest before citing source proof.

The accepted 2026-10-04 ownership decision keeps runs/gates/usage in Pipeline,
execution records in AgentPod, and independent verdicts in Witness. The draft
2026-09-29 evidence proposal remains a draft. Card deletion and retention are
unchanged. Legacy principal mappings are resolved from the catalog at read time;
only the saved local agent/run/epoch is historical here.

Schemas: `packages/contract/src/run-evidence.ts`; example:
`apps/api/test/fixtures/run-evidence-v1.json`. Focused offline route tests cover
C4 compatibility, original-stage provenance, scoped access, metadata rejection,
and known/estimated/unknown/unreported/partial cost projections.
