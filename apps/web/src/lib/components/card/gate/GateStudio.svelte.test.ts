// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { gatePanelContract, gatePanelProps } from './gate-panel.contract';
import GateStudio from './GateStudio.svelte';

afterEach(() => cleanup());

gatePanelContract(GateStudio, { decision: 'button' });

describe('GateStudio', () => {
  it('reads the agent and the state as an uppercase mono line with a light', () => {
    const { container } = render(GateStudio, gatePanelProps());
    const line = screen.getByText('Sample agent · needs decision');
    expect(line.className).toMatch(/\buppercase\b/);
    expect(container.querySelector('.status-led')?.getAttribute('data-mood')).toBe('needs');
  });

  it('puts a one-row note on a command bar, with the decisions in the order changes, reject, approve', () => {
    const { container } = render(GateStudio, gatePanelProps());
    const bar = container.querySelector('.command-bar')!;
    const note = screen.getByLabelText('Add a note (optional)') as HTMLTextAreaElement;
    expect(note.getAttribute('rows')).toBe('1');
    expect(bar.contains(note)).toBe(true);
    expect([...bar.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Request changes', 'Reject', 'Approve']);
  });
});

describe('GateStudio refusal', () => {
  it('shows a refusal on the command bar, beside the decisions', () => {
    const { container } = render(GateStudio, gatePanelProps({ error: 'Gate already decided (409)' }));
    expect(container.querySelector('.command-bar')!.contains(screen.getByRole('alert'))).toBe(true);
  });
});
