/**
 * Signing in, who is signed in, help, the version, the skill and updating the binary.
 *
 * Each command's help entry, beside the code that runs it: `commands.ts` assembles the table
 * `supi help` and the reference are rendered from, and `index.ts` dispatches to the `run…` functions.
 */
import { baseUrl, clearSupiCredentials, describeCredential, saveSupiDevice } from "../credential.ts";
import { deviceLogin, discoverPlane, exchangeDevice } from "../plane-login.ts";
import { flag } from "../args.ts";
import { VERSION, runUpdate } from "../update.ts";
import { defaultSkillDir, installSkill, renderSkill } from "../skill.ts";
import { credentialOrExit, fail, out, wantsJson, type Args } from "../runtime.ts";
import { type CommandSpec } from "../spec.ts";

/** The `session` group's entries in the command table, in the order `supi help` lists them. */
export const SESSION_COMMANDS: CommandSpec[] = [
  {
    path: ["login"],
    group: "session",
    args: [],
    flags: [],
    summary: "sign in to this server's organization plane (device flow)",
    description:
      "Signs a person in from a terminal. `supi login` reads `$SUPERPIPELINE_URL/.well-known/oauth-protected-resource` " +
      "to find the server's sign-in service and audience — for app.superpipeline.dev that is " +
      "https://accounts.superjackfruit.com — and runs that service's device flow as the client `supi`: it prints a " +
      "link and a code, you open the link and confirm the code in a browser, and `supi` stores the long-lived " +
      "device credential it is given.\n\n" +
      "Every later command exchanges that device credential at the sign-in service's `/api/token/device` for a " +
      "short-lived token for this server's audience, and caches the token beside it. No browser is needed again " +
      "until the device credential is revoked or expires. The device credential is only ever sent to the sign-in " +
      "service recorded at login, over HTTPS (plain HTTP only for a loopback development server), with redirects " +
      "disabled.\n\n" +
      "Both files live in `superpipeline/` under the platform config directory and are written atomically with " +
      "mode 0600. Signing in again replaces them.",
    routes: [{ method: "GET", path: "/.well-known/oauth-protected-resource" }],
    access: { role: null, agent: null, note: "Anyone may start a sign-in; what you may then do is your role in the workspace." },
    output: "the link and code to confirm, then `Signed in.`",
    fails: [
      "the server does not name a separate sign-in service (it is not on the organization plane): `… does not sign in through an organization plane yet`",
      "the sign-in service will not start a device sign-in, or answers with something unexpected",
      "the sign-in is declined in the browser, or the code expires before it is confirmed",
      "the first token exchange is refused (device revoked, expired or suspended) or the service cannot be reached",
    ],
    examples: ["supi login", "SUPERPIPELINE_URL=http://localhost:8787 supi login"],
  },
  {
    path: ["logout"],
    group: "session",
    args: [],
    flags: [],
    summary: "forget that sign-in on this machine",
    description:
      "Deletes `supi login`'s device credential and token cache from this machine. It does not revoke the device " +
      "at the sign-in service and does not touch any other client's files or any environment variable — a " +
      "`SUPERPIPELINE_TOKEN` still in your shell is still used.",
    routes: [],
    access: { role: null, agent: null },
    output: "`Signed out on this machine.`",
    fails: [],
    examples: ["supi logout"],
  },
  {
    path: ["whoami"],
    group: "session",
    args: [],
    flags: [],
    summary: "who the stored token says you are",
    description:
      "Resolves the credential exactly as every other command would and prints what it says about itself: the " +
      "principal, its kind (`human` or `agent`), the server, where the credential came from, and when it expires. " +
      "It reads the token's claims without verifying them and makes no call to SuperPipeline, so a `whoami` that " +
      "looks right does not prove the server will accept the token — `supi boards` does. Resolving may exchange a " +
      "stored device credential for a fresh token, which is a call to the sign-in service.\n\n" +
      "An `spa_` agent token is opaque and carries no principal; `whoami` says so rather than failing.",
    routes: [],
    access: { role: null, agent: "any", note: "Needs a credential, but sends it only to the sign-in service, never to SuperPipeline." },
    output: "`principal`, `kind`, `superpipeline`, `token from`, `expires`; with `--json`, an object with the same fields",
    fails: ["no credential is found, or the one found has expired", "a human credential that is not a readable token"],
    examples: ["supi whoami", "supi whoami --json"],
  },
  {
    path: ["help"],
    group: "session",
    args: [{ name: "verb", description: "a command, with its sub-verb if it has one (`help link add`)", optional: true, rest: true }],
    flags: [],
    synopsis: "supi help [<verb> [<sub-verb>]]",
    summary: "this summary, or one command in full (also `supi <verb> --help`)",
    description:
      "With no argument, the summary of every command. With a verb, that command's synopsis, flags, access and " +
      "examples — the same text the reference pages are generated from. `supi <verb> --help` and " +
      "`supi <verb> <sub-verb> --help` print the same thing without running the command. `-h` and `--help` alone " +
      "are the summary.",
    routes: [],
    access: { role: null, agent: null },
    output: "help text",
    fails: ["the named verb does not exist"],
    examples: ["supi help", "supi help schedule add", "supi set-stage --help"],
  },
  {
    path: ["version"],
    group: "session",
    args: [],
    flags: [],
    summary: "print this binary's version",
    description:
      "Prints the release this binary was built as, and its platform. A binary run from a source checkout, rather " +
      "than a release, reports `dev`.",
    routes: [],
    access: { role: null, agent: null },
    output: "`supi <version> <platform>/<arch>`",
    fails: [],
    examples: ["supi version"],
  },
  {
    path: ["skill"],
    group: "session",
    args: [{ name: "install", description: "write the skill into a skills directory instead of printing it", optional: true }],
    flags: [
      {
        name: "--dir",
        value: "<dir>",
        type: "path",
        default: "`~/.claude/skills`",
        description: "with `install`: the skills directory; the file is written to `<dir>/superpipeline-boards/SKILL.md`",
      },
    ],
    synopsis: "supi skill [install [--dir <dir>]]",
    summary: "print the agent skill, or install it into a skills directory",
    description:
      "The agent skill for this binary, compiled into it: it always matches this version's verbs and needs no " +
      "network. With no argument it prints `SKILL.md` to stdout, with the version line filled in. `supi skill " +
      "install` writes it to `<dir>/superpipeline-boards/SKILL.md` — staged and renamed, so a reader never sees half " +
      "a file — replacing only that file, and prints the path. Running it again is harmless. The installer does this " +
      "for you when `SKILL_DIR` is set.",
    routes: [],
    access: { role: null, agent: null },
    output: "the skill text; with `install`, `Installed the skill: <path>`, or with `--json` `{ path, version }`",
    fails: ["the directory cannot be written", "an argument other than `install`"],
    examples: ["supi skill", "supi skill install", "supi skill install --dir ~/.claude/skills --json"],
  },
  {
    path: ["update"],
    group: "session",
    args: [],
    flags: [
      {
        name: "--check",
        type: "boolean",
        default: "off: install the newer release",
        description: "only say whether a newer release exists; install nothing",
      },
    ],
    summary: "replace this binary with the newest release",
    description:
      "Resolves the latest release tag on GitHub, downloads the asset for this platform (`supi-<platform>-<arch>`; " +
      "macOS and Linux only), verifies it against the release's `SHA256SUMS`, and renames it over the running " +
      "binary — staged in the binary's own directory so the swap is atomic. A download that cannot be verified is " +
      "refused rather than installed. A `dev` build is always offered the update. No credential is involved.",
    routes: [],
    access: { role: null, agent: null, note: "Talks to github.com only. Needs write access to the binary's directory, never sudo." },
    output: "`supi <version> is current …`, `supi <tag> is available …` (with `--check`), or `supi updated to <tag>.`",
    fails: [
      "the latest release cannot be read, or carries no tag",
      "no release binary is published for this platform",
      "the release has no `SHA256SUMS`, no digest for this asset, or the download fails its checksum",
    ],
    examples: ["supi update --check", "supi update"],
  },
];

