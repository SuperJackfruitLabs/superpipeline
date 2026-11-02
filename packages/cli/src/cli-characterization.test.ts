import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COMMANDS } from "./commands.ts";
import { VERSION } from "./update.ts";

/**
 * What `supi` does, pinned before `index.ts` and `commands.ts` split into one module per command
 * group (docs/contributor/modularity-plan.md, Phase 4).
 *
 * Every command's help (`supi help <words>` and `supi <verb> --help`), and each command run with
 * representative arguments against a fake API: the requests it sends (method, URL, headers, body),
 * what it prints on stdout and stderr, and its exit status. Refusals, unknown commands and bad
 * arguments are runs like any other. The record is a committed snapshot written against the code
 * before the split; it is never regenerated to make a restructuring pass.
 *
 * Hermetic: HOME and XDG_CONFIG_HOME point at a scratch directory, so no stored credential is read
 * or cleared; the clock is fixed; scratch paths, the pid, an expiry's local rendering and the version
 * are replaced by placeholders.
 */
const NOW = Date.UTC(2030, 0, 2, 3, 4, 5);
const EXP = Math.floor(NOW / 1000) + 3600;
const jwt = (exp: number, kind = "human") =>
  `e30.${Buffer.from(JSON.stringify({ sub: `prn_${kind}`, principalKind: kind, exp })).toString("base64url")}.sig`;
const TOKEN = jwt(EXP);

class ExitSignal extends Error {
  constructor(public code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

let scratch: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "supi-char-"));
  const write = (name: string, body: string) => writeFileSync(join(scratch, name), body);
  mkdirSync(join(scratch, "home"));
  mkdirSync(join(scratch, "skills"));
  write("stages.json", JSON.stringify([{ key: "todo", name: "To do" }, { key: "done", name: "Done" }]));
  write("snapshot.json", JSON.stringify({ stages: [{ key: "a", name: "A" }] }));
  write("nokey.json", JSON.stringify([{ name: "x" }]));
  write("empty.json", "[]");
  write("not.json", "not json");
  write("rule.md", "  Write tests first.\n\nThen code.  \n");
  write("completion.json", JSON.stringify({ handoff: ["url"] }));
  write("spec.json", JSON.stringify({ goal: "ship" }));
  write("merge.json", JSON.stringify({ notes: "new", goal: null }));
  write("array.json", "[1]");
});

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The fake API: a plausible answer for each route the CLI calls, `{ ok: true }` for the rest. */
function answer(method: string, url: URL): { status: number; body: unknown } {
  const path = url.pathname;
  const key = `${method} ${path}`;
  if (url.host === "api.github.com") return { status: 200, body: { tag_name: "v0.0.1" } };
  if (path === "/.well-known/oauth-protected-resource") return { status: 404, body: { error: "not found" } };
  const fixtures: Record<string, unknown> = {
    "GET /v1/boards": { boards: [{ id: "brd_1", name: "Ops" }, { id: "brd_2" }] },
    "GET /v1/boards/brd_1": {
      boardId: "brd_1",
      name: "Ops",
      stages: [
        { key: "todo", name: "To do", ownerKind: "human" },
        { key: "build", name: "Build", ownerKind: "capability", owner: "code", gate: "approval", instructions: "rule" },
      ],
      cards: [
        { id: "crd_1", title: "First", currentStageKey: "build", state: "waiting" },
        { id: "crd_2", title: "Second", currentStageKey: "todo", state: "ready" },
      ],
      gates: [{ cardId: "crd_1", stageKey: "build" }],
    },
    "GET /v1/boards/brd_1/gates/pending": { gates: [{ id: "gat_1", cardId: "crd_1", stageKey: "build", producedBy: "agt_1" }] },
    "GET /v1/boards/brd_1/cards/crd_1": { card: { id: "crd_1", title: "First", spec: { goal: "ship", notes: "old" }, updatedAt: "2030-01-01T00:00:00.000Z" } },
    "GET /v1/boards/brd_1/cards/crd_1/activities": {
      activities: [
        { type: "tool", ts: "2030-01-01T10:11:12Z", action: "ran tests", result: "ok" },
        { type: "note", ts: "2030-01-01T10:12:00Z", body: { summary: "a summary" } },
      ],
      handoff: "Line one\n\nhttps://example.com/pr/1",
    },
    "GET /v1/boards/brd_1/cards/crd_1/comments": {
      comments: [
        { author: { kind: "human", id: "usr_1", name: "Asha" }, body: "Looks good\n- one", createdAt: "2030-01-01T09:00:00Z" },
        { author: { kind: "agent", id: "agt_1" }, body: "gone", createdAt: "2030-01-01T09:30:00Z", deletedAt: "2030-01-01T09:31:00Z" },
      ],
    },
    "GET /v1/boards/brd_1/cards/crd_1/links": { links: [{ fromCardId: "crd_1", toCardId: "crd_2", kind: "blocks" }] },
    "GET /v1/stale": {
      cards: [
        { boardId: "brd_1", boardName: "Ops", cardId: "crd_1", title: "First", stageKey: "build", stageName: "Build", why: { kind: "failing", reason: "failed", detail: "tests", failureCount: 2 }, ageHours: 5.5, next: "supi resume" },
        { boardId: "brd_2", cardId: "crd_9", title: "Lost", stageKey: "x", why: { kind: "no-owner" }, ageHours: 49, next: "add an agent" },
      ],
      boardsUnanswered: 1,
    },
    "GET /v1/projects": { projects: [{ id: "prj_1", name: "Launch", state: "active", health: "on-track" }, { id: "prj_2" }] },
    "GET /v1/projects/prj_1": {
      project: { id: "prj_1", name: "Launch", state: "active", health: "at-risk", targetDate: "2030-02-01", description: "The launch." },
      milestones: [{ id: "mil_1", name: "Beta", targetDate: "2030-01-15" }, { id: "mil_2", name: "GA" }],
    },
    "GET /v1/tenant/forge": { forgeHost: "forge.example" },
    "POST /v1/boards/brd_1/cards": { card: { id: "crd_new", title: "made" } },
    "GET /v1/capabilities": { capabilities: [{ id: "cap_9", key: "code-review" }] },
    "POST /v1/agents/agt_1/tokens": { token: "spa_0123456789abcdef0123456789abcdef", tokenId: "tok_1", scopes: ["claim", "run"] },
    "GET /v1/agents": { agents: [{ id: "agt_1", name: "Builder" }] },
  };
  return key in fixtures ? { status: 200, body: fixtures[key] } : { status: 200, body: { ok: true, method, path } };
}

