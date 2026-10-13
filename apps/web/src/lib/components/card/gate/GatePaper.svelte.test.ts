// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { gatePanelContract, gatePanelProps } from './gate-panel.contract';
import GatePaper from './GatePaper.svelte';

gatePanelContract(GatePaper, { decision: 'radio', submit: 'Send reply', busy: { kind: 'aria', status: 'Recording…' }, words: {
  heading: /^Your reply$/, subjectHeading: /Enclosed: the approval subject/, subjectId: null, digest: /digest sha256:3f9ac21e…/,
  canonical: /Hello(?!,)/, region: /The approval subject/, noteId: 'gate-note-p-gat_1', errorBeforeControls: false,
} });

describe('GatePaper', () => {
  afterEach(() => cleanup());
  it('writes to the person, encloses the subject and seals it', () => {
    render(GatePaper, gatePanelProps({ personName: 'Ira Mehta' }));
    expect(screen.getByText('Dear Ira,')).toBeTruthy();
    expect(screen.getByText('Draft ready.')).toBeTruthy();
    expect(screen.getByText('Approving exactly this version, sealed 3f9a·c21e.')).toBeTruthy();
    expect(screen.getByText('With nothing picked: “Pick a decision first.”')).toBeTruthy();
  });
  it('gives each choice its hint, as the choice\'s description', () => {
    render(GatePaper, gatePanelProps());
    expect(screen.getByRole('radio', { name: 'Approve' }).getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Needs a note; it threads into the next attempt.')).toBeTruthy();
    expect(screen.getByText('Stop here.')).toBeTruthy();
  });
  it('part="controls" draws only the reply: the choices and the button, no hints or note', () => {
    render(GatePaper, gatePanelProps({ part: 'controls' }));
    expect(screen.getByRole('radio', { name: 'Approve' })).toBeTruthy();
    expect(screen.queryByText('Hello,')).toBeNull();
    expect(screen.queryByLabelText('Add a note (optional)')).toBeNull();
    expect(screen.queryByText('Stop here.')).toBeNull();
  });
  it('a 409 says who decided it, where, beside the button, and Refresh asks for the card again', async () => {
    let refreshed = 0;
    render(GatePaper, gatePanelProps({ part: 'controls', conflict: { decidedBy: 'usr_x', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, onRefresh: async () => { refreshed++; } }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Not recorded.');
    expect(alert.textContent).toContain('already decided from Matrix');
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh to see it' }));
    expect(refreshed).toBe(1);
  });
});
