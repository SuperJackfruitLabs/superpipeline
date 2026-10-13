// @vitest-environment jsdom
// apps/web/src/lib/components/card/card-model.svelte.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ATTEMPTS_4605, BOARD_DX, CARD_4605, REFS_4605, STAGES_DX, TZ } from './testing/card-4605';
import { factItems } from './card-words';
import { fakeApi, fakeApp } from './testing/fakes';
import { mountModel } from './testing/mount-model.svelte';

vi.mock('$lib/stores/app.svelte', async () => ({ app: (await import('./testing/fakes')).fakeApp }));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), ...(await import('./testing/fakes')).fakeApi }));
vi.mock('$lib/superlibrary', async (orig) => ({ ...(await orig<typeof import('$lib/superlibrary')>()), relatedForCard: vi.fn(async () => []) }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('CardModel (4605 in the drawer)', () => {
  it('reads the card off the snapshot before any detail arrives', () => {
    const { model, dispose } = mountModel({ holdDetail: true });
    expect(model.card?.id).toBe(CARD_4605.id);
    expect([model.shortId, model.stageName, model.stageIndex, model.boardName]).toEqual(['4605', 'Reproduce', 1, 'Developer Experience']);
    expect(model.detailLoaded).toBe(false);
    expect(model.lead?.kind).toBe('stopped');
    expect(model.trackStatus).toBe('stopped');
    expect(model.agent.name, 'nobody holds 4605; the last run’s agent speaks for it (G-2)').toBe('error-eric');
    expect(model.refs).toHaveLength(REFS_4605.length);
    expect(model.pageHref).toBe('/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page');
    expect(fakeApi.getAttempts).not.toHaveBeenCalled();
    dispose();
  });
  it('fetches attempts, activities, estimate and links, and groups the runs', async () => {
    const { model, dispose } = mountModel();
    await vi.waitFor(() => expect(model.detailLoaded).toBe(true));
    expect(model.attempts).toEqual(ATTEMPTS_4605);
    expect(model.activityGroups.map((g) => [g.runId, g.counts.total])).toEqual([['run_fx_4605_1', 9], ['run_fx_4605_2', 14]]);
    expect(model.counts).toMatchObject({ runs: 2, refs: 5, attempts: 2, decisions: 0, links: 0, children: 0 });
    expect(model.projectName).toBe('Marketing & Community — Melissa and Anna onboarding');
    expect(model.grantCovers).toBe(true);
    expect(model.resume.show).toBe(true);
    expect(model.resume.targets.filter((t) => t.allowed).map((t) => t.key)).toEqual(['reported', 'reproduce']);
    dispose();
  });
  it('a gallery model takes its board from the source it is given and never closes anything', async () => {
    const source = { board: { ...BOARD_DX, name: 'From the source' }, agents: fakeApp.agents };
    const { model, dispose } = mountModel({ surface: 'gallery', source });
    expect(model.boardName).toBe('From the source');
    expect(fakeApp.loadBoards).not.toHaveBeenCalled();
    await model.onGateResponse('approve', new Response('{}', { status: 200 }));
    expect(fakeApp.closeCard).not.toHaveBeenCalled();
    dispose();
  });
  it('a 409 from the gate keeps who decided it, beside the buttons', async () => {
    const { model, dispose } = mountModel({ surface: 'gallery', source: { board: BOARD_DX, agents: fakeApp.agents } });
    const body = { error: { code: 'GATE_NOT_PENDING', reason: 'decided', message: 'gate is already resolved', decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' } };
    expect(await model.onGateResponse('approve', new Response(JSON.stringify(body), { status: 409 }))).toBe(false);
    expect(model.gateConflict).toEqual({ decidedBy: 'usr_b19776fac3c94df4', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' });
    expect(model.gateError).toBeNull();
    dispose();
  });
  it('after a decision the drawer closes and the page stays', async () => {
    const drawer = mountModel({ surface: 'drawer' });
    await drawer.model.onGateResponse('approve', new Response('{}', { status: 200 }));
    expect(fakeApp.closeCard).toHaveBeenCalledTimes(1);
    drawer.dispose();
    const page = mountModel({ surface: 'page' });
    await page.model.onGateResponse('approve', new Response('{}', { status: 200 }));
    expect(fakeApp.closeCard).toHaveBeenCalledTimes(1);
    expect(fakeApi.getAttempts).toHaveBeenCalled();
    page.dispose();
  });
  it('copy link writes the page address; a refused clipboard says how to copy it by hand', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { model, dispose } = mountModel({ holdDetail: true });
    await model.copyLink();
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/b/brd_134a0ddb6d434478/c/card_05823a57e8224605/page`);
    expect(model.copied).toBe('link');
    writeText.mockRejectedValueOnce(new Error('denied'));
    await model.copyLink();
    expect(model.localError).toBe('Clipboard access was refused. Select the address bar and copy it.');
    dispose();
  });
  it('an agent the board does not know is "an agent", never its raw id', () => {
    const stranger = { ...CARD_4605, lastAgentId: 'agt_0000ffff0000ffff', queuedByAgentId: 'agt_1111eeee1111eeee', queuedBy: 'prn_unknown_x' };
    const source = { board: { ...BOARD_DX, cards: [stranger] }, agents: fakeApp.agents };
    const { model, dispose } = mountModel({ surface: 'gallery', source, holdDetail: true });
    expect(model.agent.name).toBe('an agent');
    expect(model.queuedByName).toBe('an agent');
    dispose();
  });
  it('a card with no runs and no delegate has no Attempt fact and nobody speaking for it', () => {
    const fresh = { ...CARD_4605, attemptCount: 0, lastAgentId: null, delegateAgentId: null };
    const source = { board: { ...BOARD_DX, cards: [fresh] }, agents: fakeApp.agents };
    const { model, dispose } = mountModel({ surface: 'gallery', source, holdDetail: true });
    expect(model.agent.name).toBe('');
    expect(factItems({ card: fresh, stageName: model.stageName, ageHours: 5, labelNames: [], projectName: null, tz: TZ }).map((f) => f.term)).not.toContain('Attempt');
    expect(model.stages).toEqual(STAGES_DX);
    dispose();
  });
  it('no runs and no delegate: no chip, and no Attempt fact', () => {
    const fresh = { ...CARD_4605, attemptCount: 0, lastAgentId: null, delegateAgentId: null };
    const { model, dispose } = mountModel({ surface: 'gallery', source: { board: { ...BOARD_DX, cards: [fresh] }, agents: fakeApp.agents }, holdDetail: true });
    expect(model.chip).toBeNull();
    expect(model.facts.map((f) => f.term)).not.toContain('Attempt');
    dispose();
  });
  it('4605 has the unclaimed chip and the Attempt fact', () => {
    const { model, dispose } = mountModel({ holdDetail: true });
    expect(model.chip).toBe('Unclaimed · error-eric ran attempt 2');
    expect(model.facts.find((f) => f.term === 'Attempt')?.value).toBe('2');
    dispose();
  });
});
