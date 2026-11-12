/**
 * Run reports carry the stage and card a run worked (charter 2026-11-12, SuperDispatch owns the
 * scheduler, decision 7), so superwitness can read history per stage.
 *
 * Additive and switched: superwitness refuses a field it does not know, and one refused report
 * fails its whole batch, so the two fields leave only when SUPERWITNESS_REPORT_STAGE is "true".
 */
import { runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { buildRunReport, type RunReportDraft } from '../src/superwitness/report';
import { fakeSuperwitness, quietBoards, REPORTING_ON, trackBoard, withReporting } from './helpers/superwitness';
import { freshBoard } from './helpers/board';
import { validateRunReportBody } from './helpers/run-report-schema';

const DRAFT: RunReportDraft = {
  boardId: 'brd_x',
  boardName: 'Release board',
  runId: 'run_y',
  agentId: 'agt_w',
  stageKey: 'build',
  cardId: 'card_0123456789abcdef',
  title: 'Draft the release note',
  status: 'running',
  sourceStatus: 'working',
  startedAt: '2026-10-06T10:00:00.000Z',
  endedAt: null,
  reportedAt: '2026-10-06T10:00:00.001Z',
};
const BUILD: BoardInit['stages'] = [{ key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' }];

afterEach(quietBoards);

describe('buildRunReport, stage and card', () => {
  it('leaves both out by default, so the report fits a superwitness without the fields', () => {
    const report = buildRunReport(DRAFT, { principalId: null, name: 'w' });
    expect(report).not.toHaveProperty('stage_key');
    expect(report).not.toHaveProperty('card_id');
    expect(validateRunReportBody(report).valid).toBe(true);
  });

  it('carries both when switched on', () => {
    expect(buildRunReport(DRAFT, { principalId: null, name: 'w' }, { withStage: true })).toMatchObject({
      stage_key: 'build',
      card_id: 'card_0123456789abcdef',
    });
  });

  it('fits the vendored schema with both, since superwitness accepts them', () => {
    const report = buildRunReport(DRAFT, { principalId: null, name: 'w' }, { withStage: true });
    expect(validateRunReportBody(report)).toEqual({ valid: true, errors: [] });
  });

  it('sends a draft queued before the fields existed without them', () => {
    const { stageKey: _s, cardId: _c, ...old } = DRAFT;
    const report = buildRunReport(old, { principalId: null, name: 'w' }, { withStage: true });
    expect(report).not.toHaveProperty('stage_key');
    expect(report).not.toHaveProperty('card_id');
  });
});

/** Claim one card with reporting configured by `knobs`, drain, and return the one report sent. */
async function sentRun(knobs: Record<string, string>): Promise<{ sent: Record<string, unknown> | undefined; cardId: string }> {
  const stub = trackBoard(freshBoard());
  return withReporting(
    () =>
      runInDurableObject(stub, async (board: BoardDO, state) => {
        await board.init({ id: 'brd_sws', tenantId: 'tnt_sws', name: 'S', stages: BUILD });
        const card = await board.createCard({ title: 'Build it', ownerUserId: 'usr_a' });
        if (!card.ok) throw new Error(card.message);
        expect((await board.claim({ agentId: 'agt_w', capabilities: ['build'] })).claimed).toBe(true);
        await state.storage.deleteAlarm();
        const sw = fakeSuperwitness();
        await board.drainRunReports({ fetcher: sw.fetcher });
        return { sent: sw.batches[0]?.body.runs[0], cardId: card.value.id };
      }),
    knobs,
  );
}

describe('the drain, stage and card', () => {

  it('reports the run’s stage and card when SUPERWITNESS_REPORT_STAGE is "true"', async () => {
    const { sent, cardId } = await sentRun({ ...REPORTING_ON, SUPERWITNESS_REPORT_STAGE: 'true' });
    expect(sent).toMatchObject({ stage_key: 'build', card_id: cardId });
  });

  it('reports neither while the switch is off', async () => {
    const { sent } = await sentRun(REPORTING_ON);
    expect(sent).not.toHaveProperty('stage_key');
    expect(sent).not.toHaveProperty('card_id');
  });
});
