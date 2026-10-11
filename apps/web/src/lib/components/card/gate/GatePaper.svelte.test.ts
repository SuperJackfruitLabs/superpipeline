// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { gatePanelContract, gatePanelProps } from './gate-panel.contract';
import GatePaper from './GatePaper.svelte';

gatePanelContract(GatePaper, { decision: 'radio', submit: 'Send reply' });

describe('GatePaper', () => {
  it('reads as a reply to an approval, with the subject in a labelled block', () => {
    render(GatePaper, gatePanelProps());
    expect(screen.getByText('Re: approval')).toBeTruthy();
    const block = screen.getByLabelText('The version you are approving');
    expect(block.textContent).toContain('sub_1');
    expect(screen.getByRole('group', { name: 'Your reply' })).toBeTruthy();
  });
});
