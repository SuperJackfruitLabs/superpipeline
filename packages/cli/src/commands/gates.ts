/**
 * Approval gates: what waits, and deciding it.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { renderGates } from "../render.ts";
import { flag } from "../args.ts";
import { api, fail, out, type Args } from "../runtime.ts";
import { BOARD, GATE, COMMENT, type CommandSpec } from "../spec.ts";

/** The `gates` group's entries in the command table, in the order `supi help` lists them. */
export const GATES_COMMANDS: CommandSpec[] = [
  {
    path: ["gates"],
    group: "gates",
    args: [BOARD],
    flags: [],
    summary: "approval gates waiting on a human",
    description: "Every gate on the board that is open and waiting for a decision, with the card it holds. A gate on an archived card is never listed: archiving cancels it.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/gates/pending" }],
    access: { role: "viewer", agent: "any" },
    output: "one gate per line; `--json` for the server's response",
    fails: ["`<boardId>` is missing"],
    examples: ["supi gates brd_8f2c…"],
  },
  {
    path: ["approve"],
    group: "gates",
    args: [BOARD, GATE],
    flags: [COMMENT],
    summary: "approve a gate: the card moves on",
    description: "Approves the gate. The card advances to the next stage; if that stage is gated too, a new gate opens on the same run.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/gates/:gateId/resolve" }],
    access: { role: "member", agent: "refused" },
    output: "JSON: the resolved gate",
    fails: ["`<boardId>` or `<gateId>` is missing"],
    examples: ['supi approve brd_8f2c… gat_19c0… --comment "checked the diff"'],
  },
  {
    path: ["reject"],
    group: "gates",
    args: [BOARD, GATE],
    flags: [COMMENT],
    summary: "reject a gate",
    description: "Rejects the gate. The card stops in the `rejected` state where it stands — refused, not returned for rework. Use `request-changes` to send it back.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/gates/:gateId/resolve" }],
    access: { role: "member", agent: "refused" },
    output: "JSON: the resolved gate",
    fails: ["`<boardId>` or `<gateId>` is missing"],
    examples: ['supi reject brd_8f2c… gat_19c0… --comment "out of scope"'],
  },
  {
    path: ["request-changes"],
    group: "gates",
    args: [BOARD, GATE],
    flags: [{ ...COMMENT, value: '"what to change"', required: true, default: undefined, description: "what to change. It becomes the rework instruction the next run reads" }],
    summary: "send the card back for rework, saying what to change",
    description:
      "Returns the card to the stage the gate names for rework, where it is claimable again. The comment is required: it is merged into the handoff the next run reads, so a " +
      "request with nothing said would re-queue the work with no instruction.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/gates/:gateId/resolve" }],
    access: { role: "member", agent: "refused" },
    output: "JSON: the resolved gate",
    fails: ["`<boardId>` or `<gateId>` is missing", "`--comment` is missing (`request-changes needs a reason.`)"],
    examples: ['supi request-changes brd_8f2c… gat_19c0… --comment "add a test for the expired-token path"'],
  },
];

export async function runGates({ pos }: Args): Promise<void> {
  if (!pos[0]) fail("usage: supi gates <boardId>");
  out(await api(`/v1/boards/${pos[0]}/gates/pending`), renderGates);
}

/**
 * Deciding a gate, from the place the work is already being watched.
 *
 * `gates` could list what was waiting and nothing could answer it: the resolve route existed
 * with no verb in front of it, so a human at a terminal had to open the web app or a phone to
 * say yes to work they were already looking at.
 *
 * Three verbs rather than `supi gate <id> <decision>` because the decision is the point of the
 * command and belongs where it can be read: `supi reject` mistyped is a usage error, while
 * `supi gate … reject` mistyped is a different decision.
 */
export async function runDecideGate({ cmd, rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail(`usage: supi ${cmd} <boardId> <gateId> [--comment "why"]`);
  const comment = flag(rest, "--comment") ?? undefined;
  // `request_changes` returns the card for rework, and the feedback IS the rework instruction —
  // superpipeline merges it into the handoff the next run reads. Sending one without a comment
  // re-queues the work with nothing said about what was wrong.
  if (cmd === "request-changes" && !comment) {
    fail("request-changes needs a reason.", '  supi request-changes <boardId> <gateId> --comment "what to change"');
  }
  const decision = cmd === "request-changes" ? "request_changes" : cmd;
  out(
    await api(`/v1/boards/${pos[0]}/gates/${pos[1]}/resolve`, {
      method: "POST",
      body: JSON.stringify({ decision, ...(comment ? { comment } : {}) }),
    }),
  );
}
