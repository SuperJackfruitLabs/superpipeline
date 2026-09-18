/**
 * What `install.sh` puts on a developer's PATH.
 *
 * The rule worth testing is that the install stays a *pointer*, never a copy. `supi` is a client
 * with no authority of its own (README.md), so the thing a developer runs must be the thing the
 * repository currently says — a snapshot that drifts from `src/index.ts` would render a board's
 * refusals from code no one is reading any more.
 *
 * So these tests assert on the link target, not merely that the command exists.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, lstatSync, readlinkSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI_DIR = resolve(__dirname, "..");
const INSTALLER = join(CLI_DIR, "install.sh");
const ENTRYPOINT = join(CLI_DIR, "src", "index.ts");

type Run = { binDir: string; status: number; stdout: string; stderr: string };

/** A BIN_DIR of its own, so a test never touches the developer's real one. */
function tempBin(): string {
  return mkdtempSync(join(tmpdir(), "supi-bin-"));
}

function run(binDir: string, args: string[] = []): Run {
  const r = spawnSync(INSTALLER, args, {
    env: { ...process.env, BIN_DIR: binDir },
    encoding: "utf8",
  });
  return { binDir, status: r.status ?? -1, stdout: r.stdout, stderr: r.stderr };
}

/** Install into a fresh BIN_DIR and require it to have succeeded. */
function install(args: string[] = []): Run {
  const r = run(tempBin(), args);
  expect(r.stderr).toBe("");
  expect(r.status).toBe(0);
  return r;
}

describe("install.sh", () => {
  it("links both names at the repository's entrypoint", () => {
    const { binDir } = install();

    for (const name of ["supi", "superpipeline"]) {
      const installed = join(binDir, name);
      expect(lstatSync(installed).isSymbolicLink()).toBe(true);
      expect(resolve(binDir, readlinkSync(installed))).toBe(ENTRYPOINT);
    }
  });

  it("refuses to destroy a file it did not put there", () => {
    const binDir = tempBin();
    const occupied = join(binDir, "supi");
    writeFileSync(occupied, "someone else's program");

    const r = run(binDir);

    expect(r.status).not.toBe(0);
    expect(readFileSync(occupied, "utf8")).toBe("someone else's program");
    expect(r.stderr).toContain("supi");
  });

  it("removes both names on --uninstall", () => {
    const { binDir } = install();

    const r = run(binDir, ["--uninstall"]);

    expect(r.status).toBe(0);
    for (const name of ["supi", "superpipeline"]) {
      expect(() => lstatSync(join(binDir, name))).toThrow();
    }
  });

  it("says so when the install directory is not on PATH", () => {
    // Not an error: the install is correct, the shell just cannot see it yet. Saying nothing
    // would leave a working install looking like a broken one.
    const { stdout } = install();

    expect(stdout).toContain("PATH");
  });

  it("refuses to install when bun is missing", () => {
    // The entrypoint's shebang is `#!/usr/bin/env bun`. Installing without it would succeed and
    // then fail at the first invocation with `bad interpreter` — a message about the wrong thing.
    const binDir = tempBin();

    const r = spawnSync(INSTALLER, [], {
      env: { ...process.env, BIN_DIR: binDir, PATH: "/usr/bin:/bin" },
      encoding: "utf8",
    });

    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("bun");
    expect(() => lstatSync(join(binDir, "supi"))).toThrow();
  });

  it("installs a command that runs", () => {
    const { binDir } = install();

    const r = spawnSync(join(binDir, "supi"), ["--help"], { encoding: "utf8" });

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("supi boards");
  });

  it("leaves a stranger's file alone on --uninstall", () => {
    const binDir = tempBin();
    const occupied = join(binDir, "supi");
    writeFileSync(occupied, "someone else's program");

    run(binDir, ["--uninstall"]);

    expect(readFileSync(occupied, "utf8")).toBe("someone else's program");
  });
});
