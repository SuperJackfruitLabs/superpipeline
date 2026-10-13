// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { resolveGate, gatePanelProps } from './gate-panel.contract';
import GateStudioBar from './GateStudioBar.svelte';

afterEach(() => cleanup());
const props = (over: Record<string, unknown> = {}) => { const { agent, lead, vibe, ...rest } = gatePanelProps(over); void agent; void lead; void vibe; return rest; };

describe('GateStudioBar', () => {
  it('Approve sends the note; the note shows its limit', async () => {
    resolveGate.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    render(GateStudioBar, props());
    expect(screen.getByText('· 0/8192')).toBeTruthy();
    await fireEvent.input(screen.getByLabelText(/Add a note/), { target: { value: 'checked' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(resolveGate).toHaveBeenCalledWith('brd_1', 'gat_1', 'approve', 'checked', expect.anything());
  });
  it('Request changes with no note says so, marks the field and focuses it', async () => {
    resolveGate.mockReset();
    render(GateStudioBar, props());
    await fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(resolveGate).not.toHaveBeenCalled();
    const field = screen.getByLabelText('Say what needs to change');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field);
    expect(screen.getByText('Request changes needs a note.')).toBeTruthy();
  });
  it('a busy decision keeps its buttons focusable and says Recording…', async () => {
    let settle!: (r: Response) => void;
    resolveGate.mockReset().mockReturnValue(new Promise<Response>((r) => (settle = r)));
    render(GateStudioBar, props());
    const approve = screen.getByRole('button', { name: 'Approve' });
    approve.focus();
    await fireEvent.click(approve);
    await waitFor(() => expect(approve.getAttribute('aria-disabled')).toBe('true'));
    expect((approve as HTMLButtonElement).disabled).toBe(false);
    expect(document.activeElement).toBe(approve);
    expect(screen.getByRole('status').textContent).toBe('Recording…');
    await fireEvent.click(approve);
    expect(resolveGate).toHaveBeenCalledTimes(1);
    settle(new Response('{}', { status: 200 }));
  });
  it('a 409 says who decided it beside the buttons; Refresh asks again', async () => {
    const onRefresh = vi.fn();
    render(GateStudioBar, props({ conflict: { decidedBy: 'usr_x', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, onRefresh }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Not recorded.');
    expect(alert.textContent).toContain('already decided from Matrix');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalled();
  });
  it('shows a plain error as an alert too', () => {
    render(GateStudioBar, props({ error: 'Gate already decided (409)' }));
    expect(screen.getByRole('alert').textContent).toContain('Gate already decided (409)');
  });
});
