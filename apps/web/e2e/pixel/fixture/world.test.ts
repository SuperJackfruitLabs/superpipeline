// apps/web/e2e/pixel/fixture/world.test.ts
import { describe, expect, it } from 'vitest';
import { BASE_WORLD, IDS, NOW } from './world';

const dx = BASE_WORLD.dos[IDS.DX]!;
const live = (rows: typeof dx.cards) => rows.filter((c) => c.archived_at === null);
const needsYou = (rows: typeof dx.cards) => live(rows).filter((c) => c.state === 'input-required' || (c.state === 'submitted' && c.current_stage_key === 'reported'));
const hoursAt = (iso: string) => (Date.parse(NOW) - Date.parse(iso)) / 3_600_000;

describe('the fixture world (fixtures-and-harness.md §A + mockup-corrections Part 4)', () => {
  it('is one tenant, one person, 12 boards, 22 agents, 19 capabilities', () => {
    expect(BASE_WORLD.tenant.id).toBe('tnt_vibes');
    expect(BASE_WORLD.user).toMatchObject({ id: 'usr_b19776fac3c94df4', name: 'Ira Mehta', email: 'ira@vibes-fixture.invalid' });
    expect(BASE_WORLD.boards).toHaveLength(12);
    expect(BASE_WORLD.agents).toHaveLength(22);
    expect(BASE_WORLD.capabilities).toHaveLength(19);
    expect(BASE_WORLD.capabilities.filter((c) => c.origin === 'inferred').map((c) => c.key).sort()).toEqual(['api', 'diagnostics', 'integration', 'marketing', 'release', 'security-review', 'testing']);
  });
  it('Developer Experience has 7 live cards and 4 need you; card 4605 is live and stopped', () => {
    expect(live(dx.cards)).toHaveLength(7);
    expect(needsYou(dx.cards).map((c) => String(c.id).slice(-4)).sort()).toEqual(['1dfc', '4605', '58f8', '63ac']);
    expect(dx.cards.find((c) => c.id === IDS.C4605)).toMatchObject({ archived_at: null, state: 'input-required', current_stage_key: 'reproduce', priority: 3 });
  });
  it('a stopped card carries the agent-written one-line summary', () => {
    expect(JSON.parse(dx.cards.find((c) => c.id === IDS.C4605)!.needs_human_json as string).summary).toBe('No fresh DM event to trace; needs one per agent.');
  });
  it('card ids end in the hex the mockups print', () => {
    expect(live(dx.cards).map((c) => String(c.id).slice(-4)).sort()).toEqual(['1dfc', '4605', '481f', '58f8', '63ac', '9ed9', 'f83f']);
  });
  it('ages read as the mockups print them at 13:51 IST', () => {
    const since = (s: string) => dx.cards.find((c) => String(c.id).endsWith(s))!.state_since as string;
    expect(Math.floor(hoursAt(since('58f8')))).toBe(33);
    expect(Math.floor(hoursAt(since('1dfc')))).toBe(33);
    expect(Math.floor(hoursAt(since('63ac')) / 24)).toBe(2);
    expect(Math.floor(hoursAt(since('4605')) / 24)).toBe(2);
  });
  it('the Failing-test stage key is test', () => {
    expect(BASE_WORLD.boards.find((b) => b.id === IDS.DX)!.stages.map((s) => (s as { key: string }).key))
      .toEqual(['reported', 'reproduce', 'test', 'fix', 'integrate', 'signed-off', 'shipped']);
  });
  it('19 unread notifications on Developer Experience, 3 of them for 4605', () => {
    expect(dx.notifications.filter((n) => n.read === 0)).toHaveLength(19);
    expect(dx.notifications.filter((n) => n.card_id === IDS.C4605)).toHaveLength(3);
  });
  it('60 board events, newest the 1dfc stale digest at 22:50:12Z', () => {
    expect(dx.events).toHaveLength(60);
    expect([...dx.events].sort((a, b) => b.ts.localeCompare(a.ts))[0]).toMatchObject({ type: 'cards.stale_digest', ts: '2026-10-10T22:50:12Z' });
  });
  it('4605 has two runs by error-eric and 9 + 14 activities; run 1 was sent back', () => {
    const runs = dx.runs.filter((r) => r.card_id === IDS.C4605);
    expect(runs.map((r) => r.agent_id)).toEqual(['agt_fx_error_eric', 'agt_fx_error_eric']);
    expect(runs[0]).toMatchObject({ outcome: 'completed', completion: '{"ok":false,"missing":["repro","observed"]}', failure_reason: 'repro and observed missing' });
    expect(dx.activities.filter((a) => a.run_id === 'run_fx_4605_1')).toHaveLength(9);
    expect(dx.activities.filter((a) => a.run_id === 'run_fx_4605_2')).toHaveLength(14);
  });
  it('the R&I card waits at its approval gate with the three default options', () => {
    const ri = BASE_WORLD.dos[IDS.RI]!;
    expect(ri.cards.find((c) => c.id === IDS.CRI)).toMatchObject({ archived_at: null, state: 'input-required', current_stage_key: 'recommendation' });
    expect(JSON.parse(ri.gates[0]!.options_json as string).map((o: { name: string }) => o.name)).toEqual(['approve', 'request_changes', 'reject']);
  });
  it('Guild Operations card 1 asks a question; Melissa finished on Thursday', () => {
    expect(BASE_WORLD.dos[IDS.GUILD]!.elicitations[0]).toMatchObject({ id: 'elc_fx_guild1', status: 'pending', agent_id: 'agt_fx_optimizer_ollie' });
    expect(BASE_WORLD.dos[IDS.AO]!.cards.find((c) => c.id === 'card_f180b1627c594b41')!.state_since).toBe('2026-10-08T13:56:34.688Z');
  });
  it('board order rule: needs first, then created_at ascending, gives 63ac, 58f8, 1dfc, 4605', () => {
    const needs = needsYou(dx.cards).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    expect(needs.map((c) => String(c.id).slice(-4))).toEqual(['63ac', '58f8', '1dfc', '4605']);
  });
  it('writes no real address and no token', () => {
    const text = JSON.stringify(BASE_WORLD);
    expect(text).not.toMatch(/gmail|@id\.agentpod\.dev"|sk-ant|spa_[A-Za-z0-9]{8}/);
  });
});
