// @vitest-environment jsdom
/** The decision panel on its own: a refusal and someone else's earlier decision beside the button, and a held button while one is in flight. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { expectBusy } from '../busy-contract';

const resolveGate = vi.fn();
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), resolveGate: (...a: unknown[]) => resolveGate(...a) }));
const { default: GatePanel } = await import('./GatePanel.svelte');
afterEach(() => cleanup());

const subject = { id: 'sub_1', digest: 'sha256:3f9ac21e77aa', schema: 's', revision: 4, canonical: { post: 'Hello' } };
const props = (over: Record<string, unknown> = {}) => ({
  boardId: 'brd_1',
  gate: { id: 'gat_1', cardId: 'c', status: 'pending', options: [], approvalSubject: subject, stageKey: 'review', producedBy: 'agt_r' },
  error: null, conflict: null, conflictWho: '', onResponse: vi.fn(async () => true), onRefresh: vi.fn(async () => {}),
  ask: { lead: 'Sample agent asks you to approve attempt 1.', rest: 'It finished.' }, prevStage: 'Draft', onMove: vi.fn(),
  ...over,
}) as never;

describe('GatePanel', () => {
  it('the note is optional, counted, and goes with the picked decision', async () => {
    resolveGate.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    render(GatePanel, props());
    const note = screen.getByLabelText('Note to the agent (optional)');
    expect(note.getAttribute('maxlength')).toBe('8192');
    await fireEvent.input(note, { target: { value: 'checked' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked', subject);
  });
  it('says what each decision does, Request changes naming the stage it goes back to', () => {
    render(GatePanel, props());
    expect(screen.getByText('The work is done; move the card on.')).toBeTruthy();
    expect(screen.getByText('Send it back to Draft with a note the agent will read.')).toBeTruthy();
    expect(screen.getByText('Stop the card here.')).toBeTruthy();
  });
  it('holds the button while a decision is in flight, keeping its focus', async () => {
    let settle!: (r: Response) => void;
    resolveGate.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
    render(GatePanel, props());
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await tick();
    try {
      expectBusy([screen.getByRole('button', { name: 'Approve' })], { kind: 'aria', status: 'Recording…' }, ['Approve']);
    } finally { settle(new Response('{}', { status: 200 })); }
    await tick();
  });
  it('a refusal and a 409 are said beside the button; Refresh asks again', async () => {
    render(GatePanel, props({ error: 'Gate already decided (409)' }));
    expect(screen.getByRole('alert').textContent).toContain('Gate already decided (409)');
    cleanup();
    const onRefresh = vi.fn(async () => {});
    render(GatePanel, props({ conflict: { decidedBy: 'usr_x', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, conflictWho: 'Ira Mehta', onRefresh }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('already decided from Matrix by Ira Mehta');
    expect(alert.parentElement).toBe(screen.getByRole('button', { name: 'Approve' }).parentElement);
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh to see it' }));
    expect(onRefresh).toHaveBeenCalled();
  });
});
