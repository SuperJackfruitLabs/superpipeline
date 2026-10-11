// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { gatePanelContract, gatePanelProps } from './gate-panel.contract';
import GateQuiet from './GateQuiet.svelte';

gatePanelContract(GateQuiet, { decision: 'radio', submit: 'Submit decision' });

const opts = (...names: [string, string][]) => names.map(([name, title]) => ({ name, title, interactive: false }));

describe('GateQuiet', () => {
  afterEach(() => cleanup());
  it('is a plain form: one fieldset, each option says what it does', () => {
    render(GateQuiet, gatePanelProps());
    const group = screen.getByRole('group', { name: 'Your decision is needed' });
    expect(group.tagName).toBe('FIELDSET');
    const says = (name: string, text: string) => expect(screen.getByRole('radio', { name }).getAttribute('aria-describedby') && document.getElementById(screen.getByRole('radio', { name }).getAttribute('aria-describedby')!)!.textContent).toBe(text);
    says('Approve', 'The card moves on to the next stage.');
    says('Request changes', 'The agent tries again with your note.');
    says('Reject', 'The card stops here.');
  });

  it('explains the delivery options', () => {
    const gate = { ...gatePanelProps().gate, options: opts(['approve_manual', 'Approve, I will post it'], ['approve_automatic', 'Approve, post it for me'], ['reject', 'Reject']) };
    render(GateQuiet, gatePanelProps({ gate }));
    expect(screen.getByText('You post the approved text yourself.')).toBeTruthy();
    expect(screen.getByText('The board posts the approved text for you.')).toBeTruthy();
  });

  it('keeps the error beside the submit button', () => {
    render(GateQuiet, gatePanelProps({ error: 'Gate already decided (409)' }));
    const submit = screen.getByRole('button', { name: 'Submit decision' });
    expect(screen.getByRole('alert').parentElement).toBe(submit.parentElement);
  });
});
