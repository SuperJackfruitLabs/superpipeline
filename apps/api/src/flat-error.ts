/**
 * A refusal as the wire carries it: the result with its `detail` fields lifted beside `code`.
 *
 * `code`, `message` and `ok` always win. A detail key may add to the body but never rewrite what
 * the refusal is, so a careless detail cannot turn one error into another.
 */
export function flatError(r: { ok: false; code: string; message: string; detail?: Record<string, unknown> }): Record<string, unknown> {
  const { detail, ...rest } = r;
  return { ...(detail ?? {}), ...rest };
}
