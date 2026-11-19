// apps/web/e2e/global-setup.ts
/**
 * Warm the servers once, before any test.
 *
 * A cold dev server (Vite transforming and pre-bundling the app on its first load, wrangler starting
 * the Worker and the board's Durable Object) took about 6 s over the first board read, past the 5 s
 * expect timeout, so whichever test ran first in a fresh run failed and the rest passed. Waiting here
 * once costs the run those seconds and keeps every test's own timeout honest.
 *
 * It warms what the app reads first, at the run's base URL (the given origin under SP_E2E_BASE_URL,
 * where no webServer starts): the web root, the API's health and board list through that origin, one
 * board, and that board's page in a browser until the app says it is ready. Inert by design: nothing
 * here fails the run. A step that does not answer inside the 60 s limit is logged and the suite
 * starts anyway, so the tests themselves say what is wrong.
 */
import { chromium, type FullConfig } from '@playwright/test';
import { PORTS } from '../scripts/ports';

const LIMIT_MS = 60_000;
/** The dev workspace the local servers answer as (DEV_AUTH); a deployed origin ignores it. */
const HEADERS = { 'X-Tenant-Id': 'tnt_dev' };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The first board in a `GET /v1/boards` answer (`{ boards: [{ id }] }`), if it has one. */
function firstBoardId(body: unknown): string | undefined {
  const boards: unknown = body && typeof body === 'object' && 'boards' in body ? body.boards : null;
  const first: unknown = Array.isArray(boards) ? boards[0] : null;
  return first && typeof first === 'object' && 'id' in first && typeof first.id === 'string' ? first.id : undefined;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const base = (config.projects[0]?.use.baseURL ?? PORTS.webUrl).replace(/\/$/, '');
  const remote = !!process.env.SP_E2E_BASE_URL;
  const started = Date.now();
  const deadline = started + LIMIT_MS;
  const said: string[] = [];
  const timed = async <T>(name: string, step: () => Promise<T | null>): Promise<T | null> => {
    const at = Date.now();
    const out = Date.now() < deadline ? await step().catch(() => null) : null;
    said.push(`${name} ${out === null ? 'no answer' : `${Date.now() - at} ms`}`);
    return out;
  };
  /** The first answer that is not a server error, asked again every half second until the limit. */
  const answer = async (path: string): Promise<Response | null> => {
    while (Date.now() < deadline) {
      try {
        const res = await fetch(base + path, { headers: HEADERS, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
        if (res.status < 500) return res;
      } catch {
        /* not listening yet, or the request timed out */
      }
      await sleep(500);
    }
    return null;
  };

  await timed('web root', () => answer('/'));
  await timed('API health', () => answer('/health'));
  const listed = await timed('board list', () => answer('/v1/boards'));
  const boardId = listed?.ok ? firstBoardId(await listed.json().catch(() => null)) : undefined;
  if (boardId) await timed('board read', () => answer(`/v1/boards/${boardId}`));

  // The page itself: Vite compiles the app's modules on the first browser load, not on a fetch.
  await timed(boardId ? 'board page' : 'inbox page', async () => {
    const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
    try {
      const page = await browser.newPage();
      await page.goto(base + (boardId ? `/b/${boardId}` : '/inbox'), { timeout: Math.max(1, deadline - Date.now()) });
      // A deployed origin is built, not compiled on demand: its load is the warm-up. Locally the app
      // marks the page ready once its reads have settled.
      if (!remote) await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', undefined, { timeout: Math.max(1, deadline - Date.now()) });
      return true;
    } finally {
      await browser.close();
    }
  });

  console.log(`[warm-up] ${base}: ${said.join(' · ')} · ${Date.now() - started} ms in all`);
}
