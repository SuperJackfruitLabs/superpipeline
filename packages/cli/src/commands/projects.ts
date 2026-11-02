/**
 * Projects and their milestones.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { renderProjects, renderProject } from "../render.ts";
import { flag } from "../args.ts";
import { DUE_AT_RE, api, fail, out, type Args } from "../runtime.ts";
import { DATE_FORMAT, type CommandSpec } from "../spec.ts";

/** The `projects` group's entries in the command table, in the order `supi help` lists them. */
export const PROJECTS_COMMANDS: CommandSpec[] = [
  {
    path: ["project", "list"],
    group: "projects",
    args: [],
    flags: [],
    summary: "the workspace's projects (group cards across boards)",
    description: "Every project in the workspace, with its target date and lead. A project groups cards from any board.",
    routes: [{ method: "GET", path: "/v1/projects" }],
    access: { role: "viewer", agent: "read" },
    output: "one project per line; `--json` for the server's response",
    fails: [],
    examples: ["supi project list"],
  },
  {
    path: ["project", "add"],
    group: "projects",
    args: [{ name: "name", description: "the project's name" }],
    flags: [
      { name: "--description", value: "<text>", type: "string", default: "none", description: "what the project is for" },
      { name: "--target", value: "YYYY-MM-DD", type: "date", default: "no target date", description: `the target date; ${DATE_FORMAT}` },
      { name: "--lead", value: "<userId>", type: "string", default: "no lead", description: "the person who leads it" },
    ],
    summary: "declare a project",
    description: "Declares a project in the workspace. Cards from any board can then be grouped under it.",
    routes: [{ method: "POST", path: "/v1/projects" }],
    access: { role: "admin", agent: "plan" },
    output: "JSON: the created project",
    fails: ["`<name>` is missing", "`--target` is not `YYYY-MM-DD`"],
    examples: ["supi project add 'Q4 hardening' --target 2026-12-15 --description 'auth and tenancy fixes'"],
  },
  {
    path: ["project", "show"],
    group: "projects",
    args: [{ name: "projectId", description: "the project (see `supi project list`)" }],
    flags: [],
    summary: "a project with its milestones, in order",
    description: "One project and its milestones, ordered by their sort order and then by name.",
    routes: [{ method: "GET", path: "/v1/projects/:projectId" }],
    access: { role: "viewer", agent: "read" },
    output: "the project and its milestones; `--json` for the server's response",
    fails: ["`<projectId>` is missing"],
    examples: ["supi project show prj_5b10…"],
  },
  {
    path: ["project", "rm"],
    group: "projects",
    args: [{ name: "projectId", description: "the project" }],
    flags: [],
    summary: "remove a project (cards keep the stale id)",
    description: "Removes a project. Cards that carried it keep the id and show nothing for it.",
    routes: [{ method: "DELETE", path: "/v1/projects/:projectId" }],
    access: { role: "admin", agent: "refused" },
    output: "`Deleted <projectId>.`; `--json` for `{ deleted }`",
    fails: ["`<projectId>` is missing"],
    examples: ["supi project rm prj_5b10…"],
  },
  {
    path: ["milestone", "add"],
    group: "projects",
    args: [{ name: "projectId", description: "the project it belongs to" }, { name: "name", description: "the milestone's name" }],
    flags: [
      { name: "--target", value: "YYYY-MM-DD", type: "date", default: "no target date", description: `the target date; ${DATE_FORMAT}` },
      { name: "--sort", value: "<n>", type: "number", default: "the server's default order", description: "its position within the project, ascending" },
    ],
    summary: "add a milestone to a project",
    description: "Adds a milestone to a project. Milestones are shown in `--sort` order, then by name.",
    routes: [{ method: "POST", path: "/v1/projects/:projectId/milestones" }],
    access: { role: "admin", agent: "plan" },
    output: "JSON: the created milestone",
    fails: ["`<projectId>` or `<name>` is missing", "`--target` is not `YYYY-MM-DD`, or `--sort` is not a number"],
    examples: ["supi milestone add prj_5b10… 'Beta' --target 2026-11-15 --sort 1"],
  },
  {
    path: ["milestone", "rm"],
    group: "projects",
    args: [{ name: "milestoneId", description: "the milestone (see `supi project show`)" }],
    flags: [],
    summary: "remove a milestone (cards keep the stale id)",
    description: "Removes one milestone without touching its project. Cards that carried it keep the id.",
    routes: [{ method: "DELETE", path: "/v1/milestones/:milestoneId" }],
    access: { role: "admin", agent: "refused" },
    output: "`Deleted <milestoneId>.`; `--json` for `{ deleted }`",
    fails: ["`<milestoneId>` is missing"],
    examples: ["supi milestone rm mst_2c7e…"],
  },
];

