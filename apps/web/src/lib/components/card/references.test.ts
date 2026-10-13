// apps/web/src/lib/components/card/references.test.ts
import { describe, expect, it } from 'vitest';
import { referenceSource } from './references';
import { REFS_4605 } from './testing/card-4605';

describe('referenceSource', () => {
  it('reads a GitHub blob URL as provider · repo · file lines a–b (en dash)', () => {
    expect(REFS_4605.map(referenceSource)).toEqual([
      'github · agentpod · inbound.ts lines 379–786',
      'github · agentpod · outbound.ts lines 373–486',
      'github · agentpod · acp-transport.ts lines 90–248',
      'github · accounts · claims.ts lines 17–43',
      'github · hermes-agent · server.py lines 818–883',
    ]);
  });
  it('says one line for #L12', () => expect(referenceSource({ url: 'https://github.com/o/r/blob/abc/src/a.ts#L12' })).toBe('github · r · a.ts line 12'));
  it('has no line clause without a fragment', () => expect(referenceSource({ url: 'https://github.com/o/r/blob/abc/README.md' })).toBe('github · r · README.md'));
  it('is the hostname for anything else, and the text for a non-URL', () => {
    expect(referenceSource({ url: 'https://forge.example.org/o/r/pulls/3' })).toBe('forge.example.org');
    expect(referenceSource({ url: 'not a url' })).toBe('not a url');
  });
});
