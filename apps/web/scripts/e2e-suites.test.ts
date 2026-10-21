import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extendedSpecs, smokeSpec } from './e2e-suites';

describe('browser coverage partition', () => {
  it('keeps every existing spec in exactly one project and new specs blocking by default', () => {
    const files = readdirSync(new URL('../e2e', import.meta.url)).filter(name => name.endsWith('.spec.ts'));
    expect(new Set(extendedSpecs).size).toBe(extendedSpecs.length);
    for (const name of [...extendedSpecs, smokeSpec]) expect(files).toContain(name);
    const critical = files.filter(name => name !== smokeSpec && !extendedSpecs.includes(name));
    for (const name of ['reconnect.spec.ts', 'resume.spec.ts', 'gates.spec.ts']) expect(critical).toContain(name);
    expect(critical.length + extendedSpecs.length + 1).toBe(files.length);
    expect(extendedSpecs).not.toContain('future-correctness.spec.ts');
  });
});
