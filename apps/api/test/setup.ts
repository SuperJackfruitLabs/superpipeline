import { afterEach, beforeAll } from 'vitest';
import { setupCatalog } from './helpers/catalog';

// The Worker's board routes now touch the D1 catalog (recordBoard/listBoards), so every test file
// needs the catalog tables on its (isolated) test D1.
beforeAll(setupCatalog);

// Treaty plan step 4: every push body a test reads back must validate against treaty's schema for
// its event (test/helpers/treaty-schemas.ts).
import { BoardDO } from '../src/board/board-do';
import { checkAgainstTreaty } from './helpers/treaty-schemas';

// Captured unbound on purpose: the wrapper re-applies it with the instance's own `this`.
// oxlint-disable-next-line typescript/unbound-method
const readDeliveries = BoardDO.prototype.getPushDeliveries;
BoardDO.prototype.getPushDeliveries = async function (this: BoardDO, ...args: Parameters<typeof readDeliveries>) {
  const rows = await readDeliveries.apply(this, args);
  for (const row of rows) checkAgainstTreaty(row.body);
  return rows;
};

// Treaty phase 1: every request and response on a route treaty's HTTP contracts describe is checked
// against them (test/helpers/treaty-http.ts). `SELF.fetch` reaches the Worker's default export, so
// its `fetch` is wrapped here; a mismatch fails the test that made it.
import worker from '../src/index';
import { takeMismatches, withTreatyCheck } from './helpers/treaty-http';

worker.fetch = withTreatyCheck(worker.fetch);
afterEach(() => {
  const found = takeMismatches();
  if (found.length > 0) throw new Error(`${found.length} exchange(s) do not match treaty's HTTP contracts:\n\n${found.join('\n\n')}`);
});
