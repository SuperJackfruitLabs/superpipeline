// apps/web/src/lib/components/settings/StageRow.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
vi.mock('$lib/api', () => ({}));
vi.mock('$lib/stores/app.svelte', () => ({ app: {} }));
import StageRow from './StageRow.svelte';
import { DX_STAGES } from './settings-fixture';

afterEach(cleanup);
const model = { cardsPerStage: { reproduce: 1 }, ruleSavedAt: {}, now: 0, agents: [], draft: DX_STAGES } as never;

describe('StageRow', () => {
  it('cannot move the first stage earlier, and cannot remove a stage that holds cards', () => {
    render(StageRow, { stage: DX_STAGES[1]!, index: 1, model });
    expect((screen.getByRole('button', { name: 'Move Reproduce earlier' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Remove stage Reproduce' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('1 card here')).toBeTruthy();
    cleanup();
    render(StageRow, { stage: DX_STAGES[0]!, index: 0, model });
    expect((screen.getByRole('button', { name: 'Move Reported earlier' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('cannot remove the last remaining stage', () => {
    render(StageRow, { stage: DX_STAGES[6]!, index: 0, model: { ...(model as object), draft: [DX_STAGES[6]!] } as never });
    expect((screen.getByRole('button', { name: 'Remove stage Shipped' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
