/**
 * The run route's telemetry against treaty's conventions, `schemas/telemetry/suite.v1.json`
 * (phase 3, ruling 4): the `run_route` span and the `run route` log record carry every key the
 * conventions require, with the conventions' types. Telemetry stays best-effort: a missing key
 * fails this test, never a request.
 */
import { createBundle, telemetryConventions, validateLogRecord, validateSpanAttributes } from '@superjackfruitlabs/treaty-contracts';
import conventionsDoc from '@superjackfruitlabs/treaty-contracts/data/schemas/telemetry/suite.v1.json';
import conventionsSchema from '@superjackfruitlabs/treaty-contracts/data/schemas/treaty/telemetry-conventions.v1.json';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRunTelemetry, type TracingLike } from '../src/telemetry/run-telemetry';

const conventions = telemetryConventions(
  createBundle({ 'schemas/telemetry/suite.v1.json': conventionsDoc, 'schemas/treaty/telemetry-conventions.v1.json': conventionsSchema }),
  'suite.v1',
);

/** What one request emits: the span's name and attributes, and the log line. */
async function emitted(path: string, status = 200): Promise<{ spans: Array<{ name: string; attrs: Record<string, unknown> }>; log: Record<string, unknown> }> {
  const spans: Array<{ name: string; attrs: Record<string, unknown> }> = [];
  const tracing: TracingLike = {
    enterSpan: (name, fn) => {
      const attrs: Record<string, unknown> = {};
      spans.push({ name, attrs });
      return fn({ setAttribute: (k, v) => { attrs[k] = v; } });
    },
  };
  const info = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  await withRunTelemetry(new Request(`https://api.test${path}`, { method: 'POST' }), async () => new Response('{}', { status }), tracing);
  const line: unknown = (info.mock.calls[0] ?? error.mock.calls[0])?.[0];
  return { spans, log: typeof line === 'object' && line !== null ? { ...line } : {} };
}

afterEach(() => vi.restoreAllMocks());

describe('the run route’s telemetry against suite.v1', () => {
  it('names the span and the log record superpipeline produces', () => {
    expect(conventions.spans.run_route?.producers).toContain('superpipeline');
    expect(conventions.logs['run route']?.producers).toContain('superpipeline');
  });

  for (const [label, path, status] of [
    ['a run verb', '/v1/boards/brd_0123456789abcdef/runs/run_0123456789abcdef/heartbeat', 200],
    ['a run read', '/v1/boards/brd_0123456789abcdef/runs/run_0123456789abcdef', 200],
    ['a failed request', '/v1/boards/brd_0123456789abcdef/runs/run_0123456789abcdef/complete', 503],
  ] as const) {
    it(`${label}: the run_route span and the run route log hold`, async () => {
      const { spans, log } = await emitted(path, status);
      expect(spans.map((s) => s.name)).toEqual(['run_route']);
      expect(validateSpanAttributes(conventions, 'run_route', spans[0]?.attrs ?? {}).errors).toEqual([]);
      expect(log.msg).toBe('run route');
      expect(validateLogRecord(conventions, 'run route', log).errors).toEqual([]);
    });
  }

  it('the span carries the action as the conventions name it', async () => {
    const { spans, log } = await emitted('/v1/boards/brd_0123456789abcdef/runs/run_0123456789abcdef/heartbeat');
    expect(spans[0]?.attrs['run.action']).toBe('heartbeat');
    expect(log['run.action']).toBe('heartbeat');
    expect(conventions.spans.run_route?.optional).toContain('run.action');
  });

  it('a span without run.id would fail: the check is not vacuous', () => {
    expect(validateSpanAttributes(conventions, 'run_route', { 'board.id': 'brd_0123456789abcdef' }).valid).toBe(false);
    expect(validateLogRecord(conventions, 'run route', { 'run.id': 7, 'board.id': 'brd_0123456789abcdef' }).valid).toBe(false);
  });
});
