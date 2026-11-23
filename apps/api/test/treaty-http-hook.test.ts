import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { DOCUMENTS, checkExchange, takeMismatches, treatyHttpChecked } from './helpers/treaty-http';

const headers = { 'X-Tenant-Id': 'tnt_treaty_hook', 'Content-Type': 'application/json' };

describe('treaty HTTP contracts are checked on every exchange', () => {
  it('checks the agent-work, decisions, approvals and push routes a test reaches', async () => {
    const before = { ...treatyHttpChecked };
    const created = await SELF.fetch('https://api.test/v1/boards', {
      method: 'POST', headers, body: JSON.stringify({ name: 'Hook', stages: [{ key: 'a', name: 'A', order: 0, ownerKind: 'capability', owner: 'a' }] }),
    });
    const { boardId } = await created.json<{ boardId: string }>();
    // agent-work: a claim; decisions: the pending gates; approvals: a request with no service token.
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/claims`, { method: 'POST', headers: { ...headers, 'X-Agent-Id': 'agt_hook' }, body: JSON.stringify({ capabilities: ['a'] }) });
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/pending`, { headers });
    // push: a person registering a push config for a named agent.
    const registered = await SELF.fetch(`https://api.test/v1/boards/${boardId}/push-configs`, {
      method: 'POST', headers: { ...headers, 'X-Agent-Id': 'agt_hook' }, body: JSON.stringify({ url: 'https://agent.example.com/push', token: 's' }),
    });
    expect(registered.status).toBe(201);
    // A person on a service-only route is refused 401 UNAUTHORIZED (it read as a 405, which the contract does not name).
    const notAService = await SELF.fetch(`https://api.test/v1/boards/${boardId}/approval-requests/apr_0000000000000000`, { headers });
    expect(notAService.status).toBe(401);
    expect((await notAService.json<{ error: { code: string } }>()).error.code).toBe('UNAUTHORIZED');
    for (const path of Object.values(DOCUMENTS)) expect({ path, checked: treatyHttpChecked[path] }).toMatchObject({ path, checked: (before[path] ?? 0) + 1 });
  });

  it('records a response that does not match, naming the operation, status and errors', () => {
    const url = 'https://api.test/v1/boards/brd_0123456789abcdef/runs/run_0123456789abcdef/heartbeat';
    checkExchange('POST', url, '{"leaseEpoch":1}', 409, 'application/json', '{"error":"stale lease"}');
    checkExchange('POST', url, '{"leaseEpoch":1}', 418, 'application/json', '{"error":{"code":"UNEXPECTED","message":"x"}}');
    const found = takeMismatches();
    expect(found).toHaveLength(2);
    expect(found[0]).toContain('heartbeatRun 409 does not validate');
    expect(found[1]).toContain('status 418 is not in the contract for heartbeatRun');
  });

  it('records a request the contract refuses that the server accepted, and not one it refused', () => {
    const url = 'https://api.test/v1/boards/brd_0123456789abcdef/gates/gate_0123456789abcdef/resolve';
    checkExchange('POST', url, '{"decision":"aprove"}', 400, 'application/json', '{"error":{"code":"GATE_DECISION_NOT_ALLOWED","message":"no"}}');
    expect(takeMismatches()).toEqual([]);
    checkExchange('POST', url, '{"decision":"aprove"}', 200, 'application/json', '{"card":{}}');
    expect(takeMismatches().join('\n')).toContain('resolveGate accepted (200) a request the contract refuses');
  });

  it('leaves a route no document describes unchecked', () => {
    const before = { ...treatyHttpChecked };
    checkExchange('GET', 'https://api.test/v1/projects', '', 200, 'application/json', '{"anything":true}');
    expect(takeMismatches()).toEqual([]);
    expect(treatyHttpChecked).toEqual(before);
  });
});