interface Scenario {
  argv: string[];
  env?: Record<string, string>;
  /** Answers the next request with this status and body instead of the fixture. */
  status?: number;
  raw?: string;
}

const text = (chunk: string | Uint8Array): string => (typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
const urlOf = (input: RequestInfo | URL): string => (typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
/** The headers as sent, keys spelled as the CLI spelled them (the snapshot orders them). */
function headerRecord(h: HeadersInit | undefined): Record<string, string> {
  if (h === undefined) return {};
  if (h instanceof Headers || Array.isArray(h)) return Object.fromEntries(new Headers(h));
  return Object.fromEntries(Object.entries(h));
}

let stdout: string[];
let stderr: string[];
let requests: Array<{ method: string; url: string; headers: Record<string, string>; body: string | null }>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  stdout = [];
  stderr = [];
  requests = [];
  vi.stubEnv("HOME", join(scratch, "home"));
  vi.stubEnv("XDG_CONFIG_HOME", join(scratch, "home", ".config"));
  vi.stubEnv("SUPERPIPELINE_TOKEN", TOKEN);
  vi.stubEnv("AGENTPOD_TOKEN", "");
  vi.stubEnv("SUPERPIPELINE_AGENT_TOKEN", "");
  vi.stubEnv("SUPERPIPELINE_AGENT_TOKEN_FILE", "");
  vi.stubEnv("SUPERPIPELINE_URL", "https://work.example");
  vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
    stdout.push(text(chunk));
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
    stderr.push(text(chunk));
    return true;
  });
  vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
    throw new ExitSignal(typeof code === "number" ? code : undefined);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function normalise(raw: string): string {
  return raw
    .split(scratch)
    .join("<scratch>")
    .split(new Date(EXP * 1000).toLocaleString())
    .join("<expiry>")
    .split(new Date((EXP - 7200) * 1000).toLocaleString())
    .join("<expired>")
    .split(`.${process.pid}.tmp`)
    .join(".<pid>.tmp")
    .split(`supi ${VERSION} `)
    .join("supi <version> ")
    .split(`supi ${VERSION} is`)
    .join("supi <version> is")
    // `supi version` prints the host platform; CI runs on linux/x64, laptops on darwin/arm64.
    .split(`${process.platform}/${process.arch}`)
    .join("<platform>");
}

