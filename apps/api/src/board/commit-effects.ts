import { logError } from '../log';

/** Only the synchronous settlement span opts in. Ordinary operations publish as before. */
export class CommitEffects {
  private pending: Array<() => undefined> | null = null;

  requireActive(): void {
    if (!this.pending) throw new Error('COMMIT_EFFECTS_REQUIRED');
  }

  afterCommit(effect: () => undefined): undefined {
    if (this.pending) this.pending.push(effect);
    else effect();
    return undefined;
  }

  alarm(schedule: () => Promise<void>): Promise<void> {
    if (!this.pending) return schedule();
    this.pending.push(() => {
      void schedule().catch(() => logError('committed board alarm was not armed'));
      return undefined;
    });
    return Promise.resolve();
  }

  /** Nested SQL savepoints remain supported; a second effect scope is ambiguous and refused. */
  run<T>(
    storage: DurableObjectStorage,
    commit: () => T,
    ...invalidAsync: Extract<T, PromiseLike<unknown>> extends never ? [] : [never]
  ): T {
    if (this.pending || invalidAsync.length) throw new Error('NESTED_COMMIT_EFFECTS');
    const effects: Array<() => undefined> = [];
    this.pending = effects;
    let result: T;
    try {
      result = storage.transactionSync(() => {
        const value = commit();
        if (
          value &&
          (typeof value === 'object' || typeof value === 'function') &&
          'then' in value &&
          typeof value.then === 'function'
        )
          throw new Error('ASYNC_COMMIT_EFFECTS');
        return value;
      });
    } catch (error) {
      this.pending = null;
      throw error;
    }
    this.pending = null;
    // SQL has committed. Broadcast failures are already handled by their own seam;
    // alarms have a durable outbox and a generic logged retry/backstop requirement.
    let failed = false;
    for (const effect of effects) {
      try {
        if (effect() !== undefined) throw new Error('invalid committed effect return');
      } catch {
        failed = true;
        logError('committed board effect delivery failed');
      }
    }
    if (failed) throw new Error('COMMITTED_EFFECT_DELIVERY_FAILED');
    return result;
  }
}
