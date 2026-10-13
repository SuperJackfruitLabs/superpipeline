// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { gatePanelContract, gatePanelProps } from './gate-panel.contract';
import GateQuiet from './GateQuiet.svelte';

gatePanelContract(GateQuiet, { decision: 'radio', submit: 'Submit decision', busy: { kind: 'aria', status: 'Recording…' }, words: {
  heading: /Your decision is needed/, subjectHeading: /What you are approving \(revision 4\)/, subjectId: null, digest: /Sealed:/,
  canonical: /Hello/, region: /The approval subject/, noteId: 'gate-note-q-gat_1', errorBeforeControls: false, lead: /Draft ready\./, noPlaceholder: true, seal: [/You approve exactly this version/, /3f9a·c21e/], count: (n) => `${n} of 8192 characters`, noteLabel: /^Note for Sample agent \(optional\)/,
} });

const opts = (...names: [string, string][]) => names.map(([name, title]) => ({ name, title, interactive: false }));

describe('GateQuiet', () => {
  afterEach(() => cleanup());
  it('is one fieldset; each option says what it does', () => {
    render(GateQuiet, gatePanelProps());
    expect(screen.getByRole('group', { name: 'Your decision is needed' }).tagName).toBe('FIELDSET');
    const says = (name: string, text: string) => expect(document.getElementById(screen.getByRole('radio', { name }).getAttribute('aria-describedby')!)!.textContent).toBe(text);
    says('Approve', 'The card moves on to the next stage.');
    says('Request changes', 'Needs a note. The agent reads it on its next attempt.');
    says('Reject', 'Stop the card here.');
    expect(screen.getByText('0 of 8192 characters')).toBeTruthy();
    expect(screen.getByText('If nothing is picked: “Pick a decision first.”')).toBeTruthy();
  });
  it('explains the delivery options', () => {
    const gate = { ...gatePanelProps().gate, options: opts(['approve_manual', 'Approve, I will post it'], ['approve_automatic', 'Approve, post it for me'], ['reject', 'Reject']) };
    render(GateQuiet, gatePanelProps({ gate }));
    expect(screen.getByText('You post the approved text yourself.')).toBeTruthy();
    expect(screen.getByText('The board posts the approved text for you.')).toBeTruthy();
  });
  it('part="controls" draws only the choices, the note and the button', () => {
    render(GateQuiet, gatePanelProps({ part: 'controls' }));
    expect(screen.getByRole('radio', { name: 'Approve' })).toBeTruthy();
    expect(screen.queryByText(/What you are approving/)).toBeNull();
    expect(screen.queryByText('0 of 8192 characters')).toBeNull();
  });
  it('a 409 says who decided it beside the button; Refresh asks again', async () => {
    let n = 0;
    render(GateQuiet, gatePanelProps({ part: 'controls', conflict: { decidedBy: 'usr_x', decidedAt: '2026-10-11T07:32:00Z', via: 'matrix' }, onRefresh: async () => { n++; } }));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Not recorded.');
    expect(alert.textContent).toContain('already decided from Matrix');
    expect(alert.parentElement).toBe(screen.getByRole('button', { name: 'Submit decision' }).parentElement);
    await fireEvent.click(screen.getByRole('button', { name: 'Refresh to see it' }));
    expect(n).toBe(1);
  });
});
