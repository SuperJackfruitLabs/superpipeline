#!/usr/bin/env bun
/**
 * `supi` — SuperPipeline from a terminal.
 *
 * Installed under two names, `superpipeline` and `supi`, pointing at this one file: the full
 * name for scripts and documentation a stranger reads, the short one for a person typing.
 * It was `kbn` until the product was renamed; that name was short for the old one.
 *
 * The third consumer of `@superpipeline/contract`, after REST and MCP. It is a client: it adds no
 * authority, performs no local permission check, and renders the board's own refusals. A client
 * that pre-empts a server decision is a client that will one day disagree with it.
 *
 * **The verbs used to be work verbs only, and the reason given for that is no longer true.**
 * The text here said a hub token "resolves as a `member`", so managing anything needed a seat
 * the token did not grant. That was accurate until 2026-09-20, when superpipeline learned to map an
 * issuer subject onto a local user (`apps/api/src/auth/hub-oauth.ts`): a mapped principal reads
 * its real membership, and for the person who owns the workspace that is `owner`. The seat was
 * never withheld from the CLI — it did not exist yet.
 *
 * So `create-board` is here. It is still a client: it adds no authority, performs no local
 * permission check, and renders the board's own refusals. A caller with no seat gets a 403 from
 * the server, which is where that decision belongs — a client that pre-empts a server decision
 * is a client that will one day disagree with it, and this file spent a release disagreeing.
 */
import { positionals } from "./args.ts";
import { findCommands, renderCommandHelp, renderUsage } from "./commands.ts";
import { fail, setJsonOutput, wantsJson, type Args } from "./runtime.ts";
import { runVersion, runSkill, runSelfUpdate, runLogin, runLogout, runWhoami } from "./commands/session.ts";
import { runBoards, runBoard, runSetStale, runSetStages, runSetStage, runTemplates, runCreateBoard } from "./commands/boards.ts";
import { runCard, runCardLabel, runMove, runResume, runStale, runLog, runArchive, runCreateCard, runEditCard } from "./commands/cards.ts";
import { runComment, runComments } from "./commands/comments.ts";
import { runGates, runDecideGate, runApproveGate, runDelivery } from "./commands/gates.ts";
import { runLink } from "./commands/links.ts";
import { runLabel } from "./commands/labels.ts";
import { runProject, runMilestone } from "./commands/projects.ts";
import { runSchedule } from "./commands/schedules.ts";
import { runForge, runAgents, runAgent, runCapabilities, runCapability, runImplications } from "./commands/workspace.ts";

/**
 * The summary `supi help` prints, rendered from `commands.ts` — the same table the published
 * reference is generated from, so the help, the reference and this switch are held to one list
 * (`reference.test.ts`).
 */
const USAGE = renderUsage();

/** `supi help <verb> [<sub-verb>]` and `supi <verb> --help`: one command, or a verb's sub-commands, in full. */
function printHelp(words: string[]): void {
  const found = findCommands(words);
  if (found.length === 0) fail(`unknown command: ${words.join(" ")}`, "  supi help           every command");
  process.stdout.write(found.map(renderCommandHelp).join("\n\n") + "\n");
}

async function main(argv: string[]): Promise<void> {
  const [cmd, ...rest] = argv;
  const json = wantsJson(rest);
  setJsonOutput(json);
  // Flags and the values they consume removed — see `positionals`; the old filter kept the value.
  const pos = positionals(rest);

  // `supi <verb> --help` explains the verb instead of running it — a person checking what
  // `set-stages` does should not have replaced a pipeline to find out.
  if (cmd !== undefined && cmd !== "help" && rest.includes("--help")) {
    printHelp([cmd, ...pos]);
    return;
  }

  const args: Args = { cmd: cmd ?? "", rest, pos, json };

  switch (cmd) {
    case undefined:
    case "-h":
    case "--help":
      process.stdout.write(USAGE + "\n");
      return;

    case "help":
      if (pos.length > 0) printHelp(pos);
      else process.stdout.write(USAGE + "\n");
      return;

    case "version":
      return runVersion();

    case "skill":
      return runSkill(args);

    case "update":
      return runSelfUpdate(args);

    case "login":
      return runLogin();

    case "logout":
      return runLogout();

    case "whoami":
      return runWhoami(args);

    case "boards":
      return runBoards();

    case "board":
      return runBoard(args);

    case "card":
      return runCard(args);

    case "card-label":
      return runCardLabel(args);

    case "move":
      return runMove(args);

    case "resume":
      return runResume(args);

    case "stale":
      return runStale(args);

    case "set-stale":
      return runSetStale(args);

    case "gates":
      return runGates(args);

    case "approve":
      return runApproveGate(args);

    case "reject":
    case "request-changes":
      return runDecideGate(args);

    case "delivery":
      return runDelivery(args);

    case "log":
      return runLog(args);

    case "comment":
      return runComment(args);

    case "comments":
      return runComments(args);

    case "archive":
      return runArchive(args);

    case "link":
      return runLink(args);

    case "set-stages":
      return runSetStages(args);

    case "set-stage":
      return runSetStage(args);

    case "create-card":
      return runCreateCard(args);

    case "edit-card":
      return runEditCard(args);

    case "forge":
      return runForge(args);

    case "agents":
      return runAgents();

    case "agent":
      return runAgent(args);

    case "capabilities":
      return runCapabilities();

    case "capability":
      return runCapability(args);

    case "implications":
      return runImplications();

    case "label":
      return runLabel(args);

    case "project":
      return runProject(args);

    case "milestone":
      return runMilestone(args);

    case "schedule":
      return runSchedule(args);

    case "templates":
      return runTemplates();

    case "create-board":
      return runCreateBoard(args);

    default:
      fail(`unknown command: ${cmd}`, USAGE);
  }
}

await main(process.argv.slice(2));
