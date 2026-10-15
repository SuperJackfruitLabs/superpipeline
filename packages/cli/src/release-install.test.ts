/**
 * `scripts/install.sh`, the release installer, and what `SKILL_DIR` does.
 *
 * Network is replaced by a stub `curl` that serves files from a fixtures directory by URL basename,
 * and the "binary" is a shell script, so the test runs the real installer end to end offline. Two
 * releases are modelled: a current one whose binary has `skill install`, and an old one (VERSION
 * pinned) whose binary does not — which must fall back to the SKILL.md asset.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const INSTALLER = resolve(import.meta.dirname, "..", "..", "..", "scripts", "install.sh");
const platform = process.platform === "darwin" ? "darwin" : "linux";
const arch = process.arch === "arm64" ? "arm64" : "x64";
const ASSET = `supi-${platform}-${arch}`;

const CURL = `#!/bin/sh
out=""; url=""
while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2;; -*) shift;; *) url="$1"; shift;; esac; done
src="$FIXTURES/$(basename "$url")"
[ -f "$src" ] || exit 22
cp "$src" "$out"
`;

const NEW_BIN = `#!/bin/sh
case "$1" in
  version) echo "supi 9.9.9 test/test";;
  skill) [ "$2" = install ] && [ "$3" = --dir ] || exit 1
         mkdir -p "$4/superpipeline-boards"; echo "FROM BINARY" > "$4/superpipeline-boards/SKILL.md"
         echo "Installed the skill: $4/superpipeline-boards/SKILL.md";;
  *) exit 1;;
esac
`;
const OLD_BIN = `#!/bin/sh
case "$1" in version) echo "supi 0.0.1 test/test";; *) echo "unknown command" >&2; exit 1;; esac
`;

function install(binary: string, opts: { asset: boolean }) {
  const root = mkdtempSync(join(tmpdir(), "supi-rel-"));
  const fixtures = join(root, "fixtures");
  const stubs = join(root, "stubs");
  const binDir = join(root, "bin");
  const skillDir = join(root, "skills");
  mkdirSync(fixtures);
  mkdirSync(stubs);
  writeFileSync(join(stubs, "curl"), CURL);
  chmodSync(join(stubs, "curl"), 0o755);
  writeFileSync(join(fixtures, ASSET), binary);
  writeFileSync(join(fixtures, "SHA256SUMS"), `${createHash("sha256").update(binary).digest("hex")}  ${ASSET}\n`);
  if (opts.asset) writeFileSync(join(fixtures, "SKILL.md"), "FROM ASSET\n");
  const r = spawnSync("bash", [INSTALLER], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${stubs}:${process.env.PATH}`, FIXTURES: fixtures, BIN_DIR: binDir, SKILL_DIR: skillDir },
  });
  return { r, skillFile: join(skillDir, "superpipeline-boards", "SKILL.md"), skillDir };
}

describe("scripts/install.sh with SKILL_DIR", () => {
  it("has the installed binary place its own skill, ignoring the asset", () => {
    const { r, skillFile } = install(NEW_BIN, { asset: true });
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(skillFile, "utf8")).toBe("FROM BINARY\n");
  });

  it("falls back to the SKILL.md asset when the binary lacks `skill`", () => {
    const { r, skillFile, skillDir } = install(OLD_BIN, { asset: true });
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(skillFile, "utf8")).toBe("FROM ASSET\n");
    expect(readdirSync(join(skillDir, "superpipeline-boards"))).toEqual(["SKILL.md"]);
  });

  it("still succeeds, without a skill, when an old release has no asset either", () => {
    const { r, skillFile } = install(OLD_BIN, { asset: false });
    expect(r.status, r.stderr).toBe(0);
    expect(existsSync(skillFile)).toBe(false);
    expect(r.stderr).toContain("skill not installed");
  });
});
