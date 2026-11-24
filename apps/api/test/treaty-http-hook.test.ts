import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { productNotEnabled } from '../src/auth/org-plane-resolve';
import { OTHER_ORG, SERVICE, planeToken, withOrgPlane } from './helpers/org-plane';
import { ALLOWED_MISMATCHES, DOCUMENTS, checkExchange, takeMismatches, treatyHttpChecked } from './helpers/treaty-http';

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
    for (const path of [DOCUMENTS.agentWork, DOCUMENTS.decisions, DOCUMENTS.approvals, DOCUMENTS.push]) expect({ path, checked: treatyHttpChecked[path] }).toMatchObject({ path, checked: (before[path] ?? 0) + 1 });
  });

  it('checks board-read and placement on a service’s exchanges only, which those documents describe', () => {
    const before = { ...treatyHttpChecked };
    const boards = 'https://api.test/v1/boards';
    const load = 'https://api.test/v1/agents/load';
    // A person's board list carries counts the service read does not: not checked against board-read.
    checkExchange('GET', boards, '', 200, 'application/json', '{"boards":[{"id":"brd_0123456789abcdef","name":"B","cardCount":0}]}');
    checkExchange('GET', load, '', 401, 'application/json', '{"error":{"code":"UNAUTHORIZED","message":"x"}}');
    expect(takeMismatches()).toEqual([]);
    expect(treatyHttpChecked).toEqual(before);
    // A service's: checked, and a body off the contract is a mismatch.
    checkExchange('GET', boards, '', 200, 'application/json', '{"boards":[{"id":"brd_0123456789abcdef","name":"B","updatedAt":null}]}', true);
    checkExchange('GET', load, '', 200, 'application/json', '{"agents":[{"agentId":"agt_1","principalId":null,"inFlight":0,"capacity":1,"lastHeartbeatAt":null}]}', true);
    expect(takeMismatches()).toEqual([]);
    expect(treatyHttpChecked[DOCUMENTS.boardRead]).toBe((before[DOCUMENTS.boardRead] ?? 0) + 1);
    expect(treatyHttpChecked[DOCUMENTS.placement]).toBe((before[DOCUMENTS.placement] ?? 0) + 1);
    checkExchange('GET', load, '', 200, 'application/json', '{"agents":[{"agentId":"agt_1","principalId":null,"inFlight":-1,"capacity":1}]}', true);
    expect(takeMismatches().join('\n')).toContain('readAgentLoad 200 does not validate');
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

  it('accepts the Organization-plane gate\'s product_not_enabled refusal on every document, with no allowance', async () => {
    expect(ALLOWED_MISMATCHES).toEqual([]);
    const before = { ...treatyHttpChecked };
    await withOrgPlane(async () => {
      // A person and a service of a workspace that has not enabled SuperPipeline, on routes two documents describe.
      const person = await planeToken({ org: OTHER_ORG, ent: ['agentpod'] });
      const service = await planeToken({ sub: SERVICE, principalKind: 'service', org: OTHER_ORG, ent: ['agentpod'] });
      for (const [url, token] of [
        ['https://api.test/v1/boards/brd_0123456789abcdef/gates/pending', person],
        ['https://api.test/v1/boards/brd_0123456789abcdef', service],
      ] as const) {
        const res = await SELF.fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ error: 'product_not_enabled', org: OTHER_ORG });
      }
    });
    expect(takeMismatches()).toEqual([]);
    expect(treatyHttpChecked[DOCUMENTS.decisions]).toBe((before[DOCUMENTS.decisions] ?? 0) + 1);
    expect(treatyHttpChecked[DOCUMENTS.boardRead]).toBe((before[DOCUMENTS.boardRead] ?? 0) + 1);

    // The gate's own body, on an operation of each of the six documents.
    const body = await productNotEnabled(OTHER_ORG).text();
    const board = 'https://api.test/v1/boards/brd_0123456789abcdef';
    const exchanges = [
      ['POST', `${board}/claims`, '{"capabilities":["a"]}', false],
      ['GET', `${board}/gates/pending`, '', false],
      ['GET', `${board}/approval-requests/apr_0000000000000000`, '', true],
      ['POST', `${board}/push-configs`, '{"url":"https://agent.example.com/push","token":"s"}', false],
      ['GET', board, '', true],
      ['GET', 'https://api.test/v1/agents/load', '', true],
    ] as const;
    for (const [method, url, request, isService] of exchanges) checkExchange(method, url, request, 403, 'application/json', body, isService);
    expect(takeMismatches()).toEqual([]);

    // A gate body off the contract is refused: another code, no org, a malformed org, or error.v1's envelope.
    for (const bad of [
      { error: 'forbidden', org: OTHER_ORG },
      { error: 'product_not_enabled' },
      { error: 'product_not_enabled', org: 'acme' },
      { error: { code: 'product_not_enabled', message: 'x' } },
    ]) checkExchange('GET', board, '', 403, 'application/json', JSON.stringify(bad), true);
    const refused = takeMismatches();
    expect(refused).toHaveLength(4);
    for (const r of refused) expect(r).toContain('readBoard 403 does not validate');
  });
});
