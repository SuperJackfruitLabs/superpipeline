import { describe, expect, it } from 'vitest';
import { BOARD_ROUTES } from '../src/routes/boards/table';
import { describeRoutes } from '../src/routes/router';
import { ROUTES } from '../src/routes/table';
import { BOARD_ROUTES as OLD_BOARD_ROUTES, WORKER_ROUTES as OLD_WORKER_ROUTES } from './helpers/worker-routes';

/**
 * The router tries routes in the order the old `fetch` did (docs/contributor/modularity-plan.md,
 * Phase 3): the tables, as method, pattern and handler, equal the list written down from that code
 * before it was split (`helpers/worker-routes.ts`). What each route answers is pinned by
 * `worker-routes-characterization.test.ts`.
 */
const asLines = (rows: readonly (readonly [string, RegExp, string])[]): string[] =>
  rows.map(([method, pattern, handler]) => `${method} ${pattern.source} ${handler}`);

describe('the route tables keep the old match order', () => {
  it('top level', () => {
    expect(describeRoutes(ROUTES)).toEqual(asLines(OLD_WORKER_ROUTES));
  });

  it('on a board', () => {
    expect(describeRoutes(BOARD_ROUTES)).toEqual(asLines(OLD_BOARD_ROUTES));
  });
});
