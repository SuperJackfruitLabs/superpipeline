// The Worker's route tables: an ordered list of (method, pattern) → handler, tried first to last.
// A handler answers the request, or returns NEXT after its own checks so the routes below it get
// their turn; a request no route answers gets the table's `otherwise`. Where two patterns overlap,
// the earlier route wins, exactly as the one if-chain the tables replaced did.
import type { Env } from '../env';

/** Returned by a handler that did not answer: matching continues with the next route. */
export const NEXT = Symbol('next');
export type Next = typeof NEXT;

/** What every top-level route sees. */
export interface WorkerRequest {
  request: Request;
  env: Env;
  url: URL;
  /** `url.pathname`, which the top-level patterns are matched against. */
  path: string;
}

export type Handler<C> = (ctx: C, match: RegExpMatchArray) => Promise<Response | Next>;

/** `*` matches any method; otherwise the request's method must be one of `methods`. */
export interface Route<C> {
  methods: readonly string[] | '*';
  pattern: RegExp;
  handle: Handler<C>;
}

/** A route for `method` (`*`, one method, or several joined by commas). */
export function route<C>(method: string, pattern: RegExp, handle: Handler<C>): Route<C> {
  return { methods: method === '*' ? '*' : method.split(','), pattern, handle };
}

/** Try `routes` in order against `subject`; the first that answers wins. */
export async function dispatch<C>(
  routes: readonly Route<C>[],
  ctx: C,
  subject: string,
  method: string,
  otherwise: (ctx: C) => Response | Promise<Response>,
): Promise<Response> {
  for (const entry of routes) {
    if (entry.methods !== '*' && !entry.methods.includes(method)) continue;
    const match = entry.pattern.exec(subject);
    if (!match) continue;
    const answered = await entry.handle(ctx, match);
    if (answered !== NEXT) return answered;
  }
  return otherwise(ctx);
}

/** A table as `METHOD pattern handler` lines, in match order: what the route-order test reads. */
export function describeRoutes<C>(routes: readonly Route<C>[]): string[] {
  return routes.map((r) => `${r.methods === '*' ? '*' : r.methods.join(',')} ${r.pattern.source} ${r.handle.name}`);
}
