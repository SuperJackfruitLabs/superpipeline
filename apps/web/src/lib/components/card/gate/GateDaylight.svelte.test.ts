// @vitest-environment jsdom
/**
 * A gate decision carries the note the person typed, whichever decision it is.
 * Before this, Approve and Reject sent no comment and every UI approval was stored with null.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';

import { gatePanelContract, resolveGate } from './gate-panel.contract';
import GateDaylight from './GateDaylight.svelte';
import type { Gate } from '$lib/api';

const gate = (over: Partial<Gate> = {}): Gate =>
  ({ id: 'gat_1', cardId: 'c', stageKey: 'review', status: 'pending', options: [], producedBy: 'agt', ...over }) as Gate;

const note = () => screen.getByLabelText(/note|what needs to change/i) as HTMLTextAreaElement;
const type = (v: string) => fireEvent.input(note(), { target: { value: v } });

const props = (g: Gate, onResponse: unknown, error: string | null = null) => ({
  boardId: 'brd_1', gate: g, error, onResponse: onResponse as never,
  agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' as const },
  lead: { kind: 'review' as const, needsYou: true, agentId: 'agt_r', sentence: null, source: 'none' as const, at: null },
  vibe: 'daylight' as const,
});

function mount(g: Gate, ok = true) {
  const onResponse = vi.fn(async () => ok);
  const r = render(GateDaylight, props(g, onResponse));
  return { onResponse, ...r };
}

beforeEach(() => resolveGate.mockReset().mockResolvedValue(new Response('{}', { status: 200 })));
afterEach(() => cleanup());

gatePanelContract(GateDaylight, { decision: 'button' });

describe('GateDaylight', () => {
  it('shows the note while the gate is pending, with a visible limit and a 16px font class', () => {
    mount(gate());
    expect(note()).toBeTruthy();
    expect(screen.getByText(/0 \/ 8192/)).toBeTruthy();
    expect(note().className).toMatch(/\btext-base\b/);
    expect(note().maxLength).toBe(8192);
  });

  it.each([
    ['approve', 'Approve'],
    ['approve_manual', 'Approve manual'],
    ['approve_automatic', 'Approve automatic'],
  ])('%s sends the note', async (name, title) => {
    mount(gate({ options: [{ name, title, interactive: false }] as Gate['options'] }));
    await type('  looks right  ');
    await fireEvent.click(screen.getByRole('button', { name: title }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', name, 'looks right', undefined);
  });

  it('reject sends the note', async () => {
    mount(gate());
    await type('out of scope');
    await fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'reject', 'out of scope', undefined);
  });

  it('request changes sends the note', async () => {
    mount(gate());
    await type('add a test');
    await fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'request_changes', 'add a test', undefined);
  });

  it('request changes without a note sends nothing and asks for one', async () => {
    mount(gate());
    await type('   ');
    await fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(resolveGate).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/what needs to change/i)).toBeTruthy();
  });

  it('an empty note sends no comment: undefined, not an empty string', async () => {
    mount(gate());
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(resolveGate.mock.calls[0]![3]).toBeUndefined();
    resolveGate.mockClear();
    await type('   ');
    await fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(resolveGate.mock.calls[0]![3]).toBeUndefined();
  });

  it('clears the note after an accepted decision, keeps it after a refused one', async () => {
    const { onResponse } = mount(gate());
    onResponse.mockResolvedValueOnce(false);
    await type('keep me');
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await tick();
    expect(note().value).toBe('keep me');
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await tick();
    expect(note().value).toBe('');
  });

  it('clears the note when the gate changes (another card)', async () => {
    const { rerender } = mount(gate());
    await type('for card one');
    await rerender(props(gate({ id: 'gat_2' }), vi.fn(async () => true)));
    await tick();
    expect(note().value).toBe('');
  });

  it('a bound gate still sends the subject id and digest with the note', async () => {
    const approvalSubject = { id: 'sub_1', digest: 'sha256:abc', schema: 's', revision: 2, canonical: {} };
    mount(gate({ approvalSubject }));
    await type('bytes checked');
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'bytes checked', approvalSubject);
  });

  it('hands the response and decision to the caller', async () => {
    const { onResponse } = mount(gate());
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await tick();
    expect(onResponse).toHaveBeenCalledWith('approve', expect.any(Response));
  });

  it('shows ⚑ awaiting your review, the subject revision and the seal line', () => {
    const approvalSubject = { id: 'sub_1', digest: 'sha256:3f9ac21e77', schema: 's', revision: 2, canonical: { a: 1 } };
    mount(gate({ approvalSubject }));
    expect(screen.getByText('⚑ awaiting your review')).toBeTruthy();
    expect(screen.getByText(/revision 2/)).toBeTruthy();
    expect(screen.getByText(/sealed 3f9a·c21e/)).toBeTruthy();
    expect(screen.getByText('sha256:3f9ac21e77')).toBeTruthy();
  });

  it('shows the gate error passed in, as an alert', () => {
    render(GateDaylight, props(gate(), vi.fn(async () => true), 'Gate already decided'));
    expect(screen.getByRole('alert').textContent).toContain('Gate already decided');
  });

  it('marks the note invalid and focuses it when Request changes has no note', async () => {
    mount(gate());
    await fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    await tick();
    expect(note().getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(note());
  });
});
