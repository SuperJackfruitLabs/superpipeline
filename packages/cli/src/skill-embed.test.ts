/**
 * `skill-embedded.ts` is generated from `skills/superpipeline-boards/SKILL.md`; it must not drift.
 * Regenerate with `pnpm -F @superpipeline/cli skill:embed`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SKILL_TEXT } from "./skill-embedded.ts";

const SRC = import.meta.dirname;
const file = readFileSync(join(SRC, "..", "skills", "superpipeline-boards", "SKILL.md"), "utf8");

export const render = (text: string) =>
  `// Generated from skills/superpipeline-boards/SKILL.md by \`pnpm -F @superpipeline/cli skill:embed\`. Do not edit by hand.\nexport const SKILL_TEXT: string = ${JSON.stringify(text)};\n`;

describe("the embedded skill", () => {
  it("is the SKILL.md file, byte for byte", () => {
    if (process.env.UPDATE_SKILL === "1") writeFileSync(join(SRC, "skill-embedded.ts"), render(file));
    expect(SKILL_TEXT).toBe(file);
  });
});
