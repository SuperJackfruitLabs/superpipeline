# CI fast feedback

`plan` reads the PR merge-base diff (or the previous push commit). Missing bases,
empty diffs, shared tooling, lockfiles and unknown paths select the full suite.
Docs and landing changes select their independent build checks. API, contract,
SDK, CLI and web changes retain application types/tests, artifact smoke, critical
browser coverage and the visual regression gate. Web source, CSS, readiness or
matrix-test changes additionally select extended browser coverage without forcing
docs or landing builds. Manual/nightly runs include
both critical and extended browser projects plus the separate pixel report.

The required `test` and `e2e` job names are always-run aggregators. They require
actual success for selected jobs and an explicit skipped result for unselected
jobs. Missing outputs, cancellation and unexpected skips fail closed. Browser
coverage uses two critical shards and, on web changes and full runs, four extended shards with
one worker each and at most two matrix jobs concurrently. This bounds the browser
matrix; it does not override the runner's global capacity for other jobs.

`ci:build-app` creates the production artifact once. Smoke, browser shards and
production deployment download the same SHA-named archive and call
`ci:verify-app`. Deployment calls `ci:deploy-app`, not a second build. Site deploys
also consume their checked build archives. This is a local production-artifact
smoke check; no separate staging deployment is claimed.

The browser harness creates fresh local D1 and Durable Object storage for every
process/shard. It never uses remote bindings. Local-only runtime overrides enable
fixture authentication; the artifact's production configuration keeps it off.
The compiled client accepts fixture identity and refresh hooks only on literal
loopback origins (or existing development builds). Deployed origins ignore those
local-storage values. Read-only DOM readiness works in both compiled and dev
builds, so tests do not silently fall back to a different frontend.

Readiness rejects explicit boot/read failure rather than swallowing a timeout.
Slow-server loading walks wait for visible pending surfaces to clear; unrelated
background reads do not stand in for visible route readiness. Each route is a
named step, and every temporary browser context closes even on failure.
Long-text checks require the visible seeded content on every route and await
fonts/paint rather than fixed sleeps. The full twelve appearance/viewport cases
and their literal-text/security assertions remain. Intentional delayed-loading
and motion-stability measurements remain timed.

GitHub uses upload/download-artifact v4. Forge uses pinned official Forgejo v3
commits, following https://forgejo.org/docs/latest/user/actions/advanced-features/.
Reports are retained on both hosts; missing build artifacts fail consumers.
Each browser shard writes JSON plus a timing summary; the aggregate downloads
exact named reports and requires the expected shard count, source revision and
exact project/shard identities from the plan before succeeding. Visual checks
retain their outcome and log even when the change cannot move a pixel and no
screenshots are captured. A skipped capture does not become a missing-artifact
failure, and an actual comparison failure remains a failing job.
Traces, screenshots and error contexts live beside each shard's JSON report so
uploads retain their attachments and parallel local runs cannot clear each
other's output directory.
The Playwright image version is checked against the lockfile in every browser job.

Production app, docs and landing deployments remain GitHub-only main-push jobs.
A successful Forge workflow does not establish production deployment. Neither
branch protection nor deployment destinations are changed by this workflow.
