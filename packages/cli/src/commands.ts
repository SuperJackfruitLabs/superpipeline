/**
 * Every command `supi` has, stated once.
 *
 * Three things read this table, and that is the reason it exists:
 *
 *   - `supi help` (the USAGE block) and `supi help <verb>` / `supi <verb> --help`,
 *   - the published reference at docs.superpipeline.dev/reference/cli/, generated from it by
 *     `reference.ts` and committed under `docs-site/src/content/docs/reference/cli/`,
 *   - `reference.test.ts`, which reads `index.ts` and fails when a verb, a sub-verb or a flag the
 *     switch handles has no entry here — or an entry here names something the switch never reads.
 *
 * Before this, the help text was a hand-written block beside the switch and the docs page was a
 * third copy, and the three disagreed: `set-stage --gate`, `--wip`, `--owner` and
 * `--clear-instructions` were dispatched and in neither the help nor the docs.
 *
 * The access column is a claim about the SERVER, not something this CLI enforces — `supi` adds no
 * authority and performs no permission check. `packages/docs-check` holds the agent-scope claims
 * against `apps/api`'s own `requiredScope`, so a server-side change that moves a route to another
 * scope fails CI here rather than leaving the reference wrong.
 */
import type { Access, CommandSpec, FlagSpec, GroupSpec, Role } from "./spec.ts";
import { SESSION_COMMANDS } from "./commands/session.ts";
import { BOARDS_COMMANDS } from "./commands/boards.ts";
import { CARDS_COMMANDS } from "./commands/cards.ts";
import { COMMENTS_COMMANDS } from "./commands/comments.ts";
import { GATES_COMMANDS } from "./commands/gates.ts";
import { LINKS_COMMANDS } from "./commands/links.ts";
import { LABELS_COMMANDS } from "./commands/labels.ts";
import { PROJECTS_COMMANDS } from "./commands/projects.ts";
import { SCHEDULES_COMMANDS } from "./commands/schedules.ts";
import { WORKSPACE_COMMANDS } from "./commands/workspace.ts";

export type { Access, ArgSpec, CommandSpec, FlagSpec, FlagType, GroupId, GroupSpec, Role, Route, Scope } from "./spec.ts";

export const GROUPS: GroupSpec[] = [
  {
    id: "session",
    title: "Signing in and the binary",
    label: "Session and setup",
    description: "supi login, logout, whoami, help, version and update.",
    intro:
      "Signing in, seeing which identity is in force, and keeping the binary current. `help`, `version`, " +
      "`update` and `logout` never send a credential anywhere.",
  },
  {
    id: "boards",
    title: "Boards and pipelines",
    label: "Boards and stages",
    description: "supi boards, board, templates, create-board, set-stages and set-stage.",
    intro:
      "Reading a board, and shaping its pipeline. Prefer `set-stage` over `set-stages`: it changes one stage " +
      "and leaves the others — and anybody else's concurrent edit to them — alone.",
  },
  {
    id: "cards",
    title: "Cards",
    label: "Cards",
    description: "supi card, create-card, edit-card, card-label, move, archive and log.",
    intro: "Reading one card, queueing new work, editing it, moving it between stages, and reading what an agent did on it.",
  },
  {
    id: "comments",
    title: "Comments on a card",
    label: "Comments",
    description: "supi comment and comments.",
    intro:
      "A card's comment thread: remarks from people, and from the agent working the card. Anyone who may read " +
      "the board may comment; an agent may comment only on the card its live run holds. Nobody edits a comment, " +
      "and only its author can delete one, from the web app. The agent that claims a card is handed the newest " +
      "comments with it, and is told to re-read the thread before it finishes the stage.",
  },
  {
    id: "gates",
    title: "Approval gates",
    label: "Gates",
    description: "supi gates, approve, reject and request-changes.",
    intro:
      "What is waiting on a human, and deciding it. Deciding a gate is the human half of the control pair: " +
      "an agent credential is refused on every decision verb, whatever scopes it carries.",
  },
  {
    id: "links",
    title: "Links between cards",
    label: "Links",
    description: "supi link add, link rm and link list.",
    intro:
      "Edges between cards: `blocks`, `relates`, `parent` and `supersedes`. A same-board `blocks` edge is enforced — the " +
      "blocked card cannot be claimed. An edge to a card on another board is advisory: shown, never enforced.",
  },
  {
    id: "labels",
    title: "Labels",
    label: "Labels",
    description: "supi label list, label add and label rm.",
    intro: "The workspace's label catalogue — the one a card's labels are resolved against.",
  },
  {
    id: "projects",
    title: "Projects and milestones",
    label: "Projects and milestones",
    description: "supi project list, add, show and rm; supi milestone add and rm.",
    intro: "A project groups cards across boards; a milestone is an ordered step inside one project.",
  },
  {
    id: "schedules",
    title: "Recurring cards",
    label: "Schedules",
    description: "supi schedule list, add, rm, pause and resume.",
    intro:
      "A schedule creates a card on a cadence. Schedules are checked every five minutes, so a card may appear " +
      "up to five minutes after its stated time.",
  },
  {
    id: "workspace",
    title: "Workspace, agents and capabilities",
    label: "Workspace and agents",
    description: "supi forge, agents, agent create, agent mint-token, agent queueing, capabilities, capability define and implications.",
    intro:
      "The two sides of routing — what a stage asks for and what an agent declares — and the workspace settings " +
      "beside them. Routing is exact string equality between a stage's `owner` and an agent's effective " +
      "capability set, so when a card will not move these are the whole diagnosis. Defining a capability, " +
      "creating an agent and minting its tokens are a person's acts: an agent credential is refused on all " +
      "three, whatever it holds.",
  },
];

