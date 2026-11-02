/**
 * The workspace's labels.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { api, fail, out, type Args } from "../runtime.ts";
import { type CommandSpec } from "../spec.ts";

/** The `labels` group's entries in the command table, in the order `supi help` lists them. */
export const LABELS_COMMANDS: CommandSpec[] = [
  {
    path: ["label", "list"],
    group: "labels",
    args: [],
    flags: [],
    summary: "the workspace's label catalogue",
    description: "Every label declared in the workspace, with its id and colour.",
    routes: [{ method: "GET", path: "/v1/labels" }],
    access: { role: "viewer", agent: "read" },
    output: "JSON: the labels",
    fails: [],
    examples: ["supi label list"],
  },
  {
    path: ["label", "add"],
    group: "labels",
    args: [{ name: "name", description: "the label's name" }, { name: "colour", description: "its colour, as the web app accepts it (for example `#d97706`)" }],
    flags: [],
    summary: "declare a label",
    description: "Declares a label in the workspace catalogue, so cards can be tagged with it by id (`create-card --label`).",
    routes: [{ method: "POST", path: "/v1/labels" }],
    access: { role: "admin", agent: "refused" },
    output: "JSON: the created label",
    fails: ["`<name>` or `<colour>` is missing"],
    examples: ["supi label add security '#dc2626'"],
  },
  {
    path: ["label", "rm"],
    group: "labels",
    args: [{ name: "id", description: "the label's id (see `supi label list`)" }],
    flags: [],
    summary: "remove a label (cards keep the stale id)",
    description: "Removes a label. Cards that carried it keep the id and show nothing for it.",
    routes: [{ method: "DELETE", path: "/v1/labels/:id" }],
    access: { role: "admin", agent: "refused" },
    output: "`Deleted <id>.`; `--json` for `{ deleted }`",
    fails: ["`<id>` is missing"],
    examples: ["supi label rm lbl_sec"],
  },
];

/**
 * The tenant's label catalogue (Task 4's `/v1/labels[/:id]`) — the same one
 * `resolveLabelNames` resolves a card's typed names against, so a person can see what already
 * exists, or declare one deliberately instead of leaving it to be inferred from what they type
 * into a card.
 */
export async function runLabel({ pos }: Args): Promise<void> {
  const sub = pos[0];
  if (sub === "list") {
    out(await api("/v1/labels"));
    return;
  }
  if (sub === "add") {
    const name = pos[1];
    const colour = pos[2];
    if (!name || !colour) fail("usage: supi label add <name> <colour>");
    out(await api("/v1/labels", { method: "POST", body: JSON.stringify({ name, colour }) }));
    return;
  }
  if (sub === "rm") {
    const id = pos[1];
    if (!id) fail("usage: supi label rm <id>");
    await api(`/v1/labels/${id}`, { method: "DELETE" });
    out({ deleted: id }, () => `Deleted ${id}.`);
    return;
  }
  fail("usage: supi label list | supi label add <name> <colour> | supi label rm <id>");
}
