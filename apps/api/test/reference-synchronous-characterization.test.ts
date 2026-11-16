import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it, vi } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';

it('ordinary reference writes and events occur before its promise settles', async () => {
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName('reference-sync-order')), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await board.init({ id: 'brd_referencesync', tenantId: 'tnt_referencesync', name: 'References', stages: [{ key: 'code', name: 'Code', order: 0 }] });
    const card = await board.createCard({ title: 'Work', ownerUserId: 'usr_example' });
    if (!card.ok) throw new Error(card.message);
    const context: BoardContext = Reflect.get(board, 'board');
    const emitted: string[] = [];
    const emit = context.emit.bind(context);
    const spy = vi.spyOn(context, 'emit').mockImplementation((type, body) => { emitted.push(type); emit(type, body); });
    try {
      const input = { cardId: card.value.id, url: 'https://github.com/example/app/commit/' + 'a'.repeat(40), provider: 'github', sourceType: 'commit', title: 'Original' };
      const first = board.addReference(input);
      expect(state.storage.sql.exec('SELECT title FROM card_references').toArray()).toEqual([{ title: 'Original' }]);
      expect(emitted).toEqual(['reference.added']);
      const added = await first;
      if (!added.ok) throw new Error(added.message);
      const second = board.addReference({ ...input, title: 'Updated' });
      expect(state.storage.sql.exec('SELECT id,title FROM card_references').toArray()).toEqual([{ id: added.value.id, title: 'Updated' }]);
      expect(emitted).toEqual(['reference.added', 'reference.updated']);
      const updated = await second;
      expect(updated).toMatchObject({ ok: true, value: { id: added.value.id, title: 'Updated', addedBy: 'agent' } });
    } finally { spy.mockRestore(); await state.storage.deleteAlarm(); }
  });
});
