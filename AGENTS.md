# SuperPipeline: notes for agents

Start with [`README.md`](README.md), [`docs/README.md`](docs/README.md) and [`docs/contributor/code-structure.md`](docs/contributor/code-structure.md). This repository is public: no private hosts, credentials or internal links.

## Things agents get wrong

- **Run what CI runs before pushing.** Read `.github/workflows/ci.yml` (it runs on the forge for PRs and on the GitHub mirror for `main`): `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm ci:test`, `pnpm lint`, and the build, smoke, browser and e2e jobs rather than guessing; the commands are there.
- **Snapshots and goldens pass in a bare environment and on Linux.** Run them under `env -i PATH="$PATH" HOME="$HOME" CI=true pnpm test`. Normalise platform strings (OS, arch) and `COLORTERM` in the test instead of recording your machine's.
- **Count lint baselines on a clean install** (`pnpm install --frozen-lockfile`), never on a tree with stray packages or a stale build.
- **No skipped tests.** Never `.skip`, `.only` or delete a red test to get green; fix it, or say in the PR why it is red.
- **Characterization test first.** Before a refactor that touches behaviour, commit a test against the old code and prove it can fail (revert the code, watch it go red).
- **Check the PR is still open before pushing to its branch.** PRs are often merged within minutes, and a push to a merged branch strands the work.
- **Forge-primary.** Push and open PRs on the forge (`origin`, `tea`); never push to or open PRs on the GitHub mirror. Deploys run only on the mirror's CI (`github.server_url == 'https://github.com'`).
- **Never tag a docs- or CHANGELOG-only commit.** The production gate in `release.yml` needs main's `test`, `e2e` and `visual` jobs and the `app-<sha>` artifact for the tagged commit, and a docs-only commit skips them.
- **Versions continue the `0.0.x` tag series.** `package.json`'s version is not the source of truth.
- **The CLI characterization snapshot normalises platform and arch** (`supi version` prints them). Keep that normalisation when you add output that differs by machine.
- **The Claude CI files are synced copies.** `.github/claude/claude-ci.mjs` and the `claude-review`/`claude-triage` workflows come from the suite's shared kit; change them there, not here. The advisory PR review follows [`REVIEW.md`](REVIEW.md).

