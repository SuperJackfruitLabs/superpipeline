import { env, runInDurableObject } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { CommitEffects } from '../src/board/commit-effects';
let serial = 0;
async function fixture(run: (effects: CommitEffects, storage: DurableObjectStorage) => void): Promise<void> {
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(`commit-effects-${serial++}`)), (_board, state) => {
    state.storage.sql.exec('CREATE TABLE effect_probe (id INTEGER PRIMARY KEY)');
    run(new CommitEffects(), state.storage);
  });
}
it('publishes effects only after a successful outer SQL commit', () =>
  fixture((effects, storage) => {
    let published = 0;
    let alarms = 0;
    effects.run(storage, () => {
      storage.sql.exec('INSERT INTO effect_probe VALUES (1)');
      effects.afterCommit(() => {
        expect(storage.sql.exec('SELECT * FROM effect_probe').toArray()).toHaveLength(1);
        published++;
        return undefined;
      });
      void effects.alarm(() => {
        alarms++;
        return Promise.resolve();
      });
      expect(published).toBe(0);
      expect(alarms).toBe(0);
      return undefined;
    });
    expect(published).toBe(1);
    expect(alarms).toBe(1);
  }));
it('rollback discards the queue and a later scope cannot publish abandoned effects', () =>
  fixture((effects, storage) => {
    let published = 0;
    expect(() =>
      effects.run(storage, () => {
        storage.sql.exec('INSERT INTO effect_probe VALUES (1)');
        effects.afterCommit(() => {
          published++;
          return undefined;
        });
        throw new Error('abort');
      }),
    ).toThrow('abort');
    expect(storage.sql.exec('SELECT * FROM effect_probe').toArray()).toHaveLength(0);
    expect(published).toBe(0);
    effects.run(storage, () => undefined);
    expect(published).toBe(0);
  }));
it('nested effect scope and runtime thenable misuse fail closed', () =>
  fixture((effects, storage) => {
    expect(() => effects.run(storage, () => effects.run(storage, () => undefined))).toThrow('NESTED_COMMIT_EFFECTS');
    let published = 0;
    expect(() =>
      Reflect.apply(effects.run.bind(effects), effects, [
        storage,
        () => {
          storage.sql.exec('INSERT INTO effect_probe VALUES (1)');
          effects.afterCommit(() => {
            published++;
            return undefined;
          });
          return Promise.resolve();
        },
      ]),
    ).toThrow('ASYNC_COMMIT_EFFECTS');
    expect(storage.sql.exec('SELECT * FROM effect_probe').toArray()).toHaveLength(0);
    expect(published).toBe(0);
  }));