/** Every command, group by group: each group's entries live beside the code that runs them. */
export const COMMANDS: CommandSpec[] = [
  ...SESSION_COMMANDS,
  ...BOARDS_COMMANDS,
  ...CARDS_COMMANDS,
  ...COMMENTS_COMMANDS,
  ...GATES_COMMANDS,
  ...LINKS_COMMANDS,
  ...LABELS_COMMANDS,
  ...PROJECTS_COMMANDS,
  ...SCHEDULES_COMMANDS,
  ...WORKSPACE_COMMANDS,
];

/** Flags every command accepts. */
export const GLOBAL_FLAGS: FlagSpec[] = [
  {
    name: "--json",
    type: "boolean",
    default: "off: readable output where a renderer exists",
    description:
      "machine-stable JSON, on any command. A response with no readable renderer prints JSON either way",
  },
  {
    name: "--help",
    type: "boolean",
    default: "off",
    description: "print this command's help instead of running it",
  },
];

export interface EnvSpec {
  name: string;
  description: string;
  /** Read by the release installer, not by `supi`. */
  installer?: boolean;
}

/** Every environment variable `supi` or its installer reads. `reference.test.ts` holds this to the source. */
export const ENV_VARS: EnvSpec[] = [
  {
    name: "SUPERPIPELINE_AGENT_TOKEN_FILE",
    description:
      "a FILE holding an agent credential, re-read on every run. Outranks every other credential. Named but missing " +
      "or empty is a refusal, never a fall-back to somebody else's credential",
  },
  {
    name: "SUPERPIPELINE_AGENT_TOKEN",
    description:
      "an agent credential: an `spa_…` token, or an agent JWT. A person's token here is refused by its kind",
  },
  {
    name: "SUPERPIPELINE_TOKEN",
    description:
      "a person's token, used as supplied: never renewed, never replaced. An `spa_` token here is refused — it " +
      "belongs in `SUPERPIPELINE_AGENT_TOKEN`",
  },
  {
    name: "AGENTPOD_TOKEN",
    description:
      "a person's AgentPod hub token, used as supplied. Only a server still verifying hub tokens accepts it; " +
      "app.superpipeline.dev refuses it, so do not export it into a shell that runs `supi` — it outranks " +
      "`supi login` and every command would answer 401",
  },
  {
    name: "SUPERPIPELINE_URL",
    description:
      "the SuperPipeline server to talk to. Default `https://app.superpipeline.dev`. It changes where commands go " +
      "and which audience a token is requested for, never where a device credential is sent",
  },
  {
    name: "XDG_CONFIG_HOME",
    description: "Linux: the config directory credentials live under (default `~/.config`)",
  },
  { name: "APPDATA", description: "Windows: the config directory credentials live under" },
  { name: "BIN_DIR", description: "where the installer puts `supi` and `superpipeline` (default `~/.local/bin`)", installer: true },
  { name: "VERSION", description: "a release tag for the installer to pin, instead of the latest", installer: true },
  { name: "SKILL_DIR", description: "where the installer also places the agent skill (by running `supi skill install --dir`); unset, no skill is installed", installer: true },
];

export const ROLE_TEXT: Record<Role, string> = {
  viewer: "`viewer` or above",
  member: "`member` or above",
  admin: "`admin` or above",
  owner: "`owner`",
};

export function commandName(c: CommandSpec): string {
  return `supi ${c.path.join(" ")}`;
}

function flagSynopsis(f: FlagSpec): string {
  const body = f.value ? `${f.name} ${f.value}` : f.name;
  const shown = f.repeatable ? `${body}...` : body;
  return f.required ? shown : `[${shown}]`;
}

export function synopsis(c: CommandSpec): string {
  if (c.synopsis) return c.synopsis;
  const args = c.args.map((a) => (a.optional ? `[<${a.name}>]` : `<${a.name}>`));
  return [commandName(c), ...args, ...c.flags.map(flagSynopsis)].join(" ");
}

/** The commands a verb names: one for `board`, several for `link`. */
export function findCommands(words: string[]): CommandSpec[] {
  const [verb, sub] = words;
  const byVerb = COMMANDS.filter((c) => c.path[0] === verb);
  if (sub) {
    const exact = byVerb.filter((c) => c.path[1] === sub);
    if (exact.length > 0) return exact;
  }
  return byVerb;
}

