#!/usr/bin/env bun
/**
 * `supi` — superpipeline from a terminal.
 *
 * Installed under two names, `superpipeline` and `supi`, pointing at this one file: the full
 * name for scripts and documentation a stranger reads, the short one for a person typing.
 * It was `kbn` until the product was renamed; that name was short for the old one.
 *
 * The third consumer of `@superpipeline/contract`, after REST and MCP. It is a client: it adds no
 * authority, performs no local permission check, and renders the board's own refusals. A client
 * that pre-empts a server decision is a client that will one day disagree with it.
 *
 * **The verbs used to be work verbs only, and the reason given for that is no longer true.**
 * The text here said a hub token "resolves as a `member`", so managing anything needed a seat
 * the token did not grant. That was accurate until 2026-09-20, when superpipeline learned to map an
 * issuer subject onto a local user (`apps/api/src/auth/hub-oauth.ts`): a mapped principal reads
 * its real membership, and for the person who owns the workspace that is `owner`. The seat was
 * never withheld from the CLI — it did not exist yet.
 *
 * So `create-board` is here. It is still a client: it adds no authority, performs no local
 * permission check, and renders the board's own refusals. A caller with no seat gets a 403 from
 * the server, which is where that decision belongs — a client that pre-empts a server decision
 * is a client that will one day disagree with it, and this file spent a release disagreeing.
 */
import { readFileSync } from "node:fs";
import { BOARD_TEMPLATES, boardTemplate, type BoardTemplateStage } from "@superpipeline/contract";
import { baseUrl, expired, inspect, loadCredential, ENV_TOKEN } from "./credential.ts";

const USAGE = `supi — superpipeline from a terminal (\`superpipeline\` is the same command)

  supi whoami                  who the stored token says you are
  supi boards                  the workspace's boards
  supi board <boardId>         one board: its stages and their cards
  supi card <boardId> <cardId> one card in full
  supi move <boardId> <cardId> <stageKey>
                               move a card to another stage
  supi gates <boardId>         approval gates waiting on a human

  supi create-board <name> [--template <id>] [--stages <file|->]
                               create a board; --template defaults to \`simple\`
  supi templates               the starting pipelines --template accepts

  --json                       machine-stable output, on any command

Credential: $${ENV_TOKEN}, else $AGENTPOD_TOKEN, else the token \`apn fleet login\` writes.
One sign-in serves both planes — superpipeline verifies the hub's token offline.

Not here: staffing agents, editing capabilities, changing the fleet link.
What you may do is your seat in the workspace, which the server decides — not this
command. A refusal comes back as a 403 and is printed as it arrives.`;

function wantsJson(args: string[]): boolean {
  return args.includes("--json");
}

function fail(message: string, hint?: string): never {
  process.stderr.write(message + "\n");
  if (hint) process.stderr.write("\n" + hint + "\n");
  process.exit(1);
}

function credentialOrExit() {
  const c = loadCredential();
  if (!c) {
    fail(
      "Not signed in.",
      `  apn fleet login          sign in once, for both planes\n` +
        `  ${ENV_TOKEN}=…   supply a token directly`,
    );
  }
  const claims = inspect(c.token);
  if (claims && expired(claims)) {
    fail(`Your session expired at ${claims.expiry!.toLocaleString()}.`, "  apn fleet login");
  }
  return c;
}

async function api(path: string, init: RequestInit = {}): Promise<unknown> {
  const c = credentialOrExit();
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
    fail("superpipeline did not accept that token (401).", "  apn fleet login");
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
    fail(
      `Refused by superpipeline (403). ${body.trim()}`,
      "Your seat in this workspace does not permit that.\n" +
        "An AgentPod identity reads as `member` until it is linked to a superpipeline account —\n" +
        "sign in once at the web app with the same address to link them. See packages/cli/README.md.",
    );
  }
  if (!res.ok) fail(`superpipeline returned ${res.status}: ${body.trim()}`);

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const out = (value: unknown) => process.stdout.write(JSON.stringify(value, null, 2) + "\n");

/** The value of `--name value`, or null. `--name=value` is accepted too. */
function flag(args: string[], name: string): string | null {
  const joined = args.find((a) => a.startsWith(`${name}=`));
  if (joined) return joined.slice(name.length + 1) || null;
  const i = args.indexOf(name);
  if (i === -1) return null;
  const next = args[i + 1];
  return next && !next.startsWith("--") ? next : null;
}

