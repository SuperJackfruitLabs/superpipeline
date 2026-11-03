/**
 * Approval gates: what waits, deciding it, and changing delivery of an approved frozen subject.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { renderGates } from "../render.ts";
import { flag, isPlainObject } from "../args.ts";
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
    flags: [
      COMMENT,
      {
        name: "--delivery",
        value: "manual|automatic",
        type: "enum",
        choices: ["manual", "automatic"],
        default: "plain approval for a generic gate",
        description: "for an immutable publishing approval, bind the frozen digest to manual or automatic delivery",
      },
    ],
    summary: "approve a gate, choosing delivery for a frozen post",
    description: "Approves a generic gate. For an immutable publishing approval, `--delivery manual|automatic` reads the gate and binds that exact frozen subject and digest to the chosen delivery mode.",
    routes: [
      { method: "GET", path: "/v1/boards/:boardId/gates/:gateId" },
      { method: "POST", path: "/v1/boards/:boardId/gates/:gateId/resolve" },
    ],
    access: { role: "member", agent: "refused" },
    output: "JSON: the resolved gate",
    fails: ["`<boardId>` or `<gateId>` is missing", "`--delivery` is not manual or automatic", "the gate has no immutable approval subject"],
    examples: [
      'supi approve brd_8f2c… gat_19c0… --comment "checked the diff"',
      'supi approve brd_8f2c… gat_19c0… --delivery manual --comment "I will post it"',
    ],
  },
  {
    path: ["delivery"],
    group: "gates",
    args: [BOARD, GATE],
    flags: [
      { name: "--mode", value: "manual|automatic", type: "enum", choices: ["manual", "automatic"], description: "switch delivery mode without changing the approved digest" },
      { name: "--live-url", value: "https://…", type: "string", description: "record the URL of a manually published post" },
      { name: "--remind-at", value: "ISO timestamp", type: "string", description: "if no live URL exists then, remind the person and offer automatic delivery" },
    ],
    summary: "update delivery of an approved frozen post",
    description: "Changes only delivery mechanics for an already approved immutable subject. Give exactly one of `--mode`, `--live-url`, or `--remind-at`; switching modes does not require a fresh approval because the digest stays unchanged.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/gates/:gateId/delivery" }],
    access: { role: "member", agent: "refused" },
    output: "JSON: the card and its updated delivery state",
    fails: ["`<boardId>` or `<gateId>` is missing", "not exactly one delivery update is given", "`--remind-at` is not a timestamp"],
    examples: [
      "supi delivery brd_8f2c… gat_19c0… --remind-at 2029-01-02T03:04:05Z",
      "supi delivery brd_8f2c… gat_19c0… --mode automatic",
    ],
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

/** Decide a reject or request-changes gate from the terminal. */
export async function runDecideGate({ cmd, rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail(`usage: supi ${cmd} <boardId> <gateId> [--comment "why"]`);
  const comment = flag(rest, "--comment") ?? undefined;
  if (cmd === "request-changes" && !comment) {
    fail("request-changes needs a reason.", '  supi request-changes <boardId> <gateId> --comment "what to change"');
  }
  out(
    await api(`/v1/boards/${pos[0]}/gates/${pos[1]}/resolve`, {
      method: "POST",
      body: JSON.stringify({ decision: cmd === "request-changes" ? "request_changes" : cmd, ...(comment ? { comment } : {}) }),
    }),
  );
}

/** Approve a generic gate, or bind a frozen subject to a human-selected delivery mode. */
export async function runApproveGate({ rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail('usage: supi approve <boardId> <gateId> [--comment "why"] [--delivery manual|automatic]');
  const comment = flag(rest, "--comment") ?? undefined;
  const delivery = flag(rest, "--delivery") ?? undefined;
  if (delivery !== undefined && delivery !== "manual" && delivery !== "automatic") {
    fail("--delivery must be manual or automatic.");
  }
  let decision = "approve";
  let approvalSubject: { id: string; digest: string } | undefined;
  if (delivery) {
    const read = await api(`/v1/boards/${pos[0]}/gates/${pos[1]}`);
    const gate = isPlainObject(read) && isPlainObject(read.gate) ? read.gate : null;
    const subject = gate && isPlainObject(gate.approvalSubject) ? gate.approvalSubject : null;
    if (!subject || typeof subject.id !== "string" || typeof subject.digest !== "string") {
      fail("That gate has no immutable approval subject to bind to delivery.");
    }
    approvalSubject = { id: subject.id, digest: subject.digest };
    decision = delivery === "manual" ? "approve_manual" : "approve_automatic";
  }
  out(
    await api(`/v1/boards/${pos[0]}/gates/${pos[1]}/resolve`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        ...(comment ? { comment } : {}),
        ...(approvalSubject
          ? { approvalSubjectId: approvalSubject.id, approvalSubjectDigest: approvalSubject.digest }
          : {}),
      }),
    }),
  );
}

/** Update only the delivery mechanics of an already approved immutable subject. */
export async function runDelivery({ rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi delivery <boardId> <gateId> (--mode manual|automatic | --live-url https://… | --remind-at <ISO timestamp>)");
  const mode = flag(rest, "--mode") ?? undefined;
  const liveUrl = flag(rest, "--live-url") ?? undefined;
  const remindAt = flag(rest, "--remind-at") ?? undefined;
  if (mode !== undefined && mode !== "manual" && mode !== "automatic") fail("--mode must be manual or automatic.");
  if ([mode, liveUrl, remindAt].filter((value) => value !== undefined).length !== 1) {
    fail("delivery needs exactly one of --mode, --live-url, or --remind-at.");
  }
  if (remindAt !== undefined && !Number.isFinite(Date.parse(remindAt))) fail("--remind-at must be an ISO timestamp.");
  out(
    await api(`/v1/boards/${pos[0]}/gates/${pos[1]}/delivery`, {
      method: "POST",
      body: JSON.stringify({
        ...(mode !== undefined ? { mode } : {}),
        ...(liveUrl !== undefined ? { liveUrl } : {}),
        ...(remindAt !== undefined ? { remindAt: new Date(remindAt).toISOString() } : {}),
      }),
    }),
  );
}
