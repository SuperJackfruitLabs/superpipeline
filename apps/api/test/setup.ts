import { beforeAll } from 'vitest';
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
