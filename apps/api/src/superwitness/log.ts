/**
 * The run reporter's only logger.
 *
 * Content-free by contract (no content in telemetry): an entry carries ids, counts, HTTP status
 * codes and short error codes — never a card title, a board or agent name, a report body, a token
 * or a credential. test/superwitness-drain.test.ts holds every drain path to that.
 */
import { logError, logInfo, logWarn } from '../log';

export function logReporter(level: 'info' | 'warn' | 'error', entry: Record<string, string | number>): void {
  try {
    // Workers derives the exported severity from the console method.
    if (level === 'error') logError(entry);
    else if (level === 'warn') logWarn(entry);
    else logInfo(entry);
  } catch {
    /* a logging failure must never fail a drain */
  }
}
