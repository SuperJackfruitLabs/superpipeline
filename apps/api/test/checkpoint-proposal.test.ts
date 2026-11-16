import { describe, expect, it } from 'vitest';
import { parseCheckpointSubmission, parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { canonicalCheckpoint, checkpointDigest, parseCheckpointJSON } from '../src/board/checkpoint-json';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import vectors from './fixtures/checkpoint-settlement/canonical.json';
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
describe('PROPOSED contract adapter, not route acceptance', () => {
  for (const item of corpus.submission.accept)
    it(`accepts ${item.name}`, () => {
      expect(parseCheckpointSubmission(bytes(item.body))).toEqual(item.body);
    });
  for (const item of corpus.submission.reject)
    it(`refuses ${item.name}`, () => {
      expect(() => parseCheckpointSubmission(bytes(item.body))).toThrow('INVALID_CHECKPOINT');
    });
  it('parses policy and refuses duplicate members or unregistered coordinator', () => {
    expect(parseCheckpointPolicy(bytes(corpus.producerBaseline.policy))).toEqual(corpus.producerBaseline.policy);
    expect(() =>
      parseCheckpointPolicy(bytes({ ...corpus.producerBaseline.policy, checkpointRepository: 'foreign' })),
    ).toThrow('INVALID_CHECKPOINT');
    expect(() =>
      parseCheckpointPolicy(
        bytes({
          ...corpus.producerBaseline.policy,
          repositories: [
            corpus.producerBaseline.policy.repositories[0],
            corpus.producerBaseline.policy.repositories[0],
          ],
        }),
      ),
    ).toThrow('INVALID_CHECKPOINT');
  });
  for (const vector of vectors.cases)
    it(`independent canonical vector ${vector.name}`, async () => {
      expect(canonicalCheckpoint(vector.value)).toBe(vector.canonical);
      expect(await checkpointDigest(vector.value)).toBe(vector.sha256);
    });
  it('rejects duplicate/escaped keys, null, unsafe integers, trailing JSON and unpaired surrogates', () => {
    for (const raw of [
      '{"a":1,"a":2}',
      '{"a":1,"\\u0061":2}',
      '[null]',
      '[9007199254740992]',
      '{}{}',
      '["\\ud800"]',
      '[1e0]',
      '[1.0]',
      '{"a":[1,]}',
    ]) {
      expect(() => parseCheckpointJSON(new TextEncoder().encode(raw))).toThrow('INVALID_CHECKPOINT');
    }
    expect(() => parseCheckpointJSON(new Uint8Array([0xff]))).toThrow('INVALID_CHECKPOINT');
    expect(() => parseCheckpointJSON(new Uint8Array(65537))).toThrow('INVALID_CHECKPOINT');
    expect(() => parseCheckpointJSON(new TextEncoder().encode('['.repeat(130) + '0' + ']'.repeat(130)))).toThrow(
      'INVALID_CHECKPOINT',
    );
  });
  it('binds whole submission, including handoff and outcome, separately from report', async () => {
    const raw = corpus.producerBaseline.settlementRequest;
    expect(await checkpointDigest(raw)).not.toBe(
      await checkpointDigest({ ...raw, handoff: { ...raw.handoff, fails: 'changed' } }),
    );
    expect(await checkpointDigest(raw)).not.toBe(await checkpointDigest(raw.checkpoint));
  });
});
