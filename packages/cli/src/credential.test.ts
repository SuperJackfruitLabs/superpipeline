/**
 * What `supi` will and will not authenticate with.
 *
 * The rule worth testing is an absence: it never reads a `spa_` AGENT token. Those name an
 * agent, and an agent is not a person operating a board — a CLI that silently acted as one would
 * attribute a human's decisions to it, which is what
 * `charter → decisions/2026-08-13-ecosystem-identity.md` Decision 2 exists to protect.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_BASE,
  ENV_BASE,
  ENV_HUB_TOKEN,
  ENV_TOKEN,
  baseUrl,
  expired,
  inspect,
  loadCredential,
  fleetConfigDir,
} from "./credential";

let home: string;
beforeEach(() => {
  for (const k of [ENV_TOKEN, ENV_HUB_TOKEN, ENV_BASE]) vi.stubEnv(k, "");
  // Redirect every platform's config directory, never the developer's real credentials.
  home = mkdtempSync(join(tmpdir(), "supi-"));
  for (const k of ["HOME", "USERPROFILE", "APPDATA", "XDG_CONFIG_HOME"]) vi.stubEnv(k, home);
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(home, { recursive: true, force: true });
});

function writeApnToken(token: string): void {
  const dir = fleetConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "token.json"), JSON.stringify({ token }));
}

describe("loadCredential", () => {
  it("prefers its own variable", () => {
    vi.stubEnv(ENV_TOKEN, "  own-token  ");
    vi.stubEnv(ENV_HUB_TOKEN, "hub-token");
    const c = loadCredential();
    expect(c?.token).toBe("own-token");
    expect(c?.source).toBe(`env:${ENV_TOKEN}`);
  });

  it("falls back to the hub token, because that IS what superpipeline accepts", () => {
    vi.stubEnv(ENV_HUB_TOKEN, "hub-token");
    expect(loadCredential()?.token).toBe("hub-token");
  });

  it("then the file `fleet login` writes — one sign-in, both planes", () => {
    writeApnToken("from-file");
    const c = loadCredential();
    expect(c?.token).toBe("from-file");
    expect(c?.source).toContain("agentpod");
  });

  it("returns null when there is nothing, rather than inventing something", () => {
    expect(loadCredential()).toBeNull();
  });

  it("ignores an empty or whitespace-only variable", () => {
    vi.stubEnv(ENV_TOKEN, "   ");
    expect(loadCredential()).toBeNull();
  });

  it("never reads a spa_ agent token from anywhere", () => {
    // An agent token in the environment under any name this CLI does not read must not be
    // picked up. The absence is the point: `supi` acts as a person or not at all.
    vi.stubEnv("SUPERPIPELINE_AGENT_TOKEN", "spa_deadbeef");
    vi.stubEnv("KBN_TOKEN", "spa_deadbeef");
    expect(loadCredential()).toBeNull();
  });
});

describe("baseUrl", () => {
  it("defaults to production", () => {
    expect(baseUrl()).toBe(DEFAULT_BASE);
  });
  it("honours an override and strips trailing slashes", () => {
    vi.stubEnv(ENV_BASE, "http://localhost:8787///");
    expect(baseUrl()).toBe("http://localhost:8787");
  });
});

function jwt(payload: Record<string, unknown>): string {
  return `aGRy.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.c2ln`;
}

describe("inspect", () => {
  it("reads claims without verifying the signature", () => {
    // Deliberate: this is `whoami`, not an authorization decision. superpipeline verifies.
    const c = inspect(jwt({ sub: "prn_x", principalKind: "human", exp: 2000000000 }));
    expect(c?.subject).toBe("prn_x");
    expect(c?.principalKind).toBe("human");
    expect(expired(c!)).toBe(false);
  });

  it("detects an expired token", () => {
    expect(expired(inspect(jwt({ sub: "x", exp: 1 }))!)).toBe(true);
  });

  it("treats a missing exp as not expired — absence is not evidence of staleness", () => {
    expect(expired(inspect(jwt({ sub: "x" }))!)).toBe(false);
  });

  it("returns null for anything that is not a JWT", () => {
    for (const bad of ["", "nope", "only.two"]) expect(inspect(bad)).toBeNull();
  });
});
