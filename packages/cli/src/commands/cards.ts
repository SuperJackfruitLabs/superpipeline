/**
 * Cards: reading, creating, editing, moving, resuming, archiving, the stale list and the log.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { readFileSync } from "node:fs";
import { renderLog, renderStale } from "../render.ts";
import { flag, flags, isPlainObject, mergeSpec } from "../args.ts";
import { DUE_AT_RE, api, fail, out, readJson, type Args } from "../runtime.ts";
import { BOARD, CARD, DATE_FORMAT, type CommandSpec } from "../spec.ts";

/** The `cards` group's entries in the command table, in the order `supi help` lists them. */
export const CARDS_COMMANDS: CommandSpec[] = [
  {
    path: ["card"],
    group: "cards",
    args: [BOARD, CARD],
    flags: [],
    summary: "one card in full",
    description: "One card: its fields, stage, labels, references and state.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/cards/:cardId" }],
    access: { role: "viewer", agent: "read" },
    output: "JSON: the card",
    fails: ["`<boardId>` or `<cardId>` is missing"],
    examples: ["supi card brd_8f2c… crd_41aa…"],
  },
  {
    path: ["create-card"],
    group: "cards",
    args: [BOARD, { name: "title", description: "the card's title; every remaining word is part of it, so it needs no quoting", rest: true }],
    flags: [
      {
        name: "--spec",
        value: "<file|->",
        type: "path",
        default: "no spec",
        description: "the card's structured spec, as JSON from a file or stdin",
      },
      { name: "--priority", value: "<n>", type: "number", default: "`0`", description: "the card's priority" },
      { name: "--due", value: "YYYY-MM-DD", type: "date", default: "no due date", description: `the due date; ${DATE_FORMAT}` },
      {
        name: "--label",
        value: "<id>",
        type: "string",
        repeatable: true,
        default: "no labels",
        description: "a label id from `supi label list`; repeat for more than one. Applied by a second request after the card exists",
      },
      {
        name: "--stage",
        value: "<stageKey>",
        type: "string",
        default: "the board's first stage",
        description: "the stage the card starts in, by key (see `supi board`), e.g. a lane that does not begin at the first stage",
      },
      {
        name: "--project",
        value: "<projectId>",
        type: "string",
        default: "no project",
        description: "the project the card belongs to, as prj_… (see `supi project list`); a stage that freezes an approval subject needs one",
      },
    ],
    summary: "queue a card, with this token as its grant",
    description:
      "Creates a card in the board's first stage, or the one `--stage` names. The card records the credential that queued it as its grant — " +
      "who asked for the work and on whose authority. An agent's card is also bounded by the queueing policy " +
      "`supi agent queueing` sets: which boards may receive it, whose work it is, and how many cards an hour.",
    routes: [
      { method: "POST", path: "/v1/boards/:boardId/cards" },
      { method: "PATCH", path: "/v1/boards/:boardId/cards/:cardId" },
    ],
    access: {
      role: "member",
      agent: "queue",
      note: "The PATCH that applies `--label` also needs `plan` on an agent token. An agent's card is bounded by its queueing policy and dispatch grant.",
    },
    output: "JSON: the created card (or, with `--label`, the card after its labels are applied)",
    fails: [
      "`<boardId>` or `<title>` is missing",
      "`--spec` cannot be read or is not JSON",
      "`--due` is not `YYYY-MM-DD`",
      "`--stage` names no stage on the board, or `--project` no project in the workspace (refused by the server)",
    ],
    examples: [
      "supi create-card brd_8f2c… Write the release notes for 0.0.9",
      "supi create-card brd_8f2c… Audit the token routes --spec spec.json --priority 2 --due 2026-11-01 --label lbl_sec",
      "supi create-card brd_8f2c… X post: the 0.0.9 release --stage x-post --project prj_34b4… --spec post.json",
    ],
  },
  {
    path: ["edit-card"],
    group: "cards",
    args: [BOARD, CARD],
    flags: [
      { name: "--title", value: "<text>", type: "string", default: "unchanged", description: "the card's new title (quote it if it has spaces)" },
      {
        name: "--spec",
        value: "<file|->",
        type: "path",
        default: "unchanged",
        description: "a new spec, as JSON from a file or stdin. It REPLACES the spec whole — every key not in it is gone",
      },
      {
        name: "--merge-spec",
        value: "<file|->",
        type: "path",
        default: "unchanged",
        description:
          "a JSON object whose top-level keys are merged into the existing spec: a key given replaces that key (a nested " +
          "object is replaced, not merged into), a key set to `null` is removed, every other key is kept. Cannot be combined with `--spec`",
      },
      { name: "--priority", value: "<n>", type: "number", default: "unchanged", description: "the card's new priority" },
      {
        name: "--due",
        value: "YYYY-MM-DD|none",
        type: "string",
        default: "unchanged",
        description: `the new due date, or \`none\` to clear it; a date ${DATE_FORMAT}`,
      },
    ],
    summary: "change a card's title, spec, priority or due date",
    description:
      "Edits a card through the same `PATCH` the web app's card drawer sends, with the same authority. Only the fields " +
      "named change. Labels, owner and archiving have their own verbs and routes.\n\n" +
      "`--merge-spec` is a read-modify-write: it reads the card, merges into the spec it read, and writes back with " +
      "`expectedUpdatedAt` set to the card's `updatedAt` as read. If anything changed the card in between — an edit in " +
      "the drawer, a claim, a move — the server answers 409 and nothing is written; run the command again to merge into " +
      "the card as it now is. `--spec` replaces the spec outright and sends no precondition.",
    // The PATCH is listed first because it is the call every invocation makes; `--merge-spec`
    // alone reads the card BEFORE it, as the access note says.
    routes: [
      { method: "PATCH", path: "/v1/boards/:boardId/cards/:cardId" },
      { method: "GET", path: "/v1/boards/:boardId/cards/:cardId" },
    ],
    access: {
      role: "member",
      agent: "plan",
      note: "With `--merge-spec` the card is read (the GET) before the PATCH, which needs `read` as well on an agent token.",
    },
    output: "JSON: the card after the edit",
    fails: [
      "`<boardId>` or `<cardId>` is missing",
      "no field to change was given",
      "both `--spec` and `--merge-spec` were given",
      "`--spec` or `--merge-spec` cannot be read or is not JSON; `--merge-spec` is not a JSON object",
      "`--merge-spec` on a card whose spec is not a JSON object",
      "`--priority` is not a number; `--due` is neither `YYYY-MM-DD` nor `none`",
      "the card changed between the read and the write (`--merge-spec`; the server's 409)",
    ],
    examples: [
      'supi edit-card brd_8f2c… crd_41aa… --title "Write the 0.0.9 release notes" --priority 2',
      "supi edit-card brd_8f2c… crd_41aa… --merge-spec acceptance.json",
      "echo '{\"notes\": null}' | supi edit-card brd_8f2c… crd_41aa… --merge-spec -",
      "supi edit-card brd_8f2c… crd_41aa… --due none",
    ],
  },
  {
    path: ["move"],
    group: "cards",
    args: [BOARD, CARD, { name: "stageKey", description: "the stage to move it to" }],
    flags: [],
    summary: "move a card to another stage",
    description:
      "Moves a card to another stage. Moving a card into a stage an agent works is a dispatch, so the mover is " +
      "recorded as the one who queued it — and an agent mover passes the same queueing checks a create does. " +
      "An agent never gets a card past a gate: a move that would end a pending review or running checks, leave or skip " +
      "a stage with a review or checks, or finish the card in a last stage nobody works is refused, and a person resolves the gate.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/cards/:cardId/move" }],
    access: { role: "member", agent: "plan", note: "An agent moving a card into an agent-owned stage also needs a dispatch grant and a queueing policy that permits it." },
    output: "JSON: the moved card",
    fails: [
      "`<boardId>`, `<cardId>` or `<stageKey>` is missing",
      "an agent token and the move would get the card past a gate or finish it (409 `GATE_PENDING`, naming the stage)",
    ],
    examples: ["supi move brd_8f2c… crd_41aa… review"],
  },
  {
    path: ["resume"],
    group: "cards",
    args: [BOARD, CARD],
    flags: [
      {
        name: "--comment",
        value: "<text>",
        type: "string",
        required: true,
        description: "what changed, or what to do differently. Kept on the card's comment thread and handed to the next agent as `feedback`",
      },
      {
        name: "--stage",
        value: "<key>",
        type: "string",
        default: "the card's current stage",
        description: "send it back to this earlier stage instead",
      },
    ],
    summary: "send a card that is waiting on a person back to work, with a comment",
    description:
      "Resumes a card in `input-required` — blocked by its agent, refused twice at its stage's completion check, " +
      "stopped by the circuit breaker, or refused dispatch. The card returns to its stage (or `--stage`, an earlier " +
      "one) as `submitted`, its \"needs a person\" reason is cleared, and the stage starts over: the failure count is " +
      "reset and the automatic rework is owed again. Agents that can claim the stage are told it is available.\n\n" +
      "The comment is stored twice: on the card's thread, and as `feedback` in the handoff the next claim carries — " +
      "the same place a reviewer's `request-changes` comment goes. Resuming re-queues the card, so you become its " +
      "queuer, as on a move.\n\n" +
      "Not for an open question (answer it on the card) or a pending review (use `approve` or `request-changes`): " +
      "both are refused with a pointer to the right action. To send a card forward, use `move`.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/cards/:cardId/resume" }],
    access: {
      role: "member",
      agent: "refused",
      note: "Resuming is the human half of a block: an agent token is refused (403) whatever its scopes.",
    },
    output: "JSON: the card and the comment",
    fails: [
      "`<boardId>`, `<cardId>` or `--comment` is missing",
      "the card is not waiting on a person (the server's 409)",
      "the card has an open question or a pending review (409, naming what to do instead)",
      "`--stage` is after the card's stage, or unknown (400)",
    ],
    examples: [
      'supi resume brd_8f2c… crd_41aa… --comment "Staging is back up; run the migration again."',
      'supi resume brd_8f2c… crd_41aa… --stage plan --comment "Re-plan this without the staging database."',
    ],
  },
  {
    path: ["stale"],
    group: "cards",
    args: [],
    flags: [
      {
        name: "--hours",
        value: "<n>",
        type: "number",
        default: "each board's own threshold (24 unless set with `set-stale`)",
        description: "list cards stuck at least this long, on every board, whatever its switch says; `0` lists everything waiting now",
      },
    ],
    summary: "cards stuck waiting, across every board in the workspace",
    description:
      "Lists the cards that are waiting and will go on waiting unless somebody acts: cards in `input-required` " +
      "(with the reason the card gives — blocked, repeated failure, a question, a review, refused dispatch), and " +
      "cards sitting in a stage nothing claims — no agent owns it, it has no approval gate, and it is not the last " +
      "stage. For each: the board, the card, its stage, why it is stuck, how long it has been there, and what to do next.\n\n" +
      "Age is counted from when the card last changed state or stage. Without `--hours` each board's own threshold " +
      "applies and a board that switched stale cards off is left out.",
    routes: [{ method: "GET", path: "/v1/stale" }],
    access: { role: "viewer", agent: "read" },
    output: "the stuck cards, grouped by board; `--json` for the server's response",
    fails: ["`--hours` is not a number of hours, 0 or more"],
    examples: ["supi stale", "supi stale --hours 0 --json"],
  },
  {
    path: ["archive"],
    group: "cards",
    args: [BOARD, CARD],
    flags: [],
    summary: "archive a card, so the \"show archived\" filter has something to show",
    description: "Archives a card now. It leaves the board's lanes and appears under the web app's \"show archived\" filter.\n\nArchiving also ends whatever the card was waiting on a person for, the same way moving it does: its pending approval gates and pending questions are cancelled (so they leave Needs you and `supi gates`), and an active approval subject is invalidated. A cancelled gate stays cancelled. Restoring the card does not reopen it: a card that was waiting is restored parked as `blocked`, saying its review was cancelled when it was archived. Resume it to an earlier stage (`supi resume`) or move it to put it back to work.",
    routes: [{ method: "PATCH", path: "/v1/boards/:boardId/cards/:cardId" }],
    access: { role: "member", agent: "plan" },
    output: "JSON: the archived card",
    fails: ["`<boardId>` or `<cardId>` is missing"],
    examples: ["supi archive brd_8f2c… crd_41aa…"],
  },
  {
    path: ["log"],
    group: "cards",
    args: [BOARD, CARD],
    flags: [],
    summary: "what an agent did on a card, and its handoff",
    description: "The card's activity transcript — what each agent posted, in order — its handoff, and its gates.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/cards/:cardId/activities" }],
    access: { role: "viewer", agent: "read" },
    output: "the transcript, readable; `--json` for the server's response",
    fails: ["`<boardId>` or `<cardId>` is missing"],
    examples: ["supi log brd_8f2c… crd_41aa…"],
  },
];

