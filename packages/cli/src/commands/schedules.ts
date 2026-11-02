/**
 * Recurring cards.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { flag } from "../args.ts";
import { api, fail, out, type Args } from "../runtime.ts";
import { BOARD, SCHEDULE, type CommandSpec } from "../spec.ts";

/** The `schedules` group's entries in the command table, in the order `supi help` lists them. */
export const SCHEDULES_COMMANDS: CommandSpec[] = [
  {
    path: ["schedule", "list"],
    group: "schedules",
    args: [BOARD],
    flags: [],
    summary: "the board's recurring cards",
    description: "Every schedule on the board, enabled or paused.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/schedules" }],
    access: { role: "viewer", agent: "refused", note: "Not open to agent tokens today." },
    output: "JSON: the schedules",
    fails: ["`<boardId>` is missing"],
    examples: ["supi schedule list brd_8f2c…"],
  },
  {
    path: ["schedule", "add"],
    group: "schedules",
    args: [BOARD],
    flags: [
      { name: "--title", value: "<t>", type: "string", required: true, description: "the title each card it creates carries" },
      {
        name: "--rule",
        value: "<r>",
        type: "string",
        required: true,
        description:
          'the cadence: `every <n> minutes|hours|days`, `daily at HH:MM`, `weekly on <mon-sun> at HH:MM`, or ' +
          "`monthly on <1-28> at HH:MM`. The server checks the grammar and its refusal says what to type instead",
      },
      { name: "--tz", value: "<tz>", type: "string", required: true, description: "the IANA time zone the rule's times are in, such as `Europe/London`" },
      { name: "--stage", value: "<key>", type: "string", default: "the board's first stage", description: "the stage each card is created in" },
      { name: "--priority", value: "<n>", type: "number", default: "`0`", description: "each card's priority" },
      {
        name: "--overlap",
        value: "skip|allow",
        type: "enum",
        choices: ["skip", "allow"],
        default: "`skip`",
        description: "`skip`: do not create a card while the previous one is still open; `allow`: create it anyway",
      },
    ],
    summary: "declare a schedule",
    description: "Declares a schedule that creates a card on the board each time its rule fires.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/schedules" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the created schedule",
    fails: ["`<boardId>`, `--title`, `--rule` or `--tz` is missing", "`--overlap` is not `skip` or `allow`"],
    examples: [
      "supi schedule add brd_8f2c… --title 'Weekly dependency audit' --rule 'weekly on mon at 09:00' --tz Europe/London",
      "supi schedule add brd_8f2c… --title 'Triage inbox' --rule 'every 4 hours' --tz UTC --overlap skip",
    ],
  },
  {
    path: ["schedule", "rm"],
    group: "schedules",
    args: [BOARD, SCHEDULE],
    flags: [],
    summary: "remove a schedule",
    description: "Removes a schedule. Cards it already created are untouched.",
    routes: [{ method: "DELETE", path: "/v1/boards/:boardId/schedules/:scheduleId" }],
    access: { role: "admin", agent: "refused" },
    output: "`Deleted <scheduleId>.`; `--json` for `{ deleted }`",
    fails: ["`<boardId>` or `<scheduleId>` is missing"],
    examples: ["supi schedule rm brd_8f2c… sch_3a9d…"],
  },
  {
    path: ["schedule", "pause"],
    group: "schedules",
    args: [BOARD, SCHEDULE],
    flags: [],
    summary: "stop a schedule firing, keeping it",
    description: "Disables a schedule without removing it: it creates no cards until `schedule resume`.",
    routes: [{ method: "PATCH", path: "/v1/boards/:boardId/schedules/:scheduleId" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the schedule",
    fails: ["`<boardId>` or `<scheduleId>` is missing"],
    examples: ["supi schedule pause brd_8f2c… sch_3a9d…"],
  },
  {
    path: ["schedule", "resume"],
    group: "schedules",
    args: [BOARD, SCHEDULE],
    flags: [],
    summary: "start a paused schedule firing again",
    description: "Re-enables a paused schedule, so its rule creates cards again.",
    routes: [{ method: "PATCH", path: "/v1/boards/:boardId/schedules/:scheduleId" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the schedule",
    fails: ["`<boardId>` or `<scheduleId>` is missing"],
    examples: ["supi schedule resume brd_8f2c… sch_3a9d…"],
  },
];

/**
 * A recurring card, and the cadence that fires it (Task 8's rule grammar, Task 9's CRUD on the
 * DO, Task 10's route). `add` validates only the SHAPE of what it sends — required flags are
 * present and `--overlap`/`--priority` parse to the right type — never the rule's grammar: the
 * server owns that, and its own message (`INVALID_RULE`'s `error.message`, printed as `api()`
 * already prints any refusal) is the sentence that tells the author what to type instead. A
 * client that re-validated the grammar is a client that will one day disagree with the server
 * about what a valid rule is.
 */
export async function runSchedule({ rest, pos }: Args): Promise<void> {
  const sub = pos[0];

  if (sub === "list") {
    const boardId = pos[1];
    if (!boardId) fail("usage: supi schedule list <boardId>");
    out(await api(`/v1/boards/${boardId}/schedules`));
    return;
  }

  if (sub === "add") {
    const boardId = pos[1];
    const usage =
      "usage: supi schedule add <boardId> --title <t> --rule <r> --tz <tz>\n" +
      "  [--stage <key>] [--priority <n>] [--overlap skip|allow]";
    if (!boardId) fail(usage);
    const title = flag(rest, "--title");
    const rule = flag(rest, "--rule");
    const tz = flag(rest, "--tz");
    if (!title || !rule || !tz) fail(usage);
    const body: Record<string, unknown> = { title, rule, timezone: tz };
    const stage = flag(rest, "--stage");
    if (stage) body.stageKey = stage;
    const priorityArg = flag(rest, "--priority");
    if (priorityArg) body.priority = Number(priorityArg);
    const overlapArg = flag(rest, "--overlap");
    if (overlapArg) {
      if (overlapArg !== "skip" && overlapArg !== "allow") {
        fail(`--overlap must be "skip" or "allow", not "${overlapArg}"`);
      }
      body.overlap = overlapArg;
    }
    out(await api(`/v1/boards/${boardId}/schedules`, { method: "POST", body: JSON.stringify(body) }));
    return;
  }

  if (sub === "rm") {
    const boardId = pos[1];
    const scheduleId = pos[2];
    if (!boardId || !scheduleId) fail("usage: supi schedule rm <boardId> <scheduleId>");
    await api(`/v1/boards/${boardId}/schedules/${scheduleId}`, { method: "DELETE" });
    out({ deleted: scheduleId }, () => `Deleted ${scheduleId}.`);
    return;
  }

  if (sub === "pause" || sub === "resume") {
    const boardId = pos[1];
    const scheduleId = pos[2];
    if (!boardId || !scheduleId) fail(`usage: supi schedule ${sub} <boardId> <scheduleId>`);
    out(
      await api(`/v1/boards/${boardId}/schedules/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: sub === "resume" }),
      }),
    );
    return;
  }

  fail(
    "usage: supi schedule list <boardId>\n" +
      "  supi schedule add <boardId> --title <t> --rule <r> --tz <tz> [--stage <key>] [--priority <n>] [--overlap skip|allow]\n" +
      "  supi schedule rm <boardId> <scheduleId>\n" +
      "  supi schedule pause <boardId> <scheduleId>\n" +
      "  supi schedule resume <boardId> <scheduleId>",
  );
}