/** A named template's stages, or a refusal that lists the ones that exist. */
function stagesFromTemplate(id: string): BoardTemplateStage[] {
  const template = boardTemplate(id);
  if (!template) {
    fail(
      `No template named \`${id}\`.`,
      "  supi templates           the ones that exist",
    );
  }
  return template.stages;
}

/**
 * Stages read from a JSON file, or from stdin when the path is `-`.
 *
 * Shape-checked only as far as "an array of objects with a key": the board is the authority on
 * what a valid pipeline is, and a client that re-implements that check is a client that will one
 * day refuse something the server would have accepted. What this catches is the file being the
 * wrong *kind* of thing — a board snapshot, a card list, an error page saved by mistake — where
 * the server's own message would be about fields the person never typed.
 */
async function stagesFromFile(path: string): Promise<BoardTemplateStage[]> {
  let raw: string;
  try {
    raw = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  } catch {
    fail(`Could not read ${path === "-" ? "stdin" : path}.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail(`${path === "-" ? "stdin" : path} is not JSON.`);
  }

  // A bare array, or `{ "stages": [...] }` — which is what `supi board <id>` prints, so the
  // output of one command is the input of another without a jq in between.
  const stages = Array.isArray(parsed) ? parsed : (parsed as { stages?: unknown })?.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    fail(
      "Expected a non-empty array of stages, or an object with a `stages` array.",
      "  supi board <boardId> | supi create-board 'Copy' --stages -",
    );
  }
  if (!stages.every((s) => s && typeof s === "object" && typeof (s as { key?: unknown }).key === "string")) {
    fail("Every stage needs a string `key`.");
  }
  return stages as BoardTemplateStage[];
}

async function main(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  const json = wantsJson(rest);
  const pos = rest.filter((a) => !a.startsWith("--"));

  switch (cmd) {
    case undefined:
    case "help":
    case "-h":
    case "--help":
      process.stdout.write(USAGE + "\n");
      return;

    case "whoami": {
      const c = credentialOrExit();
      const claims = inspect(c.token);
      if (!claims) fail("The stored credential is not a token this can read.");
      if (json) {
        out({
          principal: claims.subject,
          kind: claims.principalKind,
          source: c.source,
          superpipeline: baseUrl(),
          expires: claims.expiry?.toISOString() ?? null,
        });
        return;
      }
      process.stdout.write(
        `principal  ${claims.subject}\n` +
          `kind       ${claims.principalKind}\n` +
          `superpipeline   ${baseUrl()}\n` +
          `token from ${c.source}\n` +
          (claims.expiry ? `expires    ${claims.expiry.toLocaleString()}\n` : ""),
      );
      return;
    }

    case "boards":
      out(await api("/v1/boards"));
      return;

    case "board": {
      if (!pos[0]) fail("usage: supi board <boardId>");
      out(await api(`/v1/boards/${pos[0]}`));
      return;
    }

    case "card": {
      if (!pos[0] || !pos[1]) fail("usage: supi card <boardId> <cardId>");
      out(await api(`/v1/boards/${pos[0]}/cards/${pos[1]}`));
      return;
    }

    case "move": {
      if (!pos[0] || !pos[1] || !pos[2]) fail("usage: supi move <boardId> <cardId> <stageKey>");
      out(
        await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/move`, {
          method: "POST",
          body: JSON.stringify({ toStageKey: pos[2] }),
        }),
      );
      return;
    }

    case "gates": {
      if (!pos[0]) fail("usage: supi gates <boardId>");
      out(await api(`/v1/boards/${pos[0]}/gates/pending`));
      return;
    }

    case "templates": {
      // No credential needed: these are shipped with the CLI, not fetched. Someone deciding
      // which template to use should not have to sign in first.
      out(
        BOARD_TEMPLATES.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          stages: t.stages.map((s) => s.key),
        })),
      );
      return;
    }

    case "create-board": {
      if (!pos[0]) fail("usage: supi create-board <name> [--template <id>] [--stages <file|->]");
      const name = pos[0];

      const stagesFlag = flag(rest, "--stages");
      const templateFlag = flag(rest, "--template");
      if (stagesFlag && templateFlag) {
        fail("--stages and --template both name the pipeline; pass one.");
      }

      const stages = stagesFlag ? await stagesFromFile(stagesFlag) : stagesFromTemplate(templateFlag ?? "simple");
      out(await api("/v1/boards", { method: "POST", body: JSON.stringify({ name, stages }) }));
      return;
    }

    default:
      fail(`unknown command: ${cmd}`, USAGE);
  }
}

await main(process.argv.slice(2));