/** Wrap `text` to `width`, every line after the first indented by `indent`. */
function wrap(text: string, width: number, indent: string): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter((w) => w !== "")) {
    if (line !== "" && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  if (line !== "") out.push(line);
  return out.map((l, i) => (i === 0 ? l : indent + l));
}

/** A synopsis broken between its words and bracketed options, never inside a `[...]`. */
function wrapSynopsis(syn: string, width: number, indent: string): string[] {
  const out: string[] = [];
  let line = "";
  for (const token of syn.match(/\[[^\]]*\]|\S+/g) ?? []) {
    if (line !== "" && line.length + 1 + token.length > width) {
      out.push(line);
      line = indent + token;
    } else {
      line = line === "" ? token : `${line} ${token}`;
    }
  }
  if (line !== "") out.push(line);
  return out;
}

/** Backticks are for the docs; a terminal shows them as noise. */
const plain = (s: string) => s.replace(/`/g, "");

/** The summary `supi help` prints. */
export function renderUsage(): string {
  const lines: string[] = ["supi — SuperPipeline from a terminal (`superpipeline` is the same command)", ""];
  for (const g of GROUPS) {
    lines.push(`${g.title}:`);
    for (const c of COMMANDS.filter((x) => x.group === g.id)) {
      const syn = synopsis(c);
      if (syn.length <= 34) {
        lines.push(`  ${syn.padEnd(34)} ${plain(c.summary)}`);
      } else {
        for (const l of wrapSynopsis(syn, 94, "      ")) lines.push(`  ${l}`);
        lines.push(`  ${"".padEnd(34)} ${plain(c.summary)}`);
      }
    }
    lines.push("");
  }
  lines.push(
    "  --json                             machine-stable output, on any command",
    "  supi help <verb> [<sub-verb>]      one command in full (or: supi <verb> --help)",
    "",
    "Credential, first found wins: $SUPERPIPELINE_AGENT_TOKEN_FILE, $SUPERPIPELINE_AGENT_TOKEN,",
    "$SUPERPIPELINE_TOKEN, $AGENTPOD_TOKEN, `supi login`'s cached token, `supi login`'s device",
    "credential (exchanged at the sign-in service), then `fleet login`'s token and device.",
    "An agent acts with $SUPERPIPELINE_AGENT_TOKEN_FILE (a file, re-read every run) or",
    "$SUPERPIPELINE_AGENT_TOKEN, either outranking every person's credential. An spa_ token reads",
    "and plans; only an agent JWT (a station token) carries the dispatch grant that queues work and",
    "moves cards, and it lives minutes — so point the FILE at something that keeps it fresh.",
    "",
    "What you may do is your role in the workspace, which the server decides — not this command.",
    "A refusal comes back as a 403 and is printed as it arrives. Exit status: 0 on success, 1 otherwise.",
    "Reference: https://docs.superpipeline.dev/reference/cli/",
  );
  return lines.join("\n");
}

function accessLines(a: Access): string[] {
  if (a.role === null && a.agent === null) return [a.note ?? "Local: sends no credential to SuperPipeline."];
  const out: string[] = [];
  if (a.role) out.push(`a person: ${ROLE_TEXT[a.role]} in the workspace`);
  if (a.agent === "any") out.push("an agent token: any, no scope needed");
  else if (a.agent === "refused") out.push("an agent token: refused");
  else if (a.agent) out.push(`an agent token: the \`${a.agent}\` scope`);
  if (a.note) out.push(a.note);
  return out;
}

/** `supi help <verb>`: one command in full. */
export function renderCommandHelp(c: CommandSpec): string {
  const lines: string[] = [...wrapSynopsis(plain(synopsis(c)), 96, "    "), ""];
  for (const para of c.description.split("\n\n")) lines.push(...wrap(plain(para), 96, ""), "");
  if (c.args.length > 0) {
    lines.push("Arguments:");
    for (const a of c.args) lines.push(`  <${a.name}>`.padEnd(24) + wrap(plain(a.description), 72, "".padEnd(24)).join("\n"));
    lines.push("");
  }
  if (c.flags.length > 0) {
    lines.push("Flags:");
    for (const f of c.flags) {
      const head = `  ${f.value ? `${f.name} ${f.value}` : f.name}`;
      const detail = [
        plain(f.description),
        f.required ? "Required." : f.default ? `Default: ${plain(f.default)}.` : "",
        f.repeatable ? "Repeatable." : "",
      ]
        .filter((s) => s !== "")
        .join(". ")
        .replace(/\.\./g, ".");
      if (head.length < 30) lines.push(head.padEnd(30) + wrap(detail, 66, "".padEnd(30)).join("\n"));
      else lines.push(head, "".padEnd(30) + wrap(detail, 66, "".padEnd(30)).join("\n"));
    }
    lines.push("");
  }
  lines.push("Who may run it:");
  for (const l of accessLines(c.access)) lines.push(...wrap(plain(l), 94, "    ").map((x, i) => (i === 0 ? `  ${x}` : x)));
  lines.push("");
  if (c.routes.length > 0) {
    lines.push("Calls:");
    for (const r of c.routes) lines.push(`  ${r.method} ${r.path}`);
    lines.push("");
  }
  lines.push("Examples:");
  for (const e of c.examples) lines.push(`  ${e}`);
  return lines.join("\n");
}
