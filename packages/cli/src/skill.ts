/**
 * The agent skill, carried inside the binary.
 *
 * The text lives in `skills/superpipeline-boards/SKILL.md` (the file people edit and review) and is
 * embedded into `skill-embedded.ts` by `pnpm -F @superpipeline/cli skill:embed`; `skill-embed.test.ts`
 * fails when the two differ. A generated TS module rather than `import … with { type: "text" }`
 * because that import form works under bun and not under vitest/node, and the same source has to
 * run in a compiled binary, under `bun src/index.ts`, and in tests.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SKILL_TEXT } from "./skill-embedded.ts";

export const SKILL_NAME = "superpipeline-boards";
export const VERSION_PLACEHOLDER = "{{VERSION}}";

/** The skill as an agent should read it: the version line filled in from the binary. */
export function renderSkill(version: string): string {
  return SKILL_TEXT.split(VERSION_PLACEHOLDER).join(version);
}

export function defaultSkillDir(): string {
  return join(homedir(), ".claude", "skills");
}

/**
 * Write `<dir>/superpipeline-boards/SKILL.md`, staged beside the target and renamed into place so a
 * reader never sees half a file. Overwrites only its own file; returns the path written.
 */
export function installSkill(dir: string, version: string): string {
  const destDir = join(dir, SKILL_NAME);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, "SKILL.md");
  const staged = join(destDir, `.SKILL.md.incoming.${process.pid}`);
  try {
    writeFileSync(staged, renderSkill(version));
    renameSync(staged, dest);
  } finally {
    rmSync(staged, { force: true });
  }
  return dest;
}
