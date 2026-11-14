# SuperPipeline docs site

The user-facing documentation published at `docs.superpipeline.dev`. Astro + Starlight.

```sh
npm install
npm run dev     # local preview
npm run build   # -> dist/
```

## It wears the suite's docs theme

`@superjackfruit/docs-theme`, vendored under `vendor/` with the frontdoor and vibekit tarballs it
needs, as the landing page vendors its own. The whole design config is
`sjlDocs({ product: 'superpipeline', status: 'lights on' })` in `astro.config.mjs`: vibekit's gold,
the suite's faces (self-hosted, so no page fetches a font from Google), the mark beside the name,
the street, status badges, Copy Markdown and every page at `<page>.md`, the suite footer, the 404,
the edit link and the last-updated date. The home is the theme's `BentoHome`. `src/docs-theme.d.ts`
declares the theme's schema module, which ships as plain JavaScript; without it `astro check` fails
with TS7016 under `strict`.

The sidebar uses the suite's groups: Start, Use it, Build on it, Run it, Reference. The theme warns
at build time when a top-level group is anything else.

**For agents**: `/llms.txt`, `/llms-full.txt` and `/llms-small.txt` (`starlight-llms-txt`, through the
theme, with the description in `astro.config.mjs`).

## Why this is not a pnpm workspace member

**It uses npm, and it lives outside `apps/` and `packages/` on purpose.** Both are
load-bearing, and neither is a style preference.

The site is Astro 7, which brings Vite 8. When it participates in the shared pnpm
tree, the root `vitest` re-resolves against that Vite, `@cloudflare/vitest-pool-workers`
can no longer find its runner, and the **entire `apps/api` suite fails to collect** —
556 tests, on a change that touches no product code. Verified both ways on a clean
tree on 2026-09-12: as a workspace member `apps/api` cannot run at all; outside it,
`apps/api` passes 556.

Excluding it with a `!apps/docs` negation in `pnpm-workspace.yaml` was tried and
rejected. The negation does remove it from the project list, but a `node_modules`
directory inside a globbed path still perturbs the tree pnpm builds: with the site's
own `node_modules` present, `pnpm install` produced a broken tree and `apps/api`
failed again. Living outside the `apps/*` glob removes that whole class of problem —
`pnpm install` and this site's `npm install` cannot interact at all, in either order.

The site ships nothing the Worker, the web app or the contract import, so it has no
claim on their dependency resolution.

## Claims are checked

`packages/docs-check` reads the pages under `src/content/docs` and fails CI if they
name a tool, capability or environment variable the codebase does not define. Prose
about the product is checked against the product. Run it with `pnpm -F @superpipeline/docs-check test`.

## Generated pages

`src/content/docs/reference/` is generated — do not edit it by hand.

- `reference/cli/*` comes from `packages/cli/src/commands.ts`, the table `supi help` is printed from.
  Regenerate with `pnpm -F @superpipeline/cli reference`.
- `reference/mcp-tools.md` comes from the MCP server's own tool registrations
  (`apps/api/src/mcp/tools.ts`). Regenerate with `pnpm -F @superpipeline/docs-check reference`.

Both are checked in `pnpm test`: a stale page, a page for a command that no longer exists, or a
command with no page fails CI.

## Publishing

Deployed by the `deploy-docs` job in `.github/workflows/ci.yml`, on every push to `main`
that passes `test`.

### One-time setup

1. **Create the Pages project.** `superpipeline-docs`, in the same Cloudflare account that
   holds the Worker. A direct-upload project — do not connect it to the Git repo, or it
   will race the CI job and deploy an unbuilt tree.

   ```sh
   npx wrangler pages project create superpipeline-docs --production-branch=main
   ```

2. **Widen the API token.** The existing `CLOUDFLARE_API_TOKEN` repo secret needs
   **Cloudflare Pages: Edit** added alongside its Workers and D1 scopes.

3. **Point the domain.** Add `docs.superpipeline.dev` as a custom domain on the Pages project.
   `superpipeline.dev` is already on Cloudflare, so this needs no manual DNS record — adding
   the custom domain creates the CNAME.

### Checking it

The site is static and has no runtime, so the deploy either served the built tree or it
did not. `curl -sI https://docs.superpipeline.dev/start/what-it-is/` is the whole smoke test.
