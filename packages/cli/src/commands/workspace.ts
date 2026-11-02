/**
 * The workspace: its forge, agents and their tokens, and the capability registry.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { chmodSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { capabilityTag } from "@superpipeline/contract";
import { flag, flags } from "../args.ts";
import { api, fail, out, type Args } from "../runtime.ts";
import { type CommandSpec } from "../spec.ts";

/** The `workspace` group's entries in the command table, in the order `supi help` lists them. */
export const WORKSPACE_COMMANDS: CommandSpec[] = [
  {
    path: ["forge"],
    group: "workspace",
    args: [{ name: "host|none", description: "a Forgejo host to set, or `none` to clear it; omit to show the current one", optional: true }],
    flags: [],
    synopsis: "supi forge [<host>|none]",
    summary: "this workspace's forge host, shown or set",
    description:
      "Shows or sets the workspace's forge host. GitHub needs no configuration; a self-hosted Forgejo does, and " +
      "until it is set a link to one of its repositories is stored as a plain URL — with no durable id for events " +
      "to match.",
    routes: [
      { method: "GET", path: "/v1/tenant/forge" },
      { method: "PUT", path: "/v1/tenant/forge" },
    ],
    access: { role: "viewer", agent: "refused", note: "Showing needs `viewer`; setting or clearing needs `admin`." },
    output: "`forge <host>`, `No forge configured.` or `Forge cleared.`; `--json` for `{ forgeHost }`",
    fails: [],
    examples: ["supi forge", "supi forge git.example.com", "supi forge none"],
  },
  {
    path: ["agents"],
    group: "workspace",
    args: [],
    flags: [],
    summary: "the workspace's agents and what they declare",
    description:
      "Every agent in the workspace with the capabilities it declares, its token ids (never a token) and its " +
      "queueing policy.",
    routes: [{ method: "GET", path: "/v1/agents" }],
    access: { role: "viewer", agent: "read" },
    output: "JSON: the agents",
    fails: [],
    examples: ["supi agents"],
  },
  {
    path: ["agent", "create"],
    group: "workspace",
    args: [],
    flags: [
      { name: "--name", value: "<name>", type: "string", required: true, description: "what the agent is called on the board" },
      {
        name: "--capability",
        value: "<key>",
        type: "list",
        required: true,
        repeatable: true,
        description:
          "a capability it holds; repeat the flag or separate with commas. Normalised as a stage's owner is, so " +
          "`Code Review` becomes `code-review`, and registered if the workspace has not seen it",
      },
      {
        name: "--external-id",
        value: "prn_…",
        type: "string",
        required: true,
        description:
          "the principal this agent IS on the organization plane — `prn_` and 20 lowercase hex characters, checked " +
          "before anything is sent. A principal is one agent: one already linked elsewhere is refused",
      },
      {
        name: "--concurrency",
        value: "<n>",
        type: "integer",
        default: "1",
        description: "the most cards it may hold at once; a whole number of at least 1",
      },
    ],
    summary: "create an agent, linked to its principal as it is made",
    description:
      "Creates an agent record and links it to the principal it is on the organization plane, in one request: a " +
      "rejected link leaves no agent behind. The link is what lets the agent's own org-plane tokens (a station " +
      "token) resolve as this agent, and its capabilities are chosen here — they are never carried in a token.\n\n" +
      "A linked agent is minted no `spa_` token; `supi agent mint-token` issues one when it needs a native " +
      "credential. `--external-id` is therefore required here, although the route accepts an agent without one.\n\n" +
      "A person's act: an agent credential is refused (403), because linking an agent to a principal is what makes " +
      "an agent token resolve at all.",
    routes: [{ method: "POST", path: "/v1/agents" }],
    access: { role: "admin", agent: "refused", note: "A session or a person's organization-plane token; never an agent." },
    output: "JSON: the agent, with its `externalId` and `externalSource` (`org-plane`)",
    fails: [
      "`--name`, `--capability` or `--external-id` is missing",
      "`--external-id` is not `prn_` and 20 lowercase hex characters",
      "`--concurrency` is not a whole number of at least 1",
      "the principal is already linked to a different agent (409)",
    ],
    examples: [
      "supi agent create --name Coordinator --capability coordination --external-id prn_0123456789abcdef0123",
      "supi agent create --name Reviewer --capability code-review,code --external-id prn_89ab… --concurrency 2",
    ],
  },
  {
    path: ["agent", "mint-token"],
    group: "workspace",
    args: [{ name: "agentId", description: "the agent (see `supi agents`)" }],
    flags: [
      {
        name: "--kind",
        value: "claim-run|run-only",
        type: "enum",
        choices: ["claim-run", "run-only"],
        required: true,
        description:
          "`claim-run`: scopes `claim` and `run`, for whatever takes cards off the board on the agent's behalf; " +
          "`run-only`: scope `run`, which drives the card the agent already holds and cannot claim another — the " +
          "one to hand to a harness that reports for itself over MCP",
      },
      {
        name: "--out",
        value: "FILE",
        type: "path",
        default: "the token alone on stdout",
        description:
          "write the token to this file, mode 0600, and print it nowhere. An existing file is replaced, and its " +
          "mode tightened to 0600",
      },
    ],
    summary: "mint an agent's token: claim-run or run-only, shown once",
    description:
      "Issues a fresh `spa_` token for an agent that already exists. It does not expire; it lasts until it is " +
      "revoked in Crew → Agents, and revoking is per token, so an agent with two keeps working on the other.\n\n" +
      "The secret is shown **once** — only its hash is kept. Without `--out` the token alone goes to stdout and " +
      "everything else to stderr, so `> file` captures exactly the secret; with `--out` it is written 0600 and " +
      "printed nowhere. With `--json`, the object's `token` field is the only place it appears, and it is absent " +
      "when `--out` took it. Nothing logs it.\n\n" +
      "A person's act: an agent credential is refused (403) — an agent must never mint itself, or a peer, a " +
      "credential that would outlive one a person revoked.",
    routes: [{ method: "POST", path: "/v1/agents/:agentId/tokens" }],
    access: { role: "admin", agent: "refused", note: "A session or a person's organization-plane token; never an agent." },
    output: "the token (or, with `--out`, a line naming the file); with `--json`: `agentId`, `kind`, `tokenId`, `scopes` and `token` or `out`",
    fails: [
      "`<agentId>` is missing, or `--kind` is not `claim-run` or `run-only`",
      "the agent is not in this workspace (404)",
      "`--out` cannot be written",
    ],
    examples: [
      "supi agent mint-token agt_c4d2… --kind claim-run --out ~/.config/agent/claim-run.token",
      "supi agent mint-token agt_c4d2… --kind run-only > run-only.token",
    ],
  },
  {
    path: ["agent", "queueing"],
    group: "workspace",
    args: [{ name: "agentId", description: "the agent (see `supi agents`)" }],
    flags: [
      {
        name: "--owner",
        value: "<userId>|none",
        type: "string",
        default: "unchanged",
        description: "the person whose work the agent's own cards are; `none` clears it",
      },
      {
        name: "--boards",
        value: "<id,id,…>|none",
        type: "list",
        default: "unchanged",
        description:
          "the boards the agent may queue onto, comma-separated. `none` — which is also every agent's starting " +
          "state — means NO board, not every board",
      },
      {
        name: "--ceiling",
        value: "<n>",
        type: "integer",
        default: "unchanged",
        description: "the most cards it may queue in an hour; a whole number of at least 1",
      },
    ],
    summary: "what an agent may queue of its OWN: owner, boards, cards an hour",
    description:
      "Sets the three bounds on an agent that queues work of its own. At least one flag is required; a flag left " +
      "out is left unchanged, and clearing is always typed (`none`), never inferred from an empty value. The " +
      "dispatch grant itself is not set here — it arrives in the agent's token from the fleet that issued it.",
    routes: [{ method: "PATCH", path: "/v1/agents/:agentId" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the agent",
    fails: ["`<agentId>` is missing, or the sub-verb is not `queueing`", "no flag is given", "`--ceiling` is not a whole number of at least 1"],
    examples: ["supi agent queueing agt_c4d2… --owner usr_19a0… --boards brd_8f2c…,brd_93fa… --ceiling 6", "supi agent queueing agt_c4d2… --boards none"],
  },
  {
    path: ["capabilities"],
    group: "workspace",
    args: [],
    flags: [],
    summary: "the capability registry, with each one's origin",
    description:
      "Every capability the workspace knows, and where each came from — declared by a person, or inferred because a " +
      "stage asked for it. A capability a stage names and no agent holds is a lane nothing can claim.",
    routes: [{ method: "GET", path: "/v1/capabilities" }],
    access: { role: "viewer", agent: "read" },
    output: "JSON: the capabilities",
    fails: [],
    examples: ["supi capabilities"],
  },
  {
    path: ["capability", "define"],
    group: "workspace",
    args: [{ name: "id|key", description: "the capability, as `cap_…` or by its key (see `supi capabilities`)" }],
    flags: [
      {
        name: "--definition",
        value: "<text>",
        type: "string",
        required: true,
        description: "what holding this capability means — the description the registry and Crew → Capabilities show",
      },
    ],
    summary: "say what a capability means, declaring it if it is new",
    description:
      "Sets a capability's definition. Named by key, it is normalised the way a stage's owner is, so `Code Review` " +
      "finds `code-review`; a key the registry has not seen yet is declared with the definition, so the vocabulary " +
      "can be defined before any stage or agent names it. Its key never changes — stages and agents refer to it.\n\n" +
      "A person's act: an agent credential is refused (403). Declaring the vocabulary is the same class of act as " +
      "managing the agents that hold it.",
    routes: [
      { method: "GET", path: "/v1/capabilities" },
      { method: "PATCH", path: "/v1/capabilities/:id" },
    ],
    access: {
      role: "admin",
      agent: "refused",
      note: "A session or a person's organization-plane token; never an agent. A key not yet registered is a `POST /v1/capabilities` instead of the PATCH; named by `cap_…` id, the GET is skipped.",
    },
    output: "JSON: the capability",
    fails: ["`define` or `<id|key>` is missing", "`--definition` is missing or empty", "no capability has that id (404)"],
    examples: [
      'supi capability define code-review --definition "Reads a diff and says what is wrong with it."',
      'supi capability define cap_7a1e… --definition "Plans work and queues it onto boards."',
    ],
  },
  {
    path: ["implications"],
    group: "workspace",
    args: [],
    flags: [],
    summary: "what one capability implies about another",
    description:
      "The implication edges between capabilities. An agent's effective capability set is what it declares plus " +
      "everything those imply, and routing compares a stage's owner against that set.",
    routes: [{ method: "GET", path: "/v1/capabilities/implications" }],
    access: { role: "viewer", agent: "refused", note: "Not open to agent tokens today." },
    output: "JSON: the edges",
    fails: [],
    examples: ["supi implications"],
  },
];

/** What each `mint-token --kind` asks the server for. The scope names are the contract's. */
const TOKEN_KINDS: Record<string, string[]> = {
  "claim-run": ["claim", "run"],
  "run-only": ["run"],
};

/** The shape the server checks too (`apps/api` POST /v1/agents); caught here so a typo never leaves the terminal. */
const PRINCIPAL_RE = /^prn_[0-9a-f]{20}$/;

/**
 * Write a secret to `path`, readable by its owner only.
 *
 * Written to a sibling temporary file created 0600 and renamed over the target, so the secret is
 * never — even for an instant — in a file with wider permissions: `writeFileSync`'s `mode` applies
 * only when it CREATES a file, and an existing 0644 file would otherwise keep its mode. The chmod
 * is belt and braces against a umask that strips owner bits.
 */
function writeSecret(path: string, secret: string): void {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, secret + "\n", { mode: 0o600, flag: "wx" });
    chmodSync(tmp, 0o600);
    renameSync(tmp, path);
  } catch (error) {
    fail(`Could not write ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Where this workspace's forge is, so references from it are recognised.
 *
 * GitHub needs no configuration — there is one github.com. A Forgejo instance is at whatever
 * host its operator chose, so recognition has to be told, and until it is, every link to the
 * workspace's own repositories is stored as a generic `url`: no durable id, nothing to dedupe
 * against, nothing a webhook could ever match.
 */
export async function runForge({ pos }: Args): Promise<void> {
  if (!pos[0]) {
    const t = (await api("/v1/tenant/forge")) as { forgeHost?: string | null };
    const host = t.forgeHost ?? null;
    out({ forgeHost: host }, () =>
      host ? `forge  ${host}` : "No forge configured. `supi forge <host>` sets one.",
    );
    return;
  }
  const host = pos[0] === "none" ? null : pos[0];
  await api("/v1/tenant/forge", { method: "PUT", body: JSON.stringify({ forgeHost: host }) });
  out({ forgeHost: host }, () => (host ? `forge  ${host}` : "Forge cleared."));
}

export async function runAgents(): Promise<void> {
  out(await api("/v1/agents"));
}

/**
 * What bounds an agent that queues work of its own (superpipeline migration 0015).
 *
 * A separate verb from `agents` because it WRITES, and the three fields it writes are the whole
 * blast radius of a coordinator: without them the policy could only be set by opening a
 * database, which is both unauditable and the kind of manual step this CLI exists to remove.
 *
 * The dispatch grant is deliberately NOT here. It lives in AgentPod — `fleet grants set` — and
 * reaches superpipeline in the token's claims, so a copy here would keep authorising dispatches
 * after the operator revoked them.
 */
export async function runAgent({ rest, pos, json }: Args): Promise<void> {
  const sub = pos[0];

  /**
   * Create an agent, linked to the principal it IS as it is made.
   *
   * `--external-id` is required here, not optional as it is on the route: an agent created
   * without one is minted an `spa_` in the same response, and this verb exists to register an
   * agent that authenticates with its own org-plane tokens. A credential nobody asked for is
   * one more secret to leak; `mint-token` is the way to ask for one.
   */
  if (sub === "create") {
    const name = flag(rest, "--name");
    if (!name || name.trim() === "") fail("--name is required");
    const capabilities = flags(rest, "--capability")
      .flatMap((c) => c.split(","))
      .map((c) => c.trim())
      .filter((c) => c !== "");
    if (capabilities.length === 0) fail("at least one --capability is required");
    const externalId = flag(rest, "--external-id");
    if (!externalId) fail("--external-id is required: the agent's principal, as prn_…");
    if (!PRINCIPAL_RE.test(externalId)) fail("--external-id must look like prn_ followed by 20 lowercase hex characters");
    const body: Record<string, unknown> = { name: name.trim(), capabilities, externalId };
    const concurrency = flag(rest, "--concurrency");
    if (concurrency !== null) {
      const n = Number(concurrency);
      if (!Number.isInteger(n) || n < 1) fail("--concurrency must be a whole number of at least 1");
      body.concurrency = n;
    }
    out(await api("/v1/agents", { method: "POST", body: JSON.stringify(body) }));
    return;
  }

  /**
   * Mint a credential for an agent. The secret is shown ONCE — only its hash is kept — so where
   * it goes is the whole design:
   *
   *   - no `--out`: the token alone on stdout, everything else on stderr, so a redirect captures
   *     the secret and nothing more;
   *   - `--out FILE`: written 0600, and printed nowhere;
   *   - `--json`: one object whose `token` field is the only place the secret appears — absent
   *     entirely when `--out` took it.
   *
   * Nothing here logs it. The server decides who may: a person with `admin` or above, never an
   * agent, whatever it holds.
   */
  if (sub === "mint-token") {
    const agentId = pos[1];
    if (!agentId) fail("usage: supi agent mint-token <agentId> --kind claim-run|run-only [--out FILE]");
    const kind = flag(rest, "--kind");
    if (!kind || !(kind in TOKEN_KINDS)) fail("--kind must be claim-run or run-only");
    const target = flag(rest, "--out");
    const minted = (await api(`/v1/agents/${agentId}/tokens`, {
      method: "POST",
      body: JSON.stringify({ scopes: TOKEN_KINDS[kind] }),
    })) as { token?: unknown; tokenId?: unknown; scopes?: unknown };
    if (typeof minted?.token !== "string") fail("superpipeline answered without a token; nothing was minted that this can show.");
    const meta = { agentId, kind, tokenId: minted.tokenId, scopes: minted.scopes };
    if (target) {
      writeSecret(target, minted.token);
      if (json) process.stdout.write(JSON.stringify({ ...meta, out: target }, null, 2) + "\n");
      else process.stdout.write(`Wrote ${kind} token ${String(minted.tokenId)} for ${agentId} to ${target} (mode 0600).\n`);
      return;
    }
    if (json) {
      process.stdout.write(JSON.stringify({ ...meta, token: minted.token }, null, 2) + "\n");
      return;
    }
    process.stderr.write(
      `${kind} token ${String(minted.tokenId)} for ${agentId} (scopes: ${(minted.scopes as string[] | undefined)?.join(", ") ?? "?"}).\n` +
        "Shown once — store it now, readable only by you (0600). Revoke it in Workspace -> Agents.\n",
    );
    process.stdout.write(minted.token + "\n");
    return;
  }

  if (sub !== "queueing" || !pos[1]) {
    fail(
      "usage: supi agent create --name <name> --capability <key>... --external-id prn_… [--concurrency <n>]\n" +
        "       supi agent mint-token <agentId> --kind claim-run|run-only [--out FILE]\n" +
        "       supi agent queueing <agentId> [--owner <userId>|none] [--boards <id,id>|none] [--ceiling <n>]",
    );
  }
  const body: Record<string, unknown> = {};
  const owner = flag(rest, "--owner");
  // `none` rather than an empty value, so clearing is something the caller TYPED. `flag` returns
  // null both for "absent" and for "present with no value", so a bare `--owner` must not be read
  // as "clear the owner" — that would make a typo into a revocation.
  if (owner !== null) body.ownerUserId = owner === "none" ? null : owner;
  const boards = flag(rest, "--boards");
  if (boards !== null) {
    body.mayQueueTo =
      boards === "none" ? null : boards.split(",").map((b) => b.trim()).filter((b) => b !== "");
  }
  const ceiling = flag(rest, "--ceiling");
  if (ceiling !== null) {
    const n = Number(ceiling);
    if (!Number.isInteger(n) || n < 1) fail("--ceiling must be a whole number of at least 1");
    body.queueCeilingPerHour = n;
  }
  if (Object.keys(body).length === 0) fail("nothing to change: pass --owner, --boards or --ceiling");
  out(await api(`/v1/agents/${pos[1]}`, { method: "PATCH", body: JSON.stringify(body) }));
}

export async function runCapabilities(): Promise<void> {
  out(await api("/v1/capabilities"));
}

/**
 * Say what a capability MEANS — the registry's description — from a terminal.
 *
 * Takes the capability's id (`cap_…`) or its key, in any spelling a stage would normalise to
 * the same key. A key the registry has not heard of is declared with the definition, so an
 * operator can define the vocabulary before any agent or stage names it.
 */
export async function runCapability({ rest, pos }: Args): Promise<void> {
  const sub = pos[0];
  const target = pos[1];
  if (sub !== "define" || !target) fail("usage: supi capability define <id|key> --definition <text>");
  const definition = flag(rest, "--definition");
  if (!definition || definition.trim() === "") fail("--definition is required: what holding this capability means");
  const description = definition.trim();
  let id: string | null = target.startsWith("cap_") ? target : null;
  if (!id) {
    const key = capabilityTag(target);
    if (key === "") fail(`${target} is not a capability key: it needs a letter or a digit`);
    const { capabilities } = (await api("/v1/capabilities")) as { capabilities?: Array<{ id: string; key: string }> };
    const found = (capabilities ?? []).find((c) => c.key === key);
    if (!found) {
      out(await api("/v1/capabilities", { method: "POST", body: JSON.stringify({ key, description }) }));
      return;
    }
    id = found.id;
  }
  out(await api(`/v1/capabilities/${id}`, { method: "PATCH", body: JSON.stringify({ description }) }));
}

export async function runImplications(): Promise<void> {
  out(await api("/v1/capabilities/implications"));
}
