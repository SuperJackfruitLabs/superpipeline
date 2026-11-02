/**
 * What every command shares: refusing with a message, the credential, the API call, printing a
 * response, and reading a file argument. The commands under `commands/` import it; it imports none
 * of them.
 */
import { readFileSync } from "node:fs";
import { baseUrl, expired, inspect, refusalHint, resolveCredential, ENV_AGENT_TOKEN, ENV_AGENT_TOKEN_FILE, ENV_TOKEN } from "./credential.ts";

/** What `main` hands a command: the verb, the words after it, its positionals and whether `--json` was asked for. */
export interface Args {
  cmd: string;
  rest: string[];
  pos: string[];
  json: boolean;
}

/**
 * `create-card --due`'s own shape check, matching the API's (`DUE_AT_RE`, apps/api/src/index.ts).
 * Checked here rather than left to the server: a malformed value never leaves the terminal, so the
 * person sees this message instead of the API's 400 — a worse sentence for the same mistake.
 */
export const DUE_AT_RE = /^\d{4}-\d{2}-\d{2}$/;

export function wantsJson(args: string[]): boolean {
  return args.includes("--json");
}

export function fail(message: string, hint?: string): never {
  process.stderr.write(message + "\n");
  if (hint) process.stderr.write("\n" + hint + "\n");
  process.exit(1);
}

export async function credentialOrExit() {
  let c;
  try {
    c = await resolveCredential();
  } catch (error) {
    fail(error instanceof Error ? error.message : "Could not read fleet credentials.");
  }
  if (!c) {
    fail(
      "Not signed in.",
      `  supi login           sign in to this workspace\n` +
        `  fleet login          the sign-in for a server not yet on the organization plane\n` +
        `  ${ENV_TOKEN}=…   supply a token directly\n` +
        `  ${ENV_AGENT_TOKEN}=spa_…   act as an agent, not as a person\n` +
        `  ${ENV_AGENT_TOKEN_FILE}=…   a file something keeps fresh (a station token lives minutes)`,
    );
  }
  /**
   * An agent credential, and whether it has already died.
   *
   * An `spa_` token is opaque: no claims, no expiry, nothing to check. A STATION token is a JWT that
   * lives five minutes — "the expiry IS the revocation SLA" — so an expired one is the ordinary
   * symptom of a refresher that has stopped, and it must read as that rather than as a 401 from the
   * far end. The remedy is never "sign in": an agent cannot.
   */
  if (c.kind === "agent") {
    const agentClaims = inspect(c.token);
    if (agentClaims && expired(agentClaims)) {
      fail(
        `This agent token expired at ${agentClaims.expiry!.toLocaleString()}.`,
        c.source.startsWith("file:")
          ? `  Nothing refreshed ${c.source.slice(5)} — check the node-agent on this host.`
          : `  A station token lives minutes. Point ${ENV_AGENT_TOKEN_FILE} at a file something keeps fresh.`,
      );
    }
    return c;
  }
  const claims = inspect(c.token);
  if (claims && expired(claims)) {
    const hint = c.source.startsWith("env:")
      ? `Replace or unset ${c.source.slice(4)}; explicit tokens are not renewed.`
      : "supi login   (fleet login, for a server not yet on the organization plane)";
    fail(`Your session expired at ${claims.expiry!.toLocaleString()}.`, `  ${hint}`);
  }
  return c;
}

/**
 * `conflict`, when given, is the sentence a 409 prints instead of the generic "returned 409" — for
 * a request that carried a precondition, where 409 means exactly one thing and the person should
 * be told what it was.
 */
export async function api(path: string, init: RequestInit = {}, opts: { conflict?: string } = {}): Promise<unknown> {
  const c = await credentialOrExit();
  const res = await fetch(baseUrl() + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();

  if (res.status === 401) {
    fail("superpipeline did not accept that token (401).", "  supi login   (fleet login, for a server not yet on the organization plane)");
  }
  if (res.status === 403) {
    // Distinguished from 401 deliberately: 401 means sign in, 403 means you may not — and telling
    // a person to sign in again when the answer is "your seat does not permit this" sends them
    // round a loop.
    //
    // The hint used to assert that a hub token "acts as a `member`", full stop. That stopped
    // being true on 2026-09-20: a token whose subject is mapped to a local user reads that
    // user's real role. `member` is now the FALLBACK for an unmapped principal, not a ceiling,
    // so the honest hint names the thing that is actually missing.
    // Which dead end this is depends on what is holding the credential — see `refusalHint`.
    fail(`Refused by superpipeline (403). ${body.trim()}`, refusalHint(c.kind));
  }
  if (res.status === 409 && opts.conflict) fail(opts.conflict);
  if (!res.ok) fail(`superpipeline returned ${res.status}: ${body.trim()}`);

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

/**
 * Set once from the argv in `main`, read by `out`.
 *
 * A module-level flag rather than a parameter threaded through every case: the alternative is
 * passing `json` to twenty call sites, where forgetting one produces a command that silently
 * ignores `--json` — the exact defect this change exists to fix.
 */
let wantJson = false;

/** Called once by `main`, before any command runs. */
export function setJsonOutput(json: boolean): void {
  wantJson = json;
}

/**
 * Print a response: readable by default, JSON on request.
 *
 * A shape with no renderer still prints JSON, so adding a command never waits on a formatter
 * being written for it. That fallback is why this could change the default without auditing
 * every verb first.
 */
export const out = (value: unknown, human?: (v: unknown) => string) => {
  if (!wantJson && human) {
    process.stdout.write(human(value) + "\n");
    return;
  }
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
};

/** A file's text, or stdin for `-`. Unlike `stagesFromFile` the content is prose, not JSON. */
export function readText(path: string): string {
  try {
    return (path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8")).trim();
  } catch {
    fail(`Could not read ${path === "-" ? "stdin" : path}.`);
  }
}

/** A JSON value from a file, or stdin for `-`; refused by the flag's name when it is not JSON. */
export function readJson(path: string, flagName: string): unknown {
  let raw: string;
  try {
    raw = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  } catch {
    fail(`Could not read ${path === "-" ? "stdin" : path}.`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${flagName} is not JSON: ${path}`);
  }
}
