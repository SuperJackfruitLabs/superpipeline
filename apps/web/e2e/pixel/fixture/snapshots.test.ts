import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(__dirname, 'source');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));

describe('committed board snapshots carry no secrets', () => {
  it('there are the twelve captured boards', () => expect(files).toHaveLength(12));
  for (const f of files) {
    const text = readFileSync(join(DIR, f), 'utf8');
    it(`${f}: no token-shaped strings`, () => {
      expect(text).not.toMatch(/\b(sk-[A-Za-z0-9-]{8,}|spa_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/);
      expect(text).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{8,}/i);
    });
    it(`${f}: no email address except example/invalid domains`, () => {
      const emails = [...text.matchAll(/(?<![\w/:])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)].map((m) => m[0])
        .filter((e) => !/^git@/.test(e) && !/\.(invalid|example)$/.test(e));
      expect(emails).toEqual([]);
    });
    it(`${f}: no production tenant id`, () => expect(text).not.toMatch(/tnt_(?!vibes)[0-9a-f]{12,}/));
    it(`${f}: no personal handle, local host name or home path`, () => {
      expect(text).not.toMatch(/\/Users\/|\/home\/[a-z]|\bashram\b|\bon foundry\b|\.ts\.net\b/i);
    });
  }
});

// The repository is public: the real person's name never appears in fixture data or in the
// reference artboards. Built from parts so this file does not trip its own guard.
const NAME = new RegExp(`${['rak', 'esh'].join('')}|${['gang', 'war'].join('')}`, 'i');
const walk = (d: string): string[] =>
  !existsSync(d) ? [] : readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
describe("the person's real name is nowhere in the fixture or the reference artboards", () => {
  const roots = [join(__dirname), join(__dirname, '..', '..', 'reference')];
  for (const f of roots.flatMap(walk).filter((p) => !/\.(png|jpe?g|woff2?)$/.test(p))) {
    it(`${f.slice(f.indexOf('e2e/'))}`, () => expect(readFileSync(f, 'utf8')).not.toMatch(NAME));
  }
});

// The fixture and the reference artboards are public: no real secret may sit in any of them.
const SECRET = /\b(sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|spa_[A-Za-z0-9]{24,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
describe('no real secret in the fixture or the reference artboards', () => {
  const roots = [join(__dirname), join(__dirname, '..', '..', 'reference')];
  for (const f of roots.flatMap(walk).filter((p) => !/\.(png|jpe?g|woff2?)$/.test(p) && !p.endsWith('snapshots.test.ts'))) {
    it(`${f.slice(f.indexOf('e2e/'))}`, () => expect(readFileSync(f, 'utf8')).not.toMatch(SECRET));
  }
  it('the pattern catches each kind it names', () => {
    for (const s of ['sk-ant-' + 'a'.repeat(20), 'ghp_' + 'A'.repeat(36), 'spa_' + 'b'.repeat(32), 'Bearer ' + 'c'.repeat(30), 'eyJ' + 'x'.repeat(12) + '.' + 'y'.repeat(12) + '.' + 'z'.repeat(12), '-----BEGIN OPENSSH ' + 'PRIVATE KEY-----']) expect(s).toMatch(SECRET);
  });
});