async function run(s: Scenario) {
  for (const [k, v] of Object.entries(s.env ?? {})) vi.stubEnv(k, v.split("<scratch>").join(scratch));
  let override = s.status !== undefined || s.raw !== undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(urlOf(input));
      const method = init?.method ?? "GET";
      const headers = headerRecord(init?.headers);
      requests.push({ method, url: url.toString(), headers, body: typeof init?.body === "string" ? init.body : null });
      if (override) {
        override = false;
        return new Response(s.raw ?? JSON.stringify({ error: { code: "x", message: "refused for a reason" } }), { status: s.status ?? 200 });
      }
      const a = answer(method, url);
      return new Response(JSON.stringify(a.body), { status: a.status });
    }),
  );
  vi.resetModules();
  vi.spyOn(process, "argv", "get").mockReturnValue(["bun", "supi", ...s.argv.map((a) => a.split("<scratch>").join(scratch))]);
  let exit: number | undefined = 0;
  try {
    await import("./index");
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
    exit = e.code;
  }
  const printed = normalise(stdout.join(""));
  return {
    exit,
    requests: requests.map((r) => ({ ...r, url: normalise(r.url), body: r.body === null ? null : normalise(r.body) })),
    stdout: s.argv[0] === "skill" && s.argv.length === 1 ? `sha256 ${createHash("sha256").update(printed).digest("hex")} (${printed.length} chars)` : printed,
    stderr: normalise(stderr.join("")),
  };
}

const F = (name: string) => `<scratch>/${name}`;

/** Help, for every command: by `supi help <words>` and by `supi <words> --help`. */
const HELP: Scenario[] = [
  { argv: [] },
  { argv: ["-h"] },
  { argv: ["--help"] },
  { argv: ["help"] },
  { argv: ["help", "nonsense"] },
  { argv: ["nonsense", "--help"] },
  { argv: ["board", "--help", "brd_1"] },
  { argv: ["link", "--help"] },
  { argv: ["help", "link"] },
  { argv: ["help", "link", "nothing"] },
  ...COMMANDS.flatMap((c) => [{ argv: ["help", ...c.path] }, { argv: [...c.path, "--help"] }]),
];

