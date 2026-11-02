import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BOARD_TEMPLATES } from './boards';
import { capabilityTag } from '@superpipeline/contract';
import { forgetHubToken } from '../hub-token';

beforeEach(() => {
  vi.restoreAllMocks();
  // `hubToken()` caches across calls by design; a token left over from one test
  // would let the next one pass without ever asking for authority.
  forgetHubToken();
});

/**
 * The templates that shipped asked for nine capabilities no agent in any fleet held — `publish`,
 * `test`, `deploy`, `triage`, `support`, `send`, `extract`, `transform`, `load` — while the agent
 * UI offered three, of which two overlapped. That gap is where the mismatch began.
 */
describe('board templates ask only for capabilities a workspace can staff', () => {
  const VOCABULARY = new Set(['analysis', 'code', 'research', 'writing', 'security', 'planning', 'onboarding']);

  it('names nothing outside the fleet vocabulary', () => {
    const asked = new Set(
      BOARD_TEMPLATES.flatMap((t) => t.stages)
        .filter((s) => s.ownerKind === 'capability' && s.owner)
        .map((s) => s.owner!),
    );
    expect([...asked].filter((c) => !VOCABULARY.has(c))).toEqual([]);
  });

  it('spells every capability the way a capability is spelled', () => {
    // Routing is exact string equality against an agent's capability, so a stage owner that is
    // not already a tag can never match one.
    for (const t of BOARD_TEMPLATES) {
      for (const s of t.stages) {
        if (s.ownerKind === 'capability' && s.owner) expect(s.owner).toBe(capabilityTag(s.owner));
      }
    }
  });

  it('gives every template a first stage a person controls', () => {
    // A card lands in the first stage the moment it is created. If that stage were an agent lane,
    // every card would be claimable before anyone had looked at it.
    for (const t of BOARD_TEMPLATES) {
      const first = [...t.stages].sort((a, b) => a.order - b.order)[0]!;
      expect(first.ownerKind ?? 'human').toBe('human');
    }
  });

  it('keeps stage keys unique within a template', () => {
    for (const t of BOARD_TEMPLATES) {
      const keys = t.stages.map((s) => s.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
