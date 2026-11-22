/**
 * The sentence an API refusal carries, or null when its body has none.
 *
 * The board and service routes answer `{ error: { code, message } }` (treaty `error.v1`), and so do
 * the sign-in and role refusals every workspace route shares; the workspace routes' own refusals
 * (projects, labels, members, agents) still answer `{ error: "<sentence>" }`. A reader takes either.
 */
export function errorText(body: unknown): string | null {
  const error = body !== null && typeof body === 'object' && 'error' in body ? body.error : undefined;
  if (typeof error === 'string') return error;
  if (error !== null && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return null;
}