export async function runCard({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi card <boardId> <cardId>");
  out(await api(`/v1/boards/${pos[0]}/cards/${pos[1]}`));
}

export async function runMove({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1] || !pos[2]) fail("usage: supi move <boardId> <cardId> <stageKey>");
  out(
    await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/move`, {
      method: "POST",
      body: JSON.stringify({ toStageKey: pos[2] }),
    }),
  );
}

/**
 * Resume a card that is waiting on a person: back to its stage, or `--stage` an earlier one.
 *
 * The comment is required because it is the whole point — the server keeps it on the card's
 * thread and hands it to the next agent as feedback. A resume with nothing said re-runs the
 * same work into the same wall.
 */
export async function runResume({ rest, pos }: Args): Promise<void> {
  const comment = flag(rest, "--comment");
  const stage = flag(rest, "--stage");
  if (!pos[0] || !pos[1] || !comment) {
    fail('usage: supi resume <boardId> <cardId> --comment "what changed" [--stage <key>]');
  }
  out(
    await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/resume`, {
      method: "POST",
      body: JSON.stringify({ comment, ...(stage ? { toStageKey: stage } : {}) }),
    }),
  );
}

/** Cards waiting past a threshold, across every board in the workspace. */
export async function runStale({ rest }: Args): Promise<void> {
  const hours = flag(rest, "--hours");
  if (hours !== null && !(Number.isFinite(Number(hours)) && Number(hours) >= 0)) {
    fail("--hours takes a number of hours, 0 or more.", "  supi stale --hours 4");
  }
  out(await api(`/v1/stale${hours !== null ? `?hours=${encodeURIComponent(hours)}` : ""}`), renderStale);
}

