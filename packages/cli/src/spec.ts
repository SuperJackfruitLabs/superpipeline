/**
 * The shape of the command table, and the argument and flag entries several groups share.
 *
 * A leaf: the group modules under `commands/` and `commands.ts` import it; it imports nothing.
 */

export type FlagType = "boolean" | "string" | "integer" | "number" | "date" | "path" | "enum" | "list";

export interface FlagSpec {
  /** Including the leading dashes: `--comment`. */
  name: string;
  /** What the value is called in a synopsis (`<file|->`, `YYYY-MM-DD`). Absent for a boolean. */
  value?: string;
  type: FlagType;
  /** For `enum`. */
  choices?: string[];
  required?: boolean;
  repeatable?: boolean;
  /** What happens when the flag is left out, in words. */
  default?: string;
  description: string;
}

export interface ArgSpec {
  name: string;
  description: string;
  optional?: boolean;
  /** Takes every remaining positional, so a sentence needs no quoting. */
  rest?: boolean;
}

/** A workspace role, lowest first: each includes the ones before it. */
export type Role = "viewer" | "member" | "admin" | "owner";
export type Scope = "read" | "queue" | "plan" | "compose" | "claim" | "run";

export interface Access {
  /** The lowest workspace role that may do this, or `null` for a command that never reaches the server. */
  role: Role | null;
  /**
   * What an AGENT credential (`SUPERPIPELINE_AGENT_TOKEN[_FILE]`) needs:
   *   - a scope name: that scope, on an `spa_` token or an agent JWT,
   *   - `"any"`: any agent token, no scope checked,
   *   - `"refused"`: an agent may never do this, whatever it holds,
   *   - `null`: the command is local and sends nothing.
   */
  agent: Scope | "any" | "refused" | null;
  /** Anything the role and scope do not say. */
  note?: string;
}

export interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** With `:name` placeholders, as the server routes it. */
  path: string;
}

export interface CommandSpec {
  /** `["link", "add"]` for `supi link add`. */
  path: string[];
  group: GroupId;
  args: ArgSpec[];
  flags: FlagSpec[];
  /** One line, for the USAGE block. */
  summary: string;
  /** Paragraphs, for `supi help <verb>` and the reference. */
  description: string;
  /** The HTTP calls this makes, in order. Empty for a local command. */
  routes: Route[];
  access: Access;
  /** What it prints on success. */
  output: string;
  /** Each condition that makes it exit 1, beyond the ones every networked command shares. */
  fails: string[];
  examples: string[];
  /** Spelled differently in the synopsis than `args` + `flags` would render it. */
  synopsis?: string;
}

export type GroupId = "session" | "boards" | "cards" | "comments" | "gates" | "links" | "labels" | "projects" | "schedules" | "workspace";

export interface GroupSpec {
  id: GroupId;
  title: string;
  /** Sidebar label and page heading. */
  label: string;
  description: string;
  intro: string;
}

export const BOARD: ArgSpec = { name: "boardId", description: "the board, as `brd_…` (see `supi boards`)" };
export const CARD: ArgSpec = { name: "cardId", description: "the card, as `crd_…` (see `supi board <boardId>`)" };
export const GATE: ArgSpec = { name: "gateId", description: "the gate (see `supi gates <boardId>`)" };
export const SCHEDULE: ArgSpec = { name: "scheduleId", description: "the schedule (see `supi schedule list <boardId>`)" };

export const COMMENT: FlagSpec = {
  name: "--comment",
  value: '"why"',
  type: "string",
  default: "no comment",
  description: "recorded with the decision and shown to whoever reads the card",
};

export const LINK_KIND: FlagSpec = {
  name: "--kind",
  value: "blocks|relates|parent|supersedes",
  type: "enum",
  choices: ["blocks", "relates", "parent", "supersedes"],
  required: true,
  description:
    "`blocks`: the from-card blocks the to-card (enforced on the same board); `relates`: an informational " +
    "edge; `parent`: the from-card contains the to-card as a sub-task; `supersedes`: the from-card is the newer " +
    "card and replaces the to-card (same board only)",
};

export const TO_BOARD: FlagSpec = {
  name: "--to-board",
  value: "<boardId>",
  type: "string",
  default: "the same board as `<boardId>`",
  description:
    "the board the to-card is on. Naming another board makes the edge advisory — stored and shown, never " +
    "enforced — and `link add` prints a notice saying so before it sends anything",
};

export const DATE_FORMAT = "must be a date in `YYYY-MM-DD` form (checked before anything is sent)";
