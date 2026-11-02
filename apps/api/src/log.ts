/**
 * The Worker's one way to its log. Workers Logs read the console and derive each entry's severity
 * from the method called, so these call it as they are called, with the same arguments; a test that
 * spies on `console` still sees every line. The only console use allowed in `apps/api/src`.
 */
/* oxlint-disable no-console -- this module is the Worker's log sink */
export function logInfo(...args: unknown[]): void {
  console.log(...args);
}

export function logWarn(...args: unknown[]): void {
  console.warn(...args);
}

export function logError(...args: unknown[]): void {
  console.error(...args);
}
