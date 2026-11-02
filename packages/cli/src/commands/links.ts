/**
 * Links between cards.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { flag } from "../args.ts";
import { api, fail, out, type Args } from "../runtime.ts";
import { BOARD, CARD, LINK_KIND, TO_BOARD, type CommandSpec } from "../spec.ts";

/** The `links` group's entries in the command table, in the order `supi help` lists them. */
export const LINKS_COMMANDS: CommandSpec[] = [
  {
    path: ["link", "add"],
    group: "links",
    args: [BOARD, { name: "fromCardId", description: "the card the edge starts at" }, { name: "toCardId", description: "the card the edge points to" }],
    flags: [LINK_KIND, TO_BOARD],
    summary: "declare an edge between two cards",
    description:
      "Declares an edge from one card to another. `<boardId>` is the from-card's board. A same-board `blocks` edge " +
      "stops the blocked card being claimed until its blocker is done; with `--to-board` the edge crosses boards " +
      "and is advisory only.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/links" }],
    access: { role: "member", agent: "plan" },
    output: "JSON: the edge; a cross-board edge is preceded by a notice that it is advisory",
    fails: ["a card id is missing", "`--kind` is missing or not one of `blocks`, `relates`, `parent`, `supersedes`"],
    examples: [
      "supi link add brd_8f2c… crd_41aa… crd_77b3… --kind blocks",
      "supi link add brd_8f2c… crd_41aa… crd_0d1e… --kind relates --to-board brd_93fa…",
    ],
  },
  {
    path: ["link", "rm"],
    group: "links",
    args: [BOARD, { name: "fromCardId", description: "the card the edge starts at" }, { name: "toCardId", description: "the card the edge points to" }],
    flags: [LINK_KIND, TO_BOARD],
    summary: "remove an edge",
    description: "Removes the edge with exactly this from-card, to-card and kind.",
    routes: [{ method: "DELETE", path: "/v1/boards/:boardId/links" }],
    access: { role: "member", agent: "plan" },
    output: "JSON: the server's response",
    fails: ["a card id is missing", "`--kind` is missing or not one of `blocks`, `relates`, `parent`, `supersedes`"],
    examples: ["supi link rm brd_8f2c… crd_41aa… crd_77b3… --kind blocks"],
  },
  {
    path: ["link", "list"],
    group: "links",
    args: [BOARD, CARD],
    flags: [],
    summary: "every edge touching a card — same-board and cross-board, kept apart",
    description: "Every edge touching the card, with the enforced same-board edges and the advisory cross-board edges kept apart.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/cards/:cardId/links" }],
    access: { role: "viewer", agent: "refused", note: "Not open to agent tokens today." },
    output: "JSON: the card's edges",
    fails: ["`<boardId>` or `<cardId>` is missing"],
    examples: ["supi link list brd_8f2c… crd_41aa…"],
  },
];

/**
 * Dependencies and sub-task containment (spec §3.4) — the CLI's client for Task 17a's link
 * routes (`POST|DELETE /v1/boards/:id/links`, `GET .../cards/:cardId/links`), which Task 12
 * built on the Durable Object and Task 17a finally gave a wire.
 *
 * `--kind` is validated here, not sent and refused: the route already checks it and answers
 * 400 for anything else, but a client that let the server catch its own typo would show a
 * generic "invalid kind" instead of naming the three values that are actually accepted.
 *
 * `--to-board` is Task 17d: the same route now also carries Task 16's cross-board advisory
 * edges when it names a board other than the path's own. **The notice below is the point of
 * this flag, not a nice-to-have.** A cross-board edge is stored but never enforced — nothing
 * on the claim path ever reads it — so a person who asks for a blocker across boards and gets
 * one that silently refuses nothing has been misled the moment the badge is the first they
 * hear of it. The CLI has no server round trip to wait on to know this: `toBoardId` vs the
 * path `boardId` is the same string comparison the route itself makes, so it is printed BEFORE
 * the request is sent, not parsed out of the response after. A prompt-for-confirmation was
 * the other option; this is a non-interactive tool run from scripts as often as a terminal, so
 * a printed warning that can't hang on absent stdin was preferred over one that can.
 */
export async function runLink({ rest, pos }: Args): Promise<void> {
  const LINK_KINDS = ["blocks", "relates", "parent", "supersedes"] as const;
  const sub = pos[0];

  if (sub === "add" || sub === "rm") {
    const boardId = pos[1];
    const fromCardId = pos[2];
    const toCardId = pos[3];
    const usage = `usage: supi link ${sub} <boardId> <fromCardId> <toCardId> --kind blocks|relates|parent|supersedes [--to-board <boardId>]`;
    if (!boardId || !fromCardId || !toCardId) fail(usage);
    const kind = flag(rest, "--kind");
    if (!kind || !(LINK_KINDS as readonly string[]).includes(kind)) {
      fail(`--kind must be one of ${LINK_KINDS.join(", ")}${kind ? `, got "${kind}"` : ""}.`, usage);
    }
    const toBoardId = flag(rest, "--to-board");
    if (sub === "add" && toBoardId && toBoardId !== boardId) {
      process.stdout.write(
        `Note: ${toBoardId} is a different board, so this edge will be ADVISORY ONLY — shown, but ` +
          `not enforced. A card on another board cannot be read on this board's claim path, so this ` +
          `will not block anything from being claimed. Only a same-board blocker does that.\n`,
      );
    }
    out(
      await api(`/v1/boards/${boardId}/links`, {
        method: sub === "add" ? "POST" : "DELETE",
        body: JSON.stringify(toBoardId ? { fromCardId, toCardId, kind, toBoardId } : { fromCardId, toCardId, kind }),
      }),
    );
    return;
  }

  if (sub === "list") {
    const boardId = pos[1];
    const cardId = pos[2];
    if (!boardId || !cardId) fail("usage: supi link list <boardId> <cardId>");
    out(await api(`/v1/boards/${boardId}/cards/${cardId}/links`));
    return;
  }

  fail(
    "usage: supi link add <boardId> <fromCardId> <toCardId> --kind blocks|relates|parent|supersedes [--to-board <boardId>]\n" +
      "  supi link rm <boardId> <fromCardId> <toCardId> --kind blocks|relates|parent|supersedes [--to-board <boardId>]\n" +
      "  supi link list <boardId> <cardId>",
  );
}