export async function runVersion(): Promise<void> {
  process.stdout.write(`supi ${VERSION} ${process.platform}/${process.arch}\n`);
}

export async function runSkill({ rest, pos }: Args): Promise<void> {
  // The skill text is compiled into this binary, so it is always the one matching these verbs
  // and needs no network.
  if (pos[0] === undefined) {
    process.stdout.write(renderSkill(VERSION));
    return;
  }
  if (pos[0] !== "install" || pos.length > 1) fail(`unknown skill command: ${pos.join(" ")}`, "  supi help skill");
  const dir = flag(rest, "--dir") ?? defaultSkillDir();
  let written: string;
  try {
    written = installSkill(dir, VERSION);
  } catch (e) {
    fail(`could not write the skill into ${dir}: ${e instanceof Error ? e.message : String(e)}`);
  }
  process.stdout.write(wantsJson(rest) ? JSON.stringify({ path: written, version: VERSION }) + "\n" : `Installed the skill: ${written}\n`);
}

export async function runSelfUpdate({ rest }: Args): Promise<void> {
  // The network work lives in update.ts; this only decides what to print. A failure throws
  // with a message written to be shown as it stands, so it is not re-worded here.
  try {
    process.stdout.write((await runUpdate({ check: rest.includes("--check") })) + "\n");
  } catch (e) {
    fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runLogin(): Promise<void> {
  const target = await discoverPlane(baseUrl()).catch(() => null);
  if (!target) fail(`${baseUrl()} does not sign in through an organization plane yet.`, "  fleet login          the sign-in it uses today");
  const credential = await deviceLogin(target, {
    print: (l) => process.stdout.write(l + "\n"),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  }).catch((e) => fail(e instanceof Error ? e.message : String(e)));
  saveSupiDevice({ credential, plane: target.plane, audience: target.audience });
  await exchangeDevice(target, credential).catch((e) => fail(e instanceof Error ? e.message : String(e)));
  process.stdout.write("Signed in.\n");
}

export async function runLogout(): Promise<void> {
  clearSupiCredentials();
  process.stdout.write("Signed out on this machine.\n");
}

export async function runWhoami({ json }: Args): Promise<void> {
  const c = await credentialOrExit();
  const described = describeCredential(c);
  if (!described) fail("The stored credential is not a token this can read.");
  if (json) {
    out({ ...described, superpipeline: baseUrl() });
    return;
  }
  process.stdout.write(
    // An agent token carries no principal id — it is an opaque secret, and the agent it names
    // lives in superpipeline's catalog. Saying so beats printing an empty field.
    `principal  ${described.principal ?? "(not carried by an agent token)"}\n` +
      `kind       ${described.kind}\n` +
      `superpipeline   ${baseUrl()}\n` +
      `token from ${c.source}\n` +
      (described.expires ? `expires    ${new Date(described.expires).toLocaleString()}\n` : ""),
  );
}
