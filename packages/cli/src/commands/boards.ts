/**
 * Boards and their pipelines: listing, reading, creating, and setting stages.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { readFileSync } from "node:fs";
import { BOARD_TEMPLATES, boardTemplate, type BoardTemplateStage } from "@superpipeline/contract";
import { renderBoards, renderBoard } from "../render.ts";
import { flag } from "../args.ts";
import { api, fail, out, readText, type Args } from "../runtime.ts";
import { BOARD, type CommandSpec } from "../spec.ts";

/** The `boards` group's entries in the command table, in the order `supi help` lists them. */
export const BOARDS_COMMANDS: CommandSpec[] = [
  {
    path: ["boards"],
    group: "boards",
    args: [],
    flags: [],
    summary: "the workspace's boards",
    description: "Every board in the workspace the credential belongs to, with its id.",
    routes: [{ method: "GET", path: "/v1/boards" }],
    access: { role: "viewer", agent: "read" },
    output: "one board per line; `--json` for the server's `{ boards: [...] }`",
    fails: [],
    examples: ["supi boards", "supi boards --json"],
  },
  {
    path: ["board"],
    group: "boards",
    args: [BOARD],
    flags: [],
    summary: "one board: its stages and their cards",
    description:
      "One board: each stage in order with its owner, gate and limits, and the cards standing in it. " +
      "`supi board <boardId> --json` prints the snapshot in the shape `create-board --stages` and `set-stages` " +
      "accept, so a pipeline can be read, edited and put back.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId" }],
    access: { role: "viewer", agent: "read" },
    output: "stages with their cards; `--json` for the board snapshot",
    fails: ["`<boardId>` is missing"],
    examples: ["supi board brd_8f2c…", "supi board brd_8f2c… --json > pipeline.json"],
  },
  {
    path: ["templates"],
    group: "boards",
    args: [],
    flags: [],
    summary: "the starting pipelines --template accepts",
    description:
      "The board templates shipped with this binary: id, name, description and stage keys. Needs no credential — " +
      "they are part of the CLI, not fetched.",
    routes: [],
    access: { role: null, agent: null },
    output: "JSON: `[{ id, name, description, stages }]`",
    fails: [],
    examples: ["supi templates"],
  },
  {
    path: ["create-board"],
    group: "boards",
    args: [{ name: "name", description: "the board's name" }],
    flags: [
      {
        name: "--template",
        value: "<id>",
        type: "string",
        default: "`simple`",
        description: "start from a shipped template (see `supi templates`)",
      },
      {
        name: "--stages",
        value: "<file|->",
        type: "path",
        default: "the template's stages",
        description:
          "read the pipeline from a JSON file, or stdin for `-`: a non-empty array of stages, or an object with a " +
          "`stages` array (which is what `supi board <boardId> --json` prints). Every stage needs a string `key`",
      },
    ],
    summary: "create a board; --template defaults to `simple`",
    description:
      "Creates a board from a template or from a pipeline you supply. `--template` and `--stages` both name the " +
      "pipeline, so pass at most one. The board checks the stages itself; this only refuses a file that is the " +
      "wrong kind of thing.",
    routes: [{ method: "POST", path: "/v1/boards" }],
    access: { role: "admin", agent: "compose" },
    output: "JSON: the created board",
    fails: [
      "`<name>` is missing, or both `--template` and `--stages` are given",
      "no template has that id",
      "the stages file cannot be read, is not JSON, or is not a non-empty array of stages each with a `key`",
    ],
    examples: [
      "supi create-board 'Releases' --template software",
      "supi board brd_8f2c… --json | supi create-board 'Copy of releases' --stages -",
    ],
  },
  {
    path: ["set-stages"],
    group: "boards",
    args: [BOARD, { name: "file|-", description: "the new pipeline: a JSON file, or `-` for stdin, in the same shape `create-board --stages` takes" }],
    flags: [],
    summary: "replace a board's pipeline",
    description:
      "Replaces every stage of a board. Anything the file does not carry — another stage's instructions, a " +
      "completion rule, a concurrent edit — is discarded. To change one stage, use `set-stage`.",
    routes: [{ method: "PUT", path: "/v1/boards/:boardId/stages" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the board's new stages",
    fails: ["`<boardId>` or the file is missing", "the file cannot be read, is not JSON, or is not a non-empty array of stages each with a `key`"],
    examples: ["supi board brd_8f2c… --json > p.json && $EDITOR p.json && supi set-stages brd_8f2c… p.json"],
  },
  {
    path: ["set-stale"],
    group: "boards",
    args: [BOARD],
    flags: [
      { name: "--hours", value: "<n>", type: "number", default: "unchanged (24 on a new board)", description: "how long a card may wait before it counts as stale" },
      { name: "--off", type: "boolean", description: "stop this board reporting stale cards: no digest, and left out of `supi stale` unless `--hours` is given" },
      { name: "--on", type: "boolean", description: "report them again" },
    ],
    summary: "set when a board's waiting cards count as stale, or switch it off",
    description:
      "Sets the board's stale threshold and its switch. While on, the board's owners hear about each stale card in " +
      "their notifications at most once a day, and any push subscription to `cards.stale` gets one digest per sweep " +
      "that has something new to say.",
    routes: [{ method: "PUT", path: "/v1/boards/:boardId/stale" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the board's stale settings",
    fails: ["`<boardId>` is missing, or nothing to set", "both `--on` and `--off`", "`--hours` is not a number of hours, 0 or more"],
    examples: ["supi set-stale brd_8f2c… --hours 48", "supi set-stale brd_8f2c… --off"],
  },
  {
    path: ["set-stage"],
    group: "boards",
    args: [BOARD, { name: "stageKey", description: "the stage's `key` (see `supi board <boardId>`)" }],
    flags: [
      {
        name: "--instructions",
        value: "<file|->",
        type: "path",
        default: "unchanged",
        description:
          "the stage's runbook — prose handed to whoever claims a card here — read from a file, or stdin for `-`. " +
          "A file rather than a string because shell quoting mangles paragraphs",
      },
      { name: "--clear-instructions", type: "boolean", default: "off", description: "remove the stage's instructions" },
      { name: "--name", value: "<name>", type: "string", default: "unchanged", description: "rename the stage" },
      {
        name: "--gate",
        value: "none|approval",
        type: "enum",
        choices: ["none", "approval"],
        default: "unchanged",
        description: "`approval` makes a card wait for a human decision before it leaves the stage",
      },
      {
        name: "--wip",
        value: "<n>|none",
        type: "integer",
        default: "unchanged",
        description: "the most cards the stage may hold at once; `none` removes the limit",
      },
      {
        name: "--owner",
        value: "<capability>",
        type: "string",
        default: "unchanged",
        description: "the capability an agent must hold to claim cards here",
      },
      {
        name: "--completion",
        value: "<file|->",
        type: "path",
        default: "unchanged",
        description:
          "what a run must produce before the board believes it finished, as JSON from a file or stdin " +
          "(see Stage runbooks and completion)",
      },
      { name: "--clear-completion", type: "boolean", default: "off", description: "remove the stage's completion requirement" },
      {
        name: "--return-stage",
        value: "<stageKey>",
        type: "string",
        default: "unchanged",
        description:
          "make this a judging stage: a run that completes with outcome `changes-needed` sends the card back to this " +
          "EARLIER stage with its findings (at most twice before it waits for a person), and a completion here must say " +
          "`pass` or `changes-needed`",
      },
      { name: "--clear-return-stage", type: "boolean", default: "off", description: "stop the stage judging: remove its return stage" },
    ],
    summary: "change ONE stage, leaving the others alone",
    description:
      "Changes the named fields of one stage and nothing else. At least one flag is required. A person may set any " +
      "field. An agent token with `compose` may set `--instructions` only — the other fields are routing, and the " +
      "server refuses them by name.",
    routes: [{ method: "PATCH", path: "/v1/boards/:boardId/stages/:stageKey" }],
    access: { role: "member", agent: "compose", note: "An agent may only send `--instructions`." },
    output: "JSON: the updated stage",
    fails: [
      "`<boardId>` or `<stageKey>` is missing, or no flag is given (`Nothing to change.`)",
      "an `--instructions` or `--completion` file cannot be read, or the completion file is not JSON",
      "`--return-stage` names a stage that does not exist or is not earlier than this one (`INVALID_STAGES`)",
    ],
    examples: [
      "supi set-stage brd_8f2c… build --instructions runbooks/build.md",
      "supi set-stage brd_8f2c… review --gate approval --wip 3",
      "supi set-stage brd_8f2c… build --clear-completion",
      "supi set-stage brd_8f2c… integrate --return-stage fix",
    ],
  },
];

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

export async function runBoards(): Promise<void> {
  out(await api("/v1/boards"), renderBoards);
}

export async function runBoard({ pos }: Args): Promise<void> {
  if (!pos[0]) fail("usage: supi board <boardId>");
  out(await api(`/v1/boards/${pos[0]}`), renderBoard);
}

export async function runSetStale({ rest, pos }: Args): Promise<void> {
  const hours = flag(rest, "--hours");
  const on = rest.includes("--on");
  const off = rest.includes("--off");
  if (!pos[0]) fail("usage: supi set-stale <boardId> [--hours <n>] [--on|--off]");
  if (on && off) fail("--on and --off contradict each other.");
  if (hours === null && !on && !off) fail("Nothing to set.", "  supi set-stale <boardId> --hours 48   (or --off, --on)");
  if (hours !== null && !(Number.isFinite(Number(hours)) && Number(hours) >= 0)) fail("--hours takes a number of hours, 0 or more.");
  out(
    await api(`/v1/boards/${pos[0]}/stale`, {
      method: "PUT",
      body: JSON.stringify({ ...(hours !== null ? { afterHours: Number(hours) } : {}), ...(on || off ? { enabled: on } : {}) }),
    }),
  );
}

// The two sides of the routing comparison, and the edges between them.
//
// Routing is exact string equality between a stage's `owner` and an agent's EFFECTIVE
// capability set — the closure of what it declares over the implication edges. So when a card
// will not move, the entire diagnosis is that comparison, and these are how it is read without
// opening the web app. A lane whose capability nobody holds is a real state rather than an
// error, which is exactly why it has to be visible.
export async function runSetStages({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi set-stages <boardId> <file|->");
  // Same `--stages` shape `create-board` accepts, so a pipeline can be read back with
  // `supi board <id> --json`, edited, and put straight back.
  out(await api(`/v1/boards/${pos[0]}/stages`, {
    method: "PUT",
    body: JSON.stringify({ stages: await stagesFromFile(pos[1]) }),
  }));
}

/**
 * One stage, without holding the rest of the pipeline.
 *
 * `set-stages` replaces every stage, so setting one rule meant reading them all, editing a
 * JSON file by hand and putting them all back — four times in one afternoon on one board, and
 * every one of those writes would have discarded a concurrent edit to a stage it never
 * touched.
 *
 * `--instructions` reads a FILE or stdin rather than taking a string, because a stage rule is
 * paragraphs with line breaks and shell quoting mangles those in ways that are invisible
 * until an agent reads them.
 */
export async function runSetStage({ rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) {
    fail(
      "usage: supi set-stage <boardId> <stageKey> [--instructions <file|->] [--name <name>]",
      "  [--gate none|approval] [--wip <n>] [--owner <capability>] [--completion <file|->]\n" +
        "  [--clear-instructions] [--clear-completion] [--return-stage <stageKey>] [--clear-return-stage]",
    );
  }
  const patch: Record<string, unknown> = {};
  const instructionsArg = flag(rest, "--instructions");
  if (instructionsArg) patch.instructions = readText(instructionsArg);
  /**
   * What a run must produce here before the board believes it finished.
   *
   * A file rather than a flag per arm: the requirement is a small structure — keys, a
   * reference shape — and spelling it as `--handoff url --handoff commit --ref-provider forge`
   * would invent a second grammar for something the API already has one for.
   */
  const completionArg = flag(rest, "--completion");
  if (completionArg) {
    const raw = readText(completionArg);
    try {
      patch.completion = JSON.parse(raw);
    } catch {
      fail(`${completionArg === "-" ? "stdin" : completionArg} is not JSON.`);
    }
  }
  if (rest.includes("--clear-completion")) patch.completion = null;
  // Where a judge's `changes-needed` sends the card. Its own clearing flag for the reason
  // `--clear-instructions` has one: a flag that removes something should have to be typed.
  const returnArg = flag(rest, "--return-stage");
  if (returnArg) patch.returnStage = returnArg;
  if (rest.includes("--clear-return-stage")) patch.returnStage = null;
  // Explicit, and its own flag: `--instructions ""` cannot mean "remove" when an empty rule
  // is refused, and a flag that deletes something should have to be typed.
  if (rest.includes("--clear-instructions")) patch.instructions = null;
  const nameArg = flag(rest, "--name");
  if (nameArg) patch.name = nameArg;
  const gateArg = flag(rest, "--gate");
  if (gateArg) patch.gate = gateArg;
  const ownerArg = flag(rest, "--owner");
  if (ownerArg) patch.owner = ownerArg;
  const wipArg = flag(rest, "--wip");
  if (wipArg) patch.wipLimit = wipArg === "none" ? null : Number(wipArg);

  if (Object.keys(patch).length === 0) {
    fail("Nothing to change.", "  supi set-stage <boardId> <stageKey> --instructions <file|->");
  }
  out(await api(`/v1/boards/${pos[0]}/stages/${pos[1]}`, { method: "PATCH", body: JSON.stringify(patch) }));
}

export async function runTemplates(): Promise<void> {
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
}

export async function runCreateBoard({ rest, pos }: Args): Promise<void> {
  if (!pos[0]) fail("usage: supi create-board <name> [--template <id>] [--stages <file|->]");
  const name = pos[0];

  const stagesFlag = flag(rest, "--stages");
  const templateFlag = flag(rest, "--template");
  if (stagesFlag && templateFlag) {
    fail("--stages and --template both name the pipeline; pass one.");
  }

  const stages = stagesFlag ? await stagesFromFile(stagesFlag) : stagesFromTemplate(templateFlag ?? "simple");
  out(await api("/v1/boards", { method: "POST", body: JSON.stringify({ name, stages }) }));
}