const RUNS: Scenario[] = [
  // Unknown and session.
  { argv: ["nonsense"] },
  { argv: ["version"] },
  { argv: ["whoami"] },
  { argv: ["whoami", "--json"] },
  { argv: ["whoami"], env: { SUPERPIPELINE_AGENT_TOKEN: "spa_0123456789abcdef0123456789abcdef" } },
  { argv: ["whoami"], env: { SUPERPIPELINE_AGENT_TOKEN: jwt(EXP, "agent") } },
  { argv: ["boards"], env: { SUPERPIPELINE_AGENT_TOKEN: jwt(EXP - 7200, "agent") } },
  { argv: ["boards"], env: { SUPERPIPELINE_AGENT_TOKEN_FILE: F("missing.json") } },
  { argv: ["boards"], env: { SUPERPIPELINE_TOKEN: jwt(EXP - 7200) } },
  { argv: ["boards"], env: { SUPERPIPELINE_TOKEN: "" } },
  { argv: ["login"] },
  { argv: ["logout"] },
  { argv: ["skill"] },
  { argv: ["skill", "install", "--dir", F("skills")] },
  { argv: ["skill", "install", "--dir", F("skills"), "--json"] },
  { argv: ["skill", "bogus"] },
  { argv: ["update", "--check"] },
  { argv: ["update", "--check"], status: 500 },
  // Refusals and odd answers, on one read.
  { argv: ["boards"], status: 401 },
  { argv: ["boards"], status: 403 },
  { argv: ["boards"], status: 403, env: { SUPERPIPELINE_AGENT_TOKEN: "spa_0123456789abcdef0123456789abcdef" } },
  { argv: ["boards"], status: 409 },
  { argv: ["boards"], status: 500 },
  { argv: ["boards"], raw: "plain text answer" },
  // Boards and stages.
  { argv: ["boards"] },
  { argv: ["boards", "--json"] },
  { argv: ["board"] },
  { argv: ["board", "brd_1"] },
  { argv: ["board", "brd_1", "--json"] },
  { argv: ["templates"] },
  { argv: ["create-board"] },
  { argv: ["create-board", "New"] },
  { argv: ["create-board", "New", "--template", "nope"] },
  { argv: ["create-board", "New", "--template", "simple", "--stages", F("stages.json")] },
  { argv: ["create-board", "New", "--stages", F("stages.json")] },
  { argv: ["create-board", "New", "--stages", F("snapshot.json")] },
  { argv: ["create-board", "New", "--stages", F("nokey.json")] },
  { argv: ["create-board", "New", "--stages", F("empty.json")] },
  { argv: ["create-board", "New", "--stages", F("not.json")] },
  { argv: ["create-board", "New", "--stages", F("missing.json")] },
  { argv: ["set-stages", "brd_1"] },
  { argv: ["set-stages", "brd_1", F("stages.json")] },
  { argv: ["set-stage", "brd_1"] },
  { argv: ["set-stage", "brd_1", "build"] },
  { argv: ["set-stage", "brd_1", "build", "--instructions", F("rule.md"), "--name", "Built", "--gate", "approval", "--wip", "3", "--owner", "code"] },
  { argv: ["set-stage", "brd_1", "build", "--completion", F("completion.json"), "--return-stage", "todo"] },
  { argv: ["set-stage", "brd_1", "build", "--completion", F("not.json")] },
  { argv: ["set-stage", "brd_1", "build", "--clear-instructions", "--clear-completion", "--clear-return-stage", "--wip", "none"] },
  { argv: ["set-stage", "brd_1", "build", "--instructions", F("missing.json")] },
  { argv: ["stale"] },
  { argv: ["stale", "--hours", "4"] },
  { argv: ["stale", "--hours", "x"] },
  { argv: ["set-stale"] },
  { argv: ["set-stale", "brd_1"] },
  { argv: ["set-stale", "brd_1", "--on", "--off"] },
  { argv: ["set-stale", "brd_1", "--hours", "-1"] },
  { argv: ["set-stale", "brd_1", "--hours", "48", "--off"] },
  { argv: ["set-stale", "brd_1", "--on"] },
  // Cards.
  { argv: ["card", "brd_1"] },
  { argv: ["card", "brd_1", "crd_1"] },
  { argv: ["move", "brd_1", "crd_1"] },
  { argv: ["move", "brd_1", "crd_1", "build"] },
  { argv: ["resume", "brd_1", "crd_1"] },
  { argv: ["resume", "brd_1", "crd_1", "--comment", "fixed the flake"] },
  { argv: ["resume", "brd_1", "crd_1", "--comment", "again", "--stage", "todo"] },
  { argv: ["archive", "brd_1"] },
  { argv: ["archive", "brd_1", "crd_1"] },
  { argv: ["create-card", "brd_1"] },
  { argv: ["create-card", "brd_1", "Ship", "the", "thing"] },
  { argv: ["create-card", "brd_1", "Ship", "--spec", F("spec.json"), "--priority", "2", "--due", "2030-03-04"] },
  { argv: ["create-card", "brd_1", "Ship", "--due", "tomorrow"] },
  { argv: ["create-card", "brd_1", "Ship", "--spec", F("not.json")] },
  { argv: ["create-card", "brd_1", "Ship", "--label", "lbl_1", "--label", "lbl_2"] },
  { argv: ["edit-card", "brd_1"] },
  { argv: ["edit-card", "brd_1", "crd_1"] },
  { argv: ["edit-card", "brd_1", "crd_1", "--title", "New title", "--priority", "3", "--due", "none"] },
  { argv: ["edit-card", "brd_1", "crd_1", "--priority", "high"] },
  { argv: ["edit-card", "brd_1", "crd_1", "--due", "soon"] },
  { argv: ["edit-card", "brd_1", "crd_1", "--due", "2030-05-06", "--spec", F("spec.json")] },
  { argv: ["edit-card", "brd_1", "crd_1", "--spec", F("spec.json"), "--merge-spec", F("merge.json")] },
  { argv: ["edit-card", "brd_1", "crd_1", "--merge-spec", F("merge.json")] },
  { argv: ["edit-card", "brd_1", "crd_1", "--merge-spec", F("array.json")] },
  { argv: ["edit-card", "brd_1", "crd_1", "--spec", F("not.json")] },
  { argv: ["edit-card", "brd_1", "crd_1", "--title", "x"], status: 409 },
  { argv: ["log", "brd_1"] },
  { argv: ["log", "brd_1", "crd_1"] },
  { argv: ["log", "brd_1", "crd_1", "--json"] },
  // Comments.
  { argv: ["comment", "brd_1"] },
  { argv: ["comment", "brd_1", "crd_1"] },
  { argv: ["comment", "brd_1", "crd_1", "Looks", "good"] },
  { argv: ["comments", "brd_1"] },
  { argv: ["comments", "brd_1", "crd_1"] },
  // Gates.
  { argv: ["gates"] },
  { argv: ["gates", "brd_1"] },
  { argv: ["approve", "brd_1"] },
  { argv: ["approve", "brd_1", "gat_1"] },
  { argv: ["approve", "brd_1", "gat_1", "--comment", "fine"] },
  { argv: ["reject", "brd_1", "gat_1", "--comment", "no"] },
  { argv: ["request-changes", "brd_1", "gat_1"] },
  { argv: ["request-changes", "brd_1", "gat_1", "--comment", "rename it"] },
  // Links.
  { argv: ["link"] },
  { argv: ["link", "add", "brd_1", "crd_1"] },
  { argv: ["link", "add", "brd_1", "crd_1", "crd_2"] },
  { argv: ["link", "add", "brd_1", "crd_1", "crd_2", "--kind", "follows"] },
  { argv: ["link", "add", "brd_1", "crd_1", "crd_2", "--kind", "blocks"] },
  { argv: ["link", "add", "brd_1", "crd_1", "crd_9", "--kind", "relates", "--to-board", "brd_2"] },
  { argv: ["link", "add", "brd_1", "crd_1", "crd_2", "--kind", "parent", "--to-board", "brd_1"] },
  { argv: ["link", "rm", "brd_1", "crd_1", "crd_9", "--kind", "supersedes", "--to-board", "brd_2"] },
  { argv: ["link", "list", "brd_1"] },
  { argv: ["link", "list", "brd_1", "crd_1"] },
  // Labels.
  { argv: ["label"] },
  { argv: ["label", "list"] },
  { argv: ["label", "add", "bug"] },
  { argv: ["label", "add", "bug", "red"] },
  { argv: ["label", "rm"] },
  { argv: ["label", "rm", "lbl_1"] },
  { argv: ["label", "rm", "lbl_1", "--json"] },
  // Projects and milestones.
  { argv: ["project"] },
  { argv: ["project", "list"] },
  { argv: ["project", "list", "--json"] },
  { argv: ["project", "add"] },
  { argv: ["project", "add", "Launch"] },
  { argv: ["project", "add", "Launch", "--description", "Big", "--target", "2030-02-01", "--lead", "usr_1"] },
  { argv: ["project", "add", "Launch", "--target", "Feb"] },
  { argv: ["project", "show"] },
  { argv: ["project", "show", "prj_1"] },
  { argv: ["project", "rm"] },
  { argv: ["project", "rm", "prj_1"] },
  { argv: ["milestone"] },
  { argv: ["milestone", "add", "prj_1"] },
  { argv: ["milestone", "add", "prj_1", "Beta"] },
  { argv: ["milestone", "add", "prj_1", "Beta", "--target", "2030-01-15", "--sort", "2"] },
  { argv: ["milestone", "add", "prj_1", "Beta", "--target", "Jan"] },
  { argv: ["milestone", "add", "prj_1", "Beta", "--sort", "first"] },
  { argv: ["milestone", "rm"] },
  { argv: ["milestone", "rm", "mil_1"] },
  // Schedules.
  { argv: ["schedule"] },
  { argv: ["schedule", "list"] },
  { argv: ["schedule", "list", "brd_1"] },
  { argv: ["schedule", "add"] },
  { argv: ["schedule", "add", "brd_1", "--title", "Standup"] },
  { argv: ["schedule", "add", "brd_1", "--title", "Standup", "--rule", "every weekday at 09:00", "--tz", "Asia/Kolkata"] },
  { argv: ["schedule", "add", "brd_1", "--title", "S", "--rule", "daily", "--tz", "UTC", "--stage", "todo", "--priority", "1", "--overlap", "allow"] },
  { argv: ["schedule", "add", "brd_1", "--title", "S", "--rule", "daily", "--tz", "UTC", "--overlap", "never"] },
  { argv: ["schedule", "rm", "brd_1"] },
  { argv: ["schedule", "rm", "brd_1", "sch_1"] },
  { argv: ["schedule", "pause", "brd_1"] },
  { argv: ["schedule", "pause", "brd_1", "sch_1"] },
  { argv: ["schedule", "resume", "brd_1", "sch_1"] },
  // Workspace.
  { argv: ["forge"] },
  { argv: ["forge"], raw: JSON.stringify({}) },
  { argv: ["forge", "--json"] },
  { argv: ["forge", "forge.example"] },
  { argv: ["forge", "none"] },
  { argv: ["agents"] },
  { argv: ["agent"] },
  { argv: ["agent", "bogus"] },
  { argv: ["agent", "create"] },
  { argv: ["agent", "create", "--name", "Builder"] },
  { argv: ["agent", "create", "--name", "Builder", "--capability", "code"] },
  { argv: ["agent", "create", "--name", "Builder", "--capability", "code", "--external-id", "prn_x"] },
  { argv: ["agent", "create", "--name", " Builder ", "--capability", "code, review", "--capability", "ops", "--external-id", "prn_0123456789abcdef0123"] },
  { argv: ["agent", "create", "--name", "B", "--capability", "code", "--external-id", "prn_0123456789abcdef0123", "--concurrency", "2"] },
  { argv: ["agent", "create", "--name", "B", "--capability", "code", "--external-id", "prn_0123456789abcdef0123", "--concurrency", "0"] },
  { argv: ["agent", "mint-token"] },
  { argv: ["agent", "mint-token", "agt_1"] },
  { argv: ["agent", "mint-token", "agt_1", "--kind", "claim-run"] },
  { argv: ["agent", "mint-token", "agt_1", "--kind", "run-only", "--json"] },
  { argv: ["agent", "mint-token", "agt_1", "--kind", "claim-run", "--out", F("secret.txt")] },
  { argv: ["agent", "mint-token", "agt_1", "--kind", "claim-run", "--out", F("nodir/secret.txt")] },
  { argv: ["agent", "mint-token", "agt_1", "--kind", "claim-run"], raw: JSON.stringify({ tokenId: "tok_1" }) },
  { argv: ["agent", "queueing"] },
  { argv: ["agent", "queueing", "agt_1"] },
  { argv: ["agent", "queueing", "agt_1", "--owner", "usr_1", "--boards", "brd_1, brd_2,", "--ceiling", "5"] },
  { argv: ["agent", "queueing", "agt_1", "--owner", "none", "--boards", "none"] },
  { argv: ["agent", "queueing", "agt_1", "--ceiling", "0.5"] },
  { argv: ["capabilities"] },
  { argv: ["implications"] },
  { argv: ["capability"] },
  { argv: ["capability", "define", "cap_1"] },
  { argv: ["capability", "define", "cap_1", "--definition", "Writes code."] },
  { argv: ["capability", "define", "Code Review", "--definition", "Reads a diff."] },
  { argv: ["capability", "define", "Brand New", "--definition", " Something new. "] },
  { argv: ["capability", "define", "!!!", "--definition", "x"] },
];

describe("supi help, pinned", () => {
  it.each(HELP.map((s) => [s.argv.join(" ") || "(no arguments)", s] as const))("supi %s", async (_name, s) => {
    expect(await run(s)).toMatchSnapshot();
  });
});

describe("supi commands against a fake API, pinned", () => {
  it.each(RUNS.map((s, i) => [`${String(i).padStart(3, "0")} ${s.argv.join(" ")}${s.status ? ` (answered ${s.status})` : ""}${s.raw !== undefined ? " (raw answer)" : ""}${s.env ? ` (${Object.keys(s.env).join(", ")})` : ""}`, s] as const))(
    "supi %s",
    async (_name, s) => {
      expect(await run(s)).toMatchSnapshot();
    },
  );
});
