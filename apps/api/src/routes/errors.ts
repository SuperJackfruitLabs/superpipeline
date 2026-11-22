// The answers every route block shares: a failure nobody planned for, and a method a path does not serve.
import { refuse } from '../api-errors';

export { refuse, refusal, readJson, statusFor, statusForCode } from '../api-errors';

/**
 * What an error nobody planned for looks like on the wire: `UNEXPECTED`, with the error's message,
 * in the one shape every route answers (`api-errors.ts`).
 */
export function unexpected(err: unknown): Response {
  const message = (err as { message?: string })?.message ?? 'unexpected error';
  return refuse('UNEXPECTED', message);
}

/** The answer for a path a route family owns, asked with a method it does not serve. */
export async function methodNotAllowed(): Promise<Response> {
  return refuse('METHOD_NOT_ALLOWED', 'method not allowed');
}