/**
 * What an agent actually did on a card.
 *
 * `GET /cards/:cardId/activities` has always returned the transcript, the handoff and the
 * card's gates, and nothing put it in reach: reading one meant a hand-built curl with a token
 * lifted out of the credential file.
 */
export async function runLog({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi log <boardId> <cardId>");
  out(await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/activities`), renderLog);
}

/**
 * Archive a card. Phase 1 shipped the `archivedAt` column and the "show archived" filter with
 * no way to ever produce an archived card — a filter for a state nothing could reach. This,
 * and the drawer's own Archive action (Task 17b), are that write. Both send `archivedAt`
 * through the same `PATCH /cards/:cardId` the rest of this file already uses, so there is one
 * server-side rule (`isInvalidDueAt`'s sibling check, `index.ts` ~1345) rather than two.
 */
export async function runArchive({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi archive <boardId> <cardId>");
  out(
    await api(`/v1/boards/${pos[0]}/cards/${pos[1]}`, {
      method: "PATCH",
      body: JSON.stringify({ archivedAt: new Date().toISOString() }),
    }),
  );
}

export async function runCreateCard({ rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) {
    fail(
      "usage: supi create-card <boardId> <title> [--spec <file|->] [--priority <n>]",
      "  [--due YYYY-MM-DD] [--label <id>]... [--stage <stageKey>] [--project <projectId>]",
    );
  }
  const specArg = flag(rest, "--spec");
  const priorityArg = flag(rest, "--priority");
  const dueArg = flag(rest, "--due");
  // Repeatable — a card can carry more than one label at creation.
  const labelIds = flags(rest, "--label");
  // Both go in the create itself, which already accepts them: a card that must start mid-board
  // (an X post lane) or belong to a project (an approval subject requires one) is born that way.
  // Neither had a flag, so an agent queueing such a card had no way to set them at all.
  const stageArg = flag(rest, "--stage");
  const projectArg = flag(rest, "--project");
  // Every remaining positional is the title, so a sentence needs no quoting.
  const body: Record<string, unknown> = { title: pos.slice(1).join(" ") };
  if (specArg) {
    const raw = specArg === "-" ? readFileSync(0, "utf8") : readFileSync(specArg, "utf8");
    try {
      body.spec = JSON.parse(raw);
    } catch {
      fail(`--spec is not JSON: ${specArg}`);
    }
  }
  if (priorityArg) body.priority = Number(priorityArg);
  if (stageArg) body.stageKey = stageArg;
  if (projectArg) body.projectId = projectArg;
  if (dueArg) {
    // Checked here, not sent and refused: `POST /cards` answers a malformed `dueAt` with a
    // 400 whose sentence is about a field named `dueAt`, not the flag the person typed.
    if (!DUE_AT_RE.test(dueArg)) {
      fail(`--due is not a date in YYYY-MM-DD form: ${dueArg}`);
    }
    body.dueAt = dueArg;
  }
  const created = (await api(`/v1/boards/${pos[0]}/cards`, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { card: { id: string } };
  // Labels are not part of `POST /cards` — applied with a follow-up PATCH against the same
  // route the drawer and `supi move` already use, hitting the label-id validation there
  // (`unknownLabelIds`) rather than duplicating it here.
  if (labelIds.length > 0) {
    out(
      await api(`/v1/boards/${pos[0]}/cards/${created.card.id}`, {
        method: "PATCH",
        body: JSON.stringify({ labels: labelIds }),
      }),
    );
    return;
  }
  out(created);
}

/**
 * Edit a card's title, spec, priority or due date — the PATCH the web drawer sends.
 *
 * `--spec` replaces the spec whole. `--merge-spec` is a read-modify-write: read the card, merge
 * the given object one level deep (a top-level `null` removes that key), and write back with
 * `expectedUpdatedAt` set to what was read — so an edit someone made in between is refused
 * with a 409 rather than silently overwritten by a spec built from the older copy.
 */
export async function runEditCard({ rest, pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) {
    fail(
      "usage: supi edit-card <boardId> <cardId> [--title <text>] [--spec <file|->]",
      "  [--merge-spec <file|->] [--priority <n>] [--due YYYY-MM-DD|none]",
    );
  }
  const titleArg = flag(rest, "--title");
  const specArg = flag(rest, "--spec");
  const mergeArg = flag(rest, "--merge-spec");
  const priorityArg = flag(rest, "--priority");
  const dueArg = flag(rest, "--due");
  if (specArg && mergeArg) fail("--spec replaces the spec and --merge-spec merges into it; pass one.");
  if (!titleArg && !specArg && !mergeArg && !priorityArg && !dueArg) {
    fail("Nothing to change.", "  supi edit-card <boardId> <cardId> --title … | --spec … | --merge-spec … | --priority … | --due …");
  }
  const body: Record<string, unknown> = {};
  if (titleArg) body.title = titleArg;
  if (priorityArg) {
    const n = Number(priorityArg);
    if (!Number.isFinite(n)) fail(`--priority is not a number: ${priorityArg}`);
    body.priority = n;
  }
  if (dueArg) {
    if (dueArg !== "none" && !DUE_AT_RE.test(dueArg)) fail(`--due is not a date in YYYY-MM-DD form, or \`none\`: ${dueArg}`);
    body.dueAt = dueArg === "none" ? null : dueArg;
  }
  if (specArg) body.spec = readJson(specArg, "--spec");
  const cardPath = `/v1/boards/${pos[0]}/cards/${pos[1]}`;
  if (mergeArg) {
    const merge = readJson(mergeArg, "--merge-spec");
    if (!isPlainObject(merge)) fail("--merge-spec must be a JSON object: its top-level keys are merged into the spec.");
    const { card } = (await api(cardPath)) as { card: { spec: unknown; updatedAt: string | null } };
    const current = card.spec ?? {};
    if (!isPlainObject(current)) {
      fail("This card's spec is not a JSON object, so there is nothing to merge into.", "  supi edit-card <boardId> <cardId> --spec <file|->   replace it instead");
    }
    body.spec = mergeSpec(current, merge);
    body.expectedUpdatedAt = card.updatedAt;
  }
  out(
    await api(cardPath, { method: "PATCH", body: JSON.stringify(body) }, {
      conflict:
        "The card changed since it was read, so the merge was refused. Nothing was written.\n\n" +
        "  Run the same command again: it re-reads the card and merges into what is there now.",
    }),
  );
}
