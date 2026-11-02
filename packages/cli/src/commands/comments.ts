/**
 * A card's comment thread.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { renderComments } from "../render.ts";
import { api, fail, out, readText, type Args } from "../runtime.ts";
import { BOARD, CARD, type CommandSpec } from "../spec.ts";

/** The `comments` group's entries in the command table, in the order `supi help` lists them. */
export const COMMENTS_COMMANDS: CommandSpec[] = [
  {
    path: ["comment"],
    group: "comments",
    args: [
      BOARD,
      CARD,
      {
        name: "text",
        description: "the comment, as Markdown text of at most 8 KB; every remaining word is part of it, or `-` to read it from stdin",
        rest: true,
      },
    ],
    flags: [],
    summary: "add a comment to a card",
    description:
      "Adds a comment to the card, attributed to whoever holds the credential — a person by their account, an agent " +
      "by its name. It appears in the card drawer straight away for anyone watching.\n\n" +
      "An agent working the card sees it: the newest comments travel with the card when an agent claims it, and an " +
      "agent mid-run re-reads the thread (`superpipeline_list_comments`) before it finishes the stage. A comment does " +
      "not interrupt a run that is already working, and it is not a gate decision — use `request-changes` to send " +
      "work back.",
    routes: [{ method: "POST", path: "/v1/boards/:boardId/cards/:cardId/comments" }],
    access: {
      role: "viewer",
      agent: "run",
      note: "An agent may comment only on a card its live run holds; on any other card it is refused (403), whatever its scopes.",
    },
    output: "JSON: the comment",
    fails: ["`<boardId>`, `<cardId>` or the text is missing", "the text is over 8 KB (the server's 400)"],
    examples: [
      "supi comment brd_8f2c… crd_41aa… Please also cover the expired-token path",
      "git diff --stat | supi comment brd_8f2c… crd_41aa… -",
    ],
  },
  {
    path: ["comments"],
    group: "comments",
    args: [BOARD, CARD],
    flags: [],
    summary: "read a card's comments",
    description:
      "The card's comment thread, oldest first: who wrote each one (a person or an agent), when, and what it says. " +
      "A deleted comment is shown as deleted, with its author and time but not its text.",
    routes: [{ method: "GET", path: "/v1/boards/:boardId/cards/:cardId/comments" }],
    access: { role: "viewer", agent: "read" },
    output: "the thread, readable; `--json` for the server's response",
    fails: ["`<boardId>` or `<cardId>` is missing"],
    examples: ["supi comments brd_8f2c… crd_41aa…"],
  },
];

/**
 * A card's comment thread: `comment` adds to it, `comments` reads it.
 *
 * The body is every remaining word, like `create-card`'s title, or stdin for `-` — so a
 * multi-line note, a list or a pasted log goes in as written. Who may post is the server's
 * call: a person with board read access, or the agent whose live run holds this card.
 */
export async function runComment({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi comment <boardId> <cardId> <text|->");
  const text = pos[2] === "-" && pos.length === 3 ? readText("-") : pos.slice(2).join(" ").trim();
  if (!text) fail("Nothing to say.", "  supi comment <boardId> <cardId> <text>   (or - to read it from stdin)");
  out(
    await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/comments`, { method: "POST", body: JSON.stringify({ body: text }) }),
  );
}

export async function runComments({ pos }: Args): Promise<void> {
  if (!pos[0] || !pos[1]) fail("usage: supi comments <boardId> <cardId>");
  out(await api(`/v1/boards/${pos[0]}/cards/${pos[1]}/comments`), renderComments);
}