/**
 * Projects and milestones (Task 18's `/v1/projects[/:id[/milestones]]`,
 * `/v1/milestones/:id`) — a project groups cards ACROSS boards, the same way a label does,
 * and until this had no CLI client either. `supi project set`/health editing is not here:
 * this task is `list|add|show|rm` only, matching the brief.
 *
 * `--target` is checked client-side against the same shape the API enforces (`DUE_AT_RE`,
 * `isInvalidDueAt` in `apps/api/src/index.ts`) before anything is sent — same reasoning as
 * `create-card --due` above: a malformed date never leaves the terminal, so the person sees
 * this message rather than the server's generic one about a field named `targetDate`.
 */
export async function runProject({ rest, pos }: Args): Promise<void> {
  const sub = pos[0];

  if (sub === "list") {
    out(await api("/v1/projects"), renderProjects);
    return;
  }

  if (sub === "add") {
    const name = pos[1];
    const usage = "usage: supi project add <name> [--description <text>] [--target YYYY-MM-DD] [--lead <userId>]";
    if (!name) fail(usage);
    const body: Record<string, unknown> = { name };
    const description = flag(rest, "--description");
    if (description) body.description = description;
    const target = flag(rest, "--target");
    if (target) {
      if (!DUE_AT_RE.test(target)) fail(`--target is not a date in YYYY-MM-DD form: ${target}`, usage);
      body.targetDate = target;
    }
    const lead = flag(rest, "--lead");
    if (lead) body.leadUserId = lead;
    out(await api("/v1/projects", { method: "POST", body: JSON.stringify(body) }));
    return;
  }

  if (sub === "show") {
    const projectId = pos[1];
    if (!projectId) fail("usage: supi project show <projectId>");
    out(await api(`/v1/projects/${projectId}`), renderProject);
    return;
  }

  if (sub === "rm") {
    const projectId = pos[1];
    if (!projectId) fail("usage: supi project rm <projectId>");
    await api(`/v1/projects/${projectId}`, { method: "DELETE" });
    out({ deleted: projectId }, () => `Deleted ${projectId}.`);
    return;
  }

  fail(
    "usage: supi project list\n" +
      "  supi project add <name> [--description <text>] [--target YYYY-MM-DD] [--lead <userId>]\n" +
      "  supi project show <projectId>\n" +
      "  supi project rm <projectId>",
  );
}

/**
 * One milestone inside one project, ordered within it by `sortOrder` (ascending, then name —
 * `db/projects.ts`'s `listMilestones`, what `supi project show` prints). `rm` goes through
 * `/v1/milestones/:id`, NOT the project's own route — a milestone is removed on its own
 * without deleting the project it belongs to.
 */
export async function runMilestone({ rest, pos }: Args): Promise<void> {
  const sub = pos[0];

  if (sub === "add") {
    const projectId = pos[1];
    const name = pos[2];
    const usage = "usage: supi milestone add <projectId> <name> [--target YYYY-MM-DD] [--sort <n>]";
    if (!projectId || !name) fail(usage);
    const body: Record<string, unknown> = { name };
    const target = flag(rest, "--target");
    if (target) {
      if (!DUE_AT_RE.test(target)) fail(`--target is not a date in YYYY-MM-DD form: ${target}`, usage);
      body.targetDate = target;
    }
    const sortArg = flag(rest, "--sort");
    if (sortArg !== null) {
      const sortOrder = Number(sortArg);
      if (!Number.isFinite(sortOrder)) fail(`--sort must be a number, got "${sortArg}".`, usage);
      body.sortOrder = sortOrder;
    }
    out(await api(`/v1/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(body) }));
    return;
  }

  if (sub === "rm") {
    const milestoneId = pos[1];
    if (!milestoneId) fail("usage: supi milestone rm <milestoneId>");
    await api(`/v1/milestones/${milestoneId}`, { method: "DELETE" });
    out({ deleted: milestoneId }, () => `Deleted ${milestoneId}.`);
    return;
  }

  fail(
    "usage: supi milestone add <projectId> <name> [--target YYYY-MM-DD] [--sort <n>]\n" +
      "  supi milestone rm <milestoneId>",
  );
}
